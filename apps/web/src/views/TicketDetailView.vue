<template>
  <main style="padding:2rem; max-width:900px; margin:auto;">
    <div v-if="loading">Cargando…</div>
    <p v-if="error" style="color:crimson">{{ error }}</p>

    <section v-if="!loading && ticket">
      <h1>Ticket {{ ticket.token }}</h1>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:.5rem; margin:.75rem 0 1rem;">
        <div><strong>Asunto:</strong> {{ ticket.asunto }}</div>
        <div><strong>Estado:</strong> {{ ticket.estado }}</div>
        <div><strong>Tipo:</strong> {{ ticket.tipo?.nombre || '-' }}</div>
        <div><strong>Departamento actual:</strong> {{ ticket.departamentoActual?.nombre || '-' }}</div>
        <div style="grid-column:1 / -1;"><strong>Descripción:</strong> {{ ticket.descripcion }}</div>
        <div style="grid-column:1 / -1;">
          <strong>Estudiante:</strong>
          {{ ticket.estudiante?.nombre }} {{ ticket.estudiante?.apellido }}
          ({{ ticket.estudiante?.email }}) — Cédula: {{ ticket.estudiante?.cedula }} — Facultad: {{ ticket.estudiante?.facultad || '-' }}
        </div>
        <div><strong>CRU:</strong> {{ ticket.cru || '-' }}</div>
        <div><strong>Categoría de consulta:</strong> {{ ticket.categoriaConsulta || ticket.categoriaQueja || '-' }}</div>
        <div style="grid-column:1 / -1;"><strong>Creado:</strong> {{ fmt(ticket.createdAt) }}</div>
      </div>

      <!-- Mensajes -->
      <h2 style="margin-top:1rem;">Mensajes</h2>
      <div v-if="ticket.messages?.length">
        <article
          v-for="m in ticket.messages"
          :key="m.id"
          style="border:1px solid #ddd; border-radius:8px; padding:.75rem; margin:.5rem 0;"
        >
          <div style="font-size:.9rem; color:#666;">
            {{ fmt(m.createdAt) }} — {{ m.autor?.nombre }} {{ m.autor?.apellido }} ({{ roleLabel(m.autor?.rol) }})
          </div>
          <div style="margin-top:.5rem;" v-html="m.contenidoHtml"></div>
        </article>
      </div>
      <p v-else>No hay mensajes.</p>

      <!-- Acciones SOLO staff (recepción/admin). Departamento también puede responder y completar -->
      <div v-if="!isStudent" style="display:grid; gap:1rem; margin-top:1.5rem;">
        <!-- Responder -->
        <fieldset>
          <legend><strong>Responder</strong></legend>
          <textarea
            v-model="contenidoHtml"
            rows="4"
            placeholder="Respuesta en HTML sencillo, p.ej.: <p>Estamos revisando</p>"
            style="width:100%;"
          ></textarea>
          <div style="margin-top:.5rem;">
            <button @click="enviarRespuesta" :disabled="loadingReply">
              {{ loadingReply ? 'Enviando…' : 'Enviar respuesta' }}
            </button>
            <span v-if="replyMsg" style="margin-left:.5rem; color:green">{{ replyMsg }}</span>
          </div>
        </fieldset>

        <!-- Reasignar: dropdown de departamentos (solo recepción/admin) -->
        <fieldset v-if="isRecepcionOrAdmin">
          <legend><strong>Reasignar</strong></legend>
          <select v-model.number="departmentId" style="min-width:280px;">
            <option :value="0" disabled>Selecciona departamento destino</option>
            <option v-for="d in departments" :key="d.id" :value="d.id">
              {{ d.nombre }} ({{ d.slug }})
            </option>
          </select>
          <button @click="reasignar" :disabled="loadingReassign || !departmentId">
            {{ loadingReassign ? 'Reasignando…' : 'Reasignar' }}
          </button>
        </fieldset>

        <!-- Completar (recepción, departamento y admin) -->
        <fieldset>
          <legend><strong>Marcar como completado</strong></legend>
          <button @click="completar" :disabled="loadingComplete || ticket.estado === 'completado'">
            {{ ticket.estado === 'completado' ? 'Ya completado' : (loadingComplete ? 'Marcando…' : 'Completar') }}
          </button>
        </fieldset>
      </div>

      <!-- Historial -->
      <section style="margin-top:1.25rem;">
        <h2>Historial</h2>
        <div v-if="ticket.auditLogs?.length">
          <div
            v-for="log in ticket.auditLogs"
            :key="log.id"
            style="font-size:.9rem; padding:.25rem 0; border-bottom:1px dashed #ddd;"
          >
            {{ fmt(log.createdAt) }} — <strong>{{ auditLabel(log.action) }}</strong>
            <span v-if="log.actor"> por {{ log.actor.nombre }} {{ log.actor.apellido }} ({{ roleLabel(log.actor.rol) }})</span>
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
const isRecepcionOrAdmin = computed(() => session.user?.rol === 'recepcion' || session.user?.rol === 'admin')

function fmt(d) {
  try { return new Date(d).toLocaleString() } catch { return d }
}
function roleLabel(r) {
  return r === 'recepcion' ? 'Recepción'
       : r === 'departamento' ? 'Departamento'
       : r === 'admin' ? 'Admin'
       : 'Estudiante'
}
function auditLabel(a) {
  return (
    {
      CREATE_TICKET: 'Creación',
      ADD_REPLY: 'Respuesta añadida',
      REASSIGN: 'Reasignación',
      COMPLETE: 'Completado',
      UPDATE_TICKET: 'Actualización'
    }[a] || a
  )
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

    // cargar departamentos solo para recepción/admin
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
  if (!contenidoHtml.value) return
  loadingReply.value = true
  replyMsg.value = ''
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
