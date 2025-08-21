import { defineNuxtPlugin } from "nuxt/app"
import { io } from "socket.io-client"
import type { TypedSocket } from "../types/socket"

export default defineNuxtPlugin(() => {
	const socket: TypedSocket = io("http://localhost:3001") // ton backend

	return {
		provide: {
			socket
		}
	}
})