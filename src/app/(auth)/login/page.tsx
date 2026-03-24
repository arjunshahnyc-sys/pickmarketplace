'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { validateEmail, validatePassword } from '@/lib/validation';
import { GoogleIcon, AppleIcon } from '@/components/SocialIcons';
import { ShoppingBag, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate inputs
    const emailValidation = validateEmail(email);
    const passwordValidation = validatePassword(password);

    if (!emailValidation.valid || !passwordValidation.valid) {
      setErrors({
        email: emailValidation.error,
        password: passwordValidation.error,
      });
      return;
    }

    setIsLoading(true);

    const result = await login(email, password);

    if (result.success) {
      router.push('/');
    } else {
      setErrors({ general: result.error });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side: Value Proposition */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#2A9D8F] to-[#1A7A6F] relative overflow-hidden">
        <div className="relative z-10 flex flex-col justify-center px-12 text-white">
          <h1 className="text-4xl font-heading font-bold mb-6">
            Welcome back!
            <br />
            Your deals await.
          </h1>
          <p className="text-lg text-white/80 mb-10">
            Continue saving money on every purchase with Pick's AI-powered price comparison.
          </p>

          {/* Feature highlights */}
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-2xl">
                ⚡
              </div>
              <div>
                <p className="font-semibold">Instant Price Comparison</p>
                <p className="text-sm text-white/60">Compare 50+ retailers in seconds</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-2xl">
                🎯
              </div>
              <div>
                <p className="font-semibold">Smart Product Discovery</p>
                <p className="text-sm text-white/60">Find similar items at better prices</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-2xl">
                🔒
              </div>
              <div>
                <p className="font-semibold">Privacy First</p>
                <p className="text-sm text-white/60">No tracking, no data selling</p>
              </div>
            </div>
          </div>

          {/* Different testimonial */}
          <div className="mt-12 p-4 rounded-xl bg-white/10 border border-white/10">
            <p className="text-sm italic">
              "Saved $200 on a new laptop by using Pick. Can't believe I was about to overpay!"
            </p>
            <p className="text-xs text-white/50 mt-2">Mike R., Pick user since 2024</p>
          </div>
        </div>

        {/* Animated gradient orbs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Right Side: Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 mb-4">
              <ShoppingBag className="w-8 h-8 text-[#2A9D8F]" />
              <span className="text-2xl font-heading font-bold text-black">Pick</span>
            </Link>
            <h2 className="text-2xl font-heading font-bold text-black mt-4">
              Welcome back
            </h2>
            <p className="text-sm text-black/60 mt-1">
              Sign in to continue saving
            </p>
          </div>

          {errors.general && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {errors.general}
            </div>
          )}

          {/* Social Login Buttons */}
          <button
            type="button"
            onClick={() => alert('Google sign-in coming soon! Log in with email for now.')}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-black/10 rounded-xl hover:bg-black/5 transition mb-3"
          >
            <GoogleIcon />
            <span className="text-sm font-medium">Continue with Google</span>
          </button>
          <button
            type="button"
            onClick={() => alert('Apple sign-in coming soon! Log in with email for now.')}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-black/10 rounded-xl hover:bg-black/5 transition mb-6"
          >
            <AppleIcon />
            <span className="text-sm font-medium">Continue with Apple</span>
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-black/10" />
            <span className="text-xs text-black/40 uppercase">or continue with email</span>
            <div className="flex-1 h-px bg-black/10" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              {/* Email Field */}
              <div>
                <label className="text-sm font-medium text-black mb-1 block">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="john@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border ${
                    errors.email
                      ? 'border-red-500'
                      : 'border-black/10'
                  } text-sm focus:ring-2 focus:ring-[#2A9D8F] focus:border-transparent outline-none transition bg-white`}
                />
                {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
              </div>

              {/* Password Field */}
              <div>
                <label className="text-sm font-medium text-black mb-1 block">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full px-4 py-3 pr-10 rounded-xl border ${
                      errors.password
                        ? 'border-red-500'
                        : 'border-black/10'
                    } text-sm focus:ring-2 focus:ring-[#2A9D8F] focus:border-transparent outline-none transition bg-white`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-black/40 hover:text-black/60"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-black/20 text-[#2A9D8F] focus:ring-[#2A9D8F]"
                  />
                  <span className="text-sm text-black/60">Remember me</span>
                </label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-[#2A9D8F] hover:underline font-medium"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-6 py-3 bg-[#2A9D8F] text-white rounded-xl font-medium hover:bg-[#238B7E] transition transform hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-sm text-center mt-6 text-black/60">
            Don't have an account?{' '}
            <Link href="/signup" className="text-[#2A9D8F] font-medium hover:underline">
              Sign up free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
