import { calculateHandValue, canSplit, canDoubleDown } from './gameRules'

// Basic strategy tables based on dealer up card
const hardTotals = {
  // Player total: { dealer card: action }
  5: { 2: 'hit', 3: 'hit', 4: 'hit', 5: 'hit', 6: 'hit', 7: 'hit', 8: 'hit', 9: 'hit', 10: 'hit', A: 'hit' },
  6: { 2: 'hit', 3: 'hit', 4: 'hit', 5: 'hit', 6: 'hit', 7: 'hit', 8: 'hit', 9: 'hit', 10: 'hit', A: 'hit' },
  7: { 2: 'hit', 3: 'hit', 4: 'hit', 5: 'hit', 6: 'hit', 7: 'hit', 8: 'hit', 9: 'hit', 10: 'hit', A: 'hit' },
  8: { 2: 'hit', 3: 'hit', 4: 'hit', 5: 'hit', 6: 'hit', 7: 'hit', 8: 'hit', 9: 'hit', 10: 'hit', A: 'hit' },
  9: { 2: 'hit', 3: 'double', 4: 'double', 5: 'double', 6: 'double', 7: 'hit', 8: 'hit', 9: 'hit', 10: 'hit', A: 'hit' },
  10: { 2: 'double', 3: 'double', 4: 'double', 5: 'double', 6: 'double', 7: 'double', 8: 'double', 9: 'double', 10: 'hit', A: 'hit' },
  11: { 2: 'double', 3: 'double', 4: 'double', 5: 'double', 6: 'double', 7: 'double', 8: 'double', 9: 'double', 10: 'double', A: 'double' },
  12: { 2: 'hit', 3: 'hit', 4: 'stand', 5: 'stand', 6: 'stand', 7: 'hit', 8: 'hit', 9: 'hit', 10: 'hit', A: 'hit' },
  13: { 2: 'stand', 3: 'stand', 4: 'stand', 5: 'stand', 6: 'stand', 7: 'hit', 8: 'hit', 9: 'hit', 10: 'hit', A: 'hit' },
  14: { 2: 'stand', 3: 'stand', 4: 'stand', 5: 'stand', 6: 'stand', 7: 'hit', 8: 'hit', 9: 'hit', 10: 'hit', A: 'hit' },
  15: { 2: 'stand', 3: 'stand', 4: 'stand', 5: 'stand', 6: 'stand', 7: 'hit', 8: 'hit', 9: 'hit', 10: 'hit', A: 'hit' },
  16: { 2: 'stand', 3: 'stand', 4: 'stand', 5: 'stand', 6: 'stand', 7: 'hit', 8: 'hit', 9: 'hit', 10: 'hit', A: 'hit' },
  17: { 2: 'stand', 3: 'stand', 4: 'stand', 5: 'stand', 6: 'stand', 7: 'stand', 8: 'stand', 9: 'stand', 10: 'stand', A: 'stand' },
  18: { 2: 'stand', 3: 'stand', 4: 'stand', 5: 'stand', 6: 'stand', 7: 'stand', 8: 'stand', 9: 'stand', 10: 'stand', A: 'stand' },
  19: { 2: 'stand', 3: 'stand', 4: 'stand', 5: 'stand', 6: 'stand', 7: 'stand', 8: 'stand', 9: 'stand', 10: 'stand', A: 'stand' },
  20: { 2: 'stand', 3: 'stand', 4: 'stand', 5: 'stand', 6: 'stand', 7: 'stand', 8: 'stand', 9: 'stand', 10: 'stand', A: 'stand' },
  21: { 2: 'stand', 3: 'stand', 4: 'stand', 5: 'stand', 6: 'stand', 7: 'stand', 8: 'stand', 9: 'stand', 10: 'stand', A: 'stand' }
}

const softTotals = {
  // Soft totals (A + X)
  13: { 2: 'hit', 3: 'hit', 4: 'hit', 5: 'double', 6: 'double', 7: 'hit', 8: 'hit', 9: 'hit', 10: 'hit', A: 'hit' },
  14: { 2: 'hit', 3: 'hit', 4: 'hit', 5: 'double', 6: 'double', 7: 'hit', 8: 'hit', 9: 'hit', 10: 'hit', A: 'hit' },
  15: { 2: 'hit', 3: 'hit', 4: 'double', 5: 'double', 6: 'double', 7: 'hit', 8: 'hit', 9: 'hit', 10: 'hit', A: 'hit' },
  16: { 2: 'hit', 3: 'hit', 4: 'double', 5: 'double', 6: 'double', 7: 'hit', 8: 'hit', 9: 'hit', 10: 'hit', A: 'hit' },
  17: { 2: 'hit', 3: 'double', 4: 'double', 5: 'double', 6: 'double', 7: 'hit', 8: 'hit', 9: 'hit', 10: 'hit', A: 'hit' },
  18: { 2: 'stand', 3: 'double', 4: 'double', 5: 'double', 6: 'double', 7: 'stand', 8: 'stand', 9: 'hit', 10: 'hit', A: 'hit' },
  19: { 2: 'stand', 3: 'stand', 4: 'stand', 5: 'stand', 6: 'stand', 7: 'stand', 8: 'stand', 9: 'stand', 10: 'stand', A: 'stand' },
  20: { 2: 'stand', 3: 'stand', 4: 'stand', 5: 'stand', 6: 'stand', 7: 'stand', 8: 'stand', 9: 'stand', 10: 'stand', A: 'stand' },
  21: { 2: 'stand', 3: 'stand', 4: 'stand', 5: 'stand', 6: 'stand', 7: 'stand', 8: 'stand', 9: 'stand', 10: 'stand', A: 'stand' }
}

const pairSplitting = {
  // Pair value: { dealer card: action }
  'A': { 2: 'split', 3: 'split', 4: 'split', 5: 'split', 6: 'split', 7: 'split', 8: 'split', 9: 'split', 10: 'split', A: 'split' },
  '2': { 2: 'split', 3: 'split', 4: 'split', 5: 'split', 6: 'split', 7: 'split', 8: 'hit', 9: 'hit', 10: 'hit', A: 'hit' },
  '3': { 2: 'split', 3: 'split', 4: 'split', 5: 'split', 6: 'split', 7: 'split', 8: 'hit', 9: 'hit', 10: 'hit', A: 'hit' },
  '4': { 2: 'hit', 3: 'hit', 4: 'hit', 5: 'split', 6: 'split', 7: 'hit', 8: 'hit', 9: 'hit', 10: 'hit', A: 'hit' },
  '5': { 2: 'double', 3: 'double', 4: 'double', 5: 'double', 6: 'double', 7: 'double', 8: 'double', 9: 'double', 10: 'hit', A: 'hit' },
  '6': { 2: 'split', 3: 'split', 4: 'split', 5: 'split', 6: 'split', 7: 'hit', 8: 'hit', 9: 'hit', 10: 'hit', A: 'hit' },
  '7': { 2: 'split', 3: 'split', 4: 'split', 5: 'split', 6: 'split', 7: 'split', 8: 'hit', 9: 'hit', 10: 'hit', A: 'hit' },
  '8': { 2: 'split', 3: 'split', 4: 'split', 5: 'split', 6: 'split', 7: 'split', 8: 'split', 9: 'split', 10: 'split', A: 'split' },
  '9': { 2: 'split', 3: 'split', 4: 'split', 5: 'split', 6: 'split', 7: 'stand', 8: 'split', 9: 'split', 10: 'stand', A: 'stand' },
  '10': { 2: 'stand', 3: 'stand', 4: 'stand', 5: 'stand', 6: 'stand', 7: 'stand', 8: 'stand', 9: 'stand', 10: 'stand', A: 'stand' }
}

function getDealerCardValue(dealerCard) {
  if (!dealerCard) return 10 // Assume 10 if unknown
  
  if (dealerCard.value === 'A') return 'A'
  if (['J', 'Q', 'K'].includes(dealerCard.value)) return 10
  return parseInt(dealerCard.value)
}

export function getBotDecision(hand, dealerUpCard, bankroll = 1000) {
  const handValue = calculateHandValue(hand.cards)
  const dealerValue = getDealerCardValue(dealerUpCard)
  
  // Check for pairs first (only on initial 2 cards)
  if (hand.cards.length === 2 && canSplit(hand.cards)) {
    const pairValue = hand.cards[0].value === 'A' ? 'A' : 
                     ['J', 'Q', 'K'].includes(hand.cards[0].value) ? '10' : 
                     hand.cards[0].value
    
    const pairAction = pairSplitting[pairValue]?.[dealerValue]
    if (pairAction === 'split' && bankroll >= hand.bet) {
      return 'split'
    }
    // If can't split (no money), continue with regular strategy
  }
  
  // Use soft totals table if applicable
  if (handValue.soft && handValue.total >= 13 && handValue.total <= 21) {
    const softAction = softTotals[handValue.total]?.[dealerValue]
    
    // Only double if first 2 cards and have bankroll
    if (softAction === 'double') {
      if (hand.cards.length === 2 && bankroll >= hand.bet) {
        return 'double'
      } else {
        return 'hit' // Can't double, so hit instead
      }
    }
    
    return softAction || 'stand'
  }
  
  // Use hard totals table
  if (handValue.total <= 21 && handValue.total >= 5) {
    const hardAction = hardTotals[handValue.total]?.[dealerValue]
    
    // Only double if first 2 cards and have bankroll
    if (hardAction === 'double') {
      if (hand.cards.length === 2 && bankroll >= hand.bet) {
        return 'double'
      } else {
        return 'hit' // Can't double, so hit instead
      }
    }
    
    return hardAction || 'stand'
  }
  
  // Default actions
  if (handValue.total >= 17) return 'stand'
  if (handValue.total <= 11) return 'hit'
  
  // For totals 12-16, hit against strong dealer (7-A), stand against weak (2-6)
  if (dealerValue === 'A' || dealerValue >= 7) {
    return 'hit'
  }
  
  return 'stand'
}

// Bot betting strategy - Kelly Criterion simplified
export function getBotBet(bankroll, minBet = 5, maxBet = 50) {
  // Conservative betting: 1-2% of bankroll
  const kellyBet = Math.floor(bankroll * 0.015)
  
  // Ensure within table limits
  const bet = Math.max(minBet, Math.min(maxBet, kellyBet))
  
  // Round to nearest 5
  return Math.round(bet / 5) * 5
}

// Get bot names and personalities
export function generateBotName() {
  const firstNames = [
    'Lucky', 'Ace', 'Diamond', 'Chip', 'Vegas', 'Royal', 'Jack', 
    'Queen', 'King', 'Spade', 'Heart', 'Club', 'High', 'Wild'
  ]
  
  const lastNames = [
    'McBet', 'Dealer', 'Winner', 'Roller', 'Counter', 'Sharp',
    'Pro', 'Master', 'Champion', 'Bluff', 'Stakes', 'Cards'
  ]
  
  const first = firstNames[Math.floor(Math.random() * firstNames.length)]
  const last = lastNames[Math.floor(Math.random() * lastNames.length)]
  
  return `${first} ${last}`
}