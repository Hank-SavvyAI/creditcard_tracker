'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import MobileLayout from '@/components/MobileLayout'
import { api } from '@/lib/api'

// 模擬數據用於開發預覽
const mockCards = [
  {
    id: 1,
    card: {
      name: 'Chase Sapphire Preferred',
      nameEn: 'Chase Sapphire Preferred',
      bank: 'Chase',
      photo: 'https://via.placeholder.com/300x190/667eea/ffffff?text=Chase+Sapphire',
      benefits: [
        { id: 1, category: '現金回饋', title: '餐廳 3% 回饋', amount: 300 },
        { id: 2, category: '旅遊', title: '機票 2% 回饋', amount: 500 },
        { id: 3, category: '點數', title: '開卡禮 60,000 點', amount: 60000 },
      ]
    }
  },
  {
    id: 2,
    card: {
      name: 'American Express Platinum',
      nameEn: 'American Express Platinum',
      bank: 'American Express',
      photo: 'https://via.placeholder.com/300x190/000000/ffffff?text=Amex+Platinum',
      benefits: [
        { id: 4, category: '旅遊', title: 'Uber Credit $200', amount: 200 },
        { id: 5, category: '點數', title: '開卡禮 100,000 點', amount: 100000 },
        { id: 6, category: '優惠', title: '機場貴賓室', amount: 0 },
      ]
    }
  },
  {
    id: 3,
    card: {
      name: '台新@GoGo卡',
      nameEn: 'Taishin @GoGo Card',
      bank: '台新銀行',
      photo: 'https://via.placeholder.com/300x190/ff6b6b/ffffff?text=Taishin+GoGo',
      benefits: [
        { id: 7, category: '現金回饋', title: '網購 3.8% 回饋', amount: 800 },
        { id: 8, category: '現金回饋', title: '行動支付 3.8%', amount: 800 },
      ]
    }
  }
]

export default function Dashboard() {
  const router = useRouter()
  const [userCards, setUserCards] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const skipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === 'true'

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setError(null)
      setLoading(true)

      if (skipAuth) {
        // 開發模式：使用模擬數據
        await new Promise(resolve => setTimeout(resolve, 500)) // 模擬網路延遲
        setUserCards(mockCards)
        return
      }

      const benefits = await api.getMyBenefits()
      setUserCards(benefits)
    } catch (error: any) {
      console.error('Failed to load data:', error)
      setError(error.message || '載入失敗，請稍後再試')
      // 如果 API 失敗，在開發模式下顯示模擬數據
      if (skipAuth) {
        setUserCards(mockCards)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleRefresh() {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }

  async function handleRemoveCard(userCardId: number, cardName: string) {
    if (!confirm(`確定要移除「${cardName}」嗎？`)) {
      return
    }

    try {
      if (skipAuth) {
        // 開發模式：本地移除
        setUserCards(prev => prev.filter(c => c.id !== userCardId))
        alert('已移除（開發模式）')
        return
      }

      await api.removeCard(userCardId)
      setUserCards(prev => prev.filter(c => c.id !== userCardId))
      alert('已成功移除卡片')
    } catch (error: any) {
      console.error('Failed to remove card:', error)
      alert('移除失敗：' + (error.message || '未知錯誤'))
    }
  }

  if (loading) {
    return (
      <MobileLayout>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '80vh',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏳</div>
            <p>載入中...</p>
          </div>
        </div>
      </MobileLayout>
    )
  }

  return (
    <MobileLayout>
      <div style={{ padding: '1rem', paddingBottom: '80px' }}>
        {/* Header */}
        <div style={{
          marginBottom: '1.5rem',
          padding: '1rem',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '12px',
          color: 'white',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ fontSize: '1.5rem', margin: 0, marginBottom: '0.5rem' }}>
                我的信用卡
              </h1>
              <p style={{ margin: 0, opacity: 0.9, fontSize: '0.9rem' }}>
                共 {userCards.length} 張卡片
              </p>
            </div>
            {!loading && (
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.5rem 1rem',
                  color: 'white',
                  fontSize: '0.9rem',
                  cursor: refreshing ? 'wait' : 'pointer',
                  opacity: refreshing ? 0.7 : 1,
                }}
              >
                {refreshing ? '🔄 重新整理...' : '🔄 重新整理'}
              </button>
            )}
          </div>
        </div>

        {/* Error State */}
        {error && !skipAuth && (
          <div style={{
            padding: '1rem',
            background: '#fee2e2',
            borderRadius: '12px',
            marginBottom: '1rem',
            color: '#dc2626',
          }}>
            <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>⚠️ 載入失敗</div>
            <div style={{ fontSize: '0.9rem' }}>{error}</div>
            <button
              onClick={loadData}
              style={{
                marginTop: '0.75rem',
                padding: '0.5rem 1rem',
                background: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              重試
            </button>
          </div>
        )}

        {/* Dev Mode Banner */}
        {skipAuth && (
          <div style={{
            padding: '0.75rem',
            background: '#fef3c7',
            borderRadius: '8px',
            marginBottom: '1rem',
            fontSize: '0.85rem',
            color: '#92400e',
          }}>
            🔧 開發模式：使用模擬資料
          </div>
        )}

        {/* Cards List */}
        {userCards.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '3rem 1rem',
            background: '#f9fafb',
            borderRadius: '12px',
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💳</div>
            <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
              您還沒有新增任何信用卡
            </p>
            <button
              onClick={() => router.push('/cards')}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#667eea',
                color: 'white',
                borderRadius: '8px',
                border: 'none',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              探索信用卡
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {userCards.map(userCard => (
              <div
                key={userCard.id}
                style={{
                  background: 'white',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                }}
              >
                {/* Card Image */}
                {userCard.card.photo && (
                  <div style={{
                    position: 'relative',
                    width: '100%',
                    paddingTop: '63.3%', // 300:190 比例
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  }}>
                    <img
                      src={userCard.card.photo}
                      alt={userCard.card.name}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  </div>
                )}

                <div style={{ padding: '1.25rem' }}>
                  {/* Card Name & Bank */}
                  <h3 style={{ margin: 0, marginBottom: '0.25rem', fontSize: '1.2rem', fontWeight: '600' }}>
                    {userCard.card.name}
                  </h3>
                  <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem' }}>
                    🏦 {userCard.card.bank}
                  </p>
                  {userCard.card.fee && (
                    <p style={{ margin: '0.25rem 0 0 0', color: '#6b7280', fontSize: '0.85rem' }}>
                      💰 年費: {userCard.card.fee}
                    </p>
                  )}
                  <div style={{ marginBottom: '1rem' }}></div>

                  {/* Benefits List */}
                  <div style={{ marginBottom: '0.75rem' }}>
                    <h4 style={{ margin: 0, marginBottom: '0.75rem', fontSize: '0.9rem', color: '#6b7280', fontWeight: '500' }}>
                      福利項目 ({userCard.card.benefits.length})
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {userCard.card.benefits.slice(0, 3).map((benefit: any) => (
                        <div
                          key={benefit.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.75rem',
                            background: '#f9fafb',
                            borderRadius: '8px',
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem' }}>
                              {benefit.category}
                            </div>
                            <div style={{ fontSize: '0.9rem', fontWeight: '500', color: '#1f2937' }}>
                              {benefit.title}
                            </div>
                          </div>
                          {benefit.amount > 0 && (
                            <div style={{
                              fontSize: '0.9rem',
                              fontWeight: '600',
                              color: '#667eea',
                              marginLeft: '0.5rem',
                            }}>
                              ${benefit.amount}
                            </div>
                          )}
                        </div>
                      ))}
                      {userCard.card.benefits.length > 3 && (
                        <div style={{
                          textAlign: 'center',
                          padding: '0.5rem',
                          color: '#6b7280',
                          fontSize: '0.85rem',
                        }}>
                          還有 {userCard.card.benefits.length - 3} 個福利...
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      style={{
                        flex: 1,
                        padding: '0.75rem',
                        background: '#667eea',
                        color: 'white',
                        borderRadius: '8px',
                        border: 'none',
                        fontWeight: '600',
                        fontSize: '0.95rem',
                        cursor: 'pointer',
                      }}
                      onClick={() => router.push(`/cards/detail?id=${userCard.card.id}`)}
                    >
                      查看詳情
                    </button>
                    <button
                      style={{
                        padding: '0.75rem 1rem',
                        background: '#fee2e2',
                        color: '#dc2626',
                        borderRadius: '8px',
                        border: 'none',
                        fontWeight: '600',
                        fontSize: '0.95rem',
                        cursor: 'pointer',
                      }}
                      onClick={() => handleRemoveCard(userCard.id, userCard.card.name)}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MobileLayout>
  )
}
