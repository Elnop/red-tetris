<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { type ActivePiece, generateQueue, toCoords, rotateActiveCW, generateQueueFromSeed } from '../../utils/tetris/pieces'
import { useNuxtApp } from 'nuxt/app'
import type { TypedSocket } from '~/types/socket';

const { $socket } = useNuxtApp() as unknown as { $socket: TypedSocket }

const props = defineProps<{ controlled?: boolean; roomId?: string; username?: string, playerColor?: string }>()

const COLS = 10
const ROWS = 20

type BoardCell = string | null

const grid = ref<BoardCell[][]>(
Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => null))
)

// overlay des autres joueurs (une seule pour simplicité; peut être étendu par username)
const ghostGrids = ref<Record<string, { grid: string[], color: string }>>({})

// file de pièces et pièce active
const queue = ref<ActivePiece[]>([])
const active = ref<ActivePiece | null>(null)

// position (coin haut-gauche) de la boîte NxN
const posX = ref(Math.floor((COLS - 4) / 2))
const posY = ref(0)

// game state
const isPlaying = ref(false) // partie affichée/démarrée
const isAlive = ref(false)   // joueur encore en vie (peut recevoir des pièces)
const won = ref(false)       // le joueur a gagné
const gameStartTime = ref(0)  // Timestamp du début de la partie
const level = ref(0)         // Niveau actuel (commence à 0, premier niveau = 1)
const linesCleared = ref(0)   // Nombre total de lignes effacées
const linesToNextLevel = ref(10) // Lignes restantes pour le prochain niveau

// drop/loop
const softDrop = ref(false)
let rafId = 0
const lastTime = ref(0)
let dropTimer = 0

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

const cellStyle = (idx: number) => {
	const isActive = activeIndexes.value.has(idx)
	const color = isActive ? active.value?.color : flatGridColors.value[idx]
	
	// Si la cellule a une couleur (comme les lignes blanches indestructibles), on la priorise
	if (color === '#FFFFFF') {
		return { background: '#FFFFFF', borderColor: '#FFFFFF' }
	}
	
	// Si le joueur n'est plus en vie, on n'affiche que les fantômes
	if (!isAlive.value) {
		for (const key in ghostGrids.value) {
			const ghostData = ghostGrids.value[key]
			if (ghostData && ghostData.grid[idx]) {
				return { background: ghostData.color, borderColor: ghostData.color, opacity: 0.15 }
			}
		}
		return {}
	}
	
	// overlay fantôme: si pas de couleur locale, voir si un ghost a une couleur
	if (!color) {
		for (const key in ghostGrids.value) {
			const ghostData = ghostGrids.value[key]
			if (ghostData && ghostData.grid[idx]) {
				return { background: ghostData.color, borderColor: ghostData.color, opacity: 0.15 }
			}
		}
	}
	
	return color ? { background: color, borderColor: color } : {}
}

// ----------------------- Utils
const resetBoard = () => {
	for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) grid.value[y]![x] = null
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
	won.value = false
	isPlaying.value = true
	isAlive.value = true
	resetBoard()
	queue.value = generateQueueFromSeed(seed, 200)
	trySpawnNext()
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
		const c = flat[i]
		out.push(c ?? '')
	}
	return out
}

const clearLines = () => {
	let linesRemoved = 0

	for (let y = ROWS - 1; y >= 0; y--) {
		// Vérifier si la ligne est pleine
		const isLineFull = grid.value[y]!.every(cell => cell !== null)

		if (isLineFull) {
			// Supprimer la ligne
			grid.value.splice(y, 1)
			// Ajouter une nouvelle ligne vide en haut
			grid.value.unshift(Array(COLS).fill(null))
			linesRemoved++
			y++ // Vérifier à nouveau la même position
		}
	}

	// Si des lignes ont été supprimées, mettre à jour le niveau
	if (linesRemoved > 0) {
		linesCleared.value += linesRemoved
		
		// Mettre à jour le niveau tous les 10 lignes
		const newLevel = Math.floor(linesCleared.value / 10)
		if (newLevel > level.value) {
			level.value = newLevel
			linesToNextLevel.value = 10 - (linesCleared.value % 10)
		} else {
			linesToNextLevel.value -= linesRemoved
		}

		// Envoyer la grille aux autres joueurs
		if (props.roomId && props.username) {
			$socket.emit('tetris-grid', { 
				room: props.roomId, 
				grid: serializedGrid(),
				color: props.playerColor || '#FFFFFF'
			})
			
			// Émettre un événement séparé pour les lignes complétées
			if (linesRemoved > 0) {
				$socket.emit('tetris-lines-cleared', { 
					room: props.roomId,
					count: linesRemoved
				} as any)
			}
		}
	}
}

const lockPiece = () => {
	mergeActiveToGrid()
	clearLines()
	// envoyer ma grille aux autres si encore en vie
	if (isAlive.value && props.roomId) {
		try {
			$socket.emit('tetris-grid', { 
				room: props.roomId, 
				grid: serializedGrid(), 
				color: props.playerColor ?? '#888888' 
			})
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

const tick = (dtMs: number) => {
	if (!isPlaying.value) return
	if (!isAlive.value || !active.value) return
	
	// Obtenir la vitesse de chute de base actuelle (qui s'accélère avec le temps)
	const currentBaseDropMs = getCurrentBaseDropSpeed()
	
	// Appliquer une accélération supplémentaire en mode soft drop
	const currentSpeed = softDrop.value ? SOFT_DROP_MS : currentBaseDropMs
	// On s'assure que currentSpeed est toujours défini
	if (currentSpeed === undefined) {
		console.warn('currentSpeed is undefined, using fallback value')
		return
	}

	// Log de débogage
	if (Math.random() < 0.01) { // N'afficher que 1% du temps pour éviter la surcharge
		console.log('Vitesse actuelle:', {
			dropTimer,
			currentSpeed: currentBaseDropMs, // Utilisation directe de currentBaseDropMs
			level: level.value,
			dtMs
		})
	}

	dropTimer += dtMs
	if (dropTimer >= currentSpeed) {
		dropTimer = 0
		if (!tryMove(0, 1)) {
			lockPiece()
		}
	}
}

const animate = (t: number) => {
	const dt = lastTime.value ? t - lastTime.value : 0
	lastTime.value = t
	tick(dt)
	rafId = requestAnimationFrame(animate)
}

const onRoomStart = (e: Event) => {
	const detail = (e as CustomEvent<{ seed: number }>).detail
	if (detail && typeof detail.seed === 'number') startGameWithSeed(detail.seed)
}

const onGhost = (payload: { username: string; grid: string[], color: string }) => {
	if (payload.username === (props.username ?? '')) return
	ghostGrids.value[payload.username] = { grid: payload.grid, color: payload.color ?? '#888' }
}

const onUserLeft = (username: string) => {
	delete ghostGrids.value[username]
}

const onPlayerLost = ({ username }: { username: string }) => {
	if (username) onUserLeft(username)
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
	// On utilise les événements standards définis dans les types
	rafId = requestAnimationFrame(animate)
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
	setupEventListeners()
})

onBeforeUnmount(() => {
	cancelAnimationFrame(rafId)
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