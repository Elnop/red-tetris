import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type ThemeName = 'red' | 'pink' | 'blue' | 'yellow'

export interface ThemeColors {
	name: string
	primary: string
	secondary: string
	gradientStart: string
	gradientEnd: string
}

const themes: Record<ThemeName, ThemeColors> = {
	red: {
		name: 'Red',
		primary: '#b71c1c',
		secondary: '#e53935',
		gradientStart: '#1a1a1a',
		gradientEnd: '#b71c1c',
	},
	pink: {
		name: 'Pink',
		primary: '#c2185b',
		secondary: '#f06292',
		gradientStart: '#1a1a1a',
		gradientEnd: '#c2185b',
	},
	blue: {
		name: 'Blue',
		primary: '#1976d2',
		secondary: '#42a5f5',
		gradientStart: '#1a1a1a',
		gradientEnd: '#1976d2',
	},
	yellow: {
		name: 'Yellow',
		primary: '#f57f17',
		secondary: '#fdd835',
		gradientStart: '#1a1a1a',
		gradientEnd: '#f57f17',
	},
}

const themeOrder: ThemeName[] = ['red', 'pink', 'blue', 'yellow']

export const useThemeStore = defineStore('theme', () => {
	const currentTheme = ref<ThemeName>('red')

	const colors = computed(() => themes[currentTheme.value])

	const cycleTheme = () => {
		const currentIndex = themeOrder.indexOf(currentTheme.value)
		const nextIndex = (currentIndex + 1) % themeOrder.length
		currentTheme.value = themeOrder[nextIndex]
	}

	return {
		currentTheme,
		colors,
		cycleTheme,
	}
})
