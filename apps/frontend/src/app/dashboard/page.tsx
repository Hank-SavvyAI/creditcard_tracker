'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { useLanguageStore } from '@/store/language'
import BenefitItem from '@/components/BenefitItem'
import SpreadsheetView from '@/components/SpreadsheetView'
import NotificationSettings from '@/components/NotificationSettings'

export default function Dashboard() {
  const { language } = useLanguageStore()
  const router = useRouter()
  const [userCards, setUserCards] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
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
  const year = new Date().getFullYear()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/')
      return
    }

    // Check if user is admin
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      const user = JSON.parse(storedUser)
      setIsAdmin(user.role === 'ADMIN')
    }

    setIsInitialized(true)
    loadData()
  }, [router])

  async function loadData() {
    try {
      const data = await api.getMyBenefits(year)
      setUserCards(data)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function toggleBenefit(benefitId: number, isCompleted: boolean, userCardId: number) {
    try {
      if (isCompleted) {
        await api.uncompleteBenefit(benefitId, year, userCardId)
      } else {
        await api.completeBenefit(benefitId, year, undefined, userCardId)
      }
      await loadData()
    } catch (error) {
      console.error('Failed to toggle benefit:', error)
    }
  }

  async function updateNotificationSettings(benefitId: number, settings: { reminderDays?: number; notificationEnabled?: boolean }, userCardId: number) {
    try {
      await api.updateBenefitSettings(benefitId, year, settings, userCardId)
      await loadData()
    } catch (error) {
      console.error('Failed to update notification settings:', error)
      alert(language === 'zh-TW' ? '更新失敗' : 'Update failed')
    }
  }

  async function removeCard(userCardId: number, cardName: string) {
    const confirmMessage = language === 'zh-TW'
      ? `確定要移除「${cardName}」的追蹤嗎？`
      : `Are you sure you want to stop tracking "${cardName}"?`

    if (!confirm(confirmMessage)) {
      return
    }

    try {
      await api.removeCard(userCardId)
      alert(language === 'zh-TW' ? '已移除追蹤' : 'Card removed successfully')
      await loadData()
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
    if (!selectedCard) return

    try {
      await api.updateCardSettings(selectedCard.id, {
        nickname: nickname.trim() === '' ? undefined : nickname.trim(),
        afChargeMonth: afChargeMonth === '' ? null : afChargeMonth,
        afChargeDay: afChargeDay === '' ? null : afChargeDay,
        openedAt: openedAt === '' ? null : openedAt,
      })
      alert(language === 'zh-TW' ? '設定已儲存' : 'Settings saved successfully')
      closeCardSettings()
      await loadData()
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
  }

  async function saveCustomBenefit() {
    if (!customBenefitCard || customAmount === '' || !customPeriodEnd) {
      alert(language === 'zh-TW' ? '請填寫所有必填欄位' : 'Please fill in all required fields')
      return
    }

    try {
      await api.createCustomBenefit({
        userCardId: customBenefitCard.id,
        customTitle: '開卡禮/續卡禮',
        customTitleEn: 'Open/Retention Offer',
        customAmount: typeof customAmount === 'number' ? customAmount : 0,
        customCurrency,
        periodEnd: customPeriodEnd,
      })
      alert(language === 'zh-TW' ? '自定義福利已新增' : 'Custom benefit added successfully')
      closeCustomBenefitModal()
      await loadData()
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
    return <div className="loading">{language === 'zh-TW' ? '載入中...' : 'Loading...'}</div>
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>
          {language === 'zh-TW' ? `我的信用卡福利 (${year})` : `My Credit Card Benefits (${year})`}
        </h1>
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
        <SpreadsheetView />
      ) : userCards.length === 0 ? (
        <p>
          {language === 'zh-TW'
            ? '您還沒有新增任何信用卡，請先使用 Telegram Bot 新增信用卡'
            : 'You haven\'t added any credit cards yet. Please add cards using the Telegram Bot'}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {userCards.map((userCard, index) => {
            // Check if user has multiple instances of this card
            const sameCards = userCards.filter(uc => uc.card.id === userCard.card.id)
            const showCardInstance = sameCards.length > 1

            // Alternate background colors
            const backgroundColor = index % 2 === 0 ? '#ffffff' : '#f9fafb'

            return (<div key={userCard.id} className="card dashboard-card" style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', backgroundColor }}>
              {/* 左側：卡片圖片 */}
              {userCard.card.photo && (
                <div style={{ flexShrink: 0, width: '200px' }} className="card-image-container">
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
                </div>
              )}

              {/* 右側：卡片資訊和福利 */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.5rem' }}>
                  <div>
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
                    <button
                      onClick={() => openCardSettings(userCard)}
                      className="btn btn-secondary"
                      style={{
                        padding: '0.5rem 1rem',
                        fontSize: '0.85rem',
                        background: '#6b7280',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#4b5563'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#6b7280'
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

                {/* 福利列表 */}
                <div style={{ marginTop: '1rem' }}>
                  {userCard.card.benefits.map((benefit: any) => (
                    <BenefitItem
                      key={benefit.id}
                      benefit={benefit}
                      userCardId={userCard.id}
                      language={language}
                      year={year}
                      onToggle={toggleBenefit}
                      onUpdateSettings={updateNotificationSettings}
                    />
                  ))}
                </div>
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
