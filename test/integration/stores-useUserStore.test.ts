import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUserStore } from '~/stores/useUserStore'

// Mock pinia-plugin-persistedstate
vi.mock('pinia-plugin-persistedstate', () => ({
  piniaPluginPersistedstate: {
    localStorage: () => ({})
  }
}))

// Mock useRoomStore to avoid circular dependency issues
vi.mock('~/stores/useRoomStore', () => ({
  useRoomStore: vi.fn(() => ({}))
}))

// Mock global piniaPluginPersistedstate
global.piniaPluginPersistedstate = {
  localStorage: () => ({})
}

describe('useUserStore', () => {
  let userStore: ReturnType<typeof useUserStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    userStore = useUserStore()
  })

  describe('Initial State', () => {
    it('should generate username automatically if none exists', () => {
      expect(userStore.username).toBeTruthy()
      expect(typeof userStore.username).toBe('string')
      expect(userStore.username!.length).toBeGreaterThan(0)
    })

    it('should have default room name', () => {
      expect(userStore.roomName).toBe('42')
    })

    it('should have default user color', () => {
      expect(userStore.userColor).toBe('#FFFFFF')
    })

    it('should have initial global lines cleared as 0', () => {
      expect(userStore.globalLinesCleared).toBe(0)
    })
  })

  describe('Username Generation', () => {
    it('should generate username with correct format', () => {
      userStore.genUsername()
      
      expect(userStore.username).toBeTruthy()
      expect(typeof userStore.username).toBe('string')
      
      // Check if username contains expected patterns
      const prefixes = ['Block', 'Tet', 'Quad', 'Line', 'Pixel', 'Stack', 'Brick', 'Clear', 'Drop', 'Spin']
      const tetrisRefs = ['Master', 'Champion', 'Overlord', 'Wizard', 'King', 'Queen', 'Lord', 'Hero', 'Beast', 'Ninja']
      const suffixes = ['99', 'X', '3000', 'Pro', 'GG', 'Rush', 'Fast', 'Combo', 'Max', 'Ultra']
      
      const hasPrefix = prefixes.some(prefix => userStore.username!.includes(prefix))
      const hasTetrisRef = tetrisRefs.some(ref => userStore.username!.includes(ref))
      const hasSuffix = suffixes.some(suffix => userStore.username!.includes(suffix))
      
      expect(hasPrefix).toBe(true)
      expect(hasTetrisRef).toBe(true)
      expect(hasSuffix).toBe(true)
    })

    it('should generate different usernames on multiple calls', () => {
      const usernames = new Set()
      
      // Generate multiple usernames
      for (let i = 0; i < 10; i++) {
        userStore.genUsername()
        usernames.add(userStore.username)
      }
      
      // Should have generated at least some different usernames
      // With the number of combinations available, this should almost always be true
      expect(usernames.size).toBeGreaterThan(1)
    })
  })

  describe('Username Management', () => {
    it('should set username correctly', () => {
      const testUsername = 'TestPlayer123'
      userStore.setUsername(testUsername)
      
      expect(userStore.username).toBe(testUsername)
    })

    it('should override generated username', () => {
      const originalUsername = userStore.username
      const newUsername = 'CustomPlayer'
      
      userStore.setUsername(newUsername)
      
      expect(userStore.username).toBe(newUsername)
      expect(userStore.username).not.toBe(originalUsername)
    })
  })

  describe('Color Management', () => {
    it('should set user color correctly', () => {
      const testColor = '#FF0000'
      userStore.setColor(testColor)
      
      expect(userStore.userColor).toBe(testColor)
    })

    it('should handle different color formats', () => {
      const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00']
      
      colors.forEach(color => {
        userStore.setColor(color)
        expect(userStore.userColor).toBe(color)
      })
    })
  })

  describe('Global Lines Cleared', () => {
    it('should add lines cleared correctly', () => {
      expect(userStore.globalLinesCleared).toBe(0)
      
      userStore.addGlobalLinesCleared(5)
      expect(userStore.globalLinesCleared).toBe(5)
      
      userStore.addGlobalLinesCleared(3)
      expect(userStore.globalLinesCleared).toBe(8)
    })

    it('should handle multiple additions', () => {
      const linesToAdd = [1, 4, 2, 3, 5]
      let expectedTotal = 0
      
      linesToAdd.forEach(lines => {
        userStore.addGlobalLinesCleared(lines)
        expectedTotal += lines
        expect(userStore.globalLinesCleared).toBe(expectedTotal)
      })
    })

    it('should handle zero lines addition', () => {
      userStore.addGlobalLinesCleared(5)
      const beforeZero = userStore.globalLinesCleared
      
      userStore.addGlobalLinesCleared(0)
      expect(userStore.globalLinesCleared).toBe(beforeZero)
    })

    it('should handle large numbers', () => {
      userStore.addGlobalLinesCleared(1000)
      expect(userStore.globalLinesCleared).toBe(1000)
      
      userStore.addGlobalLinesCleared(500)
      expect(userStore.globalLinesCleared).toBe(1500)
    })
  })

  describe('Store Reactivity', () => {
    it('should be reactive to username changes', () => {
      const initialUsername = userStore.username
      userStore.setUsername('ReactiveTest')
      
      expect(userStore.username).not.toBe(initialUsername)
      expect(userStore.username).toBe('ReactiveTest')
    })

    it('should be reactive to color changes', () => {
      const initialColor = userStore.userColor
      userStore.setColor('#123456')
      
      expect(userStore.userColor).not.toBe(initialColor)
      expect(userStore.userColor).toBe('#123456')
    })

    it('should be reactive to lines cleared changes', () => {
      const initialLines = userStore.globalLinesCleared
      userStore.addGlobalLinesCleared(10)
      
      expect(userStore.globalLinesCleared).not.toBe(initialLines)
      expect(userStore.globalLinesCleared).toBe(initialLines + 10)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty string username', () => {
      userStore.setUsername('')
      expect(userStore.username).toBe('')
    })

    it('should handle negative lines (edge case)', () => {
      userStore.addGlobalLinesCleared(10)
      userStore.addGlobalLinesCleared(-5)
      expect(userStore.globalLinesCleared).toBe(5)
    })

    it('should handle special characters in username', () => {
      const specialUsername = 'Player@#$%'
      userStore.setUsername(specialUsername)
      expect(userStore.username).toBe(specialUsername)
    })
  })

  describe('Username Generation Components', () => {
    it('should use valid prefixes', () => {
      const validPrefixes = ['Block', 'Tet', 'Quad', 'Line', 'Pixel', 'Stack', 'Brick', 'Clear', 'Drop', 'Spin']
      
      // Generate several usernames and check they contain valid prefixes
      for (let i = 0; i < 5; i++) {
        userStore.genUsername()
        const hasValidPrefix = validPrefixes.some(prefix => userStore.username!.startsWith(prefix))
        expect(hasValidPrefix).toBe(true)
      }
    })

    it('should use valid tetris references', () => {
      const validTetrisRefs = ['Master', 'Champion', 'Overlord', 'Wizard', 'King', 'Queen', 'Lord', 'Hero', 'Beast', 'Ninja']
      
      for (let i = 0; i < 5; i++) {
        userStore.genUsername()
        const hasValidTetrisRef = validTetrisRefs.some(ref => userStore.username!.includes(ref))
        expect(hasValidTetrisRef).toBe(true)
      }
    })

    it('should use valid suffixes', () => {
      const validSuffixes = ['99', 'X', '3000', 'Pro', 'GG', 'Rush', 'Fast', 'Combo', 'Max', 'Ultra']
      
      for (let i = 0; i < 5; i++) {
        userStore.genUsername()
        const hasValidSuffix = validSuffixes.some(suffix => userStore.username!.endsWith(suffix))
        expect(hasValidSuffix).toBe(true)
      }
    })
  })
})