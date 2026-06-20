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
    // Local development: upgrade directly
    return NextResponse.json({ url: "/account?action=upgrade" });
  }

  try {
    const session = await provider.createCheckoutSession(user.id, "pro");
    return NextResponse.json(session);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
