import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useGameStore } from "~/stores/useGameStore"
import { useActivePiece } from "./useActivePiece"
import { useGhosts } from "./useGhostDisplay"
import { useBoard } from "./useBoard"
import { rotateActiveCW } from "~/utils/pieces"
import { storeToRefs } from "pinia"
import { useRoomStore } from "~/stores/useRoomStore"
import { useUserStore } from "~/stores/useUserStore"
import { useSocketEmiters } from '#imports'

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
		disappear,
		clearGameStates,
		canPlace,
		setSoftDrop,
		setPosX,
		setActive,
		setIsPlaying,
		initQueue,
		COLS,
		removeGhost
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
		winner,
		won,
	} = storeToRefs(gameStore)

	const {
		initGameSocketListeners,
		emitLeaveRoom,
		clearGameSocketListeners,
		emitGameOver
	} = useSocketEmiters()

	const {
		handleDrop,
		getCurrentBaseDropSpeed,
		trySpawnNextActivePiece,
		hardDrop,
		tryMoveActivePiece,
		getActivePieceStyle
	} = activePiece

	const { onGhost, getGhostStyle } = ghosts

	const { addGarbageLines } = board

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
	
	const SOFT_DROP_MS = 16.67
	
	const tick = (dtMs: number): void => {
		if (!isPlaying.value || !isAlive.value || !active.value) return
		
		const currentBaseDropMs = getCurrentBaseDropSpeed()
		if (currentBaseDropMs === undefined) {
			console.warn('currentBaseDropMs is undefined, using fallback value')
			return
		}
		
		const currentSpeed = softDrop.value ? SOFT_DROP_MS : currentBaseDropMs
		
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
		initGameSocketListeners(onGhost, onUserLeft, onPlayerLost, addGarbageLines)
		startGameLoop(gameLoop)
	})

	onBeforeUnmount(() => {
		if (gameLoopInterval.value) {
			clearInterval(gameLoopInterval.value)
			gameLoopInterval.value = null
		}
		window.removeEventListener('keydown', onKeyDown)
		window.removeEventListener('keyup', onKeyUp)
		window.removeEventListener('tetris-start', onRoomStart as EventListener)
		clearGameSocketListeners()
		emitLeaveRoom()
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
	
	const onUserLeft = (username: string) => {
		removeGhost(username)
		console.log("TEST",roomStore.users.length)
		if (isPlaying.value && isAlive.value && roomStore.users.length === 1 && roomStore.users[0]?.username === userStore.username) {
			gameStore.onWin(userStore.username)
		}
	}

	const onPlayerLost = ({ username }: { username: string }) => {
		if (username === userStore.username) {
			disappear()
		} else {
			onUserLeft(username)
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