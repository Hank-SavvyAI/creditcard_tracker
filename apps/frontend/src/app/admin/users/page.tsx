'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export const runtime = 'edge'

interface User {
  id: number
  username: string | null
  firstName: string | null
  lastName: string | null
  email: string | null
  telegramId: string | null
  isAdmin: boolean
  language: string
  createdAt: string
  _count: {
    userCards: number
    userBenefits: number
    pushSubscriptions: number
  }
}

export default function AdminUsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterAdmin, setFilterAdmin] = useState<'all' | 'admin' | 'user'>('all')

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    let filtered = users

    // 搜尋過濾
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.telegramId?.includes(searchTerm)
      )
    }

    // Admin 過濾
    if (filterAdmin !== 'all') {
      filtered = filtered.filter(user =>
        filterAdmin === 'admin' ? user.isAdmin : !user.isAdmin
      )
    }

    setFilteredUsers(filtered)
  }, [searchTerm, filterAdmin, users])

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch users')
      }

      const data = await response.json()
      setUsers(data)
      setFilteredUsers(data)
    } catch (error) {
      console.error('Error fetching users:', error)
      alert('無法取得使用者列表')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>載入中...</div>
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>使用者管理</h1>
        <Link href="/admin" style={{
          padding: '0.5rem 1rem',
          background: 'var(--background-card)',
          borderRadius: '0.5rem',
          textDecoration: 'none',
          border: '1px solid var(--border-color)'
        }}>
          返回管理員首頁
        </Link>
      </div>

      {/* 統計資訊 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div style={{
          padding: '1.5rem',
          background: 'var(--background-card)',
          borderRadius: '0.5rem',
          border: '1px solid var(--border-color)'
        }}>
          <div style={{ fontSize: '0.875rem', color: '#666' }}>總使用者數</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', marginTop: '0.5rem' }}>{users.length}</div>
        </div>
        <div style={{
          padding: '1.5rem',
          background: 'var(--background-card)',
          borderRadius: '0.5rem',
          border: '1px solid var(--border-color)'
        }}>
          <div style={{ fontSize: '0.875rem', color: '#666' }}>管理員</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', marginTop: '0.5rem' }}>
            {users.filter(u => u.isAdmin).length}
          </div>
        </div>
        <div style={{
          padding: '1.5rem',
          background: 'var(--background-card)',
          borderRadius: '0.5rem',
          border: '1px solid var(--border-color)'
        }}>
          <div style={{ fontSize: '0.875rem', color: '#666' }}>Telegram 用戶</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', marginTop: '0.5rem' }}>
            {users.filter(u => u.telegramId).length}
          </div>
        </div>
        <div style={{
          padding: '1.5rem',
          background: 'var(--background-card)',
          borderRadius: '0.5rem',
          border: '1px solid var(--border-color)'
        }}>
          <div style={{ fontSize: '0.875rem', color: '#666' }}>Google 用戶</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', marginTop: '0.5rem' }}>
            {users.filter(u => u.email).length}
          </div>
        </div>
      </div>

      {/* 搜尋和篩選 */}
      <div style={{
        marginBottom: '1.5rem',
        display: 'flex',
        gap: '1rem',
        flexWrap: 'wrap'
      }}>
        <input
          type="text"
          placeholder="搜尋使用者名稱、Email、Telegram ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: 1,
            minWidth: '300px',
            padding: '0.75rem',
            borderRadius: '0.5rem',
            border: '1px solid var(--border-color)',
            fontSize: '1rem'
          }}
        />
        <select
          value={filterAdmin}
          onChange={(e) => setFilterAdmin(e.target.value as any)}
          style={{
            padding: '0.75rem',
            borderRadius: '0.5rem',
            border: '1px solid var(--border-color)',
            fontSize: '1rem',
            minWidth: '150px'
          }}
        >
          <option value="all">全部使用者</option>
          <option value="admin">僅管理員</option>
          <option value="user">僅一般用戶</option>
        </select>
      </div>

      {/* 使用者列表 */}
      <div style={{
        background: 'var(--background-card)',
        borderRadius: '0.5rem',
        border: '1px solid var(--border-color)',
        overflow: 'hidden'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--background)', borderBottom: '1px solid var(--border-color)' }}>
              <th style={{ padding: '1rem', textAlign: 'left' }}>ID</th>
              <th style={{ padding: '1rem', textAlign: 'left' }}>使用者</th>
              <th style={{ padding: '1rem', textAlign: 'left' }}>登入方式</th>
              <th style={{ padding: '1rem', textAlign: 'left' }}>語言</th>
              <th style={{ padding: '1rem', textAlign: 'left' }}>卡片數</th>
              <th style={{ padding: '1rem', textAlign: 'left' }}>福利數</th>
              <th style={{ padding: '1rem', textAlign: 'left' }}>推播訂閱</th>
              <th style={{ padding: '1rem', textAlign: 'left' }}>角色</th>
              <th style={{ padding: '1rem', textAlign: 'left' }}>註冊時間</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => (
              <tr key={user.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '1rem' }}>{user.id}</td>
                <td style={{ padding: '1rem' }}>
                  <div style={{ fontWeight: '500' }}>
                    {user.username || user.firstName || 'N/A'}
                  </div>
                  {user.email && (
                    <div style={{ fontSize: '0.875rem', color: '#666' }}>{user.email}</div>
                  )}
                </td>
                <td style={{ padding: '1rem' }}>
                  {user.telegramId && (
                    <span style={{
                      padding: '0.25rem 0.5rem',
                      background: '#0088cc20',
                      color: '#0088cc',
                      borderRadius: '0.25rem',
                      fontSize: '0.875rem',
                      marginRight: '0.5rem'
                    }}>
                      Telegram
                    </span>
                  )}
                  {user.email && (
                    <span style={{
                      padding: '0.25rem 0.5rem',
                      background: '#4285F420',
                      color: '#4285F4',
                      borderRadius: '0.25rem',
                      fontSize: '0.875rem'
                    }}>
                      Google
                    </span>
                  )}
                </td>
                <td style={{ padding: '1rem' }}>{user.language}</td>
                <td style={{ padding: '1rem' }}>{user._count.userCards}</td>
                <td style={{ padding: '1rem' }}>{user._count.userBenefits}</td>
                <td style={{ padding: '1rem' }}>{user._count.pushSubscriptions}</td>
                <td style={{ padding: '1rem' }}>
                  {user.isAdmin ? (
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      background: '#ef444420',
                      color: '#ef4444',
                      borderRadius: '0.25rem',
                      fontSize: '0.875rem',
                      fontWeight: '500'
                    }}>
                      管理員
                    </span>
                  ) : (
                    <span style={{ color: '#666' }}>一般用戶</span>
                  )}
                </td>
                <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#666' }}>
                  {new Date(user.createdAt).toLocaleDateString('zh-TW')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#666' }}>
            沒有符合條件的使用者
          </div>
        )}
      </div>

      <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#666' }}>
        顯示 {filteredUsers.length} / {users.length} 位使用者
      </div>
    </div>
  )
}
