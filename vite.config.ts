import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  assetsInclude: ['**/*.glb', '**/*.gltf'], //新增 为了能够识别三维模型
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    proxy: {
      '/tianditu': {
        target: 'http://t4.tianditu.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/tianditu/, '')
      },
      '/api/baidu': {
        target: 'https://api.map.baidu.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api\/baidu/, ''),
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('代理请求:', req.url)
          })
        }
      },
    }
  },
  define: {
    // 关键：取消 Vite 默认的 ImageData freeze
    __VUE_PROD_DEVTOOLS__: 'false'
  },
  optimizeDeps: {
    // 强制预构建 heatmap.js，避免缓存旧包
    include: ['heatmap.js']
  }
})

