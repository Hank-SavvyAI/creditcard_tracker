'use client'

import { useEffect, useState } from 'react'
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  isPushSubscribed,
  sendTestNotification,
  registerServiceWorker,
} from '@/lib/pushNotifications'

interface NotificationSettingsProps {
  language: 'zh-TW' | 'en'
}

export default function NotificationSettings({ language }: NotificationSettingsProps) {
  const [notificationSupported, setNotificationSupported] = useState<boolean | null>(null)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default')
  const [pushSubscribed, setPushSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Check notification support (only runs on client side)
    const supported = isNotificationSupported()
    console.log('Notification supported:', supported)
    console.log('- Notification in window:', 'Notification' in window)
    console.log('- serviceWorker in navigator:', 'serviceWorker' in navigator)
    console.log('- PushManager in window:', 'PushManager' in window)
    setNotificationSupported(supported)

    if (supported) {
      // Register service worker
      registerServiceWorker()

      // Check permission status
      const permission = getNotificationPermission()
      setNotificationPermission(permission)

      // Check if subscribed
      checkSubscription()
    }
  }, [])

  async function checkSubscription() {
    const subscribed = await isPushSubscribed()
    setPushSubscribed(subscribed)
  }

  async function handleEnableNotifications() {
    setLoading(true)
    try {
      // Request permission
      const permission = await requestNotificationPermission()
      setNotificationPermission(permission)

      if (permission === 'granted') {
        // Subscribe to push
        const token = localStorage.getItem('token')
        if (!token) {
          alert(language === 'zh-TW' ? '請先登入' : 'Please login first')
          return
        }

        const subscription = await subscribeToPushNotifications(token)
        if (subscription) {
          setPushSubscribed(true)
          alert(language === 'zh-TW' ? '通知已啟用！' : 'Notifications enabled!')
        } else {
          alert(language === 'zh-TW' ? '訂閱失敗' : 'Failed to subscribe')
        }
      } else {
        alert(language === 'zh-TW' ? '請允許通知權限' : 'Please allow notification permission')
      }
    } catch (error) {
      console.error('Failed to enable notifications:', error)
      alert(language === 'zh-TW' ? '啟用失敗' : 'Failed to enable')
    } finally {
      setLoading(false)
    }
  }

  async function handleDisableNotifications() {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const success = await unsubscribeFromPushNotifications(token)
      if (success) {
        setPushSubscribed(false)
        alert(language === 'zh-TW' ? '通知已停用' : 'Notifications disabled')
      } else {
        alert(language === 'zh-TW' ? '停用失敗' : 'Failed to disable')
      }
    } catch (error) {
      console.error('Failed to disable notifications:', error)
      alert(language === 'zh-TW' ? '停用失敗' : 'Failed to disable')
    } finally {
      setLoading(false)
    }
  }

  async function handleTestNotification() {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const success = await sendTestNotification(token)
      if (success) {
        alert(language === 'zh-TW' ? '測試通知已發送！' : 'Test notification sent!')
      } else {
        alert(language === 'zh-TW' ? '發送失敗' : 'Failed to send')
      }
    } catch (error) {
      console.error('Failed to send test notification:', error)
      alert(language === 'zh-TW' ? '發送失敗' : 'Failed to send')
    } finally {
      setLoading(false)
    }
  }

  // Loading state while checking support
  if (notificationSupported === null) {
    return (
      <div style={{ padding: '1rem', background: '#F3F4F6', borderRadius: '8px', marginBottom: '1rem' }}>
        <p style={{ margin: 0, color: '#6B7280' }}>
          {language === 'zh-TW' ? '檢查通知功能中...' : 'Checking notification support...'}
        </p>
      </div>
    )
  }

  if (notificationSupported === false) {
    return (
      <div style={{ padding: '1rem', background: '#FEF3C7', borderRadius: '8px', marginBottom: '1rem' }}>
        <p style={{ margin: 0, color: '#92400E', fontWeight: 'bold' }}>
          {language === 'zh-TW'
            ? '⚠️ 您的瀏覽器不支援通知功能'
            : '⚠️ Your browser does not support notifications'}
        </p>
        <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: '#92400E' }}>
          {language === 'zh-TW'
            ? '請使用 Chrome、Firefox、Edge 或 Safari 等現代瀏覽器'
            : 'Please use a modern browser like Chrome, Firefox, Edge, or Safari'}
        </p>
      </div>
    )
  }

  return (
    <div style={{ padding: '1rem', background: '#F3F4F6', borderRadius: '8px', marginBottom: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <strong>{language === 'zh-TW' ? '瀏覽器通知' : 'Browser Notifications'}</strong>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#6B7280' }}>
            {pushSubscribed
              ? (language === 'zh-TW' ? '✅ 已啟用' : '✅ Enabled')
              : (language === 'zh-TW' ? '🔕 未啟用' : '🔕 Disabled')}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {!pushSubscribed ? (
            <button
              onClick={handleEnableNotifications}
              disabled={loading}
              className="btn btn-primary"
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                background: '#3B82F6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading
                ? (language === 'zh-TW' ? '處理中...' : 'Loading...')
                : (language === 'zh-TW' ? '🔔 啟用通知' : '🔔 Enable')}
            </button>
          ) : (
            <>
              <button
                onClick={handleTestNotification}
                disabled={loading}
                className="btn btn-secondary"
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.875rem',
                  background: '#10B981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {language === 'zh-TW' ? '📨 測試通知' : '📨 Test'}
              </button>
              <button
                onClick={handleDisableNotifications}
                disabled={loading}
                className="btn btn-secondary"
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.875rem',
                  background: '#EF4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {language === 'zh-TW' ? '🔕 停用' : '🔕 Disable'}
              </button>
            </>
          )}
        </div>
      </div>

      {notificationPermission === 'denied' && (
        <div style={{
          margin: '0.75rem 0 0 0',
          padding: '0.75rem',
          background: '#FEE2E2',
          borderRadius: '6px',
          borderLeft: '4px solid #DC2626'
        }}>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#DC2626', fontWeight: 'bold' }}>
            {language === 'zh-TW'
              ? '⚠️ 通知權限已被拒絕'
              : '⚠️ Notification Permission Denied'}
          </p>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: '#991B1B' }}>
            {language === 'zh-TW' ? '請按照以下步驟開啟通知：' : 'Please follow these steps to enable:'}
          </p>
          <ol style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.5rem', fontSize: '0.875rem', color: '#991B1B' }}>
            <li>{language === 'zh-TW' ? '點擊網址列左側的 🔒 圖示' : 'Click the 🔒 icon in address bar'}</li>
            <li>{language === 'zh-TW' ? '找到「通知」設定' : 'Find "Notifications" setting'}</li>
            <li>{language === 'zh-TW' ? '選擇「允許」' : 'Select "Allow"'}</li>
            <li>{language === 'zh-TW' ? '重新整理頁面並點擊「啟用通知」' : 'Refresh page and click "Enable"'}</li>
          </ol>
        </div>
      )}

      {notificationPermission === 'default' && !pushSubscribed && (
        <div style={{
          margin: '0.75rem 0 0 0',
          padding: '0.75rem',
          background: '#DBEAFE',
          borderRadius: '6px',
          borderLeft: '4px solid #3B82F6'
        }}>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#1E40AF' }}>
            💡 {language === 'zh-TW'
              ? '點擊「啟用通知」按鈕後，瀏覽器會詢問是否允許通知，請選擇「允許」'
              : 'Click "Enable" button, browser will ask for permission, please select "Allow"'}
          </p>
        </div>
      )}
    </div>
  )
}
