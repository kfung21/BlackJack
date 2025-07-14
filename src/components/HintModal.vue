<template>
  <div v-if="isVisible" class="modal-overlay" @click="closeModal">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>🎯 Optimal Play Hint</h3>
        <button @click="closeModal" class="close-btn">✕</button>
      </div>
      
      <div class="modal-body">
        <!-- Current Situation -->
        <div class="situation-section">
          <h4>Current Situation</h4>
          <div class="situation-grid">
            <div class="situation-item">
              <span class="label">Your Hand:</span>
              <span class="value">{{ playerHandText }}</span>
            </div>
            <div class="situation-item">
              <span class="label">Dealer Shows:</span>
              <span class="value">{{ dealerUpCardText }}</span>
            </div>
            <div class="situation-item">
              <span class="label">True Count:</span>
              <span class="value" :class="countClass">{{ formattedTrueCount }}</span>
            </div>
            <div class="situation-item">
              <span class="label">Running Count:</span>
              <span class="value">{{ formattedRunningCount }}</span>
            </div>
          </div>
        </div>

        <!-- Recommended Action -->
        <div class="recommendation-section">
          <div class="recommendation" :class="`rec-${recommendation.action}`">
            <div class="rec-action">RECOMMENDED: {{ recommendation.action.toUpperCase() }}</div>
            <div class="rec-reason">{{ recommendation.reason }}</div>
            <div class="rec-confidence">Confidence: {{ recommendation.confidence }}</div>
          </div>
        </div>

        <!-- Basic Strategy Info -->
        <div class="strategy-section">
          <h4>Basic Strategy</h4>
          <p class="strategy-text">{{ basicStrategyText }}</p>
        </div>

        <!-- Count Adjustment -->
        <div v-if="countAdjustment" class="count-section">
          <h4>Count Adjustment</h4>
          <p class="count-text">{{ countAdjustment }}</p>
        </div>

        <!-- Available Actions Summary -->
        <div class="actions-section">
          <h4>Action Summary</h4>
          <div class="action-summary">
            <div 
              v-for="action in availableActions"
              :key="action.name"
              :class="['action-summary-item', { 'recommended': action.recommended }]"
            >
              <span class="action-name">{{ action.name.toUpperCase() }}</span>
              <span v-if="action.recommended" class="rec-indicator">⭐ BEST</span>
              <span v-else class="not-rec-indicator">{{ action.advice }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="modal-footer">
        <button @click="closeModal" class="btn btn-primary btn-large">
          Got It! Let Me Decide
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useGameStore } from '../stores/gameStore'
import { useCountingStore } from '../stores/countingStore'
import { usePlayerStore } from '../stores/playerStore'
import { calculateHandValue } from '../utils/gameRules'

const props = defineProps({
  isVisible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close'])

// Store references - wrapped in try/catch for safety
let gameStore, countingStore, playerStore
try {
  gameStore = useGameStore()
  countingStore = useCountingStore()
  playerStore = usePlayerStore()
} catch (error) {
  console.error('Error accessing stores:', error)
}

const playerHand = computed(() => {
  try {
    return gameStore?.currentHand?.cards || []
  } catch {
    return []
  }
})

const dealerUpCard = computed(() => {
  try {
    return gameStore?.dealerUpCard || null
  } catch {
    return null
  }
})

const playerHandValue = computed(() => {
  try {
    return calculateHandValue(playerHand.value)
  } catch {
    return { total: 0, soft: false, busted: false }
  }
})

const playerHandText = computed(() => {
  try {
    const value = playerHandValue.value
    if (value.soft && value.total <= 21) {
      return `${value.total} (soft)`
    }
    return value.total.toString()
  } catch {
    return '0'
  }
})

const dealerUpCardText = computed(() => {
  try {
    const card = dealerUpCard.value
    return card ? `${card.value}${getSuitSymbol(card.suit)}` : 'Unknown'
  } catch {
    return 'Unknown'
  }
})

const formattedTrueCount = computed(() => {
  try {
    const tc = countingStore?.trueCount || 0
    return tc > 0 ? `+${tc}` : tc.toString()
  } catch {
    return '0'
  }
})

const formattedRunningCount = computed(() => {
  try {
    const rc = countingStore?.runningCount || 0
    return rc > 0 ? `+${rc}` : rc.toString()
  } catch {
    return '0'
  }
})

const countClass = computed(() => {
  try {
    const tc = countingStore?.trueCount || 0
    if (tc >= 2) return 'positive'
    if (tc <= -2) return 'negative'
    return 'neutral'
  } catch {
    return 'neutral'
  }
})

const recommendation = computed(() => {
  try {
    return getOptimalPlay()
  } catch {
    return { action: 'hit', reason: 'Error calculating recommendation', confidence: 'Unknown' }
  }
})

const basicStrategyText = computed(() => {
  try {
    const playerTotal = playerHandValue.value.total
    const dealerValue = getDealerValue()
    const isSoft = playerHandValue.value.soft
    
    if (isSoft) {
      return getSoftHandStrategy(playerTotal, dealerValue)
    } else {
      return getHardHandStrategy(playerTotal, dealerValue)
    }
  } catch {
    return 'Error calculating basic strategy'
  }
})

const countAdjustment = computed(() => {
  try {
    const tc = countingStore?.trueCount || 0
    const basicAction = getBasicStrategyAction()
    const optimalAction = recommendation.value.action
    
    if (basicAction !== optimalAction) {
      if (tc >= 2) {
        return `High count (+${tc}) suggests more aggressive play. Consider ${optimalAction} instead of ${basicAction}.`
      } else if (tc <= -2) {
        return `Low count (${tc}) suggests conservative play. Consider ${optimalAction} instead of ${basicAction}.`
      }
    }
    return null
  } catch {
    return null
  }
})

const availableActions = computed(() => {
  try {
    const actions = []
    const recAction = recommendation.value.action
    
    actions.push({ 
      name: 'hit', 
      recommended: recAction === 'hit',
      advice: recAction === 'hit' ? 'Recommended' : 'Not optimal for this situation'
    })
    
    actions.push({ 
      name: 'stand', 
      recommended: recAction === 'stand',
      advice: recAction === 'stand' ? 'Recommended' : 'Not optimal for this situation'
    })
    
    if (canDouble()) {
      actions.push({ 
        name: 'double', 
        recommended: recAction === 'double',
        advice: recAction === 'double' ? 'Recommended' : 'Available but not optimal'
      })
    }
    
    if (canSplit()) {
      actions.push({ 
        name: 'split', 
        recommended: recAction === 'split',
        advice: recAction === 'split' ? 'Recommended' : 'Available but not optimal'
      })
    }
    
    return actions
  } catch {
    return [{ name: 'hit', recommended: true, advice: 'Default recommendation' }]
  }
})

function getOptimalPlay() {
  try {
    const playerTotal = playerHandValue.value.total
    const dealerValue = getDealerValue()
    const isSoft = playerHandValue.value.soft
    const trueCount = countingStore?.trueCount || 0
    
    // Basic hit/stand logic for safety
    if (playerTotal >= 17) {
      return { action: 'stand', reason: 'Strong total', confidence: 'High' }
    }
    if (playerTotal <= 11) {
      return { action: 'hit', reason: 'Cannot bust', confidence: 'High' }
    }
    
    // Stiff hands (12-16)
    if (dealerValue >= 2 && dealerValue <= 6) {
      return { action: 'stand', reason: 'Dealer likely to bust', confidence: 'Medium' }
    } else {
      return { action: 'hit', reason: 'Must improve vs strong dealer', confidence: 'Medium' }
    }
  } catch {
    return { action: 'hit', reason: 'Default recommendation', confidence: 'Unknown' }
  }
}

function getBasicStrategyAction() {
  try {
    const playerTotal = playerHandValue.value.total
    const dealerValue = getDealerValue()
    const isSoft = playerHandValue.value.soft
    
    if (playerTotal >= 17) return 'stand'
    if (playerTotal <= 11) return 'hit'
    if (playerTotal >= 12 && playerTotal <= 16) {
      return dealerValue >= 7 ? 'hit' : 'stand'
    }
    return 'hit'
  } catch {
    return 'hit'
  }
}

function getSoftHandStrategy(total, dealerValue) {
  if (total >= 19) return 'Stand - strong soft total'
  if (total <= 17) return 'Hit - cannot bust with soft ace'
  return 'Soft 18 - hit vs 9,10,A; stand vs 2-8'
}

function getHardHandStrategy(total, dealerValue) {
  if (total >= 17) return 'Stand - strong total'
  if (total <= 11) return 'Hit - cannot bust'
  if (total >= 12 && total <= 16) {
    return dealerValue >= 7 ? 'Hit vs strong dealer' : 'Stand vs weak dealer'
  }
  return 'Follow basic strategy chart'
}

function getDealerValue() {
  try {
    const card = dealerUpCard.value
    if (!card) return 10 // Assume 10 if unknown
    if (card.value === 'A') return 1 // Ace
    if (['J', 'Q', 'K'].includes(card.value)) return 10
    return parseInt(card.value) || 10
  } catch {
    return 10
  }
}

function canDouble() {
  try {
    return gameStore?.currentHand?.cards.length === 2 && 
           (playerStore?.bankroll || 0) >= (gameStore?.currentHand?.bet || 0)
  } catch {
    return false
  }
}

function canSplit() {
  try {
    const hand = gameStore?.currentHand
    if (!hand || hand.cards.length !== 2) return false
    
    const card1Value = hand.cards[0].value
    const card2Value = hand.cards[1].value
    
    // Check if values are the same (treating all 10-value cards as equivalent)
    const getValue = (card) => ['J', 'Q', 'K'].includes(card) ? '10' : card
    return getValue(card1Value) === getValue(card2Value) && 
           (playerStore?.bankroll || 0) >= (hand.bet || 0)
  } catch {
    return false
  }
}

function getSuitSymbol(suit) {
  const symbols = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠'
  }
  return symbols[suit] || ''
}

function closeModal() {
  emit('close')
}
</script>

<style scoped>
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
  max-width: 400px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-header h3 {
  color: white;
  margin: 0;
  font-size: 20px;
}

.close-btn {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.modal-body {
  padding: 16px 24px;
}

.situation-section,
.recommendation-section,
.strategy-section,
.count-section,
.actions-section {
  margin-bottom: 20px;
}

.situation-section h4,
.strategy-section h4,
.count-section h4,
.actions-section h4 {
  color: white;
  margin: 0 0 12px 0;
  font-size: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 4px;
}

.situation-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

.situation-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
}

.label {
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
}

.value {
  color: white;
  font-weight: 600;
  font-size: 14px;
}

.value.positive {
  color: #34a853;
}

.value.negative {
  color: #f44336;
}

.value.neutral {
  color: #ff9800;
}

.recommendation {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 16px;
  text-align: center;
  border: 2px solid;
}

.rec-hit {
  border-color: #2196f3;
  background: rgba(33, 150, 243, 0.1);
}

.rec-stand {
  border-color: #ff9800;
  background: rgba(255, 152, 0, 0.1);
}

.rec-double {
  border-color: #34a853;
  background: rgba(52, 168, 83, 0.1);
}

.rec-split {
  border-color: #9c27b0;
  background: rgba(156, 39, 176, 0.1);
}

.rec-action {
  font-size: 20px;
  font-weight: bold;
  color: white;
  margin-bottom: 8px;
}

.rec-reason {
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  margin-bottom: 4px;
}

.rec-confidence {
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
}

.strategy-text,
.count-text {
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  line-height: 1.5;
  margin: 0;
}

.action-summary {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.action-summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  border-left: 4px solid transparent;
}

.action-summary-item.recommended {
  border-left-color: #ffd700;
  background: rgba(255, 215, 0, 0.1);
}

.action-name {
  font-weight: 600;
  color: white;
}

.rec-indicator {
  color: #ffd700;
  font-weight: bold;
  font-size: 12px;
}

.not-rec-indicator {
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
}

.modal-footer {
  padding: 16px 24px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  text-align: center;
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

.btn-large {
  padding: 16px 32px;
  font-size: 16px;
  font-weight: bold;
  width: 100%;
}

@media (max-width: 480px) {
  .modal-content {
    margin: 8px;
    max-height: 95vh;
  }
  
  .modal-header,
  .modal-body,
  .modal-footer {
    padding-left: 16px;
    padding-right: 16px;
  }
  
  .situation-grid {
    grid-template-columns: 1fr;
  }
}
</style>