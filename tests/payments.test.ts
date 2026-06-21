import crypto from "crypto";
import { describe, test, expect } from "vitest";
import { LemonSqueezyProvider } from "@/lib/payments";

const secret = "whsec_test_secret";
const provider = new LemonSqueezyProvider("api", "store", "variant", secret);

function sign(body: string): string {
  return crypto.createHmac("sha256", secret).update(body, "utf8").digest("hex");
}

describe("Lemon Squeezy webhook verification", () => {
  test("accepts a correctly signed payload", () => {
    const body = JSON.stringify({ meta: { event_name: "subscription_created" } });
    expect(provider.verifyWebhook(body, sign(body))).toBe(true);
  });

  test("rejects a tampered payload", () => {
    const body = JSON.stringify({ meta: { event_name: "subscription_created" } });
    const signature = sign(body);
    const tampered = body.replace("created", "updated");
    expect(provider.verifyWebhook(tampered, signature)).toBe(false);
  });

  test("rejects a missing signature", () => {
    const body = JSON.stringify({ meta: {} });
    expect(provider.verifyWebhook(body, "")).toBe(false);
  });

  test("rejects a malformed signature", () => {
    const body = JSON.stringify({ meta: {} });
    expect(provider.verifyWebhook(body, "not-hex-zzzz")).toBe(false);
  });

  test("parses subscription_canceled events", () => {
    const body = JSON.stringify({
      meta: { event_name: "subscription_cancelled", custom_data: { user_id: "u_1" } },
      data: { id: "sub_1", attributes: { status: "cancelled" } },
    });
    const event = provider.parseWebhookEvent(body);
    expect(event.type).toBe("subscription_canceled");
    expect(event.userId).toBe("u_1");
  });
});
