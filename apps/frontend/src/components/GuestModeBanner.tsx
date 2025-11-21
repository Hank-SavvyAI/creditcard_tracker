'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLanguageStore } from '@/store/language'

export default function GuestModeBanner() {
  const { language } = useLanguageStore()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    const user = localStorage.getItem('user')
    setIsLoggedIn(!!user)
  }, [])

  // 避免 SSR hydration 錯誤
  if (!isMounted || isLoggedIn) {
    return null
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)',
      color: '#075985',
      padding: '1rem 1.5rem',
      borderRadius: '8px',
      marginBottom: '1.5rem',
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
      border: '1px solid #bae6fd'
    }}>
      <span style={{ fontSize: '1.5rem' }}>ℹ️</span>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontWeight: '600', marginBottom: '0.25rem' }} suppressHydrationWarning>
          {language === 'zh-TW' ? '訪客模式' : 'Guest Mode'}
        </p>
        <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.85 }} suppressHydrationWarning>
          {language === 'zh-TW'
            ? '您的資料目前只儲存在本機瀏覽器中。登入以同步資料到雲端，並在多個裝置間使用。'
            : 'Your data is currently stored locally in your browser. Login to sync data to the cloud and access across devices.'}
        </p>
      </div>
      <Link href="/" style={{
        padding: '0.5rem 1.5rem',
        background: '#0284c7',
        color: 'white',
        borderRadius: '6px',
        textDecoration: 'none',
        fontWeight: '600',
        whiteSpace: 'nowrap',
        fontSize: '0.9rem'
      }} suppressHydrationWarning>
        {language === 'zh-TW' ? '立即登入' : 'Login Now'}
      </Link>
    </div>
  )
}
