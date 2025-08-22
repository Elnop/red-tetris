import { defineNuxtConfig } from "nuxt/config";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
	srcDir: "app",
	ssr: false,
	compatibilityDate: '2025-07-15',
	devtools: { enabled: true },

	app: {
		pageTransition: { name: "page", mode: "out-in" }
	},

	nitro: {
		prerender: {
			routes: ["/"],
			ignore: ["/blog", "/blog/*"]
		}
	},
	modules: ["@pinia/nuxt", 'pinia-plugin-persistedstate/nuxt',],
	css: [
		'@/assets/css/main.css'
	]
})