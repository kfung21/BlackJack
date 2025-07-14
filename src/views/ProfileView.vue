<template>
    <div class="profile-view">
      <div class="container">
        <div class="profile-header">
          <h1>Blackjack Pro</h1>
          <p>Professional Card Counting Trainer</p>
        </div>
  
        <div v-if="!playerStore.isLoggedIn" class="auth-section">
          <div class="auth-toggle">
            <button 
              @click="authMode = 'login'"
              :class="{ active: authMode === 'login' }"
              class="btn toggle-btn"
            >
              Login
            </button>
            <button 
              @click="authMode = 'register'"
              :class="{ active: authMode === 'register' }"
              class="btn toggle-btn"
            >
              New Player
            </button>
          </div>
  
          <!-- Login Form -->
          <div v-if="authMode === 'login'" class="auth-form">
            <h2>Select Player</h2>
            <div v-if="playerStore.players.length === 0" class="no-players">
              No players found. Create a new player to get started.
            </div>
            <div v-else class="players-list">
              <div 
                v-for="player in playerStore.players"
                :key="player.id"
                @click="loginPlayer(player.id)"
                class="player-item"
              >
                <div class="player-info">
                  <div class="player-name">{{ player.username }}</div>
                  <div class="player-stats">
                    ${{ player.bankroll }} • {{ player.totalHands }} hands
                  </div>
                </div>
                <div class="player-last-played">
                  {{ formatDate(player.lastPlayed) }}
                </div>
              </div>
            </div>
          </div>
  
          <!-- Register Form -->
          <div v-if="authMode === 'register'" class="auth-form">
            <h2>Create New Player</h2>
            <form @submit.prevent="createPlayer">
              <div class="form-group">
                <label>Username</label>
                <input 
                  type="text" 
                  v-model="newPlayer.username"
                  placeholder="Enter your username"
                  required
                  class="form-input"
                >
              </div>
              <div class="form-group">
                <label>Starting Bankroll</label>
                <select v-model="newPlayer.bankroll" class="form-input">
                  <option value="500">$500 - Beginner</option>
                  <option value="1000">$1000 - Standard</option>
                  <option value="2500">$2500 - Advanced</option>
                  <option value="5000">$5000 - Professional</option>
                </select>
              </div>
              <button type="submit" class="btn btn-primary btn-large">
                Create Player
              </button>
            </form>
          </div>
        </div>
  
        <div v-else class="logged-in-section">
          <div class="welcome-message">
            <h2>Welcome back, {{ playerStore.playerName }}!</h2>
            <div class="quick-stats">
              <div class="stat-item">
                <div class="stat-value">${{ playerStore.bankroll }}</div>
                <div class="stat-label">Bankroll</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">{{ playerStore.totalHands }}</div>
                <div class="stat-label">Hands Played</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">{{ playerStore.winRate }}%</div>
                <div class="stat-label">Win Rate</div>
              </div>
            </div>
          </div>
  
          <div class="action-buttons">
            <button @click="$router.push('/')" class="btn btn-primary btn-large">
              Continue Playing
            </button>
            <button @click="$router.push('/stats')" class="btn btn-secondary">
              View Statistics
            </button>
            <button @click="logout" class="btn btn-danger">
              Switch Player
            </button>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted } from 'vue'
  import { useRouter } from 'vue-router'
  import { usePlayerStore } from '../stores/playerStore'
  
  const router = useRouter()
  const playerStore = usePlayerStore()
  
  const authMode = ref('login')
  const newPlayer = ref({
    username: '',
    bankroll: 1000
  })
  
  onMounted(async () => {
    await playerStore.loadPlayers()
    
    if (playerStore.players.length === 0) {
      authMode.value = 'register'
    }
  })
  
  async function createPlayer() {
    const success = await playerStore.createNewPlayer(
      newPlayer.value.username, 
      newPlayer.value.bankroll
    )
    
    if (success) {
      router.push('/')
    } else {
      alert('Failed to create player. Please try again.')
    }
  }
  
  async function loginPlayer(playerId) {
    const success = await playerStore.loginPlayer(playerId)
    
    if (success) {
      router.push('/')
    } else {
      alert('Failed to login. Please try again.')
    }
  }
  
  function logout() {
    playerStore.logout()
    authMode.value = 'login'
  }
  
  function formatDate(date) {
    const now = new Date()
    const playDate = new Date(date)
    const diffMs = now - playDate
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return playDate.toLocaleDateString()
  }
  </script>
  
  <style scoped>
  .profile-view {
    min-height: 100vh;
    background: linear-gradient(135deg, #0f4c75 0%, #1a5490 100%);
    padding: 16px;
    display: flex;
    align-items: center;
  }
  
  .profile-header {
    text-align: center;
    margin-bottom: 32px;
  }
  
  .profile-header h1 {
    color: white;
    font-size: 32px;
    margin: 0 0 8px 0;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }
  
  .profile-header p {
    color: rgba(255, 255, 255, 0.8);
    font-size: 16px;
    margin: 0;
  }
  
  .auth-section {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    padding: 24px;
    backdrop-filter: blur(10px);
  }
  
  .auth-toggle {
    display: flex;
    gap: 8px;
    margin-bottom: 24px;
  }
  
  .toggle-btn {
    flex: 1;
    padding: 12px;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: rgba(255, 255, 255, 0.7);
    transition: all 0.2s ease;
  }
  
  .toggle-btn.active {
    background: #34a853;
    border-color: #34a853;
    color: white;
  }
  
  .auth-form h2 {
    color: white;
    margin: 0 0 20px 0;
    text-align: center;
  }
  
  .no-players {
    text-align: center;
    color: rgba(255, 255, 255, 0.7);
    padding: 20px;
    font-style: italic;
  }
  
  .players-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  
  .player-item {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 12px;
    padding: 16px;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .player-item:hover {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.4);
    transform: translateY(-2px);
  }
  
  .player-info {
    margin-bottom: 8px;
  }
  
  .player-name {
    color: white;
    font-weight: 600;
    font-size: 16px;
  }
  
  .player-stats {
    color: rgba(255, 255, 255, 0.7);
    font-size: 14px;
  }
  
  .player-last-played {
    color: rgba(255, 255, 255, 0.5);
    font-size: 12px;
    text-align: right;
  }
  
  .form-group {
    margin-bottom: 16px;
  }
  
  .form-group label {
    display: block;
    color: white;
    font-weight: 600;
    margin-bottom: 8px;
  }
  
  .form-input {
    width: 100%;
    padding: 12px;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.1);
    color: white;
    font-size: 16px;
  }
  
  .form-input::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }
  
  .form-input option {
    background: #1a5490;
    color: white;
  }
  
  .logged-in-section {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    padding: 24px;
    backdrop-filter: blur(10px);
    text-align: center;
  }
  
  .welcome-message {
    margin-bottom: 24px;
  }
  
  .welcome-message h2 {
    color: white;
    margin: 0 0 16px 0;
  }
  
  .quick-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    margin-top: 16px;
  }
  
  .stat-item {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 8px;
    padding: 12px;
  }
  
  .stat-value {
    font-size: 20px;
    font-weight: bold;
    color: #34a853;
    margin-bottom: 4px;
  }
  
  .stat-label {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.7);
  }
  
  .action-buttons {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  
  .btn-large {
    padding: 16px 24px;
    font-size: 18px;
    font-weight: bold;
  }
  
  @media (max-width: 480px) {
    .profile-header h1 {
      font-size: 28px;
    }
    
    .quick-stats {
      grid-template-columns: 1fr;
    }
    
    .auth-toggle {
      flex-direction: column;
    }
  }
  </style>