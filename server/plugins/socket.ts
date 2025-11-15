import { Server } from "socket.io"
import { toNodeListener } from "h3"
import { createServer } from "http"
import type { NitroApp } from "nitropack"

// Item generation is now handled client-side

// Bright and well-distinct color palette
const PLAYER_COLORS = [
  '#FF6B6B', // Bright red
  '#4ECDC4', // Turquoise
  '#FED766', // Yellow
  '#FF9F1C', // Orange
  '#2EC4B6', // Mint green
  '#E71D36', // Bright red
  '#41B3A3', // Emerald green
  '#FF6B6B', // Light red
  '#4CC9F0', // Sky blue
  '#7209B7', // Purple
  '#3A86FF', // Bright blue
  '#FF006E', // Bright pink
  '#8338EC', // Electric purple
  '#FFBE0B', // Golden yellow
  '#FB5607', // Bright orange
  '#3A86FF', // Royal blue
  '#FF006E', // Fuchsia pink
  '#3A0CA3', // Dark blue
  '#4CC9F0', // Light blue
  '#7209B7'  // Dark purple
]


// Shuffle the color array for better distribution
const shuffleArray = (array: any[]) => {
  const newArray = [...array]
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[newArray[i], newArray[j]] = [newArray[j], newArray[i]]
  }
  return newArray
}

type User = {
	username: string
	alive: boolean
	socketId: string
	color: string
}

type RoomState = {
	users: User[]
	running: boolean
	lastSeed?: number
	powerUpsEnabled: boolean
	itemSpawnRate: number
}

export default (nitroApp: NitroApp) => {
	// Transform H3 into Node listener
	const listener = toNodeListener(nitroApp.h3App)

	// Create a real Node HTTP server
	const httpServer = createServer(listener)

	// Connect socket.io to it
	const io = new Server(httpServer, {
		cors: {
			origin: "*",
		},
	})
	
	const rooms: Record<string, RoomState> = {}
	const memberBySocket = new Map<string, { room: string; username: string }>()
	
	const sanitizeUsername = (u: unknown): string | null => {
		if (typeof u !== 'string') return null
		const v = u.trim()
		if (!v) return null
		return v
	}
	
	const cleanRoom = (room: string) => {
		const state = rooms[room]
		if (!state) return
		const seen = new Set<string>()
		state.users = state.users.filter((u) => {
			const name = sanitizeUsername(u.username)
			if (!name || seen.has(name)) return false
			seen.add(name)
			u.username = name
			return true
		})
	}
	
	const emitLeader = (room: string) => {
		const state = rooms[room]
		const leader = state?.users[0]?.username ?? null
		io.to(room).emit("room-leader", { username: leader })
	}
	
	const broadcastUsers = (room: string) => {
		cleanRoom(room)
		const state = rooms[room]
		if (!state) return
		io.to(room).emit("room-users", { users: state.users })
		emitLeader(room)
	}
	
	const removeUser = (room: string, username: string) => {
		const state = rooms[room]
		if (!state) {
			return
		}

		const before = state.users.length
		state.users = state.users.filter((u) => {
			const shouldKeep = u.username !== username
			return shouldKeep
		})

		cleanRoom(room)

		if (state.users.length !== before) {
			io.to(room).emit("user-left", username)
			broadcastUsers(room)
		}

		if (state.users.length === 0) {
			delete rooms[room]
		}
	}
	
	io.on("connection", (socket) => {
		socket.on("check-username", ({ room, username }, callback) => {
			const clean = sanitizeUsername(username)
			if (!clean) {
				callback({ available: false })
				return
			}

			const state = rooms[room]
			if (!state) {
				callback({ available: true })
				return
			}

			const isTaken = state.users.some(u => u.username === clean)
			callback({ available: !isTaken })
		})

		socket.on("check-room-exists", ({ room }, callback) => {
			const exists = !!rooms[room]
			callback({ exists })
		})
		
		socket.on("join-room", ({ room, username, powerUpsEnabled, itemSpawnRate }) => {
			// IMPORTANT: join the Socket.IO room
			socket.join(room)

			if (!rooms[room]) {
				// Create new room with power-ups setting (default true for backward compatibility)
				rooms[room] = {
					users: [],
					running: false,
					powerUpsEnabled: powerUpsEnabled !== undefined ? powerUpsEnabled : true,
					itemSpawnRate: itemSpawnRate !== undefined ? itemSpawnRate : 0.08
				}
			}
			const state = rooms[room]
			
			const clean = sanitizeUsername(username)
			if (!clean) return

			// Remember the membership
			memberBySocket.set(socket.id, { room, username: clean })
			if (!state.users.find(u => u.username === clean)) {
				// Create a copy of available colors
				const availableColors = [...PLAYER_COLORS]

				// Remove colors already used in the room
				const usedColors = new Set(state.users.map(user => user.color))
				const remainingColors = availableColors.filter(color => !usedColors.has(color))

				// If all unique colors are exhausted, reset with all colors
				const colorsToUse = remainingColors.length > 0 ? remainingColors : [...PLAYER_COLORS]

				// Pick a random color from those available
				const color = shuffleArray(colorsToUse)[Math.floor(Math.random() * colorsToUse.length)] || '#000000'
				state.users.push({ username: clean, alive: !state.running, socketId: socket.id, color })
			}
			
			// Send game state to the joining client
			socket.emit("game-state", { isPlaying: state.running })

			// Send room settings to the joining client
			socket.emit("room-settings", {
				powerUpsEnabled: state.powerUpsEnabled,
				itemSpawnRate: state.itemSpawnRate
			})

			// emit directly to the joining socket to avoid any race
			socket.emit("room-users", { users: state.users })
			emitLeader(room)

			// then broadcast to the whole room
			broadcastUsers(room)
			io.to(room).emit("user-joined", { username: clean })
		})
		
		socket.on("leave-room", ({ room, username }, callback) => {
			// Check if the user is in the room
			const currentRoom = rooms[room]
			if (!currentRoom) {
				callback?.({ success: false, error: 'Room does not exist' })
				return
			}

			// Remove the user from the room
			socket.leave(room)
			memberBySocket.delete(socket.id)

			// Remove the user from the user list
			const userIndex = currentRoom.users.findIndex(u => u.username === username)
			if (userIndex !== -1) {
				currentRoom.users.splice(userIndex, 1)
			}

			// Notify other users
			io.to(room).emit("user-left", username)
			broadcastUsers(room)

			// Clean up the room if empty
			if (currentRoom.users.length === 0) {
				delete rooms[room]
			}

			callback?.({ success: true })
		})
		
		// Start the game: payload { room, seed }
		socket.on("tetris-start", ({ room, seed }: { room: string; seed: number }) => {
			const state = rooms[room]
			if (!state) return

			// Prevent restart if a game is already running
			if (state.running) {
				return
			}

			state.running = true
			state.lastSeed = seed

			// Mark all players as alive
			for (const user of state.users) user.alive = true
			broadcastUsers(room) // Send updated list

			// Send seed, power-ups setting, and spawn rate to all clients
			// Items are now generated client-side
			io.to(room).emit("tetris-start", {
				seed,
				powerUpsEnabled: state.powerUpsEnabled,
				itemSpawnRate: state.itemSpawnRate
			})
		})

		// Relay grids: payload { room, username, grid }
		socket.on("tetris-grid", ({ room, username, grid, color }: { room: string; username: string; grid: string[], color: string }) => {
			if (!room || !username || !grid || !Array.isArray(grid)) {
				console.error('Invalid grid data received:', { room, username, gridLength: grid?.length, color })
				return
			}
			socket.to(room).emit("tetris-ghost", { 
				username, 
				grid,
				color: color || '#888888' // Default color if not provided
			})
		})
		
		// Send lines to others
		socket.on('tetris-send-lines', ({ room, count }: { room: string; count: number }) => {
			socket.to(room).emit('tetris-receive-lines', { count })
		})

		// A player has lost
		socket.on("tetris-game-over", ({ room, username }) => {
			const state = rooms[room]
			if (!state) return

			const user = state.users.find(u => u.username === username)
			if (user) user.alive = false

			// Notify everyone that the player lost
			io.to(room).emit("player-lost", { username })
			broadcastUsers(room) // Update player list

			// Check if there is a winner
			const alivePlayers = state.users.filter(u => u.alive)
			if (state.running && state.users.length > 1 && alivePlayers.length === 1) {
				const winner = alivePlayers[0]
				if (winner) {
					// Notify the winner
					io.to(winner.socketId).emit("tetris-win")
					// Notify other players
					socket.to(room).emit("player-lost", { username: winner.username })
					// Notify everyone of game end with winner
					state.running = false
					io.to(room).emit("game-ended", { winner: winner.username })
				}
			} else if (state.running && alivePlayers.length <= 1) {
				state.running = false
				const lastPlayer = alivePlayers[0]?.username || ''
				io.to(room).emit("game-ended", { winner: lastPlayer })
			}
		})

		// Item used - validate and broadcast effects
		socket.on("item-used", ({ room, username, itemType, targetUsername }) => {
			const state = rooms[room]
			if (!state) return

			const user = state.users.find(u => u.username === username)
			if (!user || !user.alive) return

			// Broadcast the item effect to all players in the room
			io.to(room).emit("item-effect", {
				sourceUsername: username,
				targetUsername: targetUsername || '',
				itemType,
				effectData: {}
			})
		})
		
		// socket.on("disconnect", (reason) => {
		// 	console.log(`Client disconnected: ${socket.id} (${reason})`)
		// 	const entry = memberBySocket.get(socket.id)
		// 	if (entry) {
		// 		console.log(`Removing user ${entry.username} from room ${entry.room} due to disconnection`)
		// 		memberBySocket.delete(socket.id)
		// 		// Use a small delay to handle page navigation vs tab closing
		// 		setTimeout(() => {
		// 			if (!Array.from(memberBySocket.values()).some(u => u.username === entry.username)) {
		// 				removeUser(entry.room, entry.username)
		// 			}
		// 		}, 1000) // Wait 1 second before removing to handle page navigation
		// 	}
		// })
	})
	
	// ⚠️ Start the custom HTTP server only at runtime, not during build
	// @ts-ignore
	if (!import.meta.prerender) {
		httpServer.listen(3001, "0.0.0.0")
	}
}
