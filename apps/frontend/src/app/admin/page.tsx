'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'

export default function AdminPage() {
  const router = useRouter()
  const [cards, setCards] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchRegion, setSearchRegion] = useState('')
  const [searchBank, setSearchBank] = useState('')

  useEffect(() => {
    const skipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === 'true'
    const token = localStorage.getItem('token')

    if (!skipAuth && !token) {
      router.push('/')
      return
    }
    loadCards()
  }, [router])

  async function loadCards() {
    try {
      const data = await api.getCards()
      setCards(data)
    } catch (err) {
      setError('載入失敗')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(cardId: number, cardName: string) {
    if (!confirm(`確定要刪除「${cardName}」嗎？此操作無法復原。`)) {
      return
    }

    try {
      await api.deleteCard(cardId)
      setCards(cards.filter(c => c.id !== cardId))
      alert('刪除成功')
    } catch (err) {
      alert('刪除失敗')
      console.error(err)
    }
  }

  function handleLogout() {
    localStorage.removeItem('token')
    router.push('/')
  }

  // 過濾卡片
  const filteredCards = cards.filter((card) => {
    const regionMatch = !searchRegion || card.region === searchRegion
    const bankMatch = !searchBank || card.bank.toLowerCase().includes(searchBank.toLowerCase())
    return regionMatch && bankMatch
  })

  if (loading) {
    return <div className="loading">載入中...</div>
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>🔧 管理員後台</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Link href="/dashboard" className="btn btn-secondary">
            返回儀表板
          </Link>
          <Link href="/admin/users" className="btn btn-secondary">
            👥 用戶管理
          </Link>
          <button onClick={handleLogout} className="btn btn-secondary">
            登出
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div style={{ marginBottom: '2rem' }}>
        <Link href="/admin/cards/new" className="btn-primary">
          ➕ 新增信用卡
        </Link>
      </div>

      {/* 搜尋區域 */}
      <div className="admin-search-bar" style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'end' }}>
        <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
          <label>地區篩選</label>
          <select
            value={searchRegion}
            onChange={(e) => setSearchRegion(e.target.value)}
            style={{ width: '100%' }}
          >
            <option value="">全部地區</option>
            <option value="taiwan">🇹🇼 台灣</option>
            <option value="america">🇺🇸 美國</option>
            <option value="canada">🇨🇦 加拿大</option>
            <option value="japan">🇯🇵 日本</option>
            <option value="singapore">🇸🇬 新加坡</option>
            <option value="other">🌏 其他</option>
          </select>
        </div>

        <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
          <label>銀行搜尋</label>
          <input
            type="text"
            value={searchBank}
            onChange={(e) => setSearchBank(e.target.value)}
            placeholder="輸入銀行名稱..."
            style={{ width: '100%' }}
          />
        </div>

        <button
          onClick={() => { setSearchRegion(''); setSearchBank('') }}
          className="btn btn-secondary"
          style={{ whiteSpace: 'nowrap' }}
        >
          清除篩選
        </button>
      </div>

      <div className="admin-table-container">
        <h2>信用卡列表 ({filteredCards.length} / {cards.length})</h2>

        {filteredCards.length === 0 ? (
          <p>{cards.length === 0 ? '目前沒有任何信用卡' : '沒有符合條件的信用卡'}</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>卡片名稱</th>
                <th>銀行</th>
                <th>地區</th>
                <th>福利數量</th>
                <th>狀態</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredCards.map((card) => (
                <tr key={card.id}>
                  <td>{card.id}</td>
                  <td>{card.name}</td>
                  <td>{card.bank}</td>
                  <td>
                    {card.region === 'taiwan' && '🇹🇼 台灣'}
                    {card.region === 'america' && '🇺🇸 美國'}
                    {card.region === 'canada' && '🇨🇦 加拿大'}
                    {card.region === 'japan' && '🇯🇵 日本'}
                    {card.region === 'singapore' && '🇸🇬 新加坡'}
                    {card.region === 'other' && '🌏 其他'}
                  </td>
                  <td>{card.benefits?.length || 0} 項</td>
                  <td>
                    <span className={`status-badge ${card.isActive ? 'active' : 'inactive'}`}>
                      {card.isActive ? '啟用' : '停用'}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <Link
                        href={`/admin/cards/${card.id}`}
                        className="btn-sm btn-edit"
                      >
                        編輯
                      </Link>
                      <button
                        onClick={() => handleDelete(card.id, card.name)}
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
        )}
      </div>
    </div>
  )
}
