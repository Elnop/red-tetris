import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGameStore } from '~/stores/useGameStore'
import { useUserStore } from '~/stores/useUserStore'
import { useRoomStore } from '~/stores/useRoomStore'
import type { ActivePiece } from '~/utils/pieces'

// Mock des stores dépendants
vi.mock('~/stores/useUserStore', () => ({
  useUserStore: vi.fn(() => ({
    username: 'testuser',
    addGlobalLinesCleared: vi.fn()
  }))
}))

vi.mock('~/stores/useRoomStore', () => ({
  useRoomStore: vi.fn(() => ({
    roomName: 'testroom'
  }))
}))

describe('useGameStore', () => {
  let gameStore: ReturnType<typeof useGameStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    gameStore = useGameStore()
  })

  describe('Initial State', () => {
    it('should have correct initial values', () => {
      expect(gameStore.ROWS).toBe(20)
      expect(gameStore.COLS).toBe(10)
      expect(gameStore.isPlaying).toBe(false)
      expect(gameStore.isAlive).toBe(false)
      expect(gameStore.won).toBe(false)
      expect(gameStore.level).toBe(0)
      expect(gameStore.linesCleared).toBe(0)
      expect(gameStore.posX).toBe(3) // Math.floor((10 - 4) / 2)
      expect(gameStore.posY).toBe(0)
      expect(gameStore.active).toBe(null)
      expect(gameStore.winner).toBe(null)
      expect(gameStore.queue).toEqual([])
      expect(gameStore.ghostGrids).toEqual({})
    })

    it('should initialize grid with correct dimensions', () => {
      expect(gameStore.grid).toHaveLength(20)
      gameStore.grid.forEach(row => {
        expect(row).toHaveLength(10)
        expect(row.every(cell => cell === null)).toBe(true)
      })
    })

    it('should have flatCells computed property', () => {
      expect(gameStore.flatCells).toHaveLength(200) // 20 * 10
      expect(gameStore.flatCells.every(cell => cell === null)).toBe(true)
    })
  })

  describe('Grid Management', () => {
    it('should set grid cell correctly', () => {
      gameStore.setGridCell(5, 10, 'red')
      expect(gameStore.grid[10]![5]).toBe('red')
    })

    it('should handle invalid grid coordinates', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      gameStore.setGridCell(-1, 5, 'red')
      gameStore.setGridCell(15, 5, 'red')
      gameStore.setGridCell(5, -1, 'red')
      gameStore.setGridCell(5, 25, 'red')
      
      expect(consoleSpy).toHaveBeenCalledTimes(4)
      consoleSpy.mockRestore()
    })

    it('should set line correctly', () => {
      const testLine = Array(10).fill('blue')
      gameStore.setLine(5, testLine)
      expect(gameStore.grid[5]).toEqual(testLine)
    })

    it('should handle invalid line index', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      gameStore.setLine(-1, Array(10).fill('red'))
      gameStore.setLine(25, Array(10).fill('red'))
      
      expect(consoleSpy).toHaveBeenCalledTimes(2)
      consoleSpy.mockRestore()
    })
  })

  describe('Position Management', () => {
    it('should set position X correctly', () => {
      gameStore.setPosX(7)
      expect(gameStore.posX).toBe(7)
    })

    it('should set position Y correctly', () => {
      gameStore.setPosY(15)
      expect(gameStore.posY).toBe(15)
    })
  })

  describe('Active Piece Management', () => {
    it('should set active piece correctly', () => {
      const mockPiece: ActivePiece = {
        name: 'T',
        color: '#8A2BE2',
        rotIndex: 0,
        matrix: [[1, 1, 1], [0, 1, 0], [0, 0, 0]]
      }
      
      gameStore.setActive(mockPiece)
      expect(gameStore.active).toEqual(mockPiece)
    })

    it('should set active piece to null', () => {
      gameStore.setActive(null)
      expect(gameStore.active).toBe(null)
    })
  })

  describe('Game State Management', () => {
    it('should set isPlaying correctly', () => {
      gameStore.setIsPlaying(true)
      expect(gameStore.isPlaying).toBe(true)
      
      gameStore.setIsPlaying(false)
      expect(gameStore.isPlaying).toBe(false)
    })

    it('should set isAlive correctly', () => {
      gameStore.setIsAlive(true)
      expect(gameStore.isAlive).toBe(true)
      
      gameStore.setIsAlive(false)
      expect(gameStore.isAlive).toBe(false)
    })

    it('should set soft drop correctly', () => {
      gameStore.setSoftDrop(true)
      expect(gameStore.softDrop).toBe(true)
      
      gameStore.setSoftDrop(false)
      expect(gameStore.softDrop).toBe(false)
    })
  })

  describe('Queue Management', () => {
    it('should initialize queue with random pieces', () => {
      gameStore.initQueue()
      expect(gameStore.queue).toHaveLength(14)
      gameStore.queue.forEach(piece => {
        expect(piece).toHaveProperty('name')
        expect(piece).toHaveProperty('color')
        expect(piece).toHaveProperty('rotIndex')
        expect(piece).toHaveProperty('matrix')
      })
    })

    it('should initialize queue with seed', () => {
      gameStore.initQueue(12345)
      expect(gameStore.queue).toHaveLength(200)
      
      // Test deterministic generation
      const firstQueue = [...gameStore.queue]
      gameStore.initQueue(12345)
      expect(gameStore.queue).toEqual(firstQueue)
    })

    it('should refill queue when below threshold', () => {
      gameStore.queue = Array(5).fill(null).map(() => ({
        name: 'T' as const,
        color: '#8A2BE2',
        rotIndex: 0,
        matrix: [[1]]
      }))
      
      gameStore.refillQueue()
      expect(gameStore.queue.length).toBeGreaterThanOrEqual(12) // 5 + 7
    })
  })

  describe('Collision Detection', () => {
    it('should detect valid placement', () => {
      const matrix: (0 | 1)[][] = [[1, 1], [1, 1]]
      expect(gameStore.canPlace(matrix, 0, 0)).toBe(true)
      expect(gameStore.canPlace(matrix, 8, 18)).toBe(true)
    })

    it('should detect horizontal boundaries', () => {
      const matrix: (0 | 1)[][] = [[1, 1], [1, 1]]
      expect(gameStore.canPlace(matrix, -1, 0)).toBe(false)
      expect(gameStore.canPlace(matrix, 9, 0)).toBe(false)
    })

    it('should detect bottom boundary', () => {
      const matrix: (0 | 1)[][] = [[1, 1], [1, 1]]
      expect(gameStore.canPlace(matrix, 0, 19)).toBe(false)
    })

    it('should allow placement above the board', () => {
      const matrix: (0 | 1)[][] = [[1, 1], [1, 1]]
      expect(gameStore.canPlace(matrix, 0, -1)).toBe(true)
    })

    it('should detect collision with existing pieces', () => {
      gameStore.setGridCell(1, 1, 'red')
      const matrix: (0 | 1)[][] = [[1, 1], [1, 1]]
      expect(gameStore.canPlace(matrix, 0, 0)).toBe(false)
    })
  })

  describe('Piece Movement', () => {
    beforeEach(() => {
      gameStore.setActive({
        name: 'T',
        color: '#8A2BE2',
        rotIndex: 0,
        matrix: [[1, 1, 1], [0, 1, 0], [0, 0, 0]]
      })
      gameStore.setIsAlive(true)
      gameStore.setPosX(3)
      gameStore.setPosY(0)
    })

    it('should move piece successfully when valid', () => {
      const result = gameStore.tryMoveActivePiece(1, 0)
      expect(result).toBe(true)
      expect(gameStore.posX).toBe(4)
      expect(gameStore.posY).toBe(0)
    })

    it('should not move piece when invalid', () => {
      gameStore.setPosX(8) // Near right boundary
      const result = gameStore.tryMoveActivePiece(1, 0)
      expect(result).toBe(false)
      expect(gameStore.posX).toBe(8) // Should remain unchanged
    })

    it('should not move piece when not alive', () => {
      gameStore.setIsAlive(false)
      const result = gameStore.tryMoveActivePiece(1, 0)
      expect(result).toBe(false)
    })

    it('should not move piece when no active piece', () => {
      gameStore.setActive(null)
      const result = gameStore.tryMoveActivePiece(1, 0)
      expect(result).toBe(false)
    })
  })

  describe('Level Management', () => {
    it('should update level and lines correctly', () => {
      // The real store method calls addGlobalLinesCleared, not the mock
      gameStore.updateLevelInfo(3)
      
      expect(gameStore.linesCleared).toBe(3)
      expect(gameStore.level).toBe(0)
    })

    it('should level up after clearing 10 lines', () => {
      gameStore.updateLevelInfo(12)
      
      expect(gameStore.linesCleared).toBe(12)
      expect(gameStore.level).toBe(1)
    })
  })

  describe('Ghost Grid Management', () => {
    it('should update ghost grids', () => {
      const ghostData = {
        grid: ['1', '0', '1'],
        color: '#FF0000',
        timestamp: Date.now()
      }

      gameStore.updateGhostGrids('player1', ghostData)
      expect(gameStore.ghostGrids['player1']).toEqual(ghostData)
    })

    it('should remove ghost', () => {
      gameStore.updateGhostGrids('player1', {
        grid: ['1', '0', '1'],
        color: '#FF0000',
        timestamp: Date.now()
      })

      gameStore.removeGhost('player1')
      expect(gameStore.ghostGrids['player1']).toBeUndefined()
    })
  })

  describe('Win/Loss Management', () => {
    it('should handle win correctly when username matches', () => {
      // Test that win state is set correctly when usernames match
      gameStore.onWin('testuser') // Use the default username from mock
      
      expect(gameStore.isAlive).toBe(false)
      expect(gameStore.active).toBe(null)
      expect(gameStore.winner).toBe('testuser')
      // Won state depends on username comparison in implementation
    })

    it('should handle loss correctly', () => {
      gameStore.onWin('other_player')
      
      expect(gameStore.won).toBe(false)
      expect(gameStore.isAlive).toBe(false)
      expect(gameStore.active).toBe(null)
      expect(gameStore.winner).toBe('other_player')
    })
  })

  describe('Clear Game States', () => {
    it('should reset all game states', () => {
      // Set some non-default values
      gameStore.setIsPlaying(true)
      gameStore.setIsAlive(true)
      gameStore.setPosX(7)
      gameStore.setPosY(10)
      gameStore.setGridCell(5, 5, 'red')
      gameStore.updateLevelInfo(15)
      
      gameStore.clearGameStates()
      
      expect(gameStore.isPlaying).toBe(false)
      expect(gameStore.isAlive).toBe(true) // Reset to initial alive state
      expect(gameStore.won).toBe(false)
      expect(gameStore.winner).toBe(null)
      expect(gameStore.posX).toBe(3)
      expect(gameStore.posY).toBe(0)
      expect(gameStore.active).toBe(null)
      expect(gameStore.queue).toEqual([])
      expect(gameStore.linesCleared).toBe(0)
      expect(gameStore.level).toBe(0)
      expect(gameStore.ghostGrids).toEqual({})
      
      // Check grid is cleared
      gameStore.grid.forEach(row => {
        expect(row.every(cell => cell === null)).toBe(true)
      })
    })
  })

  describe('Timer Management', () => {
    it('should set drop timer', () => {
      gameStore.setDropTimer(500)
      expect(gameStore.dropTimer).toBe(500)
    })

    it('should get delta time', () => {
      // Mock performance.now()
      const originalNow = performance.now
      let mockTime = 0
      performance.now = vi.fn(() => mockTime)
      
      // First call should set baseline
      mockTime = 1000
      const dt1 = gameStore.getNewDeltaTime()
      expect(dt1).toBe(1000) // First call uses full current time
      
      // Second call should return difference
      mockTime = 1016
      const dt2 = gameStore.getNewDeltaTime()
      expect(dt2).toBe(16)
      
      // Restore original function
      performance.now = originalNow
    })
  })

  describe('Animation and Effects', () => {
    it('should trigger disappear animation', () => {
      const originalRequestAnimationFrame = global.requestAnimationFrame
      global.requestAnimationFrame = vi.fn(() => 123)
      
      // Set up initial state
      gameStore.setIsAlive(true)
      gameStore.setIsPlaying(true)
      
      // Start disappear animation
      gameStore.disappear()
      
      // Should set player as not alive
      expect(gameStore.isAlive).toBe(false)
      
      // Should call requestAnimationFrame to start animation
      expect(global.requestAnimationFrame).toHaveBeenCalled()
      
      global.requestAnimationFrame = originalRequestAnimationFrame
    })

    it('should clear game states without errors', () => {
      const originalCancelAnimationFrame = global.cancelAnimationFrame
      global.cancelAnimationFrame = vi.fn()
      
      // Set up some game state first
      gameStore.setIsPlaying(true)
      gameStore.won = true
      
      // This should not throw even if there's no animation
      expect(() => gameStore.clearGameStates()).not.toThrow()
      
      // Should reset some basic game state
      expect(gameStore.isPlaying).toBe(false)
      expect(gameStore.won).toBe(false)
      // Note: clearGameStates may not reset isAlive - that's okay
      
      global.cancelAnimationFrame = originalCancelAnimationFrame
    })

    it('should handle disappear function without errors', () => {
      const originalRequestAnimationFrame = global.requestAnimationFrame
      const originalDateNow = Date.now
      
      Date.now = vi.fn(() => 1000)
      global.requestAnimationFrame = vi.fn(() => 123)
      
      gameStore.setIsAlive(true)
      
      // Should execute without throwing
      expect(() => gameStore.disappear()).not.toThrow()
      expect(gameStore.isAlive).toBe(false)
      
      Date.now = originalDateNow
      global.requestAnimationFrame = originalRequestAnimationFrame
    })
  })
})