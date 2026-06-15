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

export function LandingPage() {
  return (
    <>
      <LandingNav />
      <ScrollContainer>
        <HeroSection />              {/* 0 */}
        <AboutSection />             {/* 1 */}
        <ServicesSection />          {/* 2 */}
        <AIChatSection />            {/* 3 */}
        <RegistrationSection />      {/* 4 */}
        <GallerySection />           {/* 5 */}
        <CountriesSection />         {/* 6 */}
        <BlogsSection />             {/* 7 */}
        <EventsSection />            {/* 8 */}
        <ScholarshipsSection />      {/* 9 */}
        <BecomeAPartnerSection />    {/* 10 */}
      </ScrollContainer>
    </>
  )
}
