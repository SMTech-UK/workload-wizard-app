"use client"

import { useUser } from "@clerk/nextjs"
import { StandardizedSidebarLayout } from "@/components/layout/StandardizedSidebarLayout"
import { getUserRoles } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { 
  User, 
  Shield, 
  Bell, 
  Key, 
  Settings, 
  Mail, 
  Calendar,
  ArrowRight,
  Users,
  Building
} from "lucide-react"
import Link from "next/link"

export default function AccountPage() {
  const { user, isLoaded } = useUser()

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
        <p>Please sign in to view your account.</p>
      </div>
    )
  }

  const userName = user.fullName || user.firstName || "User"
  const userEmail = user.emailAddresses[0]?.emailAddress || ""
  const userRoles = getUserRoles(user)
  const avatarUrl = user.imageUrl
  const createdAt = user.createdAt

  // Generate initials from name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const formatDate = (date: Date | null) => {
    if (!date) return "Unknown"
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date)
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'orgadmin': return 'Organisation Admin';
      case 'sysadmin': return 'System Admin';
      case 'developer': return 'Developer';
      case 'user': return 'User';
      case 'trial': return 'Trial';
      default: return role.charAt(0).toUpperCase() + role.slice(1);
    }
  }

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'orgadmin': return 'bg-red-100 text-red-800';
      case 'sysadmin': return 'bg-purple-100 text-purple-800';
      case 'developer': return 'bg-blue-100 text-blue-800';
      case 'user': return 'bg-green-100 text-green-800';
      case 'trial': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  const accountSections = [
    {
      title: "Profile Management",
      description: "Update your personal information, profile picture, and contact details",
      icon: User,
      href: "/account/profile",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200"
    },
    {
      title: "Security & Privacy",
      description: "Manage your password, two-factor authentication, and privacy settings",
      icon: Shield,
      href: "/account/security",
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200"
    },
    {
      title: "Notifications",
      description: "Configure email notifications and alert preferences",
      icon: Bell,
      href: "/account/notifications",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200",
      comingSoon: true
    },
    {
      title: "API Keys",
      description: "Manage your API keys and access tokens",
      icon: Key,
      href: "/account/api-keys",
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200",
      comingSoon: true
    }
  ]

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Account" }
  ]

  return (
    <StandardizedSidebarLayout
      breadcrumbs={breadcrumbs}
      title="Account Settings"
      subtitle="Manage your account preferences and settings"
    >
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Account Overview Card */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Account Overview
            </CardTitle>
            <CardDescription>
              Your current account information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={avatarUrl} alt={userName} />
                <AvatarFallback className="text-lg">{getInitials(userName)}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold">{userName}</h3>
                <p className="text-sm text-muted-foreground">{userEmail}</p>
                {userRoles && userRoles.length > 0 ? (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {userRoles.map((role, index) => (
                      <Badge 
                        key={index} 
                        variant="secondary" 
                        className={getRoleBadgeClass(role)}
                      >
                        {getRoleLabel(role)}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <Badge variant="secondary" className="mt-1 bg-gray-100 text-gray-800">
                    No roles assigned
                  </Badge>
                )}
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Email:</span>
                <span className="font-medium">{userEmail}</span>
              </div>
              
              <div className="flex items-start gap-2 text-sm">
                <Shield className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <span className="text-muted-foreground">Role Summary:</span>
                  <div className="mt-1 space-y-1">
                    {userRoles && userRoles.length > 0 ? (
                      <>
                        {userRoles.includes('sysadmin') && (
                          <div className="text-xs text-purple-600">• Full system administration access</div>
                        )}
                        {userRoles.includes('developer') && (
                          <div className="text-xs text-blue-600">• Developer tools and debugging access</div>
                        )}
                        {userRoles.includes('orgadmin') && (
                          <div className="text-xs text-red-600">• Organisation management capabilities</div>
                        )}
                        {userRoles.includes('user') && (
                          <div className="text-xs text-green-600">• Standard user access</div>
                        )}
                      </>
                    ) : (
                      <div className="text-xs text-gray-500">• No roles assigned</div>
                    )}
                  </div>
                </div>
              </div>
              

              

              
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Member since:</span>
                <span className="font-medium">{formatDate(createdAt)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Settings Navigation */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Account Settings
            </CardTitle>
            <CardDescription>
              Manage your account preferences and security settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {accountSections.map((section) => {
                const IconComponent = section.icon
                return (
                  <Card 
                    key={section.title}
                    className={`border-2 hover:border-gray-300 transition-colors ${section.borderColor}`}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${section.bgColor}`}>
                            <IconComponent className={`h-5 w-5 ${section.color}`} />
                          </div>
                          <div>
                            <h3 className="font-semibold">{section.title}</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              {section.description}
                            </p>
                          </div>
                        </div>
                        {section.comingSoon ? (
                          <Badge variant="outline" className="text-xs">
                            Coming Soon
                          </Badge>
                        ) : (
                          <Link href={section.href}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          </Link>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            <Separator className="my-6" />

            {/* Quick Actions */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Quick Actions</h3>
              <div className="grid gap-3 md:grid-cols-2">
                <Link href="/account/profile">
                  <Button variant="outline" className="w-full justify-start">
                    <User className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                </Link>
                <Link href="/account/security">
                  <Button variant="outline" className="w-full justify-start">
                    <Shield className="h-4 w-4 mr-2" />
                    Security Settings
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </StandardizedSidebarLayout>
  )
} 