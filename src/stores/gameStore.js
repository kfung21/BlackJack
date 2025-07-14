import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { 
  createDeck, 
  shuffleDeck, 
  calculateHandValue, 
  isBlackjack, 
  canSplit, 
  canDoubleDown, 
  getDealerAction, 
  getHandOutcome, 
  getPayoutMultiplier 
} from '../utils/gameRules'
import { saveGameResult } from '../utils/indexedDB'
import { usePlayerStore } from './playerStore'

export const useGameStore = defineStore('game', () => {
  // State
  const deck = ref([])
  const playerHands = ref([])
  const dealerHand = ref([])
  const currentHandIndex = ref(0)
  const gamePhase = ref('betting') // 'betting', 'dealing', 'playing', 'dealer', 'finished'
  const currentBet = ref(0)
  const totalBet = ref(0)
  const lastBet = ref(15) // Track last bet for quick replay
  const insuranceBet = ref(0)
  const message = ref('Place your bet')
  const isDealing = ref(false)
  const gameHistory = ref([])
  const numDecks = ref(6)
  const penetration = ref(0.75) // Shuffle when 75% of cards are dealt
  const cardsDealt = ref(0)

  // Getters
  const currentHand = computed(() => playerHands.value[currentHandIndex.value] || null)
  const allHandsComplete = computed(() => playerHands.value.every(hand => hand.isComplete))
  const dealerUpCard = computed(() => dealerHand.value[0] || null)
  const dealerHoleCard = computed(() => dealerHand.value[1] || null)
  const dealerShowsAce = computed(() => dealerHand.value[0]?.value === 'A')
  const needsNewDeck = computed(() => {
    const totalCards = numDecks.value * 52
    return cardsDealt.value >= (totalCards * penetration.value)
  })
  const canBet = computed(() => gamePhase.value === 'betting')
  const canPlay = computed(() => gamePhase.value === 'playing' && currentHand.value && !currentHand.value.isComplete)

  // Actions
  function initializeGame() {
    const playerStore = usePlayerStore()
    numDecks.value = playerStore.settings.numDecks || 6
    createNewDeck()
    resetGame()
  }

  function createNewDeck() {
    deck.value = createDeck(numDecks.value)
    cardsDealt.value = 0
  }

  function resetGame() {
    playerHands.value = []
    dealerHand.value = []
    currentHandIndex.value = 0
    gamePhase.value = 'betting'
    currentBet.value = 0
    totalBet.value = 0
    insuranceBet.value = 0
    message.value = 'Place your bet'
    isDealing.value = false
  }

  function dealCard() {
    if (needsNewDeck.value) {
      createNewDeck()
    }
    
    const card = deck.value.pop()
    cardsDealt.value++
    return card
  }

  function placeBet(amount) {
    const playerStore = usePlayerStore()
    if (gamePhase.value !== 'betting' || amount > playerStore.bankroll) {
      return false
    }
    
    currentBet.value = amount
    totalBet.value = amount
    lastBet.value = amount // Store for next game
    gamePhase.value = 'dealing'
    startDealing()
    return true
  }

  async function startDealing() {
    isDealing.value = true
    message.value = 'Dealing cards...'
    
    // Initialize first hand
    playerHands.value = [{
      cards: [],
      bet: currentBet.value,
      isComplete: false,
      outcome: null,
      doubled: false
    }]
    
    // Deal initial cards with animation delay
    await animatedDeal(playerHands.value[0], 1)
    await animatedDeal({ cards: dealerHand.value }, 1)
    await animatedDeal(playerHands.value[0], 1)
    await animatedDeal({ cards: dealerHand.value }, 1, true) // Hole card
    
    isDealing.value = false
    checkForBlackjacks()
  }

  async function animatedDeal(hand, count, faceDown = false) {
    const playerStore = usePlayerStore()
    const delay = playerStore.settings.dealerSpeed / 2
    
    for (let i = 0; i < count; i++) {
      const card = dealCard()
      if (faceDown) card.faceDown = true
      hand.cards.push(card)
      
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  function checkForBlackjacks() {
    const firstHand = playerHands.value[0]
    const playerBlackjack = isBlackjack(firstHand.cards)
    const dealerBlackjack = isBlackjack(dealerHand.value)
    
    if (playerBlackjack || dealerBlackjack) {
      // Reveal dealer hole card
      if (dealerHand.value[1]) {
        dealerHand.value[1].faceDown = false
      }
      
      firstHand.outcome = getHandOutcome(
        firstHand.cards, 
        dealerHand.value, 
        playerBlackjack, 
        dealerBlackjack
      )
      firstHand.isComplete = true
      gamePhase.value = 'finished' // Set to finished for blackjacks
      finishGame()
    } else {
      gamePhase.value = 'playing'
      message.value = 'Choose your action'
    }
  }

  async function hit() {
    if (!canPlay.value) return
    
    const hand = currentHand.value
    await animatedDeal(hand, 1)
    
    const handValue = calculateHandValue(hand.cards)
    if (handValue.busted) {
      hand.isComplete = true
      hand.outcome = 'lose'
      nextHand()
    }
  }

  function stand() {
    if (!canPlay.value) return
    
    currentHand.value.isComplete = true
    nextHand()
  }

  async function doubleDown() {
    const playerStore = usePlayerStore()
    const hand = currentHand.value
    
    if (!canPlay.value || !canDoubleDown(hand.cards, playerStore.bankroll, hand.bet)) {
      return
    }
    
    hand.bet *= 2
    hand.doubled = true
    totalBet.value += hand.bet / 2
    
    await animatedDeal(hand, 1)
    
    const handValue = calculateHandValue(hand.cards)
    if (handValue.busted) {
      hand.outcome = 'lose'
    }
    
    hand.isComplete = true
    nextHand()
  }

  async function split() {
    const playerStore = usePlayerStore()
    const hand = currentHand.value
    
    if (!canPlay.value || !canSplit(hand.cards) || playerStore.bankroll < hand.bet) {
      return
    }
    
    const secondCard = hand.cards.pop()
    const newHand = {
      cards: [secondCard],
      bet: hand.bet,
      isComplete: false,
      outcome: null,
      doubled: false
    }
    
    playerHands.value.splice(currentHandIndex.value + 1, 0, newHand)
    totalBet.value += hand.bet
    
    // Deal one card to each hand
    await animatedDeal(hand, 1)
    await animatedDeal(newHand, 1)
    
    // Check for blackjack on aces
    if (hand.cards[0].value === 'A') {
      if (isBlackjack(hand.cards)) {
        hand.isComplete = true
      }
      if (isBlackjack(newHand.cards)) {
        newHand.isComplete = true
      }
    }
  }

  function nextHand() {
    currentHandIndex.value++
    
    if (allHandsComplete.value) {
      gamePhase.value = 'dealer'
      playDealerHand()
    } else {
      message.value = 'Choose your action'
    }
  }

  async function playDealerHand() {
    const playerStore = usePlayerStore()
    message.value = 'Dealer playing...'
    
    // Reveal hole card
    if (dealerHand.value[1]) {
      dealerHand.value[1].faceDown = false
    }
    
    // Only play if at least one player hand didn't bust
    const hasNonBustedHand = playerHands.value.some(hand => 
      calculateHandValue(hand.cards).total <= 21
    )
    
    if (hasNonBustedHand) {
      while (getDealerAction(dealerHand.value) === 'hit') {
        await animatedDeal({ cards: dealerHand.value }, 1)
        
        if (playerStore.settings.dealerSpeed > 0) {
          await new Promise(resolve => setTimeout(resolve, playerStore.settings.dealerSpeed))
        }
      }
    }
    
    // Set game phase to finished before calling finishGame
    gamePhase.value = 'finished'
    finishGame()
  }

  async function finishGame() {
    const playerStore = usePlayerStore()
    
    // Ensure we're in finished state
    if (gamePhase.value !== 'finished') {
      gamePhase.value = 'finished'
    }
    
    // Calculate outcomes for all hands
    for (const hand of playerHands.value) {
      if (!hand.outcome) {
        const playerBlackjack = isBlackjack(hand.cards)
        const dealerBlackjack = isBlackjack(dealerHand.value)
        hand.outcome = getHandOutcome(hand.cards, dealerHand.value, playerBlackjack, dealerBlackjack)
      }
    }
    
    // Calculate total payout
    let totalPayout = 0
    for (const hand of playerHands.value) {
      const multiplier = getPayoutMultiplier(hand.outcome)
      const payout = hand.bet * multiplier
      totalPayout += payout + (multiplier >= 0 ? hand.bet : 0)
    }
    
    const netResult = totalPayout - totalBet.value
    await playerStore.updateBankroll(netResult)
    
    // Save game result
    if (playerStore.currentPlayer) {
      await saveGameResult(
        playerStore.currentPlayer.id,
        playerHands.value,
        getOverallOutcome(),
        totalBet.value,
        netResult
      )
    }
    
    message.value = getGameResultMessage(netResult)
  }

  function getOverallOutcome() {
    const wins = playerHands.value.filter(h => ['win', 'blackjack'].includes(h.outcome)).length
    const losses = playerHands.value.filter(h => h.outcome === 'lose').length
    
    if (wins > 0 && losses === 0) return 'win'
    if (losses > 0 && wins === 0) return 'lose'
    return 'push'
  }

  function getGameResultMessage(netResult) {
    if (netResult > 0) return `You won $${netResult}!`
    if (netResult < 0) return `You lost $${Math.abs(netResult)}`
    return 'Push - no money lost or won'
  }

  return {
    // State
    deck,
    playerHands,
    dealerHand,
    currentHandIndex,
    gamePhase,
    currentBet,
    totalBet,
    lastBet,
    insuranceBet,
    message,
    isDealing,
    gameHistory,
    numDecks,
    penetration,
    cardsDealt,
    
    // Getters
    currentHand,
    allHandsComplete,
    dealerUpCard,
    dealerHoleCard,
    dealerShowsAce,
    needsNewDeck,
    canBet,
    canPlay,
    
    // Actions
    initializeGame,
    createNewDeck,
    resetGame,
    dealCard,
    placeBet,
    startDealing,
    animatedDeal,
    checkForBlackjacks,
    hit,
    stand,
    doubleDown,
    split,
    nextHand,
    playDealerHand,
    finishGame,
    getOverallOutcome,
    getGameResultMessage
  }
})