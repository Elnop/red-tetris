<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from "vue"
import { useRoute } from "vue-router"
import { useUser } from "../../store/useUser"
import type { Socket } from "socket.io-client"
import { useNuxtApp } from "nuxt/app"

const { $socket } = useNuxtApp()
const socket = $socket as Socket

const userStore = useUser()
const route = useRoute()
const roomId = route.params.id as string

const users = ref<{ username: string; alive: boolean; color: string }[]>([])
const leader = ref<string | null>(null)
const isRunning = ref(false)
const gameFinished = ref(false)

const myColor = computed(() => users.value.find(u => u.username === userStore.username)?.color ?? '#FFFFFF')

onMounted(() => {
	const username = (userStore.username ?? '').trim()
	if (!username) {
		// regénère si placeholder invalide
		userStore.genUsername()
	}

	// Register listeners BEFORE join to avoid missing the first broadcast
		socket.on("room-users", (data: { users: { username: string; alive: boolean; color: string }[] }) => {
		users.value = data.users
		console.log('[room-users] users=%o', data.users)
	})

	socket.on("room-leader", (data: { username: string | null }) => {
		leader.value = data.username
	})

	socket.on("tetris-start", ({ seed }: { seed: number }) => {
		isRunning.value = true
		window.dispatchEvent(new CustomEvent("tetris-start", { detail: { seed } }))
	})

	socket.on("game-ended", () => {
		isRunning.value = false
		gameFinished.value = true
	})

	// Now join the room
	socket.emit("join-room", { room: roomId, username: userStore.username })
})

const leave = () => {
	socket.emit("leave-room", { room: roomId, username: userStore.username })
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

const amLeader = () => leader.value === userStore.username

const startForRoom = () => {
	const seed = Math.floor(Math.random() * 2 ** 31)
	isRunning.value = true
	socket.emit("tetris-start", { room: roomId, seed })
}
</script>

<template>
	<div>
		<NuxtLink to="/">Acceuil</NuxtLink>
		<h2>Room: {{ roomId }}</h2>
		<ul>
			<li v-for="u in users" :key="u.username" :style="{ color: u.color, textDecoration: u.alive ? 'none' : 'line-through', opacity: u.alive ? 1 : 0.6 }">{{ u.username }}</li>
		</ul>
		<div class="actions">
						<div class="player-name" :style="{ color: myColor }">
				<button v-if="amLeader() && !isRunning" @click="startForRoom" class="start-btn">{{ gameFinished ? 'Restart' : 'Start' }}</button>
			</div>
		</div>
				<Game :controlled="true" :room-id="roomId" :username="userStore.username ?? ''" :player-color="myColor" />
	</div>
</template>

<style scoped>
.actions {
	margin-top: 12px;
	display: flex;
	justify-content: center;
}

.start-btn {
	padding: 10px 20px;
	font-size: 16px;
	font-weight: 600;
	color: #ffffff;
	background: linear-gradient(135deg, #8A2BE2 0%, #6D28D9 100%);
	border: none;
	border-radius: 9999px;
	cursor: pointer;
	transition: transform 0.08s ease, box-shadow 0.2s ease, opacity 0.2s ease;
	box-shadow: 0 8px 20px rgba(109, 40, 217, 0.35);
}

.start-btn:hover {
	transform: translateY(-1px);
	box-shadow: 0 12px 28px rgba(109, 40, 217, 0.5);
}

.start-btn:active {
	transform: translateY(0);
	opacity: 0.95;
}

.start-btn:focus-visible {
	outline: none;
	box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.25), 0 0 0 6px rgba(109, 40, 217, 0.5);
}

</style>
