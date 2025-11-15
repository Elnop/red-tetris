import { defineStore } from "pinia";
import { ref } from "vue";
import type { UserData } from "~/types/game"

export const useRoomStore = defineStore('room', () => {
	const roomId = ref<string>("")
	const leaderName = ref<string | null>(null)
	const users = ref<UserData[]>([])
	const powerUpsEnabled = ref<boolean>(true)
	const itemSpawnRate = ref<number>(0.08) // Default 8%
	const currentRoom = ref<string>("")

	function setUsers(new_users: UserData[]) {
		users.value = new_users
	}

	function setLeader(new_leader: string | null) {
		leaderName.value = new_leader
	}

	const setRoomId = (id: string) => {
		roomId.value = id
		currentRoom.value = id
	}

	const setPowerUpsEnabled = (enabled: boolean) => {
		powerUpsEnabled.value = enabled
	}

	const setItemSpawnRate = (rate: number) => {
		itemSpawnRate.value = rate
	}

	return {
		roomId,
		leaderName,
		users,
		powerUpsEnabled,
		itemSpawnRate,
		currentRoom,
		setRoomId,
		setUsers,
		setLeader,
		setPowerUpsEnabled,
		setItemSpawnRate
	}
})
