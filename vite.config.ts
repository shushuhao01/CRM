import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    // vueDevTools(), // 暂时禁用以解决解析问题
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    host: true, // 允许外部访问（修复预览连接拒绝）
    port: 5173,
    strictPort: true,
    hmr: {
      overlay: false, // 禁用错误覆盖层
    },
    watch: {
      usePolling: false, // 禁用轮询，使用原生文件监听
      ignored: ['**/node_modules/**', '**/.git/**'], // 忽略不需要监听的目录
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      }
    }
  },
  optimizeDeps: {
    exclude: ['vue-demi'], // 排除可能导致重复更新的依赖
    include: ['element-plus'] // 强制预构建Element Plus
  },
  build: {
    target: 'es2015', // 兼容更多浏览器
    chunkSizeWarningLimit: 1000, // 提高警告阈值到1MB
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'vue-router', 'pinia'],
          elementPlus: ['element-plus', '@element-plus/icons-vue'],
          utils: ['axios', 'echarts', 'xlsx'],
          addressData: ['@/utils/addressData'],
          // 将大的组件分离到独立chunk
          settings: ['@/views/System/Settings.vue'],
          largeComponents: [
            '@/components/System/SuperAdminPermissionPanel.vue',
            '@/views/System/PermissionManagement.vue'
          ]
        }
      }
    }
  },
  define: {
    // 为Node.js 16环境提供crypto.getRandomValues polyfill
    global: 'globalThis',
  }
})
