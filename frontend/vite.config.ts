import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // 优先使用 VITE_API_BASE_URL，否则用 VITE_API_PORT 构建
  let proxyTarget = 'http://localhost:3000'
  if (env.VITE_API_BASE_URL) {
    proxyTarget = env.VITE_API_BASE_URL
  } else if (env.VITE_API_PORT) {
    proxyTarget = `http://localhost:${env.VITE_API_PORT}`
  }

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: true,
      port: 5173,
      allowedHosts: true,

      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
  }
})