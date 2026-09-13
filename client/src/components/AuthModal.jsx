import React, { useState } from 'react';
import { X, UserCheck, ShieldCheck, Stethoscope, Store, Sparkles, CheckCircle2 } from 'lucide-react';

/**
 * AuthModal Component
 * Provides seamless authentication with Buyer, Seller, and Vet tabs, 
 * alongside 1-click demo logins for easy evaluation.
 */
export default function AuthModal({ isOpen, onClose, onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [selectedRole, setSelectedRole] = useState('buyer'); // buyer, seller, vet

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [ifscCode, setIfscCode] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleRoleChange = (role) => {
    setSelectedRole(role);
    setError('');
  };

  const handleModeToggle = (registerState) => {
    setIsRegister(registerState);
    setError('');
  };

  // Handle standard login or registration submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const bodyData = isRegister 
        ? { name, email, password, role: selectedRole, phone, upi_id: upiId, bank_name: bankName, bank_account: bankAccount, ifsc_code: ifscCode }
        : { email, password, role: selectedRole };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData)
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Authentication failed');
      }

      onLoginSuccess(data.user);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Quick 1-Click Demo Login Handler
  const handleQuickDemoLogin = (role) => {
    const demoUsers = {
      buyer: {
        id: "u-buyer-1",
        name: "Alex Morgan",
        email: "buyer@petpaws.com",
        role: "buyer",
        phone: "+1 (555) 234-5678",
        address: "742 Evergreen Terrace, Springfield"
      },
      seller: {
        id: "u-seller-1",
        name: "Paws & Tails Haven",
        email: "seller@petpaws.com",
        role: "seller",
        phone: "+1 (555) 876-5432",
        address: "123 Kennel Way, Austin, TX",
        upi_id: "pawstails@upi",
        bank_name: "HDFC Bank",
        bank_account: "987654321012",
        ifsc_code: "HDFC0001234"
      },
      vet: {
        id: "u-vet-1",
        name: "Dr. Sarah Jenkins, DVM",
        email: "vet@petpaws.com",
        role: "vet",
        phone: "+1 (555) 345-6789",
        address: "456 Veterinary Care Blvd, Austin, TX"
      }
    };

    onLoginSuccess(demoUsers[role] || demoUsers.buyer);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-2">
            <span className="text-3xl">🐾</span>
            <div>
              <h2 className="text-2xl font-bold font-display">Welcome to PetPaws</h2>
              <p className="text-orange-100 text-xs mt-0.5">
                {isRegister ? 'Create your PetPaws Account' : 'Sign in to access your portal'}
              </p>
            </div>
          </div>

          {/* Quick Demo Login Preset Buttons */}
          <div className="mt-4 pt-3 border-t border-white/20">
            <p className="text-[11px] font-bold uppercase tracking-wider text-orange-100 mb-2 flex items-center">
              <Sparkles className="w-3.5 h-3.5 mr-1" /> Quick Demo 1-Click Login:
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('buyer')}
                className="py-1.5 px-2 bg-white/20 hover:bg-white/30 backdrop-blur text-white text-xs font-semibold rounded-lg flex items-center justify-center space-x-1 transition-all"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Buyer Demo</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('seller')}
                className="py-1.5 px-2 bg-white/20 hover:bg-white/30 backdrop-blur text-white text-xs font-semibold rounded-lg flex items-center justify-center space-x-1 transition-all"
              >
                <Store className="w-3.5 h-3.5" />
                <span>Seller Demo</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('vet')}
                className="py-1.5 px-2 bg-white/20 hover:bg-white/30 backdrop-blur text-white text-xs font-semibold rounded-lg flex items-center justify-center space-x-1 transition-all"
              >
                <Stethoscope className="w-3.5 h-3.5" />
                <span>Vet Demo</span>
              </button>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6">
          
          {/* Role Selection Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl mb-5">
            <button
              type="button"
              onClick={() => handleRoleChange('buyer')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                selectedRole === 'buyer' 
                  ? 'bg-white text-orange-600 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Pet Buyer</span>
            </button>
            <button
              type="button"
              onClick={() => handleRoleChange('seller')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                selectedRole === 'seller' 
                  ? 'bg-white text-orange-600 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>Pet Seller</span>
            </button>
            <button
              type="button"
              onClick={() => handleRoleChange('vet')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                selectedRole === 'vet' 
                  ? 'bg-white text-orange-600 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Stethoscope className="w-3.5 h-3.5" />
              <span>Veterinarian</span>
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-medium rounded-xl">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {isRegister && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name / Business Name
                </label>
                <input
                  type="text"
                  required
                  placeholder={selectedRole === 'seller' ? 'e.g. Happy Paws Farm' : 'e.g. John Doe'}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-500 focus:bg-white"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                placeholder={`${selectedRole}@petpaws.com`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-500 focus:bg-white"
              />
            </div>

            {isRegister && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  placeholder="+1 (555) 000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-500 focus:bg-white"
                />
              </div>
            )}

            {isRegister && selectedRole === 'seller' && (
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <p className="text-xs font-bold text-slate-800">Seller Payment / Payout Details</p>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">UPI ID for receiving payouts</label>
                  <input
                    type="text"
                    placeholder="yourname@upi"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Bank Name</label>
                    <input
                      type="text"
                      placeholder="HDFC Bank"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Account Number</label>
                    <input
                      type="text"
                      placeholder="9876543210"
                      value={bankAccount}
                      onChange={(e) => setBankAccount(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-xl shadow-lg shadow-orange-500/25 transition-all text-sm flex items-center justify-center space-x-2"
            >
              {loading ? (
                <span>Processing...</span>
              ) : (
                <>
                  <span>{isRegister ? `Register as ${selectedRole.toUpperCase()}` : `Login as ${selectedRole.toUpperCase()}`}</span>
                  <CheckCircle2 className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-5 text-center text-xs text-slate-500">
            {isRegister ? (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => handleModeToggle(false)}
                  className="font-bold text-orange-600 hover:underline"
                >
                  Sign In
                </button>
              </p>
            ) : (
              <p>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => handleModeToggle(true)}
                  className="font-bold text-orange-600 hover:underline"
                >
                  Register Now
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
