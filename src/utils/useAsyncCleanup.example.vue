<template>
  <div class="example-component">
    <h3>异步清理组合式函数使用示例</h3>
    
    <div class="actions">
      <el-button @click="handleSimpleAsync" :loading="loading">
        简单异步操作
      </el-button>
      
      <el-button @click="handleDelayedAsync" :loading="loading">
        延迟异步操作
      </el-button>
      
      <el-button @click="handleFetchData" :loading="loading">
        网络请求
      </el-button>
      
      <el-button @click="handleMultipleAsync" :loading="loading">
        多个异步操作
      </el-button>
    </div>
    
    <div v-if="error" class="error">
      错误: {{ error }}
    </div>
    
    <div v-if="data" class="result">
      结果: {{ data }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useAsyncCleanup, useAsyncState } from './useAsyncCleanup'

// 方式1: 使用基础的异步清理功能
const {
  isUnmounted,
  safeAsync,
  safeSetTimeout,
  safeDelay,
  safeFetch,
  checkUnmounted
} = useAsyncCleanup()

// 方式2: 使用带状态管理的异步功能
const { loading, error, execute } = useAsyncState()

const data = ref<any>(null)

/**
 * 示例1: 简单的异步操作
 */
const handleSimpleAsync = safeAsync(async () => {
  await safeDelay(1000)
  
  if (checkUnmounted()) return
  
  ElMessage.success('简单异步操作完成')
  data.value = '简单异步操作结果'
})

/**
 * 示例2: 带延迟的异步操作
 */
const handleDelayedAsync = async () => {
  await execute(
    async () => {
      // 模拟API调用
      await new Promise(resolve => {
        safeSetTimeout(() => resolve('延迟操作结果'), 2000)
      })
      return '延迟操作完成'
    },
    {
      onSuccess: (result) => {
        ElMessage.success(result)
        data.value = result
      },
      onError: (err) => {
        ElMessage.error(err.message)
      }
    }
  )
}

/**
 * 示例3: 网络请求
 */
const handleFetchData = async () => {
  await execute(
    async () => {
      // 使用安全的fetch请求
      const response = await safeFetch('/api/data')
      return await response.json()
    },
    {
      onSuccess: (result) => {
        ElMessage.success('数据获取成功')
        data.value = result
      },
      onError: (err) => {
        if (err.name === 'AbortError') {
          ElMessage.info('请求已取消')
        } else {
          ElMessage.error('网络请求失败')
        }
      }
    }
  )
}

/**
 * 示例4: 多个异步操作
 */
const handleMultipleAsync = safeAsync(async () => {
  loading.value = true
  
  try {
    // 第一个异步操作
    await safeDelay(500)
    if (checkUnmounted()) return
    
    // 第二个异步操作
    await new Promise(resolve => {
      safeSetTimeout(resolve, 500)
    })
    if (checkUnmounted()) return
    
    // 第三个异步操作
    await safeDelay(500)
    if (checkUnmounted()) return
    
    ElMessage.success('多个异步操作完成')
    data.value = '多个异步操作结果'
    
  } catch (error) {
    if (!checkUnmounted()) {
      ElMessage.error('操作失败')
    }
  } finally {
    if (!checkUnmounted()) {
      loading.value = false
    }
  }
})

// 传统方式的对比示例（不推荐）
const traditionalAsyncExample = async () => {
  // ❌ 传统方式 - 可能导致内存泄漏
  setTimeout(() => {
    // 如果组件已卸载，这里的状态更新会导致警告
    data.value = '传统方式结果'
  }, 1000)
  
  // ❌ 传统方式 - 没有取消机制
  try {
    const response = await fetch('/api/data')
    const result = await response.json()
    // 如果组件已卸载，这里的状态更新会导致警告
    data.value = result
  } catch (error) {
    // 错误处理
  }
}

// ✅ 推荐方式 - 使用组合式函数
const recommendedAsyncExample = safeAsync(async () => {
  // 自动检查组件状态
  await safeDelay(1000)
  
  // 自动取消的网络请求
  try {
    const response = await safeFetch('/api/data')
    const result = await response.json()
    
    // 只有在组件未卸载时才更新状态
    if (!checkUnmounted()) {
      data.value = result
    }
  } catch (error) {
    if (!checkUnmounted()) {
      // 错误处理
    }
  }
})
</script>

<style scoped>
.example-component {
  padding: 20px;
}

.actions {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.error {
  color: #f56c6c;
  margin-top: 10px;
}

.result {
  color: #67c23a;
  margin-top: 10px;
}
</style>