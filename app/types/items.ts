export enum ItemType {
	BLOCK_BOMB = 'block_bomb',
	ADD_LINES = 'add_lines',
	SPEED_DOWN = 'speed_down',
	CLEAR_RANDOM = 'clear_random',
	CONFUSION = 'confusion',
	FREEZE = 'freeze',
	IMMUNITY = 'immunity',
	PREVIEW = 'preview'
}

export interface Item {
	id: string
	type: ItemType
	icon: string
}

export interface ItemEffect {
	type: ItemType
	startTime: number
	duration: number
	active: boolean
}

export interface ItemInventory {
	items: Item[]
	maxSize: number
	activeEffects: ItemEffect[]
}

export interface ItemConfig {
	type: ItemType
	name: string
	icon: string
	description: string
	duration?: number // in milliseconds (for timed effects)
	targetSelf?: boolean
	targetOthers?: boolean
}

// Item generation for pieces
export interface PieceWithItem {
	pieceIndex: number // which piece in the queue gets the item
	item: ItemType
}
