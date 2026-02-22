'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AdminNavigation } from '@/components/admin-navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Shield, ShieldCheck, ShieldOff, ShieldAlert } from 'lucide-react';
import Image from 'next/image';

export default function MFASettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mfaForcedByAdmin = searchParams.get('mfa-required') === '1';
  const [loading, setLoading] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [setupMode, setSetupMode] = useState(false);
  const [qrCode, setQrCode] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    checkMFAStatus();
  }, []);

  async function checkMFAStatus() {
    try {
      const response = await fetch('/api/auth/session');
      const data = await response.json();

      if (data.user?.mfaEnabled) setMfaEnabled(true);
      if (data.user?.mfaRequired) setMfaRequired(true);

      // Auto-start setup if MFA is required but not yet configured
      if (data.user?.mfaRequired && !data.user?.mfaEnabled) {
        startMFASetup();
      }
    } catch (error) {
      console.error('Failed to check MFA status:', error);
    }
  }

  async function startMFASetup() {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/auth/mfa/generate', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to generate MFA setup');
      }

      const data = await response.json();
      setSecret(data.secret);
      setQrCode(data.qrCode);
      setSetupMode(true);
    } catch (error) {
      setError('Failed to start MFA setup. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function enableMFA() {
    if (verificationCode.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/auth/mfa/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: verificationCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to enable MFA');
      }

      setSuccess('MFA enabled successfully!');
      setMfaEnabled(true);
      setSetupMode(false);
      setVerificationCode('');
      
      setTimeout(() => router.refresh(), 1500);
    } catch (error: any) {
      setError(error.message || 'Failed to enable MFA. Please verify your code.');
    } finally {
      setLoading(false);
    }
  }

  async function disableMFA() {
    if (!confirm('Are you sure you want to disable MFA? This will make your account less secure.')) {
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/auth/mfa/disable', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to disable MFA');
      }

      setSuccess('MFA disabled successfully');
      setMfaEnabled(false);
      
      setTimeout(() => router.refresh(), 1500);
    } catch (error: any) {
      setError(error.message || 'Failed to disable MFA');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNavigation />
      
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Security Settings</h1>
          <p className="text-muted-foreground">
            Manage two-factor authentication for enhanced account security
          </p>
        </div>

        {(mfaForcedByAdmin || (mfaRequired && !mfaEnabled)) && (
          <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-amber-800 dark:text-amber-300">MFA setup required</p>
              <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                Your administrator requires you to enable two-factor authentication before you can
                access the admin panel. Please complete the setup below.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-600 dark:text-green-400">
            {success}
          </div>
        )}

        <Card className="p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 bg-primary/10 rounded-lg">
              {mfaEnabled ? (
                <ShieldCheck className="h-8 w-8 text-green-600" />
              ) : (
                <Shield className="h-8 w-8 text-primary" />
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold mb-1">
                Two-Factor Authentication (MFA)
              </h2>
              <p className="text-sm text-muted-foreground">
                Add an extra layer of security to your account with time-based one-time passwords (TOTP)
              </p>
            </div>
          </div>

          {!mfaEnabled && !setupMode && (
            <div className="space-y-4">
              <p className="text-sm">
                When enabled, you'll need to enter a code from your authenticator app
                (like Google Authenticator or Authy) in addition to your password when logging in.
              </p>
              <Button onClick={startMFASetup} disabled={loading}>
                {loading ? 'Setting up...' : 'Enable MFA'}
              </Button>
            </div>
          )}

          {setupMode && (
            <div className="space-y-6">
              <div className="border rounded-lg p-6 space-y-4">
                <h3 className="font-semibold">Step 1: Scan QR Code</h3>
                <p className="text-sm text-muted-foreground">
                  Scan this QR code with your authenticator app:
                </p>
                {qrCode && (
                  <div className="flex justify-center py-4">
                    <Image
                      src={qrCode}
                      alt="MFA QR Code"
                      width={200}
                      height={200}
                      className="border rounded-lg"
                    />
                  </div>
                )}
                <div className="bg-muted p-3 rounded text-center font-mono text-sm break-all">
                  {secret}
                </div>
                <p className="text-xs text-muted-foreground">
                  Save this secret key in a safe place. You'll need it if you lose access to your authenticator app.
                </p>
              </div>

              <div className="border rounded-lg p-6 space-y-4">
                <h3 className="font-semibold">Step 2: Verify Code</h3>
                <p className="text-sm text-muted-foreground">
                  Enter the 6-digit code from your authenticator app:
                </p>
                <Input
                  type="text"
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  className="text-center text-2xl tracking-widest"
                />
                <div className="flex gap-3">
                  <Button onClick={enableMFA} disabled={loading || verificationCode.length !== 6}>
                    {loading ? 'Verifying...' : 'Enable MFA'}
                  </Button>
                  <Button variant="outline" onClick={() => setSetupMode(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          {mfaEnabled && !setupMode && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <ShieldCheck className="h-5 w-5" />
                <span className="font-medium">MFA is currently enabled</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Your account is protected with two-factor authentication.
                You'll be prompted for a code from your authenticator app when logging in.
              </p>
              {mfaRequired ? (
                <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                  <ShieldAlert className="h-4 w-4" />
                  MFA is required by your administrator and cannot be disabled.
                </div>
              ) : (
                <Button variant="destructive" onClick={disableMFA} disabled={loading}>
                  <ShieldOff className="h-4 w-4 mr-2" />
                  {loading ? 'Disabling...' : 'Disable MFA'}
                </Button>
              )}
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
