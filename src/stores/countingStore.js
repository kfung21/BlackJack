import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { getCardCountValue, calculateTrueCount, countingSystems } from '../utils/countingSystems'
import { usePlayerStore } from './playerStore'
import { useGameStore } from './gameStore'

export const useCountingStore = defineStore('counting', () => {
  // State
  const runningCount = ref(0)
  const cardsSeenThisRound = ref([])
  const totalCardsSeen = ref(0)
  const countHistory = ref([])

  // Getters - Fixed reactivity by avoiding cross-store dependencies in computed
  const trueCount = computed(() => {
    try {
      const gameStore = useGameStore()
      const totalCards = gameStore.numDecks * 52
      const cardsRemaining = totalCards - gameStore.cardsDealt
      const decksRemaining = Math.max(0.5, cardsRemaining / 52)
      const result = calculateTrueCount(runningCount.value, decksRemaining)
      console.log(`True count calculation: RC=${runningCount.value}, DecksRemaining=${decksRemaining.toFixed(2)}, TC=${result}`)
      return result
    } catch (error) {
      console.warn('Error calculating true count:', error)
      return runningCount.value // Fallback to running count
    }
  })

  const decksRemaining = computed(() => {
    try {
      const gameStore = useGameStore()
      const totalCards = gameStore.numDecks * 52
      const cardsRemaining = totalCards - gameStore.cardsDealt
      return Math.max(0.5, cardsRemaining / 52)
    } catch (error) {
      console.warn('Error calculating decks remaining:', error)
      return 6.0 // Fallback to full shoe
    }
  })

  const currentSystem = computed(() => {
    const playerStore = usePlayerStore()
    return countingSystems[playerStore.settings.countingSystem] || countingSystems['Hi-Lo']
  })

  const advantageLevel = computed(() => {
    const tc = trueCount.value
    if (tc >= 3) return 'high'
    if (tc >= 1) return 'medium'
    if (tc <= -2) return 'low'
    return 'neutral'
  })

  const suggestedBet = computed(() => {
    const playerStore = usePlayerStore()
    const bankroll = playerStore.bankroll
    const baseUnit = Math.max(5, Math.floor(bankroll / 100))
    
    const tc = trueCount.value
    let units = 1
    
    if (tc >= 2) units = tc - 1
    if (tc >= 5) units = Math.min(8, tc - 1)
    
    return Math.min(units * baseUnit, bankroll * 0.05) // Max 5% of bankroll
  })

  // Actions
  function addCard(card) {
    const playerStore = usePlayerStore()
    const system = playerStore.settings.countingSystem
    
    if (!card || card.faceDown) return 0
    
    const countValue = getCardCountValue(card, system, card.suit)
    
    // FIXED: Only process cards that actually affect the count
    if (countValue !== 0) {
      runningCount.value += countValue
      totalCardsSeen.value++
      
      cardsSeenThisRound.value.push({
        card: { ...card },
        countValue,
        runningCount: runningCount.value,
        trueCount: trueCount.value
      })
      
      countHistory.value.push({
        card: `${card.value}${getSuitSymbol(card.suit)}`,
        countValue,
        runningCount: runningCount.value,
        trueCount: trueCount.value,
        timestamp: Date.now()
      })
    }
    
    // Return the count value so the caller knows if it was counted
    return countValue
  }

  function resetRound() {
    // Only reset the round tracking, NOT the running count
    console.log('resetRound() called - clearing cards seen this round only')
    cardsSeenThisRound.value = []
  }

  function resetCount() {
    console.log('resetCount() called - FULL COUNT RESET')
    runningCount.value = 0
    cardsSeenThisRound.value = []
    totalCardsSeen.value = 0
    countHistory.value = []
  }

  function newShoe() {
    console.log('newShoe() called for system:', currentSystem.value.name)
    // For balanced systems like Hi-Lo, reset running count to 0
    // For unbalanced systems, keep the running count
    if (currentSystem.value.balanced) {
      console.log('Balanced system - resetting running count to 0')
      runningCount.value = 0
    } else {
      console.log('Unbalanced system - keeping running count')
    }
    totalCardsSeen.value = 0
    countHistory.value = []
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

  function getCountAdvice() {
    const tc = trueCount.value
    const playerStore = usePlayerStore()
    const bankroll = playerStore.bankroll
    
    if (tc >= 3) {
      return {
        level: 'favorable',
        message: 'High count! Increase bet size',
        suggestedBet: Math.min(suggestedBet.value, bankroll * 0.1)
      }
    } else if (tc >= 1) {
      return {
        level: 'slightly-favorable', 
        message: 'Slightly favorable count',
        suggestedBet: suggestedBet.value
      }
    } else if (tc <= -2) {
      return {
        level: 'unfavorable',
        message: 'Unfavorable count - minimum bet',
        suggestedBet: Math.max(5, Math.floor(bankroll / 200))
      }
    } else {
      return {
        level: 'neutral',
        message: 'Neutral count',
        suggestedBet: suggestedBet.value
      }
    }
  }

  return {
    // State
    runningCount,
    cardsSeenThisRound,
    totalCardsSeen,
    countHistory,
    
    // Getters
    trueCount,
    decksRemaining,
    currentSystem,
    advantageLevel,
    suggestedBet,
    
    // Actions
    addCard,
    resetRound,
    resetCount,
    newShoe,
    getSuitSymbol,
    getCountAdvice
  }
})