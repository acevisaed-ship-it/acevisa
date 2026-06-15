'use client'

import { LandingNav } from './LandingNav'
import { ScrollContainer } from './ScrollContainer'
import { HeroSection } from './HeroSection'
import { AboutSection } from './AboutSection'
import { ServicesSection } from './ServicesSection'
import { AIChatSection } from './AIChatSection'
import { RegistrationSection } from './RegistrationSection'
import { GallerySection } from './GallerySection'

export function LandingPage() {
  return (
    <>
      <LandingNav />
      <ScrollContainer>
        <HeroSection />        {/* 0 */}
        <AboutSection />       {/* 1 */}
        <ServicesSection />    {/* 2 */}
        <AIChatSection />      {/* 3 */}
        <RegistrationSection />{/* 4 */}
        <GallerySection />     {/* 5 */}
      </ScrollContainer>
    </>
  )
}
