<template>
  <main style="padding:2rem; max-width:1000px; margin:auto;">
    <div v-if="loading">Cargando...</div>
    <div v-else-if="error" style="color:crimson;">{{ error }}</div>
    <div v-else-if="ticket">
      <!-- HEADER -->
      <header style="margin-bottom:2rem;">
        <h1 style="margin:0;">{{ ticket.token }}</h1>
        <p style="margin:.5rem 0 0; color:#666;">
          <span :style="{ 
            padding: '.25rem .5rem', 
            borderRadius: '4px', 
            background: ticket.estado === 'completado' ? '#4caf50' : ticket.estado === 'en_proceso' ? '#ff9800' : '#2196f3',
            color: '#fff',
            fontSize: '.875rem'
          }">
            {{ ticket.estado.toUpperCase() }}
          </span>
          <span style="margin-left:1rem;">Creado: {{ formatDate(ticket.createdAt) }}</span>
        </p>
      </header>

      <!-- DATOS DEL ESTUDIANTE -->
      <section style="border:1px solid #ddd; padding:1.5rem; border-radius:8px; margin-bottom:1.5rem;">
        <h3 style="margin-top:0;">Datos del Estudiante</h3>
        <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:1rem;">
          <div>
            <strong>Nombre:</strong><br/>
            {{ ticket.estudiante.nombre }} {{ ticket.estudiante.apellido }}
          </div>
          <div>
            <strong>Cédula:</strong><br/>
            {{ ticket.estudiante.cedula }}
          </div>
          <div>
            <strong>Email:</strong><br/>
            {{ ticket.estudiante.email }}
          </div>
          <div>
            <strong>Sede/CRU:</strong><br/>
            {{ ticket.estudiante.cru || '-' }}
          </div>
        </div>
      </section>

      <!-- DATOS DEL TICKET -->
      <section style="border:1px solid #ddd; padding:1.5rem; border-radius:8px; margin-bottom:1.5rem;">
        <h3 style="margin-top:0;">Datos del Ticket</h3>
        <div style="display:grid; gap:1rem;">
          <div>
            <strong>Asunto:</strong><br/>
            {{ ticket.asunto }}
          </div>
          <div>
            <strong>Descripción:</strong><br/>
            {{ ticket.descripcion }}
          </div>
          <div v-if="ticket.detalleAdicional">
            <strong>Detalle Adicional:</strong><br/>
            {{ ticket.detalleAdicional }}
          </div>
          <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:1rem;">
            <div>
              <strong>Tipo:</strong><br/>
              {{ ticket.tipo?.nombre || '-' }}
            </div>
            <div>
              <strong>Departamento:</strong><br/>
              {{ ticket.departamentoActual?.nombre || '-' }}
            </div>
            <div>
              <strong>Categoría:</strong><br/>
              {{ ticket.categoriaQueja || ticket.categoriaConsulta || '-' }}
            </div>
          </div>
        </div>
      </section>

      <!-- ACCIONES (solo para recepción/departamento/maestro) -->
      <section v-if="canManage" style="border:1px solid #ddd; padding:1.5rem; border-radius:8px; margin-bottom:1.5rem;">
        <h3 style="margin-top:0;">Acciones</h3>
        <div style="display:flex; gap:1rem; flex-wrap:wrap;">
          <button 
            v-if="canReassign && ticket.estado !== 'completado'" 
            @click="showReassignModal = true"
          >
            Reasignar
          </button>
          <button 
            v-if="ticket.estado !== 'completado'" 
            @click="completeTicket"
            :disabled="completing"
            style="background:#4caf50; color:#fff;"
          >
            {{ completing ? 'Completando...' : 'Marcar como Completado' }}
          </button>
        </div>
      </section>

      <!-- RESPUESTAS -->
      <section style="border:1px solid #ddd; padding:1.5rem; border-radius:8px; margin-bottom:1.5rem;">
        <h3 style="margin-top:0;">Respuestas ({{ ticket.messages?.length || 0 }})</h3>
        
        <div v-if="!ticket.messages || ticket.messages.length === 0" style="color:#999;">
          No hay respuestas aún.
        </div>

        <div v-else>
          <div v-for="msg in ticket.messages" :key="msg.id" 
            style="border-left:3px solid #2196f3; padding:.75rem 1rem; margin-bottom:1rem; background:#f5f5f5; border-radius:4px;"
          >
            <div style="font-size:.875rem; color:#666; margin-bottom:.5rem;">
              <strong>{{ msg.autor?.nombre }} {{ msg.autor?.apellido }}</strong> 
              ({{ msg.autor?.rol }}) - {{ formatDate(msg.createdAt) }}
            </div>
            <div v-html="msg.contenidoHtml"></div>
          </div>
        </div>

        <!-- FORMULARIO RESPONDER (solo para staff) -->
        <div v-if="canManage && ticket.estado !== 'completado'" style="margin-top:1.5rem;">
          <h4>Agregar Respuesta</h4>
          <form @submit.prevent="submitReply">
            <textarea 
              v-model="replyContent" 
              rows="5" 
              placeholder="Escribe tu respuesta aquí..." 
              required
              style="width:100%; padding:.75rem; border:1px solid #ddd; border-radius:4px; font-family:inherit;"
            ></textarea>
            <div style="margin-top:.5rem;">
              <button type="submit" :disabled="replying">
                {{ replying ? 'Enviando...' : 'Enviar Respuesta' }}
              </button>
            </div>
            <p v-if="replyError" style="color:crimson; margin-top:.5rem;">{{ replyError }}</p>
          </form>
        </div>
      </section>

      <!-- HISTORIAL DE AUDITORÍA -->
      <section style="border:1px solid #ddd; padding:1.5rem; border-radius:8px;">
        <h3 style="margin-top:0;">Historial de Auditoría</h3>
        <div v-if="!ticket.auditLogs || ticket.auditLogs.length === 0" style="color:#999;">
          Sin registros de auditoría.
        </div>
        <div v-else style="font-size:.875rem;">
          <div v-for="log in ticket.auditLogs" :key="log.id" 
            style="padding:.5rem 0; border-bottom:1px solid #eee;"
          >
            <strong>{{ log.action }}</strong> - 
            {{ log.actor?.nombre || 'Sistema' }} - 
            {{ formatDate(log.createdAt) }}
            <div v-if="log.details" style="color:#666; font-size:.8rem;">{{ log.details }}</div>
          </div>
        </div>
      </section>
    </div>

    <!-- MODAL REASIGNAR -->
    <div 
      v-if="showReassignModal" 
      style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:1000;"
      @click.self="showReassignModal = false"
    >
      <div style="background:#fff; padding:2rem; border-radius:8px; max-width:400px; width:90%;">
        <h3 style="margin-top:0;">Reasignar Ticket</h3>
        <form @submit.prevent="reassignTicket">
          <select v-model="reassignDeptSlug" required style="width:100%; padding:.5rem; margin-bottom:1rem;">
            <option value="">Seleccione departamento</option>
            <option v-for="d in departments" :key="d.id" :value="d.slug">
              {{ d.nombre }}
            </option>
          </select>
          <p v-if="reassignError" style="color:crimson;">{{ reassignError }}</p>
          <div style="display:flex; gap:.5rem; justify-content:flex-end;">
            <button type="button" @click="showReassignModal = false" class="btn-secondary">Cancelar</button>
            <button type="submit" :disabled="reassigning">
              {{ reassigning ? 'Reasignando...' : 'Reasignar' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </main>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { manageApi } from '../api'
import { session } from '../store/session'

const route = useRoute()
const router = useRouter()

const ticket = ref(null)
const loading = ref(false)
const error = ref('')

// Respuestas
const replyContent = ref('')
const replying = ref(false)
const replyError = ref('')

// Reasignar
const showReassignModal = ref(false)
const reassignDeptSlug = ref('')
const reassigning = ref(false)
const reassignError = ref('')
const departments = ref([])

// Completar
const completing = ref(false)

// Permisos
const canManage = computed(() => {
  return ['recepcion', 'departamento', 'maestro'].includes(session.user?.rol)
})

const canReassign = computed(() => {
  return ['recepcion', 'maestro'].includes(session.user?.rol)
})

// Cargar ticket
async function loadTicket() {
  loading.value = true
  error.value = ''
  try {
    const id = Number(route.params.id)
    const { ticket: t } = await manageApi.getTicket(id)
    ticket.value = t
  } catch (e) {
    error.value = String(e?.message || e)
  } finally {
    loading.value = false
  }
}

// Enviar respuesta
async function submitReply() {
  if (!replyContent.value.trim()) return
  replying.value = true
  replyError.value = ''
  try {
    await manageApi.replyTicket(ticket.value.id, replyContent.value.trim())
    replyContent.value = ''
    await loadTicket()
  } catch (e) {
    replyError.value = String(e?.message || e)
  } finally {
    replying.value = false
  }
}

// Reasignar
async function reassignTicket() {
  if (!reassignDeptSlug.value) return
  reassigning.value = true
  reassignError.value = ''
  try {
    await manageApi.reassignTicket(ticket.value.id, reassignDeptSlug.value)
    showReassignModal.value = false
    reassignDeptSlug.value = ''
    await loadTicket()
  } catch (e) {
    reassignError.value = String(e?.message || e)
  } finally {
    reassigning.value = false
  }
}

// Completar
async function completeTicket() {
  if (!confirm('¿Marcar este ticket como completado?')) return
  completing.value = true
  try {
    await manageApi.completeTicket(ticket.value.id)
    await loadTicket()
  } catch (e) {
    alert('Error: ' + String(e?.message || e))
  } finally {
    completing.value = false
  }
}

// Formato fecha
function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleString('es-PA')
}

// Cargar departamentos
async function loadDepartments() {
  try {
    const { departments: d } = await manageApi.departments()
    departments.value = d || []
  } catch (e) {
    console.error(e)
  }
}

onMounted(() => {
  loadTicket()
  if (canReassign.value) {
    loadDepartments()
  }
})
</script>