import type { Socket } from 'socket.io-client'

// Server-to-client events
interface ServerToClientEvents {
  'room-users': (data: { users: { username: string; alive: boolean; color: string }[] }) => void
  'room-leader': (data: { username: string | null }) => void
  'user-left': (username: string) => void
  'user-joined': (payload: { username: string }) => void
  'tetris-start': (data: { seed: number }) => void
  'game-ended': () => void
  'tetris-grid': (data: { username: string; grid: string[]; color: string }) => void
  'tetris-lines-cleared': (data: { username: string; count: number }) => void
  'player-lost': (data: { username: string }) => void
  'player-won': () => void
  'tetris-ghost': (data: { username: string; grid: string[]; color: string }) => void
  'tetris-win': () => void
  'tetris-receive-lines': (data: { count: number }) => void
}

// Client-to-server events
interface ClientToServerEvents {
  'join-room': (data: { room: string; username: string }) => void
  'leave-room': (data: { room: string }) => void
  'start-game': (data: { room: string }) => void
  'tetris-grid': (data: { room: string; grid: string[]; color: string }) => void
  'tetris-lines-cleared': (data: { room: string; count: number }) => void
  'player-lost': (data: { room: string; username: string }) => void
  'player-won': (data: { room: string }) => void
  'tetris-ghost': (data: { room: string; grid: string[]; color: string }) => void
  'tetris-send-lines': (data: { room: string; count: number }) => void
  'tetris-game-over': (data: { room: string; username: string }) => void
}

type User = {
  username: string
  alive: boolean
  socketId: string
  color: string
}

// The typed socket
export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>