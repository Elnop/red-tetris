import { defineStore } from "pinia"
import { computed, ref } from "vue"
import type { BoardCell, GhostData } from "~/types/game"
import { generateQueue, generateQueueFromSeed, toCoords, type ActivePiece } from "~/utils/pieces"
import { useUserStore } from "./useUserStore"

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
	
	const userStore = useUserStore()

	const flatCells = computed(() => { 
		return grid.value.flat()
	})
	// const flatGridColors = computed(() => grid.flat())

	// ========== SETTERS

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
		else
			console.warn(`Invalid grid cell coordinates: x=${x}, y=${y}`)
	}


	function setLine(y: number, value: BoardCell[]) {
		if (y >= 0 && y < ROWS)
			grid.value[y] = value
		else
			console.warn(`Invalid grid line index: y=${y}`)
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
			if (py < 0) continue // au-dessus du plateau: autorisé
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

	const onUserLeft = (username: string) => {
		delete ghostGrids.value[username]
	}

	const onPlayerLost = ({ username }: { username: string }) => {
		if (username === userStore.username) {
			// If it's the current player, trigger the disappearing animation
			isAlive.value = false
			
			// Animate the grid cells disappearing
			const fadeOutDuration = 1500 // 1.5 seconds
			const startTime = Date.now()
			
			const animateDisappear = () => {
				const elapsed = Date.now() - startTime
				const progress = Math.min(elapsed / fadeOutDuration, 1)
				
				// Update the opacity based on progress
				disappearOpacity.value = 1 - progress
				
				if (progress < 1) {
					animationFrameId.value = requestAnimationFrame(animateDisappear)
				} else {
					// Clear the grid after animation completes
					grid.value = Array(ROWS).fill(null).map(() => Array(COLS).fill(null))
					disappearOpacity.value = 0
					animationFrameId.value = undefined
				}
			}
			
			animateDisappear()
		} else {
			onUserLeft(username)
		}
	}
	
	const onWin = (winnerName: string) => {
		console.log(winnerName)
		if (winnerName === userStore.username)
			won.value = true
		isAlive.value = false
		active.value = null
		winner.value = winnerName
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
		onPlayerLost,
		onWin,
		won,
		onUserLeft,
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
		flatCells
	}
})