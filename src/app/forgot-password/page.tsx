'use client';

import Link from 'next/link';
import { ShoppingBag, KeyRound, Mail } from 'lucide-react';

export default function ForgotPasswordPage() {
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
              Self-serve password reset isn't wired up yet while we're in beta.
              Email us and we'll get you back into your account.
            </p>
          </div>
        </div>

        <a
          href="mailto:support@pickmarketplace.com?subject=Password%20reset%20request"
          className="w-full flex items-start gap-3 p-4 border border-black/10 rounded-xl hover:border-[#2A9D8F] hover:bg-black/[0.02] transition text-left"
        >
          <Mail className="w-5 h-5 text-[#2A9D8F] mt-0.5 shrink-0" />
          <span>
            <span className="block text-sm font-medium text-black">
              Email support
            </span>
            <span className="block text-xs text-black/60 mt-1">
              support@pickmarketplace.com — include the email you signed up with.
            </span>
          </span>
        </a>

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
