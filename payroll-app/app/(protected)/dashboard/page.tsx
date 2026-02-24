import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ROLE_LABELS, ROLE_COLORS } from '@/lib/roles'
import Link from 'next/link'
import type { Profile } from '@/types/database'

export default async function DashboardPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Admin client bypasses recursive RLS on profiles
  const admin = createAdminClient()
  const { data: profileData } = await admin
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .single()

  const profile = profileData as Profile | null

  const { count: employeeCount } = await supabase
    .from('employees')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')

  const { count: groupCount } = await supabase
    .from('employee_groups')
    .select('*', { count: 'exact', head: true })

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {profile?.full_name ?? profile?.email}
        </h1>
        <p className="text-gray-500 mt-1">
          Here&apos;s an overview of your payroll system.
        </p>
      </div>

      {/* Role badge */}
      <div className="mb-6">
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            profile ? ROLE_COLORS[profile.role] : ''
          }`}
        >
          {profile ? ROLE_LABELS[profile.role] : ''}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
        <StatCard
          title="Active Employees"
          value={employeeCount ?? 0}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          }
          color="indigo"
          href="/employees"
        />
        <StatCard
          title="Employee Groups"
          value={groupCount ?? 0}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          }
          color="blue"
          href="/groups"
        />
      </div>

      {/* Quick links */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/employees"
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100 transition"
          >
            View Employees
          </Link>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  icon,
  color,
  href,
}: {
  title: string
  value: number
  icon: React.ReactNode
  color: 'indigo' | 'blue' | 'green'
  href?: string
}) {
  const colorMap = {
    indigo: 'bg-indigo-50 text-indigo-600',
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
  }

  const card = (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4 hover:border-indigo-300 transition">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  )

  if (href) {
    return <Link href={href}>{card}</Link>
  }
  return card
}
