import { computed } from "vue";
import { useGameStore } from "~/stores/useGameStore";
import { toCoords } from "~/utils/pieces";
import { useBoard } from "./useBoard";
import { useSocketEmiters } from "./socketEmiters";

export function useActivePiece() {
	const socketEmiters = useSocketEmiters()
	const { emitGameOver, emitGridUpdate } = socketEmiters
	
	const gameStore = useGameStore()
	const {
		active,
		posX,
		posY,
		COLS,
		ROWS,
		setDropTimer,
		tryMoveActivePiece,
		isAlive,
		isPlaying,
		level,
		canPlace,
		refillQueue,
		queue,
		setActive,
		setIsAlive,
		setPosX,
		setPosY,
	} = gameStore

	const board = useBoard()
	const { 
		mergeActiveToGrid,
		clearLines,
		serializedGrid
	} = board

	const LEVEL_SPEEDS = [
		1000, 793, 618, 473, 355, 262, 190, 135, 94, 64, 
		43, 28, 18, 11, 7, 5, 5, 5, 4, 4,  // Niveaux 0-19
		3, 3, 3, 2, 2, 2, 2, 2, 2, 2,      // Niveaux 20-29
		1                                   // Niveau 30+
	]

	const activeIndexes = computed(() => {
		const indices = new Set<number>()
		if (!active) return indices
		const coords = toCoords(active.matrix)
		for (const [dx, dy] of coords) {
			const x = posX + dx
			const y = posY + dy
			if (x >= 0 && x < COLS && y >= 0 && y < ROWS) {
				indices.add(y * COLS + x)
			}
		}
		return indices
	})
	
	const getActivePieceStyle = (idx: number) => {
		if (activeIndexes.value.has(idx) && active?.color) {
			const color = active.color
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
		if (!active || !isAlive) return
		while (tryMoveActivePiece(0, 1));
		lockPiece()
	}

	const lockPiece = () => {
		mergeActiveToGrid()
		clearLines()
		if (isAlive) {
			emitGridUpdate(serializedGrid())
			trySpawnNextActivePiece()
		}
	}

	const getCurrentBaseDropSpeed = () => {
		if (!isPlaying) return 1000 // Valeur par défaut
		
		// Utiliser la table de vitesse officielle de Tetris NES
		// Pour les niveaux au-delà de 29, on utilise la même vitesse que le niveau 29
		const effectiveLevel = Math.min(level, 29)
		return LEVEL_SPEEDS[effectiveLevel] || LEVEL_SPEEDS[LEVEL_SPEEDS.length - 1]
	}

	const trySpawnNextActivePiece = () => {
			refillQueue()
			const next = queue[0]
			if (!next) return
			const n = next.matrix.length
			const spawnX = Math.floor((COLS - n) / 2)
			const coords = toCoords(next.matrix)
			const minDy = Math.min(...coords.map(([_, dy]) => dy))
			const spawnY = -minDy
			if (canPlace(next.matrix, spawnX, spawnY)) {
				setActive(queue.shift()!)
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
