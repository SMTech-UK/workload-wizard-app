"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  WandSparkles,
  Check,
  User,
  Building,
  Settings,
  BookOpen,
  LogOut,
  Shield,
  Eye,
  EyeOff,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";
import { useUser, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

const onboardingSteps = [
  {
    id: "personal",
    title: "Personal Info",
    description: "Basic information about you",
    icon: User,
  },
  {
    id: "organisation",
    title: "Organisation",
    description: "Your institution details",
    icon: Building,
  },
  {
    id: "security",
    title: "Security",
    description: "Secure your account",
    icon: Shield,
  },
  {
    id: "preferences",
    title: "Preferences",
    description: "Customise your experience",
    icon: Settings,
  },
  {
    id: "complete",
    title: "Get Started",
    description: "You're all set!",
    icon: BookOpen,
  },
];

export default function OnboardingPage() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [progressRestored, setProgressRestored] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string>("");

  // Query current user from Convex using their Clerk ID (subject)
  const currentUserData = useQuery(
    api.users.getBySubject,
    user?.id ? { subject: user.id } : "skip",
  );

  // Get org ID from Convex user data or fallback to Clerk
  const orgId =
    currentUserData?.organisationId ||
    user?.organizationMemberships?.[0]?.organization?.id ||
    user?.publicMetadata?.orgId ||
    (user as { orgId?: string })?.orgId ||
    null;

  // Query organization name from Convex using the org ID
  const organization = useQuery(
    api.organisations.getById,
    orgId && typeof orgId === "string"
      ? { id: orgId as string & { __tableName: "organisations" } }
      : "skip",
  );

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    role: "",
    customRole: "",
    email: "",
    phone: "",
    department: "",
    organization: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    notifications: true,
    newsletter: false,
  });
  const [missingFields, setMissingFields] = useState<string[]>([]);

  // Password strength calculation function
  const getPasswordStrength = (password: string) => {
    if (!password) return { strength: 0, label: "", color: "" };

    let score = 0;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    const strengthMap = [
      { strength: 0, label: "Very Weak", color: "text-red-500" },
      { strength: 1, label: "Weak", color: "text-orange-500" },
      { strength: 2, label: "Fair", color: "text-yellow-500" },
      { strength: 3, label: "Good", color: "text-blue-500" },
      { strength: 4, label: "Strong", color: "text-green-500" },
      { strength: 5, label: "Very Strong", color: "text-green-600" },
    ];

    return strengthMap[Math.min(score, 5)];
  };

  // Pre-populate form data from user information
  useEffect(() => {
    if (user) {
      const userFirstName = user.firstName || "";
      const userLastName = user.lastName || "";
      const userEmail = user.emailAddresses?.[0]?.emailAddress || "";

      // Get organisation name from Convex query result
      const userOrganization = organization?.name || "";

      // Pre-populate available data
      setFormData({
        firstName: userFirstName,
        lastName: userLastName,
        role: "",
        customRole: "",
        email: userEmail,
        phone: "",
        department: "",
        organization: userOrganization,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
        notifications: true,
        newsletter: false,
      });

      // Identify missing required fields for Step 1 only
      const missing = [];
      if (!userFirstName) missing.push("firstName");
      if (!userLastName) missing.push("lastName");
      if (!userEmail) missing.push("email");
      // Role is always missing initially for Step 1 (department and organization are on later steps)
      missing.push("role");

      setMissingFields(missing);
    }
  }, [user, organization, currentUserData, orgId]);

  // Save progress to localStorage
  const saveProgress = useCallback(() => {
    if (!user?.id) return;

    const progressKey = `onboarding-progress-${user.id}`;
    const progressData = {
      currentStep,
      formData,
      timestamp: Date.now(),
    };

    try {
      localStorage.setItem(progressKey, JSON.stringify(progressData));
    } catch (error) {
      console.error("Failed to save onboarding progress:", error);
    }
  }, [user?.id, currentStep, formData]);

  // Load progress from localStorage
  const loadProgress = useCallback(() => {
    if (!user?.id) return null;

    const progressKey = `onboarding-progress-${user.id}`;

    try {
      const savedProgress = localStorage.getItem(progressKey);
      if (!savedProgress) return null;

      const progressData = JSON.parse(savedProgress);

      // Check if progress is recent (within 30 days)
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      if (Date.now() - progressData.timestamp > thirtyDaysMs) {
        localStorage.removeItem(progressKey);
        return null;
      }

      return progressData;
    } catch (error) {
      console.error("Failed to load onboarding progress:", error);
      return null;
    }
  }, [user?.id]);

  // Clear progress from localStorage
  const clearProgress = useCallback(() => {
    if (!user?.id) return;

    const progressKey = `onboarding-progress-${user.id}`;
    localStorage.removeItem(progressKey);
  }, [user?.id]);

  // Load saved progress on component mount
  useEffect(() => {
    if (!user?.id || isLoaded) return;

    const savedProgress = loadProgress();
    if (savedProgress) {
      // Merge saved form data with current form data (preserving pre-populated fields)
      setFormData((prevData) => ({
        ...prevData,
        ...savedProgress.formData,
        // Keep pre-populated organisation if it exists
        organization:
          prevData.organization || savedProgress.formData.organization,
      }));
      setCurrentStep(savedProgress.currentStep);
      setProgressRestored(true);

      // Auto-hide progress restored notification after 3 seconds
      setTimeout(() => setProgressRestored(false), 3000);
    }

    setIsLoaded(true);
  }, [user?.id, loadProgress, isLoaded]);

  // Get required fields for current step
  const getRequiredFieldsForStep = useCallback(
    (step: number) => {
      switch (step) {
        case 0: // Personal Information
          const requiredFields = ["firstName", "lastName", "email", "role"];
          // Add customRole if "other" is selected
          if (formData.role === "other") {
            requiredFields.push("customRole");
          }
          // Add email validation if email is provided
          if (
            formData.email &&
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)
          ) {
            requiredFields.push("invalidEmail");
          }
          return requiredFields;
        case 1: // Work Information
          const workFields = ["department"];
          // Only require organisation if it's not pre-populated
          if (!formData.organization) {
            workFields.push("organization");
          }
          return workFields;
        case 2: // Security
          const securityFields = [
            "currentPassword",
            "newPassword",
            "confirmPassword",
          ];
          // Additional validation: passwords must match and meet strength requirements
          if (
            formData.newPassword &&
            formData.confirmPassword &&
            formData.newPassword !== formData.confirmPassword
          ) {
            return [...securityFields, "passwordMismatch"];
          }
          if (formData.newPassword && formData.newPassword.length < 8) {
            return [...securityFields, "passwordTooWeak"];
          }
          return securityFields;
        case 3: // Preferences
          return [];
        case 4: // Complete
          return [];
        default:
          return [];
      }
    },
    [
      formData.role,
      formData.organization,
      formData.newPassword,
      formData.confirmPassword,
      formData.email,
    ],
  );

  // Update missing fields when step changes
  useEffect(() => {
    const requiredFields = getRequiredFieldsForStep(currentStep);
    const missing = requiredFields.filter((field) => {
      const value = formData[field as keyof typeof formData];
      return typeof value !== "string" || value.trim() === "";
    });
    setMissingFields(missing);
  }, [currentStep, formData, getRequiredFieldsForStep]);

  // Save progress whenever form data or step changes
  useEffect(() => {
    if (!isLoaded) return; // Don't save until initial load is complete
    saveProgress();
  }, [currentStep, formData, isLoaded, saveProgress]);

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setError(""); // Clear any previous errors
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    if (!user) return;

    setIsCompleting(true);

    try {
      // First, update user profile information (name, email) if changed
      const userFirstName = user.firstName || "";
      const userLastName = user.lastName || "";
      const userEmail = user.emailAddresses?.[0]?.emailAddress || "";

      // Check if name or email has actually changed (trim whitespace for comparison)
      const nameChanged =
        formData.firstName.trim() !== userFirstName ||
        formData.lastName.trim() !== userLastName;
      const emailChanged = formData.email.trim() !== userEmail;

      if (nameChanged || emailChanged) {
        try {
          // Update name in Clerk only if it actually changed
          if (nameChanged) {
            await user.update({
              firstName: formData.firstName.trim(),
              lastName: formData.lastName.trim(),
            });
          }

          // Update email only if it actually changed
          if (emailChanged) {
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

              // Reload user data to get updated email
              await user.reload();
            } catch (emailError) {
              console.error("Email update error:", emailError);
              setError(
                emailError instanceof Error
                  ? emailError.message
                  : "Failed to update email. Please try again.",
              );
              return;
            }
          }
        } catch (profileError) {
          console.error("Profile update error:", profileError);
          setError("Failed to update profile information. Please try again.");
          return;
        }
      }

      // Update the password if provided in the security step
      if (
        formData.currentPassword &&
        formData.newPassword &&
        formData.confirmPassword
      ) {
        // Validate password match
        if (formData.newPassword !== formData.confirmPassword) {
          setError("New password and confirm password do not match.");
          return;
        }

        // Validate password strength
        if (formData.newPassword.length < 8) {
          setError("Password must be at least 8 characters long.");
          return;
        }

        try {
          await user.updatePassword({
            currentPassword: formData.currentPassword,
            newPassword: formData.newPassword,
          });
        } catch (passwordError) {
          // Provide specific error messages for password issues
          let errorMessage =
            "Failed to update password. Please check your current password.";
          if (passwordError instanceof Error) {
            if (passwordError.message.includes("current password")) {
              errorMessage = "Current password is incorrect. Please try again.";
            } else if (passwordError.message.includes("weak")) {
              errorMessage =
                "Password is too weak. Please choose a stronger password.";
            } else if (passwordError.message.includes("recent")) {
              errorMessage =
                "Cannot reuse a recent password. Please choose a different password.";
            } else if (
              passwordError.message.includes("breach") ||
              passwordError.message.includes("compromised")
            ) {
              errorMessage =
                "This password has been found in online breaches. Please choose a different, more secure password.";
            } else if (passwordError.message.includes("_baseFetch")) {
              errorMessage =
                "Network error occurred. Please check your connection and try again.";
            }
          }
          setError(errorMessage);
          return;
        }
      }

      // Filter out sensitive password data before sending to API
      const {
        currentPassword,
        newPassword,
        confirmPassword,
        ...safeOnboardingData
      } = formData;

      // Update user metadata to mark onboarding as complete via API
      const response = await fetch("/api/complete-onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          onboardingData: safeOnboardingData,
        }),
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Response is not JSON, get text instead
          const errorText = await response.text();
          errorMessage =
            `Server error: ${errorText.slice(0, 100)}...` || errorMessage;
        }
        throw new Error(errorMessage);
      }

      await response.json(); // Consume the response

      // Clear progress since onboarding completed successfully on server
      clearProgress();

      // Redirect to success page which will handle the final redirect
      // This gives time for the session to update
      window.location.replace("/onboarding-success");
    } catch (error) {
      console.error("Failed to complete onboarding:", error);
      setError("Failed to complete onboarding. Please try again.");
    } finally {
      setIsCompleting(false);
    }
  };

  const handleLogout = async () => {
    await signOut(() => router.push("/sign-in"));
  };

  // Check if current step is valid
  const isCurrentStepValid = () => {
    const requiredFields = getRequiredFieldsForStep(currentStep);
    return requiredFields.every((field) => {
      // Special handling for password validation
      if (field === "passwordMismatch") {
        return formData.newPassword === formData.confirmPassword;
      }
      if (field === "passwordTooWeak") {
        return formData.newPassword.length >= 8;
      }
      if (field === "invalidEmail") {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);
      }

      const value = formData[field as keyof typeof formData];
      return typeof value === "string" && value.trim() !== "";
    });
  };

  // Update missing fields when form data changes
  const updateFormData = (field: string, value: string) => {
    const newFormData = { ...formData, [field]: value };

    // Special handling for role field
    if (field === "role") {
      if (newFormData.customRole && value !== "other") {
        newFormData.customRole = "";
      }
    }

    // Skip validation for optional fields
    if (field === "phone") {
      setFormData(newFormData);
      return;
    }

    // Update form data
    setFormData(newFormData);

    // Update missing fields based on current step requirements
    const requiredFields = getRequiredFieldsForStep(currentStep);
    const missing = requiredFields.filter((fieldName) => {
      const fieldValue =
        fieldName === field
          ? value
          : newFormData[fieldName as keyof typeof newFormData];
      return typeof fieldValue !== "string" || fieldValue.trim() === "";
    });

    setMissingFields(missing);
  };

  // Show loading state while progress is being loaded
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <div className="w-full max-w-2xl mx-auto p-8">
          <Card className="w-full">
            <CardContent className="p-8">
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span>Loading your progress...</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold">Welcome to WorkloadWizard!</h2>
              <p className="text-muted-foreground mt-2">
                Let&apos;s get you set up with some basic information
              </p>
              {formData.firstName || formData.lastName ? (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                  We&apos;ve pre-filled some information from your account.
                  Please complete any highlighted fields marked with{" "}
                  <span className="text-orange-500 font-medium">*</span>
                </div>
              ) : null}
            </div>

            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="firstName"
                    className={
                      missingFields.includes("firstName")
                        ? "text-orange-600"
                        : ""
                    }
                  >
                    First Name{" "}
                    {missingFields.includes("firstName") && (
                      <span className="text-orange-500">*</span>
                    )}
                  </Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) =>
                      updateFormData("firstName", e.target.value)
                    }
                    placeholder="Enter your first name"
                    className={
                      missingFields.includes("firstName")
                        ? "border-orange-300 focus:border-orange-500"
                        : ""
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="lastName"
                    className={
                      missingFields.includes("lastName")
                        ? "text-orange-600"
                        : ""
                    }
                  >
                    Last Name{" "}
                    {missingFields.includes("lastName") && (
                      <span className="text-orange-500">*</span>
                    )}
                  </Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => updateFormData("lastName", e.target.value)}
                    placeholder="Enter your last name"
                    className={
                      missingFields.includes("lastName")
                        ? "border-orange-300 focus:border-orange-500"
                        : ""
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="role"
                    className={
                      missingFields.includes("role") ? "text-orange-600" : ""
                    }
                  >
                    Job Role{" "}
                    {missingFields.includes("role") && (
                      <span className="text-orange-500">*</span>
                    )}
                  </Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => updateFormData("role", value)}
                  >
                    <SelectTrigger
                      className={`w-full ${missingFields.includes("role") ? "border-orange-300 focus:border-orange-500" : ""}`}
                    >
                      <SelectValue placeholder="Select your job role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lecturer">Lecturer</SelectItem>
                      <SelectItem value="professor">Professor</SelectItem>
                      <SelectItem value="researcher">Researcher</SelectItem>
                      <SelectItem value="admin">Administrator</SelectItem>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="support">Support Staff</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.role === "other" ? (
                  <div className="space-y-2">
                    <Label
                      htmlFor="customRole"
                      className={
                        missingFields.includes("customRole")
                          ? "text-orange-600"
                          : ""
                      }
                    >
                      Custom Job Role{" "}
                      {missingFields.includes("customRole") && (
                        <span className="text-orange-500">*</span>
                      )}
                    </Label>
                    <Input
                      id="customRole"
                      value={formData.customRole}
                      onChange={(e) =>
                        updateFormData("customRole", e.target.value)
                      }
                      placeholder="Enter your job role"
                      className={
                        missingFields.includes("customRole")
                          ? "border-orange-300 focus:border-orange-500"
                          : ""
                      }
                    />
                  </div>
                ) : (
                  <div /> // Empty div to maintain grid structure
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="email"
                    className={
                      missingFields.includes("email") ? "text-orange-600" : ""
                    }
                  >
                    Email Address{" "}
                    {missingFields.includes("email") && (
                      <span className="text-orange-500">*</span>
                    )}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateFormData("email", e.target.value)}
                    placeholder="Enter your email address"
                    className={
                      missingFields.includes("email")
                        ? "border-orange-300 focus:border-orange-500"
                        : ""
                    }
                  />
                  {formData.email && missingFields.includes("invalidEmail") && (
                    <p className="text-xs text-red-600">
                      Please enter a valid email address
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">
                    Phone Number{" "}
                    <span className="text-xs text-muted-foreground">
                      (optional)
                    </span>
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => updateFormData("phone", e.target.value)}
                    placeholder="Enter your phone number (optional)"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold">Organisation Details</h2>
              <p className="text-muted-foreground mt-2">
                Tell us about your institution
              </p>
              {formData.organization && (
                <div className="mt-4 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-sm text-green-700 dark:text-green-300">
                    <strong>Great!</strong> We found your organisation
                    information from your account.
                  </p>
                </div>
              )}
            </div>

            <div className="grid gap-4">
              <div className="space-y-2">
                <Label
                  htmlFor="organization"
                  className={
                    missingFields.includes("organization")
                      ? "text-orange-600"
                      : ""
                  }
                >
                  Organisation/Institution{" "}
                  {missingFields.includes("organization") && (
                    <span className="text-orange-500">*</span>
                  )}
                  {formData.organization && (
                    <span className="text-xs text-muted-foreground ml-2">
                      (pre-filled from your account)
                    </span>
                  )}
                </Label>
                <Input
                  id="organization"
                  value={formData.organization}
                  onChange={(e) =>
                    updateFormData("organization", e.target.value)
                  }
                  placeholder="Enter your organisation name"
                  className={`${missingFields.includes("organization") ? "border-orange-300 focus:border-orange-500" : ""} ${formData.organization ? "bg-muted" : ""}`}
                  readOnly={!!formData.organization}
                />
                {formData.organization && (
                  <p className="text-xs text-muted-foreground">
                    This information was retrieved from your account. If
                    incorrect, please contact support.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="department"
                  className={
                    missingFields.includes("department")
                      ? "text-orange-600"
                      : ""
                  }
                >
                  Department/Faculty{" "}
                  {missingFields.includes("department") && (
                    <span className="text-orange-500">*</span>
                  )}
                </Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) => updateFormData("department", e.target.value)}
                  placeholder="Enter your department"
                  className={
                    missingFields.includes("department")
                      ? "border-orange-300 focus:border-orange-500"
                      : ""
                  }
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold">Security</h2>
              <p className="text-muted-foreground mt-2">
                Update your password to secure your account
              </p>
              <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  <strong>Password Change Required:</strong> For security
                  purposes, please change your password during setup.
                </p>
              </div>
            </div>

            <div className="grid gap-6">
              <div className="space-y-2">
                <Label
                  htmlFor="currentPassword"
                  className={
                    missingFields.includes("currentPassword")
                      ? "text-orange-600"
                      : ""
                  }
                >
                  Current Password{" "}
                  {missingFields.includes("currentPassword") && (
                    <span className="text-orange-500">*</span>
                  )}
                </Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? "text" : "password"}
                    value={formData.currentPassword}
                    onChange={(e) =>
                      updateFormData("currentPassword", e.target.value)
                    }
                    placeholder="Enter your current password"
                    className={`pr-10 ${missingFields.includes("currentPassword") ? "border-orange-300 focus:border-orange-500" : ""}`}
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

              <div className="space-y-2">
                <Label
                  htmlFor="newPassword"
                  className={
                    missingFields.includes("newPassword")
                      ? "text-orange-600"
                      : ""
                  }
                >
                  New Password{" "}
                  {missingFields.includes("newPassword") && (
                    <span className="text-orange-500">*</span>
                  )}
                </Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    value={formData.newPassword}
                    onChange={(e) =>
                      updateFormData("newPassword", e.target.value)
                    }
                    placeholder="Enter your new password"
                    className={`pr-10 ${missingFields.includes("newPassword") ? "border-orange-300 focus:border-orange-500" : ""}`}
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

                {/* Password validation feedback */}
                {formData.newPassword && (
                  <div className="space-y-2">
                    {/* Password strength indicator */}
                    <div className="space-y-1">
                      {(() => {
                        const s = getPasswordStrength(formData.newPassword);
                        return (
                          <p className={`text-sm ${s?.color || ""}`}>
                            Password strength: {s?.label || ""}
                          </p>
                        );
                      })()}
                      {(() => {
                        const s = getPasswordStrength(formData.newPassword);
                        return (
                          <div className="flex space-x-1">
                            {[1, 2, 3, 4, 5].map((level) => (
                              <div
                                key={level}
                                className={`h-1 flex-1 rounded ${
                                  level <= (s?.strength || 0)
                                    ? s?.color?.replace("text-", "bg-") ||
                                      "bg-gray-200"
                                    : "bg-gray-200"
                                }`}
                              />
                            ))}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Validation messages */}
                    {formData.newPassword.length < 8 && (
                      <p className="text-sm text-red-600">
                        Password must be at least 8 characters long
                      </p>
                    )}
                    {formData.newPassword &&
                      formData.confirmPassword &&
                      formData.newPassword !== formData.confirmPassword && (
                        <p className="text-sm text-red-600">
                          Passwords do not match
                        </p>
                      )}
                    {formData.newPassword &&
                      formData.confirmPassword &&
                      formData.newPassword === formData.confirmPassword &&
                      formData.newPassword.length >= 8 && (
                        <p className="text-sm text-green-600">
                          ✓ Password is valid
                        </p>
                      )}
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  Password must be at least 8 characters long and include
                  uppercase, lowercase, number, and special character.
                </p>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="confirmPassword"
                  className={
                    missingFields.includes("confirmPassword")
                      ? "text-orange-600"
                      : ""
                  }
                >
                  Confirm New Password{" "}
                  {missingFields.includes("confirmPassword") && (
                    <span className="text-orange-500">*</span>
                  )}
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      updateFormData("confirmPassword", e.target.value)
                    }
                    placeholder="Confirm your new password"
                    className={`pr-10 ${missingFields.includes("confirmPassword") ? "border-orange-300 focus:border-orange-500" : ""}`}
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
                {formData.newPassword &&
                  formData.confirmPassword &&
                  formData.newPassword !== formData.confirmPassword && (
                    <p className="text-xs text-red-600">
                      Passwords do not match
                    </p>
                  )}
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold">Preferences</h2>
              <p className="text-muted-foreground mt-2">
                Customise your WorkloadWizard experience
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="notifications"
                  checked={formData.notifications}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      notifications: checked as boolean,
                    })
                  }
                />
                <div className="grid gap-1.5 leading-none">
                  <Label
                    htmlFor="notifications"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Email notifications
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Receive updates about your workload and schedule changes
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="newsletter"
                  checked={formData.newsletter}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, newsletter: checked as boolean })
                  }
                />
                <div className="grid gap-1.5 leading-none">
                  <Label
                    htmlFor="newsletter"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Product updates
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Get notified about new features and improvements
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold">You&apos;re All Set!</h2>
              <p className="text-muted-foreground mt-2">
                Welcome to WorkloadWizard. Let&apos;s start managing your
                academic workload.
              </p>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">What&apos;s next?</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Set up your first course or project</li>
                <li>• Explore the dashboard and features</li>
                <li>• Invite colleagues to collaborate</li>
                <li>• Customise your workload preferences</li>
              </ul>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-muted">
      {/* Theme Toggle - Fixed Position */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      <div className="flex min-h-screen">
        {/* Sidebar Navigation */}
        <div className="w-80 bg-card border-r border-border p-6 flex flex-col">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div
                className="flex aspect-square size-10 items-center justify-center rounded-lg text-white"
                style={{ backgroundColor: "#0F59FF" }}
              >
                <WandSparkles className="size-5" />
              </div>
              <div>
                <h1 className="font-semibold text-lg">WorkloadWizard</h1>
                <p className="text-xs text-muted-foreground">
                  Setup & Onboarding
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {onboardingSteps.map((step, index) => {
              const Icon = step.icon;
              const isCompleted = index < currentStep;
              const isCurrent = index === currentStep;

              return (
                <div
                  key={step.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg transition-colors",
                    isCurrent && "bg-primary text-primary-foreground",
                    isCompleted && "bg-muted",
                    !isCurrent && !isCompleted && "hover:bg-muted/50",
                  )}
                >
                  <div
                    className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors",
                      isCompleted && "bg-green-500 border-green-500 text-white",
                      isCurrent &&
                        "border-primary-foreground text-primary-foreground",
                      !isCurrent && !isCompleted && "border-muted-foreground",
                    )}
                  >
                    {isCompleted ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "font-medium text-sm",
                        isCurrent && "text-primary-foreground",
                      )}
                    >
                      {step.title}
                    </p>
                    <p
                      className={cn(
                        "text-xs",
                        isCurrent
                          ? "text-primary-foreground/80"
                          : "text-muted-foreground",
                      )}
                    >
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Logout Button */}
          <div className="mt-auto pt-6">
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="w-full justify-start text-muted-foreground hover:text-foreground"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-2xl">
            <Card className="w-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">
                      Step {currentStep + 1} of {onboardingSteps.length}
                    </CardTitle>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {Math.round(
                      ((currentStep + 1) / onboardingSteps.length) * 100,
                    )}
                    % Complete
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-2 mt-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${((currentStep + 1) / onboardingSteps.length) * 100}%`,
                    }}
                  />
                </div>
              </CardHeader>
              <CardContent>
                {progressRestored && (
                  <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      <strong>Progress restored!</strong> You can continue from
                      where you left off.
                    </p>
                  </div>
                )}
                {error && (
                  <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                    <p className="text-sm text-red-700 dark:text-red-300">
                      <strong>Error:</strong> {error}
                    </p>
                  </div>
                )}
                <div className="min-h-[400px] flex flex-col">
                  <div className="flex-1">{renderStepContent()}</div>

                  <div className="flex justify-between mt-8">
                    {currentStep === 0 ? (
                      <div /> // Empty div to maintain spacing
                    ) : (
                      <Button variant="outline" onClick={handlePrevious}>
                        Previous
                      </Button>
                    )}

                    {currentStep === onboardingSteps.length - 1 ? (
                      <Button onClick={handleComplete} disabled={isCompleting}>
                        {isCompleting ? "Setting up..." : "Get Started"}
                      </Button>
                    ) : (
                      <Button
                        onClick={handleNext}
                        disabled={!isCurrentStepValid()}
                      >
                        Next
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
