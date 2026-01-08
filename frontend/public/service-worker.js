// Service Worker for Emergency Notifications
// This enables push notifications even when the app is closed (like WhatsApp)

const CACHE_NAME = 'shc-emergency-notifications-v1';

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  self.skipWaiting(); // Activate immediately
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim(); // Take control of all pages immediately
});

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
  
  let notificationData = {
    title: '🚨 Emergency Alert',
    body: 'A patient has triggered an emergency!',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'emergency-alert',
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 200],
    data: {
      url: '/caregiver/dashboard'
    }
  };

  // Parse push data if available
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        ...notificationData,
        title: data.title || notificationData.title,
        body: data.body || notificationData.body,
        data: data.data || notificationData.data
      };
    } catch (e) {
      notificationData.body = event.data.text() || notificationData.body;
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

// Notification click event - open the app when notification is clicked
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If app is already open, focus it
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes('/caregiver/dashboard') && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise, open a new window
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data?.url || '/caregiver/dashboard');
      }
    })
  );
});

// Message event - handle messages from the main app
self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data);
  
  if (event.data && event.data.type === 'EMERGENCY_ALERT') {
    const { patientName, emergencyId } = event.data;
    
    self.registration.showNotification('🚨 Emergency Alert', {
      body: `${patientName} has triggered an emergency! Please check the dashboard immediately.`,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: `emergency-${emergencyId}`,
      requireInteraction: true,
      vibrate: [200, 100, 200, 100, 200],
      data: {
        url: '/caregiver/dashboard',
        emergencyId: emergencyId
      }
    });
  }
});

