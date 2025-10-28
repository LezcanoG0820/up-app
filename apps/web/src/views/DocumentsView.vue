<template>
  <main style="padding:1rem; max-width:1100px; margin:auto;">
    <h1 style="margin:0 0 .75rem 0;">Gestión de documentos</h1>

    <section class="grid-gap" style="margin-bottom:1rem;">
      <div class="grid-gap" style="grid-template-columns: 1fr auto;">
        <input v-model.trim="q" placeholder="Buscar por título o nombre de archivo…" @keyup.enter="load" />
        <button class="btn-secondary" @click="load">Buscar</button>
      </div>

      <fieldset v-if="canUpload" class="grid-gap">
        <legend><strong>Subir documento</strong></legend>
        <input v-model.trim="title" placeholder="Título (opcional)" />
        <input type="file" @change="onPick" />
        <div style="display:flex; gap:.5rem; align-items:center;">
          <button :disabled="!file || uploading" @click="doUpload">
            {{ uploading ? 'Subiendo…' : 'Subir' }}
          </button>
          <span v-if="uploadMsg" class="text-success">{{ uploadMsg }}</span>
          <span v-if="error" class="text-danger">{{ error }}</span>
        </div>
        <div v-if="file" class="text-muted" style="font-size:.9rem;">
          Seleccionado: {{ file?.name }} ({{ prettyBytes(file?.size) }})
        </div>
      </fieldset>
    </section>

    <section>
      <template v-if="loading && docs.length === 0">
        Cargando…
      </template>

      <template v-else>
        <table v-if="docs.length">
          <thead>
            <tr>
              <th style="width:28%;">Título / Archivo</th>
              <th style="width:16%;">Subido por</th>
              <th style="width:15%;">Creado</th>
              <th style="width:17%;">Últ. visto</th>
              <th style="width:10%;">Tamaño</th>
              <th style="width:14%;">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in docs" :key="d.id">
              <td>
                <div style="font-weight:600;">{{ d.title || '—' }}</div>
                <div class="text-muted" style="font-size:.9rem;">{{ d.originalName }}</div>
              </td>
              <td>
                <div>{{ d.uploadedByName || '—' }}</div>
                <div class="text-muted" style="font-size:.85rem;">ID {{ d.uploadedById ?? '—' }}</div>
              </td>
              <td>
                <div>{{ fmt(d.createdAt) }}</div>
              </td>
              <td>
                <div>{{ d.lastViewedAt ? fmt(d.lastViewedAt) : '—' }}</div>
                <div v-if="d.lastViewedByName" class="text-muted" style="font-size:.85rem;">
                  por {{ d.lastViewedByName }}
                </div>
              </td>
              <td>{{ prettyBytes(d.size) }}</td>
              <td style="white-space:nowrap; display:flex; gap:.5rem;">
                <button class="btn-secondary" @click="openDoc(d)">Ver</button>
                <a :href="downloadUrl(d.id)" target="_blank" rel="noopener">
                  <button class="btn-secondary" type="button">Descargar</button>
                </a>
                <button 
                  v-if="canUpload" 
                  class="btn-secondary" 
                  @click="removeDoc(d)" 
                  :disabled="removingId === d.id"
                  title="Eliminar">
                  {{ removingId === d.id ? 'Eliminando…' : 'Eliminar' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <p v-else class="text-muted">No hay documentos.</p>
      </template>
    </section>
  </main>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { session } from '../store/session'
import { documentsApi } from '../api'

const docs = ref([])
const loading = ref(false)
const error = ref('')
const q = ref('')

const file = ref(null)
const title = ref('')
const uploading = ref(false)
const uploadMsg = ref('')
const removingId = ref(0)

const canUpload = computed(() => {
  const r = session.user?.rol
  return r === 'recepcion' || r === 'admin'
})

function fmt(ts) {
  try {
    const d = typeof ts === 'number' ? new Date(ts) : new Date(ts)
    return d.toLocaleString()
  } catch { return '—' }
}
function prettyBytes(bytes = 0) {
  const b = Number(bytes) || 0
  if (b < 1024) return `${b} B`
  const kb = b / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  const mb = kb / 1024
  if (mb < 1024) return `${mb.toFixed(1)} MB`
  const gb = mb / 1024
  return `${gb.toFixed(1)} GB`
}
function downloadUrl(id) {
  return documentsApi.downloadUrl(id)
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const { documents } = await documentsApi.list({ q: q.value || undefined })
    docs.value = Array.isArray(documents) ? documents : []
  } catch (e) {
    error.value = String(e?.message || e)
  } finally {
    loading.value = false
  }
}

function onPick(e) {
  const f = e.target.files?.[0]
  file.value = f || null
  uploadMsg.value = ''
}

async function doUpload() {
  if (!file.value) return
  uploading.value = true
  error.value = ''
  uploadMsg.value = ''
  try {
    await documentsApi.upload({ file: file.value, title: title.value })
    title.value = ''
    file.value = null
    uploadMsg.value = 'Documento subido'
    await load()
  } catch (e) {
    error.value = String(e?.message || e)
  } finally {
    uploading.value = false
  }
}

async function openDoc(d) {
  try {
    await documentsApi.view(d.id)
  } catch {}
  if (d.path) {
    window.open(d.path, '_blank', 'noopener')
  } else {
    window.open(downloadUrl(d.id), '_blank', 'noopener')
  }
}

async function removeDoc(d) {
  if (!confirm(`Eliminar "${d.originalName}"?`)) return
  removingId.value = d.id
  error.value = ''
  try {
    await documentsApi.remove(d.id)
    await load()
  } catch (e) {
    error.value = String(e?.message || e)
  } finally {
    removingId.value = 0
  }
}

onMounted(load)
</script>
