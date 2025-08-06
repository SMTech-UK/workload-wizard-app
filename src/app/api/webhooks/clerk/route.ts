import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../../convex/_generated/api';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: Request) {
  console.log('Webhook received');
  
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error('CLERK_WEBHOOK_SECRET not found in environment variables');
    return new Response('Webhook secret not configured', {
      status: 500
    });
  }

  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  console.log('Webhook headers:', { svix_id, svix_timestamp, svix_signature: svix_signature?.substring(0, 20) + '...' });

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    console.error('Missing svix headers');
    return new Response('Error occured -- no svix headers', {
      status: 400
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  console.log('Webhook payload type:', payload.type);

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
    console.log('Webhook verified successfully');
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error occured', {
      status: 400
    });
  }

  // Handle the webhook
  const eventType = evt.type;
  console.log('Processing webhook event:', eventType);

  try {
    switch (eventType) {
      case 'user.created':
        await handleUserCreated(evt.data);
        break;
      case 'user.updated':
        await handleUserUpdated(evt.data);
        break;
      case 'user.deleted':
        await handleUserDeleted(evt.data);
        break;
      case 'session.created':
        await handleSessionCreated(evt.data);
        break;
      default:
        console.log(`Unhandled webhook event: ${eventType}`);
    }
    console.log('Webhook processed successfully');
  } catch (error) {
    console.error('Error handling webhook:', error);
    return new Response('Error processing webhook', { status: 500 });
  }

  return new Response('Webhook processed successfully', { status: 200 });
}

async function handleUserCreated(userData: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
  console.log('Handling user.created event for user:', userData.id);
  
  const emailAddresses = userData.email_addresses as Array<Record<string, unknown>>;
  const primaryEmail = emailAddresses.find(
    (email: Record<string, unknown>) => email.id === userData.primary_email_address_id
  );

  if (!primaryEmail) {
    console.error('No primary email found for user:', userData.id);
    return;
  }

  // Set default values if metadata is missing
  const publicMetadata = userData.public_metadata as Record<string, unknown> || {};
  const role = (publicMetadata.role as string) || 'user';
  const organisationId = (publicMetadata.organisationId as string) || '';

  console.log('Creating user in Convex:', {
    id: userData.id,
    email: primaryEmail.email_address,
    role,
    organisationId: organisationId || 'No organisation assigned'
  });

  try {
    // Create user in Convex
    await convex.mutation(api.users.create, {
      email: primaryEmail.email_address as string,
      givenName: (userData.first_name as string) || '',
      familyName: (userData.last_name as string) || '',
      fullName: `${(userData.first_name as string) || ''} ${(userData.last_name as string) || ''}`.trim(),
      systemRole: role,
      organisationId: organisationId as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      pictureUrl: userData.image_url as string,
      subject: userData.id as string,
      tokenIdentifier: primaryEmail.id as string,
    });

    console.log('User created in Convex:', userData.id);
  } catch (error) {
    console.error('Error creating user in Convex:', error);
    throw error;
  }
}

async function handleUserUpdated(userData: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
  console.log('Handling user.updated event for user:', userData.id);
  
  const emailAddresses = userData.email_addresses as Array<Record<string, unknown>>;
  const primaryEmail = emailAddresses.find(
    (email: Record<string, unknown>) => email.id === userData.primary_email_address_id
  );

  const publicMetadata = userData.public_metadata as Record<string, unknown> || {};

  // Update user in Convex
  await convex.mutation(api.users.update, {
    userId: userData.id as string,
    email: primaryEmail?.email_address as string,
    givenName: userData.first_name as string,
    familyName: userData.last_name as string,
    fullName: `${(userData.first_name as string) || ''} ${(userData.last_name as string) || ''}`.trim(),
    systemRole: publicMetadata.role as string,
    organisationId: publicMetadata.organisationId as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    pictureUrl: userData.image_url as string,
  });

  console.log('User updated in Convex:', userData.id);
}

async function handleUserDeleted(userData: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
  console.log('Handling user.deleted event for user:', userData.id);
  
  // Soft delete user in Convex
  await convex.mutation(api.users.remove, {
    userId: userData.id as string,
  });

  console.log('User deleted from Convex:', userData.id);
}

async function handleSessionCreated(sessionData: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
  console.log('Handling session.created event for user:', sessionData.user_id);
  
  // Update last sign in time in Convex
  await convex.mutation(api.users.updateLastSignIn, {
    userId: sessionData.user_id as string,
  });

  console.log('Last sign in time updated in Convex for user:', sessionData.user_id);
} 