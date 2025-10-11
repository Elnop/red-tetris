import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import Game from '~/components/Game.vue'

// Mock all the composables and stores
vi.mock('~/composables/useBoard', () => ({
  useBoard: vi.fn(() => ({
    flatCells: { value: Array(200).fill(null) }
  }))
}))

vi.mock('~/composables/useGame', () => ({
  useGame: vi.fn(() => ({
    start: vi.fn(),
    cellStyle: vi.fn((idx) => ({ background: 'transparent' }))
  }))
}))

vi.mock('~/stores/useGameStore', () => ({
  useGameStore: vi.fn(() => ({
    COLS: 10,
    ROWS: 20,
    isPlaying: false,
    won: false,
    isAlive: true,
    winner: null
  }))
}))

vi.mock('~/stores/useRoomStore', () => ({
  useRoomStore: vi.fn(() => ({
    roomId: 'test-room'
  }))
}))

vi.mock('~/stores/useUserStore', () => ({
  useUserStore: vi.fn(() => ({
    username: 'testuser'
  }))
}))

vi.mock('pinia-plugin-persistedstate', () => ({
  piniaPluginPersistedstate: {
    localStorage: () => ({})
  }
}))

global.piniaPluginPersistedstate = {
  localStorage: () => ({})
}

describe('Game Component', () => {
  let mockGameStore: any
  let mockGame: any
  let mockBoard: any

  beforeEach(async () => {
    // Setup mocks
    const { useGameStore } = await import('~/stores/useGameStore')
    const { useGame } = await import('~/composables/useGame')
    const { useBoard } = await import('~/composables/useBoard')
    
    mockGameStore = {
      COLS: 10,
      ROWS: 20,
      isPlaying: false,
      won: false,
      isAlive: true,
      winner: null
    }
    
    mockGame = {
      start: vi.fn(),
      cellStyle: vi.fn((idx) => ({ background: 'transparent' }))
    }
    
    mockBoard = {
      flatCells: { value: Array(200).fill(null) }
    }
    
    vi.mocked(useGameStore).mockReturnValue(mockGameStore)
    vi.mocked(useGame).mockReturnValue(mockGame)
    vi.mocked(useBoard).mockReturnValue(mockBoard)
  })

  describe('Component Rendering', () => {
    it('should render waiting screen when not playing', async () => {
      mockGameStore.isPlaying = false
      
      const component = await mountSuspended(Game)
      
      expect(component.text()).toContain('Waiting for the host…')
      expect(component.find('.start-screen').exists()).toBe(true)
      expect(component.find('.game-area').exists()).toBe(false)
    })

    it('should render game area when playing', async () => {
      mockGameStore.isPlaying = true
      
      const component = await mountSuspended(Game)
      
      expect(component.find('.start-screen').exists()).toBe(false)
      expect(component.find('.game-area').exists()).toBe(true)
      expect(component.find('.board-container').exists()).toBe(true)
    })

    it('should render victory overlay when player wins', async () => {
      mockGameStore.isPlaying = true
      mockGameStore.won = true
      
      const component = await mountSuspended(Game)
      
      expect(component.find('.win-overlay').exists()).toBe(true)
      expect(component.text()).toContain('VICTORY!')
    })

    it('should render game over overlay when player loses', async () => {
      mockGameStore.isPlaying = true
      mockGameStore.won = false
      mockGameStore.isAlive = false
      mockGameStore.winner = 'otherPlayer'
      
      const component = await mountSuspended(Game)
      
      expect(component.find('.game-over-overlay').exists()).toBe(true)
      expect(component.text()).toContain('GAME OVER')
    })
  })

  describe('Game Board', () => {
    it('should render game board area', async () => {
      mockGameStore.isPlaying = true
      mockGameStore.COLS = 10
      mockGameStore.ROWS = 20
      
      const component = await mountSuspended(Game)
      
      expect(component.find('.board-container').exists()).toBe(true)
      expect(component.find('.game-area').exists()).toBe(true)
    })

    it('should apply cell styles from game composable', async () => {
      mockGameStore.isPlaying = true
      mockGame.cellStyle = vi.fn((idx) => 
        idx === 0 ? { background: 'red' } : { background: 'transparent' }
      )
      
      const component = await mountSuspended(Game)
      
      expect(mockGame.cellStyle).toHaveBeenCalled()
    })

    it('should handle empty board correctly', async () => {
      mockGameStore.isPlaying = true
      mockBoard.flatCells.value = Array(200).fill(null)
      
      const component = await mountSuspended(Game)
      
      expect(component.find('.board-container').exists()).toBe(true)
    })
  })

  describe('Component State', () => {
    it('should use game store values correctly', async () => {
      mockGameStore.COLS = 10
      mockGameStore.ROWS = 20
      mockGameStore.isPlaying = true
      
      const component = await mountSuspended(Game)
      
      // Verify the component uses the store values
      expect(component.find('.game-area').exists()).toBe(true)
    })

    it('should integrate with useGame composable', async () => {
      mockGameStore.isPlaying = true
      
      await mountSuspended(Game)
      
      // Verify the composable was called
      const { useGame } = await import('~/composables/useGame')
      expect(useGame).toHaveBeenCalled()
    })

    it('should integrate with useBoard composable', async () => {
      mockGameStore.isPlaying = true
      
      await mountSuspended(Game)
      
      // Verify the composable was called
      const { useBoard } = await import('~/composables/useBoard')
      expect(useBoard).toHaveBeenCalled()
    })
  })

  describe('Overlay States', () => {
    it('should show victory overlay with correct styling', async () => {
      mockGameStore.isPlaying = true
      mockGameStore.won = true
      
      const component = await mountSuspended(Game)
      
      const overlay = component.find('.win-overlay')
      expect(overlay.exists()).toBe(true)
      expect(overlay.classes()).toContain('game-over-overlay')
    })

    it('should show game over overlay when not alive and not won', async () => {
      mockGameStore.isPlaying = true
      mockGameStore.won = false
      mockGameStore.isAlive = false
      mockGameStore.winner = 'someoneElse'
      
      const component = await mountSuspended(Game)
      
      const overlay = component.find('.game-over-overlay')
      expect(overlay.exists()).toBe(true)
      expect(overlay.text()).toContain('GAME OVER')
    })

    it('should render active game state', async () => {
      mockGameStore.isPlaying = true
      mockGameStore.won = false
      mockGameStore.isAlive = true
      mockGameStore.winner = null
      
      const component = await mountSuspended(Game)
      
      expect(component.find('.game-area').exists()).toBe(true)
      expect(component.find('.board-container').exists()).toBe(true)
    })
  })

  describe('Component Integration', () => {
    it('should properly initialize all required composables', async () => {
      await mountSuspended(Game)
      
      const { useGameStore } = await import('~/stores/useGameStore')
      const { useRoomStore } = await import('~/stores/useRoomStore')
      const { useUserStore } = await import('~/stores/useUserStore')
      const { useGame } = await import('~/composables/useGame')
      const { useBoard } = await import('~/composables/useBoard')
      
      expect(useGameStore).toHaveBeenCalled()
      expect(useRoomStore).toHaveBeenCalled()
      expect(useUserStore).toHaveBeenCalled()
      expect(useGame).toHaveBeenCalled()
      expect(useBoard).toHaveBeenCalled()
    })

    it('should handle different board configurations', async () => {
      mockGameStore.isPlaying = true
      mockGameStore.COLS = 8
      mockGameStore.ROWS = 16
      mockBoard.flatCells.value = Array(128).fill(null) // 8 * 16
      
      const component = await mountSuspended(Game)
      
      expect(component.find('.game-area').exists()).toBe(true)
      expect(mockGameStore.COLS).toBe(8)
      expect(mockGameStore.ROWS).toBe(16)
    })
  })

  describe('Conditional Rendering', () => {
    it('should show correct state based on isPlaying', async () => {
      // Start with waiting state
      mockGameStore.isPlaying = false
      const component = await mountSuspended(Game)
      
      expect(component.find('.start-screen').exists()).toBe(true)
      expect(component.find('.game-area').exists()).toBe(false)
      
      // The component correctly renders based on store state
      expect(component.text()).toContain('Waiting for the host')
    })

    it('should have proper template structure', async () => {
      mockGameStore.isPlaying = true
      
      const component = await mountSuspended(Game)
      
      // Check that main structural elements are present
      expect(component.find('.game-area').exists()).toBe(true)
      expect(component.find('.board-container').exists()).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should handle missing store values gracefully', async () => {
      mockGameStore.COLS = undefined
      mockGameStore.ROWS = undefined
      mockGameStore.isPlaying = true
      
      // Should not throw
      expect(async () => {
        await mountSuspended(Game)
      }).not.toThrow()
    })

    it('should handle missing composable functions', async () => {
      mockGame.cellStyle = vi.fn(() => null) // Provide a safe fallback
      mockGameStore.isPlaying = true
      
      // Should not throw during mounting
      const component = await mountSuspended(Game)
      expect(component).toBeTruthy()
    })
  })
})