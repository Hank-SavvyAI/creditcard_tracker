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
  role: string
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

  // Modal state
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [userCards, setUserCards] = useState<any[]>([])
  const [modalLoading, setModalLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    const skipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === 'true'
    const token = localStorage.getItem('token')

    if (!skipAuth && !token) {
      router.push('/')
      return
    }

    fetchUsers()
  }, [router])

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
        filterAdmin === 'admin' ? user.role === 'ADMIN' : user.role !== 'ADMIN'
      )
    }

    setFilteredUsers(filtered)
  }, [searchTerm, filterAdmin, users])

  const fetchUsers = async () => {
    try {
      let token = localStorage.getItem('token')

      // If no token exists and we have a dev token, use it
      if (!token && process.env.NEXT_PUBLIC_DEV_TOKEN) {
        token = process.env.NEXT_PUBLIC_DEV_TOKEN
      }

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

  const handleCardCountClick = async (user: User) => {
    setSelectedUser(user)
    setShowModal(true)
    setModalLoading(true)
    setUserCards([])

    try {
      let token = localStorage.getItem('token')

      // If no token exists and we have a dev token, use it
      if (!token && process.env.NEXT_PUBLIC_DEV_TOKEN) {
        token = process.env.NEXT_PUBLIC_DEV_TOKEN
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/users/${user.id}/cards`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch user cards')
      }

      const data = await response.json()
      setUserCards(data)
    } catch (error) {
      console.error('Error fetching user cards:', error)
      alert('無法取得使用者卡片列表')
    } finally {
      setModalLoading(false)
    }
  }

  const closeModal = () => {
    setShowModal(false)
    setSelectedUser(null)
    setUserCards([])
  }

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>載入中...</div>
  }

  return (
    <div style={{
      padding: '2rem',
      maxWidth: '1400px',
      margin: '0 auto',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      backgroundAttachment: 'fixed'
    }}>
      <div style={{
        marginBottom: '2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(255, 255, 255, 0.95)',
        padding: '1.5rem',
        borderRadius: '1rem',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
      }}>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 'bold',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          margin: 0
        }}>使用者管理</h1>
        <Link href="/admin" style={{
          padding: '0.75rem 1.5rem',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '0.75rem',
          textDecoration: 'none',
          border: 'none',
          color: 'white',
          fontWeight: '500',
          transition: 'all 0.3s ease',
          boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
        }}>
          ← 返回管理員首頁
        </Link>
      </div>

      {/* 統計資訊 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        <div style={{
          padding: '2rem',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '1rem',
          border: 'none',
          boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)',
          color: 'white',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ fontSize: '0.875rem', opacity: 0.9, fontWeight: '500' }}>總使用者數</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginTop: '0.5rem' }}>{users.length}</div>
          <div style={{
            position: 'absolute',
            right: '-20px',
            bottom: '-20px',
            fontSize: '6rem',
            opacity: 0.1
          }}>👥</div>
        </div>
        <div style={{
          padding: '2rem',
          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          borderRadius: '1rem',
          border: 'none',
          boxShadow: '0 8px 32px rgba(245, 87, 108, 0.3)',
          color: 'white',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ fontSize: '0.875rem', opacity: 0.9, fontWeight: '500' }}>管理員</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginTop: '0.5rem' }}>
            {users.filter(u => u.role === 'ADMIN').length}
          </div>
          <div style={{
            position: 'absolute',
            right: '-20px',
            bottom: '-20px',
            fontSize: '6rem',
            opacity: 0.1
          }}>👑</div>
        </div>
        <div style={{
          padding: '2rem',
          background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
          borderRadius: '1rem',
          border: 'none',
          boxShadow: '0 8px 32px rgba(79, 172, 254, 0.3)',
          color: 'white',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ fontSize: '0.875rem', opacity: 0.9, fontWeight: '500' }}>Telegram 用戶</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginTop: '0.5rem' }}>
            {users.filter(u => u.telegramId).length}
          </div>
          <div style={{
            position: 'absolute',
            right: '-20px',
            bottom: '-20px',
            fontSize: '6rem',
            opacity: 0.1
          }}>✈️</div>
        </div>
        <div style={{
          padding: '2rem',
          background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
          borderRadius: '1rem',
          border: 'none',
          boxShadow: '0 8px 32px rgba(67, 233, 123, 0.3)',
          color: 'white',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ fontSize: '0.875rem', opacity: 0.9, fontWeight: '500' }}>Google 用戶</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginTop: '0.5rem' }}>
            {users.filter(u => u.email).length}
          </div>
          <div style={{
            position: 'absolute',
            right: '-20px',
            bottom: '-20px',
            fontSize: '6rem',
            opacity: 0.1
          }}>🔍</div>
        </div>
      </div>

      {/* 搜尋和篩選 */}
      <div style={{
        marginBottom: '1.5rem',
        display: 'flex',
        gap: '1rem',
        flexWrap: 'wrap',
        background: 'rgba(255, 255, 255, 0.95)',
        padding: '1.5rem',
        borderRadius: '1rem',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
      }}>
        <input
          type="text"
          placeholder="🔍 搜尋使用者名稱、Email、Telegram ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: 1,
            minWidth: '300px',
            padding: '1rem',
            borderRadius: '0.75rem',
            border: '2px solid #e0e7ff',
            fontSize: '1rem',
            outline: 'none',
            transition: 'all 0.3s ease'
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = '#667eea'
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)'
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = '#e0e7ff'
            e.currentTarget.style.boxShadow = 'none'
          }}
        />
        <select
          value={filterAdmin}
          onChange={(e) => setFilterAdmin(e.target.value as any)}
          style={{
            padding: '1rem',
            borderRadius: '0.75rem',
            border: '2px solid #e0e7ff',
            fontSize: '1rem',
            minWidth: '150px',
            outline: 'none',
            cursor: 'pointer',
            background: 'white',
            fontWeight: '500'
          }}
        >
          <option value="all">全部使用者</option>
          <option value="admin">僅管理員</option>
          <option value="user">僅一般用戶</option>
        </select>
      </div>

      {/* 使用者列表 */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '1rem',
        border: 'none',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white'
            }}>
              <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>ID</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>使用者</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>登入方式</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>語言</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>卡片數</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>福利數</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>推播訂閱</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>角色</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>註冊時間</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user, index) => (
              <tr key={user.id} style={{
                borderBottom: '1px solid #f0f0f0',
                transition: 'all 0.2s ease',
                background: index % 2 === 0 ? 'white' : '#fafafa'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(90deg, #f0f4ff 0%, #fef0ff 100%)'
                e.currentTarget.style.transform = 'scale(1.01)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = index % 2 === 0 ? 'white' : '#fafafa'
                e.currentTarget.style.transform = 'scale(1)'
              }}>
                <td style={{ padding: '1rem', fontWeight: '600', color: '#667eea' }}>{user.id}</td>
                <td style={{ padding: '1rem' }}>
                  <div style={{ fontWeight: '600', color: '#333' }}>
                    {user.username || user.firstName || 'N/A'}
                  </div>
                  {user.email && (
                    <div style={{ fontSize: '0.875rem', color: '#888' }}>{user.email}</div>
                  )}
                </td>
                <td style={{ padding: '1rem' }}>
                  {user.telegramId && (
                    <span style={{
                      padding: '0.4rem 0.8rem',
                      background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                      color: 'white',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      marginRight: '0.5rem',
                      fontWeight: '500',
                      display: 'inline-block'
                    }}>
                      ✈️ Telegram
                    </span>
                  )}
                  {user.email && (
                    <span style={{
                      padding: '0.4rem 0.8rem',
                      background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                      color: 'white',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      display: 'inline-block'
                    }}>
                      🔍 Google
                    </span>
                  )}
                </td>
                <td style={{ padding: '1rem', fontWeight: '500' }}>{user.language}</td>
                <td style={{ padding: '1rem' }}>
                  <button
                    onClick={() => handleCardCountClick(user)}
                    style={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      border: 'none',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      padding: '0.4rem 0.8rem',
                      borderRadius: '0.5rem',
                      fontWeight: '600',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)'
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.3)'
                    }}
                  >
                    {user._count.userCards} 張
                  </button>
                </td>
                <td style={{ padding: '1rem', fontWeight: '600', color: '#667eea' }}>{user._count.userBenefits}</td>
                <td style={{ padding: '1rem', fontWeight: '600', color: '#764ba2' }}>{user._count.pushSubscriptions}</td>
                <td style={{ padding: '1rem' }}>
                  {user.role === 'ADMIN' ? (
                    <span style={{
                      padding: '0.4rem 0.8rem',
                      background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                      color: 'white',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      display: 'inline-block'
                    }}>
                      👑 管理員
                    </span>
                  ) : (
                    <span style={{
                      color: '#888',
                      padding: '0.4rem 0.8rem',
                      background: '#f0f0f0',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      display: 'inline-block'
                    }}>一般用戶</span>
                  )}
                </td>
                <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#888', fontWeight: '500' }}>
                  {new Date(user.createdAt).toLocaleDateString('zh-TW')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <div style={{
            padding: '3rem',
            textAlign: 'center',
            color: '#888',
            fontSize: '1.1rem'
          }}>
            😔 沒有符合條件的使用者
          </div>
        )}
      </div>

      <div style={{
        marginTop: '1rem',
        fontSize: '0.875rem',
        color: 'white',
        background: 'rgba(255, 255, 255, 0.2)',
        padding: '1rem',
        borderRadius: '0.75rem',
        textAlign: 'center',
        fontWeight: '500',
        backdropFilter: 'blur(10px)'
      }}>
        顯示 {filteredUsers.length} / {users.length} 位使用者
      </div>

      {/* Modal */}
      {showModal && (
        <div
          onClick={closeModal}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--background-card)',
              borderRadius: '0.5rem',
              border: '1px solid var(--border-color)',
              maxWidth: '800px',
              width: '90%',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            {/* Modal Header */}
            <div style={{
              padding: '1.5rem',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              color: 'white'
            }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>
                {selectedUser?.username || selectedUser?.firstName || 'N/A'} 的追蹤卡片
              </h2>
              <button
                onClick={closeModal}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  padding: '0.25rem 0.75rem',
                  color: 'white',
                  borderRadius: '0.5rem',
                  fontWeight: 'bold',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'
                  e.currentTarget.style.transform = 'rotate(90deg)'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'
                  e.currentTarget.style.transform = 'rotate(0deg)'
                }}
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.5rem', overflow: 'auto', flex: 1 }}>
              {modalLoading ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <div style={{ fontSize: '1rem', color: '#666' }}>載入中...</div>
                </div>
              ) : userCards.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                  目前沒有追蹤任何卡片
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white'
                    }}>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>#</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>卡片名稱</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>銀行</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>地區</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>福利數量</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userCards.map((userCard, index) => (
                      <tr key={userCard.id} style={{
                        borderBottom: '1px solid #f0f0f0',
                        background: index % 2 === 0 ? 'white' : '#fafafa',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'linear-gradient(90deg, #f0f4ff 0%, #fef0ff 100%)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = index % 2 === 0 ? 'white' : '#fafafa'
                      }}>
                        <td style={{ padding: '0.75rem', fontWeight: '600', color: '#667eea' }}>{index + 1}</td>
                        <td style={{ padding: '0.75rem', fontWeight: '600', color: '#333' }}>{userCard.card.name}</td>
                        <td style={{ padding: '0.75rem', fontWeight: '500', color: '#666' }}>{userCard.card.bank}</td>
                        <td style={{ padding: '0.75rem', fontWeight: '500', color: '#666' }}>{userCard.card.region}</td>
                        <td style={{ padding: '0.75rem', fontWeight: '600', color: '#764ba2' }}>{userCard.card._count.benefits}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
