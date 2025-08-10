"use client";

import posthog from "posthog-js";
import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { StandardizedSidebarLayout } from "@/components/layout/StandardizedSidebarLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Settings,
  User,
  Shield,
  Mail,
  Calendar,
  Camera,
  Save,
  X,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ProfilePage() {
  const { user, isLoaded } = useUser();
  const { toast } = useToast();
  const updateUserAvatar = useMutation(api.users.updateUserAvatar);
  const convexAvatarUrl = useQuery(
    api.users.getUserAvatar,
    user ? { subject: user.id } : "skip",
  );

  // Form state
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [avatarRefreshKey, setAvatarRefreshKey] = useState<number>(0);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Please sign in to view your account.</p>
      </div>
    );
  }

  const userName = user.fullName || user.firstName || "User";
  const userEmail = user.emailAddresses[0]?.emailAddress || "";
  const userRole = user.publicMetadata?.role as string;
  const clerkAvatarUrl = user.imageUrl;
  const convexAvatarUrlValue = convexAvatarUrl || null;

  // Use Clerk avatar as priority since it's more up-to-date, fall back to Convex
  // Add cache-busting parameter to force refresh (only when refresh key changes)
  const avatarUrl = clerkAvatarUrl
    ? `${clerkAvatarUrl}?r=${avatarRefreshKey}`
    : convexAvatarUrlValue
      ? `${convexAvatarUrlValue}?r=${avatarRefreshKey}`
      : "";

  const createdAt = user.createdAt;

  // Initialize form data when user loads
  if (!isEditing && formData.firstName === "") {
    setFormData({
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      username: user.username || "",
      email: userEmail,
    });
  }

  // Generate initials from name
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "Unknown";
    return new Intl.DateTimeFormat("en-GB", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
      ];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid File Type",
          description: "Please select a JPG, PNG, GIF, or WebP image.",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (5MB limit)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        toast({
          title: "File Too Large",
          description: "Please select an image smaller than 5MB.",
          variant: "destructive",
        });
        return;
      }

      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.onerror = () => {
        toast({
          title: "File Read Error",
          description: "Failed to read the selected file. Please try again.",
          variant: "destructive",
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Ensure user is authenticated
      if (!user || !user.id) {
        toast({
          title: "Authentication Error",
          description: "Please sign in again to update your profile.",
          variant: "destructive",
        });
        return;
      }

      // Update user data
      if (user) {
        await user.update({
          firstName: formData.firstName,
          lastName: formData.lastName,
          username: formData.username,
        });

        // Update email if changed
        if (formData.email !== userEmail) {
          try {
            const response = await fetch("/api/update-user-email", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userId: user.id,
                newEmail: formData.email.trim(),
              }),
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || "Failed to update email");
            }

            toast({
              title: "Email Updated",
              description: "Your email address has been updated successfully.",
              variant: "success",
            });

            // Reload user data to get updated email
            await user.reload();
          } catch (emailError) {
            console.error("Email update error:", emailError);
            toast({
              title: "Email Update Failed",
              description:
                emailError instanceof Error
                  ? emailError.message
                  : "Failed to update email. Please try again.",
              variant: "destructive",
            });
            return;
          }
        }

        // Update avatar if selected
        if (avatarFile && avatarFile.size > 0) {
          try {
            // Validate file type
            const allowedTypes = [
              "image/jpeg",
              "image/png",
              "image/gif",
              "image/webp",
            ];
            if (!allowedTypes.includes(avatarFile.type)) {
              toast({
                title: "Invalid File Type",
                description: "Please select a JPG, PNG, GIF, or WebP image.",
                variant: "destructive",
              });
              return;
            }

            // Validate file size (5MB limit)
            const maxSize = 5 * 1024 * 1024; // 5MB
            if (avatarFile.size > maxSize) {
              toast({
                title: "File Too Large",
                description: "Please select an image smaller than 5MB.",
                variant: "destructive",
              });
              return;
            }

            // Upload to Clerk first
            console.log("Uploading file to Clerk:", {
              fileName: avatarFile.name,
              fileSize: avatarFile.size,
              fileType: avatarFile.type,
              userId: user.id,
            });

            try {
              await user.setProfileImage({ file: avatarFile });
              console.log("Clerk upload successful");
            } catch (clerkError) {
              console.error("Clerk upload error:", clerkError);
              throw new Error(
                `Clerk upload failed: ${clerkError instanceof Error ? clerkError.message : "Unknown error"}`,
              );
            }

            // Wait a moment for Clerk to process the image and update the URL
            await new Promise((resolve) => setTimeout(resolve, 1000));

            // Get the updated image URL from Clerk
            const updatedImageUrl = user.imageUrl;

            // Sync the new avatar URL to Convex
            if (updatedImageUrl && updatedImageUrl !== avatarUrl) {
              await updateUserAvatar({
                subject: user.id,
                pictureUrl: updatedImageUrl,
              });

              toast({
                title: "Avatar Updated",
                description:
                  "Your profile picture has been updated successfully.",
                variant: "success",
              });

              // Force a refresh of the user data to get the updated avatar
              await user.reload();

              // Increment refresh key to force avatar re-render
              setAvatarRefreshKey((prev) => prev + 1);
            } else {
              toast({
                title: "Avatar Update",
                description:
                  "Avatar uploaded to Clerk. It may take a moment to appear.",
                variant: "success",
              });
            }
          } catch (avatarError) {
            console.error("Avatar update error:", avatarError);

            // Provide more specific error messages
            let errorMessage = "Failed to update avatar. Please try again.";
            if (avatarError instanceof Error) {
              if (avatarError.message.includes("network")) {
                errorMessage =
                  "Network error. Please check your connection and try again.";
              } else if (avatarError.message.includes("unauthorized")) {
                errorMessage = "Authentication error. Please sign in again.";
              } else if (avatarError.message.includes("file")) {
                errorMessage =
                  "Invalid file. Please select a valid image file.";
              }
            }

            toast({
              title: "Avatar Update Failed",
              description: errorMessage,
              variant: "destructive",
            });
          }
        }

        // Only capture if PostHog is available
        if (typeof posthog !== "undefined" && posthog.capture) {
          posthog.capture("profile-updated", {
            user_id: user.id,
            avatar_updated: !!(avatarFile && avatarFile.size > 0),
          });
        }

        toast({
          title: "Profile Updated",
          description: "Your profile has been successfully updated.",
          variant: "success",
        });

        setIsEditing(false);
        setFormData({
          firstName: user.firstName || "",
          lastName: user.lastName || "",
          username: user.username || "",
          email: userEmail,
        });
        setAvatarFile(null);
        setAvatarPreview("");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    // Only capture if PostHog is available
    if (typeof posthog !== "undefined" && posthog.capture) {
      posthog.capture("profile-edit-cancelled", { user_id: user.id });
    }
    setIsEditing(false);
    setFormData({
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      username: user.username || "",
      email: userEmail,
    });
    setAvatarFile(null);
    setAvatarPreview("");
  };

  const handleRefreshAvatar = async () => {
    try {
      await user.reload();
      setAvatarRefreshKey((prev) => prev + 1);
      toast({
        title: "Avatar Refreshed",
        description: "Profile picture has been refreshed.",
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh avatar. Please try again.",
        variant: "destructive",
      });
    }
  };

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Account", href: "/account" },
    { label: "Profile" },
  ];

  return (
    <StandardizedSidebarLayout
      breadcrumbs={breadcrumbs}
      title="Profile Management"
      subtitle="Manage your profile information and password"
    >
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Overview Card */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Overview
            </CardTitle>
            <CardDescription>Your current profile information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={avatarPreview || avatarUrl} alt={userName} />
                <AvatarFallback className="text-lg">
                  {getInitials(userName)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold">{userName}</h3>
                <p className="text-sm text-muted-foreground">{userEmail}</p>
                {userRole && (
                  <Badge variant="secondary" className="mt-1">
                    {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
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

              {userRole && (
                <div className="flex items-center gap-2 text-sm">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Role:</span>
                  <span className="font-medium">
                    {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Member since:</span>
                <span className="font-medium">{formatDate(createdAt)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Management Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Profile Management
            </CardTitle>
            <CardDescription>
              Update your profile information, password, and settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Avatar Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage
                      src={avatarPreview || avatarUrl}
                      alt={userName}
                    />
                    <AvatarFallback className="text-xl">
                      {getInitials(userName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-2">
                    <Label htmlFor="avatar" className="text-sm font-medium">
                      Profile Picture
                    </Label>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          document.getElementById("avatar")?.click()
                        }
                        disabled={!isEditing}
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        Change Photo
                      </Button>
                      {avatarFile && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setAvatarFile(null);
                            setAvatarPreview("");
                          }}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Remove
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefreshAvatar}
                        disabled={isLoading}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                      </Button>
                    </div>
                    <input
                      id="avatar"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                      disabled={!isEditing}
                    />
                    <p className="text-xs text-muted-foreground">
                      JPG, PNG or GIF. Max size 5MB.
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) =>
                        handleInputChange("firstName", e.target.value)
                      }
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) =>
                        handleInputChange("lastName", e.target.value)
                      }
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e) =>
                        handleInputChange("username", e.target.value)
                      }
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        handleInputChange("email", e.target.value)
                      }
                      disabled={!isEditing}
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-4">
                {isEditing ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={handleCancel}
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => {
                      // Only capture if PostHog is available
                      if (typeof posthog !== "undefined" && posthog.capture) {
                        posthog.capture("profile-edit-started", {
                          user_id: user.id,
                        });
                      }
                      setIsEditing(true);
                    }}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </StandardizedSidebarLayout>
  );
}
