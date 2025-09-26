<template>
  <main style="padding:2rem; max-width:1200px; margin:auto;">
    <h1>Bandeja — Recepción</h1>

    <form @submit.prevent="load" style="display:flex; gap:.5rem; align-items:center; margin:.75rem 0;">
      <input v-model.trim="q" placeholder="Buscar por token, asunto, estudiante..." style="flex:1;" />
      <select v-model="estado">
        <option value="">Todos los estados</option>
        <option value="abierto">abierto</option>
        <option value="en_progreso">en_progreso</option>
        <option value="completado">completado</option>
        <option value="cerrado">cerrado</option>
      </select>
      <button :disabled="loading">{{ loading ? 'Cargando…' : 'Buscar' }}</button>
      <button type="button" @click="resetFilters" :disabled="loading">Limpiar</button>
    </form>

    <p v-if="error" style="color:crimson">{{ error }}</p>

    <table v-if="tickets.length" border="1" cellpadding="8" cellspacing="0" style="width:100%; border-collapse:collapse; margin-top:.5rem;">
      <thead>
        <tr>
          <th>Token</th><th>Asunto</th><th>Tipo</th><th>Departamento</th><th>Estudiante</th><th>Estado</th><th>Creado</th><th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="t in tickets" :key="t.id">
          <td>{{ t.token }}</td>
          <td>{{ t.asunto }}</td>
          <td>{{ t.tipo?.nombre }}</td>
          <td>{{ t.departamentoActual?.nombre }}</td>
          <td>{{ t.estudiante?.nombre }} {{ t.estudiante?.apellido }}</td>
          <td>{{ t.estado }}</td>
          <td>{{ new Date(t.createdAt).toLocaleString() }}</td>
          <td><router-link :to="`/tickets/${t.id}`">Abrir</router-link></td>
        </tr>
      </tbody>
    </table>

    <p v-else style="margin-top:1rem;">Sin resultados.</p>
  </main>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { manageApi } from '../api'

const tickets = ref([])
const loading = ref(false)
const error = ref('')
const q = ref('')
const estado = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const { tickets: list } = await manageApi.adminTickets({ q: q.value, estado: estado.value })
    tickets.value = list
  } catch (e) {
    error.value = String(e?.message || e)
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  q.value = ''
  estado.value = ''
  load()
}

onMounted(load)
</script>
