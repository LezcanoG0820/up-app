<template>
  <div style="position: relative;">
    <!-- Botón de la campana -->
    <button
      @click="toggleDropdown"
      class="btn-secondary"
      style="position: relative; padding: 0.5rem 0.75rem;"
      title="Notificaciones"
    >
      🔔
      <span
        v-if="unreadCount > 0"
        style="position: absolute; top: -4px; right: -4px; background: var(--danger); color: white; border-radius: 50%; width: 18px; height: 18px; font-size: 0.7rem; display: flex; align-items: center; justify-content: center; font-weight: bold;"
      >
        {{ unreadCount > 9 ? '9+' : unreadCount }}
      </span>
    </button>

    <!-- Dropdown -->
    <div
      v-if="showDropdown"
      class="card"
      style="position: absolute; top: 100%; right: 0; margin-top: 0.5rem; width: 350px; max-height: 400px; overflow-y: auto; z-index: 1000; padding: 0;"
    >
      <!-- Header -->
      <div style="padding: 0.75rem; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
        <strong>Notificaciones</strong>
        <button
          v-if="unreadCount > 0"
          @click="markAllAsRead"
          class="btn-secondary"
          style="font-size: 0.8rem; padding: 0.25rem 0.5rem;"
        >
          Marcar todas
        </button>
      </div>

      <!-- Loading -->
      <div v-if="loading" style="padding: 2rem; text-align: center; color: var(--muted);">
        Cargando...
      </div>

      <!-- Lista de notificaciones -->
      <div v-else-if="notifications.length > 0" style="max-height: 300px; overflow-y: auto;">
        <div
          v-for="notif in notifications"
          :key="notif.id"
          @click="handleNotificationClick(notif)"
          style="padding: 0.75rem; border-bottom: 1px solid var(--border); cursor: pointer;"
          :style="notif.read ? '' : 'background: rgba(37, 99, 235, 0.05);'"
        >
          <div style="display: flex; gap: 0.5rem; align-items: start;">
            <span style="font-size: 1.2rem;">
              {{ notif.type === 'TICKET_CREATED' ? '🎫' : notif.type === 'TICKET_COMPLETED' ? '✅' : '💬' }}
            </span>
            <div style="flex: 1;">
              <p style="margin: 0; font-size: 0.9rem;">{{ notif.message }}</p>
              <small style="color: var(--muted);">{{ formatTime(notif.createdAt) }}</small>
            </div>
            <span v-if="!notif.read" style="width: 8px; height: 8px; background: var(--primary); border-radius: 50%; flex-shrink: 0; margin-top: 0.25rem;"></span>
          </div>
        </div>
      </div>

      <!-- Sin notificaciones -->
      <div v-else style="padding: 2rem; text-align: center; color: var(--muted);">
        No hay notificaciones
      </div>

      <!-- Estado conexión -->
      <div style="padding: 0.5rem; text-align: center; font-size: 0.75rem; color: var(--muted); border-top: 1px solid var(--border);">
        {{ isConnected ? '🟢 Conectado' : '🔴 Desconectado' }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useNotifications } from '../composables/useNotifications'

const props = defineProps({
  userId: {
    type: Number,
    required: true
  }
})

const router = useRouter()
const showDropdown = ref(false)
const loading = ref(false)

// Usar el composable
const {
  notifications,
  unreadCount,
  isConnected,
  connect,
  disconnect,
  fetchNotifications,
  markAsRead
} = useNotifications(props.userId)

// Toggle dropdown
function toggleDropdown() {
  showDropdown.value = !showDropdown.value
  if (showDropdown.value) {
    fetchNotifications()
  }
}

// Click en notificación
async function handleNotificationClick(notif) {
  if (!notif.read) {
    await markAsRead(notif.id)
  }
  if (notif.ticketId) {
    router.push(`/tickets/${notif.ticketId}`)
  }
  showDropdown.value = false
}

// Marcar todas como leídas
async function markAllAsRead() {
  try {
    const response = await fetch('http://localhost:4000/api/notifications/read-all', {
      method: 'PATCH',
      credentials: 'include'
    })
    if (response.ok) {
      await fetchNotifications()
    }
  } catch (e) {
    console.error('Error marking all as read:', e)
  }
}

// Formato de tiempo
function formatTime(dateStr) {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now - date) / 1000)

  if (diff < 60) return 'Ahora'
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)}m`
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)}h`
  return date.toLocaleDateString()
}

// Cerrar dropdown al hacer click fuera
function handleClickOutside(e) {
  if (!e.target.closest('.card') && !e.target.closest('button')) {
    showDropdown.value = false
  }
}

onMounted(async () => {
  connect()
  loading.value = true
  await fetchNotifications()
  loading.value = false
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  disconnect()
  document.removeEventListener('click', handleClickOutside)
})
</script>