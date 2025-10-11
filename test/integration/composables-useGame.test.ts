import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGame } from '~/composables/useGame'
import { useGameStore } from '~/stores/useGameStore'
import { useRoomStore } from '~/stores/useRoomStore'
import { useUserStore } from '~/stores/useUserStore'

// Mock dependencies
vi.mock('pinia-plugin-persistedstate', () => ({
  piniaPluginPersistedstate: {
    localStorage: () => ({})
  }
}))

vi.mock('~/composables/useActivePiece', () => ({
  useActivePiece: vi.fn(() => ({
    handleDrop: vi.fn(),
    getCurrentBaseDropSpeed: vi.fn(() => 1000),
    trySpawnNextActivePiece: vi.fn(),
    hardDrop: vi.fn(),
    tryMoveActivePiece: vi.fn(() => true),
    getActivePieceStyle: vi.fn(() => null)
  }))
}))

vi.mock('~/composables/useGhostDisplay', () => ({
  useGhosts: vi.fn(() => ({
    onGhost: vi.fn(),
    getGhostStyle: vi.fn(() => null)
  }))
}))

vi.mock('~/composables/useBoard', () => ({
  useBoard: vi.fn(() => ({
    addGarbageLines: vi.fn()
  }))
}))

vi.mock('~/composables/socketEmiters', () => ({
  useSocketEmiters: vi.fn(() => ({
    initGameSocketListeners: vi.fn(),
    emitLeaveRoom: vi.fn(),
    clearGameSocketListeners: vi.fn(),
    emitGameOver: vi.fn()
  }))
}))

global.piniaPluginPersistedstate = {
  localStorage: () => ({})
}

describe('useGame', () => {
  let gameStore: ReturnType<typeof useGameStore>
  let roomStore: ReturnType<typeof useRoomStore>
  let userStore: ReturnType<typeof useUserStore>
  let game: ReturnType<typeof useGame>

  beforeEach(async () => {
    setActivePinia(createPinia())
    gameStore = useGameStore()
    roomStore = useRoomStore()
    userStore = useUserStore()
    
    vi.clearAllMocks()
    
    game = useGame()
  })

  describe('Basic Functionality', () => {
    it('should provide expected functions', () => {
      expect(typeof game.start).toBe('function')
      expect(typeof game.cellStyle).toBe('function')
    })

    it('should start the game without throwing', () => {
      expect(() => game.start()).not.toThrow()
    })
  })

  describe('Cell Styling', () => {
    beforeEach(() => {
      // Setup basic grid
      gameStore.grid = Array(20).fill(null).map(() => Array(10).fill(null))
      gameStore.COLS = 10
    })

    it('should return style for white penalty blocks', () => {
      gameStore.grid[0][0] = '#FFFFFF'
      
      const style = game.cellStyle(0) // First cell
      
      expect(style).toEqual({
        background: '#FFFFFF',
        borderColor: '#FFFFFF'
      })
    })

    it('should return normal cell color style', () => {
      gameStore.grid[0][1] = '#00FF00'
      
      const style = game.cellStyle(1) // Second cell
      
      expect(style).toEqual({
        background: '#00FF00',
        borderColor: '#00FF00'
      })
    })

    it('should return null when no style applies', () => {
      // Empty cell with no active piece or ghost
      const style = game.cellStyle(0)
      
      // Should return null when no styling applies
      expect(style).toBeNull()
    })

    it('should handle edge cells correctly', () => {
      gameStore.COLS = 10
      gameStore.grid[1][9] = '#FFFF00' // Bottom right of second row
      
      const style = game.cellStyle(19) // Cell at index 19 (row 1, col 9)
      
      expect(style).toEqual({
        background: '#FFFF00',
        borderColor: '#FFFF00'
      })
    })

    it('should handle coordinate calculation correctly', () => {
      // Test that we can calculate coordinates without errors
      gameStore.COLS = 10
      
      // This should not throw
      expect(() => game.cellStyle(50)).not.toThrow()
      expect(() => game.cellStyle(199)).not.toThrow()
      expect(() => game.cellStyle(0)).not.toThrow()
    })
  })

  describe('Game State Integration', () => {
    it('should interact with game store properly', () => {
      // Test basic interaction with game store
      expect(gameStore.COLS).toBeDefined()
      expect(gameStore.grid).toBeDefined()
      expect(Array.isArray(gameStore.grid)).toBe(true)
    })

    it('should handle grid state changes', () => {
      // Set up some grid state
      gameStore.grid[5][3] = '#FF0000'
      
      const style = game.cellStyle(53) // Row 5, col 3 = 5*10 + 3 = 53
      
      expect(style).toEqual({
        background: '#FF0000',
        borderColor: '#FF0000'
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid cell indices gracefully', () => {
      expect(() => game.cellStyle(-1)).not.toThrow()
      expect(() => game.cellStyle(1000)).not.toThrow()
    })

    it('should handle empty grid gracefully', () => {
      gameStore.grid = []
      
      expect(() => game.cellStyle(0)).not.toThrow()
    })

    it('should handle undefined grid cells', () => {
      // Create a sparse grid
      gameStore.grid = Array(20).fill(null).map(() => [])
      
      expect(() => game.cellStyle(0)).not.toThrow()
    })
  })
})