'use client'

import { LandingNav } from './LandingNav'
import { ScrollContainer } from './ScrollContainer'
import { HeroSection } from './HeroSection'
import { AboutSection } from './AboutSection'
import { ServicesSection } from './ServicesSection'
import { RegistrationSection } from './RegistrationSection'
import { GallerySection } from './GallerySection'

export function LandingPage() {
  return (
    <>
      <LandingNav />
      <ScrollContainer>
        <HeroSection />
        <AboutSection />
        <ServicesSection />
        <RegistrationSection />
        <GallerySection />
      </ScrollContainer>
    </>
  )
}
