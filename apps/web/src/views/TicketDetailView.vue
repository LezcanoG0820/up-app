<template>
  <main style="padding:2rem; max-width:900px; margin:auto;">
    <!-- Estados globales -->
    <div v-if="loading">Cargando…</div>
    <p v-if="error" style="color:crimson">{{ error }}</p>

    <section v-if="!loading && ticket" class="grid-gap" style="display:flex; flex-direction:column; gap:1.5rem;">
      <!-- ENCABEZADO + RESUMEN -->
      <header>
        <h1 style="margin:0 0 .25rem 0;">Ticket {{ ticket.token }}</h1>
        <p style="margin:0; font-size:.9rem; color:#555;">
          Creado: {{ fmt(ticket.createdAt) }}
        </p>
      </header>

      <section
        style="border:1px solid #ddd; border-radius:8px; padding:1rem; display:grid; grid-template-columns:1fr 1fr; gap:.5rem;"
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
        <div><strong>CRU:</strong> {{ ticket.cru || '-' }}</div>
        <div><strong>Categoría de consulta:</strong> {{ ticket.categoriaConsulta || ticket.categoriaQueja || '-' }}</div>
      </section>

      <!-- ESTUDIANTE -->
      <section
        style="border:1px solid #ddd; border-radius:8px; padding:1rem; display:grid; grid-template-columns:1fr 1fr; gap:.5rem;"
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
      <section style="border:1px solid #ddd; border-radius:8px; padding:1rem; display:grid; gap:.5rem;">
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
        style="display:grid; gap:1rem; border:1px solid #ddd; border-radius:8px; padding:1rem;"
      >
        <!-- Responder -->
        <fieldset style="border:1px solid #ddd; border-radius:6px; padding:.75rem;">
          <legend style="padding:0 .25rem;"><strong>Responder</strong></legend>
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
            <span v-if="replyMsg" style="margin-left:.5rem; color:green">{{ replyMsg }}</span>
          </div>
        </fieldset>

        <!-- Reasignar (solo recepción/maestro) -->
        <fieldset
          v-if="isRecepcionOrMaestro"
          style="border:1px solid #ddd; border-radius:6px; padding:.75rem;"
        >
          <legend style="padding:0 .25rem;"><strong>Reasignar</strong></legend>
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
        <fieldset style="border:1px solid #ddd; border-radius:6px; padding:.75rem;">
          <legend style="padding:0 .25rem;"><strong>Completar</strong></legend>
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
            style="font-size:.9rem; padding:.25rem 0; border-bottom:1px dashed #ddd;"
          >
            {{ fmt(log.createdAt) }} — <strong>{{ auditLabel(log.action) }}</strong>
            <span v-if="log.actor">
              &nbsp;por {{ log.actor.nombre }} {{ log.actor.apellido }}
              ({{ roleLabel(log.actor.rol) }})
            </span>
            <div v-if="log.details" style="color:#666">{{ log.details }}</div>
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
const isRecepcionOrMaestro = computed(
  () => session.user?.rol === 'recepcion' || session.user?.rol === 'maestro'
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
      : r === 'maestro'
        ? 'Maestro'
        : 'Estudiante'
}

function auditLabel(a) {
  switch (a) {
    case 'ticket_created':
      return 'Ticket creado'
    case 'message_added':
      return 'Nuevo mensaje'
    case 'ticket_reassigned':
      return 'Ticket reasignado'
    case 'ticket_completed':
      return 'Ticket completado'
    default:
      return a || ''
  }
}

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
    // estudiante ve su propio endpoint; staff usa el de gestión
    const data = isStudent.value
      ? await ticketsApi.myTicketById(id)
      : await manageApi.ticketById(id)

    ticket.value = data.ticket

    // cargar departamentos solo para recepción/maestro
    if (isRecepcionOrMaestro.value) {
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
  if (!contenidoHtml.value) return
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

.msg-bubble {
  border-radius: 8px;
  padding: 0.75rem;
  border: 1px solid #e5e7eb;
}

.msg-staff {
  background: #f9fafb;
}

.msg-student {
  background: #ecfeff;
}

.msg-meta {
  font-size: 0.85rem;
  color: #6b7280;
}

.msg-body {
  margin-top: 0.5rem;
}
</style>