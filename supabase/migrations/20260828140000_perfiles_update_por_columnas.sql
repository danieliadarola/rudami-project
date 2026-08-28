-- 20260828140000_perfiles_update_por_columnas.sql
--
-- CORRIGE la parte 1 de 20260828120000_perfiles_escalada_privilegios.sql, que
-- no surtió efecto (el editor SQL dijo "Success" pero no cambió nada).
--
-- POR QUÉ FALLÓ
-- Aquella migración hacía:
--   revoke update (rol, clinica_id, id) on public.perfiles from authenticated;
-- pero `authenticated` tiene el UPDATE concedido a NIVEL DE TABLA (es el
-- default de Supabase: grant all on all tables to anon, authenticated).
-- En PostgreSQL, `REVOKE ... (columna)` solo puede retirar permisos concedidos
-- a nivel de columna; no puede recortar una excepción dentro de un permiso de
-- tabla. Postgres no da error, simplemente no hace nada.
-- Verificado con: has_column_privilege('authenticated','perfiles','rol','UPDATE')
-- que seguía devolviendo true después de aplicarla.
--
-- CÓMO SE HACE BIEN
-- Retirar el UPDATE de tabla y reconcederlo solo sobre las columnas seguras.
-- Quedan fuera: rol y clinica_id (escalada de privilegios y salto de clínica),
-- id (reasignar la fila a otro usuario) y created_at.

begin;

revoke update on public.perfiles from authenticated;

grant update (nombre, apellidos, color, numero_colegiado)
  on public.perfiles to authenticated;

commit;
