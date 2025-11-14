'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
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
    const checkLoginStatus = () => {
      const storedUser = localStorage.getItem('user')
      const storedToken = localStorage.getItem('token')
      if (storedUser && storedToken) {
        setUser(JSON.parse(storedUser))
      } else {
        setUser(null)
      }
    }

    checkLoginStatus()
    setIsMounted(true)

    // Listen for storage changes (login/logout from other tabs)
    const handleStorageChange = () => {
      checkLoginStatus()
    }

    // Listen for custom auth change events (same tab)
    const handleAuthChange = () => {
      checkLoginStatus()
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('auth-change', handleAuthChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('auth-change', handleAuthChange)
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('line_friend_prompted') // 清除 LINE 好友提示標記
    setUser(null)
    setShowDropdown(false)
    // Trigger auth change event
    window.dispatchEvent(new Event('auth-change'))
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
      padding: '0.75rem 1rem',
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
        gap: '0.5rem',
      }}>
        {/* Logo / Title */}
        <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: '1', minWidth: 0 }}>
          <Link href="/" style={{ textDecoration: 'none', flexShrink: 0 }}>
            <h1 style={{
              margin: 0,
              fontSize: '1.1rem',
              fontWeight: 'bold',
              color: 'var(--primary-color)',
              whiteSpace: 'nowrap',
            }}>
              💳 {language === 'zh-TW' ? '信用卡' : 'CC'}
            </h1>
          </Link>

          {/* Navigation Links */}
          <nav style={{ display: 'flex', gap: '0.75rem', overflow: 'hidden' }}>
            <Link href="/" style={{
              textDecoration: 'none',
              color: 'var(--foreground)',
              fontWeight: pathname === '/' ? 'bold' : 'normal',
              fontSize: '0.9rem',
              whiteSpace: 'nowrap',
            }}>
              {language === 'zh-TW' ? '首頁' : 'Home'}
            </Link>
            <Link href="/cards" style={{
              textDecoration: 'none',
              color: 'var(--foreground)',
              fontWeight: pathname === '/cards' ? 'bold' : 'normal',
              fontSize: '0.9rem',
              whiteSpace: 'nowrap',
            }}>
              {language === 'zh-TW' ? '新增' : 'Add'}
            </Link>
            {isMounted && user && (
              <Link href="/dashboard" style={{
                textDecoration: 'none',
                color: 'var(--foreground)',
                fontWeight: pathname === '/dashboard' ? 'bold' : 'normal',
                fontSize: '0.9rem',
                whiteSpace: 'nowrap',
              }}>
                {language === 'zh-TW' ? '卡片' : 'Cards'}
              </Link>
            )}
          </nav>
        </div>

        {/* Right Side: Language Switcher + User Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
          <LanguageSwitcher />

          {!isMounted ? (
            <div style={{ width: '80px', height: '36px' }}></div>
          ) : user ? (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  padding: '0.4rem 0.7rem',
                  background: 'var(--background)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  color: 'var(--foreground)',
                  fontWeight: '500',
                  fontSize: '0.85rem',
                }}
              >
                <span style={{ fontSize: '1rem' }}>👤</span>
                <span style={{
                  maxWidth: '60px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {user.username || user.firstName || 'User'}
                </span>
                <span style={{ fontSize: '0.7rem' }}>▼</span>
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
                padding: '0.4rem 1rem',
                background: 'var(--primary-color)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '500',
                fontSize: '0.85rem',
                whiteSpace: 'nowrap',
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
