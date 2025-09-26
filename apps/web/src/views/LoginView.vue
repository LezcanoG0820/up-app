<template>
  <main style="padding:2rem; max-width:480px; margin:auto;">
    <h1>Iniciar sesión</h1>
    <form @submit.prevent="doLogin" style="display:grid; gap:.75rem; margin-top:1rem;">
      <input v-model.trim="email" placeholder="Email" type="email" required />
      <input v-model="password" placeholder="Contraseña" type="password" required />
      <button :disabled="loading">{{ loading ? 'Entrando…' : 'Entrar' }}</button>
      <p v-if="error" style="color:crimson">{{ error }}</p>
    </form>
  </main>
</template>

<script setup>
import { ref } from 'vue'
import { authApi } from '../api'
import { loadSession } from '../store/session'
import { useRouter } from 'vue-router'

const router = useRouter()
const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

async function doLogin() {
  loading.value = true
  error.value = ''
  try {
    await authApi.login(email.value, password.value)
    await loadSession()
    router.push('/')
  } catch (e) {
    error.value = String(e?.message || e)
  } finally {
    loading.value = false
  }
}
</script>
