<template>
    <div class="dealer-hand">
      <div class="dealer-header">
        <span class="dealer-label">Dealer</span>
        <span class="dealer-value" :class="valueClasses">{{ dealerValueText }}</span>
      </div>
      
      <div class="cards-container">
        <CardComponent
          v-for="(card, index) in dealerCards"
          :key="`dealer-${card.id}-${index}`"
          :card="card"
          :face-down="card.faceDown"
          :is-dealing="index === dealerCards.length - 1 && isDealing"
        />
      </div>
      
      <div v-if="showInsurance" class="insurance-offer">
        <p>Dealer shows Ace - Insurance?</p>
        <div class="insurance-buttons">
          <button @click="$emit('takeInsurance')" class="btn btn-small">Yes</button>
          <button @click="$emit('declineInsurance')" class="btn btn-secondary btn-small">No</button>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { computed } from 'vue'
  import CardComponent from './CardComponent.vue'
  import { calculateHandValue } from '../utils/gameRules'
  
  const props = defineProps({
    dealerCards: {
      type: Array,
      required: true
    },
    isDealing: {
      type: Boolean,
      default: false
    },
    gamePhase: {
      type: String,
      default: 'betting'
    },
    showInsurance: {
      type: Boolean,
      default: false
    }
  })
  
  defineEmits(['takeInsurance', 'declineInsurance'])
  
  const visibleCards = computed(() => {
    return props.dealerCards.filter(card => !card.faceDown)
  })
  
  const dealerValue = computed(() => {
    if (props.gamePhase === 'playing' && props.dealerCards.length > 1) {
      // Only show value of up card during player turn
      return calculateHandValue([props.dealerCards[0]])
    }
    return calculateHandValue(visibleCards.value)
  })
  
  const dealerValueText = computed(() => {
    if (props.gamePhase === 'playing' && props.dealerCards.length > 1) {
      return `${dealerValue.value.total} + ?`
    }
    
    const value = dealerValue.value
    if (value.busted) return 'BUST'
    if (value.soft && value.total <= 21) return `${value.total} (soft)`
    return value.total.toString()
  })
  
  const valueClasses = computed(() => {
    return {
      'busted': dealerValue.value.busted,
      'blackjack': dealerValue.value.total === 21 && visibleCards.value.length === 2,
      'soft': dealerValue.value.soft && !dealerValue.value.busted
    }
  })
  </script>
  
  <style scoped>
  .dealer-hand {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 20px;
    text-align: center;
  }
  
  .dealer-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }
  
  .dealer-label {
    font-weight: 600;
    color: rgba(255, 255, 255, 0.9);
  }
  
  .dealer-value {
    font-size: 18px;
    font-weight: bold;
    color: #34a853;
  }
  
  .dealer-value.busted {
    color: #f44336;
  }
  
  .dealer-value.blackjack {
    color: #ff9800;
  }
  
  .dealer-value.soft {
    color: #2196f3;
  }
  
  .cards-container {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 4px;
    margin: 12px 0;
  }
  
  .insurance-offer {
    background: rgba(255, 152, 0, 0.1);
    border: 1px solid rgba(255, 152, 0, 0.3);
    border-radius: 8px;
    padding: 12px;
    margin-top: 12px;
  }
  
  .insurance-offer p {
    margin-bottom: 8px;
    color: #ff9800;
    font-weight: 600;
  }
  
  .insurance-buttons {
    display: flex;
    gap: 8px;
    justify-content: center;
  }
  
  .btn-small {
    padding: 8px 16px;
    font-size: 14px;
  }
  
  @media (max-width: 480px) {
    .dealer-hand {
      padding: 12px;
    }
    
    .insurance-buttons {
      flex-direction: column;
    }
  }
  </style>