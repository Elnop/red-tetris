import { Server } from "socket.io"
import { toNodeListener } from "h3"
import { createServer } from "http"
import type { NitroApp } from "nitropack"

const PLAYER_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FED766', '#2AB7CA', '#F0B7B3', '#97C1A9']

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
}

export default (nitroApp: NitroApp) => {
	// Transformer H3 en listener Node
	const listener = toNodeListener(nitroApp.h3App)
	
	// Créer un vrai serveur HTTP Node
	const httpServer = createServer(listener)
	
	// Brancher socket.io dessus
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
		console.log(`[REMOVE-USER] Tentative de suppression de ${username} de la salle ${room}`)
		const state = rooms[room]
		if (!state) {
			console.log(`[REMOVE-USER] Échec: la salle ${room} n'existe pas`)
			return
		}
		
		const before = state.users.length
		state.users = state.users.filter((u) => {
			const shouldKeep = u.username !== username
			if (!shouldKeep) {
				console.log(`[REMOVE-USER] Suppression de l'utilisateur: ${u.username} (${u.socketId})`)
			}
			return shouldKeep
		})
		
		cleanRoom(room)
		
		if (state.users.length !== before) {
			console.log(`[REMOVE-USER] Notification de la déconnexion de ${username} à la salle ${room}`)
			io.to(room).emit("user-left", username)
			broadcastUsers(room)
		} else {
			console.log(`[REMOVE-USER] Aucun utilisateur supprimé (${username} non trouvé)`)
		}
		
		if (state.users.length === 0) {
			console.log(`[REMOVE-USER] Suppression de la salle ${room} car elle est vide`)
			delete rooms[room]
		}
	}
	
	io.on("connection", (socket) => {		
		socket.on("join-room", ({ room, username }) => {
			// IMPORTANT: join the Socket.IO room
			socket.join(room)
			
			if (!rooms[room]) rooms[room] = { users: [], running: false }
			const state = rooms[room]
			
			const clean = sanitizeUsername(username)
			if (!clean) return
			
			// mémoriser l'appartenance
			memberBySocket.set(socket.id, { room, username: clean })
			if (!state.users.find(u => u.username === clean)) {
				const color = PLAYER_COLORS[state.users.length % PLAYER_COLORS.length]!
				state.users.push({ username: clean, alive: !state.running, socketId: socket.id, color })
			}
			
			// emit directly to the joining socket to avoid any race
			socket.emit("room-users", { users: state.users })
			emitLeader(room)
			
			// then broadcast to the whole room
			broadcastUsers(room)
			io.to(room).emit("user-joined", { username: clean })
		})
		
		socket.on("leave-room", ({ room, username }, callback) => {
			console.log(`[LEAVE-ROOM] Début - Room: ${room}, Username: ${username}, Socket ID: ${socket.id}`)
			
			// Vérifier si l'utilisateur est bien dans la salle
			const currentRoom = rooms[room]
			if (!currentRoom) {
				console.log(`[LEAVE-ROOM] La salle ${room} n'existe pas`)
				callback?.({ success: false, error: 'Room does not exist' })
				return
			}
			
			// Retirer l'utilisateur de la salle
			socket.leave(room)
			memberBySocket.delete(socket.id)
			
			// Supprimer l'utilisateur de la liste des utilisateurs
			const userIndex = currentRoom.users.findIndex(u => u.username === username)
			if (userIndex !== -1) {
				currentRoom.users.splice(userIndex, 1)
				console.log(`[LEAVE-ROOM] Utilisateur ${username} retiré de la salle ${room}`)
			}
			
			// Notifier les autres utilisateurs
			io.to(room).emit("user-left", username)
			broadcastUsers(room)
			
			// Nettoyer la salle si elle est vide
			if (currentRoom.users.length === 0) {
				console.log(`[LEAVE-ROOM] Suppression de la salle ${room} car elle est vide`)
				delete rooms[room]
			}
			
			console.log(`[LEAVE-ROUN] Fin - Utilisateur ${username} a quitté la salle ${room}`)
			callback?.({ success: true })
		})
		
		// Lancer la partie: payload { room, seed }
		socket.on("tetris-start", ({ room, seed }: { room: string; seed: number }) => {
			const state = rooms[room]
			if (!state) return
			state.running = true
			state.lastSeed = seed
			// Marquer tous les joueurs comme vivants
			for (const user of state.users) user.alive = true
			broadcastUsers(room) // Envoyer la liste mise à jour
			io.to(room).emit("tetris-start", { seed })
		})
		
		// Relayer les grilles: payload { room, username, grid }
		socket.on("tetris-grid", ({ room, username, grid, color }: { room: string; username: string; grid: string[], color: string }) => {
			if (!room || !username || !grid || !Array.isArray(grid)) {
				console.error('Invalid grid data received:', { room, username, gridLength: grid?.length, color })
				return
			}
			// Broadcast to other players in the room
			socket.to(room).emit("tetris-ghost", { 
				username, 
				grid,
				color: color || '#888888' // Default color if not provided
			})
		})
		
		// Envoyer des lignes aux autres
		socket.on('tetris-send-lines', ({ room, count }: { room: string; count: number }) => {
			socket.to(room).emit('tetris-receive-lines', { count })
		})
		
		// Un joueur a perdu
		socket.on("tetris-game-over", ({ room, username }) => {
			const state = rooms[room]
			if (!state) return
			
			const user = state.users.find(u => u.username === username)
			if (user) user.alive = false
			
			// Notifier tout le monde que le joueur a perdu
			io.to(room).emit("player-lost", { username })
			broadcastUsers(room) // Mettre à jour la liste des joueurs
			
			// Vérifier s'il y a un gagnant
			const alivePlayers = state.users.filter(u => u.alive)
			if (state.running && state.users.length > 1 && alivePlayers.length === 1) {
				const winner = alivePlayers[0]
				if (winner) {
					// Notifier le gagnant
					io.to(winner.socketId).emit("tetris-win")
					// Notifier les autres joueurs
					socket.to(room).emit("player-lost", { username: winner.username })
				}
				state.running = false
				io.to(room).emit("game-ended")
			} else if (state.running && alivePlayers.length <= 1) {
				state.running = false
				io.to(room).emit("game-ended")
			}
		})
		
		socket.on("disconnect", () => {
			const entry = memberBySocket.get(socket.id)
			if (entry) {
				memberBySocket.delete(socket.id)
				removeUser(entry.room, entry.username)
			}
		})
	})
	
	// ⚠️ Lancer le serveur HTTP personnalisé
	httpServer.listen(3001, "0.0.0.0", () => {
		console.log("✅ Socket.IO server listening on port 3001")
	})
}
