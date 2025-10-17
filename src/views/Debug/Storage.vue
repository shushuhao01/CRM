<template>
  <div class="storage-debug">
    <h2>存储调试页面</h2>
    
    <div class="section">
      <h3>localStorage 数据检查</h3>
      <button @click="checkStorage" class="btn">刷新存储数据</button>
      <button @click="clearStorage" class="btn btn-danger">清空所有存储</button>
    </div>

    <div class="section">
      <h4>统一客户存储 (crm_customers_unified)</h4>
      <div class="storage-info">
        <p>客户数量: {{ unifiedCustomers.length }}</p>
        <pre>{{ JSON.stringify(unifiedCustomers, null, 2) }}</pre>
      </div>
    </div>

    <div class="section">
      <h4>旧版客户存储 (crm_store_customer)</h4>
      <div class="storage-info">
        <p>客户数量: {{ oldCustomers.length }}</p>
        <pre>{{ JSON.stringify(oldCustomers, null, 2) }}</pre>
      </div>
    </div>

    <div class="section">
      <h4>所有 localStorage 键</h4>
      <ul>
        <li v-for="key in allKeys" :key="key">
          {{ key }} ({{ getStorageSize(key) }} bytes)
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { Customer } from '@/api/customer'

const unifiedCustomers = ref<Customer[]>([])
const oldCustomers = ref<Customer[]>([])
const allKeys = ref<string[]>([])

const checkStorage = () => {
  // 检查统一存储
  try {
    const unifiedData = localStorage.getItem('crm_customers_unified')
    if (unifiedData) {
      const parsed = JSON.parse(unifiedData)
      unifiedCustomers.value = parsed.customers || []
    } else {
      unifiedCustomers.value = []
    }
  } catch (error) {
    console.error('解析统一存储数据失败:', error)
    unifiedCustomers.value = []
  }

  // 检查旧版存储
  try {
    const oldData = localStorage.getItem('crm_store_customer')
    if (oldData) {
      oldCustomers.value = JSON.parse(oldData)
    } else {
      oldCustomers.value = []
    }
  } catch (error) {
    console.error('解析旧版存储数据失败:', error)
    oldCustomers.value = []
  }

  // 获取所有localStorage键
  allKeys.value = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key) {
      allKeys.value.push(key)
    }
  }
}

const clearStorage = () => {
  if (confirm('确定要清空所有localStorage数据吗？')) {
    localStorage.clear()
    checkStorage()
  }
}

const getStorageSize = (key: string): number => {
  const value = localStorage.getItem(key)
  return value ? new Blob([value]).size : 0
}

onMounted(() => {
  checkStorage()
})
</script>

<style scoped>
.storage-debug {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.section {
  margin-bottom: 30px;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.storage-info {
  background: #f5f5f5;
  padding: 15px;
  border-radius: 4px;
  margin-top: 10px;
}

.storage-info pre {
  max-height: 300px;
  overflow-y: auto;
  background: white;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 12px;
}

.btn {
  padding: 8px 16px;
  margin-right: 10px;
  border: none;
  border-radius: 4px;
  background: #007bff;
  color: white;
  cursor: pointer;
}

.btn:hover {
  background: #0056b3;
}

.btn-danger {
  background: #dc3545;
}

.btn-danger:hover {
  background: #c82333;
}

ul {
  list-style-type: none;
  padding: 0;
}

li {
  padding: 5px 0;
  border-bottom: 1px solid #eee;
}
</style>