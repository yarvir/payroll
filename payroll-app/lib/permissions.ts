import { cache } from 'react'
import { createAdminClient } from '@/lib/supabase/admin'
import type { UserRole } from '@/types/database'

export type PermissionKey =
  | 'view_all_employees'
  | 'view_sensitive_employees'
  | 'view_salary_nonsensitive'
  | 'view_salary_sensitive'
  | 'manage_employees'
  | 'delete_employees'
  | 'manage_groups'
  | 'manage_users'
  | 'view_edit_contracts'
  | 'approve_leave'
  | 'submit_own_leave'
  | 'run_payroll'
  | 'export_bank_file'
  | 'view_payroll_history'
  | 'view_reports'
  | 'read_wiki'
  | 'write_wiki'

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  view_all_employees:       'View All Employees (including sensitive)',
  view_sensitive_employees: 'View Sensitive Employee Badge',
  view_salary_nonsensitive: 'View Salary (non-sensitive employees)',
  view_salary_sensitive:    'View Salary (sensitive employees)',
  manage_employees:         'Add & Edit Employees',
  delete_employees:         'Delete Employees',
  manage_groups:            'Manage Groups',
  manage_users:             'Manage Users (invite / deactivate)',
  view_edit_contracts:      'View & Edit Contracts',
  approve_leave:            'Approve Leave Requests',
  submit_own_leave:         'Submit Own Leave',
  run_payroll:              'Run Payroll',
  export_bank_file:         'Export Bank File',
  view_payroll_history:     'View Payroll History',
  view_reports:             'View Reports',
  read_wiki:                'Read Wiki',
  write_wiki:               'Write Wiki',
}

export const ALL_PERMISSION_KEYS = Object.keys(PERMISSION_LABELS) as PermissionKey[]

/**
 * Load the full permissions table from the DB, cached per request.
 * Returns a nested map: { [feature]: { [role]: boolean } }
 */
export const getAllPermissions = cache(
  async (): Promise<Record<string, Record<string, boolean>>> => {
    const admin = createAdminClient()
    const { data } = await admin.from('role_permissions').select('*')

    const result: Record<string, Record<string, boolean>> = {}
    for (const row of data ?? []) {
      if (!result[row.feature]) result[row.feature] = {}
      result[row.feature][row.role] = row.enabled
    }
    return result
  }
)

/**
 * Check whether a given role has a specific permission.
 * Owner always returns true without hitting the DB.
 */
export async function checkPermission(
  role: UserRole,
  key: PermissionKey
): Promise<boolean> {
  if (role === 'owner') return true
  const permissions = await getAllPermissions()
  return permissions[key]?.[role] ?? false
}

/**
 * Get all permissions for a role as a flat map keyed by PermissionKey.
 * Owner gets all true without hitting the DB.
 */
export async function getUserPermissions(
  role: UserRole
): Promise<Record<PermissionKey, boolean>> {
  if (role === 'owner') {
    return Object.fromEntries(
      ALL_PERMISSION_KEYS.map(k => [k, true])
    ) as Record<PermissionKey, boolean>
  }

  const permissions = await getAllPermissions()
  return Object.fromEntries(
    ALL_PERMISSION_KEYS.map(k => [k, permissions[k]?.[role] ?? false])
  ) as Record<PermissionKey, boolean>
}
