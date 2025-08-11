import { redirect } from "next/navigation";
import { toast } from "@/hooks/use-toast";

// Server-side permission error handler
export function handlePermissionError(
  error: Error,
  redirectTo = "/unauthorised",
) {
  if ((error as any).statusCode === 403) {
    redirect(redirectTo);
  }
  throw error;
}

// Client-side permission error handler
export function handleClientPermissionError(
  error: Error,
  action: string,
  redirectTo = "/unauthorised",
) {
  if ((error as any).statusCode === 403 || error.message === "Forbidden") {
    // Use global toast helpers (non-hook) in non-React context
    toast.error("Access denied", `You don't have permission to ${action}.`);

    // Redirect after a short delay to allow toast to show
    setTimeout(() => {
      window.location.href = redirectTo;
    }, 1500);

    return;
  }

  // Re-throw other errors
  throw error;
}

// Utility to check if an error is a permission error
export function isPermissionError(error: Error): boolean {
  return (
    (error as any).statusCode === 403 ||
    error.message === "Forbidden" ||
    error.message.includes("permission") ||
    error.message.includes("access denied")
  );
}
