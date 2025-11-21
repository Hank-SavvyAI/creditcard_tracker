'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { useLanguageStore } from '@/store/language'
import { useDataManager } from '@/hooks/useDataManager'
import GuestModeBanner from '@/components/GuestModeBanner'

export default function CardsPage() {
  const { language } = useLanguageStore()
  const [cards, setCards] = useState<any[]>([])
  const [userCards, setUserCards] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [selectedRegion, setSelectedRegion] = useState<string>('')
  const [trackingCard, setTrackingCard] = useState<number | null>(null)
  const [searchKeyword, setSearchKeyword] = useState<string>('')
  const [selectedBank, setSelectedBank] = useState<string>('')
  const [selectedType, setSelectedType] = useState<string>('')
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set())
  const [showDateModal, setShowDateModal] = useState(false)
  const [pendingCard, setPendingCard] = useState<any>(null)
  const [benefitStartDates, setBenefitStartDates] = useState<Record<number, string>>({})

  // 使用 DataManager（支援訪客模式和登入模式）
  const dataManager = useDataManager(isLoggedIn)

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
  }, [])

  useEffect(() => {
    if (dataManager) {
      loadCards()
    }
  }, [dataManager])

  async function loadCards() {
    if (!dataManager) return

    try {
      // 即使未登入也可以瀏覽信用卡列表（從公開 API 取得）
      const data = await api.getCards()
      setCards(data)

      // 載入用戶的追蹤卡片（不論登入與否，都使用 DataManager）
      try {
        const myCards = await dataManager.getMyCards()
        setUserCards(myCards)
      } catch (err) {
        console.error('Failed to load user cards:', err)
      }
    } catch (err) {
      setError(language === 'zh-TW' ? '無法載入信用卡資料' : 'Failed to load credit cards')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // 計算每張卡被追蹤的數量
  const getTrackingCount = (cardId: number) => {
    return userCards.filter(uc => uc.card.id === cardId).length
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

  async function removeOneCard(cardId: number) {
    if (!dataManager) return

    const trackedCards = userCards.filter(uc => uc.card.id === cardId)
    if (trackedCards.length === 0) {
      return
    }

    // Remove the latest (most recent) tracked instance
    const cardToRemove = trackedCards[trackedCards.length - 1]

    try {
      setTrackingCard(cardId)
      await dataManager.removeCard(cardToRemove.id)
      // Reload cards to update the count
      await loadCards()
    } catch (error) {
      console.error('Failed to remove card:', error)
      alert(language === 'zh-TW' ? '移除失敗' : 'Failed to remove card')
    } finally {
      setTrackingCard(null)
    }
  }

  async function trackCard(cardId: number) {
    // 訪客模式也可以追蹤卡片（儲存在 localStorage）
    // 但同一種卡片只能追蹤一張，如果已經追蹤過則提示登入

    // 檢查是否已經追蹤過這張卡片
    const alreadyTracked = getTrackingCount(cardId) > 0

    // 未登入且已經追蹤過：提示登入以追蹤多張
    if (!isLoggedIn && alreadyTracked) {
      alert(language === 'zh-TW'
        ? '此卡片已在追蹤中！\n\n登入後可以追蹤多張相同卡片。'
        : 'This card is already being tracked!\n\nLogin to track multiple instances of the same card.')
      return
    }

    // Find the card to check for personal cycle benefits
    const card = cards.find(c => c.id === cardId)
    const personalCycleBenefits = card?.benefits?.filter((b: any) => b.isPersonalCycle) || []

    // If there are personal cycle benefits, show modal to collect dates
    if (personalCycleBenefits.length > 0) {
      setPendingCard(card)
      // Initialize dates for each personal cycle benefit
      const initialDates: Record<number, string> = {}
      personalCycleBenefits.forEach((b: any) => {
        initialDates[b.id] = ''
      })
      setBenefitStartDates(initialDates)
      setShowDateModal(true)
      return
    }

    // Otherwise, track directly without dates
    await performTrackCard(cardId, {})
  }

  async function performTrackCard(cardId: number, startDates: Record<number, string>) {
    if (!dataManager) return

    setTrackingCard(cardId)
    try {
      await dataManager.addCard(cardId, undefined, startDates)
      alert(language === 'zh-TW' ? '已成功追蹤此信用卡！' : 'Card tracked successfully!')
      setShowDateModal(false)
      setPendingCard(null)
      setBenefitStartDates({})
      // Reload cards to update the count
      await loadCards()
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

  function handleDateModalSubmit() {
    // Validate that all dates are filled
    const allDatesValid = Object.values(benefitStartDates).every(date => date !== '')
    if (!allDatesValid) {
      alert(language === 'zh-TW' ? '請填寫所有福利的起始日期' : 'Please fill in all benefit start dates')
      return
    }

    performTrackCard(pendingCard.id, benefitStartDates)
  }

  function handleDateModalCancel() {
    setShowDateModal(false)
    setPendingCard(null)
    setBenefitStartDates({})
  }

  // 獲取所有銀行列表（從當前地區的卡片中）
  const banksInRegion = selectedRegion
    ? Array.from(
        new Map(
          cards
            .filter(card => card.region === selectedRegion)
            .map(card => [card.bank, { zh: card.bank, en: card.bankEn || card.bank }])
        ).values()
      )
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
      {/* 訪客模式提示橫幅 */}
      <GuestModeBanner />

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
          }} className="filter-section">
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '1rem'
            }} className="filter-grid">
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
                  {
                  [...banksInRegion]
                    .sort((a, b) => {
                      const nameA = language === 'zh-TW' ? a.zh : a.en
                      const nameB = language === 'zh-TW' ? b.zh : b.en
                      return nameA.localeCompare(nameB)
                    })
                    .map((bank) => (
                      <option key={bank.zh} value={bank.zh}>
                        {language === 'zh-TW' ? bank.zh : bank.en}
                      </option>
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
                {selectedBank && (() => {
                  const bank = banksInRegion.find(b => b.zh === selectedBank)
                  const bankName = bank ? (language === 'zh-TW' ? bank.zh : bank.en) : selectedBank
                  return ` ${language === 'zh-TW' ? '來自' : 'from'} ${bankName}`
                })()}
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

                    {/* 追蹤按鈕 - 不論是否登入都顯示 +/- 控制器 */}
                    <div style={{ width: '100%', marginBottom: '0.75rem' }}>
                      {/* 追蹤標籤 */}
                      <div style={{
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#64748b',
                        marginBottom: '0.5rem',
                        textAlign: 'center'
                      }} suppressHydrationWarning>
                        📌 {isLoggedIn
                          ? (language === 'zh-TW' ? '追蹤此卡' : 'Track This Card')
                          : (language === 'zh-TW' ? '追蹤此卡 (存在瀏覽器)' : 'Track (Browser Only)')
                        }
                      </div>

                      {/* 追蹤控制器 */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        border: '2px solid #e5e7eb',
                        borderRadius: '8px',
                        overflow: 'hidden'
                      }}>
                        {/* 減號按鈕 */}
                        <button
                          onClick={() => removeOneCard(card.id)}
                          disabled={trackingCard === card.id || getTrackingCount(card.id) === 0}
                          style={{
                            flex: '0 0 40px',
                            height: '40px',
                            background: '#789baa',
                            color: 'white',
                            border: 'none',
                            fontSize: '1.25rem',
                            fontWeight: 'bold',
                            cursor: getTrackingCount(card.id) === 0 ? 'not-allowed' : 'pointer',
                            opacity: getTrackingCount(card.id) === 0 ? 0.4 : 1,
                            transition: 'all 0.2s'
                          }}
                        >
                          −
                        </button>

                        {/* 數字顯示 */}
                        <div style={{
                          flex: 1,
                          height: '40px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: '#f0f4f7',
                          fontSize: trackingCard === card.id ? '0.8rem' : '1.1rem',
                          fontWeight: '600',
                          color: '#4a5c66'
                        }}>
                          {trackingCard === card.id
                            ? (language === 'zh-TW' ? '處理中...' : 'Processing...')
                            : getTrackingCount(card.id)}
                        </div>

                        {/* 加號按鈕 */}
                        <button
                          onClick={() => trackCard(card.id)}
                          disabled={
                            trackingCard === card.id ||
                            (!isLoggedIn && getTrackingCount(card.id) > 0)
                          }
                          style={{
                            flex: '0 0 40px',
                            height: '40px',
                            background: '#789baa',
                            color: 'white',
                            border: 'none',
                            fontSize: '1.25rem',
                            fontWeight: 'bold',
                            cursor: (trackingCard === card.id || (!isLoggedIn && getTrackingCount(card.id) > 0)) ? 'not-allowed' : 'pointer',
                            opacity: (trackingCard === card.id || (!isLoggedIn && getTrackingCount(card.id) > 0)) ? 0.4 : 1,
                            transition: 'all 0.2s'
                          }}
                        >
                          +
                        </button>
                      </div>
                    </div>

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

      {/* Modal for Personal Cycle Benefits Start Dates */}
      {showDateModal && pendingCard && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'var(--card-bg)',
            borderRadius: '12px',
            padding: '2rem',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
          }} className="benefit-start-date-modal">
            <h2 style={{ marginBottom: '1rem', color: 'var(--primary-color)' }}>
              {language === 'zh-TW' ? '設定福利起始日期' : 'Set Benefit Start Dates'}
            </h2>

            <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              {language === 'zh-TW'
                ? '此卡片包含需要個人化起始日期的福利（例如：開卡日期）。請為以下福利設定起始日期：'
                : 'This card has benefits that require personalized start dates (e.g., card activation date). Please set start dates for the following benefits:'}
            </p>

            {pendingCard.benefits
              ?.filter((b: any) => b.isPersonalCycle)
              .map((benefit: any) => (
                <div key={benefit.id} style={{
                  marginBottom: '1.5rem',
                  padding: '1rem',
                  backgroundColor: 'var(--background)',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)'
                }}>
                  <div style={{ marginBottom: '0.75rem' }}>
                    <div style={{ fontWeight: '600', color: 'var(--text-color)', marginBottom: '0.25rem' }}>
                      {language === 'zh-TW' ? benefit.title : (benefit.titleEn || benefit.title)}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {language === 'zh-TW' ? benefit.description : (benefit.descriptionEn || benefit.description)}
                    </div>
                  </div>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    color: 'var(--text-color)'
                  }}>
                    {language === 'zh-TW' ? '起始日期：' : 'Start Date:'}
                  </label>
                  <input
                    type="date"
                    value={benefitStartDates[benefit.id] || ''}
                    onChange={(e) => setBenefitStartDates(prev => ({
                      ...prev,
                      [benefit.id]: e.target.value
                    }))}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      fontSize: '1rem',
                      backgroundColor: 'var(--card-bg)'
                    }}
                  />
                </div>
              ))}

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button
                onClick={handleDateModalCancel}
                className="btn btn-secondary"
                style={{ flex: 1 }}
              >
                {language === 'zh-TW' ? '取消' : 'Cancel'}
              </button>
              <button
                onClick={handleDateModalSubmit}
                className="btn btn-primary"
                style={{ flex: 1 }}
                disabled={trackingCard !== null}
              >
                {trackingCard !== null
                  ? (language === 'zh-TW' ? '追蹤中...' : 'Tracking...')
                  : (language === 'zh-TW' ? '確認追蹤' : 'Confirm Track')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
