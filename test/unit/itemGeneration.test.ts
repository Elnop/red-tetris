import { describe, it, expect } from 'vitest'
import { generateRandomItemSpawns } from '~/utils/itemGeneration'
import { ItemType } from '~/types/items'
import { ITEM_TYPES } from '~/utils/itemsConfig'

describe('itemGeneration', () => {
	describe('generateRandomItemSpawns', () => {
		it('should generate a Map of item spawns', () => {
			const result = generateRandomItemSpawns(0.08, 200)

			expect(result).toBeInstanceOf(Map)
		})

		it('should generate approximately correct number of items based on spawn rate', () => {
			const spawnRate = 0.1
			const totalPieces = 1000
			const result = generateRandomItemSpawns(spawnRate, totalPieces)

			const expectedCount = totalPieces * spawnRate
			const actualCount = result.size

			// Allow 30% variance due to randomness
			expect(actualCount).toBeGreaterThan(expectedCount * 0.7)
			expect(actualCount).toBeLessThan(expectedCount * 1.3)
		})

		it('should respect different spawn rates', () => {
			const totalPieces = 1000

			const lowRate = generateRandomItemSpawns(0.05, totalPieces)
			const highRate = generateRandomItemSpawns(0.15, totalPieces)

			// Higher spawn rate should generally produce more items
			expect(highRate.size).toBeGreaterThan(lowRate.size * 1.5)
		})

		it('should generate items only for valid piece indices', () => {
			const totalPieces = 100
			const result = generateRandomItemSpawns(0.1, totalPieces)

			result.forEach((itemType, pieceIndex) => {
				expect(pieceIndex).toBeGreaterThanOrEqual(0)
				expect(pieceIndex).toBeLessThan(totalPieces)
			})
		})

		it('should only generate valid item types', () => {
			const result = generateRandomItemSpawns(0.2, 200)

			result.forEach((itemType) => {
				expect(ITEM_TYPES).toContain(itemType)
				expect(Object.values(ItemType)).toContain(itemType)
			})
		})

		it('should handle spawn rate of 0', () => {
			const result = generateRandomItemSpawns(0, 100)

			expect(result.size).toBe(0)
		})

		it('should handle spawn rate of 1', () => {
			const totalPieces = 100
			const result = generateRandomItemSpawns(1, totalPieces)

			// Should have items for all pieces
			expect(result.size).toBe(totalPieces)
		})

		it('should handle small number of pieces', () => {
			const result = generateRandomItemSpawns(0.5, 10)

			expect(result.size).toBeLessThanOrEqual(10)
			expect(result.size).toBeGreaterThanOrEqual(0)
		})

		it('should handle large number of pieces', () => {
			const result = generateRandomItemSpawns(0.08, 10000)

			expect(result).toBeInstanceOf(Map)
			// Should have approximately 800 items (10000 * 0.08)
			expect(result.size).toBeGreaterThan(500)
			expect(result.size).toBeLessThan(1100)
		})

		it('should generate different results on multiple calls', () => {
			const result1 = generateRandomItemSpawns(0.1, 200)
			const result2 = generateRandomItemSpawns(0.1, 200)

			// Convert to arrays for comparison
			const array1 = Array.from(result1.entries())
			const array2 = Array.from(result2.entries())

			// Results should be different (statistically almost certain)
			let differences = 0
			for (let i = 0; i < Math.min(array1.length, array2.length); i++) {
				if (array1[i]![0] !== array2[i]![0] || array1[i]![1] !== array2[i]![1]) {
					differences++
				}
			}

			expect(differences).toBeGreaterThan(0)
		})

		it('should have no duplicate indices in spawn map', () => {
			const result = generateRandomItemSpawns(0.5, 100)

			const indices = Array.from(result.keys())
			const uniqueIndices = new Set(indices)

			expect(uniqueIndices.size).toBe(indices.length)
		})

		it('should distribute item types relatively evenly', () => {
			const result = generateRandomItemSpawns(0.2, 2000)

			const typeCounts: Record<string, number> = {}

			result.forEach((itemType) => {
				typeCounts[itemType] = (typeCounts[itemType] || 0) + 1
			})

			// With 2000 pieces and 0.2 rate, expect ~400 items
			// Distributed across 8 types = ~50 each
			// Check that no type is completely missing
			const allTypes = Object.values(ItemType)
			allTypes.forEach(itemType => {
				const count = typeCounts[itemType] || 0
				// At least some of each type should appear
				expect(count).toBeGreaterThan(0)
			})
		})

		it('should work with default totalPieces parameter', () => {
			const result = generateRandomItemSpawns(0.08)

			expect(result).toBeInstanceOf(Map)
			// Default should be 200 pieces, so ~16 items expected
			expect(result.size).toBeGreaterThan(5)
			expect(result.size).toBeLessThan(40)
		})

		describe('Edge Cases', () => {
			it('should handle very low spawn rate', () => {
				const result = generateRandomItemSpawns(0.001, 1000)

				expect(result).toBeInstanceOf(Map)
				// Might have 0-3 items with such a low rate
				expect(result.size).toBeLessThan(10)
			})

			it('should handle very high spawn rate', () => {
				const result = generateRandomItemSpawns(0.99, 100)

				expect(result.size).toBeGreaterThan(90)
				expect(result.size).toBeLessThanOrEqual(100)
			})

			it('should handle single piece', () => {
				const result = generateRandomItemSpawns(0.5, 1)

				expect(result.size).toBeLessThanOrEqual(1)
				expect(result.size).toBeGreaterThanOrEqual(0)
			})

			it('should handle zero pieces', () => {
				const result = generateRandomItemSpawns(0.5, 0)

				expect(result.size).toBe(0)
			})
		})

		describe('Statistical Properties', () => {
			it('should have correct average spawn rate over multiple runs', () => {
				const spawnRate = 0.1
				const totalPieces = 500
				const runs = 10

				let totalItems = 0
				for (let i = 0; i < runs; i++) {
					const result = generateRandomItemSpawns(spawnRate, totalPieces)
					totalItems += result.size
				}

				const averageItems = totalItems / runs
				const expectedItems = totalPieces * spawnRate

				// Average should be within 20% of expected
				expect(averageItems).toBeGreaterThan(expectedItems * 0.8)
				expect(averageItems).toBeLessThan(expectedItems * 1.2)
			})

			it('should show variance in spawn counts', () => {
				const spawnRate = 0.1
				const totalPieces = 200
				const runs = 20

				const counts: number[] = []
				for (let i = 0; i < runs; i++) {
					const result = generateRandomItemSpawns(spawnRate, totalPieces)
					counts.push(result.size)
				}

				// Should have different counts (not all the same)
				const uniqueCounts = new Set(counts)
				expect(uniqueCounts.size).toBeGreaterThan(5)
			})

			it('should randomly select from all available item types', () => {
				const result = generateRandomItemSpawns(0.3, 1000)

				const typesFound = new Set<ItemType>()
				result.forEach((itemType) => {
					typesFound.add(itemType)
				})

				// With 300 items, all 8 types should appear
				expect(typesFound.size).toBeGreaterThanOrEqual(6)
			})
		})

		describe('Return Value Structure', () => {
			it('should return Map with number keys and ItemType values', () => {
				const result = generateRandomItemSpawns(0.1, 100)

				result.forEach((value, key) => {
					expect(typeof key).toBe('number')
					expect(typeof value).toBe('string')
					expect(Object.values(ItemType)).toContain(value)
				})
			})

			it('should be iterable', () => {
				const result = generateRandomItemSpawns(0.1, 100)

				const entries = Array.from(result.entries())
				expect(Array.isArray(entries)).toBe(true)
				expect(entries.length).toBe(result.size)
			})

			it('should allow Map operations', () => {
				const result = generateRandomItemSpawns(0.1, 100)

				// Test has() method
				if (result.size > 0) {
					const firstKey = Array.from(result.keys())[0]!
					expect(result.has(firstKey)).toBe(true)
				}

				// Test get() method
				if (result.size > 0) {
					const firstKey = Array.from(result.keys())[0]!
					const value = result.get(firstKey)
					expect(value).toBeDefined()
					expect(ITEM_TYPES).toContain(value!)
				}

				// Test keys() method
				const keys = Array.from(result.keys())
				expect(keys.every(k => typeof k === 'number')).toBe(true)

				// Test values() method
				const values = Array.from(result.values())
				expect(values.every(v => ITEM_TYPES.includes(v))).toBe(true)
			})
		})

		describe('Performance', () => {
			it('should handle large datasets efficiently', () => {
				const startTime = Date.now()

				generateRandomItemSpawns(0.08, 100000)

				const endTime = Date.now()
				const duration = endTime - startTime

				// Should complete in less than 1 second
				expect(duration).toBeLessThan(1000)
			})
		})
	})
})
