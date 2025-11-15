import { ItemType, type ItemConfig } from '~/types/items'

export const ITEMS_CONFIG: Record<ItemType, ItemConfig> = {
	[ItemType.BLOCK_BOMB]: {
		type: ItemType.BLOCK_BOMB,
		name: 'Block Bomb',
		icon: '💥',
		description: 'Détruit un carré de 3x3 blocs au centre de votre grille',
		targetSelf: true,
		targetOthers: false
	},
	[ItemType.ADD_LINES]: {
		type: ItemType.ADD_LINES,
		name: 'Poisoned Gift',
		icon: '🎁',
		description: 'Envoie 1 ligne de garbage à tous les adversaires',
		targetSelf: false,
		targetOthers: true
	},
	[ItemType.ITEM_RUSH]: {
		type: ItemType.ITEM_RUSH,
		name: 'Item Rush',
		icon: '🍀',
		description: 'Augmente à 100% la chance d\'avoir des items pendant 12 secondes',
		duration: 12000,
		targetSelf: true,
		targetOthers: false
	},
	[ItemType.GROUND_BREAKER]: {
		type: ItemType.GROUND_BREAKER,
		name: 'Ground Breaker',
		icon: '🌊',
		description: 'Détruit la ligne la plus basse et fait descendre tout le reste',
		targetSelf: true,
		targetOthers: false
	},
	[ItemType.CONFUSION]: {
		type: ItemType.CONFUSION,
		name: 'Confusion',
		icon: '🌀',
		description: 'Inverse les contrôles de tous les adversaires pendant 5 secondes',
		duration: 5000,
		targetSelf: false,
		targetOthers: true
	},
	[ItemType.FREEZE]: {
		type: ItemType.FREEZE,
		name: 'Freeze',
		icon: '❄️',
		description: 'Gèle tous les adversaires pendant 3 secondes',
		duration: 3000,
		targetSelf: false,
		targetOthers: true
	},
	[ItemType.IMMUNITY]: {
		type: ItemType.IMMUNITY,
		name: 'Immunity',
		icon: '🛡️',
		description: 'Immunité contre les garbage lines pendant 10 secondes',
		duration: 10000,
		targetSelf: true,
		targetOthers: false
	},
	[ItemType.PREVIEW]: {
		type: ItemType.PREVIEW,
		name: 'Preview',
		icon: '🔮',
		description: 'Voir les 5 prochaines pièces pendant 10 secondes',
		duration: 10000,
		targetSelf: true,
		targetOthers: false
	}
}

export const ITEM_SPAWN_RATE = 0.08 // 8% chance per piece
export const MAX_INVENTORY_SIZE = 5

// Export array of all item types for random selection
export const ITEM_TYPES = Object.values(ItemType)

// Utility function to get a random item type
export function getRandomItemType(): ItemType {
	const randomIndex = Math.floor(Math.random() * ITEM_TYPES.length)
	return ITEM_TYPES[randomIndex] as ItemType
}
