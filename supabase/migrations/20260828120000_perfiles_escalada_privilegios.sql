-- 20260828120000_perfiles_escalada_privilegios.sql
--
-- PROBLEMA
-- La policy `perfiles_update_own` era USING (id = auth.uid()) sin WITH CHECK, y
-- el rol `authenticated` tenía UPDATE sobre TODAS las columnas de `perfiles`,
-- incluidas `rol` y `clinica_id`. Cualquier fisio logueado podía ejecutar desde
-- la consola del navegador:
--
--   supabase.from('perfiles').update({ rol: 'admin' }).eq('id', user.id)
--
-- y pasar a ver ingresos, catálogos y todos los pacientes de la clínica.
-- Cambiando `clinica_id` (los ids son legibles porque clinicas_read_authenticated
-- es `true`) podía además saltar a OTRA clínica y leer sus historias clínicas
-- vía la policy "admin ve pacientes de su clinica".
--
-- SOLUCIÓN
-- 1) Quitar el privilegio de UPDATE sobre las columnas sensibles.
-- 2) Añadir WITH CHECK explícito a la policy.
-- 3) Cerrar la lectura global de `perfiles` y `clinicas` a la propia clínica.
--
-- COMPROBADO ANTES DE APLICAR: ningún camino vivo de la app hace UPDATE de
-- `rol` ni de `clinica_id`. El único candidato (el upsert de
-- app/admin/nuevo-fisio/page.tsx:58) ya está muerto: `perfiles` no tiene
-- ninguna policy de INSERT, así que RLS lo bloquea hoy igualmente.

begin;

-- ── 1. Privilegios de columna ────────────────────────────────────────────────
-- `id` se protege también: evita que alguien reasigne su fila a otro usuario.
revoke update (rol, clinica_id, id) on public.perfiles from authenticated;
revoke update (rol, clinica_id, id) on public.perfiles from anon;

-- `anon` no debe tocar perfiles en absoluto (no hay policy que se lo permita,
-- pero el grant colgando es superficie innecesaria).
revoke insert, update, select on public.perfiles from anon;

-- ── 2. WITH CHECK explícito ──────────────────────────────────────────────────
-- Sin WITH CHECK, Postgres reutiliza el USING; se deja explícito para que la
-- intención quede escrita y no dependa del comportamiento por defecto.
alter policy perfiles_update_own on public.perfiles
  using (id = auth.uid())
  with check (id = auth.uid());

-- ── 3. Aislamiento multiclínica ──────────────────────────────────────────────
-- Antes: `qual = true` → cualquier authenticated leía TODOS los perfiles y
-- TODAS las clínicas de la base de datos. Ahora, solo los de su clínica.
-- Se usa una función SECURITY DEFINER para leer la clínica del usuario sin
-- provocar recursión infinita en la propia policy de `perfiles`.
create or replace function public.clinica_actual()
returns uuid
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select clinica_id from public.perfiles where id = auth.uid()
$$;

revoke execute on function public.clinica_actual() from public, anon;
grant execute on function public.clinica_actual() to authenticated;

drop policy if exists perfiles_read_authenticated on public.perfiles;
create policy perfiles_read_propia_clinica on public.perfiles
  for select to authenticated
  using (clinica_id = public.clinica_actual());

drop policy if exists clinicas_read_authenticated on public.clinicas;
create policy clinicas_read_propia on public.clinicas
  for select to authenticated
  using (id = public.clinica_actual());

commit;
