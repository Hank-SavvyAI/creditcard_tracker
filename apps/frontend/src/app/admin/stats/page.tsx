'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface CronJobStats {
  jobName: string
  totalRuns: number
  successRuns: number
  failedRuns: number
  partialRuns: number
  totalItemsProcessed: number
  totalSuccessCount: number
  totalFailureCount: number
  avgDurationMs: number
  lastRun: string | null
  lastStatus: string | null
}

interface CronJobLog {
  id: number
  jobName: string
  status: string
  startedAt: string
  completedAt: string
  durationMs: number
  itemsProcessed: number
  successCount: number
  failureCount: number
  errorMessage: string | null
}

interface NotificationStats {
  totalNotifications: number
  totalSuccess: number
  totalFailed: number
  successRate: number
  statsByChannel: Array<{
    channel: string
    total: number
    success: number
    failed: number
    successRate: number
  }>
  statsByType: Array<{
    type: string
    total: number
    success: number
    failed: number
  }>
  dailyStats: Array<{
    date: string
    total: number
    success: number
    failed: number
  }>
  recentLogs: Array<{
    id: number
    userId: number
    type: string
    channel: string
    status: string
    title: string
    sentAt: string
    errorMessage: string | null
  }>
}

export default function AdminStatsPage() {
  const router = useRouter()
  const [cronJobStats, setCronJobStats] = useState<{ stats: CronJobStats[], recentLogs: CronJobLog[] } | null>(null)
  const [notificationStats, setNotificationStats] = useState<NotificationStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [days, setDays] = useState(7)

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
          alert('無權限訪問管理員後台')
          router.push('/dashboard')
          return
        }
      } else {
        router.push('/')
        return
      }
    }

    loadStats()
  }, [router, days])

  async function loadStats() {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const headers: HeadersInit = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const [cronRes, notifRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/cronjob-stats?days=${days}`, { headers }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/notification-stats?days=${days}`, { headers })
      ])

      if (cronRes.ok) {
        const cronData = await cronRes.json()
        setCronJobStats(cronData)
      }

      if (notifRes.ok) {
        const notifData = await notifRes.json()
        setNotificationStats(notifData)
      }
    } catch (err) {
      setError('載入統計數據失敗')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}min`
  }

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr)
    return date.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'SUCCESS': return '#10b981'
      case 'FAILED': return '#ef4444'
      case 'PARTIAL': return '#f59e0b'
      default: return '#6b7280'
    }
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

  if (loading) {
    return <div className="loading">載入中...</div>
  }

  return (
    <div className="dashboard" style={{ padding: '2rem' }}>
      <div className="dashboard-header" style={{ marginBottom: '2rem' }}>
        <h1>📊 系統監控統計</h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #ddd' }}
          >
            <option value={1}>過去 1 天</option>
            <option value={7}>過去 7 天</option>
            <option value={30}>過去 30 天</option>
            <option value={90}>過去 90 天</option>
          </select>
          <Link href="/admin" className="btn btn-secondary">
            返回管理後台
          </Link>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* CronJob 統計 */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          ⚙️ CronJob 執行統計
        </h2>

        {cronJobStats && cronJobStats.stats.length > 0 ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
              {cronJobStats.stats.map((stat) => (
                <div key={stat.jobName} style={{
                  background: 'white',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  border: '1px solid #e5e7eb'
                }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#374151' }}>
                    {stat.jobName === 'benefit-expiration-check' ? '📅 福利到期檢查' : '📦 福利歸檔任務'}
                  </h3>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.9rem' }}>
                    <div>
                      <div style={{ color: '#6b7280', marginBottom: '0.25rem' }}>總執行次數</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#3b82f6' }}>{stat.totalRuns}</div>
                    </div>
                    <div>
                      <div style={{ color: '#6b7280', marginBottom: '0.25rem' }}>平均耗時</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#8b5cf6' }}>{formatDuration(stat.avgDurationMs)}</div>
                    </div>
                    <div>
                      <div style={{ color: '#6b7280', marginBottom: '0.25rem' }}>成功</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#10b981' }}>{stat.successRuns}</div>
                    </div>
                    <div>
                      <div style={{ color: '#6b7280', marginBottom: '0.25rem' }}>失敗</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#ef4444' }}>{stat.failedRuns}</div>
                    </div>
                    <div>
                      <div style={{ color: '#6b7280', marginBottom: '0.25rem' }}>部分成功</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#f59e0b' }}>{stat.partialRuns}</div>
                    </div>
                    <div>
                      <div style={{ color: '#6b7280', marginBottom: '0.25rem' }}>處理項目</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#6366f1' }}>{stat.totalItemsProcessed}</div>
                    </div>
                  </div>

                  {stat.lastRun && (
                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                      <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>最後執行</div>
                      <div style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>{formatDate(stat.lastRun)}</div>
                      <span style={{
                        display: 'inline-block',
                        marginTop: '0.5rem',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '12px',
                        fontSize: '0.85rem',
                        fontWeight: '500',
                        background: stat.lastStatus === 'SUCCESS' ? '#d1fae5' : stat.lastStatus === 'FAILED' ? '#fee2e2' : '#fef3c7',
                        color: stat.lastStatus === 'SUCCESS' ? '#065f46' : stat.lastStatus === 'FAILED' ? '#991b1b' : '#92400e'
                      }}>
                        {stat.lastStatus}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* 最近的執行記錄 */}
            <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>最近執行記錄</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                background: 'white',
                borderRadius: '8px',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <thead style={{ background: '#f9fafb' }}>
                  <tr>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>任務名稱</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>狀態</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>開始時間</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>耗時</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>處理數</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>成功/失敗</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>錯誤訊息</th>
                  </tr>
                </thead>
                <tbody>
                  {cronJobStats.recentLogs.map((log) => (
                    <tr key={log.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '0.75rem', fontSize: '0.9rem' }}>
                        {log.jobName === 'benefit-expiration-check' ? '福利到期檢查' : '福利歸檔任務'}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.85rem',
                          fontWeight: '500',
                          background: log.status === 'SUCCESS' ? '#d1fae5' : log.status === 'FAILED' ? '#fee2e2' : '#fef3c7',
                          color: getStatusColor(log.status)
                        }}>
                          {log.status}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{formatDate(log.startedAt)}</td>
                      <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>{formatDuration(log.durationMs)}</td>
                      <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>{log.itemsProcessed}</td>
                      <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>
                        <span style={{ color: '#10b981' }}>{log.successCount}</span> /
                        <span style={{ color: '#ef4444' }}> {log.failureCount}</span>
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '0.85rem', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {log.errorMessage || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p style={{ color: '#6b7280' }}>暫無 CronJob 執行記錄</p>
        )}
      </section>

      {/* 通知統計 */}
      <section>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          📬 通知發送統計
        </h2>

        {notificationStats ? (
          <>
            {/* 總覽卡片 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
              <div style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '12px',
                padding: '1.5rem',
                color: 'white',
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
              }}>
                <div style={{ fontSize: '0.9rem', marginBottom: '0.5rem', opacity: 0.9 }}>總通知數</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{notificationStats.totalNotifications}</div>
              </div>
              <div style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                borderRadius: '12px',
                padding: '1.5rem',
                color: 'white',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
              }}>
                <div style={{ fontSize: '0.9rem', marginBottom: '0.5rem', opacity: 0.9 }}>成功發送</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{notificationStats.totalSuccess}</div>
              </div>
              <div style={{
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                borderRadius: '12px',
                padding: '1.5rem',
                color: 'white',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
              }}>
                <div style={{ fontSize: '0.9rem', marginBottom: '0.5rem', opacity: 0.9 }}>發送失敗</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{notificationStats.totalFailed}</div>
              </div>
              <div style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                borderRadius: '12px',
                padding: '1.5rem',
                color: 'white',
                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
              }}>
                <div style={{ fontSize: '0.9rem', marginBottom: '0.5rem', opacity: 0.9 }}>成功率</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{notificationStats.successRate}%</div>
              </div>
            </div>

            {/* 按渠道統計 */}
            <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>各渠道統計</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              {notificationStats.statsByChannel.map((stat) => (
                <div key={stat.channel} style={{
                  background: 'white',
                  borderRadius: '8px',
                  padding: '1.25rem',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
                    {getChannelEmoji(stat.channel)} {stat.channel.toUpperCase()}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ color: '#6b7280' }}>總數:</span>
                    <span style={{ fontWeight: 'bold' }}>{stat.total}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ color: '#10b981' }}>成功:</span>
                    <span style={{ fontWeight: 'bold', color: '#10b981' }}>{stat.success}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ color: '#ef4444' }}>失敗:</span>
                    <span style={{ fontWeight: 'bold', color: '#ef4444' }}>{stat.failed}</span>
                  </div>
                  <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#6b7280' }}>成功率:</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{
                          width: '100px',
                          height: '8px',
                          background: '#e5e7eb',
                          borderRadius: '4px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            width: `${stat.successRate}%`,
                            height: '100%',
                            background: stat.successRate >= 80 ? '#10b981' : stat.successRate >= 50 ? '#f59e0b' : '#ef4444',
                            borderRadius: '4px'
                          }} />
                        </div>
                        <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{stat.successRate}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 按類型統計 */}
            <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>按通知類型統計</h3>
            <div style={{ overflowX: 'auto', marginBottom: '2rem' }}>
              <table style={{
                width: '100%',
                background: 'white',
                borderRadius: '8px',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <thead style={{ background: '#f9fafb' }}>
                  <tr>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>類型</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600', color: '#374151' }}>總數</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600', color: '#374151' }}>成功</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600', color: '#374151' }}>失敗</th>
                  </tr>
                </thead>
                <tbody>
                  {notificationStats.statsByType.map((stat) => (
                    <tr key={stat.type} style={{ borderTop: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '0.75rem' }}>
                        {stat.type === 'benefit-expiration' ? '📅 福利到期' :
                         stat.type === 'benefit-reminder' ? '⏰ 福利提醒' :
                         stat.type === 'test' ? '🧪 測試通知' : '🔔 ' + stat.type}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '500' }}>{stat.total}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', color: '#10b981', fontWeight: '500' }}>{stat.success}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', color: '#ef4444', fontWeight: '500' }}>{stat.failed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 最近通知記錄 */}
            <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>最近通知記錄</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                background: 'white',
                borderRadius: '8px',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <thead style={{ background: '#f9fafb' }}>
                  <tr>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>時間</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>用戶ID</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>渠道</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>類型</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>標題</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>狀態</th>
                  </tr>
                </thead>
                <tbody>
                  {notificationStats.recentLogs.slice(0, 20).map((log) => (
                    <tr key={log.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '0.75rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{formatDate(log.sentAt)}</td>
                      <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>{log.userId}</td>
                      <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>{getChannelEmoji(log.channel)} {log.channel}</td>
                      <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>{log.type}</td>
                      <td style={{ padding: '0.75rem', fontSize: '0.85rem', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.title}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.85rem',
                          fontWeight: '500',
                          background: log.status === 'SUCCESS' ? '#d1fae5' : '#fee2e2',
                          color: log.status === 'SUCCESS' ? '#065f46' : '#991b1b'
                        }}>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p style={{ color: '#6b7280' }}>暫無通知統計數據</p>
        )}
      </section>
    </div>
  )
}
