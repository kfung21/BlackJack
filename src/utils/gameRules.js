export function getCardValue(card) {
    if (['J', 'Q', 'K'].includes(card.value)) return 10
    if (card.value === 'A') return 11 // Will be adjusted for soft/hard totals
    return parseInt(card.value)
  }
  
  export function calculateHandValue(cards) {
    let total = 0
    let aces = 0
    
    for (const card of cards) {
      if (card.value === 'A') {
        aces++
        total += 11
      } else if (['J', 'Q', 'K'].includes(card.value)) {
        total += 10
      } else {
        total += parseInt(card.value)
      }
    }
    
    // Adjust for aces
    while (total > 21 && aces > 0) {
      total -= 10
      aces--
    }
    
    return {
      total,
      soft: aces > 0 && total <= 21,
      busted: total > 21
    }
  }
  
  export function isBlackjack(cards) {
    return cards.length === 2 && calculateHandValue(cards).total === 21
  }
  
  export function canSplit(cards) {
    if (cards.length !== 2) return false
    return getCardValue(cards[0]) === getCardValue(cards[1])
  }
  
  export function canDoubleDown(cards, bankroll, bet) {
    return cards.length === 2 && bankroll >= bet
  }
  
  export function getDealerAction(dealerCards) {
    const handValue = calculateHandValue(dealerCards)
    
    // Dealer must hit on soft 17
    if (handValue.total < 17) return 'hit'
    if (handValue.total === 17 && handValue.soft) return 'hit'
    return 'stand'
  }
  
  export function getHandOutcome(playerCards, dealerCards, isPlayerBlackjack = false, isDealerBlackjack = false) {
    const playerValue = calculateHandValue(playerCards)
    const dealerValue = calculateHandValue(dealerCards)
    
    if (playerValue.busted) return 'lose'
    if (dealerValue.busted) return 'win'
    
    if (isPlayerBlackjack && isDealerBlackjack) return 'push'
    if (isPlayerBlackjack) return 'blackjack'
    if (isDealerBlackjack) return 'lose'
    
    if (playerValue.total > dealerValue.total) return 'win'
    if (playerValue.total < dealerValue.total) return 'lose'
    return 'push'
  }
  
  export function getPayoutMultiplier(outcome) {
    switch (outcome) {
      case 'blackjack': return 1.5
      case 'win': return 1
      case 'push': return 0
      case 'lose': return -1
      default: return -1
    }
  }
  
  export function createDeck(numDecks = 1) {
    const suits = ['hearts', 'diamonds', 'clubs', 'spades']
    const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
    const deck = []
    
    for (let d = 0; d < numDecks; d++) {
      for (const suit of suits) {
        for (const value of values) {
          deck.push({
            id: `${suit}-${value}-${d}`,
            suit,
            value,
            deck: d
          })
        }
      }
    }
    
    return shuffleDeck(deck)
  }
  
  export function shuffleDeck(deck) {
    const shuffled = [...deck]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }