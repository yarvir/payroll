-- Fix infinite recursion in "Owners can read all profiles" RLS policy.
--
-- The original policy used a subquery on `profiles` itself to check whether
-- the current user is an owner. Because `profiles` has RLS enabled, that
-- subquery re-evaluated the same policy, triggering infinite recursion and
-- causing PostgreSQL to return an error for any SELECT on the table.
--
-- Fix: introduce a SECURITY DEFINER helper function that reads the role
-- without triggering RLS (security definer functions run as the defining role,
-- which is the superuser / postgres role and bypasses RLS). Replace the
-- recursive subquery with a call to this function.

-- Helper: return the role of the currently-authenticated user.
-- SECURITY DEFINER + fixed search_path prevents privilege escalation.
create or replace function public.get_my_role()
returns user_role
language sql stable security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

-- Drop the old recursive policy and replace it.
drop policy if exists "Owners can read all profiles" on public.profiles;

create policy "Owners can read all profiles"
  on public.profiles for select
  using (public.get_my_role() = 'owner');
