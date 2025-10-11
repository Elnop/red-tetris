# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Red Tetris is a **multiplayer Tetris game** built with Nuxt 3 and Socket.IO. It's a full-stack JavaScript project where multiple players compete in real-time Tetris matches. Players join rooms via URL patterns (`/room/<room_name>/<username>`) and compete with synchronized piece sequences.

## Architecture

- **Frontend**: Nuxt 3 SPA with Vue 3 and Pinia for state management  
- **Backend**: Nuxt server with Socket.IO integration (runs on port 3001)
- **Real-time**: Socket.IO for multiplayer synchronization and room management
- **Source Directory**: Custom `srcDir: "app"` in nuxt.config.ts

### Key Directories

- `app/` - Main source directory (frontend)
  - `pages/` - File-based routing with dynamic room/username routes
  - `components/` - Vue components (RTButton, Header, Game)
  - `composables/` - Vue composables for game logic (useBoard, useGame, useActivePiece)
  - `stores/` - Pinia stores (useGameStore, useRoomStore, useUserStore)
- `server/` - Server-side code
  - `plugins/socket.ts` - Socket.IO server implementation with room management
  - `api/` - API endpoints
- `test/` - Test files with unit tests for stores, pages, and game logic

## Development Commands

**Development server:**
```bash
npm run dev  # Starts Nuxt dev server + Socket.IO server on port 3001
```

**Build and production:**
```bash
npm run build    # Build for production
npm run preview  # Preview production build
```

**Testing:**
```bash
npx vitest       # Run tests
npx vitest --coverage  # Run tests with coverage report
```

Tests use Vitest with coverage requirements:
- Statements: ≥70%
- Functions: ≥70% 
- Lines: ≥70%
- Branches: ≥50%

## Game Logic Architecture

The Tetris game logic is implemented as **pure functions** in composables:
- Piece spawning, rotation, movement validation
- Board state management and line clearing  
- Ghost piece display and collision detection
- Multiplayer synchronization via Socket.IO events

### Socket.IO Events

Key events handled in `server/plugins/socket.ts`:
- `join-room`, `leave-room` - Room management
- `tetris-start` - Game initialization with shared seed
- `tetris-grid` - Broadcasting player boards 
- `tetris-send-lines` - Penalty line mechanics
- `tetris-game-over` - Player elimination and win detection

## State Management

Uses Pinia with persistence:
- **useGameStore**: Game state, board, active pieces
- **useRoomStore**: Room info, connected players  
- **useUserStore**: User preferences and settings

## Constraints

- **No direct DOM manipulation** - Uses Vue's reactive system
- **No Canvas/SVG** - CSS Grid for board rendering
- **ES modules only** - Modern JavaScript throughout
- **Socket.IO on port 3001** - Separate from main Nuxt server

## Testing Strategy

Focus on testing pure functions and store logic. Game mechanics are implemented as testable functions separate from Vue components. Server room management and piece synchronization logic should also be tested.