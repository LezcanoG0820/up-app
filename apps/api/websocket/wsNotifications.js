// apps/api/websocket/wsNotifications.js
const WebSocket = require('ws')

const userConnections = new Map()

function createNotificationServer(server) {
  const wss = new WebSocket.Server({ 
    server,
    path: '/ws/notifications'
  })

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`)
    const userId = parseInt(url.searchParams.get('userId'))

    if (!userId) {
      ws.close(4001, 'No userId')
      return
    }

    if (!userConnections.has(userId)) {
      userConnections.set(userId, new Set())
    }
    userConnections.get(userId).add(ws)

    ws.send(JSON.stringify({ type: 'connected', userId }))

    ws.on('close', () => {
      const connections = userConnections.get(userId)
      if (connections) {
        connections.delete(ws)
        if (connections.size === 0) userConnections.delete(userId)
      }
    })
  })

  console.log('✅ WebSocket ready on /ws/notifications')
  return wss
}

function sendNotificationToUser(userId, notification) {
  const connections = userConnections.get(userId)
  if (!connections) return false

  const message = JSON.stringify({ type: 'notification', data: notification })
  connections.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) ws.send(message)
  })
  return true
}

module.exports = { createNotificationServer, sendNotificationToUser }