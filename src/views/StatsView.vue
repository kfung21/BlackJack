<template>
  <div class="stats-view">
    <div class="container">
      <div class="stats-header">
        <button @click="$router.back()" class="btn btn-back">← Back</button>
        <h1>Statistics</h1>
      </div>

      <div class="stats-overview">
        <div class="overview-card">
          <div class="card-title">Overall Performance</div>
          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-value">${{ playerStore.bankroll }}</div>
              <div class="stat-label">Current Bankroll</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ playerStore.totalHands }}</div>
              <div class="stat-label">Total Hands</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ playerStore.winRate }}%</div>
              <div class="stat-label">Win Rate</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">${{ totalProfit }}</div>
              <div class="stat-label" :class="profitClass">Net Profit</div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Reset Statistics Button -->
      <div class="reset-section">
        <button @click="showResetModal = true" class="btn btn-reset">
          Reset Statistics
        </button>
      </div>

      <div class="recent-games">
        <div class="section-title">Recent Games</div>
        <div v-if="gameHistory.length === 0" class="no-history">
          No games played yet. Start playing to see your statistics!
        </div>
        <div v-else class="games-list">
          <div 
            v-for="game in recentGames"
            :key="game.id"
            class="game-item"
            :class="`game-${game.outcome}`"
          >
            <div class="game-info">
              <div class="game-outcome">{{ getOutcomeText(game.outcome) }}</div>
              <div class="game-details">
                ${{ game.bet }} bet • {{ getPayoutText(game.payout) }}
              </div>
            </div>
            <div class="game-date">{{ formatGameDate(game.timestamp) }}</div>
          </div>
        </div>
      </div>

      <div class="counting-stats" v-if="countingStore.countHistory.length > 0">
        <div class="section-title">Card Counting Performance</div>
        <div class="counting-overview">
          <div class="count-stat">
            <div class="count-value">{{ averageCount.toFixed(1) }}</div>
            <div class="count-label">Average Count</div>
          </div>
          <div class="count-stat">
            <div class="count-value">{{ maxCount }}</div>
            <div class="count-label">Highest Count</div>
          </div>
          <div class="count-stat">
            <div class="count-value">{{ minCount }}</div>
            <div class="count-label">Lowest Count</div>
          </div>
        </div>
      </div>

      <div class="achievements">
        <div class="section-title">Achievements</div>
        <div class="achievements-grid">
          <div 
            v-for="achievement in achievements"
            :key="achievement.id"
            class="achievement-item"
            :class="{ unlocked: achievement.unlocked }"
          >
            <div class="achievement-icon">{{ achievement.icon }}</div>
            <div class="achievement-info">
              <div class="achievement-title">{{ achievement.title }}</div>
              <div class="achievement-description">{{ achievement.description }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Reset Statistics Modal -->
    <div v-if="showResetModal" class="modal-overlay" @click="showResetModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>📊 Reset Statistics</h3>
        </div>
        <div class="modal-body">
          <p>Are you sure you want to reset your statistics?</p>
          <div class="reset-info">
            <h4>What will be reset:</h4>
            <ul>
              <li>✗ Total hands played → 0</li>
              <li>✗ Win/loss record → 0/0</li>
              <li>✗ Game history (cleared)</li>
              <li>✗ Net profit (reset to $0)</li>
            </ul>
            <h4>What will be kept:</h4>
            <ul>
              <li>✓ Current bankroll (${{ playerStore.bankroll }})</li>
              <li>✓ All achievements</li>
              <li>✓ Card counting stats</li>
              <li>✓ Player settings</li>
            </ul>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="resetStatistics" class="btn btn-confirm">
            Yes, Reset My Stats
          </button>
          <button @click="showResetModal = false" class="btn btn-cancel">
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePlayerStore } from '../stores/playerStore'
import { useCountingStore } from '../stores/countingStore'
import { getGameHistory, getPlayer } from '../utils/indexedDB'

const router = useRouter()
const playerStore = usePlayerStore()
const countingStore = useCountingStore()

const gameHistory = ref([])
const showResetModal = ref(false)

const recentGames = computed(() => {
  return gameHistory.value.slice(0, 20)
})

const totalProfit = computed(() => {
  if (!playerStore.currentPlayer) return 0
  return playerStore.bankroll - 1000 // Assuming starting bankroll was 1000
})

const profitClass = computed(() => {
  return totalProfit.value >= 0 ? 'profit-positive' : 'profit-negative'
})

const averageCount = computed(() => {
  const history = countingStore.countHistory
  if (history.length === 0) return 0
  const sum = history.reduce((acc, item) => acc + item.runningCount, 0)
  return sum / history.length
})

const maxCount = computed(() => {
  const history = countingStore.countHistory
  if (history.length === 0) return 0
  return Math.max(...history.map(item => item.runningCount))
})

const minCount = computed(() => {
  const history = countingStore.countHistory
  if (history.length === 0) return 0
  return Math.min(...history.map(item => item.runningCount))
})

const achievements = computed(() => {
  return [
    {
      id: 'first_win',
      title: 'First Victory',
      description: 'Win your first hand',
      icon: '🎉',
      unlocked: playerStore.totalHands > 0 && playerStore.winRate > 0
    },
    {
      id: 'blackjack',
      title: 'Blackjack!',
      description: 'Get a natural blackjack',
      icon: '🔥',
      unlocked: hasBlackjackWin.value
    },
    {
      id: 'profitable',
      title: 'In the Money',
      description: 'Reach positive profit',
      icon: '💰',
      unlocked: totalProfit.value > 0
    },
    {
      id: 'veteran',
      title: 'Veteran Player',
      description: 'Play 100 hands',
      icon: '🎖️',
      unlocked: playerStore.totalHands >= 100
    },
    {
      id: 'high_roller',
      title: 'High Roller',
      description: 'Reach $5000 bankroll',
      icon: '💎',
      unlocked: playerStore.bankroll >= 5000
    },
    {
      id: 'counting_master',
      title: 'Counting Master',
      description: 'Use card counting for 500+ cards',
      icon: '🧠',
      unlocked: countingStore.totalCardsSeen >= 500
    }
  ]
})

const hasBlackjackWin = computed(() => {
  return gameHistory.value.some(game => {
    try {
      const hands = JSON.parse(game.hands)
      return hands.some(hand => hand.outcome === 'blackjack')
    } catch {
      return false
    }
  })
})

onMounted(async () => {
  if (playerStore.currentPlayer) {
    gameHistory.value = await getGameHistory(playerStore.currentPlayer.id)
  }
})

async function resetStatistics() {
  try {
    // Get the player record
    const playerId = playerStore.currentPlayer.id
    const player = await getPlayer(playerId)
    
    // Reset statistics while keeping bankroll
    player.totalHands = 0
    player.totalWins = 0
    player.totalLosses = 0
    player.biggestWin = 0
    player.biggestLoss = 0
    
    // Update the player in IndexedDB
    const db = await openDB()
    const transaction = db.transaction(['players'], 'readwrite')
    const store = transaction.objectStore('players')
    await store.put(player)
    
    // Clear game history for this player
    const gameTransaction = db.transaction(['gameHistory'], 'readwrite')
    const gameStore = gameTransaction.objectStore('gameHistory')
    const gameIndex = gameStore.index('playerId')
    
    // Delete all game history for this player
    const gameReq = gameIndex.openCursor(IDBKeyRange.only(playerId))
    gameReq.onsuccess = (event) => {
      const cursor = event.target.result
      if (cursor) {
        gameStore.delete(cursor.primaryKey)
        cursor.continue()
      }
    }
    
    // Reload the player data
    await playerStore.loginPlayer(playerId)
    
    showResetModal.value = false
    
    // Refresh the page to update stats display
    router.go(0)
  } catch (error) {
    console.error('Failed to reset statistics:', error)
    alert('Failed to reset statistics. Please try again.')
  }
}

// Helper function to open database
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('BlackjackProDB', 2)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function getOutcomeText(outcome) {
  const outcomes = {
    'win': 'WIN',
    'lose': 'LOSS',
    'push': 'PUSH'
  }
  return outcomes[outcome] || outcome.toUpperCase()
}

function getPayoutText(payout) {
  if (payout > 0) return `+$${payout}`
  if (payout < 0) return `-$${Math.abs(payout)}`
  return '$0'
}

function formatGameDate(timestamp) {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / (1000 * 60))
  
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
  return date.toLocaleDateString()
}
</script>

<style scoped>
.stats-view {
  min-height: 100vh;
  background: linear-gradient(135deg, #0f4c75 0%, #1a5490 100%);
  padding: 16px;
}

.stats-header {
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

.stats-header h1 {
  color: white;
  margin: 0;
  font-size: 24px;
}

.stats-overview {
  margin-bottom: 16px;
}

.overview-card {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 20px;
  backdrop-filter: blur(10px);
}

.card-title {
  color: white;
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
  text-align: center;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.stat-item {
  text-align: center;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  padding: 16px;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #34a853;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
}

.profit-positive {
  color: #34a853;
}

.profit-negative {
  color: #f44336;
}

/* Reset Section */
.reset-section {
  margin-bottom: 20px;
  text-align: center;
}

.btn-reset {
  background: linear-gradient(145deg, #ff9800 0%, #f57c00 100%);
  color: white;
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-reset:hover {
  background: linear-gradient(145deg, #f57c00 0%, #ff9800 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(255, 152, 0, 0.3);
}

.section-title {
  color: white;
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
}

.recent-games {
  margin-bottom: 24px;
}

.no-history {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  color: rgba(255, 255, 255, 0.7);
  font-style: italic;
}

.games-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.game-item {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-left: 4px solid transparent;
}

.game-win {
  border-left-color: #34a853;
}

.game-lose {
  border-left-color: #f44336;
}

.game-push {
  border-left-color: #ff9800;
}

.game-outcome {
  font-weight: 600;
  color: white;
}

.game-details {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
}

.game-date {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

.counting-stats {
  margin-bottom: 24px;
}

.counting-overview {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 16px;
}

.count-stat {
  text-align: center;
}

.count-value {
  font-size: 20px;
  font-weight: bold;
  color: #34a853;
  margin-bottom: 4px;
}

.count-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
}

.achievements {
  margin-bottom: 24px;
}

.achievements-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.achievement-item {
  display: flex;
  align-items: center;
  gap: 16px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 16px;
  opacity: 0.5;
  transition: all 0.2s ease;
}

.achievement-item.unlocked {
  opacity: 1;
  background: rgba(52, 168, 83, 0.1);
  border: 1px solid rgba(52, 168, 83, 0.3);
}

.achievement-icon {
  font-size: 24px;
  width: 40px;
  text-align: center;
}

.achievement-info {
  flex: 1;
}

.achievement-title {
  color: white;
  font-weight: 600;
  margin-bottom: 4px;
}

.achievement-description {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
}

/* Modal Styles */
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
}

.modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-header h3 {
  margin: 0;
  color: white;
  font-size: 20px;
}

.modal-body {
  padding: 24px;
}

.modal-body p {
  color: white;
  margin: 0 0 16px 0;
}

.reset-info {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  padding: 16px;
}

.reset-info h4 {
  color: white;
  font-size: 14px;
  margin: 0 0 8px 0;
}

.reset-info ul {
  list-style: none;
  margin: 0 0 16px 0;
  padding: 0;
}

.reset-info ul:last-child {
  margin-bottom: 0;
}

.reset-info li {
  color: rgba(255, 255, 255, 0.9);
  font-size: 13px;
  margin-bottom: 4px;
}

.modal-footer {
  padding: 0 24px 24px;
  display: flex;
  gap: 12px;
  flex-direction: column;
}

.btn {
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
  padding: 14px 24px;
  font-weight: 600;
}

.btn-confirm {
  background: linear-gradient(145deg, #ff9800 0%, #f57c00 100%);
  color: white;
}

.btn-confirm:hover {
  background: linear-gradient(145deg, #f57c00 0%, #ff9800 100%);
  transform: translateY(-1px);
}

.btn-cancel {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.btn-cancel:hover {
  background: rgba(255, 255, 255, 0.2);
}

@media (max-width: 480px) {
  .stats-view {
    padding: 12px;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .counting-overview {
    grid-template-columns: 1fr;
  }
  
  .achievement-item {
    padding: 12px;
  }
}
</style>