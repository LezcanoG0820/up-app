// apps/web/src/store/notifications.js
import { reactive, readonly } from 'vue'
import { notifApi } from '../api'

const state = reactive({
  items: [],
  unreadCount: 0,
  loaded: false,
  loading: false
})

let pollTimer = null

async function loadNotifications () {
  if (state.loading) return
  state.loading = true
  try {
    const j = await notifApi.list()
    state.items = Array.isArray(j.notifications) ? j.notifications : []
    state.unreadCount = Number(j.unreadCount || 0)
    state.loaded = true
  } catch (e) {
    console.error('loadNotifications error:', e)
  } finally {
    state.loading = false
  }
}

async function markAsRead (id) {
  try {
    await notifApi.markRead(id)
    const found = state.items.find(n => n.id === id)
    if (found && !found.read) {
      found.read = true
      state.unreadCount = Math.max(0, state.unreadCount - 1)
    }
  } catch (e) {
    console.error('markAsRead error:', e)
  }
}

async function markAllRead () {
  try {
    await notifApi.markAllRead()
    state.items.forEach(n => { n.read = true })
    state.unreadCount = 0
  } catch (e) {
    console.error('markAllRead error:', e)
  }
}

function startNotificationsPolling (intervalMs = 15000) {
  if (pollTimer) return
  // primera carga inmediata
  loadNotifications().catch(() => {})
  pollTimer = setInterval(() => {
    loadNotifications().catch(() => {})
  }, intervalMs)
}

function stopNotificationsPolling () {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

function useNotifications () {
  return {
    state: readonly(state),
    loadNotifications,
    markAsRead,
    markAllRead,
    startNotificationsPolling,
    stopNotificationsPolling
  }
}

export {
  useNotifications,
  startNotificationsPolling,
  stopNotificationsPolling
}
