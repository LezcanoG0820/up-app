// apps/web/src/composables/useNotifications.js
import { ref } from 'vue'

const API_URL = 'http://localhost:4000/api'
const WS_URL = 'ws://localhost:4000/ws/notifications'

export function useNotifications(userId) {
  const notifications = ref([])
  const unreadCount = ref(0)
  const isConnected = ref(false)
  let ws = null

  // Conectar WebSocket
  function connect() {
    if (!userId) return

    try {
      ws = new WebSocket(`${WS_URL}?userId=${userId}`)

      ws.onopen = () => {
        isConnected.value = true
        console.log('WebSocket connected')
        fetchNotifications()
        fetchUnreadCount()
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          
          if (data.type === 'notification') {
            notifications.value.unshift(data.data)
            unreadCount.value++
          }
        } catch (e) {
          console.error('Error parsing message:', e)
        }
      }

      ws.onclose = () => {
        isConnected.value = false
        console.log('WebSocket disconnected')
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        isConnected.value = false
      }
    } catch (e) {
      console.error('Error connecting WebSocket:', e)
    }
  }

  // Desconectar WebSocket
  function disconnect() {
    if (ws) {
      ws.close()
      ws = null
    }
  }

  // Obtener notificaciones
  async function fetchNotifications() {
    try {
      const response = await fetch(`${API_URL}/notifications?limit=50`, {
        credentials: 'include'
      })
      const data = await response.json()
      if (data.ok) {
        notifications.value = data.notifications || []
      }
    } catch (e) {
      console.error('Error fetching notifications:', e)
    }
  }

  // Obtener contador
  async function fetchUnreadCount() {
    try {
      const response = await fetch(`${API_URL}/notifications/unread-count`, {
        credentials: 'include'
      })
      const data = await response.json()
      if (data.ok) {
        unreadCount.value = data.count || 0
      }
    } catch (e) {
      console.error('Error fetching unread count:', e)
    }
  }

  // Marcar como leída
  async function markAsRead(notificationId) {
    try {
      const response = await fetch(`${API_URL}/notifications/${notificationId}/read`, {
        method: 'PATCH',
        credentials: 'include'
      })
      if (response.ok) {
        const notification = notifications.value.find(n => n.id === notificationId)
        if (notification) {
          notification.read = true
        }
        unreadCount.value = Math.max(0, unreadCount.value - 1)
      }
    } catch (e) {
      console.error('Error marking as read:', e)
    }
  }

  // Marcar todas como leídas
  async function markAllAsRead() {
    try {
      const response = await fetch(`${API_URL}/notifications/read-all`, {
        method: 'PATCH',
        credentials: 'include'
      })
      if (response.ok) {
        notifications.value.forEach(n => n.read = true)
        unreadCount.value = 0
      }
    } catch (e) {
      console.error('Error marking all as read:', e)
    }
  }

  return {
    notifications,
    unreadCount,
    isConnected,
    connect,
    disconnect,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead
  }
}