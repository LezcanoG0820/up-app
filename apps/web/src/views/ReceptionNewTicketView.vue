<template>
  <main style="padding:2rem; max-width:1000px; margin:auto;">
    <h1>Nuevo Ticket (Recepción)</h1>

    <!-- PASO 1: Buscar estudiante -->
    <section style="border:1px solid #ccc; padding:1rem; border-radius:8px; margin-bottom:1.5rem;">
      <h3>1. Buscar estudiante existente</h3>
      <div style="display:flex; gap:.5rem; margin-top:.5rem;">
        <input 
          v-model.trim="searchQ" 
          placeholder="Buscar por cédula, nombre, apellido o email"
          @keyup.enter="search"
          style="flex:1;"
        />
        <button @click="search" :disabled="!searchQ || searching">
          {{ searching ? 'Buscando...' : 'Buscar' }}
        </button>
      </div>

      <div v-if="searchResults.length > 0" style="margin-top:1rem;">
        <p><strong>Resultados encontrados:</strong></p>
        <div v-for="s in searchResults" :key="s.id" 
          style="border:1px solid #ddd; padding:.75rem; margin-bottom:.5rem; border-radius:4px; cursor:pointer; background:#f9f9f9;"
          @click="selectStudent(s)"
        >
          <strong>{{ s.nombre }} {{ s.apellido }}</strong> - {{ s.cedula }}<br/>
          <small>{{ s.email }}</small>
          <span v-if="s.cru" style="margin-left:1rem; color:#666;">{{ s.cru }}</span>
        </div>
      </div>

      <p v-if="searched && searchResults.length === 0" style="color:#999; margin-top:.5rem;">
        No se encontraron estudiantes.
      </p>

      <div v-if="selectedStudent" style="margin-top:1rem; padding:1rem; background:#e8f5e9; border-radius:4px;">
        <strong>✓ Estudiante seleccionado:</strong><br/>
        {{ selectedStudent.nombre }} {{ selectedStudent.apellido }} ({{ selectedStudent.cedula }})
      </div>
    </section>

    <!-- PASO 2: Crear estudiante nuevo -->
    <section style="border:1px solid #ccc; padding:1rem; border-radius:8px; margin-bottom:1.5rem;">
      <h3>2. O crear nuevo estudiante</h3>
      <form @submit.prevent="createStudent" style="display:grid; gap:.75rem; margin-top:.5rem;">
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:.75rem;">
          <input v-model.trim="newS.nombre" placeholder="Nombre" required />
          <input v-model.trim="newS.apellido" placeholder="Apellido" required />
          <input v-model.trim="newS.cedula" placeholder="Cédula" required />
          <input v-model.trim="newS.email" placeholder="Email" type="email" required />
        </div>

        <!-- ÚNICO DROPDOWN: CRU/Sede -->
        <select v-model="newS.cru">
          <option value="">Seleccione Sede/CRU (opcional)</option>
          <option v-for="c in centrosRegionales" :key="c.slug" :value="c.nombre">
            {{ c.nombre }}
          </option>
        </select>

        <p v-if="createStudentError" style="color:crimson;">{{ createStudentError }}</p>

        <button type="submit" :disabled="creatingStudent">
          {{ creatingStudent ? 'Creando...' : 'Crear Estudiante' }}
        </button>
      </form>
    </section>

    <!-- PASO 3: Datos del ticket -->
    <section v-if="selectedStudent" style="border:1px solid #ccc; padding:1rem; border-radius:8px;">
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

        <label>Descripción
          <textarea v-model.trim="ticketData.descripcion" rows="5" required></textarea>
        </label>

        <label>Detalle adicional (opcional)
          <textarea v-model.trim="ticketData.detalleAdicional" rows="3"></textarea>
        </label>

        <label>Categoría de consulta
          <select v-model="ticketData.categoriaQueja" required>
            <option value="">Seleccione categoría</option>
            <option v-for="c in CATEGORIAS" :key="c" :value="c">{{ c }}</option>
          </select>
        </label>

        <p v-if="ticketError" style="color:crimson;">{{ ticketError }}</p>

        <button type="submit" :disabled="submitting">
          {{ submitting ? 'Creando ticket...' : 'Crear Ticket' }}
        </button>
      </form>
    </section>

    <!-- INDICADOR VISUAL: Estudiante seleccionado -->
    <section
      v-if="selectedStudent"
      style="margin-top:1.5rem; padding:1rem; border:2px solid var(--success); border-radius:12px; background:rgba(22, 163, 74, 0.05);"
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
  'Felicitación',
  'Consulta'
]

// Búsqueda
const searchQ = ref('')
const searching = ref(false)
const searched = ref(false)
const searchResults = ref([])
const selectedStudent = ref(null)

// Crear estudiante
const newS = ref({
  nombre: '',
  apellido: '',
  cedula: '',
  email: '',
  cru: ''
})
const creatingStudent = ref(false)
const createStudentError = ref('')

// Centros Regionales
const centrosRegionales = ref([])

// Departamentos
const departments = ref([])

// Ticket
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

// Buscar estudiante
async function search() {
  if (!searchQ.value) return
  searching.value = true
  searched.value = false
  searchResults.value = []
  try {
    const { students } = await manageApi.searchStudents(searchQ.value)
    searchResults.value = students || []
    searched.value = true
  } catch (e) {
    console.error(e)
  } finally {
    searching.value = false
  }
}

// Seleccionar estudiante
function selectStudent(s) {
  selectedStudent.value = s
  searchResults.value = []
  searchQ.value = ''
}

// Crear estudiante
async function createStudent() {
  creatingStudent.value = true
  createStudentError.value = ''
  try {
    const { student } = await manageApi.createStudent({
      nombre: newS.value.nombre,
      apellido: newS.value.apellido,
      cedula: newS.value.cedula,
      email: newS.value.email,
      cru: newS.value.cru || null
    })
    selectedStudent.value = student
    newS.value = { nombre: '', apellido: '', cedula: '', email: '', cru: '' }
  } catch (e) {
    createStudentError.value = String(e?.message || e)
  } finally {
    creatingStudent.value = false
  }
}

// Aplicar asunto rápido
function applyQuickSubject() {
  if (quickSubject.value) {
    ticketData.value.asunto = quickSubject.value
  }
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
    ticketError.value = String(e?.message || e)
  } finally {
    submitting.value = false
  }
}

// Reset
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
  searchQ.value = ''
  searched.value = false
  searchResults.value = []
}

// Cargar datos
onMounted(async () => {
  try {
    const { departments: depts } = await manageApi.departments()
    departments.value = depts || []

    const { centros } = await manageApi.getCentrosRegionales()
    centrosRegionales.value = centros || []
  } catch (e) {
    console.error('Error cargando datos:', e)
  }
})
</script>