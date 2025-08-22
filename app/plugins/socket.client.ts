import { defineNuxtPlugin } from "nuxt/app"
import { io } from "socket.io-client"
import type { TypedSocket } from "../types/socket"

export default defineNuxtPlugin(() => {
	const socket: TypedSocket = io(`${window.location.protocol}//${window.location.hostname}:3001`) // ton backend

	return {
		provide: {
			socket
		}
	}
})