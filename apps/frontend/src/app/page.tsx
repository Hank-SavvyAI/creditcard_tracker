'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { useLanguageStore, t } from '@/store/language'

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const { language } = useLanguageStore()

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('token')
    setIsLoggedIn(!!token)
    setIsMounted(true)
  }, [])

  return (
    <div className="home-container">
      <div style={{ position: 'absolute', top: '20px', right: '20px' }}>
        <LanguageSwitcher />
      </div>

      <h1>{t('home.title', language)}</h1>
      <h2>{t('home.title.en', language)}</h2>

      {/* 精簡的功能介紹 - 橫向排列 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '1rem',
        margin: '1rem auto',
        maxWidth: '900px',
        fontSize: '0.85rem'
      }}>
        <div style={{ textAlign: 'center', padding: '0.5rem' }}>
          <div style={{ fontSize: '2rem' }}>📇</div>
          <div>{t('home.feature.manage', language)}</div>
        </div>
        <div style={{ textAlign: 'center', padding: '0.5rem' }}>
          <div style={{ fontSize: '2rem' }}>🎁</div>
          <div>{t('home.feature.track', language)}</div>
        </div>
        <div style={{ textAlign: 'center', padding: '0.5rem' }}>
          <div style={{ fontSize: '2rem' }}>⏰</div>
          <div>{t('home.feature.reminder', language)}</div>
        </div>
        <div style={{ textAlign: 'center', padding: '0.5rem' }}>
          <div style={{ fontSize: '2rem' }}>🌍</div>
          <div>{t('home.feature.multilang', language)}</div>
        </div>
      </div>

      {/* 瀏覽信用卡按鈕 - 縮小版 */}
      {isMounted && (
        <div style={{ textAlign: 'center', margin: '1rem 0' }}>
          <Link
            href="/cards"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.6rem 1.5rem',
              fontSize: '0.95rem',
              fontWeight: '600',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              borderRadius: '50px',
              textDecoration: 'none',
              boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
              transition: 'all 0.3s ease',
              transform: 'translateY(0)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)'
            }}
          >
            <span style={{ fontSize: '1.1rem' }}>💳</span>
            {t('home.btn.browse', language)}
          </Link>
        </div>
      )}

      {isMounted && !isLoggedIn && (
        <div className="login-methods" style={{
          margin: '1rem auto',
          maxWidth: '700px',
          padding: '1rem',
          background: '#f8f9fa',
          borderRadius: '12px',
        }}>
          <h3 style={{ textAlign: 'center', marginBottom: '0.75rem', color: '#333', fontSize: '1.1rem' }}>
            {language === 'zh-TW' ? '🔐 選擇登入方式' : '🔐 Choose Login Method'}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            {/* Telegram Login Info */}
            <div style={{
              padding: '1rem',
              background: 'white',
              borderRadius: '8px',
              border: '2px solid #0088cc',
              display: 'flex',
              flexDirection: 'column',
            }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#0088cc', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
                <span style={{ fontSize: '1.3rem' }}>💬</span>
                {language === 'zh-TW' ? 'Telegram' : 'Telegram'}
              </h4>
              <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', lineHeight: '1.5', flex: 1, color: '#666' }}>
                {language === 'zh-TW' ? (
                  <>
                    • 即時收到福利提醒<br />
                    • 透過 Bot 快速查詢<br />
                    • 無需輸入密碼
                  </>
                ) : (
                  <>
                    • Instant benefit alerts<br />
                    • Quick queries via Bot<br />
                    • No password needed
                  </>
                )}
              </p>
              <a
                href="/auth/telegram"
                style={{
                  display: 'block',
                  padding: '0.6rem',
                  background: '#0088cc',
                  color: 'white',
                  textAlign: 'center',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: '500',
                  transition: 'background 0.2s',
                  fontSize: '0.9rem'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#006699'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#0088cc'}
              >
                {language === 'zh-TW' ? '使用 Telegram 登入' : 'Sign in with Telegram'}
              </a>
            </div>

            {/* Google Login Info */}
            <div style={{
              padding: '1rem',
              background: 'white',
              borderRadius: '8px',
              border: '2px solid #4285F4',
              display: 'flex',
              flexDirection: 'column',
            }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#4285F4', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
                <span style={{ fontSize: '1.3rem' }}>🌐</span>
                {language === 'zh-TW' ? 'Google' : 'Google'}
              </h4>
              <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', lineHeight: '1.5', flex: 1, color: '#666' }}>
                {language === 'zh-TW' ? (
                  <>
                    • Email 提醒通知<br />
                    • 瀏覽器推播通知<br />
                    • 使用現有 Google 帳號
                  </>
                ) : (
                  <>
                    • Email notifications<br />
                    • Browser push alerts<br />
                    • Use existing Google account
                  </>
                )}
              </p>
              <a
                href={`${process.env.NEXT_PUBLIC_API_URL}/api/auth/google`}
                style={{
                  display: 'block',
                  padding: '0.6rem',
                  background: '#4285F4',
                  color: 'white',
                  textAlign: 'center',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: '500',
                  transition: 'background 0.2s',
                  fontSize: '0.9rem'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#3367D6'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#4285F4'}
              >
                {language === 'zh-TW' ? '使用 Google 登入' : 'Sign in with Google'}
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 已登入：顯示前往儀表板按鈕 */}
      {isMounted && isLoggedIn && (
        <div className="auth-buttons">
          <Link href="/dashboard" className="btn-primary">
            {t('home.btn.dashboard', language)}
          </Link>
        </div>
      )}

      <div className="info-section">
        <h3>🚀 {t('home.howto', language)}</h3>
        <ol>
          <li>{t('home.step1', language)}</li>
          <li>{t('home.step2', language)}</li>
          <li>{t('home.step3', language)}</li>
          <li>{t('home.step4', language)}</li>
        </ol>
      </div>
    </div>
  )
}
