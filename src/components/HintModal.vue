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

// Store references
const gameStore = useGameStore()
const countingStore = useCountingStore()
const playerStore = usePlayerStore()

const playerHand = computed(() => {
  return gameStore?.currentHand?.cards || []
})

const dealerUpCard = computed(() => {
  return gameStore?.dealerUpCard || null
})

const playerHandValue = computed(() => {
  return calculateHandValue(playerHand.value)
})

const playerHandText = computed(() => {
  const value = playerHandValue.value
  if (value.soft && value.total <= 21) {
    return `${value.total} (soft)`
  }
  return value.total.toString()
})

const dealerUpCardText = computed(() => {
  const card = dealerUpCard.value
  return card ? `${card.value}${getSuitSymbol(card.suit)}` : 'Unknown'
})

const formattedTrueCount = computed(() => {
  const tc = countingStore?.trueCount || 0
  return tc > 0 ? `+${tc}` : tc.toString()
})

const formattedRunningCount = computed(() => {
  const rc = countingStore?.runningCount || 0
  return rc > 0 ? `+${rc}` : rc.toString()
})

const countClass = computed(() => {
  const tc = countingStore?.trueCount || 0
  if (tc >= 2) return 'positive'
  if (tc <= -2) return 'negative'
  return 'neutral'
})

const recommendation = computed(() => {
  return getOptimalPlay()
})

const basicStrategyText = computed(() => {
  const playerTotal = playerHandValue.value.total
  const dealerValue = getDealerValue()
  const isSoft = playerHandValue.value.soft
  
  if (isSoft) {
    return getSoftHandStrategy(playerTotal, dealerValue)
  } else {
    return getHardHandStrategy(playerTotal, dealerValue)
  }
})

const countAdjustment = computed(() => {
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
})

const availableActions = computed(() => {
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
})

// Enhanced optimal play function that considers count
function getOptimalPlay() {
  const playerTotal = playerHandValue.value.total
  const dealerValue = getDealerValue()
  const isSoft = playerHandValue.value.soft
  const trueCount = countingStore?.trueCount || 0
  const canDoubleNow = canDouble()
  
  // Check for pairs first
  if (canSplit()) {
    const pairValue = playerHand.value[0].value
    
    // Always split aces and 8s
    if (pairValue === 'A' || pairValue === '8') {
      return { action: 'split', reason: 'Always split Aces and 8s', confidence: 'Very High' }
    }
    
    // Count-based pair splitting
    if (pairValue === '10' && trueCount >= 4 && dealerValue >= 4 && dealerValue <= 6) {
      return { action: 'split', reason: 'Split 10s vs weak dealer with high count', confidence: 'High' }
    }
  }
  
  // SOFT HANDS
  if (isSoft) {
    // Soft 19-21
    if (playerTotal >= 19) {
      return { action: 'stand', reason: 'Strong soft total', confidence: 'Very High' }
    }
    
    // Soft 18
    if (playerTotal === 18) {
      if (dealerValue >= 9 || dealerValue === 1) {
        return { action: 'hit', reason: 'Hit soft 18 vs strong dealer', confidence: 'High' }
      }
      if (canDoubleNow && dealerValue >= 3 && dealerValue <= 6) {
        return { action: 'double', reason: 'Double soft 18 vs weak dealer', confidence: 'High' }
      }
      return { action: 'stand', reason: 'Stand soft 18', confidence: 'High' }
    }
    
    // Soft 17 and below
    if (canDoubleNow && dealerValue >= 3 && dealerValue <= 6) {
      return { action: 'double', reason: 'Double soft hand vs weak dealer', confidence: 'High' }
    }
    return { action: 'hit', reason: 'Hit soft 17 or less', confidence: 'High' }
  }
  
  // HARD HANDS WITH COUNT ADJUSTMENTS
  
  // Hard 11
  if (playerTotal === 11) {
    if (canDoubleNow) {
      // With positive count, double even vs Ace
      if (trueCount >= 1 || dealerValue !== 1) {
        return { action: 'double', reason: 'Double 11 - best doubling hand', confidence: 'Very High' }
      }
    }
    return { action: 'hit', reason: 'Hit 11 (can\'t double)', confidence: 'High' }
  }
  
  // Hard 10
  if (playerTotal === 10) {
    if (canDoubleNow) {
      // Double vs 2-9 always, vs 10/A with positive count
      if (dealerValue <= 9 || (trueCount >= 4 && dealerValue === 10)) {
        return { action: 'double', reason: 'Double 10 vs ' + dealerValue, confidence: 'Very High' }
      }
    }
    return { action: 'hit', reason: 'Hit 10', confidence: 'High' }
  }
  
  // Hard 9
  if (playerTotal === 9) {
    if (canDoubleNow && dealerValue >= 3 && dealerValue <= 6) {
      // With high count, also double vs 2
      if (dealerValue >= 3 || trueCount >= 3) {
        return { action: 'double', reason: 'Double 9 vs weak dealer', confidence: 'High' }
      }
    }
    return { action: 'hit', reason: 'Hit 9', confidence: 'High' }
  }
  
  // Hard 16
  if (playerTotal === 16) {
    // Stand vs 10 with positive count
    if (dealerValue === 10 && trueCount >= 0) {
      return { action: 'stand', reason: 'Stand 16 vs 10 with count >= 0', confidence: 'Medium' }
    }
    // Stand vs weak dealer
    if (dealerValue >= 2 && dealerValue <= 6) {
      return { action: 'stand', reason: 'Stand 16 vs weak dealer', confidence: 'High' }
    }
    return { action: 'hit', reason: 'Hit 16 vs strong dealer', confidence: 'Medium' }
  }
  
  // Hard 15
  if (playerTotal === 15) {
    // Stand vs 10 with high count
    if (dealerValue === 10 && trueCount >= 4) {
      return { action: 'stand', reason: 'Stand 15 vs 10 with TC +4', confidence: 'Medium' }
    }
    if (dealerValue >= 2 && dealerValue <= 6) {
      return { action: 'stand', reason: 'Stand 15 vs weak dealer', confidence: 'High' }
    }
    return { action: 'hit', reason: 'Hit 15 vs strong dealer', confidence: 'High' }
  }
  
  // Hard 13-14
  if (playerTotal >= 13 && playerTotal <= 14) {
    if (dealerValue >= 2 && dealerValue <= 6) {
      return { action: 'stand', reason: 'Stand stiff hand vs weak dealer', confidence: 'High' }
    }
    return { action: 'hit', reason: 'Hit stiff hand vs strong dealer', confidence: 'High' }
  }
  
  // Hard 12
  if (playerTotal === 12) {
    // Hit 12 vs 2/3 with negative count
    if ((dealerValue === 2 || dealerValue === 3) && trueCount < -1) {
      return { action: 'hit', reason: 'Hit 12 vs 2/3 with negative count', confidence: 'Medium' }
    }
    if (dealerValue >= 4 && dealerValue <= 6) {
      return { action: 'stand', reason: 'Stand 12 vs weak dealer', confidence: 'High' }
    }
    return { action: 'hit', reason: 'Hit 12 vs strong dealer', confidence: 'High' }
  }
  
  // Hard 17+
  if (playerTotal >= 17) {
    return { action: 'stand', reason: 'Stand on hard 17+', confidence: 'Very High' }
  }
  
  // Hard 8 and below
  if (playerTotal <= 8) {
    return { action: 'hit', reason: 'Always hit 8 or less', confidence: 'Very High' }
  }
  
  // Default
  return { action: 'hit', reason: 'Default action', confidence: 'Low' }
}

function getBasicStrategyAction() {
  const playerTotal = playerHandValue.value.total
  const dealerValue = getDealerValue()
  const isSoft = playerHandValue.value.soft
  
  if (playerTotal >= 17) return 'stand'
  if (playerTotal <= 11) return canDouble() && playerTotal >= 9 ? 'double' : 'hit'
  if (playerTotal >= 12 && playerTotal <= 16) {
    return dealerValue >= 7 ? 'hit' : 'stand'
  }
  return 'hit'
}

function getSoftHandStrategy(total, dealerValue) {
  if (total >= 19) return 'Stand - strong soft total'
  if (total === 18) return 'Soft 18 - double vs 3-6, stand vs 2,7,8, hit vs 9,10,A'
  if (total <= 17) return 'Hit soft 17 or less, double vs weak dealer if possible'
  return 'Follow basic strategy chart'
}

function getHardHandStrategy(total, dealerValue) {
  if (total >= 17) return 'Stand - hard 17 or higher'
  if (total === 11) return 'Double if possible - best doubling hand'
  if (total === 10) return 'Double vs 2-9, hit vs 10/A'
  if (total === 9) return 'Double vs 3-6, hit otherwise'
  if (total <= 8) return 'Hit - cannot bust'
  if (total >= 12 && total <= 16) {
    return dealerValue >= 7 ? 'Hit vs strong dealer' : 'Stand vs weak dealer (2-6)'
  }
  return 'Follow basic strategy chart'
}

function getDealerValue() {
  const card = dealerUpCard.value
  if (!card) return 10
  if (card.value === 'A') return 1
  if (['J', 'Q', 'K'].includes(card.value)) return 10
  return parseInt(card.value) || 10
}

function canDouble() {
  return gameStore?.currentHand?.cards.length === 2 && 
         (playerStore?.bankroll || 0) >= (gameStore?.currentHand?.bet || 0)
}

function canSplit() {
  const hand = gameStore?.currentHand
  if (!hand || hand.cards.length !== 2) return false
  
  const card1Value = hand.cards[0].value
  const card2Value = hand.cards[1].value
  
  const getValue = (card) => ['J', 'Q', 'K'].includes(card) ? '10' : card
  return getValue(card1Value) === getValue(card2Value) && 
         (playerStore?.bankroll || 0) >= (hand.bet || 0)
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