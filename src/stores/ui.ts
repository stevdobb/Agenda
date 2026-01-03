import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUiStore = defineStore('ui', () => {
  const isAlertVisible = ref(false)
  const alertTitle = ref('')
  const alertDescription = ref('')

  function showAlert(title: string, description: string) {
    alertTitle.value = title
    alertDescription.value = description
    isAlertVisible.value = true
  }

  function hideAlert() {
    isAlertVisible.value = false
  }

  return {
    isAlertVisible,
    alertTitle,
    alertDescription,
    showAlert,
    hideAlert
  }
})
