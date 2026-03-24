'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { validateEmail, validatePassword, validateName } from '@/lib/validation';
import { GoogleIcon, AppleIcon } from '@/components/SocialIcons';
import { PasswordStrength } from '@/components/PasswordStrength';
import { ShoppingBag, Eye, EyeOff, Check } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    general?: string;
  }>({});
  const [touched, setTouched] = useState<{
    name?: boolean;
    email?: boolean;
    password?: boolean;
  }>({});
  const [isLoading, setIsLoading] = useState(false);

  // Inline validation on blur
  const handleBlur = (field: 'name' | 'email' | 'password') => {
    setTouched({ ...touched, [field]: true });

    let validation;
    if (field === 'name') validation = validateName(name);
    else if (field === 'email') validation = validateEmail(email);
    else validation = validatePassword(password);

    if (!validation.valid) {
      setErrors({ ...errors, [field]: validation.error });
    } else {
      const newErrors = { ...errors };
      delete newErrors[field];
      setErrors(newErrors);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate all inputs
    const nameValidation = validateName(name);
    const emailValidation = validateEmail(email);
    const passwordValidation = validatePassword(password);

    if (!nameValidation.valid || !emailValidation.valid || !passwordValidation.valid) {
      setErrors({
        name: nameValidation.error,
        email: emailValidation.error,
        password: passwordValidation.error,
      });
      return;
    }

    setIsLoading(true);

    const result = await signup(name, email, password);

    if (result.success) {
      router.push('/');
    } else {
      setErrors({ general: result.error });
      setIsLoading(false);
    }
  };

  const isFieldValid = (field: 'name' | 'email' | 'password') => {
    return touched[field] && !errors[field] && (
      (field === 'name' && name.length >= 2) ||
      (field === 'email' && validateEmail(email).valid) ||
      (field === 'password' && validatePassword(password).valid)
    );
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side: Value Proposition */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#2A9D8F] to-[#1A7A6F] relative overflow-hidden">
        <div className="relative z-10 flex flex-col justify-center px-12 text-white">
          <h1 className="text-4xl font-heading font-bold mb-6">
            Stop overpaying.
            <br />
            Start saving.
          </h1>
          <p className="text-lg text-white/80 mb-10">
            Join 10,000+ smart shoppers who save an average of $47 per purchase with Pick.
          </p>

          {/* Animated stats */}
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-2xl">
                🔍
              </div>
              <div>
                <p className="font-semibold">50+ Retailers Searched</p>
                <p className="text-sm text-white/60">Amazon, Target, Best Buy, Walmart & more</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-2xl">
                💰
              </div>
              <div>
                <p className="font-semibold">$2M+ Saved by Users</p>
                <p className="text-sm text-white/60">Real savings on real products</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-2xl">
                🤖
              </div>
              <div>
                <p className="font-semibold">AI Shopping Assistant</p>
                <p className="text-sm text-white/60">Find deals, discover dupes, compare prices</p>
              </div>
            </div>
          </div>

          {/* Testimonial */}
          <div className="mt-12 p-4 rounded-xl bg-white/10 border border-white/10">
            <p className="text-sm italic">
              "Found my AirPods for $60 less than Amazon's listed price. This tool is insane."
            </p>
            <p className="text-xs text-white/50 mt-2">— Sarah M., Pick Premium member</p>
          </div>
        </div>

        {/* Animated gradient orbs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Right Side: Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12 bg-white dark:bg-black">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 mb-4">
              <ShoppingBag className="w-8 h-8 text-[#2A9D8F]" />
              <span className="text-2xl font-heading font-bold text-[var(--foreground)]">Pick</span>
            </Link>
            <h2 className="text-2xl font-heading font-bold text-[var(--foreground)] mt-4">
              Create your account
            </h2>
            <p className="text-sm text-gray-500 dark:text-white/70 mt-1">
              Free forever. No credit card required.
            </p>
          </div>

          {errors.general && (
            <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
              {errors.general}
            </div>
          )}

          {/* Social Login Buttons */}
          <button
            type="button"
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-200 dark:border-white/10 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition mb-3 dark:text-white"
          >
            <GoogleIcon />
            <span className="text-sm font-medium">Continue with Google</span>
          </button>
          <button
            type="button"
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-200 dark:border-white/10 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition mb-6 dark:text-white"
          >
            <AppleIcon />
            <span className="text-sm font-medium">Continue with Apple</span>
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
            <span className="text-xs text-gray-400 uppercase">or continue with email</span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              {/* Name Field */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-white/70 mb-1 block">
                  Full name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={() => handleBlur('name')}
                    className={`w-full px-4 py-3 rounded-xl border ${
                      errors.name
                        ? 'border-red-500 dark:border-red-500'
                        : touched.name && isFieldValid('name')
                        ? 'border-green-500 dark:border-green-500'
                        : 'border-gray-200 dark:border-white/10'
                    } text-sm focus:ring-2 focus:ring-[#2A9D8F] focus:border-transparent outline-none transition bg-white dark:bg-black dark:text-white`}
                  />
                  {isFieldValid('name') && (
                    <Check className="absolute right-3 top-3 w-5 h-5 text-green-500" />
                  )}
                </div>
                {errors.name && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.name}</p>}
              </div>

              {/* Email Field */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-white/70 mb-1 block">
                  Email
                </label>
                <div className="relative">
                  <input
                    type="email"
                    placeholder="john@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => handleBlur('email')}
                    className={`w-full px-4 py-3 rounded-xl border ${
                      errors.email
                        ? 'border-red-500 dark:border-red-500'
                        : touched.email && isFieldValid('email')
                        ? 'border-green-500 dark:border-green-500'
                        : 'border-gray-200 dark:border-white/10'
                    } text-sm focus:ring-2 focus:ring-[#2A9D8F] focus:border-transparent outline-none transition bg-white dark:bg-black dark:text-white`}
                  />
                  {isFieldValid('email') && (
                    <Check className="absolute right-3 top-3 w-5 h-5 text-green-500" />
                  )}
                </div>
                {errors.email && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.email}</p>}
              </div>

              {/* Password Field */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-white/70 mb-1 block">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min. 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => handleBlur('password')}
                    className={`w-full px-4 py-3 pr-10 rounded-xl border ${
                      errors.password
                        ? 'border-red-500 dark:border-red-500'
                        : touched.password && isFieldValid('password')
                        ? 'border-green-500 dark:border-green-500'
                        : 'border-gray-200 dark:border-white/10'
                    } text-sm focus:ring-2 focus:ring-[#2A9D8F] focus:border-transparent outline-none transition bg-white dark:bg-black dark:text-white`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 dark:hover:text-white"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.password}</p>}
                <PasswordStrength password={password} />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-6 py-3 bg-[#2A9D8F] text-white rounded-xl font-medium hover:bg-[#238B7E] transition transform hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? 'Creating account...' : 'Create Free Account'}
            </button>
          </form>

          <p className="text-xs text-gray-400 dark:text-white/70 text-center mt-4">
            By signing up, you agree to our{' '}
            <Link href="/terms" className="underline hover:text-gray-600 dark:hover:text-white">
              Terms
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="underline hover:text-gray-600 dark:hover:text-white">
              Privacy Policy
            </Link>
          </p>
          <p className="text-sm text-center mt-6 text-gray-500 dark:text-white/70">
            Already have an account?{' '}
            <Link href="/login" className="text-[#2A9D8F] font-medium hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
