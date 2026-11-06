import React, { useState } from 'react';
import { Fingerprint, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/devToast';
import { registerFingerprint, isPlatformAuthenticatorAvailable, isWebAuthnSupported } from '@/lib/fingerprintAuth';

// Two-step honesty flow for enabling fingerprint unlock:
//  1. "Does your device have a fingerprint sensor?"  Yes / No
//     - No  -> cancel (does NOT lock out the option; just cancels this attempt)
//  2. Warning: if it doesn't really have one, this won't work. Please be honest.
//     Then ask again. Yes -> register via WebAuthn. No -> cancel.
export default function FingerprintSetup({ user, onEnabled, onCancel }) {
  const [step, setStep] = useState('ask'); // 'ask' | 'confirm' | 'registering'
  const [busy, setBusy] = useState(false);

  const handleFirstYes = () => setStep('confirm');
  const handleCancel = () => onCancel?.();

  const handleConfirmYes = async () => {
    if (!isWebAuthnSupported()) {
      toast.error('Your browser does not support biometric authentication.');
      handleCancel();
      return;
    }
    setBusy(true);
    setStep('registering');
    try {
      const available = await isPlatformAuthenticatorAvailable();
      if (!available) {
        toast.error('No biometric sensor found on this device.');
        handleCancel();
        return;
      }
      await registerFingerprint(user);
      toast.success('Fingerprint unlock enabled!');
      onEnabled?.();
    } catch (e) {
      console.warn('Fingerprint registration failed', e);
      toast.error('Fingerprint setup was cancelled or failed.');
      handleCancel();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl">
        <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600">
          {busy ? <Loader2 className="w-8 h-8 text-white animate-spin" /> : <Fingerprint className="w-8 h-8 text-white" />}
        </div>

        {step === 'ask' && (
          <>
            <h2 className="text-xl font-bold text-gray-800 text-center mb-2">Fingerprint Sensor?</h2>
            <p className="text-gray-600 text-center text-sm mb-6">
              Does your device have a fingerprint sensor?
            </p>
            <div className="space-y-3">
              <Button onClick={handleFirstYes} className="w-full bg-blue-600 hover:bg-blue-700">
                Yes, it does
              </Button>
              <Button onClick={handleCancel} variant="outline" className="w-full">
                No, it doesn't
              </Button>
            </div>
          </>
        )}

        {step === 'confirm' && (
          <>
            <div className="flex items-center justify-center mb-3">
              <AlertTriangle className="w-8 h-8 text-amber-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 text-center mb-2">Please Be Honest</h2>
            <p className="text-gray-600 text-center text-sm mb-6">
              If your device does not have a fingerprint sensor, this option will not work.
              Please confirm — does your device really have one?
            </p>
            <div className="space-y-3">
              <Button onClick={handleConfirmYes} className="w-full bg-blue-600 hover:bg-blue-700">
                Yes, set it up
              </Button>
              <Button onClick={handleCancel} variant="outline" className="w-full">
                No, cancel
              </Button>
            </div>
          </>
        )}

        {step === 'registering' && (
          <div className="text-center py-4">
            <p className="text-gray-700 font-medium text-sm">Follow your device's prompt to register your fingerprint…</p>
          </div>
        )}
      </div>
    </div>
  );
}