'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ConfettiCelebration from './ConfettiCelebration';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan?: 'monthly' | 'annual';
}

export default function CheckoutModal({ isOpen, onClose, plan = 'monthly' }: CheckoutModalProps) {
  const { upgradeToPremium } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  if (!isOpen) return null;

  const handleActivate = async () => {
    setIsProcessing(true);

    await new Promise((resolve) => setTimeout(resolve, 800));

    upgradeToPremium();
    setIsProcessing(false);
    setShowSuccess(true);
    setShowConfetti(true);

    // Auto-close after celebration
    setTimeout(() => {
      setShowConfetti(false);
      setTimeout(() => {
        onClose();
        setShowSuccess(false);
      }, 500);
    }, 3000);
  };

  if (showSuccess) {
    return (
      <>
        {showConfetti && <ConfettiCelebration />}
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-8 text-center">
            <div className="w-20 h-20 bg-[#2A9D8F] rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-10 h-10 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-black/900 mb-4">Welcome to Premium! 🎉</h2>
            <p className="text-black/600 text-lg">
              You now have unlimited access to all features.
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-black/900">Upgrade to Premium</h2>
          <button
            onClick={onClose}
            className="text-black/400 hover:text-black/600"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg mb-4">
          <div className="flex items-center justify-between">
            <span className="text-black/700 font-medium">Premium Plan</span>
            <span className="text-2xl font-bold text-black/900">
              Free
              <span className="text-base font-normal text-black/600"> during beta</span>
            </span>
          </div>
          <p className="text-xs text-black/600 mt-1 line-through">
            {plan === 'annual' ? '$39.99/yr' : '$4.99/mo'}
          </p>
        </div>

        <p className="text-sm text-black/60 mb-6 leading-relaxed">
          Pick is in beta, so Premium is free to activate — no card, no charge.
          When paid billing launches, you'll be asked before anything changes.
        </p>

        <button
          type="button"
          onClick={handleActivate}
          disabled={isProcessing}
          className="w-full bg-[#2A9D8F] text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? 'Activating...' : 'Activate Premium — Free'}
        </button>
      </div>
    </div>
  );
}
