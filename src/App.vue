<template>
  <div id="app">
    <div class="app-container">
      <!-- Install PWA Banner -->
      <div v-if="playerStore.canInstallPWA" class="install-banner">
        <div class="install-content">
          <span>📱 Install app for better experience</span>
          <button @click="installPWA" class="btn btn-small">Install</button>
          <button @click="dismissInstall" class="btn btn-small btn-secondary">✕</button>
        </div>
      </div>

      <!-- Offline Indicator -->
      <div 
        v-if="!playerStore.isOnline && showOfflineBanner" 
        class="offline-banner"
        @click="hideOfflineBanner"
      >
        <span>📱 Offline Mode - Your progress is saved locally</span>
      </div>

      <router-view />
      
      <!-- Navigation Bar -->
      <nav class="bottom-nav" v-if="showNavigation">
        <router-link to="/" class="nav-item" active-class="active">
          <div class="nav-icon">🎲</div>
          <div class="nav-label">Game</div>
        </router-link>
        
        <router-link to="/stats" class="nav-item" active-class="active">
          <div class="nav-icon">📊</div>
          <div class="nav-label">Stats</div>
        </router-link>
        
        <router-link to="/settings" class="nav-item" active-class="active">
          <div class="nav-icon">⚙️</div>
          <div class="nav-label">Settings</div>
        </router-link>
        
        <router-link to="/profile" class="nav-item" active-class="active">
          <div class="nav-icon">👤</div>
          <div class="nav-label">Profile</div>
        </router-link>
      </nav>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePlayerStore } from './stores/playerStore'
import { useGameStore } from './stores/gameStore'

const route = useRoute()
const router = useRouter()
const playerStore = usePlayerStore()
const gameStore = useGameStore()

const showOfflineBanner = ref(true)
let offlineTimeout = null

const showNavigation = computed(() => {
  return playerStore.isLoggedIn && route.name !== 'Profile'
})

// Watch for route changes and save game state
router.beforeEach(async (to, from, next) => {
  // If leaving the game view and game is in progress, save state
  if (from.name === 'Game' && gameStore.gamePhase && gameStore.gamePhase !== 'betting') {
    console.log('Saving game state before route change...')
    try {
      await gameStore.saveCurrentGameState()
      console.log('Game state saved successfully')
    } catch (error) {
      console.error('Failed to save game state:', error)
    }
  }
  next()
})

onMounted(async () => {
  // Initialize the app
  try {
    await playerStore.loadPlayers()
  } catch (error) {
    console.error('Failed to initialize app:', error)
  }

  // PWA Install prompt handling
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    playerStore.setInstallPrompt(e)
  })

  // Online/offline status
  window.addEventListener('online', () => {
    playerStore.setOnlineStatus(true)
    showOfflineBanner.value = true // Show banner again when going online
  })

  window.addEventListener('offline', () => {
    playerStore.setOnlineStatus(false)
    showOfflineBanner.value = true
    
    // Auto-hide offline banner after 5 seconds
    if (offlineTimeout) {
      clearTimeout(offlineTimeout)
    }
    offlineTimeout = setTimeout(() => {
      showOfflineBanner.value = false
    }, 5000)
  })

  // Screen orientation lock for mobile
  if (screen.orientation && screen.orientation.lock) {
    try {
      await screen.orientation.lock('portrait')
    } catch (error) {
      console.log('Screen orientation lock not supported')
    }
  }
  
  // Save game state when closing/refreshing the browser
  window.addEventListener('beforeunload', async (e) => {
    if (gameStore.gamePhase && gameStore.gamePhase !== 'betting' && gameStore.gamePhase !== 'finished') {
      await gameStore.saveCurrentGameState()
    }
  })
})

function installPWA() {
  playerStore.installPWA()
}

function dismissInstall() {
  playerStore.setInstallPrompt(null)
}

function hideOfflineBanner() {
  showOfflineBanner.value = false
  if (offlineTimeout) {
    clearTimeout(offlineTimeout)
  }
}
</script>

<style>
/* Global styles already defined in main.css */

.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
}

.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(15, 76, 117, 0.95);
  backdrop-filter: blur(10px);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-around;
  padding: 8px 0 max(8px, env(safe-area-inset-bottom));
  z-index: 1000;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  border-radius: 8px;
  text-decoration: none;
  color: rgba(255, 255, 255, 0.6);
  transition: all 0.2s ease;
  min-width: 60px;
}

.nav-item:hover,
.nav-item.active {
  color: white;
  background: rgba(255, 255, 255, 0.1);
}

.nav-item.active {
  background: rgba(52, 168, 83, 0.2);
  color: #34a853;
}

.nav-icon {
  font-size: 20px;
}

.nav-label {
  font-size: 12px;
  font-weight: 500;
}

.install-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: linear-gradient(135deg, #34a853 0%, #2d8659 100%);
  color: white;
  padding: 12px 16px;
  z-index: 1001;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.install-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  max-width: 390px;
  margin: 0 auto;
  font-size: 14px;
}

.offline-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: rgba(244, 67, 54, 0.9);
  color: white;
  padding: 8px 16px;
  text-align: center;
  z-index: 1001;
  font-size: 14px;
  backdrop-filter: blur(10px);
  cursor: pointer;
  transition: opacity 0.3s ease;
}

.offline-banner:hover {
  opacity: 0.8;
}

.btn-small {
  padding: 6px 12px;
  font-size: 12px;
  border-radius: 6px;
}

/* Add bottom padding to main content when nav is visible */
.app-container:has(.bottom-nav) .game-view,
.app-container:has(.bottom-nav) .stats-view,
.app-container:has(.bottom-nav) .settings-view {
  padding-bottom: 80px;
}

/* Responsive design for larger screens */
@media (min-width: 768px) {
  .app-container {
    max-width: 390px;
    margin: 0 auto;
    background: rgba(0, 0, 0, 0.1);
    border-left: 1px solid rgba(255, 255, 255, 0.1);
    border-right: 1px solid rgba(255, 255, 255, 0.1);
  }
}

/* PWA specific styles */
@media (display-mode: standalone) {
  .app-container {
    padding-top: env(safe-area-inset-top);
  }
  
  .bottom-nav {
    padding-bottom: max(8px, env(safe-area-inset-bottom));
  }
  
  .install-banner {
    display: none; /* Hide install banner in standalone mode */
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  body {
    background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
  }
}
</style>