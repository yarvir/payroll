-- Roles table — stores all role definitions (default + custom).
-- Custom roles can be created by Owner and will appear in permissions and invite dropdown.

create table if not exists public.roles (
  id         text        not null,
  name       text        not null,
  is_default boolean     not null default false,
  created_at timestamptz not null default now(),
  primary key (id),
  unique (name)
);

-- RLS: authenticated users can read; service role manages
alter table public.roles enable row level security;

create policy "Authenticated users can read roles"
  on public.roles for select
  using (auth.role() = 'authenticated');

create policy "Service role can manage roles"
  on public.roles for all
  using (auth.role() = 'service_role');

-- Seed the four built-in roles
insert into public.roles (id, name, is_default) values
  ('owner',      'Owner',      true),
  ('hr',         'HR',         true),
  ('accountant', 'Accountant', true),
  ('employee',   'Employee',   true)
on conflict (id) do nothing;

-- Change role_permissions.role from the user_role enum to plain text so
-- custom role IDs can be stored there too.
alter table public.role_permissions
  alter column role type text;

-- Change profiles.role from the user_role enum to plain text so
-- users can be assigned custom roles.
alter table public.profiles
  alter column role type text using role::text,
  alter column role set default 'employee';
