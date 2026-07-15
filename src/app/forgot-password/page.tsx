'use client';

import Link from 'next/link';
import { ShoppingBag, KeyRound, Trash2, Mail } from 'lucide-react';

export default function ForgotPasswordPage() {
  const handleClearAccount = () => {
    const confirmed = window.confirm(
      'This removes the Pick account stored in this browser so you can sign up again with the same email. Your search history and plan on this device will be lost. Continue?'
    );
    if (confirmed) {
      localStorage.removeItem('pick_users');
      localStorage.removeItem('pick_session');
      window.location.href = '/signup';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-white">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <ShoppingBag className="w-8 h-8 text-[#2A9D8F]" />
            <span className="text-2xl font-heading font-bold text-black">Pick</span>
          </Link>
          <h1 className="text-2xl font-heading font-bold text-black mt-4">
            Forgot your password?
          </h1>
        </div>

        <div className="p-4 rounded-xl bg-black/5 border border-black/10 mb-6">
          <div className="flex items-start gap-3">
            <KeyRound className="w-5 h-5 text-[#2A9D8F] mt-0.5 shrink-0" />
            <p className="text-sm text-black/70 leading-relaxed">
              Pick accounts are currently stored only in your browser — we never
              send your password to a server, so we can't email you a reset
              link. Here's what you can do instead:
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <button
            type="button"
            onClick={handleClearAccount}
            className="w-full flex items-start gap-3 p-4 border border-black/10 rounded-xl hover:border-[#2A9D8F] hover:bg-black/[0.02] transition text-left"
          >
            <Trash2 className="w-5 h-5 text-[#2A9D8F] mt-0.5 shrink-0" />
            <span>
              <span className="block text-sm font-medium text-black">
                Reset this browser's account
              </span>
              <span className="block text-xs text-black/60 mt-1">
                Removes the account saved on this device so you can sign up
                again with the same email.
              </span>
            </span>
          </button>

          <a
            href="mailto:support@pickmarketplace.com?subject=Password%20help"
            className="w-full flex items-start gap-3 p-4 border border-black/10 rounded-xl hover:border-[#2A9D8F] hover:bg-black/[0.02] transition text-left"
          >
            <Mail className="w-5 h-5 text-[#2A9D8F] mt-0.5 shrink-0" />
            <span>
              <span className="block text-sm font-medium text-black">
                Contact support
              </span>
              <span className="block text-xs text-black/60 mt-1">
                Email support@pickmarketplace.com and we'll help you out.
              </span>
            </span>
          </a>
        </div>

        <p className="text-sm text-center mt-8 text-black/60">
          Remembered it after all?{' '}
          <Link href="/login" className="text-[#2A9D8F] font-medium hover:underline">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
