-- Datos compartidos entre computador, celular y otros usuarios autenticados.
create table if not exists public.datos_compartidos (
  id uuid primary key default gen_random_uuid(),
  modulo text not null check (modulo in ('clientes', 'vehiculos', 'cotizaciones')),
  registro_id text not null,
  datos jsonb not null default '{}'::jsonb,
  creado_por uuid not null default auth.uid() references auth.users(id) on delete cascade,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  unique (modulo, registro_id)
);

alter table public.datos_compartidos enable row level security;

drop policy if exists "Usuarios autenticados pueden consultar datos compartidos" on public.datos_compartidos;
create policy "Usuarios autenticados pueden consultar datos compartidos"
  on public.datos_compartidos for select to authenticated using (true);

drop policy if exists "Usuarios autenticados pueden crear datos compartidos" on public.datos_compartidos;
create policy "Usuarios autenticados pueden crear datos compartidos"
  on public.datos_compartidos for insert to authenticated with check (auth.uid() = creado_por);

drop policy if exists "Usuarios autenticados pueden actualizar datos compartidos" on public.datos_compartidos;
create policy "Usuarios autenticados pueden actualizar datos compartidos"
  on public.datos_compartidos for update to authenticated using (true) with check (true);

drop policy if exists "Usuarios autenticados pueden eliminar datos compartidos" on public.datos_compartidos;
create policy "Usuarios autenticados pueden eliminar datos compartidos"
  on public.datos_compartidos for delete to authenticated using (true);

create index if not exists datos_compartidos_modulo_idx on public.datos_compartidos (modulo);
