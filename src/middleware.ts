import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../convex/_generated/api'

const isPublicRoute = createRouteMatcher(['/sign-in(.*)', '/api/webhooks/clerk', '/terms', '/privacy'])
  const isAccountRoute = createRouteMatcher(['/account(.*)'])
const isApiRoute = createRouteMatcher(['/api/complete-onboarding'])
const isOnboardingRoute = createRouteMatcher(['/onboarding', '/onboarding-success'])

// Initialize Convex client for middleware
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth()
  
  // Allow public routes without authentication
  if (isPublicRoute(req)) {
    return NextResponse.next()
  }
  
  // Allow account routes for authenticated users (but don't check onboarding status)
  if (isAccountRoute(req)) {
    await auth.protect()
    return NextResponse.next()
  }
  
  // Allow API routes for authenticated users (but don't check onboarding status)
  if (isApiRoute(req)) {
    await auth.protect()
    return NextResponse.next()
  }
  
  // Allow onboarding route for authenticated users
  if (isOnboardingRoute(req)) {
    await auth.protect()
    return NextResponse.next()
  }
  
  // Protect all other routes
  await auth.protect()
  
  // Check if authenticated user has completed onboarding
  if (userId) {
    try {
      // Check Convex user record for onboarding completion
      const user = await convex.query(api.users.getBySubject, { subject: userId })
      
      if (user) {
        const hasCompletedOnboarding = user.onboardingCompleted
        
        // If user hasn't completed onboarding, redirect to onboarding page
        if (!hasCompletedOnboarding && !isOnboardingRoute(req)) {
          const onboardingUrl = new URL('/onboarding', req.url)
          return NextResponse.redirect(onboardingUrl)
        }
        
        // If user has completed onboarding but is on onboarding page, redirect to home
        if (hasCompletedOnboarding && isOnboardingRoute(req)) {
          const homeUrl = new URL('/', req.url)
          return NextResponse.redirect(homeUrl)
        }
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error)
      // On error, allow access but log the issue
    }
  }
  
  return NextResponse.next()
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}