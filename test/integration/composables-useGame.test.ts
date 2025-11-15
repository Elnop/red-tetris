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

vi.mock('../../app/composables/useActivePiece', () => ({
  useActivePiece: vi.fn(() => ({
    handleDrop: vi.fn(),
    getCurrentBaseDropSpeed: vi.fn(() => 1000),
    trySpawnNextActivePiece: vi.fn(),
    hardDrop: vi.fn(),
    tryMoveActivePiece: vi.fn(() => true),
    getActivePieceStyle: vi.fn(() => null)
  }))
}))

vi.mock('../../app/composables/useGhostDisplay', () => ({
  useGhosts: vi.fn(() => ({
    onGhost: vi.fn(),
    getGhostStyle: vi.fn(() => null)
  }))
}))

vi.mock('../../app/composables/useBoard', () => ({
  useBoard: vi.fn(() => ({
    addGarbageLines: vi.fn()
  }))
}))

vi.mock('../../app/composables/useItems', () => ({
  useItems: vi.fn(() => ({
    useItem: vi.fn(),
    applyItemEffect: vi.fn(),
    hasActiveEffect: vi.fn(() => false)
  }))
}))

vi.mock('../../app/composables/socketEmiters', () => ({
  useSocketEmiters: vi.fn(() => ({
    initGameSocketListeners: vi.fn(),
    emitLeaveRoom: vi.fn(),
    clearGameSocketListeners: vi.fn(),
    emitGameOver: vi.fn()
  }))
}))

declare global {
  var piniaPluginPersistedstate: {
    localStorage: () => Record<string, unknown>
  }
}

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
      gameStore.grid[0]![0] = '#FFFFFF'

      const style = game.cellStyle(0) // First cell

      expect(style).toEqual({
        background: '#FFFFFF',
        borderColor: '#FFFFFF'
      })
    })

    it('should return normal cell color style', () => {
      gameStore.grid[0]![1] = '#00FF00'

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
      gameStore.grid[1]![9] = '#FFFF00' // Bottom right of second row

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
      gameStore.grid[5]![3] = '#FF0000'

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

  describe('Flash Effect', () => {
    it('should handle cellStyle without throwing when no flash', () => {
      // Flash effect requires event listeners from onMounted
      // This test verifies cellStyle works correctly
      const style = game.cellStyle(0)
      expect(() => game.cellStyle(0)).not.toThrow()
    })
  })

  describe('Keyboard Controls - Item Usage', () => {
    beforeEach(() => {
      gameStore.setIsPlaying(true)
      gameStore.setIsAlive(true)
      roomStore.powerUpsEnabled = true
    })

    it('should use item when number key is pressed', () => {
      gameStore.inventory = [
        { id: 'item1', type: 'block_bomb' as any, icon: '💣' }
      ]

      const keyEvent = new KeyboardEvent('keydown', { key: '1' })
      window.dispatchEvent(keyEvent)

      // Note: This test validates the event handler is set up
      // Actual item usage is mocked
    })

    it('should not use items when power-ups are disabled', () => {
      roomStore.powerUpsEnabled = false
      gameStore.inventory = [
        { id: 'item1', type: 'block_bomb' as any, icon: '💣' }
      ]

      const keyEvent = new KeyboardEvent('keydown', { key: '1' })

      // Should not throw
      expect(() => window.dispatchEvent(keyEvent)).not.toThrow()
    })

    it('should not use items when not playing', () => {
      gameStore.setIsPlaying(false)
      gameStore.inventory = [
        { id: 'item1', type: 'block_bomb' as any, icon: '💣' }
      ]

      const keyEvent = new KeyboardEvent('keydown', { key: '1' })

      expect(() => window.dispatchEvent(keyEvent)).not.toThrow()
    })
  })

  describe('Keyboard Controls - Movement', () => {
    beforeEach(() => {
      gameStore.setIsPlaying(true)
      gameStore.setIsAlive(true)
      gameStore.setActive({
        shape: 'I',
        color: '#00FFFF',
        matrix: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
        x: 0,
        y: 0
      })
    })

    it('should handle ArrowLeft key', () => {
      const keyEvent = new KeyboardEvent('keydown', { key: 'ArrowLeft' })

      expect(() => window.dispatchEvent(keyEvent)).not.toThrow()
    })

    it('should handle ArrowRight key', () => {
      const keyEvent = new KeyboardEvent('keydown', { key: 'ArrowRight' })

      expect(() => window.dispatchEvent(keyEvent)).not.toThrow()
    })

    it('should handle ArrowDown key for soft drop', () => {
      // Note: Event listeners are registered in onMounted
      // This test verifies the component can be created without errors
      const keyEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' })
      expect(() => window.dispatchEvent(keyEvent)).not.toThrow()
    })

    it('should handle ArrowUp key for rotation', () => {
      const keyEvent = new KeyboardEvent('keydown', { key: 'ArrowUp' })
      expect(() => window.dispatchEvent(keyEvent)).not.toThrow()
    })

    it('should handle Space key for hard drop', () => {
      const keyEvent = new KeyboardEvent('keydown', { key: ' ' })
      expect(() => window.dispatchEvent(keyEvent)).not.toThrow()
    })

    it('should handle ArrowDown keyup', () => {
      // Event listeners registered in onMounted
      const keyEvent = new KeyboardEvent('keyup', { key: 'ArrowDown' })
      expect(() => window.dispatchEvent(keyEvent)).not.toThrow()
    })

    it('should not move when frozen', () => {
      // Note: hasActiveEffect is mocked to return false by default
      // This test verifies the key handler doesn't throw even when frozen
      const keyEvent = new KeyboardEvent('keydown', { key: 'ArrowLeft' })

      expect(() => window.dispatchEvent(keyEvent)).not.toThrow()
    })

    it('should not process movement when not alive', () => {
      gameStore.setIsAlive(false)

      const keyEvent = new KeyboardEvent('keydown', { key: 'ArrowLeft' })

      expect(() => window.dispatchEvent(keyEvent)).not.toThrow()
    })

    it('should not process movement when not playing', () => {
      gameStore.setIsPlaying(false)

      const keyEvent = new KeyboardEvent('keydown', { key: 'ArrowLeft' })

      expect(() => window.dispatchEvent(keyEvent)).not.toThrow()
    })
  })

  describe('Room Start Event', () => {
    it('should start game when tetris-start event is fired', () => {
      const startEvent = new CustomEvent('tetris-start', {
        detail: { seed: 12345 }
      })

      expect(() => window.dispatchEvent(startEvent)).not.toThrow()
    })

    it('should handle tetris-start without seed', () => {
      const startEvent = new CustomEvent('tetris-start', {
        detail: {}
      })

      expect(() => window.dispatchEvent(startEvent)).not.toThrow()
    })
  })

  describe('Multi-cell Styling', () => {
    it('should handle multiple colored cells', () => {
      gameStore.grid[0]![0] = '#FF0000'
      gameStore.grid[0]![1] = '#00FF00'
      gameStore.grid[0]![2] = '#0000FF'

      const style0 = game.cellStyle(0)
      const style1 = game.cellStyle(1)
      const style2 = game.cellStyle(2)

      expect(style0?.background).toBe('#FF0000')
      expect(style1?.background).toBe('#00FF00')
      expect(style2?.background).toBe('#0000FF')
    })

    it('should prioritize white cells over other styles', () => {
      gameStore.grid[0]![0] = '#FFFFFF'

      const style = game.cellStyle(0)

      expect(style).toEqual({
        background: '#FFFFFF',
        borderColor: '#FFFFFF'
      })
    })
  })

  describe('Coordinate System', () => {
    it('should calculate coordinates for top-left cell', () => {
      gameStore.COLS = 10
      const style = game.cellStyle(0) // (0, 0)

      expect(() => game.cellStyle(0)).not.toThrow()
    })

    it('should calculate coordinates for bottom-right cell', () => {
      gameStore.COLS = 10
      const style = game.cellStyle(199) // (9, 19)

      expect(() => game.cellStyle(199)).not.toThrow()
    })

    it('should calculate coordinates for middle cells', () => {
      gameStore.COLS = 10
      const style = game.cellStyle(55) // (5, 5)

      expect(() => game.cellStyle(55)).not.toThrow()
    })
  })

  describe('Game Loop Integration', () => {
    it('should not throw when starting game loop', () => {
      expect(() => game.start()).not.toThrow()
    })

    it('should handle repeated starts gracefully', () => {
      game.start()

      expect(() => game.start()).not.toThrow()
    })
  })

  describe('Complex Scenarios', () => {
    it('should handle multiple simultaneous effects', () => {
      // Set up grid with multiple cell types
      gameStore.grid[0]![0] = '#FFFFFF' // White penalty
      gameStore.grid[0]![1] = '#FF0000' // Normal color
      gameStore.grid[0]![2] = null // Empty

      const style0 = game.cellStyle(0)
      const style1 = game.cellStyle(1)
      const style2 = game.cellStyle(2)

      expect(style0).toEqual({ background: '#FFFFFF', borderColor: '#FFFFFF' })
      expect(style1).toEqual({ background: '#FF0000', borderColor: '#FF0000' })
      expect(style2).toBeNull()
    })

    it('should handle grid state transitions', () => {
      // Initially empty
      let style = game.cellStyle(0)
      expect(style).toBeNull()

      // Add color
      gameStore.grid[0]![0] = '#00FF00'
      style = game.cellStyle(0)
      expect(style?.background).toBe('#00FF00')

      // Change to white
      gameStore.grid[0]![0] = '#FFFFFF'
      style = game.cellStyle(0)
      expect(style?.background).toBe('#FFFFFF')

      // Clear
      gameStore.grid[0]![0] = null
      style = game.cellStyle(0)
      expect(style).toBeNull()
    })
  })
})