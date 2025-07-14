import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { 
  createPlayer, 
  getPlayer, 
  updatePlayerBankroll, 
  getPlayerSettings, 
  updatePlayerSettings,
  getAllPlayers 
} from '../utils/indexedDB'

export const usePlayerStore = defineStore('player', () => {
  // State
  const currentPlayer = ref(null)
  const players = ref([])
  const settings = ref({
    countingSystem: 'Hi-Lo',
    showCount: true,
    showTrueCount: true,
    soundEnabled: true,
    autoPlay: false,
    dealerSpeed: 0, // Changed default to 0 (fastest)
    hapticFeedback: true,
    fullscreen: false,
    numDecks: 6,
    showHints: true
  })
  const isLoggedIn = ref(false)
  const isOnline = ref(navigator.onLine)
  const installPrompt = ref(null)

  // Getters
  const playerName = computed(() => currentPlayer.value?.username || 'Guest')
  const bankroll = computed(() => currentPlayer.value?.bankroll || 0)
  const totalHands = computed(() => currentPlayer.value?.totalHands || 0)
  const totalWins = computed(() => currentPlayer.value?.totalWins || 0)
  const winRate = computed(() => {
    const total = totalHands.value
    const wins = totalWins.value
    return total > 0 ? Math.round((wins / total) * 100) : 0
  })
  const canInstallPWA = computed(() => !!installPrompt.value)

  // Actions
  async function loadPlayers() {
    players.value = await getAllPlayers()
  }

  async function createNewPlayer(username, initialBankroll = 1000) {
    try {
      const playerId = await createPlayer(username, initialBankroll)
      const player = await getPlayer(playerId)
      
      // Create default settings for new player with fastest dealer speed
      const defaultSettings = {
        countingSystem: 'Hi-Lo',
        showCount: true,
        showTrueCount: true,
        soundEnabled: true,
        autoPlay: false,
        dealerSpeed: 0, // Fastest speed for new players
        hapticFeedback: true,
        fullscreen: false,
        numDecks: 6,
        showHints: true
      }
      
      await updatePlayerSettings(playerId, defaultSettings)
      
      currentPlayer.value = player
      settings.value = defaultSettings
      isLoggedIn.value = true
      
      await loadPlayers()
      return true
    } catch (error) {
      console.error('Error creating player:', error)
      return false
    }
  }

  async function loginPlayer(playerId) {
    try {
      const player = await getPlayer(playerId)
      const playerSettings = await getPlayerSettings(playerId)
      
      if (player) {
        currentPlayer.value = player
        
        // Merge saved settings with defaults to ensure all properties exist
        const defaultSettings = {
          countingSystem: 'Hi-Lo',
          showCount: true,
          showTrueCount: true,
          soundEnabled: true,
          autoPlay: false,
          dealerSpeed: 0, // Default to fastest if not saved
          hapticFeedback: true,
          fullscreen: false,
          numDecks: 6,
          showHints: true
        }
        
        settings.value = { ...defaultSettings, ...playerSettings }
        isLoggedIn.value = true
        return true
      }
      return false
    } catch (error) {
      console.error('Error logging in player:', error)
      return false
    }
  }

  async function updateBankroll(amount) {
    if (!currentPlayer.value) return false
    
    try {
      const newBankroll = currentPlayer.value.bankroll + amount
      await updatePlayerBankroll(currentPlayer.value.id, newBankroll)
      currentPlayer.value.bankroll = newBankroll
      return true
    } catch (error) {
      console.error('Error updating bankroll:', error)
      return false
    }
  }

  async function updateSettings(newSettings) {
    if (!currentPlayer.value) return false
    
    try {
      // Ensure we're only updating changed properties
      const updatedSettings = { ...settings.value }
      
      // Update only the properties that are present in newSettings
      Object.keys(newSettings).forEach(key => {
        if (newSettings[key] !== undefined) {
          updatedSettings[key] = newSettings[key]
        }
      })
      
      settings.value = updatedSettings
      
      // Save all settings to IndexedDB
      await updatePlayerSettings(currentPlayer.value.id, updatedSettings)
      
      // Handle PWA-specific settings
      if (newSettings.fullscreen !== undefined) {
        toggleFullscreen(newSettings.fullscreen)
      }
      
      return true
    } catch (error) {
      console.error('Error updating settings:', error)
      return false
    }
  }

  function setOnlineStatus(status) {
    isOnline.value = status
  }

  function setInstallPrompt(prompt) {
    installPrompt.value = prompt
  }

  async function installPWA() {
    if (installPrompt.value) {
      installPrompt.value.prompt()
      const result = await installPrompt.value.userChoice
      
      if (result.outcome === 'accepted') {
        console.log('PWA installed')
      }
      
      installPrompt.value = null
    }
  }

  function toggleFullscreen(enable) {
    if (enable && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen()
    } else if (!enable && document.exitFullscreen) {
      document.exitFullscreen()
    }
  }

  function vibrate(pattern = [100]) {
    if (settings.value.hapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate(pattern)
    }
  }

  function logout() {
    currentPlayer.value = null
    isLoggedIn.value = false
    settings.value = {
      countingSystem: 'Hi-Lo',
      showCount: true,
      showTrueCount: true,
      soundEnabled: true,
      autoPlay: false,
      dealerSpeed: 0, // Reset to fastest
      hapticFeedback: true,
      fullscreen: false,
      numDecks: 6,
      showHints: true
    }
  }

  return {
    // State
    currentPlayer,
    players,
    settings,
    isLoggedIn,
    isOnline,
    installPrompt,
    
    // Getters
    playerName,
    bankroll,
    totalHands,
    totalWins,
    winRate,
    canInstallPWA,
    
    // Actions
    loadPlayers,
    createNewPlayer,
    loginPlayer,
    updateBankroll,
    updateSettings,
    setOnlineStatus,
    setInstallPrompt,
    installPWA,
    toggleFullscreen,
    vibrate,
    logout
  }
})