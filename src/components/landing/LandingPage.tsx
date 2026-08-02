'use client'

import { LandingNav } from './LandingNav'
import { ScrollContainer } from './ScrollContainer'
import { HeroSection } from './HeroSection'
import { AboutSection } from './AboutSection'
import { ServicesSection } from './ServicesSection'
import { AIChatSection } from './AIChatSection'
import { RegistrationSection } from './RegistrationSection'
import { GallerySection } from './GallerySection'
import { CountriesSection } from './CountriesSection'
import { BlogsSection } from './BlogsSection'
import { EventsSection } from './EventsSection'
import { ScholarshipsSection } from './ScholarshipsSection'
import { BecomeAPartnerSection } from './BecomeAPartnerSection'

// `published: false` = built and kept in the codebase, just not shown on the live
// site yet. Flip back to `true` and redeploy whenever it's ready to go live —
// no need to touch imports or re-wire anything else.
const SECTIONS: { id: string; Component: React.ComponentType; published: boolean }[] = [
  { id: 'hero',         Component: HeroSection,           published: true },
  { id: 'about',        Component: AboutSection,          published: true },
  { id: 'services',     Component: ServicesSection,       published: true },
  { id: 'ai-chat',      Component: AIChatSection,         published: true },
  { id: 'register',     Component: RegistrationSection,   published: true },
  { id: 'gallery',      Component: GallerySection,        published: false }, // page 6 — hold for later
  { id: 'countries',    Component: CountriesSection,      published: true },
  { id: 'blogs',        Component: BlogsSection,          published: false }, // page 8 — hold for later
  { id: 'events',       Component: EventsSection,         published: false }, // page 9 — hold for later
  { id: 'scholarships', Component: ScholarshipsSection,   published: false }, // page 10 — hold for later
  { id: 'partner',      Component: BecomeAPartnerSection, published: false }, // page 11 — hold for later
]

export function LandingPage() {
  const visible = SECTIONS.filter((s) => s.published)

  return (
    <>
      <LandingNav />
      <ScrollContainer>
        {visible.map(({ id, Component }) => <Component key={id} />)}
      </ScrollContainer>
    </>
  )
}
