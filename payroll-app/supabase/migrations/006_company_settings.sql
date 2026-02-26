-- Company-wide settings (single row, id always = 1)

create table public.company_settings (
  id integer primary key default 1,
  ccb_account_number text,
  hsbc_hk_account_number text,
  updated_at timestamptz not null default now(),
  constraint single_row check (id = 1)
);

-- Seed the single row so it always exists
insert into public.company_settings (id) values (1);

alter table public.company_settings enable row level security;

-- Only owners can read or write company settings
create policy "Owners can manage company settings"
  on public.company_settings for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'owner'
    )
  );
