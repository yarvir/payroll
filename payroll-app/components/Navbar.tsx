'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '@/app/login/actions'
import { ROLE_LABELS, ROLE_COLORS } from '@/lib/roles'
import type { Profile } from '@/types/database'

interface NavbarProps {
  profile: Profile
}

const baseNavLinks = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/employees', label: 'Employees' },
  { href: '/groups', label: 'Groups' },
]

export default function Navbar({ profile }: NavbarProps) {
  const pathname = usePathname()
  const navLinks = [
    ...baseNavLinks,
    ...(profile.role === 'owner' ? [{ href: '/users', label: 'Users' }] : []),
    ...(profile.role === 'owner' ? [{ href: '/settings/permissions', label: 'Settings' }] : []),
  ]

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Brand */}
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-gray-900">Payroll</span>
            </Link>

            {/* Nav Links */}
            <div className="hidden md:flex gap-1">
              {navLinks.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                    pathname === link.href
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* User info + logout */}
          <div className="flex items-center gap-3">
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${ROLE_COLORS[profile.role]}`}>
              {ROLE_LABELS[profile.role]}
            </span>
            <span className="text-sm text-gray-700 hidden sm:block">
              {profile.full_name ?? profile.email}
            </span>
            <form action={logout}>
              <button
                type="submit"
                className="text-sm text-gray-500 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </div>
    </nav>
  )
}
