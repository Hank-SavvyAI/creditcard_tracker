'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLanguageStore, t } from '@/store/language'
import { api } from '@/lib/api'
import {
  Box
} from '@mui/material';

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const { language } = useLanguageStore()

  // Feedback form state
  const [showFeedbackForm, setShowFeedbackForm] = useState(false)
  const [feedbackForm, setFeedbackForm] = useState({ name: '', email: '', message: '' })
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false)
  const [feedbackSuccess, setFeedbackSuccess] = useState(false)
  const [feedbackError, setFeedbackError] = useState('')

  useEffect(() => {
    // Check if user is authenticated
    const checkLoginStatus = () => {
      const token = localStorage.getItem('token')
      setIsLoggedIn(!!token)
    }

    checkLoginStatus()
    setIsMounted(true)

    // Listen for auth changes (login/logout events from Header)
    const handleAuthChange = () => {
      checkLoginStatus()
    }

    window.addEventListener('auth-change', handleAuthChange)

    return () => {
      window.removeEventListener('auth-change', handleAuthChange)
    }
  }, [])

  async function handleFeedbackSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFeedbackSubmitting(true)
    setFeedbackError('')

    try {
      await api.submitFeedback(feedbackForm)
      setFeedbackSuccess(true)
      setFeedbackForm({ name: '', email: '', message: '' })
      setTimeout(() => {
        setShowFeedbackForm(false)
        setFeedbackSuccess(false)
      }, 3000)
    } catch (error: any) {
      setFeedbackError(error.message || 'Failed to send feedback')
    } finally {
      setFeedbackSubmitting(false)
    }
  }

  return (
    <div className="home-container">
      <h1>{t('home.title', language)}</h1>
      <h2>{t('home.title.en', language)}</h2>

      {/* 精簡的功能介紹 - 橫向排列 */}
      <div className="features-grid" style={{
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
          <div className="login-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
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

            {/* LINE Login Info */}
            <div style={{
              padding: '1rem',
              background: 'white',
              borderRadius: '8px',
              border: '2px solid #00B900',
              display: 'flex',
              flexDirection: 'column',
            }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#00B900', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
                <span style={{ fontSize: '1.3rem' }}>💚</span>
                {language === 'zh-TW' ? 'LINE' : 'LINE'}
              </h4>
              <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', lineHeight: '1.5', flex: 1, color: '#666' }}>
                {language === 'zh-TW' ? (
                  <>
                    • 使用現有 LINE 帳號<br />
                    • 快速便捷登入<br />
                    • 安全可靠
                  </>
                ) : (
                  <>
                    • Use existing LINE account<br />
                    • Quick & easy login<br />
                    • Safe & secure
                  </>
                )}
              </p>
              <a
                href={`${process.env.NEXT_PUBLIC_API_URL}/api/auth/line`}
                style={{
                  display: 'block',
                  padding: '0.6rem',
                  background: '#00B900',
                  color: 'white',
                  textAlign: 'center',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: '500',
                  transition: 'background 0.2s',
                  fontSize: '0.9rem'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#009900'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#00B900'}
              >
                {language === 'zh-TW' ? '使用 LINE 登入' : 'Sign in with LINE'}
              </a>
            </div>
          </div>
        </div>
      )}

      {/* QR Code 加入好友區塊 */}
      {isMounted && !isLoggedIn && (
        <div style={{
          margin: '1.5rem auto 0',
          maxWidth: '700px',
          padding: '1.5rem',
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}>
          <h3 style={{ textAlign: 'center', marginBottom: '1rem', color: '#333', fontSize: '1.1rem' }}>
            {language === 'zh-TW' ? '📱 掃描 QR Code 加入好友' : '📱 Scan QR Code to Add Friends'}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', maxWidth: '500px', margin: '0 auto' }}>
            {/* LINE QR Code */}
            <div style={{ textAlign: 'center' }}>
              <h4 style={{ margin: '0 0 0.75rem 0', color: '#00B900', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '1rem' }}>
                <span style={{ fontSize: '1.5rem' }}>💚</span>
                LINE
              </h4>
              <img
                src="https://qr-official.line.me/gs/M_795vjfjm_GW.png?oat_content=qr"
                alt="LINE QR Code"
                style={{
                  width: '180px',
                  height: '180px',
                  border: '2px solid #00B900',
                  borderRadius: '12px',
                  padding: '8px',
                  background: 'white',
                }}
              />
              <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#666' }}>
                {language === 'zh-TW' ? '掃描加入 LINE 好友' : 'Scan to add LINE friend'}
              </p>
            </div>

            {/* Telegram QR Code */}
            <div style={{ textAlign: 'center' }}>
              <h4 style={{ margin: '0 0 0.75rem 0', color: '#0088cc', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '1rem' }}>
                <span style={{ fontSize: '1.5rem' }}>💬</span>
                Telegram
              </h4>
              <Box
                sx={{
                  width: 180,
                  height: 180,
                  background: 'white',
                  border: '2px solid rgb(37,99,235)',
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 2,
                  margin: '0 auto 16px',
                  overflow: 'hidden',
                  padding: 1,
                }}
              >
                {/* 使用 QR Server API 動態生成 QR Code */}
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent('https://t.me/luxuraibot')}`}
                  alt="Telegram QR Code"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </Box>
              <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#666' }}>
                {language === 'zh-TW' ? '掃描加入 Telegram Bot' : 'Scan to join Telegram Bot'}
              </p>
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

      {/* 意見回饋 / 聯絡我們 */}
      <div style={{
        margin: '2rem auto',
        maxWidth: '700px',
        padding: '1.5rem',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        borderRadius: '12px',
        textAlign: 'center',
      }}>
        <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1.2rem', color: '#333' }}>
          💬 {language === 'zh-TW' ? '意見回饋 / 聯絡我們' : 'Feedback / Contact Us'}
        </h3>
        <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: '#666', lineHeight: '1.6' }}>
          {language === 'zh-TW'
            ? '有任何問題、建議或是想要新增的信用卡？歡迎隨時與我們聯絡！'
            : 'Have questions, suggestions, or want to add a new credit card? Feel free to contact us!'
          }
        </p>

        {!showFeedbackForm ? (
          <button
            onClick={() => setShowFeedbackForm(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              background: '#667eea',
              color: 'white',
              borderRadius: '8px',
              border: 'none',
              fontWeight: '600',
              fontSize: '1rem',
              cursor: 'pointer',
              transition: 'all 0.3s',
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#5568d3'
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.4)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#667eea'
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)'
            }}
          >
            📧 {language === 'zh-TW' ? '傳送訊息' : 'Send Message'}
          </button>
        ) : (
          <form onSubmit={handleFeedbackSubmit} style={{ marginTop: '1rem', textAlign: 'left' }}>
            {feedbackSuccess ? (
              <div style={{
                padding: '1.5rem',
                background: '#10b981',
                color: 'white',
                borderRadius: '8px',
                textAlign: 'center',
                fontWeight: '500',
              }}>
                ✅ {language === 'zh-TW' ? '感謝您的回饋！我們會盡快回覆您。' : 'Thank you for your feedback! We will get back to you soon.'}
              </div>
            ) : (
              <>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#333' }}>
                    {language === 'zh-TW' ? '姓名 *' : 'Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={feedbackForm.name}
                    onChange={(e) => setFeedbackForm({ ...feedbackForm, name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: '2px solid #ddd',
                      fontSize: '1rem',
                    }}
                    placeholder={language === 'zh-TW' ? '請輸入您的姓名' : 'Enter your name'}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#333' }}>
                    {language === 'zh-TW' ? 'Email *' : 'Email *'}
                  </label>
                  <input
                    type="email"
                    required
                    value={feedbackForm.email}
                    onChange={(e) => setFeedbackForm({ ...feedbackForm, email: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: '2px solid #ddd',
                      fontSize: '1rem',
                    }}
                    placeholder={language === 'zh-TW' ? '請輸入您的 Email' : 'Enter your email'}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#333' }}>
                    {language === 'zh-TW' ? '訊息 *' : 'Message *'}
                  </label>
                  <textarea
                    required
                    value={feedbackForm.message}
                    onChange={(e) => setFeedbackForm({ ...feedbackForm, message: e.target.value })}
                    rows={5}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: '2px solid #ddd',
                      fontSize: '1rem',
                      resize: 'vertical',
                    }}
                    placeholder={language === 'zh-TW' ? '請輸入您的訊息、建議或問題...' : 'Enter your message, suggestions or questions...'}
                  />
                </div>

                {feedbackError && (
                  <div style={{
                    padding: '0.75rem',
                    background: '#fecaca',
                    color: '#991b1b',
                    borderRadius: '8px',
                    marginBottom: '1rem',
                    fontSize: '0.9rem',
                  }}>
                    ❌ {feedbackError}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                  <button
                    type="submit"
                    disabled={feedbackSubmitting}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: feedbackSubmitting ? '#9ca3af' : '#667eea',
                      color: 'white',
                      borderRadius: '8px',
                      border: 'none',
                      fontWeight: '600',
                      fontSize: '1rem',
                      cursor: feedbackSubmitting ? 'not-allowed' : 'pointer',
                      transition: 'all 0.3s',
                    }}
                  >
                    {feedbackSubmitting
                      ? (language === 'zh-TW' ? '傳送中...' : 'Sending...')
                      : (language === 'zh-TW' ? '送出' : 'Submit')
                    }
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowFeedbackForm(false)
                      setFeedbackError('')
                    }}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: 'white',
                      color: '#333',
                      borderRadius: '8px',
                      border: '2px solid #ddd',
                      fontWeight: '600',
                      fontSize: '1rem',
                      cursor: 'pointer',
                    }}
                  >
                    {language === 'zh-TW' ? '取消' : 'Cancel'}
                  </button>
                </div>
              </>
            )}
          </form>
        )}
      </div>

      {/* PayPal 贊助區塊 */}
      <div style={{
        margin: '2rem auto',
        maxWidth: '700px',
        padding: '1.5rem',
        background: 'linear-gradient(135deg, #FFF4E6 0%, #FFE0B2 100%)',
        borderRadius: '12px',
        textAlign: 'center',
        border: '2px solid #FFA726',
      }}>
        <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1.2rem', color: '#E65100', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.5rem' }}>☕</span>
          {language === 'zh-TW' ? '支持我們的營運' : 'Support Our Operations'}
        </h3>
        <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: '#666', lineHeight: '1.6' }}>
          {language === 'zh-TW'
            ? '如果您覺得這個服務對您有幫助，歡迎贊助我們！您的贊助幫助我們持續改善服務，並保持系統運作，一杯咖啡的錢也非常感謝喔！'
            : 'If you find this service helpful, please consider supporting us! Your contribution helps us improve the service, add more credit card data, and keep the system running.'
          }
        </p>
        <a
          href="https://www.paypal.com/paypalme/savvyai888"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.75rem 1.75rem',
            background: '#0070BA',
            color: 'white',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: '600',
            fontSize: '1rem',
            cursor: 'pointer',
            transition: 'all 0.3s',
            boxShadow: '0 4px 12px rgba(0, 112, 186, 0.3)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#005A9C'
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 112, 186, 0.4)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#0070BA'
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 112, 186, 0.3)'
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.067 8.478c.492.88.556 2.014.3 3.327-.74 3.806-3.276 5.12-6.514 5.12h-.5a.805.805 0 00-.794.68l-.04.22-.63 3.993-.028.15a.805.805 0 01-.794.68H7.723c-.535 0-.97-.44-.97-.983 0-.056.005-.112.014-.166l2.214-14.022c.096-.616.63-1.077 1.25-1.077h3.617c2.48 0 4.154.515 4.98 1.533.39.48.64 1.02.768 1.617.036.167.065.337.088.51.024.174.042.35.054.53.01.164.014.33.014.497zm-1.14 3.322c-.74 3.806-3.276 5.12-6.514 5.12h-.5a.805.805 0 00-.794.68l-.04.22-.63 3.993-.028.15a.805.805 0 01-.794.68H7.723c-.535 0-.97-.44-.97-.983 0-.056.005-.112.014-.166l2.214-14.022c.096-.616.63-1.077 1.25-1.077h3.617c2.48 0 4.154.515 4.98 1.533a4.64 4.64 0 01.768 1.617c.036.167.065.337.088.51.024.174.042.35.054.53.256 1.313.192 2.447-.3 3.327z"/>
          </svg>
          {language === 'zh-TW' ? '透過 PayPal 贊助' : 'Donate via PayPal'}
        </a>
        <p style={{ margin: '1rem 0 0 0', fontSize: '0.8rem', color: '#999' }}>
          {language === 'zh-TW'
            ? '每一份贊助都是對我們最大的鼓勵 ❤️'
            : 'Every donation is a great encouragement to us ❤️'
          }
        </p>
      </div>
    </div>
  )
}
