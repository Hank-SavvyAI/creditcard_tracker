'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguageStore } from '@/store/language'
import { calculatePeriodEnd, formatDate, getCycleLabel } from '@/lib/dateUtils'
import { api } from '@/lib/api'

interface Card {
  id: number
  userCardId: number
  name: string
  issuer: string
  annualFee: string | null
  currency: string
  afChargeMonth?: number | null
  afChargeDay?: number | null
  nickname?: string | null
  cardInstance?: number
}

interface Benefit {
  id: number
  name: string
  totalAmount: number
  currency: string
  cycleType: string | null
}

interface BenefitUsage {
  id: number
  amount: number
  usedAt: string
  note: string | null
}

interface UserBenefit {
  id: number
  benefitId: number
  year: number
  cycleNumber: number | null
  periodEnd: string | null
  isCompleted: boolean
  usedAmount: number
  usages?: BenefitUsage[]
  isCustom?: boolean
  benefit: Benefit & { card: Card }
}

interface SpreadsheetViewProps {
  showHiddenBenefits: boolean
}

export default function SpreadsheetView({ showHiddenBenefits }: SpreadsheetViewProps) {
  const router = useRouter()
  const { language } = useLanguageStore()
  const [data, setData] = useState<UserBenefit[]>([])
  const [loading, setLoading] = useState(true)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [selectedCard, setSelectedCard] = useState<Card | null>(null)
  const [nickname, setNickname] = useState('')
  const [afChargeMonth, setAfChargeMonth] = useState<number | ''>('')
  const [afChargeDay, setAfChargeDay] = useState<number | ''>('')
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // 消費記錄 modal 狀態
  const [showUsageModal, setShowUsageModal] = useState(false)
  const [selectedBenefit, setSelectedBenefit] = useState<UserBenefit | null>(null)
  const [usageAmount, setUsageAmount] = useState<number | ''>('')
  const [usageDate, setUsageDate] = useState('')
  const [usageNote, setUsageNote] = useState('')
  const [isSavingUsage, setIsSavingUsage] = useState(false)

  const translations = {
    'zh-TW': {
      title: '📊 信用卡福利總覽',
      cardName: '卡片名稱',
      issuer: '發卡銀行',
      annualFee: '年費',
      afChargeDate: '年費收取日',
      benefitName: '福利項目',
      totalAmount: '總額度',
      usedAmount: '已使用',
      remaining: '剩餘',
      cycle: '週期',
      periodEnd: '到期日',
      status: '狀態',
      actions: '操作',
      completed: '✅ 已完成',
      inProgress: '⏳ 進行中',
      notStarted: '⭕ 未開始',
      monthly: '每月',
      quarterly: '每季',
      yearly: '每年',
      oneTime: '一次性',
      loading: '載入中...',
      noData: '尚無資料',
      usageDate: '消費日期',
      usageAmount: '消費金額',
      usageNote: '備註',
      settings: '設定',
      remove: '移除',
      removeConfirm: '確定要移除此卡片的追蹤嗎？',
      removeSuccess: '已移除追蹤',
      removeFailed: '移除失敗',
      addUsage: '填寫消費記錄',
      addUsageTitle: '新增消費記錄',
      save: '儲存',
      cancel: '取消',
      clickToAddUsage: '點擊填寫消費',
    },
    en: {
      title: '📊 Credit Card Benefits Overview',
      cardName: 'Card Name',
      issuer: 'Issuer',
      annualFee: 'Annual Fee',
      afChargeDate: 'AF Charge Date',
      benefitName: 'Benefit',
      totalAmount: 'Total Amount',
      usedAmount: 'Used',
      remaining: 'Remaining',
      cycle: 'Cycle',
      periodEnd: 'Period End',
      status: 'Status',
      actions: 'Actions',
      completed: '✅ Completed',
      inProgress: '⏳ In Progress',
      notStarted: '⭕ Not Started',
      monthly: 'Monthly',
      quarterly: 'Quarterly',
      yearly: 'Yearly',
      oneTime: 'One-time',
      loading: 'Loading...',
      noData: 'No data available',
      usageDate: 'Usage Date',
      usageAmount: 'Usage Amount',
      usageNote: 'Note',
      settings: 'Settings',
      remove: 'Remove',
      removeConfirm: 'Are you sure you want to remove this card?',
      removeSuccess: 'Card removed successfully',
      removeFailed: 'Failed to remove card',
      addUsage: 'Add Usage Record',
      addUsageTitle: 'Add Usage Record',
      save: 'Save',
      cancel: 'Cancel',
      clickToAddUsage: 'Click to add usage',
    },
  }

  const t = translations[language]

  const loadData = async () => {
    try {
      const token = localStorage.getItem('token')
      const year = new Date().getFullYear()
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/benefits/my?year=${year}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        // Flatten the data structure to get all benefits
        const allBenefits: UserBenefit[] = []

        for (const userCard of data) {
          for (const benefit of userCard.card.benefits) {
            // Get userBenefit if it exists, otherwise create a default one
            const userBenefit = benefit.userBenefits && benefit.userBenefits.length > 0
              ? benefit.userBenefits[0]
              : null

            // Check if benefit is hidden
            const isHidden = userBenefit && userBenefit.isHidden

            // Skip hidden benefits unless showHiddenBenefits is true
            if (isHidden && !showHiddenBenefits) {
              continue
            }

            // Get usages from all userBenefits (all cycles for spreadsheet view)
            let usages: BenefitUsage[] = []
            let aggregatedUsedAmount = 0

            if (benefit.userBenefits && benefit.userBenefits.length > 0) {
              // Aggregate usages and amounts from all cycles
              benefit.userBenefits.forEach((ub: any) => {
                if (ub.usages) {
                  usages.push(...ub.usages)
                }
                aggregatedUsedAmount += ub.usedAmount || 0
              })
              // Sort usages by date descending
              usages.sort((a, b) => new Date(b.usedAt).getTime() - new Date(a.usedAt).getTime())
            }

            // Calculate isCompleted based on actual used amount vs total amount
            const totalAmount = benefit.amount || 0
            const isCompleted = totalAmount > 0 && aggregatedUsedAmount >= totalAmount

            // Check if this is a custom benefit from any userBenefit
            const isCustomBenefit = benefit.userBenefits?.some((ub: any) => ub.isCustom)
            const customBenefitData = benefit.userBenefits?.find((ub: any) => ub.isCustom)

            allBenefits.push({
              id: userBenefit?.id || 0,
              benefitId: benefit.id,
              year: userBenefit?.year || year,
              cycleNumber: userBenefit?.cycleNumber || null,
              periodEnd: userBenefit?.periodEnd || null,
              isCompleted, // Use calculated status based on actual amounts
              usedAmount: aggregatedUsedAmount, // Use aggregated amount from API
              usages,
              isCustom: isCustomBenefit,
              benefit: {
                id: benefit.id,
                name: isCustomBenefit
                  ? (language === 'zh-TW' ? customBenefitData?.customTitle : (customBenefitData?.customTitleEn || customBenefitData?.customTitle))
                  : (language === 'zh-TW' ? benefit.title : (benefit.titleEn || benefit.title)),
                totalAmount: isCustomBenefit ? (customBenefitData?.customAmount || 0) : (benefit.amount || 0),
                currency: isCustomBenefit ? customBenefitData?.customCurrency : benefit.currency,
                cycleType: isCustomBenefit ? null : benefit.frequency,
                endMonth: benefit.endMonth,
                endDay: benefit.endDay,
                card: {
                  id: userCard.card.id,
                  userCardId: userCard.id,
                  name: language === 'zh-TW' ? userCard.card.name : (userCard.card.nameEn || userCard.card.name),
                  issuer: language === 'zh-TW' ? userCard.card.bank : (userCard.card.bankEn || userCard.card.bank),
                  annualFee: userCard.card.fee,
                  currency: userCard.card.currency || 'TWD',
                  afChargeMonth: userCard.afChargeMonth,
                  afChargeDay: userCard.afChargeDay,
                  nickname: userCard.nickname,
                  cardInstance: userCard.cardInstance,
                },
              } as any,
            })
          }
        }
        setData(allBenefits)
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showHiddenBenefits])

  const formatPeriodEnd = (item: UserBenefit) => {
    // 如果有 periodEnd，直接使用
    if (item.periodEnd) {
      return formatDate(item.periodEnd, language)
    }

    // 否則根據 frequency 動態計算
    const benefit = item.benefit as any
    const periodEnd = calculatePeriodEnd(benefit.cycleType, benefit.endMonth, benefit.endDay)
    return periodEnd ? formatDate(periodEnd, language) : '-'
  }

  const handleCardClick = (userCardId: number) => {
    // Switch to card view and scroll to the card
    const url = `/dashboard?view=card&cardId=${userCardId}`
    router.push(url)
  }

  const openCardSettings = (card: Card) => {
    setSelectedCard(card)
    setNickname(card.nickname || '')
    setAfChargeMonth(card.afChargeMonth || '')
    setAfChargeDay(card.afChargeDay || '')
    setShowSettingsModal(true)
  }

  const closeCardSettings = () => {
    setShowSettingsModal(false)
    setSelectedCard(null)
    setNickname('')
    setAfChargeMonth('')
    setAfChargeDay('')
  }

  const saveCardSettings = async () => {
    if (!selectedCard) return

    try {
      await api.updateCardSettings(selectedCard.userCardId, {
        nickname: nickname.trim() === '' ? undefined : nickname.trim(),
        afChargeMonth: afChargeMonth === '' ? null : afChargeMonth,
        afChargeDay: afChargeDay === '' ? null : afChargeDay,
      })
      alert(language === 'zh-TW' ? '設定已儲存' : 'Settings saved successfully')
      closeCardSettings()
      await loadData()
    } catch (error) {
      console.error('Failed to save card settings:', error)
      alert(language === 'zh-TW' ? '儲存失敗' : 'Failed to save settings')
    }
  }

  const removeCard = async (userCardId: number, cardName: string) => {
    const confirmMessage = language === 'zh-TW'
      ? `確定要移除「${cardName}」的追蹤嗎？`
      : `Are you sure you want to stop tracking "${cardName}"?`

    if (!confirm(confirmMessage)) {
      return
    }

    try {
      await api.removeCard(userCardId)
      alert(t.removeSuccess)
      await loadData()
    } catch (error) {
      console.error('Failed to remove card:', error)
      alert(t.removeFailed)
    }
  }

  // 打開消費記錄 modal
  const openUsageModal = (benefit: UserBenefit) => {
    setSelectedBenefit(benefit)
    setUsageAmount('')
    setUsageDate(new Date().toISOString().split('T')[0]) // 預設今天
    setUsageNote('')
    setShowUsageModal(true)
  }

  // 關閉消費記錄 modal
  const closeUsageModal = () => {
    // 如果正在儲存中，不允許關閉
    if (isSavingUsage) {
      return
    }
    setShowUsageModal(false)
    setSelectedBenefit(null)
    setUsageAmount('')
    setUsageDate('')
    setUsageNote('')
  }

  // 儲存消費記錄
  const saveUsageRecord = async () => {
    if (!selectedBenefit || !usageAmount || !usageDate) {
      alert(language === 'zh-TW' ? '請填寫金額和日期' : 'Please fill in amount and date')
      return
    }

    // 防止重複提交
    if (isSavingUsage) {
      return
    }

    setIsSavingUsage(true)

    try {
      const token = localStorage.getItem('token')
      const year = new Date(usageDate).getFullYear()
      const userCardId = selectedBenefit.benefit.card.userCardId

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/benefits/${selectedBenefit.benefitId}/usage?year=${year}&userCardId=${userCardId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: Number(usageAmount),
          usedAt: usageDate,
          note: usageNote.trim() || null,
          userCardId: userCardId, // 加入 body 中
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('API Error:', errorData)
        throw new Error(errorData.error || 'Failed to save usage record')
      }

      alert(language === 'zh-TW' ? '消費記錄已儲存' : 'Usage record saved successfully')
      closeUsageModal()
      await loadData() // 重新載入資料
    } catch (error: any) {
      console.error('Failed to save usage record:', error)
      alert(language === 'zh-TW' ? `儲存失敗：${error.message}` : `Failed to save: ${error.message}`)
    } finally {
      setIsSavingUsage(false)
    }
  }

  // Generate color based on benefit status
  const getBenefitColor = (item: UserBenefit) => {
    // 3 colors based on benefit status
    if (item.isCompleted) {
      return '#E8F5E9' // Light Green - Completed
    } else if (item.usedAmount > 0) {
      return '#FFF9C4' // Light Yellow - In Progress
    } else {
      return '#E3F2FD' // Light Blue - Not Started
    }
  }

  // Scroll to left or right
  const scrollToLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ left: 0, behavior: 'smooth' })
    }
  }

  const scrollToRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        left: scrollContainerRef.current.scrollWidth,
        behavior: 'smooth'
      })
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        {t.loading}
      </div>
    )
  }

  return (
    <div style={{ padding: '1rem' }}>
      <h2 style={{ marginBottom: '1rem', fontSize: '1.5rem', fontWeight: 'bold' }}>
        {t.title}
      </h2>

      {data.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
          {t.noData}
        </div>
      ) : (
        <div>
          {/* Scroll buttons at the top */}
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            marginBottom: '0.5rem',
            justifyContent: 'flex-end'
          }}>
            <button
              onClick={scrollToLeft}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '2px solid #3b82f6',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                color: '#3b82f6',
                fontWeight: '600',
              }}
              aria-label="Scroll to left"
            >
              ←
            </button>
            <button
              onClick={scrollToRight}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '2px solid #3b82f6',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                color: '#3b82f6',
                fontWeight: '600',
              }}
              aria-label="Scroll to right"
            >
              →
            </button>
          </div>
          <div
            ref={scrollContainerRef}
            className="spreadsheet-container"
            style={{
              border: '1px solid #dee2e6',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              WebkitOverflowScrolling: 'touch',
            }}
          >
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          backgroundColor: 'white',
          fontSize: '0.75rem',
        }}>
          <thead>
            <tr style={{
              backgroundColor: '#f8f9fa',
              borderBottom: '2px solid #dee2e6',
            }}>
              <th style={{...headerCellStyle, position: 'sticky', left: 0, zIndex: 10, backgroundColor: '#f8f9fa', boxShadow: '2px 0 4px rgba(0,0,0,0.1)'}}>{t.cardName}</th>
              <th style={headerCellStyle}>{t.issuer}</th>
              <th style={headerCellStyle}>{t.annualFee}</th>
              <th style={headerCellStyle}>{t.afChargeDate}</th>
              <th style={headerCellStyle}>{t.benefitName}</th>
              <th style={headerCellStyle}>{t.totalAmount}</th>
              <th style={headerCellStyle}>{t.usedAmount}</th>
              <th style={headerCellStyle}>{t.remaining}</th>
              <th style={headerCellStyle}>{t.cycle}</th>
              <th style={headerCellStyle}>{t.periodEnd}</th>
              <th style={headerCellStyle}>{t.status}</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              // Group benefits by userCardId (to support multiple instances of the same card)
              const cardGroups = new Map<number, UserBenefit[]>()
              data.forEach(item => {
                const userCardId = item.benefit.card.userCardId
                if (!cardGroups.has(userCardId)) {
                  cardGroups.set(userCardId, [])
                }
                cardGroups.get(userCardId)!.push(item)
              })

              const rows: JSX.Element[] = []
              let globalIndex = 0
              let cardIndex = 0

              cardGroups.forEach((benefits) => {
                cardIndex++
                benefits.forEach((item, benefitIndex) => {
                  const remaining = item.benefit.totalAmount - (item.usedAmount || 0)
                  const rowStyle = {
                    ...bodyCellStyle,
                    backgroundColor: globalIndex % 2 === 0 ? 'white' : '#f8f9fa',
                  }

                  // Calculate rowSpan for card info (benefit rows + usage rows)
                  const totalCardRows = benefits.reduce((sum, b) => {
                    return sum + 1 + (b.usages?.length || 0)
                  }, 0)

                  const benefitColor = getBenefitColor(item)

                  rows.push(
                    <tr key={`benefit-${item.benefit.card.userCardId}-${item.benefitId}-${globalIndex}`} style={{ borderBottom: item.usages && item.usages.length > 0 ? 'none' : '1px solid #dee2e6' }}>
                      {benefitIndex === 0 && (
                        <>
                          <td
                            style={{
                              ...rowStyle,
                              verticalAlign: 'top',
                              position: 'sticky',
                              left: 0,
                              zIndex: 9,
                              backgroundColor: globalIndex % 2 === 0 ? 'white' : '#f8f9fa',
                              boxShadow: '2px 0 4px rgba(0,0,0,0.1)',
                            }}
                            rowSpan={totalCardRows}
                          >
                            <div style={{ position: 'relative' }}>
                              {/* 卡片編號徽章 */}
                              <span style={{
                                display: 'inline-block',
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                color: 'white',
                                fontSize: '0.7rem',
                                fontWeight: 'bold',
                                borderRadius: '50%',
                                width: '20px',
                                height: '20px',
                                lineHeight: '20px',
                                textAlign: 'center',
                                marginRight: '0.5rem',
                                boxShadow: '0 2px 4px rgba(102, 126, 234, 0.3)',
                                verticalAlign: 'middle'
                              }}>
                                {cardIndex}
                              </span>
                              <div
                                style={{
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                  color: '#3b82f6',
                                  textDecoration: 'underline',
                                  marginBottom: '0.5rem',
                                  display: 'inline'
                                }}
                                onClick={() => handleCardClick(item.benefit.card.userCardId)}
                              >
                                {item.benefit.card.name || '-'}
                                {!item.benefit.card.nickname && item.benefit.card.cardInstance && item.benefit.card.cardInstance > 1 && (
                                  <span style={{ fontSize: '0.75rem', color: '#6b7280', marginLeft: '0.5rem' }}>
                                    ({language === 'zh-TW' ? '卡片' : 'Card'} {item.benefit.card.cardInstance})
                                  </span>
                                )}
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {item.benefit.card.nickname && (
                                  <span style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: '500' }}>
                                    🏷️ {item.benefit.card.nickname}
                                  </span>
                                )}
                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-start' }}>
                                  <button
                                    onClick={() => openCardSettings(item.benefit.card)}
                                    style={{
                                      padding: '0.25rem 0.5rem',
                                      fontSize: '0.7rem',
                                      background: '#6b7280',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      whiteSpace: 'nowrap'
                                    }}
                                  >
                                    ⚙️ {t.settings}
                                  </button>
                                  <button
                                    onClick={() => removeCard(item.benefit.card.userCardId, item.benefit.card.name)}
                                    style={{
                                      padding: '0.25rem 0.5rem',
                                      fontSize: '0.7rem',
                                      background: '#ef4444',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      whiteSpace: 'nowrap'
                                    }}
                                  >
                                    🗑️ {t.remove}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td style={{ ...rowStyle, verticalAlign: 'top' }} rowSpan={totalCardRows}>
                            {item.benefit.card.issuer || '-'}
                          </td>
                          <td style={{ ...rowStyle, textAlign: 'right', verticalAlign: 'top' }} rowSpan={totalCardRows}>
                            {item.benefit.card.annualFee || '-'}
                          </td>
                          <td style={{ ...rowStyle, textAlign: 'center', verticalAlign: 'top' }} rowSpan={totalCardRows}>
                            {item.benefit.card.afChargeMonth && item.benefit.card.afChargeDay
                              ? `${item.benefit.card.afChargeMonth}/${item.benefit.card.afChargeDay}`
                              : '-'}
                          </td>
                        </>
                      )}
                      <td
                        style={{
                          ...rowStyle,
                          backgroundColor: benefitColor,
                          cursor: 'pointer',
                          fontWeight: '500',
                          color: '#2563eb',
                        }}
                        onClick={() => openUsageModal(item)}
                        title={t.clickToAddUsage}
                      >
                        {item.isCustom && '🎁 '}
                        {item.benefit.name || '-'}
                        <span style={{ marginLeft: '0.5rem', fontSize: '0.65rem', opacity: 0.7 }}>
                          📝
                        </span>
                      </td>
                      <td style={{ ...rowStyle, textAlign: 'right' }}>
                        {item.benefit.totalAmount != null
                          ? `${item.benefit.currency || ''} ${item.benefit.totalAmount.toFixed(2)}`
                          : '-'}
                      </td>
                      <td style={{ ...rowStyle, textAlign: 'right', color: '#495057' }}>
                        {item.benefit.currency || ''} {(item.usedAmount || 0).toFixed(2)}
                      </td>
                      <td style={{ ...rowStyle, textAlign: 'right', color: remaining > 0 ? '#dc3545' : '#6c757d', fontWeight: remaining > 0 ? '600' : '500' }}>
                        {item.benefit.currency || ''} {remaining.toFixed(2)}
                      </td>
                      <td style={rowStyle}>{getCycleLabel(item.benefit.cycleType, language)}</td>
                      <td style={rowStyle}>{formatPeriodEnd(item)}</td>
                      <td style={{
                        ...rowStyle,
                        color: item.isCompleted ? '#2e7d32' : (item.usedAmount > 0 ? '#e65100' : '#1565c0'),
                        fontWeight: '600'
                      }}>
                        {item.isCompleted ? t.completed : t.inProgress}
                      </td>
                    </tr>
                  )

                  // Add usage sub-rows
                  if (item.usages && item.usages.length > 0) {
                    item.usages.forEach((usage, usageIndex) => {
                      const isLastUsage = usageIndex === item.usages!.length - 1
                      const usageRowStyle = {
                        ...bodyCellStyle,
                        backgroundColor: benefitColor,
                        fontSize: '0.85rem',
                        color: '#6c757d',
                        paddingLeft: '2rem',
                      }

                      const borderStyle = isLastUsage ? '1px solid #dee2e6' : '1px solid #e9ecef'

                      rows.push(
                        <tr key={`${item.id}-usage-${usage.id}`}>
                          {/* Usage row spans across benefit columns only (card columns use rowSpan) */}
                          <td style={{ ...usageRowStyle, backgroundColor: benefitColor, borderBottom: borderStyle }} colSpan={2}>
                            └─ {new Date(usage.usedAt).toLocaleDateString()}
                          </td>
                          <td style={{ ...usageRowStyle, textAlign: 'right', backgroundColor: benefitColor, borderBottom: borderStyle }} colSpan={1}>
                            {item.benefit.currency} {usage.amount.toFixed(2)}
                          </td>
                          <td style={{ ...usageRowStyle, backgroundColor: benefitColor, borderBottom: borderStyle }} colSpan={4}>
                            {usage.note || '-'}
                          </td>
                        </tr>
                      )
                    })
                  }

                  globalIndex++
                })
              })

              return rows
            })()}
          </tbody>
        </table>
          </div>
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
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '2rem',
            borderRadius: '12px',
            width: '90%',
            maxWidth: '500px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
          }}>
            <h2 style={{ marginBottom: '1rem', color: 'var(--primary-color)' }}>
              📅 {language === 'zh-TW' ? '年費與卡片暱稱設定' : 'Card Settings'}
            </h2>
            <p style={{ marginBottom: '1.5rem', color: '#6b7280', fontSize: '0.9rem' }}>
              {language === 'zh-TW'
                ? `設定「${selectedCard.name}」的暱稱和年費收取日期`
                : `Set nickname and annual fee charge date for "${selectedCard.name}"`}
            </p>

            {/* Nickname */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                🏷️ {language === 'zh-TW' ? '卡片暱稱' : 'Card Nickname'}
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder={language === 'zh-TW' ? '輸入自訂暱稱（可選）' : 'Enter nickname (optional)'}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '1rem',
                }}
              />
            </div>

            {/* Annual Fee Charge Date */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                📅 {language === 'zh-TW' ? '年費收取日期' : 'Annual Fee Charge Date'}
              </label>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={afChargeMonth}
                  onChange={(e) => setAfChargeMonth(e.target.value === '' ? '' : parseInt(e.target.value))}
                  placeholder={language === 'zh-TW' ? '月' : 'Month'}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '1rem',
                  }}
                />
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={afChargeDay}
                  onChange={(e) => setAfChargeDay(e.target.value === '' ? '' : parseInt(e.target.value))}
                  placeholder={language === 'zh-TW' ? '日' : 'Day'}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '1rem',
                  }}
                />
              </div>
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={closeCardSettings}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#e5e7eb',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  color: '#374151'
                }}
              >
                {language === 'zh-TW' ? '取消' : 'Cancel'}
              </button>
              <button
                onClick={saveCardSettings}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'var(--primary-color)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '500',
                }}
              >
                {language === 'zh-TW' ? '儲存' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Usage Record Modal */}
      {showUsageModal && selectedBenefit && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '2rem',
            borderRadius: '12px',
            width: '90%',
            maxWidth: '500px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
          }}>
            <h2 style={{ marginBottom: '1rem', color: 'var(--primary-color)' }}>
              📝 {t.addUsageTitle}
            </h2>
            <p style={{ marginBottom: '1.5rem', color: '#6b7280', fontSize: '0.9rem' }}>
              {selectedBenefit.benefit.name}
              <br />
              <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                {selectedBenefit.benefit.card.name}
              </span>
            </p>

            {/* 使用日期 */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                📅 {t.usageDate}
              </label>
              <input
                type="date"
                value={usageDate}
                onChange={(e) => setUsageDate(e.target.value)}
                disabled={isSavingUsage}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  opacity: isSavingUsage ? 0.6 : 1,
                  cursor: isSavingUsage ? 'not-allowed' : 'text',
                }}
              />
            </div>

            {/* 消費金額 */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                💰 {t.usageAmount}
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#6b7280', fontWeight: '500' }}>
                  {selectedBenefit.benefit.currency || 'TWD'}
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={usageAmount}
                  onChange={(e) => setUsageAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  placeholder="0.00"
                  disabled={isSavingUsage}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    opacity: isSavingUsage ? 0.6 : 1,
                    cursor: isSavingUsage ? 'not-allowed' : 'text',
                  }}
                />
              </div>
              {selectedBenefit.benefit.totalAmount && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#6b7280' }}>
                  {language === 'zh-TW' ? '剩餘額度：' : 'Remaining: '}
                  {selectedBenefit.benefit.currency} {(selectedBenefit.benefit.totalAmount - (selectedBenefit.usedAmount || 0)).toFixed(2)}
                </div>
              )}
            </div>

            {/* 備註 */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                📝 {t.usageNote} ({language === 'zh-TW' ? '選填' : 'Optional'})
              </label>
              <textarea
                value={usageNote}
                onChange={(e) => setUsageNote(e.target.value)}
                placeholder={language === 'zh-TW' ? '例如：在某某餐廳用餐' : 'e.g., Dinner at restaurant'}
                rows={3}
                disabled={isSavingUsage}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  resize: 'vertical',
                  opacity: isSavingUsage ? 0.6 : 1,
                  cursor: isSavingUsage ? 'not-allowed' : 'text',
                }}
              />
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={closeUsageModal}
                disabled={isSavingUsage}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: isSavingUsage ? '#f3f4f6' : '#e5e7eb',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: isSavingUsage ? 'not-allowed' : 'pointer',
                  fontWeight: '500',
                  color: isSavingUsage ? '#9ca3af' : '#374151',
                  opacity: isSavingUsage ? 0.6 : 1,
                }}
              >
                {t.cancel}
              </button>
              <button
                onClick={saveUsageRecord}
                disabled={isSavingUsage}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: isSavingUsage ? '#9ca3af' : 'var(--primary-color)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: isSavingUsage ? 'not-allowed' : 'pointer',
                  fontWeight: '500',
                  opacity: isSavingUsage ? 0.6 : 1,
                }}
              >
                {isSavingUsage
                  ? (language === 'zh-TW' ? '儲存中...' : 'Saving...')
                  : t.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const headerCellStyle: React.CSSProperties = {
  padding: '0.4rem 0.5rem',
  textAlign: 'left',
  fontWeight: '600',
  fontSize: '0.7rem',
  color: '#495057',
  borderRight: '1px solid #dee2e6',
  whiteSpace: 'nowrap',
  backgroundColor: '#f8f9fa',
}

const bodyCellStyle: React.CSSProperties = {
  padding: '0.4rem 0.5rem',
  borderRight: '1px solid #dee2e6',
  whiteSpace: 'nowrap',
}
