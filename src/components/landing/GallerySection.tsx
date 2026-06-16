'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useScrollStore } from '@/lib/stores/scrollStore'
import { useNavigateWithTransition } from './ScrollContainer'

const stories = [
  {
    name: 'Ahmad',
    city: 'Lahore',
    destination: 'University of Manchester',
    flag: '🇬🇧',
    quote: 'They made the whole UK process feel simple. I had my offer in 8 weeks.',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&h=450&q=80',
  },
  {
    name: 'Sara',
    city: 'Karachi',
    destination: 'Dublin Business School',
    flag: '🇮🇪',
    quote: 'The AI chat answered everything at midnight. My counselor sealed the deal.',
    image: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=600&h=450&q=80',
  },
  {
    name: 'Usman',
    city: 'Islamabad',
    destination: 'Toronto Metropolitan',
    flag: '🇨🇦',
    quote: 'From IELTS prep to visa filing — one team, zero confusion.',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=600&h=450&q=80',
  },
]

export function GallerySection() {
  const navigate = useNavigateWithTransition()
  const setHighlightAce = useScrollStore((s) => s.setHighlightAce)
  const stripRef = useRef<HTMLDivElement>(null)
  const [activeStory, setActiveStory] = useState(0)

  const updateActiveStory = useCallback(() => {
    const strip = stripRef.current
    if (!strip) return
    const cards = strip.querySelectorAll<HTMLElement>('[data-gallery-card]')
    if (!cards.length) return

    const stripCenter = strip.scrollLeft + strip.clientWidth / 2
    let closest = 0
    let minDist = Infinity
    cards.forEach((card, i) => {
      const cardCenter = card.offsetLeft + card.offsetWidth / 2
      const dist = Math.abs(stripCenter - cardCenter)
      if (dist < minDist) {
        minDist = dist
        closest = i
      }
    })
    setActiveStory(closest)
  }, [])

  useEffect(() => {
    const strip = stripRef.current
    if (!strip) return
    updateActiveStory()
    strip.addEventListener('scroll', updateActiveStory, { passive: true })
    return () => strip.removeEventListener('scroll', updateActiveStory)
  }, [updateActiveStory])

  const scrollToStory = (index: number) => {
    const strip = stripRef.current
    if (!strip) return
    const card = strip.querySelectorAll<HTMLElement>('[data-gallery-card]')[index]
    if (!card) return
    card.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    setActiveStory(index)
  }

  const handleReady = () => {
    navigate(1, () => setHighlightAce(true))
  }

  return (
    <div className="bg-texture flex h-full flex-col justify-center overflow-y-auto px-4 py-8 md:px-10 md:py-24" style={{ background: 'var(--grad-blue)' }}>
      <div className="mx-auto w-full max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: 'easeInOut' }}
          className="mb-5 text-center md:mb-10"
        >
          <p className="mb-3 text-xs font-medium uppercase tracking-widest text-orange">
            dream bigger
          </p>
          <h2
            className="text-[clamp(2rem,6vw,3.5rem)] font-semibold leading-tight lowercase"
            style={{
              background: 'var(--grad-teal)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            students who
            <br />
            made it happen
          </h2>
        </motion.div>

        {/* ── Mobile: stacked deck layout ─────────────────────────── */}
        <div className="md:hidden">
          <div className="flex flex-col gap-2">
            {stories.map((story, i) => (
              <motion.div
                key={story.name}
                data-gallery-card
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.07, ease: 'easeOut' }}
              >
                <Card className="flex flex-row items-center gap-3 p-3 opacity-[0.35]">
                  {/* Compact photo thumbnail */}
                  <div className="h-16 w-20 shrink-0 overflow-hidden rounded-xl">
                    <img
                      src={story.image}
                      alt={`${story.name} from ${story.city}`}
                      className="h-full w-full object-cover object-center"
                    />
                  </div>
                  {/* Text */}
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-base" aria-hidden="true">{story.flag}</span>
                      <p className="truncate text-xs font-semibold text-blue lowercase">
                        {story.name}, {story.city}
                      </p>
                    </div>
                    <p className="text-[10px] text-text/50 lowercase">{story.destination}</p>
                    <p className="line-clamp-2 text-xs leading-relaxed text-text/75">
                      &ldquo;{story.quote}&rdquo;
                    </p>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── Desktop: 3-column grid ───────────────────────────────── */}
        <div
          ref={stripRef}
          className="hidden gap-5 md:grid md:grid-cols-3"
        >
          {stories.map((story, i) => (
            <motion.div
              key={story.name}
              data-gallery-card
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: i * 0.1, ease: 'easeInOut' }}
            >
              <Card className="flex h-full flex-col gap-4 opacity-[0.35]">
                <div className="aspect-[4/3] w-full overflow-hidden rounded-[12px]">
                  <img
                    src={story.image}
                    alt={`${story.name} from ${story.city}`}
                    className="h-full w-full object-cover object-center transition-transform duration-500 hover:scale-105"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl" aria-hidden="true">{story.flag}</span>
                  <p className="text-sm font-medium text-blue lowercase">
                    {story.name}, {story.city} → {story.destination}
                  </p>
                </div>
                <p className="text-sm leading-relaxed text-text/80">
                  &ldquo;{story.quote}&rdquo;
                </p>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="mt-5 border-t border-white/20 pt-5 text-center md:mt-10 md:pt-10">
          <h3 className="mb-3 text-base font-semibold text-white md:mb-5 md:text-2xl">
            Ready to Write Your Story?
          </h3>
          {/* Full-width CTA on mobile */}
          <Button onClick={handleReady} className="w-full py-4 text-base sm:w-auto sm:px-8">
            I&apos;m ready now →
          </Button>
        </div>
      </div>
    </div>
  )
}
