import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Пустой префикс: FAVORIT_API_KEY без VITE_ читается только здесь и не попадает в бандл
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api/hsprice': {
          target: 'http://api.favorit-parts.ru',
          changeOrigin: true,
          rewrite: (path) => {
            const params = new URLSearchParams(path.split('?')[1] ?? '')
            params.set('key', env.FAVORIT_API_KEY)
            return `/hs/hsprice/?${params}`
          },
        },
      },
    },
  }
})
