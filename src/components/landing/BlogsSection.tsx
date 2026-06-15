'use client'

import { motion } from 'framer-motion'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LandingDecor } from './LandingDecor'

const posts = [
  {
    tag: 'Study Visa',
    title: '5 Things You Must Know Before Applying to a UK University',
    excerpt: 'From CAS letters to ATAS certificates — here\'s what Pakistani students miss most.',
    date: 'June 10, 2026',
    readTime: '4 min read',
    color: 'var(--grad-teal)',
  },
  {
    tag: 'IELTS Tips',
    title: 'How to Score 7.5+ in IELTS Writing with These 3 Techniques',
    excerpt: 'Most students fail Writing Task 2 for the same reasons. Let\'s fix them.',
    date: 'June 5, 2026',
    readTime: '6 min read',
    color: 'var(--grad-orange)',
  },
  {
    tag: 'Scholarships',
    title: 'Top 10 Fully Funded Scholarships for Pakistani Students in 2026',
    excerpt: 'Chevening, Commonwealth, Erasmus — deadlines, eligibility, and how to apply.',
    date: 'May 28, 2026',
    readTime: '8 min read',
    color: 'var(--grad-blue)',
  },
]

export function BlogsSection() {
  return (
    <div className="bg-texture relative flex h-full flex-col justify-center overflow-hidden px-5 py-10 md:px-10 md:py-24" style={{ background: 'var(--grad-teal)' }}>

      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
        <LandingDecor
          src="/Orange Star.svg" size="star"
          className="left-[10%] top-[15%]"
          style={{ animation: 'star-pulse 3.2s ease-in-out infinite' }}
          opacity={0.25}
        />
        <LandingDecor
          src="/Blue Star.svg" size="star"
          className="right-[12%] top-[60%]"
          style={{ animation: 'star-pulse 4.6s ease-in-out infinite', animationDelay: '1.5s' }}
          opacity={0.25}
          hideBelowMd
        />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: 'easeInOut' }}
          className="mb-5 text-center md:mb-10"
        >
          <p className="mb-3 text-xs font-medium uppercase tracking-widest text-orange">
            stay informed
          </p>
          <h2 className="text-[clamp(1.75rem,6vw,3.5rem)] font-semibold leading-tight text-white">
            Guides, Tips &
            <br />
            Success Stories
          </h2>
        </motion.div>

        <div className="grid gap-4 md:grid-cols-3 md:gap-5">
          {posts.map((post, i) => (
            <motion.div
              key={post.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: i * 0.1, ease: 'easeInOut' }}
            >
              <Card
                variant="dark"
                className="flex h-full flex-col gap-3 p-5"
                style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.2)' }}
              >
                <span
                  className="w-fit rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white"
                  style={{ background: post.color }}
                >
                  {post.tag}
                </span>
                <h3 className="text-sm font-semibold leading-snug text-white md:text-base">
                  {post.title}
                </h3>
                <p className="flex-1 text-sm leading-relaxed text-white/75">{post.excerpt}</p>
                <div className="flex items-center justify-between text-xs text-white/50">
                  <span>{post.date}</span>
                  <span>{post.readTime}</span>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-6 text-center md:mt-10"
        >
          <Button className="px-8 py-3">View All Articles →</Button>
        </motion.div>
      </div>
    </div>
  )
}
