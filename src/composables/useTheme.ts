import { ref, computed, watch } from 'vue'

export type ThemeMode = 'light' | 'dark' | 'auto'

const STORAGE_KEY = 'crm-theme-mode'
const INTENSITY_KEY = 'crm-dark-intensity'

const currentTheme = ref<ThemeMode>(
  (localStorage.getItem(STORAGE_KEY) as ThemeMode) || 'light'
)

// 0=最深(纯黑)  100=最浅(接近灰) — 默认 0
const storedIntensity = localStorage.getItem(INTENSITY_KEY)
const darkIntensity = ref<number>(
  storedIntensity !== null ? Number(storedIntensity) : 0
)

const isDark = ref(false)

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

/**
 * 根据 intensity (0-100) 生成灰度层级
 * intensity=0  → 纯黑系 (#0a,#14,#1d)
 * intensity=40 → 温和深色 (#1e,#28,#30) — 默认
 * intensity=100→ 浅灰系 (#46,#52,#5c)
 */
function applyDarkIntensity(intensity: number) {
  const t = clamp(intensity, 0, 100) / 100

  const base   = Math.round(10 + t * 60)   // 10→70
  const card   = Math.round(20 + t * 60)   // 20→80
  const raised = Math.round(28 + t * 55)   // 28→83
  const input  = Math.round(34 + t * 50)   // 34→84
  const border = Math.round(50 + t * 45)   // 50→95
  const borderLight = Math.round(42 + t * 45)  // 42→87
  const hover  = Math.round(38 + t * 50)   // 38→88

  // 文字颜色：背景越浅 → 文字相应调暗，但始终保持足够对比度
  const textPrimary   = Math.round(240 - t * 50)   // 240→190
  const textRegular   = Math.round(215 - t * 45)   // 215→170
  const textSecondary = Math.round(180 - t * 35)   // 180→145
  const textMuted     = Math.round(150 - t * 25)   // 150→125
  const textPlaceholder = Math.round(130 - t * 20) // 130→110

  const root = document.documentElement
  root.style.setProperty('--crm-dark-base', `#${hex(base)}${hex(base)}${hex(base)}`)
  root.style.setProperty('--crm-dark-card', `#${hex(card)}${hex(card)}${hex(card)}`)
  root.style.setProperty('--crm-dark-raised', `#${hex(raised)}${hex(raised)}${hex(raised)}`)
  root.style.setProperty('--crm-dark-input', `#${hex(input)}${hex(input)}${hex(input)}`)
  root.style.setProperty('--crm-dark-border', `#${hex(border)}${hex(border)}${hex(border)}`)
  root.style.setProperty('--crm-dark-border-light', `#${hex(borderLight)}${hex(borderLight)}${hex(borderLight)}`)
  root.style.setProperty('--crm-dark-hover', `#${hex(hover)}${hex(hover)}${hex(hover)}`)
  root.style.setProperty('--crm-dark-text-primary', `#${hex(textPrimary)}${hex(textPrimary)}${hex(textPrimary)}`)
  root.style.setProperty('--crm-dark-text-regular', `#${hex(textRegular)}${hex(textRegular)}${hex(textRegular)}`)
  root.style.setProperty('--crm-dark-text-secondary', `#${hex(textSecondary)}${hex(textSecondary)}${hex(textSecondary)}`)
  root.style.setProperty('--crm-dark-text-muted', `#${hex(textMuted)}${hex(textMuted)}${hex(textMuted)}`)
  root.style.setProperty('--crm-dark-text-placeholder', `#${hex(textPlaceholder)}${hex(textPlaceholder)}${hex(textPlaceholder)}`)
}

function hex(n: number): string {
  return n.toString(16).padStart(2, '0')
}

function clearDarkVariables() {
  const root = document.documentElement
  const vars = [
    '--crm-dark-base', '--crm-dark-card', '--crm-dark-raised', '--crm-dark-input',
    '--crm-dark-border', '--crm-dark-border-light', '--crm-dark-hover',
    '--crm-dark-text-primary', '--crm-dark-text-regular', '--crm-dark-text-secondary',
    '--crm-dark-text-muted', '--crm-dark-text-placeholder'
  ]
  vars.forEach(v => root.style.removeProperty(v))
}

function applyTheme(mode: ThemeMode) {
  let shouldBeDark = false
  if (mode === 'dark') {
    shouldBeDark = true
  } else if (mode === 'auto') {
    shouldBeDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  }
  isDark.value = shouldBeDark
  document.documentElement.classList.toggle('dark', shouldBeDark)
  if (shouldBeDark) {
    applyDarkIntensity(darkIntensity.value)
  } else {
    clearDarkVariables()
  }
}

const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
mediaQuery.addEventListener('change', () => {
  if (currentTheme.value === 'auto') {
    applyTheme('auto')
  }
})

applyTheme(currentTheme.value)

export function useTheme() {
  function setTheme(mode: ThemeMode) {
    currentTheme.value = mode
    localStorage.setItem(STORAGE_KEY, mode)
    applyTheme(mode)
  }

  function setDarkIntensity(value: number) {
    darkIntensity.value = clamp(value, 0, 100)
    localStorage.setItem(INTENSITY_KEY, String(darkIntensity.value))
    if (isDark.value) {
      applyDarkIntensity(darkIntensity.value)
    }
  }

  const chartColors = computed(() => ({
    textColor:    isDark.value ? '#c8c8c8' : '#303133',
    subTextColor: isDark.value ? '#999999' : '#909399',
    axisColor:    isDark.value ? '#555555' : '#cccccc',
    splitColor:   isDark.value ? '#333333' : '#eeeeee',
    tooltipBg:    isDark.value ? '#2a2a2a' : '#ffffff',
    tooltipBorder: isDark.value ? '#444444' : '#e4e7ed',
  }))

  return {
    currentTheme,
    isDark,
    darkIntensity,
    chartColors,
    setTheme,
    setDarkIntensity
  }
}
