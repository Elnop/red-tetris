import { describe, it, expect } from 'vitest'
import {
  rotateCW,
  toCoords,
  renderMatrix,
  generateQueue,
  createPRNG,
  generateQueueFromSeed,
  rotateActiveCW,
  PIECES,
  type Matrix,
  type PieceName
} from '~/utils/pieces'

describe('Pieces Utils', () => {
  describe('rotateCW', () => {
    it('should rotate a 2x2 matrix clockwise', () => {
      const matrix: Matrix = [
        [1, 0],
        [1, 1]
      ]
      const expected: Matrix = [
        [1, 1],
        [1, 0]
      ]
      expect(rotateCW(matrix)).toEqual(expected)
    })

    it('should rotate a 3x3 matrix clockwise', () => {
      const matrix: Matrix = [
        [1, 0, 0],
        [1, 1, 0],
        [0, 0, 0]
      ]
      const expected: Matrix = [
        [0, 1, 1],
        [0, 1, 0],
        [0, 0, 0]
      ]
      expect(rotateCW(matrix)).toEqual(expected)
    })

    it('should handle 4x4 matrix rotation', () => {
      const matrix: Matrix = [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
      ]
      const expected: Matrix = [
        [0, 0, 1, 0],
        [0, 0, 1, 0],
        [0, 0, 1, 0],
        [0, 0, 1, 0]
      ]
      expect(rotateCW(matrix)).toEqual(expected)
    })
  })

  describe('toCoords', () => {
    it('should extract coordinates of active cells', () => {
      const matrix: Matrix = [
        [1, 0, 0],
        [1, 1, 0],
        [0, 0, 1]
      ]
      const expected = [[0, 0], [0, 1], [1, 1], [2, 2]]
      expect(toCoords(matrix)).toEqual(expected)
    })

    it('should return empty array for matrix with no active cells', () => {
      const matrix: Matrix = [
        [0, 0],
        [0, 0]
      ]
      expect(toCoords(matrix)).toEqual([])
    })

    it('should handle single active cell', () => {
      const matrix: Matrix = [
        [0, 0],
        [0, 1]
      ]
      expect(toCoords(matrix)).toEqual([[1, 1]])
    })
  })

  describe('renderMatrix', () => {
    it('should render matrix with symbols', () => {
      const matrix: Matrix = [
        [1, 0],
        [1, 1]
      ]
      const expected = '■ ·\n■ ■'
      expect(renderMatrix(matrix)).toBe(expected)
    })

    it('should render empty matrix', () => {
      const matrix: Matrix = [
        [0, 0],
        [0, 0]
      ]
      const expected = '· ·\n· ·'
      expect(renderMatrix(matrix)).toBe(expected)
    })
  })

  describe('generateQueue', () => {
    it('should generate queue of specified length', () => {
      const queue = generateQueue(5)
      expect(queue).toHaveLength(5)
      queue.forEach(piece => {
        expect(piece).toHaveProperty('name')
        expect(piece).toHaveProperty('color')
        expect(piece).toHaveProperty('rotIndex')
        expect(piece).toHaveProperty('matrix')
        expect(['I', 'T', 'L', 'J', 'S', 'Z', 'O']).toContain(piece.name)
      })
    })

    it('should generate different queues on multiple calls', () => {
      const queue1 = generateQueue(3)
      const queue2 = generateQueue(3)
      // This is probabilistic, but with 7 pieces and 3 calls, it's very unlikely to be identical
      const sameSequence = queue1.every((piece, index) => 
        piece.name === queue2[index]?.name && piece.rotIndex === queue2[index]?.rotIndex
      )
      expect(sameSequence).toBe(false)
    })
  })

  describe('createPRNG', () => {
    it('should create deterministic random number generator', () => {
      const prng1 = createPRNG(12345)
      const prng2 = createPRNG(12345)
      
      const values1 = Array.from({ length: 5 }, () => prng1())
      const values2 = Array.from({ length: 5 }, () => prng2())
      
      expect(values1).toEqual(values2)
    })

    it('should generate different sequences for different seeds', () => {
      const prng1 = createPRNG(12345)
      const prng2 = createPRNG(54321)
      
      const values1 = Array.from({ length: 5 }, () => prng1())
      const values2 = Array.from({ length: 5 }, () => prng2())
      
      expect(values1).not.toEqual(values2)
    })

    it('should generate values between 0 and 1', () => {
      const prng = createPRNG(12345)
      const values = Array.from({ length: 100 }, () => prng())
      
      values.forEach(value => {
        expect(value).toBeGreaterThanOrEqual(0)
        expect(value).toBeLessThan(1)
      })
    })
  })

  describe('generateQueueFromSeed', () => {
    it('should generate deterministic queue from seed', () => {
      const queue1 = generateQueueFromSeed(12345, 10)
      const queue2 = generateQueueFromSeed(12345, 10)
      
      expect(queue1).toEqual(queue2)
    })

    it('should generate different queues for different seeds', () => {
      const queue1 = generateQueueFromSeed(12345, 10)
      const queue2 = generateQueueFromSeed(54321, 10)
      
      expect(queue1).not.toEqual(queue2)
    })

    it('should implement 7-bag algorithm (each piece appears once in 7)', () => {
      const queue = generateQueueFromSeed(12345, 14) // 2 full bags
      const firstBag = queue.slice(0, 7).map(p => p.name).sort()
      const secondBag = queue.slice(7, 14).map(p => p.name).sort()
      const allPieces: PieceName[] = ['I', 'T', 'L', 'J', 'S', 'Z', 'O']
      
      expect(firstBag).toEqual(allPieces.sort())
      expect(secondBag).toEqual(allPieces.sort())
    })
  })

  describe('rotateActiveCW', () => {
    it('should rotate active piece clockwise', () => {
      const piece = {
        name: 'T' as PieceName,
        color: '#8A2BE2',
        rotIndex: 0,
        matrix: PIECES.T.rotations[0]
      }
      
      const rotated = rotateActiveCW(piece)
      
      expect(rotated.name).toBe('T')
      expect(rotated.color).toBe('#8A2BE2')
      expect(rotated.rotIndex).toBe(1)
      expect(rotated.matrix).toEqual(PIECES.T.rotations[1])
    })

    it('should wrap around rotation index', () => {
      const tPiece = PIECES.T
      const lastRotationIndex = tPiece.rotations.length - 1
      
      const piece = {
        name: 'T' as PieceName,
        color: '#8A2BE2',
        rotIndex: lastRotationIndex,
        matrix: tPiece.rotations[lastRotationIndex]
      }
      
      const rotated = rotateActiveCW(piece)
      
      expect(rotated.rotIndex).toBe(0)
      expect(rotated.matrix).toEqual(tPiece.rotations[0])
    })
  })

  describe('PIECES constant', () => {
    it('should contain all 7 piece types', () => {
      const pieceNames = Object.keys(PIECES) as PieceName[]
      expect(pieceNames).toHaveLength(7)
      expect(pieceNames.sort()).toEqual(['I', 'J', 'L', 'O', 'S', 'T', 'Z'])
    })

    it('should have valid piece definitions', () => {
      Object.entries(PIECES).forEach(([name, piece]) => {
        expect(piece.name).toBe(name)
        expect(typeof piece.color).toBe('string')
        expect(piece.color).toMatch(/^#[0-9A-Fa-f]{6}$/) // Valid hex color
        expect(Array.isArray(piece.base)).toBe(true)
        expect(Array.isArray(piece.rotations)).toBe(true)
        expect(piece.rotations.length).toBeGreaterThan(0)
        expect(piece.rotations.length).toBeLessThanOrEqual(4)
      })
    })

    it('should have square piece defined correctly', () => {
      const oPiece = PIECES.O
      // Square actually has 4 rotations stored, but they might be identical
      expect(oPiece.rotations.length).toBeGreaterThanOrEqual(1)
      expect(oPiece.rotations.length).toBeLessThanOrEqual(4)
    })

    it('should have line piece defined correctly', () => {
      const iPiece = PIECES.I
      // Line piece can have 2 or 4 rotations depending on implementation
      expect(iPiece.rotations.length).toBeGreaterThanOrEqual(2)
      expect(iPiece.rotations.length).toBeLessThanOrEqual(4)
    })
  })
})