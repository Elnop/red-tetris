<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRouter } from '#app';
import { useUserStore } from '~/stores/useUserStore';
import { useRoomStore } from '~/stores/useRoomStore';
import { useThemeStore } from '~/stores/useThemeStore';
import { validateUsername, validateRoomName } from '~/utils/validation';
import { useSocketEmiters } from '~/composables/socketEmiters';

const userStore = useUserStore()
const roomStore = useRoomStore()
const themeStore = useThemeStore()
const router = useRouter()
const { $socket } = useNuxtApp()

const { emitUserNameIsTaken } = useSocketEmiters()

const titleText = computed(() => `${themeStore.colors.name} Tetris`)

const handleTitleClick = () => {
	themeStore.cycleTheme()
}

// UI State
const mode = ref<'join' | 'create'>('join')
const powerUpsEnabled = ref(false)
const itemSpawnRate = ref(25) // Default 25%
const errorMessage = ref('')
const isLoading = ref(false)

function switchMode(newMode: 'join' | 'create') {
	mode.value = newMode
	errorMessage.value = ''
}

async function joinHandler() {
	const usernameError = validateUsername(userStore.username || '')
	const roomError = validateRoomName(userStore.roomName || '')

	if (usernameError) {
		errorMessage.value = usernameError
		return
	}

	if (roomError) {
		errorMessage.value = roomError
		return
	}

	errorMessage.value = ''
	isLoading.value = true

	try {
		// Check if username is available
		const isAvailable = await emitUserNameIsTaken()

		if (isAvailable) {
			// Store power-ups setting in room store
			roomStore.setPowerUpsEnabled(powerUpsEnabled.value)

			// If username is available, navigate to the room
			router.push(`/${userStore.roomName}`)
		} else {
			// If username is taken, generate a new one and try again
			userStore.genUsername()
			errorMessage.value = 'This username is already taken. A new username has been generated.'
		}
	} catch (error) {
		console.error('Error checking username:', error)
		errorMessage.value = 'An error occurred. Please try again.'
	} finally {
		isLoading.value = false
	}
}

function checkRoomExists(roomName: string): Promise<boolean> {
	return new Promise((resolve) => {
		if (!$socket) {
			resolve(false)
			return
		}
		const socket = $socket as import('~/types/socket').TypedSocket
		socket.emit('check-room-exists', { room: roomName }, (response: { exists: boolean }) => {
			resolve(response.exists)
		})
	})
}

async function createHandler() {
	const usernameError = validateUsername(userStore.username || '')
	const roomError = validateRoomName(userStore.roomName || '')

	if (usernameError) {
		errorMessage.value = usernameError
		return
	}

	if (roomError) {
		errorMessage.value = roomError
		return
	}

	errorMessage.value = ''
	isLoading.value = true

	try {
		// Check if room already exists
		const exists = await checkRoomExists(userStore.roomName || '')
		if (exists) {
			errorMessage.value = `Room "${userStore.roomName}" already exists. Please choose a different name or join the existing room.`
			isLoading.value = false
			return
		}

		// Store power-ups setting and item spawn rate in room store
		roomStore.setPowerUpsEnabled(powerUpsEnabled.value)
		roomStore.setItemSpawnRate(itemSpawnRate.value / 100) // Convert percentage to decimal

		// Navigate to the room as creator
		router.push(`/${userStore.roomName}`)
	} catch (error) {
		console.error('Error creating room:', error)
		errorMessage.value = 'An error occurred. Please try again.'
	} finally {
		isLoading.value = false
	}
}

</script>

<template>
	<div class="page-container" :style="{
		background: `linear-gradient(135deg, ${themeStore.colors.gradientStart} 0%, ${themeStore.colors.gradientEnd} 100%)`
	}">
		<div class="project-title" @click="handleTitleClick" :style="{
			color: '#fff',
			textShadow: `0 2px 0 ${themeStore.colors.primary}, 0 4px 8px #000`,
			cursor: 'pointer'
		}">{{ titleText }}</div>
		<div v-if="userStore.globalLinesCleared > 0" class="global-lines">
			<div class="pixel-text" :style="{
				color: themeStore.colors.secondary,
				borderColor: themeStore.colors.secondary,
				boxShadow: `0 0 10px ${themeStore.colors.secondary}80`
			}">TOTAL LINES: {{ userStore.globalLinesCleared }}</div>
		</div>
		<!-- Mode Tabs -->
		<div class="mode-tabs">
			<button @click="switchMode('join')" class="mode-tab" :class="{ active: mode === 'join' }" :style="{
				background: mode === 'join' ? `linear-gradient(90deg, ${themeStore.colors.secondary} 0%, ${themeStore.colors.primary} 100%)` : 'rgba(255, 255, 255, 0.1)',
				borderColor: mode === 'join' ? themeStore.colors.primary : 'rgba(255, 255, 255, 0.3)'
			}">
				JOIN ROOM
			</button>
			<button @click="switchMode('create')" class="mode-tab" :class="{ active: mode === 'create' }" :style="{
				background: mode === 'create' ? `linear-gradient(90deg, ${themeStore.colors.secondary} 0%, ${themeStore.colors.primary} 100%)` : 'rgba(255, 255, 255, 0.1)',
				borderColor: mode === 'create' ? themeStore.colors.primary : 'rgba(255, 255, 255, 0.3)'
			}">
				CREATE ROOM
			</button>
		</div>

		<div class="input-block">
			<label for="username">Username:</label>
			<input id="username" v-model="userStore.username" @input="errorMessage = ''" maxlength="20"
				placeholder="1-20 alphanumeric characters" :style="{
					borderColor: themeStore.colors.secondary,
					color: themeStore.colors.primary
				}" />
			<label for="room">Room Name:</label>
			<input id="room" v-model="userStore.roomName" @input="errorMessage = ''" maxlength="20"
				placeholder="1-20 alphanumeric characters" :style="{
					borderColor: themeStore.colors.secondary,
					color: themeStore.colors.primary
				}" />

			<!-- Power-ups toggle (only in create mode) -->
			<div v-if="mode === 'create'" class="power-ups-toggle">
				<label class="toggle-label">
					<input type="checkbox" v-model="powerUpsEnabled" class="toggle-checkbox" />
					<span class="toggle-slider" :style="{
						background: powerUpsEnabled ? `linear-gradient(90deg, ${themeStore.colors.secondary} 0%, ${themeStore.colors.primary} 100%)` : '#666'
					}"></span>
					<span class="toggle-text">
						<span class="power-up-icon-2">⚡</span>
						Power-ups {{ powerUpsEnabled ? 'Enabled' : 'Disabled' }}
					</span>
				</label>
				<div class="power-up-hint">
					{{ powerUpsEnabled ? '8 special items available during gameplay' : 'Classic Tetris mode' }}
				</div>

				<!-- Item spawn rate slider (only when power-ups enabled) -->
				<div v-if="powerUpsEnabled" class="item-spawn-rate">
					<label class="spawn-rate-label">
						Item Spawn Rate: <span class="rate-value">{{ itemSpawnRate }}%</span>
					</label>
					<input type="range" v-model.number="itemSpawnRate" min="1" max="100" step="1"
						class="spawn-rate-slider" :style="{
							'--slider-color': themeStore.colors.primary,
							'--slider-percentage': `${itemSpawnRate}%`
						}" />
					<div class="rate-hint">
						{{ itemSpawnRate < 20 ? 'Very Rare' : itemSpawnRate < 40 ? 'Rare' : itemSpawnRate < 60
							? 'Balanced' : itemSpawnRate < 80 ? 'Frequent' : 'Very Frequent' }} </div>
					</div>
				</div>

				<div v-if="errorMessage" class="error-message" :style="{
					color: themeStore.colors.secondary
				}">
					{{ errorMessage }}
				</div>
			</div>

			<div class="button-block">
				<button v-if="mode === 'join'" @click="joinHandler" class="rtb-btn" :disabled="isLoading" :style="{
					background: `linear-gradient(90deg, ${themeStore.colors.secondary} 0%, ${themeStore.colors.primary} 100%)`,
					boxShadow: `0 2px 8px ${themeStore.colors.primary}44`
				}">
					{{ isLoading ? 'Loading...' : 'JOIN ROOM' }}
				</button>
				<button v-else @click="createHandler" class="rtb-btn" :disabled="isLoading" :style="{
					background: `linear-gradient(90deg, ${themeStore.colors.secondary} 0%, ${themeStore.colors.primary} 100%)`,
					boxShadow: `0 2px 8px ${themeStore.colors.primary}44`
				}">
					{{ isLoading ? 'Creating...' : 'CREATE & JOIN' }}
				</button>
			</div>

			<!-- Power-ups description section -->
			<div class="power-ups-section">
				<h2 class="section-title" :style="{ color: themeStore.colors.secondary }">
					⚡ Power-ups Available
				</h2>
				<div class="power-ups-grid">
					<div class="power-up-card" :style="{
						borderColor: themeStore.colors.secondary,
						background: `linear-gradient(135deg, ${themeStore.colors.secondary}15 0%, ${themeStore.colors.primary}15 100%)`
					}">
						<div class="power-up-icon">💥</div>
						<div class="power-up-name">Block Bomb</div>
						<div class="power-up-desc">Détruit un carré de 3x3 blocs au centre de votre grille</div>
					</div>
					<div class="power-up-card" :style="{
						borderColor: themeStore.colors.secondary,
						background: `linear-gradient(135deg, ${themeStore.colors.secondary}15 0%, ${themeStore.colors.primary}15 100%)`
					}">
						<div class="power-up-icon">🎁</div>
						<div class="power-up-name">Poisoned Gift</div>
						<div class="power-up-desc">Envoie 1 ligne de garbage à tous les adversaires</div>
					</div>
					<div class="power-up-card" :style="{
						borderColor: themeStore.colors.secondary,
						background: `linear-gradient(135deg, ${themeStore.colors.secondary}15 0%, ${themeStore.colors.primary}15 100%)`
					}">
						<div class="power-up-icon">🍀</div>
						<div class="power-up-name">Item Rush</div>
						<div class="power-up-desc">Augmente à 100% la chance d'avoir des items pendant 12 secondes</div>
					</div>
					<div class="power-up-card" :style="{
						borderColor: themeStore.colors.secondary,
						background: `linear-gradient(135deg, ${themeStore.colors.secondary}15 0%, ${themeStore.colors.primary}15 100%)`
					}">
						<div class="power-up-icon">🌊</div>
						<div class="power-up-name">Ground Breaker</div>
						<div class="power-up-desc">Détruit la ligne la plus basse et fait descendre tout le reste</div>
					</div>
					<div class="power-up-card" :style="{
						borderColor: themeStore.colors.secondary,
						background: `linear-gradient(135deg, ${themeStore.colors.secondary}15 0%, ${themeStore.colors.primary}15 100%)`
					}">
						<div class="power-up-icon">🌀</div>
						<div class="power-up-name">Confusion</div>
						<div class="power-up-desc">Inverse les contrôles de tous les adversaires pendant 5 secondes
						</div>
					</div>
					<div class="power-up-card" :style="{
						borderColor: themeStore.colors.secondary,
						background: `linear-gradient(135deg, ${themeStore.colors.secondary}15 0%, ${themeStore.colors.primary}15 100%)`
					}">
						<div class="power-up-icon">❄️</div>
						<div class="power-up-name">Freeze</div>
						<div class="power-up-desc">Gèle tous les adversaires pendant 3 secondes</div>
					</div>
					<div class="power-up-card" :style="{
						borderColor: themeStore.colors.secondary,
						background: `linear-gradient(135deg, ${themeStore.colors.secondary}15 0%, ${themeStore.colors.primary}15 100%)`
					}">
						<div class="power-up-icon">🛡️</div>
						<div class="power-up-name">Immunity</div>
						<div class="power-up-desc">Immunité contre les garbage lines pendant 10 secondes</div>
					</div>
					<div class="power-up-card" :style="{
						borderColor: themeStore.colors.secondary,
						background: `linear-gradient(135deg, ${themeStore.colors.secondary}15 0%, ${themeStore.colors.primary}15 100%)`
					}">
						<div class="power-up-icon">🔮</div>
						<div class="power-up-name">Preview</div>
						<div class="power-up-desc">Voir les 5 prochaines pièces pendant 10 secondes</div>
					</div>
				</div>
			</div>

			<footer class="game-footer" :style="{
				borderTopColor: themeStore.colors.secondary
			}">
				<div class="footer-content">
					<!-- Left Section -->
					<div class="footer-section">
						<div class="footer-title" :style="{ color: themeStore.colors.secondary }">About</div>
						<div class="footer-text">
							42 School Project
						</div>
					</div>

					<!-- Center Section -->
					<div class="footer-section">
						<div class="footer-title" :style="{ color: themeStore.colors.secondary }">Contributors</div>
						<div class="footer-text">
							Barbara & <a href="https://github.com/Elnop" target="_blank" rel="noopener noreferrer"
								class="author-link">Leon</a>
						</div>
					</div>

					<!-- Right Section - Links -->
					<div class="footer-section">
						<div class="footer-title" :style="{ color: themeStore.colors.secondary }">Links</div>
						<div class="footer-links">
							<a href="https://github.com/Elnop/red-tetris" target="_blank" rel="noopener noreferrer"
								class="footer-link" :style="{
									color: themeStore.colors.secondary,
									borderColor: `${themeStore.colors.secondary}99`,
									background: `${themeStore.colors.secondary}26`
								}">
								<svg class="github-icon" viewBox="0 0 24 24" width="18" height="18">
									<path fill="currentColor"
										d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z" />
								</svg>
								GitHub Repository
							</a>
							<a href="https://projects.intra.42.fr/42cursus-red-tetris/mine" target="_blank"
								rel="noopener noreferrer" class="footer-link" :style="{
									color: themeStore.colors.secondary,
									borderColor: `${themeStore.colors.secondary}99`,
									background: `${themeStore.colors.secondary}26`
								}">
								<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
									fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
									stroke-linejoin="round" class="lucide lucide-school-2">
									<circle cx="12" cy="10" r="1" />
									<path d="M4 10a8 8 0 0 1 16 0" />
									<path d="M12 10v10" />
									<path d="M12 20v-6" />
									<path d="m8 18 4-2 4 2" />
								</svg>
								42 Intra Project
							</a>
						</div>
					</div>
				</div>
			</footer>
		</div>
</template>

<style>
* {
	padding: 0;
	margin: 0;
	color: inherit;
	box-sizing: border-box;
}

html,
body {
	height: 100vh;
	width: 100%;
	overflow-x: hidden;
	overflow-y: auto;
	margin: 0;
	padding: 0;
}

body {
	margin: 0;
	font-family: 'Press Start 2P', monospace;
	position: relative;
	width: 100%;
}

.page-container {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: flex-start;
	min-height: 100%;
	text-align: center;
	width: 100%;
	max-width: 100%;
	padding: 40px 20px 0 20px;
	box-sizing: border-box;
	overflow-x: hidden;
}

.project-title {
	font-family: 'Press Start 2P', monospace;
	font-size: 2.8rem;
	margin-top: 20px;
	margin-bottom: 2rem;
	letter-spacing: 2px;
	text-align: center;
	transition: transform 0.2s;
}

.project-title:hover {
	transform: scale(1.05);
}

@media (max-width: 768px) {
	.project-title {
		font-size: 2rem;
		margin-bottom: 1.5rem;
	}
}

.global-lines {
	margin: 10px 0 15px 0;
	text-align: center;
}

.global-lines .pixel-text {
	font-family: 'Press Start 2P', monospace;
	font-size: 0.8rem;
	text-shadow: 2px 2px 0 #000;
	background: rgba(0, 0, 0, 0.6);
	display: inline-block;
	padding: 8px 15px;
	border: 2px solid;
	border-radius: 5px;
}

.mode-tabs {
	display: flex;
	gap: 1rem;
	margin-bottom: 1.5rem;
	flex-wrap: wrap;
	justify-content: center;
}

.mode-tab {
	padding: 0.8rem 2rem;
	border: 2px solid;
	border-radius: 8px;
	font-family: 'Press Start 2P', monospace;
	font-size: 0.9rem;
	cursor: pointer;
	transition: all 0.3s;
	color: #fff;
	text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
}

.mode-tab:hover {
	transform: translateY(-2px);
	filter: brightness(1.1);
}

.mode-tab.active {
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.input-block {
	display: flex;
	flex-direction: column;
	align-items: center;
	margin-bottom: 1.5rem;
	width: 100%;
	max-width: 500px;
}

.input-block label {
	font-family: 'Press Start 2P', monospace;
	font-size: 1rem;
	margin-top: 0.7rem;
	margin-bottom: 0.2rem;
	color: #fff;
	letter-spacing: 1px;
}

.input-block input {
	padding: 0.6rem 1rem;
	border: 2px solid;
	border-radius: 6px;
	margin-bottom: 0.7rem;
	width: 100%;
	max-width: 420px;
	font-size: 1rem;
	background: #fff;
	font-family: 'Press Start 2P', monospace;
	transition: border 0.2s;
	box-sizing: border-box;
}

.input-block input:focus {
	outline: none;
	filter: brightness(0.95);
}

@media (max-width: 768px) {
	.input-block input {
		width: 90vw;
		max-width: 350px;
		font-size: 0.9rem;
	}
}

.input-block input::placeholder {
	color: #999;
	font-size: 0.7rem;
	opacity: 0.7;
}

.power-ups-toggle {
	margin-top: 1.5rem;
	margin-bottom: 1rem;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 0.8rem;
}

.toggle-label {
	display: flex;
	align-items: center;
	gap: 1rem;
	cursor: pointer;
	position: relative;
}

.toggle-checkbox {
	display: none;
}

.toggle-slider {
	width: 60px;
	height: 30px;
	border-radius: 15px;
	position: relative;
	transition: all 0.3s;
	box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
}

.toggle-slider::after {
	content: '';
	position: absolute;
	width: 24px;
	height: 24px;
	border-radius: 50%;
	background: #fff;
	top: 3px;
	left: 3px;
	transition: all 0.3s;
	box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.toggle-checkbox:checked+.toggle-slider::after {
	left: 33px;
}

.toggle-text {
	font-family: 'Press Start 2P', monospace;
	font-size: 0.9rem;
	color: #fff;
	text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
	display: flex;
	align-items: center;
	gap: 0.5rem;
}

.power-up-icon {
	font-size: 1.2rem;
	animation: pulse-glow 2s infinite;
}

@keyframes pulse-glow {

	0%,
	100% {
		filter: brightness(1);
		transform: scale(1);
	}

	50% {
		filter: brightness(1.5);
		transform: scale(1.1);
	}
}

.power-up-hint {
	font-family: 'Press Start 2P', monospace;
	font-size: 0.6rem;
	color: rgba(255, 255, 255, 0.8);
	text-align: center;
	line-height: 1.4;
}

.item-spawn-rate {
	margin-top: 1.5rem;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 0.8rem;
	width: 100%;
	max-width: 420px;
}

.spawn-rate-label {
	font-family: 'Press Start 2P', monospace;
	font-size: 0.7rem;
	color: rgba(255, 255, 255, 0.9);
	text-align: center;
}

.rate-value {
	color: var(--slider-color, #fff);
	text-shadow: 0 0 5px rgba(255, 255, 255, 0.5);
}

.spawn-rate-slider {
	width: 100%;
	height: 12px;
	border-radius: 8px;
	background: linear-gradient(to right,
			var(--slider-color) 0%,
			var(--slider-color) var(--slider-percentage),
			rgba(255, 255, 255, 0.15) var(--slider-percentage),
			rgba(255, 255, 255, 0.15) 100%);
	outline: none;
	-webkit-appearance: none;
	cursor: pointer;
	position: relative;
	border: 2px solid rgba(255, 255, 255, 0.3);
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3), inset 0 1px 3px rgba(0, 0, 0, 0.2);
	transition: all 0.3s ease;
}

.spawn-rate-slider:hover {
	border-color: rgba(255, 255, 255, 0.5);
	box-shadow: 0 2px 12px rgba(0, 0, 0, 0.4), 0 0 15px var(--slider-color);
}

.spawn-rate-slider:active {
	box-shadow: 0 1px 4px rgba(0, 0, 0, 0.5), inset 0 2px 4px rgba(0, 0, 0, 0.3);
}

.spawn-rate-slider::-webkit-slider-thumb {
	-webkit-appearance: none;
	appearance: none;
	width: 28px;
	height: 28px;
	border-radius: 6px;
	background: linear-gradient(135deg, #fff 0%, #f0f0f0 100%);
	cursor: pointer;
	border: 3px solid var(--slider-color);
	box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.3), 0 4px 12px rgba(0, 0, 0, 0.5), 0 0 20px var(--slider-color);
	transition: all 0.2s ease;
	position: relative;
}

.spawn-rate-slider::-webkit-slider-thumb:hover {
	transform: scale(1.15);
	box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.4), 0 6px 16px rgba(0, 0, 0, 0.6), 0 0 30px var(--slider-color);
	border-width: 4px;
}

.spawn-rate-slider::-webkit-slider-thumb:active {
	transform: scale(1.05);
	box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.5), 0 2px 8px rgba(0, 0, 0, 0.7), 0 0 25px var(--slider-color);
}

.spawn-rate-slider::-moz-range-thumb {
	width: 28px;
	height: 28px;
	border-radius: 6px;
	background: linear-gradient(135deg, #fff 0%, #f0f0f0 100%);
	cursor: pointer;
	border: 3px solid var(--slider-color);
	box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.3), 0 4px 12px rgba(0, 0, 0, 0.5), 0 0 20px var(--slider-color);
	transition: all 0.2s ease;
}

.spawn-rate-slider::-moz-range-thumb:hover {
	transform: scale(1.15);
	box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.4), 0 6px 16px rgba(0, 0, 0, 0.6), 0 0 30px var(--slider-color);
	border-width: 4px;
}

.spawn-rate-slider::-moz-range-thumb:active {
	transform: scale(1.05);
	box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.5), 0 2px 8px rgba(0, 0, 0, 0.7), 0 0 25px var(--slider-color);
}

.spawn-rate-slider::-moz-range-track {
	background: transparent;
	border: none;
}

.rate-hint {
	font-family: 'Press Start 2P', monospace;
	font-size: 0.55rem;
	color: rgba(255, 255, 255, 0.7);
	text-align: center;
}

.error-message {
	font-family: 'Press Start 2P', monospace;
	font-size: 0.9rem;
	margin-top: 0.5rem;
	text-align: center;
	line-height: 1.3;
	min-height: 2rem;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 0 10px;
}

@media (max-width: 768px) {
	.error-message {
		font-size: 0.7rem;
	}
}

.button-block {
	display: flex;
	gap: 1rem;
	justify-content: center;
	margin-bottom: 2rem;
	width: 100%;
}

.rtb-btn {
	padding: 0.7rem 1.5rem;
	color: #fff;
	border: 2px solid #fff;
	border-radius: 8px;
	font-size: 1.1rem;
	font-family: 'Press Start 2P', monospace;
	cursor: pointer;
	transition: all 0.2s;
}

.rtb-btn:hover {
	transform: scale(1.05);
	filter: brightness(1.1);
}

.rtb-btn:disabled {
	opacity: 0.5;
	cursor: not-allowed;
	transform: none;
}

@media (max-width: 768px) {
	.rtb-btn {
		font-size: 0.9rem;
		padding: 0.6rem 1.2rem;
	}
}

.power-ups-section {
	margin-top: 3rem;
	margin-bottom: 3rem;
	width: 100%;
	max-width: 1200px;
	padding: 0 20px;
}

.section-title {
	font-family: 'Press Start 2P', monospace;
	font-size: 1.5rem;
	margin-bottom: 2rem;
	text-align: center;
	text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
}

.power-ups-grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
	gap: 1.5rem;
	width: 100%;
}

.power-up-card {
	padding: 1.5rem;
	border: 2px solid;
	border-radius: 12px;
	text-align: center;
	transition: all 0.3s ease;
	backdrop-filter: blur(10px);
}

.power-up-card:hover {
	transform: translateY(-5px);
	box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
}

.power-up-icon {
	font-size: 3rem;
	margin-bottom: 0.8rem;
	animation: float 3s ease-in-out infinite;
}

.power-up-icon-2 {
	font-size: 3rem;
	margin-bottom: 0.8rem;
}

@keyframes float {

	0%,
	100% {
		transform: translateY(0px);
	}

	50% {
		transform: translateY(-10px);
	}
}

.power-up-name {
	font-family: 'Press Start 2P', monospace;
	font-size: 0.9rem;
	color: #fff;
	margin-bottom: 0.8rem;
	text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
}

.power-up-desc {
	font-family: 'Press Start 2P', monospace;
	font-size: 0.6rem;
	color: rgba(255, 255, 255, 0.8);
	line-height: 1.6;
}

@media (max-width: 768px) {
	.section-title {
		font-size: 1.2rem;
	}

	.power-ups-grid {
		grid-template-columns: 1fr;
		gap: 1rem;
	}

	.power-up-card {
		padding: 1rem;
	}

	.power-up-icon {
		font-size: 2.5rem;
	}

	.power-up-icon-2 {
		font-size: 2.5rem;
	}
}

.game-footer {
	position: relative;
	padding: 16px 0;
	font-family: 'Press Start 2P', monospace;
	color: rgba(255, 255, 255, 0.9);
	background: rgba(20, 20, 20, 0.98);
	border-top: 3px solid;
	width: 100vw;
	margin-top: 2rem;
}

.footer-content {
	max-width: 1200px;
	width: 100%;
	margin: 0 auto;
	padding: 0 20px;
	display: grid;
	grid-template-columns: 1fr 1fr 1.5fr;
	gap: 40px;
}

@media (max-width: 1024px) {
	.footer-content {
		grid-template-columns: 1fr;
		gap: 20px;
	}

	.footer-section {
		padding: 5px;
	}

	.footer-title {
		font-size: 1rem;
		margin-bottom: 10px;
	}

	.footer-text {
		font-size: 0.9rem;
	}

	.footer-link {
		font-size: 0.8rem;
		padding: 8px 12px;
	}
}

.footer-section {
	padding: 10px;
	display: flex;
	flex-direction: column;
	align-items: center;
}

.footer-title {
	font-size: 1.3rem;
	margin-bottom: 15px;
	font-weight: bold;
	text-transform: uppercase;
	letter-spacing: 1.5px;
	text-align: center;
}

.footer-text {
	font-size: 1.1rem;
	color: rgba(255, 255, 255, 0.95);
	line-height: 1.7;
	text-align: center;
}

.footer-links {
	display: flex;
	flex-direction: column;
	gap: 12px;
	align-items: center;
	width: 100%;
}

.footer-link {
	display: inline-flex;
	align-items: center;
	gap: 10px;
	text-decoration: none;
	transition: all 0.2s;
	font-size: 1rem;
	padding: 10px 18px;
	border: 1px solid;
	border-radius: 6px;
	justify-content: center;
}

.footer-link:hover {
	filter: brightness(1.2);
	transform: translateY(-2px);
}

.author-link {
	color: #4fc3f7 !important;
	text-decoration: none;
	transition: all 0.2s;
	padding: 4px 8px;
	border-radius: 4px;
	font-weight: bold;
	font-size: 1.1rem;
}

.author-link:hover {
	color: #81d4fa !important;
	text-decoration: none;
	background: rgba(79, 195, 247, 0.1);
}
</style>