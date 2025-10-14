// src/utils/theme.js
import { ref } from 'vue'

const STORAGE_KEY = 'ui-theme' // 'light' | 'dark'

// detectar preferencia del SO como fallback
function systemPrefersDark () {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
}

export const themeName = ref('light')

export function applySavedTheme () {
  const saved = localStorage.getItem(STORAGE_KEY)
  themeName.value = saved || (systemPrefersDark() ? 'dark' : 'light')
  document.documentElement.setAttribute('data-theme', themeName.value)
}

export function toggleTheme () {
  themeName.value = themeName.value === 'light' ? 'dark' : 'light'
  localStorage.setItem(STORAGE_KEY, themeName.value)
  document.documentElement.setAttribute('data-theme', themeName.value)
}
