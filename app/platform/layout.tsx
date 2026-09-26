import type { Metadata } from 'next'
import { AppSidebar } from '@/components/platform/app-nav'
import { AppTopbar } from '@/components/platform/app-topbar'

export const metadata: Metadata = {
  title: { default: 'Mission Dashboard', template: '%s · OrbitalGuard AI' },
}

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-subtle">
      <AppSidebar className="hidden lg:flex" />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar />
        <main className="flex-1 px-4 py-6 md:px-6 lg:px-8">
          <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6">{children}</div>
        </main>
      </div>
    </div>
  )
}
