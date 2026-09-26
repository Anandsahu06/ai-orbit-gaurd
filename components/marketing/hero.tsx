import Link from 'next/link'
import { ArrowRight, PlayCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { HeroGlobe } from './hero-globe'

const STATS = [
  { value: '33+', label: 'Tracked Objects' },
  { value: '48h', label: 'Screening Horizon' },
  { value: '3', label: 'Core Modules' },
  { value: 'AI-Assisted', label: 'Risk Analysis' },
]

export function Hero() {
  return (
    <section id="platform" className="relative overflow-hidden border-b bg-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(11,31,58,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(11,31,58,0.04)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_top_left,black,transparent_70%)]"
      />
      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 md:px-6 lg:grid-cols-[1fr_1.1fr] lg:py-24">
        <div className="flex flex-col gap-6">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-orange/30 bg-orange-soft px-3 py-1 text-xs font-semibold tracking-wide text-orange uppercase">
            <span className="size-1.5 rounded-full bg-orange" aria-hidden="true" />
            Orbital decision support
          </span>
          <h1 className="text-4xl leading-[1.05] font-bold tracking-tight text-balance text-navy sm:text-5xl lg:text-6xl">
            AI-Assisted
            <br />
            Space Traffic
            <br />
            <span className="text-orange">Management</span>
          </h1>
          <p className="max-w-lg text-lg leading-relaxed text-pretty text-muted-foreground">
            Track orbital objects, assess potential conjunction risks, and evaluate hypothetical avoidance scenarios from one platform.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" nativeButton={false} render={<Link href="/platform" />} className="bg-orange text-white hover:bg-orange/90">
              Explore Platform
              <ArrowRight data-icon="inline-end" />
            </Button>
            <Button size="lg" variant="outline" nativeButton={false} render={<a href="#demo" />} className="border-navy/20 text-navy">
              <PlayCircle data-icon="inline-start" />
              View Demo
            </Button>
          </div>
        </div>
        <HeroGlobe />
      </div>
      <div className="relative border-t bg-subtle">
        <dl className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-y px-4 md:px-6 lg:grid-cols-4 lg:divide-y-0">
          {STATS.map((s) => (
            <div key={s.label} className="flex flex-col gap-1 px-4 py-6 first:pl-0 lg:px-8">
              <dt className="order-2 text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">{s.label}</dt>
              <dd className="order-1 text-2xl font-bold tracking-tight text-navy md:text-3xl">{s.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
