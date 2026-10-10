-- 20261010120000_codigos_invitacion.sql
-- Código de invitación: el puente corto entre una clínica y su paciente.
--
-- EL PROBLEMA QUE RESUELVE
-- Hasta hoy, la única forma de que un paciente enlazara su cuenta con su ficha
-- era abrir el enlace largo de su informe (/r/<token>) y pulsar "Guarda tu
-- progreso", lo cual además exigía que el correo de la ficha coincidiera con
-- el suyo. En una demo eso es inservible: el fisio no puede dictar una URL de
-- sesenta caracteres, y el correo de Supabase casi no entrega.
--
-- Ahora el fisio genera un código de seis caracteres desde la ficha, se lo
-- dicta o se lo manda por WhatsApp, y el paciente lo escribe en la app.
--
-- POR QUÉ EL CÓDIGO BASTA COMO CREDENCIAL (y el token no bastaba)
-- El token identifica un informe, y existe desde que se publica la guía: no
-- caduca, viaja por WhatsApp y puede reenviarse. Por eso se le exigía un
-- segundo factor, el correo de la ficha. El código es otra cosa: lo crea el
-- fisio a propósito para una persona, sirve UNA sola vez, caduca a los treinta
-- días y se puede anular. Eso ya es un factor deliberado, no un identificador
-- que estaba por ahí.
--
-- SEGURIDAD
-- La clínica gestiona sus códigos por RLS (clinica_actual()). El paciente no
-- tiene acceso a la tabla: canjea por RPC SECURITY DEFINER, que nunca le
-- devuelve el código de nadie ni le dice a quién pertenece uno que falle.

create table if not exists public.invitaciones (
  codigo      text primary key,
  paciente_id uuid not null references public.pacientes(id) on delete cascade,
  clinica_id  uuid not null references public.clinicas(id),
  creado_por  uuid references public.perfiles(id) on delete set null,
  creado_at   timestamptz not null default now(),
  caduca_at   timestamptz not null default now() + interval '30 days',
  usado_por   uuid references auth.users(id) on delete set null,
  usado_at    timestamptz
);
create index if not exists idx_invitaciones_paciente on public.invitaciones(paciente_id);
alter table public.invitaciones enable row level security;

-- La clínica ve, crea y anula los suyos. El paciente NO tiene policy.
drop policy if exists invitaciones_clinica_select on public.invitaciones;
create policy invitaciones_clinica_select on public.invitaciones
  for select to authenticated using (clinica_id = public.clinica_actual());
drop policy if exists invitaciones_clinica_delete on public.invitaciones;
create policy invitaciones_clinica_delete on public.invitaciones
  for delete to authenticated using (clinica_id = public.clinica_actual());

-- ─────────────────────────────────────────────────────────────────────
-- Generar el código (lo llama la clínica desde la ficha del paciente)
-- ─────────────────────────────────────────────────────────────────────
-- Alfabeto sin caracteres que se confunden al dictar: nada de O/0, I/1, S/5.
-- Seis caracteres de 28 símbolos son 481 millones de combinaciones, de sobra
-- para algo que caduca en treinta días y solo vale una vez.

create or replace function public.invitacion_crear(p_paciente uuid)
returns jsonb
language plpgsql security definer set search_path to 'public', 'pg_catalog'
as $$
declare
  v_clinica  uuid := public.clinica_actual();
  v_alfabeto text := 'ABCDEFGHJKLMNPQRTUVWXYZ234679';
  v_codigo   text;
  i          integer;
begin
  if v_clinica is null then
    return jsonb_build_object('ok', false, 'motivo', 'sin_clinica');
  end if;

  -- La ficha tiene que ser de MI clínica. Sin esto, un fisio podría generar
  -- un código para el paciente de otra clínica pasando su id.
  if not exists (
    select 1 from pacientes where id = p_paciente and clinica_id = v_clinica
  ) then
    return jsonb_build_object('ok', false, 'motivo', 'no_es_tuyo');
  end if;

  if exists (select 1 from pacientes where id = p_paciente and auth_user_id is not null) then
    return jsonb_build_object('ok', false, 'motivo', 'ya_tiene_cuenta');
  end if;

  -- Un código vivo por paciente: generar otro invalida el anterior, para que
  -- un papel viejo no siga sirviendo.
  delete from invitaciones where paciente_id = p_paciente and usado_at is null;

  loop
    v_codigo := '';
    for i in 1..6 loop
      v_codigo := v_codigo || substr(v_alfabeto, 1 + floor(random() * length(v_alfabeto))::int, 1);
    end loop;
    exit when not exists (select 1 from invitaciones where codigo = v_codigo);
  end loop;

  insert into invitaciones (codigo, paciente_id, clinica_id, creado_por)
  values (v_codigo, p_paciente, v_clinica, auth.uid());

  return jsonb_build_object('ok', true, 'codigo', v_codigo,
                            'caduca_at', (now() + interval '30 days'));
end $$;

-- ─────────────────────────────────────────────────────────────────────
-- Canjear el código (lo llama el paciente, ya con sesión)
-- ─────────────────────────────────────────────────────────────────────

create or replace function public.mi_vincular_codigo(p_codigo text)
returns jsonb
language plpgsql security definer set search_path to 'public', 'pg_catalog'
as $$
declare
  v_uid  uuid := auth.uid();
  v_inv  record;
  v_ya   uuid;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'motivo', 'sin_sesion');
  end if;

  -- Si esta cuenta ya está enlazada, no se toca nada (idempotente).
  select id into v_ya from pacientes where auth_user_id = v_uid;
  if v_ya is not null then
    return jsonb_build_object('ok', true, 'ya_vinculado', true);
  end if;

  select * into v_inv from invitaciones
  where codigo = upper(trim(coalesce(p_codigo, '')));

  -- Un solo motivo para todos los fallos del código: no se le dice a nadie si
  -- un código existe, si ya se usó o de qué clínica es.
  if v_inv is null or v_inv.usado_at is not null or v_inv.caduca_at < now() then
    return jsonb_build_object('ok', false, 'motivo', 'codigo_invalido');
  end if;

  if exists (
    select 1 from pacientes
    where id = v_inv.paciente_id and auth_user_id is not null and auth_user_id <> v_uid
  ) then
    return jsonb_build_object('ok', false, 'motivo', 'ya_reclamado');
  end if;

  update pacientes set auth_user_id = v_uid where id = v_inv.paciente_id;
  update invitaciones set usado_por = v_uid, usado_at = now() where codigo = v_inv.codigo;

  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.invitacion_crear(uuid)     from public, anon;
revoke all on function public.mi_vincular_codigo(text)   from public, anon;
grant execute on function public.invitacion_crear(uuid)     to authenticated;
grant execute on function public.mi_vincular_codigo(text)   to authenticated;
