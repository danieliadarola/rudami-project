-- 20260916120000_avisos_clinica.sql
-- Fase 4 · Avisos unidireccionales de la clínica al paciente.
--
-- DECISIÓN (PLAN_APP_PACIENTE.md): sin bandeja de entrada bidireccional. Una
-- clínica pequeña con mensajes sin responder da peor imagen que no tenerlos.
-- La clínica escribe un aviso desde la ficha del paciente; el paciente lo ve
-- en el inicio de su app y lo marca como leído. Para hablar, ya está WhatsApp.
--
-- SEGURIDAD: la clínica lee y escribe la tabla por RLS (clinica_actual()).
-- El paciente NO tiene policy: lee por mi_avisos() y marca por mi_aviso_leer(),
-- las dos por identidad (paciente_actual()). Ningún aviso viaja con ids
-- internos más allá del suyo propio.

create table if not exists public.avisos (
  id          uuid primary key default gen_random_uuid(),
  clinica_id  uuid not null references public.clinicas(id),
  paciente_id uuid not null references public.pacientes(id) on delete cascade,
  autor_id    uuid references public.perfiles(id) on delete set null,
  texto       text not null check (length(texto) between 1 and 500),
  leido_at    timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists idx_avisos_paciente on public.avisos(paciente_id, created_at desc);
alter table public.avisos enable row level security;

drop policy if exists avisos_clinica_select on public.avisos;
create policy avisos_clinica_select on public.avisos
  for select to authenticated using (clinica_id = public.clinica_actual());
drop policy if exists avisos_clinica_insert on public.avisos;
create policy avisos_clinica_insert on public.avisos
  for insert to authenticated with check (clinica_id = public.clinica_actual());
drop policy if exists avisos_clinica_delete on public.avisos;
create policy avisos_clinica_delete on public.avisos
  for delete to authenticated using (clinica_id = public.clinica_actual());

-- Los últimos 10 avisos del paciente que mira. Los no leídos primero.
create or replace function public.mi_avisos()
returns jsonb
language sql stable security definer set search_path to 'public', 'pg_catalog'
as $$
  select coalesce((
    select jsonb_agg(jsonb_build_object(
      'id',     a.id,
      'texto',  a.texto,
      'autor',  (select pf.nombre from perfiles pf where pf.id = a.autor_id),
      'fecha',  a.created_at,
      'leido',  a.leido_at is not null
    ) order by (a.leido_at is null) desc, a.created_at desc)
    from (
      select * from avisos
      where paciente_id = public.paciente_actual()
      order by created_at desc limit 10) a), '[]'::jsonb)
  where auth.uid() is not null;
$$;

create or replace function public.mi_aviso_leer(p_id uuid)
returns jsonb
language plpgsql security definer set search_path to 'public', 'pg_catalog'
as $$
begin
  update avisos set leido_at = coalesce(leido_at, now())
  where id = p_id and paciente_id = public.paciente_actual();
  return jsonb_build_object('ok', found);
end $$;

revoke all on function public.mi_avisos()          from public, anon;
revoke all on function public.mi_aviso_leer(uuid)  from public, anon;
grant execute on function public.mi_avisos()          to authenticated;
grant execute on function public.mi_aviso_leer(uuid)  to authenticated;
