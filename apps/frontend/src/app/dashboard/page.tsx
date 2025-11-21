'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLanguageStore } from '@/store/language'
import { useDataManager } from '@/hooks/useDataManager'
import BenefitItem from '@/components/BenefitItem'
import SpreadsheetView from '@/components/SpreadsheetView'
import NotificationSettings from '@/components/NotificationSettings'
import GuestModeBanner from '@/components/GuestModeBanner'

export default function Dashboard() {
  const { language } = useLanguageStore()
  const router = useRouter()
  const [userCards, setUserCards] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [viewMode, setViewMode] = useState<'card' | 'spreadsheet'>('card')
  const [isInitialized, setIsInitialized] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [selectedCard, setSelectedCard] = useState<any>(null)
  const [nickname, setNickname] = useState('')
  const [afChargeMonth, setAfChargeMonth] = useState<number | ''>('')
  const [afChargeDay, setAfChargeDay] = useState<number | ''>('')
  const [openedAt, setOpenedAt] = useState('')
  const [showCustomBenefitModal, setShowCustomBenefitModal] = useState(false)
  const [customBenefitCard, setCustomBenefitCard] = useState<any>(null)
  const [customAmount, setCustomAmount] = useState<number | ''>('')
  const [customCurrency, setCustomCurrency] = useState('USD')
  const [customPeriodEnd, setCustomPeriodEnd] = useState('')
  const [customDescription, setCustomDescription] = useState('')
  const [showHiddenBenefits, setShowHiddenBenefits] = useState(false)
  const year = new Date().getFullYear()

  // 懶加載：追蹤哪些卡片已展開並載入福利
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set())
  const [loadingCards, setLoadingCards] = useState<Set<number>>(new Set())

  // 使用 DataManager（支援訪客模式和登入模式）
  const dataManager = useDataManager(isLoggedIn)

  useEffect(() => {
    // 檢查登入狀態
    const token = localStorage.getItem('token')
    const loggedIn = !!token
    setIsLoggedIn(loggedIn)

    // Check if user is admin (只有登入才有 admin 權限)
    if (loggedIn) {
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        const user = JSON.parse(storedUser)
        setIsAdmin(user.role === 'ADMIN')
      }
    }

    setIsInitialized(true)
  }, [])

  // 當 dataManager 初始化完成後載入資料
  useEffect(() => {
    if (dataManager && isInitialized) {
      loadData()
    }
  }, [dataManager, isInitialized])

  async function loadData(preserveExpanded = false) {
    if (!dataManager) return

    try {
      // 使用 DataManager 載入卡片列表
      const cards = await dataManager.getMyCards()

      if (preserveExpanded && expandedCards.size > 0) {
        // 保留已展開卡片的狀態，並重新載入它們的福利
        const cardsWithBenefits = await Promise.all(
          cards.map(async (card: any) => {
            if (expandedCards.has(card.id)) {
              // 重新載入已展開卡片的福利
              try {
                const { benefits } = await dataManager.getCardBenefits(card.id, year)
                return { ...card, benefits }
              } catch (error) {
                console.error('Failed to reload benefits for card:', card.id)
                return { ...card, benefits: [] }
              }
            } else {
              return { ...card, benefits: [] }
            }
          })
        )
        setUserCards(cardsWithBenefits)
      } else {
        // 初始化卡片，benefits 設為空陣列
        const cardsWithEmptyBenefits = cards.map((card: any) => ({
          ...card,
          benefits: []
        }))
        setUserCards(cardsWithEmptyBenefits)
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  // 切換卡片展開/收合，並懶加載福利
  async function toggleCardExpansion(userCardId: number) {
    if (!dataManager) return

    const isExpanded = expandedCards.has(userCardId)

    if (isExpanded) {
      // 收合卡片
      const newExpanded = new Set(expandedCards)
      newExpanded.delete(userCardId)
      setExpandedCards(newExpanded)
    } else {
      // 展開卡片
      const newExpanded = new Set(expandedCards)
      newExpanded.add(userCardId)
      setExpandedCards(newExpanded)

      // 檢查是否已經載入過福利
      const card = userCards.find(c => c.id === userCardId)
      if (!card || card.benefits.length > 0) {
        return // 已經載入過了
      }

      // 載入福利
      setLoadingCards(prev => new Set(prev).add(userCardId))
      try {
        const { benefits } = await dataManager.getCardBenefits(userCardId, year)

        // 更新這張卡片的福利
        setUserCards(prev => prev.map(c =>
          c.id === userCardId ? { ...c, benefits } : c
        ))
      } catch (error) {
        console.error('Failed to load benefits:', error)
      } finally {
        setLoadingCards(prev => {
          const newSet = new Set(prev)
          newSet.delete(userCardId)
          return newSet
        })
      }
    }
  }

  async function toggleBenefit(benefitId: number, isCompleted: boolean, userCardId: number) {
    if (!dataManager) return

    try {
      await dataManager.toggleBenefitComplete(benefitId, !isCompleted, year, userCardId)
      await loadData(true) // 保留展開狀態
    } catch (error) {
      console.error('Failed to toggle benefit:', error)
    }
  }

  async function updateNotificationSettings(benefitId: number, settings: { reminderDays?: number; notificationEnabled?: boolean }, userCardId: number) {
    if (!dataManager) return

    try {
      await dataManager.updateBenefitSettings(benefitId, year, userCardId, settings)
      await loadData(true) // 保留展開狀態
    } catch (error) {
      console.error('Failed to update notification settings:', error)
      alert(language === 'zh-TW' ? '更新失敗' : 'Update failed')
    }
  }

  async function toggleHideBenefit(benefitId: number, isHidden: boolean, userCardId: number) {
    if (!dataManager) return

    try {
      await dataManager.toggleBenefitHidden(benefitId, !isHidden, year, userCardId)
      await loadData(true)
    } catch (error) {
      console.error('Failed to toggle benefit visibility:', error)
      alert(language === 'zh-TW' ? '操作失敗' : 'Operation failed')
    }
  }

  async function removeCard(userCardId: number, cardName: string) {
    if (!dataManager) return

    const confirmMessage = language === 'zh-TW'
      ? `確定要移除「${cardName}」的追蹤嗎？`
      : `Are you sure you want to stop tracking "${cardName}"?`

    if (!confirm(confirmMessage)) {
      return
    }

    try {
      await dataManager.removeCard(userCardId)
      alert(language === 'zh-TW' ? '已移除追蹤' : 'Card removed successfully')
      await loadData(true)
    } catch (error) {
      console.error('Failed to remove card:', error)
      alert(language === 'zh-TW' ? '移除失敗' : 'Failed to remove card')
    }
  }

  function openCardSettings(userCard: any) {
    setSelectedCard(userCard)
    setNickname(userCard.nickname || '')
    setAfChargeMonth(userCard.afChargeMonth || '')
    setAfChargeDay(userCard.afChargeDay || '')
    setOpenedAt(userCard.openedAt ? new Date(userCard.openedAt).toISOString().split('T')[0] : '')
    setShowSettingsModal(true)
  }

  function closeCardSettings() {
    setShowSettingsModal(false)
    setSelectedCard(null)
    setNickname('')
    setAfChargeMonth('')
    setAfChargeDay('')
    setOpenedAt('')
  }

  async function saveCardSettings() {
    if (!selectedCard || !dataManager) return

    try {
      await dataManager.updateCardSettings(selectedCard.id, {
        nickname: nickname.trim() === '' ? undefined : nickname.trim(),
        afChargeMonth: afChargeMonth === '' ? null : afChargeMonth,
        afChargeDay: afChargeDay === '' ? null : afChargeDay,
        openedAt: openedAt === '' ? null : openedAt,
      })
      alert(language === 'zh-TW' ? '設定已儲存' : 'Settings saved successfully')
      closeCardSettings()
      await loadData(true)
    } catch (error) {
      console.error('Failed to save card settings:', error)
      alert(language === 'zh-TW' ? '儲存失敗' : 'Failed to save settings')
    }
  }

  function openCustomBenefitModal(userCard: any) {
    setCustomBenefitCard(userCard)
    setCustomAmount('')
    setCustomCurrency('USD')
    // Set default period end to 1 year from now
    const defaultDate = new Date()
    defaultDate.setFullYear(defaultDate.getFullYear() + 1)
    setCustomPeriodEnd(defaultDate.toISOString().split('T')[0])
    setShowCustomBenefitModal(true)
  }

  function closeCustomBenefitModal() {
    setShowCustomBenefitModal(false)
    setCustomBenefitCard(null)
    setCustomAmount('')
    setCustomCurrency('USD')
    setCustomPeriodEnd('')
    setCustomDescription('')
  }

  async function moveCard(userCardId: number, direction: 'up' | 'down') {
    if (!dataManager) return

    const currentIndex = userCards.findIndex(uc => uc.id === userCardId)
    if (currentIndex === -1) return

    // Can't move up if already at top
    if (direction === 'up' && currentIndex === 0) return
    // Can't move down if already at bottom
    if (direction === 'down' && currentIndex === userCards.length - 1) return

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1

    // Optimistic update: 立即更新 UI，不等待 API 回應
    const newUserCards = [...userCards]
    const [movedCard] = newUserCards.splice(currentIndex, 1)
    newUserCards.splice(newIndex, 0, movedCard)

    // 更新 displayOrder 以匹配新的位置
    newUserCards.forEach((card, index) => {
      card.displayOrder = index
    })

    setUserCards(newUserCards)

    // Swap display orders in backend
    const updates = [
      { id: userCards[currentIndex].id, displayOrder: newIndex },
      { id: userCards[newIndex].id, displayOrder: currentIndex },
    ]

    try {
      // 背景更新，不阻塞 UI
      await dataManager.updateCardsOrder(updates)
    } catch (error) {
      console.error('Failed to update card order:', error)
      alert(language === 'zh-TW' ? '排序更新失敗' : 'Failed to update card order')
      // 如果失敗，重新載入正確的順序
      await loadData(true)
    }
  }

  async function saveCustomBenefit() {
    if (!customBenefitCard || customAmount === '' || !customPeriodEnd || !dataManager) {
      alert(language === 'zh-TW' ? '請填寫所有必填欄位' : 'Please fill in all required fields')
      return
    }

    try {
      await dataManager.createCustomBenefit({
        userCardId: customBenefitCard.id,
        customTitle: '開卡禮/續卡禮',
        customTitleEn: 'Open/Retention Offer',
        customAmount: typeof customAmount === 'number' ? customAmount : 0,
        customCurrency,
        periodEnd: customPeriodEnd,
        customDescription: customDescription.trim() || undefined,
      })
      alert(language === 'zh-TW' ? '自定義福利已新增' : 'Custom benefit added successfully')
      closeCustomBenefitModal()
      await loadData(true)
    } catch (error) {
      console.error('Failed to save custom benefit:', error)
      alert(language === 'zh-TW' ? '新增失敗' : 'Failed to add custom benefit')
    }
  }

  function handleLogout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    // Trigger auth change event for Header to update
    window.dispatchEvent(new Event('auth-change'))
    // Small delay to allow event to propagate
    setTimeout(() => {
      router.push('/')
    }, 100)
  }

  if (!isInitialized || loading) {
    return <div className="loading" suppressHydrationWarning>{language === 'zh-TW' ? '載入中...' : 'Loading...'}</div>
  }

  return (
    <div className="dashboard">
      {/* 訪客模式提示橫幅 */}
      <GuestModeBanner />

      <div className="dashboard-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <h1 style={{ margin: 0 }} suppressHydrationWarning>
            {language === 'zh-TW' ? `我的信用卡福利 (${year})` : `My Credit Card Benefits (${year})`}
          </h1>
          <div style={{
            padding: '0.5rem 1rem',
            background: 'linear-gradient(135deg, #9b8ba4 0%, #7a6b84 100%)',
            color: 'white',
            borderRadius: '20px',
            fontSize: '0.9rem',
            fontWeight: '600',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }} suppressHydrationWarning>
            💳 {userCards.length} {language === 'zh-TW' ? '張卡片' : 'Cards'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }} className="dashboard-actions">
          <div style={{ display: 'flex', gap: '0.5rem', marginRight: 'auto' }}>
            <button
              onClick={() => setViewMode('card')}
              className="btn btn-secondary"
              style={{
                background: viewMode === 'card' ? '#3b82f6' : '#e5e7eb',
                color: viewMode === 'card' ? 'white' : '#374151',
              }}
            >
              🎴 {language === 'zh-TW' ? '卡片視圖' : 'Card View'}
            </button>
            <button
              onClick={() => setViewMode('spreadsheet')}
              className="btn btn-secondary"
              style={{
                background: viewMode === 'spreadsheet' ? '#3b82f6' : '#e5e7eb',
                color: viewMode === 'spreadsheet' ? 'white' : '#374151',
              }}
            >
              📊 {language === 'zh-TW' ? '表格視圖' : 'Spreadsheet View'}
            </button>
            <button
              onClick={() => setShowHiddenBenefits(!showHiddenBenefits)}
              className="btn btn-secondary"
              style={{
                background: showHiddenBenefits ? '#3b82f6' : '#e5e7eb',
                color: showHiddenBenefits ? 'white' : '#374151',
                whiteSpace: 'nowrap',
              }}
            >
              {showHiddenBenefits
                ? (language === 'zh-TW' ? <span style={{ fontSize: '0.85em' }}>👁️ 顯示已隱藏福利</span> : '👁️ Show Hidden')
                : (language === 'zh-TW' ? <span style={{ fontSize: '0.85em' }}>🙈 已過濾隱藏福利</span> : '🙈 Filtered')}
            </button>
          </div>
          {isAdmin && (
            <Link href="/admin" className="btn btn-secondary">
              🔧 {language === 'zh-TW' ? '管理員後台' : 'Admin Panel'}
            </Link>
          )}
          <button onClick={handleLogout} className="btn btn-secondary">
            {language === 'zh-TW' ? '登出' : 'Logout'}
          </button>
        </div>
      </div>

      <NotificationSettings language={language as 'zh-TW' | 'en'} />

      {viewMode === 'spreadsheet' ? (
        <SpreadsheetView showHiddenBenefits={showHiddenBenefits} />
      ) : userCards.length === 0 ? (
        <p>
          {language === 'zh-TW'
            ? '您還沒有新增任何信用卡，您還沒有新增任何信用卡，請先瀏覽並新增信用卡'
            : 'You haven\'t added any credit cards yet. Please add cards via Add Card button above.'}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {userCards.map((userCard, index) => {
            // Check if user has multiple instances of this card
            const sameCards = userCards.filter(uc => uc.card.id === userCard.card.id)
            const showCardInstance = sameCards.length > 1

            // Alternate background colors with stronger contrast
            const backgroundColor = index % 2 === 0 ? '#ffffff' : '#f0f4f8'
            const borderColor = index % 2 === 0 ? '#3b82f6' : '#2563eb'  // 深藍色
            const borderWidth = '3px'

            return (<div key={userCard.id} className="card dashboard-card" style={{
              display: 'flex',
              gap: '1.5rem',
              alignItems: 'flex-start',
              backgroundColor,
              border: `${borderWidth} solid ${borderColor}`,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
              position: 'relative'
            }}>
              {/* 卡片編號徽章 */}
              <span style={{
                position: 'absolute',
                top: '-12px',
                left: '-12px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                fontSize: '0.85rem',
                fontWeight: 'bold',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 8px rgba(102, 126, 234, 0.4)',
                zIndex: 10,
                border: '3px solid white'
              }}>
                {index + 1}
              </span>
              {/* 左側：卡片圖片 + 展開按鈕 */}
              {userCard.card.photo && (
                <div style={{ flexShrink: 0, width: '200px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }} className="card-image-container">
                  <img
                    src={userCard.card.photo}
                    alt={language === 'zh-TW' ? userCard.card.name : (userCard.card.nameEn || userCard.card.name)}
                    style={{
                      width: '100%',
                      height: 'auto',
                      borderRadius: '8px',
                      aspectRatio: '1.586',
                      objectFit: 'cover'
                    }}
                    onError={(e) => {
                      console.error('卡片圖片載入失敗:', userCard.card.photo);
                      e.currentTarget.style.display = 'none';
                    }}
                    onLoad={() => {
                      console.log('卡片圖片載入成功:', userCard.card.photo);
                    }}
                  />
                  {/* 展開/收合按鈕 */}
                  <button
                        onClick={() => toggleCardExpansion(userCard.id)}
                        style={{
                          padding: '0.3rem 0.5rem',
                          fontSize: '0.65rem',
                          background: expandedCards.has(userCard.id)
                            ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                            : 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                          color: expandedCards.has(userCard.id) ? 'white' : '#3b82f6',
                          border: expandedCards.has(userCard.id) ? 'none' : '1px solid #93c5fd',
                          borderRadius: '5px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          lineHeight: 1.3,
                          boxShadow: expandedCards.has(userCard.id)
                            ? '0 2px 6px rgba(102, 126, 234, 0.3)'
                            : '0 1px 3px rgba(59, 130, 246, 0.15)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          fontWeight: '500',
                        }}
                        onMouseEnter={(e) => {
                          if (expandedCards.has(userCard.id)) {
                            e.currentTarget.style.background = 'linear-gradient(135deg, #5568d3 0%, #653a8b 100%)'
                            e.currentTarget.style.boxShadow = '0 4px 8px rgba(102, 126, 234, 0.4)'
                          } else {
                            e.currentTarget.style.background = 'linear-gradient(135deg, #bfdbfe 0%, #93c5fd 100%)'
                            e.currentTarget.style.color = '#2563eb'
                            e.currentTarget.style.borderColor = '#60a5fa'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (expandedCards.has(userCard.id)) {
                            e.currentTarget.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                            e.currentTarget.style.boxShadow = '0 2px 6px rgba(102, 126, 234, 0.3)'
                          } else {
                            e.currentTarget.style.background = 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)'
                            e.currentTarget.style.color = '#3b82f6'
                            e.currentTarget.style.borderColor = '#93c5fd'
                          }
                        }}
                        title={expandedCards.has(userCard.id) ? (language === 'zh-TW' ? '收合福利' : 'Collapse') : (language === 'zh-TW' ? '展開福利' : 'Expand')}
                      >
                        <span>{expandedCards.has(userCard.id) ? '▼' : '▶'}</span>
                        <span style={{ fontSize: '0.65rem' }}>
                          {expandedCards.has(userCard.id)
                            ? (language === 'zh-TW' ? '收合' : 'Hide')
                            : (language === 'zh-TW' ? '展開福利' : 'Show')
                          }
                        </span>
                      </button>
                </div>
              )}

              {/* 右側：卡片資訊和福利 */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.5rem' }}>
                  <div style={{ flex: 1 }}>
                    <h2 className="card-title" style={{ margin: 0, marginBottom: '0.25rem', fontSize: '1.5rem' }}>
                      {language === 'zh-TW' ? userCard.card.name : (userCard.card.nameEn || userCard.card.name)}
                      {userCard.nickname ? (
                        <span style={{ fontSize: '1rem', color: '#3b82f6', marginLeft: '0.5rem', fontWeight: '500' }}>
                          🏷️ {userCard.nickname}
                        </span>
                      ) : showCardInstance && (
                        <span style={{ fontSize: '1rem', color: '#6b7280', marginLeft: '0.5rem' }}>
                          ({language === 'zh-TW' ? '卡片' : 'Card'} {userCard.cardInstance})
                        </span>
                      )}
                    </h2>
                    <p className="card-bank" style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>
                      🏦 {language === 'zh-TW' ? userCard.card.bank : (userCard.card.bankEn || userCard.card.bank)}
                    </p>
                    {userCard.card.fee && (
                      <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#666' }}>
                        💰 {language === 'zh-TW' ? '年費' : 'Annual Fee'}: {userCard.card.fee}
                      </p>
                    )}
                    {(userCard.afChargeMonth && userCard.afChargeDay) && (
                      <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#666' }}>
                        📅 {language === 'zh-TW' ? '年費收取日' : 'AF Charge Date'}: {userCard.afChargeMonth}/{userCard.afChargeDay}
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {/* Up/Down arrows for sorting */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <button
                        onClick={() => moveCard(userCard.id, 'up')}
                        disabled={index === 0}
                        style={{
                          padding: '0.3rem 0.6rem',
                          fontSize: '0.7rem',
                          background: index === 0 ? '#d1d5db' : '#9ca3af',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: index === 0 ? 'not-allowed' : 'pointer',
                          opacity: index === 0 ? 0.5 : 1,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          whiteSpace: 'nowrap',
                        }}
                        title={language === 'zh-TW' ? '往上移' : 'Move up'}
                      >
                        <span>▲</span>
                        <span style={{ fontSize: '0.65rem' }}>
                          {language === 'zh-TW' ? '上移' : 'Up'}
                        </span>
                      </button>
                      <button
                        onClick={() => moveCard(userCard.id, 'down')}
                        disabled={index === userCards.length - 1}
                        style={{
                          padding: '0.3rem 0.6rem',
                          fontSize: '0.7rem',
                          background: index === userCards.length - 1 ? '#d1d5db' : '#9ca3af',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: index === userCards.length - 1 ? 'not-allowed' : 'pointer',
                          opacity: index === userCards.length - 1 ? 0.5 : 1,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          whiteSpace: 'nowrap',
                        }}
                        title={language === 'zh-TW' ? '往下移' : 'Move down'}
                      >
                        <span>▼</span>
                        <span style={{ fontSize: '0.65rem' }}>
                          {language === 'zh-TW' ? '下移' : 'Down'}
                        </span>
                      </button>
                    </div>
                    <button
                      onClick={() => openCardSettings(userCard)}
                      className="btn btn-secondary"
                      style={{
                        padding: '0.5rem 1rem',
                        fontSize: '0.85rem',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'linear-gradient(135deg, #5568d3 0%, #653a8b 100%)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                      }}
                    >
                      📅 {language === 'zh-TW' ? '年費與卡片暱稱設定' : 'Card Settings'}
                    </button>
                    <button
                      onClick={() => openCustomBenefitModal(userCard)}
                      className="btn btn-secondary"
                      style={{
                        padding: '0.5rem 1rem',
                        fontSize: '0.85rem',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'linear-gradient(135deg, #5568d3 0%, #653a8b 100%)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                      }}
                    >
                      🎁 {language === 'zh-TW' ? '新增開/續卡禮' : 'Add Open/Retention Offer'}
                    </button>
                    <button
                      onClick={() => removeCard(userCard.id, language === 'zh-TW' ? userCard.card.name : (userCard.card.nameEn || userCard.card.name))}
                      className="btn btn-danger"
                      style={{
                        padding: '0.5rem 1rem',
                        fontSize: '0.85rem',
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#dc2626'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#ef4444'
                      }}
                    >
                      {language === 'zh-TW' ? '移除追蹤' : 'Remove'}
                    </button>
                  </div>
                </div>

                {/* 福利列表 - 只在展開時顯示 */}
                {expandedCards.has(userCard.id) && (
                  <div style={{ marginTop: '1rem' }}>
                    {loadingCards.has(userCard.id) ? (
                      <div style={{
                        padding: '2rem',
                        textAlign: 'center',
                        color: '#667eea',
                        fontSize: '1rem',
                        fontWeight: '500'
                      }}>
                        ⏳ {language === 'zh-TW' ? '載入福利中...' : 'Loading benefits...'}
                      </div>
                    ) : userCard.benefits && userCard.benefits.length > 0 ? (
                      userCard.benefits
                        .filter((benefit: any) => {
                          const userBenefit = benefit.userBenefits?.[0]
                          const isHidden = userBenefit && userBenefit.isHidden
                          return showHiddenBenefits || !isHidden
                        })
                        .map((benefit: any) => (
                          <BenefitItem
                        key={benefit.id}
                        benefit={benefit}
                        userCardId={userCard.id}
                        language={language}
                        year={year}
                        onToggle={toggleBenefit}
                        onUpdateSettings={updateNotificationSettings}
                        onToggleHide={toggleHideBenefit}
                          />
                        ))
                    ) : (
                      <div style={{
                        padding: '1.5rem',
                        textAlign: 'center',
                        color: '#888',
                        fontSize: '0.95rem'
                      }}>
                        {language === 'zh-TW' ? '此卡片沒有福利' : 'No benefits for this card'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>)
          })}
        </div>
      )}

      {/* Card Settings Modal */}
      {showSettingsModal && selectedCard && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem',
          overflowY: 'auto'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '2rem',
            maxWidth: '500px',
            width: '100%',
            boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h2 style={{ marginBottom: '1rem', color: 'var(--primary-color)' }}>
              📅 {language === 'zh-TW' ? '年費與卡片暱稱設定' : 'Card Settings'}
            </h2>
            <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              {language === 'zh-TW'
                ? `設定「${selectedCard.card.name}」的暱稱和年費收取日期`
                : `Set nickname and annual fee charge date for "${selectedCard.card.nameEn || selectedCard.card.name}"`}
            </p>

            {/* Card Nickname */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontSize: '0.95rem',
                fontWeight: '600',
                color: 'var(--text-color)'
              }}>
                🏷️ {language === 'zh-TW' ? '卡片暱稱' : 'Card Nickname'}
              </label>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                {language === 'zh-TW'
                  ? '為這張卡片設定一個暱稱，方便辨識多張相同卡片（例如：「日常用」、「Costco 專用」）'
                  : 'Set a nickname for this card to easily identify multiple cards (e.g., "Daily Use", "Costco Only")'}
              </p>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder={language === 'zh-TW' ? '輸入暱稱（選填）' : 'Enter nickname (optional)'}
                maxLength={30}
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

            {/* Annual Fee Charge Date */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontSize: '0.95rem',
                fontWeight: '600',
                color: 'var(--text-color)'
              }}>
                📅 {language === 'zh-TW' ? '年費收取日期' : 'Annual Fee Charge Date'}
              </label>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                {language === 'zh-TW'
                  ? '設定您的年費收取日期，以便追蹤年費繳交時間'
                  : 'Set your annual fee charge date to track when your annual fee is due'}
              </p>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontSize: '0.85rem',
                    color: 'var(--text-color)'
                  }}>
                    {language === 'zh-TW' ? '月份 (1-12)' : 'Month (1-12)'}
                  </label>
                  <select
                    value={afChargeMonth}
                    onChange={(e) => setAfChargeMonth(e.target.value === '' ? '' : parseInt(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      fontSize: '1rem',
                      backgroundColor: 'var(--card-bg)'
                    }}
                  >
                    <option value="">{language === 'zh-TW' ? '未設定' : 'Not Set'}</option>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                      <option key={month} value={month}>{month}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontSize: '0.85rem',
                    color: 'var(--text-color)'
                  }}>
                    {language === 'zh-TW' ? '日期 (1-31)' : 'Day (1-31)'}
                  </label>
                  <select
                    value={afChargeDay}
                    onChange={(e) => setAfChargeDay(e.target.value === '' ? '' : parseInt(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      fontSize: '1rem',
                      backgroundColor: 'var(--card-bg)'
                    }}
                  >
                    <option value="">{language === 'zh-TW' ? '未設定' : 'Not Set'}</option>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Card Opening Date (for 5/24 rule) */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontSize: '0.95rem',
                fontWeight: '600',
                color: 'var(--text-color)'
              }}>
                🗓️ {language === 'zh-TW' ? '開卡日期' : 'Card Opening Date'}
              </label>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                {language === 'zh-TW'
                  ? '設定您的開卡日期，用於計算 5/24 規則（兩年內開了幾張卡）'
                  : 'Set your card opening date to track 5/24 rule (number of cards opened in 24 months)'}
              </p>
              <input
                type="date"
                value={openedAt}
                onChange={(e) => setOpenedAt(e.target.value)}
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

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button
                onClick={closeCardSettings}
                className="btn btn-secondary"
                style={{ flex: 1 }}
              >
                {language === 'zh-TW' ? '取消' : 'Cancel'}
              </button>
              <button
                onClick={saveCardSettings}
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                {language === 'zh-TW' ? '儲存' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Benefit Modal */}
      {showCustomBenefitModal && customBenefitCard && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem',
          overflowY: 'auto'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '2rem',
            maxWidth: '550px',
            width: '100%',
            boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h2 style={{ marginBottom: '1rem', color: 'var(--primary-color)' }}>
              🎁 {language === 'zh-TW' ? '新增自定義福利' : 'Add Custom Benefit'}
            </h2>
            <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              {language === 'zh-TW'
                ? `為「${customBenefitCard.card.name}」新增開卡禮或續卡禮`
                : `Add Open/Retention Offer for "${customBenefitCard.card.nameEn || customBenefitCard.card.name}"`}
            </p>

            {/* Amount and Currency */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontSize: '0.95rem',
                fontWeight: '600',
                color: 'var(--text-color)'
              }}>
                {language === 'zh-TW' ? '累積金額' : 'Amount'} <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <select
                  value={customCurrency}
                  onChange={(e) => setCustomCurrency(e.target.value)}
                  style={{
                    width: '120px',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    fontSize: '1rem',
                    backgroundColor: 'var(--card-bg)'
                  }}
                >
                  <option value="TWD">TWD</option>
                  <option value="USD">USD</option>
                  <option value="JPY">JPY</option>
                  <option value="CNY">CNY</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
                <input
                  type="number"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  placeholder={language === 'zh-TW' ? '輸入金額' : 'Enter amount'}
                  min="0"
                  step="0.01"
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    fontSize: '1rem',
                    backgroundColor: 'var(--card-bg)'
                  }}
                />
              </div>
            </div>

            {/* Description (Optional) */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontSize: '0.95rem',
                fontWeight: '600',
                color: 'var(--text-color)'
              }}>
                {language === 'zh-TW' ? '開卡禮內容' : 'Bonus Description'}
                <span style={{ fontSize: '0.85rem', fontWeight: '400', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>
                  ({language === 'zh-TW' ? '選填' : 'Optional'})
                </span>
              </label>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                {language === 'zh-TW'
                  ? '記錄您獲得的開卡禮內容（例如：10,000 點紅利點數、行李箱一個、免費住宿券等）'
                  : 'Record what you received (e.g., 10,000 bonus points, free luggage, hotel voucher, etc.)'}
              </p>
              <input
                type="text"
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                placeholder={language === 'zh-TW' ? '例如：10,000 點紅利點數' : 'e.g., 10,000 bonus points'}
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

            {/* Period End Date */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontSize: '0.95rem',
                fontWeight: '600',
                color: 'var(--text-color)'
              }}>
                {language === 'zh-TW' ? '到期日' : 'Expiration Date'} <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                {language === 'zh-TW'
                  ? '設定這項福利的到期日（例如：開卡禮通常需要在開卡後 3-6 個月內達成）'
                  : 'Set the expiration date for this benefit (e.g., signup bonuses typically need to be completed within 3-6 months)'}
              </p>
              <input
                type="date"
                value={customPeriodEnd}
                onChange={(e) => setCustomPeriodEnd(e.target.value)}
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

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button
                onClick={closeCustomBenefitModal}
                className="btn btn-secondary"
                style={{ flex: 1 }}
              >
                {language === 'zh-TW' ? '取消' : 'Cancel'}
              </button>
              <button
                onClick={saveCustomBenefit}
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                {language === 'zh-TW' ? '新增' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
