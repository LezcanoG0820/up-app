const BASE = ''; // usamos el proxy de Vite

async function request(path, { method = 'GET', body } = {}) {
  const res = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include', // importante para cookies
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data;
}

/* --- Auth --- */
export const authApi = {
  me:        () => request('/auth/me'),
  login:     (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  register:  (payload) => request('/auth/register', { method: 'POST', body: payload }),
  logout:    () => request('/auth/logout', { method: 'POST' }),
};

/* --- Tickets (estudiante) --- */
export const ticketsApi = {
  getTypes:  () => request('/api/ticket-types'),
  create:    (payload) => request('/api/tickets', { method: 'POST', body: payload }),
  myTickets: () => request('/api/my/tickets'),
  getCRUs:   () => request('/api/crus')
};

/* --- Gestión interna (recepción/depto/admin) --- */
function qs(obj = {}) {
  const p = new URLSearchParams();
  Object.entries(obj).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') p.append(k, v);
  });
  const s = p.toString();
  return s ? `?${s}` : '';
}

export const manageApi = {
  adminTickets: (filters = {}) => request(`/api/admin/tickets${qs(filters)}`),
  deptTickets:  () => request('/api/dept/tickets'),
  ticketById:   (id) => request(`/api/tickets/${id}`),
  reply:        (id, contenidoHtml) => request(`/api/tickets/${id}/messages`, { method: 'POST', body: { contenidoHtml } }),
  reassign:     (id, { departmentSlug, departmentId } = {}) =>
                  request(`/api/tickets/${id}/reassign`, { method: 'POST', body: { departmentSlug, departmentId } }),
  complete:     (id) => request(`/api/tickets/${id}/complete`, { method: 'POST' }),
};
