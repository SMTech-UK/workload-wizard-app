"use client"

import posthog from 'posthog-js'
import { useState } from "react"
import { useUser } from "@clerk/nextjs"
import { StandardizedSidebarLayout } from "@/components/layout/StandardizedSidebarLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Shield, Key, Save, Eye, EyeOff } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function SecurityPage() {
  const { user, isLoaded } = useUser()
  const { toast } = useToast()
  
  // Password form state
  const [isEditingPassword, setIsEditingPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  })

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Please sign in to view your security settings.</p>
      </div>
    )
  }

  const getPasswordStrength = (password: string) => {
    if (!password) return { strength: 0, label: '', color: '' }
    
    let score = 0
    if (password.length >= 8) score++
    if (/[a-z]/.test(password)) score++
    if (/[A-Z]/.test(password)) score++
    if (/[0-9]/.test(password)) score++
    if (/[^A-Za-z0-9]/.test(password)) score++
    
    const strengthMap = [
      { strength: 0, label: 'Very Weak', color: 'text-red-500' },
      { strength: 1, label: 'Weak', color: 'text-orange-500' },
      { strength: 2, label: 'Fair', color: 'text-yellow-500' },
      { strength: 3, label: 'Good', color: 'text-blue-500' },
      { strength: 4, label: 'Strong', color: 'text-green-500' },
      { strength: 5, label: 'Very Strong', color: 'text-green-600' }
    ]
    
    return strengthMap[Math.min(score, 5)]
  }

  const handlePasswordChange = (field: string, value: string) => {
    setPasswordData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handlePasswordSave = async () => {
    setIsLoading(true)
    try {
      // Ensure user is properly loaded
      if (!user || !user.id) {
        toast({
          title: "Authentication Error",
          description: "Please sign in again to update your password.",
          variant: "destructive",
        })
        return
      }

      console.log('User ID:', user.id)
      console.log('User loaded:', !!user)
      console.log('User updatePassword method available:', typeof user.updatePassword === 'function')
      console.log('User reload method available:', typeof user.reload === 'function')

      // Validate password match
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        toast({
          title: "Password Mismatch",
          description: "New password and confirm password do not match.",
          variant: "destructive",
        })
        return
      }

      // Validate password strength (optional - you can customize these rules)
      if (passwordData.newPassword.length < 8) {
        toast({
          title: "Password Too Short",
          description: "Password must be at least 8 characters long.",
          variant: "destructive",
        })
        return
      }

      // Validate current password is provided
      if (!passwordData.currentPassword) {
        toast({
          title: "Current Password Required",
          description: "Please enter your current password to change it.",
          variant: "destructive",
        })
        return
      }

      console.log('Attempting to update password...')
      
      await user.updatePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      })

      console.log('Password update completed successfully')
      
      // Reload user data to ensure we have the latest information
      await user.reload()
      
      console.log('User reloaded after password update')

      toast({
        title: "Password Updated",
        description: "Your password has been successfully updated. You may need to sign in again with your new password.",
        variant: "success",
      })

      // Only capture if PostHog is available
      if (typeof posthog !== 'undefined' && posthog.capture) {
        posthog.capture('password-updated', {
          user_id: user.id,
        })
      }

      // Clear password fields after successful update
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      })
      setIsEditingPassword(false)
      
      // Reset password visibility states
      setShowCurrentPassword(false)
      setShowNewPassword(false)
      setShowConfirmPassword(false)
    } catch (passwordError) {
      console.error('Password update error:', passwordError)
      
      // Provide more specific error messages
      let errorMessage = "Failed to update password. Please check your current password."
      if (passwordError instanceof Error) {
        console.error('Error message:', passwordError.message)
        console.error('Error stack:', passwordError.stack)
        
        if (passwordError.message.includes('current password')) {
          errorMessage = "Current password is incorrect. Please try again."
        } else if (passwordError.message.includes('weak')) {
          errorMessage = "Password is too weak. Please choose a stronger password."
        } else if (passwordError.message.includes('recent')) {
          errorMessage = "Cannot reuse a recent password. Please choose a different password."
        } else if (passwordError.message.includes('breach') || passwordError.message.includes('compromised')) {
          errorMessage = "This password has been found in online breaches. Please choose a different, more secure password."
        } else if (passwordError.message.includes('_baseFetch')) {
          errorMessage = "Network error occurred. Please check your connection and try again."
        }
      }
      
      toast({
        title: "Password Update Failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordCancel = () => {
    setIsEditingPassword(false)
    setPasswordData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: ""
    })
    setShowCurrentPassword(false)
    setShowNewPassword(false)
    setShowConfirmPassword(false)
  }

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Account", href: "/account" },
    { label: "Security & Privacy" }
  ]

  return (
    <StandardizedSidebarLayout
      breadcrumbs={breadcrumbs}
      title="Security & Privacy"
      subtitle="Manage your password, authentication, and privacy settings"
    >
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Security Overview Card */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Overview
            </CardTitle>
            <CardDescription>
              Your current security status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Key className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Password:</span>
                <span className="font-medium">Last updated recently</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Two-factor:</span>
                <span className="font-medium text-orange-500">Not enabled</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Settings Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Password Management
            </CardTitle>
            <CardDescription>
              Update your password and manage authentication settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Password Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium">Change Password</h3>
                    <p className="text-sm text-muted-foreground">
                      Update your password to keep your account secure
                    </p>
                  </div>
                  {!isEditingPassword && (
                    <Button 
                      onClick={() => {
                        setIsEditingPassword(true)
                        // Only capture if PostHog is available
                        if (typeof posthog !== 'undefined' && posthog.capture) {
                          posthog.capture('password-edit-started', { user_id: user.id })
                        }
                      }}
                    >
                      <Key className="h-4 w-4 mr-2" />
                      Change Password
                    </Button>
                  )}
                </div>

                {isEditingPassword && (
                  <div className="space-y-4 p-4 border rounded-lg">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Current Password</Label>
                      <div className="relative">
                        <Input
                          id="currentPassword"
                          type={showCurrentPassword ? "text" : "password"}
                          value={passwordData.currentPassword}
                          onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                          placeholder="Enter current password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        >
                          {showCurrentPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="newPassword">New Password</Label>
                        <div className="relative">
                          <Input
                            id="newPassword"
                            type={showNewPassword ? "text" : "password"}
                            value={passwordData.newPassword}
                            onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                            placeholder="Enter new password"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                          >
                            {showNewPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm New Password</Label>
                        <div className="relative">
                          <Input
                            id="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            value={passwordData.confirmPassword}
                            onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                            placeholder="Confirm new password"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Password validation feedback */}
                    {passwordData.newPassword && (
                      <div className="space-y-2">
                        {/* Password strength indicator */}
                        <div className="space-y-1">
                          <p className={`text-sm ${getPasswordStrength(passwordData.newPassword).color}`}>
                            Password strength: {getPasswordStrength(passwordData.newPassword).label}
                          </p>
                          <div className="flex space-x-1">
                            {[1, 2, 3, 4, 5].map((level) => (
                              <div
                                key={level}
                                className={`h-1 flex-1 rounded ${
                                  level <= getPasswordStrength(passwordData.newPassword).strength
                                    ? getPasswordStrength(passwordData.newPassword).color.replace('text-', 'bg-')
                                    : 'bg-gray-200'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        
                        {/* Validation messages */}
                        {passwordData.newPassword.length < 8 && (
                          <p className="text-sm text-destructive">
                            Password must be at least 8 characters long
                          </p>
                        )}
                        {passwordData.newPassword && passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword && (
                          <p className="text-sm text-destructive">
                            Passwords do not match
                          </p>
                        )}
                        {passwordData.newPassword && passwordData.confirmPassword && passwordData.newPassword === passwordData.confirmPassword && passwordData.newPassword.length >= 8 && (
                          <p className="text-sm text-green-600">
                            ✓ Password is valid
                          </p>
                        )}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-2 pt-4">
                      <Button
                        variant="outline"
                        onClick={handlePasswordCancel}
                        disabled={isLoading}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handlePasswordSave}
                        disabled={
                          isLoading || 
                          (passwordData.newPassword && (
                            passwordData.newPassword !== passwordData.confirmPassword ||
                            passwordData.newPassword.length < 8 ||
                            !passwordData.currentPassword
                          ))
                        }
                      >
                        {isLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                            Updating...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Update Password
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Two-Factor Authentication Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium">Two-Factor Authentication</h3>
                    <p className="text-sm text-muted-foreground">
                      Add an extra layer of security to your account
                    </p>
                  </div>
                  <Button variant="outline" disabled>
                    <Shield className="h-4 w-4 mr-2" />
                    Coming Soon
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Privacy Settings Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium">Privacy Settings</h3>
                    <p className="text-sm text-muted-foreground">
                      Manage your privacy preferences and data settings
                    </p>
                  </div>
                  <Button variant="outline" disabled>
                    <Shield className="h-4 w-4 mr-2" />
                    Coming Soon
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </StandardizedSidebarLayout>
  )
} 