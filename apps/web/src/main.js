import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'

import HomeView from './views/HomeView.vue'
import LoginView from './views/LoginView.vue'
import RegisterView from './views/RegisterView.vue'
import NewTicketView from './views/NewTicketView.vue'
import MyTicketsView from './views/MyTicketsView.vue'
import ReceptionInboxView from './views/ReceptionInboxView.vue'
import DeptInboxView from './views/DeptInboxView.vue'
import TicketDetailView from './views/TicketDetailView.vue'

import { session, loadSession } from './store/session'

// Definimos rutas con metadata de rol
const routes = [
  { path: '/', name: 'home', component: HomeView },

  // Público (sin sesión)
  { path: '/login', name: 'login', component: LoginView, meta: { guestOnly: true } },
  { path: '/register', name: 'register', component: RegisterView, meta: { guestOnly: true } },

  // Estudiante
  { path: '/tickets/new', name: 'new-ticket', component: NewTicketView, meta: { requiresAuth: true, roles: ['estudiante'] } },
  { path: '/my/tickets', name: 'my-tickets', component: MyTicketsView, meta: { requiresAuth: true, roles: ['estudiante'] } },

  // Recepción
  { path: '/inbox/reception', name: 'inbox-reception', component: ReceptionInboxView, meta: { requiresAuth: true, roles: ['recepcion','admin'] } },

  // Departamento
  { path: '/inbox/department', name: 'inbox-department', component: DeptInboxView, meta: { requiresAuth: true, roles: ['departamento','admin'] } },

  // Detalle de ticket (lo ven recepcion, depto, admin y estudiante dueño vía endpoint propio)
{ path: '/tickets/:id', name: 'ticket-detail', component: TicketDetailView,
  meta: { requiresAuth: true, roles: ['estudiante','recepcion','departamento','admin'] } },

  // 404 simple
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Guard global de autenticación y roles
router.beforeEach(async (to) => {
  // Si aún no hemos resuelto sesión y no hay user, intentamos cargarla
  if (!session.user && !session.loading) {
    await loadSession().catch(() => {})
  }

  // Rutas solo para invitados
  if (to.meta?.guestOnly && session.user) {
    return { name: 'home' }
  }

  // Rutas que requieren auth
  if (to.meta?.requiresAuth) {
    if (!session.user) {
      return { name: 'login', query: { redirect: to.fullPath } }
    }
    // Verificación de rol
    const allowed = to.meta.roles
    if (Array.isArray(allowed) && allowed.length > 0) {
      if (!allowed.includes(session.user.rol)) {
        // sin permisos → a home
        return { name: 'home' }
      }
    }
  }

  return true
})

createApp(App).use(router).mount('#app')
