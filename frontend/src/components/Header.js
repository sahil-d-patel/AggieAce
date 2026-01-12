/**
 * Header Component
 *
 * Main header with branding and Google sign-in
 *
 * @module components/Header
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn, LogOut, User } from 'lucide-react';
import { getGoogleAuthUrl } from '@/lib/api';
import { getUserInfo, clearAuthData, isAuthenticated } from '@/lib/storage';

export default function Header() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if user is authenticated
    if (isAuthenticated()) {
      const userInfo = getUserInfo();
      setUser(userInfo);
    }
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      const authUrl = await getGoogleAuthUrl();
      window.location.href = authUrl;
    } catch (error) {
      console.error('Failed to initiate Google sign-in:', error);
      alert('Failed to sign in with Google. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    clearAuthData();
    setUser(null);
    window.location.reload();
  };

  return (
    <header className="bg-tamu-maroon text-white shadow-lg">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          {/* Logo and Title */}
          <div className="flex items-center space-x-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">AggieAce</h1>
              <p className="text-sm text-tamu-white/80">
                Syllabus Amplified, Life Simplified
              </p>
            </div>
          </div>

          {/* Google Sign In / User Info */}
          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.push('/account')}
                  className="flex items-center space-x-2 bg-tamu-maroon-light px-4 py-2 rounded-lg hover:bg-tamu-maroon-dark transition-all duration-200 cursor-pointer"
                  title="View your account and calendar history"
                >
                  <User size={20} />
                  <span className="text-sm font-medium">{user.name}</span>
                </button>
                <button
                  onClick={handleSignOut}
                  className="flex items-center space-x-2 bg-tamu-white text-tamu-maroon px-4 py-2 rounded-lg hover:bg-tamu-gray transition-all duration-200 font-semibold"
                >
                  <LogOut size={20} />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="flex items-center space-x-2 bg-tamu-white text-tamu-maroon px-6 py-3 rounded-lg hover:bg-tamu-gray transition-all duration-200 font-semibold disabled:opacity-50"
              >
                <LogIn size={20} />
                <span>{loading ? 'Connecting...' : 'Sign in with Google'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
