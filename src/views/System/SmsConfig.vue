<template>
  <div class="sms-config">
    <div class="page-header">
      <h2>短信配置管理</h2>
      <p>管理短信服务的各项配置参数</p>
    </div>

    <el-tabs v-model="activeTab" type="border-card">
      <!-- 基础配置 -->
      <el-tab-pane label="基础配置" name="basic">
        <el-form
          :model="basicConfig"
          :rules="basicRules"
          ref="basicFormRef"
          label-width="120px"
          class="config-form"
        >
          <el-card class="config-card">
            <template #header>
              <span>服务商配置</span>
            </template>

            <el-form-item label="服务商" prop="provider">
              <el-select v-model="basicConfig.provider" style="width: 300px">
                <el-option label="阿里云短信" value="aliyun" />
                <el-option label="腾讯云短信" value="tencent" />
                <el-option label="华为云短信" value="huawei" />
                <el-option label="网易云信" value="netease" />
              </el-select>
            </el-form-item>

            <el-form-item label="AccessKey ID" prop="accessKeyId">
              <el-input
                v-model="basicConfig.accessKeyId"
                placeholder="请输入AccessKey ID"
                style="width: 400px"
                show-password
              />
            </el-form-item>

            <el-form-item label="AccessKey Secret" prop="accessKeySecret">
              <el-input
                v-model="basicConfig.accessKeySecret"
                placeholder="请输入AccessKey Secret"
                style="width: 400px"
                show-password
              />
            </el-form-item>

            <el-form-item label="签名名称" prop="signName">
              <el-input
                v-model="basicConfig.signName"
                placeholder="请输入短信签名"
                style="width: 300px"
              />
              <div class="form-tip">短信签名需要在服务商平台申请并审核通过</div>
            </el-form-item>

            <el-form-item label="服务地域" prop="region">
              <el-select v-model="basicConfig.region" style="width: 200px">
                <el-option label="华东1（杭州）" value="cn-hangzhou" />
                <el-option label="华北2（北京）" value="cn-beijing" />
                <el-option label="华南1（深圳）" value="cn-shenzhen" />
              </el-select>
            </el-form-item>
          </el-card>

          <el-card class="config-card">
            <template #header>
              <span>发送配置</span>
            </template>

            <el-form-item label="单次发送上限" prop="batchLimit">
              <el-input-number
                v-model="basicConfig.batchLimit"
                :min="1"
                :max="1000"
                style="width: 200px"
              />
              <span class="unit-text">条</span>
            </el-form-item>

            <el-form-item label="发送频率限制" prop="rateLimit">
              <el-input-number
                v-model="basicConfig.rateLimit"
                :min="1"
                :max="100"
                style="width: 200px"
              />
              <span class="unit-text">条/分钟</span>
            </el-form-item>

            <el-form-item label="重试次数" prop="retryCount">
              <el-input-number
                v-model="basicConfig.retryCount"
                :min="0"
                :max="5"
                style="width: 200px"
              />
              <span class="unit-text">次</span>
            </el-form-item>

            <el-form-item label="超时时间" prop="timeout">
              <el-input-number
                v-model="basicConfig.timeout"
                :min="5"
                :max="60"
                style="width: 200px"
              />
              <span class="unit-text">秒</span>
            </el-form-item>
          </el-card>

          <div class="form-actions">
            <el-button type="primary" @click="saveBasicConfig" :loading="saving">
              保存配置
            </el-button>
            <el-button @click="testConnection" :loading="testing">
              测试连接
            </el-button>
            <el-button @click="resetBasicConfig">
              重置
            </el-button>
          </div>
        </el-form>
      </el-tab-pane>

      <!-- 审核配置 -->
      <el-tab-pane label="审核配置" name="approval">
        <el-form
          :model="approvalConfig"
          :rules="approvalRules"
          ref="approvalFormRef"
          label-width="120px"
          class="config-form"
        >
          <el-card class="config-card">
            <template #header>
              <span>审核流程</span>
            </template>

            <el-form-item label="启用审核" prop="enabled">
              <el-switch v-model="approvalConfig.enabled" />
              <div class="form-tip">开启后，所有短信发送都需要审核</div>
            </el-form-item>

            <el-form-item label="自动审核阈值" prop="autoApprovalLimit" v-if="approvalConfig.enabled">
              <el-input-number
                v-model="approvalConfig.autoApprovalLimit"
                :min="0"
                :max="100"
                style="width: 200px"
              />
              <span class="unit-text">条</span>
              <div class="form-tip">低于此数量的发送申请将自动审核通过</div>
            </el-form-item>

            <el-form-item label="审核超时时间" prop="approvalTimeout" v-if="approvalConfig.enabled">
              <el-input-number
                v-model="approvalConfig.approvalTimeout"
                :min="1"
                :max="72"
                style="width: 200px"
              />
              <span class="unit-text">小时</span>
            </el-form-item>

            <el-form-item label="审核人员" prop="approvers" v-if="approvalConfig.enabled">
              <el-select
                v-model="approvalConfig.approvers"
                multiple
                placeholder="请选择审核人员"
                style="width: 400px"
              >
                <el-option label="管理员" value="admin" />
                <el-option label="部门主管" value="manager" />
                <el-option label="运营人员" value="operator" />
              </el-select>
            </el-form-item>
          </el-card>

          <el-card class="config-card">
            <template #header>
              <span>通知设置</span>
            </template>

            <el-form-item label="审核通知" prop="notifyOnApproval">
              <el-switch v-model="approvalConfig.notifyOnApproval" />
              <div class="form-tip">审核结果将通知申请人</div>
            </el-form-item>

            <el-form-item label="通知方式" prop="notifyMethods" v-if="approvalConfig.notifyOnApproval">
              <el-checkbox-group v-model="approvalConfig.notifyMethods">
                <el-checkbox label="email">邮件</el-checkbox>
                <el-checkbox label="sms">短信</el-checkbox>
                <el-checkbox label="system">系统通知</el-checkbox>
              </el-checkbox-group>
            </el-form-item>
          </el-card>

          <div class="form-actions">
            <el-button type="primary" @click="saveApprovalConfig" :loading="saving">
              保存配置
            </el-button>
            <el-button @click="resetApprovalConfig">
              重置
            </el-button>
          </div>
        </el-form>
      </el-tab-pane>

      <!-- 安全配置 -->
      <el-tab-pane label="安全配置" name="security">
        <el-form
          :model="securityConfig"
          :rules="securityRules"
          ref="securityFormRef"
          label-width="120px"
          class="config-form"
        >
          <el-card class="config-card">
            <template #header>
              <span>访问控制</span>
            </template>

            <el-form-item label="IP白名单" prop="ipWhitelist">
              <el-input
                v-model="securityConfig.ipWhitelist"
                type="textarea"
                :rows="4"
                placeholder="请输入IP地址，每行一个，支持CIDR格式"
                style="width: 500px"
              />
              <div class="form-tip">只有白名单内的IP才能调用短信接口</div>
            </el-form-item>

            <el-form-item label="API密钥" prop="apiKey">
              <el-input
                v-model="securityConfig.apiKey"
                placeholder="API密钥"
                style="width: 400px"
                readonly
              >
                <template #append>
                  <el-button @click="generateApiKey">重新生成</el-button>
                </template>
              </el-input>
            </el-form-item>

            <el-form-item label="密钥过期时间" prop="keyExpiration">
              <el-input-number
                v-model="securityConfig.keyExpiration"
                :min="1"
                :max="365"
                style="width: 200px"
              />
              <span class="unit-text">天</span>
            </el-form-item>
          </el-card>

          <el-card class="config-card">
            <template #header>
              <span>内容安全</span>
            </template>

            <el-form-item label="敏感词过滤" prop="sensitiveWordFilter">
              <el-switch v-model="securityConfig.sensitiveWordFilter" />
            </el-form-item>

            <el-form-item label="敏感词库" prop="sensitiveWords" v-if="securityConfig.sensitiveWordFilter">
              <el-input
                v-model="securityConfig.sensitiveWords"
                type="textarea"
                :rows="6"
                placeholder="请输入敏感词，每行一个"
                style="width: 500px"
              />
            </el-form-item>

            <el-form-item label="内容长度限制" prop="contentLengthLimit">
              <el-input-number
                v-model="securityConfig.contentLengthLimit"
                :min="10"
                :max="500"
                style="width: 200px"
              />
              <span class="unit-text">字符</span>
            </el-form-item>
          </el-card>

          <div class="form-actions">
            <el-button type="primary" @click="saveSecurityConfig" :loading="saving">
              保存配置
            </el-button>
            <el-button @click="resetSecurityConfig">
              重置
            </el-button>
          </div>
        </el-form>
      </el-tab-pane>

      <!-- 监控配置 -->
      <el-tab-pane label="监控配置" name="monitoring">
        <el-form
          :model="monitoringConfig"
          :rules="monitoringRules"
          ref="monitoringFormRef"
          label-width="120px"
          class="config-form"
        >
          <el-card class="config-card">
            <template #header>
              <span>日志配置</span>
            </template>

            <el-form-item label="启用日志" prop="enableLogging">
              <el-switch v-model="monitoringConfig.enableLogging" />
            </el-form-item>

            <el-form-item label="日志级别" prop="logLevel" v-if="monitoringConfig.enableLogging">
              <el-select v-model="monitoringConfig.logLevel" style="width: 200px">
                <el-option label="DEBUG" value="debug" />
                <el-option label="INFO" value="info" />
                <el-option label="WARN" value="warn" />
                <el-option label="ERROR" value="error" />
              </el-select>
            </el-form-item>

            <el-form-item label="日志保留时间" prop="logRetentionDays" v-if="monitoringConfig.enableLogging">
              <el-input-number
                v-model="monitoringConfig.logRetentionDays"
                :min="1"
                :max="365"
                style="width: 200px"
              />
              <span class="unit-text">天</span>
            </el-form-item>
          </el-card>

          <el-card class="config-card">
            <template #header>
              <span>告警配置</span>
            </template>

            <el-form-item label="启用告警" prop="enableAlerts">
              <el-switch v-model="monitoringConfig.enableAlerts" />
            </el-form-item>

            <el-form-item label="失败率阈值" prop="failureRateThreshold" v-if="monitoringConfig.enableAlerts">
              <el-input-number
                v-model="monitoringConfig.failureRateThreshold"
                :min="1"
                :max="100"
                style="width: 200px"
              />
              <span class="unit-text">%</span>
            </el-form-item>

            <el-form-item label="告警接收人" prop="alertReceivers" v-if="monitoringConfig.enableAlerts">
              <el-input
                v-model="monitoringConfig.alertReceivers"
                placeholder="请输入邮箱地址，多个用逗号分隔"
                style="width: 400px"
              />
            </el-form-item>
          </el-card>

          <div class="form-actions">
            <el-button type="primary" @click="saveMonitoringConfig" :loading="saving">
              保存配置
            </el-button>
            <el-button @click="resetMonitoringConfig">
              重置
            </el-button>
          </div>
        </el-form>
      </el-tab-pane>
    </el-tabs>

    <!-- 配置导入导出 -->
    <div class="import-export-section">
      <el-card>
        <template #header>
          <span>配置管理</span>
        </template>
        <div class="import-export-actions">
          <el-button type="primary" @click="exportConfig">
            <el-icon><Download /></el-icon>
            导出配置
          </el-button>
          <el-upload
            :before-upload="importConfig"
            :show-file-list="false"
            accept=".json"
          >
            <el-button type="success">
              <el-icon><Upload /></el-icon>
              导入配置
            </el-button>
          </el-upload>
          <el-button type="warning" @click="resetAllConfig">
            <el-icon><Refresh /></el-icon>
            恢复默认
          </el-button>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Download, Upload, Refresh } from '@element-plus/icons-vue'

// 响应式数据
const activeTab = ref('basic')
const saving = ref(false)
const testing = ref(false)

// 表单引用
const basicFormRef = ref()
const approvalFormRef = ref()
const securityFormRef = ref()
const monitoringFormRef = ref()

// 基础配置
const basicConfig = reactive({
  provider: 'aliyun',
  accessKeyId: '',
  accessKeySecret: '',
  signName: '',
  region: 'cn-hangzhou',
  batchLimit: 100,
  rateLimit: 10,
  retryCount: 3,
  timeout: 30
})

const basicRules = {
  provider: [{ required: true, message: '请选择服务商', trigger: 'change' }],
  accessKeyId: [{ required: true, message: '请输入AccessKey ID', trigger: 'blur' }],
  accessKeySecret: [{ required: true, message: '请输入AccessKey Secret', trigger: 'blur' }],
  signName: [{ required: true, message: '请输入签名名称', trigger: 'blur' }]
}

// 审核配置
const approvalConfig = reactive({
  enabled: true,
  autoApprovalLimit: 10,
  approvalTimeout: 24,
  approvers: ['admin'],
  notifyOnApproval: true,
  notifyMethods: ['email', 'system']
})

const approvalRules = {
  autoApprovalLimit: [{ required: true, message: '请设置自动审核阈值', trigger: 'blur' }],
  approvalTimeout: [{ required: true, message: '请设置审核超时时间', trigger: 'blur' }]
}

// 安全配置
const securityConfig = reactive({
  ipWhitelist: '127.0.0.1\n192.168.1.0/24',
  apiKey: 'sk-1234567890abcdef',
  keyExpiration: 90,
  sensitiveWordFilter: true,
  sensitiveWords: '赌博\n色情\n暴力\n政治',
  contentLengthLimit: 200
})

const securityRules = {
  apiKey: [{ required: true, message: '请生成API密钥', trigger: 'blur' }],
  contentLengthLimit: [{ required: true, message: '请设置内容长度限制', trigger: 'blur' }]
}

// 监控配置
const monitoringConfig = reactive({
  enableLogging: true,
  logLevel: 'info',
  logRetentionDays: 30,
  enableAlerts: true,
  failureRateThreshold: 10,
  alertReceivers: 'admin@example.com'
})

const monitoringRules = {
  logRetentionDays: [{ required: true, message: '请设置日志保留时间', trigger: 'blur' }],
  failureRateThreshold: [{ required: true, message: '请设置失败率阈值', trigger: 'blur' }]
}

// 方法
const saveBasicConfig = async () => {
  if (!basicFormRef.value) return

  try {
    await basicFormRef.value.validate()
    saving.value = true

    // 模拟保存
    await new Promise(resolve => setTimeout(resolve, 1000))

    ElMessage.success('基础配置保存成功')
  } catch (error) {
    ElMessage.error('保存失败，请检查配置项')
  } finally {
    saving.value = false
  }
}

const testConnection = async () => {
  testing.value = true
  try {
    // 模拟测试连接
    await new Promise(resolve => setTimeout(resolve, 2000))

    if (Math.random() > 0.3) {
      ElMessage.success('连接测试成功')
    } else {
      ElMessage.error('连接测试失败，请检查配置')
    }
  } finally {
    testing.value = false
  }
}

const resetBasicConfig = () => {
  basicFormRef.value?.resetFields()
}

const saveApprovalConfig = async () => {
  if (!approvalFormRef.value) return

  try {
    await approvalFormRef.value.validate()
    saving.value = true

    await new Promise(resolve => setTimeout(resolve, 1000))
    ElMessage.success('审核配置保存成功')
  } catch (error) {
    ElMessage.error('保存失败，请检查配置项')
  } finally {
    saving.value = false
  }
}

const resetApprovalConfig = () => {
  approvalFormRef.value?.resetFields()
}

const saveSecurityConfig = async () => {
  if (!securityFormRef.value) return

  try {
    await securityFormRef.value.validate()
    saving.value = true

    await new Promise(resolve => setTimeout(resolve, 1000))
    ElMessage.success('安全配置保存成功')
  } catch (error) {
    ElMessage.error('保存失败，请检查配置项')
  } finally {
    saving.value = false
  }
}

const generateApiKey = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = 'sk-'
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  securityConfig.apiKey = result
  ElMessage.success('API密钥已重新生成')
}

const resetSecurityConfig = () => {
  securityFormRef.value?.resetFields()
}

const saveMonitoringConfig = async () => {
  if (!monitoringFormRef.value) return

  try {
    await monitoringFormRef.value.validate()
    saving.value = true

    await new Promise(resolve => setTimeout(resolve, 1000))
    ElMessage.success('监控配置保存成功')
  } catch (error) {
    ElMessage.error('保存失败，请检查配置项')
  } finally {
    saving.value = false
  }
}

const resetMonitoringConfig = () => {
  monitoringFormRef.value?.resetFields()
}

const exportConfig = () => {
  const config = {
    basic: basicConfig,
    approval: approvalConfig,
    security: { ...securityConfig, apiKey: '***' }, // 隐藏敏感信息
    monitoring: monitoringConfig
  }

  const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `sms-config-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)

  ElMessage.success('配置导出成功')
}

const importConfig = (file: File) => {
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const config = JSON.parse(e.target?.result as string)

      if (config.basic) Object.assign(basicConfig, config.basic)
      if (config.approval) Object.assign(approvalConfig, config.approval)
      if (config.security) Object.assign(securityConfig, config.security)
      if (config.monitoring) Object.assign(monitoringConfig, config.monitoring)

      ElMessage.success('配置导入成功')
    } catch (error) {
      ElMessage.error('配置文件格式错误')
    }
  }
  reader.readAsText(file)
  return false // 阻止自动上传
}

const resetAllConfig = async () => {
  try {
    await ElMessageBox.confirm('确定要恢复所有配置到默认值吗？', '确认重置', {
      type: 'warning'
    })

    // 重置所有配置
    basicFormRef.value?.resetFields()
    approvalFormRef.value?.resetFields()
    securityFormRef.value?.resetFields()
    monitoringFormRef.value?.resetFields()

    ElMessage.success('所有配置已恢复默认值')
  } catch (error) {
    // 用户取消
  }
}

// 生命周期
onMounted(() => {
  // 加载配置数据
  // 这里可以从API加载实际配置
})
</script>

<style scoped>
.sms-config {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0 0 8px 0;
  color: #303133;
}

.page-header p {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.config-form {
  max-width: 800px;
}

.config-card {
  margin-bottom: 20px;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.unit-text {
  margin-left: 8px;
  color: #909399;
  font-size: 14px;
}

.form-actions {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #ebeef5;
}

.import-export-section {
  margin-top: 30px;
}

.import-export-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

:deep(.el-tabs__content) {
  padding: 20px 0;
}

:deep(.el-card__header) {
  background: #f8f9fa;
  font-weight: 500;
}
</style>
