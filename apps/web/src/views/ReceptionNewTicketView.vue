<template>
  <main style="padding:2rem; max-width:920px; margin:auto;">
    <h1>Nuevo ticket (Recepción)</h1>
    <p class="text-muted">Crea o selecciona un estudiante y genera el ticket en su nombre.</p>

    <!-- Paso 1: Buscar estudiante -->
    <section class="grid-gap" style="margin-top:1.5rem;">
      <fieldset>
        <legend><strong>1) Buscar estudiante</strong></legend>
        <div class="grid-gap">
          <input
            v-model.trim="q"
            placeholder="Cédula, nombre, apellido o email"
            @keyup.enter="search"
          />

          <div style="display:flex; gap:.5rem; flex-wrap:wrap;">
            <button type="button" @click="search" :disabled="searching">
              {{ searching ? 'Buscando…' : 'Buscar' }}
            </button>
            <button type="button" class="btn-secondary" @click="clearSearch">
              Limpiar
            </button>
          </div>

          <p class="text-danger" v-if="searchError">{{ searchError }}</p>

          <div v-if="results.length" style="margin-top:.75rem;">
            <p style="margin:0 0 .5rem 0;"><strong>Resultados:</strong></p>
            <div
              v-for="s in results"
              :key="s.id"
              style="padding:.5rem; border:1px solid var(--border); border-radius:8px; cursor:pointer; margin-bottom:.5rem; background:var(--surface);"
              @click="selectStudent(s)"
            >
              {{ s.nombre }} {{ s.apellido }} ({{ s.cedula }}) – {{ s.email }}
            </div>
          </div>
        </div>
      </fieldset>

      <!-- 2) Crear nuevo estudiante -->
      <fieldset>
        <legend><strong>2) Crear nuevo estudiante (si no existe)</strong></legend>
        <div class="grid-gap" style="max-width:520px;">
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:.5rem;">
            <input v-model.trim="newS.nombre" placeholder="Nombre" />
            <input v-model.trim="newS.apellido" placeholder="Apellido" />
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:.5rem;">
            <input v-model.trim="newS.cedula" placeholder="Cédula" />
            <input v-model.trim="newS.email" type="email" placeholder="Email" />
          </div>

          <select v-model="newS.facultad">
            <option value="">Seleccione facultad (opcional)</option>
            <option
              v-for="f in facultades"
              :key="f.slug"
              :value="f.nombre"
            >
              {{ f.nombre }}
            </option>
          </select>

          <div style="display:flex; gap:.5rem; flex-wrap:wrap; align-items:center;">
            <button type="button" @click="createStudent" :disabled="creating">
              {{ creating ? 'Creando…' : 'Crear estudiante' }}
            </button>
            <span class="text-success" v-if="createMsg">{{ createMsg }}</span>
            <span class="text-danger" v-if="createErr">{{ createErr }}</span>
          </div>
        </div>
      </fieldset>
    </section>

    <!-- INDICADOR VISUAL: Estudiante seleccionado -->
    <section
      v-if="student"
      style="margin-top:1.5rem; padding:1rem; border:2px solid var(--success); border-radius:12px; background:rgba(22, 163, 74, 0.05);"
    >
      <div style="display:flex; align-items:center; gap:.75rem;">
        <span style="font-size:1.5rem;">✅</span>
        <div>
          <p style="margin:0; font-weight:700; color:var(--success);">
            Estudiante Seleccionado
          </p>
          <p style="margin:.25rem 0 0 0; font-size:.95rem;">
            <strong>{{ student.nombre }} {{ student.apellido }}</strong>
            <br>
            Cédula: {{ student.cedula }} | Email: {{ student.email }}
            <br>
            <span v-if="student.facultad" style="color:var(--muted);">{{ student.facultad }}</span>
          </p>
        </div>
      </div>
    </section>

    <!-- Paso 3: Datos del ticket -->
    <section class="grid-gap" v-if="student" style="margin-top:1.5rem;">
      <fieldset>
        <legend><strong>3) Datos del ticket</strong></legend>

        <div class="grid-gap" style="max-width:720px;">
          <!-- Departamento destino -->
          <div class="grid-gap">
            <label style="font-weight:500;">Departamento destino</label>
            <select v-model.number="form.departmentId">
              <option value="">Seleccione departamento…</option>
              <option
                v-for="d in departments"
                :key="d.id"
                :value="d.id"
              >
                {{ d.nombre }}
              </option>
            </select>
            <p class="text-muted" style="margin:0; font-size:.85rem;">
              Este será el departamento responsable de gestionar el ticket.
            </p>
          </div>

          <!-- Asunto -->
          <div class="grid-gap">
            <label style="font-weight:500;">Asunto</label>

            <select v-model="quickSubject" @change="applyQuickSubject">
              <option value="">Seleccione asunto rápido (opcional)…</option>
              <option value="error_pago">Error en pago / matrícula</option>
              <option value="pago_pendiente">Problema con pago pendiente</option>
              <option value="solicitud_creditos">Solicitud de créditos / carga académica</option>
              <option value="solicitud_constancia">Constancia de estudios / documentos</option>
              <option value="consulta_general">Consulta general</option>
            </select>

            <input v-model.trim="form.asunto" placeholder="Asunto" />
          </div>

          <!-- Descripción -->
          <div class="grid-gap">
            <label style="font-weight:500;">Descripción breve de la consulta</label>
            <textarea
              v-model="form.descripcion"
              rows="4"
              placeholder="Descripción breve de la consulta"
            ></textarea>
          </div>

          <!-- Detalle adicional -->
          <div class="grid-gap">
            <label style="font-weight:500;">Detalle adicional de la consulta (opcional)</label>
            <textarea
              v-model="form.detalleAdicional"
              rows="3"
              placeholder="Detalle adicional de la consulta (opcional)"
            ></textarea>
          </div>

          <!-- CRU/Extensión - DROPDOWN -->
          <div class="grid-gap">
            <label style="font-weight:500;">CRU/Extensión (opcional)</label>
            <select v-model="form.cru">
              <option value="">Seleccione CRU/Extensión (opcional)</option>
              <option
                v-for="c in centrosRegionales"
                :key="c.slug"
                :value="c.nombre"
              >
                {{ c.nombre }}
              </option>
            </select>
          </div>

          <!-- Categoría de consulta -->
          <div class="grid-gap">
            <label style="font-weight:500;">Categoría de consulta (opcional)</label>
            <input
              v-model.trim="form.categoriaConsulta"
              placeholder="Ej: Matrícula, Pago, Resultados"
            />
          </div>

          <!-- Crear ticket -->
          <button type="button" @click="createTicket" :disabled="creatingTicket">
            {{ creatingTicket ? 'Creando ticket…' : 'Crear ticket' }}
          </button>

          <p class="text-danger" v-if="ticketError">{{ ticketError }}</p>
          <p class="text-success" v-if="ticketMsg">{{ ticketMsg }}</p>
        </div>
      </fieldset>
    </section>
  </main>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { studentsApi, receptionTicketsApi, manageApi } from '../api'

/* -----------------------
   Estado búsqueda alumno
   ----------------------- */
const q = ref('')
const results = ref([])
const searching = ref(false)
const searchError = ref('')

/* -----------------------
   Creación alumno
   ----------------------- */
const newS = ref({
  nombre: '',
  apellido: '',
  cedula: '',
  email: '',
  facultad: ''
})
const creating = ref(false)
const createMsg = ref('')
const createErr = ref('')

/* -----------------------
   Facultades / departamentos / CRUs
   ----------------------- */
const facultades = ref([])
const departments = ref([])
const centrosRegionales = ref([])

/* -----------------------
   Alumno seleccionado
   ----------------------- */
const student = ref(null)
const hasStudent = computed(() => !!student.value)

/* -----------------------
   Formulario ticket
   ----------------------- */
const form = ref({
  departmentId: '',
  asunto: '',
  descripcion: '',
  detalleAdicional: '',
  cru: '',
  categoriaConsulta: ''
})
const quickSubject = ref('')
const creatingTicket = ref(false)
const ticketError = ref('')
const ticketMsg = ref('')

/* ====== BÚSQUEDA DE ESTUDIANTES ====== */
async function search () {
  searchError.value = ''
  results.value = []

  if (!q.value) {
    searchError.value = 'Ingrese algún criterio de búsqueda'
    return
  }

  searching.value = true
  try {
    const j = await studentsApi.search(q.value)
    results.value = j.students || []
  } catch (e) {
    console.error(e)
    searchError.value = String(e?.message || e)
  } finally {
    searching.value = false
  }
}

function clearSearch () {
  q.value = ''
  results.value = []
  searchError.value = ''
}

function selectStudent (s) {
  student.value = s
  ticketMsg.value = ''
  ticketError.value = ''
}

/* ====== CREACIÓN DE ESTUDIANTE ====== */
async function createStudent () {
  createMsg.value = ''
  createErr.value = ''

  if (
    !newS.value.nombre ||
    !newS.value.apellido ||
    !newS.value.cedula ||
    !newS.value.email
  ) {
    createErr.value = 'Completa nombre, apellido, cédula y email'
    return
  }

  creating.value = true
  try {
    const j = await studentsApi.create(newS.value)
    student.value = j.student
    createMsg.value = 'Estudiante creado y seleccionado'
    newS.value = { nombre: '', apellido: '', cedula: '', email: '', facultad: '' }
  } catch (e) {
    console.error(e)
    createErr.value = String(e?.message || e)
  } finally {
    creating.value = false
  }
}

/* ====== ASUNTO RÁPIDO ====== */
function applyQuickSubject () {
  switch (quickSubject.value) {
    case 'error_pago':
      form.value.asunto = 'Error en pago / matrícula'
      break
    case 'pago_pendiente':
      form.value.asunto = 'Problema con pago pendiente'
      break
    case 'solicitud_creditos':
      form.value.asunto = 'Solicitud de créditos / carga académica'
      break
    case 'solicitud_constancia':
      form.value.asunto = 'Constancia de estudios / documentos'
      break
    case 'consulta_general':
      form.value.asunto = 'Consulta general'
      break
    default:
      break
  }
}

/* ====== CREACIÓN DE TICKET ====== */
async function createTicket () {
  ticketError.value = ''
  ticketMsg.value = ''

  if (!hasStudent.value) {
    ticketError.value = 'Seleccione o cree un estudiante primero'
    return
  }
  if (!form.value.departmentId) {
    ticketError.value = 'Seleccione el departamento destino'
    return
  }
  if (!form.value.asunto || !form.value.descripcion) {
    ticketError.value = 'Asunto y descripción son obligatorios'
    return
  }

  creatingTicket.value = true
  try {
    const descripcionFinal = form.value.detalleAdicional
      ? `${form.value.descripcion}\n\n${form.value.detalleAdicional}`
      : form.value.descripcion

    const payload = {
      studentId: student.value.id,
      departmentId: form.value.departmentId,
      asunto: form.value.asunto,
      descripcion: descripcionFinal,
      cru: form.value.cru || null,
      categoriaConsulta: form.value.categoriaConsulta || null
    }

    const j = await receptionTicketsApi.createForStudent(payload)

    if (j?.ok) {
      ticketMsg.value = `Ticket creado con token ${j.ticket?.token || ''}`
      // limpiamos campos de ticket, pero no el estudiante
      form.value.asunto = ''
      form.value.descripcion = ''
      form.value.detalleAdicional = ''
      form.value.cru = ''
      form.value.categoriaConsulta = ''
      quickSubject.value = ''
    } else {
      ticketError.value = j?.error || 'No se pudo crear el ticket'
    }
  } catch (e) {
    console.error(e)
    ticketError.value = String(e?.message || e)
  } finally {
    creatingTicket.value = false
  }
}

/* ====== CARGA INICIAL ====== */
onMounted(async () => {
  try {
    const jDeps = await manageApi.departments()
    departments.value = Array.isArray(jDeps?.departments) ? jDeps.departments : []

    const jFac = await manageApi.getFacultades()
    facultades.value = Array.isArray(jFac?.facultades) ? jFac.facultades : []

    const jCRU = await manageApi.getCentrosRegionales()
    centrosRegionales.value = Array.isArray(jCRU?.centros) ? jCRU.centros : []
  } catch (e) {
    console.error('Error cargando datos iniciales:', e)
  }
})
</script>