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
  ShieldCheck
} from 'lucide-react';
import { apiPost } from '../utils/auth';

export default function AuthModal({ isOpen, onClose, onLoginSuccess, message }) {
  const [isRegister, setIsRegister] = useState(false);
  const [role, setRole] = useState('buyer');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#231F20]/40 backdrop-blur-md animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-aesthetic border border-[#EFE9DF] max-w-md w-full overflow-hidden relative">
        <div className="bg-gradient-to-r from-[#E07A5F] via-[#F4A261] to-[#E76F51] p-6 text-white text-center relative">
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
            {isRegister ? 'Create a new account to proceed' : 'Log in to your account'}
          </p>
        </div>

        {message && (
          <div className="bg-[#FFF5F0] border-b border-[#F4C4B7] p-3 text-center flex items-center justify-center space-x-2 text-xs font-semibold text-[#E07A5F]">
            <Sparkles className="w-4 h-4 text-[#F4A261] flex-shrink-0 animate-spin" />
            <span>{message}</span>
          </div>
        )}

        <div className="flex border-b border-[#EFE9DF] bg-[#FAF6F0]">
          <button
            type="button"
            onClick={() => {
              setIsRegister(false);
              setError('');
            }}
            className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 ${
              !isRegister
                ? 'border-[#E07A5F] text-[#E07A5F] bg-white'
                : 'border-transparent text-[#65605B] hover:text-[#231F20]'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegister(true);
              if (role === 'admin') setRole('buyer');
              setError('');
            }}
            className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 ${
              isRegister
                ? 'border-[#E07A5F] text-[#E07A5F] bg-white'
                : 'border-transparent text-[#65605B] hover:text-[#231F20]'
            }`}
          >
            Register Account
          </button>
        </div>

        <div className="p-6">
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

              {!isRegister && (
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

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700 text-center">
              ⚠️ {error}
            </div>
          )}

          {!isRegister ? (
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
                className="w-full py-3 bg-gradient-to-r from-[#E07A5F] via-[#F4A261] to-[#E76F51] hover:from-[#D96B43] text-white font-bold rounded-xl shadow-md shadow-[#E07A5F]/20 transition-all text-sm flex items-center justify-center space-x-2"
              >
                <span>{loading ? 'Signing In...' : 'Sign In'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
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
                className="w-full py-3 bg-gradient-to-r from-[#E07A5F] via-[#F4A261] to-[#E76F51] hover:from-[#D96B43] text-white font-bold rounded-xl shadow-md shadow-[#E07A5F]/20 transition-all text-sm flex items-center justify-center space-x-2 mt-2"
              >
                <span>{loading ? 'Creating Account...' : 'Create Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
