<template>
  <el-card class="setting-card">
    <template #header>
      <div class="card-header">
        <span>数据备份与恢复</span>
        <div class="header-actions">
          <el-button
            @click="handleManualBackup"
            type="primary"
            :loading="backupLoading"
          >
            立即备份
          </el-button>
          <el-button
            v-if="canEditBackupSettings"
            @click="handleSaveBackup"
            type="success"
            :loading="backupSaveLoading"
          >
            保存设置
          </el-button>
          <el-button
            @click="handleTestBackup"
            type="info"
            plain
            :loading="testBackupLoading"
          >
            测试功能
          </el-button>
        </div>
      </div>
    </template>

    <el-form
      ref="backupFormRef"
      :model="backupForm"
      :rules="backupFormRules"
      label-width="120px"
      class="setting-form"
    >
      <!-- 备份配置 -->
      <div class="form-section">
        <h4>备份配置</h4>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="自动备份" prop="autoBackupEnabled">
              <el-switch v-model="backupForm.autoBackupEnabled" active-text="启用" inactive-text="禁用" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="备份频率" prop="backupFrequency" v-if="backupForm.autoBackupEnabled">
              <el-select v-model="backupForm.backupFrequency" placeholder="请选择备份频率">
                <el-option label="每小时" value="hourly" />
                <el-option label="每天" value="daily" />
                <el-option label="每周" value="weekly" />
                <el-option label="每月" value="monthly" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="保留天数" prop="retentionDays">
              <el-input-number v-model="backupForm.retentionDays" :min="1" :max="365" placeholder="备份文件保留天数" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="压缩备份" prop="compression">
              <el-switch v-model="backupForm.compression" active-text="启用" inactive-text="禁用" />
            </el-form-item>
          </el-col>
        </el-row>
      </div>

      <!-- 备份状态 -->
      <div class="form-section">
        <h4>备份状态</h4>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="最后备份时间">{{ lastBackupTime || '暂无备份' }}</el-descriptions-item>
          <el-descriptions-item label="备份文件数量">{{ backupCount }} 个</el-descriptions-item>
          <el-descriptions-item label="总备份大小">{{ formatFileSize(totalBackupSize) }}</el-descriptions-item>
          <el-descriptions-item label="自动备份状态">
            <el-tag :type="backupForm.autoBackupEnabled ? 'success' : 'info'">{{ backupForm.autoBackupEnabled ? '已启用' : '已禁用' }}</el-tag>
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <!-- 备份列表 -->
      <div class="form-section">
        <h4>备份历史</h4>
        <el-table :data="backupList" style="width: 100%" v-loading="backupListLoading">
          <el-table-column prop="filename" label="备份文件" />
          <el-table-column prop="timestamp" label="备份时间" width="180">
            <template #default="{ row }">{{ formatDateTime(row.timestamp) }}</template>
          </el-table-column>
          <el-table-column prop="size" label="文件大小" width="120">
            <template #default="{ row }">{{ formatFileSize(row.size) }}</template>
          </el-table-column>
          <el-table-column prop="type" label="备份类型" width="100">
            <template #default="{ row }">
              <el-tag :type="row.type === 'manual' ? 'primary' : 'success'">{{ row.type === 'manual' ? '手动' : '自动' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200">
            <template #default="{ row }">
              <el-button @click="handleRestoreBackup(row)" type="warning" size="small" :loading="restoreLoading === row.filename">恢复</el-button>
              <el-button @click="handleDownloadBackup(row)" type="info" size="small">下载</el-button>
              <el-button @click="handleDeleteBackup(row)" type="danger" size="small">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 备份说明 -->
      <el-alert
        title="备份说明"
        description="系统支持两种备份方式：1. 服务器本地备份（默认）- 备份文件存储在服务器本地；2. OSS云存储备份 - 需要在存储设置中配置阿里云OSS。"
        type="info"
        :closable="false"
        show-icon
      />
    </el-form>
  </el-card>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { useConfigStore } from '@/stores/config'
import { dataBackupService } from '@/services/dataBackupService'
import { runAllTests } from '@/utils/testBackupService'
import { formatDateTime } from '@/utils/dateFormat'

const userStore = useUserStore()
const configStore = useConfigStore()

// 响应式数据
const backupLoading = ref(false)
const backupSaveLoading = ref(false)
const backupListLoading = ref(false)
const restoreLoading = ref('')
const testBackupLoading = ref(false)
const backupFormRef = ref()

const canEditBackupSettings = computed(() => userStore.hasPermission('system:backup:edit'))

const isOssConfigured = computed(() => {
  const storage = configStore.storageConfig
  return storage.storageType === 'oss' && storage.accessKey && storage.secretKey && storage.bucketName && storage.region
})

const backupForm = reactive({
  autoBackupEnabled: false,
  backupFrequency: 'daily',
  retentionDays: 30,
  compression: true
})

const lastBackupTime = ref('')
const backupCount = ref(0)
const totalBackupSize = ref(0)
type BackupListItem = { filename: string; timestamp: string; size: number; type: string }

const backupList = ref<BackupListItem[]>([])

const backupFormRules = {
  backupFrequency: [{ required: true, message: '请选择备份频率', trigger: 'change' }],
  retentionDays: [
    { required: true, message: '请设置保留天数', trigger: 'blur' },
    { type: 'number', min: 1, max: 365, message: '保留天数应在1-365之间', trigger: 'blur' }
  ]
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const toServiceBackupConfig = () => ({
  ...dataBackupService.getDefaultBackupConfig(),
  enabled: backupForm.autoBackupEnabled,
  autoBackupInterval: backupForm.backupFrequency === 'hourly'
    ? 1
    : backupForm.backupFrequency === 'daily'
      ? 24
      : backupForm.backupFrequency === 'weekly'
        ? 24 * 7
        : 24 * 30,
  maxBackupCount: backupForm.retentionDays,
})

const normalizeBackupList = (items: Array<{ filename: string; timestamp: number | string; size: number; type?: string }>) => {
  return items.map(item => ({
    filename: item.filename,
    timestamp: typeof item.timestamp === 'number' ? new Date(item.timestamp).toISOString() : item.timestamp,
    size: item.size,
    type: item.type || 'automatic',
  }))
}

// 手动备份
const handleManualBackup = async () => {
  try {
    backupLoading.value = true
    try {
      const { apiService } = await import('@/services/apiService')
      const data = await apiService.post('/system/backup/create', { type: 'manual' })
      ElMessage.success(`备份成功！备份了 ${data?.totalRecords || 0} 条记录`)
      await loadBackupList()
      await loadBackupStatus()
      return
    } catch (apiError) {
      console.warn('[备份] 后端API调用失败:', apiError)
      if (!isOssConfigured.value) {
        ElMessage.warning('后端备份服务暂时不可用，请稍后重试')
        return
      }
      await dataBackupService.performManualBackup()
      ElMessage.success('备份成功（OSS模式）')
      await loadBackupList()
      await loadBackupStatus()
    }
  } catch (error) {
    console.error('备份失败:', error)
    ElMessage.error('备份失败: ' + (error as Error).message)
  } finally {
    backupLoading.value = false
  }
}

// 保存备份设置
const handleSaveBackup = async () => {
  try {
    await backupFormRef.value?.validate()
    backupSaveLoading.value = true
    await dataBackupService.setBackupConfig(toServiceBackupConfig())
    try {
      const { apiService } = await import('@/services/apiService')
      await apiService.put('/system/backup-settings', backupForm)
      ElMessage.success('备份设置保存成功')
    } catch (apiError: unknown) {
      const err = apiError as { code?: string; response?: { status?: number } }
      if (err.code === 'ECONNREFUSED' || err.response?.status === 404) {
        ElMessage.success('备份设置保存成功（本地模式）')
      } else {
        ElMessage.warning('备份设置已保存到本地，但未能同步到服务器')
      }
    }
  } catch (error) {
    console.error('[备份设置] 保存失败:', error)
    ElMessage.error('保存失败: ' + (error as Error).message)
  } finally {
    backupSaveLoading.value = false
  }
}

// 测试备份
const handleTestBackup = async () => {
  try {
    testBackupLoading.value = true
    ElMessage.info('开始运行备份功能测试...')
    await runAllTests()
  } catch (error) {
    console.error('测试备份功能失败:', error)
    ElMessage.error('测试失败: ' + (error as Error).message)
  } finally {
    testBackupLoading.value = false
  }
}

// 恢复备份
const handleRestoreBackup = async (backup: { filename: string }) => {
  try {
    await ElMessageBox.confirm(
      `确定要恢复备份 "${backup.filename}" 吗？\n\n⚠️ 警告：这将覆盖当前所有数据，此操作不可撤销！`,
      '确认恢复',
      { confirmButtonText: '确定恢复', cancelButtonText: '取消', type: 'warning' }
    )
    restoreLoading.value = backup.filename
    try {
      const { apiService } = await import('@/services/apiService')
      const data = await apiService.post(`/system/backup/restore/${encodeURIComponent(backup.filename)}`)
      ElMessage.success(`数据恢复成功！共恢复 ${data?.totalRestored || 0} 条记录，页面将自动刷新`)
      setTimeout(() => { window.location.reload() }, 2000)
      return
    } catch (apiError) {
      console.warn('[恢复] 后端API调用失败:', apiError)
      if (isOssConfigured.value) {
        await dataBackupService.restoreFromBackup(backup.filename)
        ElMessage.success('数据恢复成功，请刷新页面')
        setTimeout(() => { window.location.reload() }, 2000)
      } else {
        ElMessage.error('恢复失败，请稍后重试')
      }
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('恢复失败:', error)
      ElMessage.error('恢复失败: ' + (error as Error).message)
    }
  } finally {
    restoreLoading.value = ''
  }
}

// 下载备份
const handleDownloadBackup = async (backup: { filename: string }) => {
  try {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1'
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
    const url = `${baseUrl}/system/backup/download/${encodeURIComponent(backup.filename)}`
    const link = document.createElement('a')
    link.href = url + (token ? `?token=${token}` : '')
    link.download = backup.filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    ElMessage.success('备份下载开始')
  } catch (error) {
    console.error('下载失败:', error)
    ElMessage.error('下载失败: ' + (error as Error).message)
  }
}

// 删除备份
const handleDeleteBackup = async (backup: { filename: string }) => {
  try {
    await ElMessageBox.confirm(`确定要删除备份 "${backup.filename}" 吗？`, '确认删除', { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' })
    try {
      const { apiService } = await import('@/services/apiService')
      await apiService.delete(`/system/backup/${encodeURIComponent(backup.filename)}`)
      ElMessage.success('备份删除成功')
      await loadBackupList()
      await loadBackupStatus()
      return
    } catch (apiError) {
      console.warn('[删除备份] 后端API调用失败:', apiError)
      if (isOssConfigured.value) {
        ElMessage.warning('当前仅支持通过后端接口删除OSS备份，请稍后重试')
      } else {
        ElMessage.error('删除失败，请稍后重试')
      }
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error('删除失败: ' + (error as Error).message)
    }
  }
}

// 加载备份配置
const loadBackupConfig = async () => {
  try {
    const { apiService } = await import('@/services/apiService')
    const data = await apiService.get('/system/backup-settings')
    if (data) {
      if (data.autoBackupEnabled !== undefined) backupForm.autoBackupEnabled = data.autoBackupEnabled
      if (data.backupFrequency) backupForm.backupFrequency = data.backupFrequency
      if (data.retentionDays !== undefined) backupForm.retentionDays = data.retentionDays
      if (data.compression !== undefined) backupForm.compression = data.compression
    }
  } catch (error) {
    console.warn('[备份配置] 后端API不可用，使用默认配置:', error)
  }
}

// 加载备份列表
const loadBackupList = async () => {
  try {
    backupListLoading.value = true
    try {
      const { apiService } = await import('@/services/apiService')
      const data = await apiService.get('/system/backup/list')
      if (data && Array.isArray(data)) {
        backupList.value = data
        return
      }
    } catch (apiError) {
      console.warn('[备份列表] 后端API不可用，尝试使用OSS:', apiError)
    }
    if (isOssConfigured.value) {
      backupList.value = normalizeBackupList(await dataBackupService.getBackupList())
    } else {
      backupList.value = []
    }
  } catch (error) {
    console.error('加载备份列表失败:', error)
    backupList.value = []
  } finally {
    backupListLoading.value = false
  }
}

// 加载备份状态
const loadBackupStatus = async () => {
  try {
    try {
      const { apiService } = await import('@/services/apiService')
      const data = await apiService.get('/system/backup/status')
      if (data) {
        backupCount.value = data.backupCount || 0
        totalBackupSize.value = data.totalSize || 0
        lastBackupTime.value = data.lastBackupTime || ''
        return
      }
    } catch (apiError) {
      console.warn('[备份状态] 后端API不可用，使用本地数据:', apiError)
    }
    const config = await dataBackupService.getBackupConfig()
    Object.assign(backupForm, config)
    if (isOssConfigured.value) {
      const list = await dataBackupService.getBackupList()
      if (list && Array.isArray(list)) {
        backupCount.value = list.length
        totalBackupSize.value = list.reduce((total: number, backup: { size: number }) => total + backup.size, 0)
        if (list.length > 0) {
          const latest = list.sort((a: { timestamp: string | number | Date }, b: { timestamp: string | number | Date }) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
          lastBackupTime.value = new Date(latest.timestamp).toISOString()
        }
      }
    } else {
      backupCount.value = 0
      totalBackupSize.value = 0
    }
  } catch (error) {
    console.error('加载备份状态失败:', error)
  }
}

onMounted(() => {
  loadBackupConfig()
  loadBackupStatus()
  loadBackupList()
})
</script>

<style scoped>
.setting-card { margin-bottom: 0; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.header-actions { display: flex; gap: 8px; }
.setting-form { max-width: 100%; }
.form-section { margin-bottom: 24px; }
.form-section h4 { margin-bottom: 12px; color: #303133; font-size: 15px; border-bottom: 1px solid #ebeef5; padding-bottom: 8px; }
</style>

