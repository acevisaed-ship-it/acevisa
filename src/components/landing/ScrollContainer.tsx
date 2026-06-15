'use client'

import {
  Children,
  isValidElement,
  useRef,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import { motion } from 'framer-motion'
import {
  SECTION_COUNT,
  useScrollStore,
} from '@/lib/stores/scrollStore'
import { useTransitionStore } from '@/lib/stores/transitionStore'

interface ScrollContainerProps {
  children: ReactNode
}

function getSections(children: ReactNode) {
  return Children.toArray(children)
    .filter(isValidElement)
    .slice(0, SECTION_COUNT)
}

// How long (ms) to lock input after a section change, preventing rapid multi-skip
const SNAP_COOLDOWN = 750

export function ScrollContainer({ children }: ScrollContainerProps) {
  const sections = getSections(children)
  const containerRef = useRef<HTMLDivElement>(null)
  const cooldownRef   = useRef(false)
  const touchStartY   = useRef(0)

  const currentSection = useScrollStore((s) => s.currentSection)
  const setScrollToSection = useScrollStore((s) => s.setScrollToSection)

  const goToSection = useCallback((index: number) => {
    if (cooldownRef.current) return
    const clamped = Math.max(0, Math.min(SECTION_COUNT - 1, index))
    useScrollStore.setState({ currentSection: clamped })
    cooldownRef.current = true
    setTimeout(() => { cooldownRef.current = false }, SNAP_COOLDOWN)
  }, [])

  // Expose scrollToSection so other components (nav, buttons) can call it
  useEffect(() => {
    setScrollToSection(goToSection)
  }, [setScrollToSection, goToSection])

  // Wheel snap
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (cooldownRef.current) return
      if (Math.abs(e.deltaY) < 10) return          // ignore tiny nudges
      const dir = e.deltaY > 0 ? 1 : -1
      goToSection(useScrollStore.getState().currentSection + dir)
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [goToSection])

  // Touch swipe snap
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const onTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY
    }

    const onTouchEnd = (e: TouchEvent) => {
      const delta = touchStartY.current - e.changedTouches[0].clientY
      if (Math.abs(delta) < 40) return             // too short to be a swipe
      if (cooldownRef.current) return
      const dir = delta > 0 ? 1 : -1
      goToSection(useScrollStore.getState().currentSection + dir)
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchend',   onTouchEnd,   { passive: true })
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchend',   onTouchEnd)
    }
  }, [goToSection])

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault()
        goToSection(useScrollStore.getState().currentSection + 1)
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault()
        goToSection(useScrollStore.getState().currentSection - 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goToSection])

  return (
    <>
      {/* No-JS fallback — sections stack normally */}
      <div className="landing-fallback">
        {sections.map((child, i) => (
          <section key={i} className="min-h-screen w-full">
            {child}
          </section>
        ))}
      </div>

      {/* JS-enabled: fixed viewport, one section at a time */}
      <div
        ref={containerRef}
        className="inverted-scroll fixed inset-0 overflow-hidden bg-bg"
        style={{ touchAction: 'none' }}
      >
        {sections.map((child, index) => {
          // Compute vertical offset relative to the active section
          const offset = (index - currentSection) * 100   // in vh units

          return (
            <motion.section
              key={child.key ?? index}
              aria-label={`Section ${index + 1}`}
              className="absolute inset-0 h-full w-full"
              initial={false}
              animate={{ y: `${offset}vh` }}
              transition={{
                type: 'spring',
                stiffness: 280,
                damping: 36,
                mass: 1,
              }}
            >
              {child}
            </motion.section>
          )
        })}

        {/* ── Scroll-position indicator dots (right edge) ──────────────
             Visible always; gives mobile users a "where am I" signal
             since there is no scroll-bar in full-page-snap UX.      */}
        <div
          className="pointer-events-none absolute right-3 top-1/2 z-50 flex -translate-y-1/2 flex-col gap-2"
          aria-hidden="true"
        >
          {sections.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to section ${i + 1}`}
              onClick={() => goToSection(i)}
              className="pointer-events-auto h-2 w-2 rounded-full transition-all duration-300"
              style={{
                background:
                  i === currentSection
                    ? 'var(--orange)'
                    : 'rgba(10, 63, 58, 0.25)',
                transform: i === currentSection ? 'scale(1.4)' : 'scale(1)',
              }}
            />
          ))}
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
