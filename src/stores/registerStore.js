import { registerSW } from 'virtual:pwa-register'

// Enhanced offline-first service worker registration
const updateSW = registerSW({
  onNeedRefresh() {
    // Show update available notification
    showUpdateNotification()
  },
  
  onOfflineReady() {
    console.log('App is ready to work offline!')
    showOfflineReadyMessage()
  },
  
  onRegistered(registration) {
    console.log('SW Registered successfully:', registration)
    
    // Check for updates every hour when app is active
    if (registration) {
      setInterval(() => {
        registration.update()
      }, 60 * 60 * 1000) // 1 hour
    }
  },
  
  onRegisterError(error) {
    console.error('SW registration failed:', error)
    showRegistrationError()
  }
})

function showUpdateNotification() {
  const notification = createNotification(
    '🔄 Update Available',
    'A new version is available. Click to update.',
    'primary',
    () => {
      updateSW(true) // Force update
    }
  )
  
  showNotification(notification)
}

function showOfflineReadyMessage() {
  const notification = createNotification(
    '📱 Ready for Offline Play!',
    'Blackjack Pro can now be played without internet connection.',
    'success'
  )
  
  showNotification(notification)
}

function showRegistrationError() {
  const notification = createNotification(
    '⚠️ Offline Mode Unavailable',
    'Could not enable offline features. App will work online only.',
    'warning'
  )
  
  showNotification(notification)
}

function createNotification(title, message, type = 'info', action = null) {
  const colors = {
    success: 'rgba(52, 168, 83, 0.9)',
    primary: 'rgba(33, 150, 243, 0.9)',
    warning: 'rgba(255, 152, 0, 0.9)',
    error: 'rgba(244, 67, 54, 0.9)',
    info: 'rgba(158, 158, 158, 0.9)'
  }
  
  const notification = document.createElement('div')
  notification.className = 'pwa-notification'
  notification.innerHTML = `
    <div style="
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: ${colors[type]};
      color: white;
      padding: 16px 24px;
      border-radius: 12px;
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      backdrop-filter: blur(10px);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      max-width: 350px;
      text-align: center;
      cursor: ${action ? 'pointer' : 'default'};
      border: 1px solid rgba(255, 255, 255, 0.1);
    ">
      <div style="font-weight: 600; margin-bottom: 4px; font-size: 16px;">
        ${title}
      </div>
      <div style="font-size: 14px; opacity: 0.9;">
        ${message}
      </div>
      ${action ? '<div style="margin-top: 8px; font-size: 12px; opacity: 0.8;">Click to continue</div>' : ''}
    </div>
  `
  
  if (action) {
    notification.addEventListener('click', action)
  }
  
  return notification
}

function showNotification(notification) {
  document.body.appendChild(notification)
  
  // Auto-remove after 5 seconds (or 10 seconds for update notifications)
  const isUpdateNotification = notification.innerHTML.includes('Update Available')
  const timeout = isUpdateNotification ? 10000 : 5000
  
  setTimeout(() => {
    if (document.body.contains(notification)) {
      notification.style.transform = 'translateX(-50%) translateY(100px)'
      notification.style.opacity = '0'
      notification.style.transition = 'all 0.3s ease'
      
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification)
        }
      }, 300)
    }
  }, timeout)
}

// Monitor online/offline status
window.addEventListener('online', () => {
  console.log('App is online')
  showNetworkStatusMessage(true)
})

window.addEventListener('offline', () => {
  console.log('App is offline - switching to cached content')
  showNetworkStatusMessage(false)
})

function showNetworkStatusMessage(isOnline) {
  const notification = createNotification(
    isOnline ? '🌐 Back Online' : '📱 Offline Mode',
    isOnline ? 'Connection restored' : 'Using cached content',
    isOnline ? 'success' : 'info'
  )
  
  showNotification(notification)
}

// Preload critical game assets when online
if (navigator.onLine) {
  preloadCriticalAssets()
}

async function preloadCriticalAssets() {
  try {
    // Preload critical routes for offline access
    const criticalRoutes = ['/', '/profile', '/settings', '/stats']
    
    for (const route of criticalRoutes) {
      fetch(route, { method: 'GET' }).catch(() => {
        // Ignore fetch errors during preloading
      })
    }
    
    console.log('Critical assets preloaded for offline use')
  } catch (error) {
    console.warn('Could not preload all assets:', error)
  }
}

export { updateSW, showNotification, createNotification }