'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'

export default function NewCardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    nameEn: '',
    bank: '',
    bankEn: '',
    issuer: '',
    region: 'taiwan',
    description: '',
    descriptionEn: '',
    photo: '',
    isActive: true,
  })

  useEffect(() => {
    const skipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === 'true'
    const token = localStorage.getItem('token')

    if (!skipAuth && !token) {
      router.push('/')
      return
    }
  }, [router])

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
    setLoading(true)

    try {
      await api.createCard(formData)
      alert('新增成功！')
      router.push('/admin')
    } catch (error) {
      alert('新增失敗')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>➕ 新增信用卡</h1>
        <Link href="/admin" className="btn btn-secondary">
          返回
        </Link>
      </div>

      <div className="form-container">
        <form onSubmit={handleSubmit} className="card-form">
          <div className="form-section">
            <h3>基本資訊</h3>

            <div className="form-group">
              <label>卡片名稱 (繁中) *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="例：台新銀行 @GoGo 卡"
              />
            </div>

            <div className="form-group">
              <label>卡片名稱 (英文)</label>
              <input
                type="text"
                name="nameEn"
                value={formData.nameEn}
                onChange={handleChange}
                placeholder="Taishin @GoGo Card"
              />
            </div>

            <div className="form-group">
              <label>銀行名稱 (繁中) *</label>
              <input
                type="text"
                name="bank"
                value={formData.bank}
                onChange={handleChange}
                required
                placeholder="例：台新銀行"
              />
            </div>

            <div className="form-group">
              <label>銀行名稱 (英文)</label>
              <input
                type="text"
                name="bankEn"
                value={formData.bankEn}
                onChange={handleChange}
                placeholder="Taishin Bank"
              />
            </div>

            <div className="form-group">
              <label>發卡機構</label>
              <input
                type="text"
                name="issuer"
                value={formData.issuer}
                onChange={handleChange}
                placeholder="Visa / MasterCard / JCB"
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
                <option value="taiwan">🇹🇼 台灣 Taiwan</option>
                <option value="america">🇺🇸 美國 America</option>
                <option value="canada">🇨🇦 加拿大 Canada</option>
                <option value="japan">🇯🇵 日本 Japan</option>
                <option value="singapore">🇸🇬 新加坡 Singapore</option>
                <option value="other">🌏 其他 Other</option>
              </select>
            </div>
          </div>

          <div className="form-section">
            <h3>詳細說明</h3>

            <div className="form-group">
              <label>卡片描述 (繁中)</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                placeholder="簡短描述這張卡的特色"
              />
            </div>

            <div className="form-group">
              <label>卡片描述 (英文)</label>
              <textarea
                name="descriptionEn"
                value={formData.descriptionEn}
                onChange={handleChange}
                rows={3}
                placeholder="Brief description of the card"
              />
            </div>

            <div className="form-group">
              <label>卡片圖片 URL</label>
              <input
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
                      e.currentTarget.style.display = 'none'
                    }}
                  />
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
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? '新增中...' : '新增卡片'}
            </button>
            <Link href="/admin" className="btn btn-secondary">
              取消
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
