import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getPaymentProvider } from "@/lib/payments";

/**
 * Create a checkout session for Pro upgrade.
 * Spec Section 9: "The server creates a checkout session for the Pro plan
 * and redirects to the provider hosted checkout."
 */
export async function POST(_req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const provider = getPaymentProvider();
  if (!provider) {
    // No payment provider configured. We intentionally do not grant Pro here:
    // a real subscription must always come from a verified payment.
    return NextResponse.json(
      { error: "Checkout is not available yet. Please try again later." },
      { status: 503 }
    );
  }

  try {
    const session = await provider.createCheckoutSession(user.id, "pro");
    if (!session.url) {
      return NextResponse.json({ error: "Could not start checkout." }, { status: 502 });
    }
    return NextResponse.json(session);
  } catch {
    // Avoid leaking provider internals to the client.
    return NextResponse.json({ error: "Could not start checkout." }, { status: 502 });
  }
}
