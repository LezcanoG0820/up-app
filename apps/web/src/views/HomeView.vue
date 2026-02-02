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
  </main>
</template>

<script setup>
import { computed } from 'vue'
import { session } from '../store/session'
import upLogo from '../assets/UP-logo.png'

const user = computed(() => session.user)
</script>

<style scoped>
.home-wrap {
  padding: 2rem 0;
}

.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 2rem;
  box-shadow: var(--shadow);
}

.hero {
  display: flex;
  gap: 2rem;
  align-items: center;
  flex-wrap: wrap;
}

.hero-left {
  flex: 1 1 400px;
}

.hero-right {
  flex: 0 0 280px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.hero-illustration {
  width: 100%;
  max-width: 280px;
  height: auto;
  object-fit: contain;
}

.hero-title {
  font-size: clamp(1.75rem, 4vw, 2.25rem);
  margin: 0 0 0.5rem;
  color: var(--text);
  font-weight: 700;
}

.hero-sub {
  font-size: 1rem;
  color: var(--muted);
  margin: 0 0 1.25rem;
}

.hero-badges {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.badge {
  display: inline-flex;
  align-items: center;
  padding: 0.4rem 0.85rem;
  border-radius: 999px;
  font-size: 0.9rem;
  background: rgba(37, 99, 235, 0.08);
  color: var(--primary);
  border: 1px solid rgba(37, 99, 235, 0.15);
}

.badge-role {
  background: rgba(16, 185, 129, 0.08);
  color: var(--success);
  border-color: rgba(16, 185, 129, 0.15);
  font-weight: 600;
  text-transform: capitalize;
}
</style>