<template>
  <main class="home-wrap">
    <!-- HERO -->
    <section class="hero card">
      <div class="hero-left">
        <h1 class="hero-title">Sistema de Gestión de la DGA</h1>
        <p class="hero-sub">
          Universidad de Panamá · Dirección General de Admisión
        </p>
        <div class="hero-badges">
          <span class="badge">
            Sesión: <strong>{{ user?.nombre }}</strong>
          </span>
          <span class="badge badge-role">{{ user?.rol }}</span>
        </div>
      </div>
      <div class="hero-right">
        <img
          class="hero-illustration"
          alt="Universidad de Panamá"
          :src="upLogo"
        />
      </div>
    </section>

    <!-- ACCIONES RÁPIDAS -->
    <section class="card">
      <h2 class="section-title">Acciones rápidas</h2>
      <div class="quick-grid">
        <!-- Estudiante -->
        <RouterLink
          v-if="user?.rol === 'estudiante'"
          class="quick-card"
          to="/tickets/new"
        >
          <div class="qc-icon">📝</div>
          <div class="qc-title">Nueva consulta</div>
          <div class="qc-desc">
            Crear una consulta y enviarla al área correspondiente.
          </div>
        </RouterLink>

        <RouterLink
          v-if="user?.rol === 'estudiante'"
          class="quick-card"
          to="/my/tickets"
        >
          <div class="qc-icon">📁</div>
          <div class="qc-title">Mis consultas</div>
          <div class="qc-desc">
            Seguimiento y detalle de tus consultas.
          </div>
        </RouterLink>

        <!-- Recepción / Maestro -->
        <RouterLink
          v-if="user?.rol === 'recepcion' || user?.rol === 'maestro'"
          class="quick-card"
          to="/inbox/reception"
        >
          <div class="qc-icon">📥</div>
          <div class="qc-title">Bandeja Recepción</div>
          <div class="qc-desc">
            Ver, filtrar, reasignar y completar consultas.
          </div>
        </RouterLink>

        <!-- Departamento / Maestro -->
        <RouterLink
          v-if="user?.rol === 'departamento' || user?.rol === 'maestro'"
          class="quick-card"
          to="/inbox/department"
        >
          <div class="qc-icon">🏢</div>
          <div class="qc-title">Bandeja Departamento</div>
          <div class="qc-desc">
            Atender consultas asignadas a tu departamento.
          </div>
        </RouterLink>
      </div>
    </section>

    <!-- CONSEJOS (CARRUSEL) -->
    <section class="card">
      <h2 class="section-title">Consejos útiles</h2>
      <div class="carousel">
        <div class="slides" :style="{ transform: `translateX(-${currentSlide * 100}%)` }">
          <div class="slide" v-for="(tip, i) in TIPS" :key="i">
            <div class="slide-title">{{ tip.title }}</div>
            <div class="slide-text" v-html="tip.text"></div>
          </div>
        </div>
        <div class="dots">
          <button
            v-for="(tip, i) in TIPS"
            :key="i"
            :class="['dot', { active: i === currentSlide }]"
            @click="goSlide(i)"
            aria-label="Ir al slide"
          />
        </div>
      </div>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { session } from '../store/session'
import upLogo from '../assets/UP-logo.png'

const user = computed(() => session.user)

/**
 * CONSEJOS DEL CARRUSEL
 */
const TIPS = [
  {
    title: 'Búsqueda rápida',
    text: 'En <strong>Recepción</strong> filtra por <strong>cédula</strong> o <strong>token</strong> para ubicar consultas al instante.'
  },
  {
    title: 'Reasignación ágil',
    text: 'Desde el detalle de la consulta, usa el desplegable para <strong>reasignar</strong> al departamento correcto.'
  },
  {
    title: 'Seguimiento claro',
    text: 'El <strong>historial</strong> muestra acciones (respuestas, reasignaciones y cierre) con fecha y responsable.'
  },
  {
    title: 'Buenas prácticas',
    text: 'Usa asuntos <strong>claros</strong> y describe el caso en detalle. Esto reduce re-trabajo y acelera la atención.'
  }
]

// -------- Carousel simple --------
const currentSlide = ref(0)
let timer = null

function nextSlide () {
  currentSlide.value = (currentSlide.value + 1) % TIPS.length
}
function goSlide (i) {
  currentSlide.value = i
  restartTimer()
}
function startTimer () {
  if (TIPS.length > 1) timer = setInterval(nextSlide, 4500)
}
function stopTimer () {
  if (timer) clearInterval(timer)
}
function restartTimer () {
  stopTimer()
  startTimer()
}

onMounted(startTimer)
onBeforeUnmount(stopTimer)
</script>

<style scoped>
.home-wrap{
  display: grid;
  gap: 1rem;
}

.card{
  display: grid;
  gap: .75rem;
}

/* HERO */
.hero{
  grid-template-columns: 1.2fr .8fr;
  align-items: center;
}
.hero-left{ padding-right: .5rem; }
.hero-title{
  font-size: clamp(24px, 4vw, 38px);
  margin: 0 0 .25rem;
}
.hero-sub{
  margin: 0 0 .75rem;
  color: var(--muted);
}
.hero-badges{ display:flex; gap:.5rem; flex-wrap:wrap; }
.badge{
  background:#f3f6ff; border:1px solid #e6ecff; color:#3b489c;
  padding:6px 10px; border-radius: 999px; font-size:.9rem;
}
.badge-role{
  background:#e8f3ff; border-color:#d4e7ff; color:#1e40af; text-transform: capitalize;
}
.hero-illustration{
  width:100%; height:auto; border-radius: 14px; border: 1px solid var(--border);
}

/* Acciones rápidas */
.section-title{ margin: 0 0 .25rem; }
.quick-grid{
  display:grid; gap:.75rem;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}
.quick-card{
  display:grid; gap:.25rem;
  padding:14px; border:1px solid var(--border);
  background:#fff; border-radius: 12px; text-decoration:none;
  color: var(--text); box-shadow: var(--shadow);
  transition: transform .06s ease, border-color .15s ease, box-shadow .15s ease, background .15s ease;
}
.quick-card:hover{
  transform: translateY(-2px);
  border-color:#dbe3ff;
  box-shadow: 0 2px 8px rgba(37,99,235,.08), 0 10px 28px rgba(0,0,0,.06);
  text-decoration:none;
}
.qc-icon{ font-size: 22px; }
.qc-title{ font-weight:700; }
.qc-desc{ color: var(--muted); font-size: .95rem; }

/* Carousel */
.carousel{
  position: relative;
  overflow: hidden;
  width: 100%;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 14px;
  box-shadow: var(--shadow);
}
.slides{
  display: flex;
  width: 100%;
  transition: transform .5s ease;
}
.slide{
  min-width: 100%;
  padding: 18px;
}
.slide-title{
  font-weight: 800;
  margin-bottom: .25rem;
}
.slide-text{
  color: var(--muted);
}
.dots{
  display: flex; gap: 6px;
  position: absolute; bottom: 10px; right: 10px;
}
.dot{
  width: 10px; height: 10px; border-radius: 999px;
  border: 1px solid #cdd7ff; background: #eef2ff; cursor: pointer;
}
.dot.active{ background: #2563eb; border-color:#2563eb; }

@media (max-width: 900px){
  .hero{ grid-template-columns: 1fr; }
  .hero-right{ order: -1; }
}
</style>