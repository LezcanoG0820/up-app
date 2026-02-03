<template>
  <main class="grid-gap" style="max-width: 1100px; margin: auto;">
    <header>
      <h1 style="margin: 0;">Documentos</h1>
    </header>

    <!-- Subida de documentos -->
    <section class="card">
      <h2 style="margin: 0 0 .75rem;">Subir nuevo documento</h2>
      <div class="grid-gap">
        <input
          v-model.trim="uploadTitle"
          type="text"
          placeholder="Título del documento (opcional)"
        />
        <select v-if="canChooseDepartment" v-model="uploadDepartmentId">
          <option value="">— Sin departamento —</option>
          <option v-for="d in departments" :key="d.id" :value="d.id">
            {{ d.nombre }}
          </option>
        </select>
        <input type="file" @change="onFileChange" />
        <button :disabled="!uploadFile || uploading" @click="doUpload">
          {{ uploading ? 'Subiendo…' : 'Subir' }}
        </button>
        <p class="text-success" v-if="uploadOk">{{ uploadOk }}</p>
        <p class="text-danger" v-if="uploadError">{{ uploadError }}</p>
      </div>
    </section>

    <!-- Lista de documentos -->
    <section class="card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: .75rem;">
        <h2 style="margin: 0;">Documentos existentes</h2>
        <div style="display: flex; gap: .5rem;">
          <button class="btn-secondary" @click="reloadAll">Todos</button>
          <button class="btn-secondary" @click="reloadMine">Mis documentos</button>
        </div>
      </div>

      <div v-if="loading" style="padding: 1rem; text-align: center;">
        Cargando documentos…
      </div>

      <div v-else-if="!documents.length" style="padding: 1rem; text-align: center;" class="text-muted">
        No hay documentos.
      </div>

      <div v-else style="overflow: auto;">
        <table>
          <thead>
            <tr>
              <th>Título</th>
              <th>Archivo</th>
              <th>Departamento</th>
              <th>Subido por</th>
              <th>Fecha</th>
              <th style="min-width: 190px;">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="doc in documents" :key="doc.id">
              <td>
                <span v-if="!isEditing(doc.id)">{{ doc.title }}</span>
                <input
                  v-else
                  v-model.trim="editTitle"
                  type="text"
                  style="max-width: 230px;"
                />
              </td>
              <td>{{ doc.originalName || doc.filename }}</td>
              <td>{{ doc.departmentNombre || '—' }}</td>
              <td>{{ doc.uploaderNombre || '—' }}</td>
              <td>{{ formatDate(doc.createdAt) }}</td>
              <td>
                <div style="display: flex; flex-wrap: wrap; gap: .25rem;">
                  <button class="btn-secondary" @click="viewDoc(doc)">Ver</button>
                  <button class="btn-secondary" @click="downloadDoc(doc)">Descargar</button>

                  <button
                    class="btn-secondary"
                    v-if="!isEditing(doc.id)"
                    @click="startEdit(doc)"
                  >
                    Renombrar
                  </button>
                  <button
                    class="btn-secondary"
                    v-else
                    @click="saveEdit(doc)"
                  >
                    Guardar
                  </button>
                  <button
                    class="btn-secondary"
                    v-if="isEditing(doc.id)"
                    @click="cancelEdit"
                  >
                    Cancelar
                  </button>

                  <button class="btn-secondary" @click="removeDoc(doc)">
                    Eliminar
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="text-danger" v-if="listError" style="margin-top: .5rem;">{{ listError }}</p>
    </section>

    <!-- Visor de documentos -->
    <section v-if="viewer.open" class="card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <h3 style="margin: 0;">Vista previa — {{ viewer.doc?.originalName }}</h3>
        <button class="btn-secondary" @click="closeViewer">Cerrar vista previa</button>
      </div>

      <!-- Preview de Excel (igual que PDF) -->
      <div v-if="isExcel(viewer.doc)" style="height: 70vh;">
        <p class="text-muted" style="margin-bottom: 0.5rem;">Vista previa de Excel (solo lectura). Para edición completa, descarga el archivo.</p>
        <div 
          v-html="excelHtml" 
          style="width: 100%; height: calc(100% - 30px); overflow: auto; border: 1px solid var(--border); border-radius: var(--radius); padding: 1rem; background: white;"
        ></div>
      </div>

      <!-- Preview de PDF -->
      <div v-else-if="isPDF(viewer.doc)" style="height: 70vh;">
        <iframe
          :src="previewUrl(viewer.doc.id)"
          type="application/pdf"
          style="width: 100%; height: 100%; border: 1px solid var(--border); border-radius: var(--radius);"
        >
          Tu navegador no soporta vista previa de PDFs. <a :href="downloadUrl(viewer.doc.id)" target="_blank">Descargar PDF</a>
        </iframe>
      </div>

      <!-- Preview de imágenes -->
      <div v-else-if="isImage(viewer.doc)">
        <img
          :src="previewUrl(viewer.doc.id)"
          alt="Preview"
          style="max-width: 100%; border: 1px solid var(--border); border-radius: var(--radius);"
        />
      </div>

      <!-- Sin preview disponible -->
      <div v-else>
        <p>No hay vista previa disponible para este tipo de archivo. Puedes descargarlo usando el botón "Descargar".</p>
      </div>
    </section>
  </main>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { documentsApi, manageApi } from '../api';
import { session } from '../store/session';
import * as XLSX from 'xlsx';

const documents = ref([]);
const loading = ref(false);
const listError = ref('');

// Datos de subida
const uploadTitle = ref('');
const uploadFile = ref(null);
const uploadDepartmentId = ref('');
const uploading = ref(false);
const uploadError = ref('');
const uploadOk = ref('');

// Departamentos para maestro/recepción
const departments = ref([]);

// Edición de título
const editingId = ref(null);
const editTitle = ref('');

// Visor de documentos
const viewer = ref({ open: false, doc: null });
const excelHtml = ref('');

// Usuario actual
const user = computed(() => session.user || null);
const canChooseDepartment = computed(() => {
  return user.value && (user.value.rol === 'maestro' || user.value.rol === 'recepcion');
});

/* ========================
   Utilidades de formato
   ======================== */

function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

function isPDF(d) {
  return (d?.mime || '').includes('pdf');
}

function isImage(d) {
  return (d?.mime || '').startsWith('image/');
}

function isExcel(d) {
  const m = (d?.mime || '').toLowerCase();
  return (
    m.includes('spreadsheetml') ||
    m.includes('excel') ||
    d?.originalName?.toLowerCase().endsWith('.xlsx') ||
    d?.originalName?.toLowerCase().endsWith('.xls')
  );
}

function downloadUrl(id) {
  return documentsApi.downloadUrl(id);
}

function previewUrl(id) {
  return documentsApi.previewUrl(id);
}

/* ========================
   Carga de documentos
   ======================== */

async function loadDocuments(params = {}) {
  loading.value = true;
  listError.value = '';
  try {
    const j = await documentsApi.list(params);
    const arr = j?.documents || j?.docs || [];
    documents.value = Array.isArray(arr) ? arr : [];
  } catch (e) {
    console.error(e);
    listError.value = String(e?.message || e);
  } finally {
    loading.value = false;
  }
}

function reloadAll() {
  loadDocuments({});
}

function reloadMine() {
  loadDocuments({ scope: 'mine' });
}

/* ========================
   Subida de archivos
   ======================== */

function onFileChange(e) {
  const files = e.target.files;
  uploadFile.value = files && files[0] ? files[0] : null;
  uploadError.value = '';
  uploadOk.value = '';
}

async function doUpload() {
  uploadError.value = '';
  uploadOk.value = '';

  if (!uploadFile.value) {
    uploadError.value = 'Selecciona un archivo';
    return;
  }

  uploading.value = true;
  try {
    const payload = {
      file: uploadFile.value,
      title: uploadTitle.value || undefined
    };

    if (canChooseDepartment.value && uploadDepartmentId.value) {
      payload.departmentId = uploadDepartmentId.value;
    }

    const j = await documentsApi.upload(payload);
    const doc = j?.document;
    if (doc) {
      documents.value.unshift(doc);
    }

    uploadOk.value = 'Documento subido';
    uploadTitle.value = '';
    uploadFile.value = null;
    uploadDepartmentId.value = '';
  } catch (e) {
    console.error(e);
    uploadError.value = String(e?.message || e);
  } finally {
    uploading.value = false;
  }
}

/* ========================
   Visor de documentos
   ======================== */

async function viewDoc(doc) {
  viewer.value = { open: true, doc };
  excelHtml.value = '';

  try {
    await documentsApi.view(doc.id); // Marca como visto
  } catch (e) {
    console.error('Error marcando como visto:', e);
  }

  if (isExcel(doc)) {
    try {
      const resp = await fetch(previewUrl(doc.id), { credentials: 'include' });
      const blob = await resp.blob();
      const ab = await blob.arrayBuffer();
      const wb = XLSX.read(ab);
      const first = wb.SheetNames[0];
      const html = XLSX.utils.sheet_to_html(wb.Sheets[first], { editable: false });
      excelHtml.value = html;
    } catch (e) {
      console.error('Error renderizando Excel:', e);
      excelHtml.value = '<p class="text-danger">No se pudo renderizar Excel. Descarga el archivo.</p>';
    }
  }
}

function closeViewer() {
  viewer.value = { open: false, doc: null };
  excelHtml.value = '';
}

function downloadDoc(doc) {
  const url = downloadUrl(doc.id);
  window.open(url, '_blank');
}

/* ========================
   Edición de documentos
   ======================== */

function isEditing(id) {
  return editingId.value === id;
}

function startEdit(doc) {
  editingId.value = doc.id;
  editTitle.value = doc.title || doc.originalName || '';
}

function cancelEdit() {
  editingId.value = null;
  editTitle.value = '';
}

async function saveEdit(doc) {
  if (!editTitle.value.trim()) {
    return;
  }
  try {
    const j = await documentsApi.rename(doc.id, { title: editTitle.value.trim() });
    const updated = j?.document;
    if (updated) {
      const idx = documents.value.findIndex(d => d.id === doc.id);
      if (idx !== -1) {
        documents.value[idx] = updated;
      }
    }
    cancelEdit();
  } catch (e) {
    console.error(e);
  }
}

async function removeDoc(doc) {
  const ok = window.confirm(`¿Eliminar el documento "${doc.title || doc.originalName}"?`);
  if (!ok) return;
  try {
    await documentsApi.remove(doc.id);
    documents.value = documents.value.filter(d => d.id !== doc.id);
  } catch (e) {
    console.error(e);
  }
}

/* ========================
   Carga inicial
   ======================== */

onMounted(async () => {
  // Cargar departamentos solo para maestro/recepción
  if (canChooseDepartment.value) {
    try {
      const j = await manageApi.departments();
      departments.value = j?.departments || [];
    } catch (e) {
      console.error('Error cargando departamentos:', e);
    }
  }

  await loadDocuments({});
});
</script>