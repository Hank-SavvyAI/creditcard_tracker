'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { useLanguageStore } from '@/store/language'

export default function TelegramAuthPage() {
  const { language } = useLanguageStore()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const botUsername = process.env.NEXT_PUBLIC_BOT_USERNAME || 'CardBenifitsTrackerbot'

  useEffect(() => {
    // Check if user is already logged in
    const storedUser = localStorage.getItem('user')
    const storedToken = localStorage.getItem('token')
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser))
    }

    // Define the callback function for Telegram widget
    (window as any).onTelegramAuth = async (telegramUser: any) => {
      console.log('Telegram auth received:', telegramUser)
      await handleTelegramAuth(telegramUser)
    }

    // Load Telegram widget script
    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.async = true
    script.setAttribute('data-telegram-login', botUsername)
    script.setAttribute('data-size', 'large')
    script.setAttribute('data-onauth', 'onTelegramAuth(user)')
    script.setAttribute('data-request-access', 'write')

    const telegramContainer = document.getElementById('telegram-login-container')
    if (telegramContainer && telegramContainer.children.length === 0) {
      telegramContainer.appendChild(script)
    }

    return () => {
      delete (window as any).onTelegramAuth
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleTelegramAuth = async (telegramUser: any) => {
    console.log('Telegram auth received:', telegramUser)
    setIsLoading(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/telegram`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId: telegramUser.id.toString(),
          username: telegramUser.username,
          firstName: telegramUser.first_name,
          lastName: telegramUser.last_name,
        }),
      })

      if (!response.ok) {
        throw new Error('Authentication failed')
      }

      const data = await response.json()
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      setUser(data.user)

      // Trigger auth change event for Header to update
      window.dispatchEvent(new Event('auth-change'))

      console.log('Telegram login successful, redirecting...')
      setTimeout(() => {
        router.push('/dashboard')
      }, 1500)
    } catch (error) {
      console.error('Telegram login error:', error)
      alert(language === 'zh-TW' ? 'Telegram 登入失敗，請重試' : 'Telegram login failed, please try again')
      setIsLoading(false)
    }
  }


  const containerStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, #5B9FD8 0%, #4A8AC7 100%)',
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    position: 'relative',
    fontFamily: "'Inter', sans-serif",
  }

  const loginContainerStyle: React.CSSProperties = {
    position: 'relative',
    zIndex: 10,
    width: '100%',
    maxWidth: '400px',
  }

  const glassEffectStyle: React.CSSProperties = {
    backdropFilter: 'blur(16px)',
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '16px',
    padding: '32px',
  }

  const titleStyle: React.CSSProperties = {
    textAlign: 'center',
    marginBottom: '32px',
  }

  const h1Style: React.CSSProperties = {
    fontSize: '30px',
    fontWeight: 'bold',
    color: 'white',
    marginBottom: '8px',
    margin: 0,
  }

  const subtitleStyle: React.CSSProperties = {
    color: 'rgba(255, 255, 255, 0.8)',
    margin: 0,
  }

  return (
    <div style={containerStyle}>
      <div style={{ position: 'absolute', top: '20px', right: '20px' }}>
        <LanguageSwitcher />
      </div>

      <div style={loginContainerStyle}>
        <div style={glassEffectStyle}>
          <div style={titleStyle}>
            <h1 style={h1Style}>
              {user ? (language === 'zh-TW' ? '帳號資訊' : 'Account Info') : (language === 'zh-TW' ? '歡迎回來' : 'Welcome Back')}
            </h1>
            <p style={subtitleStyle}>
              {user ? (language === 'zh-TW' ? '您已登入' : 'You are logged in') : (language === 'zh-TW' ? '使用 Telegram 登入' : 'Login with Telegram')}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Show user info if logged in */}
            {user && (
              <div style={{
                padding: '16px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
              }}>
                <p style={{ color: 'white', fontSize: '14px', marginBottom: '12px', margin: 0 }}>
                  {language === 'zh-TW' ? '目前登入的帳號為: ' : 'Logged in as: '}
                  {user.username || user.firstName || user.telegramId || 'Telegram User'}
                </p>
                <button
                  onClick={() => {
                    localStorage.removeItem('token')
                    localStorage.removeItem('user')
                    localStorage.removeItem('line_friend_prompted')
                    setUser(null)
                    // Trigger auth change event
                    window.dispatchEvent(new Event('auth-change'))
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 16px',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    fontWeight: '500',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    fontSize: '14px',
                    marginTop: '12px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#dc2626'
                    e.currentTarget.style.transform = 'translateY(-1px)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#ef4444'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  {language === 'zh-TW' ? '登出' : 'Sign Out'}
                </button>
              </div>
            )}

            {/* Telegram Login Widget - only show if not logged in */}
            {!user && (
              <div
                id="telegram-login-container"
                style={{
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  opacity: isLoading ? 0.5 : 1,
                  pointerEvents: isLoading ? 'none' : 'auto',
                }}
              ></div>
            )}

            {isLoading && (
              <p style={{ textAlign: 'center', color: 'white' }}>
                {language === 'zh-TW' ? '登入中...' : 'Logging in...'}
              </p>
            )}
          </div>

          <div style={{ marginTop: '24px', textAlign: 'center' }}>
            <a
              href="/"
              style={{
                color: 'white',
                textDecoration: 'none',
                fontWeight: '500',
                transition: 'all 0.2s ease',
              }}
            >
              ← {language === 'zh-TW' ? '返回首頁' : 'Back to Home'}
            </a>
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
      `}</style>
    </div>
  )
}
