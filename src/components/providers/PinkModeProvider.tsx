'use client';

import { usePinkMode } from '@/hooks/usePinkMode';

interface PinkModeProviderProps {
  children: React.ReactNode;
}

export function PinkModeProvider({ children }: PinkModeProviderProps) {
  // This hook will automatically manage the pink mode theme
  // by adding/removing the 'pink-mode' class from the document
  usePinkMode();

  return <>{children}</>;
}
