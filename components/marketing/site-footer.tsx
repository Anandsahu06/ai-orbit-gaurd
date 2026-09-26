import Link from 'next/link'
import { LogoMark } from '@/components/brand/logo'

const COLUMNS = [
  {
    title: 'Platform',
    links: [
      { label: 'Live Orbit', href: '/platform/live-orbit' },
      { label: 'Conjunctions', href: '/platform/conjunctions' },
      { label: 'Simulation', href: '/platform/simulation' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Documentation', href: '#' },
      { label: 'Research', href: '#' },
      { label: 'API', href: '/platform/settings' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/#about' },
      { label: 'Team', href: '/#team' },
      { label: 'Contact', href: '#' },
    ],
  },
]

export function SiteFooter() {
  return (
    <footer className="bg-[#07152A] text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:px-6 lg:grid-cols-[1.5fr_repeat(3,1fr)]">
        <div className="flex flex-col gap-4">
          <Link href="/" className="flex items-center gap-2.5" aria-label="OrbitalGuard AI home">
            <LogoMark />
            <span className="text-sm font-bold tracking-wide">
              ORBITALGUARD <span className="text-orange">AI</span>
            </span>
          </Link>
          <p className="text-sm text-white/60">AI-Assisted Space Traffic Management</p>
          <ul className="flex gap-4 text-sm">
            <li>
              <a href="#" className="text-white/70 hover:text-orange">GitHub</a>
            </li>
            <li>
              <a href="#" className="text-white/70 hover:text-orange">LinkedIn</a>
            </li>
          </ul>
        </div>
        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h3 className="text-xs font-semibold tracking-[0.14em] text-white/50 uppercase">{col.title}</h3>
            <ul className="mt-4 flex flex-col gap-2.5">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="text-sm text-white/80 hover:text-orange">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-7xl px-4 py-6 text-xs text-white/50 md:px-6">© 2026 OrbitalGuard AI</p>
      </div>
    </footer>
  )
}
