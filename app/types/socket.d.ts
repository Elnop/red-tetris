import type { Socket } from "socket.io-client"

/**
 * Tous les events que le CLIENT peut envoyer au SERVER
 */
export interface ClientToServerEvents {
	"join-room": (payload: { room: string; username: string }) => void
	"leave-room": (payload: { room: string; username: string }) => void
	"send-message": (payload: { room: string; message: string }) => void
	"tetris-start": (payload: { room: string; seed: number }) => void
	"tetris-grid": (payload: { room: string; username: string; grid: string[] }) => void
}

/**
 * Tous les events que le SERVER peut envoyer au CLIENT
 */
export interface ServerToClientEvents {
	"room-users": (payload: { users: string[] }) => void
	"room-leader": (payload: { username: string | null }) => void
	"user-joined": (payload: { username: string }) => void
	"user-left": (username: string) => void
	"receive-message": (payload: { username: string; message: string }) => void
	"tetris-start": (payload: { seed: number }) => void
	"tetris-ghost": (payload: { username: string; grid: string[] }) => void
}

/**
 * Type de socket avec les events typés
 */
export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>

declare module "#app" {
	interface NuxtApp {
		$socket: import("./socket").TypedSocket
	}
}

declare module "vue" {
	interface ComponentCustomProperties {
		$socket: import("./socket").TypedSocket
	}
}