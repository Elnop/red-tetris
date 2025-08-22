import type { Socket } from 'socket.io-client'

// Server-to-client events
interface ServerToClientEvents {
  'room-leader': (payload: { username: string | null }) => void
  'room-users': (payload: { users: User[] }) => void
  'user-left': (username: string) => void
  'user-joined': (payload: { username: string }) => void
  'tetris-start': (payload: { seed: number }) => void
  'tetris-ghost': (payload: { username: string; grid: string[], color: string }) => void
  'tetris-receive-lines': (payload: { count: number }) => void
  'player-lost': (payload: { username: string }) => void
  'tetris-win': () => void
  'game-ended': () => void
}

// Client-to-server events
interface ClientToServerEvents {
  'join-room': (payload: { room: string; username: string }) => void
  'leave-room': (payload: { room: string; username: string }) => void
  'tetris-start': (payload: { room: string; seed: number }) => void
  'tetris-grid': (payload: { room: string; username: string; grid: string[], color: string }) => void
  'tetris-send-lines': (payload: { room: string; count: number }) => void
  'tetris-game-over': (payload: { room: string; username: string }) => void
}

type User = {
  username: string
  alive: boolean
  socketId: string
  color: string
}

// The typed socket
export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>