'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function AutoLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Read token from query parameter (?token=xxx)
    const token = searchParams.get('token');

    if (token) {
      try {
        // Decode JWT to extract user information
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));

          // Save user info to localStorage
          const user = {
            id: payload.id,
            username: payload.username,
            role: payload.role
          };
          localStorage.setItem('user', JSON.stringify(user));
        }
      } catch (error) {
        console.error('Failed to decode JWT:', error);
      }

      // Save token to localStorage
      localStorage.setItem('token', token);

      // Trigger auth-change event
      window.dispatchEvent(new Event('auth-change'));

      // Clear token from URL for security
      window.history.replaceState(null, '', window.location.pathname);

      // Redirect to dashboard
      router.push('/dashboard');
    } else {
      // No token, redirect to home
      router.push('/');
    }
  }, [router, searchParams]);

  return (
    <div className="loading">
      自動登入中...
    </div>
  );
}

export default function AutoLoginPage() {
  return (
    <Suspense fallback={<div className="loading">載入中...</div>}>
      <AutoLoginContent />
    </Suspense>
  );
}
