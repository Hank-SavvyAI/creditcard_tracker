'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'

export default function AdminPage() {
  const router = useRouter()
  const [cards, setCards] = useState<any[]>([])
  const [banks, setBanks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchRegion, setSearchRegion] = useState('')
  const [searchBank, setSearchBank] = useState('')
  const [searchType, setSearchType] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'bank' | 'id' | 'priority'>('priority')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [isPriorityMode, setIsPriorityMode] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [priorityCards, setPriorityCards] = useState<any[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const skipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === 'true'
    const token = localStorage.getItem('token')

    if (!skipAuth && !token) {
      router.push('/')
      return
    }

    // Check if user is admin
    if (!skipAuth) {
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        const user = JSON.parse(storedUser)
        if (user.role !== 'ADMIN') {
          alert('無權限訪問管理員後台')
          router.push('/dashboard')
          return
        }
      } else {
        router.push('/')
        return
      }
    }

    loadCards()
  }, [router])

  async function loadCards() {
    try {
      const [cardsData, banksData] = await Promise.all([
        api.getCards(),
        api.getBanks()
      ])
      setCards(cardsData)
      setBanks(banksData)
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

  // 過濾和排序卡片
  const filteredCards = cards
    .filter((card) => {
      const regionMatch = !searchRegion || card.region === searchRegion
      const bankMatch = !searchBank || card.bank === searchBank
      const typeMatch = !searchType || card.type === searchType
      return regionMatch && bankMatch && typeMatch
    })
    .sort((a, b) => {
      let compareValue = 0

      if (sortBy === 'name') {
        compareValue = a.name.localeCompare(b.name)
      } else if (sortBy === 'bank') {
        compareValue = a.bank.localeCompare(b.bank)
      } else if (sortBy === 'priority') {
        compareValue = a.displayPriority - b.displayPriority
      } else {
        // sortBy === 'id'
        compareValue = a.id - b.id
      }

      return sortOrder === 'asc' ? compareValue : -compareValue
    })

  function handleSort(field: 'name' | 'bank' | 'id' | 'priority') {
    if (sortBy === field) {
      // 如果已經在排序這個欄位，切換順序
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      // 切換到新欄位，預設升序
      setSortBy(field)
      setSortOrder('asc')
    }
  }

  function enterPriorityMode() {
    // 進入優先順序調整模式，按照 displayPriority 排序
    const sorted = [...cards].sort((a, b) => a.displayPriority - b.displayPriority)
    setPriorityCards(sorted)
    setIsPriorityMode(true)
  }

  function exitPriorityMode() {
    setIsPriorityMode(false)
    setPriorityCards([])
    setDraggedIndex(null)
  }

  function handleDragStart(index: number) {
    setDraggedIndex(index)
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault()

    if (draggedIndex === null || draggedIndex === index) return

    const newCards = [...priorityCards]
    const draggedCard = newCards[draggedIndex]

    // Remove from old position
    newCards.splice(draggedIndex, 1)
    // Insert at new position
    newCards.splice(index, 0, draggedCard)

    setPriorityCards(newCards)
    setDraggedIndex(index)
  }

  function handleDragEnd() {
    setDraggedIndex(null)
  }

  async function savePriority() {
    setSaving(true)
    try {
      // Update displayPriority based on current order
      const updates = priorityCards.map((card, index) => ({
        id: card.id,
        displayPriority: index + 1
      }))

      await api.updateCardsPriority(updates)
      alert('順序已儲存')

      // Reload cards
      await loadCards()
      exitPriorityMode()
    } catch (err) {
      console.error('儲存失敗:', err)
      alert('儲存順序失敗')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="loading">載入中...</div>
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>🔧 管理員後台</h1>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Link href="/dashboard" className="btn btn-secondary">
            返回儀表板
          </Link>
          <Link href="/admin/users" className="btn btn-secondary">
            👥 用戶管理
          </Link>
          <Link href="/admin/stats" className="btn btn-secondary">
            📊 系統統計
          </Link>
          <button onClick={handleLogout} className="btn btn-secondary">
            登出
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {isPriorityMode ? (
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ marginBottom: '1rem', padding: '1rem', background: '#eff6ff', borderRadius: '8px', border: '1px solid #3b82f6' }}>
            <p style={{ margin: 0, color: '#1e40af' }}>
              💡 拖曳卡片以調整顯示順序，順序越前面的卡片在用戶介面中優先顯示
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={savePriority}
              disabled={saving}
              className="btn-primary"
              style={{ opacity: saving ? 0.6 : 1 }}
            >
              {saving ? '儲存中...' : '💾 儲存順序'}
            </button>
            <button
              onClick={exitPriorityMode}
              disabled={saving}
              className="btn btn-secondary"
            >
              ❌ 取消
            </button>
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Link href="/admin/cards/new" className="btn-primary">
            ➕ 新增信用卡
          </Link>
          <button onClick={enterPriorityMode} className="btn btn-secondary">
            🎯 調整顯示順序
          </button>
        </div>
      )}

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
            <option value="america">🇺🇸 美國</option>
            {/*
            <option value="taiwan">🇹🇼 台灣</option>
            <option value="canada">🇨🇦 加拿大</option>
            <option value="japan">🇯🇵 日本</option>
            <option value="singapore">🇸🇬 新加坡</option>
            <option value="other">🌏 其他</option>
            */}
          </select>
        </div>

        <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
          <label>銀行篩選</label>
          <select
            value={searchBank}
            onChange={(e) => setSearchBank(e.target.value)}
            style={{ width: '100%' }}
          >
            <option value="">全部銀行</option>
            {banks.map((bank) => (
              <option key={bank.value} value={bank.value}>
                {bank.label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
          <label>類型篩選</label>
          <select
            value={searchType}
            onChange={(e) => setSearchType(e.target.value)}
            style={{ width: '100%' }}
          >
            <option value="">全部類型</option>
            <option value="personal">💳 個人卡</option>
            <option value="business">🏢 商業卡</option>
          </select>
        </div>

        <button
          onClick={() => { setSearchRegion(''); setSearchBank(''); setSearchType('') }}
          className="btn btn-secondary"
          style={{ whiteSpace: 'nowrap' }}
        >
          清除篩選
        </button>
      </div>

      {isPriorityMode ? (
        <div className="priority-list">
          {priorityCards.map((card, index) => (
            <div
              key={card.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              style={{
                padding: '1rem',
                marginBottom: '0.5rem',
                background: draggedIndex === index ? '#f0f9ff' : 'white',
                border: draggedIndex === index ? '2px solid #3b82f6' : '2px solid #e5e7eb',
                borderRadius: '8px',
                cursor: 'grab',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                transition: 'all 0.2s ease',
                opacity: draggedIndex === index ? 0.5 : 1,
              }}
            >
              <div style={{
                fontSize: '1.5rem',
                color: '#9ca3af',
                minWidth: '2rem',
                textAlign: 'center',
              }}>
                ⋮⋮
              </div>
              <div style={{
                fontWeight: '600',
                minWidth: '3rem',
                fontSize: '1.1rem',
                color: '#3b82f6',
              }}>
                #{index + 1}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                  {card.name}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  {card.bank} •
                  {card.region === 'taiwan' && ' 🇹🇼 台灣'}
                  {card.region === 'america' && ' 🇺🇸 美國'}
                  {card.region === 'canada' && ' 🇨🇦 加拿大'}
                  {card.region === 'japan' && ' 🇯🇵 日本'}
                  {card.region === 'singapore' && ' 🇸🇬 新加坡'}
                  {card.region === 'other' && ' 🌏 其他'}
                  {' • '}{card.type === 'business' ? '🏢 商業卡' : '💳 個人卡'}
                </div>
              </div>
              <div style={{
                fontSize: '0.875rem',
                color: '#9ca3af',
                minWidth: '8rem',
                textAlign: 'right',
              }}>
                Priority: {card.displayPriority}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="admin-table-container">
          <h2>信用卡列表 ({filteredCards.length} / {cards.length})</h2>

          {filteredCards.length === 0 ? (
            <p>{cards.length === 0 ? '目前沒有任何信用卡' : '沒有符合條件的信用卡'}</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th
                    onClick={() => handleSort('id')}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                  >
                    ID {sortBy === 'id' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    onClick={() => handleSort('name')}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                  >
                    卡片名稱 {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    onClick={() => handleSort('bank')}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                  >
                    銀行 {sortBy === 'bank' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    onClick={() => handleSort('priority')}
                    style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                  >
                    顯示順序 {sortBy === 'priority' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th style={{ whiteSpace: 'nowrap' }}>年費</th>
                  <th style={{ whiteSpace: 'nowrap' }}>地區</th>
                  <th style={{ whiteSpace: 'nowrap' }}>類型</th>
                  <th style={{ whiteSpace: 'nowrap' }}>福利數量</th>
                  <th style={{ whiteSpace: 'nowrap' }}>狀態</th>
                  <th style={{ whiteSpace: 'nowrap' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredCards.map((card) => (
                  <tr key={card.id}>
                    <td>{card.id}</td>
                    <td>{card.name}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{card.bank}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{card.displayPriority}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{card.fee || '-'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {card.region === 'taiwan' && '🇹🇼 台灣'}
                      {card.region === 'america' && '🇺🇸 美國'}
                      {card.region === 'canada' && '🇨🇦 加拿大'}
                      {card.region === 'japan' && '🇯🇵 日本'}
                      {card.region === 'singapore' && '🇸🇬 新加坡'}
                      {card.region === 'other' && '🌏 其他'}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.85rem',
                        fontWeight: '500',
                        background: card.type === 'business' ? '#dbeafe' : '#fef3c7',
                        color: card.type === 'business' ? '#1e40af' : '#92400e',
                      }}>
                        {card.type === 'business' ? '🏢 商業卡' : '💳 個人卡'}
                      </span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>{card.benefits?.length || 0} 項</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span className={`status-badge ${card.isActive ? 'active' : 'inactive'}`}>
                        {card.isActive ? '啟用' : '停用'}
                      </span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
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
      )}
    </div>
  )
}
