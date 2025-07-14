import { ref, computed, nextTick } from 'vue'
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
import { 
  saveGameResult
} from '../utils/indexedDB'
import { usePlayerStore } from './playerStore'
import { getBotDecision } from '../utils/botStrategy'
import { useCountingStore } from './countingStore'

export const useGameStore = defineStore('game', () => {
  // State
  const deck = ref([])
  const dealerHand = ref([])
  const gamePhase = ref('betting') // 'betting', 'dealing', 'playing', 'dealer', 'finished'
  const message = ref('Place your bet')
  const isDealing = ref(false)
  const gameHistory = ref([])
  const numDecks = ref(6)
  const penetration = ref(0.75)
  const cardsDealt = ref(0)
  
  // Multiplayer State
  const players = ref([])
  const currentPlayerIndex = ref(0)
  const isMultiplayer = ref(false)
  const maxPlayers = 7 // Casino standard
  const activePlayerCount = computed(() => players.value.length)
  
  // Autosave functionality
  let autosaveInterval = null
  let gameStateCache = null // In-memory cache for game state
  
  // Initialize with main player
  function initializeMainPlayer() {
    const playerStore = usePlayerStore()
    const mainPlayerId = 'main-player'
    players.value = [{
      id: mainPlayerId,
      name: playerStore.playerName,
      type: 'human',
      bankroll: playerStore.bankroll,
      hands: [],
      bet: 0,
      status: 'waiting',
      avatar: '👤',
      isMainPlayer: true,
      seatNumber: 1
    }]
    // Set initial active view to main player
    activeViewPlayerId.value = mainPlayerId
  }
  
  // Current player helper
  const currentPlayer = computed(() => players.value[currentPlayerIndex.value])
  const mainPlayer = computed(() => players.value.find(p => p.isMainPlayer))
  
  // Add active view player (which human player's cards to show in main area)
  const activeViewPlayerId = ref('main-player')
  const activeViewPlayer = computed(() => {
    // Force reactivity by accessing players array
    const currentPlayers = players.value
    const viewId = activeViewPlayerId.value
    
    const player = currentPlayers.find(p => p.id === viewId)
    console.log(`Active view player computed:`, player?.name, player?.hands?.length)
    return player || mainPlayer.value
  })
  
  // Getters
  const dealerUpCard = computed(() => dealerHand.value[0] || null)
  const dealerHoleCard = computed(() => dealerHand.value[1] || null)
  const dealerShowsAce = computed(() => dealerHand.value[0]?.value === 'A')
  const needsNewDeck = computed(() => {
    const totalCards = numDecks.value * 52
    return cardsDealt.value >= (totalCards * penetration.value)
  })
  const canBet = computed(() => gamePhase.value === 'betting')
  const canPlay = computed(() => gamePhase.value === 'playing' && currentPlayer.value?.status === 'playing')
  
  // NEW: Can view other players' cards after game ends
  const canViewAllHands = computed(() => gamePhase.value === 'finished')
  
  // Autosave functions - NOW ENABLED
  function startAutosave() {
    if (autosaveInterval) {
      clearInterval(autosaveInterval)
    }
    
    autosaveInterval = setInterval(() => {
      if (gamePhase.value !== 'betting' && gamePhase.value !== 'finished') {
        saveCurrentGameState()
      }
    }, 5000) // Save every 5 seconds during active game
  }
  
  function stopAutosave() {
    if (autosaveInterval) {
      clearInterval(autosaveInterval)
      autosaveInterval = null
    }
  }
  
  async function saveCurrentGameState() {
    const playerStore = usePlayerStore()
    const countingStore = useCountingStore()
    if (!playerStore.currentPlayer) return
    
    const gameState = {
      // Game state
      gamePhase: gamePhase.value,
      dealerHand: dealerHand.value,
      message: message.value,
      cardsDealt: cardsDealt.value,
      
      // Multiplayer state
      players: players.value.map(p => ({
        ...p,
        hands: p.hands
      })),
      currentPlayerIndex: currentPlayerIndex.value,
      isMultiplayer: isMultiplayer.value,
      activeViewPlayerId: activeViewPlayerId.value,
      
      // Deck state
      deck: deck.value, // Save the entire deck state
      numDecks: numDecks.value,
      
      // Betting info
      lastBet: lastBet.value,
      
      // Count state from countingStore
      countingState: {
        runningCount: countingStore.runningCount,
        totalCardsSeen: countingStore.totalCardsSeen,
        countHistory: countingStore.countHistory,
        cardsSeenThisRound: countingStore.cardsSeenThisRound
      },
      
      savedAt: new Date()
    }
    
    try {
      // Save to localStorage instead of IndexedDB for now
      const key = `gameState_${playerStore.currentPlayer.id}`
      localStorage.setItem(key, JSON.stringify(gameState))
      console.log('Game state autosaved to localStorage')
    } catch (error) {
      console.error('Failed to autosave game state:', error)
    }
  }
  
  async function loadSavedGameState() {
    const playerStore = usePlayerStore()
    const countingStore = useCountingStore()
    if (!playerStore.currentPlayer) return false
    
    try {
      // Load from localStorage instead of IndexedDB for now
      const key = `gameState_${playerStore.currentPlayer.id}`
      const savedStateJson = localStorage.getItem(key)
      
      if (!savedStateJson) return false
      
      const savedState = JSON.parse(savedStateJson)
      
      // Check if saved state is recent (within last hour)
      const savedAt = new Date(savedState.savedAt)
      const now = new Date()
      const hoursSinceSave = (now - savedAt) / (1000 * 60 * 60)
      
      if (hoursSinceSave > 1) {
        localStorage.removeItem(key)
        return false
      }
      
      // Restore game state
      gamePhase.value = savedState.gamePhase
      dealerHand.value = savedState.dealerHand || []
      message.value = savedState.message || 'Welcome back!'
      cardsDealt.value = savedState.cardsDealt || 0
      
      // Restore deck
      deck.value = savedState.deck || []
      numDecks.value = savedState.numDecks || 6
      
      // Restore multiplayer state - ENSURE PLAYER TYPES ARE PRESERVED
      if (savedState.players) {
        players.value = savedState.players.map(p => {
          // Ensure each player has the correct type
          const restoredPlayer = {
            ...p,
            type: p.type || (p.isMainPlayer ? 'human' : 'bot'), // Fallback if type is missing
            avatar: p.type === 'bot' ? '🤖' : '👤' // Ensure avatar matches type
          }
          console.log(`Restored player ${restoredPlayer.name} with type: ${restoredPlayer.type}`)
          return restoredPlayer
        })
      } else {
        players.value = []
      }
      
      currentPlayerIndex.value = savedState.currentPlayerIndex || 0
      isMultiplayer.value = savedState.isMultiplayer || false
      activeViewPlayerId.value = savedState.activeViewPlayerId || 'main-player'
      
      // Restore betting
      lastBet.value = savedState.lastBet || 15
      
      // Restore counting state
      if (savedState.countingState) {
        countingStore.runningCount = savedState.countingState.runningCount || 0
        countingStore.totalCardsSeen = savedState.countingState.totalCardsSeen || 0
        countingStore.countHistory = savedState.countingState.countHistory || []
        countingStore.cardsSeenThisRound = savedState.countingState.cardsSeenThisRound || []
      }
      
      // Update main player's bankroll to match current
      const main = players.value.find(p => p.isMainPlayer)
      if (main) {
        main.bankroll = playerStore.bankroll
        main.name = playerStore.playerName
      }
      
      console.log('Game state restored successfully from localStorage')
      console.log('Restored players:', players.value.map(p => ({ name: p.name, type: p.type })))
      
      // If game was in progress, restart autosave
      if (gamePhase.value !== 'betting' && gamePhase.value !== 'finished') {
        startAutosave()
      }
      
      return true
    } catch (error) {
      console.error('Failed to load saved game state:', error)
      return false
    }
  }
  
  async function clearSavedGameState() {
    const playerStore = usePlayerStore()
    if (!playerStore.currentPlayer) return
    
    try {
      // Clear from localStorage
      const key = `gameState_${playerStore.currentPlayer.id}`
      localStorage.removeItem(key)
      stopAutosave()
      console.log('Saved game state cleared from localStorage')
    } catch (error) {
      console.error('Failed to clear game state:', error)
    }
  }
  
  // Actions
  async function initializeGame() {
    const playerStore = usePlayerStore()
    numDecks.value = playerStore.settings.numDecks || 6
    
    // Try to load saved game state first
    const hasRestoredState = await loadSavedGameState()
    
    if (!hasRestoredState) {
      // No saved state, initialize new game
      createNewDeck()
      initializeMainPlayer()
      resetGame()
    }
    // If restored state, we're done - no need to ask user
  }
  
  function createNewDeck() {
    deck.value = createDeck(numDecks.value)
    cardsDealt.value = 0
  }
  
  function resetGame() {
    // Clear saved state when starting new game
    clearSavedGameState()
    
    // Reset all players' hands but keep their bankrolls
    players.value.forEach(player => {
      player.hands = []
      player.bet = 0
      player.status = 'waiting'
    })
    
    dealerHand.value = []
    currentPlayerIndex.value = 0
    gamePhase.value = 'betting'
    message.value = isMultiplayer.value ? 'All players place bets' : 'Place your bet'
    isDealing.value = false
  }
  
  // NEW: Force reset everything (for the refresh button)
  async function forceNewGame() {
    // Clear saved state
    await clearSavedGameState()
    
    // Reset counting
    const countingStore = useCountingStore()
    countingStore.newShoe()
    
    // Create fresh deck
    createNewDeck()
    
    // Keep players but reset their hands
    players.value.forEach(player => {
      player.hands = []
      player.bet = 0
      player.status = 'waiting'
    })
    
    // Reset game state
    dealerHand.value = []
    currentPlayerIndex.value = 0
    gamePhase.value = 'betting'
    message.value = 'New shoe - fresh start!'
    isDealing.value = false
  }
  
  function dealCard() {
    if (needsNewDeck.value) {
      createNewDeck()
      
      // IMPORTANT: Reset card counting when new deck is created
      const countingStore = useCountingStore()
      console.log('=== NEW DECK CREATED - RESETTING COUNT ===')
      countingStore.newShoe() // This resets count for balanced systems
      
      // Show message to players
      message.value = 'New deck shuffled - count reset!'
      
      // Brief delay to show message
      setTimeout(() => {
        if (gamePhase.value === 'playing') {
          message.value = `${currentPlayer.value?.name}'s turn`
        }
      }, 2000)
    }
    
    const card = deck.value.pop()
    cardsDealt.value++
    return card
  }
  
  // Multiplayer Functions
  function addPlayer(name, type = 'bot', bankroll = 1000, preferredSeat = null) {
    if (players.value.length >= maxPlayers) {
      console.warn('Maximum players reached')
      return false
    }
    
    if (gamePhase.value !== 'betting' && gamePhase.value !== 'finished') {
      console.warn('Cannot add players during active game')
      return false
    }
    
    // CRITICAL: Ensure type is properly set
    console.log(`Adding player ${name} with type: ${type}`)
    
    // Determine seat number
    let seatNumber = preferredSeat
    if (!seatNumber || players.value.some(p => p.seatNumber === seatNumber)) {
      // Find first available seat
      for (let i = 1; i <= maxPlayers; i++) {
        if (!players.value.some(p => p.seatNumber === i)) {
          seatNumber = i
          break
        }
      }
    }
    
    const newPlayer = {
      id: `player-${Date.now()}`,
      name,
      type: type, // Explicitly set the type
      bankroll,
      hands: [],
      bet: 0,
      status: 'waiting',
      avatar: type === 'bot' ? '🤖' : '👤',
      isMainPlayer: false,
      seatNumber
    }
    
    console.log(`Created new player:`, newPlayer)
    
    // Insert player in correct position based on seat number
    players.value.push(newPlayer)
    players.value.sort((a, b) => a.seatNumber - b.seatNumber)
    
    if (!isMultiplayer.value && players.value.length > 1) {
      enableMultiplayer()
    }
    
    // Save state after adding player
    saveCurrentGameState()
    
    return true
  }
  
  function changePlayerSeat(playerId, newSeatNumber) {
    if (gamePhase.value !== 'betting' && gamePhase.value !== 'finished') {
      console.warn('Cannot change seats during active game')
      return false
    }
    
    const player = players.value.find(p => p.id === playerId)
    if (!player) return false
    
    // For swapping, we need to handle it differently
    // Find if another player has the target seat
    const otherPlayer = players.value.find(p => p.id !== playerId && p.seatNumber === newSeatNumber)
    
    if (otherPlayer) {
      // It's a swap - temporarily set to a high number to avoid conflict
      const tempSeat = 99
      const oldSeat = player.seatNumber
      
      player.seatNumber = tempSeat
      otherPlayer.seatNumber = oldSeat
      player.seatNumber = newSeatNumber
    } else {
      // Direct assignment - seat is empty
      player.seatNumber = newSeatNumber
    }
    
    players.value.sort((a, b) => a.seatNumber - b.seatNumber)
    
    // Save state after seat change
    saveCurrentGameState()
    
    return true
  }
  
  function swapPlayerSeats(playerId1, playerId2) {
    if (gamePhase.value !== 'betting' && gamePhase.value !== 'finished') {
      console.warn('Cannot change seats during active game')
      return false
    }
    
    const player1 = players.value.find(p => p.id === playerId1)
    const player2 = players.value.find(p => p.id === playerId2)
    
    if (!player1 || !player2) return false
    
    const tempSeat = player1.seatNumber
    player1.seatNumber = player2.seatNumber
    player2.seatNumber = tempSeat
    
    players.value.sort((a, b) => a.seatNumber - b.seatNumber)
    
    // Save state after seat swap
    saveCurrentGameState()
    
    return true
  }
  
  function removePlayer(playerId) {
    if (players.value.length <= 1) {
      console.warn('Cannot remove last player')
      return false
    }
    
    const player = players.value.find(p => p.id === playerId)
    if (player?.isMainPlayer) {
      console.warn('Cannot remove main player')
      return false
    }
    
    // If game is in progress, forfeit their hand
    if (gamePhase.value === 'playing' && player.status === 'playing') {
      player.status = 'folded'
      // Move to next player if this was current
      if (currentPlayer.value?.id === playerId) {
        nextPlayer()
      }
    }
    
    // Remove player
    players.value = players.value.filter(p => p.id !== playerId)
    
    // Reindex seat numbers
    players.value.forEach((p, idx) => {
      p.seatNumber = idx + 1
    })
    
    // Disable multiplayer if only main player left
    if (players.value.length === 1) {
      disableMultiplayer()
    }
    
    // Save state after removing player
    saveCurrentGameState()
    
    return true
  }
  
  function enableMultiplayer() {
    isMultiplayer.value = true
    message.value = 'Multiplayer mode enabled'
    saveCurrentGameState()
  }
  
  function disableMultiplayer() {
    isMultiplayer.value = false
    // Remove all bot players
    players.value = players.value.filter(p => p.isMainPlayer)
    message.value = 'Single player mode'
    saveCurrentGameState()
  }
  
  // Betting Phase
  async function placeBets() {
    if (gamePhase.value !== 'betting') return
    
    gamePhase.value = 'dealing'
    
    // Process bets for all players
    for (const player of players.value) {
      if (player.type === 'bot') {
        // Bot betting logic - simple for now
        const minBet = 5
        const maxBet = Math.min(50, player.bankroll * 0.1)
        player.bet = Math.max(minBet, Math.min(maxBet, 15))
      } else if (player.isMainPlayer) {
        // Main player bet is handled separately
        continue
      }
      
      // Initialize hand with bet
      player.hands = [{
        cards: [],
        bet: player.bet,
        isComplete: false,
        outcome: null,
        doubled: false
      }]
    }
    
    startDealing()
  }
  
  // Main player places bet
  function placeMainPlayerBet(amount) {
    const playerStore = usePlayerStore()
    if (gamePhase.value !== 'betting' || amount > playerStore.bankroll) {
      return false
    }
    
    // Always update lastBet when a new bet is placed
    lastBet.value = amount
    
    const main = mainPlayer.value
    main.bet = amount
    main.hands = [{
      cards: [],
      bet: amount,
      isComplete: false,
      outcome: null,
      doubled: false
    }]
    
    // If multiplayer, process all bets; otherwise start
    if (isMultiplayer.value) {
      // Process bets for all players
      for (const player of players.value) {
        if (!player.isMainPlayer) {
          // IMPORTANT: Make sure player type is correctly set
          console.log(`Setting up bet for ${player.name}, type: ${player.type}`)
          
          if (player.type === 'bot') {
            // Bot betting logic
            const minBet = 5
            const maxBet = Math.min(50, player.bankroll * 0.1)
            player.bet = Math.max(minBet, Math.min(maxBet, 15))
          } else if (player.type === 'human') {
            // Human players use a default bet (can be customized later)
            player.bet = Math.min(15, player.bankroll)
          }
          
          // Initialize hands for ALL non-main players (both bots AND humans)
          player.hands = [{
            cards: [],
            bet: player.bet,
            isComplete: false,
            outcome: null,
            doubled: false
          }]
        }
      }
    }
    
    gamePhase.value = 'dealing'
    startDealing()
    
    return true
  }
  
  async function startDealing() {
    isDealing.value = true
    message.value = 'Dealing cards...'
    
    // Start autosave when game begins
    startAutosave()
    
    console.log('=== STARTING DEALING ===')
    console.log('Players before dealing:', players.value.map(p => ({ 
      name: p.name, 
      type: p.type,
      isMainPlayer: p.isMainPlayer,
      hands: p.hands.length 
    })))
    
    // Deal initial cards - 2 rounds
    for (let round = 0; round < 2; round++) {
      console.log(`Dealing round ${round + 1}`)
      // Deal to each player in seat order
      for (const player of players.value) {
        if (player.hands && player.hands.length > 0) {
          const card = dealCard()
          if (card) {
            player.hands[0].cards.push(card)
            console.log(`Dealt ${card.value}${card.suit} to ${player.name} (type: ${player.type})`)
          }
          
          // Add animation delay
          const playerStore = usePlayerStore()
          const delay = playerStore.settings.dealerSpeed / 2
          if (delay > 0) {
            await new Promise(resolve => setTimeout(resolve, delay))
          }
        } else {
          console.warn(`Player ${player.name} has no hands to deal to!`)
        }
      }
      
      // Deal to dealer
      const dealerCard = dealCard()
      if (dealerCard) {
        if (round === 1) dealerCard.faceDown = true // Second card face down
        dealerHand.value.push(dealerCard)
        console.log(`Dealt ${dealerCard.value}${dealerCard.suit} to dealer${round === 1 ? ' (face down)' : ''}`)
        
        const playerStore = usePlayerStore()
        const delay = playerStore.settings.dealerSpeed / 2
        if (delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }
    
    console.log('=== DEALING COMPLETE ===')
    console.log('Player hands after dealing:', players.value.map(p => ({ 
      name: p.name, 
      type: p.type,
      cards: p.hands[0]?.cards?.length || 0 
    })))
    
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
    let hasBlackjacks = false
    
    console.log('=== CHECKING FOR BLACKJACKS ===')
    
    // Check all players for blackjack
    for (const player of players.value) {
      if (player.hands.length > 0 && isBlackjack(player.hands[0].cards)) {
        player.hands[0].outcome = 'blackjack'
        player.hands[0].isComplete = true // Auto-complete blackjack hands
        player.status = 'blackjack'
        hasBlackjacks = true
        console.log(`${player.name} has blackjack!`)
      }
    }
    
    // Check dealer blackjack
    const dealerBlackjack = isBlackjack(dealerHand.value)
    
    if (dealerBlackjack) {
      console.log('Dealer has blackjack!')
      // Reveal hole card
      if (dealerHand.value[1]) {
        dealerHand.value[1].faceDown = false
      }
      
      // Update all player outcomes
      for (const player of players.value) {
        if (player.hands.length > 0) {
          const hand = player.hands[0]
          if (hand.outcome === 'blackjack') {
            hand.outcome = 'push'
          } else {
            hand.outcome = 'lose'
          }
          player.status = 'done'
        }
      }
      
      gamePhase.value = 'finished'
      finishGame()
    } else {
      // No dealer blackjack, start normal play
      console.log('No dealer blackjack, starting normal play')
      gamePhase.value = 'playing'
      currentPlayerIndex.value = 0
      
      // CRITICAL: Don't skip players who have blackjack
      // They still need to see their result before game proceeds
      startPlayerTurn()
    }
  }
  
  async function startPlayerTurn() {
    const player = currentPlayer.value
    if (!player) {
      console.log('No more players - moving to dealer')
      gamePhase.value = 'dealer'
      playDealerHand()
      return
    }
    
    console.log(`=== STARTING TURN FOR ${player.name} ===`)
    console.log(`Player type: ${player.type}, isMainPlayer: ${player.isMainPlayer}`)
    console.log(`Player status: ${player.status}`)
    
    // Initialize current hand index
    player.currentHandIndex = 0
    
    // Handle players with blackjack
    if (player.hands[0]?.outcome === 'blackjack' || player.status === 'blackjack') {
      console.log(`${player.name} has blackjack`)
      player.status = 'done'
      
      // CRITICAL: For human players with blackjack, still show them and wait
      if (player.type === 'human') {
        setActiveViewPlayer(player.id)
        message.value = `${player.name} has Blackjack!`
        // Don't auto-advance - let them see their blackjack
        // Wait for them to acknowledge before moving on
        setTimeout(() => {
          if (currentPlayer.value?.id === player.id && player.status === 'done') {
            nextPlayer()
          }
        }, 3000) // Give human players 3 seconds to see their blackjack
        return
      } else {
        // Only auto-advance for bots
        await new Promise(resolve => setTimeout(resolve, 1500)) // Let viewers see the blackjack
        nextPlayer()
        return
      }
    }
    
    player.status = 'playing'
    
    // CRITICAL FIX: Set active view for ANY human player (not just main player)
    if (player.type === 'human') {
      console.log(`${player.name} is a HUMAN player - setting active view and waiting for input`)
      setActiveViewPlayer(player.id)
      message.value = `${player.name}'s turn`
      // DO NOT call nextPlayer() or playBotTurn() - wait for human input!
    } else if (player.type === 'bot') {
      // Only bots should auto-play
      console.log(`${player.name} is a BOT - auto-playing`)
      setActiveViewPlayer(player.id) // Still show bot's cards
      await playBotTurn(player)
    } else {
      // This should never happen
      console.error(`Player ${player.name} has unknown type: ${player.type}`)
      // Default to waiting for input to be safe
      setActiveViewPlayer(player.id)
      message.value = `${player.name}'s turn`
    }
  }
  
  async function playBotTurn(player) {
    const playerStore = usePlayerStore()
    const delay = 1000 // Bot thinking time
    
    console.log(`=== PLAYING BOT TURN FOR ${player.name} ===`)
    
    // Play each hand
    for (let handIndex = 0; handIndex < player.hands.length; handIndex++) {
      player.currentHandIndex = handIndex
      const hand = player.hands[handIndex]
      
      if (hand.isComplete) continue
      
      while (!hand.isComplete) {
        await new Promise(resolve => setTimeout(resolve, delay))
        
        const decision = getBotDecision(hand, dealerUpCard.value, player.bankroll)
        console.log(`Bot ${player.name} decision: ${decision}`)
        
        if (decision === 'hit') {
          await hitForPlayer(player, handIndex)
        } else if (decision === 'stand') {
          standForPlayer(player, handIndex)
        } else if (decision === 'double' && hand.cards.length === 2) {
          await doubleDownForPlayer(player, handIndex)
        } else if (decision === 'split' && canSplitForPlayer(player, handIndex) && player.hands.length < 4) {
          await splitForPlayer(player, handIndex)
          // After split, restart the loop to play all hands
          handIndex = -1 // Will be incremented to 0
          break
        } else {
          standForPlayer(player, handIndex) // Default to stand
        }
      }
    }
    
    player.status = 'done'
    console.log(`Bot ${player.name} turn complete, calling nextPlayer()`)
    nextPlayer()
  }
  
  // NEW: Manual advancement for human players
  function advanceAfterHumanTurn() {
    console.log('=== ADVANCE AFTER HUMAN TURN ===')
    const player = currentPlayer.value
    
    if (!player || player.type !== 'human') {
      console.log('Not a human player, skipping')
      return
    }
    
    if (player.status === 'done') {
      console.log(`Human player ${player.name} is done, moving to next player`)
      nextPlayer()
    } else {
      console.log(`Human player ${player.name} is not done yet`)
    }
  }
  
  // Modified hit/stand/double to include manual advancement checks
  async function hitForPlayer(player, handIndex = 0) {
    console.log(`=== HIT FOR PLAYER ${player.name} ===`)
    const hand = player.hands[handIndex]
    await animatedDeal(hand, 1)
    
    const handValue = calculateHandValue(hand.cards)
    console.log(`${player.name} hand value: ${handValue.total}, busted: ${handValue.busted}`)
    
    // Auto-complete if busted OR if reached 21
    if (handValue.busted || handValue.total === 21) {
      hand.isComplete = true
      console.log(`Hand complete - ${handValue.busted ? 'BUSTED' : 'Got 21'}`)
      
      if (handValue.busted) {
        hand.outcome = 'lose'
        message.value = `${player.name} BUSTED!`
      } else {
        message.value = `${player.name} has 21!`
      }
      
      // Check if all hands are complete
      if (player.hands.every(h => h.isComplete)) {
        player.status = 'done'
        console.log(`All hands complete for ${player.name}`)
        
        // For humans, wait a moment then advance
        if (player.type === 'human') {
          console.log('Human player done - advancing after delay')
          setTimeout(() => {
            if (currentPlayer.value?.id === player.id && player.status === 'done') {
              nextPlayer()
            }
          }, 2000) // 2 second delay to see result
        }
        // REMOVED bot nextPlayer() call - it's handled in playBotTurn
      } else {
        // Move to next hand
        player.currentHandIndex++
        if (player.currentHandIndex >= player.hands.length) {
          player.status = 'done'
          
          // Same delay for humans
          if (player.type === 'human') {
            setTimeout(() => {
              if (currentPlayer.value?.id === player.id && player.status === 'done') {
                nextPlayer()
              }
            }, 2000)
          }
          // REMOVED bot nextPlayer() call
        } else {
          // Update message for next hand
          if (player.type === 'human') {
            message.value = `${player.name}'s turn - Hand ${player.currentHandIndex + 1} of ${player.hands.length}`
          }
        }
      }
    }
    // If not busted and not 21, human players continue playing
  }
  
  function standForPlayer(player, handIndex = 0) {
    console.log(`=== STAND FOR PLAYER ${player.name} ===`)
    player.hands[handIndex].isComplete = true
    
    // Check if all hands are complete
    if (player.hands.every(h => h.isComplete)) {
      player.status = 'done'
      console.log(`All hands complete for ${player.name}`)
      
      // For humans, advance after a short delay
      if (player.type === 'human') {
        console.log('Human player standing - advancing after delay')
        message.value = `${player.name} stands`
        setTimeout(() => {
          if (currentPlayer.value?.id === player.id && player.status === 'done') {
            nextPlayer()
          }
        }, 1500) // 1.5 second delay
      }
      // REMOVED bot nextPlayer() call - it's handled in playBotTurn
    } else {
      // Move to next hand
      player.currentHandIndex++
      if (player.currentHandIndex >= player.hands.length) {
        player.status = 'done'
        
        if (player.type === 'human') {
          setTimeout(() => {
            if (currentPlayer.value?.id === player.id && player.status === 'done') {
              nextPlayer()
            }
          }, 1500)
        }
        // REMOVED bot nextPlayer() call
      } else {
        // Update message for next hand
        if (player.type === 'human') {
          message.value = `${player.name}'s turn - Hand ${player.currentHandIndex + 1} of ${player.hands.length}`
        }
      }
    }
  }
  
  async function doubleDownForPlayer(player, handIndex = 0) {
    const hand = player.hands[handIndex]
    if (player.bankroll >= hand.bet) {
      hand.bet *= 2
      hand.doubled = true
      await animatedDeal(hand, 1)
      
      const handValue = calculateHandValue(hand.cards)
      if (handValue.busted) {
        hand.outcome = 'lose'
      }
      
      hand.isComplete = true
      
      // Check if all hands are complete
      if (player.hands.every(h => h.isComplete)) {
        player.status = 'done'
        
        // For humans, wait before advancing
        if (player.type === 'human') {
          setTimeout(() => {
            if (currentPlayer.value?.id === player.id && player.status === 'done') {
              nextPlayer()
            }
          }, 2000)
        }
        // REMOVED bot nextPlayer() call - it's handled in playBotTurn
      } else {
        // Move to next hand
        player.currentHandIndex++
        if (player.currentHandIndex >= player.hands.length) {
          player.status = 'done'
          
          if (player.type === 'human') {
            setTimeout(() => {
              if (currentPlayer.value?.id === player.id && player.status === 'done') {
                nextPlayer()
              }
            }, 2000)
          }
          // REMOVED bot nextPlayer() call
        }
      }
    }
  }
  
  function canSplitForPlayer(player, handIndex = 0) {
    // FIXED: Allow up to 4 hands (3 splits)
    if (player.hands.length >= 4) return false // Maximum 4 hands allowed
    
    // Check specific hand for split eligibility
    if (handIndex >= player.hands.length) return false
    const hand = player.hands[handIndex]
    
    // Must have exactly 2 cards
    if (hand.cards.length !== 2) return false
    
    // Check if it's a pair and player has enough bankroll
    return canSplit(hand.cards) && player.bankroll >= hand.bet
  }
  
  async function splitForPlayer(player, handIndex = 0) {
    if (!canSplitForPlayer(player, handIndex)) return
    
    const originalHand = player.hands[handIndex]
    const splitCard1 = originalHand.cards[0]
    const splitCard2 = originalHand.cards[1]
    
    // Create two new hands from the split
    const newHand1 = {
      cards: [splitCard1],
      bet: originalHand.bet,
      isComplete: false,
      outcome: null,
      doubled: false
    }
    
    const newHand2 = {
      cards: [splitCard2],
      bet: originalHand.bet,
      isComplete: false,
      outcome: null,
      doubled: false
    }
    
    // Replace the original hand with the two new hands
    player.hands.splice(handIndex, 1, newHand1, newHand2)
    
    // Deal one card to each new hand
    await animatedDeal(player.hands[handIndex], 1)
    await animatedDeal(player.hands[handIndex + 1], 1)
    
    // If splitting aces, only get one card each and auto-complete
    if (splitCard1.value === 'A') {
      player.hands[handIndex].isComplete = true
      player.hands[handIndex + 1].isComplete = true
      
      // Check for 21 (but not blackjack on split aces)
      for (let i = handIndex; i < handIndex + 2; i++) {
        const hand = player.hands[i]
        const value = calculateHandValue(hand.cards)
        if (value.total === 21) {
          // Just 21, not blackjack
          hand.outcome = null // Will be determined against dealer
        }
      }
      
      // Move to next unplayed hand or next player
      player.currentHandIndex = handIndex + 2
      if (player.currentHandIndex >= player.hands.length || player.hands.every(h => h.isComplete)) {
        player.status = 'done'
        nextPlayer()
      }
    } else {
      // For non-aces, check if either hand got 21 and auto-complete it
      for (let i = handIndex; i < handIndex + 2; i++) {
        const hand = player.hands[i]
        const value = calculateHandValue(hand.cards)
        if (value.total === 21) {
          // Auto-complete any hand that reaches 21 after split
          hand.isComplete = true
          console.log(`Hand ${i + 1} auto-completed with 21`)
        }
      }
      
      // Continue playing the first non-complete split hand
      player.currentHandIndex = handIndex
      
      // If the first hand is already complete (21), move to next hand
      if (player.hands[handIndex].isComplete) {
        player.currentHandIndex = handIndex + 1
        if (player.currentHandIndex >= player.hands.length || player.hands[player.currentHandIndex].isComplete) {
          // Both hands are complete
          player.status = 'done'
          nextPlayer()
          return
        }
      }
      
      // Update message to show which hand is being played
      if (player.type === 'human') {
        message.value = `${player.name}'s turn - Hand ${player.currentHandIndex + 1} of ${player.hands.length}`
      }
    }
    
    // Save state after split
    saveCurrentGameState()
  }
  
  // Player actions (for current human player)
  async function hit() {
    console.log('=== HIT ACTION CALLED ===')
    console.log('canPlay:', canPlay.value)
    console.log('currentPlayer:', currentPlayer.value)
    console.log('activeViewPlayer:', activeViewPlayer.value)
    
    if (!canPlay.value) {
      console.log('Cannot play - canPlay is false')
      return
    }
    
    // Check if we're trying to play for the currently active player
    if (currentPlayer.value?.id === activeViewPlayer.value?.id && currentPlayer.value?.type === 'human') {
      console.log('Hitting for human player:', currentPlayer.value.name)
      await hitForPlayer(currentPlayer.value, currentPlayer.value.currentHandIndex || 0)
    } else {
      console.log('Hit conditions not met')
      console.log('Current player ID:', currentPlayer.value?.id)
      console.log('Active view player ID:', activeViewPlayer.value?.id)
      console.log('Current player type:', currentPlayer.value?.type)
    }
  }
  
  function stand() {
    console.log('=== STAND ACTION CALLED ===')
    console.log('canPlay:', canPlay.value)
    console.log('currentPlayer:', currentPlayer.value)
    console.log('activeViewPlayer:', activeViewPlayer.value)
    
    if (!canPlay.value) {
      console.log('Cannot play - canPlay is false')
      return
    }
    
    // Check if we're trying to play for the currently active player
    if (currentPlayer.value?.id === activeViewPlayer.value?.id && currentPlayer.value?.type === 'human') {
      console.log('Standing for human player:', currentPlayer.value.name)
      standForPlayer(currentPlayer.value, currentPlayer.value.currentHandIndex || 0)
    } else {
      console.log('Stand conditions not met')
    }
  }
  
  async function doubleDown() {
    if (!canPlay.value) return
    
    // Check if we're trying to play for the currently active player
    if (currentPlayer.value?.id === activeViewPlayer.value?.id && currentPlayer.value?.type === 'human') {
      await doubleDownForPlayer(currentPlayer.value, currentPlayer.value.currentHandIndex || 0)
    }
  }
  
  async function split() {
    if (!canPlay.value) return
    
    // Check if we're trying to play for the currently active player
    if (currentPlayer.value?.id === activeViewPlayer.value?.id && currentPlayer.value?.type === 'human') {
      const handIndex = currentPlayer.value.currentHandIndex || 0
      await splitForPlayer(currentPlayer.value, handIndex)
    }
  }
  
  function nextPlayer() {
    console.log(`=== NEXT PLAYER CALLED ===`)
    console.log(`Current player index: ${currentPlayerIndex.value}`)
    console.log(`Total players: ${players.value.length}`)
    
    // Guard against duplicate calls
    if (gamePhase.value !== 'playing') {
      console.log('Not in playing phase, ignoring nextPlayer call')
      return
    }
    
    currentPlayerIndex.value++
    
    if (currentPlayerIndex.value >= players.value.length) {
      console.log('All players have played - moving to dealer')
      gamePhase.value = 'dealer'
      playDealerHand()
    } else {
      console.log(`Moving to player ${currentPlayerIndex.value}: ${players.value[currentPlayerIndex.value]?.name}`)
      startPlayerTurn()
    }
  }
  
  async function playDealerHand() {
    const playerStore = usePlayerStore()
    message.value = 'Dealer playing...'
    
    // Reveal hole card
    if (dealerHand.value[1]) {
      dealerHand.value[1].faceDown = false
    }
    
    // Only play if at least one player didn't bust
    const hasNonBustedPlayer = players.value.some(player => 
      player.hands.some(hand => calculateHandValue(hand.cards).total <= 21)
    )
    
    if (hasNonBustedPlayer) {
      while (getDealerAction(dealerHand.value) === 'hit') {
        await animatedDeal({ cards: dealerHand.value }, 1)
        
        if (playerStore.settings.dealerSpeed > 0) {
          await new Promise(resolve => setTimeout(resolve, playerStore.settings.dealerSpeed))
        }
      }
    }
    
    gamePhase.value = 'finished'
    finishGame()
  }
  
  async function finishGame() {
    // Stop autosave when game ends but DON'T clear saved state
    stopAutosave()
    // Save final state
    await saveCurrentGameState()
    
    const playerStore = usePlayerStore()
    
    // Calculate outcomes for all players
    for (const player of players.value) {
      let totalPayout = 0
      let totalBet = 0
      
      for (const hand of player.hands) {
        totalBet += hand.bet
        
        if (!hand.outcome) {
          const playerBlackjack = isBlackjack(hand.cards)
          const dealerBlackjack = isBlackjack(dealerHand.value)
          hand.outcome = getHandOutcome(hand.cards, dealerHand.value, playerBlackjack, dealerBlackjack)
        }
        
        // Calculate payout
        let handPayout = 0
        if (hand.outcome === 'blackjack') {
          // Use configurable blackjack payout
          const playerStore = usePlayerStore()
          const payoutSetting = playerStore.settings.blackjackPayout || '3:2'
          
          switch (payoutSetting) {
            case '3:2':
              handPayout = hand.bet * 1.5
              break
            case '6:5':
              handPayout = hand.bet * 1.2
              break
            case '1:1':
              handPayout = hand.bet
              break
            default:
              handPayout = hand.bet * 1.5 // Fallback to standard
          }
        } else if (hand.outcome === 'win') {
          handPayout = hand.bet
        } else if (hand.outcome === 'push') {
          handPayout = 0
        } else if (hand.outcome === 'lose') {
          handPayout = -hand.bet
        }
        
        totalPayout += handPayout
      }
      
      // Update bankrolls
      if (player.isMainPlayer) {
        await playerStore.updateBankroll(totalPayout)
        
        // Save game result
        if (playerStore.currentPlayer) {
          await saveGameResult(
            playerStore.currentPlayer.id,
            player.hands,
            getOverallOutcome(player.hands),
            totalBet, // Use total bet from all hands
            totalPayout
          )
        }
      } else {
        player.bankroll += totalPayout
      }
    }
    
    message.value = isMultiplayer.value ? 'Round complete' : getGameResultMessage()
  }
  
  function getOverallOutcome(hands) {
    const wins = hands.filter(h => ['win', 'blackjack'].includes(h.outcome)).length
    const losses = hands.filter(h => h.outcome === 'lose').length
    
    if (wins > 0 && losses === 0) return 'win'
    if (losses > 0 && wins === 0) return 'lose'
    return 'push'
  }
  
  function getGameResultMessage() {
    const main = mainPlayer.value
    if (!main || !main.hands.length) return ''
    
    // Calculate total payout for all hands
    let totalPayout = 0
    let totalBet = 0
    let outcomes = []
    
    for (const hand of main.hands) {
      totalBet += hand.bet
      
      if (hand.outcome === 'blackjack') {
        // Use configurable blackjack payout
        const playerStore = usePlayerStore()
        const payoutSetting = playerStore.settings.blackjackPayout || '3:2'
        
        switch (payoutSetting) {
          case '3:2':
            totalPayout += hand.bet * 1.5
            break
          case '6:5':
            totalPayout += hand.bet * 1.2
            break
          case '1:1':
            totalPayout += hand.bet
            break
          default:
            totalPayout += hand.bet * 1.5 // Fallback to standard
        }
        outcomes.push('blackjack')
      } else if (hand.outcome === 'win') {
        totalPayout += hand.bet
        outcomes.push('win')
      } else if (hand.outcome === 'lose') {
        totalPayout -= hand.bet
        outcomes.push('lose')
      } else if (hand.outcome === 'push') {
        outcomes.push('push')
      }
    }
    
    // Create appropriate message based on outcomes
    if (main.hands.length === 1) {
      // Single hand
      const outcome = outcomes[0]
      if (outcome === 'blackjack') return 'Blackjack! You won!'
      if (outcome === 'win') return `You won $${Math.abs(totalPayout)}!`
      if (outcome === 'lose') return `You lost $${Math.abs(totalPayout)}`
      return 'Push - no money lost or won'
    } else {
      // Multiple hands
      const wins = outcomes.filter(o => o === 'win' || o === 'blackjack').length
      const losses = outcomes.filter(o => o === 'lose').length
      const pushes = outcomes.filter(o => o === 'push').length
      
      let result = []
      if (wins > 0) result.push(`${wins} win${wins > 1 ? 's' : ''}`)
      if (losses > 0) result.push(`${losses} loss${losses > 1 ? 'es' : ''}`)
      if (pushes > 0) result.push(`${pushes} push${pushes > 1 ? 'es' : ''}`)
      
      if (totalPayout > 0) {
        return `${result.join(', ')} - Won $${totalPayout} total!`
      } else if (totalPayout < 0) {
        return `${result.join(', ')} - Lost $${Math.abs(totalPayout)} total`
      } else {
        return `${result.join(', ')} - Broke even`
      }
    }
  }
  
  // Compatibility functions for existing code
  const playerHands = computed(() => {
    // Always return an array, even if empty
    const viewPlayer = activeViewPlayer.value
    if (!viewPlayer || !viewPlayer.hands) return []
    return viewPlayer.hands
  })
  
  const currentHandIndex = ref(0)
  
  const currentHand = computed(() => {
    // Get the current hand of the player we're viewing
    const viewPlayer = activeViewPlayer.value
    if (!viewPlayer || !viewPlayer.hands || viewPlayer.hands.length === 0) return null
    
    // If viewing the current playing player, show their active hand
    if (viewPlayer.id === currentPlayer.value?.id) {
      const idx = currentPlayer.value.currentHandIndex || 0
      return viewPlayer.hands[idx] || viewPlayer.hands[0] || null
    }
    
    // Otherwise show the viewed player's first hand
    return viewPlayer.hands[0] || null
  })
  
  const allHandsComplete = computed(() => {
    const hands = playerHands.value
    return hands.length > 0 && hands.every(hand => hand.isComplete)
  })
  
  const currentBet = computed(() => activeViewPlayer.value?.bet || 0)
  const totalBet = computed(() => activeViewPlayer.value?.bet || 0)
  const lastBet = ref(15)
  const insuranceBet = ref(0)
  
  // Function to switch active view
  function setActiveViewPlayer(playerId) {
    const player = players.value.find(p => p.id === playerId)
    if (player) {
      console.log(`Setting active view to: ${player.name} (${playerId})`)
      console.log(`Player object:`, JSON.parse(JSON.stringify(player)))
      
      // Direct assignment
      activeViewPlayerId.value = playerId
      
      // Log to verify it was set
      console.log(`activeViewPlayerId is now: ${activeViewPlayerId.value}`)
    } else {
      console.error(`Could not find player with id: ${playerId}`)
    }
  }
  
  // Adapter for existing placeBet function
  function placeBet(amount) {
    lastBet.value = amount
    return placeMainPlayerBet(amount)
  }
  
  return {
    // State
    deck,
    dealerHand,
    gamePhase,
    message,
    isDealing,
    gameHistory,
    numDecks,
    penetration,
    cardsDealt,
    
    // Multiplayer State
    players,
    currentPlayerIndex,
    isMultiplayer,
    maxPlayers,
    activePlayerCount,
    activeViewPlayerId,
    
    // Getters
    currentPlayer,
    mainPlayer,
    activeViewPlayer,
    dealerUpCard,
    dealerHoleCard,
    dealerShowsAce,
    needsNewDeck,
    canBet,
    canPlay,
    canViewAllHands,
    
    // Compatibility getters
    playerHands,
    currentHandIndex,
    currentHand,
    allHandsComplete,
    currentBet,
    totalBet,
    lastBet,
    insuranceBet,
    
    // Actions
    initializeGame,
    createNewDeck,
    resetGame,
    forceNewGame,
    dealCard,
    
    // Multiplayer Actions
    addPlayer,
    removePlayer,
    enableMultiplayer,
    disableMultiplayer,
    setActiveViewPlayer,
    changePlayerSeat,
    swapPlayerSeats,
    
    // Game Actions
    placeBet,
    placeBets,
    placeMainPlayerBet,
    startDealing,
    animatedDeal,
    checkForBlackjacks,
    hit,
    stand,
    doubleDown,
    split,
    nextPlayer,
    playDealerHand,
    playBotTurn,
    finishGame,
    getOverallOutcome,
    getGameResultMessage,
    
    // Autosave functions
    saveCurrentGameState,
    loadSavedGameState,
    clearSavedGameState,
    startAutosave,
    stopAutosave
  }
})