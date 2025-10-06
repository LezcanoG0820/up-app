<template>
  <main style="padding:2rem; max-width:520px; margin:auto;">
    <h1>Crear cuenta (Estudiante)</h1>
    <form @submit.prevent="submit" style="display:grid; gap:.75rem; margin-top:1rem;">
      <input v-model.trim="nombre" placeholder="Nombre" required />
      <input v-model.trim="apellido" placeholder="Apellido" required />
      <input v-model.trim="cedula" placeholder="Cédula" required />
      <input v-model.trim="email" placeholder="Email" type="email" required />
      <input v-model="password" placeholder="Contraseña (min 10, mayúsc, minúsc, número)" type="password" required />

      <!-- Dropdown de facultades -->
      <select v-model="facultad" required>
        <option value="" disabled>Seleccione su Facultad</option>
        <option v-for="f in facultades" :key="f.slug" :value="f.nombre">
          {{ f.nombre }}
        </option>
      </select>

      <button :disabled="loading">{{ loading ? 'Creando…' : 'Crear cuenta' }}</button>
      <p v-if="error" style="color:crimson">{{ error }}</p>
    </form>
  </main>
</template>

<script setup>
import { ref } from 'vue'
import { authApi } from '../api'
import { loadSession } from '../store/session'
import { useRouter } from 'vue-router'

const router = useRouter()

// Campos del formulario
const nombre = ref('')
const apellido = ref('')
const cedula = ref('')
const email = ref('')
const password = ref('')
const facultad = ref('') // nuevo campo
const loading = ref(false)
const error = ref('')

// Lista de facultades
const facultades = [
  { slug: 'administracion-publica', nombre: 'Facultad de Administración Pública' },
  { slug: 'ciencias-agropecuarias', nombre: 'Facultad de Ciencias Agropecuarias' },
  { slug: 'arquitectura-diseno', nombre: 'Facultad de Arquitectura y Diseño' },
  { slug: 'ciencias-naturales-exactas-tecnologia', nombre: 'Facultad de Ciencias Naturales, Exactas y Tecnología' },
  { slug: 'derecho-ciencias-politicas', nombre: 'Facultad de Derecho y Ciencias Políticas' },
  { slug: 'humanidades', nombre: 'Facultad de Humanidades' },
  { slug: 'medicina-veterinaria', nombre: 'Facultad de Medicina Veterinaria' },
  { slug: 'medicina', nombre: 'Facultad de Medicina' },
  { slug: 'odontologia', nombre: 'Facultad de Odontología' },
  { slug: 'economia', nombre: 'Facultad de Economía' },
  { slug: 'administracion-empresas-contabilidad', nombre: 'Facultad de Administración de Empresas y Contabilidad' },
  { slug: 'comunicacion-social', nombre: 'Facultad de Comunicación Social' },
  { slug: 'ciencias-educacion', nombre: 'Facultad de Ciencias de la Educación' },
  { slug: 'farmacia', nombre: 'Facultad de Farmacia' },
  { slug: 'enfermeria', nombre: 'Facultad de Enfermería' },
  { slug: 'bellas-artes', nombre: 'Facultad de Bellas Artes' },
  { slug: 'informatica-electronica-comunicacion', nombre: 'Facultad de Informática, Electrónica y Comunicación' },
  { slug: 'psicologia', nombre: 'Facultad de Psicología' },
  { slug: 'ingenieria', nombre: 'Facultad de Ingeniería' }
]

// Función submit
async function submit() {
  loading.value = true
  error.value = ''
  try {
    await authApi.register({
      nombre: nombre.value,
      apellido: apellido.value,
      cedula: cedula.value,
      email: email.value,
      password: password.value,
      facultad: facultad.value // enviar facultad al backend
    })
    await loadSession()
    router.push('/')
  } catch (e) {
    error.value = String(e?.message || e)
  } finally {
    loading.value = false
  }
}
</script>
