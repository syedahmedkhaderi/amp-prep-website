import * as fs from "fs";
import * as path from "path";

/**
 * Load scripts/.env into process.env if it exists. Called at the top of every
 * pipeline script. Uses a minimal parser to avoid a dotenv dependency.
 */
export function loadScriptsEnv(): void {
  const envPath = path.resolve(process.cwd(), "scripts/.env");
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}
