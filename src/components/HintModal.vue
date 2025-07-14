<template>
  <div v-if="isVisible" class="hint-modal-overlay" @click="closeModal">
    <div class="hint-modal" @click.stop>
      <div class="modal-header">
        <h2>Play Hint</h2>
        <button @click="closeModal" class="close-btn">✕</button>
      </div>
      
      <div class="modal-content">
        <!-- Current Situation - More Compact -->
        <div class="hint-section">
          <h3>Situation</h3>
          <div class="situation-grid compact">
            <div class="situation-item">
              <span class="label">Your Hand:</span>
              <span class="value">{{ handValue }}</span>
            </div>
            <div class="situation-item">
              <span class="label">Dealer:</span>
              <span class="value">{{ dealerUpCard }}</span>
            </div>
            <div class="situation-item" v-if="showCount">
              <span class="label">TC:</span>
              <span class="value" :class="countClass">{{ trueCountDisplay }}</span>
            </div>
            <div class="situation-item" v-if="showCount">
              <span class="label">RC:</span>
              <span class="value">{{ runningCount }}</span>
            </div>
          </div>
        </div>

        <!-- Recommendation - Condensed -->
        <div class="recommendation-box compact">
          <div class="action-recommendation">{{ recommendedAction }}</div>
          <div class="recommendation-reason">{{ recommendationReason }}</div>
          <div class="confidence">Confidence: <span class="confidence-level">{{ confidence }}</span></div>
        </div>

        <!-- Basic Strategy - Single Line -->
        <div class="hint-section">
          <p class="strategy-text">{{ basicStrategyExplanation }}</p>
        </div>

        <!-- Action Summary - Horizontal -->
        <div class="hint-section">
          <div class="action-grid compact">
            <div 
              v-for="action in possibleActions" 
              :key="action.type"
              class="action-item"
              :class="{ best: action.isBest, worst: action.isWorst }"
            >
              <span class="action-name">{{ action.type }}</span>
              <span class="action-rating">{{ action.rating }}</span>
            </div>
          </div>
        </div>

        <!-- Count Adjustment - Only if applicable -->
        <div v-if="showCountAdjustment" class="hint-section compact">
          <p class="count-advice">{{ countAdvice }}</p>
        </div>
      </div>

      <div class="modal-footer">
        <button @click="closeModal" class="btn btn-primary">Got it!</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useGameStore } from '../stores/gameStore'
import { usePlayerStore } from '../stores/playerStore'
import { useCountingStore } from '../stores/countingStore'
import { calculateHandValue, canSplit, canDoubleDown } from '../utils/gameRules'
import { getBotDecision } from '../utils/botStrategy'

const props = defineProps({
  isVisible: {
    type: Boolean,
    required: true
  }
})

const emit = defineEmits(['close'])

const gameStore = useGameStore()
const playerStore = usePlayerStore()
const countingStore = useCountingStore()

const currentHand = computed(() => {
  const player = gameStore.activeViewPlayer
  if (!player || !player.hands || player.hands.length === 0) return null
  
  const handIndex = player.currentHandIndex || 0
  return player.hands[handIndex]
})

const handValue = computed(() => {
  if (!currentHand.value) return 0
  const value = calculateHandValue(currentHand.value.cards)
  if (value.soft && value.total <= 21) {
    return `${value.total} (soft)`
  }
  return value.total
})

const dealerUpCard = computed(() => {
  const card = gameStore.dealerUpCard
  if (!card) return '?'
  if (card.value === 'A') return 'A'
  if (['J', 'Q', 'K'].includes(card.value)) return '10'
  return card.value
})

const showCount = computed(() => {
  return playerStore.settings.showCount || playerStore.settings.showTrueCount
})

const trueCountDisplay = computed(() => {
  return countingStore.trueCount.toFixed(1)
})

const runningCount = computed(() => {
  return countingStore.runningCount > 0 ? `+${countingStore.runningCount}` : countingStore.runningCount.toString()
})

const countClass = computed(() => {
  if (countingStore.trueCount >= 2) return 'count-positive'
  if (countingStore.trueCount <= -2) return 'count-negative'
  return 'count-neutral'
})

const recommendedAction = computed(() => {
  if (!currentHand.value) return 'HIT'
  
  // Get basic strategy decision
  let decision = getBotDecision(
    currentHand.value,
    gameStore.dealerUpCard,
    playerStore.bankroll
  )
  
  // Apply count-based adjustments
  const tc = countingStore.trueCount
  const handVal = typeof handValue.value === 'string' ? 
    parseInt(handValue.value) : handValue.value
  const dealerVal = dealerUpCard.value
  
  // True count adjustments for close decisions
  if (tc >= 3) {
    // Very positive count - be more aggressive
    if (handVal === 12 && dealerVal >= 2 && dealerVal <= 6 && decision === 'hit') {
      decision = 'stand' // Stand on 12 vs weak dealer with high count
    }
    if (handVal === 16 && dealerVal === 10 && decision === 'hit') {
      decision = 'stand' // Stand on 16 vs 10 with high count
    }
    if (handVal === 15 && dealerVal === 10 && decision === 'hit' && tc >= 4) {
      decision = 'stand' // Stand on 15 vs 10 with very high count
    }
  } else if (tc <= -2) {
    // Negative count - be more conservative
    if (handVal === 12 && dealerVal === 4 && decision === 'stand') {
      decision = 'hit' // Hit 12 vs 4 with negative count
    }
    if (handVal === 13 && dealerVal === 2 && decision === 'stand') {
      decision = 'hit' // Hit 13 vs 2 with negative count
    }
  }
  
  return decision.toUpperCase()
})

const recommendationReason = computed(() => {
  const action = recommendedAction.value.toLowerCase()
  const dealerVal = dealerUpCard.value
  const handVal = typeof handValue.value === 'string' ? 
    parseInt(handValue.value) : handValue.value
  const tc = countingStore.trueCount
  
  // Check if count influenced the decision
  if (Math.abs(tc) >= 2) {
    if (tc >= 3 && action === 'stand' && handVal <= 16) {
      return `High count (+${tc.toFixed(1)}) favors standing`
    }
    if (tc <= -2 && action === 'hit' && handVal >= 12 && handVal <= 13) {
      return `Low count (${tc.toFixed(1)}) favors hitting`
    }
  }
  
  if (action === 'hit') {
    if (handVal <= 11) return 'No risk of busting'
    if (dealerVal === 'A' || dealerVal >= 9) return `Hit against strong dealer ${dealerVal}`
    return 'Hand too weak to stand'
  }
  
  if (action === 'stand') {
    if (handVal >= 17) return 'Strong hand - avoid busting'
    if (dealerVal >= 2 && dealerVal <= 6) return `Stand against weak dealer ${dealerVal}`
    return 'Best odds to avoid busting'
  }
  
  if (action === 'double') {
    if (handVal === 11) return 'Always double on 11'
    if (handVal === 10 && dealerVal !== 'A' && dealerVal !== '10') {
      return 'Double 10 vs weak dealer'
    }
    return 'Favorable double down situation'
  }
  
  if (action === 'split') {
    const firstCard = currentHand.value?.cards[0]?.value
    if (firstCard === 'A') return 'Always split aces'
    if (firstCard === '8') return 'Always split 8s'
    return 'Favorable split opportunity'
  }
  
  return 'Based on basic strategy'
})

const confidence = computed(() => {
  const action = recommendedAction.value.toLowerCase()
  const handVal = typeof handValue.value === 'string' ? 
    parseInt(handValue.value) : handValue.value
  
  // High confidence situations
  if (handVal <= 11 && action === 'hit') return 'HIGH'
  if (handVal >= 17 && action === 'stand') return 'HIGH'
  if (handVal === 11 && action === 'double') return 'HIGH'
  if (handVal === 20 && action === 'stand') return 'HIGH'
  
  // Low confidence situations
  if (handVal === 16 && dealerUpCard.value >= 7) return 'LOW'
  if (handVal === 12 && dealerUpCard.value >= 2 && dealerUpCard.value <= 3) return 'LOW'
  
  return 'MEDIUM'
})

const basicStrategyExplanation = computed(() => {
  const dealerVal = dealerUpCard.value
  const handVal = typeof handValue.value === 'string' ? 
    parseInt(handValue.value) : handValue.value
  
  if (dealerVal >= 7 || dealerVal === 'A') {
    return `Dealer shows strong card (${dealerVal}). Be aggressive - assume dealer has 10 in hole for total of ${dealerVal === 'A' ? '21' : parseInt(dealerVal) + 10}.`
  } else if (dealerVal >= 2 && dealerVal <= 6) {
    return `Dealer shows weak card (${dealerVal}). Be conservative - dealer likely to bust. Let them take the risk.`
  }
  
  return 'Follow basic blackjack strategy for optimal play.'
})

const possibleActions = computed(() => {
  const actions = []
  const recommended = recommendedAction.value.toLowerCase()
  
  // Always available
  actions.push({
    type: 'HIT',
    rating: recommended === 'hit' ? '★ BEST' : getActionRating('hit'),
    isBest: recommended === 'hit',
    isWorst: false
  })
  
  actions.push({
    type: 'STAND',
    rating: recommended === 'stand' ? '★ BEST' : getActionRating('stand'),
    isBest: recommended === 'stand',
    isWorst: false
  })
  
  // Conditionally available
  if (canDoubleDown(currentHand.value?.cards || [], playerStore.bankroll, currentHand.value?.bet || 0)) {
    actions.push({
      type: 'DOUBLE',
      rating: recommended === 'double' ? '★ BEST' : getActionRating('double'),
      isBest: recommended === 'double',
      isWorst: false
    })
  }
  
  if (canSplit(currentHand.value?.cards || [])) {
    actions.push({
      type: 'SPLIT',
      rating: recommended === 'split' ? '★ BEST' : getActionRating('split'),
      isBest: recommended === 'split',
      isWorst: false
    })
  }
  
  // Mark worst action
  const worstAction = getWorstAction()
  actions.forEach(action => {
    if (action.type === worstAction && !action.isBest) {
      action.isWorst = true
      action.rating = '✗ WORST'
    }
  })
  
  return actions
})

function getActionRating(action) {
  const handVal = typeof handValue.value === 'string' ? 
    parseInt(handValue.value) : handValue.value
  const dealerVal = dealerUpCard.value
  
  if (action === 'hit') {
    if (handVal >= 17) return 'Risky'
    if (handVal <= 11) return 'Safe'
    return 'OK'
  }
  
  if (action === 'stand') {
    if (handVal >= 17) return 'Good'
    if (handVal <= 11) return 'Bad'
    return 'OK'
  }
  
  if (action === 'double') {
    if (handVal === 11) return 'Excellent'
    if (handVal === 10 && dealerVal !== 'A') return 'Good'
    return 'Risky'
  }
  
  if (action === 'split') {
    const firstCard = currentHand.value?.cards[0]?.value
    if (firstCard === 'A' || firstCard === '8') return 'Always'
    if (firstCard === '5' || firstCard === '10') return 'Never'
    return 'Situational'
  }
  
  return 'Not optimal'
}

function getWorstAction() {
  const handVal = typeof handValue.value === 'string' ? 
    parseInt(handValue.value) : handValue.value
  
  if (handVal >= 17) return 'HIT'
  if (handVal <= 11) return 'STAND'
  
  // For splits, 5s and 10s are usually worst
  if (canSplit(currentHand.value?.cards || [])) {
    const firstCard = currentHand.value?.cards[0]?.value
    if (firstCard === '5' || firstCard === '10') return 'SPLIT'
  }
  
  return 'STAND' // Default worst for middle hands
}

const showCountAdjustment = computed(() => {
  return showCount.value && Math.abs(countingStore.trueCount) >= 2
})

const countAdvice = computed(() => {
  const tc = countingStore.trueCount
  
  if (tc >= 3) {
    return 'Very positive count (+3 or higher). Consider increasing bet size and taking insurance if offered.'
  } else if (tc >= 2) {
    return 'Positive count. Slightly favor standing on close decisions.'
  } else if (tc <= -3) {
    return 'Very negative count (-3 or lower). Consider minimum bets only.'
  } else if (tc <= -2) {
    return 'Negative count. Slightly favor hitting on close decisions.'
  }
  
  return 'Neutral count. Follow basic strategy.'
})

function closeModal() {
  emit('close')
}
</script>

<style scoped>
.hint-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.hint-modal {
  background: linear-gradient(135deg, #1a5490 0%, #0f4c75 100%);
  border-radius: 16px;
  width: 100%;
  max-width: 380px; /* Reduced from 500px */
  max-height: 80vh; /* Reduced from 95vh */
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px; /* Reduced padding */
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}

.modal-header h2 {
  margin: 0;
  color: white;
  font-size: 18px; /* Reduced from 20px */
}

.close-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  width: 28px; /* Reduced from 32px */
  height: 28px;
  border-radius: 50%;
  font-size: 16px; /* Reduced from 18px */
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: rotate(90deg);
}

.modal-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px; /* Reduced from 16px */
}

.hint-section {
  margin-bottom: 12px; /* Reduced from 16px */
}

.hint-section:last-child {
  margin-bottom: 0;
}

.hint-section h3 {
  color: white;
  margin: 0 0 6px 0; /* Reduced from 8px */
  font-size: 14px; /* Reduced from 16px */
}

/* Compact situation grid */
.situation-grid.compact {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px; /* Reduced from 8px */
}

.situation-item {
  background: rgba(0, 0, 0, 0.2);
  padding: 6px 8px; /* Reduced from 10px */
  border-radius: 6px; /* Reduced from 8px */
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.situation-item .label {
  color: rgba(255, 255, 255, 0.7);
  font-size: 11px; /* Same size */
}

.situation-item .value {
  color: white;
  font-size: 14px; /* Reduced from 18px */
  font-weight: bold;
}

.count-positive { color: #34a853 !important; }
.count-negative { color: #f44336 !important; }
.count-neutral { color: #2196f3 !important; }

/* Compact recommendation box */
.recommendation-box.compact {
  background: linear-gradient(145deg, #2196f3 0%, #1976d2 100%);
  border-radius: 10px; /* Reduced from 12px */
  padding: 12px; /* Reduced from 16px */
  text-align: center;
  margin-bottom: 12px; /* Reduced from 16px */
}

.action-recommendation {
  font-size: 24px; /* Reduced from 28px */
  font-weight: bold;
  margin-bottom: 4px; /* Reduced from 6px */
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.recommendation-reason {
  font-size: 13px; /* Reduced from 14px */
  margin-bottom: 6px; /* Reduced from 8px */
  opacity: 0.9;
}

.confidence {
  font-size: 11px; /* Reduced from 12px */
  opacity: 0.8;
}

.confidence-level {
  font-weight: bold;
  text-transform: uppercase;
}

.strategy-text {
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.3; /* Reduced from 1.4 */
  margin: 0;
  font-size: 13px; /* Reduced from 14px */
}

/* Compact action grid */
.action-grid.compact {
  display: flex; /* Changed from grid to flex */
  gap: 6px;
  flex-wrap: wrap;
  justify-content: center;
}

.action-item {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 6px 10px; /* Reduced from 8px */
  border-radius: 6px; /* Reduced from 8px */
  text-align: center;
  transition: all 0.2s ease;
  min-width: 70px; /* Reduced from 100px */
}

.action-item.best {
  background: rgba(52, 168, 83, 0.2);
  border-color: #34a853;
}

.action-item.worst {
  background: rgba(244, 67, 54, 0.2);
  border-color: #f44336;
}

.action-name {
  display: block;
  font-weight: bold;
  color: white;
  font-size: 12px; /* Reduced from 14px */
}

.action-rating {
  display: block;
  font-size: 10px; /* Reduced from 11px */
  color: rgba(255, 255, 255, 0.8);
}

/* Compact count advice */
.hint-section.compact {
  margin-bottom: 8px;
}

.count-advice {
  color: rgba(255, 255, 255, 0.9);
  background: rgba(0, 0, 0, 0.2);
  padding: 8px; /* Reduced from 10px */
  border-radius: 6px; /* Reduced from 8px */
  margin: 0;
  font-size: 12px; /* Reduced from 13px */
  line-height: 1.3; /* Reduced from 1.4 */
}

.modal-footer {
  padding: 10px 16px; /* Reduced from 12px 20px */
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}

.btn-primary {
  width: 100%;
  padding: 10px; /* Reduced from 12px */
  background: linear-gradient(145deg, #34a853 0%, #2d8659 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 15px; /* Reduced from 16px */
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(52, 168, 83, 0.3);
}

/* Mobile responsiveness */
@media (max-width: 480px) {
  .hint-modal {
    max-height: 75vh; /* Even more compact on mobile */
    max-width: 100%;
    margin: 0 8px;
  }
  
  .modal-content {
    padding: 10px;
  }
  
  .modal-header {
    padding: 10px 12px;
  }
  
  .recommendation-box.compact {
    padding: 10px;
  }
  
  .action-recommendation {
    font-size: 22px;
  }
}
</style>