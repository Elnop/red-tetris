import { storeToRefs } from 'pinia'
import { useGameStore } from '~/stores/useGameStore'
import { useRoomStore } from '~/stores/useRoomStore'
import { useUserStore } from '~/stores/useUserStore'
import type { Item, ItemType, ItemEffect } from '~/types/items'
import { ITEMS_CONFIG, getRandomItemType } from '~/utils/itemsConfig'

export function useItems() {
	const gameStore = useGameStore()
	const roomStore = useRoomStore()
	const userStore = useUserStore()

	const {
		inventory,
		activeEffects,
		currentPieceIndex,
		currentPieceHasItem,
		grid,
		isPlaying,
		isAlive,
		active,
		posX,
		posY
	} = storeToRefs(gameStore)

	const {
		addItemToInventory,
		removeItemFromInventory,
		addActiveEffect,
		removeActiveEffect,
		hasActiveEffect,
		incrementPieceIndex,
		setGridCell,
		setLine,
		setIsAlive,
		canPlace,
		setActive,
		setPosY,
		ROWS,
		COLS
	} = gameStore

	// Generate unique ID for items
	function generateItemId(): string {
		return `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
	}

	// Add garbage lines (same as useBoard to match existing system)
	function addGarbageLines(count: number) {
		if (!isAlive.value) return
		// Shift the grid upward
		for (let y = 0; y < ROWS - count; y++) {
			setLine(y, grid.value[y + count]!)
		}

		// Add penalty lines at the bottom (indestructible white lines)
		for (let y = ROWS - count; y < ROWS; y++) {
			// Create a completely white line without holes
			setLine(y, Array(COLS).fill('#FFFFFF'))
		}

		// If the active piece is now in an invalid position, move it up
		if (active.value && !canPlace(active.value.matrix, posX.value, posY.value)) {
			setPosY(posY.value - count)
			// If still invalid, game over
			if (!canPlace(active.value.matrix, posX.value, posY.value)) {
				setActive(null)
				setIsAlive(false)
				// Note: emitGameOver should be called by useGame, not here
			}
		}
	}

	// Collect item when piece is placed
	function collectItem(itemType: ItemType) {
		const item: Item = {
			id: generateItemId(),
			type: itemType,
			icon: ITEMS_CONFIG[itemType].icon
		}

		const added = addItemToInventory(item)
		// No server emit needed - items are generated and managed locally per client
	}

	// Use an item from inventory
	function useItem(itemId: string, targetUsername?: string) {
		const item = removeItemFromInventory(itemId)
		if (!item || !isPlaying.value || !isAlive.value) return

		const config = ITEMS_CONFIG[item.type]

		// Don't apply effect locally - let the server broadcast it to all players
		// This ensures correct targeting for offensive items

		// Emit to server
		const socket = useNuxtApp().$socket
		if (socket) {
			socket.emit('item-used', {
				room: roomStore.currentRoom,
				username: userStore.username,
				itemType: item.type,
				targetUsername
			})
		}
	}

	// Apply item effect
	function applyItemEffect(itemType: ItemType, targetUsername?: string) {
		const config = ITEMS_CONFIG[itemType]
		// Empty string means "other players", undefined means "self"
		const isSelfTarget = targetUsername === userStore.username || targetUsername === undefined

		if (!isSelfTarget && !config.targetOthers) return
		if (isSelfTarget && !config.targetSelf) return

		switch (itemType) {
			case 'block_bomb':
				if (isSelfTarget) effectBlockBomb()
				break
			case 'add_lines':
				if (!isSelfTarget) effectAddLines(1)
				break
			case 'item_rush':
				if (isSelfTarget && config.duration) effectItemRush(config.duration)
				break
			case 'ground_breaker':
				if (isSelfTarget) effectGroundBreaker()
				break
			case 'confusion':
				if (!isSelfTarget && config.duration) effectConfusion(config.duration)
				break
			case 'freeze':
				if (!isSelfTarget && config.duration) effectFreeze(config.duration)
				break
			case 'immunity':
				if (isSelfTarget && config.duration) effectImmunity(config.duration)
				break
			case 'preview':
				if (isSelfTarget && config.duration) effectPreview(config.duration)
				break
		}
	}

	// ========= ITEM EFFECTS IMPLEMENTATION

	function effectBlockBomb() {
		// Find the highest block in the entire grid (topmost filled cell)
		let highestX = -1
		let highestY = -1

		outerLoop:
		for (let y = 0; y < ROWS; y++) {
			for (let x = 0; x < COLS; x++) {
				if (grid.value[y]?.[x]) {
					highestX = x
					highestY = y
					break outerLoop
				}
			}
		}

		// If no blocks found, target center bottom area
		if (highestX === -1 || highestY === -1) {
			highestX = Math.floor(COLS / 2)
			highestY = ROWS - 5
		}

		// Target one row below the highest block to hit more filled cells
		const targetX = highestX
		const targetY = Math.min(highestY + 1, ROWS - 1)

		// Collect cells to clear and flash
		const cellsToFlash: Array<{ x: number; y: number }> = []
		let hadBlocks = 0

		// Clear 3x3 area around target block
		for (let dy = -1; dy <= 1; dy++) {
			for (let dx = -1; dx <= 1; dx++) {
				const x = targetX + dx
				const y = targetY + dy
				if (x >= 0 && x < COLS && y >= 0 && y < ROWS) {
					cellsToFlash.push({ x, y })
					if (grid.value[y]?.[x]) {
						hadBlocks++
					}
					setGridCell(x, y, null)
				}
			}
		}

		// Trigger flash effect
		triggerFlashEffect(cellsToFlash)
	}

	// Flash effect for visual feedback
	function triggerFlashEffect(cells: Array<{ x: number; y: number }>) {
		// Dispatch custom event for visual effect
		window.dispatchEvent(new CustomEvent('block-bomb-flash', {
			detail: { cells }
		}))
	}

	function effectAddLines(count: number) {
		// This will be applied on the target player via Socket.IO
		// The actual implementation is in the addGarbageLines function
		addGarbageLines(count)
	}

	function effectItemRush(duration: number) {
		const effect: ItemEffect = {
			type: 'item_rush',
			startTime: Date.now(),
			duration,
			active: true
		}
		addActiveEffect(effect)

		// Remove effect after duration
		setTimeout(() => {
			removeActiveEffect('item_rush')
		}, duration)
	}

	function effectGroundBreaker() {
		if (!isAlive.value) return

		// Shift all lines down (destroy bottom line, move everything down)
		for (let y = ROWS - 1; y > 0; y--) {
			setLine(y, grid.value[y - 1]!)
		}

		// Add empty line at the top
		setLine(0, Array(COLS).fill(null))
	}

	function effectConfusion(duration: number) {
		const effect: ItemEffect = {
			type: 'confusion',
			startTime: Date.now(),
			duration,
			active: true
		}
		addActiveEffect(effect)

		setTimeout(() => {
			removeActiveEffect('confusion')
		}, duration)
	}

	function effectFreeze(duration: number) {
		const effect: ItemEffect = {
			type: 'freeze',
			startTime: Date.now(),
			duration,
			active: true
		}
		addActiveEffect(effect)

		setTimeout(() => {
			removeActiveEffect('freeze')
		}, duration)
	}

	function effectImmunity(duration: number) {
		const effect: ItemEffect = {
			type: 'immunity',
			startTime: Date.now(),
			duration,
			active: true
		}
		addActiveEffect(effect)

		setTimeout(() => {
			removeActiveEffect('immunity')
		}, duration)
	}

	function effectPreview(duration: number) {
		const effect: ItemEffect = {
			type: 'preview',
			startTime: Date.now(),
			duration,
			active: true
		}
		addActiveEffect(effect)

		setTimeout(() => {
			removeActiveEffect('preview')
		}, duration)
	}

	// Update active effects (call in game loop)
	function updateActiveEffects() {
		const now = Date.now()
		activeEffects.value.forEach(effect => {
			if (effect.active && now - effect.startTime > effect.duration) {
				effect.active = false
			}
		})
	}

	return {
		inventory,
		activeEffects,
		collectItem,
		useItem,
		applyItemEffect,
		updateActiveEffects,
		hasActiveEffect,
		currentPieceHasItem
	}
}
