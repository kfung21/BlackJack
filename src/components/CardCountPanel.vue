<template>
  <div class="count-panel" v-if="playerStore.settings.showCount" :class="`count-${countingStore.advantageLevel}`">
    <!-- Single line layout -->
    <div class="count-compact">
      <div class="count-item">
        <span class="count-label">RC</span>
        <span class="count-value" :class="runningCountClass">
          {{ formatCount(countingStore.runningCount) }}
        </span>
      </div>
      
      <div class="count-item" v-if="playerStore.settings.showTrueCount">
        <span class="count-label">TC</span>
        <span class="count-value" :class="trueCountClass">
          {{ formatCount(countingStore.trueCount) }}
        </span>
      </div>
      
      <div class="count-item">
        <span class="count-label">Decks</span>
        <span class="count-value">{{ countingStore.decksRemaining.toFixed(1) }}</span>
      </div>

      <button @click="toggleExpanded" class="toggle-btn">
        {{ isExpanded ? '−' : '+' }}
      </button>
    </div>
    
    <!-- Expanded view (optional) -->
    <div v-if="isExpanded" class="count-expanded">
      <div class="count-system">
        <div class="system-name">{{ countingStore.currentSystem.name }}</div>
      </div>
      
      <div class="advantage-indicator">
        <div class="advantage-level" :class="`level-${countingStore.advantageLevel}`">
          {{ advantageText }}
        </div>
      </div>
      
      <div class="count-debug" v-if="showDebug">
        <div class="debug-item">Cards Seen: {{ countingStore.totalCardsSeen }}</div>
        <div class="debug-item">Cards This Round: {{ countingStore.cardsSeenThisRound.length }}</div>
        <div class="debug-item">System: {{ countingStore.currentSystem.name }}</div>
      </div>
      
      <div class="count-actions">
        <button @click="countingStore.resetCount" class="btn btn-small">
          Reset
        </button>
        <button @click="countingStore.newShoe" class="btn btn-small">
          New Shoe
        </button>
        <button @click="showDebug = !showDebug" class="btn btn-small">
          {{ showDebug ? 'Hide' : 'Debug' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { usePlayerStore } from '../stores/playerStore'
import { useCountingStore } from '../stores/countingStore'

const playerStore = usePlayerStore()
const countingStore = useCountingStore()

const isExpanded = ref(false)
const showDebug = ref(false)

// Force reactivity by explicitly watching the store values
const runningCount = computed(() => countingStore.runningCount)
const trueCount = computed(() => countingStore.trueCount)

const runningCountClass = computed(() => {
  const count = runningCount.value
  if (count > 0) return 'positive'
  if (count < 0) return 'negative'
  return 'neutral'
})

const trueCountClass = computed(() => {
  const count = trueCount.value
  if (count > 1) return 'positive'
  if (count < -1) return 'negative'
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

function formatCount(count) {
  if (count > 0) return `+${count}`
  return count.toString()
}

function toggleExpanded() {
  isExpanded.value = !isExpanded.value
}

// Debug: Watch for changes to help troubleshoot
watch(() => countingStore.runningCount, (newCount, oldCount) => {
  console.log(`CardCountPanel: Running count changed from ${oldCount} to ${newCount}`)
}, { immediate: true })

watch(() => countingStore.trueCount, (newCount, oldCount) => {
  console.log(`CardCountPanel: True count changed from ${oldCount} to ${newCount}`)
}, { immediate: true })
</script>

<style scoped>
.count-panel {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  padding: 8px 12px;
  margin: 8px 0;
  border: 1px solid rgba(255, 255, 255, 0.1);
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

/* Single line compact layout */
.count-compact {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.count-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 40px;
}

.count-label {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 2px;
  font-weight: 500;
}

.count-value {
  font-size: 16px;
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

.toggle-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.toggle-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* Expanded section */
.count-expanded {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 8px;
  margin-top: 8px;
}

.count-system {
  text-align: center;
  margin-bottom: 8px;
}

.system-name {
  font-weight: 600;
  color: white;
  font-size: 12px;
}

.advantage-indicator {
  text-align: center;
  margin-bottom: 8px;
  padding: 4px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.05);
}

.advantage-level {
  font-weight: 600;
  font-size: 12px;
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

.count-debug {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  padding: 8px;
  margin-bottom: 8px;
  font-size: 11px;
}

.debug-item {
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 2px;
}

.count-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.btn-small {
  padding: 4px 8px;
  font-size: 10px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  border-radius: 4px;
  cursor: pointer;
}

@media (max-width: 390px) {
  .count-panel {
    padding: 6px 10px;
  }
  
  .count-compact {
    gap: 8px;
  }
  
  .count-item {
    min-width: 35px;
  }
  
  .count-value {
    font-size: 14px;
  }
}
</style>