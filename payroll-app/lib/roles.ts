import type { UserRole } from '@/types/database'

export const ROLE_LABELS: Record<UserRole, string> = {
  owner: 'Owner',
  hr: 'HR',
  accountant: 'Accountant',
  employee: 'Employee',
}

export const ROLE_COLORS: Record<UserRole, string> = {
  owner: 'bg-purple-100 text-purple-800',
  hr: 'bg-blue-100 text-blue-800',
  accountant: 'bg-green-100 text-green-800',
  employee: 'bg-gray-100 text-gray-800',
}

/** Roles that can see salary / sensitive data */
export const SENSITIVE_ROLES: UserRole[] = ['owner', 'accountant']

export function canViewSensitive(role: UserRole): boolean {
  return SENSITIVE_ROLES.includes(role)
}

/** Roles that can manage employees (create, edit, deactivate) */
export const MANAGE_EMPLOYEE_ROLES: UserRole[] = ['owner', 'hr']

export function canManageEmployees(role: UserRole): boolean {
  return MANAGE_EMPLOYEE_ROLES.includes(role)
}

/** Only owner can manage user roles */
export function canManageRoles(role: UserRole): boolean {
  return role === 'owner'
}
