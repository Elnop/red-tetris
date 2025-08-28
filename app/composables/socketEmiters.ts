import { navigateTo, useNuxtApp } from "nuxt/app";
import type { TypedSocket } from "~/types/socket";
import { useRoomStore } from "~/stores/useRoomStore";
import { useUserStore } from "~/stores/useUserStore";
import { storeToRefs } from "pinia";
import type { UserData } from "~/types/game";
import { useGameStore } from "#imports";

export function useSocketEmiters() {
	const { $socket } = useNuxtApp()
	const socket = $socket as TypedSocket
	const roomStore = useRoomStore()
	const userStore = useUserStore()
	const gameStore = useGameStore()
	const { userColor } = storeToRefs(userStore)
	
	function emitUserNameIsTaken(): Promise<boolean> {
		return new Promise<boolean>((resolve) => {
			socket.emit('check-username', {
				room: roomStore.roomId,
				username: userStore.username
			}, (response: { available: boolean }) => {
				resolve(response.available)
			})
		})
	}
	function emitStart(seed: number) {
		if (!roomStore.roomId || !userStore.username || !socket || !socket.connected) return
		socket.emit("tetris-start", { room: roomStore.roomId, seed })
	}
	
	function emitLeaveRoom() {
		if (!roomStore.roomId || !userStore.username || !socket || !socket.connected) return
		socket.emit('leave-room', { 
			room: roomStore.roomId,
			username: userStore.username
		})
	}
	
	function emitGameOver() {
		socket.emit('tetris-game-over', { room: roomStore.roomId, username: userStore.username })
	}
	
	const emitGridUpdate = (serializedGrid: string[]): void => {
		if (!roomStore.roomId || !userStore.username || !socket || !socket.connected) return
		
		const gridData = serializedGrid
		// const occupiedCells = gridData.filter(cell => cell === '1').length
		socket.emit('tetris-grid', { 
			room: roomStore.roomId, 
			grid: gridData,
			color: userColor.value || '#FFFFFF',
			username: userStore.username
		})
	}
	
	function emitLines(count: number) {
		if (!count || !roomStore.roomId || !userStore.username || !socket || !socket.connected) return
		socket.emit('tetris-send-lines', { 
			room: roomStore.roomId,
			count: count
		})
	}
	
	function emitJoinRoom() {
		if (!roomStore.roomId || !userStore.username || !socket || !socket.connected) return
		socket.emit('join-room', { 
			room: roomStore.roomId,
			username: userStore.username
		})
	}
	
	function initRoomSocketListeners(setIsRunning: (value: boolean) => void, setGameFinished: (value: boolean) => void) {
		socket.on("room-users", (data: { users: UserData[] }) => {
			console.log("room-users", data.users)
			roomStore.setUsers(data.users)
			userStore.setColor(data.users.find((u) => u.username === userStore.username)?.color || '#FFFFFF')
		})
		
		socket.on("room-leader", (data: { username: string | null }) => {
			roomStore.setLeader(data.username)
		})
		
		socket.on("tetris-start", ({ seed }: { seed: number }) => {
			setIsRunning(true)
			window.dispatchEvent(new CustomEvent("tetris-start", { detail: { seed } }))
		})
		
		socket.on("game-ended", ({ winner }: { winner: string }) => {
			setIsRunning(false)
			setGameFinished(true)
			gameStore.onWin(winner)
		})
		
		// Error handling for socket connection
		socket.on('connect_error', (error) => {
			console.error('Connection error:', error)
			navigateTo('/')
		})
	}
	
	function initGameSocketListeners(
		onGhost: (payload: {
			username: string;
			grid: string[];
			color: string;
		}) => void,
		onUserLeft: (username: string) => void,
		onPlayerLost: ({ username }: {
			username: string;
		}) => void,
		addGarbageLines: (count: number) => void
	) {
		socket.on('tetris-ghost', onGhost)
		socket.on('user-left', onUserLeft)
		socket.on('player-lost', onPlayerLost)
		socket.on('tetris-receive-lines', ({ count }) => addGarbageLines(count))
	}
	
	function clearRoomSocketListeners() {
		socket.off("room-users")
		socket.off("room-leader")
		socket.off("tetris-start")
		socket.off("game-ended")
	}
	
	function clearGameSocketListeners() {
		socket.off('tetris-ghost')
		socket.off('user-left')
		socket.off('player-lost')
		socket.off('tetris-win')
		socket.off('tetris-receive-lines')
	}
	
	return {
		emitGameOver,
		emitGridUpdate,
		emitLines,
		initRoomSocketListeners,
		initGameSocketListeners,
		clearRoomSocketListeners,
		clearGameSocketListeners,
		emitJoinRoom,
		emitLeaveRoom,
		emitStart,
		emitUserNameIsTaken
	}
}