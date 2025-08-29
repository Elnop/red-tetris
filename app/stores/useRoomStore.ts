import { defineStore } from "pinia";
import { ref } from "vue";
import type { UserData } from "~/types/game"

export const useRoomStore = defineStore('room', () => {
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
