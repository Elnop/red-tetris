import { useNuxtApp } from "nuxt/app";
import { defineStore } from "pinia";
import { ref } from "vue";
import type { UserData } from "~/types/game"
import type { TypedSocket } from "~/types/socket";

export const useRoomStore = defineStore('room', () => {
	const { $socket } = useNuxtApp()
	const socket = $socket as TypedSocket
	const roomId = ref<string>("")
	const leaderName = ref<string | null>(null)
	const users = ref<UserData[]>([])
	// const isRunning = ref(false)
	// const gameFinished = ref(false)
	
	socket.on("room-users", (data: { users: { username: string; alive: boolean; color: string }[] }) => {
		users.value = data.users
	})
	
	socket.on("room-leader", (data: { username: string | null }) => {
		leaderName.value = data.username
	})
	
	return { roomId, leaderName, users }
})
