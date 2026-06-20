/**
 * GeminiKeyRotator
 *
 * Round-robin across up to 12 Gemini API keys. Tracks per-key requests in the
 * current minute (RPM) and current day (RPD). On 429 / quota error marks the
 * key as cooling down with exponential backoff and moves to the next available
 * key. If every key is cooling down, sleeps until the earliest key is free.
 *
 * Spec reference: UDST_AMP_PRACTICE_BUILD_SPEC.md Section 22.
 */

export interface RotatorKeyState {
  index: number;
  key: string;
  requestsThisMinute: number;
  requestsToday: number;
  cooldownUntil: number; // epoch ms
  totalRequests: number;
  totalErrors: number;
}

export interface RotatorConfig {
  rpmPerKey: number;
  rpdPerKey: number;
  maxRetries: number;
  baseBackoffMs: number;
  generationModel: string;
  fallbackModel: string;
  verifyModel: string;
}

const DEFAULT_CONFIG: RotatorConfig = {
  rpmPerKey: Number(process.env.GEMINI_RPM_PER_KEY) || 18,
  rpdPerKey: Number(process.env.GEMINI_RPD_PER_KEY) || 200,
  maxRetries: 20,
  baseBackoffMs: 30000,
  generationModel: process.env.GEMINI_GENERATION_MODEL || "gemini-2.5-flash",
  fallbackModel: process.env.GEMINI_FALLBACK_MODEL || "gemini-2.5-flash-lite",
  verifyModel: process.env.GEMINI_VERIFY_MODEL || "gemini-2.5-flash",
};

export class GeminiKeyRotator {
  private keys: RotatorKeyState[] = [];
  private nextKeyIndex = 0;
  private config: RotatorConfig;
  private currentDay: number;

  constructor(config: Partial<RotatorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    const rawKeys = this.loadKeysFromEnv();
    if (rawKeys.length === 0) {
      throw new Error(
        "No Gemini API keys found. Set GEMINI_API_KEYS (comma separated) or GEMINI_API_KEY_1..12."
      );
    }
    this.keys = rawKeys.map((key, index) => ({
      index,
      key,
      requestsThisMinute: 0,
      requestsToday: 0,
      cooldownUntil: 0,
      totalRequests: 0,
      totalErrors: 0,
    }));
    this.currentDay = this.dayKey(Date.now());
  }

  private loadKeysFromEnv(): string[] {
    if (process.env.GEMINI_API_KEYS) {
      return process.env.GEMINI_API_KEYS.split(",")
        .map((k) => k.trim())
        .filter(Boolean);
    }
    const keys: string[] = [];
    for (let i = 1; i <= 12; i++) {
      const k = process.env[`GEMINI_API_KEY_${i}`];
      if (k) keys.push(k.trim());
    }
    return keys;
  }

  private dayKey(ts: number): number {
    const d = new Date(ts);
    return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
  }

  private minuteKey(ts: number): number {
    return Math.floor(ts / 60000);
  }
  private lastMinute = 0;

  private resetWindowIfNeeded(): void {
    const now = Date.now();
    const m = this.minuteKey(now);
    if (m !== this.lastMinute) {
      this.lastMinute = m;
      for (const k of this.keys) k.requestsThisMinute = 0;
    }
    const d = this.dayKey(now);
    if (d !== this.currentDay) {
      this.currentDay = d;
      for (const k of this.keys) {
        k.requestsToday = 0;
        k.cooldownUntil = 0;
      }
    }
  }

  /**
   * Find the next available key that is not cooling down and under its RPM/RPD
   * ceiling. Round-robin starting from nextKeyIndex.
   */
  private pickKey(): RotatorKeyState | null {
    this.resetWindowIfNeeded();
    const now = Date.now();
    const n = this.keys.length;
    for (let i = 0; i < n; i++) {
      const idx = (this.nextKeyIndex + i) % n;
      const k = this.keys[idx];
      if (now < k.cooldownUntil) continue;
      if (k.requestsThisMinute >= this.config.rpmPerKey) continue;
      if (k.requestsToday >= this.config.rpdPerKey) continue;
      this.nextKeyIndex = (idx + 1) % n;
      return k;
    }
    return null;
  }

  private earliestAvailableTime(): number {
    let earliest = Infinity;
    const now = Date.now();
    for (const k of this.keys) {
      if (now >= k.cooldownUntil && k.requestsThisMinute < this.config.rpmPerKey && k.requestsToday < this.config.rpdPerKey) {
        return now;
      }
      if (k.cooldownUntil > now && k.cooldownUntil < earliest) earliest = k.cooldownUntil;
      if (k.requestsThisMinute >= this.config.rpmPerKey) {
        const t = now + 60000;
        if (t < earliest) earliest = t;
      }
    }
    return earliest === Infinity ? now + 1000 : earliest;
  }

  private async sleep(ms: number): Promise<void> {
    if (ms <= 0) return;
    await new Promise((r) => setTimeout(r, ms));
  }

  private markCooldown(key: RotatorKeyState, attempt: number): void {
    // For 429 errors, cooldown for ~60s to match the rate window
    // For 503 errors, shorter cooldown since it's transient
    const backoff = attempt === 0 ? 60000 : Math.min(60000 * Math.pow(1.5, Math.min(attempt - 1, 3)), 300000);
    key.cooldownUntil = Date.now() + backoff;
    key.totalErrors++;
  }

  /**
   * Call the Gemini API with automatic key rotation, rate limiting, and
   * exponential backoff. Returns the parsed JSON response or throws if all
   * retries fail.
   */
  async generateContent(
    prompt: string,
    opts?: {
      model?: string;
      temperature?: number;
      responseMimeType?: "application/json" | "text/plain";
      inlineData?: { mimeType: string; data: string }; // for PDF/image input
    }
  ): Promise<string> {
    const model = opts?.model || this.config.generationModel;
    const temperature = opts?.temperature ?? 0.7;
    const responseMimeType = opts?.responseMimeType || "application/json";

    let lastErr: Error | null = null;

    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      let key = this.pickKey();

      if (!key) {
        const wait = this.earliestAvailableTime() - Date.now();
        const waitMs = Math.max(wait, 1000);
        console.warn(
          `[rotator] All keys busy. Sleeping ${(waitMs / 1000).toFixed(1)}s until a key frees up.`
        );
        await this.sleep(waitMs);
        key = this.pickKey();
        if (!key) {
          lastErr = new Error("No keys available after waiting.");
          continue;
        }
      }

      const result = await this.callGemini(key.key, model, prompt, temperature, responseMimeType, opts?.inlineData);

      if (result.ok) {
        key.requestsThisMinute++;
        key.requestsToday++;
        key.totalRequests++;
        return result.text;
      }

      key.totalErrors++;
      const status = result.status;
      // 429, 403 quota, 503 overload -> rotate
      if (status === 429 || status === 403 || status === 503 || status === 500 || status === 0) {
        console.warn(
          `[rotator] Key #${key.index + 1} returned ${status}. Cooling down and rotating.`
        );
        this.markCooldown(key, attempt);
        continue;
      }
      // Other 4xx: log but still try another key
      lastErr = new Error(`Gemini ${status}: ${result.text.slice(0, 200)}`);
      console.warn(`[rotator] Key #${key.index + 1} returned ${status}. Error: ${result.text.slice(0, 100)}`);
      this.markCooldown(key, attempt);
      continue;
    }

    throw lastErr || new Error("Gemini call failed after all retries.");
  }

  private async callGemini(
    apiKey: string,
    model: string,
    prompt: string,
    temperature: number,
    responseMimeType: string,
    inlineData?: { mimeType: string; data: string }
  ): Promise<{ ok: boolean; status: number; text: string }> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const parts: any[] = [{ text: prompt }];
    if (inlineData) {
      parts.unshift({ inlineData });
    }

    const body: any = {
      contents: [{ role: "user", parts }],
      generationConfig: {
        temperature,
        responseMimeType,
      },
    };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      if (!res.ok) {
        return { ok: false, status: res.status, text };
      }
      // Extract text from response
      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch {
        return { ok: false, status: 600, text: "Non-JSON response" };
      }
      const out =
        parsed?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") ||
        "";
      return { ok: true, status: 200, text: out };
    } catch (e: any) {
      return { ok: false, status: 0, text: e.message };
    }
  }

  stats(): { totalRequests: number; totalErrors: number; perKey: any[] } {
    return {
      totalRequests: this.keys.reduce((s, k) => s + k.totalRequests, 0),
      totalErrors: this.keys.reduce((s, k) => s + k.totalErrors, 0),
      perKey: this.keys.map((k) => ({
        index: k.index + 1,
        total: k.totalRequests,
        today: k.requestsToday,
        thisMinute: k.requestsThisMinute,
        errors: k.totalErrors,
        coolingDown: Date.now() < k.cooldownUntil,
      })),
    };
  }

  keyCount(): number {
    return this.keys.length;
  }
}
