"use client";

import { useUser } from "@clerk/nextjs";

import { HomePlaceholder } from "@/components/common/PlaceholderPage";

export default function DashboardPage() {
  const { isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  return <HomePlaceholder />;
}
