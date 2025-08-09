"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

export default function OnboardingSuccessPage() {
  const { user, isLoaded } = useUser();
  const [message, setMessage] = useState("Finalizing your account setup...");

  // Check Convex user record for onboarding completion
  const currentUserData = useQuery(
    api.users.getBySubject,
    user?.id ? { subject: user.id } : "skip",
  );

  useEffect(() => {
    if (isLoaded && currentUserData) {
      // Check if onboarding is marked as complete in Convex
      if (currentUserData.onboardingCompleted) {
        // Success! Redirect to dashboard
        setMessage("Success! Redirecting to dashboard...");
        window.location.replace("/dashboard");
      } else {
        // Wait a bit and check again
        const timer = setTimeout(() => {
          // This will trigger a re-query
          setMessage("Still setting up...");
        }, 2000);

        return () => clearTimeout(timer);
      }
    } else if (isLoaded && !currentUserData) {
      // User not found in Convex, wait and try again
      const timer = setTimeout(() => {
        setMessage("Setting up your account...");
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [isLoaded, currentUserData]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p>{message}</p>
        <p className="text-sm text-muted-foreground mt-2">
          This may take a few moments
        </p>
      </div>
    </div>
  );
}
