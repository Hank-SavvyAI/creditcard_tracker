'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'

export const runtime = 'edge'

export default function NewBenefitPage() {
  const router = useRouter()
  const params = useParams()
  const cardId = parseInt(params.id as string)

  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<Array<{ zh: string; en: string }>>([])
  const [formData, setFormData] = useState({
    category: '',
    categoryEn: '',
    title: '',
    titleEn: '',
    description: '',
    descriptionEn: '',
    amount: '',
    currency: 'TWD',
    frequency: 'YEARLY',
    startMonth: '',
    startDay: '',
    endMonth: '',
    endDay: '',
    reminderDays: '30',
    notifiable: true,
    isPersonalCycle: false,
    isActive: true,
  })

  useEffect(() => {
    const skipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === 'true'
    const token = localStorage.getItem('token')

    if (!skipAuth && !token) {
      router.push('/')
      return
    }

    // Load existing categories
    loadCategories()
  }, [router])

  async function loadCategories() {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/benefit-categories`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      if (response.ok) {
        const data = await response.json()
        setCategories(data)
      }
    } catch (error) {
      console.error('Failed to load categories:', error)
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked

    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    })
  }

  function handleCategoryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value

    // Check if selected value matches an existing category
    const matchedCategory = categories.find(cat => cat.zh === value)

    setFormData({
      ...formData,
      category: value,
      // Auto-fill English category if matched
      categoryEn: matchedCategory ? matchedCategory.en : formData.categoryEn,
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      // 準備資料，處理空值
      const data: any = {
        category: formData.category,
        categoryEn: formData.categoryEn || null,
        title: formData.title,
        titleEn: formData.titleEn || null,
        description: formData.description,
        descriptionEn: formData.descriptionEn || null,
        amount: formData.amount ? parseFloat(formData.amount) : null,
        currency: formData.currency,
        frequency: formData.frequency,
        startMonth: formData.startMonth ? parseInt(formData.startMonth) : null,
        startDay: formData.startDay ? parseInt(formData.startDay) : null,
        endMonth: formData.endMonth ? parseInt(formData.endMonth) : null,
        endDay: formData.endDay ? parseInt(formData.endDay) : null,
        reminderDays: parseInt(formData.reminderDays),
        notifiable: formData.notifiable,
        isActive: formData.isActive,
      }

      await api.createBenefit(cardId, data)
      alert('新增成功！')
      router.push(`/admin/cards/${cardId}`)
    } catch (error) {
      alert('新增失敗: ' + (error as Error).message)
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>➕ 新增福利項目</h1>
        <Link href={`/admin/cards/${cardId}`} className="btn btn-secondary">
          返回
        </Link>
      </div>

      <div className="form-container">
        <form onSubmit={handleSubmit} className="card-form">
          <div className="form-section">
            <h3>基本資訊</h3>

            <div className="form-group">
              <label>福利類別 (繁中) *</label>
              <input
                type="text"
                name="category"
                list="category-suggestions"
                value={formData.category}
                onChange={handleCategoryChange}
                required
                placeholder="例：現金回饋（可選擇或手動輸入）"
              />
              <datalist id="category-suggestions">
                {categories.map((cat, index) => (
                  <option key={index} value={cat.zh} />
                ))}
              </datalist>
              {categories.length > 0 && (
                <small style={{ color: '#666' }}>
                  💡 已有 {categories.length} 個類別可供選擇，或輸入新類別
                </small>
              )}
            </div>

            <div className="form-group">
              <label>福利類別 (英文)</label>
              <input
                type="text"
                name="categoryEn"
                value={formData.categoryEn}
                onChange={handleChange}
                placeholder="Cash Back"
              />
              {formData.category && categories.find(cat => cat.zh === formData.category) && (
                <small style={{ color: '#10b981' }}>
                  ✓ 已自動填入對應的英文類別
                </small>
              )}
            </div>

            <div className="form-group">
              <label>福利標題 (繁中) *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                placeholder="例：網購 3% 回饋"
              />
            </div>

            <div className="form-group">
              <label>福利標題 (英文)</label>
              <input
                type="text"
                name="titleEn"
                value={formData.titleEn}
                onChange={handleChange}
                placeholder="3% cashback on online shopping"
              />
            </div>

            <div className="form-group">
              <label>詳細說明 (繁中) *</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows={3}
                placeholder="詳細描述此福利的條件和限制"
              />
            </div>

            <div className="form-group">
              <label>詳細說明 (英文)</label>
              <textarea
                name="descriptionEn"
                value={formData.descriptionEn}
                onChange={handleChange}
                rows={3}
                placeholder="Detailed description of the benefit"
              />
            </div>
          </div>

          <div className="form-section">
            <h3>回饋設定</h3>

            <div className="form-group">
              <label>回饋金額 / 上限</label>
              <input
                type="number"
                step="0.01"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                placeholder="例：800"
              />
              <small>若無固定金額可留空</small>
            </div>

            <div className="form-group">
              <label>幣別 *</label>
              <select
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                required
              >
                <option value="TWD">TWD - 新台幣</option>
                <option value="USD">USD - 美元</option>
                <option value="CAD">CAD - 加幣</option>
                <option value="JPY">JPY - 日圓</option>
                <option value="SGD">SGD - 新加坡幣</option>
                <option value="POINTS">POINTS - 積分</option>
              </select>
            </div>

            <div className="form-group">
              <label>頻率 *</label>
              <select
                name="frequency"
                value={formData.frequency}
                onChange={handleChange}
                required
              >
                <option value="MONTHLY">每月</option>
                <option value="QUARTERLY">每季</option>
                <option value="SEMI_ANNUALLY">每半年</option>
                <option value="YEARLY">每年</option>
                <option value="ONE_TIME">一次性</option>
              </select>
            </div>
          </div>

          <div className="form-section">
            <h3>時間設定</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>開始月份 (1-12)</label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  name="startMonth"
                  value={formData.startMonth}
                  onChange={handleChange}
                  placeholder="例：1"
                />
              </div>

              <div className="form-group">
                <label>開始日期 (1-31)</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  name="startDay"
                  value={formData.startDay}
                  onChange={handleChange}
                  placeholder="例：1"
                />
              </div>

              <div className="form-group">
                <label>結束月份 (1-12)</label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  name="endMonth"
                  value={formData.endMonth}
                  onChange={handleChange}
                  placeholder="例：12"
                />
              </div>

              <div className="form-group">
                <label>結束日期 (1-31)</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  name="endDay"
                  value={formData.endDay}
                  onChange={handleChange}
                  placeholder="例：31"
                />
              </div>
            </div>

            <div className="form-group">
              <label>提醒天數 *</label>
              <input
                type="number"
                min="1"
                name="reminderDays"
                value={formData.reminderDays}
                onChange={handleChange}
                required
                placeholder="例：30"
              />
              <small>在截止日前幾天提醒</small>
            </div>

            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  name="notifiable"
                  checked={formData.notifiable}
                  onChange={handleChange}
                />
                <span>需要通知提醒</span>
              </label>
              <small style={{ marginLeft: '1.5rem', color: '#666' }}>
                關閉後，此福利不會顯示通知設定選項（適用於無時效性的永久福利）
              </small>
            </div>

            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  name="isPersonalCycle"
                  checked={formData.isPersonalCycle}
                  onChange={handleChange}
                />
                <span>依用戶個人日期計算週期</span>
              </label>
              <small style={{ marginLeft: '1.5rem', color: '#666' }}>
                勾選後，每個用戶需要自行設定此福利的起始日期（例如：開卡日、首次使用日）<br />
                適用於：年費減免、週年禮、首年優惠等
              </small>
            </div>

            {formData.isPersonalCycle && (
              <div style={{
                padding: '1rem',
                background: '#e3f2fd',
                border: '1px solid #2196f3',
                borderRadius: '8px',
                marginTop: '1rem',
                fontSize: '0.9rem'
              }}>
                ℹ️ 此福利已設為個人化週期。用戶在追蹤此卡片時，需要輸入起始日期。
              </div>
            )}

            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                />
                <span>啟用此福利</span>
              </label>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? '新增中...' : '新增福利'}
            </button>
            <Link href={`/admin/cards/${cardId}`} className="btn btn-secondary">
              取消
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
