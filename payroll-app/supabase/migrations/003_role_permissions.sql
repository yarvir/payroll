-- Role-based permissions table
-- Stores which non-owner roles are allowed to perform each feature action.
-- Owner always has all permissions (enforced in application code).

create table if not exists public.role_permissions (
  feature  text                        not null,
  role     public.user_role            not null,
  enabled  boolean                     not null default false,
  primary key (feature, role)
);

-- RLS: only owners (service-role) can modify; all authenticated users can read
alter table public.role_permissions enable row level security;

create policy "Authenticated users can read permissions"
  on public.role_permissions for select
  using (auth.role() = 'authenticated');

create policy "Service role can manage permissions"
  on public.role_permissions for all
  using (auth.role() = 'service_role');

-- ── Seed default permissions ──────────────────────────────────────────────────

insert into public.role_permissions (feature, role, enabled) values
  -- view_all_employees
  ('view_all_employees',       'hr',         true),
  ('view_all_employees',       'accountant',  true),
  ('view_all_employees',       'employee',    false),

  -- view_sensitive_employees
  ('view_sensitive_employees', 'hr',         true),
  ('view_sensitive_employees', 'accountant',  true),
  ('view_sensitive_employees', 'employee',    false),

  -- view_salary_nonsensitive
  ('view_salary_nonsensitive', 'hr',         true),
  ('view_salary_nonsensitive', 'accountant',  false),
  ('view_salary_nonsensitive', 'employee',    false),

  -- view_salary_sensitive
  ('view_salary_sensitive',    'hr',         false),
  ('view_salary_sensitive',    'accountant',  false),
  ('view_salary_sensitive',    'employee',    false),

  -- manage_employees (add / edit)
  ('manage_employees',         'hr',         true),
  ('manage_employees',         'accountant',  false),
  ('manage_employees',         'employee',    false),

  -- delete_employees
  ('delete_employees',         'hr',         false),
  ('delete_employees',         'accountant',  false),
  ('delete_employees',         'employee',    false),

  -- manage_groups
  ('manage_groups',            'hr',         true),
  ('manage_groups',            'accountant',  false),
  ('manage_groups',            'employee',    false),

  -- manage_users (invite / deactivate)
  ('manage_users',             'hr',         false),
  ('manage_users',             'accountant',  false),
  ('manage_users',             'employee',    false),

  -- view_edit_contracts
  ('view_edit_contracts',      'hr',         true),
  ('view_edit_contracts',      'accountant',  false),
  ('view_edit_contracts',      'employee',    false),

  -- approve_leave
  ('approve_leave',            'hr',         true),
  ('approve_leave',            'accountant',  false),
  ('approve_leave',            'employee',    false),

  -- submit_own_leave
  ('submit_own_leave',         'hr',         true),
  ('submit_own_leave',         'accountant',  true),
  ('submit_own_leave',         'employee',    true),

  -- run_payroll
  ('run_payroll',              'hr',         true),
  ('run_payroll',              'accountant',  false),
  ('run_payroll',              'employee',    false),

  -- export_bank_file
  ('export_bank_file',         'hr',         true),
  ('export_bank_file',         'accountant',  false),
  ('export_bank_file',         'employee',    false),

  -- view_payroll_history
  ('view_payroll_history',     'hr',         true),
  ('view_payroll_history',     'accountant',  true),
  ('view_payroll_history',     'employee',    false),

  -- view_reports
  ('view_reports',             'hr',         true),
  ('view_reports',             'accountant',  true),
  ('view_reports',             'employee',    false),

  -- read_wiki
  ('read_wiki',                'hr',         true),
  ('read_wiki',                'accountant',  true),
  ('read_wiki',                'employee',    true),

  -- write_wiki
  ('write_wiki',               'hr',         true),
  ('write_wiki',               'accountant',  false),
  ('write_wiki',               'employee',    false)

on conflict (feature, role) do nothing;
