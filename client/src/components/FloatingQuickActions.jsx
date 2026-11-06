import React, { useState } from 'react';
import { Sparkles, Radio, Stethoscope, Store, LayoutDashboard, X } from 'lucide-react';

/**
 * Floating Quick Actions Utility Bar
 *
 * Interactive floating glassmorphism widget providing instant 1-click access to
 * role-specific shortcuts and tools.
 */
export default function FloatingQuickActions({ currentUser, onOpenQuiz, onOpenRadar, onOpenVet, onOpenPortal }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 flex flex-col items-end space-y-3">
      {/* Expanded Quick Options */}
      {isOpen && (
        <div className="flex flex-col items-end space-y-2.5 animate-fadeIn">
          <button
            onClick={() => {
              onOpenQuiz();
              setIsOpen(false);
            }}
            className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-[#E07A5F] via-[#F4A261] to-[#E76F51] text-white font-bold text-xs rounded-full shadow-aesthetic hover:scale-105 transition-all cursor-pointer"
          >
            <span>🐾 Pet Matchmaker Quiz</span>
          </button>

          {currentUser?.role === 'buyer' && (
            <button
              onClick={() => {
                onOpenRadar();
                setIsOpen(false);
              }}
              className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-[#52796F] to-[#3A5A40] text-white font-bold text-xs rounded-full shadow-aesthetic hover:scale-105 transition-all cursor-pointer"
            >
              <Radio className="w-4 h-4 text-[#C5DFD2] animate-pulse" />
              <span>🚚 Live Transport Radar</span>
            </button>
          )}

          {currentUser?.role === 'seller' && (
            <button
              onClick={() => {
                onOpenPortal ? onOpenPortal('seller') : (window.location.hash = '#seller');
                setIsOpen(false);
              }}
              className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-[#D97706] to-[#B45309] text-white font-bold text-xs rounded-full shadow-aesthetic hover:scale-105 transition-all cursor-pointer"
            >
              <Store className="w-4 h-4 text-[#FED7AA]" />
              <span>Breeder Portal</span>
            </button>
          )}

          {currentUser?.role === 'vet' && (
            <button
              onClick={() => {
                onOpenPortal ? onOpenPortal('vet-dashboard') : (window.location.hash = '#vet-dashboard');
                setIsOpen(false);
              }}
              className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-[#243D36] to-[#1D312B] text-white font-bold text-xs rounded-full shadow-aesthetic hover:scale-105 transition-all cursor-pointer"
            >
              <Stethoscope className="w-4 h-4 text-[#C5DFD2]" />
              <span>Veterinary Portal</span>
            </button>
          )}

          {currentUser?.role === 'admin' && (
            <button
              onClick={() => {
                onOpenPortal ? onOpenPortal('admin-portal') : (window.location.hash = '#admin-portal');
                setIsOpen(false);
              }}
              className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-[#231F20] to-[#3D3536] text-white font-bold text-xs rounded-full shadow-aesthetic hover:scale-105 transition-all cursor-pointer"
            >
              <LayoutDashboard className="w-4 h-4 text-[#F4A261]" />
              <span>Platform Admin Portal</span>
            </button>
          )}

          {(currentUser?.role === 'shopkeeper' || currentUser?.role === 'groomer') && (
            <button
              onClick={() => {
                onOpenPortal ? onOpenPortal('saas-portal') : (window.location.hash = '#saas-portal');
                setIsOpen(false);
              }}
              className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-[#231F20] to-[#3D3536] text-white font-bold text-xs rounded-full shadow-aesthetic hover:scale-105 transition-all cursor-pointer"
            >
              <LayoutDashboard className="w-4 h-4 text-[#F4A261]" />
              <span>Business Dashboard</span>
            </button>
          )}

          {(!currentUser || currentUser.role === 'buyer') && (
            <button
              onClick={() => {
                onOpenVet();
                setIsOpen(false);
              }}
              className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-[#4A5D6E] to-[#2D3E4E] text-white font-bold text-xs rounded-full shadow-aesthetic hover:scale-105 transition-all cursor-pointer"
            >
              <Stethoscope className="w-4 h-4 text-[#B8C9D9]" />
              <span>🩺 24/7 Vet Doctor Chat</span>
            </button>
          )}
        </div>
      )}

      {/* Main Floating Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#E07A5F] via-[#F4A261] to-[#52796F] text-white flex items-center justify-center shadow-aesthetic hover:scale-110 transition-all border-2 border-white/40 glow-terracotta"
        title="Quick Interactive Hub"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Sparkles className="w-6 h-6 animate-spin" />}
      </button>
    </div>
  );
}
