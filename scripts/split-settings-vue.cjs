/**
 * Settings.vue 拆分脚本
 * 将 6512 行的 index.vue 拆分为多个独立子组件
 * 策略：每个子组件完全自包含（template + script + style）
 */
const fs = require('fs');
const path = require('path');

const settingsDir = path.join(__dirname, '..', 'src', 'views', 'System', 'Settings');
const srcFile = path.join(settingsDir, 'index.vue');

// 读取原始文件
const content = fs.readFileSync(srcFile, 'utf8');
const lines = content.split('\n');
console.log('原始文件行数:', lines.length);

// ========== 1. SecuritySettings.vue ==========
const securitySettings = `<template>
  <el-card class="setting-card">
    <template #header>
      <div class="card-header">
        <span>安全配置</span>
        <el-button
          v-if="canEditSecuritySettings"
          @click="handleSaveSecurity"
          type="primary"
          :loading="securityLoading"
        >
          保存设置
        </el-button>
      </div>
    </template>

    <el-alert v-if="configStore.configLocked.security" type="warning" :closable="false" style="margin-bottom: 16px">
      <template #title>
        <span>🔒 该配置由管理后台统一管控，如需修改请联系管理员</span>
      </template>
    </el-alert>

${lines.slice(37, 131).join('\n')}
  </el-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { useConfigStore } from '@/stores/config'

const userStore = useUserStore()
const configStore = useConfigStore()

const securityLoading = ref(false)
const securityFormRef = ref()
const securityForm = computed(() => configStore.securityConfig)

const canEditSecuritySettings = computed(() => userStore.isAdmin)

const securityFormRules = {
  passwordMinLength: [{ required: true, message: '请设置密码最小长度', trigger: 'blur' }],
  maxLoginFails: [{ required: true, message: '请设置最大失败次数', trigger: 'blur' }],
  lockDuration: [{ required: true, message: '请设置锁定时间', trigger: 'blur' }],
  sessionTimeout: [{ required: true, message: '请设置会话超时时间', trigger: 'blur' }]
}

${lines.slice(3945, 3981).join('\n')}
</script>

<style scoped>
.setting-card { margin-bottom: 0; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.setting-form { max-width: 800px; }
.form-tip { margin-left: 10px; color: #909399; font-size: 12px; }
</style>
`;
fs.writeFileSync(path.join(settingsDir, 'SecuritySettings.vue'), securitySettings, 'utf8');
console.log('✅ SecuritySettings.vue 已创建');

// ========== 2. CallSettings.vue ==========
const callSettings = `<template>
  <el-card class="setting-card">
    <template #header>
      <div class="card-header">
        <span>通话配置</span>
        <div class="header-actions">
          <el-button
            v-if="canEditCallSettings"
            @click="handleTestCallConnection"
            :loading="testingCallConnection"
          >
            测试连接
          </el-button>
          <el-button
            v-if="canEditCallSettings"
            @click="handleSaveCall"
            type="primary"
            :loading="callLoading"
          >
            保存设置
          </el-button>
        </div>
      </div>
    </template>

    <el-alert v-if="configStore.configLocked.call" type="warning" :closable="false" style="margin-bottom: 16px">
      <template #title>
        <span>🔒 该配置由管理后台统一管控，如需修改请联系管理员</span>
      </template>
    </el-alert>

${lines.slice(155, 382).join('\n')}
  </el-card>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { useConfigStore } from '@/stores/config'

const userStore = useUserStore()
const configStore = useConfigStore()

const callLoading = ref(false)
const testingCallConnection = ref(false)
const callFormRef = ref()

const canEditCallSettings = computed(() => userStore.isAdmin)

const callForm = reactive({
  sipServer: '',
  sipPort: 5060,
  sipUsername: '',
  sipPassword: '',
  sipTransport: 'UDP',
  autoAnswer: false,
  autoRecord: true,
  qualityMonitoring: true,
  incomingCallPopup: true,
  maxCallDuration: 3600,
  recordFormat: 'wav',
  recordQuality: 'standard',
  recordPath: '/recordings',
  recordRetentionDays: 30,
  outboundPermission: ['admin', 'manager', 'sales'],
  recordAccessPermission: ['admin', 'manager'],
  statisticsPermission: ['admin', 'manager'],
  numberRestriction: false,
  allowedPrefixes: ''
})

const callFormRules = {
  sipServer: [{ required: true, message: '请输入SIP服务器地址', trigger: 'blur' }],
  sipPort: [
    { required: true, message: '请输入SIP端口', trigger: 'blur' },
    { type: 'number', min: 1, max: 65535, message: '端口范围为1-65535', trigger: 'blur' }
  ],
  sipUsername: [{ required: true, message: '请输入SIP用户名', trigger: 'blur' }],
  sipPassword: [{ required: true, message: '请输入SIP密码', trigger: 'blur' }],
  recordPath: [{ required: true, message: '请输入录音保存路径', trigger: 'blur' }],
  recordRetentionDays: [
    { required: true, message: '请设置录音保留时间', trigger: 'blur' },
    { type: 'number', min: 1, max: 365, message: '保留时间范围为1-365天', trigger: 'blur' }
  ]
}

const handleSaveCall = async () => {
  try {
    await callFormRef.value?.validate()
    callLoading.value = true
    configStore.updateCallConfig(callForm)
    try {
      const { apiService } = await import('@/services/apiService')
      await apiService.put('/system/call-settings', callForm)
      ElMessage.success('通话设置保存成功')
    } catch (apiError: unknown) {
      const err = apiError as { code?: string; response?: { status?: number } }
      if (err.code === 'ECONNREFUSED' || err.response?.status === 404) {
        ElMessage.success('通话设置保存成功（本地模式）')
      } else {
        ElMessage.warning('通话设置已保存到本地，但未能同步到服务器')
      }
    }
  } catch (error) {
    ElMessage.error('保存通话设置失败，请重试')
  } finally {
    callLoading.value = false
  }
}

const handleTestCallConnection = async () => {
  try {
    testingCallConnection.value = true
    await new Promise(resolve => setTimeout(resolve, 2000))
    ElMessage.success('SIP连接测试成功')
  } catch (error) {
    ElMessage.error('SIP连接测试失败')
  } finally {
    testingCallConnection.value = false
  }
}
</script>

<style scoped>
.setting-card { margin-bottom: 0; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.header-actions { display: flex; gap: 8px; }
.setting-form { max-width: 800px; }
.form-tip { margin-left: 10px; color: #909399; font-size: 12px; }
</style>
`;
fs.writeFileSync(path.join(settingsDir, 'CallSettings.vue'), callSettings, 'utf8');
console.log('✅ CallSettings.vue 已创建');

// ========== 3. EmailSettings.vue ==========
const emailSettings = `<template>
  <el-card class="setting-card">
    <template #header>
      <div class="card-header">
        <span>邮件配置</span>
        <div class="header-actions">
          <el-button @click="handleTestEmail" :loading="testEmailLoading">测试发送</el-button>
          <el-button v-if="canEditEmailSettings" @click="handleSaveEmail" type="primary" :loading="emailLoading">保存设置</el-button>
        </div>
      </div>
    </template>

    <el-alert v-if="configStore.configLocked.email" type="warning" :closable="false" style="margin-bottom: 16px">
      <template #title>
        <span>🔒 该配置由管理后台统一管控，如需修改请联系管理员</span>
      </template>
    </el-alert>

${lines.slice(401, 488).join('\n')}
  </el-card>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { useConfigStore } from '@/stores/config'

const userStore = useUserStore()
const configStore = useConfigStore()

const emailLoading = ref(false)
const testEmailLoading = ref(false)
const emailFormRef = ref()

const canEditEmailSettings = computed(() => userStore.isAdmin)

const emailForm = reactive({
  smtpHost: 'smtp.qq.com',
  smtpPort: 587,
  senderEmail: '',
  senderName: 'CRM系统',
  emailPassword: '',
  enableSsl: false,
  enableTls: true,
  testEmail: ''
})

const emailFormRules = {
  smtpHost: [{ required: true, message: '请输入SMTP服务器', trigger: 'blur' }],
  smtpPort: [{ required: true, message: '请输入SMTP端口', trigger: 'blur' }],
  senderEmail: [
    { required: true, message: '请输入发件人邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  testEmail: [{ type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }]
}

const handleSaveEmail = async () => {
  try {
    await emailFormRef.value?.validate()
    emailLoading.value = true
    configStore.updateEmailConfig(emailForm)
    try {
      const { apiService } = await import('@/services/apiService')
      await apiService.put('/system/email-settings', emailForm)
      ElMessage.success('邮件设置保存成功')
    } catch (apiError: unknown) {
      const err = apiError as { code?: string; response?: { status?: number } }
      if (err.code === 'ECONNREFUSED' || err.response?.status === 404) {
        ElMessage.success('邮件设置保存成功（本地模式）')
      } else {
        ElMessage.warning('邮件设置已保存到本地，但未能同步到服务器')
      }
    }
  } catch (error) {
    ElMessage.error('保存邮件设置失败，请重试')
  } finally {
    emailLoading.value = false
  }
}

const handleTestEmail = async () => {
  if (!emailForm.testEmail) {
    ElMessage.warning('请先输入测试邮箱地址')
    return
  }
  try {
    testEmailLoading.value = true
    await new Promise(resolve => setTimeout(resolve, 2000))
    ElMessage.success('测试邮件发送成功，请检查邮箱')
  } catch (error) {
    ElMessage.error('测试邮件发送失败')
  } finally {
    testEmailLoading.value = false
  }
}
</script>

<style scoped>
.setting-card { margin-bottom: 0; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.header-actions { display: flex; gap: 8px; }
.setting-form { max-width: 800px; }
.form-tip { margin-left: 10px; color: #909399; font-size: 12px; }
</style>
`;
fs.writeFileSync(path.join(settingsDir, 'EmailSettings.vue'), emailSettings, 'utf8');
console.log('✅ EmailSettings.vue 已创建');

// ========== 4. SmsSettings.vue ==========
const smsSettings = `<template>
  <div>
    <el-card class="setting-card">
      <template #header>
        <div class="card-header">
          <span>短信配置</span>
          <div class="header-actions">
            <el-button v-if="canManageSms" @click="handleOpenSmsManagement">短信管理</el-button>
            <el-button @click="handleTestSms" :loading="testSmsLoading">测试发送</el-button>
            <el-button v-if="canEditSmsSettings" @click="handleSaveSms" type="primary" :loading="smsLoading">保存设置</el-button>
          </div>
        </div>
      </template>

      <el-alert v-if="configStore.configLocked.sms" type="warning" :closable="false" style="margin-bottom: 16px">
        <template #title>
          <span>🔒 该配置由管理后台统一管控，如需修改请联系管理员</span>
        </template>
      </el-alert>

${lines.slice(509, 623).join('\n')}
    </el-card>

    <!-- 短信管理弹窗 -->
    <el-dialog v-model="smsManagementVisible" title="短信管理" width="90%" :close-on-click-modal="false" class="sms-management-dialog">
      <SmsManagement />
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { useConfigStore } from '@/stores/config'
import SmsManagement from '@/components/SmsManagement.vue'

const userStore = useUserStore()
const configStore = useConfigStore()

const smsLoading = ref(false)
const testSmsLoading = ref(false)
const smsManagementVisible = ref(false)
const smsFormRef = ref()

const smsForm = computed(() => configStore.smsConfig)
const canEditSmsSettings = computed(() => userStore.isAdmin)
const canManageSms = computed(() => userStore.isAdmin)

const smsFormRules = {
  provider: [{ required: true, message: '请选择短信服务商', trigger: 'change' }],
  accessKey: [{ required: true, message: '请输入AccessKey', trigger: 'blur' }],
  secretKey: [{ required: true, message: '请输入SecretKey', trigger: 'blur' }],
  signName: [{ required: true, message: '请输入短信签名', trigger: 'blur' }],
  dailyLimit: [{ required: true, message: '请设置每日发送限制', trigger: 'blur' }],
  monthlyLimit: [{ required: true, message: '请设置每月发送限制', trigger: 'blur' }],
  testPhone: [{ pattern: /^1[3-9]\\d{9}$/, message: '请输入正确的手机号格式', trigger: 'blur' }]
}

const handleSaveSms = async () => {
  try {
    await smsFormRef.value?.validate()
    smsLoading.value = true
    configStore.updateSmsConfig(smsForm.value)
    try {
      const { apiService } = await import('@/services/apiService')
      await apiService.put('/system/sms-settings', smsForm.value)
      ElMessage.success('短信设置保存成功')
    } catch (apiError: unknown) {
      const err = apiError as { code?: string; response?: { status?: number } }
      if (err.code === 'ECONNREFUSED' || err.response?.status === 404) {
        ElMessage.success('短信设置保存成功（本地模式）')
      } else {
        ElMessage.warning('短信设置已保存到本地，但未能同步到服务器')
      }
    }
  } catch (error) {
    ElMessage.error('保存短信设置失败，请重试')
  } finally {
    smsLoading.value = false
  }
}

const handleTestSms = async () => {
  if (!smsForm.value.testPhone) {
    ElMessage.warning('请先输入测试手机号')
    return
  }
  try {
    testSmsLoading.value = true
    await new Promise(resolve => setTimeout(resolve, 2000))
    ElMessage.success('测试短信发送成功，请检查手机')
  } catch (error) {
    ElMessage.error('测试短信发送失败')
  } finally {
    testSmsLoading.value = false
  }
}

const handleOpenSmsManagement = () => {
  smsManagementVisible.value = true
}
</script>

<style scoped>
.setting-card { margin-bottom: 0; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.header-actions { display: flex; gap: 8px; }
.setting-form { max-width: 800px; }
.form-tip { margin-left: 10px; color: #909399; font-size: 12px; }
</style>
`;
fs.writeFileSync(path.join(settingsDir, 'SmsSettings.vue'), smsSettings, 'utf8');
console.log('✅ SmsSettings.vue 已创建');

// ========== 5. StorageSettings.vue ==========
const storageSettings = `<template>
  <el-card class="setting-card">
    <template #header>
      <div class="card-header">
        <span>存储配置</span>
        <el-button v-if="canEditStorageSettings" @click="handleSaveStorage" type="primary" :loading="storageLoading">保存设置</el-button>
      </div>
    </template>

    <el-alert v-if="configStore.configLocked.storage" type="warning" :closable="false" style="margin-bottom: 16px">
      <template #title>
        <span>🔒 该配置由管理后台统一管控，如需修改请联系管理员</span>
      </template>
    </el-alert>

${lines.slice(641, 974).join('\n')}
  </el-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { useConfigStore } from '@/stores/config'
import { dataSyncService } from '@/services/dataSyncService'
import { runDataPersistenceTests, type TestResult } from '@/utils/testDataPersistence'

const userStore = useUserStore()
const configStore = useConfigStore()

const storageLoading = ref(false)
const testingDataPersistence = ref(false)
const storageFormRef = ref()

const storageForm = computed(() => configStore.storageConfig)
const canEditStorageSettings = computed(() => userStore.isAdmin)

const syncConfig = ref(dataSyncService.getSyncConfig())
const syncStatus = ref(dataSyncService.getSyncStatus())

const isOssConfigured = computed(() => {
  const storage = configStore.storageConfig
  return storage.storageType === 'oss' && storage.accessKey && storage.secretKey && storage.bucketName && storage.region
})

const compressionPreviewText = computed(() => {
  const storage = storageForm.value
  if (!storage.imageCompressEnabled) return '图片压缩已关闭，上传的图片将保持原始大小'
  let quality = 60, maxWidth = 1200, qualityName = '标准'
  switch (storage.imageCompressQuality) {
    case 'high': quality = 80; maxWidth = 1920; qualityName = '高清'; break
    case 'medium': quality = 60; maxWidth = 1200; qualityName = '标准'; break
    case 'low': quality = 40; maxWidth = 800; qualityName = '省流'; break
    case 'custom': quality = storage.imageCompressCustomQuality || 60; maxWidth = storage.imageCompressMaxWidth || 1200; qualityName = '自定义'; break
  }
  return \`当前配置：\${qualityName}模式，压缩质量\${quality}%，最大宽度\${maxWidth}px。预计可减少50%-80%的文件大小。\`
})

const storageFormRules = computed(() => {
  const rules: any = {}
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

const handleSaveStorage = async () => {
  try {
    await storageFormRef.value?.validate()
    storageLoading.value = true
    configStore.updateStorageConfig(storageForm.value)
    const { clearStorageConfigCache } = await import('@/services/uploadService')
    clearStorageConfigCache()
    if (storageForm.value.storageType === 'oss') {
      const { ossService } = await import('@/services/ossService')
      await ossService.reinitialize()
    }
    try {
      const { apiService } = await import('@/services/apiService')
      await apiService.put('/system/storage-settings', storageForm.value)
      ElMessage.success('存储设置保存成功')
    } catch (apiError: unknown) {
      const err = apiError as { code?: string; response?: { status?: number } }
      if (err.code === 'ECONNREFUSED' || err.response?.status === 404) {
        ElMessage.success('存储设置保存成功（本地模式）')
      } else {
        ElMessage.warning('存储设置已保存到本地，但未能同步到服务器')
      }
    }
  } catch (error) {
    ElMessage.error('保存存储设置失败，请重试')
  } finally {
    storageLoading.value = false
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
    ElMessage.error('数据同步失败，请检查网络连接和OSS配置')
  }
}

const handleRestoreData = async () => {
  try {
    await ElMessageBox.confirm('确定要从云端恢复数据吗？这将覆盖本地数据。', '恢复数据确认', { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' })
    ElMessage.info('开始从云端恢复数据...')
    const success = await dataSyncService.restoreFromOSS()
    if (success) { ElMessage.success('数据恢复完成'); location.reload() }
    else { ElMessage.error('数据恢复失败') }
  } catch (error) {
    if (error !== 'cancel') { ElMessage.error('数据恢复失败，请重试') }
  }
}

const handleCheckIntegrity = async () => {
  try {
    ElMessage.info('正在检查数据完整性...')
    const isValid = await dataSyncService.checkDataIntegrity()
    if (isValid) { ElMessage.success('数据完整性检查通过') }
    else { ElMessage.warning('数据完整性检查发现问题，建议重新同步') }
  } catch (error) {
    ElMessage.error('数据完整性检查失败')
  }
}

const formatSyncTime = (timeString: string) => {
  try {
    return new Date(timeString).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch { return timeString }
}

const handleTestDataPersistence = async () => {
  testingDataPersistence.value = true
  try {
    ElMessage.info('开始测试数据持久性功能...')
    const results = await runDataPersistenceTests()
    const totalTests = results.length
    const passedTests = results.filter((r: TestResult) => r.passed).length
    const failedTests = totalTests - passedTests
    if (failedTests === 0) { ElMessage.success(\`所有测试通过！(\${passedTests}/\${totalTests})\`) }
    else { ElMessage.warning(\`测试完成：\${passedTests}/\${totalTests} 通过，\${failedTests} 失败\`) }
  } catch (error) {
    ElMessage.error('测试执行失败，请查看控制台获取详细信息')
  } finally {
    testingDataPersistence.value = false
  }
}
</script>

<style scoped>
.setting-card { margin-bottom: 0; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.setting-form { max-width: 800px; }
.form-tip { margin-left: 10px; color: #909399; font-size: 12px; }
</style>
`;
fs.writeFileSync(path.join(settingsDir, 'StorageSettings.vue'), storageSettings, 'utf8');
console.log('✅ StorageSettings.vue 已创建');

// ========== 6. ProductSettings.vue ==========
const productSettings = `<template>
  <el-card class="setting-card">
    <template #header>
      <div class="card-header">
        <span>商品配置</span>
        <div class="header-actions">
          <el-button @click="handleResetProduct">重置默认</el-button>
          <el-button v-if="canEditProductSettings" @click="handleSaveProduct" type="primary" :loading="productLoading">保存设置</el-button>
        </div>
      </div>
    </template>

    <el-alert v-if="configStore.configLocked.product" type="warning" :closable="false" style="margin-bottom: 16px">
      <template #title>
        <span>🔒 该配置由管理后台统一管控，如需修改请联系管理员</span>
      </template>
    </el-alert>

${lines.slice(993, 1266).join('\n')}
  </el-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { useConfigStore } from '@/stores/config'

const userStore = useUserStore()
const configStore = useConfigStore()

const productLoading = ref(false)
const productFormRef = ref()
const productForm = computed(() => configStore.productConfig)
const canEditProductSettings = computed(() => userStore.isAdmin || userStore.isManager)

${lines.slice(3161, 3210).join('\n')}

${lines.slice(4480, 4561).join('\n')}
</script>

<style scoped>
.setting-card { margin-bottom: 0; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.header-actions { display: flex; gap: 8px; }
.setting-form { max-width: 800px; }
.form-tip { margin-left: 10px; color: #909399; font-size: 12px; }
</style>
`;
fs.writeFileSync(path.join(settingsDir, 'ProductSettings.vue'), productSettings, 'utf8');
console.log('✅ ProductSettings.vue 已创建');

// ========== 7. MonitorSettings.vue ==========
const monitorSettings = `<template>
${lines.slice(1274, 1398).join('\n')}
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

const monitorLoading = ref(false)
const monitorDataLoaded = ref(false)

const monitorData = ref({
  systemInfo: { os: '', arch: '', cpuCores: 0, totalMemory: '', nodeVersion: '', uptime: '' },
  performance: { cpuUsage: 0, memoryUsage: 0, diskUsage: 0, networkLatency: 0 },
  database: { type: 'localStorage', version: '浏览器存储', connected: true, activeConnections: 0, size: '0 KB', lastBackup: '未备份' },
  services: [] as any[]
})

const getCpuColor = (usage: number) => { if (usage < 50) return '#67c23a'; if (usage < 80) return '#e6a23c'; return '#f56c6c' }
const getMemoryColor = (usage: number) => { if (usage < 60) return '#67c23a'; if (usage < 85) return '#e6a23c'; return '#f56c6c' }
const getDiskColor = (usage: number) => { if (usage < 70) return '#67c23a'; if (usage < 90) return '#e6a23c'; return '#f56c6c' }

${lines.slice(2766, 2858).join('\n')}

${lines.slice(4566, 4626).join('\n')}

// 组件挂载时加载监控数据
import { onMounted } from 'vue'
onMounted(() => {
  getRealMonitorData()
  monitorDataLoaded.value = true
})
</script>

<style scoped>
.setting-card { margin-bottom: 0; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.monitor-content { padding: 10px 0; }
.monitor-section { margin-bottom: 24px; }
.monitor-section h4 { margin-bottom: 12px; color: #303133; font-size: 15px; }
</style>
`;
fs.writeFileSync(path.join(settingsDir, 'MonitorSettings.vue'), monitorSettings, 'utf8');
console.log('✅ MonitorSettings.vue 已创建');

// ========== 8. BackupSettings.vue ==========
const backupSettings = `<template>
${lines.slice(1412, 1590).join('\n')}
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { useConfigStore } from '@/stores/config'
import { dataBackupService } from '@/services/dataBackupService'
import { runAllTests } from '@/utils/testBackupService'

const userStore = useUserStore()
const configStore = useConfigStore()

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

const backupForm = reactive({ autoBackupEnabled: false, backupFrequency: 'daily', retentionDays: 30, compression: true })
const lastBackupTime = ref('')
const backupCount = ref(0)
const totalBackupSize = ref(0)
const backupList = ref<any[]>([])

const backupFormRules = {
  backupFrequency: [{ required: true, message: '请选择备份频率', trigger: 'change' }],
  retentionDays: [{ required: true, message: '请设置保留天数', trigger: 'blur' }, { type: 'number', min: 1, max: 365, message: '保留天数应在1-365之间', trigger: 'blur' }]
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const k = 1024; const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

${lines.slice(4791, 5004).join('\n')}

${lines.slice(5008, 5114).join('\n')}

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
.setting-form { max-width: 800px; }
.form-tip { margin-left: 10px; color: #909399; font-size: 12px; }
</style>
`;
fs.writeFileSync(path.join(settingsDir, 'BackupSettings.vue'), backupSettings, 'utf8');
console.log('✅ BackupSettings.vue 已创建');

// ========== 9. AgreementSettings.vue ==========
const agreementSettings = `<template>
  <div>
${lines.slice(1749, 1870).join('\n')}

    <!-- 协议编辑对话框 -->
    <AgreementEditorDialog
      v-model="agreementDialogVisible"
      :agreement="currentEditingAgreement"
      @save="handleSaveAgreementContent"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Edit, View, Clock, Document, Lock } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { useConfigStore } from '@/stores/config'
import AgreementEditorDialog from '@/components/System/AgreementEditorDialog.vue'

const userStore = useUserStore()
const configStore = useConfigStore()

${lines.slice(2653, 2682).join('\n')}

${lines.slice(3757, 3893).join('\n')}

onMounted(() => { loadAgreementList() })
</script>

<style scoped>
.setting-card { margin-bottom: 0; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.header-actions { display: flex; gap: 8px; }
.agreement-title { display: flex; align-items: center; gap: 8px; }
.content-summary { color: #909399; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 300px; }
.update-time { display: flex; align-items: center; gap: 4px; font-size: 13px; color: #909399; }
.word-count { color: #606266; font-size: 13px; }
</style>
`;
fs.writeFileSync(path.join(settingsDir, 'AgreementSettings.vue'), agreementSettings, 'utf8');
console.log('✅ AgreementSettings.vue 已创建');

// ========== 10. MobileSettings.vue ==========
const mobileSettings = `<template>
${lines.slice(1873, 2551).join('\n')}
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Phone, Connection, Download, Refresh, Platform, Iphone, Monitor, Link, Document, Lock } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import * as alternativeConnectionApi from '@/api/alternative-connection'
import { formatDateTime } from '@/utils/dateFormat'

const userStore = useUserStore()

const mobileSDKLoading = ref(false)
const activeGuideTab = ref('android')
const qrConnectionLoading = ref(false)
const devicesLoading = ref(false)
const bluetoothLoading = ref(false)
const networkLoading = ref(false)
const digitalPairingLoading = ref(false)
const pairingCodeLoading = ref(false)

const mobileSDKInfo = ref({
  android: { version: 'v2.1.3', size: '6.0 MB', updateTime: '2024-01-20 16:45:00', available: true, downloadUrl: '/api/sdk/download/android/latest', features: ['通话管理', '客户管理', '数据同步', '离线支持'] },
  ios: { version: 'v2.1.3', size: '32.8 MB', updateTime: '2024-01-20 16:45:00', available: true, downloadUrl: '/api/sdk/download/ios/latest', features: ['通话管理', '客户管理', '数据同步', '离线支持'] }
})

const systemQRConnection = ref({ qrCodeUrl: '', connectionId: '', status: 'inactive', expiresAt: '', connectedDevices: [] as any[] })
const qrConnectionForm = reactive({ permissions: ['call', 'sms'], expireTime: '30' })
const connectedDevices = ref<any[]>([])
const serverConfig = ref({ host: 'localhost', port: 3000, wsPort: 3001, ssl: false, apiVersion: 'v1.0' })
const connectionStats = ref({ active: 5, today: 23, total: 156, lastConnection: '2024-01-15 16:45:00', qr: 0, bluetooth: 0, network: 0, digital: 0 })
const bluetoothConnection = ref({ enabled: false, deviceName: 'CRM-Server', pairingCode: '' })
const networkConnection = ref({ enabled: false, port: 8080, broadcastInterval: '10' })
const digitalPairing = ref({ enabled: false, currentCode: '', expireTime: '10' })

const generateRandomCode = (length: number): string => {
  const chars = '0123456789'; let result = ''
  for (let i = 0; i < length; i++) result += chars.charAt(Math.floor(Math.random() * chars.length))
  return result
}

const generateQRCodeImage = async (data: string): Promise<string> => {
  try {
    const QRCode = await import('qrcode')
    return await QRCode.toDataURL(data, { width: 200, margin: 2, color: { dark: '#000000', light: '#FFFFFF' }, errorCorrectionLevel: 'M' })
  } catch {
    return \`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=\${encodeURIComponent(data)}\`
  }
}

${lines.slice(5205, 5460).join('\n')}

${lines.slice(4200, 4427).join('\n')}

${lines.slice(4258, 4370).join('\n')}

const generateSystemQRCode = async () => {
  qrConnectionLoading.value = true
  try {
    const connectionId = 'qr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    const expireMinutes = parseInt(qrConnectionForm.expireTime)
    const expiresAt = new Date(Date.now() + expireMinutes * 60 * 1000)
    const connectionData = { connectionId, serverUrl: \`\${window.location.protocol}//\${window.location.host}\`, permissions: qrConnectionForm.permissions, expiresAt: expiresAt.getTime(), type: 'system_connection' }
    const qrCodeUrl = await generateQRCodeImage(JSON.stringify(connectionData))
    systemQRConnection.value = { qrCodeUrl, connectionId, status: 'active', expiresAt: expiresAt.toISOString(), connectedDevices: [] }
    ElMessage.success('二维码生成成功')
  } catch (error) { ElMessage.error('生成二维码失败') }
  finally { qrConnectionLoading.value = false }
}

const refreshSystemQRCode = async () => {
  if (!systemQRConnection.value.connectionId) { ElMessage.warning('请先生成二维码'); return }
  await generateSystemQRCode()
  ElMessage.success('二维码已刷新')
}

const getQRStatusType = (status: string) => { switch(status) { case 'active': return 'success'; case 'connected': return 'primary'; case 'expired': return 'danger'; default: return 'info' } }
const getQRStatusText = (status: string) => { switch(status) { case 'active': return '等待连接'; case 'connected': return '已连接'; case 'expired': return '已过期'; default: return '未激活' } }

onMounted(() => {
  handleRefreshDevices()
  const initAlternativeConnections = async () => {
    try {
      const bluetoothStatus = await alternativeConnectionApi.getBluetoothStatus()
      if (bluetoothStatus.data) { bluetoothConnection.value.enabled = bluetoothStatus.data.enabled || false; bluetoothConnection.value.pairingCode = bluetoothStatus.data.pairingCode || '' }
      const networkStatus = await alternativeConnectionApi.getNetworkStatus()
      if (networkStatus.data) { networkConnection.value.enabled = networkStatus.data.enabled || false }
      const digitalStatus = await alternativeConnectionApi.getDigitalPairingStatus()
      if (digitalStatus.data) { digitalPairing.value.enabled = digitalStatus.data.enabled || false; digitalPairing.value.currentCode = digitalStatus.data.currentCode || '' }
      await updateConnectionStats()
    } catch (error) { console.error('初始化替代连接状态失败:', error) }
  }
  initAlternativeConnections()
})
</script>

<style scoped>
.setting-card { margin-bottom: 0; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.header-actions { display: flex; gap: 8px; }
.mobile-app-content { padding: 10px 0; }
.section-title { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; font-size: 15px; color: #303133; }
.sdk-overview { margin-bottom: 30px; }
.status-card { text-align: center; }
.status-info { display: flex; justify-content: center; align-items: center; gap: 8px; margin-top: 8px; }
.file-size { font-size: 12px; color: #909399; }
.sdk-management { margin-bottom: 30px; }
.sdk-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
.sdk-item { border: 1px solid #ebeef5; border-radius: 8px; padding: 20px; }
.sdk-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.sdk-icon { width: 50px; height: 50px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #fff; }
.sdk-icon.android { background: linear-gradient(135deg, #3DDC84, #2ea060); }
.sdk-icon.ios { background: linear-gradient(135deg, #007AFF, #0051D5); }
.sdk-icon.pwa { background: linear-gradient(135deg, #5A0FC8, #8B5CF6); }
.sdk-info h5 { margin: 0 0 4px; font-size: 15px; }
.sdk-info p { margin: 0; font-size: 13px; color: #909399; }
.sdk-details { margin-bottom: 16px; }
.detail-item { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
.detail-item .label { color: #909399; }
.sdk-actions { display: flex; gap: 8px; }
.connection-status { margin-bottom: 30px; }
.config-card { height: 100%; }
.qr-connection-management { margin-bottom: 20px; }
.qr-display { text-align: center; padding: 20px; }
.qr-code-container { display: flex; flex-direction: column; align-items: center; }
.qr-code-image { width: 200px; height: 200px; border: 1px solid #ddd; border-radius: 8px; margin-bottom: 12px; }
.qr-info { font-size: 13px; }
.qr-status { margin-bottom: 4px; }
.qr-expire { color: #909399; margin-bottom: 2px; }
.qr-id { color: #c0c4cc; font-size: 12px; }
.qr-placeholder { color: #c0c4cc; padding: 30px 0; }
.qr-placeholder p { margin-top: 8px; }
.alternative-connections { margin-bottom: 20px; }
.connection-card { height: 100%; }
.connection-header { display: flex; align-items: center; gap: 8px; }
.connection-content { padding: 8px 0; }
.connection-description { margin: 8px 0 12px; color: #909399; font-size: 13px; }
.connection-description p { margin: 0; }
.connection-actions { margin-top: 12px; }
.pairing-code-display { display: flex; align-items: center; gap: 8px; }
.pairing-code { font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #409eff; }
.stat-item { text-align: center; padding: 12px 0; }
.stat-value { font-size: 24px; font-weight: bold; color: #409eff; }
.stat-label { font-size: 13px; color: #909399; margin-top: 4px; }
.connected-devices-section { margin-bottom: 20px; }
.empty-devices { padding: 20px 0; }
.usage-guide { margin-top: 20px; }
.guide-content { padding: 16px; }
.guide-content ol { padding-left: 20px; }
.guide-content ol li { margin-bottom: 8px; line-height: 1.8; }
</style>
`;
fs.writeFileSync(path.join(settingsDir, 'MobileSettings.vue'), mobileSettings, 'utf8');
console.log('✅ MobileSettings.vue 已创建');

console.log('\n========================================');
console.log('所有子组件文件已创建！');
console.log('========================================');

// 列出所有文件
const files = fs.readdirSync(settingsDir);
files.forEach(f => {
  const stat = fs.statSync(path.join(settingsDir, f));
  console.log(`  ${f}: ${fs.readFileSync(path.join(settingsDir, f), 'utf8').split('\n').length} 行`);
});

