import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useGameStore } from "~/stores/useGameStore"
import { useActivePiece } from "./useActivePiece"
import { useGhosts } from "./useGhostDisplay"
import { useBoard } from "./useBoard"
import { useItems } from "./useItems"
import { rotateActiveCW } from "~/utils/pieces"
import { storeToRefs } from "pinia"
import { useRoomStore } from "~/stores/useRoomStore"
import { useUserStore } from "~/stores/useUserStore"
import { useSocketEmiters } from './socketEmiters'
import { ITEMS_CONFIG } from '~/utils/itemsConfig'
import { useThemeStore } from '~/stores/useThemeStore'

export function useGame() {
	const gameStore = useGameStore()
	const roomStore = useRoomStore()
	const userStore = useUserStore()
	const themeStore = useThemeStore()

	const gameLoopInterval = ref<number | null>(null)
	const flashingCells = ref<Set<number>>(new Set())

	const activePiece = useActivePiece()
	const ghosts = useGhosts()
	const board = useBoard()
	const items = useItems()
	
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
	const { useItem, applyItemEffect, hasActiveEffect } = items
	const { inventory } = storeToRefs(gameStore)

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
			console.error('Error in game loop:', error)
		}
	}
	
	const SOFT_DROP_MS = 16.67
	
	const tick = (dtMs: number): void => {
		if (!isPlaying.value || !isAlive.value || !active.value) return

		// If frozen, don't drop pieces
		if (hasActiveEffect('freeze')) return

		const currentBaseDropMs = getCurrentBaseDropSpeed()
		if (currentBaseDropMs === undefined) {
			return
		}

		const currentSpeed = softDrop.value ? SOFT_DROP_MS : currentBaseDropMs

		if (currentSpeed === undefined) {
			return
		}

		setDropTimer(dropTimer.value + dtMs)
		if (dropTimer.value >= currentSpeed) {
			handleDrop()
		}
	}
	
	// Handle block bomb flash effect
	const onBlockBombFlash = (event: Event) => {
		const customEvent = event as CustomEvent<{ cells: Array<{ x: number; y: number }> }>
		const cells = customEvent.detail.cells

		// Convert cells to indices and add to flashing set
		flashingCells.value.clear()
		cells.forEach(({ x, y }) => {
			const idx = y * COLS + x
			flashingCells.value.add(idx)
		})

		// Remove flash after animation duration
		setTimeout(() => {
			flashingCells.value.clear()
		}, 400) // 400ms flash duration
	}

	onMounted(() => {
		window.addEventListener('keydown', onKeyDown)
		window.addEventListener('keyup', onKeyUp)
		window.addEventListener('tetris-start', onRoomStart as EventListener)
		window.addEventListener('block-bomb-flash', onBlockBombFlash as EventListener)
		initGameSocketListeners(onGhost, onUserLeft, onPlayerLost, addGarbageLines, onItemEffect)
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
		window.removeEventListener('block-bomb-flash', onBlockBombFlash as EventListener)
		clearGameSocketListeners()
		emitLeaveRoom()
		clearGameStates()
	})
	
	// ========= CONTROLS

	const onKeyDown = (e: KeyboardEvent) => {
		if (!isPlaying.value || !isAlive.value) return

		// Item usage keys (1-5) - only if power-ups are enabled
		if (['1', '2', '3', '4', '5'].includes(e.key) && roomStore.powerUpsEnabled) {
			e.preventDefault()
			const itemIndex = parseInt(e.key) - 1
			if (inventory.value[itemIndex]) {
				useItem(inventory.value[itemIndex]!.id)
			}
			return
		}

		// Movement controls require active piece
		if (!active.value) return

		// If frozen, block all movement controls
		if (hasActiveEffect('freeze')) return

		// Check if confusion effect is active (inverts controls)
		const isConfused = hasActiveEffect('confusion')

		switch (e.key) {
			case 'ArrowLeft':
			e.preventDefault()
			tryMoveActivePiece(isConfused ? 1 : -1, 0)
			break
			case 'ArrowRight':
			e.preventDefault()
			tryMoveActivePiece(isConfused ? -1 : 1, 0)
			break
			case 'ArrowDown':
			e.preventDefault()
			if (!softDrop.value) {
				setDropTimer(0) // Reset timer when starting soft drop
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

	const onItemEffect = (payload: { sourceUsername: string; targetUsername: string; itemType: import('~/types/items').ItemType; effectData?: any }) => {
		const isSource = payload.sourceUsername === userStore.username
		const config = ITEMS_CONFIG[payload.itemType]

		// If no specific target (empty string)
		if (!payload.targetUsername || payload.targetUsername === '') {
			// Check if this is a self-targeting item
			if (config.targetSelf && !config.targetOthers) {
				// Self-only item - apply only if we are the source
				if (isSource) {
					applyItemEffect(payload.itemType, userStore.username)
				}
			} else {
				// Other-targeting item - apply to everyone EXCEPT the source
				if (!isSource) {
					applyItemEffect(payload.itemType, '') // Empty string means "not self"
				}
			}
		} else {
			// Specific target - apply only if we are the target
			if (payload.targetUsername === userStore.username) {
				applyItemEffect(payload.itemType, payload.targetUsername)
			}
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

		// Check for flash effect first
		if (flashingCells.value.has(idx)) {
			const themeColor = themeStore.colors.primary
			return {
				background: themeColor,
				borderColor: themeColor,
				opacity: '0.7',
				boxShadow: `0 0 15px ${themeColor}, inset 0 0 15px ${themeColor}`,
				transition: 'all 0.2s ease-out',
				animation: 'bomb-flash 0.4s ease-in-out'
			}
		}

		// Check for indestructible white lines
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