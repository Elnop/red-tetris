import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./app', import.meta.url)),
      '@': fileURLToPath(new URL('./app', import.meta.url)),
      '#imports': fileURLToPath(new URL('./.nuxt/imports', import.meta.url))
    }
  },
  test: {
    environment: 'happy-dom',
    include: ['test/**/*.{test,spec}.ts'],
    setupFiles: ['./test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'app/composables/**',
        'app/stores/**',
        'app/utils/**',
        'app/components/**'
      ],
      exclude: [
        'coverage/**',
        'dist/**',
        'packages/*/test{,s}/**',
        '**/*.d.ts',
        'cypress/**',
        'test{,s}/**',
        'test{,-*}.{js,cjs,mjs,ts,tsx,jsx}',
        '**/*{.,-}test.{js,cjs,mjs,ts,tsx,jsx}',
        '**/*{.,-}spec.{js,cjs,mjs,ts,tsx,jsx}',
        '**/__tests__/**',
        '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
        '**/.{eslint,mocha,prettier}rc.{js,cjs,yml}',
        '.nuxt/**',
        '.output/**',
        'nuxt.config.ts',
        'app/coverage/**',
        'app/pages/**',
        'app/plugins/**',
        'app/app.vue',
        'server/**'
      ],
      thresholds: {
        global: {
          branches: 50,
          functions: 70,
          lines: 70,
          statements: 70
        }
      }
    }
  },
})