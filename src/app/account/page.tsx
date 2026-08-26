'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';

export default function AccountPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  // Redirect only after the session has been restored, or a hard refresh
  // bounces logged-in users to /login before AuthContext finishes loading
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="h-8 w-56 bg-black/5 rounded animate-pulse mb-8" />
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="h-5 w-40 bg-black/5 rounded animate-pulse mb-4" />
            <div className="h-4 w-64 bg-black/5 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-black mb-8">Account Settings</h1>

        {/* Profile Info */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-black mb-4">Profile Information</h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-black/60">Name</label>
              <p className="text-black font-medium">{user.name}</p>
            </div>
            <div>
              <label className="text-sm text-black/60">Email</label>
              <p className="text-black font-medium">{user.email}</p>
            </div>
            <div>
              <label className="text-sm text-black/60">Member Since</label>
              <p className="text-black font-medium">
                {new Date(user.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Logout */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-black mb-4">Account Actions</h2>
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
    </div>
  );
}
