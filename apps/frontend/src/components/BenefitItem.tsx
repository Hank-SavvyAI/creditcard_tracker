'use client'

import { useState, useEffect } from 'react'
import { getCurrentCycleLabel, getLocalTodayDate } from '@/lib/dateUtils'

interface BenefitItemProps {
  benefit: any
  userCardId: number
  language: string
  year: number
  onToggle: (benefitId: number, isCompleted: boolean, userCardId: number) => void
  onUpdateSettings: (benefitId: number, settings: { reminderDays?: number; notificationEnabled?: boolean }, userCardId: number) => void
  onToggleHide?: (benefitId: number, isHidden: boolean, userCardId: number) => void
}

interface BenefitUsage {
  id: number
  amount: number
  usedAt: string
  note: string | null
}

export default function BenefitItem({ benefit, userCardId, language, year, onToggle, onUpdateSettings, onToggleHide }: BenefitItemProps) {
  const [showSettings, setShowSettings] = useState(false)
  const [showUsageForm, setShowUsageForm] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [usages, setUsages] = useState<BenefitUsage[]>([])
  const [usedAmount, setUsedAmount] = useState(0)
  const [history, setHistory] = useState<any[]>([])

  // Use local timezone for today's date instead of UTC
  const [newUsage, setNewUsage] = useState({ amount: '', usedAt: getLocalTodayDate(), note: '' })

  const userBenefit = benefit.userBenefits[0]
  const completed = userBenefit && userBenefit.isCompleted
  const isHidden = userBenefit && userBenefit.isHidden
  const reminderDays = userBenefit?.reminderDays ?? benefit.reminderDays
  const notificationEnabled = userBenefit?.notificationEnabled ?? true
  const isNotifiable = benefit.notifiable ?? true
  const totalAmount = benefit.amount || 0
  const remainingAmount = totalAmount - usedAmount
  const cycleType = benefit.cycleType

  // 計算當前週期顯示文字
  const cycleLabel = getCurrentCycleLabel(cycleType, language as 'zh-TW' | 'en')

  useEffect(() => {
    if (totalAmount > 0) {
      loadUsages()
    }
  }, [benefit.id, year])

  const loadUsages = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/benefits/${benefit.id}/usage?year=${year}&userCardId=${userCardId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        setUsages(data.usages || [])
        setUsedAmount(data.usedAmount || 0)
      }
    } catch (error) {
      console.error('Failed to load usages:', error)
    }
  }

  const handleAddUsage = async () => {
    if (!newUsage.amount || parseFloat(newUsage.amount) <= 0) {
      alert(language === 'zh-TW' ? '請輸入有效金額' : 'Please enter valid amount')
      return
    }

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/benefits/${benefit.id}/usage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          year,
          amount: parseFloat(newUsage.amount),
          usedAt: newUsage.usedAt || getLocalTodayDate(),
          note: newUsage.note || null,
          userCardId,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.isHistorical) {
          // Added to history - show message and close form
          alert(data.message || (language === 'zh-TW'
            ? '此報銷記錄已添加到歷史記錄（該週期已過期）'
            : 'This reimbursement has been added to history (cycle expired)'))
          setShowUsageForm(false)
        } else {
          // Added to current cycle - update display
          setUsages(data.usages || [])
          setUsedAmount(data.usedAmount || 0)
          setNewUsage({ amount: '', usedAt: getLocalTodayDate(), note: '' })
          setShowUsageForm(false)

          // Auto-complete if used amount >= total amount
          const newUsedAmount = data.usedAmount || 0
          if (newUsedAmount >= totalAmount && !completed) {
            onToggle(benefit.id, false, userCardId)
          }
        }
      } else {
        alert(language === 'zh-TW' ? '新增失敗' : 'Failed to add usage')
      }
    } catch (error) {
      console.error('Failed to add usage:', error)
      alert(language === 'zh-TW' ? '新增失敗' : 'Failed to add usage')
    }
  }

  const handleDeleteUsage = async (usageId: number) => {
    if (!confirm(language === 'zh-TW' ? '確定要刪除此紀錄？' : 'Delete this record?')) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/benefits/${benefit.id}/usage/${usageId}?year=${year}&userCardId=${userCardId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        setUsages(data.usages || [])
        setUsedAmount(data.usedAmount || 0)
      } else {
        alert(language === 'zh-TW' ? '刪除失敗' : 'Failed to delete usage')
      }
    } catch (error) {
      console.error('Failed to delete usage:', error)
      alert(language === 'zh-TW' ? '刪除失敗' : 'Failed to delete usage')
    }
  }

  const handleReminderChange = (days: number) => {
    onUpdateSettings(benefit.id, { reminderDays: days }, userCardId)
  }

  const handleNotificationToggle = () => {
    onUpdateSettings(benefit.id, { notificationEnabled: !notificationEnabled }, userCardId)
  }

  const loadHistory = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/benefits/history?benefitId=${benefit.id}&userCardId=${userCardId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        setHistory(data)
        setShowHistory(true)
      }
    } catch (error) {
      console.error('Failed to load history:', error)
    }
  }

  return (
    
    <div className="benefit-item" style={{ display: 'block', marginBottom: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem' }}>
      {/* First Row: Notification Settings Button and Panel */}
      {isNotifiable && (
        <div style={{ display: 'block', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #e0e0e0' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: showSettings ? '1rem' : '0' }}>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="btn btn-secondary"
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
            >
              {showSettings ? '🔼' : '⚙️'} {language === 'zh-TW' ? '通知設定' : 'Settings'}
            </button>
          </div>

          {/* Notification Settings Panel */}
          {showSettings && (
            <div style={{
              padding: '1rem',
              background: '#f8f9fa',
              borderRadius: '8px',
              border: '1px solid #e0e0e0'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '600', color: '#333', whiteSpace: 'nowrap' }}>
                  {language === 'zh-TW' ? '⚙️ 通知設定' : '⚙️ Notification Settings'}
                </h4>
                <button
                  onClick={() => setShowSettings(false)}
                  style={{
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.75rem',
                    background: 'transparent',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    color: '#666',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {language === 'zh-TW' ? '✕ 關閉' : '✕ Close'}
                </button>
              </div>

              {/* 通知開關 */}
              <div style={{
                marginBottom: '1.5rem',
                padding: '1rem',
                background: 'white',
                borderRadius: '6px',
                border: '1px solid #e0e0e0'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '0.95rem', fontWeight: '500', marginBottom: '0.25rem', color: '#333' }}>
                      {language === 'zh-TW' ? '啟用通知' : 'Enable Notifications'}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#666' }}>
                      {language === 'zh-TW' ? '開啟後將在福利到期前提醒您' : 'Get reminded before benefits expire'}
                    </div>
                  </div>
                  <button
                    onClick={handleNotificationToggle}
                    style={{
                      marginLeft: '1rem',
                      padding: '0.35rem 0.85rem',
                      background: notificationEnabled
                        ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                        : 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)',
                      color: notificationEnabled ? 'white' : '#64748b',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      transition: 'all 0.2s ease',
                      minWidth: '65px',
                      boxShadow: notificationEnabled
                        ? '0 2px 4px rgba(16, 185, 129, 0.2)'
                        : '0 1px 3px rgba(0, 0, 0, 0.1)',
                      letterSpacing: '0.02em'
                    }}
                    onMouseEnter={(e) => {
                      if (notificationEnabled) {
                        e.currentTarget.style.boxShadow = '0 4px 8px rgba(16, 185, 129, 0.3)'
                        e.currentTarget.style.transform = 'translateY(-1px)'
                      } else {
                        e.currentTarget.style.background = 'linear-gradient(135deg, #cbd5e1 0%, #94a3b8 100%)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (notificationEnabled) {
                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(16, 185, 129, 0.2)'
                        e.currentTarget.style.transform = 'translateY(0)'
                      } else {
                        e.currentTarget.style.background = 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)'
                      }
                    }}
                  >
                    {notificationEnabled ? (language === 'zh-TW' ? '已啟用' : 'ON') : (language === 'zh-TW' ? '已停用' : 'OFF')}
                  </button>
                </div>
              </div>

              {/* 提醒天數 */}
              {notificationEnabled && (
                <div style={{
                  padding: '1rem',
                  background: 'white',
                  borderRadius: '6px',
                  border: '1px solid #e0e0e0'
                }}>
                  <div style={{ marginBottom: '0.75rem' }}>
                    <div style={{ fontSize: '0.95rem', fontWeight: '500', marginBottom: '0.25rem', color: '#333' }}>
                      {language === 'zh-TW' ? '提前提醒天數' : 'Remind me (days before)'}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#666' }}>
                      {language === 'zh-TW' ? '選擇在福利到期前多久提醒您' : 'Choose when to remind you before expiration'}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                    {[7, 14, 30, 60].map((days) => (
                      <button
                        key={days}
                        onClick={() => handleReminderChange(days)}
                        style={{
                          padding: '0.4rem 0.2rem',
                          background: reminderDays === days ? 'var(--primary-color)' : 'white',
                          color: reminderDays === days ? 'white' : '#333',
                          border: reminderDays === days ? '2px solid var(--primary-color)' : '2px solid #e0e0e0',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          fontWeight: reminderDays === days ? '600' : '500',
                          transition: 'all 0.2s',
                          textAlign: 'center',
                          whiteSpace: 'nowrap'
                        }}
                        onMouseEnter={(e) => {
                          if (reminderDays !== days) {
                            e.currentTarget.style.borderColor = 'var(--primary-color)'
                            e.currentTarget.style.background = '#f0f9ff'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (reminderDays !== days) {
                            e.currentTarget.style.borderColor = '#e0e0e0'
                            e.currentTarget.style.background = 'white'
                          }
                        }}
                      >
                        {days} {language === 'zh-TW' ? '天' : 'days'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Second Row: Benefit Info and Action Buttons */}
      <div className="benefit-row" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {isNotifiable && (
          <span className="benefit-status" style={{ fontSize: '1.2rem' }}>
            {completed ? '✅' : '⏳'}
          </span>
        )}
        <div className="benefit-info" style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
            <div className="benefit-title" style={{ fontWeight: 'bold' }}>
              {language === 'zh-TW' ? benefit.title : (benefit.titleEn || benefit.title)}
            </div>
            {cycleLabel && (
              <span style={{
                fontSize: '0.75rem',
                padding: '0.2rem 0.5rem',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: 'white',
                borderRadius: '12px',
                fontWeight: '500'
              }}>
                {cycleLabel}
              </span>
            )}
          </div>
          {benefit.amount && (
            <div className="benefit-amount" style={{ fontSize: '0.9rem', color: 'var(--foreground-light)' }}>
              {benefit.currency} {benefit.amount}
              {totalAmount > 0 && (
                <span style={{ marginLeft: '0.5rem', fontSize: '0.85rem' }}>
                  ({language === 'zh-TW' ? '已使用' : 'Used'}: {benefit.currency} {usedAmount.toFixed(2)} |
                  {language === 'zh-TW' ? '剩餘' : 'Remaining'}: {benefit.currency} {remainingAmount.toFixed(2)})
                </span>
              )}
            </div>
          )}
          {totalAmount > 0 && (
            <div style={{ marginTop: '0.5rem' }}>
              <div style={{
                height: '8px',
                background: '#e0e0e0',
                borderRadius: '4px',
                overflow: 'hidden',
                position: 'relative'
              }}>
                <div style={{
                  height: '100%',
                  background: remainingAmount > 0 ? 'linear-gradient(90deg, #10b981 0%, #059669 100%)' : '#dc2626',
                  width: `${Math.min((usedAmount / totalAmount) * 100, 100)}%`,
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>
          )}
        </div>
        <div className="benefit-actions" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {cycleType && (
            <button
              onClick={loadHistory}
              className="btn btn-secondary"
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
            >
              📜 {language === 'zh-TW' ? '歷史' : 'History'}
            </button>
          )}
          {isNotifiable && (
            <button
              onClick={() => onToggle(benefit.id, completed, userCardId)}
              className={`btn ${completed ? 'btn-secondary' : 'btn-success'}`}
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
            >
              {completed
                ? (language === 'zh-TW' ? '取消' : 'Undo')
                : (language === 'zh-TW' ? '報銷完成' : 'Complete')}
            </button>
          )}
          {totalAmount > 0 && (
            <button
              onClick={() => setShowUsageForm(!showUsageForm)}
              className="btn btn-primary"
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
            >
              💰 {language === 'zh-TW' ? '記錄報銷' : 'Add Usage'}
            </button>
          )}
          {onToggleHide && (
            <button
              onClick={() => onToggleHide(benefit.id, isHidden, userCardId)}
              className="btn btn-secondary"
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
            >
              {isHidden
                ? (language === 'zh-TW' ? '👁️ 顯示' : '👁️ Show')
                : (language === 'zh-TW' ? '🙈 隱藏' : '🙈 Hide')}
            </button>
          )}
        </div>
      </div>

      {/* Usage History - Table View */}
      {totalAmount > 0 && usages.length > 0 && (
        <div style={{
          marginTop: '1rem',
          padding: '1rem',
          background: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #e0e0e0'
        }}>
          <h4 style={{ margin: 0, marginBottom: '0.75rem', fontSize: '0.9rem', fontWeight: '600', color: '#333' }}>
            📋 {language === 'zh-TW' ? '報銷記錄' : 'Usage History'}
          </h4>
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.85rem'
            }}>
              <thead>
                <tr style={{ background: '#e5e7eb' }}>
                  <th style={{ padding: '0.5rem', textAlign: 'left', fontWeight: '600', borderBottom: '2px solid #d1d5db' }}>
                    {language === 'zh-TW' ? '日期' : 'Date'}
                  </th>
                  <th style={{ padding: '0.5rem', textAlign: 'right', fontWeight: '600', borderBottom: '2px solid #d1d5db' }}>
                    {language === 'zh-TW' ? '金額' : 'Amount'}
                  </th>
                  <th style={{ padding: '0.5rem', textAlign: 'left', fontWeight: '600', borderBottom: '2px solid #d1d5db' }}>
                    {language === 'zh-TW' ? '備註' : 'Note'}
                  </th>
                  <th style={{ padding: '0.5rem', textAlign: 'center', fontWeight: '600', borderBottom: '2px solid #d1d5db', width: '80px' }}>
                    {language === 'zh-TW' ? '操作' : 'Action'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {usages.map((usage) => (
                  <tr key={usage.id} style={{ background: 'white', borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '0.6rem', fontSize: '0.8rem', color: '#666' }}>
                      {new Date(usage.usedAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '0.6rem', textAlign: 'right', fontWeight: '600', color: '#059669' }}>
                      {benefit.currency} {usage.amount.toFixed(2)}
                    </td>
                    <td style={{ padding: '0.6rem', fontSize: '0.8rem', color: '#666' }}>
                      {usage.note || '-'}
                    </td>
                    <td style={{ padding: '0.6rem', textAlign: 'center' }}>
                      <button
                        onClick={() => handleDeleteUsage(usage.id)}
                        style={{
                          padding: '0.25rem 0.5rem',
                          fontSize: '0.7rem',
                          background: '#fee',
                          color: '#c00',
                          border: '1px solid #fcc',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {language === 'zh-TW' ? '刪除' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Usage Form */}
      {totalAmount > 0 && showUsageForm && (
        <div style={{
          marginLeft: '2rem',
          marginTop: '1.5rem',
          padding: '1rem',
          background: '#f0f9ff',
          borderRadius: '8px',
          border: '1px solid #0ea5e9'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '600', color: '#0369a1', whiteSpace: 'nowrap' }}>
              {language === 'zh-TW' ? '💰 新增報銷記錄' : '💰 Add Reimbursement'}
            </h4>
            <button
              onClick={() => setShowUsageForm(false)}
              style={{
                padding: '0.25rem 0.5rem',
                fontSize: '0.75rem',
                background: 'transparent',
                border: '1px solid #0ea5e9',
                borderRadius: '4px',
                cursor: 'pointer',
                color: '#0369a1',
                whiteSpace: 'nowrap'
              }}
            >
              {language === 'zh-TW' ? '✕ 關閉' : '✕ Close'}
            </button>
          </div>

          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '500', marginBottom: '0.25rem', color: '#0369a1' }}>
                {language === 'zh-TW' ? '金額' : 'Amount'} *
              </label>
              <input
                type="number"
                step="0.01"
                value={newUsage.amount}
                onChange={(e) => setNewUsage({ ...newUsage, amount: e.target.value })}
                placeholder="0.00"
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  border: '1px solid #0ea5e9',
                  fontSize: '0.9rem'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '500', marginBottom: '0.25rem', color: '#0369a1' }}>
                {language === 'zh-TW' ? '使用日期' : 'Date'} *
              </label>
              <input
                type="date"
                value={newUsage.usedAt}
                onChange={(e) => setNewUsage({ ...newUsage, usedAt: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  border: '1px solid #0ea5e9',
                  fontSize: '0.9rem'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '500', marginBottom: '0.25rem', color: '#0369a1' }}>
                {language === 'zh-TW' ? '備註' : 'Note'}
              </label>
              <input
                type="text"
                value={newUsage.note}
                onChange={(e) => setNewUsage({ ...newUsage, note: e.target.value })}
                placeholder={language === 'zh-TW' ? '選填' : 'Optional'}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  border: '1px solid #0ea5e9',
                  fontSize: '0.9rem'
                }}
              />
            </div>

            <button
              onClick={handleAddUsage}
              className="btn btn-primary"
              style={{ padding: '0.6rem', fontSize: '0.9rem', fontWeight: '600' }}
            >
              {language === 'zh-TW' ? '✓ 新增' : '✓ Add'}
            </button>
          </div>
        </div>
      )}

      {/* Benefit History Modal */}
      {showHistory && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            maxWidth: '800px',
            width: '100%',
            maxHeight: '80vh',
            overflow: 'auto',
            padding: '2rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: '#333' }}>
                📜 {language === 'zh-TW' ? '歷史記錄' : 'History'} - {language === 'zh-TW' ? benefit.title : (benefit.titleEn || benefit.title)}
              </h3>
              <button
                onClick={() => setShowHistory(false)}
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.9rem',
                  background: '#e5e7eb',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                {language === 'zh-TW' ? '✕ 關閉' : '✕ Close'}
              </button>
            </div>

            {history.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
                {language === 'zh-TW' ? '暫無歷史記錄' : 'No history records'}
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '1rem' }}>
                {history.map((record: any) => {
                  const cycleLabel = record.cycleNumber
                    ? `${record.year} - ${record.cycleType === 'MONTHLY' ? `${record.cycleNumber}月` : record.cycleType === 'QUARTERLY' ? `Q${record.cycleNumber}` : record.cycleType === 'SEMI_ANNUALLY' ? `${record.cycleNumber === 1 ? '上半年' : '下半年'}` : '全年'}`
                    : record.year;

                  return (
                    <div
                      key={record.id}
                      style={{
                        padding: '1rem',
                        background: '#f9fafb',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <div>
                          <div style={{ fontSize: '0.95rem', fontWeight: '600', color: '#111827' }}>
                            {cycleLabel}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.25rem' }}>
                            {record.isCompleted ? '✅ ' + (language === 'zh-TW' ? '已完成' : 'Completed') : '⏳ ' + (language === 'zh-TW' ? '未完成' : 'Incomplete')}
                            {record.completedAt && ` • ${new Date(record.completedAt).toLocaleDateString()}`}
                          </div>
                        </div>
                        {record.usedAmount > 0 && (
                          <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#059669' }}>
                            {benefit.currency} {record.usedAmount.toFixed(2)}
                          </div>
                        )}
                      </div>

                      {record.usages && record.usages.length > 0 && (
                        <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #e5e7eb' }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                            {language === 'zh-TW' ? '報銷明細' : 'Usage Details'}:
                          </div>
                          {record.usages.map((usage: any) => (
                            <div key={usage.id} style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                              • {benefit.currency} {usage.amount.toFixed(2)} - {new Date(usage.usedAt).toLocaleDateString()}
                              {usage.note && ` (${usage.note})`}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
