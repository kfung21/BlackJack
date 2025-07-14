<template>
    <div class="roster-section" v-if="showRoster">
      <div class="roster-header" @click="toggleRoster">
        <div class="roster-title">
          🎮 Players 
          <span class="player-count">{{ gameStore.activePlayerCount }}/{{ gameStore.maxPlayers }}</span>
        </div>
        <button class="roster-toggle">
          {{ rosterExpanded ? 'Hide' : 'Show' }}
        </button>
      </div>
      
      <div class="roster-content" :class="{ expanded: rosterExpanded }">
        <div class="roster-list">
          <!-- Players List -->
          <div 
            v-for="player in gameStore.players"
            :key="player.id"
            class="player-row"
            :class="{
              active: isCurrentPlayer(player),
              waiting: player.status === 'waiting',
              done: player.status === 'done' || player.status === 'busted'
            }"
            @click="expandPlayer(player)"
          >
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
              <div class="bet-amount" v-if="player.hands.length > 0">
                ${{ player.hands[0].bet || 0 }}
              </div>
              <div class="player-actions">
                <div class="player-status">
                  {{ getStatusIcon(player.status) }}
                </div>
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
  
          <!-- Expanded Player Details -->
          <div v-if="expandedPlayer" class="expanded-player">
            <div class="expanded-header">
              <strong>{{ expandedPlayer.name }}'s Hand</strong>
              <button @click="expandedPlayer = null" class="close-expanded">✕</button>
            </div>
            
            <div class="expanded-cards" v-if="expandedPlayer.hands.length > 0">
              <CardComponent
                v-for="(card, index) in expandedPlayer.hands[0].cards"
                :key="`${card.id}-${index}`"
                :card="card"
                size="small"
              />
            </div>
            
            <div class="expanded-info">
              <div class="expanded-total">
                Total: {{ getHandValue(expandedPlayer.hands[0]).total }}
                <span v-if="getHandValue(expandedPlayer.hands[0]).soft"> (soft)</span>
              </div>
              <div class="expanded-bet">Bet: ${{ expandedPlayer.hands[0].bet || 0 }}</div>
            </div>
            
            <div class="expanded-actions" v-if="canControlPlayer(expandedPlayer)">
              <button 
                @click="takePlayerAction(expandedPlayer, 'hit')"
                :disabled="!canPlayerHit(expandedPlayer)"
                class="mini-btn hit"
              >
                Hit for {{ expandedPlayer.name }}
              </button>
              <button 
                @click="takePlayerAction(expandedPlayer, 'stand')"
                :disabled="!canPlayerStand(expandedPlayer)"
                class="mini-btn stand"
              >
                Stand for {{ expandedPlayer.name }}
              </button>
              <button 
                v-if="expandedPlayer.type === 'bot'"
                @click="takeControl(expandedPlayer)"
                class="mini-btn take-over"
              >
                Take Control
              </button>
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
            
            <div class="form-group" v-if="newPlayerType === 'bot'">
              <label>Bot Difficulty</label>
              <select v-model="newBotDifficulty" class="difficulty-select">
                <option value="easy">Easy - Makes mistakes</option>
                <option value="medium">Medium - Basic strategy</option>
                <option value="hard">Hard - Perfect play</option>
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
  import { ref, computed } from 'vue'
  import { useGameStore } from '../stores/gameStore'
  import { usePlayerStore } from '../stores/playerStore'
  import { calculateHandValue } from '../utils/gameRules'
  import CardComponent from './CardComponent.vue'
  
  const gameStore = useGameStore()
  const playerStore = usePlayerStore()
  
  const rosterExpanded = ref(false)
  const expandedPlayer = ref(null)
  const showAddPlayerDialog = ref(false)
  const newPlayerName = ref('')
  const newPlayerType = ref('human')
  const newBotDifficulty = ref('medium')
  
  const showRoster = computed(() => {
    return gameStore.isMultiplayer && gameStore.players.length > 1
  })
  
  const canAddPlayers = computed(() => {
    return gameStore.players.length < gameStore.maxPlayers && 
           gameStore.gamePhase === 'betting'
  })
  
  const canRemovePlayer = computed(() => (player) => {
    // Can remove if game hasn't started (betting phase) and more than 1 player
    return gameStore.gamePhase === 'betting' && gameStore.players.length > 1
  })
  
  function toggleRoster() {
    rosterExpanded.value = !rosterExpanded.value
    if (!rosterExpanded.value) {
      expandedPlayer.value = null
    }
  }
  
  function expandPlayer(player) {
    if (expandedPlayer.value?.id === player.id) {
      expandedPlayer.value = null
    } else {
      expandedPlayer.value = player
    }
  }
  
  function confirmRemovePlayer(player) {
    if (confirm(`Remove ${player.name} from the game?`)) {
      gameStore.removePlayer(player.id)
      
      // Close expanded view if this player was expanded
      if (expandedPlayer.value?.id === player.id) {
        expandedPlayer.value = null
      }
      
      // Disable multiplayer if only one player remains
      if (gameStore.players.length <= 1) {
        gameStore.disableMultiplayer()
      }
    }
  }
  
  function isCurrentPlayer(player) {
    return gameStore.currentPlayer?.id === player.id
  }
  
  function formatPlayerCards(hand) {
    if (!hand || !hand.cards) return ''
    return hand.cards
      .filter(card => !card.faceDown)
      .map(card => `${card.value}${card.suit.charAt(0).toUpperCase()}`)
      .join(' ')
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
      busted: '❌',
      blackjack: '🎉'
    }
    return icons[status] || '⏳'
  }
  
  function canControlPlayer(player) {
    return gameStore.gamePhase === 'playing' && 
           player.status === 'playing' &&
           player.hands.length > 0 &&
           !player.hands[0].isComplete
  }
  
  function canPlayerHit(player) {
    if (!player.hands.length) return false
    const handValue = getHandValue(player.hands[0])
    return !handValue.busted && !player.hands[0].isComplete
  }
  
  function canPlayerStand(player) {
    if (!player.hands.length) return false
    return !player.hands[0].isComplete
  }
  
  async function takePlayerAction(player, action) {
    if (!canControlPlayer(player)) return
    
    // Temporarily set the current player to perform the action
    const originalIndex = gameStore.currentPlayerIndex
    const playerIndex = gameStore.players.findIndex(p => p.id === player.id)
    
    if (playerIndex !== -1) {
      gameStore.currentPlayerIndex = playerIndex
      
      try {
        if (action === 'hit') {
          await gameStore.hit()
        } else if (action === 'stand') {
          gameStore.stand()
        }
      } finally {
        // Restore original current player if still valid
        if (originalIndex < gameStore.players.length) {
          gameStore.currentPlayerIndex = originalIndex
        }
      }
    }
  }
  
  function takeControl(player) {
    // Convert bot to human control
    player.type = 'human'
    expandedPlayer.value = null
  }
  
  function addNewPlayer() {
    if (!newPlayerName.value.trim()) return
    
    const success = gameStore.addPlayer(
      newPlayerName.value.trim(),
      newPlayerType.value,
      1000 // Default bankroll for new players
    )
    
    if (success) {
      // Reset form
      newPlayerName.value = ''
      newPlayerType.value = 'human'
      newBotDifficulty.value = 'medium'
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
  
  .expanded-player {
    background: rgba(33, 150, 243, 0.1);
    border: 1px solid rgba(33, 150, 243, 0.3);
    margin: 4px 16px;
    border-radius: 8px;
    padding: 12px;
  }
  
  .expanded-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }
  
  .close-expanded {
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.7);
    cursor: pointer;
    font-size: 16px;
    padding: 4px;
  }
  
  .expanded-cards {
    display: flex;
    gap: 4px;
    margin: 8px 0;
    justify-content: center;
  }
  
  .expanded-info {
    text-align: center;
    margin: 8px 0;
    font-size: 14px;
  }
  
  .expanded-total {
    font-weight: bold;
    color: #34a853;
  }
  
  .expanded-bet {
    color: rgba(255, 255, 255, 0.8);
    font-size: 12px;
  }
  
  .expanded-actions {
    display: flex;
    gap: 6px;
    margin-top: 8px;
    justify-content: center;
    flex-wrap: wrap;
  }
  
  .mini-btn {
    padding: 4px 8px;
    font-size: 10px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
    transition: all 0.2s ease;
  }
  
  .mini-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .mini-btn.hit { 
    background: #2196f3; 
    color: white; 
  }
  
  .mini-btn.stand { 
    background: #ff9800; 
    color: white; 
  }
  
  .mini-btn.take-over { 
    background: #9c27b0; 
    color: white; 
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
  .difficulty-select {
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
  
  .difficulty-select option {
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
  </style>