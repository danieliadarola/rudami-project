-- 20260916100000_app_paciente_cuentas_programas_citas.sql
-- App del paciente v2 · "mini fisio app" para todo el mundo.
--
-- QUÉ CAMBIA DE MODELO:
-- Hasta ahora la app solo existía para el paciente de una clínica (su
-- identidad era una fila de `pacientes`). A partir de aquí entra también el
-- usuario INDEPENDIENTE, sin clínica, que paga una membresía. Los dos usan la
-- misma app; lo que cambia es de dónde salen sus rutinas:
--   · Con clínica  → el plan que publica su fisio (informes) + la biblioteca.
--   · Sin clínica  → solo la biblioteca (programas curados de `ejercicios`).
--
-- MISMO MODELO DE SEGURIDAD QUE SIEMPRE: ninguna tabla nueva tiene policy para
-- el paciente. Todo entra y sale por RPCs SECURITY DEFINER con lista blanca
-- enumerada a mano, y la identidad la resuelve auth.uid() / paciente_actual()
-- por dentro. La única policy que se añade es para la CLÍNICA, que tiene que
-- ver las solicitudes de cambio de cita de sus pacientes.
--
-- MODELO DE NEGOCIO (decidido el 16/09/2026):
--   · Free      (0 €)          biblioteca básica, rutinas, calendario, seguimiento básico.
--   · Premium   (4,99 €/mes)   + IA, biblioteca completa, estadísticas, objetivos.
--   · Clinic    (gratis para el paciente): Premium INCLUIDO porque su clínica
--                paga RuDaMi. El paciente nunca paga por ver lo que le manda su fisio.
-- PAGOS: todavía no hay Stripe. `premium_hasta` es la única puerta: cuando
-- llegue el cobro, el webhook solo tendrá que alargar esa fecha. Mientras,
-- el botón "Hazte Premium" registra el interés (premium_interes_at) y lo dice.

-- ─────────────────────────────────────────────────────────────────────
-- 1. Cuenta de la app (todo el que entra en /mi tiene una)
-- ─────────────────────────────────────────────────────────────────────

create table if not exists public.app_usuarios (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  nombre        text,
  plan          text not null default 'free' check (plan in ('free', 'premium')),
  premium_hasta date,
  premium_interes_at timestamptz,
  objetivo_semanal integer not null default 3 check (objetivo_semanal between 1 and 7),
  created_at    timestamptz not null default now()
);
comment on table public.app_usuarios is
  'Cuenta de la app del paciente. Existe para todos; el plan solo importa a quien no tiene clínica.';
alter table public.app_usuarios enable row level security;

-- ─────────────────────────────────────────────────────────────────────
-- 2. Biblioteca de programas (rutinas curadas sobre `ejercicios`)
-- ─────────────────────────────────────────────────────────────────────

create table if not exists public.programas (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  titulo      text not null,
  descripcion text,
  zona        text,
  nivel       text,
  semanas     integer not null default 4,
  frecuencia  text,
  publico     boolean not null default true,
  -- Programas avanzados: solo Premium (o paciente de clínica). Free los ve en
  -- la biblioteca con candado, para que sepa qué se pierde.
  premium     boolean not null default false,
  orden       integer not null default 0,
  created_at  timestamptz not null default now()
);
alter table public.programas enable row level security;

create table if not exists public.programa_ejercicios (
  id           uuid primary key default gen_random_uuid(),
  programa_id  uuid not null references public.programas(id) on delete cascade,
  ejercicio_id uuid not null references public.ejercicios(id) on delete cascade,
  orden        integer not null default 0,
  series       integer,
  repeticiones text,
  descanso     text,
  duracion     text
);
create index if not exists idx_programa_ejercicios_programa on public.programa_ejercicios(programa_id, orden);
alter table public.programa_ejercicios enable row level security;

-- Inscripción de un usuario a un programa.
create table if not exists public.app_programas (
  user_id     uuid not null references auth.users(id) on delete cascade,
  programa_id uuid not null references public.programas(id) on delete cascade,
  iniciado_en date not null default (now() at time zone 'Europe/Madrid')::date,
  activo      boolean not null default true,
  primary key (user_id, programa_id)
);
alter table public.app_programas enable row level security;

-- Marcas de ejercicios de programa (gemela de guia_checks para la biblioteca).
create table if not exists public.app_checks (
  user_id               uuid not null references auth.users(id) on delete cascade,
  programa_ejercicio_id uuid not null references public.programa_ejercicios(id) on delete cascade,
  fecha                 date not null,
  primary key (user_id, programa_ejercicio_id, fecha)
);
alter table public.app_checks enable row level security;

-- Chat del usuario independiente (el de clínica sigue en guia_chat, atado a
-- su informe, para que el enlace /r/[token] y la app compartan historial).
create table if not exists public.app_chat (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  rol        text not null check (rol in ('paciente', 'ia')),
  texto      text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_app_chat_user on public.app_chat(user_id, created_at desc);
alter table public.app_chat enable row level security;

-- ─────────────────────────────────────────────────────────────────────
-- 3. Solicitudes de cambio / cancelación de cita
-- ─────────────────────────────────────────────────────────────────────
-- Decisión de fase 4: el paciente SOLICITA, la clínica decide desde su agenda.

create table if not exists public.citas_solicitudes (
  id          uuid primary key default gen_random_uuid(),
  cita_id     uuid not null references public.citas(id) on delete cascade,
  paciente_id uuid not null references public.pacientes(id) on delete cascade,
  clinica_id  uuid references public.clinicas(id),
  tipo        text not null check (tipo in ('cambio', 'cancelacion')),
  nota        text,
  estado      text not null default 'pendiente' check (estado in ('pendiente', 'aceptada', 'rechazada')),
  created_at  timestamptz not null default now()
);
create index if not exists idx_citas_solicitudes_clinica on public.citas_solicitudes(clinica_id, estado);
alter table public.citas_solicitudes enable row level security;

-- La clínica ve y resuelve las suyas. El paciente NO tiene policy: escribe por RPC.
drop policy if exists citas_solicitudes_clinica_select on public.citas_solicitudes;
create policy citas_solicitudes_clinica_select on public.citas_solicitudes
  for select to authenticated using (clinica_id = public.clinica_actual());
drop policy if exists citas_solicitudes_clinica_update on public.citas_solicitudes;
create policy citas_solicitudes_clinica_update on public.citas_solicitudes
  for update to authenticated using (clinica_id = public.clinica_actual());

-- ─────────────────────────────────────────────────────────────────────
-- 4. Cuenta: crear / leer
-- ─────────────────────────────────────────────────────────────────────

create or replace function public.mi_cuenta_crear(p_nombre text default null)
returns jsonb
language plpgsql security definer set search_path to 'public', 'pg_catalog'
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return jsonb_build_object('ok', false);
  end if;
  -- Idempotente: la segunda vez solo completa el nombre si venía vacío.
  insert into app_usuarios (user_id, nombre)
  values (v_uid, nullif(trim(coalesce(p_nombre, '')), ''))
  on conflict (user_id) do update
    set nombre = coalesce(app_usuarios.nombre, excluded.nombre);
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.mi_cuenta_nombre(p_nombre text)
returns jsonb
language plpgsql security definer set search_path to 'public', 'pg_catalog'
as $$
begin
  if auth.uid() is null or length(trim(coalesce(p_nombre, ''))) = 0 then
    return jsonb_build_object('ok', false);
  end if;
  update app_usuarios set nombre = left(trim(p_nombre), 80) where user_id = auth.uid();
  return jsonb_build_object('ok', true);
end $$;

-- Objetivo semanal (días con ejercicio). Premium y clínica.
create or replace function public.mi_objetivo(p_dias integer)
returns jsonb
language plpgsql security definer set search_path to 'public', 'pg_catalog'
as $$
begin
  if auth.uid() is null or p_dias is null or p_dias < 1 or p_dias > 7 then
    return jsonb_build_object('ok', false);
  end if;
  if (public.mi_cuenta() -> 'plan' ->> 'estado') not in ('clinica', 'premium') then
    return jsonb_build_object('ok', false, 'premium', true);
  end if;
  update app_usuarios set objetivo_semanal = p_dias where user_id = auth.uid();
  return jsonb_build_object('ok', true);
end $$;

-- "Quiero Premium" sin pasarela de pago todavía: se anota y se es honesto.
create or replace function public.mi_premium_interes()
returns jsonb
language plpgsql security definer set search_path to 'public', 'pg_catalog'
as $$
begin
  if auth.uid() is null then return jsonb_build_object('ok', false); end if;
  update app_usuarios set premium_interes_at = coalesce(premium_interes_at, now()) where user_id = auth.uid();
  return jsonb_build_object('ok', true);
end $$;

-- Quién soy y en qué situación estoy. Es lo primero que pide cada pantalla.
create or replace function public.mi_cuenta()
returns jsonb
language sql stable security definer set search_path to 'public', 'pg_catalog'
as $$
  with hoy as (select (now() at time zone 'Europe/Madrid')::date as d),
  yo as (select public.paciente_actual() as paciente_id),
  cuenta as (select * from app_usuarios where user_id = auth.uid())
  select jsonb_build_object(
    'tipo', case when yo.paciente_id is not null then 'clinica' else 'independiente' end,
    'nombre', coalesce(pa.nombre, cu.nombre),
    'apellidos', pa.apellidos,
    'email', auth.jwt() ->> 'email',
    'hoy', hoy.d,
    -- estado: 'clinica' (Premium incluido por la clínica) · 'premium' · 'free'
    'plan', case
      when yo.paciente_id is not null then
        jsonb_build_object('estado', 'clinica', 'hasta', null, 'interes', false)
      when cu.plan = 'premium' and cu.premium_hasta is not null and cu.premium_hasta >= hoy.d then
        jsonb_build_object('estado', 'premium', 'hasta', cu.premium_hasta, 'interes', false)
      else
        jsonb_build_object('estado', 'free', 'hasta', null, 'interes', cu.premium_interes_at is not null)
    end,
    'objetivo_semanal', coalesce(cu.objetivo_semanal, 3),
    'clinica', (select jsonb_build_object('nombre', c.nombre, 'telefono', c.telefono, 'direccion', c.direccion)
                from clinicas c where c.id = pa.clinica_id),
    -- Bono: sesiones y caducidad, SIN precio (decisión de fase 4).
    'bono', (select jsonb_build_object(
               'titulo', b.titulo, 'total', b.total_sesiones, 'usadas', b.sesiones_usadas,
               'caducidad', b.fecha_caducidad)
             from bonos b
             where b.paciente_id = yo.paciente_id and b.activo
             order by b.fecha_caducidad desc nulls last limit 1),
    'tiene_plan_fisio', exists (
      select 1 from informes i where i.paciente_id = yo.paciente_id and i.estado = 'publicado')
  )
  from hoy, yo
  left join cuenta cu on true
  left join pacientes pa on pa.id = yo.paciente_id
  where auth.uid() is not null;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 5. Biblioteca y programas
-- ─────────────────────────────────────────────────────────────────────

-- Un ejercicio de programa con la MISMA forma que un ejercicio de la guía
-- (EjercicioGuia): así la sesión guiada y el detalle no distinguen de dónde
-- viene. El `id` es el de programa_ejercicios, que es lo que se marca.
create or replace function public.programa_ejercicio_json(p_pe_id uuid)
returns jsonb
language sql stable security definer set search_path to 'public', 'pg_catalog'
as $$
  select jsonb_build_object(
    'id',            pe.id,
    'nombre',        e.nombre,
    'instrucciones', e.instrucciones,
    'musculos',      e.musculos,
    'series',        pe.series,
    'repeticiones',  pe.repeticiones,
    'frecuencia',    p.frecuencia,
    'descanso',      pe.descanso,
    'duracion',      pe.duracion,
    'errores',       e.errores,
    'consejos',      e.consejos,
    'nota',          null,
    'imagen_url',    e.imagen_url,
    'gif_url',       e.gif_url,
    'video_url',     e.video_url,
    'orden',         pe.orden,
    'zona',          e.zona,
    'nivel',         e.nivel,
    'equipo',        e.equipo
    -- NO salen: clinica_id, fuente, activo, created_at.
  )
  from programa_ejercicios pe
  join ejercicios e on e.id = pe.ejercicio_id
  join programas p on p.id = pe.programa_id
  where pe.id = p_pe_id;
$$;
revoke all on function public.programa_ejercicio_json(uuid) from public, anon, authenticated;

-- Portada de un programa para las listas (biblioteca y "mis rutinas").
create or replace function public.programa_tarjeta_json(p_id uuid)
returns jsonb
language sql stable security definer set search_path to 'public', 'pg_catalog'
as $$
  with hoy as (select (now() at time zone 'Europe/Madrid')::date as d)
  select jsonb_build_object(
    'id', p.id, 'slug', p.slug, 'titulo', p.titulo, 'descripcion', p.descripcion,
    'zona', p.zona, 'nivel', p.nivel, 'semanas', p.semanas, 'frecuencia', p.frecuencia,
    'premium', p.premium,
    'imagen_url', (select e.imagen_url from programa_ejercicios pe join ejercicios e on e.id = pe.ejercicio_id
                   where pe.programa_id = p.id and e.imagen_url is not null order by pe.orden limit 1),
    'n_ejercicios', (select count(*) from programa_ejercicios pe where pe.programa_id = p.id),
    'inscrito', ap.user_id is not null,
    'activo', coalesce(ap.activo, false),
    'iniciado_en', ap.iniciado_en,
    'semana_actual', case when ap.iniciado_en is null then null
                          else least(p.semanas, ((hoy.d - ap.iniciado_en) / 7) + 1) end,
    'hechos_hoy', (select count(*) from app_checks c join programa_ejercicios pe on pe.id = c.programa_ejercicio_id
                   where pe.programa_id = p.id and c.user_id = auth.uid() and c.fecha = hoy.d)
  )
  from programas p
  left join app_programas ap on ap.programa_id = p.id and ap.user_id = auth.uid()
  cross join hoy
  where p.id = p_id;
$$;
revoke all on function public.programa_tarjeta_json(uuid) from public, anon, authenticated;

create or replace function public.mi_biblioteca()
returns jsonb
language sql stable security definer set search_path to 'public', 'pg_catalog'
as $$
  select coalesce(jsonb_agg(public.programa_tarjeta_json(p.id) order by p.orden, p.titulo), '[]'::jsonb)
  from programas p
  where p.publico and auth.uid() is not null;
$$;

create or replace function public.mi_rutinas()
returns jsonb
language sql stable security definer set search_path to 'public', 'pg_catalog'
as $$
  select coalesce(jsonb_agg(public.programa_tarjeta_json(ap.programa_id) order by ap.activo desc, ap.iniciado_en desc), '[]'::jsonb)
  from app_programas ap
  where ap.user_id = auth.uid();
$$;

create or replace function public.mi_programa(p_id uuid)
returns jsonb
language sql stable security definer set search_path to 'public', 'pg_catalog'
as $$
  select jsonb_build_object(
    'programa', public.programa_tarjeta_json(p.id),
    'ejercicios', coalesce((
      select jsonb_agg(public.programa_ejercicio_json(pe.id) order by pe.orden)
      from programa_ejercicios pe where pe.programa_id = p.id), '[]'::jsonb),
    'checks', coalesce((
      select jsonb_agg(jsonb_build_object('ejercicio_id', c.programa_ejercicio_id, 'fecha', c.fecha))
      from app_checks c join programa_ejercicios pe on pe.id = c.programa_ejercicio_id
      where pe.programa_id = p.id and c.user_id = auth.uid()
        and c.fecha >= (now() at time zone 'Europe/Madrid')::date - 90), '[]'::jsonb),
    'hoy', (now() at time zone 'Europe/Madrid')::date
  )
  from programas p
  where p.id = p_id and p.publico and auth.uid() is not null;
$$;

create or replace function public.mi_ejercicio(p_pe_id uuid)
returns jsonb
language sql stable security definer set search_path to 'public', 'pg_catalog'
as $$
  select jsonb_build_object(
    'ejercicio', public.programa_ejercicio_json(pe.id),
    'programa', jsonb_build_object('id', p.id, 'titulo', p.titulo),
    'hecho_hoy', exists (
      select 1 from app_checks c where c.programa_ejercicio_id = pe.id and c.user_id = auth.uid()
        and c.fecha = (now() at time zone 'Europe/Madrid')::date),
    'hoy', (now() at time zone 'Europe/Madrid')::date
  )
  from programa_ejercicios pe join programas p on p.id = pe.programa_id
  where pe.id = p_pe_id and p.publico and auth.uid() is not null;
$$;

-- Ejercicio del plan del fisio (informe_ejercicios), para el detalle en la app.
create or replace function public.mi_ejercicio_plan(p_id uuid)
returns jsonb
language sql stable security definer set search_path to 'public', 'pg_catalog'
as $$
  select jsonb_build_object(
    'ejercicio', jsonb_build_object(
      'id', e.id, 'nombre', e.nombre, 'instrucciones', e.instrucciones, 'musculos', e.musculos,
      'series', e.series, 'repeticiones', e.repeticiones, 'frecuencia', e.frecuencia,
      'descanso', e.descanso, 'duracion', e.duracion, 'errores', e.errores, 'consejos', e.consejos,
      'nota', e.nota, 'imagen_url', e.imagen_url, 'gif_url', e.gif_url, 'video_url', e.video_url,
      'orden', e.orden, 'nivel', e.nivel),
    'programa', jsonb_build_object('id', 'plan', 'titulo', 'Plan de tu fisioterapeuta'),
    'faq', (select f from jsonb_array_elements(coalesce(i.faq -> 'ejercicios', '[]'::jsonb)) f
            where lower(trim(f ->> 'nombre')) = lower(trim(e.nombre)) limit 1),
    'hecho_hoy', exists (
      select 1 from guia_checks c where c.informe_ejercicio_id = e.id
        and c.fecha = (now() at time zone 'Europe/Madrid')::date),
    'hoy', (now() at time zone 'Europe/Madrid')::date
  )
  from informe_ejercicios e
  join informes i on i.id = e.informe_id
  where e.id = p_id and i.estado = 'publicado' and i.paciente_id = public.paciente_actual();
$$;

create or replace function public.mi_programa_activar(p_id uuid, p_activo boolean default true)
returns jsonb
language plpgsql security definer set search_path to 'public', 'pg_catalog'
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or not exists (select 1 from programas where id = p_id and publico) then
    return jsonb_build_object('ok', false);
  end if;
  -- Un programa Premium solo lo activa quien tiene Premium (o clínica).
  if p_activo and exists (select 1 from programas where id = p_id and premium)
     and (public.mi_cuenta() -> 'plan' ->> 'estado') not in ('clinica', 'premium') then
    return jsonb_build_object('ok', false, 'premium', true);
  end if;
  insert into app_programas (user_id, programa_id, activo)
  values (v_uid, p_id, p_activo)
  on conflict (user_id, programa_id) do update set activo = excluded.activo;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.mi_programa_marcar(p_pe_id uuid, p_hecho boolean)
returns jsonb
language plpgsql security definer set search_path to 'public', 'pg_catalog'
as $$
declare
  v_uid   uuid := auth.uid();
  v_fecha date := (now() at time zone 'Europe/Madrid')::date;
begin
  -- Solo se marcan ejercicios de programas en los que estoy inscrito.
  if v_uid is null or not exists (
    select 1 from programa_ejercicios pe
    join app_programas ap on ap.programa_id = pe.programa_id and ap.user_id = v_uid
    where pe.id = p_pe_id) then
    return jsonb_build_object('ok', false);
  end if;

  if p_hecho then
    insert into app_checks (user_id, programa_ejercicio_id, fecha) values (v_uid, p_pe_id, v_fecha)
    on conflict do nothing;
  else
    delete from app_checks where user_id = v_uid and programa_ejercicio_id = p_pe_id and fecha = v_fecha;
  end if;
  return jsonb_build_object('ok', true, 'fecha', v_fecha);
end $$;

-- ─────────────────────────────────────────────────────────────────────
-- 6. Citas (solo pacientes de clínica)
-- ─────────────────────────────────────────────────────────────────────

create or replace function public.mi_citas()
returns jsonb
language sql stable security definer set search_path to 'public', 'pg_catalog'
as $$
  with yo as (select public.paciente_actual() as id)
  select jsonb_build_object(
    'hoy', (now() at time zone 'Europe/Madrid')::date,
    'citas', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',           ci.id,
        'fecha_hora',   ci.fecha_hora,
        'duracion_min', ci.duracion_min,
        'estado',       coalesce(ci.estado, 'pendiente'),
        'tipo',         tc.nombre,
        'color',        tc.color,
        'fisio',        (select pf.nombre from perfiles pf where pf.id = ci.user_id),
        'solicitud',    (select jsonb_build_object('tipo', s.tipo, 'estado', s.estado)
                         from citas_solicitudes s where s.cita_id = ci.id
                         order by s.created_at desc limit 1)
        -- NO salen: notas (son del fisio), clinica_id, user_id.
      ) order by ci.fecha_hora)
      from citas ci
      left join tipos_cita tc on tc.id = ci.tipo_id
      cross join yo
      where ci.paciente_id = yo.id
        and ci.fecha_hora >= now() - interval '365 days'), '[]'::jsonb)
  )
  from yo where yo.id is not null;
$$;

create or replace function public.mi_cita_solicitar(p_cita uuid, p_tipo text, p_nota text default null)
returns jsonb
language plpgsql security definer set search_path to 'public', 'pg_catalog'
as $$
declare
  v_pac     uuid := public.paciente_actual();
  v_clinica uuid;
begin
  if v_pac is null or p_tipo not in ('cambio', 'cancelacion') then
    return jsonb_build_object('ok', false);
  end if;
  -- La cita tiene que ser MÍA, futura y no cancelada.
  select ci.clinica_id into v_clinica
  from citas ci
  where ci.id = p_cita and ci.paciente_id = v_pac
    and ci.fecha_hora > now() and coalesce(ci.estado, 'pendiente') <> 'cancelada';
  if not found then
    return jsonb_build_object('ok', false);
  end if;
  -- Una solicitud pendiente por cita: la segunda sustituye a la primera.
  delete from citas_solicitudes where cita_id = p_cita and estado = 'pendiente';
  insert into citas_solicitudes (cita_id, paciente_id, clinica_id, tipo, nota)
  values (p_cita, v_pac, v_clinica, p_tipo, left(coalesce(p_nota, ''), 300));
  return jsonb_build_object('ok', true);
end $$;

-- ─────────────────────────────────────────────────────────────────────
-- 7. Chat por identidad (clínica → guia_chat del informe; sin clínica → app_chat)
-- ─────────────────────────────────────────────────────────────────────

create or replace function public.mi_chat()
returns jsonb
language sql stable security definer set search_path to 'public', 'pg_catalog'
as $$
  with yo as (select public.paciente_actual() as pac),
  informe as (
    select i.id from informes i, yo
    where i.paciente_id = yo.pac and i.estado = 'publicado'
    order by i.fecha desc, i.publicado_at desc nulls last limit 1)
  select coalesce((
    select jsonb_agg(jsonb_build_object('rol', m.rol, 'texto', m.texto) order by m.created_at)
    from (
      select rol, texto, created_at from guia_chat, informe where informe_id = informe.id
      union all
      select rol, texto, created_at from app_chat, yo where user_id = auth.uid() and yo.pac is null
      order by created_at desc limit 30) m), '[]'::jsonb)
  where auth.uid() is not null;
$$;

create or replace function public.mi_chat_insertar(p_rol text, p_texto text)
returns jsonb
language plpgsql security definer set search_path to 'public', 'pg_catalog'
as $$
declare
  v_uid     uuid := auth.uid();
  v_pac     uuid := public.paciente_actual();
  v_informe uuid;
  v_clinica uuid;
  v_limite  integer;
  v_hoy     integer;
  v_estado  text;
begin
  if v_uid is null or p_rol not in ('paciente', 'ia') or length(trim(coalesce(p_texto, ''))) = 0 then
    return jsonb_build_object('ok', false);
  end if;

  if v_pac is not null then
    -- Paciente de clínica: mismo historial y mismo límite que su enlace /r/.
    select i.id, i.clinica_id into v_informe, v_clinica
    from informes i where i.paciente_id = v_pac and i.estado = 'publicado'
    order by i.fecha desc, i.publicado_at desc nulls last limit 1;
    if v_informe is null then
      return jsonb_build_object('ok', false, 'sin_plan', true);
    end if;
    if p_rol = 'paciente' then
      select coalesce(c.limite_chat_dia, 12) into v_limite from clinicas c where c.id = v_clinica;
      v_limite := coalesce(v_limite, 12);
      select count(*) into v_hoy from guia_chat
      where informe_id = v_informe and rol = 'paciente'
        and (created_at at time zone 'Europe/Madrid')::date = (now() at time zone 'Europe/Madrid')::date;
      if v_hoy >= v_limite then
        return jsonb_build_object('ok', false, 'limite', true);
      end if;
    end if;
    insert into guia_chat (informe_id, rol, texto) values (v_informe, p_rol, left(p_texto, 1200));
    if p_rol = 'paciente' and v_clinica is not null then
      perform public.uso_ia_sumar(v_clinica, 'guia_chat');
    end if;
    return jsonb_build_object('ok', true, 'restantes',
      case when p_rol = 'paciente' then v_limite - v_hoy - 1 else null end);
  end if;

  -- Usuario independiente: el asistente es Premium.
  select (mi_cuenta() -> 'plan' ->> 'estado') into v_estado;
  if v_estado <> 'premium' then
    return jsonb_build_object('ok', false, 'premium', true);
  end if;
  if p_rol = 'paciente' then
    v_limite := 10;
    select count(*) into v_hoy from app_chat
    where user_id = v_uid and rol = 'paciente'
      and (created_at at time zone 'Europe/Madrid')::date = (now() at time zone 'Europe/Madrid')::date;
    if v_hoy >= v_limite then
      return jsonb_build_object('ok', false, 'limite', true);
    end if;
  end if;
  insert into app_chat (user_id, rol, texto) values (v_uid, p_rol, left(p_texto, 1200));
  return jsonb_build_object('ok', true, 'restantes',
    case when p_rol = 'paciente' then v_limite - v_hoy - 1 else null end);
end $$;

-- ─────────────────────────────────────────────────────────────────────
-- 8. Estadísticas del perfil (los tres números de la pantalla de perfil)
-- ─────────────────────────────────────────────────────────────────────

create or replace function public.mi_estadisticas()
returns jsonb
language sql stable security definer set search_path to 'public', 'pg_catalog'
as $$
  with hoy as (select (now() at time zone 'Europe/Madrid')::date as d),
  yo as (select public.paciente_actual() as pac),
  -- Todas mis marcas de los últimos 30 días, vengan del plan del fisio o de la biblioteca.
  marcas as (
    select gk.fecha from guia_checks gk join informes i on i.id = gk.informe_id, yo, hoy
    where i.paciente_id = yo.pac and gk.fecha >= hoy.d - 30
    union all
    select c.fecha from app_checks c, hoy where c.user_id = auth.uid() and c.fecha >= hoy.d - 30),
  dolor as (
    select gc.fecha, gc.dolor from guia_checkins gc join informes i on i.id = gc.informe_id, yo, hoy
    where i.paciente_id = yo.pac and gc.dolor is not null and gc.fecha >= hoy.d - 90)
  select jsonb_build_object(
    'objetivo_semanal', coalesce((select objetivo_semanal from app_usuarios where user_id = auth.uid()), 3),
    'dias_esta_semana', (select count(distinct m.fecha) from marcas m, hoy
                         where m.fecha >= hoy.d - ((extract(isodow from hoy.d)::int) - 1)),
    'dias_activos_30', (select count(distinct fecha) from marcas),
    'ejercicios_30',   (select count(*) from marcas),
    'rutinas_activas', (select count(*) from app_programas where user_id = auth.uid() and activo)
                       + case when exists (select 1 from informes i, yo where i.paciente_id = yo.pac and i.estado = 'publicado') then 1 else 0 end,
    'mejora_dolor_pct', (
      select case when p.dolor > 0 then round(100.0 * (p.dolor - u.dolor) / p.dolor) else null end
      from (select dolor from dolor order by fecha asc limit 1) p,
           (select dolor from dolor order by fecha desc limit 1) u)
  )
  where auth.uid() is not null;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 9. Permisos: todo exige sesión, anon fuera
-- ─────────────────────────────────────────────────────────────────────

revoke all on function public.mi_cuenta_crear(text)               from public, anon;
revoke all on function public.mi_cuenta_nombre(text)              from public, anon;
revoke all on function public.mi_objetivo(integer)                from public, anon;
revoke all on function public.mi_premium_interes()                from public, anon;
revoke all on function public.mi_cuenta()                         from public, anon;
revoke all on function public.mi_biblioteca()                     from public, anon;
revoke all on function public.mi_rutinas()                        from public, anon;
revoke all on function public.mi_programa(uuid)                   from public, anon;
revoke all on function public.mi_ejercicio(uuid)                  from public, anon;
revoke all on function public.mi_ejercicio_plan(uuid)             from public, anon;
revoke all on function public.mi_programa_activar(uuid, boolean)  from public, anon;
revoke all on function public.mi_programa_marcar(uuid, boolean)   from public, anon;
revoke all on function public.mi_citas()                          from public, anon;
revoke all on function public.mi_cita_solicitar(uuid, text, text) from public, anon;
revoke all on function public.mi_chat()                           from public, anon;
revoke all on function public.mi_chat_insertar(text, text)        from public, anon;
revoke all on function public.mi_estadisticas()                   from public, anon;

grant execute on function public.mi_cuenta_crear(text)               to authenticated;
grant execute on function public.mi_cuenta_nombre(text)              to authenticated;
grant execute on function public.mi_objetivo(integer)                to authenticated;
grant execute on function public.mi_premium_interes()                to authenticated;
grant execute on function public.mi_cuenta()                         to authenticated;
grant execute on function public.mi_biblioteca()                     to authenticated;
grant execute on function public.mi_rutinas()                        to authenticated;
grant execute on function public.mi_programa(uuid)                   to authenticated;
grant execute on function public.mi_ejercicio(uuid)                  to authenticated;
grant execute on function public.mi_ejercicio_plan(uuid)             to authenticated;
grant execute on function public.mi_programa_activar(uuid, boolean)  to authenticated;
grant execute on function public.mi_programa_marcar(uuid, boolean)   to authenticated;
grant execute on function public.mi_citas()                          to authenticated;
grant execute on function public.mi_cita_solicitar(uuid, text, text) to authenticated;
grant execute on function public.mi_chat()                           to authenticated;
grant execute on function public.mi_chat_insertar(text, text)        to authenticated;
grant execute on function public.mi_estadisticas()                   to authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 10. Semilla: cinco programas sobre la biblioteca actual (por NOMBRE, sin ids)
-- ─────────────────────────────────────────────────────────────────────

insert into public.programas (slug, titulo, descripcion, zona, nivel, semanas, frecuencia, premium, orden) values
  ('espalda-sana',      'Espalda sana',
   'Movilidad y fuerza para una zona lumbar que se queja al levantarte o al estar sentado mucho rato.',
   'Lumbar', 'principiante', 4, '4 veces por semana', false, 1),
  ('cuello-y-hombros',  'Cuello y hombros',
   'Para la tensión de pantalla y escritorio: movilidad cervical y apertura de hombros.',
   'Cervical', 'principiante', 3, 'a diario', false, 2),
  ('rodilla-en-descarga', 'Rodilla en descarga',
   'Fuerza suave de cuádriceps y estiramientos de la cadena posterior sin cargar la articulación.',
   'Rodilla', 'principiante', 4, '3 veces por semana', false, 3),
  ('activacion-core',   'Activación core',
   'Estabilidad del tronco para proteger la espalda en el día a día y en el deporte.',
   'Core', 'intermedio', 3, '3 veces por semana', true, 4),
  ('cadera-y-equilibrio', 'Cadera y equilibrio',
   'Prevención: cadera libre y tobillos estables para caminar, correr y no caerse.',
   'Cadera', 'intermedio', 4, '3 veces por semana', true, 5)
on conflict (slug) do nothing;

insert into public.programa_ejercicios (programa_id, ejercicio_id, orden, series, repeticiones, descanso, duracion)
select p.id, e.id, v.orden, v.series, v.reps, v.descanso, v.duracion
from (values
  -- Espalda sana
  ('espalda-sana', 'Gato-camello',                          1, 2, '10 repeticiones', '30 s', null),
  ('espalda-sana', 'Báscula pélvica',                       2, 2, '12 repeticiones', '30 s', null),
  ('espalda-sana', 'Puente de glúteo',                      3, 3, '10 repeticiones', '45 s', null),
  ('espalda-sana', 'Rodilla cruzada (estiramiento lumbar)', 4, 2, '30 s por lado',  '20 s', '30 s'),
  ('espalda-sana', 'Superman (extensión lumbar)',           5, 2, '8 repeticiones',  '45 s', null),
  ('espalda-sana', 'Postura del niño',                      6, 1, '45 s',            null,   '45 s'),
  -- Cuello y hombros
  ('cuello-y-hombros', 'Retracción cervical (doble mentón)', 1, 2, '10 repeticiones', '20 s', null),
  ('cuello-y-hombros', 'Inclinación cervical lateral',      2, 2, '20 s por lado',  '20 s', '20 s'),
  ('cuello-y-hombros', 'Círculos de hombro',                3, 2, '10 repeticiones', '20 s', null),
  ('cuello-y-hombros', 'Pendular de hombro',                4, 2, '30 s',            '20 s', '30 s'),
  ('cuello-y-hombros', 'Estiramiento cruzado de hombro',    5, 2, '20 s por lado',  '20 s', '20 s'),
  ('cuello-y-hombros', 'Apertura de banda elástica',        6, 3, '12 repeticiones', '30 s', null),
  -- Rodilla en descarga
  ('rodilla-en-descarga', 'Cuádriceps isométrico',                     1, 3, '10 repeticiones', '30 s', '5 s'),
  ('rodilla-en-descarga', 'Sentadilla a silla',                        2, 3, '8 repeticiones',  '45 s', null),
  ('rodilla-en-descarga', 'Estiramiento de isquiotibiales',            3, 2, '30 s por lado',  '20 s', '30 s'),
  ('rodilla-en-descarga', 'Estiramiento de cuádriceps a cuatro patas', 4, 2, '30 s por lado',  '20 s', '30 s'),
  ('rodilla-en-descarga', 'Estiramiento de gemelo de pie',             5, 2, '30 s por lado',  '20 s', '30 s'),
  -- Activación core
  ('activacion-core', 'Dead bug (estabilidad de core)',              1, 3, '8 por lado',      '45 s', null),
  ('activacion-core', 'Plancha abdominal',                           2, 3, '20 s',            '45 s', '20 s'),
  ('activacion-core', 'Plancha lateral',                             3, 2, '15 s por lado',   '45 s', '15 s'),
  ('activacion-core', 'Elevación de cadera con rodillas flexionadas', 4, 3, '10 repeticiones', '45 s', null),
  ('activacion-core', 'Abdominal parcial (3/4)',                     5, 3, '12 repeticiones', '45 s', null),
  -- Cadera y equilibrio
  ('cadera-y-equilibrio', 'Estiramiento de glúteo (figura 4)',   1, 2, '30 s por lado',  '20 s', '30 s'),
  ('cadera-y-equilibrio', 'Estiramiento de psoas de pie',        2, 2, '30 s por lado',  '20 s', '30 s'),
  ('cadera-y-equilibrio', 'Aducción de cadera con goma',         3, 3, '12 por lado',    '45 s', null),
  ('cadera-y-equilibrio', 'Equilibrio en superficie inestable',  4, 3, '30 s por pierna', '30 s', '30 s'),
  ('cadera-y-equilibrio', 'Círculos de tobillo',                 5, 2, '10 por sentido', '15 s', null),
  ('cadera-y-equilibrio', 'Estiramiento de gemelo sentado',      6, 2, '30 s por lado',  '20 s', '30 s')
) as v(slug, nombre, orden, series, reps, descanso, duracion)
join public.programas p on p.slug = v.slug
join public.ejercicios e on e.nombre = v.nombre
where not exists (select 1 from public.programa_ejercicios x where x.programa_id = p.id);

-- ─────────────────────────────────────────────────────────────────────
-- 11. Días con ejercicio (calendario y constancia), de las dos fuentes
-- ─────────────────────────────────────────────────────────────────────
-- Gemela de `checks_por_dia` de mi_progreso(), pero para TODO el mundo: al
-- usuario sin clínica mi_progreso() no le devuelve nada (no es paciente) y
-- aun así tiene que ver sus días de ejercicio en el calendario.

create or replace function public.mi_dias_ejercicio()
returns jsonb
language sql stable security definer set search_path to 'public', 'pg_catalog'
as $$
  with hoy as (select (now() at time zone 'Europe/Madrid')::date as d),
  yo as (select public.paciente_actual() as pac),
  marcas as (
    select gk.fecha from guia_checks gk join informes i on i.id = gk.informe_id, yo, hoy
    where i.paciente_id = yo.pac and gk.fecha >= hoy.d - 180
    union all
    select c.fecha from app_checks c, hoy where c.user_id = auth.uid() and c.fecha >= hoy.d - 180)
  select coalesce((
    select jsonb_agg(jsonb_build_object('fecha', t.fecha, 'hechos', t.n) order by t.fecha)
    from (select fecha, count(*) as n from marcas group by fecha) t), '[]'::jsonb)
  where auth.uid() is not null;
$$;
revoke all on function public.mi_dias_ejercicio() from public, anon;
grant execute on function public.mi_dias_ejercicio() to authenticated;
