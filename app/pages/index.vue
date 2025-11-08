<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRouter } from '#app';
import { useUserStore } from '~/stores/useUserStore';
import { useThemeStore } from '~/stores/useThemeStore';
import { validateUsername, validateRoomName } from '~/utils/validation';
import { useSocketEmiters } from '~/composables/socketEmiters';

const userStore = useUserStore()
const themeStore = useThemeStore()
const router = useRouter()

const { emitUserNameIsTaken } = useSocketEmiters()

const titleText = computed(() => `${themeStore.colors.name} Tetris`)

const handleTitleClick = () => {
	themeStore.cycleTheme()
}

const errorMessage = ref('')
const isLoading = ref(false)

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

// function createHandler() {
//    router.push(`/room/${userStore.roomName || userStore.username}`)
// }

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
		<div class="input-block">
			<label for="username">Username:</label>
			<input
			id="username"
			v-model="userStore.username"
			@input="errorMessage = ''"
			maxlength="20"
			placeholder="1-20 alphanumeric characters"
			:style="{
				borderColor: themeStore.colors.secondary,
				color: themeStore.colors.primary
			}"
			/>
			<label for="room">Room:</label>
			<input
			id="room"
			v-model="userStore.roomName"
			@input="errorMessage = ''"
			maxlength="20"
			placeholder="1-20 alphanumeric characters"
			:style="{
				borderColor: themeStore.colors.secondary,
				color: themeStore.colors.primary
			}"
			/>
			<div v-if="errorMessage" class="error-message" :style="{
				color: themeStore.colors.secondary
			}">
				{{ errorMessage }}
			</div>
		</div>
		<div class="button-block">
			<button
			@click="joinHandler"
			class="rtb-btn"
			:disabled="isLoading"
			:style="{
				background: `linear-gradient(90deg, ${themeStore.colors.secondary} 0%, ${themeStore.colors.primary} 100%)`,
				boxShadow: `0 2px 8px ${themeStore.colors.primary}44`
			}"
			>
				{{ isLoading ? 'Loading...' : 'JOIN' }}
			</button>
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
						Barbara & <a href="https://github.com/Elnop" target="_blank" rel="noopener noreferrer" class="author-link">Leon</a>
					</div>
				</div>

				<!-- Right Section - Links -->
				<div class="footer-section">
					<div class="footer-title" :style="{ color: themeStore.colors.secondary }">Links</div>
					<div class="footer-links">
						<a href="https://github.com/Elnop/red-tetris" target="_blank" rel="noopener noreferrer" class="footer-link" :style="{
							color: themeStore.colors.secondary,
							borderColor: `${themeStore.colors.secondary}99`,
							background: `${themeStore.colors.secondary}26`
						}">
							<svg class="github-icon" viewBox="0 0 24 24" width="18" height="18">
								<path fill="currentColor" d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z"/>
							</svg>
							GitHub Repository
						</a>
						<a href="https://projects.intra.42.fr/42cursus-red-tetris/mine" target="_blank" rel="noopener noreferrer" class="footer-link" :style="{
							color: themeStore.colors.secondary,
							borderColor: `${themeStore.colors.secondary}99`,
							background: `${themeStore.colors.secondary}26`
						}">
							<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-school-2">
								<circle cx="12" cy="10" r="1"/>
								<path d="M4 10a8 8 0 0 1 16 0"/>
								<path d="M12 10v10"/>
								<path d="M12 20v-6"/>
								<path d="m8 18 4-2 4 2"/>
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

html, body {
	height: 100vh;
	width: 100vw;
	overflow-x: hidden;
}

body {
	height: 100vh;
	margin: 0;
	font-family: 'Press Start 2P', monospace;
	position: relative;
	width: 100vw;
}

.page-container {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	height: 100vh;
	text-align: center;
	width: 100vw;
}

.project-title {
	font-family: 'Press Start 2P', monospace;
	font-size: 2.8rem;
	margin-bottom: 2.5rem;
	letter-spacing: 2px;
	text-align: center;
	transition: transform 0.2s;
}
.project-title:hover {
	transform: scale(1.05);
}

.global-lines {
	margin: 15px 0;
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
.input-block {
	display: flex;
	flex-direction: column;
	align-items: center;
	margin-bottom: 2rem;
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
	width: 420px;
	font-size: 1rem;
	background: #fff;
	font-family: 'Press Start 2P', monospace;
	transition: border 0.2s;
}
.input-block input:focus {
	outline: none;
	filter: brightness(0.95);
}

.input-block input::placeholder {
	color: #999;
	font-size: 0.7rem;
	opacity: 0.7;
}

.error-message {
	font-family: 'Press Start 2P', monospace;
	font-size: 0.9rem;
	margin-top: 0.5rem;
	text-align: center;
	line-height: 1.3;
	min-height: 2.5rem;
	display: flex;
	align-items: center;
	justify-content: center;
}
.button-block {
	display: flex;
	gap: 1rem;
	justify-content: center;
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
.game-footer {
	position: absolute;
	bottom: 0;
	left: 0;
	right: 0;
	padding: 16px 0;
	font-family: 'Press Start 2P', monospace;
	color: rgba(255, 255, 255, 0.9);
	background: rgba(20, 20, 20, 0.98);
	border-top: 3px solid;
	width: 100vw;
	z-index: 1000;
	box-shadow: 0 -4px 15px rgba(0, 0, 0, 0.6);
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