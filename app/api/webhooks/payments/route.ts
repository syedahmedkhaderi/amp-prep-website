import { NextRequest, NextResponse } from "next/server";
import { getPaymentProvider } from "@/lib/payments";
import { getDB, initDB } from "@/lib/db/sqlite";

/**
 * Payment webhook handler. Verifies the signature, then updates the user's
 * subscription state based on the event.
 *
 * Spec Section 9: "The webhook handler verifies the signature, then updates
 * the user's subscriptions row."
 */
export async function POST(req: NextRequest) {
  const provider = getPaymentProvider();
  if (!provider) {
    return NextResponse.json({ error: "Payment provider not configured" }, { status: 503 });
  }

  // Read the raw body exactly once so we can both verify the HMAC signature and
  // parse the event from the identical bytes the provider signed.
  const rawBody = await req.text();
  const signature =
    req.headers.get("X-Signature") || req.headers.get("x-signature") || "";

  if (!provider.verifyWebhook(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  try {
    const event = provider.parseWebhookEvent(rawBody);

    initDB();
    const db = getDB();

    // Find user by the custom data in the event
    const user = db.prepare("SELECT id FROM users WHERE id = ?").get(event.userId) as any;
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update subscription state
    if (event.type === "subscription_created" || event.type === "subscription_updated") {
      if (event.status === "active") {
        db.prepare("UPDATE users SET plan = 'pro' WHERE id = ?").run(event.userId);
      } else if (event.status === "canceled" || event.status === "past_due") {
        db.prepare("UPDATE users SET plan = 'free' WHERE id = ?").run(event.userId);
      }
    } else if (event.type === "subscription_canceled") {
      db.prepare("UPDATE users SET plan = 'free' WHERE id = ?").run(event.userId);
    }

    return NextResponse.json({ received: true });
  } catch (e: any) {
    console.error("[webhook] Error:", e.message);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
