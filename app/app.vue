<template>
	<div>
		<NuxtLoadingIndicator />
		<NuxtRouteAnnouncer />
		<NuxtLayout>
			<NuxtPage />
		</NuxtLayout>
	</div>
</template>

<style>
* {
	padding: 0;
	margin: 0;
	color: inherit;
	box-sizing: border-box;
}

button {
	background: none;
	border: none;
}

.page-enter-active,
.page-leave-active {
	transition: all 0.4s;
}
.page-enter-from,
.page-leave-to {
	opacity: 0;
	filter: blur(1rem)
}
</style>