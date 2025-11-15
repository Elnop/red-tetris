<script lang="ts" setup>
import { storeToRefs } from 'pinia'
import { useGameStore } from '~/stores/useGameStore'
import { useThemeStore } from '~/stores/useThemeStore'
import { ITEMS_CONFIG } from '~/utils/itemsConfig'

const gameStore = useGameStore()
const themeStore = useThemeStore()

const { inventory, activeEffects } = storeToRefs(gameStore)

// Check if an effect is active
function isEffectActive(effectType: string): boolean {
	return activeEffects.value.some(
		(e) => e.type === effectType && e.active
	)
}

// Get remaining time for active effect
function getRemainingTime(effectType: string): number {
	const effect = activeEffects.value.find(
		(e) => e.type === effectType && e.active
	)
	if (!effect) return 0
	const elapsed = Date.now() - effect.startTime
	const remaining = Math.max(0, effect.duration - elapsed)
	return Math.ceil(remaining / 1000) // Convert to seconds
}
</script>

<template>
	<div class="item-inventory">
		<div class="inventory-title">Items (1-5)</div>
		<div class="inventory-slots">
			<div
				v-for="(item, index) in inventory"
				:key="item.id"
				class="item-slot"
				:style="{
					borderColor: themeStore.colors.primary,
					boxShadow: `0 0 10px ${themeStore.colors.primary}40`
				}"
			>
				<div class="item-number">{{ index + 1 }}</div>
				<div class="item-icon">{{ item.icon }}</div>
				<div class="item-name">{{ ITEMS_CONFIG[item.type].name }}</div>
			</div>
			<div
				v-for="index in Math.max(0, 5 - inventory.length)"
				:key="`empty-${index}`"
				class="item-slot empty"
			>
				<div class="item-number">{{ inventory.length + index }}</div>
				<div class="empty-slot">—</div>
			</div>
		</div>

		<!-- Active effects display -->
		<div v-if="activeEffects.length > 0" class="active-effects">
			<div class="effects-title">Active Effects</div>
			<div class="effects-list">
				<div
					v-for="effect in activeEffects.filter((e) => e.active)"
					:key="effect.type"
					class="effect-item"
					:style="{
						borderColor: themeStore.colors.primary,
						background: `${themeStore.colors.primary}20`
					}"
				>
					<span class="effect-icon">{{ ITEMS_CONFIG[effect.type].icon }}</span>
					<span class="effect-name">{{ ITEMS_CONFIG[effect.type].name }}</span>
					<span class="effect-time">{{ getRemainingTime(effect.type) }}s</span>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
.item-inventory {
	display: flex;
	flex-direction: column;
	gap: 16px;
	padding: 16px;
	background: #1f2937;
	border-radius: 8px;
	min-width: 300px;
}

.inventory-title {
	font-size: 18px;
	font-weight: bold;
	color: #e5e7eb;
	text-align: center;
}

.inventory-slots {
	display: flex;
	gap: 8px;
	justify-content: center;
	flex-wrap: wrap;
}

.item-slot {
	position: relative;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	width: 50px;
	height: 60px;
	background: #0b1220;
	border: 2px solid #374151;
	border-radius: 6px;
	cursor: pointer;
	transition: all 0.2s;
}

.item-slot:not(.empty):hover {
	transform: translateY(-2px);
	filter: brightness(1.2);
}

.item-slot.empty {
	opacity: 0.3;
	cursor: default;
}

.item-number {
	position: absolute;
	top: 2px;
	left: 4px;
	font-size: 10px;
	font-weight: bold;
	color: #9ca3af;
}

.item-icon {
	font-size: 24px;
	margin-bottom: 2px;
}

.item-name {
	font-size: 8px;
	color: #9ca3af;
	text-align: center;
	max-width: 100%;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.empty-slot {
	font-size: 20px;
	color: #4b5563;
}

.active-effects {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.effects-title {
	font-size: 14px;
	font-weight: bold;
	color: #e5e7eb;
	text-align: center;
}

.effects-list {
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.effect-item {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 6px 10px;
	background: rgba(59, 130, 246, 0.2);
	border: 1px solid #3b82f6;
	border-radius: 4px;
}

.effect-icon {
	font-size: 16px;
}

.effect-name {
	flex: 1;
	font-size: 12px;
	color: #e5e7eb;
}

.effect-time {
	font-size: 12px;
	font-weight: bold;
	color: #60a5fa;
}
</style>
