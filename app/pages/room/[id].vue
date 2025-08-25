<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from "vue"
import { useRoute } from "vue-router"
import { useUserStore } from "../../stores/useUserStore"
import { useNuxtApp } from "nuxt/app"
import type { TypedSocket } from "~/types/socket"
import { useRoomStore } from "~/stores/useRoomStore"

const { $socket } = useNuxtApp()
const socket = $socket as TypedSocket

const userStore = useUserStore()
const route = useRoute()
const roomId = route.params.id as string

const isRunning = ref(false)
const gameFinished = ref(false)

const roomStore = useRoomStore()
const myColor = computed(() => roomStore.users.find(u => u.username === userStore.username)?.color ?? '#FFFFFF')

onMounted(() => {
	const username = (userStore.username ?? '').trim()
	if (!username) {
		// regénère si placeholder invalide
		userStore.genUsername()
	}
	
	socket.on("tetris-start", ({ seed }: { seed: number }) => {
		isRunning.value = true
		window.dispatchEvent(new CustomEvent("tetris-start", { detail: { seed } }))
	})
	
	socket.on("game-ended", () => {
		isRunning.value = false
		gameFinished.value = true
	})
	
	// Now join the room
	if (userStore.username) {
		socket.emit("join-room", { room: roomId, username: userStore.username })
	}
})

const leave = () => {
	if (userStore.username) {
		socket.emit("leave-room", { room: roomId })
	}
}
window.addEventListener("beforeunload", leave)
window.addEventListener("pagehide", leave)

onUnmounted(() => {
	leave()
	window.removeEventListener("beforeunload", leave)
	window.removeEventListener("pagehide", leave)
	socket.off("room-users")
	socket.off("room-leader")
	socket.off("tetris-start")
	socket.off("game-ended")
})

const amLeader = () => roomStore.leaderName === userStore.username

const startForRoom = () => {
	const seed = Math.floor(Math.random() * 2 ** 31)
	isRunning.value = true
	socket.emit("tetris-start", { room: roomId, seed })
}
</script>

<template>
	<div class="room-container">
		<header class="room-header">
			<NuxtLink to="/" class="home-link">
				<span class="pixel-arrow">◄</span> Accueil
			</NuxtLink>
			<h1 class="room-title">SALLE: <span class="room-id">{{ roomId }}</span></h1>
		</header>
		
		<div class="room-content">
			<aside class="players-panel">
				<h2 class="panel-title">JOUEURS</h2>
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
				:disabled="isRunning"
				>
				{{ gameFinished ? 'REJOUER' : 'LANCER' }}
			</button>
		</div>
	</aside>
	
	<main class="game-container">
		<Game 
		:controlled="true" 
		:room-id="roomId" 
		:username="userStore.username ?? ''" 
		:player-color="myColor" 
		/>
	</main>
</div>
</div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

:root {
	--primary-red: #ff0000;
	--dark-bg: #0a0a12;
	--darker-bg: #050508;
	--accent-yellow: #ffcc00;
	--text-glow: 0 0 5px #fff, 0 0 10px #fff, 0 0 15px #ff0000, 0 0 20px #ff0000;
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
	linear-gradient(rgba(255, 0, 0, 0.1) 1px, transparent 1px),
	linear-gradient(90deg, rgba(255, 0, 0, 0.1) 1px, transparent 1px);
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
	text-shadow: var(--text-glow);
	letter-spacing: 2px;
}

.room-id {
	color: var(--accent-yellow);
	text-shadow: 0 0 5px var(--accent-yellow);
}

.room-content {
	display: flex;
	max-width: 1200px;
	margin: 0 auto;
	gap: 30px;
	position: relative;
	z-index: 1;
}

.players-panel {
	background: rgba(10, 10, 20, 0.8);
	border: 3px solid var(--primary-red);
	border-radius: 10px;
	padding: 20px;
	width: 300px;
	box-shadow: 0 0 15px rgba(255, 0, 0, 0.5);
	height: fit-content;
}

.panel-title {
	color: var(--primary-red);
	font-size: 16px;
	margin-bottom: 15px;
	text-align: center;
	text-transform: uppercase;
	letter-spacing: 2px;
	text-shadow: 0 0 5px rgba(255, 0, 0, 0.7);
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
	width: 12px;
	height: 12px;
	background-color: var(--player-color);
	margin-right: 10px;
	box-shadow: 0 0 5px var(--player-color);
}

.player-name {
	color: white;
	font-size: 12px;
	text-transform: uppercase;
	letter-spacing: 1px;
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
	background: linear-gradient(180deg, #ff3333 0%, #cc0000 100%);
	border: none;
	color: white;
	padding: 12px 25px;
	font-family: 'Press Start 2P', cursive;
	font-size: 14px;
	text-transform: uppercase;
	letter-spacing: 1px;
	cursor: pointer;
	position: relative;
	overflow: hidden;
	border: 2px solid #ff0000;
	box-shadow: 0 0 10px rgba(255, 0, 0, 0.5);
	transition: all 0.3s ease;
	text-shadow: 0 0 5px rgba(255, 255, 255, 0.7);
}

.start-btn:hover:not(:disabled) {
	transform: translateY(-2px);
	box-shadow: 0 0 20px rgba(255, 0, 0, 0.8);
	text-shadow: 0 0 10px #fff;
}

.start-btn:active:not(:disabled) {
	transform: translateY(1px);
	box-shadow: 0 0 5px rgba(255, 0, 0, 0.5);
}

.start-btn:disabled {
	opacity: 0.6;
	cursor: not-allowed;
}

.game-container {
	flex-grow: 1;
	display: flex;
	justify-content: center;
	align-items: flex-start;
}

/* Responsive adjustments */
@media (max-width: 900px) {
	.room-content {
		flex-direction: column;
		align-items: center;
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

/* Pixel art decorations */
.room-container::after {
	content: '';
	position: fixed;
	top: 20px;
	right: 20px;
	width: 40px;
	height: 40px;
	background: 
	linear-gradient(45deg, transparent 45%, var(--primary-red) 45%, var(--primary-red) 55%, transparent 55%),
	linear-gradient(-45deg, transparent 45%, var(--primary-red) 45%, var(--primary-red) 55%, transparent 55%);
	opacity: 0.6;
	z-index: 0;
}

</style>
