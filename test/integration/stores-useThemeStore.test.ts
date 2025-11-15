import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useThemeStore, type ThemeName, type ThemeColors } from '~/stores/useThemeStore'

describe('useThemeStore', () => {
  let themeStore: ReturnType<typeof useThemeStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    themeStore = useThemeStore()
  })

  describe('Initial State', () => {
    it('should initialize with red theme', () => {
      expect(themeStore.currentTheme).toBe('red')
    })

    it('should provide theme colors', () => {
      expect(themeStore.colors).toBeDefined()
      expect(themeStore.colors.name).toBe('Red')
      expect(themeStore.colors.primary).toBeDefined()
      expect(themeStore.colors.secondary).toBeDefined()
      expect(themeStore.colors.gradientStart).toBeDefined()
      expect(themeStore.colors.gradientEnd).toBeDefined()
    })

    it('should have valid color format for all color properties', () => {
      const hexColorRegex = /^#[0-9a-fA-F]{6}$/

      expect(themeStore.colors.primary).toMatch(hexColorRegex)
      expect(themeStore.colors.secondary).toMatch(hexColorRegex)
      expect(themeStore.colors.gradientStart).toMatch(hexColorRegex)
      expect(themeStore.colors.gradientEnd).toMatch(hexColorRegex)
    })
  })

  describe('Theme Definitions', () => {
    const themeNames: ThemeName[] = ['red', 'pink', 'blue', 'yellow']

    themeNames.forEach(themeName => {
      describe(`${themeName} theme`, () => {
        beforeEach(() => {
          themeStore.currentTheme = themeName
        })

        it('should have all required color properties', () => {
          expect(themeStore.colors.name).toBeDefined()
          expect(themeStore.colors.primary).toBeDefined()
          expect(themeStore.colors.secondary).toBeDefined()
          expect(themeStore.colors.gradientStart).toBeDefined()
          expect(themeStore.colors.gradientEnd).toBeDefined()
        })

        it('should have valid hex color values', () => {
          const hexColorRegex = /^#[0-9a-fA-F]{6}$/

          expect(themeStore.colors.primary).toMatch(hexColorRegex)
          expect(themeStore.colors.secondary).toMatch(hexColorRegex)
          expect(themeStore.colors.gradientStart).toMatch(hexColorRegex)
          expect(themeStore.colors.gradientEnd).toMatch(hexColorRegex)
        })

        it('should have capitalized name', () => {
          const firstChar = themeStore.colors.name.charAt(0)
          expect(firstChar).toBe(firstChar.toUpperCase())
        })
      })
    })

    it('should have distinct primary colors for each theme', () => {
      const primaryColors = new Set<string>()

      themeNames.forEach(themeName => {
        themeStore.currentTheme = themeName
        primaryColors.add(themeStore.colors.primary)
      })

      // All themes should have unique primary colors
      expect(primaryColors.size).toBe(themeNames.length)
    })

    it('should have distinct secondary colors for each theme', () => {
      const secondaryColors = new Set<string>()

      themeNames.forEach(themeName => {
        themeStore.currentTheme = themeName
        secondaryColors.add(themeStore.colors.secondary)
      })

      expect(secondaryColors.size).toBe(themeNames.length)
    })

    it('should have distinct names for each theme', () => {
      const names = new Set<string>()

      themeNames.forEach(themeName => {
        themeStore.currentTheme = themeName
        names.add(themeStore.colors.name)
      })

      expect(names.size).toBe(themeNames.length)
    })
  })

  describe('Red Theme', () => {
    beforeEach(() => {
      themeStore.currentTheme = 'red'
    })

    it('should have red as primary color', () => {
      expect(themeStore.colors.primary).toBe('#b71c1c')
    })

    it('should have lighter red as secondary color', () => {
      expect(themeStore.colors.secondary).toBe('#e53935')
    })

    it('should have correct gradient colors', () => {
      expect(themeStore.colors.gradientStart).toBe('#1a1a1a')
      expect(themeStore.colors.gradientEnd).toBe('#b71c1c')
    })

    it('should have Red as name', () => {
      expect(themeStore.colors.name).toBe('Red')
    })
  })

  describe('Pink Theme', () => {
    beforeEach(() => {
      themeStore.currentTheme = 'pink'
    })

    it('should have pink as primary color', () => {
      expect(themeStore.colors.primary).toBe('#c2185b')
    })

    it('should have lighter pink as secondary color', () => {
      expect(themeStore.colors.secondary).toBe('#f06292')
    })

    it('should have correct gradient colors', () => {
      expect(themeStore.colors.gradientStart).toBe('#1a1a1a')
      expect(themeStore.colors.gradientEnd).toBe('#c2185b')
    })

    it('should have Pink as name', () => {
      expect(themeStore.colors.name).toBe('Pink')
    })
  })

  describe('Blue Theme', () => {
    beforeEach(() => {
      themeStore.currentTheme = 'blue'
    })

    it('should have blue as primary color', () => {
      expect(themeStore.colors.primary).toBe('#1976d2')
    })

    it('should have lighter blue as secondary color', () => {
      expect(themeStore.colors.secondary).toBe('#42a5f5')
    })

    it('should have correct gradient colors', () => {
      expect(themeStore.colors.gradientStart).toBe('#1a1a1a')
      expect(themeStore.colors.gradientEnd).toBe('#1976d2')
    })

    it('should have Blue as name', () => {
      expect(themeStore.colors.name).toBe('Blue')
    })
  })

  describe('Yellow Theme', () => {
    beforeEach(() => {
      themeStore.currentTheme = 'yellow'
    })

    it('should have yellow as primary color', () => {
      expect(themeStore.colors.primary).toBe('#f57f17')
    })

    it('should have lighter yellow as secondary color', () => {
      expect(themeStore.colors.secondary).toBe('#fdd835')
    })

    it('should have correct gradient colors', () => {
      expect(themeStore.colors.gradientStart).toBe('#1a1a1a')
      expect(themeStore.colors.gradientEnd).toBe('#f57f17')
    })

    it('should have Yellow as name', () => {
      expect(themeStore.colors.name).toBe('Yellow')
    })
  })

  describe('cycleTheme', () => {
    it('should cycle from red to pink', () => {
      themeStore.currentTheme = 'red'
      themeStore.cycleTheme()
      expect(themeStore.currentTheme).toBe('pink')
    })

    it('should cycle from pink to blue', () => {
      themeStore.currentTheme = 'pink'
      themeStore.cycleTheme()
      expect(themeStore.currentTheme).toBe('blue')
    })

    it('should cycle from blue to yellow', () => {
      themeStore.currentTheme = 'blue'
      themeStore.cycleTheme()
      expect(themeStore.currentTheme).toBe('yellow')
    })

    it('should cycle from yellow back to red', () => {
      themeStore.currentTheme = 'yellow'
      themeStore.cycleTheme()
      expect(themeStore.currentTheme).toBe('red')
    })

    it('should cycle through all themes and return to start', () => {
      themeStore.currentTheme = 'red'

      const expectedOrder: ThemeName[] = ['pink', 'blue', 'yellow', 'red']

      expectedOrder.forEach(expected => {
        themeStore.cycleTheme()
        expect(themeStore.currentTheme).toBe(expected)
      })
    })

    it('should update colors when cycling', () => {
      themeStore.currentTheme = 'red'
      const initialPrimaryColor = themeStore.colors.primary

      themeStore.cycleTheme()

      expect(themeStore.colors.primary).not.toBe(initialPrimaryColor)
    })

    it('should cycle multiple times correctly', () => {
      themeStore.currentTheme = 'red'

      // Cycle 10 times
      for (let i = 0; i < 10; i++) {
        themeStore.cycleTheme()
      }

      // Should be back to pink (10 % 4 = 2, so red -> pink)
      expect(themeStore.currentTheme).toBe('blue')
    })
  })

  describe('Reactive Colors', () => {
    it('should reactively update colors when theme changes', () => {
      themeStore.currentTheme = 'red'
      const redPrimary = themeStore.colors.primary

      themeStore.currentTheme = 'blue'
      const bluePrimary = themeStore.colors.primary

      expect(redPrimary).not.toBe(bluePrimary)
      expect(bluePrimary).toBe('#1976d2')
    })

    it('should update all color properties when theme changes', () => {
      themeStore.currentTheme = 'red'
      const redColors = { ...themeStore.colors }

      themeStore.currentTheme = 'yellow'
      const yellowColors = { ...themeStore.colors }

      expect(redColors.primary).not.toBe(yellowColors.primary)
      expect(redColors.secondary).not.toBe(yellowColors.secondary)
      expect(redColors.name).not.toBe(yellowColors.name)
    })

    it('should compute colors based on current theme', () => {
      themeStore.currentTheme = 'pink'

      expect(themeStore.colors.name).toBe('Pink')
      expect(themeStore.colors.primary).toBe('#c2185b')
    })
  })

  describe('Theme Properties', () => {
    it('should have currentTheme as a writable ref', () => {
      themeStore.currentTheme = 'blue'
      expect(themeStore.currentTheme).toBe('blue')

      themeStore.currentTheme = 'yellow'
      expect(themeStore.currentTheme).toBe('yellow')
    })

    it('should provide cycleTheme function', () => {
      expect(typeof themeStore.cycleTheme).toBe('function')
    })

    it('should have all themes accessible', () => {
      const validThemes: ThemeName[] = ['red', 'pink', 'blue', 'yellow']

      validThemes.forEach(theme => {
        themeStore.currentTheme = theme
        expect(themeStore.colors).toBeDefined()
        expect(themeStore.colors.name).toBeTruthy()
      })
    })
  })

  describe('Color Consistency', () => {
    it('should have consistent gradient start for all themes', () => {
      const themeNames: ThemeName[] = ['red', 'pink', 'blue', 'yellow']
      const gradientStarts = new Set<string>()

      themeNames.forEach(theme => {
        themeStore.currentTheme = theme
        gradientStarts.add(themeStore.colors.gradientStart)
      })

      // All themes should have the same gradient start (dark background)
      expect(gradientStarts.size).toBe(1)
      expect(gradientStarts.has('#1a1a1a')).toBe(true)
    })

    it('should have gradient end match primary color', () => {
      const themeNames: ThemeName[] = ['red', 'pink', 'blue', 'yellow']

      themeNames.forEach(theme => {
        themeStore.currentTheme = theme
        expect(themeStore.colors.gradientEnd).toBe(themeStore.colors.primary)
      })
    })
  })

  describe('Theme Interface', () => {
    it('should return ThemeColors object with correct structure', () => {
      const colors = themeStore.colors

      expect(colors).toHaveProperty('name')
      expect(colors).toHaveProperty('primary')
      expect(colors).toHaveProperty('secondary')
      expect(colors).toHaveProperty('gradientStart')
      expect(colors).toHaveProperty('gradientEnd')

      expect(typeof colors.name).toBe('string')
      expect(typeof colors.primary).toBe('string')
      expect(typeof colors.secondary).toBe('string')
      expect(typeof colors.gradientStart).toBe('string')
      expect(typeof colors.gradientEnd).toBe('string')
    })

    it('should maintain type safety', () => {
      // This test ensures TypeScript types are respected
      const theme: ThemeName = themeStore.currentTheme
      const colors: ThemeColors = themeStore.colors

      expect(['red', 'pink', 'blue', 'yellow']).toContain(theme)
      expect(colors.name).toBeTruthy()
    })
  })
})
