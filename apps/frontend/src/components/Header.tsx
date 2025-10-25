'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useLanguageStore } from '@/store/language'
import LanguageSwitcher from './LanguageSwitcher'

export default function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const { language } = useLanguageStore()
  const [user, setUser] = useState<any>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem('user')
    const storedToken = localStorage.getItem('token')
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser))
    }
    setIsMounted(true)

    // Listen for storage changes (login/logout from other tabs)
    const handleStorageChange = () => {
      const updatedUser = localStorage.getItem('user')
      const updatedToken = localStorage.getItem('token')
      if (updatedUser && updatedToken) {
        setUser(JSON.parse(updatedUser))
      } else {
        setUser(null)
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    setShowDropdown(false)
    router.push('/')
  }

  const handleLogin = () => {
    router.push('/auth/telegram')
  }

  // Don't show header on auth pages
  if (pathname?.startsWith('/auth/')) {
    return null
  }

  return (
    <header style={{
      background: 'var(--background-card)',
      borderBottom: '1px solid var(--border-color)',
      padding: '1rem 2rem',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      backdropFilter: 'blur(8px)',
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        {/* Logo / Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <a href="/" style={{ textDecoration: 'none' }}>
            <h1 style={{
              margin: 0,
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: 'var(--primary-color)',
            }}>
              💳 {language === 'zh-TW' ? '信用卡福利追蹤' : 'Credit Card Tracker'}
            </h1>
          </a>

          {/* Navigation Links */}
          <nav style={{ display: 'flex', gap: '1.5rem' }}>
            <a href="/" style={{
              textDecoration: 'none',
              color: 'var(--foreground)',
              fontWeight: pathname === '/' ? 'bold' : 'normal',
            }}>
              {language === 'zh-TW' ? '首頁' : 'Home'}
            </a>
            <a href="/cards" style={{
              textDecoration: 'none',
              color: 'var(--foreground)',
              fontWeight: pathname === '/cards' ? 'bold' : 'normal',
            }}>
              {language === 'zh-TW' ? '新增信用卡' : 'Add Card'}
            </a>
            {isMounted && user && (
              <a href="/dashboard" style={{
                textDecoration: 'none',
                color: 'var(--foreground)',
                fontWeight: pathname === '/dashboard' ? 'bold' : 'normal',
              }}>
                {language === 'zh-TW' ? '我的卡片' : 'My Cards'}
              </a>
            )}
          </nav>
        </div>

        {/* Right Side: Language Switcher + User Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <LanguageSwitcher />

          {!isMounted ? (
            <div style={{ width: '100px', height: '40px' }}></div>
          ) : user ? (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  background: 'var(--background)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  color: 'var(--foreground)',
                  fontWeight: '500',
                }}
              >
                <span>👤</span>
                <span>{user.username || user.firstName || 'User'}</span>
                <span style={{ fontSize: '0.8rem' }}>▼</span>
              </button>

              {showDropdown && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '0.5rem',
                  background: 'white',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  minWidth: '200px',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    padding: '1rem',
                    borderBottom: '1px solid var(--border-color)',
                  }}>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--foreground-light)' }}>
                      {language === 'zh-TW' ? '登入身份' : 'Logged in as'}
                    </p>
                    <p style={{ margin: 0, fontWeight: 'bold', marginTop: '0.25rem' }}>
                      {user.username || user.firstName || user.telegramId}
                    </p>
                  </div>
                  <button
                    onClick={handleLogout}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      color: '#ef4444',
                      fontWeight: '500',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#fee'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent'
                    }}
                  >
                    {language === 'zh-TW' ? '登出' : 'Logout'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={handleLogin}
              style={{
                padding: '0.5rem 1.5rem',
                background: 'var(--primary-color)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '500',
              }}
            >
              {language === 'zh-TW' ? '登入' : 'Login'}
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
