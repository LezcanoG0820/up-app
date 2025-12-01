<!-- apps/web/src/views/DocumentsView.vue -->
<template>
  <main class="grid-gap" style="max-width: 1000px; margin: auto;">
    <header class="grid-gap">
      <h1 style="margin: 0;">Documentos</h1>
      <p class="text-muted" style="margin: 0;">
        Gestiona los documentos compartidos entre recepción y departamentos.
      </p>
    </header>

    <!-- Zona de subida -->
    <section class="card grid-gap">
      <h2 style="margin: 0 0 .5rem 0; font-size: 1.1rem;">Subir documento</h2>

      <div class="grid-gap" style="max-width: 700px;">
        <input
          v-model.trim="uploadTitle"
          type="text"
          placeholder="Título (opcional, por defecto se usa el nombre del archivo)"
        />

        <!-- Selector de departamento solo para admin/recepción -->
        <div v-if="canChooseDepartment" class="grid-gap">
          <label style="font-weight: 500;">Departamento destino (opcional)</label>
          <select v-model="uploadDepartmentId">
            <option value="">Sin departamento específico</option>
            <option
              v-for="d in departments"
              :key="d.id"
              :value="String(d.id)"
            >
              {{ d.nombre }}
            </option>
          </select>
        </div>

        <div style="display: flex; gap: .5rem; flex-wrap: wrap; align-items: center;">
          <input type="file" @change="onFileChange" />
          <button :disabled="uploading || !uploadFile" @click="doUpload">
            {{ uploading ? 'Subiendo…' : 'Subir' }}
          </button>
          <span class="text-danger" v-if="uploadError">{{ uploadError }}</span>
          <span class="text-success" v-if="uploadOk">{{ uploadOk }}</span>
        </div>
      </div>
    </section>

    <!-- Filtros sencillos -->
    <section class="card grid-gap">
      <div style="display: flex; gap: .75rem; flex-wrap: wrap; align-items: center;">
        <strong>Filtros:</strong>

        <button
          class="btn-secondary"
          :disabled="loading"
          @click="reloadAll"
        >
          Todos
        </button>

        <button
          class="btn-secondary"
          :disabled="loading"
          @click="reloadMine"
        >
          Mis documentos
        </button>
      </div>
    </section>

    <!-- Tabla de documentos -->
    <section class="card">
      <div v-if="loading" class="text-muted">Cargando documentos…</div>
      <div v-else-if="documents.length === 0" class="text-muted">
        No hay documentos registrados.
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
  </main>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { documentsApi, manageApi } from '../api';
import { session } from '../store/session';

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

// Departamentos para admin/recepción
const departments = ref([]);

// Edición de título
const editingId = ref(null);
const editTitle = ref('');

// Usuario actual
const user = computed(() => session.user || null);
const canChooseDepartment = computed(() => {
  return user.value && (user.value.rol === 'admin' || user.value.rol === 'recepcion');
});

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
   Acciones sobre documentos
   ======================== */

async function viewDoc(doc) {
  try {
    await documentsApi.view(doc.id);
  } catch (e) {
    console.error(e);
  }
  const url = documentsApi.downloadUrl(doc.id);
  window.open(url, '_blank');
}

function downloadDoc(doc) {
  const url = documentsApi.downloadUrl(doc.id);
  window.open(url, '_blank');
}

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
   Utilidades
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

/* ========================
   Carga inicial
   ======================== */

onMounted(async () => {
  // Cargar departamentos solo para admin/recepción
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
