'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Sidebar } from '@/components/layout/Sidebar'
import { Providers } from '@/app/providers'
import {
  Bell, ChevronDown, UserCircle, Lock, LogOut,
  Monitor, BookOpen, Home, ChevronRight
} from 'lucide-react'
import clsx from 'clsx'
import Link from 'next/link'

function Header() {
  const { user, logout } = useAuth()
  const [showAccount, setShowAccount] = useState(false)
  const [showNotifs, setShowNotifs] = useState(false)
  const accountRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setShowAccount(false)
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifs(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  return (
    <header className="fixed top-0 left-56 right-0 h-14 bg-white border-b border-gray-100 flex items-center justify-between px-6 z-30">
      <div className="flex items-center gap-2">
        <div className="w-10 h-5 rounded-full bg-gray-200 relative cursor-pointer">
          <div className="w-4 h-4 rounded-full bg-white shadow absolute top-0.5 left-0.5" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500">
          <Monitor size={16} />
        </button>
        <button className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500">
          <BookOpen size={16} />
        </button>
        <div ref={notifRef} className="relative">
          <button
            onClick={() => { setShowNotifs(v => !v); setShowAccount(false) }}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 relative"
          >
            <Bell size={16} />
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold">0</span>
          </button>
          {showNotifs && (
            <div className="absolute right-0 top-10 w-72 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <span className="font-semibold text-sm text-gray-800">Notification</span>
                <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-bold">0 NEW</span>
              </div>
              <div className="py-8 text-center">
                <p className="text-sm text-gray-400">No notifications found</p>
              </div>
              <div className="border-t border-gray-100 px-4 py-2.5 text-xs text-gray-400 text-center">
                You have Check notification
              </div>
            </div>
          )}
        </div>
        <div ref={accountRef} className="relative">
          <button
            onClick={() => { setShowAccount(v => !v); setShowNotifs(false) }}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-brand-700 flex items-center justify-center text-xs font-bold text-white">
              {user?.name?.charAt(0)?.toUpperCase() ?? 'A'}
            </div>
            <span className="text-sm font-medium text-gray-700">My Account</span>
            <ChevronDown size={14} className="text-gray-400" />
          </button>
          {showAccount && (
            <div className="absolute right-0 top-10 w-44 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 py-1">
              <Link href="/profile" onClick={() => setShowAccount(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                <UserCircle size={15} className="text-gray-400" /> Edit Profile
              </Link>
              <Link href="/profile/password" onClick={() => setShowAccount(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                <Lock size={15} className="text-gray-400" /> Password
              </Link>
              <button onClick={logout}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                <LogOut size={15} className="text-gray-400" /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

function Breadcrumb() {
  const pathname = usePathname()
  const parts = pathname.split('/').filter(Boolean)
  return (
    <div className="flex items-center gap-1 text-xs text-gray-400">
      <Link href="/dashboard" className="hover:text-brand-600"><Home size={12} /></Link>
      {parts.map((p, i) => (
        <span key={i} className="flex items-center gap-1">
          <ChevronRight size={10} />
          <span className="capitalize text-gray-500">{p.replace(/-/g, ' ')}</span>
        </span>
      ))}
    </div>
  )
}

function InnerLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/login')
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-brand-600 border-t-transparent animate-spin" />
          <p className="text-sm text-gray-400">Loading…</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <Header />
      <main className="ml-56 pt-14 min-h-screen">
        <div className="p-6">
          <div className="mb-4 flex justify-end">
            <Breadcrumb />
          </div>
          {children}
        </div>
      </main>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <InnerLayout>{children}</InnerLayout>
    </Providers>
  )
}
