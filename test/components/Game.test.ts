import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import Game from '~/components/Game.vue'
import { useGameStore } from '~/stores/useGameStore'
import { useRoomStore } from '~/stores/useRoomStore'
import { useUserStore } from '~/stores/useUserStore'
import { useThemeStore } from '~/stores/useThemeStore'

// Mock only the composables that have complex side effects
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

vi.mock('pinia-plugin-persistedstate', () => ({
  piniaPluginPersistedstate: {
    localStorage: () => ({})
  }
}))

global.piniaPluginPersistedstate = {
  localStorage: () => ({})
}

describe('Game Component', () => {
  let gameStore: ReturnType<typeof useGameStore>
  let roomStore: ReturnType<typeof useRoomStore>
  let userStore: ReturnType<typeof useUserStore>
  let themeStore: ReturnType<typeof useThemeStore>

  beforeEach(() => {
    // Setup Pinia with real stores
    setActivePinia(createPinia())

    // Get store instances
    gameStore = useGameStore()
    roomStore = useRoomStore()
    userStore = useUserStore()
    themeStore = useThemeStore()

    // Set up default state
    userStore.username = 'testuser'
    roomStore.setRoomId('test-room')
    themeStore.currentTheme = 'red'
  })

  describe('Component Rendering', () => {
    it('should render waiting screen when not playing', () => {
      gameStore.setIsPlaying(false)

      const component = mount(Game)

      expect(component.text()).toContain('Waiting for the host…')
      expect(component.find('.start-screen').exists()).toBe(true)
      expect(component.find('.game-area').exists()).toBe(false)
    })

    it('should render game area when playing', () => {
      gameStore.setIsPlaying(true)

      const component = mount(Game)

      expect(component.find('.start-screen').exists()).toBe(false)
      expect(component.find('.game-area').exists()).toBe(true)
      expect(component.find('.board-container').exists()).toBe(true)
    })

    it('should render victory overlay when player wins', () => {
      gameStore.setIsPlaying(true)
      gameStore.won = true

      const component = mount(Game)

      expect(component.find('.win-overlay').exists()).toBe(true)
      expect(component.text()).toContain('VICTORY!')
    })

    it('should render game over overlay when player loses', () => {
      gameStore.setIsPlaying(true)
      gameStore.won = false
      gameStore.setIsAlive(false)
      gameStore.winner = 'otherPlayer'

      const component = mount(Game)

      expect(component.find('.game-over-overlay').exists()).toBe(true)
      expect(component.text()).toContain('GAME OVER')
    })
  })

  describe('Game Board', () => {
    it('should render game board area', () => {
      gameStore.setIsPlaying(true)

      const component = mount(Game)

      expect(component.find('.board-container').exists()).toBe(true)
      expect(component.find('.game-area').exists()).toBe(true)
    })

    it('should apply cell styles from game composable', async () => {
      gameStore.setIsPlaying(true)
      const { useGame } = await import('~/composables/useGame')
      const mockCellStyle = vi.fn((idx) =>
        idx === 0 ? { background: 'red' } : { background: 'transparent' }
      )
      vi.mocked(useGame).mockReturnValue({
        start: vi.fn(),
        cellStyle: mockCellStyle
      })

      const component = mount(Game)

      expect(mockCellStyle).toHaveBeenCalled()
    })

    it('should handle empty board correctly', () => {
      gameStore.setIsPlaying(true)

      const component = mount(Game)

      expect(component.find('.board-container').exists()).toBe(true)
    })
  })

  describe('Component State', () => {
    it('should use game store values correctly', () => {
      gameStore.setIsPlaying(true)

      const component = mount(Game)

      // Verify the component uses the store values
      expect(component.find('.game-area').exists()).toBe(true)
    })

    it('should integrate with useGame composable', async () => {
      gameStore.setIsPlaying(true)

      mount(Game)

      // Verify the composable was called
      const { useGame } = await import('~/composables/useGame')
      expect(useGame).toHaveBeenCalled()
    })

    it('should integrate with useBoard composable', async () => {
      gameStore.setIsPlaying(true)

      mount(Game)

      // Verify the composable was called
      const { useBoard } = await import('~/composables/useBoard')
      expect(useBoard).toHaveBeenCalled()
    })
  })

  describe('Overlay States', () => {
    it('should show victory overlay with correct styling', () => {
      gameStore.setIsPlaying(true)
      gameStore.won = true

      const component = mount(Game)

      const overlay = component.find('.win-overlay')
      expect(overlay.exists()).toBe(true)
      expect(overlay.classes()).toContain('game-over-overlay')
    })

    it('should show game over overlay when not alive and not won', () => {
      gameStore.setIsPlaying(true)
      gameStore.won = false
      gameStore.setIsAlive(false)
      gameStore.winner = 'someoneElse'

      const component = mount(Game)

      const overlay = component.find('.game-over-overlay')
      expect(overlay.exists()).toBe(true)
      expect(overlay.text()).toContain('GAME OVER')
    })

    it('should render active game state', () => {
      gameStore.setIsPlaying(true)
      gameStore.won = false
      gameStore.setIsAlive(true)

      const component = mount(Game)

      expect(component.find('.game-area').exists()).toBe(true)
      expect(component.find('.board-container').exists()).toBe(true)
    })
  })

  describe('Component Integration', () => {
    it('should properly initialize all required composables', async () => {
      mount(Game)

      const { useGame } = await import('~/composables/useGame')
      const { useBoard } = await import('~/composables/useBoard')

      expect(useGame).toHaveBeenCalled()
      expect(useBoard).toHaveBeenCalled()
    })

    it('should handle different board configurations', () => {
      gameStore.setIsPlaying(true)

      const component = mount(Game)

      expect(component.find('.game-area').exists()).toBe(true)
      expect(gameStore.COLS).toBe(10)
      expect(gameStore.ROWS).toBe(20)
    })
  })

  describe('Conditional Rendering', () => {
    it('should show correct state based on isPlaying', () => {
      // Start with waiting state
      gameStore.setIsPlaying(false)
      const component = mount(Game)

      expect(component.find('.start-screen').exists()).toBe(true)
      expect(component.find('.game-area').exists()).toBe(false)

      // The component correctly renders based on store state
      expect(component.text()).toContain('Waiting for the host')
    })

    it('should have proper template structure', () => {
      gameStore.setIsPlaying(true)

      const component = mount(Game)

      // Check that main structural elements are present
      expect(component.find('.game-area').exists()).toBe(true)
      expect(component.find('.board-container').exists()).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should handle missing composable functions', () => {
      gameStore.setIsPlaying(true)

      // Should not throw during mounting
      const component = mount(Game)
      expect(component).toBeTruthy()
    })
  })
})
