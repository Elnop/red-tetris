import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import ItemInventory from '~/components/ItemInventory.vue'
import { useGameStore } from '~/stores/useGameStore'
import { useThemeStore } from '~/stores/useThemeStore'
import type { ItemType } from '~/types/items'

vi.mock('pinia-plugin-persistedstate', () => ({
  piniaPluginPersistedstate: {
    localStorage: () => ({})
  }
}))

global.piniaPluginPersistedstate = {
  localStorage: () => ({})
}

describe('ItemInventory Component', () => {
  let gameStore: ReturnType<typeof useGameStore>
  let themeStore: ReturnType<typeof useThemeStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    gameStore = useGameStore()
    themeStore = useThemeStore()
    themeStore.currentTheme = 'red'
  })

  describe('Component Rendering', () => {
    it('should render inventory title', () => {
      const wrapper = mount(ItemInventory)

      expect(wrapper.find('.inventory-title').text()).toBe('Items (1-5)')
    })

    it('should render 5 empty slots when inventory is empty', () => {
      const wrapper = mount(ItemInventory)

      const slots = wrapper.findAll('.item-slot')
      expect(slots).toHaveLength(5)
      expect(slots.filter(s => s.classes('empty'))).toHaveLength(5)
    })

    it('should render inventory items', () => {
      gameStore.inventory = [
        { id: '1', type: 'block_bomb' as ItemType, icon: '💣' },
        { id: '2', type: 'add_lines' as ItemType, icon: '📊' }
      ]

      const wrapper = mount(ItemInventory)

      const filledSlots = wrapper.findAll('.item-slot:not(.empty)')
      expect(filledSlots).toHaveLength(2)

      const emptySlots = wrapper.findAll('.item-slot.empty')
      expect(emptySlots).toHaveLength(3)
    })

    it('should display item icons', () => {
      gameStore.inventory = [
        { id: '1', type: 'block_bomb' as ItemType, icon: '💣' }
      ]

      const wrapper = mount(ItemInventory)

      expect(wrapper.find('.item-icon').text()).toBe('💣')
    })

    it('should display item names from config', () => {
      gameStore.inventory = [
        { id: '1', type: 'block_bomb' as ItemType, icon: '💣' }
      ]

      const wrapper = mount(ItemInventory)

      expect(wrapper.find('.item-name').text()).toBe('Block Bomb')
    })

    it('should display slot numbers correctly', () => {
      gameStore.inventory = [
        { id: '1', type: 'block_bomb' as ItemType, icon: '💣' },
        { id: '2', type: 'add_lines' as ItemType, icon: '📊' }
      ]

      const wrapper = mount(ItemInventory)

      const numbers = wrapper.findAll('.item-number')
      expect(numbers[0]!.text()).toBe('1')
      expect(numbers[1]!.text()).toBe('2')
      expect(numbers[2]!.text()).toBe('3')
      expect(numbers[3]!.text()).toBe('4')
      expect(numbers[4]!.text()).toBe('5')
    })
  })

  describe('Active Effects Display', () => {
    it('should not display effects section when no active effects', () => {
      const wrapper = mount(ItemInventory)

      expect(wrapper.find('.active-effects').exists()).toBe(false)
    })

    it('should display active effects section when effects exist', () => {
      gameStore.activeEffects = [
        {
          type: 'freeze' as ItemType,
          active: true,
          startTime: Date.now(),
          duration: 5000
        }
      ]

      const wrapper = mount(ItemInventory)

      expect(wrapper.find('.active-effects').exists()).toBe(true)
      expect(wrapper.find('.effects-title').text()).toBe('Active Effects')
    })

    it('should display effect icon and name', () => {
      gameStore.activeEffects = [
        {
          type: 'freeze' as ItemType,
          active: true,
          startTime: Date.now(),
          duration: 5000
        }
      ]

      const wrapper = mount(ItemInventory)

      expect(wrapper.find('.effect-icon').text()).toBe('❄️')
      expect(wrapper.find('.effect-name').text()).toBe('Freeze')
    })

    it('should display remaining time for effects', () => {
      const now = Date.now()
      gameStore.activeEffects = [
        {
          type: 'freeze' as ItemType,
          active: true,
          startTime: now - 2000, // Started 2 seconds ago
          duration: 5000 // 5 second duration
        }
      ]

      const wrapper = mount(ItemInventory)

      // Should show ~3 seconds remaining
      const timeText = wrapper.find('.effect-time').text()
      expect(timeText).toMatch(/[2-3]s/)
    })

    it('should only display active effects', () => {
      gameStore.activeEffects = [
        {
          type: 'freeze' as ItemType,
          active: true,
          startTime: Date.now(),
          duration: 5000
        },
        {
          type: 'immunity' as ItemType,
          active: false,
          startTime: Date.now() - 10000,
          duration: 5000
        }
      ]

      const wrapper = mount(ItemInventory)

      const effectItems = wrapper.findAll('.effect-item')
      expect(effectItems).toHaveLength(1)
      expect(effectItems[0]!.text()).toContain('Freeze')
    })

    it('should display multiple active effects', () => {
      gameStore.activeEffects = [
        {
          type: 'freeze' as ItemType,
          active: true,
          startTime: Date.now(),
          duration: 5000
        },
        {
          type: 'immunity' as ItemType,
          active: true,
          startTime: Date.now(),
          duration: 10000
        },
        {
          type: 'preview' as ItemType,
          active: true,
          startTime: Date.now(),
          duration: 15000
        }
      ]

      const wrapper = mount(ItemInventory)

      const effectItems = wrapper.findAll('.effect-item')
      expect(effectItems).toHaveLength(3)
    })
  })

  describe('Theme Integration', () => {
    it('should apply theme colors to item slots', () => {
      gameStore.inventory = [
        { id: '1', type: 'block_bomb' as ItemType, icon: '💣' }
      ]

      const wrapper = mount(ItemInventory)

      const slot = wrapper.find('.item-slot:not(.empty)')
      const style = slot.attributes('style')

      expect(style).toContain(themeStore.colors.primary)
    })

    it('should apply theme colors to active effects', () => {
      gameStore.activeEffects = [
        {
          type: 'freeze' as ItemType,
          active: true,
          startTime: Date.now(),
          duration: 5000
        }
      ]

      const wrapper = mount(ItemInventory)

      const effectItem = wrapper.find('.effect-item')
      const style = effectItem.attributes('style')

      expect(style).toContain(themeStore.colors.primary)
    })
  })

  describe('Helper Functions', () => {
    it('should calculate remaining time correctly', () => {
      const now = Date.now()
      gameStore.activeEffects = [
        {
          type: 'freeze' as ItemType,
          active: true,
          startTime: now - 1000,
          duration: 5000
        }
      ]

      const wrapper = mount(ItemInventory)
      const vm = wrapper.vm as any

      const remaining = vm.getRemainingTime('freeze')
      expect(remaining).toBeGreaterThan(3)
      expect(remaining).toBeLessThanOrEqual(4)
    })

    it('should return 0 for non-existent effects', () => {
      const wrapper = mount(ItemInventory)
      const vm = wrapper.vm as any

      const remaining = vm.getRemainingTime('freeze')
      expect(remaining).toBe(0)
    })

    it('should return 0 for expired effects', () => {
      const now = Date.now()
      gameStore.activeEffects = [
        {
          type: 'freeze' as ItemType,
          active: true,
          startTime: now - 10000,
          duration: 5000
        }
      ]

      const wrapper = mount(ItemInventory)
      const vm = wrapper.vm as any

      const remaining = vm.getRemainingTime('freeze')
      expect(remaining).toBe(0)
    })

    it('should detect active effects correctly', () => {
      gameStore.activeEffects = [
        {
          type: 'freeze' as ItemType,
          active: true,
          startTime: Date.now(),
          duration: 5000
        }
      ]

      const wrapper = mount(ItemInventory)
      const vm = wrapper.vm as any

      expect(vm.isEffectActive('freeze')).toBe(true)
      expect(vm.isEffectActive('immunity')).toBe(false)
    })

    it('should not detect inactive effects', () => {
      gameStore.activeEffects = [
        {
          type: 'freeze' as ItemType,
          active: false,
          startTime: Date.now(),
          duration: 5000
        }
      ]

      const wrapper = mount(ItemInventory)
      const vm = wrapper.vm as any

      expect(vm.isEffectActive('freeze')).toBe(false)
    })
  })

  describe('Edge Cases', () => {
    it('should handle full inventory (5 items)', () => {
      gameStore.inventory = [
        { id: '1', type: 'block_bomb' as ItemType, icon: '💣' },
        { id: '2', type: 'add_lines' as ItemType, icon: '📊' },
        { id: '3', type: 'freeze' as ItemType, icon: '❄️' },
        { id: '4', type: 'immunity' as ItemType, icon: '🛡️' },
        { id: '5', type: 'preview' as ItemType, icon: '👁️' }
      ]

      const wrapper = mount(ItemInventory)

      const filledSlots = wrapper.findAll('.item-slot:not(.empty)')
      expect(filledSlots).toHaveLength(5)

      const emptySlots = wrapper.findAll('.item-slot.empty')
      expect(emptySlots).toHaveLength(0)
    })

    it('should handle single item in inventory', () => {
      gameStore.inventory = [
        { id: '1', type: 'block_bomb' as ItemType, icon: '💣' }
      ]

      const wrapper = mount(ItemInventory)

      const filledSlots = wrapper.findAll('.item-slot:not(.empty)')
      expect(filledSlots).toHaveLength(1)

      const emptySlots = wrapper.findAll('.item-slot.empty')
      expect(emptySlots).toHaveLength(4)
    })

    it('should render without errors when stores are empty', () => {
      expect(() => {
        mount(ItemInventory)
      }).not.toThrow()
    })
  })
})
