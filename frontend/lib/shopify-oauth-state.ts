import { createHmac, timingSafeEqual } from "crypto";

const TTL_MS = 15 * 60 * 1000;

function getSecret() {
  const s = process.env.SHOPIFY_OAUTH_STATE_SECRET;
  if (!s) throw new Error("SHOPIFY_OAUTH_STATE_SECRET is not set");
  return s;
}

export function signOAuthState(userId: string): string {
  const payload = Buffer.from(
    JSON.stringify({ userId, exp: Date.now() + TTL_MS }),
    "utf8",
  ).toString("base64url");
  const sig = createHmac("sha256", getSecret())
    .update(payload)
    .digest("hex");
  return `${payload}.${sig}`;
}

export function verifyOAuthState(state: string): { userId: string } | null {
  const [payload, sig] = state.split(".");
  if (!payload || !sig) return null;
  const expected = createHmac("sha256", getSecret())
    .update(payload)
    .digest("hex");
  try {
    if (
      sig.length !== expected.length ||
      !timingSafeEqual(Buffer.from(sig, "utf8"), Buffer.from(expected, "utf8"))
    ) {
      return null;
    }
  } catch {
    return null;
  }
  try {
    const data = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as { userId: string; exp: number };
    if (typeof data.userId !== "string" || typeof data.exp !== "number")
      return null;
    if (Date.now() > data.exp) return null;
    return { userId: data.userId };
  } catch {
    return null;
  }
}
