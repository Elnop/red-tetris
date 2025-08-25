import { useNuxtApp } from "nuxt/app";
import type { TypedSocket } from "~/types/socket";
import { useRoomStore } from "~/stores/useRoomStore";
import { useUserStore } from "~/stores/useUserStore";
import { useGameStore } from "~/stores/useGameStore";

export function useSocketEmiters() {
	const { $socket } = useNuxtApp() as unknown as { $socket: TypedSocket }
	const roomStore = useRoomStore()
	const userStore = useUserStore()
	const gameStore = useGameStore()

	const { isAlive } = gameStore

	function emitGameOver() {
		try {
			$socket.emit('tetris-game-over', { room: roomStore.roomId ?? 'default', username: userStore.username ?? 'me' })
		} catch {}
	}

	const emitGridUpdate = (serializedGrid: string[]): void => {
		if (!roomStore.roomId || !userStore.username) return
		
		const gridData = serializedGrid
		// const occupiedCells = gridData.filter(cell => cell === '1').length
		
		$socket.emit('tetris-grid', { 
			room: roomStore.roomId, 
			grid: gridData,
			color: userStore.playerColor || '#FFFFFF',
			username: userStore.username
		} as any)
	}

	function emitLines(count: number) {
		if (count < 2 || !roomStore.roomId || !userStore.username) return
		$socket.emit('tetris-send-lines', { 
			room: roomStore.roomId,
			count: count
		} as any)
	}


	return { emitGameOver, emitGridUpdate, emitLines }
}