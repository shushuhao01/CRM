<template>
  <el-card class="setting-card">
    <template #header>
      <div class="card-header">
        <span>存储配置</span>
        <div class="header-actions">
          <el-button
            v-if="storageForm.storageType === 'oss'"
            @click="handleTestOSSConnection"
            type="warning"
            size="small"
            :loading="testingOSSConnection"
          >
            <el-icon><Connection /></el-icon>
            测试OSS连接
          </el-button>
          <el-button
            @click="handleTestDataPersistence"
            type="info"
            size="small"
            :loading="testingDataPersistence"
          >
            <el-icon><Setting /></el-icon>
            测试功能
          </el-button>
          <el-button
            v-if="canEditStorageSettings"
            @click="handleSaveStorage"
            type="primary"
            :loading="storageLoading"
          >
            保存设置
          </el-button>
        </div>
      </div>
    </template>

    <el-alert v-if="configStore.configLocked.storage" type="warning" :closable="false" style="margin-bottom: 16px">
      <template #title>
        <span>🔒 该配置由管理后台统一管控，如需修改请联系管理员</span>
      </template>
    </el-alert>

    <el-form
      ref="storageFormRef"
      :disabled="configStore.configLocked.storage"
      :model="storageForm"
      :rules="storageFormRules"
      label-width="120px"
      class="setting-form"
    >
      <el-form-item label="存储类型" prop="storageType">
        <el-radio-group v-model="storageForm.storageType">
          <el-radio label="local">本地存储</el-radio>
          <el-radio label="oss">阿里云OSS</el-radio>
        </el-radio-group>
      </el-form-item>

      <!-- 本地存储配置 -->
      <template v-if="storageForm.storageType === 'local'">
        <el-form-item label="存储路径" prop="localPath">
          <el-input v-model="storageForm.localPath" placeholder="请输入本地存储路径" />
        </el-form-item>
        <el-form-item label="访问域名" prop="localDomain">
          <el-input v-model="storageForm.localDomain" placeholder="请输入访问域名" />
        </el-form-item>
      </template>

      <!-- 云存储配置 -->
      <template v-if="storageForm.storageType !== 'local'">
        <el-form-item label="Access Key" prop="accessKey">
          <el-input v-model="storageForm.accessKey" placeholder="请输入Access Key" />
        </el-form-item>
        <el-form-item label="Secret Key" prop="secretKey">
          <el-input v-model="storageForm.secretKey" type="password" placeholder="请输入Secret Key" show-password />
        </el-form-item>
        <el-form-item label="存储桶名称" prop="bucketName">
          <el-input v-model="storageForm.bucketName" placeholder="请输入存储桶名称" />
        </el-form-item>
        <el-form-item label="存储区域" prop="region">
          <el-select v-model="storageForm.region" placeholder="请选择存储区域" style="width: 100%">
            <el-option label="华东1（杭州）" value="oss-cn-hangzhou" />
            <el-option label="华东2（上海）" value="oss-cn-shanghai" />
            <el-option label="华北1（青岛）" value="oss-cn-qingdao" />
            <el-option label="华北2（北京）" value="oss-cn-beijing" />
            <el-option label="华北3（张家口）" value="oss-cn-zhangjiakou" />
            <el-option label="华北5（呼和浩特）" value="oss-cn-huhehaote" />
            <el-option label="华北6（乌兰察布）" value="oss-cn-wulanchabu" />
            <el-option label="华南1（深圳）" value="oss-cn-shenzhen" />
            <el-option label="华南2（河源）" value="oss-cn-heyuan" />
            <el-option label="华南3（广州）" value="oss-cn-guangzhou" />
            <el-option label="西南1（成都）" value="oss-cn-chengdu" />
            <el-option label="中国（香港）" value="oss-cn-hongkong" />
            <el-option label="美国西部1（硅谷）" value="oss-us-west-1" />
            <el-option label="美国东部1（弗吉尼亚）" value="oss-us-east-1" />
            <el-option label="亚太东南1（新加坡）" value="oss-ap-southeast-1" />
            <el-option label="亚太东南2（悉尼）" value="oss-ap-southeast-2" />
            <el-option label="亚太东南3（吉隆坡）" value="oss-ap-southeast-3" />
            <el-option label="亚太东南5（雅加达）" value="oss-ap-southeast-5" />
            <el-option label="亚太东北1（东京）" value="oss-ap-northeast-1" />
            <el-option label="亚太南部1（孟买）" value="oss-ap-south-1" />
            <el-option label="欧洲中部1（法兰克福）" value="oss-eu-central-1" />
            <el-option label="英国（伦敦）" value="oss-eu-west-1" />
            <el-option label="中东东部1（迪拜）" value="oss-me-east-1" />
          </el-select>
          <div class="form-tip">选择与您的Bucket相同的区域</div>
        </el-form-item>
        <el-form-item label="自定义域名" prop="customDomain">
          <el-input v-model="storageForm.customDomain" placeholder="请输入自定义域名（可选）" />
        </el-form-item>
      </template>

      <el-form-item label="最大文件大小" prop="maxFileSize">
        <el-input-number v-model="storageForm.maxFileSize" :min="1" :max="100" placeholder="最大文件大小" />
        <span class="form-tip-inline">MB</span>
      </el-form-item>

      <el-form-item label="允许的文件类型" prop="allowedTypes">
        <el-input v-model="storageForm.allowedTypes" placeholder="请输入允许的文件类型，用逗号分隔" />
        <div class="form-tip">例如：jpg,png,gif,pdf,doc,docx</div>
      </el-form-item>

      <!-- 图片压缩配置 -->
      <el-divider content-position="left">
        <el-icon><Picture /></el-icon>
        图片上传压缩配置
      </el-divider>

      <el-form-item label="启用压缩">
        <el-switch v-model="storageForm.imageCompressEnabled" />
        <div class="form-tip">启用后上传的图片将自动压缩，减少存储空间和加载时间</div>
      </el-form-item>

      <template v-if="storageForm.imageCompressEnabled">
        <el-form-item label="压缩质量">
          <el-radio-group v-model="storageForm.imageCompressQuality">
            <el-radio label="high">
              <span class="quality-option">
                <span class="quality-name">高清</span>
                <span class="quality-desc">（质量80%，最大宽度1920px）</span>
              </span>
            </el-radio>
            <el-radio label="medium">
              <span class="quality-option">
                <span class="quality-name">标准</span>
                <span class="quality-desc">（质量60%，最大宽度1200px）</span>
              </span>
            </el-radio>
            <el-radio label="low">
              <span class="quality-option">
                <span class="quality-name">省流</span>
                <span class="quality-desc">（质量40%，最大宽度800px）</span>
              </span>
            </el-radio>
            <el-radio label="custom">
              <span class="quality-option">
                <span class="quality-name">自定义</span>
              </span>
            </el-radio>
          </el-radio-group>
        </el-form-item>

        <template v-if="storageForm.imageCompressQuality === 'custom'">
          <el-form-item label="最大宽度">
            <el-input-number v-model="storageForm.imageCompressMaxWidth" :min="400" :max="4096" :step="100" />
            <span class="form-tip-inline">px（超过此宽度的图片将被等比缩放）</span>
          </el-form-item>
          <el-form-item label="压缩比例">
            <el-slider v-model="storageForm.imageCompressCustomQuality" :min="10" :max="100" :step="5" show-input style="max-width: 400px;" />
            <div class="form-tip">数值越低压缩越强，文件越小，但图片质量会下降</div>
          </el-form-item>
        </template>

        <el-form-item>
          <el-alert :title="compressionPreviewText" type="info" :closable="false" show-icon />
        </el-form-item>
      </template>

      <!-- 数据同步设置 -->
      <template v-if="storageForm.storageType !== 'local'">
        <el-divider content-position="left">
          <el-icon><Upload /></el-icon>
          数据同步设置
        </el-divider>

        <el-form-item label="自动同步">
          <el-switch v-model="syncConfig.autoSync" @change="handleSyncConfigChange" />
          <div class="form-tip">启用后将定期自动同步数据到云端</div>
        </el-form-item>

        <el-form-item label="同步间隔" v-if="syncConfig.autoSync">
          <el-input-number v-model="syncConfig.syncInterval" :min="5" :max="1440" @change="handleSyncConfigChange" />
          <span class="form-tip-inline">分钟（建议30-60分钟）</span>
        </el-form-item>

        <el-form-item label="实时同步">
          <el-switch v-model="syncConfig.syncOnDataChange" @change="handleSyncConfigChange" />
          <div class="form-tip">数据变更时立即同步到云端</div>
        </el-form-item>

        <el-form-item label="备份保留数量">
          <el-input-number v-model="syncConfig.backupRetention" :min="1" :max="20" @change="handleSyncConfigChange" />
          <span class="form-tip-inline">个（保留最近的备份文件数量）</span>
        </el-form-item>

        <!-- 同步状态显示 -->
        <el-form-item label="同步状态">
          <div class="sync-status">
            <el-tag :type="syncStatus.isEnabled ? 'success' : 'danger'" class="status-tag">
              {{ syncStatus.isEnabled ? '已启用' : '未启用' }}
            </el-tag>
            <el-tag v-if="syncStatus.syncInProgress" type="warning" class="status-tag">同步中...</el-tag>
            <div v-if="syncStatus.lastSyncTime" class="sync-info">最后同步: {{ formatSyncTime(syncStatus.lastSyncTime) }}</div>
            <div v-if="syncStatus.totalItems > 0" class="sync-progress">
              已同步: {{ syncStatus.syncedItems }}/{{ syncStatus.totalItems }}
              <span v-if="syncStatus.failedItems > 0" class="failed-count">(失败: {{ syncStatus.failedItems }})</span>
            </div>
          </div>
        </el-form-item>

        <!-- 同步操作按钮 -->
        <el-form-item label="同步操作">
          <div class="sync-actions">
            <el-button @click="handleManualSync" :loading="syncStatus.syncInProgress" :disabled="!syncStatus.isEnabled" type="primary" size="small">
              <el-icon><Upload /></el-icon>
              立即同步
            </el-button>
            <el-button @click="handleRestoreData" :disabled="!syncStatus.isEnabled || syncStatus.syncInProgress" type="warning" size="small">
              <el-icon><Download /></el-icon>
              恢复数据
            </el-button>
            <el-button @click="handleCheckIntegrity" :disabled="syncStatus.syncInProgress" size="small">
              <el-icon><Check /></el-icon>
              检查完整性
            </el-button>
          </div>
        </el-form-item>

        <!-- 错误信息显示 -->
        <el-form-item v-if="syncStatus.errors.length > 0" label="同步错误">
          <el-alert v-for="(error, index) in syncStatus.errors" :key="index" :title="error" type="error" :closable="false" class="sync-error" />
        </el-form-item>
      </template>
    </el-form>
  </el-card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Setting, Upload, Download, Check, Picture, Connection } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { useConfigStore } from '@/stores/config'
import { dataSyncService } from '@/services/dataSyncService'
import { runDataPersistenceTests } from '@/utils/testDataPersistence'

const userStore = useUserStore()
const configStore = useConfigStore()

const storageLoading = ref(false)
const testingDataPersistence = ref(false)
const testingOSSConnection = ref(false)
const storageFormRef = ref()

const storageForm = computed(() => configStore.storageConfig)

const syncConfig = ref(dataSyncService.getSyncConfig())
const syncStatus = ref(dataSyncService.getSyncStatus())

const storageFormRules = computed(() => {
  const rules: Record<string, unknown[]> = {}
  if (storageForm.value.storageType === 'local') {
    rules.localPath = [{ required: true, message: '请输入存储路径', trigger: 'blur' }]
  } else if (storageForm.value.storageType === 'oss') {
    rules.accessKey = [{ required: true, message: '请输入Access Key', trigger: 'blur' }]
    rules.secretKey = [{ required: true, message: '请输入Secret Key', trigger: 'blur' }]
    rules.bucketName = [{ required: true, message: '请输入存储桶名称', trigger: 'blur' }]
    rules.region = [{ required: true, message: '请选择存储区域', trigger: 'change' }]
  }
  return rules
})

const canEditStorageSettings = computed(() => userStore.isAdmin)

const compressionPreviewText = computed(() => {
  const storage = storageForm.value
  if (!storage.imageCompressEnabled) {
    return '图片压缩已关闭，上传的图片将保持原始大小'
  }
  let quality = 60
  let maxWidth = 1200
  let qualityName = '标准'
  switch (storage.imageCompressQuality) {
    case 'high': quality = 80; maxWidth = 1920; qualityName = '高清'; break
    case 'medium': quality = 60; maxWidth = 1200; qualityName = '标准'; break
    case 'low': quality = 40; maxWidth = 800; qualityName = '省流'; break
    case 'custom':
      quality = storage.imageCompressCustomQuality || 60
      maxWidth = storage.imageCompressMaxWidth || 1200
      qualityName = '自定义'
      break
  }
  return `当前配置：${qualityName}模式，压缩质量${quality}%，最大宽度${maxWidth}px。预计可减少50%-80%的文件大小。`
})

const handleTestOSSConnection = async () => {
  // 校验OSS必填字段
  const { accessKey, secretKey, bucketName, region } = storageForm.value
  if (!accessKey || !secretKey || !bucketName || !region) {
    ElMessage.warning('请先填写完整的OSS配置信息（Access Key、Secret Key、存储桶名称、存储区域）')
    return
  }

  testingOSSConnection.value = true
  try {
    const { apiService } = await import('@/services/apiService')
    const result = await apiService.post('/system/test-oss-connection', {
      accessKey: storageForm.value.accessKey,
      secretKey: storageForm.value.secretKey,
      bucketName: storageForm.value.bucketName,
      region: storageForm.value.region,
      customDomain: storageForm.value.customDomain || ''
    }) as { success: boolean; message?: string; data?: any }

    if (result.success) {
      ElMessage.success('OSS连接测试成功！Bucket可正常访问')
    } else {
      ElMessage.error(result.message || 'OSS连接测试失败')
    }
  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string } }; message?: string }
    const msg = err.response?.data?.message || err.message || 'OSS连接测试失败，请检查配置'
    ElMessage.error(msg)
    console.error('[存储设置] OSS连接测试失败:', error)
  } finally {
    testingOSSConnection.value = false
  }
}

const handleSaveStorage = async () => {
  try {
    await storageFormRef.value?.validate()
    storageLoading.value = true

    configStore.updateStorageConfig(storageForm.value)
    console.log('[存储设置] 已保存到localStorage:', storageForm.value)

    const { clearStorageConfigCache } = await import('@/services/uploadService')
    clearStorageConfigCache()
    console.log('[存储设置] 已清除上传服务缓存')

    if (storageForm.value.storageType === 'oss') {
      const { ossService } = await import('@/services/ossService')
      await ossService.reinitialize()
    }

    try {
      const { apiService } = await import('@/services/apiService')
      await apiService.put('/system/storage-settings', storageForm.value)
      console.log('[存储设置] 已同步到后端API')
      ElMessage.success('存储设置保存成功')
    } catch (apiError: unknown) {
      const err = apiError as { code?: string; response?: { status?: number } }
      console.warn('[存储设置] API调用失败，已保存到本地:', apiError)
      if (err.code === 'ECONNREFUSED' || err.response?.status === 404) {
        ElMessage.success('存储设置保存成功（本地模式）')
      } else {
        ElMessage.warning('存储设置已保存到本地，但未能同步到服务器')
      }
    }
  } catch (error) {
    console.error('[存储设置] 表单验证失败:', error)
    ElMessage.error('保存存储设置失败，请重试')
  } finally {
    storageLoading.value = false
  }
}

const handleTestDataPersistence = async () => {
  testingDataPersistence.value = true
  try {
    ElMessage.info('开始测试数据持久性功能...')
    const results = await runDataPersistenceTests()
    const totalTests = results.length
    const passedTests = results.filter((r: { passed: boolean }) => r.passed).length
    const failedTests = totalTests - passedTests
    if (failedTests === 0) {
      ElMessage.success(`所有测试通过！(${passedTests}/${totalTests})`)
    } else {
      ElMessage.warning(`测试完成：${passedTests}/${totalTests} 通过，${failedTests} 失败`)
    }
    console.group('数据持久性测试结果')
    results.forEach((result: { passed: boolean; name: string; message: string; error?: unknown }) => {
      if (result.passed) { console.log(`✅ ${result.name}: ${result.message}`) }
      else { console.error(`❌ ${result.name}: ${result.message}`); if (result.error) console.error('错误详情:', result.error) }
    })
    console.groupEnd()
    const failedResults = results.filter((r: { passed: boolean }) => !r.passed)
    if (failedResults.length > 0) {
      const failedMessages = failedResults.map((r: { name: string; message: string }) => `• ${r.name}: ${r.message}`).join('\n')
      ElMessageBox.alert(`失败的测试:\n${failedMessages}\n\n请查看控制台获取详细错误信息`, '测试结果', { type: 'warning' })
    }
  } catch (error) {
    console.error('测试执行失败:', error)
    ElMessage.error('测试执行失败，请查看控制台获取详细信息')
  } finally {
    testingDataPersistence.value = false
  }
}

const handleSyncConfigChange = () => {
  dataSyncService.updateSyncConfig(syncConfig.value)
  ElMessage.success('同步配置已更新')
}

const handleManualSync = async () => {
  try {
    ElMessage.info('开始同步数据到云端...')
    const success = await dataSyncService.syncAllData()
    syncStatus.value = dataSyncService.getSyncStatus()
    if (success) { ElMessage.success('数据同步完成') }
    else { ElMessage.warning('数据同步完成，但有部分失败项') }
  } catch (error) {
    console.error('手动同步失败:', error)
    ElMessage.error('数据同步失败，请检查网络连接和OSS配置')
  }
}

const handleRestoreData = async () => {
  try {
    await ElMessageBox.confirm('确定要从云端恢复数据吗？这将覆盖本地数据。', '恢复数据确认', {
      confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning'
    })
    ElMessage.info('开始从云端恢复数据...')
    const success = await dataSyncService.restoreFromOSS()
    if (success) { ElMessage.success('数据恢复完成'); location.reload() }
    else { ElMessage.error('数据恢复失败') }
  } catch (error) {
    if (error !== 'cancel') { console.error('数据恢复失败:', error); ElMessage.error('数据恢复失败，请重试') }
  }
}

const handleCheckIntegrity = async () => {
  try {
    ElMessage.info('正在检查数据完整性...')
    const isValid = await dataSyncService.checkDataIntegrity()
    if (isValid) { ElMessage.success('数据完整性检查通过') }
    else { ElMessage.warning('数据完整性检查发现问题，建议重新同步') }
  } catch (error) {
    console.error('数据完整性检查失败:', error)
    ElMessage.error('数据完整性检查失败')
  }
}

const formatSyncTime = (timeString: string) => {
  try {
    const date = new Date(timeString)
    return date.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch { return timeString }
}

// 定时更新同步状态
let statusTimer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  const updateSyncStatus = () => { syncStatus.value = dataSyncService.getSyncStatus() }
  statusTimer = setInterval(updateSyncStatus, 5000)
})
onUnmounted(() => { if (statusTimer) clearInterval(statusTimer) })
</script>

<style scoped>
.setting-card { border: none; box-shadow: none; }
.card-header { display: flex; justify-content: space-between; align-items: center; padding-left: 2%; }
.header-actions { display: flex; gap: 12px; align-items: center; }
.setting-form { padding: 20px 0; }
.form-tip { display: flex; align-items: center; gap: 6px; margin-top: 8px; font-size: 12px; color: #909399; }
.form-tip-inline { margin-left: 8px; color: #909399; font-size: 12px; }
.setting-form :deep(.el-input-number) { width: 200px; }
.setting-form :deep(.el-switch) { margin-right: 12px; }
.sync-status { display: flex; flex-direction: column; gap: 8px; }
.status-tag { align-self: flex-start; }
.sync-info { font-size: 12px; color: #909399; }
.sync-progress { font-size: 12px; color: #606266; }
.failed-count { color: #f56c6c; font-weight: 500; }
.sync-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.sync-error { margin-bottom: 8px; }
.sync-error:last-child { margin-bottom: 0; }
.quality-option { display: inline-flex; align-items: center; gap: 4px; }
.quality-name { font-weight: 500; }
.quality-desc { color: #909399; font-size: 12px; }
</style>


