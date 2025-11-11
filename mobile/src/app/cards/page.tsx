'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import MobileLayout from '@/components/MobileLayout'
import { api } from '@/lib/api'

// 模擬數據 - 所有可用的信用卡
const mockAllCards = [
  {
    id: 1,
    name: 'Chase Sapphire Preferred',
    nameEn: 'Chase Sapphire Preferred',
    bank: 'Chase',
    bankEn: 'Chase',
    region: 'america',
    type: 'personal',
    photo: 'https://via.placeholder.com/300x190/667eea/ffffff?text=Chase+Sapphire',
    benefits: [
      { id: 1, category: '現金回饋' },
      { id: 2, category: '旅遊' },
      { id: 3, category: '點數' },
    ]
  },
  {
    id: 2,
    name: 'American Express Platinum',
    nameEn: 'American Express Platinum',
    bank: 'American Express',
    bankEn: 'American Express',
    region: 'america',
    type: 'personal',
    photo: 'https://via.placeholder.com/300x190/000000/ffffff?text=Amex+Platinum',
    benefits: [
      { id: 4, category: '旅遊' },
      { id: 5, category: '點數' },
      { id: 6, category: '優惠' },
    ]
  },
  {
    id: 3,
    name: '台新@GoGo卡',
    nameEn: 'Taishin @GoGo Card',
    bank: '台新銀行',
    bankEn: 'Taishin Bank',
    region: 'taiwan',
    type: 'personal',
    photo: 'https://via.placeholder.com/300x190/ff6b6b/ffffff?text=Taishin+GoGo',
    benefits: [
      { id: 7, category: '現金回饋' },
      { id: 8, category: '現金回饋' },
    ]
  },
  {
    id: 4,
    name: '國泰世華 CUBE卡',
    nameEn: 'Cathay CUBE Card',
    bank: '國泰世華銀行',
    bankEn: 'Cathay United Bank',
    region: 'taiwan',
    type: 'personal',
    photo: 'https://via.placeholder.com/300x190/10b981/ffffff?text=Cathay+CUBE',
    benefits: [
      { id: 9, category: '現金回饋' },
      { id: 10, category: '點數' },
    ]
  },
  {
    id: 5,
    name: 'Chase Ink Business Preferred',
    nameEn: 'Chase Ink Business Preferred',
    bank: 'Chase',
    bankEn: 'Chase',
    region: 'america',
    type: 'business',
    photo: 'https://via.placeholder.com/300x190/3b82f6/ffffff?text=Chase+Ink',
    benefits: [
      { id: 11, category: '現金回饋' },
      { id: 12, category: '點數' },
      { id: 13, category: '旅遊' },
    ]
  },
]

export default function CardsPage() {
  const router = useRouter()
  const [cards, setCards] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedRegion, setSelectedRegion] = useState<string>('')
  const [selectedType, setSelectedType] = useState<string>('')
  const [trackedCardIds, setTrackedCardIds] = useState<Set<number>>(new Set())
  const [addingCardId, setAddingCardId] = useState<number | null>(null)
  const skipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === 'true'

  useEffect(() => {
    loadCards()
    loadTrackedCards()
  }, [])

  async function loadCards() {
    try {
      setError(null)
      setLoading(true)

      if (skipAuth) {
        await new Promise(resolve => setTimeout(resolve, 500))
        setCards(mockAllCards)
        return
      }

      const data = await api.getCards()
      setCards(data)
    } catch (error: any) {
      console.error('Failed to load cards:', error)
      setError(error.message || '載入失敗')
      if (skipAuth) {
        setCards(mockAllCards)
      }
    } finally {
      setLoading(false)
    }
  }

  async function loadTrackedCards() {
    try {
      if (skipAuth) {
        // 開發模式：假設已追蹤 ID 1 和 3
        setTrackedCardIds(new Set([1, 3]))
        return
      }

      const myCards = await api.getMyCards()
      const trackedIds: Set<number> = new Set(myCards.map((uc: any) => uc.cardId || uc.card?.id))
      setTrackedCardIds(trackedIds)
    } catch (error) {
      console.error('Failed to load tracked cards:', error)
    }
  }

  async function handleAddCard(cardId: number, cardName: string) {
    if (trackedCardIds.has(cardId)) {
      alert('您已經追蹤此卡片了')
      return
    }

    setAddingCardId(cardId)

    try {
      if (skipAuth) {
        // 開發模式：本地添加
        await new Promise(resolve => setTimeout(resolve, 800))
        setTrackedCardIds(prev => new Set([...prev, cardId]))
        alert(`✅ 已成功追蹤「${cardName}」！\n\n請前往「我的卡片」查看`)
        return
      }

      await api.addCard(cardId)
      setTrackedCardIds(prev => new Set([...prev, cardId]))

      // 顯示成功提示並詢問是否跳轉
      const goToDashboard = confirm(`✅ 已成功追蹤「${cardName}」！\n\n是否前往「我的卡片」查看？`)
      if (goToDashboard) {
        router.push('/dashboard')
      }
    } catch (error: any) {
      console.error('Failed to add card:', error)
      alert('❌ 追蹤失敗：' + (error.message || '未知錯誤'))
    } finally {
      setAddingCardId(null)
    }
  }

  const filteredCards = cards.filter(card => {
    if (selectedRegion && card.region !== selectedRegion) return false
    if (selectedType && card.type !== selectedType) return false
    return true
  })

  const regions = [
    { value: '', label: '全部地區', icon: '🌍' },
    { value: 'taiwan', label: '台灣', icon: '🇹🇼' },
    { value: 'america', label: '美國', icon: '🇺🇸' },
  ]

  const types = [
    { value: '', label: '全部類型', icon: '💳' },
    { value: 'personal', label: '個人卡', icon: '👤' },
    { value: 'business', label: '商業卡', icon: '🏢' },
  ]

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
      <div style={{ paddingBottom: '80px' }}>
        {/* Header */}
        <div style={{
          padding: '1rem',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
        }}>
          <h1 style={{ fontSize: '1.5rem', margin: 0, marginBottom: '0.5rem' }}>
            探索信用卡
          </h1>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '0.9rem' }}>
            找到最適合您的信用卡
          </p>
        </div>

        <div style={{ padding: '1rem' }}>
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
                onClick={loadCards}
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
              🔧 開發模式：使用模擬資料（已模擬追蹤 ID 1, 3）
            </div>
          )}

          {/* Filters */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '1rem',
            marginBottom: '1.5rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}>
            <h3 style={{ margin: 0, marginBottom: '1rem', fontSize: '1rem', color: '#1f2937' }}>
              篩選條件
            </h3>

            {/* Region Filter */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#6b7280' }}>
                地區
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {regions.map(region => (
                  <button
                    key={region.value}
                    onClick={() => setSelectedRegion(region.value)}
                    style={{
                      flex: '1 1 auto',
                      padding: '0.6rem 1rem',
                      background: selectedRegion === region.value ? '#667eea' : '#f3f4f6',
                      color: selectedRegion === region.value ? 'white' : '#4b5563',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    {region.icon} {region.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Type Filter */}
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#6b7280' }}>
                類型
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {types.map(type => (
                  <button
                    key={type.value}
                    onClick={() => setSelectedType(type.value)}
                    style={{
                      flex: '1 1 auto',
                      padding: '0.6rem 1rem',
                      background: selectedType === type.value ? '#667eea' : '#f3f4f6',
                      color: selectedType === type.value ? 'white' : '#4b5563',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    {type.icon} {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Clear Filters */}
            {(selectedRegion || selectedType) && (
              <button
                onClick={() => {
                  setSelectedRegion('')
                  setSelectedType('')
                }}
                style={{
                  width: '100%',
                  marginTop: '1rem',
                  padding: '0.6rem',
                  background: 'white',
                  color: '#6b7280',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                🗑️ 清除篩選
              </button>
            )}
          </div>

          {/* Results Count */}
          <div style={{ marginBottom: '1rem', color: '#6b7280', fontSize: '0.9rem' }}>
            找到 <strong>{filteredCards.length}</strong> 張信用卡
            {trackedCardIds.size > 0 && (
              <span> • 已追蹤 <strong>{trackedCardIds.size}</strong> 張</span>
            )}
          </div>

          {/* Cards Grid */}
          {filteredCards.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '3rem 1rem',
              background: '#f9fafb',
              borderRadius: '12px',
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
              <p style={{ color: '#6b7280' }}>
                沒有符合條件的信用卡
              </p>
              <button
                onClick={() => {
                  setSelectedRegion('')
                  setSelectedType('')
                }}
                style={{
                  marginTop: '0.75rem',
                  padding: '0.5rem 1rem',
                  background: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                清除篩選
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {filteredCards.map(card => {
                const isTracked = trackedCardIds.has(card.id)
                const isAdding = addingCardId === card.id

                return (
                  <div
                    key={card.id}
                    style={{
                      background: 'white',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                      position: 'relative',
                    }}
                  >
                    {/* Tracked Badge */}
                    {isTracked && (
                      <div style={{
                        position: 'absolute',
                        top: '1rem',
                        right: '1rem',
                        background: '#10b981',
                        color: 'white',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        zIndex: 1,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                      }}>
                        ✓ 已追蹤
                      </div>
                    )}

                    {/* Card Image */}
                    {card.photo && (
                      <div style={{
                        position: 'relative',
                        width: '100%',
                        paddingTop: '63.3%',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      }}>
                        <img
                          src={card.photo}
                          alt={card.name}
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

                    <div style={{ padding: '1rem' }}>
                      {/* Card Name & Bank */}
                      <h3 style={{ margin: 0, marginBottom: '0.25rem', fontSize: '1.1rem', fontWeight: '600' }}>
                        {card.name}
                      </h3>
                      <p style={{ margin: 0, color: '#6b7280', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                        🏦 {card.bank}
                      </p>

                      {/* Benefits Tags */}
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                        {card.benefits.slice(0, 3).map((benefit: any) => (
                          <span
                            key={benefit.id}
                            style={{
                              display: 'inline-block',
                              padding: '0.25rem 0.75rem',
                              background: '#f3f4f6',
                              borderRadius: '12px',
                              fontSize: '0.75rem',
                              color: '#4b5563',
                            }}
                          >
                            {benefit.category}
                          </span>
                        ))}
                        {card.benefits.length > 3 && (
                          <span style={{
                            display: 'inline-block',
                            padding: '0.25rem 0.75rem',
                            background: '#f3f4f6',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            color: '#9ca3af',
                          }}>
                            +{card.benefits.length - 3}
                          </span>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          style={{
                            flex: 1,
                            padding: '0.75rem',
                            background: isTracked ? '#10b981' : '#667eea',
                            color: 'white',
                            borderRadius: '8px',
                            border: 'none',
                            fontWeight: '600',
                            fontSize: '0.9rem',
                            cursor: isAdding ? 'wait' : (isTracked ? 'default' : 'pointer'),
                            opacity: isAdding ? 0.7 : 1,
                          }}
                          onClick={() => handleAddCard(card.id, card.name)}
                          disabled={isAdding || isTracked}
                        >
                          {isAdding ? '⏳ 追蹤中...' : (isTracked ? '✓ 已追蹤' : '➕ 開始追蹤')}
                        </button>
                        <button
                          style={{
                            padding: '0.75rem 1rem',
                            background: '#f3f4f6',
                            color: '#4b5563',
                            borderRadius: '8px',
                            border: 'none',
                            fontWeight: '600',
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                          }}
                          onClick={() => router.push(`/cards/detail?id=${card.id}`)}
                        >
                          詳情
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </MobileLayout>
  )
}
