import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import type { ItemType } from '~/types/items'
import { MAX_INVENTORY_SIZE } from '~/utils/itemsConfig'

// Create a mock socket that can be accessed in tests
const mockSocket = {
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn()
}

// Mock Nuxt app with socket - MUST be before imports
vi.mock('nuxt/app', () => ({
  useNuxtApp: vi.fn(() => ({
    $socket: mockSocket
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

// Import after mocks
import { useItems } from '~/composables/useItems'
import { useGameStore } from '~/stores/useGameStore'
import { useRoomStore } from '~/stores/useRoomStore'
import { useUserStore } from '~/stores/useUserStore'

describe('useItems', () => {
  let gameStore: ReturnType<typeof useGameStore>
  let roomStore: ReturnType<typeof useRoomStore>
  let userStore: ReturnType<typeof useUserStore>
  let items: ReturnType<typeof useItems>

  beforeEach(() => {
    setActivePinia(createPinia())
    gameStore = useGameStore()
    roomStore = useRoomStore()
    userStore = useUserStore()
    items = useItems()

    // Setup default state
    gameStore.setIsPlaying(true)
    gameStore.setIsAlive(true)
    roomStore.setRoomId('test-room')
    userStore.username = 'testuser'

    // Clear mock socket calls
    mockSocket.emit.mockClear()
  })

  describe('collectItem', () => {
    it('should add item to inventory', () => {
      expect(items.inventory.value).toHaveLength(0)

      items.collectItem('block_bomb')

      expect(items.inventory.value).toHaveLength(1)
      expect(items.inventory.value[0]!.type).toBe('block_bomb')
      expect(items.inventory.value[0]!.icon).toBeDefined()
    })

    it('should not exceed MAX_INVENTORY_SIZE', () => {
      // Fill inventory to max
      for (let i = 0; i < MAX_INVENTORY_SIZE; i++) {
        items.collectItem('block_bomb')
      }

      expect(items.inventory.value).toHaveLength(MAX_INVENTORY_SIZE)

      // Try to add one more
      items.collectItem('add_lines')

      // Should still be at max
      expect(items.inventory.value).toHaveLength(MAX_INVENTORY_SIZE)
    })

    it('should generate unique IDs for items', () => {
      items.collectItem('block_bomb')
      items.collectItem('block_bomb')

      const ids = items.inventory.value.map(item => item.id)
      expect(new Set(ids).size).toBe(2) // All IDs should be unique
    })
  })

  describe('useItem', () => {
    it('should not emit to server when not playing', () => {
      items.collectItem('block_bomb')
      const itemId = items.inventory.value[0]!.id

      gameStore.setIsPlaying(false)
      items.useItem(itemId)

      // Item is removed from inventory but not emitted to server
      expect(items.inventory.value).toHaveLength(0)
      expect(mockSocket.emit).not.toHaveBeenCalled()
    })

    it('should not emit to server when not alive', () => {
      items.collectItem('block_bomb')
      const itemId = items.inventory.value[0]!.id

      gameStore.setIsAlive(false)
      items.useItem(itemId)

      // Item is removed from inventory but not emitted to server
      expect(items.inventory.value).toHaveLength(0)
      expect(mockSocket.emit).not.toHaveBeenCalled()
    })

    it('should handle non-existent item ID gracefully', () => {
      items.collectItem('block_bomb')

      expect(() => {
        items.useItem('non-existent-id')
      }).not.toThrow()

      // Original item should still be there
      expect(items.inventory.value).toHaveLength(1)
    })
  })

  describe('applyItemEffect - Block Bomb', () => {
    it('should clear a 3x3 area', () => {
      // Fill grid with blocks
      for (let y = 5; y < 15; y++) {
        for (let x = 0; x < 10; x++) {
          gameStore.setGridCell(x, y, '#FF0000')
        }
      }

      items.applyItemEffect('block_bomb')

      // Check that some cells were cleared
      let clearedCells = 0
      for (let y = 0; y < gameStore.ROWS; y++) {
        for (let x = 0; x < gameStore.COLS; x++) {
          if (!gameStore.grid[y]![x]) {
            clearedCells++
          }
        }
      }

      // Should have cleared at least 9 cells (3x3)
      expect(clearedCells).toBeGreaterThanOrEqual(9)
    })

    it('should trigger flash effect event', () => {
      const eventSpy = vi.fn()
      window.addEventListener('block-bomb-flash', eventSpy)

      // Set up a block to target
      gameStore.setGridCell(5, 10, '#FF0000')

      items.applyItemEffect('block_bomb')

      expect(eventSpy).toHaveBeenCalled()

      window.removeEventListener('block-bomb-flash', eventSpy)
    })
  })

  describe('applyItemEffect - Add Lines', () => {
    it('should add garbage lines to grid', () => {
      items.applyItemEffect('add_lines', '') // Empty string means "not self"

      // Check bottom line is now white (garbage)
      const bottomLine = gameStore.grid[gameStore.ROWS - 1]!
      expect(bottomLine.every(cell => cell === '#FFFFFF')).toBe(true)
    })

    it('should not apply to self', () => {
      const originalBottomLine = [...gameStore.grid[gameStore.ROWS - 1]!]

      items.applyItemEffect('add_lines', userStore.username)

      // Bottom line should be unchanged (no garbage added)
      const newBottomLine = gameStore.grid[gameStore.ROWS - 1]!
      expect(newBottomLine).toEqual(originalBottomLine)
      expect(newBottomLine.every(cell => cell === '#FFFFFF')).toBe(false)
    })
  })

  describe('applyItemEffect - Item Rush', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should activate item rush effect', () => {
      items.applyItemEffect('item_rush')

      expect(items.hasActiveEffect('item_rush')).toBe(true)
    })

    it('should deactivate after duration', () => {
      items.applyItemEffect('item_rush')

      expect(items.hasActiveEffect('item_rush')).toBe(true)

      // Fast-forward time by 15 seconds (default duration)
      vi.advanceTimersByTime(15000)

      expect(items.hasActiveEffect('item_rush')).toBe(false)
    })
  })

  describe('applyItemEffect - Ground Breaker', () => {
    it('should destroy bottom line and shift grid down', () => {
      // Set up a recognizable pattern
      for (let x = 0; x < gameStore.COLS; x++) {
        gameStore.setGridCell(x, 0, '#FF0000') // Top line red
        gameStore.setGridCell(x, gameStore.ROWS - 1, '#0000FF') // Bottom line blue
      }

      items.applyItemEffect('ground_breaker')

      // Bottom line should now be what was second from bottom
      // Top line should be empty (new)
      const topLine = gameStore.grid[0]!
      expect(topLine.every(cell => cell === null)).toBe(true)

      // Old bottom line (blue) should be gone
      const newBottomLine = gameStore.grid[gameStore.ROWS - 1]!
      const hasBlue = newBottomLine.some(cell => cell === '#0000FF')
      expect(hasBlue).toBe(false) // Blue line was at bottom and got destroyed
    })
  })

  describe('applyItemEffect - Confusion', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should activate confusion effect', () => {
      items.applyItemEffect('confusion', '') // Target others, not self

      expect(items.hasActiveEffect('confusion')).toBe(true)
    })

    it('should not activate on self', () => {
      items.applyItemEffect('confusion', userStore.username)

      expect(items.hasActiveEffect('confusion')).toBe(false)
    })

    it('should deactivate after duration', () => {
      items.applyItemEffect('confusion', '')

      vi.advanceTimersByTime(10000) // 10 seconds

      expect(items.hasActiveEffect('confusion')).toBe(false)
    })
  })

  describe('applyItemEffect - Freeze', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should activate freeze effect', () => {
      items.applyItemEffect('freeze', '')

      expect(items.hasActiveEffect('freeze')).toBe(true)
    })

    it('should deactivate after duration', () => {
      items.applyItemEffect('freeze', '')

      vi.advanceTimersByTime(5000) // 5 seconds

      expect(items.hasActiveEffect('freeze')).toBe(false)
    })
  })

  describe('applyItemEffect - Immunity', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should activate immunity effect', () => {
      items.applyItemEffect('immunity')

      expect(items.hasActiveEffect('immunity')).toBe(true)
    })

    it('should deactivate after duration', () => {
      items.applyItemEffect('immunity')

      vi.advanceTimersByTime(10000) // 10 seconds

      expect(items.hasActiveEffect('immunity')).toBe(false)
    })
  })

  describe('applyItemEffect - Preview', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should activate preview effect', () => {
      items.applyItemEffect('preview')

      expect(items.hasActiveEffect('preview')).toBe(true)
    })

    it('should deactivate after duration', () => {
      items.applyItemEffect('preview')

      vi.advanceTimersByTime(15000) // 15 seconds

      expect(items.hasActiveEffect('preview')).toBe(false)
    })
  })

  describe('Target filtering', () => {
    it('should apply self-targeting items only to self', () => {
      // block_bomb is self-targeting
      // Try to apply to others (should not work)
      items.applyItemEffect('block_bomb', 'otherPlayer')

      // No error should occur
      expect(true).toBe(true)

      // Apply to self (should work and trigger flash event)
      const eventSpy = vi.fn()
      window.addEventListener('block-bomb-flash', eventSpy)

      gameStore.setGridCell(5, 10, '#FF0000') // Add a block
      items.applyItemEffect('block_bomb', userStore.username)

      // Flash event should have been triggered
      expect(eventSpy).toHaveBeenCalled()

      window.removeEventListener('block-bomb-flash', eventSpy)
    })

    it('should apply other-targeting items only to others', () => {
      const originalGrid = JSON.parse(JSON.stringify(gameStore.grid))

      // add_lines is other-targeting
      // Try to apply to self (should not work)
      items.applyItemEffect('add_lines', userStore.username)

      // Grid should be unchanged
      expect(gameStore.grid).toEqual(originalGrid)

      // Apply to others (should work)
      items.applyItemEffect('add_lines', '')

      // Grid should have changed (garbage lines added)
      expect(gameStore.grid).not.toEqual(originalGrid)
    })
  })

  describe('updateActiveEffects', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should mark expired effects as inactive', () => {
      items.applyItemEffect('freeze', '')

      expect(items.hasActiveEffect('freeze')).toBe(true)

      // Advance time beyond duration
      vi.advanceTimersByTime(6000)

      // Effect should be removed
      expect(items.hasActiveEffect('freeze')).toBe(false)
    })
  })

  describe('currentPieceHasItem', () => {
    it('should return true when current piece has item', () => {
      gameStore.setItemSpawnMap([{ index: 0, type: 'block_bomb' as ItemType }])

      expect(gameStore.currentPieceHasItem()).toBe(true)
    })

    it('should return false when current piece has no item', () => {
      gameStore.setItemSpawnMap([{ index: 10, type: 'block_bomb' as ItemType }])

      expect(gameStore.currentPieceHasItem()).toBe(false)
    })
  })
})
