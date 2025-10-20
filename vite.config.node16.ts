import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// 宝塔面板 Node.js 16 专用配置
export default defineConfig({
  plugins: [vue()],
  
  // Node.js 16 兼容性配置
  define: {
    // 修复 crypto.getRandomValues 问题
    global: 'globalThis',
  },
  
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  
  // 构建配置 - 针对宝塔面板优化
  build: {
    target: 'es2015', // 降低目标版本以提高兼容性
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false, // 生产环境不生成 sourcemap
    
    // 分包策略 - 减少单个文件大小
    rollupOptions: {
      output: {
        manualChunks: {
          // 将 Vue 相关库打包到一起
          vue: ['vue', 'vue-router', 'pinia'],
          // Element Plus 单独打包
          'element-plus': ['element-plus', '@element-plus/icons-vue'],
          // 工具库单独打包
          utils: ['axios', 'echarts', 'vue-echarts'],
        },
        // 文件命名策略
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') || []
          const ext = info[info.length - 1]
          if (/\.(css)$/.test(assetInfo.name || '')) {
            return `css/[name]-[hash].${ext}`
          }
          if (/\.(png|jpe?g|gif|svg|ico|webp)$/.test(assetInfo.name || '')) {
            return `images/[name]-[hash].${ext}`
          }
          if (/\.(woff2?|eot|ttf|otf)$/.test(assetInfo.name || '')) {
            return `fonts/[name]-[hash].${ext}`
          }
          return `assets/[name]-[hash].${ext}`
        }
      }
    },
    
    // 压缩配置
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // 移除 console
        drop_debugger: true, // 移除 debugger
      },
    },
    
    // 其他构建选项
    chunkSizeWarningLimit: 1000, // 提高警告阈值
    reportCompressedSize: false, // 不报告压缩大小以加快构建
  },
  
  // 开发服务器配置
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  
  // 预构建配置 - 针对 Node.js 16 优化
  optimizeDeps: {
    include: [
      'vue',
      'vue-router',
      'pinia',
      'element-plus',
      '@element-plus/icons-vue',
      'axios',
    ],
    // 排除可能导致问题的包
    exclude: ['@vite/client', '@vite/env'],
  },
  
  // CSS 配置
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use "@/assets/base.css";`,
      },
    },
  },
  
  // 环境变量配置
  envPrefix: 'VITE_',
})