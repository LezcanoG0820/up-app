// apps/web/src/api.js

function qs (obj) {
  if (!obj || !Object.keys(obj).length) return ''
  const pairs = []
  for (const k in obj) {
    if (obj[k] != null && obj[k] !== '') {
      pairs.push(`${encodeURIComponent(k)}=${encodeURIComponent(obj[k])}`)
    }
  }
  return pairs.length ? '?' + pairs.join('&') : ''
}

async function request (url, opts = {}) {
  const { body, ...rest } = opts
  const headers = { 'Content-Type': 'application/json', ...rest.headers }
  const res = await fetch(url, {
    credentials: 'include',
    ...rest,
    headers,
    body: body ? JSON.stringify(body) : undefined
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `HTTP ${res.status}`)
  }
  const ct = res.headers.get('content-type') || ''
  return ct.includes('application/json') ? res.json() : res.text()
}

async function requestForm (url, formData, method = 'POST') {
  const res = await fetch(url, {
    method,
    credentials: 'include',
    body: formData
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `HTTP ${res.status}`)
  }
  const ct = res.headers.get('content-type') || ''
  return ct.includes('application/json') ? res.json() : res.text()
}

export const authApi = {
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  register: (payload) => request('/auth/register', { method: 'POST', body: payload }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request('/auth/me')
}

export const manageApi = {
  departments: () => request('/api/departments'),
  ticketTypes: (departmentId) => request(`/api/ticket-types${qs({ departmentId })}`),
  searchStudents: (q) => request(`/api/students/search${qs({ q })}`)
}

export const ticketsApi = {
  create: (payload) => request('/api/tickets', { method: 'POST', body: payload }),
  myTickets: () => request('/api/my/tickets'),
  receptionInbox: (params = {}) => request(`/api/tickets/reception${qs(params)}`),
  deptInbox: (params = {}) => request(`/api/tickets/department${qs(params)}`),
  detail: (id) => request(`/api/tickets/${id}`),
  reply: (id, payload) => request(`/api/tickets/${id}/reply`, { method: 'POST', body: payload }),
  reassign: (id, payload) => request(`/api/tickets/${id}/reassign`, { method: 'POST', body: payload }),
  complete: (id) => request(`/api/tickets/${id}/complete`, { method: 'POST' }),
  uploadAttachment: (id, file) => {
    const fd = new FormData()
    fd.append('file', file)
    return requestForm(`/api/tickets/${id}/attach`, fd, 'POST')
  }
}

export const documentsApi = {
  list: (params = {}) => request(`/api/documents${qs(params)}`),
  upload: ({ file, title, departmentId }) => {
    const fd = new FormData()
    fd.append('file', file)
    if (title) fd.append('title', title)
    if (departmentId) fd.append('departmentId', String(departmentId))
    return requestForm('/api/documents/upload', fd, 'POST')
  },
  view: (id) => request(`/api/documents/${id}/view`, { method: 'PATCH' }),
  downloadUrl: (id) => `/api/documents/${id}/download`,
  previewUrl: (id) => `/api/documents/${id}/preview`,
  rename: (id, payload) => request(`/api/documents/${id}`, { method: 'PATCH', body: payload }),
  remove: (id) => request(`/api/documents/${id}`, { method: 'DELETE' })
}

// Recepción (estudiantes + tickets en su nombre)
export const studentsApi = {
  search: (q) => request(`/api/students/search${qs({ q })}`),
  create: (payload) => request('/api/students', { method: 'POST', body: payload })
}

export const receptionTicketsApi = {
  createForStudent: (payload) => request('/api/tickets/by-reception', { method: 'POST', body: payload })
}

// Notificaciones
export const notifApi = {
  list:       () => request('/api/notifications'),
  markRead:   (id) => request(`/api/notifications/${id}/read`, { method: 'POST' }),
  markAllRead: () => request('/api/notifications/read-all', { method: 'POST' })
}