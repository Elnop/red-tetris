<script lang="ts" setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia';
import { useBoard } from '~/composables/useBoard';
import { useGame } from '~/composables/useGame';
import { useGameStore } from '~/stores/useGameStore';
import { useRoomStore } from '~/stores/useRoomStore';
import { useUserStore } from '~/stores/useUserStore';
import { useThemeStore } from '~/stores/useThemeStore';

const roomStore = useRoomStore()
const userStore = useUserStore()
const gameStore = useGameStore()
const themeStore = useThemeStore()

const { COLS, ROWS } = gameStore
const { activeEffects } = storeToRefs(gameStore)
const game = useGame()
const { start, cellStyle } = game

const board = useBoard()
const { flatCells } = board

// Check if freeze effect is active
const isFrozen = computed(() => {
	return activeEffects.value.some(e => e.type === 'freeze' && e.active)
})

// Check if immunity effect is active
const isImmune = computed(() => {
	return activeEffects.value.some(e => e.type === 'immunity' && e.active)
})

// Check if confusion effect is active
const isConfused = computed(() => {
	return activeEffects.value.some(e => e.type === 'confusion' && e.active)
})

// Check if item rush effect is active
const isItemRushActive = computed(() => {
	return activeEffects.value.some(e => e.type === 'item_rush' && e.active)
})
</script>

<template>
	<div v-if="!gameStore.isPlaying" class="start-screen">
		<p>Waiting for the host…</p>
	</div>
	<div v-else class="game-area">
		<div class="board-container">
			<div v-if="gameStore.won" class="game-over-overlay win-overlay">
				<div class="game-over-content">
					<div>VICTORY!</div>
				</div>
			</div>
			<div v-else-if="!gameStore.isAlive" class="game-over-overlay">
				<div class="game-over-content">
					<div>GAME OVER</div>
					<div class="winner-name" v-if="gameStore.winner">{{ gameStore.winner }} won</div>
				</div>
			</div>
			<div v-else-if="!gameStore.active" class="game-over-overlay">
				<div class="game-over-content">
					<div>SPECTATING</div>
				</div>
			</div>
			<!-- Freeze overlay -->
			<div v-if="isFrozen" class="freeze-overlay">
				<div class="freeze-content">
					<div class="freeze-icon">❄️</div>
					<div class="freeze-text">FROZEN</div>
				</div>
			</div>
			<div class="board" :class="{ 'board-immune': isImmune, 'board-confused': isConfused }" :style="{
				'--cols': String(COLS),
				'--rows': String(ROWS),
				'border': isImmune ? '3px solid #C0C0C0' : `3px solid ${themeStore.colors.primary}`,
				'boxShadow': isImmune
					? '0 0 20px rgba(192,192,192,0.8), 0 0 40px rgba(232,232,232,0.4)'
					: `0 0 20px ${themeStore.colors.primary}40`
			}">
				<div
				v-for="(_, idx) in flatCells"
				:key="idx"
				class="cell"
				:style="cellStyle(idx)"
				/>
			</div>
		</div>
	</div>
</template>

<style scoped>
.start-screen {
	display: flex;
	justify-content: center;
	align-items: center;
	height: 90vh;
	width: 100%;
}

.start-screen p {
	color:#e5e7eb;
	font-size: 30px;
	font-weight: bold;
}

.game-area {
	display: flex;
	justify-content: center;
	align-items: center;
	height: 100%;
}

.board-container {
	position: relative;
}

.game-over-overlay {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	display: flex;
	justify-content: center;
	align-items: center;
	background: rgba(0, 0, 0, 0.3);
	color: white;
	font-size: 2em;
	font-weight: bold;
	z-index: 10;
	border-radius: 8px;
	text-align: center;
	padding: 20px;
}

.game-over-content {
	display: flex;
	flex-direction: column;
	gap: 20px;
}

.winner-name {
	font-size: 1.5rem;
	color: #FFD700;
	text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
}

.win-overlay {
	background: rgba(255, 215, 0, 0.5);
	color: #FFD700;
	text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
}

.board {
	position: relative;
	display: grid;
	grid-template-columns: repeat(var(--cols), 1fr);
	gap: 2px;
	height: 85vh;
	aspect-ratio: 1 / 2;
	background: #1f2937;
	padding: 6px;
	border-radius: 8px;
}

.cell {
	aspect-ratio: 1 / 1;
	background: #0b1220;
	border: 1px solid #111827;
	border-radius: 4px;
}

@keyframes bomb-flash {
	0% {
		transform: scale(1);
		opacity: 0.7;
	}
	50% {
		transform: scale(1.2);
		opacity: 1;
	}
	100% {
		transform: scale(1);
		opacity: 0.7;
	}
}

/* Freeze overlay */
.freeze-overlay {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	display: flex;
	justify-content: center;
	align-items: center;
	background: radial-gradient(circle, rgba(100, 200, 255, 0.4) 0%, rgba(30, 100, 200, 0.6) 100%);
	backdrop-filter: blur(3px);
	z-index: 15;
	border-radius: 8px;
	animation: freeze-fade 1s ease-in-out infinite alternate;
}

.freeze-content {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 10px;
	animation: freeze-pulse 1.5s ease-in-out infinite;
}

.freeze-icon {
	font-size: 4rem;
	filter: drop-shadow(0 0 20px rgba(100, 200, 255, 0.8));
	animation: freeze-rotate 3s linear infinite;
}

.freeze-text {
	font-family: 'Press Start 2P', monospace;
	font-size: 2rem;
	color: #E0F7FF;
	text-shadow:
		0 0 10px rgba(100, 200, 255, 1),
		0 0 20px rgba(100, 200, 255, 0.8),
		0 0 30px rgba(100, 200, 255, 0.6);
	letter-spacing: 4px;
}

@keyframes freeze-fade {
	0% {
		opacity: 0.6;
	}
	100% {
		opacity: 0.9;
	}
}

@keyframes freeze-pulse {
	0%, 100% {
		transform: scale(1);
	}
	50% {
		transform: scale(1.05);
	}
}

@keyframes freeze-rotate {
	0% {
		transform: rotate(0deg);
	}
	100% {
		transform: rotate(360deg);
	}
}

/* Immunity shield - only pulse animation */
.board-immune {
	animation: shield-pulse-silver 1.5s ease-in-out infinite;
}

@keyframes shield-pulse-silver {
	0%, 100% {
		box-shadow:
			0 0 20px rgba(192, 192, 192, 0.8),
			0 0 40px rgba(232, 232, 232, 0.4),
			inset 0 0 20px rgba(192, 192, 192, 0.1);
	}
	50% {
		box-shadow:
			0 0 30px rgba(192, 192, 192, 1),
			0 0 60px rgba(232, 232, 232, 0.6),
			inset 0 0 30px rgba(192, 192, 192, 0.2);
	}
}

/* Confusion - only shake animation on board */
.board-confused {
	animation: confusion-shake 0.3s ease-in-out infinite;
}

@keyframes confusion-shake {
	0%, 100% {
		transform: translateX(0);
	}
	25% {
		transform: translateX(-2px);
	}
	75% {
		transform: translateX(2px);
	}
}

</style>