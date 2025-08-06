"use client"

import { useState } from "react"
import { useSignIn } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import Link from "next/link"
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
import { AlertCircle, WandSparkles, Eye, EyeOff, CheckCircle } from "lucide-react"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { isLoaded, signIn, setActive } = useSignIn()
  const [emailOrUsername, setEmailOrUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  
  // Reset password state
  const [showResetForm, setShowResetForm] = useState(false)
  const [resetEmail, setResetEmail] = useState("")
  const [isResetLoading, setIsResetLoading] = useState(false)
  const [resetError, setResetError] = useState("")
  const [resetSuccess, setResetSuccess] = useState("")

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
        await setActive({ session: result.createdSessionId })
        router.push("/")
      } else {
        setError("Sign in failed. Please check your credentials.")
      }
    } catch (err: unknown) {
      const error = err as { errors?: { message?: string }[] }
      console.error("Sign in error:", err)
      if (error.errors?.[0]?.message) {
        setError(error.errors[0].message)
      } else {
        setError("Invalid email/username or password. Please try again.")
      }
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
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: resetEmail,
      })
      
      setResetSuccess("Password reset email sent! Please check your inbox and follow the instructions.")
    } catch (err: unknown) {
      const error = err as { errors?: { message?: string }[] }
      setResetError(error.errors?.[0]?.message || "An error occurred. Please try again.")
    } finally {
      setIsResetLoading(false)
    }
  }
  return (
    <div className={cn("flex flex-col gap-6 w-full max-w-md mx-auto", className)} {...props}>
      {/* Logo */}
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
            {showResetForm ? "Reset Password" : "Welcome back"}
          </CardTitle>
          <CardDescription>
            {showResetForm 
              ? "Enter your email to receive reset instructions" 
              : "Login to your WorkloadWizard account"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="min-h-[280px] flex flex-col">
            {!showResetForm ? (
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
                      }}
                      className="text-sm text-muted-foreground hover:text-primary hover:underline"
                    >
                      Forgot your password?
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
                    <div className="flex items-center gap-2 p-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded-md">
                      <CheckCircle className="h-4 w-4" />
                      {resetSuccess}
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
                      We'll send you an email with instructions to reset your password.
                    </div>
                  </div>
                </div>

                <div className="space-y-4 mt-6">
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isResetLoading || !resetEmail.trim()}
                  >
                    {isResetLoading ? "Sending..." : "Send Reset Email"}
                  </Button>
                  
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setShowResetForm(false)
                        setResetError("")
                        setResetSuccess("")
                        setResetEmail("")
                      }}
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
        By clicking continue, you agree to our{" "}
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
