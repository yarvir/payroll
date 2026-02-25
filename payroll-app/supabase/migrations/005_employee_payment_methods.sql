-- Employee payment methods table
-- Stores one row per payment method per employee.
-- Multiple methods are allowed as long as percentages sum to 100.

create table public.employee_payment_methods (
  id uuid primary key default uuid_generate_v4(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  method_type text not null check (method_type in ('deel', 'ccb', 'non_ccb', 'hsbc', 'other')),
  percentage integer not null check (percentage >= 1 and percentage <= 100),
  -- Deel specific
  deel_account_details text,
  -- Bank fields (CCB, Non-CCB, HSBC, Other)
  beneficiary_name text,
  account_number text,
  branch text,
  swift_code text,
  bank_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, method_type)
);

alter table public.employee_payment_methods enable row level security;

-- Authenticated users with employee access can read payment methods
create policy "Authenticated users can read payment methods"
  on public.employee_payment_methods for select
  using (auth.uid() is not null);

-- Only owners and HR can manage payment methods
create policy "Owners and HR can manage payment methods"
  on public.employee_payment_methods for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('owner', 'hr')
    )
  );

create trigger set_payment_methods_updated_at
  before update on public.employee_payment_methods
  for each row execute procedure public.set_updated_at();
