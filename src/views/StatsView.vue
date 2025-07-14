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
    </div>
  </template>
  
  <script setup>
  import { ref, computed, onMounted } from 'vue'
  import { usePlayerStore } from '../stores/playerStore'
  import { useCountingStore } from '../stores/countingStore'
  import { getGameHistory } from '../utils/indexedDB'
  
  const playerStore = usePlayerStore()
  const countingStore = useCountingStore()
  
  const gameHistory = ref([])
  
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
    margin-bottom: 24px;
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