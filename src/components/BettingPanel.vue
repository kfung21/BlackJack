<template>
  <div class="betting-panel" v-if="gameStore.canBet">
    <div class="bankroll-display">
      <div class="bankroll-amount">${{ playerStore.bankroll }}</div>
      <div class="bankroll-label">Available</div>
    </div>
    
    <div class="bet-suggestions" v-if="showCountingSuggestion">
      <div class="suggestion" :class="`suggestion-${countAdvice.level}`">
        <div class="suggestion-message">{{ countAdvice.message }}</div>
        <div class="suggested-bet">Suggested: ${{ countAdvice.suggestedBet }}</div>
      </div>
    </div>
    
    <div class="bet-input-section">
      <div class="bet-amount-display">
        <span class="currency">$</span>
        <span class="amount">{{ currentBet }}</span>
      </div>
      
      <div class="bet-controls">
        <div class="quick-bets">
          <button 
            v-for="amount in quickBetAmounts"
            :key="amount"
            @click="setBet(amount)"
            :disabled="amount > playerStore.bankroll"
            class="btn bet-btn"
            :class="{ 'active': currentBet === amount }"
          >
            ${{ amount }}
          </button>
        </div>
        
        <div class="bet-adjusters">
          <button @click="decreaseBet" :disabled="currentBet <= 5" class="btn btn-adjuster">-</button>
          <button @click="increaseBet" :disabled="currentBet >= playerStore.bankroll" class="btn btn-adjuster">+</button>
        </div>
      </div>
    </div>
    
    <div class="action-buttons">
      <button 
        @click="placeBet"
        :disabled="!canPlaceBet"
        class="btn btn-primary deal-btn"
      >
        Deal Cards - ${{ currentBet }}
      </button>
      
      <button 
        @click="maxBet"
        :disabled="playerStore.bankroll <= 0"
        class="btn btn-secondary"
      >
        Max Bet
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { usePlayerStore } from '../stores/playerStore'
import { useGameStore } from '../stores/gameStore'
import { useCountingStore } from '../stores/countingStore'

const emit = defineEmits(['betPlaced'])

const playerStore = usePlayerStore()
const gameStore = useGameStore()
const countingStore = useCountingStore()

const currentBet = ref(15)

const quickBetAmounts = computed(() => {
  const amounts = [5, 10, 15, 25, 50, 100]
  return amounts.filter(amount => amount <= playerStore.bankroll)
})

const canPlaceBet = computed(() => {
  return currentBet.value > 0 && currentBet.value <= playerStore.bankroll
})

const showCountingSuggestion = computed(() => {
  return playerStore.settings.showCount && countingStore.totalCardsSeen > 10
})

const countAdvice = computed(() => {
  return countingStore.getCountAdvice()
})

watch(countAdvice, (newAdvice) => {
  if (playerStore.settings.showCount && newAdvice.suggestedBet) {
    // Auto-adjust bet based on count (optional)
    if (playerStore.settings.autoAdjustBet) {
      currentBet.value = Math.min(newAdvice.suggestedBet, playerStore.bankroll)
    }
  }
}, { deep: true })

function setBet(amount) {
  currentBet.value = Math.min(amount, playerStore.bankroll)
}

function increaseBet() {
  const increment = currentBet.value < 50 ? 5 : (currentBet.value < 100 ? 10 : 25)
  currentBet.value = Math.min(currentBet.value + increment, playerStore.bankroll)
}

function decreaseBet() {
  const decrement = currentBet.value <= 50 ? 5 : (currentBet.value <= 100 ? 10 : 25)
  currentBet.value = Math.max(currentBet.value - decrement, 5)
}

function maxBet() {
  currentBet.value = Math.min(playerStore.bankroll, 500) // Cap max bet
}

function placeBet() {
  if (canPlaceBet.value) {
    // Update the last bet in gameStore
    gameStore.lastBet = currentBet.value
    
    // Use the multiplayer-aware bet function
    gameStore.placeMainPlayerBet(currentBet.value)
    emit('betPlaced', currentBet.value)
  }
}
</script>

<style scoped>
.betting-panel {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 20px;
  margin: 16px 0;
  backdrop-filter: blur(10px);
}

.bankroll-display {
  text-align: center;
  margin-bottom: 16px;
}

.bankroll-amount {
  font-size: 24px;
  font-weight: bold;
  color: #34a853;
}

.bankroll-label {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
}

.bet-suggestions {
  margin-bottom: 16px;
}

.suggestion {
  padding: 12px;
  border-radius: 8px;
  text-align: center;
  font-size: 14px;
}

.suggestion-favorable {
  background: rgba(52, 168, 83, 0.2);
  border: 1px solid rgba(52, 168, 83, 0.3);
  color: #34a853;
}

.suggestion-slightly-favorable {
  background: rgba(33, 150, 243, 0.2);
  border: 1px solid rgba(33, 150, 243, 0.3);
  color: #2196f3;
}

.suggestion-unfavorable {
  background: rgba(244, 67, 54, 0.2);
  border: 1px solid rgba(244, 67, 54, 0.3);
  color: #f44336;
}

.suggestion-neutral {
  background: rgba(158, 158, 158, 0.2);
  border: 1px solid rgba(158, 158, 158, 0.3);
  color: #9e9e9e;
}

.suggestion-message {
  font-weight: 600;
  margin-bottom: 4px;
}

.suggested-bet {
  font-size: 12px;
  opacity: 0.9;
}

.bet-input-section {
  margin-bottom: 20px;
}

.bet-amount-display {
  display: flex;
  justify-content: center;
  align-items: baseline;
  margin-bottom: 16px;
  font-size: 32px;
  font-weight: bold;
  color: #fff;
}

.currency {
  font-size: 24px;
  margin-right: 4px;
  color: rgba(255, 255, 255, 0.7);
}

.bet-controls {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.quick-bets {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  justify-content: center;
}

.bet-btn {
  min-width: 60px;
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  transition: all 0.2s ease;
}

.bet-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.4);
}

.bet-btn.active {
  background: #34a853;
  border-color: #34a853;
  color: white;
}

.bet-adjusters {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.btn-adjuster {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  font-size: 20px;
  font-weight: bold;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
}

.action-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.deal-btn {
  flex: 1;
  padding: 16px 24px;
  font-size: 18px;
  font-weight: bold;
  background: linear-gradient(145deg, #34a853 0%, #2d8659 100%);
}

.deal-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 480px) {
  .betting-panel {
    padding: 16px;
  }
  
  .bet-amount-display {
    font-size: 28px;
  }
  
  .quick-bets {
    grid-template-columns: repeat(3, 1fr);
  }
  
  .action-buttons {
    flex-direction: column;
  }
}
</style>