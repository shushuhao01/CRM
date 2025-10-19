import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 专门用于宝塔面板生产环境的Vite配置
export default defineConfig({
  plugins: [
    vue(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  build: {
    target: 'es2015', // 兼容Node.js 16
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false, // 生产环境不生成sourcemap
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'vue-router', 'pinia'],
          elementPlus: ['element-plus', '@element-plus/icons-vue'],
          utils: ['axios', 'echarts']
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
      }
    },
    terserOptions: {
      compress: {
        drop_console: true, // 移除console.log
        drop_debugger: true
      }
    }
  },
  define: {
    // 为Node.js 16环境提供兼容性
    global: 'globalThis',
    'process.env.NODE_ENV': '"production"'
  },
  optimizeDeps: {
    include: ['vue', 'vue-router', 'pinia', 'element-plus'],
    // 强制预构建Element Plus以解决模块解析问题
    force: true
  }
})