'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import MobileLayout from '@/components/MobileLayout'

export default function ProfilePage() {
  const router = useRouter()
  const [language, setLanguage] = useState<'zh-TW' | 'en'>('zh-TW')
  const [notifications, setNotifications] = useState({
    benefitExpiry: true,
    newCards: true,
    recommendations: false,
  })
  const skipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === 'true'

  // 模擬用戶資料
  const mockUser = {
    name: '使用者',
    email: skipAuth ? 'demo@example.com' : '',
    lineId: skipAuth ? 'LINE User' : '',
  }

  const handleLogout = () => {
    if (skipAuth) {
      alert('開發模式：無需登出')
      return
    }

    localStorage.removeItem('token')
    router.push('/')
  }

  const handleLanguageChange = (newLang: 'zh-TW' | 'en') => {
    setLanguage(newLang)
    localStorage.setItem('language', newLang)
    // TODO: 實際應用中需要重新載入頁面或更新全域狀態
  }

  const handleNotificationToggle = (key: keyof typeof notifications) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
    // TODO: 呼叫 API 更新通知設定
  }

  return (
    <MobileLayout>
      <div style={{ paddingBottom: '80px' }}>
        {/* Header */}
        <div style={{
          padding: '1rem',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
        }}>
          <h1 style={{ fontSize: '1.5rem', margin: 0, marginBottom: '0.5rem' }}>
            我的
          </h1>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '0.9rem' }}>
            個人設定與偏好
          </p>
        </div>

        <div style={{ padding: '1rem' }}>
          {/* User Info Card */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '1.5rem',
            marginBottom: '1rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '1rem',
            }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                marginRight: '1rem',
              }}>
                👤
              </div>
              <div>
                <h3 style={{ margin: 0, marginBottom: '0.25rem', fontSize: '1.1rem' }}>
                  {mockUser.name}
                </h3>
                <p style={{ margin: 0, color: '#6b7280', fontSize: '0.85rem' }}>
                  {mockUser.email || mockUser.lineId}
                </p>
              </div>
            </div>
            {skipAuth && (
              <div style={{
                padding: '0.75rem',
                background: '#fef3c7',
                borderRadius: '8px',
                fontSize: '0.85rem',
                color: '#92400e',
              }}>
                🔧 開發模式：使用模擬資料
              </div>
            )}
          </div>

          {/* Language Settings */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '1.5rem',
            marginBottom: '1rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}>
            <h3 style={{
              margin: 0,
              marginBottom: '1rem',
              fontSize: '1rem',
              fontWeight: '600',
              color: '#1f2937',
            }}>
              🌐 語言設定
            </h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => handleLanguageChange('zh-TW')}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: language === 'zh-TW' ? '#667eea' : '#f3f4f6',
                  color: language === 'zh-TW' ? 'white' : '#4b5563',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                繁體中文
              </button>
              <button
                onClick={() => handleLanguageChange('en')}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: language === 'en' ? '#667eea' : '#f3f4f6',
                  color: language === 'en' ? 'white' : '#4b5563',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                English
              </button>
            </div>
          </div>

          {/* Notification Settings */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '1.5rem',
            marginBottom: '1rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}>
            <h3 style={{
              margin: 0,
              marginBottom: '1rem',
              fontSize: '1rem',
              fontWeight: '600',
              color: '#1f2937',
            }}>
              🔔 通知設定
            </h3>

            {/* Benefit Expiry */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: '1rem',
              borderBottom: '1px solid #e5e7eb',
              marginBottom: '1rem',
            }}>
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: '500', marginBottom: '0.25rem' }}>
                  福利到期提醒
                </div>
                <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                  當福利即將到期時通知您
                </div>
              </div>
              <button
                onClick={() => handleNotificationToggle('benefitExpiry')}
                style={{
                  width: '48px',
                  height: '28px',
                  borderRadius: '14px',
                  border: 'none',
                  background: notifications.benefitExpiry ? '#667eea' : '#d1d5db',
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                <div style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  background: 'white',
                  position: 'absolute',
                  top: '3px',
                  left: notifications.benefitExpiry ? '23px' : '3px',
                  transition: 'left 0.2s',
                }} />
              </button>
            </div>

            {/* New Cards */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: '1rem',
              borderBottom: '1px solid #e5e7eb',
              marginBottom: '1rem',
            }}>
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: '500', marginBottom: '0.25rem' }}>
                  新卡片通知
                </div>
                <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                  有新的信用卡資訊時通知您
                </div>
              </div>
              <button
                onClick={() => handleNotificationToggle('newCards')}
                style={{
                  width: '48px',
                  height: '28px',
                  borderRadius: '14px',
                  border: 'none',
                  background: notifications.newCards ? '#667eea' : '#d1d5db',
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                <div style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  background: 'white',
                  position: 'absolute',
                  top: '3px',
                  left: notifications.newCards ? '23px' : '3px',
                  transition: 'left 0.2s',
                }} />
              </button>
            </div>

            {/* Recommendations */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: '500', marginBottom: '0.25rem' }}>
                  個人化推薦
                </div>
                <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                  根據使用習慣推薦適合的卡片
                </div>
              </div>
              <button
                onClick={() => handleNotificationToggle('recommendations')}
                style={{
                  width: '48px',
                  height: '28px',
                  borderRadius: '14px',
                  border: 'none',
                  background: notifications.recommendations ? '#667eea' : '#d1d5db',
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                <div style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  background: 'white',
                  position: 'absolute',
                  top: '3px',
                  left: notifications.recommendations ? '23px' : '3px',
                  transition: 'left 0.2s',
                }} />
              </button>
            </div>
          </div>

          {/* App Info */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '1.5rem',
            marginBottom: '1rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}>
            <h3 style={{
              margin: 0,
              marginBottom: '1rem',
              fontSize: '1rem',
              fontWeight: '600',
              color: '#1f2937',
            }}>
              📱 關於
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.9rem',
              }}>
                <span style={{ color: '#6b7280' }}>版本</span>
                <span style={{ fontWeight: '500' }}>1.0.0</span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.9rem',
              }}>
                <span style={{ color: '#6b7280' }}>建置版本</span>
                <span style={{ fontWeight: '500' }}>2024.01</span>
              </div>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '1rem',
              background: 'white',
              color: '#dc2626',
              border: '1px solid #dc2626',
              borderRadius: '12px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}
          >
            🚪 登出
          </button>

          {/* Footer */}
          <div style={{
            textAlign: 'center',
            marginTop: '2rem',
            color: '#9ca3af',
            fontSize: '0.8rem',
          }}>
            <p style={{ margin: 0 }}>Credit Card Tracker</p>
            <p style={{ margin: 0, marginTop: '0.25rem' }}>© 2024 All rights reserved</p>
          </div>
        </div>
      </div>
    </MobileLayout>
  )
}
