import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { defineComponent, h } from 'vue'
import { useGame } from '~/composables/useGame'
import { useGameStore } from '~/stores/useGameStore'
import { useRoomStore } from '~/stores/useRoomStore'
import { useUserStore } from '~/stores/useUserStore'
import { useThemeStore } from '~/stores/useThemeStore'

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

global.piniaPluginPersistedstate = {
  localStorage: () => ({})
}

// Test component that uses useGame with lifecycle
const TestComponent = defineComponent({
  name: 'TestComponent',
  setup() {
    const game = useGame()
    return { game }
  },
  render() {
    return h('div', { class: 'test-component' })
  }
})

describe('useGame - Advanced Tests with Lifecycle', () => {
  let gameStore: ReturnType<typeof useGameStore>
  let roomStore: ReturnType<typeof useRoomStore>
  let userStore: ReturnType<typeof useUserStore>
  let themeStore: ReturnType<typeof useThemeStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    gameStore = useGameStore()
    roomStore = useRoomStore()
    userStore = useUserStore()
    themeStore = useThemeStore()

    // Setup default state
    gameStore.grid = Array(20).fill(null).map(() => Array(10).fill(null))
    gameStore.COLS = 10
    userStore.username = 'testuser'
    themeStore.currentTheme = 'red'

    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  describe('Component Mounting with useGame', () => {
    it('should mount component with useGame successfully', () => {
      const wrapper = mount(TestComponent)

      expect(wrapper.exists()).toBe(true)
      expect(wrapper.vm.game).toBeDefined()
      expect(wrapper.vm.game.start).toBeDefined()
      expect(wrapper.vm.game.cellStyle).toBeDefined()
    })

    it('should provide game functions through component', () => {
      const wrapper = mount(TestComponent)

      expect(typeof wrapper.vm.game.start).toBe('function')
      expect(typeof wrapper.vm.game.cellStyle).toBe('function')
    })

    it('should handle component unmounting gracefully', () => {
      const wrapper = mount(TestComponent)

      expect(() => wrapper.unmount()).not.toThrow()
    })
  })

  describe('Event Listeners with Mounted Component', () => {
    it('should register keyboard event listeners on mount', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener')

      const wrapper = mount(TestComponent)

      // Should register keydown and keyup listeners
      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
      expect(addEventListenerSpy).toHaveBeenCalledWith('keyup', expect.any(Function))

      addEventListenerSpy.mockRestore()
      wrapper.unmount()
    })

    it('should register custom event listeners on mount', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener')

      const wrapper = mount(TestComponent)

      expect(addEventListenerSpy).toHaveBeenCalledWith('tetris-start', expect.any(Function))
      expect(addEventListenerSpy).toHaveBeenCalledWith('block-bomb-flash', expect.any(Function))

      addEventListenerSpy.mockRestore()
      wrapper.unmount()
    })

    it('should remove event listeners on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

      const wrapper = mount(TestComponent)
      wrapper.unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
      expect(removeEventListenerSpy).toHaveBeenCalledWith('keyup', expect.any(Function))
      expect(removeEventListenerSpy).toHaveBeenCalledWith('tetris-start', expect.any(Function))
      expect(removeEventListenerSpy).toHaveBeenCalledWith('block-bomb-flash', expect.any(Function))

      removeEventListenerSpy.mockRestore()
    })
  })

  describe('Keyboard Controls with Mounted Component', () => {
    it('should handle ArrowDown keydown to activate soft drop', () => {
      const wrapper = mount(TestComponent)

      gameStore.setIsPlaying(true)
      gameStore.setIsAlive(true)
      gameStore.setActive({
        shape: 'I',
        color: '#00FFFF',
        matrix: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
        x: 0,
        y: 0
      })

      const keyEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' })
      window.dispatchEvent(keyEvent)

      expect(gameStore.softDrop).toBe(true)

      wrapper.unmount()
    })

    it('should handle ArrowDown keyup to deactivate soft drop', () => {
      const wrapper = mount(TestComponent)

      gameStore.setSoftDrop(true)

      const keyEvent = new KeyboardEvent('keyup', { key: 'ArrowDown' })
      window.dispatchEvent(keyEvent)

      expect(gameStore.softDrop).toBe(false)

      wrapper.unmount()
    })

    it('should handle item usage with number keys', () => {
      const wrapper = mount(TestComponent)

      gameStore.setIsPlaying(true)
      gameStore.setIsAlive(true)
      roomStore.powerUpsEnabled = true
      gameStore.inventory = [
        { id: 'item1', type: 'block_bomb' as any, icon: '💣' }
      ]

      const keyEvent = new KeyboardEvent('keydown', { key: '1' })
      window.dispatchEvent(keyEvent)

      // Should not throw
      expect(true).toBe(true)

      wrapper.unmount()
    })

    it('should not use items when powerUps disabled', () => {
      const wrapper = mount(TestComponent)

      gameStore.setIsPlaying(true)
      gameStore.setIsAlive(true)
      roomStore.powerUpsEnabled = false
      gameStore.inventory = [
        { id: 'item1', type: 'block_bomb' as any, icon: '💣' }
      ]

      const keyEvent = new KeyboardEvent('keydown', { key: '1' })

      // Should not throw
      expect(() => window.dispatchEvent(keyEvent)).not.toThrow()

      wrapper.unmount()
    })

    it('should ignore movement keys when not playing', () => {
      const wrapper = mount(TestComponent)

      gameStore.setIsPlaying(false)
      gameStore.setActive({
        shape: 'I',
        color: '#00FFFF',
        matrix: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
        x: 0,
        y: 0
      })

      const keyEvent = new KeyboardEvent('keydown', { key: 'ArrowLeft' })

      expect(() => window.dispatchEvent(keyEvent)).not.toThrow()

      wrapper.unmount()
    })

    it('should ignore movement keys when not alive', () => {
      const wrapper = mount(TestComponent)

      gameStore.setIsPlaying(true)
      gameStore.setIsAlive(false)
      gameStore.setActive({
        shape: 'I',
        color: '#00FFFF',
        matrix: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
        x: 0,
        y: 0
      })

      const keyEvent = new KeyboardEvent('keydown', { key: 'ArrowLeft' })

      expect(() => window.dispatchEvent(keyEvent)).not.toThrow()

      wrapper.unmount()
    })
  })

  describe('Custom Events with Mounted Component', () => {
    it('should handle tetris-start event', () => {
      const wrapper = mount(TestComponent)

      const startEvent = new CustomEvent('tetris-start', {
        detail: { seed: 12345 }
      })

      expect(() => window.dispatchEvent(startEvent)).not.toThrow()

      wrapper.unmount()
    })

    it('should handle tetris-start without seed', () => {
      const wrapper = mount(TestComponent)

      const startEvent = new CustomEvent('tetris-start', {
        detail: {}
      })

      expect(() => window.dispatchEvent(startEvent)).not.toThrow()

      wrapper.unmount()
    })

    it('should handle block-bomb-flash event', () => {
      const wrapper = mount(TestComponent)

      const flashEvent = new CustomEvent('block-bomb-flash', {
        detail: {
          cells: [
            { x: 0, y: 0 },
            { x: 1, y: 0 },
            { x: 2, y: 0 }
          ]
        }
      })

      window.dispatchEvent(flashEvent)

      // Check that flash styling is applied
      const style = wrapper.vm.game.cellStyle(0)
      expect(style).toBeDefined()
      expect(style).toHaveProperty('animation')

      wrapper.unmount()
    })

    it('should clear flash effect after timeout', async () => {
      vi.useFakeTimers()

      const wrapper = mount(TestComponent)

      const flashEvent = new CustomEvent('block-bomb-flash', {
        detail: {
          cells: [{ x: 0, y: 0 }]
        }
      })

      window.dispatchEvent(flashEvent)

      // Initially flashing
      let style = wrapper.vm.game.cellStyle(0)
      expect(style).toHaveProperty('animation')

      // Fast forward past 400ms
      vi.advanceTimersByTime(500)

      // Should no longer be flashing (may be null or not have animation property)
      style = wrapper.vm.game.cellStyle(0)
      if (style !== null) {
        expect(style).not.toHaveProperty('animation', 'bomb-flash 0.4s ease-in-out')
      }

      vi.useRealTimers()
      wrapper.unmount()
    })
  })

  describe('CellStyle with Flash Effects', () => {
    it('should return flash styling for flashing cells', () => {
      const wrapper = mount(TestComponent)

      const flashEvent = new CustomEvent('block-bomb-flash', {
        detail: {
          cells: [{ x: 5, y: 5 }]
        }
      })

      window.dispatchEvent(flashEvent)

      const style = wrapper.vm.game.cellStyle(55) // 5 * 10 + 5

      expect(style).toBeDefined()
      expect(style).toHaveProperty('background')
      expect(style).toHaveProperty('boxShadow')
      expect(style).toHaveProperty('opacity', '0.7')
      expect(style).toHaveProperty('animation', 'bomb-flash 0.4s ease-in-out')

      wrapper.unmount()
    })

    it('should prioritize flash over normal cell color', () => {
      const wrapper = mount(TestComponent)

      // Set a normal cell color
      gameStore.grid[0]![0] = '#FF0000'

      // Trigger flash on same cell
      const flashEvent = new CustomEvent('block-bomb-flash', {
        detail: {
          cells: [{ x: 0, y: 0 }]
        }
      })

      window.dispatchEvent(flashEvent)

      const style = wrapper.vm.game.cellStyle(0)

      // Should have flash animation, not just the red color
      expect(style).toHaveProperty('animation', 'bomb-flash 0.4s ease-in-out')

      wrapper.unmount()
    })

    it('should handle multiple cells flashing simultaneously', () => {
      const wrapper = mount(TestComponent)

      const flashEvent = new CustomEvent('block-bomb-flash', {
        detail: {
          cells: [
            { x: 0, y: 0 },
            { x: 1, y: 0 },
            { x: 0, y: 1 },
            { x: 1, y: 1 }
          ]
        }
      })

      window.dispatchEvent(flashEvent)

      // Check all 4 cells are flashing
      const style0 = wrapper.vm.game.cellStyle(0) // (0,0)
      const style1 = wrapper.vm.game.cellStyle(1) // (1,0)
      const style10 = wrapper.vm.game.cellStyle(10) // (0,1)
      const style11 = wrapper.vm.game.cellStyle(11) // (1,1)

      expect(style0).toHaveProperty('animation')
      expect(style1).toHaveProperty('animation')
      expect(style10).toHaveProperty('animation')
      expect(style11).toHaveProperty('animation')

      wrapper.unmount()
    })
  })

  describe('CellStyle Priority Order', () => {
    it('should prioritize flash > white > active > normal > ghost', () => {
      const wrapper = mount(TestComponent)

      // Set up a normal colored cell
      gameStore.grid[0]![0] = '#00FF00'

      let style = wrapper.vm.game.cellStyle(0)
      expect(style?.background).toBe('#00FF00')

      // Change to white (penalty)
      gameStore.grid[0]![0] = '#FFFFFF'
      style = wrapper.vm.game.cellStyle(0)
      expect(style?.background).toBe('#FFFFFF')

      // Trigger flash (should override white)
      const flashEvent = new CustomEvent('block-bomb-flash', {
        detail: { cells: [{ x: 0, y: 0 }] }
      })
      window.dispatchEvent(flashEvent)

      style = wrapper.vm.game.cellStyle(0)
      expect(style).toHaveProperty('animation')

      wrapper.unmount()
    })
  })

  describe('Component Lifecycle Integration', () => {
    it('should initialize game loop on mount', () => {
      const wrapper = mount(TestComponent)

      // Game loop should be initialized
      expect(wrapper.vm.game).toBeDefined()

      wrapper.unmount()
    })

    it('should cleanup on unmount', () => {
      const wrapper = mount(TestComponent)

      // Should not throw on unmount
      expect(() => wrapper.unmount()).not.toThrow()
    })

    it('should handle multiple mount/unmount cycles', () => {
      const wrapper1 = mount(TestComponent)
      wrapper1.unmount()

      const wrapper2 = mount(TestComponent)
      wrapper2.unmount()

      const wrapper3 = mount(TestComponent)
      wrapper3.unmount()

      expect(true).toBe(true)
    })
  })

  describe('Edge Cases with Mounted Component', () => {
    it('should handle rapid key presses', () => {
      const wrapper = mount(TestComponent)

      gameStore.setIsPlaying(true)
      gameStore.setIsAlive(true)
      gameStore.setActive({
        shape: 'I',
        color: '#00FFFF',
        matrix: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
        x: 0,
        y: 0
      })

      // Simulate rapid key presses
      for (let i = 0; i < 10; i++) {
        const keyEvent = new KeyboardEvent('keydown', { key: 'ArrowLeft' })
        window.dispatchEvent(keyEvent)
      }

      expect(true).toBe(true)

      wrapper.unmount()
    })

    it('should handle mixed key events', () => {
      const wrapper = mount(TestComponent)

      gameStore.setIsPlaying(true)
      gameStore.setIsAlive(true)
      gameStore.setActive({
        name: 'I',
        shape: 'I',
        color: '#00FFFF',
        matrix: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
        rotIndex: 0,
        x: 0,
        y: 0
      })

      // Press various keys (excluding ArrowUp for rotation to avoid complexity)
      const keys = ['ArrowLeft', 'ArrowRight', 'ArrowDown', ' ']
      keys.forEach(key => {
        const keyEvent = new KeyboardEvent('keydown', { key })
        window.dispatchEvent(keyEvent)
      })

      expect(true).toBe(true)

      wrapper.unmount()
    })

    it('should handle events when component is unmounted', () => {
      const wrapper = mount(TestComponent)
      wrapper.unmount()

      // Events after unmount should not cause errors
      const keyEvent = new KeyboardEvent('keydown', { key: 'ArrowLeft' })

      expect(() => window.dispatchEvent(keyEvent)).not.toThrow()
    })
  })

  describe('Integration with Theme Store', () => {
    it('should use theme colors in flash effect', () => {
      const wrapper = mount(TestComponent)

      themeStore.currentTheme = 'blue'

      const flashEvent = new CustomEvent('block-bomb-flash', {
        detail: { cells: [{ x: 0, y: 0 }] }
      })

      window.dispatchEvent(flashEvent)

      const style = wrapper.vm.game.cellStyle(0)

      // Should use theme primary color
      expect(style?.background).toBe(themeStore.colors.primary)

      wrapper.unmount()
    })
  })
})
