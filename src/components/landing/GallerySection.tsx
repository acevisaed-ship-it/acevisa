'use client'

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
  },
  {
    name: 'Sara',
    city: 'Karachi',
    destination: 'Dublin Business School',
    flag: '🇮🇪',
    quote: 'The AI chat answered everything at midnight. My counselor sealed the deal.',
  },
  {
    name: 'Usman',
    city: 'Islamabad',
    destination: 'Toronto Metropolitan',
    flag: '🇨🇦',
    quote: 'From IELTS prep to visa filing — one team, zero confusion.',
  },
]

export function GallerySection() {
  const navigate = useNavigateWithTransition()
  const setHighlightAce = useScrollStore((s) => s.setHighlightAce)

  const handleReady = () => {
    navigate(1, () => setHighlightAce(true))
  }

  return (
    <div className="bg-texture flex h-full flex-col justify-center overflow-y-auto bg-bg px-5 py-24 md:px-10">
      <div className="mx-auto w-full max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: 'easeInOut' }}
          className="mb-8 text-center md:mb-10"
        >
          <p className="mb-3 text-xs font-medium uppercase tracking-widest text-orange">
            dream bigger
          </p>
          <h2 className="text-[clamp(2rem,6vw,3.5rem)] font-semibold leading-tight text-blue lowercase">
            students who
            <br />
            made it happen
          </h2>
        </motion.div>

        <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory md:grid md:grid-cols-3 md:overflow-visible md:pb-0">
          {stories.map((story, i) => (
            <motion.div
              key={story.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: i * 0.1, ease: 'easeInOut' }}
              className="w-[min(85vw,320px)] shrink-0 snap-center md:w-auto"
            >
              <Card className="flex h-full flex-col gap-4">
                <div className="aspect-[4/3] w-full rounded-[12px] bg-text/10" />
                <div className="flex items-center gap-2">
                  <span className="text-xl" aria-hidden="true">
                    {story.flag}
                  </span>
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

        <div className="mt-10 border-t border-text/10 pt-10 text-center">
          <h3 className="mb-5 text-xl font-semibold lowercase text-blue md:text-2xl">
            ready to write your story?
          </h3>
          <Button onClick={handleReady} className="px-8 py-4 text-base">
            I&apos;m ready now →
          </Button>
        </div>
      </div>
    </div>
  )
}
