import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { createHmac } from "crypto";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    const secret = process.env.FEATUREBASE_HMAC_SECRET;
    if (!secret) return NextResponse.json({ error: "Server misconfigured: FEATUREBASE_HMAC_SECRET missing" }, { status: 500 });

    // Choose identifier per config: 'userId' (default) or 'email'
    const identityField = process.env.FEATUREBASE_IDENTITY_FIELD || "userId";
    const email = user.emailAddresses[0]?.emailAddress;
    const identifier = identityField === "email" && email ? email : user.id;
    const hash = createHmac("sha256", secret).update(identifier).digest("hex");

    return NextResponse.json({ userHash: hash });
  } catch (err) {
    return NextResponse.json({ error: "Failed to compute user hash" }, { status: 500 });
  }
}


