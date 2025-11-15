import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import NextPieces from '~/components/NextPieces.vue'
import { useGameStore } from '~/stores/useGameStore'
import { useThemeStore } from '~/stores/useThemeStore'
import type { ActivePiece } from '~/utils/pieces'
import type { ItemType } from '~/types/items'

vi.mock('pinia-plugin-persistedstate', () => ({
  piniaPluginPersistedstate: {
    localStorage: () => ({})
  }
}))

global.piniaPluginPersistedstate = {
  localStorage: () => ({})
}

describe('NextPieces Component', () => {
  let gameStore: ReturnType<typeof useGameStore>
  let themeStore: ReturnType<typeof useThemeStore>

  const createMockPiece = (type: string = 'I', color: string = '#00FFFF'): ActivePiece => ({
    shape: type,
    color: color,
    matrix: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ],
    x: 0,
    y: 0
  })

  beforeEach(() => {
    setActivePinia(createPinia())
    gameStore = useGameStore()
    themeStore = useThemeStore()
    themeStore.currentTheme = 'red'
  })

  describe('Component Rendering', () => {
    it('should not render when queue is empty', () => {
      gameStore.queue = []

      const wrapper = mount(NextPieces)

      expect(wrapper.find('.next-pieces').exists()).toBe(false)
    })

    it('should render when queue has pieces', () => {
      gameStore.queue = [createMockPiece()]

      const wrapper = mount(NextPieces)

      expect(wrapper.find('.next-pieces').exists()).toBe(true)
    })

    it('should display NEXT title when preview not active', () => {
      gameStore.queue = [createMockPiece()]

      const wrapper = mount(NextPieces)

      expect(wrapper.find('.next-title').text()).toBe('NEXT')
    })

    it('should display PREVIEW title with icon when preview active', () => {
      gameStore.queue = [
        createMockPiece(),
        createMockPiece('O'),
        createMockPiece('T')
      ]
      gameStore.activeEffects = [
        {
          type: 'preview' as ItemType,
          active: true,
          startTime: Date.now(),
          duration: 15000
        }
      ]

      const wrapper = mount(NextPieces)

      expect(wrapper.find('.next-title').text()).toBe('🔮 PREVIEW')
    })

    it('should apply theme color to title', () => {
      gameStore.queue = [createMockPiece()]

      const wrapper = mount(NextPieces)

      const title = wrapper.find('.next-title')
      expect(title.attributes('style')).toContain(themeStore.colors.secondary)
    })
  })

  describe('Preview Effect', () => {
    it('should show 1 piece when preview not active', () => {
      gameStore.queue = [
        createMockPiece('I'),
        createMockPiece('O'),
        createMockPiece('T'),
        createMockPiece('S'),
        createMockPiece('Z')
      ]

      const wrapper = mount(NextPieces)

      const previews = wrapper.findAll('.piece-preview')
      expect(previews).toHaveLength(1)
    })

    it('should show 5 pieces when preview is active', () => {
      gameStore.queue = [
        createMockPiece('I'),
        createMockPiece('O'),
        createMockPiece('T'),
        createMockPiece('S'),
        createMockPiece('Z'),
        createMockPiece('L'),
        createMockPiece('J')
      ]
      gameStore.activeEffects = [
        {
          type: 'preview' as ItemType,
          active: true,
          startTime: Date.now(),
          duration: 15000
        }
      ]

      const wrapper = mount(NextPieces)

      const previews = wrapper.findAll('.piece-preview')
      expect(previews).toHaveLength(5)
    })

    it('should add preview-bonus class to additional pieces', () => {
      gameStore.queue = [
        createMockPiece('I'),
        createMockPiece('O'),
        createMockPiece('T')
      ]
      gameStore.activeEffects = [
        {
          type: 'preview' as ItemType,
          active: true,
          startTime: Date.now(),
          duration: 15000
        }
      ]

      const wrapper = mount(NextPieces)

      const previews = wrapper.findAll('.piece-preview')
      expect(previews[0]!.classes('preview-bonus')).toBe(false)
      expect(previews[1]!.classes('preview-bonus')).toBe(true)
      expect(previews[2]!.classes('preview-bonus')).toBe(true)
    })

    it('should show available pieces when queue has less than 5', () => {
      gameStore.queue = [
        createMockPiece('I'),
        createMockPiece('O'),
        createMockPiece('T')
      ]
      gameStore.activeEffects = [
        {
          type: 'preview' as ItemType,
          active: true,
          startTime: Date.now(),
          duration: 15000
        }
      ]

      const wrapper = mount(NextPieces)

      const previews = wrapper.findAll('.piece-preview')
      expect(previews).toHaveLength(3)
    })

    it('should not detect inactive preview effect', () => {
      gameStore.queue = [createMockPiece(), createMockPiece()]
      gameStore.activeEffects = [
        {
          type: 'preview' as ItemType,
          active: false,
          startTime: Date.now() - 20000,
          duration: 15000
        }
      ]

      const wrapper = mount(NextPieces)

      const previews = wrapper.findAll('.piece-preview')
      expect(previews).toHaveLength(1)
      expect(wrapper.find('.next-title').text()).toBe('NEXT')
    })
  })

  describe('Piece Rendering', () => {
    it('should render mini-grid for piece', () => {
      gameStore.queue = [createMockPiece()]

      const wrapper = mount(NextPieces)

      expect(wrapper.find('.mini-grid').exists()).toBe(true)
    })

    it('should render cells with correct colors', () => {
      const piece = createMockPiece('I', '#FF0000')
      gameStore.queue = [piece]

      const wrapper = mount(NextPieces)

      const cells = wrapper.findAll('.mini-cell')
      const activeCells = cells.filter(cell => {
        const style = cell.attributes('style')
        return style && style.includes('#FF0000') && style.includes('background')
      })

      expect(activeCells.length).toBeGreaterThan(0)
    })

    it('should render different piece shapes correctly', () => {
      const iPiece = createMockPiece('I', '#00FFFF')
      const oPiece: ActivePiece = {
        shape: 'O',
        color: '#FFFF00',
        matrix: [
          [1, 1],
          [1, 1]
        ],
        x: 0,
        y: 0
      }

      gameStore.queue = [iPiece]
      const wrapper1 = mount(NextPieces)

      gameStore.queue = [oPiece]
      const wrapper2 = mount(NextPieces)

      // Both pieces should render successfully
      expect(wrapper1.find('.mini-grid').exists()).toBe(true)
      expect(wrapper2.find('.mini-grid').exists()).toBe(true)

      // Different pieces should have different colors
      expect(wrapper1.html()).toContain('#00FFFF')
      expect(wrapper2.html()).toContain('#FFFF00')
    })

    it('should set grid dimensions based on piece size', () => {
      const piece = createMockPiece()
      gameStore.queue = [piece]

      const wrapper = mount(NextPieces)

      const miniGrid = wrapper.find('.mini-grid')
      const style = miniGrid.attributes('style')

      expect(style).toContain('--width')
      expect(style).toContain('--height')
    })
  })

  describe('RenderPiece Function', () => {
    it('should calculate piece dimensions correctly', () => {
      const piece: ActivePiece = {
        shape: 'O',
        color: '#FFFF00',
        matrix: [
          [1, 1],
          [1, 1]
        ],
        x: 0,
        y: 0
      }
      gameStore.queue = [piece]

      const wrapper = mount(NextPieces)
      const vm = wrapper.vm as any

      const rendered = vm.renderPiece(piece)

      expect(rendered.width).toBe(2)
      expect(rendered.height).toBe(2)
      expect(rendered.cells).toHaveLength(4)
    })

    it('should handle I-piece correctly', () => {
      const piece = createMockPiece('I')
      gameStore.queue = [piece]

      const wrapper = mount(NextPieces)
      const vm = wrapper.vm as any

      const rendered = vm.renderPiece(piece)

      expect(rendered.width).toBe(4)
      expect(rendered.height).toBe(1)
    })

    it('should mark active cells correctly', () => {
      const piece: ActivePiece = {
        shape: 'T',
        color: '#AA00FF',
        matrix: [
          [0, 1, 0],
          [1, 1, 1],
          [0, 0, 0]
        ],
        x: 0,
        y: 0
      }
      gameStore.queue = [piece]

      const wrapper = mount(NextPieces)
      const vm = wrapper.vm as any

      const rendered = vm.renderPiece(piece)

      const activeCells = rendered.cells.filter((c: any) => c.active)
      expect(activeCells).toHaveLength(4) // T-piece has 4 blocks
    })

    it('should normalize coordinates to start from 0', () => {
      const piece = createMockPiece()
      gameStore.queue = [piece]

      const wrapper = mount(NextPieces)
      const vm = wrapper.vm as any

      const rendered = vm.renderPiece(piece)

      // All cells should have coordinates >= 0
      rendered.cells.forEach((cell: any) => {
        expect(cell.x).toBeGreaterThanOrEqual(0)
        expect(cell.y).toBeGreaterThanOrEqual(0)
      })
    })
  })

  describe('Multiple Pieces', () => {
    it('should render multiple pieces when preview active', () => {
      gameStore.queue = [
        createMockPiece('I', '#00FFFF'),
        createMockPiece('O', '#FFFF00'),
        createMockPiece('T', '#AA00FF')
      ]
      gameStore.activeEffects = [
        {
          type: 'preview' as ItemType,
          active: true,
          startTime: Date.now(),
          duration: 15000
        }
      ]

      const wrapper = mount(NextPieces)

      const miniGrids = wrapper.findAll('.mini-grid')
      expect(miniGrids).toHaveLength(3)
    })

    it('should render each piece with correct color', () => {
      gameStore.queue = [
        createMockPiece('I', '#FF0000'),
        createMockPiece('O', '#00FF00')
      ]
      gameStore.activeEffects = [
        {
          type: 'preview' as ItemType,
          active: true,
          startTime: Date.now(),
          duration: 15000
        }
      ]

      const wrapper = mount(NextPieces)

      const html = wrapper.html()
      expect(html).toContain('#FF0000')
      expect(html).toContain('#00FF00')
    })
  })

  describe('Edge Cases', () => {
    it('should handle piece with all zeros in matrix', () => {
      const emptyPiece: ActivePiece = {
        shape: 'EMPTY',
        color: '#FFFFFF',
        matrix: [
          [0, 0],
          [0, 0]
        ],
        x: 0,
        y: 0
      }
      gameStore.queue = [emptyPiece]

      const wrapper = mount(NextPieces)

      expect(wrapper.find('.mini-grid').exists()).toBe(true)
    })

    it('should handle queue with exact 5 pieces', () => {
      gameStore.queue = [
        createMockPiece('I'),
        createMockPiece('O'),
        createMockPiece('T'),
        createMockPiece('S'),
        createMockPiece('Z')
      ]
      gameStore.activeEffects = [
        {
          type: 'preview' as ItemType,
          active: true,
          startTime: Date.now(),
          duration: 15000
        }
      ]

      const wrapper = mount(NextPieces)

      const previews = wrapper.findAll('.piece-preview')
      expect(previews).toHaveLength(5)
    })

    it('should handle queue with more than 5 pieces', () => {
      gameStore.queue = Array(10).fill(null).map(() => createMockPiece())
      gameStore.activeEffects = [
        {
          type: 'preview' as ItemType,
          active: true,
          startTime: Date.now(),
          duration: 15000
        }
      ]

      const wrapper = mount(NextPieces)

      const previews = wrapper.findAll('.piece-preview')
      expect(previews).toHaveLength(5) // Should only show 5
    })
  })

  describe('Computed Properties', () => {
    it('should reactively update when preview effect changes', async () => {
      gameStore.queue = [
        createMockPiece(),
        createMockPiece(),
        createMockPiece()
      ]

      const wrapper = mount(NextPieces)

      expect(wrapper.findAll('.piece-preview')).toHaveLength(1)

      // Activate preview
      gameStore.activeEffects = [
        {
          type: 'preview' as ItemType,
          active: true,
          startTime: Date.now(),
          duration: 15000
        }
      ]

      await wrapper.vm.$nextTick()

      expect(wrapper.findAll('.piece-preview')).toHaveLength(3)
    })

    it('should update when queue changes', async () => {
      gameStore.queue = [createMockPiece()]

      const wrapper = mount(NextPieces)

      expect(wrapper.findAll('.piece-preview')).toHaveLength(1)

      // Add more pieces to queue
      gameStore.queue = [
        createMockPiece(),
        createMockPiece(),
        createMockPiece()
      ]

      await wrapper.vm.$nextTick()

      expect(wrapper.findAll('.piece-preview')).toHaveLength(1) // Still 1 without preview
    })
  })
})
