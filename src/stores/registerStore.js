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

// Monitor network status
window.addEventListener('online', () => {
  console.log('Back online')
})

window.addEventListener('offline', () => {
  console.log('Gone offline - using cached content')
})

export { updateSW }