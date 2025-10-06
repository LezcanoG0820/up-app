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
  myTickets: () => request('/api/my/tickets'), // alias
  // 👇 NUEVO: detalle para estudiante
  myTicketById: (id) => request(`/api/my/tickets/${id}`),
}

export const manageApi = {
  adminTickets:  (filters = {}) => request(`/api/admin/tickets${qs(filters)}`),
  exportTickets: (filters = {}) => { window.location.href = `/api/admin/tickets/export${qs(filters)}` },
  // antes era: deptTickets: () => request('/api/dept/tickets'),
  deptTickets:   (filters = {}) => request(`/api/dept/tickets${qs(filters)}`),
  ticketById:    (id) => request(`/api/tickets/${id}`),
  reply:         (id, contenidoHtml) => request(`/api/tickets/${id}/messages`, { method: 'POST', body: { contenidoHtml } }),
  reassign:      (id, { departmentSlug, departmentId } = {}) => request(`/api/tickets/${id}/reassign`, { method: 'POST', body: { departmentSlug, departmentId } }),
  complete:      (id) => request(`/api/tickets/${id}/complete`, { method: 'POST' }),

  departments:   () => request('/api/departments'),
  getCRUs:       () => request('/api/crus'),
  getFacultades: () => request('/api/facultades')
}


