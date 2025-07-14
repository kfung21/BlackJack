<template>
  <div class="game-view">
    <div class="game-container">
      <!-- Header -->
      <div class="game-header">
        <div class="player-info">
          <span class="player-name">{{ playerStore.playerName }}</span>
          <span class="bankroll">${{ playerStore.bankroll }}</span>
        </div>
        <div class="game-controls">
          <button @click="$router.push('/settings')" class="btn btn-icon">⚙️</button>
          <button @click="$router.push('/stats')" class="btn btn-icon">📊</button>
        </div>
      </div>

      <!-- Card Count Panel -->
      <CardCountPanel />

      <!-- Dealer Hand -->
      <DealerHand
        :dealer-cards="gameStore.dealerHand"
        :is-dealing="gameStore.isDealing"
        :game-phase="gameStore.gamePhase"
        :show-insurance="showInsurance"
        @take-insurance="takeInsurance"
        @decline-insurance="declineInsurance"
      />

      <!-- Game Message -->
      <div class="game-message" :class="messageClass">
        {{ gameStore.message }}
      </div>

      <!-- Player Hands -->
      <div class="player-hands-container">
        <PlayerHand
          v-for="(hand, index) in gameStore.playerHands"
          :key="`hand-${index}`"
          :hand="hand"
          :hand-index="index"
          :is-active="index === gameStore.currentHandIndex"
          :is-dealing="gameStore.isDealing"
          @card-click="onCardClick"
        />
      </div>

      <!-- Action Buttons -->
      <div class="action-buttons" v-if="gameStore.canPlay">
        <button 
          @click="hit"
          :disabled="!canHit"
          class="btn btn-action"
        >
          Hit
        </button>
        
        <button 
          @click="stand"
          :disabled="!canStand"
          class="btn btn-action btn-secondary"
        >
          Stand
        </button>
        
        <button 
          v-if="canDouble"
          @click="doubleDown"
          class="btn btn-action"
        >
          Double
        </button>
        
        <button 
          v-if="canSplitHand"
          @click="split"
          class="btn btn-action"
        >
          Split
        </button>
      </div>

      <!-- Hint Button - Always visible when playing -->
      <div class="hint-section" v-if="gameStore.canPlay && playerStore.settings.showHints">
        <button 
          @click="showHint"
          class="btn btn-hint btn-large"
        >
          💡 Get Hint
        </button>
      </div>

      <!-- Hint Modal -->
      <HintModal 
        :is-visible="showHintModal"
        @close="showHintModal = false"
      />

      <!-- Betting Panel -->
      <BettingPanel 
        v-if="gameStore.canBet"
        @bet-placed="onBetPlaced"
      />

      <!-- New Game Buttons -->
      <div class="new-game-section" v-if="gameStore.gamePhase === 'finished'">
        <div class="game-buttons">
          <button 
            @click="sameBet" 
            :disabled="!canUseSameBet"
            class="btn btn-primary btn-same-bet"
          >
            Same Bet (${{ gameStore.lastBet }})
          </button>
          <button @click="newGame" class="btn btn-secondary btn-new-game">
            New Game
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { usePlayerStore } from '../stores/playerStore'
import { useGameStore } from '../stores/gameStore'
import { useCountingStore } from '../stores/countingStore'
import { useRouter } from 'vue-router'

import CardCountPanel from '../components/CardCountPanel.vue'
import DealerHand from '../components/DealerHand.vue'
import PlayerHand from '../components/PlayerHand.vue'
import BettingPanel from '../components/BettingPanel.vue'
import HintModal from '../components/HintModal.vue'

const router = useRouter()
const playerStore = usePlayerStore()
const gameStore = useGameStore()
const countingStore = useCountingStore()

const showInsurance = ref(false)
const showHintModal = ref(false)

const messageClass = computed(() => {
  if (gameStore.message.includes('won')) return 'message-win'
  if (gameStore.message.includes('lost')) return 'message-lose'
  if (gameStore.message.includes('BUST')) return 'message-bust'
  return ''
})

const canHit = computed(() => {
  return gameStore.canPlay && gameStore.currentHand && !gameStore.currentHand.isComplete
})

const canStand = computed(() => {
  return gameStore.canPlay && gameStore.currentHand && !gameStore.currentHand.isComplete
})

const canDouble = computed(() => {
  if (!gameStore.canPlay || !gameStore.currentHand) return false
  const hand = gameStore.currentHand
  return hand.cards.length === 2 && !hand.doubled && playerStore.bankroll >= hand.bet
})

const canSplitHand = computed(() => {
  if (!gameStore.canPlay || !gameStore.currentHand) return false
  const hand = gameStore.currentHand
  if (hand.cards.length !== 2) return false
  
  const firstValue = getCardValue(hand.cards[0])
  const secondValue = getCardValue(hand.cards[1])
  return firstValue === secondValue && playerStore.bankroll >= hand.bet
})

const canUseSameBet = computed(() => {
  return gameStore.lastBet <= playerStore.bankroll && gameStore.lastBet > 0
})

onMounted(async () => {
  if (!playerStore.isLoggedIn) {
    router.push('/profile')
    return
  }
  
  gameStore.initializeGame()
  await addVisibleCardsToCount()
})

watch(() => gameStore.dealerHand, () => {
  addVisibleCardsToCount()
}, { deep: true })

watch(() => gameStore.playerHands, () => {
  addVisibleCardsToCount()
}, { deep: true })

watch(() => gameStore.gamePhase, (newPhase) => {
  if (newPhase === 'finished') {
    countingStore.resetRound()
  }
})

async function addVisibleCardsToCount() {
  // Add all visible cards to count
  const allCards = [
    ...gameStore.dealerHand.filter(card => !card.faceDown),
    ...gameStore.playerHands.flatMap(hand => hand.cards)
  ]
  
  for (const card of allCards) {
    countingStore.addCard(card)
  }
}

function getCardValue(card) {
  if (['J', 'Q', 'K'].includes(card.value)) return 10
  if (card.value === 'A') return 11
  return parseInt(card.value)
}

async function hit() {
  await gameStore.hit()
}

function stand() {
  gameStore.stand()
}

async function doubleDown() {
  await gameStore.doubleDown()
}

async function split() {
  await gameStore.split()
}

function newGame() {
  gameStore.resetGame()
  countingStore.resetRound()
}

function sameBet() {
  if (canUseSameBet.value) {
    gameStore.resetGame()
    countingStore.resetRound()
    // Small delay to ensure game is reset before placing bet
    setTimeout(() => {
      gameStore.placeBet(gameStore.lastBet)
    }, 50)
  }
}

function onBetPlaced(amount) {
  console.log(`Bet placed: $${amount}`)
}

function onCardClick(card, handIndex) {
  console.log('Card clicked:', card, 'in hand:', handIndex)
}

function takeInsurance() {
  showInsurance.value = false
}

function declineInsurance() {
  showInsurance.value = false
}

function showHint() {
  console.log('Hint button clicked!')
  console.log('Current game phase:', gameStore.gamePhase)
  console.log('Can play:', gameStore.canPlay)
  console.log('Show hints setting:', playerStore.settings.showHints)
  console.log('Current modal state:', showHintModal.value)
  
  showHintModal.value = true
  
  console.log('Modal state after setting:', showHintModal.value)
}

// Removed onHintActionSelected - hint modal is now information only
</script>

<style scoped>
.game-view {
  min-height: 100vh;
  background: linear-gradient(135deg, #0f4c75 0%, #1a5490 100%);
  padding: 16px;
}

.game-container {
  max-width: 390px;
  margin: 0 auto;
}

.game-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  backdrop-filter: blur(10px);
}

.player-info {
  display: flex;
  flex-direction: column;
}

.player-name {
  font-weight: 600;
  color: white;
  font-size: 16px;
}

.bankroll {
  font-size: 18px;
  font-weight: bold;
  color: #34a853;
}

.game-controls {
  display: flex;
  gap: 8px;
}

.btn-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  font-size: 16px;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  cursor: pointer;
}

.game-message {
  text-align: center;
  padding: 12px;
  margin: 12px 0;
  border-radius: 8px;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.message-win {
  background: rgba(52, 168, 83, 0.2);
  color: #34a853;
  border: 1px solid rgba(52, 168, 83, 0.3);
}

.message-lose {
  background: rgba(244, 67, 54, 0.2);
  color: #f44336;
  border: 1px solid rgba(244, 67, 54, 0.3);
}

.message-bust {
  background: rgba(244, 67, 54, 0.3);
  color: #ff5722;
  border: 1px solid rgba(244, 67, 54, 0.5);
  animation: pulse 1s ease-in-out;
}

.player-hands-container {
  margin: 16px 0;
}

.action-buttons {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
  gap: 12px;
  margin: 16px 0;
}

.btn {
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-action {
  padding: 14px 16px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 12px;
  background: linear-gradient(145deg, #2196f3 0%, #1976d2 100%);
  color: white;
}

.btn-secondary {
  background: linear-gradient(145deg, #ff9800 0%, #f57c00 100%);
}

.hint-section {
  text-align: center;
  margin: 16px 0;
}

.btn-hint {
  background: linear-gradient(145deg, #9c27b0 0%, #7b1fa2 100%);
  color: white;
  width: 100%;
}

.btn-large {
  padding: 16px 24px;
  font-size: 18px;
  font-weight: bold;
}

.new-game-section {
  text-align: center;
  margin: 24px 0;
}

.game-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.btn-same-bet {
  flex: 1;
  padding: 16px 24px;
  font-size: 16px;
  font-weight: bold;
  background: linear-gradient(145deg, #34a853 0%, #2d8659 100%);
  border-radius: 12px;
  color: white;
}

.btn-new-game {
  flex: 1;
  padding: 16px 24px;
  font-size: 16px;
  font-weight: bold;
  border-radius: 12px;
  background: linear-gradient(145deg, #666 0%, #555 100%);
  color: white;
}

.btn-same-bet:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: linear-gradient(145deg, #666 0%, #888 100%);
}

.btn-primary {
  background: linear-gradient(145deg, #34a853 0%, #2d8659 100%);
  color: white;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

@media (max-width: 480px) {
  .game-view {
    padding: 12px;
  }
  
  .action-buttons {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>