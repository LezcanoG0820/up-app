<!-- apps/web/src/components/NotificationsBell.vue -->
<template>
  <div class="notif-wrapper" ref="wrapper">
    <button
      type="button"
      class="btn-secondary notif-button"
      @click="toggleOpen"
      :aria-label="`Abrir notificaciones (${unreadCount} sin leer)`"
    >
      <span class="notif-icon">🔔</span>
      <span v-if="unreadCount > 0" class="notif-badge">{{ unreadCount }}</span>
    </button>

    <div v-if="open" class="notif-panel card">
      <header class="notif-header">
        <strong>Notificaciones</strong>
        <button
          v-if="unreadCount > 0"
          class="btn-secondary btn-sm"
          @click="markAll"
        >Marcar todas como leídas</button>
      </header>

      <section class="notif-list">
        <p v-if="items.length === 0" class="text-muted">No hay notificaciones.</p>

        <ul v-else>
          <li
            v-for="n in items"
            :key="n.id"
            class="notif-item"
            :class="{ 'notif-unread': !n.read }"
            @click="handleClick(n)"
          >
            <div class="notif-main">
              <div class="notif-message">{{ n.message }}</div>
              <div class="notif-meta text-muted">
                <span>{{ formatDate(n.createdAt) }}</span>
                <span v-if="n.actor">
                  · {{ n.actor.nombre }} {{ n.actor.apellido }} ({{ n.actor.rol }})
                </span>
                <span v-if="n.ticketId"> · Ticket #{{ n.ticketId }}</span>
              </div>
            </div>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useNotifications, startNotificationsPolling, stopNotificationsPolling } from '../store/notifications'

const router = useRouter()
const { state, markAsRead, markAllRead } = useNotifications()

const open = ref(false)
const wrapper = ref(null)

const unreadCount = computed(() => state.unreadCount)
const items = computed(() => state.items)

function toggleOpen () {
  open.value = !open.value
}

function formatDate (s) {
  try {
    return new Date(s).toLocaleString()
  } catch {
    return s
  }
}

async function handleClick (n) {
  if (!n.read) {
    await markAsRead(n.id)
  }
  if (n.ticketId) {
    router.push({ name: 'ticket-detail', params: { id: n.ticketId } })
    open.value = false
  }
}

async function markAll () {
  await markAllRead()
}

function onClickOutside (ev) {
  if (!open.value) return
  if (!wrapper.value) return
  if (!wrapper.value.contains(ev.target)) {
    open.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', onClickOutside)
  startNotificationsPolling(15000)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onClickOutside)
  stopNotificationsPolling()
})
</script>

<style scoped>
.notif-wrapper {
  position: relative;
}

.notif-button {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 40px;
}

.notif-icon {
  font-size: 1.1rem;
}

.notif-badge {
  position: absolute;
  top: -0.25rem;
  right: -0.25rem;
  min-width: 1.2rem;
  height: 1.2rem;
  padding: 0 0.25rem;
  border-radius: 999px;
  font-size: 0.75rem;
  line-height: 1.2rem;
  background: #dc2626;
  color: white;
}

.notif-panel {
  position: absolute;
  right: 0;
  margin-top: 0.5rem;
  width: 320px;
  max-height: 360px;
  padding: 0.5rem;
  overflow: auto;
  z-index: 50;
}

.notif-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.25rem 0.5rem 0.5rem;
  border-bottom: 1px solid var(--border, #e5e7eb);
}

.notif-list {
  padding: 0.5rem 0;
}

.notif-list ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

.notif-item {
  padding: 0.4rem 0.5rem;
  border-radius: var(--radius, 0.5rem);
  cursor: pointer;
  border: 1px solid transparent;
}

.notif-item + .notif-item {
  margin-top: 0.25rem;
}

.notif-item:hover {
  background: rgba(148, 163, 184, 0.1);
}

.notif-unread {
  border-color: rgba(37, 99, 235, 0.4);
  background: rgba(37, 99, 235, 0.06);
}

.notif-message {
  font-size: 0.9rem;
}

.notif-meta {
  margin-top: 0.15rem;
  font-size: 0.75rem;
}
</style>
