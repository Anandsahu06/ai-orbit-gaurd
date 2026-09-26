import Image from 'next/image'
import Link from 'next/link'
import {
  Activity,
  ArrowRight,
  Brain,
  Code2,
  Cpu,
  GitBranch,
  Globe2,
  Layers,
  Orbit,
  Rocket,
  Satellite,
  Scale,
  Server,
  ShieldAlert,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

function SectionHeading({ eyebrow, title, description, center }: { eyebrow: string; title: string; description?: string; center?: boolean }) {
  return (
    <div className={cn('flex max-w-2xl flex-col gap-3', center && 'mx-auto items-center text-center')}>
      <span className="text-xs font-semibold tracking-[0.16em] text-orange uppercase">{eyebrow}</span>
      <h2 className="text-3xl font-bold tracking-tight text-balance text-navy md:text-4xl">{title}</h2>
      {description && <p className="text-base leading-relaxed text-pretty text-muted-foreground">{description}</p>}
    </div>
  )
}

function Section({ id, className, children }: { id?: string; className?: string; children: React.ReactNode }) {
  return (
    <section id={id} className={cn('scroll-mt-16 border-b', className)}>
      <div className="mx-auto flex max-w-7xl flex-col gap-12 px-4 py-20 md:px-6 lg:py-24">{children}</div>
    </section>
  )
}

const PROBLEMS = [
  { icon: Orbit, title: 'Orbital Traffic', body: 'A growing number of satellites and debris objects share the same orbital regimes.' },
  { icon: ShieldAlert, title: 'Conjunction Risk', body: 'Close approaches between objects require timely, consistent assessment.' },
  { icon: Scale, title: 'Decision Complexity', body: 'Operators need to compare possible responses before committing to one.' },
]

export function ProblemSection() {
  return (
    <Section className="bg-white">
      <SectionHeading eyebrow="The challenge" title="Space is becoming increasingly complex to monitor." />
      <div className="grid gap-5 md:grid-cols-3">
        {PROBLEMS.map((p) => (
          <article key={p.title} className="flex flex-col gap-4 rounded-xl border bg-white p-6">
            <span className="flex size-10 items-center justify-center rounded-lg bg-navy/5 text-navy">
              <p.icon className="size-5" aria-hidden="true" />
            </span>
            <h3 className="text-lg font-semibold text-navy">{p.title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{p.body}</p>
          </article>
        ))}
      </div>
      <p className="border-l-2 border-orange pl-4 text-lg font-medium text-navy">
        OrbitalGuard brings these steps into one decision-support workflow.
      </p>
    </Section>
  )
}

const STEPS = [
  { n: '01', title: 'Track', body: 'Ingest orbital element sets for tracked objects.', status: 'Prototype' },
  { n: '02', title: 'Propagate', body: 'Compute future positions with SGP4 propagation.', status: 'Prototype' },
  { n: '03', title: 'Assess', body: 'Screen for close approaches and score potential risk.', status: 'Prototype' },
  { n: '04', title: 'Simulate', body: 'Model hypothetical maneuvers and their effect on miss distance.', status: 'In development' },
  { n: '05', title: 'Decide', body: 'Support operator review with comparable scenarios.', status: 'Planned' },
]

export function HowItWorksSection() {
  return (
    <Section id="how-it-works" className="bg-subtle">
      <SectionHeading
        eyebrow="How it works"
        title="From orbital data to decision support."
        description="The workflow OrbitalGuard is built around. Stage maturity reflects the current prototype."
      />
      <ol className="grid gap-4 md:grid-cols-5">
        {STEPS.map((s, i) => (
          <li key={s.n} className="relative flex flex-col gap-3 rounded-xl border bg-white p-5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm font-semibold text-orange">{s.n}</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">{s.status}</span>
            </div>
            <h3 className="text-base font-bold tracking-wide text-navy uppercase">{s.title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            {i < STEPS.length - 1 && (
              <ArrowRight aria-hidden="true" className="absolute top-1/2 -right-3.5 z-10 hidden size-5 -translate-y-1/2 rounded-full border bg-white p-0.5 text-navy md:block" />
            )}
          </li>
        ))}
      </ol>
    </Section>
  )
}

const FEATURES = [
  {
    n: '01',
    title: 'Live Orbit',
    body: 'Propagate orbital states and visualize trajectories in 3D.',
    icon: Globe2,
    href: '/platform/live-orbit',
    visual: (
      <svg viewBox="0 0 200 110" className="h-full w-full" aria-hidden="true">
        <circle cx="100" cy="55" r="26" fill="#0B1F3A" />
        <ellipse cx="100" cy="55" rx="70" ry="22" fill="none" stroke="#8FB2E3" strokeWidth="1.5" />
        <ellipse cx="100" cy="55" rx="52" ry="40" fill="none" stroke="#8FB2E3" strokeWidth="1" opacity=".6" transform="rotate(35 100 55)" />
        <circle cx="168" cy="50" r="4" fill="#F26B1D" />
        <circle cx="62" cy="24" r="3" fill="#0B1F3A" />
      </svg>
    ),
  },
  {
    n: '02',
    title: 'Conjunction Assessment',
    body: 'Prioritize potential close-approach scenarios by miss distance, velocity and time to TCA.',
    icon: Activity,
    href: '/platform/conjunctions',
    visual: (
      <div className="flex h-full w-full flex-col justify-center gap-2 px-4">
        {[
          ['bg-critical', 'w-[88%]'],
          ['bg-danger', 'w-[70%]'],
          ['bg-warning', 'w-[48%]'],
          ['bg-success', 'w-[26%]'],
        ].map(([c, w]) => (
          <div key={w} className="h-2 rounded-full bg-muted">
            <div className={cn('h-2 rounded-full', c, w)} />
          </div>
        ))}
      </div>
    ),
  },
  {
    n: '03',
    title: 'Avoidance Simulation',
    body: 'Compare hypothetical maneuver scenarios using ΔV, direction and lead time.',
    icon: Rocket,
    href: '/platform/simulation',
    visual: (
      <svg viewBox="0 0 200 110" className="h-full w-full" aria-hidden="true">
        <path d="M10 80 Q100 40 190 80" fill="none" stroke="#8A9AB0" strokeWidth="1.5" strokeDasharray="4 4" />
        <path d="M10 80 Q100 10 190 70" fill="none" stroke="#F26B1D" strokeWidth="2" />
        <circle cx="100" cy="60" r="4" fill="#EF4444" />
        <circle cx="100" cy="36" r="4" fill="#F26B1D" />
      </svg>
    ),
  },
]

export function FeaturesSection() {
  return (
    <Section className="bg-white">
      <SectionHeading eyebrow="Core modules" title="Three modules, one workflow." />
      <div className="grid gap-5 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <article key={f.n} className="group flex flex-col overflow-hidden rounded-xl border bg-white transition-shadow hover:shadow-lg hover:shadow-navy/5">
            <div className="h-32 border-b bg-subtle">{f.visual}</div>
            <div className="flex flex-1 flex-col gap-3 p-6">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-semibold text-orange">{f.n}</span>
                <span className="h-px w-4 bg-border" aria-hidden="true" />
                <h3 className="text-sm font-bold tracking-wide text-navy uppercase">{f.title}</h3>
              </div>
              <p className="flex-1 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              <Button variant="link" nativeButton={false} render={<Link href={f.href} />} className="h-auto w-fit p-0 text-navy">
                Explore
                <ArrowRight data-icon="inline-end" />
              </Button>
            </div>
          </article>
        ))}
      </div>
    </Section>
  )
}

const PREVIEW_STEPS = [
  { n: '01', title: 'Monitor', body: 'Track orbital objects' },
  { n: '02', title: 'Assess', body: 'Understand potential risk' },
  { n: '03', title: 'Simulate', body: 'Explore hypothetical responses' },
  { n: '04', title: 'Compare', body: 'Evaluate scenarios' },
]

export function ProductPreviewSection() {
  return (
    <Section id="demo" className="bg-subtle">
      <SectionHeading eyebrow="Product" title="One workspace for orbital decision support." />
      <div className="grid items-center gap-10 lg:grid-cols-[1.6fr_1fr]">
        <div className="overflow-hidden rounded-xl border bg-white shadow-2xl shadow-navy/10">
          <div className="flex items-center gap-1.5 border-b bg-muted/60 px-3 py-2" aria-hidden="true">
            <span className="size-2.5 rounded-full bg-border" />
            <span className="size-2.5 rounded-full bg-border" />
            <span className="size-2.5 rounded-full bg-border" />
          </div>
          <Image
            src="/images/dashboard-preview.png"
            alt="OrbitalGuard dashboard showing KPIs, a 3D orbit view and the priority conjunction table"
            width={1440}
            height={900}
            className="h-auto w-full"
          />
        </div>
        <div className="flex flex-col gap-6">
          <ol className="flex flex-col gap-5">
            {PREVIEW_STEPS.map((s) => (
              <li key={s.n} className="flex gap-4">
                <span className="font-mono text-sm font-semibold text-orange">{s.n}</span>
                <div>
                  <h3 className="font-semibold text-navy">{s.title}</h3>
                  <p className="text-sm text-muted-foreground">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <Button size="lg" nativeButton={false} render={<Link href="/platform" />} className="w-fit bg-navy text-white hover:bg-navy/90">
            Open Interactive Demo
            <ArrowRight data-icon="inline-end" />
          </Button>
        </div>
      </div>
    </Section>
  )
}

const TECH = [
  { icon: Orbit, name: 'SGP4', role: 'Orbital Propagation' },
  { icon: Server, name: 'Python / FastAPI', role: 'Backend API' },
  { icon: GitBranch, name: 'Random Forest', role: 'Risk Classification' },
  { icon: Globe2, name: 'CesiumJS', role: '3D Visualization' },
  { icon: Code2, name: 'React', role: 'Interactive Platform' },
]

export function TechnologySection() {
  return (
    <Section id="technology" className="bg-white">
      <SectionHeading eyebrow="Technology" title="Built on orbital mechanics, data and AI." />
      <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {TECH.map((t) => (
          <li key={t.name} className="flex flex-col gap-3 rounded-xl border p-5">
            <t.icon className="size-5 text-orange" aria-hidden="true" />
            <div>
              <p className="font-semibold text-navy">{t.name}</p>
              <p className="text-sm text-muted-foreground">{t.role}</p>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  )
}

export function AiSection() {
  const factors = ['Distance', 'Relative Velocity', 'Time to TCA']
  return (
    <Section className="bg-navy text-white [&_h2]:text-white">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <SectionHeading
            eyebrow="AI assistance"
            title="AI-Assisted Risk Intelligence"
            description="A classification model helps rank conjunction events so operators can focus attention where it matters most."
          />
          <p className="flex items-start gap-3 rounded-lg border border-white/15 bg-white/5 p-4 text-sm leading-relaxed text-white/85">
            <Brain className="mt-0.5 size-4 shrink-0 text-orange" aria-hidden="true" />
            AI assists prioritization; orbital mechanics remains the foundation.
          </p>
        </div>
        <div className="rounded-xl bg-white p-6 text-navy shadow-2xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">Risk Score</p>
              <p className="mt-1 font-mono text-5xl font-bold">
                87<span className="text-xl text-muted-foreground"> / 100</span>
              </p>
            </div>
            <span className="rounded-md bg-danger/10 px-2.5 py-1 text-xs font-bold tracking-wide text-danger uppercase">High Risk</span>
          </div>
          <div className="mt-4 h-2 rounded-full bg-muted">
            <div className="h-2 w-[87%] rounded-full bg-danger" />
          </div>
          <div className="mt-6 border-t pt-5">
            <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">Contributing Factors</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {factors.map((f) => (
                <li key={f} className="rounded-md border px-2.5 py-1 text-sm font-medium">
                  {f}
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-5 flex items-center justify-between border-t pt-5 text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Cpu className="size-4" aria-hidden="true" />
              Model
            </span>
            <span className="font-semibold">Random Forest</span>
          </div>
          <p className="mt-4 text-[11px] text-muted-foreground">Illustrative example based on prototype sample data.</p>
        </div>
      </div>
    </Section>
  )
}

export function SimulationSection() {
  return (
    <Section className="bg-white">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <SectionHeading
            eyebrow="Avoidance simulation"
            title="What if we maneuver?"
            description="Adjust hypothetical maneuver parameters and compare the resulting miss distance against the baseline."
          />
          <ul className="flex flex-wrap gap-2">
            {['ΔV', 'Direction', 'Lead Time'].map((p) => (
              <li key={p} className="rounded-md border bg-subtle px-3 py-1.5 text-sm font-medium text-navy">
                {p}
              </li>
            ))}
          </ul>
          <Button size="lg" nativeButton={false} render={<Link href="/platform/simulation" />} className="w-fit bg-orange text-white hover:bg-orange/90">
            Compare Scenarios
            <ArrowRight data-icon="inline-end" />
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-4 rounded-xl border bg-subtle p-6">
            <span className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">Baseline</span>
            <div>
              <p className="text-xs text-muted-foreground">Miss distance</p>
              <p className="font-mono text-3xl font-bold text-navy">0.42 km</p>
            </div>
            <p className="text-sm">
              Risk: <span className="font-mono font-semibold text-danger">82</span>
            </p>
          </div>
          <div className="flex flex-col gap-4 rounded-xl border-2 border-orange bg-orange-soft p-6">
            <span className="text-xs font-semibold tracking-[0.14em] text-orange uppercase">Scenario</span>
            <div>
              <p className="text-xs text-muted-foreground">Miss distance</p>
              <p className="font-mono text-3xl font-bold text-navy">1.47 km</p>
            </div>
            <p className="text-sm">
              Risk: <span className="font-mono font-semibold text-danger">70</span>
            </p>
          </div>
          <p className="col-span-2 text-xs text-muted-foreground">Hypothetical scenario using prototype sample values. Not an operational maneuver recommendation.</p>
        </div>
      </div>
    </Section>
  )
}

export function AboutSection() {
  return (
    <Section id="about" className="bg-subtle">
      <div className="grid gap-10 lg:grid-cols-2">
        <SectionHeading eyebrow="Mission" title="Making orbital safety analysis more accessible." />
        <div className="flex flex-col gap-4 text-base leading-relaxed text-muted-foreground">
          <p>
            OrbitalGuard AI is a decision-support prototype for space traffic management. It combines established orbital propagation with machine-learning risk
            classification to help users explore potential conjunctions and compare hypothetical responses.
          </p>
          <p>
            The platform is designed to support human analysis, not replace it. All outputs are intended for research and evaluation, and the current release runs on
            prototype sample data.
          </p>
          <ul className="mt-2 grid grid-cols-2 gap-3 text-sm text-navy">
            {[
              { icon: Satellite, label: 'Orbital tracking' },
              { icon: Activity, label: 'Risk screening' },
              { icon: Rocket, label: 'Scenario simulation' },
              { icon: Layers, label: 'Unified workspace' },
            ].map((i) => (
              <li key={i.label} className="flex items-center gap-2">
                <i.icon className="size-4 text-orange" aria-hidden="true" />
                {i.label}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  )
}

export function CtaSection() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-20 md:px-6">
        <div className="relative overflow-hidden rounded-2xl bg-navy px-6 py-16 text-center text-white md:px-12">
          <div aria-hidden="true" className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full border border-white/10" />
          <div aria-hidden="true" className="pointer-events-none absolute -top-40 -right-40 size-[26rem] rounded-full border border-white/5" />
          <h2 className="relative text-3xl font-bold tracking-tight text-balance md:text-4xl">Ready to explore OrbitalGuard?</h2>
          <p className="relative mt-3 text-lg text-white/70">Track. Assess. Simulate. Decide.</p>
          <Button size="lg" nativeButton={false} render={<Link href="/platform" />} className="relative mt-8 bg-orange text-white hover:bg-orange/90">
            Launch Platform
            <ArrowRight data-icon="inline-end" />
          </Button>
        </div>
      </div>
    </section>
  )
}
