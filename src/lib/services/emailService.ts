import { Resend } from 'resend';

// Initialize Resend with API key
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@workloadwizard.com';

// Email configuration from environment variables
const EMAIL_CONFIG = {
  // Base URL for the application
  BASE_URL: process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL?.replace('/sign-in', '') || 'https://workload-wiz.xyz',
  
  // Sign-in URL
  SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || 'https://workload-wiz.xyz/sign-in',
  
  // Dashboard URL
  DASHBOARD_URL: process.env.NEXT_PUBLIC_DASHBOARD_URL || 'https://workload-wiz.xyz/dashboard',
  
  // Support email
  SUPPORT_EMAIL: process.env.SUPPORT_EMAIL || 'support@workload-wiz.xyz',
  
  // Company name
  COMPANY_NAME: process.env.COMPANY_NAME || 'WorkloadWizard',
  
  // App name
  APP_NAME: process.env.APP_NAME || 'WorkloadWizard',
};

// Get the base URL for emails - should match your sending domain
const getBaseUrl = () => {
  try {
    // Use environment variable if set, otherwise try to construct from FROM_EMAIL
    if (process.env.NEXT_PUBLIC_APP_URL) {
      return process.env.NEXT_PUBLIC_APP_URL;
    }
    
    if (process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL) {
      // Extract base URL from the sign-in URL
      const url = new URL(process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL);
      return `${url.protocol}//${url.host}`;
    }
  } catch {
    console.warn('Invalid URL in environment variables, falling back to FROM_EMAIL domain');
  }
  
  // If FROM_EMAIL is set, try to extract domain
  if (FROM_EMAIL && FROM_EMAIL.includes('@')) {
    const domain = FROM_EMAIL.split('@')[1];
    return `https://${domain}`;
  }
  
  // Fallback to localhost for development
  return 'http://localhost:3000';
};

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

// Generic email service interface
export interface UserInvitationEmailData {
  to: string;
  firstName: string;
  lastName: string;
  username: string;
  temporaryPassword: string;
  signInUrl: string;
  adminName?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Resend email service implementation
export async function sendUserInvitationEmail(data: UserInvitationEmailData): Promise<EmailResult> {
  if (!resend) {
    console.warn('Resend API key not configured, skipping email send');
    return { success: false, error: 'Resend not configured' };
  }

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.to,
      subject: 'Welcome to WorkloadWizard - Your Account Details',
      html: generateInvitationEmailHTML(data),
      text: generateInvitationEmailText(data),
    });

    if (result.error) {
      console.error('Resend email error:', result.error);
      return {
        success: false,
        error: result.error.message || 'Failed to send email',
      };
    }

    return {
      success: true,
      messageId: result.data?.id || 'unknown',
    };
  } catch (error) {
    console.error('Failed to send invitation email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}



// Email template generators (can be used with any email service)
export function generateInvitationEmailHTML(data: UserInvitationEmailData): string {
  const baseUrl = getBaseUrl();
  const signInUrl = data.signInUrl.startsWith('http') ? data.signInUrl : `${baseUrl}${data.signInUrl}`;
  

  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to ${EMAIL_CONFIG.APP_NAME}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .credentials { background: #e0e7ff; padding: 20px; border-radius: 6px; margin: 20px 0; }
        .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to ${EMAIL_CONFIG.APP_NAME}!</h1>
        </div>
        
        <div class="content">
          <h2>Hello ${data.firstName} ${data.lastName},</h2>
          
          <p>Your account has been created by ${data.adminName || 'an administrator'}. Here are your login credentials:</p>
          
          <div class="credentials">
            <p><strong>Username:</strong> ${data.username}</p>
            <p><strong>Temporary Password:</strong> ${data.temporaryPassword}</p>
            <p><strong>Sign-in URL:</strong> <a href="${signInUrl}">${signInUrl}</a></p>
          </div>
          
          <div class="warning">
            <p><strong>Important:</strong> Please change your password immediately after your first login for security reasons.</p>
          </div>
          
          <p>To get started:</p>
          <ol>
            <li>Click the sign-in link above or copy it to your browser</li>
            <li>Enter your username and temporary password</li>
            <li>You'll be prompted to change your password</li>
            <li>Complete your profile setup</li>
          </ol>
          
          <a href="${signInUrl}" class="button">Sign In Now</a>
          
          <p>If you have any questions or need assistance, please contact your administrator or email us at <a href="mailto:${EMAIL_CONFIG.SUPPORT_EMAIL}">${EMAIL_CONFIG.SUPPORT_EMAIL}</a>.</p>
          
          <p>Best regards,<br>The ${EMAIL_CONFIG.COMPANY_NAME} Team</p>
        </div>
        
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
          <p>If you didn't expect this email, please contact your administrator or email <a href="mailto:${EMAIL_CONFIG.SUPPORT_EMAIL}">${EMAIL_CONFIG.SUPPORT_EMAIL}</a>.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function generateInvitationEmailText(data: UserInvitationEmailData): string {
  const baseUrl = getBaseUrl();
  const signInUrl = data.signInUrl.startsWith('http') ? data.signInUrl : `${baseUrl}${data.signInUrl}`;
  
  return `
Welcome to ${EMAIL_CONFIG.APP_NAME}!

Hello ${data.firstName} ${data.lastName},

Your account has been created by ${data.adminName || 'an administrator'}. Here are your login credentials:

Username: ${data.username}
Temporary Password: ${data.temporaryPassword}
Sign-in URL: ${signInUrl}

IMPORTANT: Please change your password immediately after your first login for security reasons.

To get started:
1. Copy the sign-in URL to your browser
2. Enter your username and temporary password
3. You'll be prompted to change your password
4. Complete your profile setup

If you have any questions or need assistance, please contact your administrator or email us at ${EMAIL_CONFIG.SUPPORT_EMAIL}.

Best regards,
The ${EMAIL_CONFIG.COMPANY_NAME} Team

---
This is an automated message. Please do not reply to this email.
If you didn't expect this email, please contact your administrator or email ${EMAIL_CONFIG.SUPPORT_EMAIL}.
  `;
} 