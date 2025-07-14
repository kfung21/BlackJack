<template>
  <div class="player-hand" :class="handClasses">
    <div class="hand-header">
      <span class="hand-label" v-if="showHandNumber">
        Hand {{ handIndex + 1 }}
      </span>
      <span class="hand-value" :class="valueClasses">{{ handValueText }}</span>
      <span class="bet-indicator" v-if="hand.bet">
        ${{ hand.bet }}{{ hand.doubled ? ' (2x)' : '' }}
      </span>
    </div>
    
    <div class="cards-container">
      <CardComponent
        v-for="(card, index) in hand.cards"
        :key="`hand-${handIndex}-${card.id}-${index}`"
        :card="card"
        :is-dealing="index === hand.cards.length - 1 && isDealing"
        @click="$emit('cardClick', card, handIndex)"
      />
    </div>
    
    <!-- Result display for finished games -->
    <div v-if="showResult" class="hand-result" :class="resultClass">
      <div class="result-outcome">{{ resultText }}</div>
      <div class="result-amount" :class="amountClass">
        {{ resultAmount }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import CardComponent from './CardComponent.vue'
import { calculateHandValue, isBlackjack } from '../utils/gameRules'
import { useGameStore } from '../stores/gameStore'
import { usePlayerStore } from '../stores/playerStore'

const props = defineProps({
  hand: {
    type: Object,
    required: true
  },
  handIndex: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: false
  },
  isDealing: {
    type: Boolean,
    default: false
  }
})

defineEmits(['cardClick'])

const gameStore = useGameStore()
const playerStore = usePlayerStore()

const handValue = computed(() => {
  return calculateHandValue(props.hand.cards)
})

const hasBlackjack = computed(() => {
  return isBlackjack(props.hand.cards)
})

const handValueText = computed(() => {
  if (props.hand.outcome === 'blackjack' || hasBlackjack.value) return 'BLACKJACK!'
  
  const value = handValue.value
  if (value.busted) return 'BUST'
  if (value.soft && value.total <= 21) return `${value.total} (soft)`
  return value.total.toString()
})

const valueClasses = computed(() => {
  return {
    'busted': handValue.value.busted,
    'blackjack': props.hand.outcome === 'blackjack' || hasBlackjack.value,
    'soft': handValue.value.soft && !handValue.value.busted && !hasBlackjack.value,
    'twenty-one': handValue.value.total === 21 && !hasBlackjack.value
  }
})

const handClasses = computed(() => {
  return {
    'active': props.isActive,
    'complete': props.hand.isComplete,
    'winner': props.hand.outcome === 'win' || props.hand.outcome === 'blackjack',
    'loser': props.hand.outcome === 'lose',
    'push': props.hand.outcome === 'push'
  }
})

const showHandNumber = computed(() => {
  // Show hand number if there are multiple hands (split)
  const activePlayer = gameStore.activeViewPlayer
  return activePlayer && activePlayer.hands && activePlayer.hands.length > 1
})

const showResult = computed(() => {
  return gameStore.gamePhase === 'finished' && props.hand.outcome
})

const resultText = computed(() => {
  const outcomes = {
    'win': 'WIN',
    'lose': 'LOSE',
    'push': 'PUSH',
    'blackjack': 'BLACKJACK WIN'
  }
  return outcomes[props.hand.outcome] || ''
})

const resultAmount = computed(() => {
  if (!props.hand.outcome || !props.hand.bet) return ''
  
  let amount = 0
  
  switch (props.hand.outcome) {
    case 'blackjack': {
      // Use configurable blackjack payout
      const payoutSetting = playerStore.settings.blackjackPayout || '3:2'
      switch (payoutSetting) {
        case '3:2':
          amount = props.hand.bet * 1.5
          break
        case '6:5':
          amount = props.hand.bet * 1.2
          break
        case '1:1':
          amount = props.hand.bet
          break
        default:
          amount = props.hand.bet * 1.5
      }
      break
    }
    case 'win':
      amount = props.hand.bet
      break
    case 'push':
      return 'Push'
    case 'lose':
      amount = -props.hand.bet
      break
  }
  
  if (amount > 0) {
    return `+$${amount.toFixed(2)}`
  } else if (amount < 0) {
    return `-$${Math.abs(amount).toFixed(2)}`
  }
  return ''
})

const resultClass = computed(() => {
  return `result-${props.hand.outcome}`
})

const amountClass = computed(() => {
  if (props.hand.outcome === 'win' || props.hand.outcome === 'blackjack') {
    return 'amount-win'
  } else if (props.hand.outcome === 'lose') {
    return 'amount-lose'
  }
  return 'amount-push'
})
</script>

<style scoped>
.player-hand {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  padding: 12px;
  margin: 8px 0;
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.player-hand.active {
  border-color: #34a853;
  background: rgba(52, 168, 83, 0.1);
  transform: scale(1.02);
}

.player-hand.complete {
  opacity: 0.9;
}

.player-hand.winner {
  background: rgba(52, 168, 83, 0.15);
}

.player-hand.loser {
  background: rgba(244, 67, 54, 0.15);
}

.player-hand.push {
  background: rgba(255, 152, 0, 0.15);
}

.hand-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.hand-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 500;
}

.hand-value {
  font-size: 16px;
  font-weight: bold;
  color: white;
}

.hand-value.busted {
  color: #f44336;
}

.hand-value.blackjack {
  color: #ff9800;
  text-shadow: 0 0 10px rgba(255, 152, 0, 0.5);
}

.hand-value.soft {
  color: #2196f3;
}

.hand-value.twenty-one {
  color: #4caf50;
}

.bet-indicator {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
  background: rgba(0, 0, 0, 0.3);
  padding: 2px 8px;
  border-radius: 12px;
}

.cards-container {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 4px;
  margin: 8px 0;
}

/* Result display styles */
.hand-result {
  margin-top: 12px;
  padding: 8px;
  border-radius: 8px;
  text-align: center;
  border: 1px solid;
}

.result-win,
.result-blackjack {
  background: rgba(52, 168, 83, 0.2);
  border-color: rgba(52, 168, 83, 0.4);
}

.result-lose {
  background: rgba(244, 67, 54, 0.2);
  border-color: rgba(244, 67, 54, 0.4);
}

.result-push {
  background: rgba(255, 152, 0, 0.2);
  border-color: rgba(255, 152, 0, 0.4);
}

.result-outcome {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  margin-bottom: 4px;
}

.result-amount {
  font-size: 18px;
  font-weight: bold;
}

.amount-win {
  color: #34a853;
}

.amount-lose {
  color: #f44336;
}

.amount-push {
  color: #ff9800;
}

@media (max-width: 480px) {
  .player-hand {
    padding: 8px;
  }
  
  .cards-container {
    gap: 2px;
  }
}
</style>