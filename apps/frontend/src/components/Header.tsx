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
    // Navigate to home page login section
    if (pathname === '/') {
      // If already on home page, scroll to login section
      const loginSection = document.querySelector('.login-methods')
      if (loginSection) {
        loginSection.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    } else {
      // Navigate to home page
      router.push('/')
    }
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
        {/* Left Side: Logo + Title + Navigation Links */}
        <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          {/* SavvyAI Logo */}
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
            <img
              src="/images/savvyai-logo.png"
              alt="SavvyAI Logo"
              className="header-logo"
              style={{
                height: '50px',
                width: '100px',
                objectFit: 'contain',
              }}
              onError={(e) => {
                // Fallback to text if image fails to load
                e.currentTarget.style.display = 'none';
              }}
            />
          </Link>

          {/* Title */}
          <Link href="/" style={{ textDecoration: 'none' }}>
            <h1 className="header-title" style={{
              margin: 0,
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: 'var(--primary-color)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              <span className="header-icon">💳</span>
              <span className="header-title-full">{language === 'zh-TW' ? '信用卡福利追蹤' : 'Credit Card Tracker'}</span>
              <span className="header-title-short">{language === 'zh-TW' ? '信用卡' : 'CC'}</span>
            </h1>
          </Link>

          {/* Navigation Links */}
          <nav className="header-nav" style={{ display: 'flex', gap: '1.5rem' }}>
            <Link href="/" style={{
              textDecoration: 'none',
              color: 'var(--foreground)',
              fontWeight: pathname === '/' ? 'bold' : 'normal',
            }}>
              {language === 'zh-TW' ? '首頁' : 'Home'}
            </Link>
            {isMounted && user && (
              <Link href="/dashboard" className="nav-link-dashboard" style={{
                textDecoration: 'none',
                color: 'var(--foreground)',
                fontWeight: pathname === '/dashboard' ? 'bold' : 'normal',
              }}>
                <span className="nav-full">{language === 'zh-TW' ? '我的卡片' : 'My Cards'}</span>
                <span className="nav-short">{language === 'zh-TW' ? '卡片' : 'Cards'}</span>
              </Link>
            )}
            <Link href="/cards" className="nav-link-cards" style={{
              textDecoration: 'none',
              color: 'var(--foreground)',
              fontWeight: pathname === '/cards' ? 'bold' : 'normal',
            }}>
              <span className="nav-full">{language === 'zh-TW' ? '新增信用卡' : 'Add Card'}</span>
              <span className="nav-short">{language === 'zh-TW' ? '+卡' : '+Card'}</span>
            </Link>
          </nav>
        </div>

        {/* Right Side: Language Switcher + User Info */}
        <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <LanguageSwitcher />

          {!isMounted ? (
            <div style={{ width: '100px', height: '40px' }}></div>
          ) : user ? (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="user-button"
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
                <span style={{ fontSize: '1rem' }}>👤</span>
                <span className="user-name" style={{
                  maxWidth: '80px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {user.username || user.firstName || 'User'}
                </span>
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
