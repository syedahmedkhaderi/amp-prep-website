/**
 * Password policy.
 *
 * The old rule was six characters, which permits "123456" and "qwerty" — the
 * two most-breached passwords in existence. Length is the property that
 * actually resists offline cracking, so the floor is raised and a short
 * blocklist catches the handful of passwords that get tried first in any
 * credential-stuffing run.
 *
 * Deliberately no complexity rules (no "must contain a symbol"). They push
 * people toward "Password1!" — short, predictable, and worse than a long
 * passphrase. Length plus a blocklist is the guidance NIST settled on.
 */

export const MIN_PASSWORD_LENGTH = 10;
export const MAX_PASSWORD_LENGTH = 200;

/**
 * The passwords that appear at the top of every breach corpus, plus the ones
 * this site would specifically attract. Not a substitute for a full corpus
 * check, but it removes the cheapest guesses at no cost.
 */
const COMMON_PASSWORDS = new Set(
  [
    "password", "password1", "password12", "password123", "password1234",
    "passw0rd123", "1234567890", "12345678901", "123456789012", "qwertyuiop",
    "qwerty12345", "1qaz2wsx3edc", "letmein123", "welcome123", "admin12345",
    "iloveyou123", "sunshine123", "princess123", "football123", "baseball123",
    "trustno1234", "superman123", "michael123", "shadow12345", "monkey12345",
    "dragon12345", "master12345", "abcd123456", "abcdefghij", "aaaaaaaaaa",
    "1111111111", "0000000000", "qazwsxedcrfv", "zaq12wsxcde3",
    "ampprep123", "amppreppass", "mathmath123", "studentpass",
  ].map((p) => p.toLowerCase())
);

export type PasswordCheck = { ok: true } | { ok: false; reason: string };

/**
 * Validate a candidate password. `identifiers` are values the password must not
 * simply repeat — the user's own email and name, which are the first things an
 * attacker tries against a specific account.
 */
export function checkPassword(
  password: string,
  identifiers: (string | null | undefined)[] = []
): PasswordCheck {
  if (!password) {
    return { ok: false, reason: "Password is required." };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      reason: `Password must be at least ${MIN_PASSWORD_LENGTH} characters. A short sentence you will remember works well.`,
    };
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    // Bounded so a very long input cannot be used to burn CPU in bcrypt.
    return {
      ok: false,
      reason: `Password must be at most ${MAX_PASSWORD_LENGTH} characters.`,
    };
  }

  const normalized = password.toLowerCase().trim();

  if (COMMON_PASSWORDS.has(normalized)) {
    return {
      ok: false,
      reason: "That password is one of the most commonly used ones. Please choose another.",
    };
  }

  if (/^(.)\1+$/.test(normalized)) {
    return { ok: false, reason: "Please choose a password with more variety." };
  }

  for (const identifier of identifiers) {
    if (!identifier) continue;
    const local = identifier.toLowerCase().trim().split("@")[0];
    if (local.length >= 4 && normalized.includes(local)) {
      return {
        ok: false,
        reason: "Password must not contain your name or email address.",
      };
    }
  }

  return { ok: true };
}
