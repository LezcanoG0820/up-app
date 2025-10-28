// src/api.js
const BASE = ''

async function request (path, { method = 'GET', body } = {}) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include'
  }
  if (body) opts.body = JSON.stringify(body)

  const res = await fetch(`${BASE}${path}`, opts)
  if (!res.ok) {
    let msg = `HTTP ${res.status}`
    try {
      const j = await res.json()
      if (j?.error) msg = j.error
    } catch {}
    throw new Error(msg)
  }
  const ct = res.headers.get('content-type') || ''
  return ct.includes('application/json') ? res.json() : res.text()
}

function qs (obj = {}) {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && String(v).length) sp.append(k, v)
  }
  const s = sp.toString()
  return s ? `?${s}` : ''
}

export const authApi = {
  register: (payload) => request('/auth/register', { method: 'POST', body: payload }),
  login:    (payload) => request('/auth/login',    { method: 'POST', body: payload }),
  me:       () => request('/auth/me'),
  logout:   () => request('/auth/logout', { method: 'POST' })
}

export const ticketsApi = {
  getTypes: () => request('/api/ticket-types'),
  create:   (payload) => request('/api/tickets', { method: 'POST', body: payload }),
  myList:   () => request('/api/my/tickets'),
  myTickets: () => request('/api/my/tickets'),
  myTicketById: (id) => request(`/api/my/tickets/${id}`),
}

export const manageApi = {
  adminTickets:  (filters = {}) => request(`/api/admin/tickets${qs(filters)}`),
  exportTickets: (filters = {}) => { window.location.href = `/api/admin/tickets/export${qs(filters)}` },
  deptTickets:   (filters = {}) => request(`/api/dept/tickets${qs(filters)}`),
  ticketById:    (id) => request(`/api/tickets/${id}`),
  reply:         (id, contenidoHtml) => request(`/api/tickets/${id}/messages`, { method: 'POST', body: { contenidoHtml } }),
  reassign:      (id, { departmentSlug, departmentId } = {}) => request(`/api/tickets/${id}/reassign`, { method: 'POST', body: { departmentSlug, departmentId } }),
  complete:      (id) => request(`/api/tickets/${id}/complete`, { method: 'POST' }),

  departments:   () => request('/api/departments'),
  getCRUs:       () => request('/api/crus'),
  getFacultades: () => request('/api/facultades')
}

// ---------- Documentos ----------
async function requestForm(path, formData, method = 'POST') {
  const res = await fetch(`${BASE}${path}`, { method, body: formData, credentials: 'include' })
  if (!res.ok) {
    let msg = `HTTP ${res.status}`
    try {
      const j = await res.json()
      if (j?.error) msg = j.error
    } catch {}
    throw new Error(msg)
  }
  const ct = res.headers.get('content-type') || ''
  return ct.includes('application/json') ? res.json() : res.text()
}

export const documentsApi = {
  list:   (params = {}) => request(`/api/documents${qs(params)}`),
  upload: ({ file, title, departmentId }) => {
    const fd = new FormData()
    if (title) fd.append('title', title)
    if (departmentId) fd.append('departmentId', String(departmentId))
    fd.append('file', file)
    return requestForm('/api/documents/upload', fd, 'POST')
  },
  view: (id) => request(`/api/documents/${id}/view`, { method: 'PATCH' }),
  rename: (id, { title }) => request(`/api/documents/${id}`, { method: 'PATCH', body: { title } }),
  remove: (id) => request(`/api/documents/${id}`, { method: 'DELETE' }),

  // URLs puras para <embed>/<img>/descarga
  previewUrl:  (id) => `/api/documents/${id}/preview`,
  downloadUrl: (id) => `/api/documents/${id}/download`
}
