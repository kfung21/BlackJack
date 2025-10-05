<template>
  <div class="game-view">
    <div class="game-container">
      <!-- Game Over Modal -->
      <div v-if="showGameOver" class="game-over-modal">
        <div class="modal-overlay" @click.stop></div>
        <div class="modal-content">
          <div class="game-over-header">
            <h2>😢 Out of Chips!</h2>
          </div>
          <div class="game-over-body">
            <p>Sorry, you don't have enough money to continue playing.</p>
            <p class="current-bankroll">Current bankroll: ${{ playerStore.bankroll }}</p>
            
            <div class="restart-options">
              <h3>Choose how to continue:</h3>
              
              <!-- Quick restart options -->
              <div class="quick-restart-buttons">
                <button 
                  v-for="amount in restartAmounts"
                  :key="amount"
                  @click="restartWithAmount(amount)"
                  class="restart-btn"
                >
                  <span class="amount">${{ amount }}</span>
                  <span class="label">{{ getRestartLabel(amount) }}</span>
                </button>
              </div>
              
              <!-- Custom amount -->
              <div class="custom-restart">
                <label>Or choose custom amount:</label>
                <div class="custom-input-group">
                  <span class="currency-symbol">$</span>
                  <input 
                    type="number" 
                    v-model.number="customRestartAmount"
                    placeholder="Enter amount"
                    min="50"
                    max="10000"
                    step="50"
                    class="custom-input"
                    @keyup.enter="restartWithAmount(customRestartAmount)"
                  >
                  <button 
                    @click="restartWithAmount(customRestartAmount)"
                    :disabled="customRestartAmount < 50"
                    class="btn btn-primary"
                  >
                    Start
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <div class="game-over-footer">
            <button @click="backToProfile" class="btn btn-secondary">
              Change Player
            </button>
          </div>
        </div>
      </div>

      <!-- Simplified betting screen when in betting phase -->
      <div v-if="gameStore.gamePhase === 'betting'" class="betting-screen">
        <!-- Simple header with just bankroll -->
        <div class="betting-header">
          <div class="bankroll-display">
            <div class="bankroll-label">Available</div>
            <div class="bankroll-amount" :class="{ 'low-bankroll': isLowBankroll }">
              ${{ playerStore.bankroll }}
            </div>
          </div>
        </div>

        <!-- Clean betting interface -->
        <div class="betting-main">
          <div class="bet-display">
            <div class="bet-label">Place Your Bet</div>
            <div class="bet-amount-display">
              <span class="currency">$</span>
              <span class="amount">{{ currentBet }}</span>
            </div>
          </div>

          <!-- Bet controls -->
          <div class="bet-controls">
            <div class="quick-bets">
              <button 
                v-for="amount in quickBetAmounts"
                :key="amount"
                @click="setBet(amount)"
                :disabled="amount > playerStore.bankroll"
                class="btn bet-btn"
                :class="{ 'active': currentBet === amount }"
              >
                ${{ amount }}
              </button>
            </div>
            
            <div class="bet-adjusters">
              <button @click="decreaseBet" :disabled="currentBet <= 5" class="btn btn-adjuster">−</button>
              <button @click="increaseBet" :disabled="currentBet >= playerStore.bankroll" class="btn btn-adjuster">+</button>
            </div>
          </div>

          <!-- Deal button -->
          <button 
            @click="placeBet"
            :disabled="!canPlaceBet"
            class="btn btn-primary deal-btn"
          >
            Deal Cards
          </button>
        </div>


      </div>

      <!-- Regular game view when not betting -->
      <div v-else>
        <!-- Compact Header - Just bankroll -->
        <div class="compact-header">
          <span class="bankroll" :class="{ 'low-bankroll': isLowBankroll }">${{ playerStore.bankroll }}</span>
          
          <!-- Multiplayer toggle and new shoe -->
          <div class="header-buttons">
            <button 
              @click="toggleMultiplayer" 
              class="multiplayer-btn" 
              :class="{ active: gameStore.isMultiplayer }"
              title="Toggle Multiplayer"
            >
              {{ gameStore.isMultiplayer ? '👥' : '👤' }}
            </button>
            
            <button @click="newShoe" class="new-shoe-btn" title="New Shoe - Fresh Decks">
              🔄
            </button>
          </div>
        </div>

        <!-- Compact Card Count Panel -->
        <CardCountPanel />

        <!-- Dealer Hand -->
        <DealerHand
          :dealer-cards="gameStore.dealerHand"
          :is-dealing="gameStore.isDealing"
          :game-phase="gameStore.gamePhase"
          :show-insurance="showInsurance"
          @take-insurance="takeInsurance"
          @decline-insurance="declineInsurance"
        />

        <!-- Game Message -->
        <div class="game-message" :class="messageClass">
          <span v-if="showCurrentPlayer" class="current-player-indicator">
            {{ gameStore.currentPlayer?.name }}'s Turn {{ gameStore.currentPlayer?.avatar }}
          </span>
          <span v-else>{{ gameStore.message }}</span>
        </div>

        <!-- Player Hands -->
        <div class="player-hands-container" :key="`hands-${gameStore.activeViewPlayerId}-${currentPlayerHands.length}`">
          <!-- Show whose cards we're viewing if in multiplayer -->
          <div v-if="gameStore.isMultiplayer && gameStore.activeViewPlayer" class="viewing-player-indicator">
            Viewing: {{ gameStore.activeViewPlayer.name }} {{ gameStore.activeViewPlayer.avatar }}
          </div>
          
          <!-- Net result for finished games with splits -->
          <div v-if="showNetResult" class="net-result" :class="netResultClass">
            <span class="net-label">Net:</span>
            <span class="net-amount">{{ netResultText }}</span>
          </div>
          
          <!-- Show multiple hands if split -->
          <div :class="{ 'split-hands': currentPlayerHands.length > 1 }">
            <PlayerHand
              v-for="(hand, index) in currentPlayerHands"
              :key="`hand-${index}-${gameStore.activeViewPlayerId}-${hand.cards.length}`"
              :hand="hand"
              :hand-index="index"
              :is-active="isHandActive(index)"
              :is-dealing="gameStore.isDealing"
              @card-click="onCardClick"
            />
          </div>
          
          <!-- Show message if no hands -->
          <div v-if="currentPlayerHands.length === 0" class="no-hands-message">
            No cards to display
          </div>
        </div>

        <!-- Compact Action Buttons -->
        <div class="action-buttons" v-if="gameStore.canPlay && isCurrentHumanPlayerTurn">
          <button 
            @click="hit"
            :disabled="!canHit"
            class="btn btn-action btn-hit"
          >
            Hit
          </button>
          
          <button 
            @click="stand"
            :disabled="!canStand"
            class="btn btn-action btn-stand"
          >
            Stand
          </button>
          
          <button 
            @click="doubleDown"
            :disabled="!canDouble"
            class="btn btn-action btn-double"
            :class="{ 'btn-invisible': !canDouble }"
          >
            Double
          </button>
          
          <button 
            @click="showHint"
            v-if="playerStore.settings.showHints"
            class="btn btn-action btn-hint"
          >
            💡 Hint
          </button>
          
          <button 
            @click="split"
            :disabled="!canSplitHand"
            class="btn btn-action btn-split"
            :class="{ 'btn-invisible': !canSplitHand }"
          >
            Split
          </button>
          
          <div 
            v-if="!playerStore.settings.showHints"
            class="btn-spacer"
          ></div>
        </div>

        <!-- New Game Buttons -->
        <div class="new-game-section" v-if="gameStore.gamePhase === 'finished'">
          <div class="game-buttons">
            <button 
              @click="sameBet" 
              v-if="canUseSameBet"
              class="btn btn-primary btn-same-bet"
            >
              Same Bet (${{ gameStore.lastBet }})
            </button>
            <button @click="newGame" class="btn btn-secondary btn-new-game">
              {{ canUseSameBet ? 'Rebet' : 'New Bet' }}
            </button>
          </div>
        </div>

        <!-- Hint Modal -->
        <HintModal 
          :is-visible="showHintModal"
          @close="showHintModal = false"
        />

        <!-- Player Roster -->
        <PlayerRoster />

        <!-- Hidden Bottom Navigation -->
        <div class="bottom-nav" :class="{ 'nav-visible': showBottomNav }" @touchstart="handleNavTouch" @mouseenter="showBottomNav = true" @mouseleave="showBottomNav = false">
          <button @click="$router.push('/')" class="nav-btn" :class="{ active: $route.path === '/' }">
            <span class="nav-icon">🎮</span>
            <span class="nav-label">Game</span>
          </button>
          
          <button @click="$router.push('/stats')" class="nav-btn" :class="{ active: $route.path === '/stats' }">
            <span class="nav-icon">📊</span>
            <span class="nav-label">Stats</span>
          </button>
          
          <button @click="$router.push('/settings')" class="nav-btn" :class="{ active: $route.path === '/settings' }">
            <span class="nav-icon">⚙️</span>
            <span class="nav-label">Settings</span>
          </button>
          
          <button @click="$router.push('/profile')" class="nav-btn" :class="{ active: $route.path === '/profile' }">
            <span class="nav-icon">👤</span>
            <span class="nav-label">Profile</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick, onBeforeUnmount } from 'vue'
import { usePlayerStore } from '../stores/playerStore'
import { useGameStore } from '../stores/gameStore'
import { useCountingStore } from '../stores/countingStore'
import { useRouter } from 'vue-router'
import { generateBotName } from '../utils/botStrategy'

import CardCountPanel from '../components/CardCountPanel.vue'
import DealerHand from '../components/DealerHand.vue'
import PlayerHand from '../components/PlayerHand.vue'
import HintModal from '../components/HintModal.vue'
import PlayerRoster from '../components/PlayerRoster.vue'

const router = useRouter()
const playerStore = usePlayerStore()
const gameStore = useGameStore()
const countingStore = useCountingStore()

const showInsurance = ref(false)
const showHintModal = ref(false)
const showBottomNav = ref(false)
const processedCards = ref(new Set()) // Track cards already counted
const showGameOver = ref(false)
const customRestartAmount = ref(1000)
const currentBet = ref(15)

// Restart amount options
const restartAmounts = [200, 500, 1000, 2500]

// Quick bet amounts
const quickBetAmounts = computed(() => {
  const amounts = [5, 10, 15, 25, 50, 100]
  return amounts.filter(amount => amount <= playerStore.bankroll)
})

const canPlaceBet = computed(() => {
  return currentBet.value > 0 && currentBet.value <= playerStore.bankroll
})

// Check if bankroll is too low
const isLowBankroll = computed(() => {
  return playerStore.bankroll < 15 // Minimum bet is $15
})

// Watch for game phase changes to check for game over
watch(() => gameStore.gamePhase, (newPhase, oldPhase) => {
  // When transitioning to betting phase, check if player has enough money
  if (newPhase === 'betting') {
    // Use nextTick to ensure bankroll is updated after any payouts
    nextTick(() => {
      if (playerStore.bankroll < 15) {
        console.log('Game over - bankroll below minimum:', playerStore.bankroll)
        showGameOver.value = true
      }
      // Removed the check for last bet - let them choose a new bet amount
    })
  }
})

// Also watch bankroll directly for immediate updates
watch(() => playerStore.bankroll, (newBankroll) => {
  // If bankroll drops below minimum bet at any time during betting phase
  if (gameStore.gamePhase === 'betting' && newBankroll < 15) {
    console.log('Game over due to low bankroll:', newBankroll)
    showGameOver.value = true
  }
})

// Also check on mount
onMounted(async () => {
  if (!playerStore.isLoggedIn) {
    router.push('/profile')
    return
  }
  
  // Initialize bet with last bet or default, but cap at bankroll
  if (gameStore.lastBet && gameStore.lastBet <= playerStore.bankroll) {
    currentBet.value = gameStore.lastBet
  } else {
    // If can't afford last bet, default to $15 or their bankroll if less
    currentBet.value = Math.min(15, playerStore.bankroll)
  }
  
  gameStore.initializeGame()
  await addVisibleCardsToCount()
  
  // Check if player is out of money after initialization
  nextTick(() => {
    if (playerStore.bankroll < 15) {
      console.log('Game over on mount - bankroll:', playerStore.bankroll)
      showGameOver.value = true
    }
  })
})

function setBet(amount) {
  currentBet.value = Math.min(amount, playerStore.bankroll)
}

function increaseBet() {
  const increment = currentBet.value < 50 ? 5 : (currentBet.value < 100 ? 10 : 25)
  currentBet.value = Math.min(currentBet.value + increment, playerStore.bankroll)
}

function decreaseBet() {
  const decrement = currentBet.value <= 50 ? 5 : (currentBet.value <= 100 ? 10 : 25)
  currentBet.value = Math.max(currentBet.value - decrement, 5)
}

function placeBet() {
  if (canPlaceBet.value) {
    gameStore.placeMainPlayerBet(currentBet.value)
  }
}

function getRestartLabel(amount) {
  if (amount === 200) return 'Beginner'
  if (amount === 500) return 'Casual'
  if (amount === 1000) return 'Standard'
  if (amount === 2500) return 'High Roller'
  return ''
}

async function restartWithAmount(amount) {
  if (amount < 50) {
    alert('Minimum restart amount is $50')
    return
  }
  
  // Calculate the difference to add
  const currentBankroll = playerStore.bankroll
  const difference = amount - currentBankroll
  
  // Update bankroll
  await playerStore.updateBankroll(difference)
  
  // Reset game
  gameStore.resetGame()
  countingStore.resetCount()
  
  // Close modal
  showGameOver.value = false
  
  // Show success message
  gameStore.message = `Bankroll reset to ${amount}. Good luck!`
}

function backToProfile() {
  router.push('/profile')
}

const currentPlayerHands = computed(() => {
  // Force reactivity by accessing the refs directly
  const viewPlayerId = gameStore.activeViewPlayerId
  const allPlayers = gameStore.players
  
  console.log(`Looking for player with ID: ${viewPlayerId}`)
  console.log(`All players:`, allPlayers.map(p => ({ id: p.id, name: p.name, hands: p.hands?.length })))
  
  // Find the player we're viewing
  const viewPlayer = allPlayers.find(p => p.id === viewPlayerId)
  
  if (!viewPlayer) {
    console.log(`Player not found with ID: ${viewPlayerId}`)
    return []
  }
  
  console.log(`Found player: ${viewPlayer.name}, hands:`, viewPlayer.hands)
  
  if (!viewPlayer.hands || viewPlayer.hands.length === 0) {
    console.log(`Player ${viewPlayer.name} has no hands`)
    return []
  }
  
  // Return the hands directly (not a spread copy)
  return viewPlayer.hands
})

// Watch for active view changes and force update
watch(() => gameStore.activeViewPlayerId, (newId, oldId) => {
  console.log(`View switched from ${oldId} to ${newId}`)
  // Force component update
  nextTick(() => {
    const player = gameStore.players.find(p => p.id === newId)
    console.log(`New view player:`, player)
    console.log(`Their hands:`, player?.hands)
  })
})

// Also watch for changes to the current player's hands
watch(() => {
  const viewPlayer = gameStore.players.find(p => p.id === gameStore.activeViewPlayerId)
  return viewPlayer?.hands
}, (newHands) => {
  console.log(`Hands updated for viewed player:`, newHands)
}, { deep: true })

const isActiveHand = computed(() => {
  // Check if the viewed player is the current playing player
  return gameStore.activeViewPlayer?.id === gameStore.currentPlayer?.id && 
         gameStore.gamePhase === 'playing'
})

function isHandActive(handIndex) {
  if (!isActiveHand.value) return false
  
  // Check if this specific hand is the active one
  const currentPlayer = gameStore.currentPlayer
  return currentPlayer && (currentPlayer.currentHandIndex || 0) === handIndex
}

const messageClass = computed(() => {
  if (gameStore.message.includes('won')) return 'message-win'
  if (gameStore.message.includes('lost')) return 'message-lose'
  if (gameStore.message.includes('BUST')) return 'message-bust'
  return ''
})

const showCurrentPlayer = computed(() => {
  return gameStore.gamePhase === 'playing' && 
         gameStore.isMultiplayer && 
         gameStore.currentPlayer
})

// FIXED: Check if it's a human player's turn AND we're viewing them
const isCurrentHumanPlayerTurn = computed(() => {
  // Check if:
  // 1. The current player in turn is human
  // 2. We are viewing that same player
  const currentPlayerIsHuman = gameStore.currentPlayer?.type === 'human'
  const viewingCurrentPlayer = gameStore.activeViewPlayer?.id === gameStore.currentPlayer?.id
  
  console.log('isCurrentHumanPlayerTurn check:')
  console.log('- Current player:', gameStore.currentPlayer?.name, gameStore.currentPlayer?.type)
  console.log('- Active view player:', gameStore.activeViewPlayer?.name)
  console.log('- Current is human:', currentPlayerIsHuman)
  console.log('- Viewing current:', viewingCurrentPlayer)
  console.log('- Result:', currentPlayerIsHuman && viewingCurrentPlayer)
  
  return currentPlayerIsHuman && viewingCurrentPlayer
})

const canHit = computed(() => {
  if (!gameStore.canPlay || !isCurrentHumanPlayerTurn.value) return false
  const currentPlayer = gameStore.currentPlayer
  if (!currentPlayer) return false
  
  const currentHandIndex = currentPlayer.currentHandIndex || 0
  const hands = currentPlayerHands.value
  if (hands.length === 0 || currentHandIndex >= hands.length) return false
  
  return !hands[currentHandIndex].isComplete
})

const canStand = computed(() => {
  if (!gameStore.canPlay || !isCurrentHumanPlayerTurn.value) return false
  const currentPlayer = gameStore.currentPlayer
  if (!currentPlayer) return false
  
  const currentHandIndex = currentPlayer.currentHandIndex || 0
  const hands = currentPlayerHands.value
  if (hands.length === 0 || currentHandIndex >= hands.length) return false
  
  return !hands[currentHandIndex].isComplete
})

const canDouble = computed(() => {
  if (!gameStore.canPlay || !isCurrentHumanPlayerTurn.value) return false
  const currentPlayer = gameStore.currentPlayer
  if (!currentPlayer) return false
  
  const currentHandIndex = currentPlayer.currentHandIndex || 0
  const hands = currentPlayerHands.value
  if (hands.length === 0 || currentHandIndex >= hands.length) return false
  
  const hand = hands[currentHandIndex]
  return hand.cards.length === 2 && !hand.doubled && playerStore.bankroll >= hand.bet
})

const canSplitHand = computed(() => {
  if (!gameStore.canPlay || !isCurrentHumanPlayerTurn.value) return false
  const currentPlayer = gameStore.currentPlayer
  if (!currentPlayer) return false
  
  const hands = currentPlayerHands.value
  if (hands.length === 0 || hands.length >= 4) return false // Max 4 hands allowed
  
  const currentHandIndex = currentPlayer.currentHandIndex || 0
  if (currentHandIndex >= hands.length) return false
  
  const hand = hands[currentHandIndex]
  if (!hand || hand.cards.length !== 2) return false
  
  const firstValue = getCardValue(hand.cards[0])
  const secondValue = getCardValue(hand.cards[1])
  return firstValue === secondValue && playerStore.bankroll >= hand.bet
})

const canUseSameBet = computed(() => {
  return gameStore.lastBet <= playerStore.bankroll && gameStore.lastBet > 0
})

// Show net result only for split hands
const showNetResult = computed(() => {
  if (gameStore.gamePhase !== 'finished') return false
  
  const viewPlayer = gameStore.activeViewPlayer
  if (!viewPlayer || !viewPlayer.hands) return false
  
  // Only show net result if player has multiple hands (from splits)
  return viewPlayer.hands.length > 1 && netResult.value !== null
})

// Calculate net result for current game
const netResult = computed(() => {
  if (gameStore.gamePhase !== 'finished') return null
  
  const viewPlayer = gameStore.activeViewPlayer
  if (!viewPlayer || !viewPlayer.hands || viewPlayer.hands.length === 0) return null
  
  let totalBet = 0
  let totalWon = 0
  
  for (const hand of viewPlayer.hands) {
    totalBet += hand.bet || 0
    
    if (hand.outcome === 'blackjack') {
      const payoutSetting = playerStore.settings.blackjackPayout || '3:2'
      switch (payoutSetting) {
        case '3:2':
          totalWon += hand.bet + (hand.bet * 1.5)
          break
        case '6:5':
          totalWon += hand.bet + (hand.bet * 1.2)
          break
        case '1:1':
          totalWon += hand.bet + hand.bet
          break
      }
    } else if (hand.outcome === 'win') {
      totalWon += hand.bet * 2 // Original bet + winnings
    } else if (hand.outcome === 'push') {
      totalWon += hand.bet // Just get bet back
    }
    // For losses, totalWon stays 0 for that hand
  }
  
  return totalWon - totalBet
})

const netResultText = computed(() => {
  if (netResult.value === null) return ''
  
  if (netResult.value > 0) {
    return `+$${netResult.value.toFixed(2)}`
  } else if (netResult.value < 0) {
    return `-$${Math.abs(netResult.value).toFixed(2)}`
  } else {
    return '$0.00'
  }
})

const netResultClass = computed(() => {
  if (netResult.value === null) return ''
  
  if (netResult.value > 0) return 'net-win'
  if (netResult.value < 0) return 'net-loss'
  return 'net-push'
})

// Save game state before leaving
onBeforeUnmount(() => {
  // Save current game state when leaving the game view
  if (gameStore.gamePhase !== 'betting' && gameStore.gamePhase !== 'finished') {
    gameStore.saveCurrentGameState()
  }
})

// Watch for dealer hand changes and add to count (avoid double counting)
watch(() => gameStore.dealerHand, (newHand, oldHand) => {
  console.log('Dealer hand changed, updating count...')
  addVisibleCardsToCount()
  // Force reactivity update
  nextTick(() => {
    console.log(`Current running count after dealer update: ${countingStore.runningCount}`)
  })
}, { deep: true })

// Watch for player hand changes and add to count (avoid double counting)
watch(() => gameStore.playerHands, (newHands, oldHands) => {
  console.log('Player hands changed, updating count...')
  addVisibleCardsToCount()
  // Force reactivity update
  nextTick(() => {
    console.log(`Current running count after player update: ${countingStore.runningCount}`)
  })
}, { deep: true })

// Watch for all player hands changes in multiplayer
watch(() => gameStore.players, (newPlayers) => {
  console.log('Player hands changed, updating count...')
  addVisibleCardsToCount()
}, { deep: true })

// Watch for active view player changes
watch(() => gameStore.activeViewPlayerId, (newId) => {
  console.log(`View switched to player: ${newId}`)
  // Force update of the player hands display
  nextTick(() => {
    console.log(`Viewing player hands:`, currentPlayerHands.value)
  })
})

// IMPORTANT: Watch for game phase changes to count revealed dealer cards
watch(() => gameStore.gamePhase, (newPhase, oldPhase) => {
  console.log(`Game phase changed from ${oldPhase} to ${newPhase}`)
  
  if (newPhase === 'dealer' || newPhase === 'finished') {
    // When dealer plays or game finishes, recount ALL cards to catch revealed hole card
    console.log('=== RECOUNTING ALL CARDS FOR REVEALED DEALER CARD ===')
    // Clear processed cards to force recount of all visible cards
    processedCards.value.clear()
    addVisibleCardsToCount()
  } else if (newPhase === 'betting') {
    // Reset processed cards tracking for new round
    processedCards.value.clear()
  }
  
  // Only reset round count when game is truly finished
  if (newPhase === 'finished') {
    countingStore.resetRound()
  }
})

async function addVisibleCardsToCount() {
  // Get dealer cards
  const dealerCards = gameStore.dealerHand
  
  // Get all player cards (multiplayer aware)
  let allPlayerCards = []
  if (gameStore.isMultiplayer) {
    // Count all players' cards
    for (const player of gameStore.players) {
      if (player.hands) {
        for (const hand of player.hands) {
          allPlayerCards.push(...hand.cards)
        }
      }
    }
  } else {
    // Single player - use playerHands
    const playerCards = gameStore.playerHands.flatMap(hand => hand.cards)
    allPlayerCards = playerCards
  }
  
  console.log(`=== COUNTING DEBUG ===`)
  console.log(`Game Phase: ${gameStore.gamePhase}`)
  console.log(`Dealer has ${dealerCards.length} cards total`)
  console.log(`Players have ${allPlayerCards.length} cards total`)
  
  // Process dealer cards
  for (let i = 0; i < dealerCards.length; i++) {
    const card = dealerCards[i]
    const cardId = card.id || `${card.suit}-${card.value}-${card.deck}-${i}`
    
    // In dealer/finished phase, count ALL dealer cards (hole card is revealed)
    const shouldCount = (gameStore.gamePhase === 'dealer' || gameStore.gamePhase === 'finished') || 
                       (!card.faceDown && card.faceDown !== true)
    
    console.log(`Dealer card ${i}: ${card.value}${getSuitSymbol(card.suit)}, faceDown: ${card.faceDown}, phase: ${gameStore.gamePhase}, shouldCount: ${shouldCount}`)
    
    if (shouldCount && !processedCards.value.has(cardId)) {
      const countValue = countingStore.addCard(card)
      processedCards.value.add(cardId)
      console.log(`✓ Added dealer card: ${card.value}${getSuitSymbol(card.suit)} (${countValue > 0 ? '+' : ''}${countValue}) - NEW COUNT: ${countingStore.runningCount}`)
    }
  }
  
  // Process player cards (always visible)
  for (const card of allPlayerCards) {
    const cardId = card.id || `${card.suit}-${card.value}-${card.deck}`
    
    if (!processedCards.value.has(cardId)) {
      const countValue = countingStore.addCard(card)
      processedCards.value.add(cardId)
      console.log(`✓ Added player card: ${card.value}${getSuitSymbol(card.suit)} (${countValue > 0 ? '+' : ''}${countValue}) - NEW COUNT: ${countingStore.runningCount}`)
    }
  }
  
  console.log(`Final running count: ${countingStore.runningCount}`)
  console.log(`True count: ${countingStore.trueCount}`)
  console.log(`=== END COUNTING DEBUG ===`)
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

function getCardValue(card) {
  if (['J', 'Q', 'K'].includes(card.value)) return 10
  if (card.value === 'A') return 11
  return parseInt(card.value)
}

function onCardClick(card, handIndex) {
  console.log(`Card clicked: ${card.value} of ${card.suit} in hand ${handIndex}`)
}

async function hit() {
  await gameStore.hit()
}

function stand() {
  gameStore.stand()
}

async function doubleDown() {
  await gameStore.doubleDown()
}

async function split() {
  await gameStore.split()
}

async function newShoe() {
  console.log('=== NEW SHOE CLICKED ===')
  // Use the new forceNewGame function which properly resets everything
  await gameStore.forceNewGame()
  processedCards.value.clear()
  console.log('New shoe started - fresh decks and reset count')
  console.log(`Running count after new shoe: ${countingStore.runningCount}`)
  console.log('=== END NEW SHOE ===')
}

function newGame() {
  console.log('=== NEW GAME CLICKED ===')
  
  // Check if player has enough money before starting new game
  if (playerStore.bankroll < 15) {
    console.log('Not enough money for new game - showing game over')
    showGameOver.value = true
    return
  }
  
  // Just reset and let them choose a new bet
  gameStore.resetGame()
  countingStore.resetRound()
  processedCards.value.clear()
  console.log(`Running count after new game: ${countingStore.runningCount}`)
  console.log('=== END NEW GAME ===')
}

function sameBet() {
  // First check if player can afford the same bet
  if (playerStore.bankroll < gameStore.lastBet) {
    // Can't afford last bet - check if they can afford minimum
    if (playerStore.bankroll < 15) {
      showGameOver.value = true
      return
    }
    // They have some money but not enough for last bet
    // Just start a new game and let them choose a new bet
    newGame()
    return
  }
  
  if (canUseSameBet.value) {
    gameStore.resetGame()
    countingStore.resetRound()
    processedCards.value.clear()
    // Small delay to ensure game is reset before placing bet
    setTimeout(() => {
      gameStore.placeBet(gameStore.lastBet)
    }, 50)
  }
}

function takeInsurance() {
  showInsurance.value = false
}

function declineInsurance() {
  showInsurance.value = false
}

function showHint() {
  console.log('Hint button clicked!')
  showHintModal.value = true
}

function handleNavTouch() {
  showBottomNav.value = !showBottomNav.value
}

function toggleMultiplayer() {
  if (gameStore.gamePhase !== 'betting' && gameStore.gamePhase !== 'finished') {
    alert('Can only toggle multiplayer between games')
    return
  }
  
  if (gameStore.isMultiplayer) {
    gameStore.disableMultiplayer()
  } else {
    // Add a default bot when enabling multiplayer
    gameStore.enableMultiplayer()
    gameStore.addPlayer(generateBotName(), 'bot', 1000)
  }
}
</script>

<style scoped>
.game-view {
  min-height: 100vh;
  background: linear-gradient(135deg, #0f4c75 0%, #1a5490 100%);
  padding: 8px;
  padding-bottom: 60px; /* Space for hidden nav */
}

.game-container {
  max-width: 390px;
  margin: 0 auto;
  position: relative;
}

/* Simplified Betting Screen */
.betting-screen {
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 16px);
}

.betting-header {
  padding: 24px 0;
  text-align: center;
}

.bankroll-display {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 20px;
  display: inline-block;
}

.bankroll-label {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 8px;
}

.bankroll-amount {
  font-size: 32px;
  font-weight: bold;
  color: #34a853;
}

.betting-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0 16px;
  margin-top: -40px; /* Pull content up */
  margin-bottom: 80px; /* Add space for bottom nav */
}

.bet-display {
  text-align: center;
  margin-bottom: 32px;
}

.bet-label {
  font-size: 18px;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 16px;
  font-weight: 500;
}

.bet-amount-display {
  display: flex;
  justify-content: center;
  align-items: baseline;
  font-size: 48px;
  font-weight: bold;
  color: #fff;
}

.currency {
  font-size: 36px;
  margin-right: 8px;
  color: rgba(255, 255, 255, 0.8);
}

.bet-controls {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 32px;
}

.quick-bets {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.bet-btn {
  padding: 16px;
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid transparent;
  color: white;
  font-size: 16px;
  font-weight: 600;
  transition: all 0.2s ease;
}

.bet-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.3);
}

.bet-btn.active {
  background: rgba(52, 168, 83, 0.2);
  border-color: #34a853;
  color: #34a853;
}

.bet-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.bet-adjusters {
  display: flex;
  gap: 16px;
  justify-content: center;
}

.btn-adjuster {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  font-size: 28px;
  font-weight: bold;
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.2);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-adjuster:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.4);
}

.btn-adjuster:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.deal-btn {
  padding: 20px 32px;
  font-size: 20px;
  font-weight: bold;
  background: linear-gradient(145deg, #34a853 0%, #2d8659 100%);
  color: white;
  border: none;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(52, 168, 83, 0.3);
  transition: all 0.2s ease;
}

.deal-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(52, 168, 83, 0.4);
}

.deal-btn:active {
  transform: translateY(0);
}

.deal-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: linear-gradient(145deg, #666 0%, #888 100%);
  box-shadow: none;
}



/* Game Over Modal */
.game-over-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 3000;
}

.modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
}

.modal-content {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: linear-gradient(135deg, #1a5490 0%, #0f4c75 100%);
  border-radius: 16px;
  max-width: 400px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
}

.game-over-header {
  text-align: center;
  padding: 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.game-over-header h2 {
  color: white;
  margin: 0;
  font-size: 28px;
}

.game-over-body {
  padding: 24px;
  text-align: center;
}

.game-over-body p {
  color: rgba(255, 255, 255, 0.9);
  margin: 0 0 12px 0;
  font-size: 16px;
}

.current-bankroll {
  font-size: 18px;
  font-weight: bold;
  color: #f44336;
  margin-bottom: 24px !important;
}

.restart-options {
  margin-top: 24px;
}

.restart-options h3 {
  color: white;
  margin: 0 0 16px 0;
  font-size: 18px;
}

.quick-restart-buttons {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}

.restart-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.restart-btn:hover {
  background: rgba(52, 168, 83, 0.3);
  border-color: #34a853;
  transform: translateY(-2px);
}

.restart-btn .amount {
  font-size: 20px;
  font-weight: bold;
  color: white;
}

.restart-btn .label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
}

.custom-restart {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 20px;
}

.custom-restart label {
  display: block;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 12px;
  font-size: 14px;
}

.custom-input-group {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  overflow: hidden;
}

.currency-symbol {
  padding: 12px 8px 12px 12px;
  color: rgba(255, 255, 255, 0.7);
  font-weight: bold;
}

.custom-input {
  flex: 1;
  padding: 12px 8px;
  border: none;
  background: transparent;
  color: white;
  font-size: 16px;
  outline: none;
}

.custom-input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.game-over-footer {
  padding: 0 24px 24px;
  text-align: center;
}

/* Low bankroll indicator */
.low-bankroll {
  color: #f44336 !important;
  animation: pulse-red 2s ease-in-out infinite;
}

@keyframes pulse-red {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

/* Compact Header */
.compact-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  padding: 8px;
}

.bankroll {
  font-size: 24px;
  font-weight: bold;
  color: #34a853;
}

.header-buttons {
  display: flex;
  gap: 8px;
  align-items: center;
}

.multiplayer-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.multiplayer-btn.active {
  background: rgba(52, 168, 83, 0.3);
  border-color: #34a853;
}

.multiplayer-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.new-shoe-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.new-shoe-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: rotate(180deg);
}

/* Compact Game Message */
.game-message {
  text-align: center;
  padding: 6px 12px;
  margin: 6px 0;
  border-radius: 6px;
  font-weight: 600;
  font-size: 14px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.current-player-indicator {
  font-weight: bold;
  color: #34a853;
}

.message-win {
  background: rgba(52, 168, 83, 0.2);
  color: #34a853;
  border: 1px solid rgba(52, 168, 83, 0.3);
}

.message-lose {
  background: rgba(244, 67, 54, 0.2);
  color: #f44336;
  border: 1px solid rgba(244, 67, 54, 0.3);
}

.message-bust {
  background: rgba(244, 67, 54, 0.3);
  color: #ff5722;
  border: 1px solid rgba(244, 67, 54, 0.5);
  animation: pulse 1s ease-in-out;
}

.player-hands-container {
  margin: 8px 0;
}

.split-hands {
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
}

.split-hands .player-hand {
  flex: 1;
  max-width: 180px;
}

.viewing-player-indicator {
  text-align: center;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
  background: rgba(33, 150, 243, 0.2);
  padding: 4px 8px;
  border-radius: 12px;
  margin-bottom: 8px;
  display: inline-block;
  width: 100%;
}

.no-hands-message {
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
  padding: 40px;
  font-style: italic;
}

/* Net Result Display */
.net-result {
  text-align: center;
  margin: 8px 0;
  padding: 8px 16px;
  border-radius: 20px;
  display: inline-block;
  width: 100%;
  font-weight: bold;
  font-size: 16px;
}

.net-label {
  color: rgba(255, 255, 255, 0.8);
  margin-right: 8px;
}

.net-amount {
  font-size: 18px;
}

.net-win {
  background: rgba(52, 168, 83, 0.2);
  border: 1px solid rgba(52, 168, 83, 0.4);
}

.net-win .net-amount {
  color: #34a853;
}

.net-loss {
  background: rgba(244, 67, 54, 0.2);
  border: 1px solid rgba(244, 67, 54, 0.4);
}

.net-loss .net-amount {
  color: #f44336;
}

.net-push {
  background: rgba(255, 152, 0, 0.2);
  border: 1px solid rgba(255, 152, 0, 0.4);
}

.net-push .net-amount {
  color: #ff9800;
}

/* Compact Action Buttons */
.action-buttons {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(2, 1fr);
  gap: 6px;
  margin: 8px 0;
  max-width: 360px;
  margin-left: auto;
  margin-right: auto;
}

.btn {
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
  font-size: 14px;
  padding: 10px 8px;
  min-height: 44px; /* Ensure consistent height */
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-action {
  font-weight: 600;
  color: white;
}

/* Position buttons in consistent grid spots */
.btn-hit {
  grid-column: 1;
  grid-row: 1;
  background: linear-gradient(145deg, #2196f3 0%, #1976d2 100%);
}

.btn-stand {
  grid-column: 2;
  grid-row: 1;
  background: linear-gradient(145deg, #ff9800 0%, #f57c00 100%);
}

.btn-double {
  grid-column: 3;
  grid-row: 1;
  background: linear-gradient(145deg, #2196f3 0%, #1976d2 100%);
}

.btn-hint {
  grid-column: 1;
  grid-row: 2;
  background: linear-gradient(145deg, #9c27b0 0%, #7b1fa2 100%);
}

.btn-split {
  grid-column: 2;
  grid-row: 2;
  background: linear-gradient(145deg, #9c27b0 0%, #7b1fa2 100%);
}

.btn-spacer {
  grid-column: 1;
  grid-row: 2;
  /* Empty space when hints are disabled */
}

/* Make buttons invisible but keep space when not available */
.btn-invisible {
  visibility: hidden;
}

.btn-secondary {
  background: linear-gradient(145deg, #ff9800 0%, #f57c00 100%);
  color: white;
}

.btn-primary {
  background: linear-gradient(145deg, #34a853 0%, #2d8659 100%);
  color: white;
}

.new-game-section {
  text-align: center;
  margin: 12px 0;
}

.game-buttons {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.btn-same-bet {
  flex: 1;
  padding: 12px 16px;
  font-size: 14px;
  font-weight: bold;
  background: linear-gradient(145deg, #34a853 0%, #2d8659 100%);
  border-radius: 8px;
  color: white;
}

.btn-new-game {
  flex: 1;
  padding: 12px 16px;
  font-size: 14px;
  font-weight: bold;
  border-radius: 8px;
  background: linear-gradient(145deg, #666 0%, #555 100%);
  color: white;
}

.btn-same-bet:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: linear-gradient(145deg, #666 0%, #888 100%);
}

/* Hidden Bottom Navigation */
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(135deg, #1a5490 0%, #0f4c75 100%);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 8px 0;
  transform: translateY(100%);
  transition: transform 0.3s ease;
  z-index: 1000;
  backdrop-filter: blur(10px);
}

.bottom-nav.nav-visible {
  transform: translateY(0);
}

.nav-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 8px;
  transition: all 0.2s ease;
  min-width: 60px;
}

.nav-btn:hover,
.nav-btn.active {
  color: white;
  background: rgba(255, 255, 255, 0.1);
}

.nav-icon {
  font-size: 18px;
  margin-bottom: 2px;
}

.nav-label {
  font-size: 10px;
  font-weight: 500;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

@media (max-width: 390px) {
  .game-view {
    padding: 6px;
  }
  
  .action-buttons {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .btn {
    font-size: 12px;
    padding: 6px 8px;
  }
}
</style>