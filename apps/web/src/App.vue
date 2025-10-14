<template>
  <div style="padding: 1rem; max-width: 1100px; margin: auto;">
    <header
      style="display:flex; gap:1rem; align-items:center; justify-content:space-between; border-bottom:1px solid #ddd; padding-bottom:.75rem;"
    >
      <nav style="display:flex; gap:.75rem; flex-wrap:wrap; align-items:center;">
        <RouterLink to="/">Inicio</RouterLink>

        <!-- Estudiante -->
        <template v-if="user?.rol === 'estudiante'">
          <RouterLink to="/tickets/new">Nuevo ticket</RouterLink>
          <RouterLink to="/my/tickets">Mis tickets</RouterLink>
        </template>

        <!-- Recepción -->
        <template v-if="user?.rol === 'recepcion' || user?.rol === 'admin'">
          <RouterLink to="/inbox/reception">Bandeja Recepción</RouterLink>
        </template>

        <!-- Departamento -->
        <template v-if="user?.rol === 'departamento' || user?.rol === 'admin'">
          <RouterLink to="/inbox/department">Bandeja Departamento</RouterLink>
        </template>
      </nav>

      <div style="display:flex; align-items:center; gap:.5rem;">
        <!-- Selector Claro/Oscuro -->
        <button
          class="btn-secondary"
          type="button"
          :aria-label="`Cambiar a tema ${themeName === 'light' ? 'oscuro' : 'claro'}`"
          @click="toggleTheme"
          title="Cambiar tema"
        >
          <span v-if="themeName === 'light'">🌙 Oscuro</span>
          <span v-else>☀️ Claro</span>
        </button>

        <template v-if="user">
          <span style="margin-left:.25rem; margin-right:.5rem;">{{ user.nombre }} ({{ user.rol }})</span>
          <button @click="logout">Salir</button>
        </template>
        <template v-else>
          <RouterLink to="/login">Entrar</RouterLink>
          <span style="margin: 0 .5rem;">|</span>
          <RouterLink to="/register">Crear cuenta</RouterLink>
        </template>
      </div>
    </header>

    <main style="padding-top:1rem;">
      <RouterView />
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { session } from './store/session'
import { authApi } from './api'
import { useRouter } from 'vue-router'
import { themeName, toggleTheme } from './utils/theme' // ⬅️ NUEVO

const router = useRouter()
const user = computed(() => session.user)

async function logout () {
  try {
    await authApi.logout()
  } catch {}
  session.user = null
  router.push('/login')
}

// `themeName` y `toggleTheme` vienen del gestor de tema.
// No hace falta más lógica aquí.
</script>
