import React, { useState, useEffect } from 'react';
import {
  Lock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Eye,
  EyeOff,
  RefreshCw,
  ShieldCheck
} from 'lucide-react';
import { apiGet, apiPost } from '../utils/auth';

const resetTokenValidationCache = new Map();

export default function ResetPasswordPage({
  token,
  onGoToLogin,
  onRequestNewResetLink,
  onPasswordResetSuccess
}) {
  const [tokenStatus, setTokenStatus] = useState(token ? 'checking' : 'invalid'); // 'checking' | 'valid' | 'invalid' | 'completed'
  const [tokenErrorMsg, setTokenErrorMsg] = useState(
    token
      ? ''
      : 'Password reset token is missing from this link. Please open the full link sent to your email or request a new reset link.'
  );

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [completedMessage, setCompletedMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setTokenStatus('invalid');
      setTokenErrorMsg(
        'Password reset token is missing from this link. Please open the full link from your email or request a new reset link.'
      );
      return;
    }

    let cancelled = false;
    setTokenStatus('checking');

    let checkPromise = resetTokenValidationCache.get(token);
    if (!checkPromise) {
      checkPromise = apiGet(`/api/auth/verify-reset-token?token=${encodeURIComponent(token)}`);
      resetTokenValidationCache.set(token, checkPromise);
    }

    checkPromise
      .then((data) => {
        if (cancelled) return;
        if (data && data.success && data.valid) {
          setTokenStatus('valid');
        } else {
          setTokenStatus('invalid');
          setTokenErrorMsg(
            (data && data.message) ||
              'This password reset link is invalid, expired, or has already been used.'
          );
        }
      })
      .catch(() => {
        if (cancelled) return;
        setTokenStatus('invalid');
        setTokenErrorMsg('Unable to validate reset link. Please check your connection and try again.');
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!newPassword || newPassword.length < 6) {
      setFormError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setFormError('Passwords do not match. Please re-enter and confirm your password.');
      return;
    }

    setSubmitting(true);
    try {
      const data = await apiPost('/api/auth/reset-password', {
        token,
        new_password: newPassword,
        confirm_password: confirmPassword
      });

      if (data && data.success) {
        resetTokenValidationCache.delete(token);
        setCompletedMessage(
          data.message || 'Password reset successfully! Please sign in with your new password.'
        );
        setTokenStatus('completed');
        onPasswordResetSuccess?.();
      } else {
        const msg =
          (data && data.message) ||
          'Password reset failed. The reset link may have expired or already been used.';
        if (/invalid|expired|already been used/i.test(msg)) {
          setTokenStatus('invalid');
          setTokenErrorMsg(msg);
        } else {
          setFormError(msg);
        }
      }
    } catch {
      setFormError('Network error while resetting your password. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="min-h-[calc(100vh-12rem)] flex items-center justify-center px-4 py-10 sm:py-16 animate-fadeIn">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-aesthetic border border-[#EFE9DF] overflow-hidden">
        {/* Top Branded Header */}
        <div className="bg-gradient-to-r from-[#243D36] via-[#2A4A41] to-[#52796F] p-6 text-white text-center">
          <div className="w-12 h-12 bg-white/15 backdrop-blur rounded-2xl flex items-center justify-center text-white text-2xl mx-auto mb-2.5 shadow border border-white/25">
            🔒
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold font-display">
            Reset Your Password
          </h1>
          <p className="text-[#C5DFD2] text-xs mt-1 font-medium">
            Choose a strong new password for your PetPaws account
          </p>
        </div>

        <div className="p-6 sm:p-8 space-y-5">
          {/* CHECKING TOKEN STATE */}
          {tokenStatus === 'checking' && (
            <div className="text-center py-6 space-y-4">
              <div className="w-14 h-14 rounded-full bg-[#EAEFE9] border border-[#D1E7DD] flex items-center justify-center mx-auto text-[#2A5C4A]">
                <RefreshCw className="w-7 h-7 animate-spin" />
              </div>
              <div className="space-y-1">
                <h2 className="text-base font-extrabold text-[#231F20]">
                  Verifying your secure reset link…
                </h2>
                <p className="text-xs text-[#65605B]">
                  Please wait a moment while we validate your single-use password reset link.
                </p>
              </div>
            </div>
          )}

          {/* VALID TOKEN -> NEW PASSWORD FORM */}
          {tokenStatus === 'valid' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-xs text-[#65605B] leading-relaxed">
                Enter your new password below and confirm it. For your security, this reset link is single-use and all active sessions on other devices will be signed out.
              </p>

              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700 text-center">
                  ⚠️ {formError}
                </div>
              )}

              <div>
                <label htmlFor="reset-new-password" className="block text-xs font-bold text-[#4A4344] mb-1">
                  New Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#8C847C] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="reset-new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    placeholder="At least 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl text-sm text-[#231F20] focus:outline-none focus:border-[#E07A5F] focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((v) => !v)}
                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C847C] hover:text-[#231F20] cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="reset-confirm-password" className="block text-xs font-bold text-[#4A4344] mb-1">
                  Confirm New Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#8C847C] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="reset-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    placeholder="Re-enter your new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl text-sm text-[#231F20] focus:outline-none focus:border-[#E07A5F] focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C847C] hover:text-[#231F20] cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword.length > 0 && (
                  <p
                    className={`mt-1 text-[11px] font-bold ${
                      newPassword === confirmPassword ? 'text-[#2A5C4A]' : 'text-red-600'
                    }`}
                  >
                    {newPassword === confirmPassword
                      ? '✓ Passwords match'
                      : 'Passwords do not match yet'}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 bg-gradient-to-r from-[#E07A5F] via-[#F4A261] to-[#E76F51] hover:from-[#D96B43] disabled:opacity-60 text-white font-extrabold rounded-xl shadow-md shadow-[#E07A5F]/20 transition-all text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{submitting ? 'Updating Password…' : 'Update Password'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => onGoToLogin?.()}
                  className="text-xs font-bold text-[#52796F] hover:underline cursor-pointer"
                >
                  ← Return to Login
                </button>
              </div>
            </form>
          )}

          {/* COMPLETED STATE */}
          {tokenStatus === 'completed' && (
            <div className="text-center space-y-5">
              <div className="w-16 h-16 rounded-full bg-[#EAEFE9] border border-[#D1E7DD] flex items-center justify-center mx-auto text-[#2A5C4A]">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAEFE9] text-[#2A5C4A] text-[11px] font-extrabold uppercase tracking-wider">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Password Updated
                </span>
                <h2 className="text-lg sm:text-xl font-black text-[#231F20] font-display">
                  Password Reset Complete!
                </h2>
                <p className="text-xs sm:text-sm text-[#4A4344] leading-relaxed">
                  {completedMessage}
                </p>
              </div>

              <button
                type="button"
                onClick={() => onGoToLogin?.()}
                className="w-full py-3.5 bg-gradient-to-r from-[#E07A5F] via-[#F4A261] to-[#E76F51] hover:from-[#D96B43] text-white font-extrabold rounded-xl shadow-md shadow-[#E07A5F]/20 transition-all text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Return to Login</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* INVALID / EXPIRED TOKEN STATE */}
          {tokenStatus === 'invalid' && (
            <div className="text-center space-y-5">
              <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-600">
                <AlertTriangle className="w-7 h-7" />
              </div>

              <div className="space-y-2">
                <h2 className="text-lg font-extrabold text-[#231F20] font-display">
                  Reset Link Expired or Invalid
                </h2>
                <p className="text-xs text-[#65605B] leading-relaxed">
                  {tokenErrorMsg}
                </p>
              </div>

              <div className="space-y-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => onRequestNewResetLink?.()}
                  className="w-full py-3 bg-[#E07A5F] hover:bg-[#D0654A] text-white font-extrabold rounded-xl shadow-md text-xs sm:text-sm transition-all cursor-pointer"
                >
                  Request New Reset Link
                </button>
                <button
                  type="button"
                  onClick={() => onGoToLogin?.()}
                  className="w-full py-2.5 bg-[#FAF6F0] hover:bg-[#EFE9DF] text-[#4A4344] font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  ← Return to Login
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
