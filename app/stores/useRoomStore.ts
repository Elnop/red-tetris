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
	
	function setUsers(new_users: UserData[]) {
		users.value = new_users
	}

	function setLeader(new_leader: string | null) {
		leaderName.value = new_leader
	}

	const setRoomId = (id: string) => {
		roomId.value = id
	}

	return { roomId, leaderName, users, setRoomId, setUsers, setLeader }
})
