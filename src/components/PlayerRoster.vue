<template>
  <div class="roster-section" v-if="showRoster">
    <div class="roster-header" @click="toggleRoster">
      <div class="roster-title">
        🎮 Players 
        <span class="player-count">
          {{ getCurrentPlayerPosition() }}/{{ gameStore.activePlayerCount }}
        </span>
      </div>
      <div class="header-buttons">
        <button 
          v-if="canManageSeats && rosterExpanded"
          @click.stop="showSeatManager = !showSeatManager"
          class="manage-seats-btn"
          :class="{ active: showSeatManager }"
        >
          🪑
        </button>
        <button class="roster-toggle">
          {{ rosterExpanded ? 'Hide' : 'Show' }}
        </button>
      </div>
    </div>
    
    <div class="roster-content" :class="{ expanded: rosterExpanded }">
      <!-- Seat Manager -->
      <div v-if="showSeatManager" class="seat-manager">
        <div class="seat-manager-header">
          <h4>Drag to Rearrange Seats</h4>
          <button @click="resetSeats" class="reset-seats-btn">Reset</button>
        </div>
        
        <transition-group name="seat-list" tag="div" class="seat-list">
          <div 
            v-for="(player, index) in sortedPlayers"
            :key="player.id"
            class="seat-item"
            :class="{ dragging: draggedPlayer?.id === player.id }"
            draggable="true"
            @dragstart="startDrag(player, $event)"
            @dragend="endDrag"
            @dragover.prevent
            @drop="handleDrop(player, $event)"
            @dragenter="handleDragEnter(player)"
          >
            <div class="seat-handle">☰</div>
            <div class="seat-number-display">{{ index + 1 }}</div>
            <div class="seat-player-info">
              <span class="seat-player-name">{{ player.name }} {{ player.avatar }}</span>
              <span class="seat-player-type">{{ player.isMainPlayer ? '(You)' : player.type }}</span>
            </div>
            <div class="seat-arrows">
              <button 
                @click="movePlayerUp(index)"
                :disabled="index === 0"
                class="arrow-btn"
              >
                ▲
              </button>
              <button 
                @click="movePlayerDown(index)"
                :disabled="index === sortedPlayers.length - 1"
                class="arrow-btn"
              >
                ▼
              </button>
            </div>
          </div>
        </transition-group>
      </div>
      
      <!-- Regular Player List -->
      <div class="roster-list" v-show="!showSeatManager">
        <!-- Players List -->
        <div 
          v-for="player in gameStore.players"
          :key="player.id"
          class="player-row"
          :class="{
            active: isCurrentPlayer(player),
            waiting: player.status === 'waiting',
            done: player.status === 'done' || player.status === 'busted',
            clickable: true,
            viewing: isActiveView(player)
          }"
          @click="handlePlayerClick(player)"
        >
          <div class="seat-number">
            {{ player.seatNumber }}
          </div>
          <div class="player-info">
            <div class="player-name">
              {{ player.name }} {{ player.avatar }}
              <span v-if="isCurrentPlayer(player)">⭐</span>
            </div>
            <div class="player-cards" v-if="player.hands.length > 0">
              {{ formatPlayerCards(player.hands[0]) }}
            </div>
          </div>
          <div class="player-stats">
            <div class="hand-total" :class="getHandTotalClass(player)">
              {{ getHandTotalText(player) }}
            </div>
            <div class="bet-amount" v-if="player.hands.length > 0 && player.hands[0].bet">
              ${{ player.hands[0].bet }}
            </div>
            <div class="player-actions">
              <div class="player-status">
                {{ getStatusIcon(player.status) }}
              </div>
              <!-- Win/Loss Result Indicator -->
              <div v-if="gameStore.gamePhase === 'finished' && player.hands.length > 0" 
                   class="result-indicator"
                   :class="getResultClass(player)">
                {{ getResultText(player) }}
              </div>
              <button 
                v-if="canTogglePlayerType(player)"
                @click.stop="togglePlayerType(player)"
                class="toggle-type-btn"
                :title="`Switch to ${player.type === 'bot' ? 'Human' : 'Bot'} control`"
              >
                {{ player.type === 'bot' ? '👤' : '🤖' }}
              </button>
              <button 
                v-if="canRemovePlayer(player)"
                @click.stop="confirmRemovePlayer(player)"
                class="remove-player-btn"
                title="Remove Player"
              >
                ❌
              </button>
            </div>
          </div>
        </div>

        <!-- Add Player Buttons -->
        <div v-if="canAddPlayers" class="add-player-section">
          <div class="empty-seat" @click="showAddPlayerDialog = true">
            + Add Player or Bot
          </div>
        </div>
      </div>
    </div>

    <!-- Add Player Dialog -->
    <div v-if="showAddPlayerDialog" class="add-player-dialog">
      <div class="dialog-overlay" @click="showAddPlayerDialog = false"></div>
      <div class="dialog-content">
        <h3>Add Player</h3>
        <div class="dialog-form">
          <div class="form-group">
            <label>Player Type</label>
            <div class="player-type-buttons">
              <button 
                @click="newPlayerType = 'human'"
                :class="{ active: newPlayerType === 'human' }"
                class="type-btn"
              >
                👤 Human
              </button>
              <button 
                @click="newPlayerType = 'bot'"
                :class="{ active: newPlayerType === 'bot' }"
                class="type-btn"
              >
                🤖 Bot
              </button>
            </div>
          </div>
          
          <div class="form-group">
            <label>Name</label>
            <input 
              v-model="newPlayerName"
              type="text" 
              placeholder="Enter player name"
              class="name-input"
            >
          </div>
          
          <div class="form-group">
            <label>Seat Position (1-7)</label>
            <select v-model.number="newPlayerSeat" class="seat-select">
              <option :value="null">Auto-assign</option>
              <option v-for="seat in getAvailableSeatsForNew()" :key="seat" :value="seat">
                Seat {{ seat }}
              </option>
            </select>
          </div>
          
          <div class="dialog-buttons">
            <button @click="addNewPlayer" class="btn btn-primary">
              Add Player
            </button>
            <button @click="showAddPlayerDialog = false" class="btn btn-secondary">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch } from 'vue'
import { useGameStore } from '../stores/gameStore'
import { usePlayerStore } from '../stores/playerStore'
import { calculateHandValue } from '../utils/gameRules'
import { generateBotName } from '../utils/botStrategy'

const gameStore = useGameStore()
const playerStore = usePlayerStore()

const rosterExpanded = ref(false)
const showAddPlayerDialog = ref(false)
const newPlayerName = ref('')
const newPlayerType = ref('bot')
const newPlayerSeat = ref(null)
const showSeatManager = ref(false)
const draggedPlayer = ref(null)
const dragOverPlayer = ref(null)

const sortedPlayers = computed(() => {
  return [...gameStore.players].sort((a, b) => a.seatNumber - b.seatNumber)
})

// Watch for game phase changes to close seat manager
watch(() => gameStore.gamePhase, (newPhase, oldPhase) => {
  // If game is starting (moving from betting to dealing), close seat manager
  if (oldPhase === 'betting' && newPhase === 'dealing') {
    showSeatManager.value = false
  }
})

const canManageSeats = computed(() => {
  return (gameStore.gamePhase === 'betting' || gameStore.gamePhase === 'finished') &&
         gameStore.players.length > 1
})

function getAvailableSeatsForNew() {
  const occupied = gameStore.players.map(p => p.seatNumber)
  const available = []
  for (let i = 1; i <= 7; i++) {
    if (!occupied.includes(i)) {
      available.push(i)
    }
  }
  return available
}

// Drag and drop functions
function startDrag(player, event) {
  draggedPlayer.value = player
  event.dataTransfer.effectAllowed = 'move'
  event.target.classList.add('dragging')
}

function endDrag(event) {
  event.target.classList.remove('dragging')
  draggedPlayer.value = null
  dragOverPlayer.value = null
}

function handleDragEnter(player) {
  dragOverPlayer.value = player
}

function handleDrop(targetPlayer, event) {
  event.preventDefault()
  
  if (!draggedPlayer.value || draggedPlayer.value.id === targetPlayer.id) {
    return
  }
  
  // Use the swap function
  gameStore.swapPlayerSeats(draggedPlayer.value.id, targetPlayer.id)
  
  draggedPlayer.value = null
  dragOverPlayer.value = null
}

// Arrow button functions
function movePlayerUp(index) {
  if (index === 0) return
  
  const players = sortedPlayers.value
  const currentPlayer = players[index]
  const prevPlayer = players[index - 1]
  
  // Use swap function
  gameStore.swapPlayerSeats(currentPlayer.id, prevPlayer.id)
}

function movePlayerDown(index) {
  if (index >= sortedPlayers.value.length - 1) return
  
  const players = sortedPlayers.value
  const currentPlayer = players[index]
  const nextPlayer = players[index + 1]
  
  // Use swap function
  gameStore.swapPlayerSeats(currentPlayer.id, nextPlayer.id)
}

function resetSeats() {
  // Reset to sequential order
  sortedPlayers.value.forEach((player, index) => {
    gameStore.changePlayerSeat(player.id, index + 1)
  })
}

const showRoster = computed(() => {
  return gameStore.players.length >= 1 // Always show if we have players
})

const canAddPlayers = computed(() => {
  return gameStore.players.length < gameStore.maxPlayers && 
         (gameStore.gamePhase === 'betting' || gameStore.gamePhase === 'finished')
})

const canRemovePlayer = computed(() => (player) => {
  // Can remove if game hasn't started (betting phase) or finished, and more than 1 player
  return (gameStore.gamePhase === 'betting' || gameStore.gamePhase === 'finished') && 
         gameStore.players.length > 1 &&
         !player.isMainPlayer
})

const canTogglePlayerType = computed(() => (player) => {
  // Can toggle type anytime, but not for main player
  // If it's their turn and we toggle to human, they can play immediately
  // If we toggle to bot during their turn, bot will take over
  return !player.isMainPlayer
})

function toggleRoster() {
  rosterExpanded.value = !rosterExpanded.value
  if (!rosterExpanded.value) {
    showSeatManager.value = false
  }
}

function handlePlayerClick(player) {
  // Always switch view to clicked player
  viewPlayerCards(player)
}

function confirmRemovePlayer(player) {
  if (confirm(`Remove ${player.name} from the game?`)) {
    gameStore.removePlayer(player.id)
    
    // Disable multiplayer if only main player left
    if (gameStore.players.length <= 1) {
      gameStore.disableMultiplayer()
    }
  }
}

function getCurrentPlayerPosition() {
  if (gameStore.gamePhase !== 'playing' || !gameStore.currentPlayer) {
    return gameStore.activePlayerCount
  }
  // Find the position of the current player (1-based)
  return gameStore.currentPlayerIndex + 1
}

function isCurrentPlayer(player) {
  return gameStore.currentPlayer?.id === player.id && gameStore.gamePhase === 'playing'
}

function formatPlayerCards(hand) {
  if (!hand || !hand.cards) return ''
  return hand.cards
    .filter(card => !card.faceDown)
    .map(card => `${card.value}${getSuitSymbol(card.suit)}`)
    .join(' ')
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

function getHandValue(hand) {
  if (!hand || !hand.cards) return { total: 0, soft: false }
  return calculateHandValue(hand.cards)
}

function getHandTotalText(player) {
  if (!player.hands.length) return '-'
  
  const hand = player.hands[0]
  const handValue = getHandValue(hand)
  
  if (hand.outcome === 'blackjack') return 'BJ!'
  if (handValue.busted) return 'BUST'
  if (player.status === 'blackjack') return 'BJ!'
  
  return handValue.total.toString()
}

function getHandTotalClass(player) {
  if (!player.hands.length) return ''
  
  const hand = player.hands[0]
  const handValue = getHandValue(hand)
  
  if (hand.outcome === 'blackjack' || player.status === 'blackjack') return 'blackjack'
  if (handValue.busted || player.status === 'busted') return 'bust'
  if (handValue.total >= 17) return 'good'
  return ''
}

function getStatusIcon(status) {
  const icons = {
    waiting: '⏳',
    playing: '🎯',
    done: '✅',
    busted: '💥',  // Changed from ❌ to avoid confusion
    blackjack: '🎉',
    folded: '🏳️'
  }
  return icons[status] || '⏳'
}

// Get result text and class for win/loss indicator
function getResultText(player) {
  if (!player.hands || !player.hands[0]) return ''
  const outcome = player.hands[0].outcome
  
  const results = {
    'win': 'WIN',
    'lose': 'LOSE',
    'push': 'PUSH',
    'blackjack': 'BJ WIN'
  }
  return results[outcome] || ''
}

function getResultClass(player) {
  if (!player.hands || !player.hands[0]) return ''
  const outcome = player.hands[0].outcome
  return `result-${outcome}`
}

function isActiveView(player) {
  return gameStore.activeViewPlayerId === player.id
}

function viewPlayerCards(player) {
  // Switch the main view to show this player's cards
  console.log(`Switching view to player: ${player.name} (${player.id})`)
  console.log(`Player hands:`, player.hands)
  gameStore.setActiveViewPlayer(player.id)
  
  // Force a small delay to ensure reactivity
  nextTick(() => {
    console.log(`View should now show player: ${gameStore.activeViewPlayerId}`)
  })
}

function togglePlayerType(player) {
  if (!canTogglePlayerType.value(player)) return
  
  // Toggle between bot and human
  const wasBot = player.type === 'bot'
  player.type = wasBot ? 'human' : 'bot'
  
  // Update avatar
  player.avatar = player.type === 'bot' ? '🤖' : '👤'
  
  // If we're switching TO bot control and it's currently this player's turn
  if (!wasBot && gameStore.currentPlayer?.id === player.id && gameStore.gamePhase === 'playing') {
    console.log(`${player.name} switched to bot control - bot will take over`)
    
    // Switch view to this player so we can see the bot play
    gameStore.setActiveViewPlayer(player.id)
    
    // Give a brief delay then let the bot play
    setTimeout(() => {
      if (gameStore.currentPlayer?.id === player.id) {
        gameStore.playBotTurn(player)
      }
    }, 500)
  }
  
  // If we're switching TO human control and it's their turn
  if (wasBot && gameStore.currentPlayer?.id === player.id && gameStore.gamePhase === 'playing') {
    console.log(`${player.name} switched to human control - waiting for input`)
    // Switch view to this player
    gameStore.setActiveViewPlayer(player.id)
    gameStore.message = `${player.name}'s turn (now human controlled)`
  }
  
  // Save the state
  gameStore.saveCurrentGameState()
  
  console.log(`${player.name} is now ${player.type} controlled`)
}

function addNewPlayer() {
  const name = newPlayerName.value.trim() || 
               (newPlayerType.value === 'bot' ? generateBotName() : 'Player')
  
  const success = gameStore.addPlayer(
    name,
    newPlayerType.value,
    1000, // Default bankroll for new players
    newPlayerSeat.value // Preferred seat
  )
  
  if (success) {
    // Reset form
    newPlayerName.value = ''
    newPlayerType.value = 'bot'
    newPlayerSeat.value = null
    showAddPlayerDialog.value = false
    
    // Enable multiplayer if not already enabled
    if (!gameStore.isMultiplayer) {
      gameStore.enableMultiplayer()
    }
  }
}
</script>

<style scoped>
.roster-section {
  margin: 16px 0;
}

.roster-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px 12px 0 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
}

.header-buttons {
  display: flex;
  gap: 8px;
  align-items: center;
}

.manage-seats-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.manage-seats-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.manage-seats-btn.active {
  background: rgba(156, 39, 176, 0.3);
  border-color: #9c27b0;
}

/* Seat Manager Styles */
.seat-manager {
  padding: 16px;
  background: rgba(0, 0, 0, 0.1);
  border-bottom: 2px solid rgba(255, 255, 255, 0.1);
}

.seat-manager-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.seat-manager-header h4 {
  margin: 0;
  color: white;
  font-size: 14px;
}

.reset-seats-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}

.seat-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.seat-item {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 8px 12px;
  cursor: move;
  transition: all 0.3s ease;
}

.seat-item:hover {
  background: rgba(255, 255, 255, 0.15);
}

.seat-item.dragging {
  opacity: 0.5;
  transform: scale(0.95);
}

.seat-handle {
  color: rgba(255, 255, 255, 0.5);
  font-size: 14px;
  cursor: grab;
}

.seat-handle:active {
  cursor: grabbing;
}

.seat-number-display {
  width: 28px;
  height: 28px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 14px;
}

.seat-player-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.seat-player-name {
  font-size: 14px;
  font-weight: 500;
}

.seat-player-type {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
}

.seat-arrows {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.arrow-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  width: 24px;
  height: 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.arrow-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.2);
}

.arrow-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

/* Smooth transitions for seat changes */
.seat-list-move {
  transition: transform 0.3s ease;
}

.seat-list-enter-active,
.seat-list-leave-active {
  transition: all 0.3s ease;
}

.seat-list-enter-from,
.seat-list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

.roster-title {
  font-weight: 600;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.player-count {
  background: rgba(52, 168, 83, 0.2);
  color: #34a853;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
}

.roster-toggle {
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.roster-toggle:hover {
  background: rgba(255, 255, 255, 0.1);
}

.roster-content {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 0 0 12px 12px;
  max-height: 0;
  overflow: hidden;
  transition: all 0.3s ease;
}

.roster-content.expanded {
  max-height: 400px;
  overflow-y: auto;
}

.roster-list {
  padding: 0;
}

.player-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  cursor: pointer;
  transition: all 0.2s ease;
}

.player-row.clickable {
  cursor: pointer;
}

.player-row.clickable:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateX(2px);
}

.player-row.viewing {
  background: rgba(33, 150, 243, 0.15);
  border-left: 3px solid #2196f3;
}

.seat-number {
  width: 24px;
  height: 24px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 12px;
  margin-right: 8px;
  flex-shrink: 0;
}

.player-row:hover {
  background: rgba(255, 255, 255, 0.05);
}

.player-row:last-child {
  border-bottom: none;
}

.player-row.active {
  background: rgba(52, 168, 83, 0.15);
  border-left: 3px solid #34a853;
}

.player-row.waiting {
  opacity: 0.7;
}

.player-row.done {
  opacity: 0.6;
}

.player-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.player-name {
  font-weight: 500;
  font-size: 13px;
  color: white;
}

.player-cards {
  font-family: 'Courier New', monospace;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.8);
  background: rgba(0, 0, 0, 0.2);
  padding: 2px 6px;
  border-radius: 4px;
  display: inline-block;
  min-width: 50px;
  text-align: center;
}

.player-stats {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
}

.player-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* Result indicator styles */
.result-indicator {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: bold;
  text-transform: uppercase;
}

.result-win,
.result-blackjack {
  background: rgba(52, 168, 83, 0.3);
  color: #34a853;
  border: 1px solid rgba(52, 168, 83, 0.5);
}

.result-lose {
  background: rgba(244, 67, 54, 0.3);
  color: #f44336;
  border: 1px solid rgba(244, 67, 54, 0.5);
}

.result-push {
  background: rgba(255, 152, 0, 0.3);
  color: #ff9800;
  border: 1px solid rgba(255, 152, 0, 0.5);
}

.toggle-type-btn {
  background: rgba(156, 39, 176, 0.2);
  border: 1px solid rgba(156, 39, 176, 0.3);
  cursor: pointer;
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.toggle-type-btn:hover {
  background: rgba(156, 39, 176, 0.3);
  transform: scale(1.1);
}

.remove-player-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 10px;
  opacity: 0.6;
  transition: all 0.2s ease;
  padding: 2px;
  border-radius: 50%;
}

.remove-player-btn:hover {
  opacity: 1;
  background: rgba(244, 67, 54, 0.2);
}

.hand-total {
  font-weight: bold;
  min-width: 30px;
  text-align: center;
  color: white;
}

.hand-total.good { color: #34a853; }
.hand-total.bust { color: #f44336; }
.hand-total.blackjack { color: #ff9800; }

.bet-amount {
  background: rgba(0, 0, 0, 0.3);
  padding: 1px 5px;
  border-radius: 6px;
  font-size: 10px;
  min-width: 25px;
  text-align: center;
  color: white;
}

.player-status {
  font-size: 14px;
}

.empty-seat {
  color: rgba(255, 255, 255, 0.5);
  font-style: italic;
  border: 1px dashed rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  margin: 8px 16px;
  padding: 12px;
  text-align: center;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.empty-seat:hover {
  border-color: rgba(255, 255, 255, 0.4);
  background: rgba(255, 255, 255, 0.05);
}

/* Add Player Dialog */
.add-player-dialog {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.dialog-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
}

.dialog-content {
  background: linear-gradient(135deg, #1a5490 0%, #0f4c75 100%);
  border-radius: 16px;
  padding: 20px;
  width: 100%;
  max-width: 320px;
  position: relative;
  z-index: 1;
}

.dialog-content h3 {
  margin: 0 0 16px 0;
  color: white;
  text-align: center;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  color: white;
  font-weight: 600;
  margin-bottom: 8px;
  font-size: 14px;
}

.player-type-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.type-btn {
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
}

.type-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.type-btn.active {
  background: #34a853;
  border-color: #34a853;
}

.name-input,
.difficulty-select,
.seat-select {
  width: 100%;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 16px;
}

.name-input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.difficulty-select option,
.seat-select option {
  background: #1a5490;
  color: white;
}

.dialog-buttons {
  display: flex;
  gap: 8px;
  margin-top: 20px;
}

.btn {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary {
  background: #34a853;
  color: white;
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

@media (max-width: 480px) {
  .player-row {
    padding: 6px 12px;
  }
  
  .player-stats {
    flex-direction: column;
    align-items: flex-end;
  }
}
</style>