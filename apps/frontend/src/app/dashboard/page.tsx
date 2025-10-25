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

  async function toggleBenefit(benefitId: number, isCompleted: boolean) {
    try {
      if (isCompleted) {
        await api.uncompleteBenefit(benefitId, year)
      } else {
        await api.completeBenefit(benefitId, year)
      }
      await loadData()
    } catch (error) {
      console.error('Failed to toggle benefit:', error)
    }
  }

  async function updateNotificationSettings(benefitId: number, settings: { reminderDays?: number; notificationEnabled?: boolean }) {
    try {
      await api.updateBenefitSettings(benefitId, year, settings)
      await loadData()
    } catch (error) {
      console.error('Failed to update notification settings:', error)
      alert(language === 'zh-TW' ? '更新失敗' : 'Update failed')
    }
  }

  async function removeCard(cardId: number, cardName: string) {
    const confirmMessage = language === 'zh-TW'
      ? `確定要移除「${cardName}」的追蹤嗎？`
      : `Are you sure you want to stop tracking "${cardName}"?`

    if (!confirm(confirmMessage)) {
      return
    }

    try {
      await api.removeCard(cardId)
      alert(language === 'zh-TW' ? '已移除追蹤' : 'Card removed successfully')
      await loadData()
    } catch (error) {
      console.error('Failed to remove card:', error)
      alert(language === 'zh-TW' ? '移除失敗' : 'Failed to remove card')
    }
  }

  function handleLogout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/')
  }

  if (loading) {
    return <div className="loading">{language === 'zh-TW' ? '載入中...' : 'Loading...'}</div>
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>
          {language === 'zh-TW' ? `我的信用卡福利 (${year})` : `My Credit Card Benefits (${year})`}
        </h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
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
          {userCards.map((userCard) => (
            <div key={userCard.id} className="card" style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
              {/* 左側：卡片圖片 */}
              {userCard.card.photo && (
                <div style={{ flexShrink: 0, width: '200px' }}>
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
                  />
                </div>
              )}

              {/* 右側：卡片資訊和福利 */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.5rem' }}>
                  <div>
                    <h2 className="card-title" style={{ margin: 0, marginBottom: '0.25rem', fontSize: '1.5rem' }}>
                      {language === 'zh-TW' ? userCard.card.name : (userCard.card.nameEn || userCard.card.name)}
                    </h2>
                    <p className="card-bank" style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>
                      🏦 {language === 'zh-TW' ? userCard.card.bank : (userCard.card.bankEn || userCard.card.bank)}
                    </p>
                  </div>
                  <button
                    onClick={() => removeCard(userCard.card.id, language === 'zh-TW' ? userCard.card.name : (userCard.card.nameEn || userCard.card.name))}
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

                {/* 福利列表 */}
                <div style={{ marginTop: '1rem' }}>
                  {userCard.card.benefits.map((benefit: any) => (
                    <BenefitItem
                      key={benefit.id}
                      benefit={benefit}
                      language={language}
                      year={year}
                      onToggle={toggleBenefit}
                      onUpdateSettings={updateNotificationSettings}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
