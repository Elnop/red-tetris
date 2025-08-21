<script setup>
const props = defineProps({
	text: {
		type: String,
		required: true
	},
	onClick: {
		type: Function,
		required: true
	}
})
</script>

<template>
	<button class="my-button" @click="props.onClick">
		{{ props.text }}
	</button>
</template>

<style scoped>
.my-button {
	padding: 0.5rem 1rem;
	background-color: #007BFF;
	color: white;
	border: none;
	border-radius: 4px;
	cursor: pointer;
}

.my-button:hover {
	background-color: #0056b3;
}
</style>