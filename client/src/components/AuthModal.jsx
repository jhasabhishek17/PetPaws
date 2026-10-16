import React, { useState } from 'react';
import { 
  X, 
  User, 
  Lock, 
  Mail, 
  Phone, 
  MapPin, 
  Store, 
  Stethoscope, 
  ShoppingBag,
  Sparkles,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

/**
 * Highly Animated & Interactive Auth Modal Component (Eye-Comfort Theme)
 */
export default function AuthModal({ isOpen, onClose, onLoginSuccess, message }) {
  const [isRegister, setIsRegister] = useState(false);
  const [role, setRole] = useState('buyer'); // 'buyer', 'seller', 'vet'
  
  // Form input fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  // Submit Login
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role })
      });
      const data = await res.json();

      if (data.success) {
        onLoginSuccess(data.user);
      } else {
        setError(data.message || 'Invalid email or password');
      }
    } catch (err) {
      setError('Connection failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Submit Register
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role, phone, address })
      });
      const data = await res.json();

      if (data.success) {
        onLoginSuccess(data.user);
      } else {
        setError(data.message || 'Registration failed');
      }
    } catch (err) {
      setError('Connection failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Quick Demo Login Helper
  const handleDemoLogin = (demoRole) => {
    let demoUser = {
      id: "u-buyer-1",
      name: "Alex Morgan",
      email: "buyer@petpaws.com",
      role: "buyer",
      phone: "+1 (555) 234-5678",
      address: "742 Evergreen Terrace, Springfield"
    };

    if (demoRole === 'seller') {
      demoUser = {
        id: "u-seller-1",
        name: "Golden Paws Kennel",
        email: "seller@petpaws.com",
        role: "seller",
        phone: "+1 (555) 987-6543",
        address: "100 Breeding Ranch, Texas"
      };
    } else if (demoRole === 'vet') {
      demoUser = {
        id: "u-vet-1",
        name: "Dr. Sarah Jenkins",
        email: "vet@petpaws.com",
        role: "vet",
        phone: "+1 (555) 456-7890",
        address: "Pet Care Medical Center, NY"
      };
    }

    onLoginSuccess(demoUser);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#231F20]/40 backdrop-blur-md animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-aesthetic border border-[#EFE9DF] max-w-md w-full overflow-hidden relative">
        
        {/* Modal Top Header Bar */}
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

        {/* Action Prompt Message (if user attempted a protected action) */}
        {message && (
          <div className="bg-[#FFF5F0] border-b border-[#F4C4B7] p-3 text-center flex items-center justify-center space-x-2 text-xs font-semibold text-[#E07A5F]">
            <Sparkles className="w-4 h-4 text-[#F4A261] flex-shrink-0 animate-spin" />
            <span>{message}</span>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex border-b border-[#EFE9DF] bg-[#FAF6F0]">
          <button
            type="button"
            onClick={() => { setIsRegister(false); setError(''); }}
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
            onClick={() => { setIsRegister(true); setError(''); }}
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
          
          {/* Role Selector Cards */}
          <div className="mb-5">
            <label className="block text-xs font-bold text-[#4A4344] mb-2 uppercase tracking-wider">
              Select Your Role
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setRole('buyer')}
                className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center ${
                  role === 'buyer'
                    ? 'border-[#E07A5F] bg-[#FFF5F0] text-[#E07A5F] font-bold ring-2 ring-[#E07A5F]/30'
                    : 'border-[#EFE9DF] text-[#65605B] hover:bg-[#FAF6F0]'
                }`}
              >
                <ShoppingBag className="w-5 h-5 mb-1" />
                <span className="text-xs">Buyer</span>
              </button>

              <button
                type="button"
                onClick={() => setRole('seller')}
                className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center ${
                  role === 'seller'
                    ? 'border-[#F4A261] bg-[#FFFDF0] text-[#D97706] font-bold ring-2 ring-[#F4A261]/30'
                    : 'border-[#EFE9DF] text-[#65605B] hover:bg-[#FAF6F0]'
                }`}
              >
                <Store className="w-5 h-5 mb-1" />
                <span className="text-xs">Breeder / Seller</span>
              </button>

              <button
                type="button"
                onClick={() => setRole('vet')}
                className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center ${
                  role === 'vet'
                    ? 'border-[#52796F] bg-[#EAEFE9] text-[#2A5C4A] font-bold ring-2 ring-[#52796F]/30'
                    : 'border-[#EFE9DF] text-[#65605B] hover:bg-[#FAF6F0]'
                }`}
              >
                <Stethoscope className="w-5 h-5 mb-1" />
                <span className="text-xs">Veterinarian</span>
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700 text-center">
              ⚠️ {error}
            </div>
          )}

          {/* Login Form */}
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
            /* Register Form */
            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#4A4344] mb-1">Full Name</label>
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

          {/* Quick Demo Login Shortcut Helpers */}
          <div className="mt-6 pt-4 border-t border-[#EFE9DF] text-center">
            <span className="text-[11px] font-bold text-[#8C847C] uppercase tracking-wider block mb-2">
              ⚡ Quick Testing Demo Login
            </span>
            <div className="flex justify-center gap-2">
              <button
                type="button"
                onClick={() => handleDemoLogin('buyer')}
                className="px-3 py-1.5 bg-[#FAF6F0] hover:bg-[#FFF5F0] text-[#4A4344] hover:text-[#E07A5F] border border-[#E6DCCF] rounded-lg text-xs font-semibold transition-colors"
              >
                Demo Buyer
              </button>

              <button
                type="button"
                onClick={() => handleDemoLogin('seller')}
                className="px-3 py-1.5 bg-[#FAF6F0] hover:bg-[#FFFDF0] text-[#4A4344] hover:text-[#D97706] border border-[#E6DCCF] rounded-lg text-xs font-semibold transition-colors"
              >
                Demo Seller
              </button>

              <button
                type="button"
                onClick={() => handleDemoLogin('vet')}
                className="px-3 py-1.5 bg-[#FAF6F0] hover:bg-[#EAEFE9] text-[#4A4344] hover:text-[#2A5C4A] border border-[#E6DCCF] rounded-lg text-xs font-semibold transition-colors"
              >
                Demo Vet
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
