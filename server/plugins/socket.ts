import { Server } from "socket.io"
import { toNodeListener } from "h3"
import { createServer } from "http"
import type { NitroApp } from "nitropack"

type RoomState = {
  users: string[]
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
    state.users = state.users
      .map(sanitizeUsername)
      .filter((u): u is string => !!u && !seen.has(u) && (seen.add(u), true))
  }

  const emitLeader = (room: string) => {
    const state = rooms[room]
    const leader = state?.users[0] ?? null
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
    state.users = state.users.filter((u) => u !== username)
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

      if (!state.users.includes(clean)) state.users.push(clean)

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
      if (!rooms[room]) rooms[room] = { users: [], running: false }
      rooms[room].running = true
      rooms[room].lastSeed = seed
      io.to(room).emit("tetris-start", { seed })
    })

    // Relayer les grilles: payload { room, username, grid }
    socket.on("tetris-grid", ({ room, username, grid }: { room: string; username: string; grid: string[] }) => {
      socket.to(room).emit("tetris-ghost", { username, grid })
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
  httpServer.listen(3001, () => {
    console.log("✅ Socket.IO server running on http://localhost:3001")
  })
}
