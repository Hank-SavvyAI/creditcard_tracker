/**
 * useDataManager Hook
 *
 * 提供一個簡單的 React Hook 來使用 DataManager
 * 自動根據登入狀態創建和管理 DataManager 實例
 */

import { useEffect, useState, useRef } from 'react'
import { DataManager } from '@/lib/dataProvider'

/**
 * useDataManager Hook
 *
 * @param isLoggedIn 用戶是否已登入
 * @returns DataManager 實例或 null（SSR 時）
 *
 * @example
 * ```tsx
 * const Dashboard = () => {
 *   const isLoggedIn = !!localStorage.getItem('token')
 *   const dataManager = useDataManager(isLoggedIn)
 *
 *   if (!dataManager) return <div>載入中...</div>
 *
 *   const loadCards = async () => {
 *     const cards = await dataManager.getMyCards()
 *     setCards(cards)
 *   }
 *
 *   return (
 *     <div>
 *       {dataManager.isLocalMode && (
 *         <div>您正在使用本地模式，登入後可同步到雲端</div>
 *       )}
 *       ...
 *     </div>
 *   )
 * }
 * ```
 */
export function useDataManager(isLoggedIn: boolean): DataManager | null {
  // 使用 state 來確保只在 client 端創建 DataManager
  const [dataManager, setDataManager] = useState<DataManager | null>(null)
  const isLoggedInRef = useRef(isLoggedIn)

  useEffect(() => {
    // 只在 client 端創建 DataManager
    if (typeof window === 'undefined') return

    // 如果 isLoggedIn 狀態改變，重新創建 DataManager
    if (!dataManager || isLoggedInRef.current !== isLoggedIn) {
      isLoggedInRef.current = isLoggedIn
      setDataManager(new DataManager(isLoggedIn))
    }
  }, [isLoggedIn, dataManager])

  // SSR 時返回 null
  return dataManager
}

/**
 * useLocalDataCount Hook
 *
 * 獲取本地存儲的卡片數量（用於提示用戶同步）
 *
 * @returns 本地卡片數量
 *
 * @example
 * ```tsx
 * const Header = () => {
 *   const localCardCount = useLocalDataCount()
 *
 *   return (
 *     <div>
 *       {localCardCount > 0 && (
 *         <div>您有 {localCardCount} 張卡片未同步</div>
 *       )}
 *     </div>
 *   )
 * }
 * ```
 */
export function useLocalDataCount(): number {
  const [count, setCount] = useState(0)

  useEffect(() => {
    // 只在 client 端執行
    if (typeof window === 'undefined') return

    const { LocalStorageProvider } = require('@/lib/dataProvider')
    const localProvider = new LocalStorageProvider()

    localProvider.getMyCards().then((cards: any[]) => {
      setCount(cards.length)
    }).catch((error: Error) => {
      console.error('Failed to get local card count:', error)
      setCount(0)
    })
  }, [])

  return count
}
