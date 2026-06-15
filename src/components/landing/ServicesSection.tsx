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

// ── Layout config — tweak sizes & positions here ──────────────────────────
const LAYOUT = {
  // Outer-edge figures — absolutely positioned, one per card (outer corners)
  svgLeft1:  { width: 'clamp(300px, 28vw, 520px)', top: '26%',  left: '-2%'  }, // [0] Study Visa
  svgRight1: { width: 'clamp(300px, 28vw, 520px)', top: '22%',  right: '-2%' }, // [1] Find a Job
  svgLeft2:  { width: 'clamp(300px, 28vw, 520px)', bottom: '0%', left: '-2%'  }, // [2] Visit & Immig
  svgRight2: { width: 'clamp(300px, 28vw, 520px)', bottom: '0%', right: '-2%' }, // [3] Language Test
  starOpacity: 0.25,
}

// ── Card theme config ─────────────────────────────────────────────────────
const cardThemes = [
  {
    // Study Visa — teal
    cardBg:    'var(--grad-teal)',
    iconColor: 'text-green',
    titleColor:'text-bg',
    descColor: 'text-bg/70',
    btnClass:  'border-green bg-green text-text hover:opacity-90',
  },
  {
    // Find a Job — orange
    cardBg:    'var(--grad-orange)',
    iconColor: 'text-white',
    titleColor:'text-white',
    descColor: 'text-white/70',
    btnClass:  'border-white/30 bg-white/20 text-white hover:bg-white/35',
  },
  {
    // Visit & Immigration — blue
    cardBg:    'var(--grad-blue)',
    iconColor: 'text-white',
    titleColor:'text-white',
    descColor: 'text-white/70',
    btnClass:  'border-white/30 bg-white/20 text-white hover:bg-white/35',
  },
  {
    // Language & Test Prep — lime green #B7C733
    cardBg:    'linear-gradient(135deg, #cdd94e 0%, #B7C733 60%, #96a420 100%)',
    iconColor: 'text-text',
    titleColor:'text-text',
    descColor: 'text-text/70',
    btnClass:  'border-text/20 bg-text/15 text-text hover:bg-text/25',
  },
]

const services: {
  icon: typeof GraduationCap
  title: string
  description: string
  tag?: string
  service: ServiceOption
  svg: string
}[] = [
  {
    icon: GraduationCap,
    title: 'Study Visa',
    description: 'University applications, visa filing, end-to-end support',
    tag: 'most popular',
    service: 'Study Visa',
    svg: '/student walking.svg',
  },
  {
    icon: Briefcase,
    title: 'Find a Job',
    description: 'Work permit guidance and overseas job placement support',
    service: 'Job Abroad',
    svg: '/doctor element.svg',
  },
  {
    icon: Globe,
    title: 'Visit and Immigration',
    description: 'Visit visas, immigration processing, document preparation included',
    service: 'Visit Visa',
    svg: '/corporate man.svg',
  },
  {
    icon: BookOpen,
    title: 'Language Test and Preparation',
    description: 'IELTS, PTE, language courses — all levels',
    service: 'Language & Test Prep',
    svg: '/student with files.svg',
  },
]

export function ServicesSection() {
  const navigate = useNavigateWithTransition()
  const setSelectedService = useScrollStore((s) => s.setSelectedService)

  const handleSelect = (service: ServiceOption) => {
    navigate(4, () => setSelectedService(service))
  }

  return (
    <div className="bg-texture relative flex h-full flex-col justify-center overflow-hidden bg-bg px-5 py-10 md:px-10 md:py-24">

      {/* ── Decorative layer — stars + outer-edge figures ─────────── */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">

        {/* Stars */}
        <LandingDecor
          src="/Orange Star.svg"
          size="star"
          className="right-[8%] top-[10%]"
          style={{ animation: 'star-pulse 3.5s ease-in-out infinite' }}
          opacity={LAYOUT.starOpacity}
        />
        <LandingDecor
          src="/Blue Star.svg"
          size="star"
          className="left-[5%] top-[30%]"
          style={{ animation: 'star-pulse 4.8s ease-in-out infinite', animationDelay: '1.5s' }}
          opacity={LAYOUT.starOpacity}
          hideBelowMd
        />
        <LandingDecor
          src="/Green star.svg"
          size="star"
          className="left-[50%] top-[15%]"
          style={{ animation: 'star-pulse 5.5s ease-in-out infinite', animationDelay: '2.5s' }}
          opacity={LAYOUT.starOpacity}
          hideBelowMd
        />

        {/* [0] Study Visa — student walking — outer LEFT top */}
        <LandingDecor
          src="/student walking.svg"
          hideBelowLg
          opacity={1}
          style={{
            width: LAYOUT.svgLeft1.width,
            top: LAYOUT.svgLeft1.top,
            left: LAYOUT.svgLeft1.left,
            animation: 'float-bob 7s ease-in-out infinite',
          }}
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
        />

        {/* [1] Find a Job — doctor element — outer RIGHT top */}
        <LandingDecor
          src="/doctor element.svg"
          hideBelowLg
          opacity={1}
          style={{
            width: LAYOUT.svgRight1.width,
            top: LAYOUT.svgRight1.top,
            right: LAYOUT.svgRight1.right,
            animation: 'float-bob-delayed 8s ease-in-out infinite',
          }}
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
        />

        {/* [2] Visit & Immigration — corporate man — outer LEFT bottom */}
        <LandingDecor
          src="/corporate man.svg"
          hideBelowLg
          opacity={1}
          style={{
            width: LAYOUT.svgLeft2.width,
            bottom: LAYOUT.svgLeft2.bottom,
            left: LAYOUT.svgLeft2.left,
            animation: 'float-bob 9s ease-in-out infinite',
            animationDelay: '1s',
          }}
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.4 }}
        />

        {/* [3] Language Test — student with files — outer RIGHT bottom */}
        <LandingDecor
          src="/student with files.svg"
          hideBelowLg
          opacity={1}
          style={{
            width: LAYOUT.svgRight2.width,
            bottom: LAYOUT.svgRight2.bottom,
            right: LAYOUT.svgRight2.right,
            animation: 'float-bob-delayed 7s ease-in-out infinite',
            animationDelay: '0.5s',
          }}
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.5 }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto w-full max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: 'easeInOut' }}
          className="mb-5 text-center md:mb-10"
        >
          <p className="mb-3 text-xs font-medium uppercase tracking-widest text-orange">
            what we do
          </p>
          <h2 className="text-[clamp(1.75rem,6vw,3.5rem)] font-semibold leading-tight text-blue">
            Four Ways To Ace
          </h2>
        </motion.div>

        {/* Clean 2×2 card grid — figures are in the absolute layer above */}
        <div className="grid grid-cols-2 gap-3 sm:gap-5">
          {services.map((item, i) => {
            const Icon = item.icon
            const theme = cardThemes[i]
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: i * 0.08, ease: 'easeInOut' }}
              >
                <Card
                  variant="dark"
                  className="flex h-full flex-col gap-3 p-4 md:gap-4 md:p-6"
                  style={{ background: theme.cardBg }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <Icon className={`h-5 w-5 shrink-0 md:h-7 md:w-7 ${theme.iconColor}`} strokeWidth={1.5} />
                    {item.tag && (
                      <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-medium text-white md:px-3 md:py-1 md:text-xs">
                        {item.tag}
                      </span>
                    )}
                  </div>
                  <h3 className={`text-[clamp(0.8rem,2.3vw,1.125rem)] font-semibold leading-snug ${theme.titleColor}`}>
                    {item.title}
                  </h3>
                  <p className={`hidden flex-1 text-sm sm:block ${theme.descColor}`}>{item.description}</p>
                  <Button
                    onClick={() => handleSelect(item.service)}
                    className={`w-full py-2 text-xs md:py-3 md:text-sm ${theme.btnClass}`}
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
