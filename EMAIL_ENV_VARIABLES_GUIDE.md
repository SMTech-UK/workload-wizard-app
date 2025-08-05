# 📧 Email Environment Variables Guide

## 🔧 Required Environment Variables

### **Core Email Configuration**
```bash
# Required - Resend API key
RESEND_API_KEY=your_resend_api_key_here

# Required - Sending email address (should match your domain)
FROM_EMAIL=system@workload-wiz.xyz
```

### **Application URLs**
```bash
# Required - Your application's base URL
NEXT_PUBLIC_APP_URL=https://workload-wiz.xyz

# Required - Sign-in URL (can be derived from APP_URL)
NEXT_PUBLIC_CLERK_SIGN_IN_URL=https://workload-wiz.xyz/sign-in

# Optional - Dashboard URL (can be derived from APP_URL)
NEXT_PUBLIC_DASHBOARD_URL=https://workload-wiz.xyz/dashboard
```

### **Branding & Support**
```bash
# Optional - Company name (defaults to "Workload Wizard")
COMPANY_NAME=Workload Wizard

# Optional - App name (defaults to "Workload Wizard")
APP_NAME=Workload Wizard

# Optional - Support email (defaults to "support@workload-wiz.xyz")
SUPPORT_EMAIL=support@workload-wiz.xyz
```

## 🎯 Complete Example

Here's a complete `.env.local` file for your setup:

```bash
# Clerk Configuration
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
CLERK_SECRET_KEY=sk_test_your_key_here
NEXT_PUBLIC_CLERK_SIGN_IN_URL=https://workload-wiz.xyz/sign-in

# Convex Configuration
NEXT_PUBLIC_CONVEX_URL=https://your_convex_url.convex.cloud

# Email Configuration
RESEND_API_KEY=your_resend_api_key_here
FROM_EMAIL=system@workload-wiz.xyz

# Application URLs
NEXT_PUBLIC_APP_URL=https://workload-wiz.xyz
NEXT_PUBLIC_DASHBOARD_URL=https://workload-wiz.xyz/dashboard

# Branding & Support
COMPANY_NAME=Workload Wizard
APP_NAME=Workload Wizard
SUPPORT_EMAIL=support@workload-wiz.xyz
```

## 🔄 URL Resolution Priority

The system resolves URLs in this order:

### **1. Base URL Resolution:**
1. `NEXT_PUBLIC_APP_URL` (highest priority)
2. `NEXT_PUBLIC_CLERK_SIGN_IN_URL` (extracts base URL)
3. `FROM_EMAIL` domain (extracts domain)
4. `http://localhost:3000` (development fallback)

### **2. Sign-in URL Resolution:**
1. `NEXT_PUBLIC_CLERK_SIGN_IN_URL` (highest priority)
2. `NEXT_PUBLIC_APP_URL + /sign-in` (fallback)
3. `https://workload-wiz.xyz/sign-in` (hardcoded fallback)

## 🚀 Environment-Specific Configurations

### **Development Environment**
```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_CLERK_SIGN_IN_URL=http://localhost:3000/sign-in
FROM_EMAIL=system@workload-wiz.xyz
```

### **Staging Environment**
```bash
NEXT_PUBLIC_APP_URL=https://staging.workload-wiz.xyz
NEXT_PUBLIC_CLERK_SIGN_IN_URL=https://staging.workload-wiz.xyz/sign-in
FROM_EMAIL=system@workload-wiz.xyz
```

### **Production Environment**
```bash
NEXT_PUBLIC_APP_URL=https://workload-wiz.xyz
NEXT_PUBLIC_CLERK_SIGN_IN_URL=https://workload-wiz.xyz/sign-in
FROM_EMAIL=system@workload-wiz.xyz
```

## 📧 Email Template Customization

### **Dynamic Content**
All email templates now use environment variables for:

- ✅ **App Name**: `Welcome to ${EMAIL_CONFIG.APP_NAME}`
- ✅ **Company Name**: `The ${EMAIL_CONFIG.COMPANY_NAME} Team`
- ✅ **Support Email**: `support@${EMAIL_CONFIG.SUPPORT_EMAIL}`
- ✅ **Sign-in URL**: Uses `NEXT_PUBLIC_CLERK_SIGN_IN_URL`
- ✅ **Dashboard URL**: Uses `NEXT_PUBLIC_DASHBOARD_URL`

### **Email Content Examples**

#### **HTML Email:**
```html
<h1>Welcome to Workload Wizard!</h1>
<p>Best regards,<br>The Workload Wizard Team</p>
<p>Contact: <a href="mailto:support@workload-wiz.xyz">support@workload-wiz.xyz</a></p>
```

#### **Text Email:**
```
Welcome to Workload Wizard!

Best regards,
The Workload Wizard Team

Contact: support@workload-wiz.xyz
```

## 🔍 Validation & Testing

### **Environment Variable Check**
The system validates environment variables and provides fallbacks:

```typescript
// Example validation
if (!RESEND_API_KEY) {
  console.warn('Resend API key not configured');
  return { success: false, error: 'Resend not configured' };
}

if (!FROM_EMAIL) {
  console.warn('FROM_EMAIL not configured, using default');
  FROM_EMAIL = 'noreply@workloadwizard.com';
}
```

### **URL Validation**
```typescript
// Validates URLs and provides fallbacks
try {
  const url = new URL(process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL);
  return `${url.protocol}//${url.host}`;
} catch (error) {
  console.warn('Invalid URL, falling back to FROM_EMAIL domain');
  return `https://${FROM_EMAIL.split('@')[1]}`;
}
```

## 🛠️ Troubleshooting

### **Common Issues:**

#### **Issue 1: "Invalid URL" Error**
- **Cause**: Malformed URL in environment variables
- **Solution**: Ensure URLs are complete (include `https://`)

#### **Issue 2: Email Not Sending**
- **Cause**: Missing or invalid `RESEND_API_KEY`
- **Solution**: Verify Resend API key is correct

#### **Issue 3: Wrong Domain in Emails**
- **Cause**: Mismatch between `FROM_EMAIL` and `NEXT_PUBLIC_APP_URL`
- **Solution**: Ensure both use the same domain

#### **Issue 4: Resend Warning About URL Mismatch**
- **Cause**: Relative URLs in email templates
- **Solution**: All URLs are now automatically converted to absolute URLs

## 🎉 Benefits

### **✅ Flexibility**
- Easy to switch between environments
- Configurable branding and support details
- Centralized URL management

### **✅ Maintainability**
- Single source of truth for URLs
- Environment-specific configurations
- Automatic fallbacks for missing variables

### **✅ Professional Emails**
- Consistent branding across all emails
- Proper support contact information
- Domain-consistent URLs

### **✅ Development Experience**
- Clear documentation of all variables
- Validation and error handling
- Easy testing and debugging

## 🚀 Next Steps

1. **Update your `.env.local`** with the new variables
2. **Test email sending** using the admin panel
3. **Verify URLs** in sent emails
4. **Customize branding** by updating `COMPANY_NAME` and `APP_NAME`
5. **Set up support email** by updating `SUPPORT_EMAIL`

Your email system is now fully configurable via environment variables! 🎉 