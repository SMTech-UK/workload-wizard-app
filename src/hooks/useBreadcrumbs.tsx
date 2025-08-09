"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { usePathname } from "next/navigation"

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbContextType {
  breadcrumbs: BreadcrumbItem[]
  setBreadcrumbs: (breadcrumbs: BreadcrumbItem[]) => void
  addBreadcrumb: (breadcrumb: BreadcrumbItem) => void
  resetBreadcrumbs: () => void
}

const BreadcrumbContext = createContext<BreadcrumbContextType | undefined>(undefined)

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([])
  const pathname = usePathname()

  // Auto-generate breadcrumbs based on pathname
  useEffect(() => {
    const pathSegments = pathname.split('/').filter(Boolean)
    const autoBreadcrumbs: BreadcrumbItem[] = []

    if (pathSegments.length === 0) {
      autoBreadcrumbs.push({ label: "Home", href: "/" })
    } else {
      autoBreadcrumbs.push({ label: "Home", href: "/" })
      
      let currentPath = ""
      pathSegments.forEach((segment, index) => {
        currentPath += `/${segment}`
        const isLast = index === pathSegments.length - 1
        
        // Convert path segments to readable labels
        const label = segment
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
        
        autoBreadcrumbs.push(
          isLast
            ? { label }
            : { label, href: currentPath }
        )
      })
    }

    setBreadcrumbs(autoBreadcrumbs)
  }, [pathname])

  const addBreadcrumb = (breadcrumb: BreadcrumbItem) => {
    setBreadcrumbs(prev => [...prev, breadcrumb])
  }

  const resetBreadcrumbs = () => {
    setBreadcrumbs([{ label: "Home", href: "/" }])
  }

  return (
    <BreadcrumbContext.Provider value={{
      breadcrumbs,
      setBreadcrumbs,
      addBreadcrumb,
      resetBreadcrumbs
    }}>
      {children}
    </BreadcrumbContext.Provider>
  )
}

export function useBreadcrumbs() {
  const context = useContext(BreadcrumbContext)
  if (context === undefined) {
    throw new Error('useBreadcrumbs must be used within a BreadcrumbProvider')
  }
  return context
}

// Helper hook for setting page-specific breadcrumbs
export function usePageBreadcrumbs(breadcrumbs: BreadcrumbItem[]) {
  const { setBreadcrumbs } = useBreadcrumbs()
  
  useEffect(() => {
    setBreadcrumbs(breadcrumbs)
  }, [breadcrumbs, setBreadcrumbs])
}