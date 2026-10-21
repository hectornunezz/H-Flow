'use client'

import { useEffect, useSyncExternalStore } from 'react'
import { Moon, Sun } from 'lucide-react'

type Theme = 'dark' | 'light'

const STORAGE_KEY = 'hflow-theme'
const THEME_CHANGE_EVENT = 'hflow-theme-change'

function getThemeSnapshot(): Theme {
  return window.localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark'
}

function getServerThemeSnapshot(): Theme {
  return 'dark'
}

function subscribeToTheme(onChange: () => void) {
  window.addEventListener('storage', onChange)
  window.addEventListener(THEME_CHANGE_EVENT, onChange)
  return () => {
    window.removeEventListener('storage', onChange)
    window.removeEventListener(THEME_CHANGE_EVENT, onChange)
  }
}

export default function ThemeToggle() {
  const theme = useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    getServerThemeSnapshot,
  )

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  function toggleTheme() {
    const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark'
    window.localStorage.setItem(STORAGE_KEY, nextTheme)
    document.documentElement.dataset.theme = nextTheme
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT))
  }

  const isLight = theme === 'light'
  const Icon = isLight ? Moon : Sun

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Cambiar a modo ${isLight ? 'oscuro' : 'claro'}`}
      aria-pressed={isLight}
      className="inline-flex min-h-11 items-center gap-3 rounded-xl border border-slate-700/70 bg-slate-950/70 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-[#FF5A00]/50 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A00]/60"
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FF5A00]/10 text-[#FF5A00]">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span>{isLight ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}</span>
    </button>
  )
}
