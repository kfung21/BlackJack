# BlackJack Card Counter Pro

A professional Vue 3 blackjack game with advanced card counting features, multiplayer support, and offline PWA capabilities.

## 🎰 Overview

This is a comprehensive blackjack implementation that goes beyond basic gameplay to include professional card counting systems, multiplayer functionality with AI opponents, and full offline support as a Progressive Web App. The game is designed for both casual players and serious card counting practice.

## ✨ Key Features

### Core Gameplay
- **Complete Blackjack Rules**: Hit, stand, double down, split (up to 4 hands), insurance
- **Configurable Game Rules**:
  - Decks: 1, 2, 4, 6, or 8 deck shoes
  - Blackjack payouts: 3:2 (standard), 6:5, or 1:1
  - Dealer hits on soft 17
  - Customizable dealer speed
- **Persistent Game State**: Auto-saves every 5 seconds, resume interrupted games
- **Smooth Animations**: Card dealing animations with configurable speed

### Multiplayer System
- **Up to 7 Players**: Mix of human and AI players at the same table
- **AI Opponents**: Bots use mathematically optimal basic strategy
- **Dynamic Control**: Switch any player between human/bot control mid-game
- **Seat Management**: Drag-and-drop interface to rearrange player positions
- **Turn-Based Play**: Clear visual indicators for current player
- **Multiple Views**: Click any player to view their cards

### Card Counting Features
- **Multiple Counting Systems**:
  - **Hi-Lo**: Most popular balanced system (+1 for 2-6, 0 for 7-9, -1 for 10-A)
  - **KO (Knock-Out)**: Unbalanced system, easier for beginners
  - **Red 7**: Color-based unbalanced system
  - **Omega II**: Advanced multi-level system
- **Real-Time Count Display**:
  - Running count updates as cards are played
  - True count calculation based on remaining decks
  - Decks remaining indicator
- **Count-Based Features**:
  - Betting suggestions using Kelly Criterion
  - Strategy deviations based on count
  - Advantage level indicators

### Player Management
- **Multiple User Profiles**: Create unlimited player accounts
- **Bankroll Tracking**: Starting bankroll from $50 to $100,000
- **Comprehensive Statistics**:
  - Total hands played
  - Win/loss record
  - Win rate percentage
  - Biggest wins and losses
  - Net profit tracking
- **Achievement System**: Unlock achievements for various milestones
- **Game History**: Detailed record of all hands played

### Progressive Web App (PWA)
- **Full Offline Support**: Play without internet connection
- **Installable**: Add to home screen on mobile/desktop
- **Auto-Updates**: Seamless updates when online
- **Data Persistence**: All data stored locally in IndexedDB
- **Responsive Design**: Optimized for phones, tablets, and desktop

### User Interface
- **Modern Dark Theme**: Casino-style aesthetic
- **Mobile-First Design**: Touch-optimized controls
- **Accessibility**: High contrast, clear typography
- **Quick Actions**: One-tap betting, easy navigation
- **Strategy Hints**: Optional hints showing optimal play

## 🏗️ Technical Architecture

### Technology Stack
- **Frontend Framework**: Vue 3 (Composition API)
- **State Management**: Pinia
- **Routing**: Vue Router
- **Build Tool**: Vite
- **Styling**: Scoped CSS with CSS variables
- **PWA**: vite-plugin-pwa
- **Storage**: IndexedDB + LocalStorage

### Project Structure
```
src/
├── views/                  # Page components
│   ├── GameView.vue       # Main game interface
│   ├── ProfileView.vue    # User profile management
│   ├── SettingsView.vue   # Game settings
│   └── StatsView.vue      # Statistics and achievements
│
├── components/            # Reusable components
│   ├── CardComponent.vue  # SVG card rendering
│   ├── DealerHand.vue    # Dealer's hand display
│   ├── PlayerHand.vue    # Player's hand display
│   ├── HintModal.vue     # Strategy hint popup
│   ├── PlayerRoster.vue  # Multiplayer player list
│   ├── CardCountPanel.vue # Count display widget
│   └── BettingPanel.vue  # Betting interface
│
├── stores/               # Pinia state stores
│   ├── gameStore.js     # Core game state and logic
│   ├── playerStore.js   # User profiles and settings
│   └── countingStore.js # Card counting logic
│
├── utils/               # Utility functions
│   ├── gameRules.js    # Blackjack rules engine
│   ├── botStrategy.js  # AI decision making
│   ├── countingSystems.js # Counting system definitions
│   ├── cardSvg.js      # SVG card generation
│   └── indexedDB.js    # Database operations
│
└── router/             # Route definitions
    └── index.js
```

### State Management

#### gameStore
Manages the core game state including:
- Deck and card management
- Player hands and dealer hand
- Game phases (betting, dealing, playing, dealer, finished)
- Multiplayer player list and turn management
- Auto-save functionality
- Game history

#### playerStore
Handles user-related data:
- Current logged-in player
- Player profiles and bankrolls
- User settings and preferences
- PWA installation state
- Online/offline status

#### countingStore
Manages card counting features:
- Running count and true count
- Cards seen tracking
- Count history
- Betting suggestions
- System-specific calculations

### Data Persistence

#### IndexedDB Schema
```javascript
{
  players: {
    id: auto-increment,
    username: string,
    bankroll: number,
    totalHands: number,
    totalWins: number,
    totalLosses: number,
    biggestWin: number,
    biggestLoss: number,
    createdAt: date,
    lastPlayed: date
  },
  
  gameHistory: {
    id: auto-increment,
    playerId: number,
    hands: JSON,
    outcome: string,
    bet: number,
    payout: number,
    timestamp: date
  },
  
  playerSettings: {
    playerId: number (primary key),
    settings: JSON,
    updatedAt: date
  },
  
  gameState: {
    id: string,
    playerId: number,
    state: JSON,
    savedAt: date
  }
}
```

#### LocalStorage
- Active game state (for quick auto-save)
- Temporary session data

## 🎮 Game Flow

### 1. Authentication Phase
- User selects existing profile or creates new one
- Configures starting bankroll ($50-$100,000)
- Settings are loaded/initialized

### 2. Pre-Game Setup
- Enable/disable multiplayer mode
- Add bot players (up to 7 total players)
- Configure game rules in settings

### 3. Betting Phase
- Players place bets (bots auto-bet based on bankroll)
- Count-based betting suggestions shown
- Minimum bet: $5, Maximum: varies by bankroll

### 4. Dealing Phase
- Two cards dealt to each player
- One face-up, one face-down card to dealer
- Automatic blackjack checking
- Insurance offered if dealer shows Ace

### 5. Playing Phase
- Each player acts in turn (left to right)
- Available actions: Hit, Stand, Double Down, Split
- Hints available showing optimal play
- Bots play automatically using basic strategy

### 6. Dealer Phase
- Dealer reveals hole card
- Dealer hits on 16 and below, soft 17
- Automatic bust/win detection

### 7. Resolution Phase
- Payouts calculated for each hand
- Bankrolls updated
- Statistics recorded
- Option to play again with same bet

## 🎯 Card Counting Implementation

### Counting Systems Details

#### Hi-Lo System
- **Type**: Balanced
- **Values**: 2-6 (+1), 7-9 (0), 10-A (-1)
- **True Count**: Running Count ÷ Decks Remaining
- **Betting**: Increase bets when TC ≥ +2

#### KO (Knock-Out) System
- **Type**: Unbalanced
- **Values**: 2-7 (+1), 8-9 (0), 10-A (-1)
- **True Count**: Not required (unbalanced)
- **Betting**: Increase bets when RC ≥ +2 per deck

#### Strategy Deviations
The hint system adjusts recommendations based on count:
- **High Count (+3 or more)**:
  - Stand on 12 vs 2-6
  - Stand on 16 vs 10
  - Take insurance
- **Low Count (-2 or less)**:
  - Hit 12 vs 4
  - Hit 13 vs 2

### Betting Strategy
Uses simplified Kelly Criterion:
- Base unit = Bankroll ÷ 100
- Bet = Base Unit × Max(1, True Count - 1)
- Maximum bet = 5% of bankroll
- Minimum bet = Table minimum ($5)

## 🚀 Installation & Setup

### Prerequisites
- Node.js 16+ and npm/yarn
- Modern web browser with IndexedDB support

### Development Setup
```bash
# Clone the repository
git clone https://github.com/kfung21/BlackJack.git
cd BlackJack

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Environment Configuration
The game works entirely client-side with no backend required. All data is stored locally in the browser.

### PWA Installation
1. Visit the deployed site in a supported browser
2. Look for the install prompt or browser install icon
3. Click "Install" to add to home screen
4. Game will work offline after installation

## 🎨 UI/UX Design Principles

### Visual Design
- **Dark Theme**: Reduces eye strain during extended play
- **High Contrast**: Clear visibility of cards and UI elements
- **Consistent Colors**:
  - Green (#34a853): Positive actions, wins
  - Red (#f44336): Negative outcomes, losses
  - Blue (#2196f3): Information, neutral states
  - Orange (#ff9800): Warnings, pushes

### Interaction Design
- **Touch-First**: Large tap targets for mobile
- **Immediate Feedback**: Visual and optional haptic feedback
- **Progressive Disclosure**: Advanced features hidden by default
- **Contextual Help**: Hints and tips where needed

### Animation Philosophy
- **Purposeful**: Animations convey game state changes
- **Performance**: 60fps animations using CSS transforms
- **Configurable**: Users can adjust or disable animations

## 🔧 Configuration Options

### Game Settings
```javascript
{
  numDecks: 6,              // 1, 2, 4, 6, or 8
  blackjackPayout: '3:2',   // '3:2', '6:5', '1:1'
  dealerSpeed: 500,         // milliseconds (0-2000)
  penetration: 0.75         // deck penetration before shuffle
}
```

### Player Settings
```javascript
{
  countingSystem: 'Hi-Lo',  // counting system name
  showCount: true,          // display running count
  showTrueCount: true,      // display true count
  soundEnabled: true,       // sound effects
  showHints: true,          // strategy hints button
  hapticFeedback: true      // vibration on mobile
}
```

## 🐛 Known Issues & Limitations

1. **Browser Compatibility**: Requires modern browser with ES6+ support
2. **Storage Limits**: IndexedDB has browser-specific storage limits
3. **PWA iOS**: Limited PWA features on iOS Safari
4. **Screen Readers**: Limited accessibility support (planned improvement)

## 🚦 Roadmap & Future Enhancements

### Planned Features
- [ ] Side bets (Perfect Pairs, 21+3)
- [ ] Tournament mode with leaderboards
- [ ] More counting systems (Zen, Wong Halves)
- [ ] Detailed session analytics
- [ ] Social features (friends, challenges)
- [ ] Multiple language support

### Technical Improvements
- [ ] WebSocket support for real-time multiplayer
- [ ] Cloud save sync
- [ ] Enhanced accessibility
- [ ] Performance optimizations for low-end devices
- [ ] Comprehensive test suite

## 📝 Development Notes

### Code Style
- Vue 3 Composition API with `<script setup>`
- Reactive refs for primitive values
- Computed properties for derived state
- Watchers sparingly for side effects

### State Management Patterns
- Stores handle business logic
- Components focus on presentation
- Clear separation of concerns
- Immutable state updates

### Performance Considerations
- Lazy loading for routes
- Minimal re-renders using Vue's reactivity
- Efficient card rendering with SVG
- Debounced auto-save operations

## 🤝 Contributing

This is currently a personal project, but suggestions and bug reports are welcome. Please open an issue on GitHub for any problems or feature requests.

## 📄 License

This project is proprietary. Please contact the author for licensing information.

## 🙏 Acknowledgments

- Card counting strategies based on professional blackjack literature
- UI inspired by modern casino applications
- Bot strategy implements optimal basic strategy from blackjack mathematics

---

For questions or support, please open an issue on GitHub.