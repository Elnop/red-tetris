<script setup>
import { useUserStore } from '~/stores/useUserStore'

import UserNameComponent from './[userName].vue'

const route = useRoute()
const userStore = useUserStore()

if (!userStore.username) {
	navigateTo('/')
}
const roomName = route.params.roomName
const userName = route.params.userName || userStore.username

</script>

<template>
	<div class="room-container">
		<UserNameComponent :roomName="roomName" :userName="userName" />
	</div>
</template>
