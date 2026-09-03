-- 20260902160000_escrituras_paciente_por_identidad.sql
-- Fase 2 · Escrituras del paciente que ha iniciado sesión.
--
-- POR QUÉ HACEN FALTA:
-- Las RPC existentes (guia_marcar_ejercicio, guia_checkin) se autorizan con el
-- TOKEN del informe. La app del paciente no lo tiene: la lista blanca de
-- guia_payload() dejó de publicarlo a propósito, porque es una credencial y no
-- un dato. Sin estas dos gemelas, un paciente con cuenta podría ver su plan
-- pero no marcar un solo ejercicio.
--
-- La diferencia es solo de dónde sale la autorización:
--   guia_* → del token (enlace de WhatsApp, sin login)
--   mi_*   → de paciente_actual() (cuenta, sin token)
-- El efecto sobre los datos es idéntico, así que un mismo paciente puede
-- alternar entre el enlace y la app sin que le cambie nada.

-- ─────────────────────────────────────────────────────────────────────
-- Marcar / desmarcar un ejercicio del plan activo
-- ─────────────────────────────────────────────────────────────────────

create or replace function public.mi_marcar_ejercicio(p_ejercicio_id uuid, p_hecho boolean)
returns jsonb
language plpgsql security definer set search_path to 'public', 'pg_catalog'
as $$
declare
  v_paciente uuid := public.paciente_actual();
  v_informe  uuid;
  v_fecha    date := (now() at time zone 'Europe/Madrid')::date;
begin
  if v_paciente is null then
    return jsonb_build_object('ok', false);
  end if;

  -- El ejercicio tiene que pertenecer a un informe PUBLICADO de ESTE paciente.
  -- Sin esta comprobación, cualquier paciente con cuenta podría marcar
  -- ejercicios de otro pasando un id ajeno.
  select i.id into v_informe
  from informes i
  join informe_ejercicios e on e.informe_id = i.id and e.id = p_ejercicio_id
  where i.paciente_id = v_paciente and i.estado = 'publicado';

  if v_informe is null then
    return jsonb_build_object('ok', false);
  end if;

  if p_hecho then
    insert into guia_checks (informe_id, informe_ejercicio_id, fecha)
    values (v_informe, p_ejercicio_id, v_fecha)
    on conflict (informe_ejercicio_id, fecha) do nothing;
  else
    delete from guia_checks
    where informe_ejercicio_id = p_ejercicio_id and fecha = v_fecha;
  end if;

  return jsonb_build_object('ok', true, 'fecha', v_fecha);
end $$;

-- ─────────────────────────────────────────────────────────────────────
-- Check-in diario de dolor
-- ─────────────────────────────────────────────────────────────────────

create or replace function public.mi_checkin(p_dolor integer, p_nota text default null)
returns jsonb
language plpgsql security definer set search_path to 'public', 'pg_catalog'
as $$
declare
  v_paciente uuid := public.paciente_actual();
  v_informe  uuid;
  v_fecha    date := (now() at time zone 'Europe/Madrid')::date;
begin
  if v_paciente is null or p_dolor is null or p_dolor < 0 or p_dolor > 10 then
    return jsonb_build_object('ok', false);
  end if;

  -- Se registra contra el mismo informe que sirve mi_plan(): el más reciente
  -- publicado. Si no, el check-in de hoy podría caer en un plan antiguo y no
  -- aparecería en la evolución que ve el paciente.
  select i.id into v_informe
  from informes i
  where i.paciente_id = v_paciente and i.estado = 'publicado'
  order by i.fecha desc, i.publicado_at desc nulls last
  limit 1;

  if v_informe is null then
    return jsonb_build_object('ok', false);
  end if;

  insert into guia_checkins (informe_id, fecha, dolor, nota)
  values (v_informe, v_fecha, p_dolor, left(coalesce(p_nota, ''), 300))
  on conflict (informe_id, fecha) do update
    set dolor = excluded.dolor, nota = excluded.nota;

  return jsonb_build_object('ok', true, 'fecha', v_fecha);
end $$;

-- Exigen sesión: anon no pinta nada aquí (para eso están las guia_*).
revoke all on function public.mi_marcar_ejercicio(uuid, boolean) from public, anon;
revoke all on function public.mi_checkin(integer, text)          from public, anon;
grant execute on function public.mi_marcar_ejercicio(uuid, boolean) to authenticated;
grant execute on function public.mi_checkin(integer, text)          to authenticated;
