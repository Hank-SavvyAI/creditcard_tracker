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
  const [searchKeyword, setSearchKeyword] = useState<string>('')
  const [selectedBank, setSelectedBank] = useState<string>('')
  const [selectedType, setSelectedType] = useState<string>('')
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set())

  const toggleCardExpand = (cardId: number) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev)
      if (newSet.has(cardId)) {
        newSet.delete(cardId)
      } else {
        newSet.add(cardId)
      }
      return newSet
    })
  }

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

  // 獲取所有銀行列表（從當前地區的卡片中）
  const banksInRegion = selectedRegion
    ? Array.from(new Set(cards.filter(card => card.region === selectedRegion).map(card => card.bank)))
    : []

  // 過濾邏輯：地區 + 關鍵字 + 銀行 + 類型
  const filteredCards = selectedRegion
    ? cards.filter(card => {
        // 先過濾地區
        if (card.region !== selectedRegion) return false

        // 過濾銀行
        if (selectedBank && card.bank !== selectedBank) return false

        // 過濾卡片類型
        if (selectedType && card.type !== selectedType) return false

        // 過濾關鍵字（搜尋卡片名稱、銀行名稱、描述）
        if (searchKeyword) {
          const keyword = searchKeyword.toLowerCase()
          const matchName = (language === 'zh-TW' ? card.name : card.nameEn || card.name).toLowerCase().includes(keyword)
          const matchBank = (language === 'zh-TW' ? card.bank : card.bankEn || card.bank).toLowerCase().includes(keyword)
          const matchDesc = card.description ? (language === 'zh-TW' ? card.description : card.descriptionEn || card.description).toLowerCase().includes(keyword) : false

          return matchName || matchBank || matchDesc
        }

        return true
      })
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
              onClick={() => {
                setSelectedRegion('')
                setSearchKeyword('')
                setSelectedBank('')
                setSelectedType('')
              }}
              className="btn btn-secondary"
            >
              ← {language === 'zh-TW' ? '返回地區選擇' : 'Back to Regions'}
            </button>
            <h2 style={{ margin: 0, color: 'var(--primary-color)' }}>
              {getRegionName(selectedRegion)} ({filteredCards.length})
            </h2>
          </div>

          {/* 搜尋和篩選區 */}
          <div style={{
            marginBottom: '2rem',
            padding: '1.5rem',
            backgroundColor: 'var(--card-bg)',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '1rem'
            }}>
              {/* 關鍵字搜尋 */}
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: '600',
                  color: 'var(--text-color)'
                }}>
                  🔍 {language === 'zh-TW' ? '關鍵字搜尋' : 'Search'}
                </label>
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder={language === 'zh-TW' ? '搜尋卡片名稱、銀行或描述...' : 'Search card name, bank or description...'}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    fontSize: '1rem'
                  }}
                />
              </div>

              {/* 銀行篩選 */}
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: '600',
                  color: 'var(--text-color)'
                }}>
                  🏦 {language === 'zh-TW' ? '選擇銀行' : 'Select Bank'}
                </label>
                <select
                  value={selectedBank}
                  onChange={(e) => setSelectedBank(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    fontSize: '1rem',
                    backgroundColor: 'var(--card-bg)',
                    cursor: 'pointer'
                  }}
                >
                  <option value="">{language === 'zh-TW' ? '全部銀行' : 'All Banks'}</option>
                  {banksInRegion.sort().map(bank => (
                    <option key={bank} value={bank}>{bank}</option>
                  ))}
                </select>
              </div>

              {/* 卡片類型篩選 */}
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: '600',
                  color: 'var(--text-color)'
                }}>
                  💳 {language === 'zh-TW' ? '卡片類型' : 'Card Type'}
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    fontSize: '1rem',
                    backgroundColor: 'var(--card-bg)',
                    cursor: 'pointer'
                  }}
                >
                  <option value="">{language === 'zh-TW' ? '全部類型' : 'All Types'}</option>
                  <option value="personal">{language === 'zh-TW' ? '💳 個人卡' : '💳 Personal Card'}</option>
                  <option value="business">{language === 'zh-TW' ? '🏢 商業卡' : '🏢 Business Card'}</option>
                </select>
              </div>

              {/* 清除篩選按鈕 */}
              {(searchKeyword || selectedBank || selectedType) && (
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button
                    onClick={() => {
                      setSearchKeyword('')
                      setSelectedBank('')
                      setSelectedType('')
                    }}
                    className="btn btn-secondary"
                    style={{ width: '100%' }}
                  >
                    🗑️ {language === 'zh-TW' ? '清除篩選' : 'Clear Filters'}
                  </button>
                </div>
              )}
            </div>

            {/* 篩選結果提示 */}
            {(searchKeyword || selectedBank || selectedType) && (
              <div style={{ marginTop: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                {language === 'zh-TW' ? '找到' : 'Found'} <strong>{filteredCards.length}</strong> {language === 'zh-TW' ? '張信用卡' : 'card(s)'}
                {searchKeyword && ` ${language === 'zh-TW' ? '包含' : 'containing'} "${searchKeyword}"`}
                {selectedBank && ` ${language === 'zh-TW' ? '來自' : 'from'} ${selectedBank}`}
                {selectedType && ` ${language === 'zh-TW' ? '類型' : 'type'}: ${selectedType === 'personal' ? (language === 'zh-TW' ? '個人卡' : 'Personal') : (language === 'zh-TW' ? '商業卡' : 'Business')}`}
              </div>
            )}
          </div>

          {filteredCards.length === 0 ? (
            <p>{language === 'zh-TW' ? '此地區目前尚無信用卡資料' : 'No credit cards available in this region'}</p>
          ) : (
            <div className="card-grid">
              {filteredCards.map((card) => {
                const isExpanded = expandedCards.has(card.id)
                return (
                  <div key={card.id} className="card">
                    {/* 卡片圖片 */}
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

                    {/* 卡片名稱 */}
                    <h2 className="card-title">
                      {language === 'zh-TW' ? card.name : (card.nameEn || card.name)}
                    </h2>

                    {/* 銀行名稱 */}
                    <p className="card-bank">
                      🏦 {language === 'zh-TW' ? card.bank : (card.bankEn || card.bank)}
                    </p>

                    {/* 福利數量提示 */}
                    {card.benefits && card.benefits.length > 0 && (
                      <p style={{
                        color: 'var(--primary-color)',
                        fontSize: '0.9rem',
                        marginBottom: '1rem',
                        fontWeight: '500'
                      }}>
                        💎 {card.benefits.length} {language === 'zh-TW' ? '項福利' : 'Benefits'}
                      </p>
                    )}

                    {/* 追蹤按鈕 */}
                    <button
                      onClick={() => trackCard(card.id)}
                      disabled={trackingCard === card.id}
                      className="btn btn-primary"
                      style={{
                        width: '100%',
                        marginBottom: '0.75rem',
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

                    {/* 查看詳情按鈕 */}
                    <button
                      onClick={() => toggleCardExpand(card.id)}
                      className="btn btn-secondary"
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      {isExpanded
                        ? (language === 'zh-TW' ? '收起詳情' : 'Hide Details')
                        : (language === 'zh-TW' ? '查看詳情' : 'View Details')}
                      <span style={{
                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.3s ease'
                      }}>
                        ▼
                      </span>
                    </button>

                    {/* 展開的詳細資訊 */}
                    {isExpanded && (
                      <div style={{
                        marginTop: '1rem',
                        paddingTop: '1rem',
                        borderTop: '1px solid var(--border-color)',
                        animation: 'fadeIn 0.3s ease'
                      }}>
                        {/* 卡片描述 */}
                        {card.description && (
                          <div style={{ marginBottom: '1.5rem' }}>
                            <h3 style={{
                              fontSize: '1rem',
                              marginBottom: '0.5rem',
                              color: 'var(--text-color)'
                            }}>
                              📝 {language === 'zh-TW' ? '卡片說明' : 'Description'}
                            </h3>
                            <p className="card-description">
                              {language === 'zh-TW' ? card.description : (card.descriptionEn || card.description)}
                            </p>
                          </div>
                        )}

                        {/* 福利列表 */}
                        {card.benefits && card.benefits.length > 0 && (
                          <div className="benefits-section">
                            <h3 style={{
                              fontSize: '1rem',
                              marginBottom: '1rem',
                              color: 'var(--text-color)'
                            }}>
                              🎁 {language === 'zh-TW' ? '福利項目' : 'Benefits'}
                            </h3>
                            {card.benefits.map((benefit: any) => (
                              <div
                                key={benefit.id}
                                className="benefit-item"
                                style={{
                                  marginBottom: '1rem',
                                  padding: '1rem',
                                  backgroundColor: 'var(--background)',
                                  borderRadius: '8px',
                                  border: '1px solid var(--border-color)'
                                }}
                              >
                                <div className="benefit-info">
                                  <div className="benefit-title" style={{
                                    fontWeight: '600',
                                    marginBottom: '0.5rem',
                                    color: 'var(--primary-color)'
                                  }}>
                                    {language === 'zh-TW' ? benefit.title : (benefit.titleEn || benefit.title)}
                                  </div>
                                  <div className="benefit-description" style={{
                                    fontSize: '0.9rem',
                                    color: 'var(--text-secondary)',
                                    marginBottom: '0.5rem'
                                  }}>
                                    {language === 'zh-TW' ? benefit.description : (benefit.descriptionEn || benefit.description)}
                                  </div>
                                  {benefit.amount && (
                                    <div className="benefit-amount" style={{
                                      fontWeight: '600',
                                      color: '#10b981',
                                      marginBottom: '0.25rem'
                                    }}>
                                      💰 {benefit.currency} {benefit.amount}
                                    </div>
                                  )}
                                  <div className="benefit-frequency" style={{
                                    fontSize: '0.85rem',
                                    color: 'var(--text-secondary)'
                                  }}>
                                    📅 {language === 'zh-TW' ? '頻率' : 'Frequency'}: {benefit.frequency}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
