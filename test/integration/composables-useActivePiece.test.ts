import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useActivePiece } from '~/composables/useActivePiece'
import { useGameStore } from '~/stores/useGameStore'
import type { ActivePiece } from '~/utils/pieces'

// Mock dependencies
vi.mock('pinia-plugin-persistedstate', () => ({
  piniaPluginPersistedstate: {
    localStorage: () => ({})
  }
}))

vi.mock('~/composables/useBoard', () => ({
  useBoard: vi.fn(() => ({
    mergeActiveToGrid: vi.fn(),
    clearLines: vi.fn(),
    serializedGrid: vi.fn(() => ['0', '1', '0'])
  }))
}))

vi.mock('~/composables/socketEmiters', () => ({
  useSocketEmiters: vi.fn(() => ({
    emitGameOver: vi.fn(),
    emitGridUpdate: vi.fn()
  }))
}))

global.piniaPluginPersistedstate = {
  localStorage: () => ({})
}

describe('useActivePiece', () => {
  let gameStore: ReturnType<typeof useGameStore>
  let activePiece: ReturnType<typeof useActivePiece>

  beforeEach(() => {
    setActivePinia(createPinia())
    gameStore = useGameStore()
    activePiece = useActivePiece()
  })

  describe('Basic Functionality', () => {
    it('should provide expected functions', () => {
      expect(typeof activePiece.handleDrop).toBe('function')
      expect(typeof activePiece.getCurrentBaseDropSpeed).toBe('function')
      expect(typeof activePiece.getActivePieceStyle).toBe('function')
      expect(typeof activePiece.hardDrop).toBe('function')
      expect(typeof activePiece.trySpawnNextActivePiece).toBe('function')
      expect(typeof activePiece.tryMoveActivePiece).toBe('function')
    })
  })

  describe('Active Piece Style', () => {
    it('should return style for active piece cell', () => {
      const testPiece: ActivePiece = {
        name: 'O',
        color: '#FFD700',
        rotIndex: 0,
        matrix: [[1, 1, 0, 0], [1, 1, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]
      }
      
      gameStore.setActive(testPiece)
      gameStore.setPosX(0)
      gameStore.setPosY(0)
      
      const style = activePiece.getActivePieceStyle(0)
      
      expect(style).toEqual({
        background: '#FFD700',
        borderColor: '#FFD700'
      })
    })

    it('should return null for non-active piece cell', () => {
      const testPiece: ActivePiece = {
        name: 'O',
        color: '#FFD700',
        rotIndex: 0,
        matrix: [[1, 1, 0, 0], [1, 1, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]
      }
      
      gameStore.setActive(testPiece)
      gameStore.setPosX(0)
      gameStore.setPosY(0)
      
      const style = activePiece.getActivePieceStyle(50)
      
      expect(style).toBeNull()
    })

    it('should return null when no active piece', () => {
      gameStore.setActive(null)
      
      const style = activePiece.getActivePieceStyle(0)
      
      expect(style).toBeNull()
    })
  })

  describe('Drop Speed Calculation', () => {
    it('should return correct speed for level 0', () => {
      gameStore.setIsPlaying(true)
      gameStore.level = 0
      
      const speed = activePiece.getCurrentBaseDropSpeed()
      
      expect(speed).toBe(1000)
    })

    it('should return correct speed for level 10', () => {
      gameStore.setIsPlaying(true)
      gameStore.level = 10
      
      const speed = activePiece.getCurrentBaseDropSpeed()
      
      expect(speed).toBe(180)
    })

    it('should return correct speed for level 20', () => {
      gameStore.setIsPlaying(true)
      gameStore.level = 20
      
      const speed = activePiece.getCurrentBaseDropSpeed()
      
      expect(speed).toBe(40)
    })

    it('should cap at maximum level speed', () => {
      gameStore.setIsPlaying(true)
      gameStore.level = 50 // Beyond maximum
      
      const speed = activePiece.getCurrentBaseDropSpeed()
      expect(speed).toBe(10) // Speed for level 29 (capped)
    })

    it('should return default speed when not playing', () => {
      gameStore.setIsPlaying(false)
      gameStore.level = 10
      
      const speed = activePiece.getCurrentBaseDropSpeed()
      
      expect(speed).toBe(1000)
    })
  })

  describe('Basic Operations', () => {
    it('should handle drop without throwing', () => {
      const testPiece: ActivePiece = {
        name: 'O',
        color: '#FFD700',
        rotIndex: 0,
        matrix: [[1, 1, 0, 0], [1, 1, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]
      }
      
      gameStore.setActive(testPiece)
      gameStore.setIsAlive(true)
      
      expect(() => activePiece.handleDrop()).not.toThrow()
    })

    it('should handle hard drop without throwing', () => {
      const testPiece: ActivePiece = {
        name: 'I',
        color: '#00FFFF',
        rotIndex: 0,
        matrix: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]]
      }
      
      gameStore.setActive(testPiece)
      gameStore.setIsAlive(true)
      
      expect(() => activePiece.hardDrop()).not.toThrow()
    })

    it('should not perform hard drop without active piece', () => {
      gameStore.setActive(null)
      
      expect(() => activePiece.hardDrop()).not.toThrow()
    })

    it('should not perform hard drop when not alive', () => {
      const testPiece: ActivePiece = {
        name: 'T',
        color: '#9932CC',
        rotIndex: 0,
        matrix: [[0, 1, 0, 0], [1, 1, 1, 0], [0, 0, 0, 0], [0, 0, 0, 0]]
      }
      
      gameStore.setActive(testPiece)
      gameStore.setIsAlive(false)
      
      expect(() => activePiece.hardDrop()).not.toThrow()
    })

    it('should handle spawn attempt without throwing', () => {
      // Set up a basic queue
      gameStore.queue = [{
        name: 'T',
        color: '#9932CC',
        rotIndex: 0,
        matrix: [[0, 1, 0, 0], [1, 1, 1, 0], [0, 0, 0, 0], [0, 0, 0, 0]]
      }]
      
      expect(() => activePiece.trySpawnNextActivePiece()).not.toThrow()
    })

    it('should handle empty queue gracefully', () => {
      gameStore.queue = []
      
      expect(() => activePiece.trySpawnNextActivePiece()).not.toThrow()
    })

    it('should expose tryMoveActivePiece function', () => {
      expect(typeof activePiece.tryMoveActivePiece).toBe('function')
      
      // It should be the same as the game store function
      expect(activePiece.tryMoveActivePiece).toBe(gameStore.tryMoveActivePiece)
    })
  })
})