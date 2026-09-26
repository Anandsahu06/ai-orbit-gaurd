'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { appNav } from '@/lib/config/site'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/brand/logo'

export function AppNavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const isActive = (href: string) => (href === '/platform' ? pathname === href : pathname.startsWith(href))

  return (
    <nav aria-label="Platform" className="flex flex-col gap-5">
      {appNav.map((group) => (
        <div key={group.section} className="flex flex-col gap-1">
          <p className="px-3 text-[10px] font-semibold tracking-[0.14em] text-muted-foreground/80 uppercase">
            {group.section}
          </p>
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const active = isActive(item.href)
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'relative flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none',
                      active ? 'bg-orange-soft text-navy' : 'text-muted-foreground hover:bg-muted hover:text-navy',
                    )}
                  >
                    {active && <span aria-hidden="true" className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-orange" />}
                    <item.icon className={cn('size-4', active ? 'text-orange' : '')} aria-hidden="true" />
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}

export function AppSidebar({ className }: { className?: string }) {
  return (
    <aside className={cn('sticky top-0 h-dvh w-60 shrink-0 flex-col border-r bg-sidebar', className)}>
      <div className="flex h-16 items-center border-b px-5">
        <Logo href="/platform" />
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-5">
        <AppNavList />
      </div>
    </aside>
  )
}
