import { createHmac, randomBytes, timingSafeEqual } from "crypto";

// If MFA_TOKEN_SECRET is not set, generate a random key at startup.
// Tokens are valid for 10 minutes, so a restart (resetting this key)
// only invalidates tokens from in-progress logins — acceptable.
const SECRET =
  process.env.MFA_TOKEN_SECRET ?? randomBytes(32).toString("hex");

const TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Create a short-lived signed token that binds a userId to an MFA challenge.
 * Format: `<userId>|<expiry>|<hmac-sha256>`
 */
export function createMfaToken(userId: string): string {
  const expiry = Date.now() + TTL_MS;
  const payload = `${userId}|${expiry}`;
  const sig = createHmac("sha256", SECRET).update(payload).digest("hex");
  return Buffer.from(`${payload}|${sig}`).toString("base64url");
}

/**
 * Verify a signed MFA token. Returns the userId on success, or null if the
 * token is invalid, expired, or tampered with.
 */
export function verifyMfaToken(token: string): string | null {
  let decoded: string;
  try {
    decoded = Buffer.from(token, "base64url").toString("utf8");
  } catch {
    return null;
  }

  const parts = decoded.split("|");
  if (parts.length !== 3) return null;

  const [userId, expiryStr, sig] = parts;

  const expiry = parseInt(expiryStr, 10);
  if (isNaN(expiry) || Date.now() > expiry) return null;

  const payload = `${userId}|${expiryStr}`;
  const expected = createHmac("sha256", SECRET).update(payload).digest("hex");

  // Constant-time comparison to prevent timing attacks
  const sigBuf = Buffer.from(sig, "hex");
  const expectedBuf = Buffer.from(expected, "hex");
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!timingSafeEqual(sigBuf, expectedBuf)) return null;

  return userId;
}
