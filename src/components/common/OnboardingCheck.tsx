"use client"

import { useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"

export function OnboardingCheck({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (isLoaded && user) {
      const hasCompletedOnboarding = user.publicMetadata?.onboardingCompleted
      
      // If user hasn't completed onboarding, redirect to onboarding page
      if (!hasCompletedOnboarding) {
        router.push("/onboarding")
        return
      }
    }
  }, [isLoaded, user, router])

  // Don't render children until we've checked onboarding status
  if (!isLoaded) {
    return <div>Loading...</div>
  }

  if (user && !user.publicMetadata?.onboardingCompleted) {
    return <div>Redirecting to onboarding...</div>
  }

  return <>{children}</>
}