import React, { useState } from 'react';
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
  KeyRound,
  CheckCircle2
} from 'lucide-react';
import { apiPost } from '../utils/auth';

export default function AuthModal({ isOpen, onClose, onLoginSuccess, message }) {
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register' | 'forgot' | 'reset'
  const [role, setRole] = useState('buyer');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  // Password Reset state
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetSuccessMsg, setResetSuccessMsg] = useState('');
  const [devToken, setDevToken] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await apiPost('/api/auth/login', { email, password, role });

      if (data.success) {
        onLoginSuccess(data.user, data.token);
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
    setLoading(true);

    try {
      const data = await apiPost('/api/auth/register', { name, email, password, role, phone, address });

      if (data.success) {
        onLoginSuccess(data.user, data.token);
      } else {
        setError(data.message || 'Registration failed');
      }
    } catch {
      setError('Connection failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResetSuccessMsg('');
    setLoading(true);

    try {
      const data = await apiPost('/api/auth/forgot-password', { email });
      if (data.success) {
        setResetSuccessMsg(data.message || 'Password recovery instructions have been dispatched.');
        if (data.dev_reset_token) {
          setDevToken(data.dev_reset_token);
          setResetToken(data.dev_reset_token);
        }
      } else {
        setError(data.message || 'Could not process password recovery.');
      }
    } catch {
      setError('Network error while processing password recovery.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await apiPost('/api/auth/reset-password', {
        token: resetToken,
        new_password: newPassword
      });
      if (data.success) {
        setResetSuccessMsg('Password updated successfully! Please log in with your new credentials.');
        setAuthMode('login');
        setPassword('');
        setResetToken('');
        setNewPassword('');
        setDevToken('');
      } else {
        setError(data.message || 'Password reset failed. Invalid or expired token.');
      }
    } catch {
      setError('Network error while updating password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-3 sm:p-4 md:p-6 flex items-center justify-center bg-[#231F20]/40 backdrop-blur-md animate-fadeIn">
      <div className="relative bg-white rounded-3xl shadow-aesthetic border border-[#EFE9DF] max-w-md w-full max-h-[calc(100vh-2rem)] sm:max-h-[88vh] flex flex-col my-auto overflow-hidden">
        <div className="bg-gradient-to-r from-[#E07A5F] via-[#F4A261] to-[#E76F51] p-5 sm:p-6 text-white text-center relative flex-shrink-0 z-10">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 text-white/80 hover:text-white rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center text-white text-2xl mx-auto mb-2 shadow border border-white/30">
            🐾
          </div>
          <h2 className="text-xl font-extrabold font-display">Welcome to PetPaws</h2>
          <p className="text-white/90 text-xs mt-1 font-medium">
            {authMode === 'register'
              ? 'Create a new account to proceed'
              : authMode === 'forgot'
              ? 'Recover your account password'
              : authMode === 'reset'
              ? 'Enter new account password'
              : 'Log in to your account'}
          </p>
        </div>

        {message && (
          <div className="bg-[#FFF5F0] border-b border-[#F4C4B7] p-3 text-center flex items-center justify-center space-x-2 text-xs font-semibold text-[#E07A5F]">
            <Sparkles className="w-4 h-4 text-[#F4A261] flex-shrink-0 animate-spin" />
            <span>{message}</span>
          </div>
        )}

        {/* Tab switchers */}
        <div className="flex border-b border-[#EFE9DF] bg-[#FAF6F0] flex-shrink-0 z-10">
          <button
            type="button"
            onClick={() => {
              setAuthMode('login');
              setError('');
              setResetSuccessMsg('');
            }}
            className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 ${
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
              setResetSuccessMsg('');
            }}
            className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 ${
              authMode === 'register'
                ? 'border-[#E07A5F] text-[#E07A5F] bg-white'
                : 'border-transparent text-[#65605B] hover:text-[#231F20]'
            }`}
          >
            Register Account
          </button>
        </div>

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
                  className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center ${
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
                  className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center ${
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
                  className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center ${
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
                  className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center ${
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
                  className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center ${
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
                    className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center ${
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

          {resetSuccessMsg && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 text-center flex items-center justify-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{resetSuccessMsg}</span>
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
                      setError('');
                      setResetSuccessMsg('');
                    }}
                    className="text-[11px] font-bold text-[#E07A5F] hover:underline"
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
                className="w-full py-3 bg-gradient-to-r from-[#E07A5F] via-[#F4A261] to-[#E76F51] hover:from-[#D96B43] text-white font-bold rounded-xl shadow-md shadow-[#E07A5F]/20 transition-all text-sm flex items-center justify-center space-x-2 mt-2 cursor-pointer"
              >
                <span>{loading ? 'Creating Account...' : 'Create Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* FORGOT PASSWORD FORM */}
          {authMode === 'forgot' && (
            <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
              <p className="text-xs text-[#65605B] leading-relaxed">
                Enter your registered account email address. We will verify your credentials and dispatch a cryptographically secure, single-use password recovery token.
              </p>

              <div>
                <label className="block text-xs font-semibold text-[#4A4344] mb-1">Registered Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#8C847C] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="user@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl text-sm text-[#231F20] focus:outline-none focus:border-[#E07A5F] focus:bg-white"
                  />
                </div>
              </div>

              {devToken && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-2">
                  <div className="flex items-center space-x-1.5 font-bold text-amber-900">
                    <KeyRound className="w-4 h-4 text-amber-600" />
                    <span>Dev Recovery Token Generated:</span>
                  </div>
                  <code className="block bg-white p-2 rounded border border-amber-200 text-[11px] font-mono break-all text-amber-950">
                    {devToken}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      setResetToken(devToken);
                      setAuthMode('reset');
                      setError('');
                    }}
                    className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    Proceed to Reset Password with this Token →
                  </button>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setError('');
                    setResetSuccessMsg('');
                  }}
                  className="px-4 py-3 bg-[#FAF6F0] text-[#4A4344] font-bold text-xs rounded-xl"
                >
                  Back to Login
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 bg-[#E07A5F] hover:bg-[#D0654A] text-white font-bold rounded-xl shadow-md text-xs transition-all cursor-pointer"
                >
                  {loading ? 'Dispatching…' : 'Send Reset Instructions'}
                </button>
              </div>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('reset');
                    setError('');
                  }}
                  className="text-xs font-bold text-[#52796F] hover:underline"
                >
                  Already have a recovery token? Enter it here →
                </button>
              </div>
            </form>
          )}

          {/* RESET PASSWORD FORM */}
          {authMode === 'reset' && (
            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <p className="text-xs text-[#65605B] leading-relaxed">
                Enter your single-use recovery token and choose a new secure password (minimum 6 characters).
              </p>

              <div>
                <label className="block text-xs font-semibold text-[#4A4344] mb-1">Security Recovery Token</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-[#8C847C] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="Paste 64-char hex recovery token"
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl text-sm font-mono text-[#231F20] focus:outline-none focus:border-[#E07A5F] focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4A4344] mb-1">New Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#8C847C] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Minimum 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl text-sm text-[#231F20] focus:outline-none focus:border-[#E07A5F] focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setError('');
                  }}
                  className="px-4 py-3 bg-[#FAF6F0] text-[#4A4344] font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 bg-[#52796F] hover:bg-[#3E5E56] text-white font-bold rounded-xl shadow-md text-xs transition-all cursor-pointer"
                >
                  {loading ? 'Updating Password…' : 'Save New Password & Sign In'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
