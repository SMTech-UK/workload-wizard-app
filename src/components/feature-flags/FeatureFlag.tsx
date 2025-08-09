"use client";

import { ReactNode } from "react";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import { FeatureFlags } from "@/lib/feature-flags/types";

interface FeatureFlagProps {
  flag: FeatureFlags;
  children: ReactNode;
  fallback?: ReactNode;
  loading?: ReactNode;
  error?: ReactNode;
  context?: Record<string, unknown>;
}

/**
 * Component that conditionally renders children based on feature flag
 */
export function FeatureFlag({
  flag,
  children,
  fallback = null,
  loading = null,
  error = null,
  context,
}: FeatureFlagProps) {
  const {
    enabled,
    loading: isLoading,
    error: flagError,
  } = useFeatureFlag(flag, context);

  if (isLoading) {
    return <>{loading}</>;
  }

  if (flagError) {
    return <>{error}</>;
  }

  return <>{enabled ? children : fallback}</>;
}

/**
 * Component that renders children only when feature flag is disabled
 */
export function FeatureFlagDisabled({
  flag,
  children,
  fallback = null,
  loading = null,
  error = null,
  context,
}: FeatureFlagProps) {
  const {
    enabled,
    loading: isLoading,
    error: flagError,
  } = useFeatureFlag(flag, context);

  if (isLoading) {
    return <>{loading}</>;
  }

  if (flagError) {
    return <>{error}</>;
  }

  return <>{!enabled ? children : fallback}</>;
}

/**
 * Component that renders different content based on feature flag state
 */
interface FeatureFlagSwitchProps {
  flag: FeatureFlags;
  enabled: ReactNode;
  disabled: ReactNode;
  loading?: ReactNode;
  error?: ReactNode;
  context?: Record<string, unknown>;
}

export function FeatureFlagSwitch({
  flag,
  enabled,
  disabled,
  loading = null,
  error = null,
  context,
}: FeatureFlagSwitchProps) {
  const {
    enabled: isEnabled,
    loading: isLoading,
    error: flagError,
  } = useFeatureFlag(flag, context);

  if (isLoading) {
    return <>{loading}</>;
  }

  if (flagError) {
    return <>{error}</>;
  }

  return <>{isEnabled ? enabled : disabled}</>;
}
