<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '~/stores/useGameStore'
import { useThemeStore } from '~/stores/useThemeStore'
import { toCoords, type ActivePiece } from '~/utils/pieces'

const gameStore = useGameStore()
const themeStore = useThemeStore()

const { queue, activeEffects } = storeToRefs(gameStore)

// Check if Preview effect is active
const isPreviewActive = computed(() => {
	return activeEffects.value.some(e => e.type === 'preview' && e.active)
})

// Show 1 piece normally, 5 when Preview is active
const piecesToShow = computed(() => {
	const count = isPreviewActive.value ? 5 : 1
	return queue.value.slice(0, count)
})

// Render a piece as mini grid
function renderPiece(piece: ActivePiece) {
	const coords = toCoords(piece.matrix)
	const minX = Math.min(...coords.map(([x]) => x))
	const maxX = Math.max(...coords.map(([x]) => x))
	const minY = Math.min(...coords.map(([, y]) => y))
	const maxY = Math.max(...coords.map(([, y]) => y))

	const width = maxX - minX + 1
	const height = maxY - minY + 1

	const cells = []
	for (let y = minY; y <= maxY; y++) {
		for (let x = minX; x <= maxX; x++) {
			const isActive = coords.some(([cx, cy]) => cx === x && cy === y)
			cells.push({
				x: x - minX,
				y: y - minY,
				active: isActive,
				color: piece.color
			})
		}
	}

	return { cells, width, height }
}
</script>

<template>
	<div class="next-pieces" v-if="piecesToShow.length > 0">
		<div class="next-title" :style="{ color: themeStore.colors.secondary }">
			{{ isPreviewActive ? '🔮 PREVIEW' : 'NEXT' }}
		</div>
		<div class="pieces-list">
			<div
				v-for="(piece, index) in piecesToShow"
				:key="index"
				class="piece-preview"
				:class="{ 'preview-bonus': isPreviewActive && index >= 1 }"
			>
				<div
					class="mini-grid"
					:style="{
						'--width': renderPiece(piece).width,
						'--height': renderPiece(piece).height
					}"
				>
					<div
						v-for="(cell, cellIdx) in renderPiece(piece).cells"
						:key="cellIdx"
						class="mini-cell"
						:style="{
							background: cell.active ? cell.color : 'transparent',
							borderColor: cell.active ? cell.color : 'transparent'
						}"
					/>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
.next-pieces {
	display: flex;
	flex-direction: column;
	gap: 1rem;
	padding: 1rem;
	background: rgba(0, 0, 0, 0.3);
	border: 2px solid rgba(255, 255, 255, 0.2);
	border-radius: 8px;
	min-width: 120px;
}

.next-title {
	font-family: 'Press Start 2P', monospace;
	font-size: 0.8rem;
	text-align: center;
	text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
	letter-spacing: 1px;
}

.pieces-list {
	display: flex;
	flex-direction: column;
	gap: 1rem;
	align-items: center;
}

.piece-preview {
	padding: 0.5rem;
	background: rgba(0, 0, 0, 0.2);
	border-radius: 4px;
	transition: all 0.3s;
}

.preview-bonus {
	animation: glow-preview 2s infinite;
	background: rgba(138, 43, 226, 0.1);
	border: 1px solid rgba(138, 43, 226, 0.3);
}

@keyframes glow-preview {
	0%, 100% {
		box-shadow: 0 0 5px rgba(138, 43, 226, 0.3);
	}
	50% {
		box-shadow: 0 0 15px rgba(138, 43, 226, 0.6);
	}
}

.mini-grid {
	display: grid;
	grid-template-columns: repeat(var(--width), 1fr);
	grid-template-rows: repeat(var(--height), 1fr);
	gap: 1px;
}

.mini-cell {
	width: 16px;
	height: 16px;
	border: 1px solid;
	box-sizing: border-box;
}

@media (max-width: 768px) {
	.next-pieces {
		min-width: 80px;
		padding: 0.5rem;
	}

	.next-title {
		font-size: 0.6rem;
	}

	.mini-cell {
		width: 12px;
		height: 12px;
	}
}
</style>
