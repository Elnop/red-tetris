import type { GhostData } from "~/types/game"
import { useGameStore } from "~/stores/useGameStore"
import { useUserStore } from "~/stores/useUserStore"
import { storeToRefs } from "pinia"

export function useGhosts() {
	const gameStore = useGameStore()
	const { updateGhostGrids } = gameStore
	const { ghostGrids, isAlive } = storeToRefs(gameStore)
	const userStore = useUserStore()

	const createMultiGhostStyle = (ghosts: GhostData[], baseStyle: any) => {
		const gradientStops = ghosts
		.map((ghost, i, arr) => {
			const color = ghost?.color || '#888888'
			const pos = (i / arr.length) * 100
			const nextPos = ((i + 1) / arr.length) * 100
			return `${color} ${pos}%, ${color} ${nextPos}%`
		})
		.join(',')
		
		const lastGhostColor = ghosts[ghosts.length - 1]?.color || '#888888'
		return {
			...baseStyle,
			background: `linear-gradient(135deg, ${gradientStops})`,
			borderColor: lastGhostColor
		}
	}

	const getGhostStyle = (idx: number) => {
		const ghosts = Object.values(ghostGrids.value).filter(Boolean) as GhostData[]
		if (ghosts.length === 0) return null
		
		const sortedGhosts = [...ghosts].sort((a, b) => a.timestamp - b.timestamp)
		
		const activeGhosts = sortedGhosts.filter(ghost => {
			const gridValue = ghost?.grid?.[idx]
			if (gridValue === undefined || gridValue === null) return false
			const strValue = String(gridValue).trim()
			return strValue === '1' || strValue === 'W'
		}).filter(Boolean)
		
		if (activeGhosts.length === 0) return null
		
		const baseStyle = {
			opacity: isAlive.value ? 0.1 : 0.4,
			zIndex: 1
		}
		
		if (activeGhosts.length === 1) {
			const ghostColor = activeGhosts[0]?.color || '#888888'
			return {
				...baseStyle,
				background: ghostColor,
				borderColor: ghostColor
			}
		}

		return createMultiGhostStyle(activeGhosts, baseStyle)
		
	}	
	const onGhost = (payload: { username: string; grid: string[]; color: string }): void => {
		// Ignorer les données du propre fantôme du joueur
		if (isOwnGhost(payload.username)) return
		
		// Créer et stocker les données du fantôme
		const ghostData = createGhostData(payload.grid, payload.color)
		updateGhostGrids(payload.username, ghostData)
	}

	const isOwnGhost = (username: string): boolean => {
		return username === (userStore.username ?? '')
	}

	const createGhostData = (grid: string[], color: string): GhostData => ({
		grid,
		color: color || '#888',
		timestamp: Date.now()
	})
	return { onGhost, getGhostStyle }
}