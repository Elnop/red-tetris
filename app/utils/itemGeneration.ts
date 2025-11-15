import { ItemType } from '~/types/items'

// Get all available item types
const ITEM_TYPES = Object.values(ItemType)

/**
 * Generate random item spawns for pieces (completely random, not deterministic)
 * Each client will generate different items independently
 *
 * @param spawnRate - Probability of item spawn per piece (0-1, e.g., 0.08 = 8%)
 * @param totalPieces - Number of pieces to generate items for (default 200)
 * @returns Map of piece index to item type
 */
export function generateRandomItemSpawns(spawnRate: number, totalPieces: number = 200): Map<number, ItemType> {
	const itemSpawns = new Map<number, ItemType>()

	for (let i = 0; i < totalPieces; i++) {
		// Random chance for item spawn
		if (Math.random() < spawnRate) {
			// Pick random item type
			const randomIndex = Math.floor(Math.random() * ITEM_TYPES.length)
			const itemType = ITEM_TYPES[randomIndex] as ItemType
			itemSpawns.set(i, itemType)
		}
	}

	return itemSpawns
}
