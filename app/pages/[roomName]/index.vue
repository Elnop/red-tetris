<script setup>
import { useUserStore } from '~/stores/useUserStore'

// Importer le composant [userName].vue
import UserNameComponent from './[userName].vue'

const route = useRoute()
const userStore = useUserStore()

// Si aucun nom d'utilisateur n'est défini, rediriger vers la page d'accueil
if (!userStore.username) {
  navigateTo('/')
}

// Exposer les données nécessaires au template
const roomName = route.params.roomName
const userName = route.params.userName || userStore.username

</script>

<template>
  <div>
    <!-- Utilisation du composant [userName].vue avec les props nécessaires -->
    <UserNameComponent :roomName="roomName" :userName="userName" />
  </div>
</template>
