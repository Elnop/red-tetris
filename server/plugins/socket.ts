import { Server } from "socket.io"
import { toNodeListener } from "h3"
import { createServer } from "http"
import type { NitroApp } from "nitropack"

type User = {
  username: string
  alive: boolean
  socketId: string
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
    console.log('[sanitizeUsername] v=%s', v)
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
    console.log('[room name]', room)
    cleanRoom(room)
    const state = rooms[room]
    if (!state) return
    io.to(room).emit("room-users", { users: state.users })
    console.log('[broadcastUsers] users=%o', state.users)
    emitLeader(room)
  }

  const removeUser = (room: string, username: string) => {
    const state = rooms[room]
    if (!state) return
    const before = state.users.length
    state.users = state.users.filter((u) => u.username !== username)
    cleanRoom(room)
    if (state.users.length !== before) {
      io.to(room).emit("user-left", username)
      broadcastUsers(room)
    }
    if (state.users.length === 0) delete rooms[room]
  }

  io.on("connection", (socket) => {
    console.log("🔌 Client connected")

    socket.on("join-room", ({ room, username }) => {
      console.log('[join-room] room=%s username=%o socket=%s', room, username, socket.id)

      // IMPORTANT: join the Socket.IO room
      socket.join(room)

      if (!rooms[room]) rooms[room] = { users: [], running: false }
      const state = rooms[room]

      const clean = sanitizeUsername(username)
      if (!clean) return

      // mémoriser l'appartenance
      memberBySocket.set(socket.id, { room, username: clean })

      if (!state.users.find(u => u.username === clean)) {
        state.users.push({ username: clean, alive: !state.running, socketId: socket.id })
      }

      // emit directly to the joining socket to avoid any race
      socket.emit("room-users", { users: state.users })
      emitLeader(room)

      // then broadcast to the whole room
      broadcastUsers(room)
      io.to(room).emit("user-joined", { username: clean })

      // Si une partie est déjà en cours, envoyer le seed au nouveau venu
      if (state.running && typeof state.lastSeed === 'number') {
        socket.emit("tetris-start", { seed: state.lastSeed })
      }
    })

    socket.on("leave-room", ({ room, username }) => {
      socket.leave(room)
      memberBySocket.delete(socket.id)
      removeUser(room, username)
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
    socket.on("tetris-grid", ({ room, username, grid }: { room: string; username: string; grid: string[] }) => {
      socket.to(room).emit("tetris-ghost", { username, grid })
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
        if (winner) io.to(winner.socketId).emit("tetris-win")
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
      console.log("❌ Client disconnected")
    })
  })

  // ⚠️ Lancer le serveur HTTP personnalisé
  httpServer.listen(3001, "0.0.0.0", () => {
    console.log("✅ Socket.IO server listening on port 3001")
  })
}
