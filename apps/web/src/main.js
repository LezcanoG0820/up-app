// aplica estilos del tema
import './assets/theme.css'
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
import AdminDocumentsView from './views/AdminDocumentsView.vue' 
import DeptDocumentsView from './views/DeptDocumentsView.vue'
import DocumentsView from './views/DocumentsView.vue'
import UserManagementView from './views/UserManagementView.vue'
import ChangePasswordView from './views/ChangePasswordView.vue'
//vista para crear tickets desde recepción
import ReceptionNewTicketView from './views/ReceptionNewTicketView.vue'
import { session, loadSession } from './store/session'
//gestor de tema (claro/oscuro)
import { applySavedTheme } from './utils/theme'

// Definimos rutas con metadata de rol
const routes = [
  { path: '/', name: 'home', component: HomeView },
  // Público (sin sesión)
  { path: '/login', name: 'login', component: LoginView, meta: { guestOnly: true } },
  { path: '/register', name: 'register', component: RegisterView, meta: { guestOnly: true } },
  // Cambio de contraseña (requiere auth)
  { path: '/change-password', name: 'change-password', component: ChangePasswordView, meta: { requiresAuth: true } },
  // Estudiante
  { path: '/tickets/new', name: 'new-ticket', component: NewTicketView, meta: { requiresAuth: true, roles: ['estudiante'] } },
  { path: '/my/tickets', name: 'my-tickets', component: MyTicketsView, meta: { requiresAuth: true, roles: ['estudiante'] } },
  // Recepción
  { path: '/inbox/reception', name: 'inbox-reception', component: ReceptionInboxView, meta: { requiresAuth: true, roles: ['recepcion','maestro'] } },
  //crear ticket en nombre del estudiante
  { path: '/reception/new-ticket', name: 'reception-new-ticket', component: ReceptionNewTicketView, meta: { requiresAuth: true, roles: ['recepcion','maestro'] } },
  // Departamento
  { path: '/inbox/department', name: 'inbox-department', component: DeptInboxView, meta: { requiresAuth: true, roles: ['departamento','maestro'] } },
  // Detalle de ticket (lo ven recepcion, depto, maestro y estudiante dueño vía endpoint propio)
  { path: '/tickets/:id', name: 'ticket-detail', component: TicketDetailView,
    meta: { requiresAuth: true, roles: ['estudiante','recepcion','departamento','maestro'] } },
  // Vistas de gestión de documentos
  { path: '/docs/admin', name: 'docs-admin', component: AdminDocumentsView, meta: { requiresAuth: true, roles: ['recepcion','maestro'] } },
  { path: '/docs/department', name: 'docs-dept', component: DeptDocumentsView, meta: { requiresAuth: true, roles: ['departamento','maestro'] } },
  {
    path: '/documents',
    name: 'documents',
    component: DocumentsView,
    meta: { requiresAuth: true, roles: ['recepcion', 'departamento', 'maestro'] } 
  },
  {
    path: '/users',
    name: 'user-management',
    component: UserManagementView,
    meta: { requiresAuth: true, roles: ['maestro'] }
  },

  // Cambiar contraseña
{ 
  path: '/change-password', 
  name: 'change-password', 
  component: ChangePasswordView, 
  meta: { requiresAuth: true } 
},
  // 404 simple
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Guard global de autenticación y roles
router.beforeEach(async (to) => {
  if (!session.user && !session.loading) {
    await loadSession().catch(() => {})
  }

  if (to.meta?.guestOnly && session.user) {
    return { name: 'home' }
  }

  if (to.meta?.requiresAuth) {
    if (!session.user) {
      return { name: 'login', query: { redirect: to.fullPath } }
    }

    // ⬇️ NUEVO: Forzar cambio de contraseña
    if (session.user.mustChangePassword && to.name !== 'change-password') {
      return { name: 'change-password', query: { forced: 'true' } }
    }

    const allowed = to.meta.roles
    if (Array.isArray(allowed) && allowed.length > 0) {
      if (!allowed.includes(session.user.rol)) {
        return { name: 'home' }
      }
    }
  }

  return true
})

applySavedTheme()
createApp(App).use(router).mount('#app')