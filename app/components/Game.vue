<script lang="ts" setup>
import { storeToRefs } from 'pinia';
import { useBoard } from '~/composables/useBoard';
import { useGame } from '~/composables/useGame';
import { useGameStore } from '~/stores/useGameStore';
import { useRoomStore } from '~/stores/useRoomStore';
import { useUserStore } from '~/stores/useUserStore';


const roomStore = useRoomStore()
const userStore = useUserStore()
const gameStore = useGameStore()


const { COLS, ROWS } = gameStore
const game = useGame()
const { start, cellStyle } = game

const board = useBoard()
const { flatCells } = board

</script>
<template>
	<div v-if="!gameStore.isPlaying" class="start-screen">
		<template v-if="roomStore.leaderName != userStore.username">
			<span style="color:#e5e7eb; font-size:20px;">En attente du chef…</span>
		</template>
		<template v-else>
			<button @click="start" class="start-btn">Start Game</button>
		</template>
	</div>
	<div v-else class="game-area">
		<div class="board-container">
			<div v-if="gameStore.won" class="game-over-overlay win-overlay">
				<span>WIN</span>
			</div>
			<div v-else-if="!gameStore.isAlive" class="game-over-overlay">
				<span>GAME OVER</span>
			</div>
			<div class="board" :style="{ '--cols': String(COLS), '--rows': String(ROWS) }">
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
}

.start-btn {
	padding: 16px 32px;
	font-size: 24px;
	font-weight: bold;
	background: #8A2BE2;
	color: white;
	border: none;
	border-radius: 8px;
	cursor: pointer;
	transition: background 0.2s;
}

.start-btn:hover {
	background: #7B1FA2;
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
	background: rgba(0, 0, 0, 0.2);
	color: white;
	font-size: 3em;
	font-weight: bold;
	z-index: 10;
	border-radius: 8px;
}

.win-overlay {
	background: rgba(255, 215, 0, 0.3);
	color: #FFD700;
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
	box-shadow: 0 6px 20px rgba(0,0,0,0.25);
}

.cell {
	aspect-ratio: 1 / 1;
	background: #0b1220;
	border: 1px solid #111827;
	border-radius: 4px;
}
</style>