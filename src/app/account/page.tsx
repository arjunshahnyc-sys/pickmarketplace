'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import CheckoutModal from '@/components/membership/CheckoutModal';
import { getSearchCount } from '@/lib/storage';

export default function AccountPage() {
  const router = useRouter();
  const { user, isAuthenticated, logout, downgradToFree, getFeatureLimit, searchesRemaining } = useAuth();
  const [showCheckout, setShowCheckout] = useState(false);

  // Redirect if not authenticated (client-side only)
  if (typeof window !== 'undefined' && !isAuthenticated) {
    router.push('/login');
    return null;
  }

  if (!user) {
    return null;
  }

  const searchCount = getSearchCount();
  const dailyLimit = getFeatureLimit('searchesPerDay');
  const resultsLimit = getFeatureLimit('resultsPerSearch');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      <Header />

      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Account Settings</h1>

        {/* Profile Info */}
        <div className="bg-white dark:bg-black rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Profile Information</h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-600">Name</label>
              <p className="text-gray-900 font-medium">{user.name}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600">Email</label>
              <p className="text-gray-900 font-medium">{user.email}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600">Member Since</label>
              <p className="text-gray-900 font-medium">
                {new Date(user.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Current Plan */}
        <div className="bg-white dark:bg-black rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Current Plan</h2>

          <div className="flex items-center justify-between mb-6">
            <div>
              <span
                className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${
                  user.plan === 'premium'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                {user.plan === 'premium' ? 'Premium' : 'Pick Basic'}
              </span>
              <p className="text-gray-600 mt-2">
                {user.plan === 'premium' ? '$4.99/month' : 'Free forever'}
              </p>
            </div>

            {user.plan === 'free' ? (
              <button
                onClick={() => setShowCheckout(true)}
                className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-2 rounded-lg font-semibold hover:shadow-lg transition-shadow"
              >
                Upgrade to Premium
              </button>
            ) : (
              <button
                onClick={downgradToFree}
                className="border border-gray-300 text-gray-700 px-6 py-2 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
              >
                Cancel Subscription
              </button>
            )}
          </div>

          {/* Usage Stats */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Usage Statistics</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-700 mb-1">Searches Today</p>
                <p className="text-2xl font-bold text-blue-900">
                  {user.plan === 'free' ? searchCount.count : '∞'}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Limit: {dailyLimit === 'unlimited' ? 'Unlimited' : dailyLimit}
                </p>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-green-700 mb-1">Searches Remaining</p>
                <p className="text-2xl font-bold text-green-900">
                  {user.plan === 'premium' ? '∞' : searchesRemaining}
                </p>
                <p className="text-xs text-green-600 mt-1">Resets daily at midnight</p>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm text-purple-700 mb-1">Results per Search</p>
                <p className="text-2xl font-bold text-purple-900">{resultsLimit}</p>
                <p className="text-xs text-purple-600 mt-1">
                  {user.plan === 'premium' ? 'Maximum results' : 'Free tier limit'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Features Access */}
        <div className="bg-white dark:bg-black rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Feature Access</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <span className="text-gray-700">Price Comparison</span>
              {user.plan === 'premium' ? (
                <span className="text-green-600 flex items-center">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Active
                </span>
              ) : (
                <span className="text-gray-400">Premium Only</span>
              )}
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-gray-700">Price History & Alerts</span>
              {user.plan === 'premium' ? (
                <span className="text-green-600 flex items-center">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Active
                </span>
              ) : (
                <span className="text-gray-400">Premium Only</span>
              )}
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-gray-700">Similar Products</span>
              {user.plan === 'premium' ? (
                <span className="text-green-600 flex items-center">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Active
                </span>
              ) : (
                <span className="text-gray-400">Premium Only</span>
              )}
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-gray-700">Full AI Chatbot</span>
              {user.plan === 'premium' ? (
                <span className="text-green-600 flex items-center">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Active
                </span>
              ) : (
                <span className="text-yellow-600">Limited</span>
              )}
            </div>
          </div>
        </div>

        {/* Logout */}
        <div className="bg-white dark:bg-black rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Account Actions</h2>
          <button
            onClick={() => {
              logout();
              router.push('/');
            }}
            className="bg-red-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-red-700 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      <CheckoutModal isOpen={showCheckout} onClose={() => setShowCheckout(false)} />
    </div>
  );
}
