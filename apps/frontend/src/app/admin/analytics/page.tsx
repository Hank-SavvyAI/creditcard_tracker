'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import './analytics.css'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8443'

interface PageBreakdown {
  page: string
  count: number
}

interface DeviceBreakdown {
  device: string
  count: number
}

interface DailyView {
  date: string
  count: number
}

interface AnalyticsStats {
  totalViews: number
  uniqueSessions: number
  pageBreakdown: PageBreakdown[]
  deviceBreakdown: DeviceBreakdown[]
  dailyViews: DailyView[]
}

interface RecentView {
  id: number
  page: string
  device: string | null
  userAgent: string | null
  createdAt: string
  user?: {
    id: number
    username: string | null
    email: string | null
  } | null
}

export default function AnalyticsPage() {
  const router = useRouter()
  const [stats, setStats] = useState<AnalyticsStats | null>(null)
  const [recentViews, setRecentViews] = useState<RecentView[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'recent'>('overview')

  useEffect(() => {
    // Check if user is logged in (skip check if SKIP_AUTH is enabled)
    const skipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === 'true'
    const user = localStorage.getItem('user')

    if (!skipAuth && !user) {
      router.push('/')
      return
    }

    fetchAnalytics()
  }, [router])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)

      // Fetch stats
      const statsResponse = await fetch(`${BACKEND_URL}/api/analytics/stats`)
      const statsData = await statsResponse.json()

      if (statsData.success) {
        setStats(statsData.data)
      }

      // Fetch recent views
      const recentResponse = await fetch(`${BACKEND_URL}/api/analytics/recent?limit=50`)
      const recentData = await recentResponse.json()

      if (recentData.success) {
        setRecentViews(recentData.data)
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="analytics-container loading">載入中...</div>
  }

  if (!stats) {
    return <div className="analytics-container error">無法載入分析資料</div>
  }

  return (
    <div className="analytics-container">
      <div className="analytics-header">
        <h1>📊 網站分析</h1>
        <button onClick={fetchAnalytics} className="refresh-btn">
          🔄 重新整理
        </button>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          總覽
        </button>
        <button
          className={`tab ${activeTab === 'recent' ? 'active' : ''}`}
          onClick={() => setActiveTab('recent')}
        >
          最近訪問
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="overview-content">
          {/* Summary Cards */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">👁️</div>
              <div className="stat-content">
                <div className="stat-label">總瀏覽量</div>
                <div className="stat-value">{stats.totalViews.toLocaleString()}</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">👥</div>
              <div className="stat-content">
                <div className="stat-label">獨立訪客</div>
                <div className="stat-value">{stats.uniqueSessions.toLocaleString()}</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">📈</div>
              <div className="stat-content">
                <div className="stat-label">平均頁面/訪客</div>
                <div className="stat-value">
                  {stats.uniqueSessions > 0
                    ? (stats.totalViews / stats.uniqueSessions).toFixed(2)
                    : '0'}
                </div>
              </div>
            </div>
          </div>

          {/* Page Breakdown */}
          <div className="section">
            <h2>📄 頁面瀏覽統計</h2>
            <div className="breakdown-list">
              {stats.pageBreakdown.map((item, index) => (
                <div key={index} className="breakdown-item">
                  <div className="breakdown-label">{item.page}</div>
                  <div className="breakdown-bar-container">
                    <div
                      className="breakdown-bar"
                      style={{
                        width: `${(item.count / stats.totalViews) * 100}%`,
                      }}
                    />
                  </div>
                  <div className="breakdown-value">{item.count.toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Device Breakdown */}
          <div className="section">
            <h2>📱 裝置類型統計</h2>
            <div className="device-grid">
              {stats.deviceBreakdown.map((item, index) => (
                <div key={index} className="device-card">
                  <div className="device-icon">
                    {item.device === 'mobile' && '📱'}
                    {item.device === 'tablet' && '💻'}
                    {item.device === 'desktop' && '🖥️'}
                    {item.device === 'unknown' && '❓'}
                  </div>
                  <div className="device-label">
                    {item.device === 'mobile' && '手機'}
                    {item.device === 'tablet' && '平板'}
                    {item.device === 'desktop' && '電腦'}
                    {item.device === 'unknown' && '未知'}
                  </div>
                  <div className="device-value">{item.count.toLocaleString()}</div>
                  <div className="device-percent">
                    {((item.count / stats.totalViews) * 100).toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Daily Views Chart */}
          <div className="section">
            <h2>📅 每日瀏覽量 (最近 30 天)</h2>
            <div className="chart-container">
              {stats.dailyViews.map((item, index) => {
                const maxCount = Math.max(...stats.dailyViews.map(v => v.count))
                const height = maxCount > 0 ? (item.count / maxCount) * 100 : 0

                return (
                  <div key={index} className="chart-bar-container">
                    <div className="chart-value">{item.count}</div>
                    <div className="chart-bar" style={{ height: `${height}%` }} />
                    <div className="chart-label">
                      {new Date(item.date).toLocaleDateString('zh-TW', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'recent' && (
        <div className="recent-content">
          <div className="recent-table">
            <table>
              <thead>
                <tr>
                  <th>時間</th>
                  <th>頁面</th>
                  <th>使用者</th>
                  <th>裝置</th>
                  <th>瀏覽器</th>
                </tr>
              </thead>
              <tbody>
                {recentViews.map((view) => (
                  <tr key={view.id}>
                    <td>
                      {new Date(view.createdAt).toLocaleString('zh-TW', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="page-cell">{view.page}</td>
                    <td>
                      {view.user ? (
                        <span className="user-badge">
                          {view.user.username || view.user.email || `User ${view.user.id}`}
                        </span>
                      ) : (
                        <span className="guest-badge">訪客</span>
                      )}
                    </td>
                    <td>
                      {view.device === 'mobile' && '📱 手機'}
                      {view.device === 'tablet' && '💻 平板'}
                      {view.device === 'desktop' && '🖥️ 電腦'}
                      {!view.device && '❓ 未知'}
                    </td>
                    <td className="user-agent-cell">
                      {view.userAgent
                        ? view.userAgent.substring(0, 50) + '...'
                        : '未知'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
