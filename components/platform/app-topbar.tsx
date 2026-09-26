'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Logo } from '@/components/brand/logo'
import { StatusDot } from '@/components/shared/badges'
import { useAlerts, useSystemStatus } from '@/hooks/use-api'
import { appNav } from '@/lib/config/site'
import { formatUtc } from '@/lib/format'
import { AppNavList } from './app-nav'

function useCurrentPageLabel() {
  const pathname = usePathname()
  const items = appNav.flatMap((g) => g.items)
  const match = [...items]
    .sort((a, b) => b.href.length - a.href.length)
    .find((i) => (i.href === '/platform' ? pathname === i.href : pathname.startsWith(i.href)))
  return match?.label ?? 'Platform'
}

export function AppTopbar() {
  const [open, setOpen] = useState(false)
  const label = useCurrentPageLabel()
  const { data: status } = useSystemStatus()
  const { data: alerts } = useAlerts()
  const openAlerts = alerts?.filter((a) => a.status === 'OPEN' && a.severity !== 'INFO').length ?? 0

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-white/90 px-4 backdrop-blur md:px-6">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger render={<Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation" />}>
          <Menu />
        </SheetTrigger>
        <SheetContent side="left" className="w-72 gap-0 p-0">
          <SheetHeader className="h-16 justify-center border-b px-5">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <Logo href="/platform" />
          </SheetHeader>
          <div className="overflow-y-auto px-3 py-5">
            <AppNavList onNavigate={() => setOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 items-center gap-2 text-sm">
        <span className="hidden text-muted-foreground sm:inline">Platform</span>
        <span className="hidden text-muted-foreground/60 sm:inline" aria-hidden="true">
          /
        </span>
        <span className="truncate font-semibold text-navy">{label}</span>
      </div>

      <div className="ml-auto flex items-center gap-2 md:gap-3">
        {status && (
          <div className="hidden items-center gap-4 rounded-md border bg-subtle px-3 py-1.5 text-xs md:flex">
            <span className="flex items-center gap-2 font-medium text-navy">
              <StatusDot tone={status.connected ? 'success' : 'danger'} pulse={status.connected} />
              {status.connected ? 'Connected' : 'Offline'}
            </span>
            <span className="text-muted-foreground">
              Source <span className="font-medium text-navy">{status.source}</span>
            </span>
            <span className="hidden text-muted-foreground xl:inline">
              Updated <span className="font-mono font-medium text-navy">{formatUtc(status.lastDataUpdate, false)}</span>
            </span>
          </div>
        )}

        <Button
          variant="ghost"
          size="icon"
          nativeButton={false}
          render={<Link href="/platform/alerts" aria-label={`Alerts, ${openAlerts} open`} />}
          className="relative"
        >
          <Bell />
          {openAlerts > 0 && (
            <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-orange text-[9px] font-bold text-white tabular">
              {openAlerts}
            </span>
          )}
        </Button>

        <span
          aria-label="Signed in as Operator"
          className="flex size-8 items-center justify-center rounded-full bg-navy text-xs font-semibold text-white"
        >
          OP
        </span>
      </div>
    </header>
  )
}
