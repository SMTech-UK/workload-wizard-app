"use client"

import { useState, useEffect } from "react"
import { useSignIn, useClerk } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import Link from "next/link"
import posthog from 'posthog-js'
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, WandSparkles, Eye, EyeOff, CheckCircle, ArrowLeft } from "lucide-react"
import { ThemeToggle } from "@/components/ui/theme-toggle"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { isLoaded, signIn, setActive } = useSignIn()
  const { signOut } = useClerk()
  const [emailOrUsername, setEmailOrUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  
  // Reset password state
  const [showResetForm, setShowResetForm] = useState(false)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [resetEmail, setResetEmail] = useState("")
  const [resetCode, setResetCode] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isResetLoading, setIsResetLoading] = useState(false)
  const [resetError, setResetError] = useState("")
  const [resetSuccess, setResetSuccess] = useState("")
  
  // Password validation state
  const [passwordValidation, setPasswordValidation] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
    match: false
  })
  
  // Track if user has explicitly returned to login (to prevent showing reset form on refresh)
  const [hasReturnedToLogin, setHasReturnedToLogin] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isLoaded) return
    
    setIsLoading(true)
    setError("")

    try {
      const result = await signIn.create({
        identifier: emailOrUsername,
        password,
      })

      if (result.status === "complete") {
        // Only capture if PostHog is available
        if (typeof posthog !== 'undefined' && posthog.capture) {
          posthog.capture('login_submitted', { success: true })
        }
        await setActive({ session: result.createdSessionId })
        router.push("/")
      } else {
        const errorMessage = "Sign in failed. Please check your credentials."
        // Only capture if PostHog is available
        if (typeof posthog !== 'undefined' && posthog.capture) {
          posthog.capture('login_submitted', { success: false, error: errorMessage })
        }
        setError(errorMessage)
      }
    } catch (err: unknown) {
      // Handle Clerk authentication errors
      const clerkError = err as { 
        errors?: Array<{ 
          code?: string
          message?: string
          longMessage?: string
        }>
        code?: string
        message?: string
      }
      
      let errorMessage = "Invalid email/username or password. Please try again."
      // Don't log to console, handle errors gracefully
      if (clerkError.errors && clerkError.errors.length > 0) {
        const error = clerkError.errors[0]
        
        // Handle specific error codes
        switch (error?.code) {
          case 'form_password_incorrect':
          case 'form_identifier_not_found':
            errorMessage = "Invalid email/username or password. Please try again."
            break
          case 'form_password_pwned':
            errorMessage = "This password has been found in a data breach. Please use a different password."
            break
          case 'too_many_requests':
            errorMessage = "Too many failed attempts. Please try again later."
            break
          default:
            errorMessage = error?.message || error?.longMessage || "Sign in failed. Please try again."
        }
      } else if (clerkError.message) {
        errorMessage = clerkError.message
      } 

            // Only capture if PostHog is available
      if (typeof posthog !== 'undefined' && posthog.capture) {
        posthog.capture('login_submitted', {
          success: false, 
          error: errorMessage, 
          error_code: clerkError.errors?.[0]?.code 
        })
      }
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isLoaded) return
    
    setIsResetLoading(true)
    setResetError("")
    setResetSuccess("")

    try {
      const strategy = "reset_password_email_code"
      
      await signIn.create({
        strategy,
        identifier: resetEmail,
      })
      
      // Only capture if PostHog is available
      if (typeof posthog !== 'undefined' && posthog.capture) {
        posthog.capture('password_reset_requested', { success: true, strategy })
      }
      
      setShowPasswordForm(true)
      setResetSuccess("Verification code sent! Please enter the code and your new password.")
      // Save email to localStorage for refresh recovery
      localStorage.setItem('passwordResetEmail', resetEmail)
    } catch (err: unknown) {
      // Handle Clerk password reset errors
      const clerkError = err as { 
        errors?: Array<{ 
          code?: string
          message?: string
          longMessage?: string
        }>
        code?: string
        message?: string
      }
      
      let errorMessage = "An error occurred. Please try again."
      if (clerkError.errors && clerkError.errors.length > 0) {
        const error = clerkError.errors[0]
        
        // Handle specific error codes
        switch (error?.code) {
          case 'form_identifier_not_found':
            errorMessage = "No account found with this email address."
            break
          case 'form_identifier_invalid':
            errorMessage = "Please enter a valid email address."
            break
          case 'too_many_requests':
            errorMessage = "Too many requests. Please try again later."
            break
          default:
            errorMessage = error?.message || error?.longMessage || "Failed to send reset email. Please try again."
        }
      } else if (clerkError.message) {
        // Filter out generic "is invalid" messages for better UX
        if (clerkError.message.includes("is invalid")) {
          errorMessage = "Please enter a valid email address."
        } else {
          errorMessage = clerkError.message
        }
      }

      // Only capture if PostHog is available
      if (typeof posthog !== 'undefined' && posthog.capture) {
        posthog.capture('password_reset_requested', { 
          success: false, 
          error: errorMessage, 
          error_code: clerkError.errors?.[0]?.code 
        })
      }
      setResetError(errorMessage)
    } finally {
      setIsResetLoading(false)
    }
  }

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isLoaded) return
    
    setIsResetLoading(true)
    setResetError("")

    try {
      // This function is no longer needed since we removed the separate code verification step
      // The code and password are now entered together in the password form
      setShowPasswordForm(true)
      setResetSuccess("Please enter your new password and the verification code.")
    } catch (err: unknown) {
      const clerkError = err as { 
        errors?: Array<{ 
          code?: string
          message?: string
          longMessage?: string
        }>
        code?: string
        message?: string
      }
      
      let errorMessage = "Something went wrong. Please try again."
      if (clerkError.errors && clerkError.errors.length > 0) {
        const error = clerkError.errors[0]
        errorMessage = error?.message || error?.longMessage || "Something went wrong. Please try again."
      } else if (clerkError.message) {
        errorMessage = clerkError.message
      }

      setResetError(errorMessage)
    } finally {
      setIsResetLoading(false)
    }
  }

    const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isLoaded) return
    
    // Clear previous errors
    setResetError("")
    
    // Validate password requirements
    if (newPassword.length < 8) {
      setResetError("Password must be at least 8 characters long.")
      return
    }
    
    // Check for strong password requirements
    const hasUpperCase = /[A-Z]/.test(newPassword)
    const hasLowerCase = /[a-z]/.test(newPassword)
    const hasNumbers = /\d/.test(newPassword)
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword)
    
    if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
      setResetError("Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.")
      return
    }
    
    // Check if passwords match
    if (newPassword !== confirmPassword) {
      setResetError("Passwords do not match. Please try again.")
      return
    }
    
    // Check if code is provided
    if (!resetCode) {
      setResetError("Please enter the verification code sent to your email.")
      return
    }
    
    setIsResetLoading(true)
    
    try {
      // Follow the official Clerk pattern: send code AND password together
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code: resetCode,
        password: newPassword,
      })

      if (result.status === "complete") {
        // Only capture if PostHog is available
        if (typeof posthog !== 'undefined' && posthog.capture) {
          posthog.capture('password_reset_completed', { success: true })
        }
        setResetSuccess("Password reset successfully! Redirecting to login...")
        
        // Sign out the user so they can sign in with their new password
        try {
          await signOut()
        } catch (signOutError) {
          console.log("Sign out after password reset:", signOutError)
        }
        
        // Reset all forms and go back to login with a smoother transition
        setTimeout(() => {
          setShowResetForm(false)
          setShowPasswordForm(false)
          setResetEmail("")
          setResetCode("")
          setNewPassword("")
          setConfirmPassword("")
          setResetError("")
          setResetSuccess("")
          setPasswordValidation({
            length: false,
            uppercase: false,
            lowercase: false,
            number: false,
            special: false,
            match: false
          })
          // Clear localStorage
          localStorage.removeItem('passwordResetEmail')
          // Mark that user has returned to login after successful reset
          setHasReturnedToLogin(true)
        }, 1500)
      } else {
        setResetError("Failed to reset password. Please try again.")
      }
    } catch (err: unknown) {
      console.error('Password reset error:', err)
      
      const clerkError = err as { 
        errors?: Array<{ 
          code?: string
          message?: string
          longMessage?: string
        }>
        code?: string
        message?: string
      }
      
      let errorMessage = "Failed to reset password. Please try again."
      if (clerkError.errors && clerkError.errors.length > 0) {
        const error = clerkError.errors[0]
        
        switch (error?.code) {
          case 'form_password_pwned':
            errorMessage = "This password has been found in a data breach. Please use a different password."
            break
          case 'form_password_too_short':
            errorMessage = "Password must be at least 8 characters long."
            break
          case 'form_password_too_weak':
            errorMessage = "Password is too weak. Please choose a stronger password."
            break
          case 'form_code_incorrect':
            errorMessage = "Invalid verification code. Please check the code and try again."
            break
          case 'form_code_expired':
            errorMessage = "Verification code has expired. Please request a new code."
            break
          case 'form_identifier_missing':
          case 'form_code_missing':
          case 'form_password_missing':
            errorMessage = "Password reset session has expired. Please start the password reset process again."
                      // Reset the form state
          setShowPasswordForm(false)
          setShowResetForm(true)
            break
          default:
            errorMessage = error?.message || error?.longMessage || "Failed to reset password. Please try again."
        }
      } else if (clerkError.message) {
        // Handle specific error messages
        if (clerkError.message.includes("verification code")) {
          errorMessage = "Verification code has expired. Please request a new code."
          // Reset to reset form to request new code
          setShowPasswordForm(false)
          setShowResetForm(true)
        } else if (clerkError.message.includes("is missing")) {
          errorMessage = "Password reset session has expired. Please start the password reset process again."
          // Reset the form state
          setShowPasswordForm(false)
          setShowResetForm(true)
        } else if (clerkError.message.includes("is invalid")) {
          errorMessage = "Password requirements not met. Please try again."
        } else {
          errorMessage = clerkError.message
        }
      }

      // Only capture if PostHog is available
      if (typeof posthog !== 'undefined' && posthog.capture) {
        posthog.capture('password_reset_completed', { 
          success: false, 
          error: errorMessage, 
          error_code: clerkError.errors?.[0]?.code 
        })
      }
      setResetError(errorMessage)
    } finally {
      setIsResetLoading(false)
    }
  }

  const goBackToResetForm = () => {
    setShowPasswordForm(false)
    setResetCode("")
    setNewPassword("")
    setConfirmPassword("")
    setResetError("")
    setResetSuccess("")
    setPasswordValidation({
      length: false,
      uppercase: false,
      lowercase: false,
      number: false,
      special: false,
      match: false
    })
    // Clear localStorage
    localStorage.removeItem('passwordResetEmail')
  }

  const goBackToLogin = () => {
    setShowResetForm(false)
    setShowPasswordForm(false)
    setResetEmail("")
    setResetCode("")
    setNewPassword("")
    setConfirmPassword("")
    setResetError("")
    setResetSuccess("")
    setError("")
    setPasswordValidation({
      length: false,
      uppercase: false,
      lowercase: false,
      number: false,
      special: false,
      match: false
    })
    // Clear localStorage
    localStorage.removeItem('passwordResetEmail')
    // Mark that user has explicitly returned to login
    setHasReturnedToLogin(true)
  }

  const getCurrentTitle = () => {
    if (showPasswordForm) return "Set New Password"
    if (showResetForm) return "Reset Password"
    return "Welcome back"
  }

  const getCurrentDescription = () => {
    if (showPasswordForm) return "Enter your new password and verification code"
    if (showResetForm) return "Enter your email to receive a verification code"
    return "Login to your WorkloadWizard account"
  }

  // Real-time password validation
  const validatePassword = (password: string, confirmPassword: string) => {
    setPasswordValidation({
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      match: password === confirmPassword && password.length > 0
    })
  }

  // Handle page refresh and restore password reset state
  useEffect(() => {
    if (isLoaded && signIn) {
      // Check if there's an active password reset session
      const checkPasswordResetState = async () => {
        try {
          // If user has explicitly returned to login, don't show any reset forms
          if (hasReturnedToLogin) {
            console.log("User has returned to login, staying on login form")
            return
          }

          // Check if there's a saved email indicating a password reset was started
          const savedEmail = localStorage.getItem('passwordResetEmail')
          
          // Try to get the current first factor
          const firstFactor = signIn.firstFactorVerification
          
          if (firstFactor && firstFactor.strategy === "reset_password_email_code") {
            // User has started password reset but hasn't completed it
            if (firstFactor.status === "verified") {
              // Code was verified, show password form
              setShowPasswordForm(true)
              setResetSuccess("Please enter your new password.")
              // Restore email from localStorage if available
              if (savedEmail) {
                setResetEmail(savedEmail)
              }
            } else {
              // Code was sent but not verified, show password form
              setShowPasswordForm(true)
              setResetSuccess("Please enter the verification code and your new password.")
              // Restore email from localStorage if available
              if (savedEmail) {
                setResetEmail(savedEmail)
              }
            }
          } else if (savedEmail && !hasReturnedToLogin) {
            // No active session but we have a saved email - user probably has a code sent
            // but session was lost. Show password form to let them enter the code and password
            setShowPasswordForm(true)
            setResetEmail(savedEmail)
            setResetSuccess("Please enter the verification code and your new password.")
          }
        } catch (error) {
          // If there's an error checking the state, just stay on login form
          console.log("No active password reset session")
        }
      }

      checkPasswordResetState()
    }
  }, [isLoaded, signIn])

  return (
    <div className={cn("flex flex-col gap-6 w-full max-w-md mx-auto", className)} {...props}>
      {/* Theme Toggle - Fixed Position */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      
      {/* Logo - Centered */}
      <div className="flex justify-center">
        <div
          className="flex aspect-square size-12 items-center justify-center rounded-lg text-white"
          style={{ backgroundColor: '#0F59FF' }}
        >
          <WandSparkles className="size-6" />
        </div>
      </div>

      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">
            {getCurrentTitle()}
          </CardTitle>
          <CardDescription>
            {getCurrentDescription()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="min-h-[280px] flex flex-col">
            {!showResetForm && !showPasswordForm ? (
              // Login Form
              <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
                <div className="flex-1 space-y-6">
                  {error && (
                    <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                      <AlertCircle className="h-4 w-4" />
                      {error}
                    </div>
                  )}

                  <div className="space-y-6">
                    <div className="grid gap-3">
                      <Label htmlFor="emailOrUsername">Email or Username</Label>
                      <Input
                        id="emailOrUsername"
                        type="text"
                        placeholder="Enter your email or username"
                        value={emailOrUsername}
                        onChange={(e) => setEmailOrUsername(e.target.value)}
                        required
                        disabled={isLoading}
                      />
                    </div>
                    
                    <div className="grid gap-3">
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <Input 
                          id="password" 
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          disabled={isLoading}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          disabled={isLoading}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4 mt-6">
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Signing in..." : "Sign In"}
                  </Button>
                  
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setShowResetForm(true)
                        setError("")
                        setHasReturnedToLogin(false) // Reset the flag when starting new reset
                      }}
                      className="text-sm text-muted-foreground hover:text-primary hover:underline"
                    >
                      Forgot your password?
                    </button>
                  </div>
                </div>
              </form>
            ) : showPasswordForm ? (
              // New Password Form
              <form onSubmit={handleSetNewPassword} className="flex-1 flex flex-col">
                <div className="flex-1 space-y-6">
                  {resetError && (
                    <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                      <AlertCircle className="h-4 w-4" />
                      {resetError}
                    </div>
                  )}

                  {resetSuccess && (
                    <div className="flex items-center gap-2 p-4 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800 rounded-md animate-in fade-in duration-300">
                      <CheckCircle className="h-4 w-4 flex-shrink-0" />
                      <span className="font-medium">{resetSuccess}</span>
                    </div>
                  )}

                  <div className="space-y-6">
                    <div className="grid gap-3">
                      <Label htmlFor="resetCode">Verification Code</Label>
                      <Input
                        id="resetCode"
                        type="text"
                        placeholder="Enter the code sent to your email"
                        value={resetCode}
                        onChange={(e) => setResetCode(e.target.value)}
                        required
                        disabled={isResetLoading}
                        maxLength={6}
                      />
                    </div>

                    <div className="grid gap-3">
                      <Label htmlFor="newPassword">New Password</Label>
                      <div className="relative">
                        <Input 
                          id="newPassword" 
                          type={showNewPassword ? "text" : "password"}
                          placeholder="Enter your new password"
                          value={newPassword}
                          onChange={(e) => {
                            setNewPassword(e.target.value)
                            validatePassword(e.target.value, confirmPassword)
                          }}
                          required
                          disabled={isResetLoading}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          disabled={isResetLoading}
                        >
                          {showNewPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid gap-3">
                      <Label htmlFor="confirmPassword">Confirm New Password</Label>
                      <div className="relative">
                        <Input 
                          id="confirmPassword" 
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Confirm your new password"
                          value={confirmPassword}
                          onChange={(e) => {
                            setConfirmPassword(e.target.value)
                            validatePassword(newPassword, e.target.value)
                          }}
                          required
                          disabled={isResetLoading}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          disabled={isResetLoading}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="text-sm font-medium text-gray-700">Password Requirements:</div>
                      <div className="space-y-2 text-sm">
                        <div className={`flex items-center gap-2 ${passwordValidation.length ? 'text-green-600' : 'text-gray-500'}`}>
                          <div className={`w-2 h-2 rounded-full ${passwordValidation.length ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                          At least 8 characters long
                        </div>
                        <div className={`flex items-center gap-2 ${passwordValidation.uppercase ? 'text-green-600' : 'text-gray-500'}`}>
                          <div className={`w-2 h-2 rounded-full ${passwordValidation.uppercase ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                          One uppercase letter (A-Z)
                        </div>
                        <div className={`flex items-center gap-2 ${passwordValidation.lowercase ? 'text-green-600' : 'text-gray-500'}`}>
                          <div className={`w-2 h-2 rounded-full ${passwordValidation.lowercase ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                          One lowercase letter (a-z)
                        </div>
                        <div className={`flex items-center gap-2 ${passwordValidation.number ? 'text-green-600' : 'text-gray-500'}`}>
                          <div className={`w-2 h-2 rounded-full ${passwordValidation.number ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                          One number (0-9)
                        </div>
                        <div className={`flex items-center gap-2 ${passwordValidation.special ? 'text-green-600' : 'text-gray-500'}`}>
                          <div className={`w-2 h-2 rounded-full ${passwordValidation.special ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                          One special character (!@#$%^&*)
                        </div>
                        <div className={`flex items-center gap-2 ${passwordValidation.match ? 'text-green-600' : 'text-gray-500'}`}>
                          <div className={`w-2 h-2 rounded-full ${passwordValidation.match ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                          Passwords match
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 mt-6">
                  <Button 
                    type="submit" 
                    className="w-full transition-all duration-200" 
                    disabled={
                      isResetLoading || 
                      !resetCode.trim() ||
                      !newPassword.trim() || 
                      !confirmPassword.trim() ||
                      !passwordValidation.length ||
                      !passwordValidation.uppercase ||
                      !passwordValidation.lowercase ||
                      !passwordValidation.number ||
                      !passwordValidation.special ||
                      !passwordValidation.match
                    }
                  >
                    {isResetLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Resetting Password...
                      </div>
                    ) : (
                      "Reset Password"
                    )}
                  </Button>
                  
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={goBackToLogin}
                      className="text-sm text-muted-foreground hover:text-primary hover:underline"
                    >
                      Back to Sign In
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              // Reset Password Form
              <form onSubmit={handleResetPassword} className="flex-1 flex flex-col">
                <div className="flex-1 space-y-6">
                  {resetError && (
                    <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                      <AlertCircle className="h-4 w-4" />
                      {resetError}
                    </div>
                  )}

                  {resetSuccess && (
                    <div className="flex items-center gap-2 p-4 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800 rounded-md animate-in fade-in duration-300">
                      <CheckCircle className="h-4 w-4 flex-shrink-0" />
                      <span className="font-medium">{resetSuccess}</span>
                    </div>
                  )}

                  <div className="space-y-6">
                    <div className="grid gap-3">
                      <Label htmlFor="resetEmail">Email Address</Label>
                      <Input
                        id="resetEmail"
                        type="email"
                        placeholder="Enter your email address"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        required
                        disabled={isResetLoading}
                      />
                    </div>

                    <div className="text-sm text-muted-foreground">
                      We&apos;ll send you a 6-digit verification code to reset your password.
                    </div>
                  </div>
                </div>

                <div className="space-y-4 mt-6">
                  <Button 
                    type="submit" 
                    className="w-full transition-all duration-200" 
                    disabled={isResetLoading || !resetEmail.trim()}
                  >
                    {isResetLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Sending...
                      </div>
                    ) : (
                      "Send Verification Code"
                    )}
                  </Button>
                  
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={goBackToLogin}
                      className="text-sm text-muted-foreground hover:text-primary hover:underline"
                    >
                      Back to Sign In
                    </button>
                  </div>
                </div>
              </form>
            )}


          </div>
        </CardContent>
      </Card>
      <div className="text-muted-foreground text-center text-xs text-balance">
        By signing in, you agree to our{" "}
        <a href="/terms" className="underline underline-offset-4 hover:text-primary">
          Terms of Service
        </a>{" "}
        and{" "}
        <a href="/privacy" className="underline underline-offset-4 hover:text-primary">
          Privacy Policy
        </a>.
      </div>
    </div>
  )
}
