import { create } from 'zustand'

export const SECTION_COUNT = 6

export type ServiceOption =
  | 'Study Visa'
  | 'Job Abroad'
  | 'Visit Visa'
  | 'Language & Test Prep'

interface ScrollStore {
  currentSection: number
  highlightAce: boolean
  selectedService: ServiceOption | null
  scrollToSection: ((index: number) => void) | null
  setScrollToSection: (fn: (index: number) => void) => void
  goToSection: (index: number) => void
  setHighlightAce: (value: boolean) => void
  setSelectedService: (service: ServiceOption | null) => void
}

export const useScrollStore = create<ScrollStore>((set, get) => ({
  currentSection: 0,
  highlightAce: false,
  selectedService: null,
  scrollToSection: null,
  setScrollToSection: (fn) => set({ scrollToSection: fn }),
  goToSection: (index) => {
    const { scrollToSection } = get()
    if (scrollToSection) {
      scrollToSection(index)
    } else {
      set({ currentSection: index })
    }
  },
  setHighlightAce: (value) => set({ highlightAce: value }),
  setSelectedService: (service) => set({ selectedService: service }),
}))
