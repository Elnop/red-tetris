import { defineStore, storeToRefs } from 'pinia';
import { ref } from 'vue';
import { useRoomStore } from './useRoomStore';


function generateUsername() {
	const prefixes = [
		'Block', 'Tet', 'Quad', 'Line', 'Pixel', 'Stack', 'Brick', 'Clear', 'Drop', 'Spin'
	];

	const tetrisRefs = [
		'Master', 'Champion', 'Overlord', 'Wizard', 'King', 'Queen', 'Lord', 'Hero', 'Beast', 'Ninja'
	];

	const suffixes = [
		'99', 'X', '3000', 'Pro', 'GG', 'Rush', 'Fast', 'Combo', 'Max', 'Ultra'
	];

	const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
	const middle = tetrisRefs[Math.floor(Math.random() * tetrisRefs.length)];
	const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];

	return `${prefix}${middle}${suffix}`;
}

export const useUserStore = defineStore('user', () => {
	const username = ref<string | null>(null)
	const roomName = ref<string>("")
	const userColor = ref<string>("#FFFFFF")
	const genUsername = () => {
		username.value = generateUsername()
	}
	const setColor = (color: string) => {
		userColor.value = color
	}
	if (!username.value)
		genUsername()
	return { username, genUsername, roomName, userColor, setColor }
}, {
	// @ts-ignore
	persist: {
		// @ts-ignore
		storage: piniaPluginPersistedstate.localStorage(),
	},
})