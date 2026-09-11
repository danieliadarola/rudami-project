-- 20260911100000_mi_progreso.sql
-- Fase 3 · Progreso y evolución del paciente.
--
-- Abre al paciente, POR PRIMERA VEZ, datos que nacen en `sesiones` — y por
-- eso esta lista blanca es la más delicada de todas. De una sesión clínica
-- solo salen NÚMEROS y FECHAS: las métricas que el fisio puntúa de 0 a 10.
-- Jamás salen (y no deben añadirse nunca): anamnesis, exploracion_fisica,
-- notas, diagnostico_ia, plan_tratamiento_ia, red_flags, tests_ortopedicos,
-- hipotesis_principal, derivacion, contexto_biopsicosocial, antecedentes_*.
-- Eso es la historia clínica del profesional, no del paciente (art. 18.3
-- Ley 41/2002: las anotaciones subjetivas del profesional quedan fuera
-- incluso del derecho de acceso formal).
--
-- ALCANCE (decisión de fase 3, aprobada el 11/09/2026):
--   · Las métricas de sesión se acotan al EPISODIO ACTIVO (el más reciente
--     si no hay ninguno activo): es "cómo va esta recuperación".
--   · Los check-ins y las marcas de ejercicios son del PACIENTE entero, con
--     ventana de 180 días: su constancia no entiende de episodios.
--   · Sin parámetros, como todas las mi_*: la identidad la resuelve
--     paciente_actual() por dentro y no hay nada que manipular.

create or replace function public.mi_progreso()
returns jsonb
language sql stable security definer set search_path to 'public', 'pg_catalog'
as $$
  with yo as (
    select public.paciente_actual() as id
  ),
  episodio as (
    -- El activo más reciente; si no hay activos, el último que hubo.
    select ep.id, ep.titulo, ep.fecha_inicio, ep.fecha_fin, ep.estado
    from episodios ep, yo
    where ep.paciente_id = yo.id
    order by (ep.estado = 'activo') desc, ep.fecha_inicio desc nulls last
    limit 1
  )
  select jsonb_build_object(
    'hoy', (now() at time zone 'Europe/Madrid')::date,

    'episodio', (
      select jsonb_build_object(
        'titulo',       e.titulo,
        'fecha_inicio', e.fecha_inicio,
        'fecha_fin',    e.fecha_fin,
        'estado',       e.estado)
      from episodio e),

    -- Métricas de sesión del episodio: SOLO números y la fecha.
    'sesiones', coalesce((
      select jsonb_agg(jsonb_build_object(
        'fecha',      s.fecha,
        'dolor',      s.dolor_eva,
        'movilidad',  s.movilidad,
        'fuerza',     s.fuerza,
        'rigidez',    s.rigidez,
        'fatiga',     s.fatiga,
        'sueno',      s.sueno,
        'adherencia', s.adherencia) order by s.fecha)
      from sesiones s, yo, episodio e
      where s.paciente_id = yo.id and s.episodio_id = e.id), '[]'::jsonb),

    -- Dolor diario contado por el propio paciente (todos sus informes).
    'checkins', coalesce((
      select jsonb_agg(jsonb_build_object('fecha', gc.fecha, 'dolor', gc.dolor)
                       order by gc.fecha)
      from guia_checkins gc
      join informes i on i.id = gc.informe_id
      cross join yo
      where i.paciente_id = yo.id
        and gc.fecha >= (now() at time zone 'Europe/Madrid')::date - 180
        and gc.dolor is not null), '[]'::jsonb),

    -- Ejercicios hechos por día, para la adherencia semanal.
    'checks_por_dia', coalesce((
      select jsonb_agg(t.fila order by t.fecha)
      from (
        select gk.fecha,
               jsonb_build_object('fecha', gk.fecha, 'hechos', count(*)) as fila
        from guia_checks gk
        join informes i on i.id = gk.informe_id
        cross join yo
        where i.paciente_id = yo.id
          and gk.fecha >= (now() at time zone 'Europe/Madrid')::date - 180
        group by gk.fecha) t), '[]'::jsonb),

    -- Denominador de la adherencia: ejercicios del plan vigente.
    'ejercicios_dia', coalesce((
      select count(*)
      from informe_ejercicios ie
      where ie.informe_id = (
        select i.id from informes i, yo
        where i.paciente_id = yo.id and i.estado = 'publicado'
        order by i.fecha desc, i.publicado_at desc nulls last
        limit 1)), 0)
  )
  from pacientes p, yo
  where p.id = yo.id;
$$;

-- Como todas las mi_*: sesión obligatoria, anon fuera.
revoke all on function public.mi_progreso() from public, anon;
grant execute on function public.mi_progreso() to authenticated;
