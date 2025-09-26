<template>
  <main style="padding:2rem; max-width:900px; margin:auto;">
    <h1>Mis tickets</h1>
    <div v-if="error" style="color:crimson; margin:.5rem 0">{{ error }}</div>

    <table v-if="tickets.length" border="1" cellpadding="8" cellspacing="0" style="width:100%; border-collapse:collapse; margin-top:1rem;">
      <thead>
        <tr>
          <th>Token</th><th>Asunto</th><th>Tipo</th><th>Departamento</th><th>CRU</th><th>Categoría</th><th>Estado</th><th>Creado</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="t in tickets" :key="t.id">
          <td>{{ t.token }}</td>
          <td>{{ t.asunto }}</td>
          <td>{{ t.tipo?.nombre }}</td>
          <td>{{ t.departamentoActual?.nombre }}</td>
          <td>{{ t.cru || '-' }}</td>
          <td>{{ t.categoriaConsulta || '-' }}</td>
          <td>{{ t.estado }}</td>
          <td>{{ new Date(t.createdAt).toLocaleString() }}</td>
        </tr>
      </tbody>
    </table>

    <p v-else style="margin-top:1rem;">No tienes tickets aún.</p>
  </main>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ticketsApi } from '../api'

const tickets = ref([])
const error = ref('')

onMounted(load)

async function load() {
  try {
    const { tickets: list } = await ticketsApi.myTickets()
    tickets.value = list
  } catch (e) {
    error.value = String(e?.message || e)
  }
}
</script>
