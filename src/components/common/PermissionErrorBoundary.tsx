"use client";

import React, { Component, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ShieldX } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  isPermissionError: boolean;
}

/**
 * Error boundary that specifically handles permission errors
 * Automatically redirects to /unauthorised for 403 errors
 */
export class PermissionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, isPermissionError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Check if this is a permission error
    const isPermissionError =
      (error as any).statusCode === 403 ||
      error.message === "Forbidden" ||
      error.message.includes("permission") ||
      error.message.includes("access denied") ||
      error.message.includes("Insufficient permissions");

    return {
      hasError: true,
      error,
      isPermissionError,
    };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Call the onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log the error
    console.error("PermissionErrorBoundary caught an error:", error, errorInfo);

    // If it's a permission error, redirect to unauthorised page
    if (this.state.isPermissionError) {
      // Use setTimeout to avoid navigation during render
      setTimeout(() => {
        window.location.href = "/unauthorised";
      }, 100);
    }
  }

  override render() {
    if (this.state.hasError) {
      // If it's a permission error, show a brief message before redirecting
      if (this.state.isPermissionError) {
        return (
          <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
            <Card className="w-full max-w-md">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-3 bg-red-100 rounded-full w-fit">
                  <ShieldX className="h-8 w-8 text-red-600" />
                </div>
                <CardTitle>Access Denied</CardTitle>
                <CardDescription>
                  Redirecting to unauthorised page...
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        );
      }

      // For other errors, show the fallback or default error UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-3 bg-red-100 rounded-full w-fit">
                <ShieldX className="h-8 w-8 text-red-600" />
              </div>
              <CardTitle>Something went wrong</CardTitle>
              <CardDescription>
                An unexpected error occurred. Please try refreshing the page.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
              >
                Refresh Page
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook-based error boundary for functional components
 */
export function usePermissionErrorHandler() {
  const router = useRouter();

  const handlePermissionError = (error: Error) => {
    const isPermissionError =
      (error as any).statusCode === 403 ||
      error.message === "Forbidden" ||
      error.message.includes("permission") ||
      error.message.includes("access denied") ||
      error.message.includes("Insufficient permissions");

    if (isPermissionError) {
      // Redirect to unauthorised page
      router.push("/unauthorised");
    } else {
      // Re-throw other errors
      throw error;
    }
  };

  return { handlePermissionError };
}

/**
 * HOC that wraps components with permission error handling
 */
export function withPermissionErrorHandling<P extends object>(
  Component: React.ComponentType<P>,
) {
  return function WrappedComponent(props: P) {
    return (
      <PermissionErrorBoundary>
        <Component {...props} />
      </PermissionErrorBoundary>
    );
  };
}
