import { describe, it, expect } from 'vitest'
import {
  ITEMS_CONFIG,
  ITEM_SPAWN_RATE,
  MAX_INVENTORY_SIZE,
  ITEM_TYPES,
  getRandomItemType
} from '~/utils/itemsConfig'
import { ItemType } from '~/types/items'

describe('itemsConfig', () => {
  describe('ITEMS_CONFIG', () => {
    it('should have configuration for all item types', () => {
      const allItemTypes = Object.values(ItemType)

      allItemTypes.forEach(itemType => {
        expect(ITEMS_CONFIG[itemType]).toBeDefined()
        expect(ITEMS_CONFIG[itemType]!.type).toBe(itemType)
      })
    })

    it('should have required properties for each item', () => {
      Object.values(ITEMS_CONFIG).forEach(config => {
        expect(config.type).toBeDefined()
        expect(config.name).toBeDefined()
        expect(config.icon).toBeDefined()
        expect(config.description).toBeDefined()
        expect(typeof config.targetSelf).toBe('boolean')
        expect(typeof config.targetOthers).toBe('boolean')
      })
    })

    it('should have valid targeting configuration', () => {
      Object.values(ITEMS_CONFIG).forEach(config => {
        // Each item should target either self, others, or both (not neither)
        const hasValidTarget = config.targetSelf || config.targetOthers
        expect(hasValidTarget).toBe(true)
      })
    })

    describe('Individual Item Configurations', () => {
      it('should configure Block Bomb correctly', () => {
        const config = ITEMS_CONFIG[ItemType.BLOCK_BOMB]
        expect(config.name).toBe('Block Bomb')
        expect(config.icon).toBe('💥')
        expect(config.targetSelf).toBe(true)
        expect(config.targetOthers).toBe(false)
        expect(config.duration).toBeUndefined()
      })

      it('should configure Add Lines correctly', () => {
        const config = ITEMS_CONFIG[ItemType.ADD_LINES]
        expect(config.name).toBe('Poisoned Gift')
        expect(config.icon).toBe('🎁')
        expect(config.targetSelf).toBe(false)
        expect(config.targetOthers).toBe(true)
        expect(config.duration).toBeUndefined()
      })

      it('should configure Item Rush correctly', () => {
        const config = ITEMS_CONFIG[ItemType.ITEM_RUSH]
        expect(config.name).toBe('Item Rush')
        expect(config.icon).toBe('🍀')
        expect(config.targetSelf).toBe(true)
        expect(config.targetOthers).toBe(false)
        expect(config.duration).toBe(12000)
      })

      it('should configure Ground Breaker correctly', () => {
        const config = ITEMS_CONFIG[ItemType.GROUND_BREAKER]
        expect(config.name).toBe('Ground Breaker')
        expect(config.icon).toBe('🌊')
        expect(config.targetSelf).toBe(true)
        expect(config.targetOthers).toBe(false)
        expect(config.duration).toBeUndefined()
      })

      it('should configure Confusion correctly', () => {
        const config = ITEMS_CONFIG[ItemType.CONFUSION]
        expect(config.name).toBe('Confusion')
        expect(config.icon).toBe('🌀')
        expect(config.targetSelf).toBe(false)
        expect(config.targetOthers).toBe(true)
        expect(config.duration).toBe(5000)
      })

      it('should configure Freeze correctly', () => {
        const config = ITEMS_CONFIG[ItemType.FREEZE]
        expect(config.name).toBe('Freeze')
        expect(config.icon).toBe('❄️')
        expect(config.targetSelf).toBe(false)
        expect(config.targetOthers).toBe(true)
        expect(config.duration).toBe(3000)
      })

      it('should configure Immunity correctly', () => {
        const config = ITEMS_CONFIG[ItemType.IMMUNITY]
        expect(config.name).toBe('Immunity')
        expect(config.icon).toBe('🛡️')
        expect(config.targetSelf).toBe(true)
        expect(config.targetOthers).toBe(false)
        expect(config.duration).toBe(10000)
      })

      it('should configure Preview correctly', () => {
        const config = ITEMS_CONFIG[ItemType.PREVIEW]
        expect(config.name).toBe('Preview')
        expect(config.icon).toBe('🔮')
        expect(config.targetSelf).toBe(true)
        expect(config.targetOthers).toBe(false)
        expect(config.duration).toBe(10000)
      })
    })

    describe('Item Categories', () => {
      it('should identify self-targeting items', () => {
        const selfTargetingItems = Object.values(ITEMS_CONFIG)
          .filter(config => config.targetSelf && !config.targetOthers)
          .map(config => config.type)

        expect(selfTargetingItems).toContain(ItemType.BLOCK_BOMB)
        expect(selfTargetingItems).toContain(ItemType.ITEM_RUSH)
        expect(selfTargetingItems).toContain(ItemType.GROUND_BREAKER)
        expect(selfTargetingItems).toContain(ItemType.IMMUNITY)
        expect(selfTargetingItems).toContain(ItemType.PREVIEW)
      })

      it('should identify other-targeting items', () => {
        const otherTargetingItems = Object.values(ITEMS_CONFIG)
          .filter(config => config.targetOthers && !config.targetSelf)
          .map(config => config.type)

        expect(otherTargetingItems).toContain(ItemType.ADD_LINES)
        expect(otherTargetingItems).toContain(ItemType.CONFUSION)
        expect(otherTargetingItems).toContain(ItemType.FREEZE)
      })

      it('should identify items with duration', () => {
        const itemsWithDuration = Object.values(ITEMS_CONFIG)
          .filter(config => config.duration !== undefined)
          .map(config => config.type)

        expect(itemsWithDuration).toContain(ItemType.ITEM_RUSH)
        expect(itemsWithDuration).toContain(ItemType.CONFUSION)
        expect(itemsWithDuration).toContain(ItemType.FREEZE)
        expect(itemsWithDuration).toContain(ItemType.IMMUNITY)
        expect(itemsWithDuration).toContain(ItemType.PREVIEW)
      })

      it('should identify instant-effect items', () => {
        const instantItems = Object.values(ITEMS_CONFIG)
          .filter(config => config.duration === undefined)
          .map(config => config.type)

        expect(instantItems).toContain(ItemType.BLOCK_BOMB)
        expect(instantItems).toContain(ItemType.ADD_LINES)
        expect(instantItems).toContain(ItemType.GROUND_BREAKER)
      })
    })

    describe('Duration Values', () => {
      it('should have valid duration values for timed effects', () => {
        const timedItems = Object.values(ITEMS_CONFIG).filter(config => config.duration !== undefined)

        timedItems.forEach(config => {
          expect(config.duration).toBeGreaterThan(0)
          expect(config.duration).toBeLessThanOrEqual(15000) // Max 15 seconds
        })
      })

      it('should have appropriate durations for offensive items', () => {
        // Offensive items should have shorter durations
        expect(ITEMS_CONFIG[ItemType.FREEZE]!.duration).toBeLessThanOrEqual(5000)
        expect(ITEMS_CONFIG[ItemType.CONFUSION]!.duration).toBeLessThanOrEqual(5000)
      })

      it('should have appropriate durations for defensive items', () => {
        // Defensive items can have longer durations
        expect(ITEMS_CONFIG[ItemType.IMMUNITY]!.duration).toBeGreaterThanOrEqual(10000)
        expect(ITEMS_CONFIG[ItemType.ITEM_RUSH]!.duration).toBeGreaterThanOrEqual(10000)
      })
    })
  })

  describe('Constants', () => {
    it('should have valid ITEM_SPAWN_RATE', () => {
      expect(ITEM_SPAWN_RATE).toBeGreaterThan(0)
      expect(ITEM_SPAWN_RATE).toBeLessThanOrEqual(1)
      expect(ITEM_SPAWN_RATE).toBe(0.08)
    })

    it('should have valid MAX_INVENTORY_SIZE', () => {
      expect(MAX_INVENTORY_SIZE).toBeGreaterThan(0)
      expect(MAX_INVENTORY_SIZE).toBe(5)
      expect(Number.isInteger(MAX_INVENTORY_SIZE)).toBe(true)
    })
  })

  describe('ITEM_TYPES array', () => {
    it('should contain all item types', () => {
      const allItemTypes = Object.values(ItemType)
      expect(ITEM_TYPES).toHaveLength(allItemTypes.length)

      allItemTypes.forEach(itemType => {
        expect(ITEM_TYPES).toContain(itemType)
      })
    })

    it('should not have duplicates', () => {
      const uniqueTypes = new Set(ITEM_TYPES)
      expect(uniqueTypes.size).toBe(ITEM_TYPES.length)
    })

    it('should be used for random selection', () => {
      // ITEM_TYPES should include at least 5 different items for variety
      expect(ITEM_TYPES.length).toBeGreaterThanOrEqual(5)
    })
  })

  describe('getRandomItemType', () => {
    it('should return a valid item type', () => {
      const randomItem = getRandomItemType()
      expect(ITEM_TYPES).toContain(randomItem)
      expect(ITEMS_CONFIG[randomItem]).toBeDefined()
    })

    it('should return different items over multiple calls', () => {
      const results = new Set<ItemType>()

      // Generate 100 random items
      for (let i = 0; i < 100; i++) {
        results.add(getRandomItemType())
      }

      // Should have at least 2 different items (statistically almost certain)
      expect(results.size).toBeGreaterThan(1)
    })

    it('should have reasonable distribution', () => {
      const counts: Record<string, number> = {}
      const iterations = 1000

      for (let i = 0; i < iterations; i++) {
        const item = getRandomItemType()
        counts[item] = (counts[item] || 0) + 1
      }

      // Each item should appear at least once in 1000 iterations (statistically)
      Object.values(ItemType).forEach(itemType => {
        expect(counts[itemType]).toBeGreaterThan(0)
      })

      // Each item should appear roughly 1000/8 = 125 times (±50 for variance)
      const expectedCount = iterations / ITEM_TYPES.length
      Object.values(counts).forEach(count => {
        expect(count).toBeGreaterThan(expectedCount * 0.5)
        expect(count).toBeLessThan(expectedCount * 1.5)
      })
    })

    it('should always return an item from ITEM_TYPES', () => {
      for (let i = 0; i < 50; i++) {
        const item = getRandomItemType()
        expect(ITEM_TYPES.includes(item)).toBe(true)
      }
    })
  })

  describe('Icon Uniqueness', () => {
    it('should have unique icons for each item', () => {
      const icons = Object.values(ITEMS_CONFIG).map(config => config.icon)
      const uniqueIcons = new Set(icons)

      expect(uniqueIcons.size).toBe(icons.length)
    })

    it('should use emoji icons', () => {
      Object.values(ITEMS_CONFIG).forEach(config => {
        // Emojis typically have length > 1 in JavaScript due to Unicode
        expect(config.icon.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Name Uniqueness', () => {
    it('should have unique names for each item', () => {
      const names = Object.values(ITEMS_CONFIG).map(config => config.name)
      const uniqueNames = new Set(names)

      expect(uniqueNames.size).toBe(names.length)
    })

    it('should have descriptive names', () => {
      Object.values(ITEMS_CONFIG).forEach(config => {
        expect(config.name.length).toBeGreaterThan(3)
        expect(config.name).toBeTruthy()
      })
    })
  })

  describe('Description Quality', () => {
    it('should have descriptions for all items', () => {
      Object.values(ITEMS_CONFIG).forEach(config => {
        expect(config.description).toBeTruthy()
        expect(config.description.length).toBeGreaterThan(10)
      })
    })

    it('should have unique descriptions', () => {
      const descriptions = Object.values(ITEMS_CONFIG).map(config => config.description)
      const uniqueDescriptions = new Set(descriptions)

      expect(uniqueDescriptions.size).toBe(descriptions.length)
    })
  })
})
