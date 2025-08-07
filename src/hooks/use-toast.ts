import { toast as sonnerToast } from "sonner"

export function useToast() {
  return {
    toast: ({ title, description, variant = "default", ...props }: {
      title?: string
      description?: string
      variant?: "default" | "destructive" | "success"
    }) => {
      switch (variant) {
        case "destructive":
          return sonnerToast.error(title || "Error", {
            description,
            ...props,
          })
        case "success":
          return sonnerToast.success(title || "Success", {
            description,
            ...props,
          })
        default:
          return sonnerToast(title || "Notification", {
            description,
            ...props,
          })
      }
    },
    dismiss: (toastId?: string | number) => {
      sonnerToast.dismiss(toastId)
    },
  }
}

// Export direct toast functions for convenience
export const toast = {
  success: (title: string, description?: string) => 
    sonnerToast.success(title, { description }),
  error: (title: string, description?: string) => 
    sonnerToast.error(title, { description }),
  info: (title: string, description?: string) => 
    sonnerToast.info(title, { description }),
  warning: (title: string, description?: string) => 
    sonnerToast.warning(title, { description }),
  dismiss: (toastId?: string | number) => sonnerToast.dismiss(toastId),
} 