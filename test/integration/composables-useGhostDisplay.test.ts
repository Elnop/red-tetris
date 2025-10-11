import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGhosts } from '~/composables/useGhostDisplay'
import { useGameStore } from '~/stores/useGameStore'
import { useUserStore } from '~/stores/useUserStore'
import type { GhostData } from '~/types/game'

// Mock pinia persistence
vi.mock('pinia-plugin-persistedstate', () => ({
  piniaPluginPersistedstate: {
    localStorage: () => ({})
  }
}))

global.piniaPluginPersistedstate = {
  localStorage: () => ({})
}

describe('useGhosts', () => {
  let gameStore: ReturnType<typeof useGameStore>
  let userStore: ReturnType<typeof useUserStore>
  let ghosts: ReturnType<typeof useGhosts>
  let consoleSpy: any

  beforeEach(() => {
    setActivePinia(createPinia())
    gameStore = useGameStore()
    userStore = useUserStore()
    ghosts = useGhosts()
    
    // Mock console.log to avoid output during tests
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleSpy.mockRestore()
  })

  describe('Ghost Style Generation', () => {
    it('should return null when no ghosts present', () => {
      const style = ghosts.getGhostStyle(0)
      expect(style).toBeNull()
    })

    it('should return single ghost style', () => {
      const ghostData: GhostData = {
        grid: ['1', '0', '0'],
        color: '#FF0000',
        timestamp: Date.now()
      }
      
      gameStore.updateGhostGrids('player1', ghostData)
      gameStore.setIsAlive(true)
      
      const style = ghosts.getGhostStyle(0)
      
      expect(style).toEqual({
        opacity: 0.1,
        zIndex: 1,
        background: '#FF0000',
        borderColor: '#FF0000'
      })
    })

    it('should return null for empty ghost grid cell', () => {
      const ghostData: GhostData = {
        grid: ['0', '0', '0'],
        color: '#FF0000',
        timestamp: Date.now()
      }
      
      gameStore.updateGhostGrids('player1', ghostData)
      
      const style = ghosts.getGhostStyle(0)
      expect(style).toBeNull()
    })

    it('should handle white penalty blocks', () => {
      const ghostData: GhostData = {
        grid: ['W', '0', '0'],
        color: '#00FF00',
        timestamp: Date.now()
      }
      
      gameStore.updateGhostGrids('player1', ghostData)
      gameStore.setIsAlive(true)
      
      const style = ghosts.getGhostStyle(0)
      
      expect(style).toEqual({
        opacity: 0.1,
        zIndex: 1,
        background: '#00FF00',
        borderColor: '#00FF00'
      })
    })

    it('should increase opacity when player is dead', () => {
      const ghostData: GhostData = {
        grid: ['1', '0', '0'],
        color: '#FF0000',
        timestamp: Date.now()
      }
      
      gameStore.updateGhostGrids('player1', ghostData)
      gameStore.setIsAlive(false)
      
      const style = ghosts.getGhostStyle(0)
      
      expect(style?.opacity).toBe(0.4)
    })

    it('should create multi-ghost gradient style', () => {
      const ghost1: GhostData = {
        grid: ['1', '0', '0'],
        color: '#FF0000',
        timestamp: Date.now() - 100
      }
      
      const ghost2: GhostData = {
        grid: ['1', '0', '0'],
        color: '#00FF00',
        timestamp: Date.now()
      }
      
      gameStore.updateGhostGrids('player1', ghost1)
      gameStore.updateGhostGrids('player2', ghost2)
      gameStore.setIsAlive(true)
      
      const style = ghosts.getGhostStyle(0)
      
      expect(style).toHaveProperty('background')
      expect(style?.background).toContain('linear-gradient')
      expect(style?.background).toContain('#FF0000')
      expect(style?.background).toContain('#00FF00')
      expect(style?.borderColor).toBe('#00FF00') // Last ghost color
      expect(style?.opacity).toBe(0.1)
      expect(style?.zIndex).toBe(1)
    })

    it('should sort ghosts by timestamp for consistent layering', () => {
      const laterGhost: GhostData = {
        grid: ['1', '0', '0'],
        color: '#FF0000',
        timestamp: Date.now() + 100
      }
      
      const earlierGhost: GhostData = {
        grid: ['1', '0', '0'],
        color: '#00FF00',
        timestamp: Date.now() - 100
      }
      
      gameStore.updateGhostGrids('player1', laterGhost)
      gameStore.updateGhostGrids('player2', earlierGhost)
      
      const style = ghosts.getGhostStyle(0)
      
      // Border color should be from the latest ghost (laterGhost)
      expect(style?.borderColor).toBe('#FF0000')
    })

    it('should use default color for ghosts without color', () => {
      const ghostData: GhostData = {
        grid: ['1', '0', '0'],
        color: '',
        timestamp: Date.now()
      }
      
      gameStore.updateGhostGrids('player1', ghostData)
      gameStore.setIsAlive(true)
      
      const style = ghosts.getGhostStyle(0)
      
      expect(style?.background).toBe('#888888')
      expect(style?.borderColor).toBe('#888888')
    })
  })

  describe('Ghost Data Handling', () => {
    it('should handle ghost payload from other players', () => {
      userStore.username = 'currentPlayer'
      
      const payload = {
        username: 'otherPlayer',
        grid: ['1', '0', '1'],
        color: '#0000FF'
      }
      
      ghosts.onGhost(payload)
      
      expect(gameStore.ghostGrids['otherPlayer']).toBeDefined()
      expect(gameStore.ghostGrids['otherPlayer']!.grid).toEqual(['1', '0', '1'])
      expect(gameStore.ghostGrids['otherPlayer']!.color).toBe('#0000FF')
      expect(gameStore.ghostGrids['otherPlayer']!.timestamp).toBeDefined()
    })

    it('should ignore ghost payload from own player', () => {
      userStore.username = 'currentPlayer'
      
      const payload = {
        username: 'currentPlayer',
        grid: ['1', '0', '1'],
        color: '#0000FF'
      }
      
      ghosts.onGhost(payload)
      
      expect(gameStore.ghostGrids['currentPlayer']).toBeUndefined()
    })

    it('should handle ghost payload without color', () => {
      userStore.username = 'currentPlayer'
      
      const payload = {
        username: 'otherPlayer',
        grid: ['1', '0', '1'],
        color: ''
      }
      
      ghosts.onGhost(payload)

      expect(gameStore.ghostGrids['otherPlayer']!.color).toBe('#888')
    })

    it('should update existing ghost data', () => {
      userStore.username = 'currentPlayer'
      
      const payload1 = {
        username: 'otherPlayer',
        grid: ['1', '0', '0'],
        color: '#FF0000'
      }
      
      const payload2 = {
        username: 'otherPlayer',
        grid: ['0', '1', '0'],
        color: '#00FF00'
      }
      
      ghosts.onGhost(payload1)
      ghosts.onGhost(payload2)
      
      // Should have updated data from second payload
      expect(gameStore.ghostGrids['otherPlayer']!.grid).toEqual(['0', '1', '0'])
      expect(gameStore.ghostGrids['otherPlayer']!.color).toBe('#00FF00')
    })
  })

  describe('Utility Functions', () => {
    it('should correctly identify own ghost', () => {
      userStore.username = 'testPlayer'
      
      // Access the internal function through the composable
      const payload1 = { username: 'testPlayer', grid: [], color: '' }
      const payload2 = { username: 'otherPlayer', grid: [], color: '' }
      
      ghosts.onGhost(payload1) // Should be ignored
      ghosts.onGhost(payload2) // Should be processed
      
      expect(gameStore.ghostGrids['testPlayer']).toBeUndefined()
      expect(gameStore.ghostGrids['otherPlayer']).toBeDefined()
    })

    it('should handle null username in userStore', () => {
      userStore.username = null
      
      const payload = {
        username: 'otherPlayer',
        grid: ['1'],
        color: '#FF0000'
      }
      
      // Should not throw error
      expect(() => ghosts.onGhost(payload)).not.toThrow()
      expect(gameStore.ghostGrids['otherPlayer']).toBeDefined()
    })
  })

  describe('Edge Cases', () => {
    it('should handle invalid grid values', () => {
      const ghostData: GhostData = {
        grid: [null as any, undefined as any, '1'],
        color: '#FF0000',
        timestamp: Date.now()
      }
      
      gameStore.updateGhostGrids('player1', ghostData)
      
      const style0 = ghosts.getGhostStyle(0) // null value
      const style1 = ghosts.getGhostStyle(1) // undefined value
      const style2 = ghosts.getGhostStyle(2) // valid '1' value
      
      expect(style0).toBeNull()
      expect(style1).toBeNull()
      expect(style2).not.toBeNull()
    })

    it('should handle empty ghost grid', () => {
      const ghostData: GhostData = {
        grid: [],
        color: '#FF0000',
        timestamp: Date.now()
      }
      
      gameStore.updateGhostGrids('player1', ghostData)
      
      const style = ghosts.getGhostStyle(0)
      expect(style).toBeNull()
    })

    it('should handle ghosts with missing grid property', () => {
      const ghostData = {
        color: '#FF0000',
        timestamp: Date.now()
      } as GhostData
      
      gameStore.updateGhostGrids('player1', ghostData)
      
      const style = ghosts.getGhostStyle(0)
      expect(style).toBeNull()
    })

    it('should handle whitespace in grid values', () => {
      const ghostData: GhostData = {
        grid: [' 1 ', '  0  ', 'W '],
        color: '#FF0000',
        timestamp: Date.now()
      }
      
      gameStore.updateGhostGrids('player1', ghostData)
      gameStore.setIsAlive(true)
      
      const style0 = ghosts.getGhostStyle(0) // ' 1 ' should be treated as '1'
      const style1 = ghosts.getGhostStyle(1) // '  0  ' should be treated as '0'
      const style2 = ghosts.getGhostStyle(2) // 'W ' should be treated as 'W'
      
      expect(style0).not.toBeNull()
      expect(style1).toBeNull()
      expect(style2).not.toBeNull()
    })
  })
})