<template>
  <main style="padding: 2rem; max-width: 1200px; margin: auto;">
    <h1>Gestión de Usuarios</h1>

    <!-- FILTROS DE BÚSQUEDA -->
    <section style="margin: 1.5rem 0; padding: 1rem; border: 1px solid #ddd; border-radius: 8px;">
      <div style="display: grid; gap: 1rem; grid-template-columns: 1fr 1fr auto;">
        <input 
          v-model="searchQuery" 
          placeholder="Buscar por nombre, apellido, email o cédula" 
          @input="loadUsers"
        />
        <select v-model="roleFilter" @change="loadUsers">
          <option value="">Todos los roles</option>
          <option value="admin">Admin</option>
          <option value="recepcion">Recepción</option>
          <option value="departamento">Departamento</option>
          <option value="estudiante">Estudiante</option>
        </select>
        <button @click="showCreateModal = true">Crear Usuario</button>
      </div>
    </section>

    <!-- MENSAJE DE ERROR -->
    <p v-if="error" style="color: crimson; margin: 1rem 0;">{{ error }}</p>

    <!-- LISTA DE USUARIOS -->
    <section v-if="loading">Cargando usuarios...</section>
    <section v-else-if="users.length === 0">No hay usuarios que mostrar.</section>
    <section v-else>
      <table style="width: 100%; border-collapse: collapse; margin-top: 1rem;">
        <thead>
          <tr>
            <th style="text-align: left; padding: 0.5rem; border-bottom: 2px solid #ddd;">ID</th>
            <th style="text-align: left; padding: 0.5rem; border-bottom: 2px solid #ddd;">Nombre</th>
            <th style="text-align: left; padding: 0.5rem; border-bottom: 2px solid #ddd;">Email</th>
            <th style="text-align: left; padding: 0.5rem; border-bottom: 2px solid #ddd;">Cédula</th>
            <th style="text-align: left; padding: 0.5rem; border-bottom: 2px solid #ddd;">Rol</th>
            <th style="text-align: left; padding: 0.5rem; border-bottom: 2px solid #ddd;">Departamento</th>
            <th style="text-align: left; padding: 0.5rem; border-bottom: 2px solid #ddd;">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.id">
            <td style="padding: 0.5rem; border-bottom: 1px solid #eee;">{{ user.id }}</td>
            <td style="padding: 0.5rem; border-bottom: 1px solid #eee;">{{ user.nombre }} {{ user.apellido }}</td>
            <td style="padding: 0.5rem; border-bottom: 1px solid #eee;">{{ user.email }}</td>
            <td style="padding: 0.5rem; border-bottom: 1px solid #eee;">{{ user.cedula }}</td>
            <td style="padding: 0.5rem; border-bottom: 1px solid #eee;">
              <span 
                style="padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.875rem;"
                :style="getRoleBadgeStyle(user.rol)"
              >
                {{ getRoleLabel(user.rol) }}
              </span>
            </td>
            <td style="padding: 0.5rem; border-bottom: 1px solid #eee;">
              {{ user.departamento?.nombre || '-' }}
            </td>
            <td style="padding: 0.5rem; border-bottom: 1px solid #eee;">
              <div style="display: flex; gap: 0.5rem;">
                <button @click="openEditModal(user)" style="font-size: 0.875rem;">Editar</button>
                <button 
                  @click="deleteUser(user)" 
                  style="font-size: 0.875rem; background-color: #dc3545; color: white;"
                >
                  Eliminar
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- MODAL CREAR USUARIO -->
    <div 
      v-if="showCreateModal" 
      style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;"
      @click.self="closeCreateModal"
    >
      <div style="background: #f5f5f5; padding: 2rem; border-radius: 8px; max-width: 500px; width: 90%; max-height: 90vh; overflow-y: auto; border: 1px solid #ccc; color: #1a1a1a;">
        <h2>Crear Nuevo Usuario</h2>
        <form @submit.prevent="createUser" style="display: grid; gap: 1rem; margin-top: 1rem;">
          <input v-model.trim="newUser.nombre" placeholder="Nombre" required />
          <input v-model.trim="newUser.apellido" placeholder="Apellido" required />
          <input v-model.trim="newUser.cedula" placeholder="Cédula" required />
          <input v-model.trim="newUser.email" placeholder="Email" type="email" required />
          
          <select v-model="newUser.rol" required>
            <option value="">Seleccione un rol</option>
            <option value="admin">Admin</option>
            <option value="recepcion">Recepción</option>
            <option value="departamento">Departamento</option>
          </select>

          <!-- Selector de departamento (solo si rol es "departamento") -->
          <select 
            v-if="newUser.rol === 'departamento'" 
            v-model="newUser.departamentoId" 
            required
          >
            <option value="">Seleccione un departamento</option>
            <option v-for="dept in departments" :key="dept.id" :value="dept.id">
              {{ dept.nombre }}
            </option>
          </select>

          <input v-model.trim="newUser.facultad" placeholder="Facultad (opcional)" />

          <p v-if="createError" style="color: crimson;">{{ createError }}</p>
          
          <!-- Mostrar contraseña temporal después de crear -->
          <div v-if="tempPassword" style="padding: 1rem; background: #d4edda; border: 1px solid #c3e6cb; border-radius: 4px;">
            <strong>Usuario creado exitosamente</strong><br/>
            <span>Contraseña temporal: <code style="background: #fff; padding: 0.25rem 0.5rem; border-radius: 3px;">{{ tempPassword }}</code></span><br/>
            <small style="color: #155724;">Comunique esta contraseña al usuario. Debe cambiarla en su primer login.</small>
          </div>

          <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
            <button type="button" @click="closeCreateModal" class="btn-secondary">Cancelar</button>
            <button type="submit" :disabled="creating">
              {{ creating ? 'Creando...' : 'Crear Usuario' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL EDITAR USUARIO -->
    <div 
      v-if="showEditModal" 
      style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;"
      @click.self="closeEditModal"
    >
      <div style="background: #f5f5f5; padding: 2rem; border-radius: 8px; max-width: 500px; width: 90%; max-height: 90vh; overflow-y: auto; border: 1px solid #ccc; color: #1a1a1a;">
        <h2>Editar Usuario</h2>
        <form @submit.prevent="updateUser" style="display: grid; gap: 1rem; margin-top: 1rem;">
          <input v-model.trim="editingUser.nombre" placeholder="Nombre" required />
          <input v-model.trim="editingUser.apellido" placeholder="Apellido" required />
          <input v-model.trim="editingUser.cedula" placeholder="Cédula" required />
          <input v-model.trim="editingUser.email" placeholder="Email" type="email" required />
          
          <select v-model="editingUser.rol" required>
            <option value="admin">Admin</option>
            <option value="recepcion">Recepción</option>
            <option value="departamento">Departamento</option>
            <option value="estudiante">Estudiante</option>
          </select>

          <!-- Selector de departamento (solo si rol es "departamento") -->
          <select 
            v-if="editingUser.rol === 'departamento'" 
            v-model="editingUser.departamentoId" 
            required
          >
            <option value="">Seleccione un departamento</option>
            <option v-for="dept in departments" :key="dept.id" :value="dept.id">
              {{ dept.nombre }}
            </option>
          </select>

          <input v-model.trim="editingUser.facultad" placeholder="Facultad (opcional)" />

          <p v-if="editError" style="color: crimson;">{{ editError }}</p>

          <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
            <button type="button" @click="closeEditModal" class="btn-secondary">Cancelar</button>
            <button type="submit" :disabled="updating">
              {{ updating ? 'Guardando...' : 'Guardar Cambios' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </main>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { usersApi, manageApi } from '../api'

// Estado general
const users = ref([])
const loading = ref(false)
const error = ref('')

// Filtros
const searchQuery = ref('')
const roleFilter = ref('')

// Departamentos
const departments = ref([])

// Modal crear
const showCreateModal = ref(false)
const creating = ref(false)
const createError = ref('')
const tempPassword = ref('')
const newUser = ref({
  nombre: '',
  apellido: '',
  cedula: '',
  email: '',
  rol: '',
  departamentoId: '',
  facultad: ''
})

// Modal editar
const showEditModal = ref(false)
const updating = ref(false)
const editError = ref('')
const editingUser = ref({
  id: null,
  nombre: '',
  apellido: '',
  cedula: '',
  email: '',
  rol: '',
  departamentoId: '',
  facultad: ''
})

// Cargar usuarios
async function loadUsers() {
  loading.value = true
  error.value = ''
  try {
    const filters = {
      ...(roleFilter.value && { rol: roleFilter.value }),
      ...(searchQuery.value && { q: searchQuery.value })
    }
    const { users: data } = await usersApi.list(filters)
    users.value = data || []
  } catch (e) {
    error.value = String(e?.message || e)
    users.value = []
  } finally {
    loading.value = false
  }
}

// Cargar departamentos
async function loadDepartments() {
  try {
    const { departments: data } = await manageApi.departments()
    departments.value = data || []
  } catch (e) {
    console.error('Error cargando departamentos:', e)
  }
}

// Crear usuario
async function createUser() {
  creating.value = true
  createError.value = ''
  tempPassword.value = ''
  
  try {
    const payload = {
      nombre: newUser.value.nombre,
      apellido: newUser.value.apellido,
      cedula: newUser.value.cedula,
      email: newUser.value.email,
      rol: newUser.value.rol,
      ...(newUser.value.departamentoId && { departamentoId: Number(newUser.value.departamentoId) }),
      ...(newUser.value.facultad && { facultad: newUser.value.facultad })
    }

    const response = await usersApi.create(payload)
    
    // Mostrar contraseña temporal
    tempPassword.value = response.tempPassword || 'Temporal#2025'
    
    // Recargar lista
    await loadUsers()
    
    // Resetear formulario
    newUser.value = {
      nombre: '',
      apellido: '',
      cedula: '',
      email: '',
      rol: '',
      departamentoId: '',
      facultad: ''
    }
    
    // No cerrar el modal inmediatamente para que vean la contraseña
  } catch (e) {
    createError.value = String(e?.message || e)
  } finally {
    creating.value = false
  }
}

// Abrir modal editar
function openEditModal(user) {
  editingUser.value = {
    id: user.id,
    nombre: user.nombre,
    apellido: user.apellido,
    cedula: user.cedula,
    email: user.email,
    rol: user.rol,
    departamentoId: user.departamentoId || '',
    facultad: user.facultad || ''
  }
  showEditModal.value = true
}

// Actualizar usuario
async function updateUser() {
  updating.value = true
  editError.value = ''
  
  try {
    const payload = {
      nombre: editingUser.value.nombre,
      apellido: editingUser.value.apellido,
      cedula: editingUser.value.cedula,
      email: editingUser.value.email,
      rol: editingUser.value.rol,
      departamentoId: editingUser.value.rol === 'departamento' 
        ? Number(editingUser.value.departamentoId) 
        : null,
      facultad: editingUser.value.facultad || null
    }

    await usersApi.update(editingUser.value.id, payload)
    await loadUsers()
    closeEditModal()
  } catch (e) {
    editError.value = String(e?.message || e)
  } finally {
    updating.value = false
  }
}

// Eliminar usuario
async function deleteUser(user) {
  if (!confirm(`¿Estás seguro de eliminar a ${user.nombre} ${user.apellido}?`)) {
    return
  }
  
  try {
    await usersApi.delete(user.id)
    await loadUsers()
  } catch (e) {
    error.value = String(e?.message || e)
  }
}

// Cerrar modales
function closeCreateModal() {
  showCreateModal.value = false
  createError.value = ''
  tempPassword.value = ''
  newUser.value = {
    nombre: '',
    apellido: '',
    cedula: '',
    email: '',
    rol: '',
    departamentoId: '',
    facultad: ''
  }
}

function closeEditModal() {
  showEditModal.value = false
  editError.value = ''
  editingUser.value = {
    id: null,
    nombre: '',
    apellido: '',
    cedula: '',
    email: '',
    rol: '',
    departamentoId: '',
    facultad: ''
  }
}

// Helpers de UI
function getRoleLabel(rol) {
  const labels = {
    admin: 'Admin',
    recepcion: 'Recepción',
    departamento: 'Departamento',
    estudiante: 'Estudiante'
  }
  return labels[rol] || rol
}

function getRoleBadgeStyle(rol) {
  const styles = {
    admin: 'background-color: #dc3545; color: white;',
    recepcion: 'background-color: #17a2b8; color: white;',
    departamento: 'background-color: #ffc107; color: black;',
    estudiante: 'background-color: #28a745; color: white;'
  }
  return styles[rol] || 'background-color: #6c757d; color: white;'
}

// Inicializar
onMounted(() => {
  loadUsers()
  loadDepartments()
})
</script>