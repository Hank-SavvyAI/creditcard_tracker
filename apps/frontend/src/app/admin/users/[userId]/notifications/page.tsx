'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

interface User {
  id: number
  username: string | null
  email: string | null
  firstName: string | null
  lastName: string | null
  telegramId: string | null
  lineId: string | null
  role: string
  tier: string
}

interface Notification {
  id: number
  userId: number
  notificationType: string
  channel: string
  status: string
  title: string
  body: string
  errorMessage: string | null
  metadata: string | null
  sentAt: string
}

export default function UserNotificationsPage() {
  const router = useRouter()
  const params = useParams()
  const userId = params.userId as string

  const [user, setUser] = useState<User | null>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [offset, setOffset] = useState(0)
  const [limit] = useState(50)

  useEffect(() => {
    const skipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === 'true'
    const token = localStorage.getItem('token')

    if (!skipAuth && !token) {
      router.push('/')
      return
    }

    // Check if user is admin
    if (!skipAuth) {
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        const user = JSON.parse(storedUser)
        if (user.role !== 'ADMIN') {
          alert('無權限訪問')
          router.push('/dashboard')
          return
        }
      } else {
        router.push('/')
        return
      }
    }

    loadNotifications()
  }, [router, userId, offset])

  async function loadNotifications() {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const headers: HeadersInit = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/users/${userId}/notifications?limit=${limit}&offset=${offset}`,
        { headers }
      )

      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
        setNotifications(data.notifications)
        setTotal(data.total)
      } else {
        setError('載入失敗')
      }
    } catch (err) {
      setError('載入失敗')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr)
    return date.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  function getStatusColor(status: string): string {
    return status === 'SUCCESS' ? '#10b981' : '#ef4444'
  }

  function getChannelEmoji(channel: string): string {
    switch (channel) {
      case 'telegram': return '📱'
      case 'line': return '💬'
      case 'email': return '📧'
      case 'webpush': return '🔔'
      default: return '📨'
    }
  }

  function getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'benefit-expiration': '福利到期提醒',
      'benefit-reminder': '福利提醒',
      'system': '系統通知',
      'test': '測試通知'
    }
    return labels[type] || type
  }

  if (loading) {
    return <div className="loading">載入中...</div>
  }

  return (
    <div className="dashboard" style={{ padding: '2rem' }}>
      <div className="dashboard-header" style={{ marginBottom: '2rem' }}>
        <h1>📬 使用者通知記錄</h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Link href="/admin/stats" className="btn btn-secondary">
            返回統計頁面
          </Link>
          <Link href="/admin" className="btn btn-secondary">
            返回管理後台
          </Link>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* User Info */}
      {user && (
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '1.5rem',
          marginBottom: '2rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>👤 使用者資訊</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>使用者 ID</div>
              <div style={{ fontWeight: '600' }}>{user.id}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>姓名</div>
              <div style={{ fontWeight: '600' }}>
                {user.firstName || user.lastName
                  ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                  : user.username || 'N/A'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Email</div>
              <div style={{ fontWeight: '600' }}>{user.email || 'N/A'}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>通知渠道</div>
              <div style={{ fontWeight: '600' }}>
                {user.telegramId && '📱 Telegram '}
                {user.lineId && '💬 LINE '}
                {user.email && '📧 Email'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notifications List */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', margin: 0 }}>
            📨 通知記錄 ({total} 條)
          </h2>
        </div>

        {notifications.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#6b7280', padding: '2rem' }}>
            暫無通知記錄
          </p>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280' }}>時間</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280' }}>類型</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280' }}>渠道</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280' }}>狀態</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280' }}>標題</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280' }}>內容</th>
                  </tr>
                </thead>
                <tbody>
                  {notifications.map((notif) => (
                    <tr key={notif.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                        {formatDate(notif.sentAt)}
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          background: '#f3f4f6',
                          fontSize: '0.75rem',
                          whiteSpace: 'nowrap'
                        }}>
                          {getTypeLabel(notif.notificationType)}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                        {getChannelEmoji(notif.channel)} {notif.channel}
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          background: notif.status === 'SUCCESS' ? '#d1fae5' : '#fee2e2',
                          color: getStatusColor(notif.status),
                          fontSize: '0.75rem',
                          fontWeight: '600'
                        }}>
                          {notif.status}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem', fontWeight: '500' }}>
                        {notif.title}
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem', maxWidth: '400px' }}>
                        <details>
                          <summary style={{ cursor: 'pointer', color: '#3b82f6' }}>查看內容</summary>
                          <div style={{
                            marginTop: '0.5rem',
                            padding: '0.75rem',
                            background: '#f9fafb',
                            borderRadius: '4px',
                            whiteSpace: 'pre-wrap',
                            fontSize: '0.8125rem'
                          }}>
                            {notif.body}
                          </div>
                          {notif.errorMessage && (
                            <div style={{
                              marginTop: '0.5rem',
                              padding: '0.75rem',
                              background: '#fee2e2',
                              borderRadius: '4px',
                              fontSize: '0.8125rem',
                              color: '#991b1b'
                            }}>
                              ❌ 錯誤：{notif.errorMessage}
                            </div>
                          )}
                        </details>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '1.5rem',
              paddingTop: '1.5rem',
              borderTop: '1px solid #e5e7eb'
            }}>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                顯示 {offset + 1} - {Math.min(offset + limit, total)} / 共 {total} 條
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                  disabled={offset === 0}
                  className="btn btn-secondary"
                  style={{
                    opacity: offset === 0 ? 0.5 : 1,
                    cursor: offset === 0 ? 'not-allowed' : 'pointer'
                  }}
                >
                  上一頁
                </button>
                <button
                  onClick={() => setOffset(offset + limit)}
                  disabled={offset + limit >= total}
                  className="btn btn-secondary"
                  style={{
                    opacity: offset + limit >= total ? 0.5 : 1,
                    cursor: offset + limit >= total ? 'not-allowed' : 'pointer'
                  }}
                >
                  下一頁
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
