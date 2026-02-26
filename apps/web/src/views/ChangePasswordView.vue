<template>
  <main class="container" style="max-width: 500px; padding: 2rem;">
    <h1>Cambiar Contraseña</h1>
    
    <div v-if="forced" style="background: #fef3c7; border: 1px solid #f59e0b; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem;">
      <p style="margin: 0; color: #92400e;">
        <strong>⚠️ Cambio de contraseña obligatorio</strong><br>
        Debes cambiar tu contraseña temporal antes de continuar.
      </p>
    </div>

    <form @submit.prevent="submit">
      <div class="grid-gap">
        <!-- Contraseña Actual -->
        <div>
          <label for="current">Contraseña Actual</label>
          <div style="position: relative;">
            <input 
              id="current"
              :type="showCurrent ? 'text' : 'password'"
              v-model="currentPassword" 
              required
              placeholder="Tu contraseña actual"
              style="padding-right: 3rem;"
            />
            <button
              type="button"
              @click="showCurrent = !showCurrent"
              style="position: absolute; right: 0.5rem; top: 50%; transform: translateY(-50%); background: transparent; border: none; cursor: pointer; font-size: 1.2rem; padding: 0.25rem 0.5rem;"
              :aria-label="showCurrent ? 'Ocultar contraseña' : 'Mostrar contraseña'"
            >
              {{ showCurrent ? '🙈' : '👁️' }}
            </button>
          </div>
        </div>

        <!-- Nueva Contraseña -->
        <div>
          <label for="new">Nueva Contraseña</label>
          <div style="position: relative;">
            <input 
              id="new"
              :type="showNew ? 'text' : 'password'"
              v-model="newPassword" 
              required
              placeholder="Mínimo 10 caracteres"
              style="padding-right: 3rem;"
            />
            <button
              type="button"
              @click="showNew = !showNew"
              style="position: absolute; right: 0.5rem; top: 50%; transform: translateY(-50%); background: transparent; border: none; cursor: pointer; font-size: 1.2rem; padding: 0.25rem 0.5rem;"
              :aria-label="showNew ? 'Ocultar contraseña' : 'Mostrar contraseña'"
            >
              {{ showNew ? '🙈' : '👁️' }}
            </button>
          </div>
          <small style="color: var(--muted);">
            Debe tener al menos 10 caracteres, una mayúscula, una minúscula y un número
          </small>
        </div>

        <!-- Confirmar Nueva Contraseña -->
        <div>
          <label for="confirm">Confirmar Nueva Contraseña</label>
          <div style="position: relative;">
            <input 
              id="confirm"
              :type="showConfirm ? 'text' : 'password'"
              v-model="confirmPassword" 
              required
              placeholder="Repite la contraseña"
              style="padding-right: 3rem;"
            />
            <button
              type="button"
              @click="showConfirm = !showConfirm"
              style="position: absolute; right: 0.5rem; top: 50%; transform: translateY(-50%); background: transparent; border: none; cursor: pointer; font-size: 1.2rem; padding: 0.25rem 0.5rem;"
              :aria-label="showConfirm ? 'Ocultar contraseña' : 'Mostrar contraseña'"
            >
              {{ showConfirm ? '🙈' : '👁️' }}
            </button>
          </div>
        </div>

        <p v-if="error" style="color: var(--danger); margin: 0;">{{ error }}</p>
        <p v-if="success" style="color: var(--success); margin: 0;">{{ success }}</p>

        <button type="submit" :disabled="loading">
          {{ loading ? 'Cambiando...' : 'Cambiar Contraseña' }}
        </button>

        <button 
          v-if="!forced" 
          type="button" 
          @click="$router.push('/')"
          style="background: var(--muted); color: white;"
        >
          Cancelar
        </button>
      </div>
    </form>
  </main>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { authApi } from '../api'
import { loadSession } from '../store/session'

const router = useRouter()
const route = useRoute()

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const error = ref('')
const success = ref('')
const forced = ref(false)

// Estados para mostrar/ocultar contraseñas
const showCurrent = ref(false)
const showNew = ref(false)
const showConfirm = ref(false)

onMounted(() => {
  // Si viene del guard, es obligatorio
  forced.value = route.query.forced === 'true'
})

async function submit() {
  error.value = ''
  success.value = ''

  // Validar que las contraseñas coincidan
  if (newPassword.value !== confirmPassword.value) {
    error.value = 'Las contraseñas nuevas no coinciden'
    return
  }

  // Validar longitud mínima
  if (newPassword.value.length < 10) {
    error.value = 'La contraseña debe tener al menos 10 caracteres'
    return
  }

  loading.value = true

  try {
    await authApi.changePassword({
      currentPassword: currentPassword.value,
      newPassword: newPassword.value
    })

    success.value = '¡Contraseña actualizada exitosamente!'
    
    // Recargar sesión para actualizar mustChangePassword
    await loadSession()

    // Redirigir después de 1.5 segundos
    setTimeout(() => {
      router.push('/')
    }, 1500)
  } catch (e) {
    error.value = String(e?.message || e)
  } finally {
    loading.value = false
  }
}
</script>