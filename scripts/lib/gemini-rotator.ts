/**
 * GeminiKeyRotator
 *
 * Cycles across BOTH API keys AND models to maximize throughput.
 * Each key-model combination has its own rate limit bucket, so using
 * multiple models multiplies the effective rate limit.
 *
 * With 12 keys and 4 models, the combined free tier throughput is:
 *   12 * (20 + 10 + 5 + 10) / 60 = ~9 requests per second
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
  maxRetries: number;
  /** Models to cycle through, in priority order */
  models: string[];
  verifyModel: string;
}

const DEFAULT_MODELS = [
  "gemini-2.5-flash",       // 20 RPM when available
  "gemini-2.5-flash-lite",  // 10 RPM separate quota
  "gemini-3.5-flash",       // 5 RPM separate quota
  "gemini-flash-latest",    // separate quota
];

const DEFAULT_CONFIG: RotatorConfig = {
  maxRetries: 40,
  models: DEFAULT_MODELS,
  verifyModel: "gemini-2.5-flash",
};

// Per-model RPM limits (free tier, shared across keys in same project)
const MODEL_RPM: Record<string, number> = {
  "gemini-2.5-flash": 20,
  "gemini-2.5-flash-lite": 10,
  "gemini-3.5-flash": 5,
  "gemini-flash-latest": 10,
  "gemini-3-flash-preview": 10,
  "gemini-flash-lite-latest": 10,
};

export class GeminiKeyRotator {
  private keys: RotatorKeyState[] = [];
  private config: RotatorConfig;
  private nextKeyIndex = 0;
  private nextModelIndex = 0;
  private modelCooldowns: Map<string, number> = new Map();
  private modelRequestCounts: Map<string, number> = new Map();
  private minIntervalMs: number;
  private _lastFire = 0;
  private _lastMinute = 0;

  constructor(config: Partial<RotatorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    const rawKeys = this.loadKeysFromEnv();
    if (rawKeys.length === 0) {
      throw new Error(
        "No Gemini API keys found. Set GEMINI_API_KEYS (comma separated)."
      );
    }
    this.keys = rawKeys.map((key, index) => ({
      index, key,
      requestsThisMinute: 0, requestsToday: 0,
      cooldownUntil: 0,
      totalRequests: 0, totalErrors: 0, totalSuccess: 0,
    }));

    // Calculate safe interval. Sum of all model RPMs * keys / 60 * 0.6 safety
    const totalRPM = this.config.models.reduce(
      (sum, m) => sum + (MODEL_RPM[m] || 10), 0
    );
    const safeRPS = (totalRPM * 0.6) / 60;
    this.minIntervalMs = Math.max(Math.ceil(1000 / safeRPS), 500);

    console.log(
      `[rotator] ${rawKeys.length} keys, ${this.config.models.length} models, ` +
      `total RPM: ${totalRPM}, interval: ${this.minIntervalMs}ms`
    );
  }

  private loadKeysFromEnv(): string[] {
    if (process.env.GEMINI_API_KEYS) {
      return process.env.GEMINI_API_KEYS.split(",").map(k => k.trim()).filter(Boolean);
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
      this.modelRequestCounts.clear();
    }
  }

  private pickKey(): RotatorKeyState | null {
    this.resetMinuteIfNeeded();
    const now = Date.now();
    for (let i = 0; i < this.keys.length; i++) {
      const idx = (this.nextKeyIndex + i) % this.keys.length;
      const k = this.keys[idx];
      if (now < k.cooldownUntil) continue;
      this.nextKeyIndex = (idx + 1) % this.keys.length;
      return k;
    }
    return null;
  }

  private pickModel(): string | null {
    const now = Date.now();
    for (let i = 0; i < this.config.models.length; i++) {
      const idx = (this.nextModelIndex + i) % this.config.models.length;
      const model = this.config.models[idx];
      const cooldown = this.modelCooldowns.get(model) || 0;
      if (now < cooldown) continue;
      const used = this.modelRequestCounts.get(model) || 0;
      const limit = MODEL_RPM[model] || 10;
      if (used >= limit) continue;
      this.nextModelIndex = (idx + 1) % this.config.models.length;
      return model;
    }
    return null;
  }

  private findEarliestFree(): number {
    const now = Date.now();
    let earliest = Infinity;
    for (const [model, cd] of this.modelCooldowns) {
      if (now >= cd) return now;
      earliest = Math.min(earliest, cd);
    }
    for (const k of this.keys) {
      if (now >= k.cooldownUntil) return now;
      earliest = Math.min(earliest, k.cooldownUntil);
    }
    return earliest === Infinity ? now + 1000 : earliest;
  }

  private async pace(): Promise<void> {
    const elapsed = Date.now() - this._lastFire;
    const wait = this.minIntervalMs - elapsed;
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    this._lastFire = Date.now();
  }

  async generateContent(
    prompt: string,
    opts?: {
      temperature?: number;
      responseMimeType?: "application/json" | "text/plain";
      inlineData?: { mimeType: string; data: string };
      model?: string; // force specific model
    }
  ): Promise<string> {
    const temperature = opts?.temperature ?? 0.8;
    const responseMimeType = opts?.responseMimeType || "application/json";
    let lastErr: Error | null = null;

    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      await this.pace();

      const key = this.pickKey();
      const model = opts?.model || this.pickModel();

      if (!key || !model) {
        const wait = this.findEarliestFree() - Date.now();
        if (attempt % 10 === 0) {
          console.warn(
            `[rotator] All resources busy. Waiting ${(Math.max(wait, 1000) / 1000).toFixed(1)}s. ` +
            `(attempt ${attempt + 1})`
          );
        }
        await new Promise(r => setTimeout(r, Math.max(wait, 1000)));
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
        const mc = this.modelRequestCounts.get(model) || 0;
        this.modelRequestCounts.set(model, mc + 1);
        return result.text;
      }

      key.totalErrors++;

      // Cooldown based on retry hint or default 60s
      let cooldownMs = 62000;
      if (result.retryAfterSec) cooldownMs = result.retryAfterSec * 1000;

      key.cooldownUntil = Date.now() + cooldownMs;
      this.modelCooldowns.set(model, Date.now() + cooldownMs);

      if (attempt < 3 || attempt % 10 === 0) {
        console.warn(
          `[rotator] Key#${key.index + 1} ${model} ${result.status}. ` +
          `Cooldown ${(cooldownMs / 1000).toFixed(0)}s. (attempt ${attempt + 1})`
        );
      }

      lastErr = new Error(
        result.status === 429 ? `Rate limited on ${model}` :
        `Gemini ${result.status}: ${result.text.slice(0, 80)}`
      );
    }

    throw lastErr || new Error("Gemini call failed after all retries.");
  }

  private async callGemini(
    apiKey: string, model: string, prompt: string,
    temperature: number, responseMimeType: string,
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
        const m = text.match(/retry in ([\d.]+)s/i);
        if (m) retryAfterSec = Math.ceil(parseFloat(m[1])) + 3;
        const hr = res.headers.get("retry-after");
        if (hr) retryAfterSec = parseInt(hr) + 3;
        return { ok: false, status: res.status, text, retryAfterSec };
      }
      let parsed: any;
      try { parsed = JSON.parse(text); }
      catch { return { ok: false, status: 600, text: "Non-JSON" }; }
      const out = parsed?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") || "";
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
      modelCooldowns: Object.fromEntries(this.modelCooldowns),
    };
  }

  keyCount(): number { return this.keys.length; }
  modelCount(): number { return this.config.models.length; }
}
