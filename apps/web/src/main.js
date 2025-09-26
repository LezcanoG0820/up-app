import { createApp } from 'vue'
import App from './App.vue'
import { createRouter, createWebHistory } from 'vue-router'

import HomeView from './views/HomeView.vue'
import LoginView from './views/LoginView.vue'
import RegisterView from './views/RegisterView.vue'
import NewTicketView from './views/NewTicketView.vue'
import MyTicketsView from './views/MyTicketsView.vue'
import ReceptionInboxView from './views/ReceptionInboxView.vue'
import DeptInboxView from './views/DeptInboxView.vue'
import TicketDetailView from './views/TicketDetailView.vue'

import { loadSession } from './store/session'

const routes = [
  { path: '/', component: HomeView },
  { path: '/login', component: LoginView },
  { path: '/register', component: RegisterView },
  { path: '/tickets/new', component: NewTicketView },
  { path: '/tickets/mine', component: MyTicketsView },
  { path: '/admin/inbox', component: ReceptionInboxView },
  { path: '/dept/inbox', component: DeptInboxView },
  { path: '/tickets/:id', component: TicketDetailView, props: true },
]

const router = createRouter({ history: createWebHistory(), routes })

const app = createApp(App)
app.use(router)
loadSession().finally(() => app.mount('#app'))
