<template>
  <section style="max-width:1100px; margin:2rem auto;">
    <h1>Bandeja del Departamento</h1>

    <!-- Filtro por cédula o token -->
    <form
      @submit.prevent="applyFilters"
      style="display:flex; gap:.5rem; flex-wrap:wrap; align-items:end; margin:1rem 0;"
    >
      <div style="display:grid;">
        <label style="font-size:.85rem; color:#555;">Buscar (cédula o token)</label>
        <input v-model.trim="q" placeholder="Ej: 8-888-888 o SIU-2025-000123" />
      </div>
      <button :disabled="loading">{{ loading ? 'Filtrando…' : 'Aplicar' }}</button>
      <button type="button" @click="clearFilters" :disabled="loading">Limpiar</button>
    </form>

    <p v-if="error" style="color:crimson; margin:.5rem 0;">{{ error }}</p>

    <div v-if="loading" style="margin-top:1rem;">Cargando…</div>

    <table
      v-else
      style="width:100%; border-collapse:collapse; margin-top:1rem;"
    >
      <thead>
        <tr>
          <th style="text-align:left; border-bottom:1px solid #ddd; padding:.5rem;">Token</th>
          <th style="text-align:left; border-bottom:1px solid #ddd; padding:.5rem;">Asunto</th>
          <th style="text-align:left; border-bottom:1px solid #ddd; padding:.5rem;">Estudiante</th>
          <th style="text-align:left; border-bottom:1px solid #ddd; padding:.5rem;">Cédula</th>
          <th style="text-align:left; border-bottom:1px solid #ddd; padding:.5rem;">Facultad</th>
          <th style="text-align:left; border-bottom:1px solid #ddd; padding:.5rem;">Tipo</th>
          <th style="text-align:left; border-bottom:1px solid #ddd; padding:.5rem;">Estado</th>
          <th style="text-align:left; border-bottom:1px solid #ddd; padding:.5rem;">Fecha</th>
          <th style="text-align:left; border-bottom:1px solid #ddd; padding:.5rem;">Acciones</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="t in tickets" :key="t.id">
          <td style="padding:.5rem; border-bottom:1px solid #eee;">{{ t.token }}</td>
          <td style="padding:.5rem; border-bottom:1px solid #eee;">{{ t.asunto }}</td>
          <td style="padding:.5rem; border-bottom:1px solid #eee;">
            {{ t.estudiante?.nombre }} {{ t.estudiante?.apellido }}
          </td>
          <td style="padding:.5rem; border-bottom:1px solid #eee;">{{ t.estudiante?.cedula }}</td>
          <td style="padding:.5rem; border-bottom:1px solid #eee;">
            {{ t.estudiante?.facultad || '-' }}
          </td>
          <td style="padding:.5rem; border-bottom:1px solid #eee;">{{ t.tipo?.nombre }}</td>
          <td style="padding:.5rem; border-bottom:1px solid #eee;">
            <span class="status-badge" :class="statusClass(t.estado)">
              {{ t.estado }}
            </span>
          </td>
          <td style="padding:.5rem; border-bottom:1px solid #eee;">
            {{ new Date(t.createdAt).toLocaleString() }}
          </td>
          <td style="padding:.5rem; border-bottom:1px solid #eee;">
            <RouterLink :to="`/tickets/${t.id}`">
              <button>Ver</button>
            </RouterLink>
          </td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { manageApi } from '../api'

const tickets = ref([])
const loading = ref(false)
const error = ref('')

const q = ref('')

function statusClass(value) {
  switch (value) {
    case 'abierto':
      return 'status-open'
    case 'en_progreso':
      return 'status-progress'
    case 'completado':
      return 'status-completed'
    case 'cerrado':
      return 'status-closed'
    default:
      return 'status-default'
  }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const { tickets: rows } = await manageApi.deptTickets({ q: q.value })
    tickets.value = rows || []
  } catch (e) {
    error.value = String(e?.message || e)
    tickets.value = []
  } finally {
    loading.value = false
  }
}

function applyFilters() {
  load()
}
function clearFilters() {
  q.value = ''
  load()
}

onMounted(load)
</script>

<style scoped>
.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 500;
}

.status-open {
  background: #e0f2fe;
  color: #075985;
}

.status-progress {
  background: #fef3c7;
  color: #92400e;
}

.status-completed {
  background: #dcfce7;
  color: #166534;
}

.status-closed {
  background: #fee2e2;
  color: #991b1b;
}

.status-default {
  background: #e5e7eb;
  color: #374151;
}
</style>
