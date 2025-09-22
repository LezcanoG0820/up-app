<template>
  <main style="padding: 2rem; font-family: system-ui, Arial;">
    <h1>UP • SIU (Frontend)</h1>
    <p>Conexión a la API:</p>

    <div style="margin-top: 1rem; padding: 1rem; border: 1px solid #ccc; border-radius: 8px;">
      <button @click="checkApi" :disabled="loading">
        {{ loading ? 'Consultando…' : 'Probar /db-check' }}
      </button>

      <pre v-if="result" style="margin-top: 1rem; background:#111; color:#0f0; padding:1rem; border-radius:8px; overflow:auto;">
{{ result }}
      </pre>

      <p v-if="error" style="color:crimson; margin-top:1rem;">{{ error }}</p>
    </div>
  </main>
</template>

<script setup>
import { ref } from 'vue'

const loading = ref(false)
const result = ref('')
const error = ref('')

async function checkApi () {
  loading.value = true
  result.value = ''
  error.value = ''
  try {
    const res = await fetch('/api/db-check')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    result.value = JSON.stringify(data, null, 2)
  } catch (e) {
    error.value = String(e?.message || e)
  } finally {
    loading.value = false
  }
}
</script>
