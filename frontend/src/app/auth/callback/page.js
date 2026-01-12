/**
 * Google OAuth Callback Page
 *
 * Handles the redirect from Google OAuth
 *
 * @module app/auth/callback
 */

'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { saveUserInfo } from '@/lib/storage';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const userName = searchParams.get('user_name');
    const userEmail = searchParams.get('user_email');
    const userPicture = searchParams.get('user_picture');

    if (userName && userEmail) {
      // Save user info to localStorage (tokens are already in cookies)
      saveUserInfo({
        name: userName,
        email: userEmail,
        picture: userPicture,
      });

      // Redirect to home page
      router.push('/');
    } else {
      // Authentication failed
      console.error('Authentication failed: Missing user information');
      router.push('/?error=auth_failed');
    }
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-maroon mx-auto mb-4"></div>
        <p className="text-gray-600">Completing sign in...</p>
      </div>
    </div>
  );
}
