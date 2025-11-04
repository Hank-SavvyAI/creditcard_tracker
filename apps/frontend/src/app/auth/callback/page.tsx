'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'line-friend-prompt'>('loading')
  const [message, setMessage] = useState('處理登入中...')
  const [userData, setUserData] = useState<any>(null)

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

        // 如果是 LINE 登入且還沒提示過加好友
        const shouldShowPrompt = userData.lineId && !!localStorage.getItem('line_friend_prompted');

        if (shouldShowPrompt) {
          setUserData(userData)
          setStatus('line-friend-prompt')
          setMessage('登入成功！')
        } else {
          setStatus('success')
          setMessage('登入成功！正在跳轉...')

          // 跳轉到 dashboard
          setTimeout(() => {
            router.push('/dashboard')
          }, 1500)
        }

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

        {status === 'line-friend-prompt' && (
          <>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
            <h2 style={{ color: 'white', fontSize: '24px', margin: '0 0 8px 0', fontWeight: '600' }}>
              登入成功！
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '16px', margin: '0 0 24px 0' }}>
              歡迎使用信用卡福利追蹤器
            </p>

            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '24px',
              marginBottom: '20px'
            }}>
              <div style={{ fontSize: '36px', marginBottom: '12px' }}>💚</div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 12px 0', color: '#333' }}>
                想要收到福利提醒嗎？
              </h3>
              <p style={{ fontSize: '14px', color: '#666', margin: '0 0 20px 0', lineHeight: '1.6' }}>
                加入我們的 LINE 官方帳號<br />
                即時收到重要福利通知！
              </p>

              {/* QR Code */}
              <div style={{
                background: 'white',
                padding: '16px',
                borderRadius: '8px',
                display: 'inline-block',
                marginBottom: '16px',
                border: '2px solid #f0f0f0'
              }}>
                <QRCodeSVG
                  value={`https://line.me/R/ti/p/@${process.env.NEXT_PUBLIC_LINE_BOT_ID || 'YOUR_BOT_ID'}`}
                  size={200}
                  level="H"
                  includeMargin={true}
                />
              </div>

              <p style={{ fontSize: '12px', color: '#999', margin: '0 0 16px 0' }}>
                掃描 QR Code 加入好友
              </p>

              {/* 按鈕 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <a
                  href={`https://line.me/R/ti/p/@${process.env.NEXT_PUBLIC_LINE_BOT_ID || 'YOUR_BOT_ID'}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '12px 24px',
                    background: '#00B900',
                    color: 'white',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontWeight: '600',
                    fontSize: '16px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#009900'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#00B900'}
                >
                  💚 加入 LINE 官方帳號
                </a>
                <button
                  onClick={() => {
                    console.log('🔘 點擊「我已經加入了」按鈕')
                    console.log('📝 設定前 localStorage:', {
                      line_friend_prompted: localStorage.getItem('line_friend_prompted'),
                      token: !!localStorage.getItem('token'),
                      user: !!localStorage.getItem('user')
                    })
                    localStorage.setItem('line_friend_prompted', 'true')
                    console.log('✅ 設定後 localStorage:', {
                      line_friend_prompted: localStorage.getItem('line_friend_prompted')
                    })
                    router.push('/dashboard')
                  }}
                  style={{
                    padding: '12px 24px',
                    background: '#00B900',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '600',
                    fontSize: '16px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    opacity: 0.9
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '1'
                    e.currentTarget.style.background = '#009900'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '0.9'
                    e.currentTarget.style.background = '#00B900'
                  }}
                >
                  ✅ 我已經加入了
                </button>
                <button
                  onClick={() => {
                    console.log('🔘 點擊「稍後再說」按鈕')
                    console.log('📝 設定前 localStorage:', {
                      line_friend_prompted: localStorage.getItem('line_friend_prompted'),
                      token: !!localStorage.getItem('token'),
                      user: !!localStorage.getItem('user')
                    })
                    localStorage.setItem('line_friend_prompted', 'true')
                    console.log('✅ 設定後 localStorage:', {
                      line_friend_prompted: localStorage.getItem('line_friend_prompted')
                    })
                    router.push('/dashboard')
                  }}
                  style={{
                    padding: '12px 24px',
                    background: 'transparent',
                    color: '#666',
                    border: '2px solid #e0e0e0',
                    borderRadius: '8px',
                    fontWeight: '500',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f5f5f5'
                    e.currentTarget.style.borderColor = '#d0d0d0'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.borderColor = '#e0e0e0'
                  }}
                >
                  稍後再說
                </button>
              </div>
            </div>
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
