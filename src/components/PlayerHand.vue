<template>
    <div class="player-hand" :class="{ 'active-hand': isActive, 'completed': hand.isComplete }">
      <div class="hand-header">
        <span class="hand-label">{{ handLabel }}</span>
        <span class="hand-value" :class="valueClasses">{{ handValueText }}</span>
      </div>
      
      <div class="cards-container">
        <CardComponent
          v-for="(card, index) in hand.cards"
          :key="`${card.id}-${index}`"
          :card="card"
          :is-dealing="index === hand.cards.length - 1 && isDealing"
          @card-click="onCardClick"
        />
      </div>
      
      <div class="hand-info">
        <div class="bet-amount">${{ hand.bet }}</div>
        <div v-if="hand.outcome" class="outcome" :class="`outcome-${hand.outcome}`">
          {{ getOutcomeText(hand.outcome) }}
        </div>
        <div v-if="hand.doubled" class="doubled-indicator">DOUBLED</div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { computed } from 'vue'
  import CardComponent from './CardComponent.vue'
  import { calculateHandValue } from '../utils/gameRules'
  
  const props = defineProps({
    hand: {
      type: Object,
      required: true
    },
    isActive: {
      type: Boolean,
      default: false
    },
    isDealing: {
      type: Boolean,
      default: false
    },
    handIndex: {
      type: Number,
      default: 0
    }
  })
  
  const emit = defineEmits(['cardClick'])
  
  const handValue = computed(() => {
    return calculateHandValue(props.hand.cards)
  })
  
  const handValueText = computed(() => {
    const value = handValue.value
    if (value.busted) return 'BUST'
    if (value.soft && value.total <= 21) return `${value.total} (soft)`
    return value.total.toString()
  })
  
  const valueClasses = computed(() => {
    return {
      'busted': handValue.value.busted,
      'blackjack': handValue.value.total === 21 && props.hand.cards.length === 2,
      'soft': handValue.value.soft && !handValue.value.busted
    }
  })
  
  const handLabel = computed(() => {
    if (props.handIndex === 0 && props.hand.cards.length === 2) return 'Hand'
    return `Hand ${props.handIndex + 1}`
  })
  
  function getOutcomeText(outcome) {
    const outcomes = {
      'win': 'WIN',
      'lose': 'LOSE', 
      'push': 'PUSH',
      'blackjack': 'BLACKJACK!'
    }
    return outcomes[outcome] || outcome.toUpperCase()
  }
  
  function onCardClick(card) {
    emit('cardClick', card, props.handIndex)
  }
  </script>
  
  <style scoped>
  .player-hand {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 16px;
    margin: 8px 0;
    border: 2px solid transparent;
    transition: all 0.3s ease;
  }
  
  .player-hand.active-hand {
    border-color: #34a853;
    background: rgba(52, 168, 83, 0.1);
    box-shadow: 0 0 20px rgba(52, 168, 83, 0.3);
  }
  
  .player-hand.completed {
    opacity: 0.8;
  }
  
  .hand-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }
  
  .hand-label {
    font-weight: 600;
    color: rgba(255, 255, 255, 0.9);
  }
  
  .hand-value {
    font-size: 18px;
    font-weight: bold;
    color: #34a853;
  }
  
  .hand-value.busted {
    color: #f44336;
  }
  
  .hand-value.blackjack {
    color: #ff9800;
  }
  
  .hand-value.soft {
    color: #2196f3;
  }
  
  .cards-container {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 4px;
    margin: 12px 0;
  }
  
  .hand-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 12px;
  }
  
  .bet-amount {
    background: rgba(0, 0, 0, 0.3);
    padding: 4px 12px;
    border-radius: 16px;
    font-weight: 600;
    color: #fff;
  }
  
  .outcome {
    font-weight: bold;
    padding: 4px 12px;
    border-radius: 16px;
    font-size: 14px;
  }
  
  .outcome-win,
  .outcome-blackjack {
    background: rgba(52, 168, 83, 0.2);
    color: #34a853;
  }
  
  .outcome-lose {
    background: rgba(244, 67, 54, 0.2);
    color: #f44336;
  }
  
  .outcome-push {
    background: rgba(255, 152, 0, 0.2);
    color: #ff9800;
  }
  
  .doubled-indicator {
    background: rgba(33, 150, 243, 0.2);
    color: #2196f3;
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
  }
  
  @media (max-width: 480px) {
    .player-hand {
      padding: 12px;
      margin: 6px 0;
    }
    
    .hand-info {
      flex-direction: column;
      gap: 8px;
    }
  }
  </style>