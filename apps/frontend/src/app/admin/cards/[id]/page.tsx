'use client'

export const runtime = 'edge'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'

export default function EditCardPage() {
  const router = useRouter()
  const params = useParams()
  const cardId = parseInt(params.id as string)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [card, setCard] = useState<any>(null)
  const [formData, setFormData] = useState({
    name: '',
    nameEn: '',
    bank: '',
    bankEn: '',
    issuer: '',
    region: 'taiwan',
    type: 'personal',
    description: '',
    descriptionEn: '',
    photo: '',
    fee: '',
    isActive: true,
  })

  useEffect(() => {
    const skipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === 'true'
    const token = localStorage.getItem('token')

    if (!skipAuth && !token) {
      router.push('/')
      return
    }

    loadCard()
  }, [router, cardId])

  async function loadCard() {
    try {
      const cards = await api.getCards()
      const foundCard = cards.find((c: any) => c.id === cardId)
      if (foundCard) {
        setCard(foundCard)
        setFormData({
          name: foundCard.name || '',
          nameEn: foundCard.nameEn || '',
          bank: foundCard.bank || '',
          bankEn: foundCard.bankEn || '',
          issuer: foundCard.issuer || '',
          region: foundCard.region || 'taiwan',
          type: foundCard.type || 'personal',
          description: foundCard.description || '',
          descriptionEn: foundCard.descriptionEn || '',
          photo: foundCard.photo || '',
          fee: foundCard.fee || '',
          isActive: foundCard.isActive,
        })
      }
    } catch (error) {
      alert('載入失敗')
      console.error(error)
    } finally {
      setLoading(false)
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    try {
      await api.updateCard(cardId, formData)
      alert('更新成功！')
      router.push('/admin')
    } catch (error) {
      alert('更新失敗')
      console.error(error)
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteBenefit(benefitId: number) {
    if (!confirm('確定要刪除此福利嗎？')) return

    try {
      await api.deleteBenefit(benefitId)
      await loadCard()
      alert('刪除成功')
    } catch (error) {
      alert('刪除失敗')
      console.error(error)
    }
  }

  if (loading) {
    return <div className="loading">載入中...</div>
  }

  if (!card) {
    return <div className="dashboard">找不到此卡片</div>
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>✏️ 編輯信用卡</h1>
        <Link href="/admin" className="btn btn-secondary">
          返回
        </Link>
      </div>

      <div className="form-container">
        <form onSubmit={handleSubmit} className="card-form">
          <div className="form-section">
            <h3>基本資訊</h3>

            <div className="form-group">
              <label>卡片名稱 (中文) *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>卡片名稱 (英文)</label>
              <input
                type="text"
                name="nameEn"
                value={formData.nameEn}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>銀行名稱 (中文) *</label>
              <input
                type="text"
                name="bank"
                value={formData.bank}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>銀行名稱 (英文)</label>
              <input
                type="text"
                name="bankEn"
                value={formData.bankEn}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>發卡機構</label>
              <input
                type="text"
                name="issuer"
                value={formData.issuer}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>地區 *</label>
              <select
                name="region"
                value={formData.region}
                onChange={handleChange}
                required
              >
                <option value="america">🇺🇸 美國 America</option>
                {/*
                <option value="taiwan">🇹🇼 台灣 Taiwan</option>
                <option value="canada">🇨🇦 加拿大 Canada</option>
                <option value="japan">🇯🇵 日本 Japan</option>
                <option value="singapore">🇸🇬 新加坡 Singapore</option>
                <option value="other">🌏 其他 Other</option>
                */}
              </select>
            </div>

            <div className="form-group">
              <label>卡片類型 *</label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                required
              >
                <option value="personal">💳 個人卡 Personal Card</option>
                <option value="business">🏢 商業卡 Business Card</option>
              </select>
            </div>

            <div className="form-group">
              <label>年費</label>
              <input
                type="text"
                name="fee"
                value={formData.fee}
                onChange={handleChange}
                placeholder="例如：NT$ 3,000 / 首年免年費 / 免年費"
              />
            </div>
          </div>

          <div className="form-section">
            <h3>詳細說明</h3>

            <div className="form-group">
              <label>卡片描述 (中文)</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
              />
            </div>

            <div className="form-group">
              <label>卡片描述 (英文)</label>
              <textarea
                name="descriptionEn"
                value={formData.descriptionEn}
                onChange={handleChange}
                rows={3}
              />
            </div>

            <div className="form-group">
              <label>卡片圖片 URL</label>
              <input
                type="text"
                name="photo"
                value={formData.photo}
                onChange={handleChange}
                placeholder="例如：/images/cards/card-name.png"
              />
              {formData.photo && (
                <div style={{ marginTop: '0.5rem' }}>
                  <img
                    src={formData.photo}
                    alt="卡片預覽"
                    style={{
                      maxWidth: '200px',
                      height: 'auto',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      padding: '0.5rem'
                    }}
                    onError={(e) => {
                      console.error('圖片載入失敗:', formData.photo);
                      e.currentTarget.style.border = '2px solid red';
                      e.currentTarget.alt = '⚠️ 圖片載入失敗 - 請檢查 URL 是否正確';
                    }}
                    onLoad={() => {
                      console.log('圖片載入成功:', formData.photo);
                    }}
                  />
                  <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>
                    <strong>圖片 URL:</strong> {formData.photo}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#999', marginTop: '0.25rem' }}>
                    💡 Cloudflare 圖片 URL 格式: https://imagedelivery.net/[account-hash]/[image-id]/public
                  </div>
                </div>
              )}
            </div>

            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                />
                <span>啟用此卡片</span>
              </label>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? '儲存中...' : '儲存變更'}
            </button>
            <Link href="/admin" className="btn btn-secondary">
              取消
            </Link>
          </div>
        </form>

        {/* 福利列表 */}
        <div className="form-section" style={{ marginTop: '3rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>福利項目 ({card.benefits?.length || 0})</h3>
            <Link href={`/admin/cards/${cardId}/benefits/new`} className="btn-primary btn-sm">
              ➕ 新增福利
            </Link>
          </div>

          {card.benefits && card.benefits.length > 0 ? (
            <table className="admin-table" style={{ marginTop: '1rem' }}>
              <thead>
                <tr>
                  <th style={{ width: '30%' }}>福利名稱</th>
                  <th style={{ width: '15%' }}>金額</th>
                  <th style={{ width: '15%' }}>頻率</th>
                  <th style={{ width: '12%' }}>狀態</th>
                  <th style={{ width: '28%' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {card.benefits.map((benefit: any) => (
                  <tr key={benefit.id}>
                    <td style={{ wordWrap: 'break-word', whiteSpace: 'normal' }}>{benefit.title}</td>
                    <td>
                      {benefit.amount ? `${benefit.currency} ${benefit.amount}` : '-'}
                    </td>
                    <td>{benefit.frequency}</td>
                    <td>
                      <span className={`status-badge ${benefit.isActive ? 'active' : 'inactive'}`}>
                        {benefit.isActive ? '啟用' : '停用'}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <Link
                          href={`/admin/cards/${cardId}/benefits/${benefit.id}`}
                          className="btn-sm btn-edit"
                        >
                          編輯
                        </Link>
                        <button
                          onClick={() => handleDeleteBenefit(benefit.id)}
                          className="btn-sm btn-delete"
                        >
                          刪除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ marginTop: '1rem', color: 'var(--foreground-light)' }}>
              尚未新增任何福利項目
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
