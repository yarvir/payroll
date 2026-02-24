-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- User roles enum
create type user_role as enum ('owner', 'hr', 'accountant', 'employee');

-- Profiles table (extends auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text,
  role user_role not null default 'employee',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS
alter table public.profiles enable row level security;

-- Users can read their own profile; owners can read all
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Owners can read all profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'owner'
    )
  );

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Employee groups table
create table public.employee_groups (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

alter table public.employee_groups enable row level security;

-- All authenticated users can read groups
create policy "Authenticated users can read groups"
  on public.employee_groups for select
  using (auth.uid() is not null);

-- Only owners and HR can manage groups
create policy "Owners and HR can manage groups"
  on public.employee_groups for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('owner', 'hr')
    )
  );

-- Employees table
create table public.employees (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid references public.profiles(id) on delete set null,
  employee_number text not null unique,
  full_name text not null,
  email text not null,
  position text,
  department text,
  group_id uuid references public.employee_groups(id) on delete set null,
  salary numeric(12, 2),
  is_sensitive boolean not null default false,
  status text not null default 'active' check (status in ('active', 'inactive', 'on_leave')),
  hire_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.employees enable row level security;

-- All authenticated users can read basic employee data
-- Salary is only visible at the app level to authorized roles
create policy "Authenticated users can read employees"
  on public.employees for select
  using (auth.uid() is not null);

-- Only owners and HR can insert/update/delete employees
create policy "Owners and HR can manage employees"
  on public.employees for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('owner', 'hr')
    )
  );

-- Updated at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_employees_updated_at
  before update on public.employees
  for each row execute procedure public.set_updated_at();

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- Seed some employee groups
insert into public.employee_groups (name, description) values
  ('Engineering', 'Software engineering team'),
  ('Finance', 'Finance and accounting team'),
  ('Human Resources', 'HR and people ops team'),
  ('Operations', 'Operations and logistics');
