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

export function ServicesSection() {
  const navigate = useNavigateWithTransition()
  const setSelectedService = useScrollStore((s) => s.setSelectedService)

  const handleSelect = (service: ServiceOption) => {
    navigate(3, () => setSelectedService(service))
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
