import { createHmac, randomBytes, timingSafeEqual } from "crypto";

const TTL_MS = 10 * 60 * 1000;

function getMfaTokenSecret(): string {
  const configuredSecret = process.env.MFA_TOKEN_SECRET?.trim();

  if (configuredSecret) {
    return configuredSecret;
  }

  const isVercelHosted =
    process.env.VERCEL === "1" ||
    process.env.VERCEL === "true" ||
    Boolean(process.env.VERCEL_URL);

  if (isVercelHosted) {
    throw new Error(
      "MFA_TOKEN_SECRET is required for Vercel-hosted deployments so login and MFA verification share the same signing secret."
    );
  }

  return randomBytes(32).toString("hex");
}

const SECRET = getMfaTokenSecret();

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
  if (parts.length != 3) {
    return null;
  }

  const [userId, expiryStr, sig] = parts;
  const expiry = Number.parseInt(expiryStr, 10);

  if (Number.isNaN(expiry) || Date.now() > expiry) {
    return null;
  }

  const payload = `${userId}|${expiryStr}`;
  const expected = createHmac("sha256", SECRET).update(payload).digest("hex");
  const sigBuf = Buffer.from(sig, "hex");
  const expectedBuf = Buffer.from(expected, "hex");

  if (sigBuf.length !== expectedBuf.length) {
    return null;
  }

  if (!timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  return userId;
}
