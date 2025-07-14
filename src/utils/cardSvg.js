export function generateCardSvg(value, suit, faceDown = false) {
    if (faceDown) {
      return `
        <svg viewBox="0 0 100 140" class="card card-back">
          <rect width="100" height="140" rx="8" fill="#1a1a2e" stroke="#16213e" stroke-width="2"/>
          <pattern id="cardback" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="20" height="20" fill="#0f3460"/>
            <circle cx="10" cy="10" r="3" fill="#1a5490"/>
          </pattern>
          <rect x="4" y="4" width="92" height="132" rx="6" fill="url(#cardback)"/>
        </svg>
      `
    }
    
    const isRed = suit === 'hearts' || suit === 'diamonds'
    const color = isRed ? '#dc2626' : '#1f2937'
    const suitSymbol = getSuitSymbol(suit)
    
    return `
      <svg viewBox="0 0 100 140" class="card">
        <rect width="100" height="140" rx="8" fill="white" stroke="#e5e7eb" stroke-width="1"/>
        
        <!-- Top left value and suit -->
        <text x="8" y="18" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="${color}">
          ${value}
        </text>
        <text x="8" y="32" font-family="Arial, sans-serif" font-size="12" fill="${color}">
          ${suitSymbol}
        </text>
        
        <!-- Card center with correct number of suits -->
        ${generateCardCenter(value, suitSymbol, color)}
        
        <!-- Bottom right (rotated) -->
        <g transform="rotate(180, 50, 70)">
          <text x="8" y="18" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="${color}">
            ${value}
          </text>
          <text x="8" y="32" font-family="Arial, sans-serif" font-size="12" fill="${color}">
            ${suitSymbol}
          </text>
        </g>
      </svg>
    `
  }
  
  function generateCardCenter(value, suitSymbol, color) {
    // Face cards get special treatment
    if (['J', 'Q', 'K'].includes(value)) {
      return `
        <text x="50" y="80" font-family="Arial, sans-serif" font-size="36" fill="${color}" text-anchor="middle">
          ${value}
        </text>
      `
    }
    
    // Ace gets single large suit
    if (value === 'A') {
      return `
        <text x="50" y="80" font-family="Arial, sans-serif" font-size="36" fill="${color}" text-anchor="middle">
          ${suitSymbol}
        </text>
      `
    }
    
    const numValue = parseInt(value)
    
    // Generate suit positions based on card value
    const positions = getSuitPositions(numValue)
    
    return positions.map(pos => 
      `<text x="${pos.x}" y="${pos.y}" font-family="Arial, sans-serif" font-size="16" fill="${color}" text-anchor="middle">
        ${suitSymbol}
      </text>`
    ).join('')
  }
  
  function getSuitPositions(number) {
    const positions = []
    
    switch (number) {
      case 2:
        positions.push({ x: 50, y: 50 }, { x: 50, y: 90 })
        break
      case 3:
        positions.push({ x: 50, y: 45 }, { x: 50, y: 70 }, { x: 50, y: 95 })
        break
      case 4:
        positions.push(
          { x: 35, y: 50 }, { x: 65, y: 50 },
          { x: 35, y: 90 }, { x: 65, y: 90 }
        )
        break
      case 5:
        positions.push(
          { x: 35, y: 45 }, { x: 65, y: 45 },
          { x: 50, y: 70 },
          { x: 35, y: 95 }, { x: 65, y: 95 }
        )
        break
      case 6:
        positions.push(
          { x: 35, y: 45 }, { x: 65, y: 45 },
          { x: 35, y: 70 }, { x: 65, y: 70 },
          { x: 35, y: 95 }, { x: 65, y: 95 }
        )
        break
      case 7:
        positions.push(
          { x: 35, y: 40 }, { x: 65, y: 40 },
          { x: 35, y: 65 }, { x: 50, y: 65 }, { x: 65, y: 65 },
          { x: 35, y: 90 }, { x: 65, y: 90 }
        )
        break
      case 8:
        positions.push(
          { x: 35, y: 40 }, { x: 65, y: 40 },
          { x: 35, y: 60 }, { x: 65, y: 60 },
          { x: 35, y: 80 }, { x: 65, y: 80 },
          { x: 35, y: 100 }, { x: 65, y: 100 }
        )
        break
      case 9:
        positions.push(
          { x: 35, y: 38 }, { x: 65, y: 38 },
          { x: 35, y: 58 }, { x: 65, y: 58 },
          { x: 50, y: 70 },
          { x: 35, y: 82 }, { x: 65, y: 82 },
          { x: 35, y: 102 }, { x: 65, y: 102 }
        )
        break
      case 10:
        positions.push(
          { x: 35, y: 35 }, { x: 65, y: 35 },
          { x: 35, y: 55 }, { x: 65, y: 55 },
          { x: 35, y: 75 }, { x: 65, y: 75 },
          { x: 35, y: 95 }, { x: 65, y: 95 },
          { x: 50, y: 45 }, { x: 50, y: 85 }
        )
        break
      default:
        // Fallback to single center suit
        positions.push({ x: 50, y: 70 })
    }
    
    return positions
  }
  
  function getSuitSymbol(suit) {
    const symbols = {
      hearts: '♥',
      diamonds: '♦',
      clubs: '♣',
      spades: '♠'
    }
    return symbols[suit] || '?'
  }