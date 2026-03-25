import React, { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { MessageSquare, Phone, ArrowRight, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Login() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  useEffect(() => {
    if (!(window as any).recaptchaVerifier) {
      (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
      });
    }
  }, []);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.startsWith('+')) {
      setError('Please include country code (e.g., +1)');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const appVerifier = (window as any).recaptchaVerifier;
      const result = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      setConfirmationResult(result);
      setStep('otp');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResult) return;
    setLoading(true);
    setError('');
    try {
      await confirmationResult.confirm(otp);
    } catch (err: any) {
      console.error(err);
      setError('Invalid OTP code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-[#111b21] p-6 text-[#e9edef]">
      <div id="recaptcha-container"></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-8"
      >
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[#00a884]">
            <MessageSquare className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">ChatWave</h1>
          <p className="mt-2 text-[#8696a0]">Connect with friends and family</p>
        </div>

        <AnimatePresence mode="wait">
          {step === 'phone' ? (
            <motion.form
              key="phone-step"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={handleSendOtp}
              className="space-y-6 rounded-2xl bg-[#202c33] p-8 shadow-xl"
            >
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#00a884]">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8696a0]" />
                  <input
                    type="tel"
                    placeholder="+1 234 567 8900"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full rounded-lg bg-[#2a3942] py-3 pl-10 pr-4 text-white outline-none ring-[#00a884] transition-all focus:ring-2"
                    required
                  />
                </div>
                <p className="text-xs text-[#8696a0]">We'll send a verification code to this number.</p>
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#00a884] py-3 font-semibold text-white transition-all hover:bg-[#008f6f] disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Next'}
                <ArrowRight className="h-5 w-5" />
              </button>
            </motion.form>
          ) : (
            <motion.form
              key="otp-step"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleVerifyOtp}
              className="space-y-6 rounded-2xl bg-[#202c33] p-8 shadow-xl"
            >
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#00a884]">Enter Code</label>
                <input
                  type="text"
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full rounded-lg bg-[#2a3942] py-3 px-4 text-center text-2xl tracking-[0.5em] text-white outline-none ring-[#00a884] transition-all focus:ring-2"
                  maxLength={6}
                  required
                />
                <p className="text-center text-xs text-[#8696a0]">
                  Enter the 6-digit code sent to <span className="text-white">{phoneNumber}</span>
                </p>
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep('phone')}
                  className="flex-1 rounded-lg bg-[#2a3942] py-3 font-semibold text-white transition-all hover:bg-[#374954]"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-[2] flex items-center justify-center gap-2 rounded-lg bg-[#00a884] py-3 font-semibold text-white transition-all hover:bg-[#008f6f] disabled:opacity-50"
                >
                  {loading ? 'Verifying...' : 'Verify'}
                  <Check className="h-5 w-5" />
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
