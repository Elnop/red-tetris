import type { TypedSocket } from "~/types/socket"
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useNuxtApp } from 'nuxt/app'
import { useGameStore } from "~/stores/useGameStore"
import { useActivePiece } from "./useActivePiece"
import { useGhosts } from "./useGhostDisplay"
import { useBoard } from "./useBoard"
import { rotateActiveCW } from "~/utils/pieces"
import { storeToRefs } from "pinia"
import { useRoomStore } from "~/stores/useRoomStore"
import { useUserStore } from "~/stores/useUserStore"

export function useGame() {
	const gameStore = useGameStore()
	const roomStore = useRoomStore()
	const userStore = useUserStore()

	const gameLoopInterval = ref<number | null>(null)

	const activePiece = useActivePiece()
	const ghosts = useGhosts()
	const board = useBoard()
	
	const {
		getNewDeltaTime,
		setDropTimer,
		startGameLoop,
		onPlayerLost,
		onWin,
		onUserLeft,
		clearGameStates,
		canPlace,
		setSoftDrop,
		setPosX,
		setActive,
		setIsPlaying,
		initQueue,
		COLS,
	} = gameStore
	
	const {
		isPlaying,
		isAlive,
		active,
		dropTimer,
		posX,
		posY,
		grid,
		softDrop,
	} = storeToRefs(gameStore)

	const { handleDrop, getCurrentBaseDropSpeed, trySpawnNextActivePiece, hardDrop, tryMoveActivePiece, getActivePieceStyle } = activePiece
	const { onGhost, getGhostStyle } = ghosts
	const { addGarbageLines } = board
	const { $socket } = useNuxtApp() as unknown as { $socket: TypedSocket }

	function start() {
		startGame(gameLoop)
	}
	
	const startGame = (gameLoop: () => void, seed?: number) => {
		clearGameStates()
		initQueue(seed)
		setIsPlaying(true)
		trySpawnNextActivePiece()
		startGameLoop(gameLoop)
	}
	
	const onRoomStart = (e: Event) => {
		const detail = (e as CustomEvent<{ seed: number }>).detail
		if (detail && typeof detail.seed === 'number')
			startGame(gameLoop, detail.seed)
	}
	
	const gameLoop = () => {
		const dt = getNewDeltaTime()
		
		try {
			tick(dt)
		} catch (error) {
			console.error('Erreur dans la boucle de jeu:', error)
		}
	}
	
	// Vitesse de chute en mode soft drop (1 cellule par frame, ~16.67ms à 60fps)
	const SOFT_DROP_MS = 16.67
	
	const tick = (dtMs: number): void => {
		// Vérifications initiales
		if (!isPlaying.value || !isAlive.value || !active.value) return
		
		// Calcul de la vitesse actuelle
		const currentBaseDropMs = getCurrentBaseDropSpeed()
		// S'assurer que currentBaseDropMs est défini
		if (currentBaseDropMs === undefined) {
			console.warn('currentBaseDropMs is undefined, using fallback value')
			return
		}
		
		const currentSpeed = softDrop.value ? SOFT_DROP_MS : currentBaseDropMs
		
		// Validation de la vitesse
		if (currentSpeed === undefined) {
			console.warn('currentSpeed is undefined, using fallback value')
			return
		}
		
		setDropTimer(dropTimer.value + dtMs)
		if (dropTimer.value >= currentSpeed) {
			handleDrop()
		}
	}
	
	onMounted(() => {
		window.addEventListener('keydown', onKeyDown)
		window.addEventListener('keyup', onKeyUp)
		window.addEventListener('tetris-start', onRoomStart as EventListener)
		$socket.on('tetris-ghost', onGhost)
		$socket.on('user-left', onUserLeft)
		$socket.on('player-lost', onPlayerLost)
		$socket.on('tetris-win', onWin)
		$socket.on('tetris-receive-lines', ({ count }) => addGarbageLines(count))
		startGameLoop(gameLoop)
	})
	
	const leaveRoom = () => {
		if ($socket && $socket.connected) {
			$socket.emit('leave-room', { 
				room: roomStore.roomId,
				username: userStore.username
			})
		}
	}

	onBeforeUnmount(() => {
		// Arrêter la boucle de jeu
		if (gameLoopInterval.value) {
			clearInterval(gameLoopInterval.value)
			gameLoopInterval.value = null
		}

		// Nettoyer les écouteurs d'événements
		window.removeEventListener('keydown', onKeyDown)
		window.removeEventListener('keyup', onKeyUp)
		window.removeEventListener('tetris-start', onRoomStart as EventListener)
		
		// Nettoyer les écouteurs Socket.IO
		if ($socket) {
			$socket.off('tetris-ghost', onGhost)
			$socket.off('user-left', onUserLeft)
			$socket.off('player-lost', onPlayerLost)
			$socket.off('tetris-win', onWin)
			$socket.off('tetris-receive-lines')
			
			// Quitter la salle
			leaveRoom()
		}
		
		// Réinitialiser l'état du jeu
		clearGameStates()
	})
	
	// ========= CONTROLS
	
	const onKeyDown = (e: KeyboardEvent) => {
		if (!active.value || !isPlaying.value || !isAlive.value) return
		switch (e.key) {
			case 'ArrowLeft':
			e.preventDefault()
			tryMoveActivePiece(-1, 0)
			break
			case 'ArrowRight':
			e.preventDefault()
			tryMoveActivePiece(1, 0)
			break
			case 'ArrowDown':
			e.preventDefault()
			if (!softDrop.value) {
				setDropTimer(0) // Réinitialiser le timer quand on commence le soft drop
			}
			setSoftDrop(true)
			break
			case 'ArrowUp': {
				e.preventDefault()
				if (!e.repeat) {
					if (!active.value) return
					const rotated = rotateActiveCW(active.value)
					if (canPlace(rotated.matrix, posX.value, posY.value)) {
						setActive(rotated)
					} else if (canPlace(rotated.matrix, posX.value - 1, posY.value)) {
						setPosX(posX.value - 1)
						setActive(rotated)
					} else if (canPlace(rotated.matrix, posX.value + 1, posY.value)) {
						setPosX(posX.value + 1)
						setActive(rotated)
					}
				}
				break
			}
			case ' ': // Space
			e.preventDefault()
			if (!e.repeat) hardDrop()
				break
		}
	}
	
	const onKeyUp = (e: KeyboardEvent) => {
		if (e.key === 'ArrowDown') setSoftDrop(false)
	}

	const getCellCoordinates = (idx: number) => ({
		x: idx % COLS,
		y: Math.floor(idx / COLS)
	})

	const getCellValue = (x: number, y: number) => grid.value[y]?.[x]

	const cellStyle = (idx: number) => {
		const { x, y } = getCellCoordinates(idx)
		const cellValue = getCellValue(x, y)
		
		// Check for indestructible white lines first
		if (cellValue === '#FFFFFF') {
			return { background: '#FFFFFF', borderColor: '#FFFFFF' }
		}
		
		// Check for active piece
		const activeStyle = getActivePieceStyle(idx)
		if (activeStyle) return activeStyle
		
		// Check for normal cell color
		if (cellValue) {
			return { background: cellValue, borderColor: cellValue }
		}
		
		// Check for ghost pieces
		return getGhostStyle(idx) || null
	}
	
	return { start, cellStyle }
}