<template>
  <main style="padding:2rem; max-width:520px; margin:auto;">
    <h1>Crear cuenta (Estudiante)</h1>
    <form @submit.prevent="submit" style="display:grid; gap:.75rem; margin-top:1rem;">
      <input v-model.trim="nombre" placeholder="Nombre" required />
      <input v-model.trim="apellido" placeholder="Apellido" required />
      <input v-model.trim="cedula" placeholder="Cédula" required />
      <input v-model.trim="email" placeholder="Email" type="email" required />
      <input v-model="password" placeholder="Contraseña (min 10, mayúsc, minúsc, número)" type="password" required />
      <button :disabled="loading">{{ loading ? 'Creando…' : 'Crear cuenta' }}</button>
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
const nombre = ref('')
const apellido = ref('')
const cedula = ref('')
const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

async function submit() {
  loading.value = true
  error.value = ''
  try {
    await authApi.register({ nombre: nombre.value, apellido: apellido.value, cedula: cedula.value, email: email.value, password: password.value })
    await loadSession()
    router.push('/')
  } catch (e) {
    error.value = String(e?.message || e)
  } finally {
    loading.value = false
  }
}
</script>
