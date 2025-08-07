# Toast System Usage Guide

This project uses a standardized toast notification system built with **Sonner** and styled with **shadcn/ui** design tokens.

## 🚀 Quick Start

### Import the toast hook:
```typescript
import { useToast } from '@/hooks/use-toast'
```

### Use in your component:
```typescript
export function MyComponent() {
  const { toast } = useToast()
  
  const handleSuccess = () => {
    toast({
      title: "Success!",
      description: "Operation completed successfully.",
      variant: "success",
    })
  }
  
  const handleError = () => {
    toast({
      title: "Error",
      description: "Something went wrong.",
      variant: "destructive",
    })
  }
  
  return (
    // Your component JSX
  )
}
```

## 📝 Available Methods

### 1. useToast Hook
```typescript
const { toast, dismiss } = useToast()

// Show a toast
toast({
  title: "Title",
  description: "Description",
  variant: "default" | "destructive" | "success"
})

// Dismiss a specific toast
dismiss(toastId)
```

### 2. Direct Toast Functions
```typescript
import { toast } from '@/hooks/use-toast'

// Success toast
toast.success("Success message", "Optional description")

// Error toast
toast.error("Error message", "Optional description")

// Info toast
toast.info("Info message", "Optional description")

// Warning toast
toast.warning("Warning message", "Optional description")

// Dismiss toast
toast.dismiss(toastId)
```

## 🎨 Toast Variants

### Default
```typescript
toast({
  title: "Notification",
  description: "This is a default notification"
})
```

### Success
```typescript
toast({
  title: "Success!",
  description: "Operation completed successfully",
  variant: "success"
})
```

### Error/Destructive
```typescript
toast({
  title: "Error",
  description: "Something went wrong",
  variant: "destructive"
})
```

## 🔄 Migration from alert()

### Before (using alert):
```typescript
try {
  await someOperation()
  alert('Success!')
} catch (error) {
  alert('Error: ' + error.message)
}
```

### After (using toast):
```typescript
try {
  await someOperation()
  toast.success('Success!')
} catch (error) {
  toast.error('Error', error instanceof Error ? error.message : undefined)
}
```

## 🎯 Best Practices

1. **Use descriptive titles**: Make titles clear and actionable
2. **Provide context**: Use descriptions for additional details
3. **Choose appropriate variants**: Use `success` for confirmations, `destructive` for errors
4. **Keep messages concise**: Toast notifications should be brief
5. **Handle errors gracefully**: Always provide fallback error messages

## 🎨 Styling

The toast system automatically uses your app's design tokens:
- **Background**: Uses `--background` CSS variable
- **Text**: Uses `--foreground` CSS variable
- **Borders**: Uses `--border` CSS variable
- **Success**: Uses `--chart-2` CSS variable
- **Error**: Uses `--destructive` CSS variable

## 📍 Global Setup

The toast system is already configured in your root layout (`src/app/layout.tsx`):

```typescript
import { Toaster } from "@/components/ui/toast"

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
```

## 🔧 Customization

To customize toast behavior, modify the `Toaster` component in `src/components/ui/toast.tsx`:

```typescript
<Sonner
  position="top-right" // Change position
  duration={4000} // Change duration
  richColors // Enable rich colors
  closeButton // Show close button
  // ... other options
/>
```

## 📚 Examples

### Form Submission
```typescript
const handleSubmit = async (data: FormData) => {
  try {
    await submitForm(data)
    toast.success('Form submitted successfully!')
  } catch (error) {
    toast.error('Submission failed', error.message)
  }
}
```

### API Operations
```typescript
const handleDelete = async (id: string) => {
  try {
    await deleteItem(id)
    toast.success('Item deleted successfully')
    // Refresh data or update UI
  } catch (error) {
    toast.error('Failed to delete item', error.message)
  }
}
```

### User Actions
```typescript
const handleCopy = async () => {
  try {
    await navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard!')
  } catch (error) {
    toast.error('Failed to copy', 'Please try again')
  }
}
```

## 🚫 What to Avoid

- ❌ Don't use `alert()` - replace with toast
- ❌ Don't show too many toasts at once
- ❌ Don't use toasts for critical errors that need user action
- ❌ Don't make toast messages too long
- ❌ Don't use toasts for form validation (use inline validation instead)

## ✅ What to Use Toasts For

- ✅ Success confirmations
- ✅ Error notifications
- ✅ Info messages
- ✅ Warning alerts
- ✅ Operation status updates
- ✅ Copy/paste confirmations
- ✅ Save confirmations 