<script setup lang="ts">
import { useRouter } from '#app';
import { useUser } from '~/store/useUser';

const userStore = useUser()

const router = useRouter()

function joinHandler() {
	router.push(`/room/${userStore.roomName}`)
}

// function createHandler() {
//    router.push(`/room/${userStore.roomName || userStore.username}`)
// }

</script>

<template>
	<div class="page-container">
		<div class="project-title">Red Tetris</div>
		<div class="info-block">
			<div class="big-label">Username</div>
			<div class="big-value">{{ userStore.username }}</div>
			<div class="big-label">Room</div>
			<div class="big-value">{{ userStore.roomName }}</div>
		</div>
		<div class="input-block">
			<label for="username">Username:</label>
			<input id="username" v-model="userStore.username" />
			<label for="room">Room:</label>
			<input id="room" v-model="userStore.roomName" />
		</div>
		<div class="button-block">
			<RTButton text="join" :onClick="joinHandler" class="rtb-btn" />
			<!-- <Button text="Create" :onClick="createHandler" class="rtb-btn" /> -->
		</div>
	</div>
</template>

<style>
* {
	padding: 0;
	margin: 0;
	color: inherit;
	box-sizing: border-box;
}

.page-container {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	height: 100vh;
	background: linear-gradient(135deg, #1a1a1a 0%, #b71c1c 100%);
}

.project-title {
	font-family: 'Press Start 2P', monospace;
	font-size: 2.8rem;
	color: #fff;
	text-shadow: 0 2px 0 #b71c1c, 0 4px 8px #000;
	margin-bottom: 2.5rem;
	letter-spacing: 2px;
	text-align: center;
}

.info-block {
	text-align: center;
	margin-bottom: 2rem;
}
.big-label {
	font-family: 'Press Start 2P', monospace;
	font-size: 1.3rem;
	font-weight: bold;
	color: #e53935;
	margin-bottom: 0.3rem;
	letter-spacing: 1px;
}
.big-value {
	font-family: 'Press Start 2P', monospace;
	font-size: 1.5rem;
	color: #fff;
	background: #222;
	border-radius: 8px;
	padding: 0.5rem 1.2rem;
	margin-bottom: 1.2rem;
	box-shadow: 0 2px 8px #b71c1c44;
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
	border: 2px solid #e53935;
	border-radius: 6px;
	margin-bottom: 0.7rem;
	width: 220px;
	font-size: 1rem;
	background: #fff;
	color: #b71c1c;
	font-family: 'Press Start 2P', monospace;
	transition: border 0.2s;
}
.input-block input:focus {
	border-color: #b71c1c;
	outline: none;
}
.button-block {
	display: flex;
	gap: 1rem;
	justify-content: center;
}
.rtb-btn {
	padding: 0.7rem 1.5rem;
	background: linear-gradient(90deg, #e53935 0%, #b71c1c 100%);
	color: #fff;
	border: 2px solid #fff;
	border-radius: 8px;
	font-size: 1.1rem;
	font-family: 'Press Start 2P', monospace;
	cursor: pointer;
	box-shadow: 0 2px 8px #b71c1c44;
	transition: background 0.2s, transform 0.1s;
}
.rtb-btn:hover {
	background: linear-gradient(90deg, #b71c1c 0%, #e53935 100%);
	transform: scale(1.05);
}
</style>