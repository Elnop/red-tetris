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
	box-shadow: 0 6px 20px rgba(0,0,0,0.25);
}

.cell {
	aspect-ratio: 1 / 1;
	background: #0b1220;
	border: 1px solid #111827;
	border-radius: 4px;
}
</style>