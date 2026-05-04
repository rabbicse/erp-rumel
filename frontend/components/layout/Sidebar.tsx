'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import {
  LayoutDashboard, CreditCard, Package, Plus, List, Layers,
  Wrench, ArrowLeftRight, FileText, ShoppingCart, BarChart2,
  Tag, Users, Shield, MessageCircle, History, ChevronRight,
  Gem, UserCircle, LogOut
} from 'lucide-react'
import clsx from 'clsx'

interface NavChild { label: string; href: string }
interface NavItem {
  label: string; href?: string; icon: React.ReactNode
  children?: NavChild[]
}
interface Section { heading: string; items: NavItem[] }

const NAV: Section[] = [
  {
    heading: 'Dashboard',
    items: [{ label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard size={15} /> }],
  },
  {
    heading: 'Plan Billing',
    items: [{ label: 'Plan and Billing', href: '/billing', icon: <CreditCard size={15} /> }],
  },
  {
    heading: 'Stock & Products',
    items: [
      { label: 'Add New Stock',      href: '/stock/add',   icon: <Plus size={15} /> },
      { label: 'All Stock Listing',  href: '/stock',       icon: <List size={15} /> },
      {
        label: 'Category Stock List', icon: <Layers size={15} />,
        children: [
          { label: 'Jewellery & Rings',     href: '/categories/rings' },
          { label: 'Loose Diamond Listing', href: '/categories/diamonds' },
          { label: 'Gemstone Listing',      href: '/categories/gemstones' },
          { label: 'Mount Stock Listing',   href: '/categories/mounts' },
          { label: 'Watch Stock List',      href: '/categories/watches' },
          { label: 'Upload Bulk Stock',     href: '/stock/bulk-upload' },
        ],
      },
    ],
  },
  {
    heading: 'Manufacturing',
    items: [{
      label: 'Manufacturing Jobs', icon: <Wrench size={15} />,
      children: [{ label: 'Manufacturing Jobs', href: '/manufacturing' }],
    }],
  },
  {
    heading: 'Consignment',
    items: [{
      label: 'Consignment In/Out', icon: <ArrowLeftRight size={15} />,
      children: [{ label: 'Consignment In/Out', href: '/consignment' }],
    }],
  },
  {
    heading: 'Sales',
    items: [{
      label: 'Invoice', icon: <FileText size={15} />,
      children: [
        { label: 'Invoice Order List', href: '/invoices' },
        { label: 'Create Invoice',     href: '/invoices/new' },
        { label: 'All Transaction',    href: '/invoices/transactions' },
        { label: 'Old Invoice Order List', href: '/invoices/old' },
      ],
    }],
  },
  {
    heading: 'Purchase Management',
    items: [{
      label: 'Purchase Invoice', icon: <ShoppingCart size={15} />,
      children: [{ label: 'Purchase Invoice', href: '/purchase' }],
    }],
  },
  {
    heading: 'Availability',
    items: [{
      label: 'Stock Check', icon: <BarChart2 size={15} />,
      children: [{ label: 'Stock Check', href: '/availability' }],
    }],
  },
  {
    heading: 'Label Management',
    items: [{
      label: 'All Labels', icon: <Tag size={15} />,
      children: [{ label: 'All Labels', href: '/labels' }],
    }],
  },
  {
    heading: 'User Management',
    items: [{
      label: 'All Users', icon: <Users size={15} />,
      children: [{ label: 'All Users', href: '/users' }],
    }],
  },
  {
    heading: 'Role Management',
    items: [{
      label: 'Role', icon: <Shield size={15} />,
      children: [{ label: 'Role', href: '/roles' }],
    }],
  },
  {
    heading: 'Support',
    items: [{ label: 'My Support', href: '/support', icon: <MessageCircle size={15} /> }],
  },
  {
    heading: 'History',
    items: [{ label: 'User Activity History', href: '/history', icon: <History size={15} /> }],
  },
]

function NavItemRow({ item, depth = 0 }: { item: NavItem; depth?: number }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(() => {
    if (!item.children) return false
    return item.children.some(c => pathname.startsWith(c.href))
  })

  const isActive = item.href ? pathname === item.href || pathname.startsWith(item.href + '/') : false

  if (item.children) {
    const childActive = item.children.some(c => pathname.startsWith(c.href))
    return (
      <div>
        <button
          onClick={() => setOpen(v => !v)}
          className={clsx('nav-item w-full justify-between', childActive && 'text-white bg-sidebar-hover')}
        >
          <span className="flex items-center gap-3">
            {item.icon}{item.label}
          </span>
          <ChevronRight size={13} className={clsx('transition-transform', open && 'rotate-90')} />
        </button>
        {open && (
          <div className="mt-0.5 mb-1">
            {item.children.map(c => (
              <Link key={c.href} href={c.href}
                className={clsx('nav-item-child', pathname.startsWith(c.href) && 'active')}>
                {c.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <Link href={item.href!} className={clsx('nav-item', isActive && 'active')}>
      {item.icon}{item.label}
    </Link>
  )
}

export function Sidebar() {
  const { user, logout } = useAuth()

  return (
    <aside className="fixed top-0 left-0 h-screen w-56 bg-sidebar flex flex-col z-40 overflow-hidden">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-sidebar-border shrink-0">
        <div className="w-9 h-9 rounded-lg bg-amber-500 flex items-center justify-center">
          <Gem size={18} className="text-white" />
        </div>
        <div>
          <p className="text-xs font-bold text-white leading-none">CARATFLOW CRM</p>
          <p className="text-[10px] text-sidebar-text mt-0.5 leading-none">{user?.name ?? 'Loading…'}</p>
        </div>
      </div>

      {/* User info */}
      <div className="px-4 py-2.5 border-b border-sidebar-border shrink-0">
        <p className="text-[10px] text-sidebar-heading">Signed in as Milestone Jewellery</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 scrollbar-thin">
        {NAV.map(section => (
          <div key={section.heading}>
            <p className="nav-section">{section.heading}</p>
            {section.items.map(item => (
              <NavItemRow key={item.label} item={item} />
            ))}
          </div>
        ))}
      </nav>

      {/* Bottom user */}
      <div className="shrink-0 border-t border-sidebar-border px-3 py-3">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-sidebar-hover cursor-pointer group">
          <div className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
            {user?.name?.charAt(0)?.toUpperCase() ?? 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">{user?.name ?? 'Admin'}</p>
            <p className="text-[10px] text-sidebar-text truncate">{user?.email ?? ''}</p>
          </div>
          <button onClick={logout} className="text-sidebar-text hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </aside>
  )
}
