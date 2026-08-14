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
  // Both implemented providers sign with X-Signature. A provider that uses a
  // different header adds it here; verification itself stays provider-specific
  // and lives behind verifyWebhook.
  const signature =
    req.headers.get("X-Signature") || req.headers.get("x-signature") || "";

  if (!provider.verifyWebhook(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  try {
    const event = provider.parseWebhookEvent(rawBody);

    initDB();
    const db = getDB();

    // Find user by the custom data in the event.
    //
    // Answer 200 rather than 404 when there is nobody to act on. A provider
    // treats any non-2xx as a delivery failure and retries it for days, but
    // neither case here can succeed on a retry: an event we do not model (a
    // provider endpoint subscribed to more event types than we handle) carries no user
    // id at all, and a genuinely deleted account will not come back. Both are
    // acknowledged and dropped, and the retry queue stays clear for events that
    // really did fail.
    const user = event.userId
      ? (db.prepare("SELECT id FROM users WHERE id = ?").get(event.userId) as any)
      : null;
    if (!user) {
      return NextResponse.json({ received: true, ignored: true });
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
