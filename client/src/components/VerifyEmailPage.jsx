import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Mail,
  ArrowRight,
  RefreshCw,
  ShieldCheck,
  KeyRound
} from 'lucide-react';
import {
  apiPost,
  normalizeEmailInput,
  validateEmailFormat,
  formatCooldownLabel
} from '../utils/auth';

const verificationRequestCache = new Map();

export default function VerifyEmailPage({
  token,
  onGoToLogin,
  onGoHome
}) {
  const [status, setStatus] = useState(token ? 'verifying' : 'form'); // 'form' | 'verifying' | 'success'
  const [message, setMessage] = useState(
    token
      ? 'Verifying your email OTP with PetPaws security…'
      : 'Enter your registered email address and the 6-digit verification OTP sent to your inbox.'
  );
  const [verifiedUser, setVerifiedUser] = useState(null);

  const [emailInput, setEmailInput] = useState('');
  const [otpInput, setOtpInput] = useState(token ? String(token).replace(/\D/g, '').slice(0, 6) : '');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    if (!token) return undefined;

    let cancelled = false;
    setStatus('verifying');

    let requestPromise = verificationRequestCache.get(token);
    if (!requestPromise) {
      requestPromise = apiPost('/api/auth/verify-otp', { otp: token });
      verificationRequestCache.set(token, requestPromise);
    }

    requestPromise
      .then((data) => {
        if (cancelled) return;
        if (data && data.success) {
          setStatus('success');
          setVerifiedUser(data.user || null);
          setMessage(
            data.message ||
              'Your email address has been verified! You can now sign in to your PetPaws account.'
          );
        } else {
          setStatus('form');
          setErrorMsg(
            (data && data.message) ||
              'Verification OTP is invalid, expired, or has already been used.'
          );
        }
      })
      .catch(() => {
        if (cancelled) return;
        setStatus('form');
        setErrorMsg('Unable to reach the verification service. Please check your connection and try again.');
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setFeedback('');

    const emailCheck = validateEmailFormat(emailInput);
    if (!emailCheck.valid) {
      setErrorMsg(emailCheck.message || 'Please enter a valid email address.');
      return;
    }

    const cleanOtp = otpInput.replace(/\D/g, '').trim();
    if (cleanOtp.length !== 6) {
      setErrorMsg('Please enter your 6-digit verification OTP.');
      return;
    }

    setLoading(true);
    try {
      const data = await apiPost('/api/auth/verify-otp', {
        email: emailCheck.normalized,
        otp: cleanOtp
      });

      if (data && data.success) {
        setStatus('success');
        setVerifiedUser(data.user || null);
        setMessage(
          data.message ||
            'Your email address has been verified! You can now sign in to your PetPaws account.'
        );
      } else {
        setErrorMsg((data && data.message) || 'Invalid or expired verification OTP.');
      }
    } catch {
      setErrorMsg('Network error while verifying OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!emailInput.trim() || cooldown > 0) {
      if (!emailInput.trim()) setErrorMsg('Please enter a valid email address.');
      return;
    }
    const emailCheck = validateEmailFormat(emailInput);
    if (!emailCheck.valid) {
      setErrorMsg(emailCheck.message || 'Please enter a valid email address.');
      return;
    }

    setErrorMsg('');
    setFeedback('');
    setLoading(true);

    try {
      const data = await apiPost('/api/auth/resend-otp', {
        email: emailCheck.normalized
      });
      if (data && data.success) {
        setEmailInput(emailCheck.normalized);
        setOtpInput('');
        setFeedback(
          data.message ||
            'If an unverified account exists with that email address, a new 6-digit verification OTP has been sent.'
        );
        setCooldown(data.cooldown_seconds || 60);
      } else {
        if (data && (data.retry_after_seconds || data.cooldown_seconds)) {
          setCooldown(Number(data.retry_after_seconds || data.cooldown_seconds));
        }
        setErrorMsg(
          (data && data.message) || 'Could not resend verification OTP. Please try again later.'
        );
      }
    } catch {
      setErrorMsg('Network error while requesting a new verification OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="min-h-[calc(100vh-12rem)] flex items-center justify-center px-4 py-10 sm:py-16 animate-fadeIn">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-aesthetic border border-[#EFE9DF] overflow-hidden">
        {/* Top Branded Banner */}
        <div className="bg-gradient-to-r from-[#E07A5F] via-[#F4A261] to-[#E76F51] p-6 text-white text-center">
          <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center text-white text-2xl mx-auto mb-2.5 shadow border border-white/30">
            🐾
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold font-display">
            Email OTP Verification
          </h1>
          <p className="text-white/90 text-xs mt-1 font-medium">
            PetPaws Account Security &amp; Ownership Confirmation
          </p>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          {/* VERIFYING STATE */}
          {status === 'verifying' && (
            <div className="text-center py-6 space-y-4">
              <div className="w-14 h-14 rounded-full bg-[#FFF5F0] border border-[#F4C4B7] flex items-center justify-center mx-auto text-[#E07A5F]">
                <RefreshCw className="w-7 h-7 animate-spin" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-base font-extrabold text-[#231F20]">
                  Confirming your verification OTP…
                </h2>
                <p className="text-xs text-[#65605B] leading-relaxed">{message}</p>
              </div>
            </div>
          )}

          {/* SUCCESS STATE */}
          {status === 'success' && (
            <div className="text-center space-y-5">
              <div className="w-16 h-16 rounded-full bg-[#EAEFE9] border border-[#D1E7DD] flex items-center justify-center mx-auto text-[#2A5C4A]">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAEFE9] text-[#2A5C4A] text-[11px] font-extrabold uppercase tracking-wider">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Verified Account
                </span>
                <h2 className="text-lg sm:text-xl font-black text-[#231F20] font-display">
                  Your Email Is Verified!
                </h2>
                <p className="text-xs sm:text-sm text-[#4A4344] leading-relaxed">
                  {message}
                </p>
              </div>

              {verifiedUser && (
                <div className="p-3.5 rounded-2xl bg-[#FAF6F0] border border-[#E6DCCF] text-left text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#65605B]">Account Holder</span>
                    <strong className="text-[#231F20]">{verifiedUser.name}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#65605B]">Email</span>
                    <strong className="text-[#231F20] truncate max-w-[200px]">{verifiedUser.email}</strong>
                  </div>
                  {verifiedUser.role && (
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#65605B]">Account Role</span>
                      <span className="px-2 py-0.5 rounded-full bg-white border border-[#E6DCCF] text-[10px] font-extrabold uppercase text-[#52796F]">
                        {verifiedUser.role}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => onGoToLogin?.(verifiedUser?.email || emailInput || '', verifiedUser?.role || '')}
                  className="w-full py-3.5 bg-gradient-to-r from-[#E07A5F] via-[#F4A261] to-[#E76F51] hover:from-[#D96B43] text-white font-extrabold rounded-xl shadow-md shadow-[#E07A5F]/20 transition-all text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Proceed to Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onGoHome?.()}
                  className="w-full py-2.5 bg-[#FAF6F0] hover:bg-[#EFE9DF] text-[#4A4344] font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Explore PetPaws Marketplace
                </button>
              </div>
            </div>
          )}

          {/* OTP INPUT FORM STATE */}
          {status === 'form' && (
            <div className="space-y-5">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-full bg-[#FFF5F0] border border-[#F4C4B7] flex items-center justify-center mx-auto text-[#E07A5F]">
                  <KeyRound className="w-7 h-7" />
                </div>
                <h2 className="text-lg font-extrabold text-[#231F20] font-display">
                  Enter Your 6-Digit OTP
                </h2>
                <p className="text-xs text-[#65605B] leading-relaxed">
                  {message}
                </p>
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700 text-center">
                  ⚠️ {errorMsg}
                </div>
              )}

              {feedback && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>{feedback}</span>
                </div>
              )}

              <form onSubmit={handleVerifySubmit} className="space-y-3.5">
                <div>
                  <label htmlFor="verify-page-email" className="block text-xs font-semibold text-[#4A4344] mb-1">
                    Registered Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#8C847C] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="verify-page-email"
                      type="email"
                      required
                      placeholder="you@example.com"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl text-xs font-semibold text-[#231F20] focus:outline-none focus:border-[#E07A5F] focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="verify-page-otp" className="block text-xs font-bold text-[#4A4344] mb-1 text-center uppercase tracking-wider">
                    6-Digit Verification OTP
                  </label>
                  <input
                    id="verify-page-otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    required
                    placeholder="000000"
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full py-3 px-4 bg-[#FAF6F0] border-2 border-[#E6DCCF] rounded-2xl text-center font-mono text-2xl font-black tracking-[0.35em] text-[#231F20] focus:outline-none focus:border-[#E07A5F] focus:bg-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || otpInput.replace(/\D/g, '').length !== 6}
                  className="w-full py-3 bg-gradient-to-r from-[#E07A5F] via-[#F4A261] to-[#E76F51] hover:from-[#D96B43] disabled:opacity-60 text-white font-extrabold rounded-xl shadow-md shadow-[#E07A5F]/20 text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{loading ? 'Verifying OTP…' : 'Verify OTP & Activate Account'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <button
                type="button"
                disabled={loading || cooldown > 0}
                onClick={handleResendOtp}
                className="w-full py-2.5 bg-[#52796F] hover:bg-[#3E5E56] disabled:bg-gray-300 text-white font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                {loading
                  ? 'Sending OTP…'
                  : cooldown > 0
                  ? `Resend OTP (${formatCooldownLabel(cooldown)})`
                  : 'Resend Verification OTP'}
              </button>

              <div className="flex items-center justify-between gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => onGoHome?.()}
                  className="flex-1 py-2.5 bg-[#FAF6F0] hover:bg-[#EFE9DF] text-[#4A4344] font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  ← Marketplace
                </button>
                <button
                  type="button"
                  onClick={() => onGoToLogin?.(emailInput || '')}
                  className="flex-1 py-2.5 bg-white hover:bg-[#FAF6F0] text-[#E07A5F] border border-[#F4C4B7] font-extrabold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Return to Login →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
