<template>
  <main style="padding:2rem; max-width:740px; margin:auto;">
    <h1>Nuevo ticket</h1>
    <div v-if="error" style="color:crimson; margin:.5rem 0">{{ error }}</div>

    <form @submit.prevent="crear" style="display:grid; gap:.75rem; margin-top:1rem;">
      <!-- Tipo de consulta (rutéa al departamento) -->
      <label>
        Tipo de consulta
        <select v-model="tipoId" required>
          <option value="" disabled>Selecciona el tipo de consulta</option>
          <option v-for="t in tipos" :key="t.id" :value="t.id">{{ t.nombre }}</option>
        </select>
      </label>

      <!-- CRU/Ext del estudiante -->
      <label>
        Centro Regional Universitario (CRU) / Extensión
        <select v-model="cru" required>
          <option value="" disabled>Selecciona tu CRU/Extensión</option>
          <option v-for="c in crus" :key="c.slug" :value="c.nombre">{{ c.nombre }}</option>
        </select>
      </label>

      <!-- Es queja -->
      <label style="display:flex; align-items:center; gap:.5rem; margin-top:.5rem;">
        <input type="checkbox" v-model="esQueja" />
        Es una queja
      </label>

      <!-- Categoría de queja (visible sólo si Es queja) -->
      <div v-if="esQueja">
        <label>
          Categoría de queja
          <select v-model="categoriaQueja" required>
            <option value="" disabled>Selecciona la categoría</option>
            <option v-for="q in QUEJAS" :key="q" :value="q">{{ q }}</option>
          </select>
        </label>
      </div>

      <input v-model.trim="asunto" placeholder="Asunto" required />
      <textarea v-model.trim="descripcion" placeholder="Describe tu consulta" rows="5" required></textarea>

      <button :disabled="loading">{{ loading ? 'Enviando…' : 'Crear ticket' }}</button>
    </form>

    <div v-if="okMsg" style="margin-top:1rem; padding:1rem; border:1px solid #4caf50; border-radius:8px;">
      {{ okMsg }}
    </div>
  </main>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ticketsApi } from '../api'

// Categorías de quejas (puedes ajustar los nombres)
const QUEJAS = [
  'Queja por atención',
  'Queja por resultados',
  'Queja por pagos',
  'Queja por matrícula',
  'Queja por comunicación de facultad',
  'Queja sobre procedimientos',
  'Queja por tiempos de respuesta',
]

const tipos = ref([])
const crus = ref([])

const tipoId = ref('')
const cru = ref('')
const esQueja = ref(false)
const categoriaQueja = ref('')

const asunto = ref('')
const descripcion = ref('')
const loading = ref(false)
const error = ref('')
const okMsg = ref('')

onMounted(async () => {
  try {
    const [{ tipos: list }, { crus: cList }] = await Promise.all([
      ticketsApi.getTypes(),
      ticketsApi.getCRUs()
    ])
    tipos.value = list
    crus.value = cList
  } catch (e) {
    error.value = String(e?.message || e)
  }
})

async function crear() {
  loading.value = true
  error.value = ''
  okMsg.value = ''
  try {
    const payload = {
      tipoId: Number(tipoId.value),
      asunto: asunto.value,
      descripcion: descripcion.value,
      cru: cru.value || null,
      categoriaQueja: esQueja.value ? categoriaQueja.value : null
    }
    const { ticket } = await ticketsApi.create(payload)
    okMsg.value = `Ticket creado: ${ticket.token}`
    // reset
    tipoId.value = ''
    cru.value = ''
    esQueja.value = false
    categoriaQueja.value = ''
    asunto.value = ''
    descripcion.value = ''
  } catch (e) {
    error.value = String(e?.message || e)
  } finally {
    loading.value = false
  }
}
</script>
