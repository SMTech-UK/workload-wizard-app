# 📧 Email Service Integration Guide

## Overview

This guide will help you integrate any email service provider to send custom invitation emails with temporary passwords to new users. The system is designed to be provider-agnostic and can work with any email service.

## 🚀 Quick Setup

### **Step 1: Choose Your Email Service**

Popular options include:
- **Resend** (recommended) - 3,000 emails/month free
- **Mailgun** - 5,000 emails/month free
- **AWS SES** - 62,000 emails/month free
- **Nodemailer** with SMTP (Gmail, Outlook, etc.)
- **SendGrid** - 100 emails/day free
- **Postmark** - 100 emails/month free

### **Step 2: Install Your Email Service Package**

```bash
# For Resend
npm install resend

# For Mailgun
npm install mailgun.js

# For AWS SES
npm install @aws-sdk/client-ses

# For Nodemailer (SMTP)
npm install nodemailer
```

### **Step 3: Configure Environment Variables**

Add these to your `.env.local` file:

```bash
# Email Service Configuration
EMAIL_SERVICE_API_KEY=your_email_service_api_key
FROM_EMAIL=your-verified-email@yourdomain.com

# Optional: Custom sign-in URL
NEXT_PUBLIC_CLERK_SIGN_IN_URL=https://your-app.com/sign-in
```

### **Step 4: Update Email Service Implementation**

Edit `src/lib/services/emailService.ts` and replace the placeholder functions with your chosen email service.

## 🎯 How It Works

### **Email Invitation Flow**

1. **Admin creates user** with email invitation enabled
2. **System generates** secure temporary password
3. **Email service sends** beautiful HTML email with:
   - Welcome message
   - Login credentials (username + temporary password)
   - Sign-in link
   - Security instructions
4. **User receives email** and can sign in immediately
5. **User changes password** on first login

### **Email Content**

The email includes:
- ✅ **Professional HTML design** with your branding
- ✅ **Clear instructions** for first-time users
- ✅ **Security warnings** about changing password
- ✅ **Direct sign-in link** for easy access
- ✅ **Admin contact information** for support

## 🔧 Implementation Examples

### **Example 1: Resend Integration**

```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.EMAIL_SERVICE_API_KEY);

export async function sendUserInvitationEmail(data: UserInvitationEmailData): Promise<EmailResult> {
  try {
    const result = await resend.emails.send({
      from: process.env.FROM_EMAIL!,
      to: data.to,
      subject: 'Welcome to Workload Wizard - Your Account Details',
      html: generateInvitationEmailHTML(data),
      text: generateInvitationEmailText(data),
    });

    return {
      success: true,
      messageId: result.data?.id,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
```

### **Example 2: Nodemailer with SMTP**

```typescript
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransporter({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_SERVICE_API_KEY, // your email
    pass: process.env.EMAIL_SERVICE_PASSWORD, // your app password
  },
});

export async function sendUserInvitationEmail(data: UserInvitationEmailData): Promise<EmailResult> {
  try {
    const result = await transporter.sendMail({
      from: process.env.FROM_EMAIL!,
      to: data.to,
      subject: 'Welcome to Workload Wizard - Your Account Details',
      html: generateInvitationEmailHTML(data),
      text: generateInvitationEmailText(data),
    });

    return {
      success: true,
      messageId: result.messageId,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
```

### **Example 3: AWS SES Integration**

```typescript
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const ses = new SESClient({
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function sendUserInvitationEmail(data: UserInvitationEmailData): Promise<EmailResult> {
  try {
    const command = new SendEmailCommand({
      Source: process.env.FROM_EMAIL!,
      Destination: {
        ToAddresses: [data.to],
      },
      Message: {
        Subject: {
          Data: 'Welcome to Workload Wizard - Your Account Details',
        },
        Body: {
          Html: {
            Data: generateInvitationEmailHTML(data),
          },
          Text: {
            Data: generateInvitationEmailText(data),
          },
        },
      },
    });

    const result = await ses.send(command);

    return {
      success: true,
      messageId: result.MessageId,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
```

## 🧪 Testing

### **Test Connection**
```typescript
// In your admin panel
await testEmailService();
// Returns: { success: true, messageId: 'test-success' }
```

### **Send Test Email**
```typescript
// In your admin panel
await sendTestEmail('test@example.com');
// Returns: { success: true, messageId: 'actual-message-id' }
```

### **Monitor Email Delivery**

1. **Check your email service dashboard** for delivery status
2. **View delivery status** for each email
3. **Check spam/junk folders** if emails don't arrive
4. **Verify sender authentication** is complete

## 🔒 Security Best Practices

### **API Key Security**
- ✅ **Never commit** API keys to version control
- ✅ **Use environment variables** for all secrets
- ✅ **Restrict API key permissions** to minimum required
- ✅ **Rotate keys regularly** for production

### **Email Security**
- ✅ **Verify sender domain** to improve deliverability
- ✅ **Use professional from addresses** (not noreply@)
- ✅ **Include security warnings** about password changes
- ✅ **Provide admin contact** for support

### **Password Security**
- ✅ **Generate secure temporary passwords** (12+ characters)
- ✅ **Include special characters** in generated passwords
- ✅ **Require password change** on first login
- ✅ **Log all password-related events**

## 🚨 Troubleshooting

### **Common Issues**

#### **1. "Email service not configured" Error**
```bash
# Solution: Update emailService.ts with your provider
# Replace placeholder functions with actual implementation
```

#### **2. "Authentication failed" Error**
```bash
# Solution: Verify API keys and credentials
# Check email service dashboard for authentication status
```

#### **3. Emails not delivered**
- Check email service dashboard
- Verify sender authentication is complete
- Check spam/junk folders
- Ensure FROM_EMAIL is verified

#### **4. "Invalid API key" Error**
- Regenerate API key in your email service
- Ensure key has correct permissions
- Check for typos in environment variable

### **Debug Steps**

1. **Test connection** in admin panel
2. **Check environment variables** are loaded
3. **Verify email service account** is active
4. **Check email activity** in service dashboard
5. **Review server logs** for detailed errors

## 📊 Monitoring & Analytics

### **Email Service Dashboard**
- **Email Activity**: Track delivery status
- **Statistics**: Monitor send rates and bounces
- **Reports**: Analyze email performance
- **Alerts**: Set up delivery failure notifications

### **Application Logs**
```typescript
// All email events are logged
await logAuditEvent({
  action: 'email_sent',
  entityType: 'user',
  entityId: userId,
  details: 'Invitation email sent via email service',
  metadata: { messageId, emailProvider: 'your-provider' },
});
```

## 💰 Cost Considerations

### **Free Tiers**
- **Resend**: 3,000 emails/month
- **Mailgun**: 5,000 emails/month
- **AWS SES**: 62,000 emails/month
- **SendGrid**: 100 emails/day
- **Postmark**: 100 emails/month

### **When to Upgrade**
- **More users** than free tier allows
- **High email volume** requirements
- **Advanced features** needed (templates, analytics)
- **Dedicated IP** for better deliverability

## 🔄 Production Deployment

### **Environment Setup**
```bash
# Production environment variables
EMAIL_SERVICE_API_KEY=your_production_api_key
FROM_EMAIL=noreply@yourdomain.com
NEXT_PUBLIC_CLERK_SIGN_IN_URL=https://yourdomain.com/sign-in
```

### **Domain Authentication**
1. **Verify your domain** in your email service
2. **Add DNS records** as instructed
3. **Wait for verification** (can take 24-48 hours)
4. **Use domain-based from addresses**

### **Monitoring Setup**
1. **Set up email alerts** for delivery failures
2. **Monitor bounce rates** and spam reports
3. **Track email engagement** metrics
4. **Set up webhook notifications** for real-time events

## 🎉 Success Checklist

- [ ] Email service account created and verified
- [ ] API key generated with correct permissions
- [ ] Sender email verified
- [ ] Environment variables configured
- [ ] Email service integration implemented
- [ ] Connection test successful
- [ ] Test email delivered
- [ ] User invitation emails working
- [ ] Email templates customized
- [ ] Monitoring set up
- [ ] Production deployment ready

Your email integration is now ready to send beautiful, professional invitation emails with temporary passwords! 🚀 