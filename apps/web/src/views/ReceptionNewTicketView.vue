<template>
  <main class="grid-gap" style="max-width:1000px; margin:auto;">
    <header class="grid-gap">
      <h1 style="margin:0;">Nuevo ticket (Recepción)</h1>
      <p class="text-muted" style="margin:0;">Crea o selecciona un estudiante y genera el ticket en su nombre.</p>
    </header>

    <!-- Paso A: Buscar / Crear estudiante -->
    <section class="grid-gap">
      <fieldset>
        <legend><strong>1) Buscar estudiante</strong></legend>
        <div style="display:flex; gap:.5rem; flex-wrap:wrap; align-items:center;">
          <input
            v-model.trim="q"
            placeholder="Cédula, nombre, apellido o email"
            @keyup.enter="search"
            style="max-width:340px;"
          >
          <button class="btn-secondary" @click="search">Buscar</button>
        </div>

        <div v-if="searching" class="text-muted mt-2">Buscando…</div>
        <div v-else-if="results.length" class="mt-2">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Nombre</th>
                <th>Cédula</th>
                <th>Email</th>
                <th>Facultad</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in results" :key="s.id">
                <td>{{ s.id }}</td>
                <td>{{ s.nombre }} {{ s.apellido }}</td>
                <td>{{ s.cedula }}</td>
                <td>{{ s.email }}</td>
                <td>{{ s.facultad || '-' }}</td>
                <td>
                  <button class="btn-secondary" @click="pickStudent(s)">Usar</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="text-muted mt-2">Sin resultados.</div>
      </fieldset>

      <fieldset>
        <legend><strong>2) Crear estudiante (si no existe)</strong></legend>
        <div class="grid-gap" style="max-width:620px;">
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:.5rem;">
            <input v-model.trim="newS.nombre" placeholder="Nombre">
            <input v-model.trim="newS.apellido" placeholder="Apellido">
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:.5rem;">
            <input v-model.trim="newS.cedula" placeholder="Cédula">
            <input v-model.trim="newS.email" placeholder="Email">
          </div>

          <!-- Dropdown de facultades -->
          <select v-model="newS.facultad">
            <option value="">Seleccione facultad…</option>
            <option
              v-for="f in facultades"
              :key="f.slug"
              :value="f.nombre"
            >
              {{ f.nombre }}
            </option>
          </select>

          <div style="display:flex; gap:.5rem; align-items:center;">
            <button :disabled="creating" @click="createStudent">
              {{ creating ? 'Creando…' : 'Crear estudiante' }}
            </button>
            <span class="text-success" v-if="createMsg">{{ createMsg }}</span>
            <span class="text-danger" v-if="createErr">{{ createErr }}</span>
          </div>
        </div>
      </fieldset>

      <section v-if="student">
        <div class="card">
          <strong>Estudiante seleccionado:</strong>
          <div class="text-muted">
            {{ student.nombre }} {{ student.apellido }} — {{ student.cedula }} — {{ student.email }}
          </div>
        </div>
      </section>
    </section>

    <!-- Paso B: Crear ticket -->
    <section class="grid-gap" v-if="student">
      <fieldset>
        <legend><strong>3) Datos del ticket</strong></legend>

        <div class="grid-gap" style="max-width:720px;">

          <!-- Departamento destino (antes "Tipo") -->
          <div>
            <label>Departamento destino</label>
            <select v-model.number="form.tipoId">
              <option value="">Seleccione departamento…</option>
              <option
                v-for="t in tipos"
                :key="t.id"
                :value="t.id"
              >
                {{ t.nombre }}
              </option>
            </select>
          </div>

          <!-- Asunto con opción "Otros" -->
          <div>
            <label>Asunto</label>
            <select
              v-model="asuntoPreset"
              @change="syncAsuntoFromPreset"
            >
              <option value="">Seleccione asunto rápido (opcional)…</option>
              <option value="Pagos">Pagos</option>
              <option value="Errores de pago">Errores de pago</option>
              <option value="Pruebas">Pruebas</option>
              <option value="Resultados">Resultados</option>
              <option value="_other">Otros (escribir manualmente)</option>
            </select>
            <input
              v-model.trim="form.asunto"
              placeholder="Asunto"
              style="margin-top:.5rem;"
            >
          </div>

          <!-- Descripción + detalle extra de la consulta -->
          <div class="grid-gap">
            <textarea
              v-model.trim="form.descripcion"
              rows="3"
              placeholder="Descripción breve de la consulta"
            ></textarea>
            <textarea
              v-model.trim="form.detalleExtra"
              rows="4"
              placeholder="Detalle adicional de la consulta (opcional)"
            ></textarea>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:.5rem;">
            <input v-model.trim="form.cru" placeholder="CRU/Extensión (opcional)">
            <input v-model.trim="form.categoriaConsulta" placeholder="Categoría (opcional)">
          </div>

          <div style="display:flex; gap:.5rem; align-items:center;">
            <button :disabled="submitting" @click="createTicket">
              {{ submitting ? 'Creando…' : 'Crear ticket' }}
            </button>
            <span class="text-success" v-if="okMsg">{{ okMsg }}</span>
            <span class="text-danger" v-if="errMsg">{{ errMsg }}</span>
          </div>
        </div>
      </fieldset>
    </section>
  </main>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ticketsApi, studentsApi, receptionTicketsApi, manageApi } from '../api'
import { useRouter } from 'vue-router'

const router = useRouter()

const q = ref('')
const results = ref([])
const searching = ref(false)

const newS = ref({ nombre: '', apellido: '', cedula: '', email: '', facultad: '' })
const creating = ref(false)
const createMsg = ref('')
const createErr = ref('')

const student = ref(null)

const tipos = ref([])
const facultades = ref([])

// formulario de ticket
const form = ref({
  tipoId: '',
  asunto: '',
  descripcion: '',
  detalleExtra: '',
  cru: '',
  categoriaConsulta: ''
})
const submitting = ref(false)
const okMsg = ref('')
const errMsg = ref('')

// asunto rápido (select) + "Otros"
const asuntoPreset = ref('')

async function search () {
  searching.value = true
  results.value = []
  try {
    const j = await studentsApi.search(q.value)
    results.value = j.students || []
  } catch (e) {
    console.error(e)
  } finally {
    searching.value = false
  }
}

function pickStudent (s) {
  student.value = s
  okMsg.value = ''
  errMsg.value = ''
}

async function createStudent () {
  createMsg.value = ''
  createErr.value = ''
  if (!newS.value.nombre || !newS.value.apellido || !newS.value.cedula || !newS.value.email) {
    createErr.value = 'Completa nombre, apellido, cédula y email'
    return
  }
  creating.value = true
  try {
    const j = await studentsApi.create(newS.value)
    student.value = j.student
    createMsg.value = 'Estudiante creado'
    newS.value = { nombre: '', apellido: '', cedula: '', email: '', facultad: '' }
  } catch (e) {
    createErr.value = String(e?.message || e)
  } finally {
    creating.value = false
  }
}

function syncAsuntoFromPreset () {
  if (asuntoPreset.value && asuntoPreset.value !== '_other') {
    form.value.asunto = asuntoPreset.value
  } else if (asuntoPreset.value === '_other') {
    form.value.asunto = ''
  }
}

async function createTicket () {
  okMsg.value = ''
  errMsg.value = ''

  if (!student.value?.id || !form.value.tipoId || !form.value.asunto || !form.value.descripcion) {
    errMsg.value = 'Completa departamento, asunto y descripción'
    return
  }

  submitting.value = true
  try {
    const descripcionFinal = form.value.detalleExtra
      ? `${form.value.descripcion}\n\nDetalle adicional:\n${form.value.detalleExtra}`
      : form.value.descripcion

    await receptionTicketsApi.createForStudent({
      studentId: student.value.id,
      tipoId: form.value.tipoId,
      asunto: form.value.asunto,
      descripcion: descripcionFinal,
      cru: form.value.cru || null,
      categoriaConsulta: form.value.categoriaConsulta || null
    })

    okMsg.value = 'Ticket creado'
    setTimeout(() => router.push({ name: 'inbox-reception' }), 600)
  } catch (e) {
    errMsg.value = String(e?.message || e)
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  try {
    const j1 = await ticketsApi.getTypes()
    tipos.value = j1.tipos || []

    const j2 = await manageApi.getFacultades()
    facultades.value = Array.isArray(j2?.facultades) ? j2.facultades : []
  } catch (e) {
    console.error('Error inicial:', e)
  }
})
</script>
