-- Departments table
-- type: 'builtin' = seeded / cannot be deleted; 'custom' = user-created

create table public.departments (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  type text not null default 'custom' check (type in ('builtin', 'custom')),
  created_at timestamptz not null default now()
);

alter table public.departments enable row level security;

-- All authenticated users can read (needed for employee form dropdowns)
create policy "Authenticated users can read departments"
  on public.departments for select
  using (auth.uid() is not null);

-- Only owners can manage departments
create policy "Owners can manage departments"
  on public.departments for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'owner'
    )
  );

-- Seed built-in departments (mirrors the previous hardcoded list)
insert into public.departments (name, type) values
  ('Engineering',  'builtin'),
  ('Finance',      'builtin'),
  ('HR',           'builtin'),
  ('Operations',   'builtin'),
  ('Sales',        'builtin'),
  ('Marketing',    'builtin'),
  ('Support',      'builtin'),
  ('Management',   'builtin');
