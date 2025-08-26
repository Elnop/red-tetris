import { useNuxtApp } from "nuxt/app";
import { defineStore } from "pinia";
import { ref } from "vue";
import type { UserData } from "~/types/game"
import type { TypedSocket } from "~/types/socket";
import { useUserStore } from "./useUserStore";

export const useRoomStore = defineStore('room', () => {
	const { $socket } = useNuxtApp()
	const socket = $socket as TypedSocket
	const roomId = ref<string>("")
	const leaderName = ref<string | null>(null)
	const users = ref<UserData[]>([])
	const userStore = useUserStore()
	// const isRunning = ref(false)
	// const gameFinished = ref(false)
	
	socket.on("room-users", (data: { users: { username: string; alive: boolean; color: string }[] }) => {
		console.log("room-users", data.users)
		users.value = data.users
		userStore.setColor(data.users.find((u) => u.username === userStore.username)?.color || '#FFFFFF')
	})
	
	socket.on("room-leader", (data: { username: string | null }) => {
		leaderName.value = data.username
	})
	
	const setRoomId = (id: string) => {
		roomId.value = id
	}

	return { roomId, leaderName, users, setRoomId }
})
