'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/brand/logo'
import { marketingNav } from '@/lib/config/site'

export function SiteHeader() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 border-b bg-white/95 shadow-[0_1px_2px_rgba(11,31,58,0.04)] backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 md:px-6">
        <Logo />
        <nav aria-label="Primary" className="hidden lg:block">
          <ul className="flex items-center gap-7">
            {marketingNav.map((item) => (
              <li key={item.href}>
                <a href={item.href} className="text-sm font-medium text-muted-foreground transition-colors hover:text-navy">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          <Button variant="ghost" nativeButton={false} render={<Link href="/platform" />} className="text-navy">
            Sign In
          </Button>
          <Button nativeButton={false} render={<Link href="/platform" />} className="bg-orange text-white hover:bg-orange/90">
            Get Started
          </Button>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X /> : <Menu />}
        </Button>
      </div>
      {open && (
        <nav id="mobile-nav" aria-label="Mobile" className="border-t bg-white px-4 py-4 lg:hidden">
          <ul className="flex flex-col gap-1">
            {marketingNav.map((item) => (
              <li key={item.href}>
                <a href={item.href} onClick={() => setOpen(false)} className="block rounded-md px-3 py-2 text-sm font-medium text-navy hover:bg-muted">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button variant="outline" nativeButton={false} render={<Link href="/platform" />}>
              Sign In
            </Button>
            <Button nativeButton={false} render={<Link href="/platform" />} className="bg-orange text-white hover:bg-orange/90">
              Get Started
            </Button>
          </div>
        </nav>
      )}
    </header>
  )
}
