import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  Globe2,
  LayoutDashboard,
  Rocket,
  Satellite,
  Settings,
  type LucideIcon,
} from 'lucide-react'

export const siteConfig = {
  name: 'OrbitalGuard AI',
  tagline: 'Space Traffic Management',
  description: 'AI-Assisted Space Traffic Management',
  github: 'https://github.com/',
  linkedin: 'https://www.linkedin.com/',
}

export const marketingNav = [
  { label: 'Platform', href: '/#platform' },
  { label: 'How It Works', href: '/#how-it-works' },
  { label: 'Technology', href: '/#technology' },
  { label: 'About', href: '/#about' },
  { label: 'Demo', href: '/#demo' },
]

export interface AppNavItem {
  label: string
  href: string
  icon: LucideIcon
}

export const appNav: { section: string; items: AppNavItem[] }[] = [
  { section: 'Overview', items: [{ label: 'Dashboard', href: '/platform', icon: LayoutDashboard }] },
  {
    section: 'Monitor',
    items: [
      { label: 'Live Orbit', href: '/platform/live-orbit', icon: Globe2 },
      { label: 'Satellites', href: '/platform/satellites', icon: Satellite },
    ],
  },
  {
    section: 'Assess',
    items: [
      { label: 'Conjunctions', href: '/platform/conjunctions', icon: AlertTriangle },
      { label: 'Risk Analysis', href: '/platform/risk', icon: Activity },
    ],
  },
  {
    section: 'Simulate',
    items: [{ label: 'Avoidance Simulation', href: '/platform/simulation', icon: Rocket }],
  },
  {
    section: 'Insights',
    items: [
      { label: 'Analytics', href: '/platform/analytics', icon: BarChart3 },
      { label: 'Alerts', href: '/platform/alerts', icon: Bell },
    ],
  },
  { section: 'System', items: [{ label: 'Settings', href: '/platform/settings', icon: Settings }] },
]

/** Edit this list to add team members. Placeholders render until filled in. */
export const team = {
  name: 'Kode Hanma',
  members: [
    { name: 'Team Member', role: 'Role to be added', github: '', linkedin: '' },
    { name: 'Team Member', role: 'Role to be added', github: '', linkedin: '' },
    { name: 'Team Member', role: 'Role to be added', github: '', linkedin: '' },
    { name: 'Team Member', role: 'Role to be added', github: '', linkedin: '' },
  ],
}
