-- supabase/demo/refrescar_demo.sql
-- Recoloca las fechas de la base de DEMO para que la agenda "de hoy" nunca
-- salga vacía. Pensado para ejecutarse a mano (SQL Editor de Supabase o via
-- MCP) justo antes de enseñar la app. Es idempotente por día: si ya se
-- ejecutó hoy, no hace nada.
--
-- ¡SOLO PARA DATOS DE DEMO! Reescribe el historial clínico entero. Con un
-- cliente real, este archivo se borra o se protege.
--
-- LA REGLA: el día con más citas ("día fuerte") aterriza en HOY, y todo lo
-- demás se desplaza esos mismos días, manteniendo horas y distancias
-- relativas. No se preserva el día de la semana a propósito: los datos de
-- demo ya tienen citas en domingo, y en una demo importa la forma de la
-- agenda (hoy lleno, mañana algo, historia por detrás), no el calendario.
--
-- Con topes, porque hay trampa (aprendido el 02/09/2026):
--   · informes.fecha y publicado_at nunca pueden quedar en el futuro
--     (un informe "publicado el mes que viene" delata la demo).
--   · sesiones y episodios tampoco: son historia, no agenda.
--   · guia_checks y guia_checkins aterrizan acabando AYER: así el anillo
--     de hoy está a 0, el botón "Empezar mi sesión" tiene sentido y el
--     check-in del día se puede registrar EN VIVO durante la demo.
--   · bonos no se tocan: sus caducidades ya son futuras y deben seguir así.

do $$
declare
  v_hoy    date := (now() at time zone 'Europe/Madrid')::date;
  v_fuerte date;
  v_delta  integer;
  v_marcas integer;
begin
  -- Día con más citas. Empate: el más reciente.
  select (fecha_hora at time zone 'Europe/Madrid')::date
    into v_fuerte
  from citas
  group by 1
  order by count(*) desc, 1 desc
  limit 1;

  if v_fuerte is null then
    raise notice 'No hay citas: nada que refrescar.';
    return;
  end if;

  v_delta := v_hoy - v_fuerte;
  if v_delta = 0 then
    raise notice 'El dia fuerte ya es hoy (%). Nada que hacer.', v_hoy;
    return;
  end if;

  -- Agenda: se desplaza entera, conservando las horas.
  update citas
     set fecha_hora = fecha_hora + make_interval(days => v_delta);

  -- Historia clínica: mismo desplazamiento, con tope en hoy.
  update sesiones
     set fecha = least(fecha + v_delta, v_hoy);

  update episodios
     set fecha_inicio = least(fecha_inicio + v_delta, v_hoy),
         fecha_fin    = case when fecha_fin is null then null
                             else least(fecha_fin + v_delta, v_hoy) end;

  update informes
     set fecha        = least(fecha + v_delta, v_hoy),
         publicado_at = case when publicado_at is null then null
                             else least(publicado_at + make_interval(days => v_delta), now()) end;

  -- Actividad del paciente: su propio desplazamiento, acabando ayer.
  -- (Desplazamiento uniforme: las claves únicas por fecha no pueden chocar.)
  select (v_hoy - 1) - max(fecha) into v_marcas from guia_checks;
  if v_marcas is not null and v_marcas <> 0 then
    update guia_checks set fecha = fecha + v_marcas;
  end if;

  select (v_hoy - 1) - max(fecha) into v_marcas from guia_checkins;
  if v_marcas is not null and v_marcas <> 0 then
    update guia_checkins set fecha = fecha + v_marcas;
  end if;

  raise notice 'Demo refrescada: % dias (dia fuerte % -> %).', v_delta, v_fuerte, v_hoy;
end $$;
