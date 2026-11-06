import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Lock,
  Mail,
  Store,
  Stethoscope,
  ShoppingBag,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  KeyRound
} from 'lucide-react';
import {
  apiPost,
  normalizeEmailInput,
  validateEmailFormat,
  formatCooldownLabel
} from '../utils/auth';

export default function AuthModal({
  isOpen,
  onClose,
  onLoginSuccess,
  message,
  initialMode = 'login',
  initialEmail = '',
  initialRole = 'buyer'
}) {
  // 'login' | 'register' | 'verify-otp' | 'forgot'
  const [authMode, setAuthMode] = useState(initialMode || 'login');
  const [role, setRole] = useState(initialRole || 'buyer');

  const [email, setEmail] = useState(initialEmail || '');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone] = useState('');
  const [address] = useState('');

  // Email verification OTP state
  const [verificationOtp, setVerificationOtp] = useState('');
  const [verifyNoticeMsg, setVerifyNoticeMsg] = useState('');
  const [emailDeliveryFailed, setEmailDeliveryFailed] = useState(false);
  const [resendSuccessMsg, setResendSuccessMsg] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Forgot password OTP multi-step state: 'request' | 'verify-otp' | 'new-password' | 'done'
  const [forgotStep, setForgotStep] = useState('request');
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [forgotInfoMsg, setForgotInfoMsg] = useState('');
  const [forgotCooldown, setForgotCooldown] = useState(0);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAuthMode(initialMode || 'login');
      if (initialEmail) setEmail(initialEmail);
      if (initialRole) setRole(initialRole);
      setError('');
      setVerificationOtp('');
      setEmailDeliveryFailed(false);
      setResendSuccessMsg('');
      setForgotStep('request');
      setResetOtp('');
      setNewPassword('');
      setConfirmNewPassword('');
      setForgotInfoMsg('');
    }
  }, [isOpen, initialMode, initialEmail, initialRole]);

  useEffect(() => {
    if (resendCooldown <= 0) return undefined;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (forgotCooldown <= 0) return undefined;
    const timer = setInterval(() => {
      setForgotCooldown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [forgotCooldown]);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResendSuccessMsg('');
    setLoading(true);

    try {
      const normalizedEmail = normalizeEmailInput(email);
      const data = await apiPost('/api/auth/login', {
        email: normalizedEmail,
        password,
        role
      });

      if (data.success && data.token) {
        onLoginSuccess(data.user, data.token);
      } else if (data.requires_verification || data.code === 'EMAIL_NOT_VERIFIED') {
        const failed = Boolean(data.delivery_error);
        setEmail(normalizedEmail);
        setVerificationOtp('');
        setEmailDeliveryFailed(failed);
        setVerifyNoticeMsg(
          data.message ||
            (failed
              ? 'Please verify your email address before signing in. We could not automatically send the verification OTP right now — please click "Resend OTP" to try again.'
              : 'Please verify your email address before signing in. Enter the 6-digit OTP sent to your email inbox.')
        );
        const waitSec =
          typeof data.cooldown_seconds === 'number'
            ? data.cooldown_seconds
            : typeof data.retry_after_seconds === 'number'
            ? data.retry_after_seconds
            : data.email_sent
            ? 60
            : 0;
        setResendCooldown(waitSec);
        setAuthMode('verify-otp');
      } else {
        setError(data.message || 'Invalid email or password');
      }
    } catch {
      setError('Connection failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResendSuccessMsg('');

    const emailCheck = validateEmailFormat(email);
    if (!emailCheck.valid) {
      setError(emailCheck.message || 'Please enter a valid email address.');
      return;
    }
    const normalizedEmail = emailCheck.normalized;

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      const data = await apiPost('/api/auth/register', {
        name: name.trim(),
        email: normalizedEmail,
        password,
        role,
        phone,
        address
      });

      if (data.success) {
        if (data.requires_verification || !data.token) {
          const failed = data.email_sent === false || Boolean(data.delivery_error);
          setEmail(normalizedEmail);
          setPassword('');
          setVerificationOtp('');
          setEmailDeliveryFailed(failed);
          setVerifyNoticeMsg(
            data.message ||
              (failed
                ? 'Your account was created, but we could not send the verification OTP email right now. Please check the server SMTP/email configuration or click "Resend OTP" to try again.'
                : 'Account created! Enter the 6-digit verification OTP sent to your email address.')
          );
          setResendCooldown(failed ? 0 : data.cooldown_seconds || 60);
          setAuthMode('verify-otp');
        } else {
          onLoginSuccess(data.user, data.token);
        }
      } else {
        if (data.retry_after_seconds || data.cooldown_seconds) {
          setResendCooldown(Number(data.retry_after_seconds || data.cooldown_seconds));
        }
        setError(data.message || 'Registration failed');
      }
    } catch {
      setError('Connection failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtpSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResendSuccessMsg('');

    const cleanOtp = verificationOtp.replace(/\D/g, '').trim();
    if (cleanOtp.length !== 6) {
      setError('Please enter the complete 6-digit verification OTP.');
      return;
    }

    setLoading(true);
    try {
      const data = await apiPost('/api/auth/verify-otp', {
        email: normalizeEmailInput(email),
        otp: cleanOtp
      });

      if (data.success && data.verified) {
        if (data.token && data.user) {
          onLoginSuccess(data.user, data.token);
        } else {
          setAuthMode('login');
          setError('');
        }
      } else {
        setError(data.message || 'Invalid or expired verification OTP.');
      }
    } catch {
      setError('Network error while verifying OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerificationOtp = async () => {
    if (!email.trim() || resendCooldown > 0) return;
    setError('');
    setResendSuccessMsg('');

    const emailCheck = validateEmailFormat(email);
    if (!emailCheck.valid) {
      setError(emailCheck.message || 'Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const data = await apiPost('/api/auth/resend-otp', {
        email: emailCheck.normalized
      });
      if (data.success && data.email_sent !== false) {
        setVerificationOtp('');
        setEmailDeliveryFailed(false);
        setVerifyNoticeMsg(
          'We have sent a fresh 6-digit verification OTP to your email address. Enter it below to activate your account.'
        );
        setResendSuccessMsg(
          data.message || 'A new 6-digit verification OTP has been sent to your email.'
        );
        setResendCooldown(data.cooldown_seconds || 60);
      } else {
        const isRateLimit =
          data.httpStatus === 429 ||
          data.statusCode === 429 ||
          Boolean(data.retry_after_seconds);
        if (data.retry_after_seconds || data.cooldown_seconds) {
          setResendCooldown(Number(data.retry_after_seconds || data.cooldown_seconds));
        }
        if (!isRateLimit && (data.httpStatus === 503 || data.statusCode === 503)) {
          setEmailDeliveryFailed(true);
        }
        setError(
          data.message ||
            'Could not resend verification OTP. Please check the server SMTP settings and try again.'
        );
      }
    } catch {
      setError('Network error while resending verification OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPasswordResetOtp = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (forgotCooldown > 0 && forgotStep === 'verify-otp') return;
    setError('');

    const emailCheck = validateEmailFormat(email);
    if (!emailCheck.valid) {
      setError(emailCheck.message || 'Please enter a valid email address.');
      return;
    }
    const normalizedEmail = emailCheck.normalized;

    setLoading(true);
    try {
      const data = await apiPost('/api/auth/forgot-password', { email: normalizedEmail });
      if (data.success) {
        setEmail(normalizedEmail);
        setResetOtp('');
        setForgotInfoMsg(
          data.message ||
            'If an account is registered with that email address, we have sent a 6-digit password reset OTP. Please check your inbox.'
        );
        setForgotCooldown(data.cooldown_seconds || 60);
        setForgotStep('verify-otp');
      } else {
        if (data.retry_after_seconds || data.cooldown_seconds) {
          setForgotCooldown(Number(data.retry_after_seconds || data.cooldown_seconds));
        }
        setError(data.message || 'Could not send password reset OTP.');
      }
    } catch {
      setError('Network error while requesting password reset OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyResetOtpSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanOtp = resetOtp.replace(/\D/g, '').trim();
    if (cleanOtp.length !== 6) {
      setError('Please enter the 6-digit password reset OTP.');
      return;
    }

    setLoading(true);
    try {
      const data = await apiPost('/api/auth/verify-reset-otp', {
        email: normalizeEmailInput(email),
        otp: cleanOtp
      });

      if (data.success && data.valid) {
        setForgotStep('new-password');
        setError('');
      } else {
        setError(data.message || 'Invalid or expired password reset OTP.');
      }
    } catch {
      setError('Network error while verifying password reset OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!newPassword || newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match. Please confirm your new password.');
      return;
    }

    setLoading(true);
    try {
      const data = await apiPost('/api/auth/reset-password', {
        email: email.trim().toLowerCase(),
        otp: resetOtp.replace(/\D/g, '').trim(),
        new_password: newPassword,
        confirm_password: confirmNewPassword
      });

      if (data.success) {
        setForgotInfoMsg(
          data.message || 'Password reset successfully. Please sign in with your new password.'
        );
        setNewPassword('');
        setConfirmNewPassword('');
        setResetOtp('');
        setForgotStep('done');
      } else {
        setError(data.message || 'Failed to reset password. Your OTP may have expired.');
      }
    } catch {
      setError('Network error while resetting password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-3 sm:p-4 md:p-6 flex items-center justify-center bg-[#231F20]/40 backdrop-blur-md animate-fadeIn">
      <div className="relative bg-white rounded-3xl shadow-aesthetic border border-[#EFE9DF] max-w-md w-full max-h-[calc(100vh-2rem)] sm:max-h-[88vh] flex flex-col my-auto overflow-hidden">
        <div className="bg-gradient-to-r from-[#E07A5F] via-[#F4A261] to-[#E76F51] p-5 sm:p-6 text-white text-center relative flex-shrink-0 z-10">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close authentication modal"
            className="absolute top-4 right-4 p-1 text-white/80 hover:text-white rounded-full bg-white/20 hover:bg-white/30 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center text-white text-2xl mx-auto mb-2 shadow border border-white/30">
            🐾
          </div>
          <h2 className="text-xl font-extrabold font-display">Welcome to PetPaws</h2>
          <p className="text-white/90 text-xs mt-1 font-medium">
            {authMode === 'register'
              ? 'Create a verified account to get started'
              : authMode === 'forgot'
              ? 'Reset your account password with email OTP'
              : authMode === 'verify-otp'
              ? 'Enter the 6-digit OTP sent to your email'
              : 'Log in to your account'}
          </p>
        </div>

        {message && authMode !== 'verify-otp' && (
          <div className="bg-[#FFF5F0] border-b border-[#F4C4B7] p-3 text-center flex items-center justify-center space-x-2 text-xs font-semibold text-[#E07A5F]">
            <Sparkles className="w-4 h-4 text-[#F4A261] flex-shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {/* Tab switchers (shown on Sign In and Register views) */}
        {(authMode === 'login' || authMode === 'register') && (
          <div className="flex border-b border-[#EFE9DF] bg-[#FAF6F0] flex-shrink-0 z-10">
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setError('');
              }}
              className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                authMode === 'login'
                  ? 'border-[#E07A5F] text-[#E07A5F] bg-white'
                  : 'border-transparent text-[#65605B] hover:text-[#231F20]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('register');
                if (role === 'admin') setRole('buyer');
                setError('');
              }}
              className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                authMode === 'register'
                  ? 'border-[#E07A5F] text-[#E07A5F] bg-white'
                  : 'border-transparent text-[#65605B] hover:text-[#231F20]'
              }`}
            >
              Register Account
            </button>
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6">
          {/* Role selector (shown on login & register) */}
          {(authMode === 'login' || authMode === 'register') && (
            <div className="mb-5">
              <label className="block text-xs font-bold text-[#4A4344] mb-2 uppercase tracking-wider">
                Select Your Role
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setRole('buyer')}
                  className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center cursor-pointer ${
                    role === 'buyer'
                      ? 'border-[#E07A5F] bg-[#FFF5F0] text-[#E07A5F] font-bold ring-2 ring-[#E07A5F]/30'
                      : 'border-[#EFE9DF] text-[#65605B] hover:bg-[#FAF6F0]'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4 mb-1" />
                  <span className="text-[11px]">Buyer</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('shopkeeper')}
                  className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center cursor-pointer ${
                    role === 'shopkeeper'
                      ? 'border-[#52796F] bg-[#EAEFE9] text-[#2A5C4A] font-bold ring-2 ring-[#52796F]/30'
                      : 'border-[#EFE9DF] text-[#65605B] hover:bg-[#FAF6F0]'
                  }`}
                >
                  <Store className="w-4 h-4 mb-1" />
                  <span className="text-[11px]">Shopkeeper</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('seller')}
                  className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center cursor-pointer ${
                    role === 'seller'
                      ? 'border-[#F4A261] bg-[#FFFDF0] text-[#D97706] font-bold ring-2 ring-[#F4A261]/30'
                      : 'border-[#EFE9DF] text-[#65605B] hover:bg-[#FAF6F0]'
                  }`}
                >
                  <Store className="w-4 h-4 mb-1" />
                  <span className="text-[11px]">Breeder / Seller</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('vet')}
                  className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center cursor-pointer ${
                    role === 'vet'
                      ? 'border-[#52796F] bg-[#EAEFE9] text-[#2A5C4A] font-bold ring-2 ring-[#52796F]/30'
                      : 'border-[#EFE9DF] text-[#65605B] hover:bg-[#FAF6F0]'
                  }`}
                >
                  <Stethoscope className="w-4 h-4 mb-1" />
                  <span className="text-[11px]">Veterinarian</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('groomer')}
                  className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center cursor-pointer ${
                    role === 'groomer'
                      ? 'border-[#E07A5F] bg-[#FFF5F0] text-[#E07A5F] font-bold ring-2 ring-[#E07A5F]/30'
                      : 'border-[#EFE9DF] text-[#65605B] hover:bg-[#FAF6F0]'
                  }`}
                >
                  <Sparkles className="w-4 h-4 mb-1" />
                  <span className="text-[11px]">Groomer</span>
                </button>

                {authMode === 'login' && (
                  <button
                    type="button"
                    onClick={() => setRole('admin')}
                    className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center cursor-pointer ${
                      role === 'admin'
                        ? 'border-[#231F20] bg-[#FAF6F0] text-[#231F20] font-bold ring-2 ring-[#231F20]/20'
                        : 'border-[#EFE9DF] text-[#65605B] hover:bg-[#FAF6F0]'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4 mb-1" />
                    <span className="text-[11px]">Platform Admin</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700 text-center">
              ⚠️ {error}
            </div>
          )}

          {/* SIGN IN FORM */}
          {authMode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#4A4344] mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#8C847C] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="buyer@petpaws.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl text-sm text-[#231F20] focus:outline-none focus:border-[#E07A5F] focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-[#4A4344]">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('forgot');
                      setForgotStep('request');
                      setResetOtp('');
                      setNewPassword('');
                      setConfirmNewPassword('');
                      setForgotInfoMsg('');
                      setError('');
                    }}
                    className="text-[11px] font-bold text-[#E07A5F] hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#8C847C] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl text-sm text-[#231F20] focus:outline-none focus:border-[#E07A5F] focus:bg-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-[#E07A5F] via-[#F4A261] to-[#E76F51] hover:from-[#D96B43] text-white font-bold rounded-xl shadow-md shadow-[#E07A5F]/20 transition-all text-sm flex items-center justify-center space-x-2 cursor-pointer"
              >
                <span>{loading ? 'Signing In...' : 'Sign In'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* REGISTER ACCOUNT FORM */}
          {authMode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#4A4344] mb-1">
                  {role === 'shopkeeper' || role === 'seller' ? 'Full Name or Shop Name' : 'Full Name'}
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#8C847C] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="Alex Morgan"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl text-sm text-[#231F20] focus:outline-none focus:border-[#E07A5F] focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4A4344] mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#8C847C] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="alex@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl text-sm text-[#231F20] focus:outline-none focus:border-[#E07A5F] focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4A4344] mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#8C847C] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Minimum 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl text-sm text-[#231F20] focus:outline-none focus:border-[#E07A5F] focus:bg-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-[#E07A5F] via-[#F4A261] to-[#E76F51] hover:from-[#D96B43] text-white font-bold rounded-xl shadow-md shadow-[#E07A5F]/20 transition-all text-sm flex items-center justify-center space-x-2 mt-2 cursor-pointer"
              >
                <span>{loading ? 'Sending Verification OTP...' : 'Create Account & Send OTP'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* DEDICATED EMAIL OTP VERIFICATION SCREEN */}
          {authMode === 'verify-otp' && (
            <div className="space-y-4 text-center py-1">
              <div
                className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto ${
                  emailDeliveryFailed
                    ? 'bg-amber-50 border border-amber-200 text-amber-600'
                    : 'bg-[#FFF5F0] border border-[#F4C4B7] text-[#E07A5F]'
                }`}
              >
                {emailDeliveryFailed ? <AlertTriangle className="w-7 h-7" /> : <KeyRound className="w-7 h-7" />}
              </div>

              <div className="space-y-1.5">
                <h3 className="text-base sm:text-lg font-extrabold text-[#231F20] font-display">
                  {emailDeliveryFailed ? 'Verification OTP Not Delivered' : 'Enter Email Verification OTP'}
                </h3>
                <p
                  className={`text-xs leading-relaxed ${
                    emailDeliveryFailed ? 'text-amber-800 font-semibold' : 'text-[#4A4344]'
                  }`}
                >
                  {verifyNoticeMsg ||
                    (emailDeliveryFailed
                      ? 'Your account was created, but we could not send the verification OTP email. Please check the server SMTP configuration or click Resend OTP below.'
                      : 'Enter the 6-digit one-time verification code sent to your email address (valid for 10 minutes).')}
                </p>
                {email && (
                  <p className="text-xs font-extrabold text-[#52796F] break-all">
                    {email}
                  </p>
                )}
              </div>

              {resendSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>{resendSuccessMsg}</span>
                </div>
              )}

              <form onSubmit={handleVerifyOtpSubmit} className="space-y-3 text-left">
                <div>
                  <label
                    htmlFor="verify-email-otp-input"
                    className="block text-xs font-bold text-[#4A4344] mb-1.5 text-center uppercase tracking-wider"
                  >
                    6-Digit Verification OTP
                  </label>
                  <input
                    id="verify-email-otp-input"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    required
                    placeholder="000000"
                    value={verificationOtp}
                    onChange={(e) => setVerificationOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full py-3 px-4 bg-[#FAF6F0] border-2 border-[#E6DCCF] rounded-2xl text-center font-mono text-2xl font-black tracking-[0.35em] text-[#231F20] focus:outline-none focus:border-[#E07A5F] focus:bg-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || verificationOtp.replace(/\D/g, '').length !== 6}
                  className="w-full py-3 bg-gradient-to-r from-[#E07A5F] via-[#F4A261] to-[#E76F51] hover:from-[#D96B43] disabled:opacity-60 text-white font-bold rounded-xl shadow-md shadow-[#E07A5F]/20 transition-all text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{loading ? 'Verifying OTP…' : 'Verify OTP & Activate Account'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  disabled={loading || resendCooldown > 0}
                  onClick={handleResendVerificationOtp}
                  className="w-full py-2.5 bg-[#52796F] hover:bg-[#3E5E56] disabled:bg-gray-300 text-white font-bold rounded-xl shadow-sm text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>
                    {loading
                      ? 'Sending OTP…'
                      : resendCooldown > 0
                      ? `Resend OTP (${formatCooldownLabel(resendCooldown)})`
                      : 'Resend Verification OTP'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setError('');
                    setResendSuccessMsg('');
                  }}
                  className="w-full py-2.5 bg-white hover:bg-[#FAF6F0] text-[#4A4344] border border-[#E6DCCF] font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  ← Return to Login
                </button>
              </div>
            </div>
          )}

          {/* FORGOT PASSWORD OTP FLOW */}
          {authMode === 'forgot' && (
            <div className="space-y-4">
              {forgotStep === 'request' && (
                <form onSubmit={handleRequestPasswordResetOtp} className="space-y-4">
                  <p className="text-xs text-[#65605B] leading-relaxed">
                    Enter the email address associated with your PetPaws account and we will send you a time-limited 6-digit password reset OTP.
                  </p>

                  <div>
                    <label htmlFor="forgot-email-input" className="block text-xs font-semibold text-[#4A4344] mb-1">
                      Registered Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-[#8C847C] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="forgot-email-input"
                        type="email"
                        required
                        placeholder="user@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl text-sm text-[#231F20] focus:outline-none focus:border-[#E07A5F] focus:bg-white"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-gradient-to-r from-[#E07A5F] via-[#F4A261] to-[#E76F51] hover:from-[#D96B43] disabled:opacity-60 text-white font-bold rounded-xl shadow-md shadow-[#E07A5F]/20 text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>{loading ? 'Sending Reset OTP…' : 'Send Password Reset OTP'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <div className="pt-1 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('login');
                        setError('');
                      }}
                      className="text-xs font-bold text-[#52796F] hover:underline cursor-pointer"
                    >
                      ← Return to Login
                    </button>
                  </div>
                </form>
              )}

              {forgotStep === 'verify-otp' && (
                <div className="space-y-4">
                  <div className="p-3 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl text-xs text-[#4A4344] text-center space-y-1">
                    <p className="font-semibold">{forgotInfoMsg}</p>
                    <p className="font-bold text-[#52796F] break-all">{email}</p>
                  </div>

                  <form onSubmit={handleVerifyResetOtpSubmit} className="space-y-3">
                    <div>
                      <label
                        htmlFor="forgot-reset-otp-input"
                        className="block text-xs font-bold text-[#4A4344] mb-1.5 text-center uppercase tracking-wider"
                      >
                        Enter 6-Digit Password Reset OTP
                      </label>
                      <input
                        id="forgot-reset-otp-input"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        required
                        placeholder="000000"
                        value={resetOtp}
                        onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="w-full py-3 px-4 bg-[#FAF6F0] border-2 border-[#E6DCCF] rounded-2xl text-center font-mono text-2xl font-black tracking-[0.35em] text-[#231F20] focus:outline-none focus:border-[#E07A5F] focus:bg-white"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading || resetOtp.replace(/\D/g, '').length !== 6}
                      className="w-full py-3 bg-gradient-to-r from-[#E07A5F] via-[#F4A261] to-[#E76F51] hover:from-[#D96B43] disabled:opacity-60 text-white font-bold rounded-xl shadow-md shadow-[#E07A5F]/20 text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>{loading ? 'Verifying OTP…' : 'Verify Reset OTP'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </form>

                  <div className="space-y-2 pt-1">
                    <button
                      type="button"
                      disabled={loading || forgotCooldown > 0}
                      onClick={handleRequestPasswordResetOtp}
                      className="w-full py-2.5 bg-[#52796F] hover:bg-[#3E5E56] disabled:bg-gray-300 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                      <span>
                        {forgotCooldown > 0
                          ? `Resend Reset OTP (${formatCooldownLabel(forgotCooldown)})`
                          : 'Resend Password Reset OTP'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setForgotStep('request');
                        setError('');
                      }}
                      className="w-full py-2 bg-white hover:bg-[#FAF6F0] text-[#4A4344] border border-[#E6DCCF] font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                    >
                      ← Change Email Address
                    </button>
                  </div>
                </div>
              )}

              {forgotStep === 'new-password' && (
                <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>OTP verified! Enter your new password below.</span>
                  </div>

                  <div>
                    <label htmlFor="forgot-new-password" className="block text-xs font-semibold text-[#4A4344] mb-1">
                      New Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#8C847C] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="forgot-new-password"
                        type="password"
                        required
                        minLength={6}
                        placeholder="Minimum 6 characters"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl text-sm text-[#231F20] focus:outline-none focus:border-[#E07A5F] focus:bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="forgot-confirm-password" className="block text-xs font-semibold text-[#4A4344] mb-1">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#8C847C] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="forgot-confirm-password"
                        type="password"
                        required
                        minLength={6}
                        placeholder="Re-enter new password"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl text-sm text-[#231F20] focus:outline-none focus:border-[#E07A5F] focus:bg-white"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-gradient-to-r from-[#E07A5F] via-[#F4A261] to-[#E76F51] hover:from-[#D96B43] disabled:opacity-60 text-white font-bold rounded-xl shadow-md shadow-[#E07A5F]/20 text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>{loading ? 'Updating Password…' : 'Reset Password'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}

              {forgotStep === 'done' && (
                <div className="text-center space-y-4 py-2">
                  <div className="w-14 h-14 rounded-full bg-[#EAEFE9] border border-[#D1E7DD] flex items-center justify-center mx-auto text-[#2A5C4A]">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-base font-extrabold text-[#231F20] font-display">
                      Password Reset Complete
                    </h3>
                    <p className="text-xs text-[#4A4344] leading-relaxed">
                      {forgotInfoMsg}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('login');
                      setForgotStep('request');
                      setPassword('');
                      setError('');
                    }}
                    className="w-full py-3 bg-[#E07A5F] hover:bg-[#D0654A] text-white font-bold rounded-xl shadow-md text-xs transition-all cursor-pointer"
                  >
                    Return to Sign In
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
