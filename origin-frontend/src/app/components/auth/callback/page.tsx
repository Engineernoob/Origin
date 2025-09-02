// src/app/components/auth/callback/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/app/lib/auth-context';

export default function AuthCallback() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token');
  const { login } = useAuth();

  useEffect(() => {
    if (!token) {
      router.replace('/?auth=failed');
      return;
    }
    
    // Use the auth context login method which will store token and fetch user
    login(token);
    router.replace('/'); // redirect to home page
  }, [token, router, login]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p className="text-lg">Signing you in…</p>
      </div>
    </div>
  );
}