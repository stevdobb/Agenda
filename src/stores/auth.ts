import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref<string | null>(null)
  const user = ref<any>(null)
  const isLoggedIn = ref(false)

  function setToken(token: string) {
    accessToken.value = token
    isLoggedIn.value = true
    // For persistence, you might save the token to localStorage
    localStorage.setItem('google_access_token', token)
  }

  function setUser(userData: any) {
    user.value = userData
    localStorage.setItem('google_user', JSON.stringify(userData))
  }

  function clearAuth() {
    accessToken.value = null
    user.value = null
    isLoggedIn.value = false
    localStorage.removeItem('google_access_token')
    localStorage.removeItem('google_user')
  }

  function checkAuth() {
    const token = localStorage.getItem('google_access_token')
    const userData = localStorage.getItem('google_user')
    if (token && userData) {
      accessToken.value = token
      user.value = JSON.parse(userData)
      isLoggedIn.value = true
    }
  }

  return {
    accessToken,
    user,
    isLoggedIn,
    setToken,
    setUser,
    clearAuth,
    checkAuth,
  }
})
