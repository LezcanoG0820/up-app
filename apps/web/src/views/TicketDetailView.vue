<template>
  <main style="padding:2rem; max-width:900px; margin:auto;">
    <!-- Estados globales -->
    <div v-if="loading">Cargando…</div>
    <p v-if="error" style="color:var(--danger)">{{ error }}</p>

    <section v-if="!loading && ticket" class="grid-gap" style="display:flex; flex-direction:column; gap:1.5rem;">
      <!-- ENCABEZADO + RESUMEN -->
      <header>
        <h1 style="margin:0 0 .25rem 0;">Ticket {{ ticket.token }}</h1>
        <p style="margin:0; font-size:.9rem; color:var(--muted);">
          Creado: {{ fmt(ticket.createdAt) }}
        </p>
      </header>

      <section
        style="border:1px solid var(--border); border-radius:8px; padding:1rem; display:grid; grid-template-columns:1fr 1fr; gap:.5rem; background:var(--surface);"
      >
        <div style="grid-column:1 / -1; font-weight:600;">Resumen</div>
        <div>
          <strong>Estado:</strong>
          <span class="status-badge" :class="statusClass(ticket.estado)" style="margin-left:.25rem;">
            {{ ticket.estado }}
          </span>
        </div>
        <div><strong>Departamento actual:</strong> {{ ticket.departamentoActual?.nombre || '-' }}</div>
        <div><strong>Tipo:</strong> {{ ticket.tipo?.nombre || '-' }}</div>
        <div><strong>CRU:</strong> {{ ticket.estudiante?.cru || '-' }}</div>
        <div><strong>Categoría de consulta:</strong> {{ ticket.categoriaConsulta || ticket.categoriaQueja || '-' }}</div>
      </section>

      <!-- ESTUDIANTE -->
      <section
        style="border:1px solid var(--border); border-radius:8px; padding:1rem; display:grid; grid-template-columns:1fr 1fr; gap:.5rem; background:var(--surface);"
      >
        <div style="grid-column:1 / -1; font-weight:600;">Estudiante</div>
        <div style="grid-column:1 / -1;">
          <strong>Nombre:</strong>
          {{ ticket.estudiante?.nombre }} {{ ticket.estudiante?.apellido }}
        </div>
        <div>
          <strong>Cédula:</strong>
          {{ ticket.estudiante?.cedula || '-' }}
        </div>
        <div>
          <strong>Email:</strong>
          {{ ticket.estudiante?.email || '-' }}
        </div>
        <div style="grid-column:1 / -1;">
          <strong>Facultad:</strong>
          {{ ticket.estudiante?.facultad || '-' }}
        </div>
      </section>

      <!-- ASUNTO + DESCRIPCIÓN -->
      <section style="border:1px solid var(--border); border-radius:8px; padding:1rem; display:grid; gap:.5rem; background:var(--surface);">
        <div><strong>Asunto:</strong> {{ ticket.asunto }}</div>
        <div>
          <strong>Descripción:</strong>
          <div style="margin-top:.25rem; white-space:pre-wrap;">{{ ticket.descripcion }}</div>
        </div>
      </section>

      <!-- MENSAJES -->
      <section>
        <h2 style="margin:0 0 .5rem 0;">Mensajes</h2>
        <div v-if="ticket.messages?.length" style="display:flex; flex-direction:column; gap:.5rem;">
          <article
            v-for="m in ticket.messages"
            :key="m.id"
            class="msg-bubble"
            :class="m.autor?.rol === 'estudiante' ? 'msg-student' : 'msg-staff'"
          >
            <div class="msg-meta">
              {{ fmt(m.createdAt) }} —
              {{ m.autor?.nombre }} {{ m.autor?.apellido }}
              <span v-if="m.autor?.rol">({{ roleLabel(m.autor.rol) }})</span>
            </div>
            <div class="msg-body" v-html="m.contenidoHtml"></div>
          </article>
        </div>
        <p v-else>No hay mensajes.</p>
      </section>

      <!-- ACCIONES (solo staff, no estudiante) -->
      <section
        v-if="!isStudent"
        style="display:grid; gap:1rem; border:1px solid var(--border); border-radius:8px; padding:1rem; background:var(--surface);"
      >
        <!-- Responder -->
        <fieldset style="border:1px solid var(--border); border-radius:6px; padding:.75rem;">
          <legend style="padding:0 .25rem; color:var(--muted);"><strong>Responder</strong></legend>
          <textarea
            v-model="contenidoHtml"
            rows="4"
            placeholder="Ingresa un mensaje para responder al ticket, por ejemplo: Estamos revisando su caso"
            style="width:100%;"
          ></textarea>
          <div style="margin-top:.5rem;">
            <button @click="enviarRespuesta" :disabled="loadingReply">
              {{ loadingReply ? 'Enviando…' : 'Enviar respuesta' }}
            </button>
            <span v-if="replyMsg" style="margin-left:.5rem; color:var(--success)">{{ replyMsg }}</span>
          </div>
        </fieldset>

        <!-- Reasignar (solo recepción/admin) -->
        <fieldset
          v-if="isRecepcionOrAdmin"
          style="border:1px solid var(--border); border-radius:6px; padding:.75rem;"
        >
          <legend style="padding:0 .25rem; color:var(--muted);"><strong>Reasignar</strong></legend>
          <select v-model.number="departmentId" style="min-width:280px;">
            <option :value="0" disabled>Selecciona departamento destino</option>
            <option v-for="d in departments" :key="d.id" :value="d.id">
              {{ d.nombre }} ({{ d.slug }})
            </option>
          </select>
          <div style="margin-top:.5rem;">
            <button @click="reasignar" :disabled="loadingReassign || !departmentId">
              {{ loadingReassign ? 'Reasignando…' : 'Reasignar ticket' }}
            </button>
          </div>
        </fieldset>

        <!-- Completar -->
        <fieldset style="border:1px solid var(--border); border-radius:6px; padding:.75rem;">
          <legend style="padding:0 .25rem; color:var(--muted);"><strong>Completar</strong></legend>
          <p style="margin:0 0 .5rem 0; font-size:.9rem;">
            Marca el ticket como completado cuando la gestión haya finalizado.
          </p>
          <button @click="completar" :disabled="loadingComplete">
            {{ loadingComplete ? 'Marcando…' : 'Marcar como completado' }}
          </button>
        </fieldset>
      </section>

      <!-- HISTORIAL -->
      <section>
        <h2 style="margin:0 0 .5rem 0;">Historial</h2>
        <div v-if="ticket.auditLogs?.length">
          <div
            v-for="log in ticket.auditLogs"
            :key="log.id"
            style="font-size:.9rem; padding:.25rem 0; border-bottom:1px dashed var(--border);"
          >
            {{ fmt(log.createdAt) }} — <strong>{{ auditLabel(log.action) }}</strong>
            <span v-if="log.actor">
              &nbsp;por {{ log.actor.nombre }} {{ log.actor.apellido }}
              ({{ roleLabel(log.actor.rol) }})
            </span>
            <div v-if="log.details" style="color:var(--muted)">{{ log.details }}</div>
          </div>
        </div>
        <p v-else>Sin historial.</p>
      </section>
    </section>
  </main>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { manageApi, ticketsApi } from '../api'
import { session } from '../store/session'

const route = useRoute()
const id = Number(route.params.id)

const loading = ref(false)
const ticket = ref(null)
const error = ref('')

const contenidoHtml = ref('')
const departments = ref([])
const departmentId = ref(0)

const loadingReply = ref(false)
const replyMsg = ref('')
const loadingReassign = ref(false)
const loadingComplete = ref(false)

const isStudent = computed(() => session.user?.rol === 'estudiante')
const isRecepcionOrAdmin = computed(
  () => session.user?.rol === 'recepcion' || session.user?.rol === 'admin' || session.user?.rol === 'maestro'
)

function fmt(d) {
  try {
    return new Date(d).toLocaleString()
  } catch {
    return d
  }
}

function roleLabel(r) {
  return r === 'recepcion'
    ? 'Recepción'
    : r === 'departamento'
      ? 'Departamento'
      : r === 'admin'
        ? 'Admin'
        : r === 'maestro'
          ? 'Maestro'
          : 'Estudiante'
}

function auditLabel(action) {
  const map = {
    CREATE: 'Ticket creado',
    CREATE_TICKET: 'Ticket creado',
    ADD_REPLY: 'Respuesta agregada',
    REPLY: 'Respuesta agregada',
    REASSIGN: 'Reasignado',
    COMPLETE: 'Completado',
    CLOSE: 'Cerrado'
  }
  return map[action] || action
}

function statusClass(val) {
  switch (val) {
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
    const data = isStudent.value
      ? await ticketsApi.myTicketById(id)
      : await manageApi.ticketById(id)

    ticket.value = data.ticket

    // cargar departamentos solo para recepción/admin/maestro
    if (isRecepcionOrAdmin.value) {
      const { departments: deps } = await manageApi.departments()
      departments.value = deps || []
    } else {
      departments.value = []
    }
  } catch (e) {
    error.value = String(e?.message || e)
  } finally {
    loading.value = false
  }
}

async function enviarRespuesta() {
  if (!contenidoHtml.value.trim()) return
  loadingReply.value = true
  replyMsg.value = ''
  error.value = ''
  try {
    await manageApi.reply(id, contenidoHtml.value)
    contenidoHtml.value = ''
    replyMsg.value = 'Respuesta enviada'
    await load()
  } catch (e) {
    error.value = String(e?.message || e)
  } finally {
    loadingReply.value = false
  }
}

async function reasignar() {
  if (!departmentId.value) return
  loadingReassign.value = true
  error.value = ''
  try {
    await manageApi.reassign(id, { departmentId: departmentId.value })
    departmentId.value = 0
    await load()
  } catch (e) {
    error.value = String(e?.message || e)
  } finally {
    loadingReassign.value = false
  }
}

async function completar() {
  loadingComplete.value = true
  error.value = ''
  try {
    await manageApi.complete(id)
    await load()
  } catch (e) {
    error.value = String(e?.message || e)
  } finally {
    loadingComplete.value = false
  }
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

:root[data-theme="dark"] .status-open {
  background: rgba(56, 189, 248, 0.2);
  color: #7dd3fc;
}

.status-progress {
  background: #fef3c7;
  color: #92400e;
}

:root[data-theme="dark"] .status-progress {
  background: rgba(251, 191, 36, 0.2);
  color: #fcd34d;
}

.status-completed {
  background: #dcfce7;
  color: #166534;
}

:root[data-theme="dark"] .status-completed {
  background: rgba(34, 197, 94, 0.2);
  color: #86efac;
}

.status-closed {
  background: #fee2e2;
  color: #991b1b;
}

:root[data-theme="dark"] .status-closed {
  background: rgba(239, 68, 68, 0.2);
  color: #fca5a5;
}

.status-default {
  background: #e5e7eb;
  color: #374151;
}

:root[data-theme="dark"] .status-default {
  background: rgba(156, 163, 175, 0.2);
  color: #d1d5db;
}

.msg-bubble {
  padding: 0.75rem;
  border-radius: 8px;
  border: 1px solid var(--border);
}

.msg-student {
  background: rgba(59, 130, 246, 0.05);
  border-left: 3px solid #3b82f6;
}

:root[data-theme="dark"] .msg-student {
  background: rgba(59, 130, 246, 0.1);
}

.msg-staff {
  background: rgba(34, 197, 94, 0.05);
  border-left: 3px solid #22c55e;
}

:root[data-theme="dark"] .msg-staff {
  background: rgba(34, 197, 94, 0.1);
}

.msg-meta {
  font-size: 0.85rem;
  color: var(--muted);
  margin-bottom: 0.5rem;
}

.msg-body {
  line-height: 1.5;
}
</style>