'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import MobileLayout from '@/components/MobileLayout'
import { api } from '@/lib/api'

const mockCardDetail = {
  id: 1,
  name: 'Chase Sapphire Preferred',
  bank: 'Chase',
  region: 'america',
  type: 'personal',
  photo: 'https://via.placeholder.com/300x190/667eea/ffffff?text=Chase+Sapphire',
  annualFee: 95,
  annualFeeWaiver: '首年免年費',
  benefits: [
    { id: 1, category: '現金回饋', title: '餐廳消費 3x 點數回饋', description: '所有餐廳消費可獲得 3x 點數回饋', amount: 300 },
    { id: 2, category: '旅遊', title: '旅遊消費 3x 點數回饋', description: '線上旅遊訂購可獲得 3x 點數回饋', amount: 500 },
    { id: 3, category: '點數', title: '開卡禮 60,000 點', description: '開卡後三個月內消費滿 $4,000 可獲得 60,000 點獎勵', amount: 60000, expiryMonth: 12, expiryDay: 31 },
  ]
}

function CardDetailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const cardId = searchParams?.get('id') ? parseInt(searchParams.get('id')!) : null
  const [card, setCard] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isTracked, setIsTracked] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const skipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === 'true'

  useEffect(() => {
    if (cardId) {
      loadCard()
      checkIfTracked()
    } else {
      setError('缺少卡片 ID')
      setLoading(false)
    }
  }, [cardId])

  async function loadCard() {
    try {
      setLoading(true)
      setError(null)
      if (skipAuth) {
        await new Promise(resolve => setTimeout(resolve, 500))
        setCard({ ...mockCardDetail, id: cardId })
        return
      }
      const cards = await api.getCards()
      const foundCard = cards.find((c: any) => c.id === cardId)
      if (!foundCard) {
        setError('找不到此卡片')
        return
      }
      setCard(foundCard)
    } catch (error: any) {
      setError(error.message || '載入失敗')
    } finally {
      setLoading(false)
    }
  }

  async function checkIfTracked() {
    try {
      if (skipAuth) {
        setIsTracked(cardId === 1 || cardId === 3)
        return
      }
      const myCards = await api.getMyCards()
      const tracked = myCards.some((uc: any) => (uc.cardId || uc.card?.id) === cardId)
      setIsTracked(tracked)
    } catch (error) {}
  }

  async function handleAddCard() {
    if (!card || isTracked) return
    setIsAdding(true)
    try {
      if (skipAuth) {
        await new Promise(resolve => setTimeout(resolve, 800))
        setIsTracked(true)
        alert(`✅ 已成功追蹤「${card.name}」！`)
        return
      }
      await api.addCard(cardId!)
      setIsTracked(true)
      const goToDashboard = confirm(`✅ 已成功追蹤「${card.name}」！\n\n是否前往「我的卡片」查看？`)
      if (goToDashboard) router.push('/dashboard')
    } catch (error: any) {
      alert('❌ 追蹤失敗：' + (error.message || '未知錯誤'))
    } finally {
      setIsAdding(false)
    }
  }

  if (loading) {
    return (
      <MobileLayout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
          <div style={{ textAlign: 'center' }}><div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏳</div><p>載入中...</p></div>
        </div>
      </MobileLayout>
    )
  }

  if (error || !card) {
    return (
      <MobileLayout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh', flexDirection: 'column', padding: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>😕</div>
          <p style={{ color: '#dc2626', marginBottom: '1rem' }}>{error || '找不到此卡片'}</p>
          <button onClick={() => router.back()} style={{ padding: '0.75rem 1.5rem', background: '#667eea', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>返回</button>
        </div>
      </MobileLayout>
    )
  }

  return (
    <MobileLayout>
      <div style={{ paddingBottom: '100px' }}>
        <div style={{ padding: '1rem', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
          <button onClick={() => router.back()} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', padding: '0.5rem 1rem', borderRadius: '8px', marginBottom: '1rem', cursor: 'pointer' }}>← 返回</button>
          <h1 style={{ fontSize: '1.5rem', margin: 0, marginBottom: '0.5rem' }}>{card.name}</h1>
          <p style={{ margin: 0, opacity: 0.9 }}>🏦 {card.bank}</p>
        </div>
        <div style={{ padding: '1rem' }}>
          {skipAuth && <div style={{ padding: '0.75rem', background: '#fef3c7', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem', color: '#92400e' }}>🔧 開發模式</div>}
          {card.photo && (
            <div style={{ borderRadius: '12px', overflow: 'hidden', marginBottom: '1.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
              <div style={{ position: 'relative', paddingTop: '63.3%', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                <img src={card.photo} alt={card.name} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                {isTracked && <div style={{ position: 'absolute', top: '1rem', right: '1rem', background: '#10b981', color: 'white', padding: '0.5rem 1rem', borderRadius: '12px', fontSize: '0.85rem', fontWeight: '600' }}>✓ 已追蹤</div>}
              </div>
            </div>
          )}
          <div style={{ background: 'white', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <h2 style={{ margin: 0, marginBottom: '1rem', fontSize: '1.1rem' }}>卡片資訊</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#6b7280' }}>地區</span><span style={{ fontWeight: '500' }}>{card.region === 'taiwan' ? '🇹🇼 台灣' : '🇺🇸 美國'}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#6b7280' }}>類型</span><span style={{ fontWeight: '500' }}>{card.type === 'personal' ? '👤 個人卡' : '🏢 商業卡'}</span></div>
              {card.annualFee !== undefined && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#6b7280' }}>年費</span><span style={{ fontWeight: '500' }}>${card.annualFee}</span></div>}
              {card.annualFeeWaiver && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#6b7280' }}>年費減免</span><span style={{ fontWeight: '500', color: '#10b981' }}>{card.annualFeeWaiver}</span></div>}
            </div>
          </div>
          <div style={{ background: 'white', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <h2 style={{ margin: 0, marginBottom: '1rem', fontSize: '1.1rem' }}>福利項目 ({card.benefits?.length || 0})</h2>
            {card.benefits && card.benefits.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {card.benefits.map((benefit: any) => (
                  <div key={benefit.id} style={{ padding: '1rem', background: '#f9fafb', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'inline-block', padding: '0.25rem 0.75rem', background: '#667eea', color: 'white', borderRadius: '12px', fontSize: '0.75rem', marginBottom: '0.75rem' }}>{benefit.category}</div>
                    <h3 style={{ margin: 0, marginBottom: '0.5rem', fontSize: '1rem', fontWeight: '600' }}>{benefit.title}</h3>
                    {benefit.description && <p style={{ margin: 0, marginBottom: '0.75rem', fontSize: '0.9rem', color: '#6b7280' }}>{benefit.description}</p>}
                    {benefit.amount > 0 && <span style={{ fontSize: '1.1rem', fontWeight: '700', color: '#667eea' }}>${benefit.amount.toLocaleString()}</span>}
                  </div>
                ))}
              </div>
            ) : <p style={{ color: '#9ca3af', textAlign: 'center', padding: '2rem 0' }}>暫無福利資訊</p>}
          </div>
        </div>
        <div style={{ position: 'fixed', bottom: 'calc(60px + env(safe-area-inset-bottom))', left: 0, right: 0, padding: '1rem', background: 'white', borderTop: '1px solid #e5e7eb' }}>
          <button onClick={handleAddCard} disabled={isAdding || isTracked} style={{ width: '100%', padding: '1rem', background: isTracked ? '#10b981' : '#667eea', color: 'white', border: 'none', borderRadius: '12px', fontSize: '1rem', fontWeight: '600', cursor: isAdding ? 'wait' : (isTracked ? 'default' : 'pointer'), opacity: isAdding ? 0.7 : 1 }}>
            {isAdding ? '⏳ 追蹤中...' : (isTracked ? '✓ 已追蹤此卡片' : '➕ 開始追蹤此卡片')}
          </button>
        </div>
      </div>
    </MobileLayout>
  )
}

export default function CardDetailPage() {
  return <Suspense fallback={<div>Loading...</div>}><CardDetailContent /></Suspense>
}
