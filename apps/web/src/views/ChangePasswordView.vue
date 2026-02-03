<template>
  <main style="padding: 2rem; max-width: 480px; margin: auto;">
    <h1>Cambiar Contraseña</h1>
    
    <div style="padding: 1rem; background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; margin: 1rem 0;">
      <strong>⚠️ Cambio de contraseña obligatorio</strong>
      <p style="margin: 0.5rem 0 0 0; font-size: 0.9rem;">
        Tu cuenta fue creada con una contraseña temporal. Por seguridad, debes cambiarla ahora.
      </p>
    </div>

    <form @submit.prevent="changePassword" style="display: grid; gap: 1rem; margin-top: 1.5rem;">
      <div>
        <label>Contraseña actual:</label>
        <input 
          v-model="currentPassword" 
          type="password" 
          required 
          placeholder="Temporal#2025"
        />
      </div>

      <div>
        <label>Nueva contraseña:</label>
        <input 
          v-model="newPassword" 
          type="password" 
          required 
          placeholder="Mínimo 10 caracteres"
        />
        <small style="color: #6c757d; display: block; margin-top: 0.25rem;">
          Debe tener al menos 10 caracteres, 1 mayúscula, 1 minúscula y 1 número
        </small>
      </div>

      <div>
        <label>Confirmar nueva contraseña:</label>
        <input 
          v-model="confirmPassword" 
          type="password" 
          required 
          placeholder="Repite la contraseña"
        />
      </div>

      <p v-if="error" style="color: crimson;">{{ error }}</p>
      <p v-if="success" style="color: green;">{{ success }}</p>

      <button type="submit" :disabled="loading">
        {{ loading ? 'Cambiando...' : 'Cambiar Contraseña' }}
      </button>
    </form>
  </main>
</template>

<script setup>
import { ref } from 'vue'
import { authApi } from '../api'
import { loadSession } from '../store/session'
import { useRouter } from 'vue-router'

const router = useRouter()
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const error = ref('')
const success = ref('')

async function changePassword() {
  loading.value = true
  error.value = ''
  success.value = ''

  // Validaciones
  if (newPassword.value !== confirmPassword.value) {
    error.value = 'Las contraseñas no coinciden'
    loading.value = false
    return
  }

  if (newPassword.value.length < 10) {
    error.value = 'La contraseña debe tener al menos 10 caracteres'
    loading.value = false
    return
  }

  try {
    await authApi.changePassword({
      currentPassword: currentPassword.value,
      newPassword: newPassword.value
    })

    success.value = 'Contraseña actualizada exitosamente. Redirigiendo...'
    
    // Recargar sesión y redirigir
    await loadSession()
    setTimeout(() => {
      router.push('/')
    }, 2000)
  } catch (e) {
    error.value = String(e?.message || e)
  } finally {
    loading.value = false
  }
}
</script>