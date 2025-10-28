<template>
  <div style="padding: 1rem; max-width: 1100px; margin: auto;">
    <header
      style="display:flex; gap:1rem; align-items:center; justify-content:space-between; border-bottom:1px solid #ddd; padding-bottom:.75rem;"
    >
      <nav style="display:flex; gap:.75rem; flex-wrap:wrap; align-items:center;">
        <RouterLink to="/">Inicio</RouterLink>

        <!-- Estudiante -->
        <template v-if="user?.rol === 'estudiante'">
          <RouterLink to="/tickets/new">Nuevo ticket</RouterLink>
          <RouterLink to="/my/tickets">Mis tickets</RouterLink>
        </template>

        <!-- Recepción -->
        <template v-if="user?.rol === 'recepcion' || user?.rol === 'admin'">
          <RouterLink to="/inbox/reception">Bandeja Recepción</RouterLink>
        </template>

        <!-- Departamento -->
        <template v-if="user?.rol === 'departamento' || user?.rol === 'admin'">
          <RouterLink to="/inbox/department">Bandeja Departamento</RouterLink>
        </template>

        <!-- Documentos (administrativo/departamento/admin) -->
        <template v-if="user && (user.rol === 'recepcion' || user.rol === 'departamento' || user.rol === 'admin')">
          <RouterLink to="/documents">Documentos</RouterLink>
        </template>
      </nav>

      <div style="display:flex; align-items:center; gap:.5rem;">
        <!-- Selector Claro/Oscuro -->
        <button
          class="btn-secondary"
          type="button"
          :aria-label="`Cambiar a tema ${themeName === 'light' ? 'oscuro' : 'claro'}`"
          @click="toggleTheme"
          title="Cambiar tema"
        >
          <span v-if="themeName === 'light'">🌙 Oscuro</span>
          <span v-else>☀️ Claro</span>
        </button>

        <template v-if="user">
          <span style="margin-left:.25rem; margin-right:.5rem;">{{ user.nombre }} ({{ user.rol }})</span>
          <button @click="logout">Salir</button>
        </template>
        <template v-else>
          <RouterLink to="/login">Entrar</RouterLink>
          <span style="margin: 0 .5rem;">|</span>
          <RouterLink to="/register">Crear cuenta</RouterLink>
        </template>
      </div>
    </header>

    <!-- 3.4.2 - Demo de tema/estilos (solo admin/recepción y con ?demo=1) -->
    <section
      v-if="showThemeDemo && (user?.rol === 'admin' || user?.rol === 'recepcion')"
      class="card"
      style="margin-top:1rem;"
    >
      <div style="display:flex; align-items:center; justify-content:space-between; gap:1rem;">
        <h2 style="margin:0;">🧪 Demo de Tema y Componentes</h2>
        <div style="display:flex; gap:.5rem; align-items:center;">
          <code style="font-size:.9rem;">Tema: {{ themeName }}</code>
          <a class="btn-secondary" :href="baseUrl">Cerrar demo</a>
        </div>
      </div>

      <p class="text-muted" style="margin:.5rem 0 1rem;">
        Esta demo existe solo para validar el modo claro/oscuro y estilos globales (botones, inputs, tablas, cards).
        Para verla, entra con un usuario <strong>admin o recepción</strong> y usa
        <code>?demo=1</code> en la URL.
      </p>

      <div class="grid-gap">
        <fieldset>
          <legend><strong>Botones</strong></legend>
          <div style="display:flex; gap:.5rem; flex-wrap:wrap;">
            <button>Primario</button>
            <button class="btn-secondary">Secundario</button>
            <button disabled>Deshabilitado</button>
            <button @click="toggleTheme">
              Cambiar a {{ themeName === 'light' ? 'oscuro' : 'claro' }}
            </button>
          </div>
        </fieldset>

        <fieldset>
          <legend><strong>Inputs</strong></legend>
          <div class="grid-gap">
            <input placeholder="Escribe algo…" />
            <select>
              <option>Seleccione…</option>
              <option>Opción A</option>
              <option>Opción B</option>
            </select>
            <textarea rows="3" placeholder="Área de texto…"></textarea>
          </div>
        </fieldset>

        <fieldset>
          <legend><strong>Tabla</strong></legend>
          <div style="overflow:auto;">
            <table>
              <thead>
                <tr>
                  <th>Token</th>
                  <th>Asunto</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>TK-123ABC</td>
                  <td>Consulta de matrícula</td>
                  <td><span class="text-success">abierto</span></td>
                  <td>2025-10-28 10:25</td>
                </tr>
                <tr>
                  <td>TK-345XYZ</td>
                  <td>Actualización de datos</td>
                  <td><span class="text-warning">en_progreso</span></td>
                  <td>2025-10-27 16:02</td>
                </tr>
                <tr>
                  <td>TK-777QWE</td>
                  <td>Certificación de notas</td>
                  <td><span class="text-muted">completado</span></td>
                  <td>2025-10-25 08:41</td>
                </tr>
              </tbody>
            </table>
          </div>
        </fieldset>

        <fieldset>
          <legend><strong>Card / Mensajes</strong></legend>
          <p>Este bloque verifica bordes, sombras y colores de texto.</p>
          <p class="text-success">Mensaje de éxito (verde)</p>
          <p class="text-danger">Mensaje de error (rojo)</p>
          <p class="text-muted">Mensaje neutro (muted)</p>
        </fieldset>
      </div>
    </section>
    <!-- /3.4.2 -->

    <main style="padding-top:1rem;">
      <RouterView />
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { session } from './store/session'
import { authApi } from './api'
import { useRouter } from 'vue-router'
import { themeName, toggleTheme } from './utils/theme'

const router = useRouter()
const user = computed(() => session.user)

async function logout () {
  try {
    await authApi.logout()
  } catch {}
  session.user = null
  router.push('/login')
}

/** 3.4.2: mostrar demo solo con ?demo=1 (y no para estudiantes) */
const showThemeDemo = computed(() => {
  try {
    const sp = new URLSearchParams(window.location.search)
    return sp.get('demo') === '1'
  } catch {
    return false
  }
})
const baseUrl = computed(() => {
  // URL sin parámetros para el link “Cerrar demo”
  return window.location.origin + window.location.pathname
})
</script>
