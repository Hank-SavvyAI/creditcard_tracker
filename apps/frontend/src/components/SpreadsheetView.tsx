'use client'

import { useState, useEffect } from 'react'
import { useLanguageStore } from '@/store/language'
import { calculatePeriodEnd, formatDate, getCycleLabel } from '@/lib/dateUtils'

interface Card {
  id: number
  name: string
  issuer: string
  annualFee: number
  currency: string
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
  benefit: Benefit & { card: Card }
}

export default function SpreadsheetView() {
  const { language } = useLanguageStore()
  const [data, setData] = useState<UserBenefit[]>([])
  const [loading, setLoading] = useState(true)

  const translations = {
    'zh-TW': {
      title: '📊 信用卡福利總覽',
      cardName: '卡片名稱',
      issuer: '發卡銀行',
      annualFee: '年費',
      benefitName: '福利項目',
      totalAmount: '總額度',
      usedAmount: '已使用',
      remaining: '剩餘',
      cycle: '週期',
      periodEnd: '到期日',
      status: '狀態',
      completed: '✅ 已完成',
      inProgress: '⏳ 進行中',
      monthly: '每月',
      quarterly: '每季',
      yearly: '每年',
      oneTime: '一次性',
      loading: '載入中...',
      noData: '尚無資料',
      usageDate: '消費日期',
      usageAmount: '消費金額',
      usageNote: '備註',
    },
    en: {
      title: '📊 Credit Card Benefits Overview',
      cardName: 'Card Name',
      issuer: 'Issuer',
      annualFee: 'Annual Fee',
      benefitName: 'Benefit',
      totalAmount: 'Total Amount',
      usedAmount: 'Used',
      remaining: 'Remaining',
      cycle: 'Cycle',
      periodEnd: 'Period End',
      status: 'Status',
      completed: '✅ Completed',
      inProgress: '⏳ In Progress',
      monthly: 'Monthly',
      quarterly: 'Quarterly',
      yearly: 'Yearly',
      oneTime: 'One-time',
      loading: 'Loading...',
      noData: 'No data available',
      usageDate: 'Usage Date',
      usageAmount: 'Usage Amount',
      usageNote: 'Note',
    },
  }

  const t = translations[language]

  useEffect(() => {
    loadData()
  }, [])

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
            // Only show benefits that have userBenefit records
            if (benefit.userBenefits && benefit.userBenefits.length > 0) {
              const userBenefit = benefit.userBenefits[0]

              // Load usages for this benefit
              let usages: BenefitUsage[] = []
              if (benefit.amount && benefit.amount > 0) {
                try {
                  const usageResponse = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL}/api/benefits/${benefit.id}/usage?year=${year}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                  )
                  if (usageResponse.ok) {
                    const usageData = await usageResponse.json()
                    usages = usageData.usages || []
                  }
                } catch (err) {
                  console.error('Failed to load usages for benefit:', benefit.id, err)
                }
              }

              allBenefits.push({
                id: userBenefit.id,
                benefitId: benefit.id,
                year: userBenefit.year,
                cycleNumber: userBenefit.cycleNumber,
                periodEnd: userBenefit.periodEnd,
                isCompleted: userBenefit.isCompleted,
                usedAmount: userBenefit.usedAmount || 0,
                usages,
                benefit: {
                  id: benefit.id,
                  name: language === 'zh-TW' ? benefit.title : (benefit.titleEn || benefit.title),
                  totalAmount: benefit.amount || 0,
                  currency: benefit.currency,
                  cycleType: benefit.frequency,
                  endMonth: benefit.endMonth,
                  endDay: benefit.endDay,
                  card: {
                    id: userCard.card.id,
                    name: language === 'zh-TW' ? userCard.card.name : (userCard.card.nameEn || userCard.card.name),
                    issuer: language === 'zh-TW' ? userCard.card.issuer : (userCard.card.issuerEn || userCard.card.issuer),
                    annualFee: userCard.card.annualFee,
                    currency: userCard.card.currency,
                  },
                } as any,
              })
            }
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

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        {t.loading}
      </div>
    )
  }

  return (
    <div style={{ padding: '1rem', overflowX: 'auto' }}>
      <h2 style={{ marginBottom: '1rem', fontSize: '1.5rem', fontWeight: 'bold' }}>
        {t.title}
      </h2>

      {data.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
          {t.noData}
        </div>
      ) : (
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          backgroundColor: 'white',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          fontSize: '0.9rem',
        }}>
          <thead>
            <tr style={{
              backgroundColor: '#f8f9fa',
              borderBottom: '2px solid #dee2e6',
            }}>
              <th style={headerCellStyle}>{t.cardName}</th>
              <th style={headerCellStyle}>{t.issuer}</th>
              <th style={headerCellStyle}>{t.annualFee}</th>
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
              // Group benefits by card
              const cardGroups = new Map<number, UserBenefit[]>()
              data.forEach(item => {
                const cardId = item.benefit.card.id
                if (!cardGroups.has(cardId)) {
                  cardGroups.set(cardId, [])
                }
                cardGroups.get(cardId)!.push(item)
              })

              const rows: JSX.Element[] = []
              let globalIndex = 0

              cardGroups.forEach((benefits, cardId) => {
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

                  rows.push(
                    <tr key={item.id} style={{ borderBottom: item.usages && item.usages.length > 0 ? 'none' : '1px solid #dee2e6' }}>
                      {benefitIndex === 0 && (
                        <>
                          <td style={{ ...rowStyle, verticalAlign: 'top', fontWeight: '600' }} rowSpan={totalCardRows}>
                            {item.benefit.card.name || '-'}
                          </td>
                          <td style={{ ...rowStyle, verticalAlign: 'top' }} rowSpan={totalCardRows}>
                            {item.benefit.card.issuer || '-'}
                          </td>
                          <td style={{ ...rowStyle, textAlign: 'right', verticalAlign: 'top' }} rowSpan={totalCardRows}>
                            {item.benefit.card.annualFee != null
                              ? `${item.benefit.card.currency || ''} ${item.benefit.card.annualFee.toFixed(2)}`
                              : '-'}
                          </td>
                        </>
                      )}
                      <td style={rowStyle}>{item.benefit.name || '-'}</td>
                      <td style={{ ...rowStyle, textAlign: 'right' }}>
                        {item.benefit.totalAmount != null
                          ? `${item.benefit.currency || ''} ${item.benefit.totalAmount.toFixed(2)}`
                          : '-'}
                      </td>
                      <td style={{ ...rowStyle, textAlign: 'right', color: '#dc3545' }}>
                        {item.benefit.currency || ''} {(item.usedAmount || 0).toFixed(2)}
                      </td>
                      <td style={{ ...rowStyle, textAlign: 'right', color: remaining > 0 ? '#28a745' : '#6c757d', fontWeight: '500' }}>
                        {item.benefit.currency || ''} {remaining.toFixed(2)}
                      </td>
                      <td style={rowStyle}>{getCycleLabel(item.benefit.cycleType, language)}</td>
                      <td style={rowStyle}>{formatPeriodEnd(item)}</td>
                      <td style={rowStyle}>
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
                        backgroundColor: globalIndex % 2 === 0 ? '#f8f9fa' : 'white',
                        fontSize: '0.85rem',
                        color: '#6c757d',
                        paddingLeft: '2rem',
                      }

                      rows.push(
                        <tr key={`${item.id}-usage-${usage.id}`} style={{ borderBottom: isLastUsage ? '1px solid #dee2e6' : '1px solid #e9ecef' }}>
                          <td style={usageRowStyle} colSpan={1}>
                            └─ {new Date(usage.usedAt).toLocaleDateString()}
                          </td>
                          <td style={{ ...usageRowStyle, textAlign: 'right' }} colSpan={1}>
                            {item.benefit.currency} {usage.amount.toFixed(2)}
                          </td>
                          <td style={usageRowStyle} colSpan={1}>
                            {usage.note || '-'}
                          </td>
                          <td style={usageRowStyle} colSpan={4}></td>
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
      )}
    </div>
  )
}

const headerCellStyle: React.CSSProperties = {
  padding: '0.75rem',
  textAlign: 'left',
  fontWeight: '600',
  fontSize: '0.85rem',
  color: '#495057',
  borderRight: '1px solid #dee2e6',
  whiteSpace: 'nowrap',
}

const bodyCellStyle: React.CSSProperties = {
  padding: '0.75rem',
  borderRight: '1px solid #dee2e6',
  whiteSpace: 'nowrap',
}
