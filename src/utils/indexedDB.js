import Dexie from 'dexie'

export class GameDatabase extends Dexie {
  constructor() {
    super('BlackjackGameDB')
    
    this.version(1).stores({
      players: '++id, username, bankroll, totalHands, totalWins, createdAt, lastPlayed',
      gameHistory: '++id, playerId, hands, outcome, bet, payout, timestamp',
      settings: '++id, playerId, countingSystem, showCount, soundEnabled, autoPlay'
    })
  }
}

export const db = new GameDatabase()

export async function createPlayer(username, initialBankroll = 1000) {
  const playerId = await db.players.add({
    username,
    bankroll: initialBankroll,
    totalHands: 0,
    totalWins: 0,
    createdAt: new Date(),
    lastPlayed: new Date()
  })
  
  // Create default settings
  await db.settings.add({
    playerId,
    countingSystem: 'Hi-Lo',
    showCount: true,
    soundEnabled: true,
    autoPlay: false
  })
  
  return playerId
}

export async function getPlayer(playerId) {
  return await db.players.get(playerId)
}

export async function updatePlayerBankroll(playerId, newBankroll) {
  return await db.players.update(playerId, { 
    bankroll: newBankroll,
    lastPlayed: new Date()
  })
}

export async function saveGameResult(playerId, hands, outcome, bet, payout) {
  await db.gameHistory.add({
    playerId,
    hands: JSON.stringify(hands),
    outcome,
    bet,
    payout,
    timestamp: new Date()
  })
  
  // Update player stats
  const player = await db.players.get(playerId)
  if (player) {
    await db.players.update(playerId, {
      totalHands: player.totalHands + 1,
      totalWins: player.totalWins + (payout > 0 ? 1 : 0)
    })
  }
}

export async function getPlayerSettings(playerId) {
  return await db.settings.where('playerId').equals(playerId).first()
}

export async function updatePlayerSettings(playerId, settings) {
  const existing = await getPlayerSettings(playerId)
  if (existing) {
    return await db.settings.update(existing.id, settings)
  } else {
    return await db.settings.add({ playerId, ...settings })
  }
}

export async function getGameHistory(playerId, limit = 50) {
  return await db.gameHistory
    .where('playerId')
    .equals(playerId)
    .reverse()
    .limit(limit)
    .toArray()
}

export async function getAllPlayers() {
  return await db.players.orderBy('lastPlayed').reverse().toArray()
}