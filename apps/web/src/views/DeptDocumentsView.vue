<template>
  <main class="grid-gap" style="max-width:1000px; margin:auto;">
    <header class="grid-gap" style="align-items:center;">
      <h1 style="margin:0;">Documentos del Departamento</h1>
      <div style="display:flex; gap:.5rem; flex-wrap:wrap;">
        <input
          v-model.trim="q"
          placeholder="Buscar por título o nombre de archivo"
          @keyup.enter="load"
          style="max-width:340px;"
        >
        <button class="btn-secondary" @click="load">Buscar</button>
        <button @click="openUpload = !openUpload">
          {{ openUpload ? 'Cerrar subida' : 'Subir documento' }}
        </button>
      </div>
    </header>

    <section v-if="openUpload" class="grid-gap">
      <h3 style="margin:0;">Nueva subida</h3>
      <input v-model.trim="title" placeholder="Título descriptivo">
      <div style="display:flex; gap:.5rem; align-items:center; flex-wrap:wrap;">
        <input type="file" @change="onFile" />
        <button :disabled="!file || !title || uploading" @click="upload">
          {{ uploading ? 'Subiendo…' : 'Subir' }}
        </button>
        <span class="text-danger" v-if="upErr">{{ upErr }}</span>
        <span class="text-success" v-if="upMsg">{{ upMsg }}</span>
      </div>
      <p class="text-muted">El documento se asociará automáticamente a tu departamento.</p>
    </section>

    <section>
      <table>
        <thead>
          <tr>
            <th style="width:36px;">#</th>
            <th>Título</th>
            <th>Archivo</th>
            <th>Subido por</th>
            <th>Creado</th>
            <th>Visto</th>
            <th>Editado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading"><td colspan="8">Cargando…</td></tr>
          <tr v-else-if="!docs.length"><td colspan="8">Sin documentos.</td></tr>
          <tr v-for="d in docs" :key="d.id">
            <td>{{ d.id }}</td>
            <td>{{ d.title }}</td>
            <td>
              <a :href="downloadUrl(d.id)">{{ d.originalName }}</a>
              <div class="text-muted" style="font-size:.85rem;">
                {{ d.mime || '-' }} · {{ formatSize(d.size) }}
              </div>
            </td>
            <td>
              {{ d.uploader?.nombre }} {{ d.uploader?.apellido }}
              <span v-if="d.uploader?.rol">({{ d.uploader?.rol }})</span>
            </td>
            <td>{{ formatDT(d.createdAt) }}</td>
            <td>{{ d.lastViewedAt ? formatDT(d.lastViewedAt) : '-' }}</td>
            <td>{{ d.lastEditedAt ? formatDT(d.lastEditedAt) : '-' }}</td>
            <td style="display:flex; gap:.5rem; flex-wrap:wrap;">
              <button class="btn-secondary" @click="viewDoc(d)">Ver</button>
              <button class="btn-secondary" @click="copyLink(d)">Copiar link</button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- Visor -->
    <section v-if="viewer.open" class="grid-gap">
      <h3 style="margin:0;">Vista previa — {{ viewer.doc?.originalName }}</h3>
      <div v-if="isExcel(viewer.doc)" class="grid-gap">
        <p class="text-muted">Vista previa de Excel (solo lectura). Para edición completa, descarga el archivo.</p>
        <div v-html="excelHtml"></div>
      </div>
      <div v-else-if="isPDF(viewer.doc)" style="height:70vh;">
        <embed :src="downloadUrl(viewer.doc.id)" type="application/pdf"
               style="width:100%; height:100%; border:1px solid var(--border); border-radius:var(--radius);" />
      </div>
      <div v-else-if="isImage(viewer.doc)">
        <img :src="downloadUrl(viewer.doc.id)"
             style="max-width:100%; border:1px solid var(--border); border-radius:var(--radius);" />
      </div>
      <div v-else>
        <p>No hay vista previa disponible para este tipo de archivo. Puedes descargarlo.</p>
      </div>
    </section>
  </main>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { documentsApi } from '../api'
import * as XLSX from 'xlsx'

const docs = ref([])
const loading = ref(false)
const q = ref('')

// subida
const openUpload = ref(false)
const title = ref('')
const file = ref(null)
const uploading = ref(false)
const upErr = ref('')
const upMsg = ref('')

// visor
const viewer = ref({ open: false, doc: null })
const excelHtml = ref('')

function formatDT(s){ try{ return new Date(s).toLocaleString() }catch{ return '-' } }
function formatSize(n){ if(!n) return '-'; if(n<1024) return n+' B'; if(n<1024*1024) return (n/1024).toFixed(1)+' KB'; return (n/1024/1024).toFixed(1)+' MB' }
function isPDF(d){ return (d?.mime||'').includes('pdf') }
function isImage(d){ return (d?.mime||'').startsWith('image/') }
function isExcel(d){
  const m=(d?.mime||'').toLowerCase()
  return m.includes('spreadsheetml') || m.includes('excel')
      || d?.originalName?.toLowerCase().endsWith('.xlsx')
      || d?.originalName?.toLowerCase().endsWith('.xls')
}
function downloadUrl(id){ return documentsApi.downloadUrl(id) }

async function load(){
  loading.value = true
  try{
    const j = await documentsApi.list({ q: q.value })
    docs.value = j.documents || []
  }catch(e){ console.error(e) }
  finally{ loading.value = false }
}
function onFile(ev){ file.value = ev.target.files?.[0] || null }

async function upload(){
  if(!file.value || !title.value) return
  uploading.value = true
  upErr.value = ''; upMsg.value=''
  try{
    await documentsApi.upload({ file: file.value, title: title.value })
    title.value=''; file.value=null
    upMsg.value='Subido'
    await load()
  }catch(e){ upErr.value = String(e?.message||e) }
  finally{ uploading.value=false }
}

async function viewDoc(d){
  viewer.value = { open: true, doc: d }
  excelHtml.value = ''
  try{
    await documentsApi.view(d.id) // marca última visualización
  }catch{}
  if(isExcel(d)){
    try{
      const resp = await fetch(downloadUrl(d.id), { credentials:'include' })
      const blob = await resp.blob()
      const ab = await blob.arrayBuffer()
      const wb = XLSX.read(ab)
      const first = wb.SheetNames[0]
      const html = XLSX.utils.sheet_to_html(wb.Sheets[first], { editable:false })
      excelHtml.value = html
    }catch(e){
      excelHtml.value = `<p class="text-danger">No se pudo renderizar Excel. Descarga el archivo.</p>`
    }
  }
}

function copyLink(d){
  const url = downloadUrl(d.id)
  navigator.clipboard.writeText(window.location.origin + url).then(() => {
    alert('Link copiado')
  })
}

onMounted(load)
</script>
