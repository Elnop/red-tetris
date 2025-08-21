<script setup lang="ts">
import { useRouter } from '#app';
import Button from '~/components/RTButton.vue';
import { useUser } from '~/store/useUser';

const userStore = useUser()

const router = useRouter()

function joinHandler() {
	router.push(`/room/${userStore.roomName}`)
}

function createHandler() {
	router.push(`/room/${userStore.roomName || userStore.username}`)
}

</script>

<template>
	<div>
		<h1>{{ userStore.username }}</h1>
		<label for="username">Username:</label>
		<input id="username" v-model="userStore.username" />
		<label for="username">Room:</label>
		<input id="username" v-model="userStore.roomName" />
		<Button text="join" :onClick="joinHandler" />
		<Button text="Create" :onClick="createHandler" />
	</div>
</template>