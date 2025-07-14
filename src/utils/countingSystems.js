export const countingSystems = {
    'Hi-Lo': {
      name: 'Hi-Lo',
      description: 'Most popular balanced system',
      values: {
        'A': -1, '2': 1, '3': 1, '4': 1, '5': 1, '6': 1,
        '7': 0, '8': 0, '9': 0, '10': -1, 'J': -1, 'Q': -1, 'K': -1
      },
      balanced: true
    },
    'KO': {
      name: 'Knock-Out (KO)',
      description: 'Unbalanced system, easier for beginners',
      values: {
        'A': -1, '2': 1, '3': 1, '4': 1, '5': 1, '6': 1, '7': 1,
        '8': 0, '9': 0, '10': -1, 'J': -1, 'Q': -1, 'K': -1
      },
      balanced: false
    },
    'Red 7': {
      name: 'Red 7',
      description: 'Color-based unbalanced system',
      values: {
        'A': -1, '2': 1, '3': 1, '4': 1, '5': 1, '6': 1,
        '7': 0.5, '8': 0, '9': 0, '10': -1, 'J': -1, 'Q': -1, 'K': -1
      },
      balanced: false,
      colorDependent: true
    },
    'Omega II': {
      name: 'Omega II',
      description: 'Advanced multi-level system',
      values: {
        'A': 0, '2': 1, '3': 1, '4': 2, '5': 2, '6': 2, '7': 1,
        '8': 0, '9': -1, '10': -2, 'J': -2, 'Q': -2, 'K': -2
      },
      balanced: true,
      multiLevel: true
    }
  }
  
  export function getCardCountValue(card, system, suit = null) {
    const countSystem = countingSystems[system]
    if (!countSystem) return 0
    
    let value = countSystem.values[card.value] || 0
    
    // Special handling for Red 7 system
    if (system === 'Red 7' && card.value === '7') {
      if (suit && (suit === 'hearts' || suit === 'diamonds')) {
        value = 1
      } else {
        value = 0
      }
    }
    
    return value
  }
  
  export function calculateTrueCount(runningCount, decksRemaining) {
    if (decksRemaining <= 0) return runningCount
    return Math.round((runningCount / decksRemaining) * 10) / 10
  }