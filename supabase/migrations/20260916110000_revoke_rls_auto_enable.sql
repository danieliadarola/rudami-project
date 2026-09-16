-- 20260916110000_revoke_rls_auto_enable.sql
-- rls_auto_enable() es la función del event trigger `ensure_rls`. Solo la
-- ejecuta Postgres al terminar un DDL; nadie debe poder llamarla por la API.
-- El linter de seguridad de Supabase la marcaba como SECURITY DEFINER
-- ejecutable por anon y authenticated. Aplicada el 16/09/2026.
revoke all on function public.rls_auto_enable() from public, anon, authenticated;
