'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('處理登入中...')

  useEffect(() => {
    const token = searchParams.get('token')
    const userParam = searchParams.get('user')

    if (!token) {
      setStatus('error')
      setMessage('缺少登入憑證')
      setTimeout(() => router.push('/'), 3000)
      return
    }

    // 處理登入
    const handleLogin = async () => {
      try {
        let userData

        // 如果 URL 有提供 user 參數，直接使用
        if (userParam) {
          try {
            userData = JSON.parse(decodeURIComponent(userParam))
          } catch (e) {
            console.error('Failed to parse user data from URL, fetching from API')
          }
        }

        // 如果沒有 user 參數或解析失敗，從 API 取得
        if (!userData) {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/me`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })

          if (!response.ok) {
            throw new Error('Token 驗證失敗')
          }

          userData = await response.json()
        }

        // 儲存 token 和使用者資料
        localStorage.setItem('token', token)
        localStorage.setItem('user', JSON.stringify(userData))

        console.log('Login successful, user data:', userData)

        // Trigger auth change event for Header to update
        window.dispatchEvent(new Event('auth-change'))

        setStatus('success')
        setMessage('登入成功！正在跳轉...')

        // 跳轉到 dashboard
        setTimeout(() => {
          router.push('/dashboard')
        }, 1500)

      } catch (error) {
        console.error('Login error:', error)
        setStatus('error')
        setMessage('登入失敗，請重試')
        setTimeout(() => router.push('/'), 3000)
      }
    }

    handleLogin()
  }, [searchParams, router])

  return (
    <div style={{
      background: 'linear-gradient(135deg, #5B9FD8 0%, #4A8AC7 100%)',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      fontFamily: "'Inter', sans-serif"
    }}>
      <div style={{
        backdropFilter: 'blur(16px)',
        background: 'rgba(255, 255, 255, 0.1)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '16px',
        padding: '48px',
        textAlign: 'center',
        maxWidth: '400px',
        width: '100%'
      }}>
        {status === 'loading' && (
          <>
            <div style={{
              width: '60px',
              height: '60px',
              border: '4px solid rgba(255, 255, 255, 0.3)',
              borderTop: '4px solid white',
              borderRadius: '50%',
              margin: '0 auto 24px',
              animation: 'spin 1s linear infinite'
            }}></div>
            <p style={{ color: 'white', fontSize: '18px', margin: 0 }}>{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{
              width: '60px',
              height: '60px',
              margin: '0 auto 24px',
              fontSize: '48px'
            }}>✅</div>
            <p style={{ color: 'white', fontSize: '18px', margin: 0 }}>{message}</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{
              width: '60px',
              height: '60px',
              margin: '0 auto 24px',
              fontSize: '48px'
            }}>❌</div>
            <p style={{ color: 'white', fontSize: '18px', margin: 0 }}>{message}</p>
          </>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div style={{
        background: 'linear-gradient(135deg, #5B9FD8 0%, #4A8AC7 100%)',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{ color: 'white', fontSize: '18px' }}>載入中...</div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  )
}
