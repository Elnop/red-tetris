<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { type ActivePiece, generateQueue, toCoords, rotateActiveCW, generateQueueFromSeed } from '~/utils/pieces'
import { useNuxtApp } from 'nuxt/app'
import type { TypedSocket } from '~/types/socket';
import type { BoardCell, GhostData } from '~/types/game';
import { useGame } from '~/composables/useGame';

const { $socket } = useNuxtApp() as unknown as { $socket: TypedSocket }

const props = defineProps<{ controlled?: boolean; roomId?: string; username?: string, playerColor?: string }>()

// game state
const isPlaying = ref(false) // partie affichée/démarrée
const isAlive = ref(false)   // joueur encore en vie (peut recevoir des pièces)
const won = ref(false)       // le joueur a gagné
const disappearOpacity = ref(1) // For the disappearing animation
const animationFrameId = ref<number>() // To track the animation frame
const gameStartTime = ref(0)  // Timestamp du début de la partie
const level = ref(0)         // Niveau actuel (commence à 0, premier niveau = 1)
const linesCleared = ref(0)   // Nombre total de lignes effacées
const linesToNextLevel = ref(10) // Lignes restantes pour le prochain niveau
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
// drop/loop
const softDrop = ref(false)
const lastDropTime = ref(0)
const lastMoveTime = ref(0)
const lastRotateTime = ref(0)
const dropInterval = ref(1000) // Intervalle de chute initial (en ms)
const disappearAnimationId = ref<number>(0) // Pour l'animation de disparition
let gameLoopInterval: ReturnType<typeof setInterval> | null = null
	const lastTime = ref(0)
	let dropTimer = 0
	let lastFrameTime = 0
	const FPS = 60 // Nombre de mises à jour par seconde
	
	// Boucle de jeu principale utilisant setInterval
	const gameLoop = () => {
		const now = performance.now()
		const dt = now - lastFrameTime
		lastFrameTime = now
		
		try {
			tick(dt)
		} catch (error) {
			console.error('Erreur dans la boucle de jeu:', error)
		}
	}
	
	// Vitesse de chute en millisecondes par niveau (Nintendo NES)
	const LEVEL_SPEEDS = [
	1000, 793, 618, 473, 355, 262, 190, 135, 94, 64, 
	43, 28, 18, 11, 7, 5, 5, 5, 4, 4,  // Niveaux 0-19
	3, 3, 3, 2, 2, 2, 2, 2, 2, 2,      // Niveaux 20-29
	1                                   // Niveau 30+
	]
	
	// Vitesse de chute en mode soft drop (1 cellule par frame, ~16.67ms à 60fps)
	const SOFT_DROP_MS = 16.67
	
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
	
	const flatCells = computed(() => grid.value.flat())
	const flatGridColors = computed(() => grid.value.flat())
	
	const getCellCoordinates = (idx: number) => ({
		x: idx % COLS,
		y: Math.floor(idx / COLS)
	})
	
	const getCellValue = (x: number, y: number) => grid.value[y]?.[x]
	
	const getActivePieceStyle = (idx: number) => {
		if (activeIndexes.value.has(idx) && active.value?.color) {
			const color = active.value.color
			return { background: color, borderColor: color }
		}
		return null
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
		return getGhostStyle(idx) || {}
	}
	
	// ----------------------- Utils
	const resetBoard = () => {
		// Réinitialiser la grille
		grid.value = Array(ROWS).fill(null).map(() => Array(COLS).fill(null))
		
		// Réinitialiser les fantômes
		ghostGrids.value = {}
		
		// Réinitialiser l'état du jeu
		isAlive.value = true
		isPlaying.value = false
		won.value = false
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
		
		// Annimer l'effet de disparition si nécessaire
		if (disappearAnimationId.value) {
			cancelAnimationFrame(disappearAnimationId.value)
			disappearAnimationId.value = 0
		}
	}
	
	const refillQueue = () => {
		if (queue.value.length < 7) queue.value.push(...generateQueue(7))
	}
	
	const startGame = () => {
		resetBoard()
		queue.value = generateQueue(14)
		isPlaying.value = true
		isAlive.value = true
		won.value = false
		gameStartTime.value = Date.now()
		level.value = 0
		linesCleared.value = 0
		linesToNextLevel.value = 10
		posX.value = Math.floor((COLS - 4) / 2)
		posY.value = 0
		trySpawnNext()
	}
	
	const startGameWithSeed = (seed: number) => {
		// Réinitialiser l'état du jeu
		resetBoard()
		
		// Réinitialiser les compteurs de jeu
		isPlaying.value = true
		isAlive.value = true
		won.value = false
		gameStartTime.value = Date.now()
		level.value = 0
		linesCleared.value = 0
		linesToNextLevel.value = 10
		dropInterval.value = 1000
		dropTimer = 0
		lastDropTime.value = 0
		lastMoveTime.value = 0
		lastRotateTime.value = 0
		
		// Réinitialiser la position de la pièce
		posX.value = Math.floor((COLS - 4) / 2)
		posY.value = 0
		
		// Générer une nouvelle file d'attente et faire apparaître la première pièce
		queue.value = generateQueueFromSeed(seed, 200)
		trySpawnNext()
		
		// S'assurer que la boucle de jeu est démarrée
		if (!gameLoopInterval) {
			lastFrameTime = performance.now()
			gameLoopInterval = setInterval(gameLoop, 1000 / FPS)
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
	
	const trySpawnNext = () => {
		refillQueue()
		const next = queue.value[0]
		if (!next) return
		const n = next.matrix.length
		const spawnX = Math.floor((COLS - n) / 2)
		const coords = toCoords(next.matrix)
		const minDy = Math.min(...coords.map(([_, dy]) => dy))
		const spawnY = -minDy
		if (canPlace(next.matrix, spawnX, spawnY)) {
			active.value = queue.value.shift()!
			posX.value = spawnX
			posY.value = spawnY
		} else {
			// top-out -> spectateur
			active.value = null
			isAlive.value = false
			try {
				$socket.emit('tetris-game-over', { room: props.roomId ?? 'default', username: props.username ?? 'me' })
			} catch {}
		}
	}
	
	const tryMove = (dx: number, dy: number): boolean => {
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
		return grid.value[y]!.every(cell => cell !== null && cell !== '#FFFFFF')
	}
	
	const isWhiteLine = (y: number): boolean => {
		return grid.value[y]!.every(cell => cell === '#FFFFFF')
	}
	
	const removeLine = (y: number): void => {
		grid.value.splice(y, 1)
		grid.value.unshift(Array(COLS).fill(null))
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
	
	const sendGridUpdate = (): void => {
		if (!props.roomId || !props.username) return
		
		const gridData = serializedGrid()
		const occupiedCells = gridData.filter(cell => cell === '1').length
		
		console.log('📤 Sending grid update (piece locked):', {
			room: props.roomId,
			gridSize: gridData.length,
			occupiedCells,
			sample: gridData.slice(0, 20).join(''),
			color: props.playerColor || '#FFFFFF'
		})
		
		$socket.emit('tetris-grid', { 
			room: props.roomId, 
			grid: gridData,
			color: props.playerColor || '#FFFFFF',
			username: props.username
		} as any)
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
			sendGridUpdate()
			
			// Émettre un événement séparé pour les lignes complétées
			if (props.roomId) {
				$socket.emit('tetris-send-lines', { 
					room: props.roomId,
					count: linesRemoved - 1 // Envoyer le nombre de lignes à ajouter (nombre de lignes complétées - 1)
				} as any)
			}
		}
	}
	
	const lockPiece = () => {
		mergeActiveToGrid()
		clearLines()
		// envoyer ma grille aux autres si encore en vie
		if (isAlive.value && props.roomId) {
			try {
				const gridData = serializedGrid()
				const occupiedCells = gridData.filter(cell => cell === '1').length
				console.log('📤 Sending grid update (periodic):', {
					room: props.roomId,
					gridSize: gridData.length,
					occupiedCells,
					sample: gridData.slice(0, 20).join(''),
					color: props.playerColor ?? '#888888'
				})
				$socket.emit('tetris-grid', { 
					room: props.roomId, 
					grid: gridData, 
					color: props.playerColor ?? '#888888',
					username: props.username
				} as any) // Using type assertion to avoid TypeScript errors
			} catch (e) {
				console.error('Error sending grid update:', e)
			}
		}
		// spawn suivant si encore en vie
		if (isAlive.value) trySpawnNext()
	}
	
	const hardDrop = () => {
		if (!active.value || !isAlive.value) return
		while (tryMove(0, 1));
		lockPiece()
	}
	
	// ----------------------- Controls
	const onKeyDown = (e: KeyboardEvent) => {
		if (!active.value || !isPlaying.value || !isAlive.value) return
		switch (e.key) {
			case 'ArrowLeft':
			e.preventDefault()
			tryMove(-1, 0)
			break
			case 'ArrowRight':
			e.preventDefault()
			tryMove(1, 0)
			break
			case 'ArrowDown':
			e.preventDefault()
			if (!softDrop.value) {
				dropTimer = 0 // Réinitialiser le timer quand on commence le soft drop
			}
			softDrop.value = true
			break
			case 'ArrowUp': {
				e.preventDefault()
				if (!e.repeat) {
					const rotated = rotateActiveCW(active.value)
					if (canPlace(rotated.matrix, posX.value, posY.value)) {
						active.value = rotated
					} else if (canPlace(rotated.matrix, posX.value - 1, posY.value)) {
						posX.value -= 1
						active.value = rotated
					} else if (canPlace(rotated.matrix, posX.value + 1, posY.value)) {
						posX.value += 1
						active.value = rotated
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
		if (e.key === 'ArrowDown') softDrop.value = false
	}
	
	// ----------------------- Loop
	const getCurrentBaseDropSpeed = () => {
		if (!isPlaying.value) return 1000 // Valeur par défaut
		
		// Utiliser la table de vitesse officielle de Tetris NES
		// Pour les niveaux au-delà de 29, on utilise la même vitesse que le niveau 29
		const effectiveLevel = Math.min(level.value, 29)
		return LEVEL_SPEEDS[effectiveLevel] || LEVEL_SPEEDS[LEVEL_SPEEDS.length - 1]
	}
	
	const shouldLogDebugInfo = (): boolean => {
		// N'afficher que 1% du temps pour éviter la surcharge
		return Math.random() < 0.01
	}
	
	const logDebugInfo = (dropTimer: number, currentSpeed: number, level: number, dtMs: number): void => {
		console.log('Vitesse actuelle:', {
			dropTimer,
			currentSpeed,
			level,
			dtMs
		})
	}
	
	const handleDrop = (): void => {
		dropTimer = 0
		if (!tryMove(0, 1)) {
			lockPiece()
		}
	}
	
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
		
		// Log de débogage occasionnel
		if (shouldLogDebugInfo()) {
			logDebugInfo(dropTimer, currentBaseDropMs, level.value, dtMs)
		}
		
		// Gestion de la chute de la pièce
		dropTimer += dtMs
		if (dropTimer >= currentSpeed) {
			handleDrop()
		}
	}
	
	const onRoomStart = (e: Event) => {
		const detail = (e as CustomEvent<{ seed: number }>).detail
		if (detail && typeof detail.seed === 'number') startGameWithSeed(detail.seed)
	}
	
	
	const isOwnGhost = (username: string): boolean => {
		return username === (props.username ?? '')
	}
	
	const countCells = (grid: string[], value: string): number => 
	grid?.filter(cell => String(cell).trim() === value).length || 0
	
	const getGridSample = (grid: string[]): string => 
	grid?.slice(0, 10).join('') || ''
	
	const createGhostData = (grid: string[], color: string): GhostData => ({
		grid,
		color: color || '#888',
		timestamp: Date.now()
	})
	
	const updateGhostGrids = (username: string, ghostData: GhostData): void => {
		ghostGrids.value = {
			...ghostGrids.value,
			[username]: ghostData
		}
	}
	
	const generateGridPreview = (grid: string[], cols: number): string => {
		const gridPreview = []
		for (let y = 0; y < 4; y++) { // Afficher les 4 premières lignes
			const row = []
			for (let x = 0; x < 10; x++) {
				const idx = y * cols + x
				const cell = grid[idx] || '0'
				row.push(cell === '1' ? '█' : cell === 'W' ? 'W' : '.')
			}
			gridPreview.push(row.join(''))
		}
		return gridPreview.join('\n    ')
	}
	
	const logGhostGridState = (): void => {
		Object.entries(ghostGrids.value).forEach(([user, data]) => {
			const ghost = data as GhostData
			const cells = countCells(ghost.grid, '1')
			const whiteCells = countCells(ghost.grid, 'W')
			
			console.log(`  - ${user}: ${cells} cells, ${whiteCells} white cells, color: ${ghost.color}`)
			
			// Afficher un aperçu de la grille du fantôme
			if (ghost.grid) {
				const preview = generateGridPreview(ghost.grid, COLS)
				console.log('    ' + preview)
			}
		})
	}
	
	const onGhost = (payload: { username: string; grid: string[]; color: string }): void => {
		// Ignorer les données du propre fantôme du joueur
		if (isOwnGhost(payload.username)) return
		
		// Créer et stocker les données du fantôme
		const ghostData = createGhostData(payload.grid, payload.color)
		updateGhostGrids(payload.username, ghostData)
		
		// Journaliser l'état actuel de tous les fantômes
		logGhostGridState()
	}
	
	const onUserLeft = (username: string) => {
		delete ghostGrids.value[username]
	}
	
	const onPlayerLost = ({ username }: { username: string }) => {
		if (username === props.username) {
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
				}
			}
			
			animateDisappear()
		} else {
			onUserLeft(username)
		}
	}
	
	const onWin = () => {
		won.value = true
		isAlive.value = false
		active.value = null
	}
	
	const addGarbageLines = (count: number) => {
		if (!isAlive.value) return
		
		// Décaler la grille vers le haut
		for (let y = 0; y < ROWS - count; y++) {
			grid.value[y] = grid.value[y + count]!
		}
		
		// Ajouter les lignes de pénalité en bas (lignes blanches indestructibles)
		for (let y = ROWS - count; y < ROWS; y++) {
			// Créer une ligne complètement blanche sans trou
			grid.value[y] = Array(COLS).fill('#FFFFFF')
		}
		
		// Si la pièce active est maintenant dans une position invalide, la remonter
		if (active.value && !canPlace(active.value.matrix, posX.value, posY.value)) {
			posY.value -= count
			// Si toujours invalide, game over
			if (!canPlace(active.value.matrix, posX.value, posY.value)) {
				active.value = null
				isAlive.value = false
				try {
					$socket.emit('tetris-game-over', { room: props.roomId ?? 'default', username: props.username ?? 'me' })
				} catch {}
			}
		}
	}
	
	// Configuration des écouteurs d'événements
	const setupEventListeners = () => {
		// Les événements sont déjà gérés par défaut par le serveur
		// La boucle de jeu est maintenant gérée par setInterval dans onMounted
	}
	
	// Nettoyage des écouteurs d'événements
	const cleanupEventListeners = () => {
		// Les événements sont automatiquement nettoyés par le composant
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
		
		// S'assurer que la boucle de jeu est démarrée
		if (!gameLoopInterval) {
			lastFrameTime = performance.now()
			gameLoopInterval = setInterval(gameLoop, 1000 / FPS)
		}
		
		setupEventListeners()
	})
	
	onBeforeUnmount(() => {
		if (gameLoopInterval) {
			clearInterval(gameLoopInterval)
			gameLoopInterval = null
		}
		window.removeEventListener('keydown', onKeyDown)
		window.removeEventListener('keyup', onKeyUp)
		window.removeEventListener('tetris-start', onRoomStart as EventListener)
		$socket.off('tetris-ghost', onGhost)
		$socket.off('user-left', onUserLeft)
		$socket.off('player-lost', onPlayerLost)
		$socket.off('tetris-win', onWin)
		$socket.off('tetris-receive-lines')
		cleanupEventListeners()
	})
</script>
<template>
	<div v-if="!isPlaying" class="start-screen">
		<template v-if="props.controlled">
			<span style="color:#e5e7eb; font-size:20px;">En attente du chef…</span>
		</template>
		<template v-else>
			<button @click="startGame" class="start-btn">Start Game</button>
		</template>
	</div>
	<div v-else class="game-area">
		<div class="board-container">
			<div v-if="won" class="game-over-overlay win-overlay">
				<span>WIN</span>
			</div>
			<div v-else-if="!isAlive" class="game-over-overlay">
				<span>GAME OVER</span>
			</div>
			<div class="board" :style="{ '--cols': String(COLS), '--rows': String(ROWS) }">
				<div
				v-for="(_, idx) in flatCells"
				:key="idx"
				class="cell"
				:style="cellStyle(idx)"
				/>
			</div>
		</div>
	</div>
</template>


<style scoped>
.start-screen {
	display: flex;
	justify-content: center;
	align-items: center;
	height: 90vh;
}

.start-btn {
	padding: 16px 32px;
	font-size: 24px;
	font-weight: bold;
	background: #8A2BE2;
	color: white;
	border: none;
	border-radius: 8px;
	cursor: pointer;
	transition: background 0.2s;
}

.start-btn:hover {
	background: #7B1FA2;
}

.game-area {
	display: flex;
	justify-content: center;
	align-items: center;
	height: 100%;
}

.board-container {
	position: relative;
}

.game-over-overlay {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	display: flex;
	justify-content: center;
	align-items: center;
	background: rgba(0, 0, 0, 0.2);
	color: white;
	font-size: 3em;
	font-weight: bold;
	z-index: 10;
	border-radius: 8px;
}

.win-overlay {
	background: rgba(255, 215, 0, 0.3);
	color: #FFD700;
}

.board {
	position: relative;
	display: grid;
	grid-template-columns: repeat(var(--cols), 1fr);
	gap: 2px;
	height: 85vh;
	aspect-ratio: 1 / 2;
	background: #1f2937;
	padding: 6px;
	border-radius: 8px;
	box-shadow: 0 6px 20px rgba(0,0,0,0.25);
}

.cell {
	aspect-ratio: 1 / 1;
	background: #0b1220;
	border: 1px solid #111827;
	border-radius: 4px;
}
</style>