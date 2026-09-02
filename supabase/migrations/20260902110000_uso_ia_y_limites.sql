-- 20260902110000_uso_ia_y_limites.sql
-- Fase 1A · Contadores de consumo de IA y límites configurables.
--
-- POR QUÉ EXISTE ESTO:
-- 1. El tramo gratuito de Groq tiene techo real y medido (02/09/2026, leyendo
--    las cabeceras x-ratelimit de la API con la key del proyecto):
--       1.000 peticiones/día  ·  8.000 tokens/minuto  en openai/gpt-oss-20b.
--    Estimación de una clínica activa: ~490 llamadas/día. Cabe una; dos no.
-- 2. La IA estuvo caída 12 días en producción (16→28/08/2026) y nadie se
--    enteró porque no había forma de mirarlo. Esto es esa forma de mirarlo.
-- 3. El límite de preguntas del chat estaba CABLEADO dentro de la RPC. Subirlo
--    exigía una migración. Ahora es un UPDATE por clínica.

-- ─────────────────────────────────────────────────────────────────────
-- 1. Límites por clínica (antes: constantes dentro del código SQL)
-- ─────────────────────────────────────────────────────────────────────

alter table public.clinicas
  add column if not exists limite_chat_dia integer not null default 12;

comment on column public.clinicas.limite_chat_dia is
  'Preguntas/día que puede hacer un paciente al copiloto de su guía. Sube al pasar Groq a plan de pago.';

-- ─────────────────────────────────────────────────────────────────────
-- 2. Contador de consumo
-- ─────────────────────────────────────────────────────────────────────

create table if not exists public.uso_ia (
  id         uuid primary key default gen_random_uuid(),
  clinica_id uuid references public.clinicas(id) on delete cascade,
  fecha      date not null default (now() at time zone 'Europe/Madrid')::date,
  modo       text not null,
  llamadas   integer not null default 0,
  unique (clinica_id, fecha, modo)
);

comment on table public.uso_ia is
  'Llamadas a la IA por clínica/día/modo. Sirve para ver venir el techo del tramo gratuito antes de chocar con él.';

create index if not exists idx_uso_ia_fecha on public.uso_ia(fecha desc);

alter table public.uso_ia enable row level security;

-- Cada clínica ve su propio consumo y nada más. Solo lectura: los contadores
-- los escribe la función de abajo, nunca el cliente.
drop policy if exists "uso_ia lectura propia clinica" on public.uso_ia;
create policy "uso_ia lectura propia clinica"
  on public.uso_ia for select to authenticated
  using (clinica_id = public.clinica_actual());

revoke insert, update, delete on public.uso_ia from anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 3. Registro del consumo
-- ─────────────────────────────────────────────────────────────────────

-- Interna: no la llama la red, solo otras funciones SECURITY DEFINER.
create or replace function public.uso_ia_sumar(p_clinica uuid, p_modo text)
returns void
language sql security definer set search_path to 'public', 'pg_catalog'
as $$
  insert into public.uso_ia (clinica_id, fecha, modo, llamadas)
  values (p_clinica, (now() at time zone 'Europe/Madrid')::date, p_modo, 1)
  on conflict (clinica_id, fecha, modo)
  do update set llamadas = public.uso_ia.llamadas + 1;
$$;

revoke all on function public.uso_ia_sumar(uuid, text) from public, anon, authenticated;

-- Pública para los route handlers, que llaman con la sesión del fisio.
-- La clínica sale del perfil de quien llama, NUNCA de un parámetro: si viniera
-- por parámetro, un fisio podría inflar el contador de otra clínica.
create or replace function public.uso_ia_registrar(p_modo text)
returns void
language plpgsql security definer set search_path to 'public', 'pg_catalog'
as $$
declare v_clinica uuid := public.clinica_actual();
begin
  if v_clinica is null or p_modo is null or length(trim(p_modo)) = 0 then
    return;  -- registrar el consumo nunca debe romper la petición del usuario
  end if;
  perform public.uso_ia_sumar(v_clinica, left(p_modo, 40));
end $$;

revoke all on function public.uso_ia_registrar(text) from public, anon;
grant execute on function public.uso_ia_registrar(text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 4. guia_chat_insertar: límite configurable + contador
-- ─────────────────────────────────────────────────────────────────────
-- Mismo contrato de entrada y salida que antes ({ok, limite, restantes}).
-- Cambia solo de dónde sale el número y que ahora deja rastro del consumo.

create or replace function public.guia_chat_insertar(p_token text, p_rol text, p_texto text)
returns jsonb
language plpgsql security definer set search_path to 'public', 'pg_catalog'
as $$
declare
  v_informe uuid;
  v_clinica uuid;
  v_limite  integer;
  v_hoy     integer;
begin
  if p_rol not in ('paciente','ia') or p_texto is null or length(trim(p_texto)) = 0 then
    return jsonb_build_object('ok', false);
  end if;

  select i.id, i.clinica_id into v_informe, v_clinica
  from informes i where i.token = p_token and i.estado = 'publicado';
  if v_informe is null then
    return jsonb_build_object('ok', false);
  end if;

  if p_rol = 'paciente' then
    select coalesce(c.limite_chat_dia, 12) into v_limite
    from clinicas c where c.id = v_clinica;
    v_limite := coalesce(v_limite, 12);

    select count(*) into v_hoy from guia_chat
    where informe_id = v_informe and rol = 'paciente'
      and (created_at at time zone 'Europe/Madrid')::date
        = (now() at time zone 'Europe/Madrid')::date;

    if v_hoy >= v_limite then
      return jsonb_build_object('ok', false, 'limite', true);
    end if;
  end if;

  insert into guia_chat (informe_id, rol, texto)
  values (v_informe, p_rol, left(p_texto, 1200));

  -- Una pregunta del paciente = una llamada a la IA que vamos a hacer.
  -- Se cuenta aquí y no en la respuesta para que un fallo del modelo también
  -- quede registrado: el token se gasta igual.
  if p_rol = 'paciente' and v_clinica is not null then
    perform public.uso_ia_sumar(v_clinica, 'guia_chat');
  end if;

  return jsonb_build_object(
    'ok', true,
    'restantes', case when p_rol = 'paciente' then v_limite - v_hoy - 1 else null end);
end $$;
