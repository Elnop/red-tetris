import { vi } from 'vitest'

// Filtrer les warnings Vue spécifiques liés aux lifecycle hooks dans les tests
const originalConsoleWarn = console.warn

console.warn = (...args: unknown[]) => {
  const message = args[0]

  // Ignorer les warnings Vue sur les lifecycle hooks appelés hors contexte de composant
  if (
    typeof message === 'string' &&
    (message.includes('onMounted is called when there is no active component instance') ||
     message.includes('onBeforeUnmount is called when there is no active component instance'))
  ) {
    return
  }

  // Afficher tous les autres warnings
  originalConsoleWarn(...args)
}
