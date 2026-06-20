/**
 * GeminiKeyRotator
 *
 * Round-robin across Gemini API keys with proactive rate limiting.
 * The core design: cycle through keys one at a time, with a minimum delay
 * between requests that keeps every key well under its per-minute ceiling.
 *
 * With N keys and an RPM limit of R per key:
 *   - We fire at most 1 request every (60 / (N * R * 0.7)) seconds
 *   - This gives ~70% of max throughput while staying safely under limits
 *   - Each key gets used roughly once every N requests, so its personal
 *     RPM stays far below the ceiling
 *
 * Spec reference: UDST_AMP_PRACTICE_BUILD_SPEC.md Section 22.
 */

export interface RotatorKeyState {
  index: number;
  key: string;
  requestsThisMinute: number;
  requestsToday: number;
  cooldownUntil: number;
  totalRequests: number;
  totalErrors: number;
  totalSuccess: number;
}

export interface RotatorConfig {
  rpmPerKey: number;
  rpdPerKey: number;
  maxRetries: number;
  generationModel: string;
  fallbackModel: string;
  verifyModel: string;
}

const DEFAULT_CONFIG: RotatorConfig = {
  rpmPerKey: Number(process.env.GEMINI_RPM_PER_KEY) || 20,
  rpdPerKey: Number(process.env.GEMINI_RPD_PER_KEY) || 250,
  maxRetries: 30,
  generationModel: process.env.GEMINI_GENERATION_MODEL || "gemini-2.5-flash",
  fallbackModel: process.env.GEMINI_FALLBACK_MODEL || "gemini-2.5-flash-lite",
  verifyModel: process.env.GEMINI_VERIFY_MODEL || "gemini-2.5-flash",
};

export class GeminiKeyRotator {
  private keys: RotatorKeyState[] = [];
  private config: RotatorConfig;
  private nextKeyIndex = 0;
  private minIntervalMs: number;

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
      totalSuccess: 0,
    }));

    // Calculate safe minimum interval between requests.
    // With N keys at R RPM each, max throughput = N*R/60 requests per second.
    // We use 70% of that to leave safety margin.
    const maxRPS = (rawKeys.length * this.config.rpmPerKey) / 60;
    const safeRPS = maxRPS * 0.7;
    this.minIntervalMs = Math.ceil(1000 / safeRPS);
    console.log(
      `[rotator] ${rawKeys.length} keys, ${this.config.rpmPerKey} RPM each, ` +
      `safe throughput: ${safeRPS.toFixed(1)} req/s, interval: ${this.minIntervalMs}ms`
    );
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

  private resetMinuteIfNeeded(): void {
    const now = Date.now();
    const currentMinute = Math.floor(now / 60000);
    if (this._lastMinute !== currentMinute) {
      this._lastMinute = currentMinute;
      for (const k of this.keys) k.requestsThisMinute = 0;
    }
  }
  private _lastMinute = 0;

  private pickKey(): RotatorKeyState | null {
    this.resetMinuteIfNeeded();
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

  private findEarliestFree(): number {
    const now = Date.now();
    let earliest = Infinity;
    for (const k of this.keys) {
      if (now >= k.cooldownUntil && k.requestsThisMinute < this.config.rpmPerKey) {
        return now;
      }
      earliest = Math.min(earliest, k.cooldownUntil);
    }
    return earliest === Infinity ? now + 1000 : earliest;
  }

  private sleep(ms: number): Promise<void> {
    return ms > 0 ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve();
  }

  private async pace(): Promise<void> {
    const elapsed = Date.now() - this._lastFire;
    const wait = this.minIntervalMs - elapsed;
    if (wait > 0) await this.sleep(wait);
    this._lastFire = Date.now();
  }
  private _lastFire = 0;

  async generateContent(
    prompt: string,
    opts?: {
      model?: string;
      temperature?: number;
      responseMimeType?: "application/json" | "text/plain";
      inlineData?: { mimeType: string; data: string };
    }
  ): Promise<string> {
    const model = opts?.model || this.config.generationModel;
    const temperature = opts?.temperature ?? 0.7;
    const responseMimeType = opts?.responseMimeType || "application/json";

    let lastErr: Error | null = null;

    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      await this.pace();

      let key = this.pickKey();

      if (!key) {
        const wait = this.findEarliestFree() - Date.now();
        if (attempt === 0 || attempt % 5 === 0) {
          console.warn(
            `[rotator] All keys busy. Waiting ${(Math.max(wait, 1000) / 1000).toFixed(1)}s.`
          );
        }
        await this.sleep(Math.max(wait, 1000));
        continue;
      }

      const result = await this.callGemini(
        key.key, model, prompt, temperature, responseMimeType, opts?.inlineData
      );

      if (result.ok) {
        key.requestsThisMinute++;
        key.requestsToday++;
        key.totalRequests++;
        key.totalSuccess++;
        return result.text;
      }

      key.totalErrors++;

      // Parse retry hint from Gemini error response
      let cooldownMs = 62000; // default: assume 60s rate window
      if (result.retryAfterSec) {
        cooldownMs = result.retryAfterSec * 1000;
      }
      key.cooldownUntil = Date.now() + cooldownMs;

      if (attempt < 3 || attempt % 5 === 0) {
        console.warn(
          `[rotator] Key #${key.index + 1} ${result.status}. ` +
          `Cooldown ${(cooldownMs / 1000).toFixed(0)}s. ` +
          `(attempt ${attempt + 1}/${this.config.maxRetries})`
        );
      }

      lastErr = new Error(
        result.status === 429
          ? `Rate limited`
          : `Gemini ${result.status}: ${result.text.slice(0, 100)}`
      );
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
  ): Promise<{ ok: boolean; status: number; text: string; retryAfterSec?: number }> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const parts: any[] = [{ text: prompt }];
    if (inlineData) parts.unshift({ inlineData });

    const body: any = {
      contents: [{ role: "user", parts }],
      generationConfig: { temperature, responseMimeType },
    };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const text = await res.text();

      if (!res.ok) {
        let retryAfterSec: number | undefined;
        const retryMatch = text.match(/retry in ([\d.]+)s/i);
        if (retryMatch) retryAfterSec = Math.ceil(parseFloat(retryMatch[1])) + 3;
        const headerRetry = res.headers.get("retry-after");
        if (headerRetry) retryAfterSec = parseInt(headerRetry) + 3;
        return { ok: false, status: res.status, text, retryAfterSec };
      }

      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch {
        return { ok: false, status: 600, text: "Non-JSON response" };
      }

      const out =
        parsed?.candidates?.[0]?.content?.parts
          ?.map((p: any) => p.text)
          .join("") || "";
      return { ok: true, status: 200, text: out };
    } catch (e: any) {
      return { ok: false, status: 0, text: e.message };
    }
  }

  stats() {
    return {
      totalRequests: this.keys.reduce((s, k) => s + k.totalRequests, 0),
      totalSuccess: this.keys.reduce((s, k) => s + k.totalSuccess, 0),
      totalErrors: this.keys.reduce((s, k) => s + k.totalErrors, 0),
      perKey: this.keys.map((k) => ({
        index: k.index + 1,
        total: k.totalRequests,
        success: k.totalSuccess,
        today: k.requestsToday,
        errors: k.totalErrors,
        coolingDown: Date.now() < k.cooldownUntil,
      })),
    };
  }

  keyCount(): number {
    return this.keys.length;
  }
}
