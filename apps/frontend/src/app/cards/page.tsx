'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { useLanguageStore, t } from '@/store/language'

export default function CardsPage() {
  const { language } = useLanguageStore()
  const [cards, setCards] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [selectedRegion, setSelectedRegion] = useState<string>('')
  const [trackingCard, setTrackingCard] = useState<number | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    setIsLoggedIn(!!token)
    loadCards()
  }, [])

  async function loadCards() {
    try {
      // 即使未登入也可以瀏覽信用卡列表
      const data = await api.getCards()
      setCards(data)
    } catch (err) {
      setError(language === 'zh-TW' ? '無法載入信用卡資料' : 'Failed to load credit cards')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // 按地區分組信用卡
  const regionGroups = cards.reduce((groups: any, card) => {
    const region = card.region || 'other'
    if (!groups[region]) {
      groups[region] = []
    }
    groups[region].push(card)
    return groups
  }, {})

  // 地區名稱映射
  const regionNames: any = {
    taiwan: { name: '🇹🇼 台灣', nameEn: '🇹🇼 Taiwan' },
    america: { name: '🇺🇸 美國', nameEn: '🇺🇸 United States' },
    canada: { name: '🇨🇦 加拿大', nameEn: '🇨🇦 Canada' },
    japan: { name: '🇯🇵 日本', nameEn: '🇯🇵 Japan' },
    singapore: { name: '🇸🇬 新加坡', nameEn: '🇸🇬 Singapore' },
    other: { name: '🌏 其他', nameEn: '🌏 Other' },
  }

  const getRegionName = (region: string) => {
    return language === 'zh-TW' ? regionNames[region]?.name : regionNames[region]?.nameEn
  }

  async function trackCard(cardId: number) {
    if (!isLoggedIn) {
      window.location.href = '/auth/telegram'
      return
    }

    setTrackingCard(cardId)
    try {
      await api.addCard(cardId)
      alert(language === 'zh-TW' ? '已成功追蹤此信用卡！' : 'Card tracked successfully!')
    } catch (error: any) {
      console.error('Failed to track card:', error)
      const errorMessage = error.message || ''
      const errorData = error.response?.data?.error || ''

      if (errorMessage.toLowerCase().includes('already tracked') || errorData.toLowerCase().includes('already tracked')) {
        alert(language === 'zh-TW' ? '您已經在追蹤這張信用卡了' : 'You are already tracking this card')
      } else {
        alert(language === 'zh-TW' ? '追蹤失敗，請稍後再試' : 'Failed to track card, please try again')
      }
    } finally {
      setTrackingCard(null)
    }
  }

  const filteredCards = selectedRegion
    ? cards.filter(card => card.region === selectedRegion)
    : cards

  if (loading) {
    return <div className="loading">{language === 'zh-TW' ? '載入中...' : 'Loading...'}</div>
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>{language === 'zh-TW' ? '信用卡列表' : 'Credit Cards'}</h1>
        <div>
          {isLoggedIn ? (
            <Link href="/dashboard" className="btn btn-secondary">
              {language === 'zh-TW' ? '我的儀表板' : 'My Dashboard'}
            </Link>
          ) : (
            <a href="/auth/telegram" className="btn btn-primary">
              {language === 'zh-TW' ? '登入以管理我的卡片' : 'Login to Manage Cards'}
            </a>
          )}
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* 地區選擇器 */}
      {!selectedRegion && cards.length > 0 && (
        <div className="region-selector">
          <h2 style={{ textAlign: 'center', marginBottom: '2rem', color: 'var(--primary-color)' }}>
            {language === 'zh-TW' ? '請選擇地區' : 'Select Region'}
          </h2>
          <div className="region-grid">
            {Object.keys(regionGroups).map((region) => (
              <div
                key={region}
                className="region-card"
                onClick={() => setSelectedRegion(region)}
              >
                <div className="region-icon">{getRegionName(region).split(' ')[0] || '🌏'}</div>
                <h3 className="region-name">{getRegionName(region).split(' ').slice(1).join(' ') || region}</h3>
                <p className="region-count">
                  {regionGroups[region].length} {language === 'zh-TW' ? '張信用卡' : 'Cards'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 卡片列表 */}
      {selectedRegion && (
        <>
          <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={() => setSelectedRegion('')}
              className="btn btn-secondary"
            >
              ← {language === 'zh-TW' ? '返回地區選擇' : 'Back to Regions'}
            </button>
            <h2 style={{ margin: 0, color: 'var(--primary-color)' }}>
              {getRegionName(selectedRegion)} ({filteredCards.length})
            </h2>
          </div>

          {filteredCards.length === 0 ? (
            <p>{language === 'zh-TW' ? '此地區目前尚無信用卡資料' : 'No credit cards available in this region'}</p>
          ) : (
            <div className="card-grid">
              {filteredCards.map((card) => (
            <div key={card.id} className="card">
              {card.photo && (
                <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
                  <img
                    src={card.photo}
                    alt={language === 'zh-TW' ? card.name : (card.nameEn || card.name)}
                    style={{
                      maxWidth: '100%',
                      height: 'auto',
                      borderRadius: '8px',
                      maxHeight: '200px',
                      objectFit: 'contain'
                    }}
                  />
                </div>
              )}
              <h2 className="card-title">
                {language === 'zh-TW' ? card.name : (card.nameEn || card.name)}
              </h2>
              <p className="card-bank">
                🏦 {language === 'zh-TW' ? card.bank : (card.bankEn || card.bank)}
              </p>

              {card.description && (
                <p className="card-description">
                  {language === 'zh-TW' ? card.description : (card.descriptionEn || card.description)}
                </p>
              )}

              {card.benefits && card.benefits.length > 0 && (
                <div className="benefits-section">
                  <h3>{language === 'zh-TW' ? '福利項目：' : 'Benefits:'}</h3>
                  {card.benefits.map((benefit: any) => (
                    <div key={benefit.id} className="benefit-item">
                      <div className="benefit-info">
                        <div className="benefit-title">
                          {language === 'zh-TW' ? benefit.title : (benefit.titleEn || benefit.title)}
                        </div>
                        <div className="benefit-description">
                          {language === 'zh-TW' ? benefit.description : (benefit.descriptionEn || benefit.description)}
                        </div>
                        {benefit.amount && (
                          <div className="benefit-amount">
                            💰 {benefit.currency} {benefit.amount}
                          </div>
                        )}
                        <div className="benefit-frequency">
                          📅 {language === 'zh-TW' ? '頻率' : 'Frequency'}: {benefit.frequency}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="login-prompt">
                <button
                  onClick={() => trackCard(card.id)}
                  disabled={trackingCard === card.id}
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    opacity: trackingCard === card.id ? 0.5 : 1,
                    cursor: trackingCard === card.id ? 'not-allowed' : 'pointer',
                  }}
                >
                  {trackingCard === card.id
                    ? (language === 'zh-TW' ? '追蹤中...' : 'Tracking...')
                    : isLoggedIn
                    ? (language === 'zh-TW' ? '追蹤此卡' : 'Track This Card')
                    : (language === 'zh-TW' ? '登入以追蹤此卡' : 'Login to Track This Card')}
                </button>
              </div>
            </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
