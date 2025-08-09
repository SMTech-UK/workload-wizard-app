"use client";

interface DevLoginProviderProps {
  children: React.ReactNode;
}

export function DevLoginProvider({ children }: DevLoginProviderProps) {
  // For now, just render children without the hook to avoid errors
  return <>{children}</>;
}
