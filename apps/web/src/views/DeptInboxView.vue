<template>
  <main style="padding:2rem; max-width:1100px; margin:auto;">
    <h1>Bandeja — Mi Departamento</h1>

    <p v-if="error" style="color:crimson">{{ error }}</p>

    <table v-if="tickets.length" border="1" cellpadding="8" cellspacing="0" style="width:100%; border-collapse:collapse; margin-top:.5rem;">
      <thead>
        <tr>
          <th>Token</th><th>Asunto</th><th>Tipo</th><th>Estudiante</th><th>Estado</th><th>Creado</th><th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="t in tickets" :key="t.id">
          <td>{{ t.token }}</td>
          <td>{{ t.asunto }}</td>
          <td>{{ t.tipo?.nombre }}</td>
          <td>{{ t.estudiante?.nombre }} {{ t.estudiante?.apellido }}</td>
          <td>{{ t.estado }}</td>
          <td>{{ new Date(t.createdAt).toLocaleString() }}</td>
          <td><router-link :to="`/tickets/${t.id}`">Abrir</router-link></td>
        </tr>
      </tbody>
    </table>

    <p v-else style="margin-top:1rem;">No hay tickets asignados a tu departamento.</p>
  </main>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { manageApi } from '../api'

const tickets = ref([])
const error = ref('')

async function load() {
  try {
    const { tickets: list } = await manageApi.deptTickets()
    tickets.value = list
  } catch (e) {
    error.value = String(e?.message || e)
  }
}

onMounted(load)
</script>
