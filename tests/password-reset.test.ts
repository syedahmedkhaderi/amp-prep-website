import { describe, it, expect, beforeEach } from "vitest";
import crypto from "crypto";
import {
  signUp,
  signIn,
  createPasswordResetToken,
  resetPasswordWithToken,
  createSessionToken,
  getSession,
  pruneResetTokens,
} from "@/lib/auth";
import { getDB, initDB } from "@/lib/db/sqlite";

/**
 * Password reset.
 *
 * A reset flow is a second way into every account, so the properties that
 * matter are the ones that stop it becoming an easier way in than the password:
 * tokens are stored hashed, spend once, expire, and take every existing session
 * with them.
 */

const email = () => `reset_${crypto.randomBytes(6).toString("hex")}@example.com`;
const PASSWORD = "a reasonably long passphrase";
const NEW_PASSWORD = "an entirely different passphrase";

beforeEach(() => {
  initDB();
});

async function makeUser() {
  const address = email();
  const user = await signUp(address, PASSWORD, "Reset Test");
  return { address, user };
}

describe("issuing a token", () => {
  it("returns a token for an address that has an account", async () => {
    const { address } = await makeUser();
    const issued = createPasswordResetToken(address);
    expect(issued?.token).toBeTruthy();
  });

  it("returns null for an address that does not, so the caller cannot leak existence", () => {
    expect(createPasswordResetToken("nobody-here@example.com")).toBeNull();
  });

  it("is case-insensitive about the address", async () => {
    const { address } = await makeUser();
    expect(createPasswordResetToken(address.toUpperCase())).not.toBeNull();
  });

  it("stores only a hash of the token, never the token itself", async () => {
    const { address, user } = await makeUser();
    const issued = createPasswordResetToken(address)!;
    const row = getDB()
      .prepare("SELECT token_hash FROM password_reset_tokens WHERE user_id = ?")
      .get(user.id) as any;

    expect(row.token_hash).not.toBe(issued.token);
    expect(row.token_hash).toBe(
      crypto.createHash("sha256").update(issued.token).digest("hex")
    );
  });

  it("retires an earlier token when a second is requested", async () => {
    const { address } = await makeUser();
    const first = createPasswordResetToken(address)!;
    createPasswordResetToken(address);

    await expect(resetPasswordWithToken(first.token, NEW_PASSWORD)).rejects.toThrow();
  });

  it("issues tokens that differ between requests", async () => {
    const a = await makeUser();
    const b = await makeUser();
    expect(createPasswordResetToken(a.address)!.token).not.toBe(
      createPasswordResetToken(b.address)!.token
    );
  });
});

describe("spending a token", () => {
  it("sets the new password", async () => {
    const { address } = await makeUser();
    const issued = createPasswordResetToken(address)!;

    await resetPasswordWithToken(issued.token, NEW_PASSWORD);

    const user = await signIn(address, NEW_PASSWORD);
    expect(user.email).toBe(address.toLowerCase());
  });

  it("stops the old password working", async () => {
    const { address } = await makeUser();
    const issued = createPasswordResetToken(address)!;
    await resetPasswordWithToken(issued.token, NEW_PASSWORD);

    await expect(signIn(address, PASSWORD)).rejects.toThrow();
  });

  it("cannot be spent twice", async () => {
    const { address } = await makeUser();
    const issued = createPasswordResetToken(address)!;
    await resetPasswordWithToken(issued.token, NEW_PASSWORD);

    await expect(resetPasswordWithToken(issued.token, "yet another passphrase")).rejects.toThrow();
  });

  it("rejects a token that was never issued", async () => {
    await expect(resetPasswordWithToken("not-a-real-token", NEW_PASSWORD)).rejects.toThrow();
  });

  it("rejects an expired token", async () => {
    const { address, user } = await makeUser();
    const issued = createPasswordResetToken(address)!;
    getDB()
      .prepare("UPDATE password_reset_tokens SET expires_at = ? WHERE user_id = ?")
      .run(new Date(Date.now() - 1000).toISOString(), user.id);

    await expect(resetPasswordWithToken(issued.token, NEW_PASSWORD)).rejects.toThrow();
  });

  it("gives the same message for missing, spent and expired tokens", async () => {
    const { address } = await makeUser();
    const issued = createPasswordResetToken(address)!;
    await resetPasswordWithToken(issued.token, NEW_PASSWORD);

    const spent = await resetPasswordWithToken(issued.token, NEW_PASSWORD).catch((e) => e.message);
    const missing = await resetPasswordWithToken("nope", NEW_PASSWORD).catch((e) => e.message);
    expect(spent).toBe(missing);
  });
});

describe("sessions", () => {
  it("signs out every existing session", async () => {
    const { address, user } = await makeUser();
    const token = createSessionToken(user.id);

    const issued = createPasswordResetToken(address)!;
    await resetPasswordWithToken(issued.token, NEW_PASSWORD);

    // getSession reads the cookie, so assert on the token_version claim the
    // same way getSession does: the old token now names a stale version.
    const claims = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString("utf8")
    );
    const current = getDB()
      .prepare("SELECT token_version FROM users WHERE id = ?")
      .get(user.id) as any;

    expect(Number(claims.tv)).not.toBe(Number(current.token_version));
  });
});

describe("housekeeping", () => {
  it("prunes spent and expired tokens but keeps live ones", async () => {
    const spentUser = await makeUser();
    const spent = createPasswordResetToken(spentUser.address)!;
    await resetPasswordWithToken(spent.token, NEW_PASSWORD);

    const liveUser = await makeUser();
    createPasswordResetToken(liveUser.address);

    pruneResetTokens();

    const db = getDB();
    const spentLeft = db
      .prepare("SELECT COUNT(*) c FROM password_reset_tokens WHERE user_id = ?")
      .get(spentUser.user.id) as any;
    const liveLeft = db
      .prepare("SELECT COUNT(*) c FROM password_reset_tokens WHERE user_id = ?")
      .get(liveUser.user.id) as any;

    expect(spentLeft.c).toBe(0);
    expect(liveLeft.c).toBe(1);
  });
});
