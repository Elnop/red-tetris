import { navigateTo, useNuxtApp } from "nuxt/app";
import type { TypedSocket } from "~/types/socket";
import { useRoomStore } from "~/stores/useRoomStore";
import { useUserStore } from "~/stores/useUserStore";
import { storeToRefs } from "pinia";
import type { UserData } from "~/types/game";
import { useGameStore } from "~/stores/useGameStore";
import { onMounted, onUnmounted } from "vue";

export function useSocketEmiters() {
	const { $socket } = useNuxtApp()
	const socket = $socket as TypedSocket
	const roomStore = useRoomStore()
	const userStore = useUserStore()
	const gameStore = useGameStore()
	const { userColor } = storeToRefs(userStore)
	
	const pendingEmits: (() => void)[] = [];
	
	function handleSocketConnect() {
		// Execute all pending events
		while (pendingEmits.length) {
			const emitFn = pendingEmits.shift();
			if (emitFn) emitFn();
		}
	}

	// Subscribe to connection event
	onMounted(() => {
		if (socket) {
			socket.on('connect', handleSocketConnect);
		}
	});

	// Clean up on unmount
	onUnmounted(() => {
		if (socket) {
			socket.off('connect', handleSocketConnect);
		}
		pendingEmits.length = 0;
	});
	
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
		const joinRoom = () => {
			if (!roomStore.roomId || !userStore.username || !socket) return;
			socket.emit('join-room', {
				room: roomStore.roomId,
				username: userStore.username,
				powerUpsEnabled: roomStore.powerUpsEnabled,
				itemSpawnRate: roomStore.itemSpawnRate
			});
		};

		if (socket?.connected) {
			joinRoom();
		} else {
			pendingEmits.push(joinRoom);
		}
	}
	
	function initRoomSocketListeners(setIsRunning: (value: boolean) => void, setGameFinished: (value: boolean) => void) {
		socket.on("room-users", (data: { users: UserData[] }) => {
			roomStore.setUsers(data.users)
			userStore.setColor(data.users.find((u) => u.username === userStore.username)?.color || '#FFFFFF')
		})

		socket.on("room-leader", (data: { username: string | null }) => {
			roomStore.setLeader(data.username)
		})

		socket.on("room-settings", (data: { powerUpsEnabled: boolean; itemSpawnRate: number }) => {
			console.log('[ITEMS-DEBUG] Received room-settings:', data)
			roomStore.setPowerUpsEnabled(data.powerUpsEnabled)
			roomStore.setItemSpawnRate(data.itemSpawnRate)
		})
		
		socket.on("tetris-start", async ({ seed, powerUpsEnabled, itemSpawnRate }: { seed: number; powerUpsEnabled?: boolean; itemSpawnRate?: number }) => {
			console.log('[ITEMS-DEBUG] Received tetris-start:', { seed, powerUpsEnabled, itemSpawnRate })
			setIsRunning(true)
			setGameFinished(false)

			// Update power-ups setting from server
			if (powerUpsEnabled !== undefined) {
				roomStore.setPowerUpsEnabled(powerUpsEnabled)
				console.log('[ITEMS-DEBUG] Power-ups enabled:', powerUpsEnabled)
			}

			// Update item spawn rate from server
			if (itemSpawnRate !== undefined) {
				roomStore.setItemSpawnRate(itemSpawnRate)
				console.log('[ITEMS-DEBUG] Item spawn rate:', itemSpawnRate)
			}

			// Generate items locally (random and desynchronized per client)
			if (powerUpsEnabled) {
				const { generateRandomItemSpawns } = await import('~/utils/itemGeneration')
				const localItemSpawns = generateRandomItemSpawns(itemSpawnRate || 0.08, 200)

				// Convert Map to array format for setItemSpawnMap
				const itemSpawnsArray = Array.from(localItemSpawns.entries()).map(([index, type]) => ({
					index,
					type
				}))

				console.log('[ITEMS-DEBUG] Generated', itemSpawnsArray.length, 'random items locally')
				gameStore.setItemSpawnMap(itemSpawnsArray)
			} else {
				console.log('[ITEMS-DEBUG] Power-ups disabled, no items generated')
				gameStore.setItemSpawnMap([])
			}

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
		onPlayerLost: ({
			username
		}: {
			username: string;
		}) => void,
		addGarbageLines: (count: number) => void,
		onItemEffect?: (payload: any) => void
	) {
		socket.on('game-state', ({ isPlaying }: { isPlaying: boolean }) => {
			gameStore.setIsPlaying(isPlaying)
		})
		socket.on('tetris-ghost', onGhost)
		socket.on('user-left', onUserLeft)
		socket.on('player-lost', onPlayerLost)
		socket.on('tetris-receive-lines', ({ count }) => addGarbageLines(count))

		// Item effect listeners
		if (onItemEffect) {
			socket.on('item-effect', onItemEffect)
		}
	}
	
	function clearRoomSocketListeners() {
		socket.off("room-users")
		socket.off("room-leader")
		socket.off("room-settings")
		socket.off("tetris-start")
		socket.off("game-ended")
	}
	
	function clearGameSocketListeners() {
		socket.off('tetris-ghost')
		socket.off('user-left')
		socket.off('player-lost')
		socket.off('tetris-win')
		socket.off('tetris-receive-lines')
		socket.off('game-state')
		socket.off('item-effect')
		socket.off('item-spawn')
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