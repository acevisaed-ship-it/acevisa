import { createStore, type StoreApi } from 'zustand/vanilla'
import { useStore } from 'zustand'

export const ANIMATION_MS = 2100

export interface TransitionStore {
  isPlaying: boolean
  playId: number
  triggerTransition: (onComplete: () => void) => void
}

const STORE_KEY = '__acevisa_transition_store__'

type GlobalWithStore = typeof globalThis & {
  [STORE_KEY]?: StoreApi<TransitionStore>
}

function createTransitionStore(): StoreApi<TransitionStore> {
  let animationTimer: ReturnType<typeof setTimeout> | null = null

  return createStore<TransitionStore>((set) => ({
    isPlaying: false,
    playId: 0,
    triggerTransition: (onComplete) => {
      if (animationTimer) {
        clearTimeout(animationTimer)
        animationTimer = null
      }
      set({ isPlaying: false })
      requestAnimationFrame(() => {
        set((state) => ({
          isPlaying: true,
          playId: state.playId + 1,
        }))
        animationTimer = setTimeout(() => {
          set({ isPlaying: false })
          animationTimer = null
          // Defer navigation until after React commits overlay teardown.
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              onComplete()
            })
          })
        }, ANIMATION_MS)
      })
    },
  }))
}

function getTransitionStore(): StoreApi<TransitionStore> {
  const global = globalThis as GlobalWithStore
  if (!global[STORE_KEY]) {
    global[STORE_KEY] = createTransitionStore()
  }
  return global[STORE_KEY]
}

const transitionStore = getTransitionStore()

export const useTransitionStore = <T,>(
  selector: (state: TransitionStore) => T,
): T => useStore(transitionStore, selector)

export function triggerTransition(onComplete: () => void): void {
  transitionStore.getState().triggerTransition(onComplete)
}
