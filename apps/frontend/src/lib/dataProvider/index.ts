/**
 * DataProvider 模組導出
 *
 * 統一導出所有 DataProvider 相關的類別和介面
 */

// 介面和類型
export * from './interface'

// Provider 實作
export { LocalStorageProvider } from './localProvider'
export { CloudApiProvider } from './cloudProvider'

// DataManager
export { DataManager } from './dataManager'

// 便利函數：創建 DataManager 實例
export function createDataManager(isLoggedIn: boolean) {
  return new DataManager(isLoggedIn)
}
