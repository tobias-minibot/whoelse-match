import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

const PREFIX = "wek";

export function hashAgentKey(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function hashesEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  if (left.length !== right.length || left.length === 0) return false;
  return timingSafeEqual(left, right);
}

export function parseAgentKey(token: string): { keyId: string; secret: string } | null {
  const m = /^wek_([A-Za-z0-9]+)_([A-Za-z0-9._~+-]+)$/.exec(token.trim());
  if (!m) return null;
  return { keyId: m[1], secret: m[2] };
}

export function mintAgentKey(keyId = randomBytes(8).toString("hex")): { keyId: string; token: string } {
  const secret = randomBytes(24).toString("base64url");
  return { keyId, token: `${PREFIX}_${keyId}_${secret}` };
}

export function isAgentKeyFormat(token: string): boolean {
  return parseAgentKey(token) !== null;
}
