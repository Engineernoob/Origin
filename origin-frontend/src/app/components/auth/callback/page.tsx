// src/app/auth/callback/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/app/lib/auth';

export default function AuthCallback() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token');
  const { setUser } = useAuth();

  useEffect(() => {
    if (!token) {
      router.replace('/?auth=failed');
      return;
    }
    // store token
    localStorage.setItem('origin_token', token);

    // (optional) decode or call /me to get user profile
    // For now, just trigger a /me fetch or set minimal user
    // setUser({ name: 'Loading...', ... })

    router.replace('/'); // or the page the user came from
  }, [token, router, setUser]);

  return <p className="p-6">Signing you in…</p>;
}