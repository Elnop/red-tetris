import { computed } from "vue";
import { useGameStore } from "~/stores/useGameStore";
import { toCoords } from "~/utils/pieces";
import { useBoard } from "./useBoard";
import { useSocketEmiters } from "./socketEmiters";
import { storeToRefs } from "pinia";

export function useActivePiece() {
	const socketEmiters = useSocketEmiters()
	const { emitGameOver, emitGridUpdate } = socketEmiters
	
	const gameStore = useGameStore()
	const {
		COLS,
		ROWS,
		setDropTimer,
		tryMoveActivePiece,
		canPlace,
		refillQueue,
		setActive,
		setIsAlive,
		setPosX,
		setPosY,
	} = gameStore

	const {
		active,
		posX,
		posY,
		isAlive,
		isPlaying,
		level,
		queue,
	} = storeToRefs(gameStore)

	const board = useBoard()
	const { 
		mergeActiveToGrid,
		clearLines,
		serializedGrid
	} = board

	const LEVEL_SPEEDS = [
		1000, 850, 700, 600, 500, 400, 350, 300, 250, 200,  // Levels 0-9
		180, 160, 140, 120, 100, 90, 80, 70, 60, 50,        // Levels 10-19
		40, 35, 30, 25, 20, 18, 16, 14, 12, 10,             // Levels 20-29
		8                                                    // Level 30+
	]

	const activeIndexes = computed(() => {
		const indices = new Set<number>()
		if (!active.value) return indices
		const coords = toCoords(active.value.matrix)
		for (const [dx, dy] of coords) {
			const x = posX.value + dx
			const y = posY.value + dy
			if (x >= 0 && x < COLS && y >= 0 && y < ROWS) {
				indices.add(y * COLS + x)
			}
		}
		return indices
	})
	
	const getActivePieceStyle = (idx: number) => {
		if (activeIndexes.value.has(idx) && active.value?.color) {
			const color = active.value.color
			return { background: color, borderColor: color }
		}
		return null
	}

	const handleDrop = (): void => {
		setDropTimer(0)
		if (!tryMoveActivePiece(0, 1)) {
			lockPiece()
		}
	}

	const hardDrop = () => {
		if (!active.value || !isAlive.value) return
		while (tryMoveActivePiece(0, 1));
		lockPiece()
	}

	const lockPiece = () => {
		mergeActiveToGrid()
		clearLines()
		if (isAlive.value) {
			emitGridUpdate(serializedGrid())
			trySpawnNextActivePiece()
		}
	}

	const getCurrentBaseDropSpeed = () => {
		if (!isPlaying.value) return 1000 // Default value

		// Use the official Tetris NES speed table
		// For levels beyond 29, use the same speed as level 29
		const effectiveLevel = Math.min(level.value, 29)
		return LEVEL_SPEEDS[effectiveLevel] || LEVEL_SPEEDS[LEVEL_SPEEDS.length - 1]
	}

	const trySpawnNextActivePiece = () => {
			refillQueue()
			const next = queue.value[0]
			if (!next) return
			const n = next.matrix.length
			const spawnX = Math.floor((COLS - n) / 2)
			const coords = toCoords(next.matrix)
			const minDy = Math.min(...coords.map(([_, dy]) => dy))
			const spawnY = -minDy
			if (canPlace(next.matrix, spawnX, spawnY)) {
				setActive(queue.value.shift()!)
				setPosX(spawnX)
				setPosY(spawnY)
			} else {
				setActive(null)
				setIsAlive(false)
				emitGameOver()
			}
		}

	return {handleDrop, getCurrentBaseDropSpeed, getActivePieceStyle, hardDrop, trySpawnNextActivePiece, tryMoveActivePiece}
}
