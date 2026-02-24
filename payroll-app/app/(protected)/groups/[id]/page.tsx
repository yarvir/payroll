import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { canViewSensitive } from '@/lib/roles'
import type { Employee, UserRole } from '@/types/database'

const STATUS_STYLES: Record<Employee['status'], string> = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-600',
  on_leave: 'bg-yellow-100 text-yellow-800',
}

const STATUS_LABELS: Record<Employee['status'], string> = {
  active: 'Active',
  inactive: 'Inactive',
  on_leave: 'On Leave',
}

export default async function GroupDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const admin = createAdminClient()
  const { data: profileData } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single()

  const userRole = (profileData?.role ?? 'employee') as UserRole
  const viewSensitive = canViewSensitive(userRole)

  const { data: group } = await supabase
    .from('employee_groups')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!group) notFound()

  const { data: employees } = await supabase
    .from('employees')
    .select('*')
    .eq('group_id', params.id)
    .order('full_name')

  const members = (employees ?? []) as Employee[]

  return (
    <div>
      {/* Back link */}
      <Link
        href="/groups"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 transition"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Groups
      </Link>

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
          <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{group.name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {group.description
              ? `${group.description} · `
              : ''}
            {members.length} member{members.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Members list */}
      {members.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="text-gray-500 text-sm">No employees in this group yet</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="divide-y divide-gray-100">
            {members.map(emp => (
              <div key={emp.id} className="px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition">
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-semibold text-sm flex-shrink-0">
                  {emp.full_name.charAt(0).toUpperCase()}
                </div>

                {/* Name + email */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 truncate">{emp.full_name}</span>
                    {emp.is_sensitive && viewSensitive && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-red-50 text-red-600 border border-red-100 flex-shrink-0">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        Sensitive
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 truncate">{emp.email}</p>
                </div>

                {/* Employee number */}
                <span className="text-xs font-mono text-gray-400 hidden sm:block flex-shrink-0">
                  {emp.employee_number}
                </span>

                {/* Position */}
                {emp.position && (
                  <span className="text-sm text-gray-500 hidden md:block flex-shrink-0 max-w-40 truncate">
                    {emp.position}
                  </span>
                )}

                {/* Department */}
                {emp.department && (
                  <span className="text-xs text-gray-400 hidden lg:block flex-shrink-0 px-2 py-0.5 bg-gray-100 rounded-full">
                    {emp.department}
                  </span>
                )}

                {/* Salary */}
                {viewSensitive && (
                  <span className="text-sm text-gray-700 font-medium hidden lg:block flex-shrink-0 w-24 text-right">
                    {emp.salary != null
                      ? new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'USD',
                          maximumFractionDigits: 0,
                        }).format(emp.salary)
                      : <span className="text-gray-300">—</span>}
                  </span>
                )}

                {/* Status */}
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${STATUS_STYLES[emp.status]}`}>
                  {STATUS_LABELS[emp.status]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
