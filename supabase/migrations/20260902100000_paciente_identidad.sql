-- 20260902100000_paciente_identidad.sql
-- Fase 1A de la app del paciente: identidad propia + RPCs con lista blanca.
--
-- MODELO DE SEGURIDAD (importante, no improvisar sobre esto):
-- El paciente que inicia sesión es rol `authenticated`, el MISMO que un fisio.
-- Verificado el 02/09/2026 contra la base real: un `authenticated` sin fila en
-- `perfiles` ve 0 filas en las 15 tablas (`clinica_actual()` devuelve null y
-- todas las policies cuelgan de ahí). Por eso NO se añade ni una sola policy
-- nueva para el paciente: no tiene acceso directo a ninguna tabla y todo pasa
-- por estas funciones SECURITY DEFINER con las columnas enumeradas a mano.
--
-- La razón de enumerar en vez de restar (`to_jsonb(fila) - 'columna'`) es que
-- la resta es una lista NEGRA: cualquier columna que se añada mañana a
-- `informes` se publicaría sola. Aquí, una columna nueva no sale hasta que
-- alguien la escriba.

-- ─────────────────────────────────────────────────────────────────────
-- 1. Vínculo entre la ficha del paciente y su usuario de Auth
-- ─────────────────────────────────────────────────────────────────────
-- OJO: `pacientes.user_id` NO sirve para esto. Es el fisio propietario de la
-- ficha (verificado: las 22 filas apuntan a un perfil de la clínica) y varias
-- policies dependen de ello. Hace falta columna propia.

alter table public.pacientes
  add column if not exists auth_user_id uuid unique
  references auth.users(id) on delete set null;

comment on column public.pacientes.auth_user_id is
  'Usuario de Auth del PACIENTE (app del paciente). Distinto de user_id, que es el fisio propietario de la ficha.';

create index if not exists idx_pacientes_auth_user
  on public.pacientes(auth_user_id) where auth_user_id is not null;

-- ─────────────────────────────────────────────────────────────────────
-- 2. Quién es el paciente que está mirando  (análogo a clinica_actual())
-- ─────────────────────────────────────────────────────────────────────

create or replace function public.paciente_actual()
returns uuid
language sql stable security definer set search_path to 'public', 'pg_catalog'
as $$
  select id from public.pacientes where auth_user_id = auth.uid()
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 3. Vincular cuenta ← token
-- ─────────────────────────────────────────────────────────────────────
-- El paciente llega por su enlace de WhatsApp (/r/[token]) y pulsa "guardar mi
-- progreso". Doble factor deliberado: hace falta el TOKEN **y** controlar el
-- EMAIL que la clínica tiene en la ficha. Solo con el token no basta, porque el
-- token da acceso a un informe y la cuenta daría acceso a todo el historial:
-- sería una escalada.

create or replace function public.paciente_vincular(p_token text)
returns jsonb
language plpgsql security definer set search_path to 'public', 'pg_catalog'
as $$
declare
  v_uid   uuid := auth.uid();
  v_email text := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
  v_pac   uuid;
  v_ya    uuid;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'motivo', 'sin_sesion');
  end if;
  if v_email = '' then
    return jsonb_build_object('ok', false, 'motivo', 'sin_email');
  end if;

  -- Idempotente: si esta cuenta ya está vinculada, no se toca nada.
  select id into v_ya from pacientes where auth_user_id = v_uid;
  if v_ya is not null then
    return jsonb_build_object('ok', true, 'ya_vinculado', true);
  end if;

  -- El token debe apuntar a una guía publicada CUYO paciente tenga
  -- exactamente este email. Si la clínica no guardó email, no hay vínculo.
  select p.id into v_pac
  from informes i
  join pacientes p on p.id = i.paciente_id
  where i.token = p_token
    and i.estado = 'publicado'
    and lower(trim(coalesce(p.email, ''))) = v_email
  limit 1;

  if v_pac is null then
    -- Mensaje deliberadamente único: no revelamos si falló el token o el email.
    return jsonb_build_object('ok', false, 'motivo', 'no_coincide');
  end if;

  -- Una ficha ya reclamada por otra cuenta no se roba.
  if exists (
    select 1 from pacientes
    where id = v_pac and auth_user_id is not null and auth_user_id <> v_uid
  ) then
    return jsonb_build_object('ok', false, 'motivo', 'ya_reclamado');
  end if;

  update pacientes set auth_user_id = v_uid where id = v_pac;
  return jsonb_build_object('ok', true);
end $$;

-- ─────────────────────────────────────────────────────────────────────
-- 4. Constructor único del payload de la guía  (lista blanca)
-- ─────────────────────────────────────────────────────────────────────
-- Lo comparten informe_publico() (acceso por token, sin login) y mi_plan()
-- (acceso por identidad, con login). Un solo sitio que decida qué se publica.

create or replace function public.guia_payload(p_informe uuid)
returns jsonb
language sql stable security definer set search_path to 'public', 'pg_catalog'
as $$
  select jsonb_build_object(
    'informe', jsonb_build_object(
      'id',              i.id,
      'fecha',           i.fecha,
      'resumen',         i.resumen,
      'explicacion',     i.explicacion,
      'que_esperar',     i.que_esperar,
      'recomendaciones', i.recomendaciones,
      'motivacion',      i.motivacion,
      'metricas',        i.metricas,
      'faq',             i.faq
      -- NO se publican: notas_fisio, token, paciente_id, episodio_id,
      -- sesion_id, clinica_id, fisio_id, estado, tipo_sesion, timestamps.
    ),
    'paciente', (select jsonb_build_object('nombre', pa.nombre, 'apellidos', pa.apellidos)
                 from pacientes pa where pa.id = i.paciente_id),
    'fisio',    (select jsonb_build_object('nombre', pf.nombre, 'apellidos', pf.apellidos)
                 from perfiles pf where pf.id = i.fisio_id),
    'clinica',  (select jsonb_build_object('nombre', c.nombre)
                 from clinicas c where c.id = i.clinica_id),
    'ejercicios', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',           e.id,
        'nombre',       e.nombre,
        'instrucciones',e.instrucciones,
        'musculos',     e.musculos,
        'series',       e.series,
        'repeticiones', e.repeticiones,
        'frecuencia',   e.frecuencia,
        'descanso',     e.descanso,
        'duracion',     e.duracion,
        'errores',      e.errores,
        'consejos',     e.consejos,
        'nota',         e.nota,
        'imagen_url',   e.imagen_url,
        'gif_url',      e.gif_url,
        'video_url',    e.video_url,
        'orden',        e.orden
      ) order by e.orden)
      from informe_ejercicios e where e.informe_id = i.id), '[]'::jsonb),
    'checks', coalesce((
      select jsonb_agg(jsonb_build_object('ejercicio_id', c.informe_ejercicio_id, 'fecha', c.fecha))
      from guia_checks c
      where c.informe_id = i.id
        and c.fecha >= (now() at time zone 'Europe/Madrid')::date - 90), '[]'::jsonb),
    'checkins', coalesce((
      select jsonb_agg(jsonb_build_object('fecha', k.fecha, 'dolor', k.dolor) order by k.fecha)
      from guia_checkins k
      where k.informe_id = i.id
        and k.fecha >= (now() at time zone 'Europe/Madrid')::date - 90), '[]'::jsonb),
    'chat', coalesce((
      select jsonb_agg(jsonb_build_object('rol', m.rol, 'texto', m.texto) order by m.created_at)
      from (select rol, texto, created_at from guia_chat
            where informe_id = i.id order by created_at desc limit 30) m), '[]'::jsonb),
    'hoy', (now() at time zone 'Europe/Madrid')::date
  )
  from informes i where i.id = p_informe;
$$;

-- La usan otras funciones SECURITY DEFINER, no la red. Nadie la llama directo.
revoke all on function public.guia_payload(uuid) from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 5. informe_publico(): mismo contrato de siempre, ahora por lista blanca
-- ─────────────────────────────────────────────────────────────────────
-- La forma del JSON no cambia (GuiaPaciente.tsx y /api/guia siguen igual).
-- Cambia lo que YA no viaja: token, ids internos y las columnas futuras.
-- La ventana de checks/checkins pasa de 28 a 90 días para la vista de evolución.

create or replace function public.informe_publico(p_token text)
returns jsonb
language sql stable security definer set search_path to 'public', 'pg_catalog'
as $$
  select public.guia_payload(i.id)
  from informes i
  where i.token = p_token and i.estado = 'publicado';
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 6. RPCs de la app del paciente (requieren sesión de paciente)
-- ─────────────────────────────────────────────────────────────────────

-- Plan activo: la guía publicada más reciente del paciente que ha iniciado
-- sesión. Sin token de por medio: la identidad manda.
create or replace function public.mi_plan()
returns jsonb
language sql stable security definer set search_path to 'public', 'pg_catalog'
as $$
  select public.guia_payload(i.id)
  from informes i
  where i.paciente_id = public.paciente_actual()
    and i.estado = 'publicado'
  order by i.fecha desc, i.publicado_at desc nulls last
  limit 1;
$$;

-- Portada de la app: quién soy, mi clínica, mi próxima cita, mis episodios.
-- Solo lo que el paciente debe ver. Nada de diagnósticos ni notas internas.
create or replace function public.mi_resumen()
returns jsonb
language sql stable security definer set search_path to 'public', 'pg_catalog'
as $$
  select jsonb_build_object(
    'paciente', jsonb_build_object('nombre', p.nombre, 'apellidos', p.apellidos),
    'clinica',  (select jsonb_build_object('nombre', c.nombre, 'telefono', c.telefono)
                 from clinicas c where c.id = p.clinica_id),
    'hoy', (now() at time zone 'Europe/Madrid')::date,
    'proxima_cita', (
      select jsonb_build_object(
        'fecha_hora', ci.fecha_hora,
        'duracion_min', ci.duracion_min,
        'tipo',  (select tc.nombre from tipos_cita tc where tc.id = ci.tipo_id),
        'color', (select tc.color  from tipos_cita tc where tc.id = ci.tipo_id))
      from citas ci
      where ci.paciente_id = p.id
        and ci.fecha_hora >= now()
        and coalesce(ci.estado, 'pendiente') <> 'cancelada'
      order by ci.fecha_hora asc limit 1),
    'episodios_activos', (
      select count(*) from episodios ep
      where ep.paciente_id = p.id and ep.estado = 'activo'),
    'tiene_plan', exists (
      select 1 from informes i
      where i.paciente_id = p.id and i.estado = 'publicado')
  )
  from pacientes p where p.id = public.paciente_actual();
$$;

-- Estas tres exigen sesión: fuera del alcance de anon.
revoke all on function public.paciente_vincular(text) from public, anon;
revoke all on function public.mi_plan()               from public, anon;
revoke all on function public.mi_resumen()            from public, anon;
revoke all on function public.paciente_actual()       from public, anon;
grant execute on function public.paciente_vincular(text) to authenticated;
grant execute on function public.mi_plan()               to authenticated;
grant execute on function public.mi_resumen()            to authenticated;
grant execute on function public.paciente_actual()       to authenticated;

-- informe_publico sigue siendo pública a propósito: es la guía por enlace.
grant execute on function public.informe_publico(text) to anon, authenticated;
