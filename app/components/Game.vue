<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { type ActivePiece, generateQueue, toCoords, rotateActiveCW, generateQueueFromSeed } from '../../utils/tetris/pieces'
import { useNuxtApp } from 'nuxt/app'
import type { TypedSocket } from '../types/socket';

const { $socket } = useNuxtApp() as unknown as { $socket: TypedSocket }

const props = defineProps<{ controlled?: boolean; roomId?: string; username?: string }>()

const COLS = 10
const ROWS = 20

type BoardCell = string | null

const grid = ref<BoardCell[][]>(
Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => null))
)

// overlay des autres joueurs (une seule pour simplicité; peut être étendu par username)
const ghostGrids = ref<Record<string, string[]>>({})

// file de pièces et pièce active
const queue = ref<ActivePiece[]>([])
const active = ref<ActivePiece | null>(null)

// position (coin haut-gauche) de la boîte NxN
const posX = ref(Math.floor((COLS - 4) / 2))
const posY = ref(0)

// game state
const isPlaying = ref(false) // partie affichée/démarrée
const isAlive = ref(false)   // joueur encore en vie (peut recevoir des pièces)

// drop/loop
const softDrop = ref(false)
let rafId = 0
const lastTime = ref(0)
let dropTimer = 0
const BASE_DROP_MS = 800
const SOFT_DROP_MS = 100

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
	// overlay fantôme: si pas de couleur locale, voir si un ghost a une couleur
	if (!color) {
		for (const key in ghostGrids.value) {
			const ghost = ghostGrids.value[key]
			if (ghost && ghost[idx]) {
				return { background: ghost[idx], borderColor: ghost[idx], opacity: 0.15 }
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
	isPlaying.value = true
	isAlive.value = true
	resetBoard()
	queue.value = []
	queue.value.push(...generateQueue(12))
	trySpawnNext()
}

const startGameWithSeed = (seed: number) => {
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
	const newRows: BoardCell[][] = []
	let cleared = 0
	for (let y = 0; y < ROWS; y++) {
		const full = grid.value[y]!.every(c => c !== null)
		if (full) {
			cleared++
		} else {
			newRows.push(grid.value[y]!)
		}
	}
	while (newRows.length < ROWS) newRows.unshift(Array.from({ length: COLS }, () => null))
	if (cleared > 0) grid.value = newRows as BoardCell[][]
}

const lockPiece = () => {
	mergeActiveToGrid()
	clearLines()
	// envoyer ma grille aux autres
	try {
		$socket.emit('tetris-grid', { room: props.roomId ?? 'default', username: props.username ?? 'me', grid: serializedGrid() })
	} catch {}
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
const tick = (dtMs: number) => {
	if (!isPlaying.value) return
	if (!isAlive.value || !active.value) return
	const interval = softDrop.value ? SOFT_DROP_MS : BASE_DROP_MS
	dropTimer += dtMs
	while (dropTimer >= interval) {
		dropTimer -= interval
		if (!tryMove(0, 1)) lockPiece()
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

const onGhost = (payload: { username: string; grid: string[] }) => {
	if (payload.username === (props.username ?? '')) return
	ghostGrids.value[payload.username] = payload.grid
}

const onUserLeft = (username: string) => {
	delete ghostGrids.value[username]
}

onMounted(() => {
	window.addEventListener('keydown', onKeyDown)
	window.addEventListener('keyup', onKeyUp)
	window.addEventListener('tetris-start', onRoomStart as EventListener)
	$socket.on('tetris-ghost', onGhost)
	$socket.on('user-left', onUserLeft)
	rafId = requestAnimationFrame(animate)
})

onBeforeUnmount(() => {
	cancelAnimationFrame(rafId)
	window.removeEventListener('keydown', onKeyDown)
	window.removeEventListener('keyup', onKeyUp)
	window.removeEventListener('tetris-start', onRoomStart as EventListener)
	$socket.off('tetris-ghost', onGhost)
	$socket.off('user-left', onUserLeft)
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
	<div v-else class="board" :style="{ '--cols': String(COLS), '--rows': String(ROWS) }">
		<div
		v-for="(_, idx) in flatCells"
		:key="idx"
		class="cell"
		:style="cellStyle(idx)"
		/>
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

.board {
	margin: 0 auto;
	display: grid;
	grid-template-columns: repeat(var(--cols), 1fr);
	gap: 2px;
	height: 90vh;
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