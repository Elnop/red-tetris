import { vi } from 'vitest'

// Filter Vue-specific warnings related to lifecycle hooks in tests
const originalConsoleWarn = console.warn

console.warn = (...args: unknown[]) => {
  const message = args[0]

  // Ignore Vue warnings about lifecycle hooks called outside component context
  if (
    typeof message === 'string' &&
    (message.includes('onMounted is called when there is no active component instance') ||
     message.includes('onBeforeUnmount is called when there is no active component instance') ||
     message.includes('onUnmounted is called when there is no active component instance'))
  ) {
    return
  }

  // Display all other warnings
  originalConsoleWarn(...args)
}
