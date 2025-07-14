<template>
    <div class="settings-view">
      <div class="container">
        <div class="settings-header">
          <button @click="$router.back()" class="btn btn-back">← Back</button>
          <h1>Settings</h1>
        </div>
  
        <div class="settings-sections">
          <!-- Card Counting Settings -->
          <div class="settings-section">
            <h2>Card Counting</h2>
            
            <div class="setting-item">
              <label class="setting-label">
                <input 
                  type="checkbox" 
                  v-model="localSettings.showCount"
                  @change="updateSettings"
                >
                <span class="checkbox-custom"></span>
                Show Card Count
              </label>
            </div>
            
            <div class="setting-item">
              <label class="setting-label">
                <input 
                  type="checkbox" 
                  v-model="localSettings.showTrueCount"
                  @change="updateSettings"
                >
                <span class="checkbox-custom"></span>
                Show True Count
              </label>
            </div>
            
            <div class="setting-item">
              <label class="setting-label">Counting System</label>
              <select 
                v-model="localSettings.countingSystem"
                @change="updateSettings"
                class="setting-select"
              >
                <option 
                  v-for="(system, key) in countingSystems"
                  :key="key"
                  :value="key"
                >
                  {{ system.name }}
                </option>
              </select>
              <div class="system-description">
                {{ currentSystemDescription }}
              </div>
            </div>
          </div>
  
          <!-- Game Settings -->
          <div class="settings-section">
            <h2>Game Settings</h2>
            
            <div class="setting-item">
              <label class="setting-label">Number of Decks</label>
              <select 
                v-model="localSettings.numDecks"
                @change="updateSettings"
                class="setting-select"
              >
                <option value="1">1 Deck (Single Deck)</option>
                <option value="2">2 Decks (Double Deck)</option>
                <option value="4">4 Decks (Quad Deck)</option>
                <option value="6">6 Decks (Standard)</option>
                <option value="8">8 Decks (Casino Style)</option>
              </select>
              <div class="system-description">
                More decks make card counting more challenging but more realistic.
              </div>
            </div>
            
            <div class="setting-item">
              <label class="setting-label">
                <input 
                  type="checkbox" 
                  v-model="localSettings.soundEnabled"
                  @change="updateSettings"
                >
                <span class="checkbox-custom"></span>
                Sound Effects
              </label>
            </div>
            
            <div class="setting-item">
              <label class="setting-label">
                <input 
                  type="checkbox" 
                  v-model="localSettings.showHints"
                  @change="updateSettings"
                >
                <span class="checkbox-custom"></span>
                Enable Hint Button
              </label>
            </div>
            
            <div class="setting-item">
              <label class="setting-label">Dealer Speed</label>
              <input 
                type="range" 
                min="0" 
                max="2000" 
                step="250"
                v-model="localSettings.dealerSpeed"
                @input="updateSettings"
                class="setting-range"
              >
              <div class="range-labels">
                <span>Fast</span>
                <span>{{ dealerSpeedText }}</span>
                <span>Slow</span>
              </div>
            </div>
          </div>
  
          <!-- Account Settings -->
          <div class="settings-section">
            <h2>Account</h2>
            
            <div class="setting-item">
              <div class="account-info">
                <div class="account-detail">
                  <span class="detail-label">Username:</span>
                  <span class="detail-value">{{ playerStore.playerName }}</span>
                </div>
                <div class="account-detail">
                  <span class="detail-label">Total Hands:</span>
                  <span class="detail-value">{{ playerStore.totalHands }}</span>
                </div>
                <div class="account-detail">
                  <span class="detail-label">Win Rate:</span>
                  <span class="detail-value">{{ playerStore.winRate }}%</span>
                </div>
              </div>
            </div>
            
            <div class="setting-item">
              <button @click="resetBankroll" class="btn btn-secondary">
                Reset Bankroll ($1000)
              </button>
            </div>
            
            <div class="setting-item">
              <button @click="logout" class="btn btn-danger">
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, computed, onMounted } from 'vue'
  import { useRouter } from 'vue-router'
  import { usePlayerStore } from '../stores/playerStore'
  import { countingSystems } from '../utils/countingSystems'
  
  const router = useRouter()
  const playerStore = usePlayerStore()
  
  const localSettings = ref({})
  
  const currentSystemDescription = computed(() => {
    const system = countingSystems[localSettings.value.countingSystem]
    return system ? system.description : ''
  })
  
  const dealerSpeedText = computed(() => {
    const speed = localSettings.value.dealerSpeed
    if (speed === 0) return 'Instant'
    if (speed <= 500) return 'Fast'
    if (speed <= 1000) return 'Normal'
    if (speed <= 1500) return 'Slow'
    return 'Very Slow'
  })
  
  onMounted(() => {
    localSettings.value = { ...playerStore.settings }
  })
  
  async function updateSettings() {
    await playerStore.updateSettings(localSettings.value)
  }
  
  async function resetBankroll() {
    if (confirm('Reset bankroll to $1000? This cannot be undone.')) {
      const currentBankroll = playerStore.bankroll
      await playerStore.updateBankroll(1000 - currentBankroll)
    }
  }
  
  function logout() {
    if (confirm('Are you sure you want to logout?')) {
      playerStore.logout()
      router.push('/profile')
    }
  }
  </script>
  
  <style scoped>
  .settings-view {
    min-height: 100vh;
    background: linear-gradient(135deg, #0f4c75 0%, #1a5490 100%);
    padding: 16px;
  }
  
  .settings-header {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 24px;
  }
  
  .btn-back {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: white;
    padding: 8px 16px;
    border-radius: 8px;
  }
  
  .settings-header h1 {
    color: white;
    margin: 0;
    font-size: 24px;
  }
  
  .settings-sections {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }
  
  .settings-section {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    padding: 20px;
    backdrop-filter: blur(10px);
  }
  
  .settings-section h2 {
    color: white;
    margin: 0 0 16px 0;
    font-size: 18px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
    padding-bottom: 8px;
  }
  
  .setting-item {
    margin-bottom: 16px;
  }
  
  .setting-label {
    display: flex;
    align-items: center;
    gap: 12px;
    color: white;
    font-weight: 500;
    cursor: pointer;
  }
  
  .setting-label input[type="checkbox"] {
    display: none;
  }
  
  .checkbox-custom {
    width: 20px;
    height: 20px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 4px;
    position: relative;
    transition: all 0.2s ease;
  }
  
  .setting-label input[type="checkbox"]:checked + .checkbox-custom {
    background: #34a853;
    border-color: #34a853;
  }
  
  .setting-label input[type="checkbox"]:checked + .checkbox-custom::after {
    content: '✓';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: white;
    font-size: 12px;
    font-weight: bold;
  }
  
  .setting-select {
    width: 100%;
    padding: 12px;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.1);
    color: white;
    font-size: 16px;
    margin-top: 8px;
  }
  
  .setting-select option {
    background: #1a5490;
    color: white;
  }
  
  .system-description {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.7);
    margin-top: 8px;
    font-style: italic;
  }
  
  .setting-range {
    width: 100%;
    margin: 12px 0;
    height: 6px;
    border-radius: 3px;
    background: rgba(255, 255, 255, 0.2);
    outline: none;
    -webkit-appearance: none;
  }
  
  .setting-range::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #34a853;
    cursor: pointer;
  }
  
  .setting-range::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #34a853;
    cursor: pointer;
    border: none;
  }
  
  .range-labels {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.7);
  }
  
  .account-info {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 8px;
    padding: 16px;
  }
  
  .account-detail {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
  }
  
  .detail-label {
    color: rgba(255, 255, 255, 0.7);
  }
  
  .detail-value {
    color: white;
    font-weight: 600;
  }
  
  @media (max-width: 480px) {
    .settings-view {
      padding: 12px;
    }
    
    .settings-section {
      padding: 16px;
    }
  }
  </style>