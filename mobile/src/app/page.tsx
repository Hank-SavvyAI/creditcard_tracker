'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import MobileLayout from '@/components/MobileLayout'
import Dashboard from './dashboard/page'

export default function Home() {
  const router = useRouter()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 開發模式：跳過登入驗證
    const skipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === 'true'

    if (skipAuth) {
      setIsLoggedIn(true)
      setLoading(false)
      return
    }

    const token = localStorage.getItem('token')
    if (token) {
      setIsLoggedIn(true)
    }
    setLoading(false)
  }, [])

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}>
        <div style={{ textAlign: 'center', color: 'white' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💳</div>
          <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Credit Card Tracker</h1>
          <p style={{ fontSize: '0.9rem', marginTop: '0.5rem', opacity: 0.9 }}>Loading...</p>
        </div>
      </div>
    )
  }

  if (!isLoggedIn) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '2rem',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
      }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>💳</div>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', textAlign: 'center' }}>
          Credit Card Tracker
        </h1>
        <p style={{ fontSize: '1rem', marginBottom: '2rem', textAlign: 'center', opacity: 0.9 }}>
          追蹤您的信用卡福利，不再錯過任何優惠
        </p>

        <div style={{
          width: '100%',
          maxWidth: '400px',
          background: 'rgba(255,255,255,0.15)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '2rem',
        }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', textAlign: 'center' }}>
            選擇登入方式
          </h3>

          <a
            href={`${process.env.NEXT_PUBLIC_API_URL}/api/auth/google`}
            style={{
              display: 'block',
              width: '100%',
              padding: '1rem',
              marginBottom: '1rem',
              background: 'white',
              color: '#4285F4',
              borderRadius: '12px',
              textAlign: 'center',
              textDecoration: 'none',
              fontWeight: '600',
              fontSize: '1rem',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            }}
          >
            🌐 使用 Google 登入
          </a>

          <a
            href="/auth/telegram"
            style={{
              display: 'block',
              width: '100%',
              padding: '1rem',
              marginBottom: '1rem',
              background: '#0088cc',
              color: 'white',
              borderRadius: '12px',
              textAlign: 'center',
              textDecoration: 'none',
              fontWeight: '600',
              fontSize: '1rem',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            }}
          >
            💬 使用 Telegram 登入
          </a>

          <a
            href={`${process.env.NEXT_PUBLIC_API_URL}/api/auth/line`}
            style={{
              display: 'block',
              width: '100%',
              padding: '1rem',
              background: '#00B900',
              color: 'white',
              borderRadius: '12px',
              textAlign: 'center',
              textDecoration: 'none',
              fontWeight: '600',
              fontSize: '1rem',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            }}
          >
            💚 使用 LINE 登入
          </a>
        </div>
      </div>
    )
  }

  return <Dashboard />
}
