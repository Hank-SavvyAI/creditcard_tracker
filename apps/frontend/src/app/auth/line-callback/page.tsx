'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Legacy LINE callback page - redirects to new auto-login page
 * This ensures backward compatibility with old links
 */
export default function LineCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to new auto-login page
    // Preserve hash and query parameters
    const hash = window.location.hash;
    const search = window.location.search;
    router.replace(`/auth/auto-login${search}${hash}`);
  }, [router]);

  return (
    <div className="loading">
      重新導向中...
    </div>
  );
}
