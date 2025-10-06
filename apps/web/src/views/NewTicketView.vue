<template>
  <main style="padding:2rem; max-width:800px; margin:auto;">
    <h1>Nueva Consulta</h1>

    <!-- Datos del estudiante (solo lectura) -->
    <section style="background:#f7f7f7; padding:1rem; border-radius:8px; margin-bottom:1rem;">
      <h3>Datos del estudiante</h3>
      <div style="display:grid; gap:.5rem; grid-template-columns: repeat(2, minmax(200px, 1fr));">
        <label>Nombre
          <input :value="session.user?.nombre || ''" readonly />
        </label>
        <label>Apellido
          <input :value="session.user?.apellido || ''" readonly />
        </label>
        <label>Cédula
          <input :value="session.user?.cedula || ''" readonly />
        </label>
        <label>Facultad
          <input :value="session.user?.facultad || ''" readonly />
        </label>
      </div>
      <small style="color:#666;">Si algún dato está incorrecto, contacta a recepción.</small>
    </section>

    <!-- Formulario de la consulta -->
    <form @submit.prevent="submit" style="display:grid; gap:.75rem;">
      <label>Tipo de consulta
        <select v-model="tipoId" required>
          <option value="" disabled>Selecciona el tipo de consulta</option>
          <option v-for="t in tipos" :key="t.id" :value="t.id">
            {{ t.nombre }}
          </option>
        </select>
      </label>

      <label>Categoría de consulta
        <select v-model="categoriaConsulta" required>
          <option value="" disabled>Selecciona la categoría</option>
          <option v-for="c in CATEGORIAS" :key="c" :value="c">
            {{ c }}
          </option>
        </select>
      </label>

      <label>Centro Regional Universitario (CRU)
        <select v-model="cru" required>
          <option value="" disabled>Selecciona tu CRU/Extensión</option>
          <option v-for="c in crus" :key="c.slug" :value="c.nombre">
            {{ c.nombre }}
          </option>
        </select>
      </label>

      <label>Asunto
        <input v-model.trim="asunto" required />
      </label>

      <label>Descripción
        <textarea v-model.trim="descripcion" rows="5" required></textarea>
      </label>

      <button :disabled="loading || !formOk">
        {{ loading ? 'Enviando…' : 'Enviar consulta' }}
      </button>
    </form>

    <div v-if="okMsg" style="margin-top:1rem; padding:1rem; border:1px solid #4caf50; border-radius:8px;">
      {{ okMsg }}
    </div>
    <p v-if="error" style="color:crimson">{{ error }}</p>
  </main>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ticketsApi, manageApi } from '../api'
import { session } from '../store/session'

/* Categorías de consulta (puedes ajustar los nombres cuando quieras) */
const CATEGORIAS = [
  'Atención',
  'Resultados',
  'Pagos',
  'Matrícula',
  'Comunicación de facultad',
  'Procedimientos',
  'Tiempos de respuesta',
]

const tipos = ref([])
const crus = ref([])

const tipoId = ref('')
const categoriaConsulta = ref('')
const cru = ref('')
const asunto = ref('')
const descripcion = ref('')

const loading = ref(false)
const error = ref('')
const okMsg = ref('')

const formOk = computed(() =>
  String(tipoId.value).length > 0 &&
  String(categoriaConsulta.value).length > 0 &&
  String(cru.value).length > 0 &&
  String(asunto.value).trim().length > 0 &&
  String(descripcion.value).trim().length > 0
)

onMounted(async () => {
  try {
    const [{ tipos: list }, { crus: cList }] = await Promise.all([
      ticketsApi.getTypes(),
      manageApi.getCRUs()
    ])
    tipos.value = list
    crus.value = cList
  } catch (e) {
    error.value = String(e?.message || e)
  }
})

async function submit() {
  if (!formOk.value) return
  loading.value = true
  error.value = ''
  okMsg.value = ''
  try {
    const payload = {
      tipoId: Number(tipoId.value),
      asunto: asunto.value,
      descripcion: descripcion.value,
      cru: cru.value || null,
      categoriaConsulta: categoriaConsulta.value || null
    }
    const { ticket } = await ticketsApi.create(payload)
    okMsg.value = `Ticket creado: ${ticket.token}`

    // reset form
    tipoId.value = ''
    categoriaConsulta.value = ''
    cru.value = ''
    asunto.value = ''
    descripcion.value = ''
  } catch (e) {
    error.value = String(e?.message || e)
  } finally {
    loading.value = false
  }
}
</script>
