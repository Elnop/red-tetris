import { defineStore } from "pinia"
import { computed, ref } from "vue"
import type { BoardCell, GhostData } from "~/types/game"
import type { Item, ItemEffect, ItemType } from "~/types/items"
import { generateQueue, generateQueueFromSeed, toCoords, type ActivePiece } from "~/utils/pieces"
import { useUserStore } from "./useUserStore"
import { useRoomStore } from "./useRoomStore"
import { MAX_INVENTORY_SIZE, getRandomItemType } from "~/utils/itemsConfig"

export const useGameStore = defineStore('game', () => {
	const FPS = 60
	const COLS = 10
	const ROWS = 20
	
	const isPlaying = ref(false)
	const isAlive = ref(false)
	const won = ref(false)
	const disappearOpacity = ref(1)
	const disappearAnimationId = ref(0)
	const winner = ref<string | null>(null)
	const gameStartTime = ref(0)
	const level = ref(0)
	const linesCleared = ref(0)
	const linesToNextLevel = ref(10)
	const grid = ref<BoardCell[][]>(
		Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => null))
	)
	const ghostGrids = ref<Record<string, GhostData>>({})
	const queue = ref<ActivePiece[]>([])
	const active = ref<ActivePiece | null>(null)
	const posX = ref(Math.floor((COLS - 4) / 2))
	const posY = ref(0)
	const softDrop = ref(false)
	const lastDropTime = ref(0)
	const lastMoveTime = ref(0)
	const lastRotateTime = ref(0)
	const dropInterval = ref(1000)
	const lastTime = ref(0)
	const dropTimer = ref(0)
	const animationFrameId = ref<number>()
	let gameLoopInterval: ReturnType<typeof setInterval> | null = null

	let lastFrameTime = 0

	// Item system state
	const inventory = ref<Item[]>([])
	const activeEffects = ref<ItemEffect[]>([])
	const itemSpawnMap = ref<Map<number, ItemType>>(new Map())
	const currentPieceIndex = ref(0)
	
	const userStore = useUserStore()
	const roomStore = useRoomStore()
	
	const flatCells = computed(() => { 
		return grid.value.flat()
	})
	// const flatGridColors = computed(() => grid.flat())
	
	// ========== SETTERS
	
	function removeGhost(username: string) {
		delete ghostGrids.value[username]
	}
	
	function setActive(value: ActivePiece | null) {
		active.value = value
	}
	
	function setIsAlive(value: boolean) {
		isAlive.value = value
	}
	
	function setPosY(value: number) {
		posY.value = value
	}
	function setDropTimer(value: number) {
		dropTimer.value = value
	}
	
	function setGridCell(x: number, y: number, value: BoardCell) {
		if (y >= 0 && y < ROWS && x >= 0 && x < COLS)
			grid.value[y]![x] = value
	}


	function setLine(y: number, value: BoardCell[]) {
		if (y >= 0 && y < ROWS)
			grid.value[y] = value
	}
	
	function setPosX(value: number) {
		posX.value = value
	}
	
	function setSoftDrop(value: boolean) {
		softDrop.value = value
	}
	
	function initQueue(seed?: number) {
		queue.value = seed === undefined ? generateQueue(14) : generateQueueFromSeed(seed, 200)
	}

	function setIsPlaying(value: boolean) {
		isPlaying.value = value
	}

	// ========= ITEM METHODS

	function addItemToInventory(item: Item): boolean {
		if (inventory.value.length >= MAX_INVENTORY_SIZE) return false
		inventory.value.push(item)
		return true
	}

	function removeItemFromInventory(itemId: string): Item | null {
		const index = inventory.value.findIndex(i => i.id === itemId)
		if (index === -1) return null
		const [item] = inventory.value.splice(index, 1)
		return item || null
	}

	function addActiveEffect(effect: ItemEffect) {
		activeEffects.value.push(effect)
	}

	function removeActiveEffect(effectType: ItemType) {
		activeEffects.value = activeEffects.value.filter(e => e.type !== effectType)
	}

	function hasActiveEffect(effectType: ItemType): boolean {
		return activeEffects.value.some(e => e.type === effectType && e.active)
	}

	function setItemSpawnMap(itemSpawns: Array<{index: number; type: ItemType}>) {
		itemSpawnMap.value = new Map(itemSpawns.map(item => [item.index, item.type]))
	}

	function incrementPieceIndex() {
		currentPieceIndex.value++
	}

	function currentPieceHasItem(): boolean {
		// If Item Rush is active, all pieces have items
		if (hasActiveEffect('item_rush' as ItemType)) {
			return true
		}
		// Otherwise, check the pre-generated item spawn map
		return itemSpawnMap.value.has(currentPieceIndex.value)
	}

	function getCurrentPieceItemType(): ItemType | null {
		// If Item Rush is active, generate a random item
		if (hasActiveEffect('item_rush' as ItemType)) {
			const randomItem = getRandomItemType()
			return randomItem
		}
		// Otherwise, get item from pre-generated map
		return itemSpawnMap.value.get(currentPieceIndex.value) || null
	}

	function clearItemStates() {
		inventory.value = []
		activeEffects.value = []
		itemSpawnMap.value = new Map()
		currentPieceIndex.value = 0
	}
	
	// ========= GETTERS
	
	function getNewDeltaTime(): number {
		const now = performance.now()
		const dt = now - lastFrameTime
		lastFrameTime = now
		return dt
	}
	
	// ========= METHODS
	
	const startGameLoop = (gameLoop: () => void) => {
		if (gameLoopInterval) {
			clearInterval(gameLoopInterval)
		}
		gameLoopInterval = setInterval(gameLoop, 1000 / FPS)
	}
	
	const clearGameStates = () => {
		if (gameLoopInterval) {
			clearInterval(gameLoopInterval)
			gameLoopInterval = null
		}
		if (animationFrameId.value) {
			cancelAnimationFrame(animationFrameId.value)
			animationFrameId.value = undefined
		}

		grid.value = Array(ROWS).fill(null).map(() => Array(COLS).fill(null))
		ghostGrids.value = {}
		isAlive.value = true
		isPlaying.value = false
		won.value = false
		winner.value = null
		disappearOpacity.value = 1
		posX.value = Math.floor((COLS - 4) / 2)
		posY.value = 0
		active.value = null
		queue.value = []
		linesCleared.value = 0
		level.value = 0
		linesToNextLevel.value = 10
		gameStartTime.value = 0
		lastTime.value = 0
		lastDropTime.value = 0
		lastMoveTime.value = 0
		lastRotateTime.value = 0
		dropInterval.value = 1000
		if (disappearAnimationId.value) {
			cancelAnimationFrame(disappearAnimationId.value)
			disappearAnimationId.value = 0
		}
		// Don't clear item states here - they are set by the server before startGame is called
		// Only clear inventory and active effects (not the spawn map)
		inventory.value = []
		activeEffects.value = []
		currentPieceIndex.value = 0
	}
	
	const tryMoveActivePiece = (dx: number, dy: number): boolean => {
		if (!active.value || !isAlive.value) return false
		const nx = posX.value + dx
		const ny = posY.value + dy
		if (canPlace(active.value.matrix, nx, ny)) {
			posX.value = nx
			posY.value = ny
			return true
		}
		return false
	}
	
	const refillQueue = () => {
		if (queue.value.length < 7) queue.value.push(...generateQueue(7))
		}
	
	const updateLevelInfo = (linesRemoved: number): void => {
		userStore.addGlobalLinesCleared(linesRemoved)
		linesCleared.value += linesRemoved
		const newLevel = Math.floor(linesCleared.value / 10)
		
		if (newLevel > level.value) {
			level.value = newLevel
			linesToNextLevel.value = 10 - (linesCleared.value % 10)
		} else {
			linesToNextLevel.value -= linesRemoved
		}
	}
	
	const canPlace = (matrix: ActivePiece['matrix'], x: number, y: number): boolean => {
		for (const [dx, dy] of toCoords(matrix)) {
			const px = x + dx
			const py = y + dy
			if (px < 0 || px >= COLS) return false
			if (py >= ROWS) return false
			if (py < 0) continue // above the board: allowed
			if (grid.value[py]![px]) return false
		}
		return true
	}
	
	const updateGhostGrids = (username: string, ghostData: GhostData): void => {
		ghostGrids.value = {
			...ghostGrids.value,
			[username]: ghostData
		}
	}
	
	const onWin = (winnerName: string) => {
		if (winnerName === userStore.username)
			won.value = true
		isAlive.value = false
		active.value = null
		winner.value = winnerName
	}
	
	function disappear() {
		isAlive.value = false
		const fadeOutDuration = 1500
		const startTime = Date.now()
		
		const animateDisappear = () => {
			const elapsed = Date.now() - startTime
			const progress = Math.min(elapsed / fadeOutDuration, 1)
			disappearOpacity.value = 1 - progress
			
			if (progress < 1) {
				animationFrameId.value = requestAnimationFrame(animateDisappear)
			} else {
				grid.value = Array(ROWS).fill(null).map(() => Array(COLS).fill(null))
				disappearOpacity.value = 0
				animationFrameId.value = undefined
			}
		}
		
		animateDisappear()
	}
	
	return {
		setGridCell,
		grid,
		active,
		posX,
		posY,
		ROWS,
		COLS,
		getNewDeltaTime,
		dropTimer,
		setDropTimer,
		tryMoveActivePiece,
		updateLevelInfo,
		softDrop,
		isPlaying,
		isAlive,
		level,
		startGameLoop,
		ghostGrids,
		updateGhostGrids,
		disappear,
		onWin,
		won,
		setLine,
		canPlace,
		setPosY,
		setActive,
		setIsAlive,
		winner,
		queue,
		clearGameStates,
		generateQueue,
		setSoftDrop,
		setPosX,
		refillQueue,
		setIsPlaying,
		initQueue,
		flatCells,
		removeGhost,
		linesCleared,
		// Item system
		inventory,
		activeEffects,
		itemSpawnMap,
		currentPieceIndex,
		addItemToInventory,
		removeItemFromInventory,
		addActiveEffect,
		removeActiveEffect,
		hasActiveEffect,
		setItemSpawnMap,
		incrementPieceIndex,
		currentPieceHasItem,
		getCurrentPieceItemType,
		clearItemStates
	}
})