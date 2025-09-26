<script setup>
import { session } from './store/session'
import { authApi } from './api'
import { useRouter } from 'vue-router'
import { loadSession } from './store/session'

const router = useRouter()
async function logout() {
  await authApi.logout()
  await loadSession()
  router.push('/login')
}
</script>

<template>
  <header style="display:flex; gap:1rem; padding:1rem; border-bottom:1px solid #ddd; align-items:center;">
    <router-link to="/">Inicio</router-link>

    <template v-if="session.user?.rol === 'estudiante'">
      <router-link to="/tickets/new">Nuevo ticket</router-link>
      <router-link to="/tickets/mine">Mis tickets</router-link>
    </template>

    <template v-if="session.user?.rol === 'recepcion' || session.user?.rol === 'admin'">
      <router-link to="/admin/inbox">Recepción</router-link>
    </template>

    <template v-if="session.user?.rol === 'departamento' || session.user?.rol === 'admin'">
      <router-link to="/dept/inbox">Mi departamento</router-link>
    </template>

    <span style="margin-left:auto;">
      <template v-if="session.user">
        {{ session.user.nombre }} ({{ session.user.rol }})
        <button @click="logout" style="margin-left:.5rem;">Salir</button>
      </template>
      <template v-else>
        <router-link to="/register">Registro</router-link>
        <router-link to="/login">Login</router-link>
      </template>
    </span>
  </header>

  <router-view />
</template>
