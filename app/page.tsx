import { Hero } from '@/components/marketing/hero'
import {
  AboutSection,
  AiSection,
  CtaSection,
  FeaturesSection,
  HowItWorksSection,
  ProblemSection,
  ProductPreviewSection,
  SimulationSection,
  TechnologySection,
} from '@/components/marketing/sections'
import { SiteFooter } from '@/components/marketing/site-footer'
import { SiteHeader } from '@/components/marketing/site-header'

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <ProblemSection />
        <HowItWorksSection />
        <FeaturesSection />
        <ProductPreviewSection />
        <TechnologySection />
        <AiSection />
        <SimulationSection />
        <AboutSection />
        <CtaSection />
      </main>
      <SiteFooter />
    </>
  )
}
