import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: Request) {
  console.log("Webhook received");

  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error("CLERK_WEBHOOK_SECRET not found in environment variables");
    return new Response("Webhook secret not configured", {
      status: 500,
    });
  }

  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  console.log("Webhook headers:", {
    svix_id,
    svix_timestamp,
    svix_signature: svix_signature?.substring(0, 20) + "...",
  });

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    console.error("Missing svix headers");
    return new Response("Error occured -- no svix headers", {
      status: 400,
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  console.log("Webhook payload type:", payload.type);

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
    console.log("Webhook verified successfully");
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Error occured", {
      status: 400,
    });
  }

  // Handle the webhook
  const eventType = evt.type;
  console.log("🚀 Processing webhook event:", eventType);
  console.log("🚀 Event data keys:", Object.keys(evt.data));

  try {
    switch (eventType) {
      case "user.created":
        console.log("📝 Handling user.created");
        await handleUserCreated(evt.data);
        break;
      case "user.updated":
        console.log("📝 Handling user.updated");
        await handleUserUpdated(evt.data);
        break;
      case "user.deleted":
        console.log("📝 Handling user.deleted");
        await handleUserDeleted(evt.data);
        break;
      case "session.created":
        console.log(
          "🎯 Handling session.created - THIS IS FOR LOGIN TRACKING!",
        );
        await handleSessionCreated(evt.data);
        break;
      default:
        console.log(`❓ Unhandled webhook event: ${eventType}`);
    }
    console.log("Webhook processed successfully");
  } catch (error) {
    console.error("Error handling webhook:", error);
    return new Response("Error processing webhook", { status: 500 });
  }

  return new Response("Webhook processed successfully", { status: 200 });
}

async function handleUserCreated(userData: any) {
  console.log("Handling user.created event for user:", userData.id);

  const emailAddresses = (userData.email_addresses || []) as Array<{
    email_address: string;
    id: string;
  }>;
  const primaryEmail = emailAddresses.find(
    (email) => email.id === (userData.primary_email_address_id || undefined),
  );

  if (!primaryEmail) {
    console.error("No primary email found for user:", userData.id);
    return;
  }

  // Set default values if metadata is missing
  const publicMetadata =
    (userData.public_metadata as Record<string, unknown>) || {};
  const roles =
    (publicMetadata.roles as string[] | undefined) ??
    ((publicMetadata.role as string | undefined)
      ? [publicMetadata.role as string]
      : ["user"]);
  const organisationId = (publicMetadata.organisationId as string) || "";

  console.log("Creating user in Convex:", {
    id: userData.id,
    email: primaryEmail.email_address,
    roles,
    organisationId: organisationId || "No organisation assigned",
  });

  try {
    // Create user in Convex
    await convex.mutation(api.users.create, {
      email: primaryEmail.email_address as string,
      username: (userData as unknown as { username?: string }).username || "",
      givenName: (userData.first_name as string) || "",
      familyName: (userData.last_name as string) || "",
      fullName:
        `${(userData.first_name as string) || ""} ${(userData.last_name as string) || ""}`.trim(),
      systemRoles: roles,
      organisationId: organisationId as unknown as any,
      pictureUrl: userData.image_url as string,
      subject: userData.id as string,
      tokenIdentifier: primaryEmail.id as string,
    });

    console.log("User created in Convex:", userData.id);
  } catch (error) {
    console.error("Error creating user in Convex:", error);
    throw error;
  }
}

async function handleUserUpdated(userData: any) {
  console.log("Handling user.updated event for user:", userData.id);

  const emailAddresses = (userData.email_addresses || []) as Array<{
    email_address: string;
    id: string;
  }>;
  const primaryEmail = emailAddresses.find(
    (email) => email.id === (userData.primary_email_address_id || undefined),
  );

  const publicMetadata =
    (userData.public_metadata as Record<string, unknown>) || {};

  // Update user in Convex using webhook-specific mutation
  await convex.mutation(api.users.updateByWebhook, {
    userId: userData.id as string,
    email: primaryEmail?.email_address as string,
    username: ((userData as unknown as { username?: string }).username ||
      "") as string,
    givenName: userData.first_name as string,
    familyName: userData.last_name as string,
    fullName:
      `${(userData.first_name as string) || ""} ${(userData.last_name as string) || ""}`.trim(),
    systemRoles:
      (publicMetadata.roles as string[]) ??
      ((publicMetadata.role as string | undefined)
        ? [publicMetadata.role as string]
        : []),
    organisationId: publicMetadata.organisationId as string,
    pictureUrl: userData.image_url as string,
  });

  console.log("User updated in Convex:", userData.id);
}

async function handleUserDeleted(userData: any) {
  console.log("Handling user.deleted event for user:", userData.id);

  // Soft delete user in Convex
  await convex.mutation(api.users.remove, {
    userId: userData.id as string,
  });

  console.log("User deleted from Convex:", userData.id);
}

async function handleSessionCreated(sessionData: unknown) {
  const s = sessionData as { user_id?: string };
  console.log("🔥 HANDLING SESSION.CREATED EVENT for user:", s.user_id);
  console.log("🔥 Session data:", JSON.stringify(s, null, 2));

  try {
    // Update last sign in time in Convex
    await convex.mutation(api.users.updateLastSignIn, {
      userId: s.user_id as string,
    });

    console.log("✅ Last sign in time updated in Convex for user:", s.user_id);
  } catch (error) {
    console.error("❌ Error updating last sign in time:", error);
    throw error;
  }
}
