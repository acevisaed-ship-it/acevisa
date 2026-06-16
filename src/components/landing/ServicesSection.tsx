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

// ── Layout config ─────────────────────────────────────────────────────────
const LAYOUT = {
  // Inline SVG height — each figure matches card-row height, bottom-aligned
  svgMaxH: 'clamp(260px, 38vh, 520px)',
  // Max width so figures don't crush the cards on mid screens
  svgMaxW: 'clamp(160px, 18vw, 320px)',
  starOpacity: 0.25,
}

// Row pairs — left SVG | two cards | right SVG
const rows = [
  {
    leftSvg:  '/student walking.svg',
    rightSvg: '/doctor element.svg',
    cardIndices: [0, 1],          // Study Visa, Find a Job
    animDelay: [0, 0.08] as const,
  },
  {
    leftSvg:  '/corporate man.svg',
    rightSvg: '/student with files.svg',
    cardIndices: [2, 3],          // Visit & Immigration, Language Test
    animDelay: [0.16, 0.24] as const,
  },
]

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
    <div className="bg-texture relative flex h-full flex-col overflow-hidden bg-bg">

      {/* ── Decorative layer — stars only ────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
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

      </div>

      {/* ══════════════════════════════════════════════════════════
          MOBILE LAYOUT  (< md)
          Heading compact at top, then 4 cards filling remaining
          height equally, each with its SVG overlapping the right.
      ═════════════════════════════════════════════════════════ */}
      <div className="relative z-10 flex h-full flex-col md:hidden">

        {/* Heading — compact, pinned to top */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          className="px-5 pb-2 pt-4 text-center"
        >
          <p className="text-[10px] font-medium uppercase tracking-widest text-orange">
            what we do
          </p>
          <h2 className="text-2xl font-semibold leading-tight text-blue">
            Four Ways To Ace
          </h2>
        </motion.div>

        {/* 4 cards — each flex-1 fills equal remaining height */}
        <div className="flex flex-1 flex-col gap-2 px-3 pb-3">
          {services.map((item, i) => {
            const Icon = item.icon
            const theme = cardThemes[i]
            return (
              <motion.div
                key={item.title}
                className="relative flex-1"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.07, ease: 'easeOut' }}
              >
                {/* Card — content constrained to left 62% to leave room for SVG */}
                <Card
                  variant="dark"
                  className="absolute inset-0 flex flex-col justify-between p-3"
                  style={{ background: theme.cardBg, paddingRight: '38%' }}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`h-5 w-5 shrink-0 ${theme.iconColor}`} strokeWidth={1.5} />
                    {item.tag && (
                      <span className="rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-medium text-white">
                        {item.tag}
                      </span>
                    )}
                  </div>
                  <h3 className={`text-sm font-semibold leading-snug ${theme.titleColor}`}>
                    {item.title}
                  </h3>
                  <Button
                    onClick={() => handleSelect(item.service)}
                    className={`w-full py-1.5 text-[11px] ${theme.btnClass}`}
                  >
                    I need this →
                  </Button>
                </Card>

                {/* SVG — overlapping right side of card, bottom-anchored */}
                <div
                  className="pointer-events-none absolute bottom-0 right-0 top-0"
                  style={{ width: '42%' }}
                  aria-hidden="true"
                >
                  <img
                    src={item.svg}
                    alt=""
                    className="h-full w-full object-contain object-bottom"
                  />
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          DESKTOP LAYOUT  (md+)
          Two rows of [SVG | card + card | SVG]
      ═════════════════════════════════════════════════════════ */}
      <div className="relative z-10 mx-auto hidden h-full w-full max-w-6xl flex-col justify-center px-5 py-10 md:flex md:px-10 md:py-24">
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

        {/* Two rows: [SVG | card + card | SVG] */}
        <div className="flex flex-col gap-3 sm:gap-5">
          {rows.map((row, rowIdx) => (
            <div key={rowIdx} className="flex items-end gap-2 sm:gap-4">

              {/* Left figure — bottom-aligned, hidden below lg */}
              <div className="hidden shrink-0 lg:block" style={{ maxWidth: LAYOUT.svgMaxW }}>
                <img
                  src={row.leftSvg}
                  aria-hidden="true"
                  className="h-auto w-full object-contain object-bottom"
                  style={{ maxHeight: LAYOUT.svgMaxH }}
                />
              </div>

              {/* Two cards side-by-side */}
              <div className="grid flex-1 grid-cols-2 gap-3 sm:gap-5">
                {row.cardIndices.map((ci, j) => {
                  const item = services[ci]
                  const Icon = item.icon
                  const theme = cardThemes[ci]
                  return (
                    <motion.div
                      key={item.title}
                      initial={{ opacity: 0, y: 24 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.7, delay: row.animDelay[j], ease: 'easeInOut' }}
                      className="h-full"
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

              {/* Right figure — bottom-aligned, hidden below lg */}
              <div className="hidden shrink-0 lg:block" style={{ maxWidth: LAYOUT.svgMaxW }}>
                <img
                  src={row.rightSvg}
                  aria-hidden="true"
                  className="h-auto w-full object-contain object-bottom"
                  style={{ maxHeight: LAYOUT.svgMaxH }}
                />
              </div>

            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
