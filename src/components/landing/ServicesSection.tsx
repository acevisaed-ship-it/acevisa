'use client'

import { motion } from 'framer-motion'
import {
  GraduationCap,
  Briefcase,
  Globe,
  BookOpen,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import {
  type ServiceOption,
  useScrollStore,
} from '@/lib/stores/scrollStore'
import { LandingDecor } from './LandingDecor'
import { useNavigateWithTransition } from './ScrollContainer'

const services: {
  icon: typeof GraduationCap
  title: string
  description: string
  tag?: string
  service: ServiceOption
}[] = [
  {
    icon: GraduationCap,
    title: 'Study Visa & Admissions',
    description: 'University applications, visa filing, end-to-end support',
    tag: 'most popular',
    service: 'Study Visa',
  },
  {
    icon: Briefcase,
    title: 'Find a Job Abroad',
    description: 'Work permit guidance and overseas job placement support',
    service: 'Job Abroad',
  },
  {
    icon: Globe,
    title: 'Visit & Immigration Visa',
    description: 'Visit visas, immigration processing, document preparation included',
    service: 'Visit Visa',
  },
  {
    icon: BookOpen,
    title: 'Language Learning & Test Prep',
    description: 'IELTS, PTE, language courses — all levels',
    service: 'Language & Test Prep',
  },
]

const journeyStages = [
  { src: '/student walking.svg', delay: 0, bottom: '4%', left: '2%', size: 'figure' as const },
  { src: '/confident student.svg', delay: 0.15, bottom: '8%', left: '22%', size: 'figure' as const },
  { src: '/Doctor.svg', delay: 0.3, bottom: '14%', left: '44%', size: 'figure-lg' as const },
  { src: '/corporate man.svg', delay: 0.45, bottom: '20%', left: '66%', size: 'figure-lg' as const },
]

export function ServicesSection() {
  const navigate = useNavigateWithTransition()
  const setSelectedService = useScrollStore((s) => s.setSelectedService)

  const handleSelect = (service: ServiceOption) => {
    navigate(3, () => setSelectedService(service))
  }

  return (
    <div className="bg-texture relative flex h-full flex-col justify-center overflow-hidden bg-bg px-5 py-24 md:px-10">

      {/* ── Journey stages illustration ──────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">

        <svg
          className="absolute inset-0 hidden h-full w-full lg:block"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M 0,95% C 25%,88% 50%,75% 75%,60% L 100%,45%"
            fill="none"
            stroke="#0A3F3A"
            strokeWidth="1.5"
            strokeDasharray="8 8"
            opacity="0.12"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {journeyStages.map((stage) => (
          <LandingDecor
            key={stage.src}
            src={stage.src}
            size={stage.size}
            hideBelowLg
            style={{
              bottom: stage.bottom,
              left: stage.left,
              animation: `float-bob ${6 + stage.delay * 4}s ease-in-out infinite`,
              animationDelay: `${stage.delay * 2}s`,
            }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 0.2, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: stage.delay }}
          />
        ))}

        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.6 + i * 0.1 }}
            className="pointer-events-none absolute hidden text-orange lg:block"
            style={{
              bottom: `${9 + i * 6}%`,
              left: `${12 + i * 22}%`,
              fontSize: 'clamp(14px, 2vmin, 20px)',
              opacity: 0.35,
              fontWeight: 700,
            }}
          >
            →
          </motion.div>
        ))}

        <LandingDecor
          src="/Orange Star.svg"
          size="star"
          className="right-[8%] top-[10%]"
          style={{ animation: 'star-pulse 3.5s ease-in-out infinite' }}
          opacity={0.25}
        />

        <LandingDecor
          src="/Blue Star.svg"
          size="star"
          className="left-[5%] top-[30%]"
          style={{ animation: 'star-pulse 4.8s ease-in-out infinite', animationDelay: '1.5s' }}
          opacity={0.2}
          hideBelowMd
        />

        <LandingDecor
          src="/Green star.svg"
          size="star"
          className="left-[50%] top-[15%]"
          style={{ animation: 'star-pulse 5.5s ease-in-out infinite', animationDelay: '2.5s' }}
          opacity={0.2}
          hideBelowMd
        />

        <LandingDecor
          src="/helmet orange.svg"
          size="prop"
          hideBelowMd
          className="right-[3%] top-[12%]"
          style={{ animation: 'float-bob 7s ease-in-out infinite', animationDelay: '1s' }}
          opacity={0.15}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 0.15 }}
          viewport={{ once: true }}
          transition={{ delay: 0.8 }}
        />

        <LandingDecor
          src="/student bacpack.svg"
          size="prop"
          hideBelowMd
          className="left-[35%] top-[8%]"
          style={{ animation: 'float-bob-delayed 9s ease-in-out infinite' }}
          opacity={0.15}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 0.15 }}
          viewport={{ once: true }}
          transition={{ delay: 1 }}
        />
      </div>
      {/* ── /Journey stages ──────────────────────────────────────── */}

      {/* Content */}
      <div className="relative z-10 mx-auto w-full max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: 'easeInOut' }}
          className="mb-8 text-center md:mb-10"
        >
          <p className="mb-3 text-xs font-medium uppercase tracking-widest text-orange">
            what we do
          </p>
          <h2 className="text-[clamp(2rem,6vw,3.5rem)] font-semibold leading-tight text-blue lowercase">
            four ways we
            <br />
            get you there
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
          {services.map((item, i) => {
            const Icon = item.icon
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: i * 0.08, ease: 'easeInOut' }}
              >
                <Card className="flex h-full flex-col gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <Icon className="h-7 w-7 shrink-0 text-green" strokeWidth={1.5} />
                    {item.tag && (
                      <span className="rounded-full bg-orange/15 px-3 py-1 text-xs font-medium text-orange">
                        {item.tag}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold lowercase text-blue">
                    {item.title}
                  </h3>
                  <p className="flex-1 text-sm text-text/70">{item.description}</p>
                  <Button
                    variant={i % 2 === 0 ? 'primary' : 'secondary'}
                    onClick={() => handleSelect(item.service)}
                    className="w-full sm:w-auto"
                  >
                    I need this →
                  </Button>
                </Card>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
