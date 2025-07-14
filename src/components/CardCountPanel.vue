<template>
    <div class="count-panel" v-if="playerStore.settings.showCount" :class="`count-${countingStore.advantageLevel}`">
      <div class="count-header">
        <h3>Card Count</h3>
        <button @click="toggleExpanded" class="toggle-btn">
          {{ isExpanded ? '−' : '+' }}
        </button>
      </div>
      
      <div class="count-basic">
        <div class="count-item">
          <div class="count-label">Running</div>
          <div class="count-value" :class="runningCountClass">
            {{ formatCount(countingStore.runningCount) }}
          </div>
        </div>
        
        <div class="count-item" v-if="playerStore.settings.showTrueCount">
          <div class="count-label">True</div>
          <div class="count-value" :class="trueCountClass">
            {{ formatCount(countingStore.trueCount) }}
          </div>
        </div>
        
        <div class="count-item">
          <div class="count-label">Decks Left</div>
          <div class="count-value">{{ countingStore.decksRemaining.toFixed(1) }}</div>
        </div>
      </div>
      
      <div v-if="isExpanded" class="count-expanded">
        <div class="count-system">
          <div class="system-name">{{ countingStore.currentSystem.name }}</div>
          <div class="system-description">{{ countingStore.currentSystem.description }}</div>
        </div>
        
        <div class="advantage-indicator">
          <div class="advantage-level" :class="`level-${countingStore.advantageLevel}`">
            {{ advantageText }}
          </div>
          <div class="advantage-description">{{ advantageDescription }}</div>
        </div>
        
        <div v-if="countingStore.cardsSeenThisRound.length > 0" class="recent-cards">
          <div class="recent-header">This Round</div>
          <div class="recent-list">
            <div 
              v-for="(cardInfo, index) in recentCards"
              :key="index"
              class="recent-card"
              :class="{ 'positive': cardInfo.countValue > 0, 'negative': cardInfo.countValue < 0 }"
            >
              <span class="card-name">{{ cardInfo.card.value }}{{ getSuitSymbol(cardInfo.card.suit) }}</span>
              <span class="card-count">{{ formatCount(cardInfo.countValue) }}</span>
            </div>
          </div>
        </div>
        
        <div class="count-actions">
          <button @click="countingStore.resetCount" class="btn btn-small btn-secondary">
            Reset Count
          </button>
          <button @click="countingStore.newShoe" class="btn btn-small btn-secondary">
            New Shoe
          </button>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, computed } from 'vue'
  import { usePlayerStore } from '../stores/playerStore'
  import { useCountingStore } from '../stores/countingStore'
  
  const playerStore = usePlayerStore()
  const countingStore = useCountingStore()
  
  const isExpanded = ref(false)
  
  const runningCountClass = computed(() => {
    if (countingStore.runningCount > 0) return 'positive'
    if (countingStore.runningCount < 0) return 'negative'
    return 'neutral'
  })
  
  const trueCountClass = computed(() => {
    if (countingStore.trueCount > 1) return 'positive'
    if (countingStore.trueCount < -1) return 'negative'
    return 'neutral'
  })
  
  const advantageText = computed(() => {
    const levels = {
      'high': 'High Advantage',
      'medium': 'Slight Advantage', 
      'neutral': 'Neutral',
      'low': 'Disadvantage'
    }
    return levels[countingStore.advantageLevel] || 'Neutral'
  })
  
  const advantageDescription = computed(() => {
    const descriptions = {
      'high': 'Increase bet size significantly',
      'medium': 'Consider increasing bet',
      'neutral': 'Standard betting',
      'low': 'Minimum bet recommended'
    }
    return descriptions[countingStore.advantageLevel] || ''
  })
  
  const recentCards = computed(() => {
    return countingStore.cardsSeenThisRound.slice(-8).reverse()
  })
  
  function formatCount(count) {
    if (count > 0) return `+${count}`
    return count.toString()
  }
  
  function toggleExpanded() {
    isExpanded.value = !isExpanded.value
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
  </script>
  
  <style scoped>
  .count-panel {
    background: rgba(0, 0, 0, 0.3);
    border-radius: 12px;
    padding: 16px;
    margin: 12px 0;
    border: 2px solid rgba(255, 255, 255, 0.1);
    transition: all 0.3s ease;
  }
  
  .count-high {
    border-color: rgba(52, 168, 83, 0.5);
    background: rgba(52, 168, 83, 0.1);
  }
  
  .count-medium {
    border-color: rgba(33, 150, 243, 0.5);
    background: rgba(33, 150, 243, 0.1);
  }
  
  .count-low {
    border-color: rgba(244, 67, 54, 0.5);
    background: rgba(244, 67, 54, 0.1);
  }
  
  .count-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }
  
  .count-header h3 {
    margin: 0;
    font-size: 16px;
    color: rgba(255, 255, 255, 0.9);
  }
  
  .toggle-btn {
    background: none;
    border: 1px solid rgba(255, 255, 255, 0.3);
    color: white;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    cursor: pointer;
    font-size: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .count-basic {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
    gap: 12px;
    margin-bottom: 12px;
  }
  
  .count-item {
    text-align: center;
  }
  
  .count-label {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.7);
    margin-bottom: 4px;
  }
  
  .count-value {
    font-size: 20px;
    font-weight: bold;
    color: white;
  }
  
  .count-value.positive {
    color: #34a853;
  }
  
  .count-value.negative {
    color: #f44336;
  }
  
  .count-value.neutral {
    color: #9e9e9e;
  }
  
  .count-expanded {
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    padding-top: 12px;
  }
  
  .count-system {
    text-align: center;
    margin-bottom: 12px;
  }
  
  .system-name {
    font-weight: 600;
    color: white;
  }
  
  .system-description {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.7);
  }
  
  .advantage-indicator {
    text-align: center;
    margin-bottom: 12px;
    padding: 8px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.05);
  }
  
  .advantage-level {
    font-weight: 600;
    margin-bottom: 4px;
  }
  
  .level-high {
    color: #34a853;
  }
  
  .level-medium {
    color: #2196f3;
  }
  
  .level-low {
    color: #f44336;
  }
  
  .level-neutral {
    color: #9e9e9e;
  }
  
  .advantage-description {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.7);
  }
  
  .recent-cards {
    margin-bottom: 12px;
  }
  
  .recent-header {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.7);
    margin-bottom: 8px;
    text-align: center;
  }
  
  .recent-list {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    justify-content: center;
  }
  
  .recent-card {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    padding: 4px 8px;
    font-size: 12px;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  
  .recent-card.positive {
    background: rgba(52, 168, 83, 0.2);
    color: #34a853;
  }
  
  .recent-card.negative {
    background: rgba(244, 67, 54, 0.2);
    color: #f44336;
  }
  
  .card-name {
    font-weight: 600;
  }
  
  .card-count {
    font-size: 10px;
    opacity: 0.8;
  }
  
  .count-actions {
    display: flex;
    gap: 8px;
    justify-content: center;
  }
  
  .btn-small {
    padding: 6px 12px;
    font-size: 12px;
  }
  
  @media (max-width: 480px) {
    .count-panel {
      padding: 12px;
    }
    
    .count-basic {
      grid-template-columns: repeat(2, 1fr);
    }
    
    .count-actions {
      flex-direction: column;
    }
  }
  </style>