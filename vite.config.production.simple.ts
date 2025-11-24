import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'

// 简化的生产环境配置 - 用于解决部署问题
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    target: 'esnext',
    minify: false, // 禁用压缩，便于调试
    sourcemap: true, // 生成 source map
    rollupOptions: {
      output: {
        // 不分割 chunk，所有代码打包到一起
        manualChunks: undefined
      }
    }
  },
  define: {
    global: 'globalThis',
  }
})
