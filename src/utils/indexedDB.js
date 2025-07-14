// indexedDB.js - Complete file for Blackjack Pro

const DB_NAME = 'BlackjackProDB'
const DB_VERSION = 1

// Initialize IndexedDB
export function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    
    request.onerror = () => {
      console.error('Failed to open database')
      reject(request.error)
    }
    
    request.onsuccess = () => {
      resolve(request.result)
    }
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result
      
      // Create players store
      if (!db.objectStoreNames.contains('players')) {
        const playerStore = db.createObjectStore('players', { keyPath: 'id', autoIncrement: true })
        playerStore.createIndex('username', 'username', { unique: false })
      }
      
      // Create game history store
      if (!db.objectStoreNames.contains('gameHistory')) {
        const gameStore = db.createObjectStore('gameHistory', { keyPath: 'id', autoIncrement: true })
        gameStore.createIndex('playerId', 'playerId', { unique: false })
        gameStore.createIndex('timestamp', 'timestamp', { unique: false })
      }
      
      // Create player settings store
      if (!db.objectStoreNames.contains('playerSettings')) {
        db.createObjectStore('playerSettings', { keyPath: 'playerId' })
      }
    }
  })
}

// Helper function to open database
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// Player Management Functions
export async function createPlayer(username, initialBankroll = 1000) {
  const db = await openDB()
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['players'], 'readwrite')
    const store = transaction.objectStore('players')
    
    const player = {
      username,
      bankroll: initialBankroll,
      totalHands: 0,
      totalWins: 0,
      totalLosses: 0,
      biggestWin: 0,
      biggestLoss: 0,
      createdAt: new Date(),
      lastPlayed: new Date()
    }
    
    const request = store.add(player)
    
    request.onsuccess = () => {
      resolve(request.result)
    }
    
    request.onerror = () => {
      reject(request.error)
    }
  })
}

export async function getPlayer(playerId) {
  const db = await openDB()
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['players'], 'readonly')
    const store = transaction.objectStore('players')
    const request = store.get(playerId)
    
    request.onsuccess = () => {
      resolve(request.result)
    }
    
    request.onerror = () => {
      reject(request.error)
    }
  })
}

export async function updatePlayerBankroll(playerId, newBankroll) {
  const db = await openDB()
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['players'], 'readwrite')
    const store = transaction.objectStore('players')
    
    const getRequest = store.get(playerId)
    
    getRequest.onsuccess = () => {
      const player = getRequest.result
      if (player) {
        player.bankroll = newBankroll
        player.lastPlayed = new Date()
        
        const updateRequest = store.put(player)
        
        updateRequest.onsuccess = () => {
          resolve(true)
        }
        
        updateRequest.onerror = () => {
          reject(updateRequest.error)
        }
      } else {
        reject(new Error('Player not found'))
      }
    }
    
    getRequest.onerror = () => {
      reject(getRequest.error)
    }
  })
}

export async function getAllPlayers() {
  const db = await openDB()
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['players'], 'readonly')
    const store = transaction.objectStore('players')
    const request = store.getAll()
    
    request.onsuccess = () => {
      resolve(request.result)
    }
    
    request.onerror = () => {
      reject(request.error)
    }
  })
}

// Delete Player Function
export async function deletePlayer(playerId) {
  return new Promise((resolve, reject) => {
    // Open the database
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    
    request.onsuccess = (event) => {
      const db = event.target.result
      
      // Use a transaction to delete all related data
      const tx = db.transaction(['players', 'gameHistory', 'playerSettings'], 'readwrite')
      
      // Delete player record
      tx.objectStore('players').delete(playerId)
      
      // Delete all game history for this player
      const gameHistoryStore = tx.objectStore('gameHistory')
      const gameIndex = gameHistoryStore.index('playerId')
      const gameReq = gameIndex.openCursor(IDBKeyRange.only(playerId))
      
      gameReq.onsuccess = (event) => {
        const cursor = event.target.result
        if (cursor) {
          gameHistoryStore.delete(cursor.primaryKey)
          cursor.continue()
        }
      }
      
      // Delete player settings
      tx.objectStore('playerSettings').delete(playerId)
      
      // Handle transaction completion
      tx.oncomplete = () => {
        console.log(`Successfully deleted player ${playerId} and all related data`)
        db.close()
        resolve(true)
      }
      
      tx.onerror = () => {
        console.error('Error deleting player:', tx.error)
        db.close()
        reject(tx.error)
      }
    }
    
    request.onerror = () => {
      console.error('Error opening database:', request.error)
      reject(request.error)
    }
  })
}

// Game History Functions
export async function saveGameResult(playerId, hands, outcome, bet, payout) {
  const db = await openDB()
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['gameHistory', 'players'], 'readwrite')
    const gameStore = transaction.objectStore('gameHistory')
    const playerStore = transaction.objectStore('players')
    
    const gameResult = {
      playerId,
      hands: JSON.stringify(hands),
      outcome,
      bet,
      payout,
      timestamp: new Date()
    }
    
    // Save game result
    const gameRequest = gameStore.add(gameResult)
    
    gameRequest.onsuccess = () => {
      // Update player statistics
      const getPlayerRequest = playerStore.get(playerId)
      
      getPlayerRequest.onsuccess = () => {
        const player = getPlayerRequest.result
        if (player) {
          player.totalHands++
          
          if (outcome === 'win' || outcome === 'blackjack') {
            player.totalWins++
            player.biggestWin = Math.max(player.biggestWin, payout)
          } else if (outcome === 'lose') {
            player.totalLosses++
            player.biggestLoss = Math.max(player.biggestLoss, Math.abs(payout))
          }
          
          player.lastPlayed = new Date()
          
          const updateRequest = playerStore.put(player)
          
          updateRequest.onsuccess = () => {
            resolve(gameRequest.result)
          }
          
          updateRequest.onerror = () => {
            reject(updateRequest.error)
          }
        }
      }
    }
    
    gameRequest.onerror = () => {
      reject(gameRequest.error)
    }
  })
}

export async function getGameHistory(playerId, limit = 50) {
  const db = await openDB()
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['gameHistory'], 'readonly')
    const store = transaction.objectStore('gameHistory')
    const index = store.index('playerId')
    
    const games = []
    let count = 0
    
    const request = index.openCursor(IDBKeyRange.only(playerId), 'prev')
    
    request.onsuccess = (event) => {
      const cursor = event.target.result
      if (cursor && count < limit) {
        games.push(cursor.value)
        count++
        cursor.continue()
      } else {
        resolve(games)
      }
    }
    
    request.onerror = () => {
      reject(request.error)
    }
  })
}

// Player Settings Functions
export async function getPlayerSettings(playerId) {
  const db = await openDB()
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['playerSettings'], 'readonly')
    const store = transaction.objectStore('playerSettings')
    const request = store.get(playerId)
    
    request.onsuccess = () => {
      resolve(request.result?.settings || {})
    }
    
    request.onerror = () => {
      reject(request.error)
    }
  })
}

export async function updatePlayerSettings(playerId, settings) {
  const db = await openDB()
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['playerSettings'], 'readwrite')
    const store = transaction.objectStore('playerSettings')
    
    const data = {
      playerId,
      settings,
      updatedAt: new Date()
    }
    
    const request = store.put(data)
    
    request.onsuccess = () => {
      resolve(true)
    }
    
    request.onerror = () => {
      reject(request.error)
    }
  })
}

// Initialize database on module load
initDB().catch(console.error)