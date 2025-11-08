'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function LineCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');

    if (token) {
      // Save token to localStorage
      localStorage.setItem('token', token);

      // Trigger auth-change event
      window.dispatchEvent(new Event('auth-change'));

      // Redirect to dashboard
      router.push('/dashboard');
    } else {
      // No token, redirect to home
      router.push('/');
    }
  }, [searchParams, router]);

  return (
    <div className="loading">
      自動登入中...
    </div>
  );
}

export default function LineCallbackPage() {
  return (
    <Suspense fallback={<div className="loading">載入中...</div>}>
      <LineCallbackContent />
    </Suspense>
  );
}
