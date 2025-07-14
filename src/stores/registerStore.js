import { registerSW } from 'virtual:pwa-register'

const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('New version available. Update now?')) {
      updateSW(true)
    }
  },
  
  onOfflineReady() {
    console.log('App ready to work offline')
    showOfflineReadyMessage()
    
    // Auto-dismiss the red offline banner after 3 seconds
    setTimeout(() => {
      dismissOfflineBanner()
    }, 3000)
  },
  
  onRegistered(r) {
    console.log('SW Registered: ' + r)
  },
  
  onRegisterError(error) {
    console.log('SW registration error', error)
  }
})

function showOfflineReadyMessage() {
  const toast = document.createElement('div')
  toast.innerHTML = `
    <div style="
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(52, 168, 83, 0.9);
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      backdrop-filter: blur(10px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    ">
      ✅ Ready for offline play!
    </div>
  `
  
  document.body.appendChild(toast)
  
  setTimeout(() => {
    if (document.body.contains(toast)) {
      document.body.removeChild(toast)
    }
  }, 3000)
}

function dismissOfflineBanner() {
  // Look for the red offline banner and hide it
  const offlineBanners = document.querySelectorAll('[style*="background: red"], [style*="background-color: red"], .offline-banner, [class*="offline"]')
  
  offlineBanners.forEach(banner => {
    if (banner.textContent.toLowerCase().includes('offline') || 
        banner.textContent.toLowerCase().includes('no internet') ||
        banner.textContent.toLowerCase().includes('saved locally')) {
      banner.style.display = 'none'
    }
  })
  
  // Also check for any element with red background that mentions offline
  const allElements = document.querySelectorAll('*')
  allElements.forEach(el => {
    const computedStyle = window.getComputedStyle(el)
    const bgColor = computedStyle.backgroundColor
    
    if ((bgColor.includes('rgb(255, 0, 0)') || bgColor.includes('red')) && 
        el.textContent.toLowerCase().includes('offline')) {
      el.style.display = 'none'
    }
  })
}

// Monitor network status with auto-dismissing notifications
window.addEventListener('online', () => {
  console.log('Back online')
  showNetworkStatus('online')
})

window.addEventListener('offline', () => {
  console.log('Gone offline - using cached content')
  showNetworkStatus('offline')
})

function showNetworkStatus(status) {
  const isOnline = status === 'online'
  const toast = document.createElement('div')
  toast.innerHTML = `
    <div style="
      position: fixed;
      top: 80px;
      left: 50%;
      transform: translateX(-50%);
      background: ${isOnline ? 'rgba(52, 168, 83, 0.9)' : 'rgba(255, 152, 0, 0.9)'};
      color: white;
      padding: 8px 16px;
      border-radius: 6px;
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      backdrop-filter: blur(10px);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      font-size: 14px;
    ">
      ${isOnline ? '🌐 Back Online' : '📱 Playing Offline'}
    </div>
  `
  
  document.body.appendChild(toast)
  
  // Auto-remove after 2 seconds
  setTimeout(() => {
    if (document.body.contains(toast)) {
      toast.style.transform = 'translateX(-50%) translateY(-20px)'
      toast.style.opacity = '0'
      toast.style.transition = 'all 0.3s ease'
      
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast)
        }
      }, 300)
    }
  }, 2000)
}

export { updateSW }