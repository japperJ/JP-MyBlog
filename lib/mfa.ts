// Import from otplib v13
import { generateSecret, generateURI, verify } from 'otplib';
import QRCode from 'qrcode';

/**
 * Generate a new MFA secret for a user
 */
export function generateMFASecret(): string {
  return generateSecret();
}

/**
 * Generate OTP Auth URL for QR code
 */
export function generateOTPAuthURL(email: string, secret: string): string {
  return generateURI({
    secret,
    label: email,
    issuer: 'AI Coding Blog',
    type: 'totp',
  });
}

/**
 * Generate QR code data URL from OTP Auth URL
 */
export async function generateQRCode(otpAuthURL: string): Promise<string> {
  try {
    return await QRCode.toDataURL(otpAuthURL);
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Verify a TOTP token against a secret
 */
export function verifyTOTP(token: string, secret: string): boolean {
  try {
    const result = verify({ token, secret });
    return result;
  } catch (error) {
    console.error('Error verifying TOTP:', error);
    return false;
  }
}

/**
 * Generate MFA setup data (secret and QR code)
 */
export async function generateMFASetup(email: string): Promise<{
  secret: string;
  qrCode: string;
  otpAuthURL: string;
}> {
  const secret = generateMFASecret();
  const otpAuthURL = generateOTPAuthURL(email, secret);
  const qrCode = await generateQRCode(otpAuthURL);

  return {
    secret,
    qrCode,
    otpAuthURL,
  };
}
