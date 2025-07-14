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
              <div class="bankroll-options">
                <!-- Quick select buttons -->
                <div class="quick-bankroll">
                  <button 
                    v-for="amount in quickBankrollOptions"
                    :key="amount.value"
                    type="button"
                    @click="selectBankroll(amount.value)"
                    :class="['bankroll-btn', { active: newPlayer.bankroll === amount.value }]"
                  >
                    <span class="amount">${{ amount.value }}</span>
                    <span class="label">{{ amount.label }}</span>
                  </button>
                </div>
                
                <!-- Custom amount input -->
                <div class="custom-bankroll">
                  <label class="custom-label">
                    <input 
                      type="checkbox" 
                      v-model="useCustomBankroll"
                      @change="onCustomBankrollToggle"
                    >
                    Custom Amount
                  </label>
                  
                  <div v-if="useCustomBankroll" class="custom-input-group">
                    <span class="currency-symbol">$</span>
                    <input 
                      type="number" 
                      v-model.number="customBankrollAmount"
                      @input="onCustomAmountChange"
                      placeholder="Enter amount"
                      min="50"
                      max="100000"
                      step="50"
                      class="custom-input"
                    >
                  </div>
                </div>
              </div>
              
              <div class="bankroll-preview">
                Selected: <strong>${{ newPlayer.bankroll }}</strong>
                <span class="risk-level" :class="getRiskLevel(newPlayer.bankroll).class">
                  {{ getRiskLevel(newPlayer.bankroll).text }}
                </span>
              </div>
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
          <button @click="showDeleteConfirm" class="btn btn-delete">
            Delete User
          </button>
        </div>

        <!-- Delete Confirmation Modal -->
        <div v-if="showDeleteModal" class="modal-overlay" @click="showDeleteModal = false">
          <div class="modal-content" @click.stop>
            <div class="modal-header">
              <h3>⚠️ Delete User Account</h3>
            </div>
            <div class="modal-body">
              <p>Are you sure you want to delete <strong>{{ playerStore.playerName }}</strong>?</p>
              <p class="warning-text">This action cannot be undone. All your stats, game history, and progress will be permanently deleted.</p>
              <div class="user-summary">
                <div class="summary-item">
                  <span class="summary-label">Current Bankroll:</span>
                  <span class="summary-value">${{ playerStore.bankroll }}</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">Games Played:</span>
                  <span class="summary-value">{{ playerStore.totalHands }}</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">Win Rate:</span>
                  <span class="summary-value">{{ playerStore.winRate }}%</span>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button @click="deleteUser" class="btn btn-confirm-delete">
                Yes, Delete My Account
              </button>
              <button @click="showDeleteModal = false" class="btn btn-cancel">
                Cancel
              </button>
            </div>
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
import { deletePlayer } from '../utils/indexedDB'

const router = useRouter()
const playerStore = usePlayerStore()

const authMode = ref('login')
const useCustomBankroll = ref(false)
const customBankrollAmount = ref(1000)
const showDeleteModal = ref(false)

const newPlayer = ref({
  username: '',
  bankroll: 1000
})

const quickBankrollOptions = [
  { value: 200, label: 'Beginner' },
  { value: 500, label: 'Casual' },
  { value: 1000, label: 'Standard' },
  { value: 2500, label: 'Advanced' },
  { value: 5000, label: 'Pro' }
]

onMounted(async () => {
  await playerStore.loadPlayers()
  
  if (playerStore.players.length === 0) {
    authMode.value = 'register'
  }
})

function selectBankroll(amount) {
  useCustomBankroll.value = false
  newPlayer.value.bankroll = amount
}

function onCustomBankrollToggle() {
  if (useCustomBankroll.value) {
    newPlayer.value.bankroll = customBankrollAmount.value
  } else {
    newPlayer.value.bankroll = 1000 // Default back to standard
  }
}

function onCustomAmountChange() {
  if (useCustomBankroll.value) {
    newPlayer.value.bankroll = customBankrollAmount.value || 1000
  }
}

function getRiskLevel(bankroll) {
  if (bankroll < 300) {
    return { class: 'risk-high', text: 'High Risk' }
  } else if (bankroll < 1000) {
    return { class: 'risk-medium', text: 'Medium Risk' }
  } else if (bankroll < 3000) {
    return { class: 'risk-low', text: 'Conservative' }
  } else {
    return { class: 'risk-safe', text: 'Very Safe' }
  }
}

async function createPlayer() {
  if (newPlayer.value.bankroll < 50) {
    alert('Minimum bankroll is $50')
    return
  }
  
  if (newPlayer.value.bankroll > 100000) {
    alert('Maximum bankroll is $100,000')
    return
  }
  
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

function showDeleteConfirm() {
  showDeleteModal.value = true
}

async function deleteUser() {
  try {
    const playerId = playerStore.currentPlayer.id
    
    // Call the deletePlayer utility function from indexedDB
    await deletePlayer(playerId)
    
    // Logout and refresh players list
    playerStore.logout()
    await playerStore.loadPlayers()
    
    // Close modal and reset to login
    showDeleteModal.value = false
    authMode.value = playerStore.players.length > 0 ? 'login' : 'register'
    
    // Show success message (optional)
    console.log('User deleted successfully')
  } catch (error) {
    console.error('Error deleting user:', error)
    alert('Failed to delete user. Please try again.')
  }
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
  margin-bottom: 20px;
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

/* Bankroll Selection Styles */
.bankroll-options {
  margin-top: 8px;
}

.quick-bankroll {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 8px;
  margin-bottom: 16px;
}

.bankroll-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 8px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: white;
}

.bankroll-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.4);
}

.bankroll-btn.active {
  background: #34a853;
  border-color: #34a853;
  transform: scale(1.05);
}

.bankroll-btn .amount {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 4px;
}

.bankroll-btn .label {
  font-size: 12px;
  opacity: 0.8;
}

.custom-bankroll {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 16px;
}

.custom-label {
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  margin-bottom: 8px;
  cursor: pointer;
}

.custom-label input[type="checkbox"] {
  width: 16px;
  height: 16px;
}

.custom-input-group {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  overflow: hidden;
}

.currency-symbol {
  padding: 12px 8px 12px 12px;
  color: rgba(255, 255, 255, 0.7);
  font-weight: bold;
}

.custom-input {
  flex: 1;
  padding: 12px 12px 12px 0;
  border: none;
  background: transparent;
  color: white;
  font-size: 16px;
  outline: none;
}

.custom-input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.bankroll-preview {
  margin-top: 12px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  color: white;
  text-align: center;
}

.risk-level {
  margin-left: 8px;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
}

.risk-high {
  background: rgba(244, 67, 54, 0.2);
  color: #f44336;
}

.risk-medium {
  background: rgba(255, 152, 0, 0.2);
  color: #ff9800;
}

.risk-low {
  background: rgba(33, 150, 243, 0.2);
  color: #2196f3;
}

.risk-safe {
  background: rgba(52, 168, 83, 0.2);
  color: #34a853;
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

.btn {
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
}

.btn-primary {
  background: linear-gradient(145deg, #34a853 0%, #2d8659 100%);
  color: white;
}

.btn-secondary {
  background: linear-gradient(145deg, #2196f3 0%, #1976d2 100%);
  color: white;
}

.btn-danger {
  background: linear-gradient(145deg, #f44336 0%, #d32f2f 100%);
  color: white;
}

.btn-delete {
  background: linear-gradient(145deg, #d32f2f 0%, #b71c1c 100%);
  color: white;
  border: 1px solid rgba(183, 28, 28, 0.3);
}

.btn-delete:hover {
  background: linear-gradient(145deg, #b71c1c 0%, #d32f2f 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(244, 67, 54, 0.3);
}

/* Delete Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 16px;
}

.modal-content {
  background: linear-gradient(135deg, #1a5490 0%, #0f4c75 100%);
  border-radius: 16px;
  padding: 0;
  max-width: 400px;
  width: 100%;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(244, 67, 54, 0.3);
}

.modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-header h3 {
  margin: 0;
  color: white;
  font-size: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.modal-body {
  padding: 24px;
}

.modal-body p {
  color: white;
  margin: 0 0 16px 0;
  line-height: 1.5;
}

.warning-text {
  color: #ff9800;
  font-size: 14px;
  background: rgba(255, 152, 0, 0.1);
  padding: 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 152, 0, 0.3);
}

.user-summary {
  margin-top: 20px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  padding: 16px;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  color: white;
}

.summary-item:last-child {
  margin-bottom: 0;
}

.summary-label {
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
}

.summary-value {
  font-weight: 600;
  color: #34a853;
}

.modal-footer {
  padding: 0 24px 24px;
  display: flex;
  gap: 12px;
  flex-direction: column;
}

.btn-confirm-delete {
  background: linear-gradient(145deg, #d32f2f 0%, #b71c1c 100%);
  color: white;
  padding: 14px 24px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-confirm-delete:hover {
  background: linear-gradient(145deg, #b71c1c 0%, #d32f2f 100%);
  transform: translateY(-1px);
}

.btn-cancel {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  padding: 14px 24px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-cancel:hover {
  background: rgba(255, 255, 255, 0.2);
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
  
  .quick-bankroll {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>