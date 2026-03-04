<template>
  <main style="padding:2rem; max-width:920px; margin:auto;">
    <h2>Nuevo Ticket (Recepción)</h2>

    <!-- PASO 1: Buscar estudiante -->
    <section style="border:1px solid #ddd; padding:1rem; border-radius:8px; margin-bottom:1.5rem;">
      <h3>1. Buscar estudiante existente</h3>
      <form @submit.prevent="searchStudents" style="display:grid; gap:.75rem; margin-top:.5rem;">
        <input 
          v-model.trim="searchQuery" 
          placeholder="Buscar por cédula, nombre, apellido o email"
        />
        <div style="display:flex; gap:.5rem;">
          <button type="submit" :disabled="searching">
            {{ searching ? 'Buscando...' : 'Buscar' }}
          </button>
          <button type="button" @click="clearSearch" style="background:#6c757d;">
            Limpiar
          </button>
        </div>
        <p v-if="searchError" style="color:red;">{{ searchError }}</p>
      </form>

      <!-- RESULTADOS MEJORADOS -->
      <div v-if="searchResults.length" style="margin-top:1rem;">
        <p style="margin-bottom:.75rem; font-weight:600;">Resultados:</p>
        <div 
          v-for="s in searchResults" 
          :key="s.id"
          @click="selectStudent(s)"
          :style="getResultCardStyle(s.id)"
          @mouseenter="hoveredResult = s.id"
          @mouseleave="hoveredResult = null"
        >
          <div style="display:flex; align-items:center; gap:.5rem; margin-bottom:.25rem;">
            <span style="font-size:1.2rem;">👤</span>
            <strong style="font-size:1.05rem;">{{ s.nombre }} {{ s.apellido }}</strong>
          </div>
          <div style="font-size:.9rem; color:#6b7280; display:grid; gap:.15rem; margin-left:1.7rem;">
            <span>Cédula: {{ s.cedula }}</span>
            <span>Email: {{ s.email }}</span>
            <span v-if="s.cru" style="color:#059669; font-weight:500;">📍 {{ s.cru }}</span>
          </div>
        </div>
      </div>
      <p v-else-if="searchQuery && !searching" style="color:#666; margin-top:.5rem; font-style:italic;">
        No se encontraron estudiantes.
      </p>
    </section>

    <!-- PASO 2: Crear nuevo estudiante -->
    <section style="border:1px solid #ddd; padding:1rem; border-radius:8px; margin-bottom:1.5rem;">
      <h3>2. O crear nuevo estudiante</h3>
      <form @submit.prevent="createNewStudent" style="display:grid; gap:.75rem; margin-top:.5rem;">
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:.5rem;">
          <input v-model.trim="newStudent.nombre" placeholder="Nombre" required />
          <input v-model.trim="newStudent.apellido" placeholder="Apellido" required />
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:.5rem;">
          <input v-model.trim="newStudent.cedula" placeholder="Cédula" required />
          <input v-model.trim="newStudent.email" type="email" placeholder="Email" required />
        </div>
        <select v-model="newStudent.cru">
          <option value="">Seleccione Sede/CRU (opcional)</option>
          <option v-for="c in crus" :key="c.slug" :value="c.nombre">
            {{ c.nombre }}
          </option>
        </select>
        <button type="submit" :disabled="creating">
          {{ creating ? 'Creando...' : 'Crear Estudiante' }}
        </button>
        <p v-if="createError" style="color:red;">{{ createError }}</p>
        <p v-if="createSuccess" style="color:#16a34a;">{{ createSuccess }}</p>
      </form>
    </section>

    <!-- INDICADOR: Estudiante seleccionado -->
    <!-- MEJORA: MÁS ESPACIO ABAJO (margin-bottom aumentado a 2.5rem) -->
    <section
      v-if="selectedStudent"
      style="margin-top:1.5rem; margin-bottom:2.5rem; padding:1rem; border:2px solid var(--success); border-radius:12px; background:rgba(22, 163, 74, 0.05);"
    >
      <div style="display:flex; align-items:center; gap:.75rem;">
        <span style="font-size:1.5rem;">✅</span>
        <div>
          <p style="margin:0; font-weight:700; color:var(--success);">
            Estudiante Seleccionado
          </p>
          <p style="margin:.25rem 0 0 0; font-size:.95rem;">
            <strong>{{ selectedStudent.nombre }} {{ selectedStudent.apellido }}</strong>
            <br>
            Cédula: {{ selectedStudent.cedula }} | Email: {{ selectedStudent.email }}
            <br>
            <span v-if="selectedStudent.cru" style="color:var(--muted);">{{ selectedStudent.cru }}</span>
          </p>
        </div>
      </div>
    </section>

    <!-- PASO 3: Datos del ticket -->
    <section v-if="selectedStudent" style="border:1px solid #ddd; padding:1rem; border-radius:8px;">
      <h3>3. Datos del ticket</h3>
      <form @submit.prevent="submitTicket" style="display:grid; gap:.75rem; margin-top:.5rem;">
        
        <label>Departamento destino
          <select v-model="ticketData.departmentSlug" required>
            <option value="">Seleccione departamento</option>
            <option v-for="d in departments" :key="d.id" :value="d.slug">
              {{ d.nombre }}
            </option>
          </select>
        </label>

        <label>Asuntos rápidos (opcional)
          <select v-model="quickSubject" @change="applyQuickSubject">
            <option value="">-- Seleccione un asunto predefinido --</option>
            <option value="Error de pago / matrícula">Error de pago / matrícula</option>
            <option value="Problema con pago pendiente">Problema con pago pendiente</option>
            <option value="Solicitud de créditos">Solicitud de créditos</option>
            <option value="Constancia de estudios o documentos">Constancia de estudios o documentos</option>
            <option value="Consultas generales">Consultas generales</option>
          </select>
        </label>

        <label>Asunto
          <input v-model.trim="ticketData.asunto" required />
        </label>

        <label>Descripción breve
          <textarea v-model="ticketData.descripcion" rows="4" required></textarea>
        </label>

        <label>Detalle adicional (opcional)
          <textarea v-model="ticketData.detalleAdicional" rows="3"></textarea>
        </label>

        <label>Categoría de consulta
          <select v-model="ticketData.categoriaQueja">
            <option value="">-- Seleccione categoría (opcional) --</option>
            <option v-for="cat in CATEGORIAS" :key="cat" :value="cat">
              {{ cat }}
            </option>
          </select>
        </label>

        <button type="submit" :disabled="submitting">
          {{ submitting ? 'Creando ticket...' : 'Crear Ticket' }}
        </button>
        <p v-if="ticketError" style="color:red;">{{ ticketError }}</p>
      </form>
    </section>

    <!-- Confirmación -->
    <div v-if="createdTicket" style="margin-top:2rem; padding:1.5rem; background:#e8f5e9; border:1px solid #4caf50; border-radius:8px;">
      <h3 style="color:#2e7d32;">✓ Ticket creado exitosamente</h3>
      <p><strong>Token:</strong> {{ createdTicket.token }}</p>
      <p><strong>Estudiante:</strong> {{ createdTicket.estudiante.nombre }} {{ createdTicket.estudiante.apellido }}</p>
      <button @click="reset" style="margin-top:1rem;">Crear otro ticket</button>
    </div>
  </main>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { manageApi, ticketsApi } from '../api'

const CATEGORIAS = [
  'Queja',
  'Reclamo',
  'Sugerencia',
  'Consulta',
  'Solicitud'
]

const searchQuery = ref('')
const searchResults = ref([])
const searching = ref(false)
const searchError = ref('')
const hoveredResult = ref(null)

const newStudent = ref({
  nombre: '',
  apellido: '',
  cedula: '',
  email: '',
  cru: ''
})
const creating = ref(false)
const createError = ref('')
const createSuccess = ref('')

const selectedStudent = ref(null)

const departments = ref([])
const crus = ref([])

const ticketData = ref({
  departmentSlug: '',
  asunto: '',
  descripcion: '',
  detalleAdicional: '',
  categoriaQueja: ''
})
const quickSubject = ref('')
const submitting = ref(false)
const ticketError = ref('')
const createdTicket = ref(null)

// Estilo dinámico para cards de resultados
function getResultCardStyle(studentId) {
  const isHovered = hoveredResult.value === studentId
  return {
    cursor: 'pointer',
    padding: '1rem',
    border: `1px solid ${isHovered ? '#3b82f6' : '#d1d5db'}`,
    borderRadius: '8px',
    marginBottom: '.75rem',
    background: '#f9fafb',
    transition: 'all 0.2s ease'
  }
}

// Buscar estudiantes
async function searchStudents() {
  if (!searchQuery.value.trim()) {
    searchError.value = 'Ingrese un criterio de búsqueda'
    return
  }

  searching.value = true
  searchError.value = ''
  searchResults.value = []

  try {
    const { students } = await manageApi.searchStudents(searchQuery.value)
    searchResults.value = students || []
  } catch (e) {
    console.error(e)
    searchError.value = String(e?.message || e)
  } finally {
    searching.value = false
  }
}

function clearSearch() {
  searchQuery.value = ''
  searchResults.value = []
  searchError.value = ''
}

function selectStudent(student) {
  selectedStudent.value = student
  createSuccess.value = ''
}

// Crear estudiante
async function createNewStudent() {
  creating.value = true
  createError.value = ''
  createSuccess.value = ''

  try {
    const { student } = await manageApi.createStudent(newStudent.value)
    selectedStudent.value = student
    createSuccess.value = 'Estudiante creado y seleccionado'
    newStudent.value = { nombre: '', apellido: '', cedula: '', email: '', cru: '' }
  } catch (e) {
    console.error(e)
    createError.value = String(e?.message || e)
  } finally {
    creating.value = false
  }
}

// Asunto rápido
function applyQuickSubject() {
  ticketData.value.asunto = quickSubject.value
}

// Crear ticket
async function submitTicket() {
  submitting.value = true
  ticketError.value = ''

  try {
    const payload = {
      estudianteId: selectedStudent.value.id,
      departmentSlug: ticketData.value.departmentSlug,
      asunto: ticketData.value.asunto,
      descripcion: ticketData.value.descripcion,
      detalleAdicional: ticketData.value.detalleAdicional || null,
      categoriaQueja: ticketData.value.categoriaQueja
    }

    const { ticket } = await ticketsApi.createByReception(payload)
    createdTicket.value = ticket
  } catch (e) {
    console.error(e)
    ticketError.value = String(e?.message || e)
  } finally {
    submitting.value = false
  }
}

function reset() {
  selectedStudent.value = null
  ticketData.value = {
    departmentSlug: '',
    asunto: '',
    descripcion: '',
    detalleAdicional: '',
    categoriaQueja: ''
  }
  quickSubject.value = ''
  createdTicket.value = null
  searchQuery.value = ''
  searchResults.value = []
}

onMounted(async () => {
  try {
    const [deptResult, crusResult] = await Promise.all([
      manageApi.departments(),
      manageApi.getCentrosRegionales()
    ])
    departments.value = deptResult.departments || []
    crus.value = crusResult.centros || []
  } catch (e) {
    console.error('Error cargando datos:', e)
  }
})
</script>