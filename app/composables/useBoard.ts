import { computed } from "vue"
import { useGameStore } from "~/stores/useGameStore"
import { toCoords } from "~/utils/pieces"
import { useRoomStore } from "~/stores/useRoomStore"
import { useGhosts } from "./useGhostDisplay"
import { useSocketEmiters } from "./socketEmiters"

export function useBoard() {
	const gameStore = useGameStore()
	const roomStore = useRoomStore()
	const socketEmitters = useSocketEmiters()

	const { grid, active, posX, posY, ROWS, COLS, updateLevelInfo, isAlive, canPlace, setLine, setPosY, setActive, setIsAlive } = gameStore

	const { emitLines, emitGridUpdate, emitGameOver } = socketEmitters

	const flatCells = computed(() => gameStore.grid.flat())
	// const flatGridColors = computed(() => grid.flat())

	const mergeActiveToGrid = () => {
		if (!active) return
		for (const [dx, dy] of toCoords(active.matrix)) {
			const px = posX + dx
			const py = posY + dy
			if (py >= 0 && py < ROWS && px >= 0 && px < COLS) grid[py]![px] = active.color
		}
	}

	const serializedGrid = (): string[] => {
		const out: string[] = []
		const flat = grid.flat()
		for (let i = 0; i < flat.length; i++) {
			// '1' pour les cellules occupées normales, 'W' pour les lignes blanches, '0' pour vide
			const cell = flat[i]
			if (cell === '#FFFFFF') {
				out.push('W') // Ligne blanche indestructible
			} else if (cell) {
				out.push('1') // Bloc normal
			} else {
				out.push('0') // Case vide
			}
		}
		return out
	}

	const isLineFull = (y: number): boolean => {
		return grid[y]!.every((cell: string | null) => cell !== null && cell !== '#FFFFFF')
	}
	
	const isWhiteLine = (y: number): boolean => {
		return grid[y]!.every((cell: string | null) => cell === '#FFFFFF')
	}
	
	const removeLine = (y: number): void => {
		grid.splice(y, 1)
		grid.unshift(Array(COLS).fill(null))
	}

	const clearLines = (): void => {
		let linesRemoved = 0
		
		for (let y = ROWS - 1; y >= 0; y--) {
			if (isLineFull(y) && !isWhiteLine(y)) {
				removeLine(y)
				linesRemoved++
				y++ // Vérifier à nouveau la même position
			}
		}
		
		if (linesRemoved > 0) {
			updateLevelInfo(linesRemoved)
			emitGridUpdate(serializedGrid())
			
			// Émettre un événement séparé pour les lignes complétées
			if (!roomStore.roomId)
				return
			emitLines(linesRemoved)
		}
	}

	const addGarbageLines = (count: number) => {
		if (!isAlive) return
		// Décaler la grille vers le haut
		for (let y = 0; y < ROWS - count; y++) {
			setLine(y, grid[y + count]!)
		}
		
		// Ajouter les lignes de pénalité en bas (lignes blanches indestructibles)
		for (let y = ROWS - count; y < ROWS; y++) {
			// Créer une ligne complètement blanche sans trou
			setLine(y, Array(COLS).fill('#FFFFFF'))
		}
		
		// Si la pièce active est maintenant dans une position invalide, la remonter
		if (active && !canPlace(active.matrix, posX, posY)) {
			setPosY(posY - count)
			// Si toujours invalide, game over
			if (!canPlace(active.matrix, posX, posY)) {
				setActive(null)
				setIsAlive(false)
				emitGameOver()
			}
		}
	}

	return { mergeActiveToGrid, serializedGrid, isLineFull, isWhiteLine, removeLine, clearLines, flatCells, addGarbageLines }
}
