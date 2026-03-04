<template>
  <main class="grid-gap" style="margin: 2rem auto;">
    <!-- Encabezado -->
    <header class="grid-gap" style="text-align:center;">
      <h1 style="margin:0;">Bandeja de Recepción</h1>
      <p class="text-muted" style="margin:0;">
        Filtra los tickets por cédula, token, estado y rango de fechas.
      </p>
    </header>

    <!-- Filtros -->
    <section class="card grid-gap">
      <form
        @submit.prevent="applyFilters"
        class="filters-form"
      >
        <div class="filter-group filter-group--wide">
          <label class="filter-label">Buscar (cédula o token)</label>
          <input
            v-model.trim="q"
            placeholder="Ej: 8-888-888 o SIU-2025-000123"
          />
        </div>

        <div class="filter-group">
          <label class="filter-label">Estado</label>
          <select v-model="estado">
            <option value="">(Todos)</option>
            <option value="abierto">abierto</option>
            <option value="en_progreso">en_progreso</option>
            <option value="completado">completado</option>
            <option value="cerrado">cerrado</option>
          </select>
        </div>

        <div class="filter-group">
          <label class="filter-label">Desde</label>
          <input v-model="date_from" type="date" />
        </div>

        <div class="filter-group">
          <label class="filter-label">Hasta</label>
          <input v-model="date_to" type="date" />
        </div>

        <div class="filter-actions">
          <button :disabled="loading">
            {{ loading ? 'Filtrando…' : 'Aplicar' }}
          </button>
          <button
            type="button"
            class="btn-secondary"
            @click="clearFilters"
            :disabled="loading"
          >
            Limpiar
          </button>
          <button
            type="button"
            class="btn-secondary"
            @click="exportCsv"
            :disabled="loading"
          >
            Exportar CSV
          </button>
        </div>
      </form>

      <p v-if="error" class="text-danger" style="margin:0;">
        {{ error }}
      </p>
    </section>

    <!-- Tabla -->
    <section class="card">
      <div v-if="loading" class="text-muted">
        Cargando…
      </div>

      <div v-else-if="!tickets.length" class="text-muted">
        No hay tickets que coincidan con los filtros actuales.
      </div>

      <div v-else style="overflow:auto; display:flex; justify-content:center;">
        <table class="inbox-table">
          <thead>
            <tr>
              <th>Token</th>
              <th>Asunto</th>
              <th>Estudiante</th>
              <th>Cédula</th>
              <th>Sede/CRU</th>
              <th>Tipo</th>
              <th>Depto</th>
              <th>Estado</th>
              <th>Fecha</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in tickets" :key="t.id">
              <td class="cell-token">
                {{ t.token }}
              </td>
              <td class="cell-asunto" :title="t.asunto">
                {{ t.asunto }}
              </td>
              <td>
                {{ t.estudiante?.nombre }} {{ t.estudiante?.apellido }}
              </td>
              <td>
                {{ t.estudiante?.cedula }}
              </td>
              <td class="cell-facultad" :title="t.estudiante?.cru || '-'">
                {{ t.estudiante?.cru || '-' }}
              </td>
              <td class="cell-tipo" :title="t.tipo?.nombre || '-'">
                {{ t.tipo?.nombre || '-' }}
              </td>
              <td class="cell-depto" :title="t.departamentoActual?.nombre || '-'">
                {{ t.departamentoActual?.nombre || '-' }}
              </td>
              <td>
                <span class="status-badge" :class="statusClass(t.estado)">
                  {{ t.estado }}
                </span>
              </td>
              <td class="cell-fecha">
                {{ formatDateTime(t.createdAt) }}
              </td>
              <td class="cell-actions">
                <RouterLink :to="`/tickets/${t.id}`">
                  <button>Ver</button>
                </RouterLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </main>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { manageApi } from '../api'

const tickets = ref([])
const loading = ref(false)
const error = ref('')

const q = ref('')
const estado = ref('')
const date_from = ref('')
const date_to = ref('')

function statusClass (value) {
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

function formatDateTime (value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString()
}

async function load () {
  loading.value = true
  error.value = ''
  try {
    const { tickets: rows } = await manageApi.adminTickets({
      q: q.value,
      estado: estado.value,
      date_from: date_from.value,
      date_to: date_to.value
    })
    tickets.value = rows || []
  } catch (e) {
    error.value = String(e?.message || e)
    tickets.value = []
  } finally {
    loading.value = false
  }
}

function applyFilters () {
  load()
}

function clearFilters () {
  q.value = ''
  estado.value = ''
  date_from.value = ''
  date_to.value = ''
  load()
}

function exportCsv () {
  manageApi.exportTickets({
    q: q.value,
    estado: estado.value,
    date_from: date_from.value,
    date_to: date_to.value
  })
}

onMounted(load)
</script>

<style scoped>
.filters-form {
  display: grid;
  grid-template-columns: minmax(220px, 1.8fr) repeat(3, minmax(140px, 0.9fr)) auto;
  gap: 0.75rem;
  align-items: end;
}

@media (max-width: 960px) {
  .filters-form {
    grid-template-columns: 1fr 1fr;
  }
  .filter-actions {
    grid-column: 1 / -1;
    justify-content: flex-start;
  }
}

@media (max-width: 640px) {
  .filters-form {
    grid-template-columns: 1fr;
  }
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.filter-group--wide {
  min-width: 260px;
}

.filter-label {
  font-size: 0.8rem;
  opacity: 0.8;
}

.filter-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}

/* Tabla */

.inbox-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
  table-layout: fixed; /* reparte el ancho entre columnas */
  margin: 0 auto;      /* centra la tabla dentro de la card */
}

.inbox-table thead tr {
  border-bottom: 1px solid var(--border, #1f2933);
}

.inbox-table th,
.inbox-table td {
  padding: 0.55rem 0.75rem;
  text-align: left;
}

/* Anchuras aproximadas por columna */

.inbox-table th:nth-child(1),
.inbox-table td:nth-child(1) {
  width: 110px; /* Token */
}

.inbox-table th:nth-child(2),
.inbox-table td:nth-child(2) {
  width: 220px; /* Asunto */
}

.inbox-table th:nth-child(3),
.inbox-table td:nth-child(3) {
  width: 150px; /* Estudiante */
}

.inbox-table th:nth-child(4),
.inbox-table td:nth-child(4) {
  width: 110px; /* Cédula */
}

.inbox-table th:nth-child(5),
.inbox-table td:nth-child(5) {
  width: 190px; /* Sede/CRU */
}

.inbox-table th:nth-child(6),
.inbox-table td:nth-child(6) {
  width: 130px; /* Tipo */
}

.inbox-table th:nth-child(7),
.inbox-table td:nth-child(7) {
  width: 130px; /* Depto */
}

.inbox-table th:nth-child(8),
.inbox-table td:nth-child(8) {
  width: 110px; /* Estado */
}

.inbox-table th:nth-child(9),
.inbox-table td:nth-child(9) {
  width: 170px; /* Fecha */
}

.inbox-table th:nth-child(10),
.inbox-table td:nth-child(10) {
  width: 80px; /* Acciones */
  text-align: center;
}

.inbox-table th {
  font-weight: 600;
  font-size: 0.82rem;
  opacity: 0.9;
}

.inbox-table tbody tr {
  border-bottom: 1px solid var(--border, #1f2933);
  transition: background-color 0.12s ease;
}

.inbox-table tbody tr:hover {
  background-color: rgba(255, 255, 255, 0.03);
}

.cell-token {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 0.8rem;
}

/* Texto largo en columnas amplias */

.cell-asunto,
.cell-facultad,
.cell-tipo,
.cell-depto {
  white-space: normal;
  word-break: break-word;
  overflow-wrap: anywhere;
}

/* Fecha y acciones */

.cell-fecha {
  min-width: 150px;
}

.cell-actions {
  min-width: 80px;
}

/* Badges de estado */

.status-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 500;
  white-space: nowrap; /* evita que se rompa en dos líneas */
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