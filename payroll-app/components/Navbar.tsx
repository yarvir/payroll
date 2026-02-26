'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { logout } from '@/app/login/actions'
import { getRoleLabel, getRoleColor } from '@/lib/roles'
import type { Profile } from '@/types/database'

interface NavbarProps {
  profile: Profile
}

const baseNavLinks = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/employees', label: 'Employees' },
  { href: '/groups', label: 'Groups' },
]

const settingsLinks = [
  { href: '/settings/roles',          label: 'Roles' },
  { href: '/settings/permissions',    label: 'Permissions' },
  { href: '/settings/payment-config', label: 'Payment Config' },
]

export default function Navbar({ profile }: NavbarProps) {
  const pathname = usePathname()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const settingsRef = useRef<HTMLDivElement>(null)

  const navLinks = [
    ...baseNavLinks,
    ...(profile.role === 'owner' ? [{ href: '/users', label: 'Users' }] : []),
  ]

  const isSettingsActive = settingsLinks.some(l => pathname.startsWith(l.href))

  useEffect(() => {
    if (!settingsOpen) return
    function onMouseDown(e: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [settingsOpen])

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
            <div className="hidden md:flex gap-1 items-center">
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

              {/* Settings dropdown — Owner only */}
              {profile.role === 'owner' && (
                <div ref={settingsRef} className="relative">
                  <button
                    onClick={() => setSettingsOpen(v => !v)}
                    className={`inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
                      isSettingsActive || settingsOpen
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    Settings
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {settingsOpen && (
                    <div className="absolute left-0 top-full mt-1.5 w-44 bg-white border border-gray-200 rounded-xl shadow-lg z-30 py-1">
                      {settingsLinks.map(link => (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={() => setSettingsOpen(false)}
                          className={`block px-4 py-2 text-sm transition ${
                            pathname === link.href
                              ? 'bg-indigo-50 text-indigo-700 font-medium'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* User info + logout */}
          <div className="flex items-center gap-3">
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${getRoleColor(profile.role)}`}>
              {getRoleLabel(profile.role)}
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
