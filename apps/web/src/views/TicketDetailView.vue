<template>
  <main style="padding:2rem; max-width:900px; margin:auto;">
    <div v-if="!ticket && !error">Cargando…</div>
    <p v-if="error" style="color:crimson">{{ error }}</p>

    <section v-if="ticket">
      <h1>Ticket {{ ticket.token }}</h1>
      <p><strong>Asunto:</strong> {{ ticket.asunto }}</p>
      <p><strong>Descripción:</strong> {{ ticket.descripcion }}</p>
      <p><strong>Tipo:</strong> {{ ticket.tipo?.nombre }}</p>
      <p><strong>Departamento actual:</strong> {{ ticket.departamentoActual?.nombre }}</p>
      <p><strong>Estado:</strong> {{ ticket.estado }}</p>
      <p><strong>Estudiante:</strong> {{ ticket.estudiante?.nombre }} {{ ticket.estudiante?.apellido }} ({{ ticket.estudiante?.email }})</p>
      <p><strong>Creado:</strong> {{ new Date(ticket.createdAt).toLocaleString() }}</p>

      <h2 style="margin-top:1.5rem;">Mensajes</h2>
      <div v-if="ticket.messages?.length">
        <article v-for="m in ticket.messages" :key="m.id" style="border:1px solid #ddd; border-radius:8px; padding:.75rem; margin:.5rem 0;">
          <div style="font-size:.9rem; color:#666;">
            {{ new Date(m.createdAt).toLocaleString() }} — {{ m.autor?.nombre }} {{ m.autor?.apellido }} ({{ m.autor?.rol }})
          </div>
          <div style="margin-top:.5rem;" v-html="m.contenidoHtml"></div>
        </article>
      </div>
      <p v-else>No hay mensajes.</p>

      <div style="display:grid; gap:1rem; margin-top:1.5rem;">
        <!-- Responder -->
        <fieldset>
          <legend><strong>Responder</strong></legend>
          <textarea v-model="contenidoHtml" rows="4" placeholder="Respuesta en HTML sencillo, p.ej.: &lt;p&gt;Estamos revisando&lt;/p&gt;"></textarea>
          <div style="margin-top:.5rem;">
            <button @click="enviarRespuesta" :disabled="loadingReply">{{ loadingReply ? 'Enviando…' : 'Enviar respuesta' }}</button>
            <span v-if="replyMsg" style="margin-left:.5rem; color:green">{{ replyMsg }}</span>
          </div>
        </fieldset>

        <!-- Reasignar: sólo recepción/admin -->
        <fieldset v-if="isRecepcionOrAdmin">
          <legend><strong>Reasignar</strong></legend>
          <input v-model.trim="departmentSlug" placeholder="Slug del departamento (p.ej. administracion, contabilidad)" />
          <button @click="reasignar" :disabled="loadingReassign">{{ loadingReassign ? 'Reasignando…' : 'Reasignar' }}</button>
        </fieldset>

        <!-- Completar -->
        <fieldset>
          <legend><strong>Marcar como completado</strong></legend>
          <button @click="completar" :disabled="loadingComplete || ticket.estado === 'completado'">
            {{ ticket.estado === 'completado' ? 'Ya completado' : (loadingComplete ? 'Marcando…' : 'Completar') }}
          </button>
        </fieldset>
      </div>
    </section>
  </main>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { manageApi } from '../api'
import { session } from '../store/session'

const route = useRoute()
const id = Number(route.params.id)

const ticket = ref(null)
const error = ref('')

const contenidoHtml = ref('')
const departmentSlug = ref('')

const loadingReply = ref(false)
const replyMsg = ref('')
const loadingReassign = ref(false)
const loadingComplete = ref(false)

const isRecepcionOrAdmin = computed(() => session.user?.rol === 'recepcion' || session.user?.rol === 'admin')

async function load() {
  try {
    const { ticket: t } = await manageApi.ticketById(id)
    ticket.value = t
  } catch (e) {
    error.value = String(e?.message || e)
  }
}

async function enviarRespuesta() {
  if (!contenidoHtml.value) return
  loadingReply.value = true
  replyMsg.value = ''
  try {
    await manageApi.reply(id, contenidoHtml.value)
    contenidoHtml.value = ''
    replyMsg.value = 'Respuesta enviada'
    await load()
  } catch (e) {
    error.value = String(e?.message || e)
  } finally {
    loadingReply.value = false
  }
}

async function reasignar() {
  if (!departmentSlug.value) return
  loadingReassign.value = true
  try {
    await manageApi.reassign(id, { departmentSlug: departmentSlug.value })
    departmentSlug.value = ''
    await load()
  } catch (e) {
    error.value = String(e?.message || e)
  } finally {
    loadingReassign.value = false
  }
}

async function completar() {
  loadingComplete.value = true
  try {
    await manageApi.complete(id)
    await load()
  } catch (e) {
    error.value = String(e?.message || e)
  } finally {
    loadingComplete.value = false
  }
}

onMounted(load)
</script>
