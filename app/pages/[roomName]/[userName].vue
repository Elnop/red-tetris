<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from "vue"
import { useRoute } from "vue-router"
import { storeToRefs } from 'pinia'
import { useUserStore } from "~/stores/useUserStore"
import { useGameStore } from "~/stores/useGameStore"
import { useRoomStore } from "~/stores/useRoomStore"
import { useThemeStore } from "~/stores/useThemeStore"
import { navigateTo } from "nuxt/app"
import { useSocketEmiters } from "~/composables/socketEmiters"

const props = defineProps({
	roomName: {
		type: String,
		required: false
	},
	userName: {
		type: String,
		required: false
	}
})

const route = useRoute()
const roomId = route.params.roomName as string | undefined || props.roomName 
const userId = route.params.userName as string | undefined || props.userName

const userStore = useUserStore()
const gameStore = useGameStore()
const roomStore = useRoomStore()
const themeStore = useThemeStore()

const { level, linesCleared } = storeToRefs(gameStore)

const isRunning = ref(false)
const gameFinished = ref(false)

const { emitStart, emitJoinRoom, initRoomSocketListeners, emitLeaveRoom, clearRoomSocketListeners } = useSocketEmiters()

function setIsRunning(value: boolean) {
	isRunning.value = value
}

function setGameFinished(value: boolean) {
	gameFinished.value = value
}

function exitRoom() {
	emitLeaveRoom()
	window.removeEventListener("beforeunload", exitRoom)
	window.removeEventListener("pagehide", exitRoom)
	clearRoomSocketListeners()
}

onMounted(() => {
	let username = (userStore.username ?? '').trim()
	if (userId) {
		username = userId
	}
	if (!username || !roomId) {
		navigateTo('/')
		return
	}
	userStore.setUsername(username)
	roomStore.setRoomId(roomId)
	initRoomSocketListeners(setIsRunning, setGameFinished)
	emitJoinRoom()
	window.addEventListener("beforeunload", exitRoom)
	window.addEventListener("pagehide", exitRoom)
})

onUnmounted(() => {
	exitRoom()
})

const amLeader = () => roomStore.leaderName === userStore.username

const startForRoom = () => {
	const seed = Math.floor(Math.random() * 2 ** 31)
	isRunning.value = true
	gameFinished.value = false
	emitStart(seed)

}
</script>

<template>
	<div class="room-container" :style="{
		'--theme-primary': themeStore.colors.primary,
		'--theme-secondary': themeStore.colors.secondary
	}">
		<header class="room-header">
			<NuxtLink to="/" class="home-link">
				<span class="pixel-arrow">◄</span> Home
			</NuxtLink>
			<h1 class="room-title">ROOM: <span class="room-id">{{ roomId }}</span></h1>
		</header>
		
		<div class="room-content">
			<aside class="players-panel">
				<h2 class="panel-title">PLAYERS</h2>
				<div class="players-list">
					<div 
					v-for="u in roomStore.users" 
					:key="u.username" 
					class="player-item"
					:class="{ 'player-dead': !u.alive }"
					:style="{ '--player-color': u.color }"
					>
					<span class="player-color"></span>
					<span class="player-name">{{ u.username }}</span>
					<span v-if="u.username === roomStore.leaderName" class="leader-badge">👑</span>
				</div>
			</div>
			
			<div v-if="amLeader()" class="start-section">
				<button
				@click="startForRoom"
				class="start-btn"
				:disabled="isRunning && !gameFinished"
				>
				{{ gameFinished || gameStore.won ? 'PLAY AGAIN' : 'START' }}
			</button>
		</div>
	</aside>
	
	<main class="game-container">
		<div class="game-wrapper">
			<Game />
		</div>
	</main>
	<div class="controls-panel">
		<div class="game-stats">
			<div class="stat-item">
					<span class="stat-label">LEVEL</span>
					<span class="stat-value">{{ level }}</span>
				</div>
				<div class="stat-item">
					<span class="stat-label">LINES</span>
					<span class="stat-value">{{ linesCleared }}</span>
				</div>
		</div>
		<h2 class="controls-title">CONTROLS</h2>
		<div class="keyboard-layout">
			<!-- Top row - Arrow keys -->
			<div class="keyboard-row">
				<div class="key-spacer"></div>
				<div class="key key-arrow">
					<div class="key-icon">⬆</div>
					<div class="key-label">Rotate</div>
				</div>
				<div class="key-spacer"></div>
			</div>

			<!-- Middle row - Left/Right -->
			<div class="keyboard-row">
				<div class="key key-arrow">
					<div class="key-icon">⬅</div>
					<div class="key-label">Left</div>
				</div>
				<div class="keyboard-row">
					<div class="key key-arrow">
						<div class="key-icon">⬇</div>
						<div class="key-label">Down</div>
					</div>
				</div>
				<div class="key key-arrow">
					<div class="key-icon">➡</div>
					<div class="key-label">Right</div>
				</div>
			</div>

			<!-- Space bar -->
			<div class="keyboard-row">
				<div class="key key-ultrawide">
					<div class="key-icon">SPACE</div>
					<div class="key-label">Hard Drop</div>
				</div>
			</div>
		</div>
	</div>
</div>
</div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

:root {
	--dark-bg: #0a0a12;
	--darker-bg: #050508;
	--accent-yellow: #ffcc00;
}

* {
	box-sizing: border-box;
	margin: 0;
	padding: 0;
}

body {
	background-color: var(--dark-bg);
	color: white;
	font-family: 'Press Start 2P', cursive;
	line-height: 1.6;
	overflow-x: hidden;
}

.room-container {
	min-height: 100vh;
	background: radial-gradient(ellipse at bottom, #1B2735 0%, #090A0F 100%);
	padding: 20px;
	position: relative;
	overflow: hidden;
}

.room-container::before {
	content: '';
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background:
	linear-gradient(color-mix(in srgb, var(--theme-primary) 10%, transparent) 1px, transparent 1px),
	linear-gradient(90deg, color-mix(in srgb, var(--theme-primary) 10%, transparent) 1px, transparent 1px);
	background-size: 20px 20px;
	pointer-events: none;
	z-index: 0;
}

.room-header {
	text-align: center;
	margin-bottom: 30px;
	position: relative;
	z-index: 1;
}

.home-link {
	position: absolute;
	left: 20px;
	top: 10px;
	color: white;
	text-decoration: none;
	font-size: 14px;
	display: flex;
	align-items: center;
	gap: 5px;
	transition: all 0.3s ease;
	text-shadow: 0 0 5px rgba(255, 255, 255, 0.5);
}

.home-link:hover {
	color: var(--accent-yellow);
	text-shadow: 0 0 10px var(--accent-yellow);
}

.pixel-arrow {
	font-size: 12px;
}

.room-title {
	color: white;
	text-transform: uppercase;
	font-size: 24px;
	margin: 20px 0;
	letter-spacing: 2px;
}

.room-id {
	color: var(--accent-yellow);
	text-shadow: 0 0 5px var(--accent-yellow);
}

.room-content {
	display: flex;
	justify-content: space-between;
	width: 100%;
	margin: 0 auto;
	padding: 0 20px;
	position: relative;
	z-index: 1;
}

.players-panel {
	background: rgba(10, 10, 20, 0.8);
	border: 3px solid var(--theme-primary);
	border-radius: 10px;
	padding: 20px;
	width: 300px;
	box-shadow: 0 0 15px color-mix(in srgb, var(--theme-primary) 50%, transparent);
	height: fit-content;
}

.panel-title {
	font-family: 'Press Start 2P', cursive;
	color: var(--theme-primary);
	font-size: 0.8rem;
	margin: 0 0 1.5rem 0;
	padding-bottom: 0.8rem;
	text-align: center;
	text-transform: uppercase;
	letter-spacing: 1px;
	width: 100%;
	border-bottom: 1px solid color-mix(in srgb, var(--theme-primary) 30%, transparent);
}

.players-list {
	margin-bottom: 20px;
}

.player-item {
	display: flex;
	align-items: center;
	padding: 10px;
	margin-bottom: 8px;
	background: rgba(0, 0, 0, 0.3);
	border-left: 4px solid var(--player-color);
	position: relative;
	transition: all 0.3s ease;
}

.player-item:hover {
	transform: translateX(5px);
	background: rgba(255, 255, 255, 0.1);
}

.player-color {
	width: 18px;
	height: 18px;
	background-color: var(--player-color);
	margin-right: 10px;
	box-shadow: 0 0 5px var(--player-color);
}

.player-name {
	color: white;
	font-size: 18px;
	text-transform: uppercase;
	letter-spacing: 2px;
	flex-grow: 1;
}

.player-dead {
	opacity: 0.6;
	text-decoration: line-through;
}

.player-dead .player-name {
	color: #888;
}

.leader-badge {
	margin-left: 5px;
	font-size: 14px;
	animation: pulse 1.5s infinite;
}

@keyframes pulse {
	0% { transform: scale(1); }
	50% { transform: scale(1.2); }
	100% { transform: scale(1); }
}

.start-section {
	margin-top: 30px;
	text-align: center;
}

.start-btn {
	background: linear-gradient(180deg, var(--theme-secondary) 0%, var(--theme-primary) 100%);
	color: white;
	padding: 12px 25px;
	font-family: 'Press Start 2P', cursive;
	font-size: 14px;
	text-transform: uppercase;
	letter-spacing: 1px;
	cursor: pointer;
	position: relative;
	overflow: hidden;
	border: 2px solid var(--theme-primary);
	box-shadow: 0 0 10px color-mix(in srgb, var(--theme-primary) 50%, transparent);
	transition: all 0.3s ease;
	text-shadow: 0 0 5px rgba(255, 255, 255, 0.7);
}

.start-btn:hover:not(:disabled) {
	transform: translateY(-2px);
	box-shadow: 0 0 20px color-mix(in srgb, var(--theme-primary) 80%, transparent);
	text-shadow: 0 0 10px #fff;
}

.start-btn:active:not(:disabled) {
	transform: translateY(1px);
	box-shadow: 0 0 5px color-mix(in srgb, var(--theme-primary) 50%, transparent);
}

.start-btn:disabled {
	opacity: 0.6;
	cursor: not-allowed;
}

/* Game Stats */
.game-stats {
	display: flex;
	justify-content: space-around;
	width: 100%;
	margin-bottom: 20px;
	background: rgba(0, 0, 0, 0.3);
	padding: 10px 0;
	border-radius: 8px;
	border: 1px solid color-mix(in srgb, var(--theme-primary) 30%, transparent);
}

.stat-item {
	display: flex;
	flex-direction: column;
	align-items: center;
}

.stat-label {
	color: #aaa;
	font-family: 'Press Start 2P', cursive;
	font-size: 0.6rem;
	text-transform: uppercase;
	letter-spacing: 1px;
	margin-bottom: 5px;
}

.stat-value {
	color: var(--theme-primary);
	font-family: 'Press Start 2P', cursive;
	font-size: 1.5rem;
	font-weight: bold;
	text-shadow: 0 0 5px color-mix(in srgb, var(--theme-primary) 50%, transparent);
}

.controls-panel {
	position: absolute;
	top: 20px;
	right: 20px;
	background: #1a1a1a;
	border: 2px solid var(--theme-primary);
	border-radius: 8px;
	padding: 1.5rem;
	color: white;
	width: 280px;
	flex-shrink: 0;
	display: flex;
	flex-direction: column;
	align-items: center;
}

.controls-title {
	font-family: 'Press Start 2P', cursive;
	color: var(--theme-primary);
	font-size: 0.8rem;
	margin: 0 0 1.5rem 0;
	padding-bottom: 0.8rem;
	text-align: center;
	text-transform: uppercase;
	letter-spacing: 1px;
	width: 100%;
	border-bottom: 1px solid color-mix(in srgb, var(--theme-primary) 30%, transparent);
}

/* Styled keyboard */
.keyboard-layout {
	display: flex;
	flex-direction: column;
	gap: 0.8rem;
	width: 100%;
}

.keyboard-row {
	display: flex;
	justify-content: center;
	gap: 0.8rem;
}

.key {
	background: #2a2a2a;
	border: 2px solid #444;
	border-radius: 6px;
	padding: 0.6rem;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	transition: all 0.1s ease;
	position: relative;
	overflow: hidden;
	cursor: pointer;
	user-select: none;
}

.key:hover {
	transform: translateY(-2px);
	background: #333;
}

.key:active {
	transform: translateY(1px);
}

.key-arrow {
	width: 60px;
	height: 60px;
}

.key-wide {
	width: 120px;
}

.key-ultrawide {
	width: 200px;
	height: 50px;
	background: #3a3a3a;
}

.key-ultrawide .key-icon {
	font-family: 'Press Start 2P', cursive;
	font-size: 0.8rem;
	margin-bottom: 0.1rem;
}

.key-space {
	background: #3a3a3a;
}

.key-icon {
	font-size: 1.5rem;
	margin-bottom: 0.2rem;
}

.key-label {
	font-family: 'Press Start 2P', cursive;
	font-size: 0.5rem;
	color: #aaa;
	text-transform: uppercase;
	letter-spacing: 0.5px;
	text-align: center;
}

.key-spacer {
	width: 60px;
	height: 60px;
}

/* Key press effect */
.key::after {
	content: '';
	position: absolute;
	top: 100%;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(255, 255, 255, 0.1);
	transition: top 0.1s ease;
}

.key:active::after {
	top: 0;
}

.game-container {
	display: flex;
	justify-content: center;
	align-items: flex-start;
	width: 50%;
	position: absolute;
	left: 50%;
	transform: translateX(-50%);
}

/* Responsive adjustments */
@media (max-width: 1024px) {
	.room-content {
		flex-direction: column;
		align-items: center;
	}
	
	.game-container {
		position: relative;
		width: 100%;
		left: 0;
		transform: none;
		border: none;
		padding: 0 10px;
		margin-top: 20px;
		align-items: center;
	}
	
	.controls-panel {
		position: relative;
		width: 100%;
		max-width: 300px;
		margin: 2rem auto 0;
		right: auto;
		top: auto;
	}
	
	.players-panel {
		width: 100%;
		max-width: 500px;
		margin-bottom: 20px;
	}
	
	.room-title {
		font-size: 20px;
		margin: 40px 0 20px;
	}
}

</style>
