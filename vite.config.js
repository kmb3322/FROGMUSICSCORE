import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// code-server에서 개발할 때: https://<host>/absproxy/5180/ 로 접속
// (/absproxy/ 는 경로 prefix를 유지해 주므로 Vite base와 맞춰야 에셋/HMR이 정상 동작)
const PORT = 5180
const BASE = `/absproxy/${PORT}/`
// API(Worker)는 개발 중 `npm run api` 로 띄운 wrangler dev(8787)로 넘김
const API = 'http://127.0.0.1:8787'

export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'serve' ? BASE : '/',
  server: {
    host: '0.0.0.0',
    port: PORT,
    strictPort: true,
    allowedHosts: true,
    proxy: {
      [`${BASE}api`]: {
        target: API,
        rewrite: (p) => p.slice(BASE.length - 1),
      },
    },
  },
}))
