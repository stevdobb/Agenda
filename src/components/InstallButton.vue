<template>
  <button
    v-if="showInstallButton"
    @click="installPWA"
    class="install-button"
  >
    Installeer App
  </button>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';

const showInstallButton = ref(false);
let deferredPrompt: any = null;

const beforeInstallPromptHandler = (e: Event) => {
  // Voorkom dat de mini-infobar verschijnt op Chrome
  e.preventDefault();
  // Bewaar de gebeurtenis zodat deze later kan worden geactiveerd.
  deferredPrompt = e;
  // Toon de installatieknop
  showInstallButton.value = true;
};

const installPWA = async () => {
  if (!deferredPrompt) {
    return;
  }
  // Toon de installatieprompt
  deferredPrompt.prompt();
  // Wacht tot de gebruiker reageert op de prompt
  const { outcome } = await deferredPrompt.userChoice;
  console.log(`User response to the install prompt: ${outcome}`);
  // We kunnen de prompt maar één keer gebruiken, dus wis hem.
  deferredPrompt = null;
  // Verberg de knop
  showInstallButton.value = false;
};

onMounted(() => {
  window.addEventListener('beforeinstallprompt', beforeInstallPromptHandler);
});

onBeforeUnmount(() => {
  window.removeEventListener('beforeinstallprompt', beforeInstallPromptHandler);
});
</script>

<style scoped>
.install-button {
  position: fixed;
  bottom: 1rem;
  right: 1rem;
  padding: 0.75rem 1.25rem;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  font-weight: bold;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  z-index: 1000;
}

.install-button:hover {
  background-color: #0056b3;
}
</style>
