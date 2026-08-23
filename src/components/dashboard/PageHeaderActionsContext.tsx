'use client'

import { createContext, useContext, useEffect } from 'react'

type Setter = (node: React.ReactNode) => void

export const PageHeaderActionsContext = createContext<Setter | null>(null)

/** Lets a page inject extra controls into the shell's top header bar, next
 * to the notification bell/avatar — e.g. the client profile page's online
 * toggle, chat link, and copy-portal-link button. Works in both
 * DashboardShell (counselor) and AdminShell, which each provide this same
 * context — only one shell is ever mounted at a time, so sharing it is safe. */
export function usePageHeaderActions(node: React.ReactNode) {
  const setNode = useContext(PageHeaderActionsContext)
  useEffect(() => {
    if (!setNode) return
    setNode(node)
    return () => setNode(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setNode])
}
