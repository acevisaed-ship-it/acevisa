'use client'

import {
  useRef,
  useEffect,
  useCallback,
  useState,
  type ReactNode,
} from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import {
  SECTION_COUNT,
  useScrollStore,
} from '@/lib/stores/scrollStore'
import { useTransitionStore } from '@/lib/stores/transitionStore'

interface ScrollContainerProps {
  children: ReactNode[]
}

function SectionWrapper({
  index,
  scrollY,
  viewportHeight,
  children,
}: {
  index: number
  scrollY: ReturnType<typeof useScroll>['scrollY']
  viewportHeight: number
  children: ReactNode
}) {
  const y = useTransform(scrollY, (latest) => latest - index * viewportHeight)

  return (
    <motion.section
      style={{ y }}
      className="absolute left-0 right-0 top-0 h-screen w-full"
      aria-label={`Section ${index + 1}`}
    >
      {children}
    </motion.section>
  )
}

export function ScrollContainer({ children }: ScrollContainerProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [viewportHeight, setViewportHeight] = useState(800)
  const setScrollToSection = useScrollStore((s) => s.setScrollToSection)

  const { scrollY } = useScroll({
    container: scrollRef,
  })

  const scrollToSection = useCallback((index: number) => {
    const el = scrollRef.current
    if (!el) return
    const clamped = Math.max(0, Math.min(SECTION_COUNT - 1, index))
    el.scrollTo({ top: clamped * viewportHeight, behavior: 'auto' })
    useScrollStore.setState({ currentSection: clamped })
  }, [viewportHeight])

  useEffect(() => {
    setViewportHeight(window.innerHeight)
    setScrollToSection(scrollToSection)

    const onResize = () => setViewportHeight(window.innerHeight)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [setScrollToSection, scrollToSection])

  useEffect(() => {
    const el = scrollRef.current
    const container = containerRef.current
    if (!el || !container) return

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      el.scrollTop -= e.deltaY
    }

    let touchStartY = 0

    const onTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY
    }

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      const deltaY = touchStartY - e.touches[0].clientY
      touchStartY = e.touches[0].clientY
      el.scrollTop += deltaY
    }

    container.addEventListener('wheel', onWheel, { passive: false })
    container.addEventListener('touchstart', onTouchStart, { passive: true })
    container.addEventListener('touchmove', onTouchMove, { passive: false })

    return () => {
      container.removeEventListener('wheel', onWheel)
      container.removeEventListener('touchstart', onTouchStart)
      container.removeEventListener('touchmove', onTouchMove)
    }
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const onScroll = () => {
      const section = Math.round(el.scrollTop / viewportHeight)
      useScrollStore.setState({ currentSection: section })
    }

    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [viewportHeight])

  return (
    <>
      {/* No-JS fallback */}
      <div className="landing-fallback">
        {children.map((child, i) => (
          <section key={i} className="min-h-screen w-full">
            {child}
          </section>
        ))}
      </div>

      {/* Inverted scroll (JS enabled) */}
      <div
        ref={containerRef}
        className="inverted-scroll fixed inset-0 overflow-hidden bg-bg"
      >
        <div className="relative h-full w-full">
          {children.map((child, index) => (
            <SectionWrapper
              key={index}
              index={index}
              scrollY={scrollY}
              viewportHeight={viewportHeight}
            >
              {child}
            </SectionWrapper>
          ))}
        </div>

        <div
          ref={scrollRef}
          data-scroll-proxy
          className="pointer-events-none absolute inset-0 overflow-y-scroll opacity-0"
          tabIndex={0}
          aria-label="Scroll to navigate sections"
        >
          <div style={{ height: `${SECTION_COUNT * viewportHeight}px` }} />
        </div>
      </div>
    </>
  )
}

export function useNavigateWithTransition() {
  const triggerTransition = useTransitionStore((s) => s.triggerTransition)
  const goToSection = useScrollStore((s) => s.goToSection)

  return useCallback(
    (sectionIndex: number, beforeScroll?: () => void) => {
      triggerTransition(() => {
        beforeScroll?.()
        goToSection(sectionIndex)
      })
    },
    [triggerTransition, goToSection]
  )
}
