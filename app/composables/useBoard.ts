import { computed } from "vue"
import { useGameStore } from "~/stores/useGameStore"
import { toCoords } from "~/utils/pieces"
import { useRoomStore } from "~/stores/useRoomStore"
import { useGhosts } from "./useGhostDisplay"
import { useSocketEmiters } from "./socketEmiters"
import { storeToRefs } from "pinia"

export function useBoard() {
	const gameStore = useGameStore()
	const roomStore = useRoomStore()
	const socketEmitters = useSocketEmiters()

	const {
		ROWS,
		COLS,
		updateLevelInfo,
		canPlace,
		setLine,
		setPosY,
		setActive,
		setIsAlive,
		hasActiveEffect
	} = gameStore

	const {
		grid,
		active,
		posX,
		posY,
		isAlive,
	} = storeToRefs(gameStore)

	const { emitLines, emitGridUpdate, emitGameOver } = socketEmitters

	const flatCells = computed(() => grid.value.flat())
	// const flatGridColors = computed(() => grid.flat())

	const mergeActiveToGrid = () => {
		if (!active.value) return
		for (const [dx, dy] of toCoords(active.value.matrix)) {
			const px = posX.value + dx
			const py = posY.value + dy
			if (py >= 0 && py < ROWS && px >= 0 && px < COLS) grid.value[py]![px] = active.value.color
		}
	}

	const serializedGrid = (): string[] => {
		const out: string[] = []
		const flat = grid.value.flat()
		for (let i = 0; i < flat.length; i++) {
			// '1' for normal occupied cells, 'W' for white lines, '0' for empty
			const cell = flat[i]
			if (cell === '#FFFFFF') {
				out.push('W') // Indestructible white line
			} else if (cell) {
				out.push('1') // Normal block
			} else {
				out.push('0') // Empty cell
			}
		}
		return out
	}

	const isLineFull = (y: number): boolean => {
		return grid.value[y]!.every((cell: string | null) => cell !== null && cell !== '#FFFFFF')
	}
	
	const isWhiteLine = (y: number): boolean => {
		return grid.value[y]!.every((cell: string | null) => cell === '#FFFFFF')
	}
	
	const removeLine = (y: number): void => {
		grid.value.splice(y, 1)
		grid.value.unshift(Array(COLS).fill(null))
	}

	const clearLines = (): void => {
		let linesRemoved = 0

		for (let y = ROWS - 1; y >= 0; y--) {
			if (isLineFull(y) && !isWhiteLine(y)) {
				removeLine(y)
				linesRemoved++
				y++ // Check the same position again
			}
		}

		if (linesRemoved > 0) {
			updateLevelInfo(linesRemoved)
			emitGridUpdate(serializedGrid())

			// Emit separate event for completed lines
			if (!roomStore.roomId)
				return
			emitLines(linesRemoved-1)
		}
	}

	const addGarbageLines = (count: number) => {
		if (!isAlive.value) return

		// If immunity is active, block garbage lines
		if (hasActiveEffect('immunity')) {
			return
		}

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
				emitGameOver()
			}
		}
	}

	return { mergeActiveToGrid, serializedGrid, isLineFull, isWhiteLine, removeLine, clearLines, flatCells, addGarbageLines }
}
