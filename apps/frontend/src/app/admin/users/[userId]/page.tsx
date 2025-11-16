'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

interface User {
  id: number
  username: string | null
  firstName: string | null
  lastName: string | null
  email: string | null
  telegramId: string | null
  lineId: string | null
  googleId: string | null
  role: string
  tier: string
  language: string
  createdAt: string
}

interface UserBenefit {
  id: number
  benefitId: number | null
  year: number
  cycleNumber: number | null
  periodEnd: string | null
  isCompleted: boolean
  completedAt: string | null
  usedAmount: number | null
  notes: string | null
  isHidden: boolean
  isCustom: boolean
  customTitle: string | null
  customAmount: number | null
  customCurrency: string | null
  customDescription: string | null
  createdAt: string
  benefit: {
    id: number
    title: string
    titleEn: string | null
    amount: number
    currency: string
    cycleType: string
  } | null
}

interface UserCard {
  id: number
  nickname: string | null
  cardInstance: number
  afChargeMonth: number | null
  afChargeDay: number | null
  openedAt: string | null
  addedAt: string
  displayOrder: number
  card: {
    id: number
    name: string
    nameEn: string | null
    bank: string
    bankEn: string | null
    region: string
    type: string
    photo: string | null
    fee: string | null
    _count: {
      benefits: number
    }
  }
  userBenefits: UserBenefit[]
}

export default function UserDetailPage() {
  const router = useRouter()
  const params = useParams()
  const userId = params.userId as string

  const [user, setUser] = useState<User | null>(null)
  const [userCards, setUserCards] = useState<UserCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set())

  useEffect(() => {
    const skipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === 'true'
    const token = localStorage.getItem('token')

    if (!skipAuth && !token) {
      router.push('/')
      return
    }

    loadData()
  }, [userId, router])

  const loadData = async () => {
    try {
      let token = localStorage.getItem('token')
      if (!token && process.env.NEXT_PUBLIC_DEV_TOKEN) {
        token = process.env.NEXT_PUBLIC_DEV_TOKEN
      }

      const headers = {
        'Authorization': `Bearer ${token}`
      }

      // Fetch user info
      const userRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/users/${userId}`, { headers })
      if (!userRes.ok) throw new Error('Failed to fetch user')
      const userData = await userRes.json()
      setUser(userData)

      // Fetch user cards with benefits
      const cardsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/users/${userId}/cards`, { headers })
      if (!cardsRes.ok) throw new Error('Failed to fetch user cards')
      const cardsData = await cardsRes.json()
      setUserCards(cardsData)

    } catch (err: any) {
      console.error('Error loading data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleCard = (cardId: number) => {
    const newExpanded = new Set(expandedCards)
    if (newExpanded.has(cardId)) {
      newExpanded.delete(cardId)
    } else {
      newExpanded.add(cardId)
    }
    setExpandedCards(newExpanded)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('zh-TW')
  }

  const getCycleTypeText = (cycleType: string) => {
    const types: Record<string, string> = {
      'MONTHLY': '每月',
      'QUARTERLY': '每季',
      'YEARLY': '每年',
      'ONE_TIME': '一次性'
    }
    return types[cycleType] || cycleType
  }

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>載入中...</div>
  }

  if (error || !user) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'red' }}>
        錯誤: {error || '找不到使用者'}
        <br />
        <Link href="/admin/users" style={{ color: '#667eea', textDecoration: 'underline' }}>
          返回使用者列表
        </Link>
      </div>
    )
  }

  return (
    <div style={{
      padding: '2rem',
      maxWidth: '1400px',
      margin: '0 auto',
      minHeight: '100vh',
      background: '#f5f7fa'
    }}>
      {/* Header */}
      <div style={{
        marginBottom: '2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'white',
        padding: '1.5rem',
        borderRadius: '1rem',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
      }}>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 'bold',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          margin: 0
        }}>👤 使用者詳細資料</h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Link href={`/admin/users/${userId}/notifications`} style={{
            padding: '0.75rem 1.5rem',
            background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
            borderRadius: '0.75rem',
            textDecoration: 'none',
            border: 'none',
            color: 'white',
            fontWeight: '500',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 15px rgba(67, 233, 123, 0.4)'
          }}>
            📬 通知記錄
          </Link>
          <Link href="/admin/users" style={{
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
            ← 返回列表
          </Link>
        </div>
      </div>

      {/* User Info Card */}
      <div style={{
        background: 'white',
        borderRadius: '1rem',
        padding: '2rem',
        marginBottom: '2rem',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
      }}>
        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: 'bold',
          marginBottom: '1.5rem',
          color: '#333'
        }}>基本資訊</h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1.5rem'
        }}>
          <div>
            <div style={{ fontSize: '0.875rem', color: '#888', marginBottom: '0.25rem' }}>使用者 ID</div>
            <div style={{ fontSize: '1.125rem', fontWeight: '600', color: '#667eea' }}>#{user.id}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', color: '#888', marginBottom: '0.25rem' }}>名稱</div>
            <div style={{ fontSize: '1.125rem', fontWeight: '600' }}>{user.username || user.firstName || 'N/A'}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', color: '#888', marginBottom: '0.25rem' }}>Email</div>
            <div style={{ fontSize: '1.125rem', fontWeight: '600' }}>{user.email || 'N/A'}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', color: '#888', marginBottom: '0.25rem' }}>角色</div>
            <div style={{ fontSize: '1.125rem', fontWeight: '600' }}>
              {user.role === 'ADMIN' ? '👑 管理員' : '一般用戶'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', color: '#888', marginBottom: '0.25rem' }}>會員等級</div>
            <div style={{ fontSize: '1.125rem', fontWeight: '600' }}>{user.tier}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', color: '#888', marginBottom: '0.25rem' }}>語言</div>
            <div style={{ fontSize: '1.125rem', fontWeight: '600' }}>{user.language}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', color: '#888', marginBottom: '0.25rem' }}>登入方式</div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
              {user.telegramId && (
                <span style={{
                  padding: '0.4rem 0.8rem',
                  background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                  color: 'white',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}>✈️ Telegram</span>
              )}
              {user.googleId && (
                <span style={{
                  padding: '0.4rem 0.8rem',
                  background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                  color: 'white',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}>🔍 Google</span>
              )}
              {user.lineId && (
                <span style={{
                  padding: '0.4rem 0.8rem',
                  background: 'linear-gradient(135deg, #00B900 0%, #00D900 100%)',
                  color: 'white',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}>💚 LINE</span>
              )}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', color: '#888', marginBottom: '0.25rem' }}>註冊時間</div>
            <div style={{ fontSize: '1.125rem', fontWeight: '600' }}>{formatDate(user.createdAt)}</div>
          </div>
        </div>
      </div>

      {/* Tracked Cards */}
      <div style={{
        background: 'white',
        borderRadius: '1rem',
        padding: '2rem',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
      }}>
        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: 'bold',
          marginBottom: '1.5rem',
          color: '#333'
        }}>追蹤的信用卡 ({userCards.length})</h2>

        {userCards.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>
            目前沒有追蹤任何卡片
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {userCards.map((userCard) => (
              <div key={userCard.id} style={{
                border: '2px solid #e0e7ff',
                borderRadius: '1rem',
                overflow: 'hidden',
                transition: 'all 0.3s ease'
              }}>
                {/* Card Header - Clickable */}
                <div
                  onClick={() => toggleCard(userCard.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '1.5rem',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {userCard.card.photo && (
                    <img
                      src={userCard.card.photo}
                      alt={userCard.card.name}
                      style={{
                        width: '80px',
                        height: '50px',
                        objectFit: 'contain',
                        borderRadius: '0.5rem',
                        background: 'white',
                        padding: '0.25rem',
                        marginRight: '1.5rem'
                      }}
                    />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'white', marginBottom: '0.25rem' }}>
                      {userCard.card.name}
                      {userCard.nickname && ` (${userCard.nickname})`}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.9)' }}>
                      {userCard.card.bank} • {userCard.card.region} • {userCard.card.type}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', color: 'white' }}>
                    <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.25rem' }}>
                      福利數: {userCard.userBenefits.length}
                    </div>
                    <div style={{ fontSize: '1.5rem' }}>
                      {expandedCards.has(userCard.id) ? '▼' : '▶'}
                    </div>
                  </div>
                </div>

                {/* Card Details - Expandable */}
                {expandedCards.has(userCard.id) && (
                  <div style={{ padding: '1.5rem', background: '#fafafa' }}>
                    {/* Card Info */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '1rem',
                      marginBottom: '1.5rem',
                      padding: '1rem',
                      background: 'white',
                      borderRadius: '0.75rem'
                    }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#888' }}>年費</div>
                        <div style={{ fontWeight: '600' }}>
                          {userCard.card.fee || 'N/A'}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#888' }}>收取日期</div>
                        <div style={{ fontWeight: '600' }}>
                          {userCard.afChargeMonth && userCard.afChargeDay
                            ? `${userCard.afChargeMonth}月${userCard.afChargeDay}日`
                            : 'N/A'}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#888' }}>開卡日期</div>
                        <div style={{ fontWeight: '600' }}>{formatDate(userCard.openedAt)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#888' }}>追蹤時間</div>
                        <div style={{ fontWeight: '600' }}>{formatDate(userCard.addedAt)}</div>
                      </div>
                    </div>

                    {/* User Benefits */}
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1rem', color: '#333' }}>
                      福利報銷記錄 ({userCard.userBenefits.length})
                    </h3>

                    {userCard.userBenefits.length === 0 ? (
                      <div style={{
                        textAlign: 'center',
                        padding: '2rem',
                        background: 'white',
                        borderRadius: '0.75rem',
                        color: '#888'
                      }}>
                        尚無福利記錄
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {userCard.userBenefits.map((ub) => {
                          const benefitTitle = ub.isCustom
                            ? ub.customTitle
                            : ub.benefit?.title || 'N/A'
                          const totalAmount = ub.isCustom
                            ? (ub.customAmount || 0)
                            : (ub.benefit?.amount || 0)
                          const currency = ub.isCustom
                            ? (ub.customCurrency || '')
                            : (ub.benefit?.currency || '')
                          const usagePercentage = totalAmount > 0 && ub.usedAmount
                            ? Math.min(Math.round((ub.usedAmount / totalAmount) * 100), 100)
                            : 0

                          return (
                            <div key={ub.id} style={{
                              background: 'white',
                              borderRadius: '0.75rem',
                              padding: '1rem',
                              border: `2px solid ${ub.isCompleted ? '#43e97b' : '#e0e7ff'}`,
                              opacity: ub.isHidden ? 0.6 : 1
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem' }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                    <span style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#333' }}>
                                      {benefitTitle}
                                    </span>
                                    {ub.isCustom && (
                                      <span style={{
                                        padding: '0.25rem 0.5rem',
                                        background: '#fbbf24',
                                        color: 'white',
                                        borderRadius: '0.25rem',
                                        fontSize: '0.75rem',
                                        fontWeight: '600'
                                      }}>自訂</span>
                                    )}
                                    {ub.isHidden && (
                                      <span style={{
                                        padding: '0.25rem 0.5rem',
                                        background: '#9ca3af',
                                        color: 'white',
                                        borderRadius: '0.25rem',
                                        fontSize: '0.75rem',
                                        fontWeight: '600'
                                      }}>已隱藏</span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: '0.875rem', color: '#666' }}>
                                    {ub.year} 年
                                    {ub.cycleNumber && ` • 第 ${ub.cycleNumber} 週期`}
                                    {ub.benefit?.cycleType && ` • ${getCycleTypeText(ub.benefit.cycleType)}`}
                                  </div>
                                  {ub.customDescription && (
                                    <div style={{ fontSize: '0.875rem', color: '#888', marginTop: '0.25rem' }}>
                                      📝 {ub.customDescription}
                                    </div>
                                  )}
                                </div>
                                <div style={{
                                  padding: '0.5rem 1rem',
                                  background: ub.isCompleted
                                    ? 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
                                    : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                                  color: 'white',
                                  borderRadius: '0.5rem',
                                  fontWeight: 'bold',
                                  fontSize: '0.875rem',
                                  whiteSpace: 'nowrap'
                                }}>
                                  {ub.isCompleted ? '✓ 已完成' : '進行中'}
                                </div>
                              </div>

                              {/* Progress Bar */}
                              {totalAmount > 0 && (
                                <div style={{ marginBottom: '0.75rem' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                                    <span style={{ color: '#666' }}>
                                      已使用: {ub.usedAmount || 0} {currency}
                                    </span>
                                    <span style={{ fontWeight: '600', color: '#667eea' }}>
                                      {usagePercentage}%
                                    </span>
                                    <span style={{ color: '#666' }}>
                                      總額: {totalAmount} {currency}
                                    </span>
                                  </div>
                                  <div style={{
                                    width: '100%',
                                    height: '8px',
                                    background: '#e0e7ff',
                                    borderRadius: '999px',
                                    overflow: 'hidden'
                                  }}>
                                    <div style={{
                                      width: `${usagePercentage}%`,
                                      height: '100%',
                                      background: ub.isCompleted
                                        ? 'linear-gradient(90deg, #43e97b 0%, #38f9d7 100%)'
                                        : 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                                      transition: 'width 0.3s ease'
                                    }} />
                                  </div>
                                </div>
                              )}

                              {/* Additional Info */}
                              <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                                gap: '0.75rem',
                                fontSize: '0.875rem',
                                color: '#666'
                              }}>
                                {ub.periodEnd && (
                                  <div>
                                    <span style={{ color: '#888' }}>結束日期:</span>{' '}
                                    <span style={{ fontWeight: '600' }}>{formatDate(ub.periodEnd)}</span>
                                  </div>
                                )}
                                {ub.completedAt && (
                                  <div>
                                    <span style={{ color: '#888' }}>完成日期:</span>{' '}
                                    <span style={{ fontWeight: '600', color: '#43e97b' }}>{formatDate(ub.completedAt)}</span>
                                  </div>
                                )}
                                {ub.notes && (
                                  <div style={{ gridColumn: '1 / -1' }}>
                                    <span style={{ color: '#888' }}>備註:</span>{' '}
                                    <span style={{ fontWeight: '500' }}>{ub.notes}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
