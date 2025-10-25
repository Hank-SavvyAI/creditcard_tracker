// Service Worker for Web Push Notifications

self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activating...');
  event.waitUntil(clients.claim());
});

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event);

  let notificationData = {
    title: '信用卡福利提醒',
    body: '您有福利即將到期',
    tag: 'benefit-reminder',
    requireInteraction: false,
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        ...notificationData,
        ...data,
      };
    } catch (e) {
      console.error('[SW] Failed to parse notification data:', e);
    }
  }

  console.log('[SW] Showing notification with data:', notificationData);

  // 準備通知選項 - 只使用純文字，其他選項會導致通知無法顯示
  const title = notificationData.title || '信用卡福利提醒';
  const options = {
    body: notificationData.body || '您有新的通知',
  };

  console.log('[SW] Title:', title, 'Options:', options);

  event.waitUntil(
    self.registration.showNotification(title, options)
      .then(() => {
        console.log('[SW] ✅ Notification shown successfully!');
      })
      .catch((error) => {
        console.error('[SW] ❌ Failed to show notification:', error);
      })
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);

  event.notification.close();

  // Open the app or focus existing tab
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window/tab open
      for (const client of clientList) {
        if (client.url.includes('/dashboard') && 'focus' in client) {
          return client.focus();
        }
      }

      // If not, open a new window
      if (clients.openWindow) {
        return clients.openWindow('/dashboard');
      }
    })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed:', event);
});
