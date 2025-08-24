import { ref } from "vue"
import type { BoardCell, GhostData } from "~/types/game"
import type { ActivePiece } from "~/utils/pieces"

export function useGame() {
	const COLS = 10
	const ROWS = 20
	
	const grid = ref<BoardCell[][]>(
		Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => null))
	)
	
	const ghostGrids = ref<Record<string, GhostData>>({})
	
	// file de pièces et pièce active
	const queue = ref<ActivePiece[]>([])
	const active = ref<ActivePiece | null>(null)
	
	// position (coin haut-gauche) de la boîte NxN
	const posX = ref(Math.floor((COLS - 4) / 2))
	const posY = ref(0)

	return {
		COLS,
		ROWS,
		grid,
		ghostGrids,
		queue,
		active,
		posX,
		posY,
	}
}