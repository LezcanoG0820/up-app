<template>
  <section style="max-width: 900px; margin: 2rem auto;">
    <h1>Mis tickets</h1>

    <p v-if="error" style="color:crimson; margin:.5rem 0;">{{ error }}</p>

    <div v-if="loading" style="margin-top:1rem;">Cargando…</div>

    <template v-else>
      <p v-if="tickets.length === 0" style="margin-top:1rem;">No tienes tickets aún.</p>

      <table v-else style="width:100%; border-collapse:collapse; margin-top:1rem;">
        <thead>
          <tr>
            <th style="text-align:left; border-bottom:1px solid #ddd; padding:.5rem;">Token</th>
            <th style="text-align:left; border-bottom:1px solid #ddd; padding:.5rem;">Asunto</th>
            <th style="text-align:left; border-bottom:1px solid #ddd; padding:.5rem;">Tipo</th>
            <th style="text-align:left; border-bottom:1px solid #ddd; padding:.5rem;">Departamento</th>
            <th style="text-align:left; border-bottom:1px solid #ddd; padding:.5rem;">Estado</th>
            <th style="text-align:left; border-bottom:1px solid #ddd; padding:.5rem;">Creado</th>
            <th style="text-align:left; border-bottom:1px solid #ddd; padding:.5rem;">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in tickets" :key="t.id">
            <td style="padding:.5rem; border-bottom:1px solid #eee;">{{ t.token }}</td>
            <td style="padding:.5rem; border-bottom:1px solid #eee;">{{ t.asunto }}</td>
            <td style="padding:.5rem; border-bottom:1px solid #eee;">{{ t.tipo?.nombre || '-' }}</td>
            <td style="padding:.5rem; border-bottom:1px solid #eee;">{{ t.departamentoActual?.nombre || '-' }}</td>
            <td style="padding:.5rem; border-bottom:1px solid #eee;">{{ t.estado }}</td>
            <td style="padding:.5rem; border-bottom:1px solid #eee;">
              {{ new Date(t.createdAt).toLocaleString() }}
            </td>
            <td style="padding:.5rem; border-bottom:1px solid #eee;">
              <RouterLink :to="`/tickets/${t.id}`">
                <button>Ver detalle</button>
              </RouterLink>
            </td>
          </tr>
        </tbody>
      </table>
    </template>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ticketsApi } from '../api'

const tickets = ref([])
const loading = ref(false)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const { tickets: rows } = await ticketsApi.myTickets()
    tickets.value = Array.isArray(rows) ? rows : []
  } catch (e) {
    error.value = String(e?.message || e)
    tickets.value = []
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>
