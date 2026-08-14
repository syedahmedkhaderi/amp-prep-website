/**
 * Payment provider abstraction. Spec Section 9.
 *
 * No provider is live. Lemon Squeezy and Tap Payments are implemented behind
 * this interface; whichever provider is adopted implements the same four
 * methods and nothing else in the app changes.
 *
 * PAYMENT_PROVIDER selects one. With no key configured getPaymentProvider()
 * returns null and /api/checkout answers 503, which is the current state.
 */

import crypto from "crypto";
import { SITE_URL } from "@/lib/site";


export interface PaymentProvider {
  createCheckoutSession(userId: string, plan: string): Promise<{ url: string }>;
  createPortalSession(userId: string): Promise<{ url: string }>;
  /** Verify the raw request body against the provider signature header. */
  verifyWebhook(rawBody: string, signature: string): boolean;
  /** Parse an already verified raw request body into a normalized event. */
  parseWebhookEvent(rawBody: string): WebhookEvent;
}

export interface WebhookEvent {
  type: "subscription_created" | "subscription_updated" | "subscription_canceled";
  userId: string;
  plan: "pro";
  status: "active" | "canceled" | "past_due";
  currentPeriodEnd: string;
  providerSubscriptionId: string;
  providerCustomerId: string;
}

/**
 * Lemon Squeezy implementation. Spec default.
 */
export class LemonSqueezyProvider implements PaymentProvider {
  constructor(
    private apiKey: string,
    private storeId: string,
    private proVariantId: string,
    private webhookSecret: string
  ) {}

  async createCheckoutSession(userId: string, _plan: string): Promise<{ url: string }> {
    const res = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        data: {
          type: "checkouts",
          attributes: {
            product_data: {
              variant_id: this.proVariantId,
            },
            checkout_options: {
              embed: false,
            },
            custom: { user_id: userId },
          },
        },
      }),
    });
    const data = await res.json();
    return { url: data?.data?.attributes?.url || "" };
  }

  async createPortalSession(_userId: string): Promise<{ url: string }> {
    return { url: "https://app.lemonsqueezy.com/billing" };
  }

  verifyWebhook(rawBody: string, signature: string): boolean {
    if (!signature || !this.webhookSecret) return false;
    // Lemon Squeezy signs the raw payload with HMAC SHA256 using the webhook
    // secret and sends it as a hex digest in the X-Signature header.
    const expected = crypto
      .createHmac("sha256", this.webhookSecret)
      .update(rawBody, "utf8")
      .digest("hex");
    const expectedBuf = Buffer.from(expected, "hex");
    let signatureBuf: Buffer;
    try {
      signatureBuf = Buffer.from(signature, "hex");
    } catch {
      return false;
    }
    if (expectedBuf.length !== signatureBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, signatureBuf);
  }

  parseWebhookEvent(rawBody: string): WebhookEvent {
    const body = JSON.parse(rawBody);
    const eventName: string = body.meta?.event_name || "";
    let type: WebhookEvent["type"] = "subscription_updated";
    if (eventName.includes("created")) type = "subscription_created";
    else if (eventName.includes("cancelled") || eventName.includes("canceled")) {
      type = "subscription_canceled";
    }
    return {
      type,
      userId: body.meta?.custom_data?.user_id || "",
      plan: "pro",
      status: body.data?.attributes?.status || "active",
      currentPeriodEnd: body.data?.attributes?.renews_at || "",
      providerSubscriptionId: body.data?.id || "",
      providerCustomerId: body.data?.attributes?.customer_id || "",
    };
  }
}

/**
 * Tap Payments alternative implementation. Same interface.
 * Used when PAYMENT_PROVIDER=tap.
 */
export class TapPaymentsProvider implements PaymentProvider {
  constructor(
    private secretKey: string,
    private webhookSecret: string
  ) {}

  async createCheckoutSession(userId: string, _plan: string): Promise<{ url: string }> {
    const res = await fetch("https://api.tap.company/v2/charges", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: 10,
        currency: "KWD",
        customer: { metadata: { user_id: userId } },
        source: { id: "src_all" },
        redirect: { url: `${SITE_URL}/account` },
      }),
    });
    const data = await res.json();
    return { url: data?.transaction?.url || "" };
  }

  async createPortalSession(_userId: string): Promise<{ url: string }> {
    return { url: `${SITE_URL}/account` };
  }

  verifyWebhook(rawBody: string, signature: string): boolean {
    if (!signature || !this.webhookSecret) return false;
    const expected = crypto
      .createHmac("sha256", this.webhookSecret)
      .update(rawBody, "utf8")
      .digest("hex");
    const expectedBuf = Buffer.from(expected, "hex");
    let signatureBuf: Buffer;
    try {
      signatureBuf = Buffer.from(signature, "hex");
    } catch {
      return false;
    }
    if (expectedBuf.length !== signatureBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, signatureBuf);
  }

  parseWebhookEvent(rawBody: string): WebhookEvent {
    const body = JSON.parse(rawBody);
    return {
      type: "subscription_created",
      userId: body.metadata?.user_id || "",
      plan: "pro",
      status: "active",
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      providerSubscriptionId: body.id || "",
      providerCustomerId: body.customer?.id || "",
    };
  }
}

export function getPaymentProvider(): PaymentProvider | null {
  const provider = process.env.PAYMENT_PROVIDER || "lemonsqueezy";
  if (provider === "lemonsqueezy") {
    if (!process.env.LEMONSQUEEZY_API_KEY) return null;
    return new LemonSqueezyProvider(
      process.env.LEMONSQUEEZY_API_KEY!,
      process.env.LEMONSQUEEZY_STORE_ID!,
      process.env.LEMONSQUEEZY_PRO_VARIANT_ID!,
      process.env.LEMONSQUEEZY_WEBHOOK_SECRET!
    );
  }
  if (provider === "tap") {
    if (!process.env.TAP_SECRET_KEY) return null;
    return new TapPaymentsProvider(
      process.env.TAP_SECRET_KEY!,
      process.env.TAP_WEBHOOK_SECRET!
    );
  }
  return null;
}
