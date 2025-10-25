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

      <div className="features">
        <h3>✨ {t('home.features', language)}</h3>
        <ul>
          <li>📇 {t('home.feature.manage', language)}</li>
          <li>🎁 {t('home.feature.track', language)}</li>
          <li>⏰ {t('home.feature.reminder', language)}</li>
          <li>✅ {t('home.feature.checkbox', language)}</li>
          <li>🌍 {t('home.feature.multilang', language)}</li>
          <li>🤖 {t('home.feature.telegram', language)}</li>
        </ul>
      </div>

      {isMounted && !isLoggedIn && (
        <div className="login-methods" style={{
          margin: '2rem auto',
          maxWidth: '800px',
          padding: '1.5rem',
          background: '#f8f9fa',
          borderRadius: '12px',
        }}>
          <h3 style={{ textAlign: 'center', marginBottom: '1.5rem', color: '#333' }}>
            {language === 'zh-TW' ? '🔐 選擇登入方式' : '🔐 Choose Login Method'}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            {/* Telegram Login Info */}
            <div style={{
              padding: '1.5rem',
              background: 'white',
              borderRadius: '8px',
              border: '2px solid #0088cc',
            }}>
              <h4 style={{ margin: '0 0 0.75rem 0', color: '#0088cc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.5rem' }}>💬</span>
                {language === 'zh-TW' ? 'Telegram 登入' : 'Telegram Login'}
              </h4>
              <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.9rem', lineHeight: '1.6' }}>
                <li>{language === 'zh-TW' ? '⚡ 即時通知到 Telegram' : '⚡ Instant Telegram notifications'}</li>
                <li>{language === 'zh-TW' ? '🤖 直接在 Bot 中操作' : '🤖 Operate directly in bot'}</li>
                <li>{language === 'zh-TW' ? '📱 手機最快收到提醒' : '📱 Fastest mobile alerts'}</li>
              </ul>
            </div>

            {/* Google Login Info */}
            <div style={{
              padding: '1.5rem',
              background: 'white',
              borderRadius: '8px',
              border: '2px solid #4285F4',
            }}>
              <h4 style={{ margin: '0 0 0.75rem 0', color: '#4285F4', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.5rem' }}>🌐</span>
                {language === 'zh-TW' ? 'Google 登入' : 'Google Login'}
              </h4>
              <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.9rem', lineHeight: '1.6' }}>
                <li>{language === 'zh-TW' ? '📧 Email 通知' : '📧 Email notifications'}</li>
                <li>{language === 'zh-TW' ? '🔔 瀏覽器推播通知' : '🔔 Browser push notifications'}</li>
                <li>{language === 'zh-TW' ? '💻 適合網頁為主的使用者' : '💻 Best for web users'}</li>
              </ul>
            </div>
          </div>
          <p style={{
            textAlign: 'center',
            marginTop: '1rem',
            fontSize: '0.85rem',
            color: '#666',
            margin: '1rem 0 0 0'
          }}>
            {language === 'zh-TW'
              ? '💡 提示：兩種方式都支援多種通知管道，選擇最適合你的登入方式！'
              : '💡 Tip: Both methods support multiple notification channels, choose what works best for you!'}
          </p>
        </div>
      )}

      <div className="auth-buttons">
        {!isMounted ? (
          <div style={{ height: '48px' }}></div>
        ) : isLoggedIn ? (
          <Link href="/dashboard" className="btn-primary">
            {t('home.btn.dashboard', language)}
          </Link>
        ) : (
          <>
            <Link href="/cards" className="btn-secondary">
              {t('home.btn.browse', language)}
            </Link>
            <a
              href={`${process.env.NEXT_PUBLIC_API_URL}/api/auth/google`}
              className="btn-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                justifyContent: 'center',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707 0-.593.102-1.17.282-1.709V4.96H.957C.347 6.175 0 7.55 0 9c0 1.452.348 2.827.957 4.042l3.007-2.335z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
              </svg>
              {language === 'zh-TW' ? '使用 Google 登入' : 'Sign in with Google'}
            </a>
            <a href="/auth/telegram" className="btn-secondary">
              {t('home.btn.login', language)}
            </a>
          </>
        )}
      </div>

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
