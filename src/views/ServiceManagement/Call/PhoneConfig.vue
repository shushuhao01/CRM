<template>
  <div class="phone-config">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">
          <el-icon><Setting /></el-icon>
          电话配置
        </h1>
        <p class="page-description">配置通话系统参数，包括SIP设置、录音配置、质量控制等</p>
      </div>

      <div class="header-actions">
        <el-button @click="testConnection" :loading="testing">
          <el-icon><Connection /></el-icon>
          测试连接
        </el-button>
        <el-button type="primary" @click="saveAllConfig" :loading="saving">
          <el-icon><Check /></el-icon>
          保存配置
        </el-button>
      </div>
    </div>

    <!-- 配置选项卡 -->
    <div class="config-tabs">
      <el-card>
        <el-tabs v-model="activeTab" type="border-card">
          <!-- SIP配置 -->
          <el-tab-pane label="SIP配置" name="sip">
            <div class="config-section">
              <div class="section-header">
                <h3>SIP服务器配置</h3>
                <p>配置SIP服务器连接参数</p>
              </div>

              <el-form :model="sipConfig" :rules="sipRules" ref="sipFormRef" label-width="120px">
                <el-row :gutter="20">
                  <el-col :span="12">
                    <el-form-item label="SIP服务器" prop="server">
                      <el-input
                        v-model="sipConfig.server"
                        placeholder="请输入SIP服务器地址"
                      />
                    </el-form-item>
                  </el-col>

                  <el-col :span="12">
                    <el-form-item label="端口" prop="port">
                      <el-input-number
                        v-model="sipConfig.port"
                        :min="1"
                        :max="65535"
                        style="width: 100%;"
                      />
                    </el-form-item>
                  </el-col>
                </el-row>

                <el-row :gutter="20">
                  <el-col :span="12">
                    <el-form-item label="用户名" prop="username">
                      <el-input
                        v-model="sipConfig.username"
                        placeholder="请输入SIP用户名"
                      />
                    </el-form-item>
                  </el-col>

                  <el-col :span="12">
                    <el-form-item label="密码" prop="password">
                      <el-input
                        v-model="sipConfig.password"
                        type="password"
                        placeholder="请输入SIP密码"
                        show-password
                      />
                    </el-form-item>
                  </el-col>
                </el-row>

                <el-row :gutter="20">
                  <el-col :span="12">
                    <el-form-item label="域名" prop="domain">
                      <el-input
                        v-model="sipConfig.domain"
                        placeholder="请输入SIP域名"
                      />
                    </el-form-item>
                  </el-col>

                  <el-col :span="12">
                    <el-form-item label="传输协议" prop="transport">
                      <el-select v-model="sipConfig.transport" style="width: 100%;">
                        <el-option label="UDP" value="udp" />
                        <el-option label="TCP" value="tcp" />
                        <el-option label="TLS" value="tls" />
                      </el-select>
                    </el-form-item>
                  </el-col>
                </el-row>

                <el-form-item label="启用注册">
                  <el-switch v-model="sipConfig.enableRegister" />
                  <span style="margin-left: 8px; color: #909399; font-size: 12px;">
                    启用后将自动向SIP服务器注册
                  </span>
                </el-form-item>

                <el-form-item label="注册间隔">
                  <el-input-number
                    v-model="sipConfig.registerInterval"
                    :min="60"
                    :max="3600"
                    :disabled="!sipConfig.enableRegister"
                  />
                  <span style="margin-left: 8px; color: #909399; font-size: 12px;">秒</span>
                </el-form-item>
              </el-form>
            </div>
          </el-tab-pane>

          <!-- 录音配置 -->
          <el-tab-pane label="录音配置" name="recording">
            <div class="config-section">
              <div class="section-header">
                <h3>录音设置</h3>
                <p>配置通话录音相关参数</p>
              </div>

              <el-form :model="recordingConfig" :rules="recordingRules" ref="recordingFormRef" label-width="120px">
                <el-form-item label="启用录音">
                  <el-switch v-model="recordingConfig.enabled" />
                  <span style="margin-left: 8px; color: #909399; font-size: 12px;">
                    启用后所有通话将自动录音
                  </span>
                </el-form-item>

                <el-form-item label="录音格式" prop="format">
                  <el-select v-model="recordingConfig.format" style="width: 200px;">
                    <el-option label="MP3" value="mp3" />
                    <el-option label="WAV" value="wav" />
                    <el-option label="AAC" value="aac" />
                    <el-option label="OGG" value="ogg" />
                  </el-select>
                </el-form-item>

                <el-form-item label="音频质量" prop="quality">
                  <el-select v-model="recordingConfig.quality" style="width: 200px;">
                    <el-option label="低质量 (64kbps)" value="low" />
                    <el-option label="中等质量 (128kbps)" value="medium" />
                    <el-option label="高质量 (256kbps)" value="high" />
                    <el-option label="无损质量 (320kbps)" value="lossless" />
                  </el-select>
                </el-form-item>

                <el-form-item label="采样率" prop="sampleRate">
                  <el-select v-model="recordingConfig.sampleRate" style="width: 200px;">
                    <el-option label="8kHz" value="8000" />
                    <el-option label="16kHz" value="16000" />
                    <el-option label="22.05kHz" value="22050" />
                    <el-option label="44.1kHz" value="44100" />
                    <el-option label="48kHz" value="48000" />
                  </el-select>
                </el-form-item>

                <el-form-item label="存储路径" prop="storagePath">
                  <el-input
                    v-model="recordingConfig.storagePath"
                    placeholder="请输入录音存储路径"
                  >
                    <template #append>
                      <el-button @click="selectStoragePath">
                        <el-icon><Folder /></el-icon>
                        选择
                      </el-button>
                    </template>
                  </el-input>
                </el-form-item>

                <el-form-item label="自动删除">
                  <el-switch v-model="recordingConfig.autoDelete" />
                  <span style="margin-left: 8px; color: #909399; font-size: 12px;">
                    启用后将自动删除过期录音
                  </span>
                </el-form-item>

                <el-form-item label="保留天数" v-if="recordingConfig.autoDelete">
                  <el-input-number
                    v-model="recordingConfig.retentionDays"
                    :min="1"
                    :max="365"
                  />
                  <span style="margin-left: 8px; color: #909399; font-size: 12px;">天</span>
                </el-form-item>

                <el-form-item label="压缩录音">
                  <el-switch v-model="recordingConfig.compress" />
                  <span style="margin-left: 8px; color: #909399; font-size: 12px;">
                    启用后将压缩录音文件以节省存储空间
                  </span>
                </el-form-item>
              </el-form>
            </div>
          </el-tab-pane>

          <!-- 通话质量 -->
          <el-tab-pane label="通话质量" name="quality">
            <div class="config-section">
              <div class="section-header">
                <h3>通话质量控制</h3>
                <p>配置通话质量监控和优化参数</p>
              </div>

              <el-form :model="qualityConfig" ref="qualityFormRef" label-width="120px">
                <el-form-item label="质量监控">
                  <el-switch v-model="qualityConfig.enabled" />
                  <span style="margin-left: 8px; color: #909399; font-size: 12px;">
                    启用后将实时监控通话质量
                  </span>
                </el-form-item>

                <el-form-item label="延迟阈值">
                  <el-input-number
                    v-model="qualityConfig.latencyThreshold"
                    :min="50"
                    :max="1000"
                  />
                  <span style="margin-left: 8px; color: #909399; font-size: 12px;">毫秒</span>
                </el-form-item>

                <el-form-item label="丢包率阈值">
                  <el-input-number
                    v-model="qualityConfig.packetLossThreshold"
                    :min="0"
                    :max="10"
                    :precision="1"
                    :step="0.1"
                  />
                  <span style="margin-left: 8px; color: #909399; font-size: 12px;">%</span>
                </el-form-item>

                <el-form-item label="抖动阈值">
                  <el-input-number
                    v-model="qualityConfig.jitterThreshold"
                    :min="10"
                    :max="100"
                  />
                  <span style="margin-left: 8px; color: #909399; font-size: 12px;">毫秒</span>
                </el-form-item>

                <el-form-item label="自动优化">
                  <el-switch v-model="qualityConfig.autoOptimize" />
                  <span style="margin-left: 8px; color: #909399; font-size: 12px;">
                    启用后将自动调整参数以优化通话质量
                  </span>
                </el-form-item>

                <el-form-item label="回声消除">
                  <el-switch v-model="qualityConfig.echoCancellation" />
                </el-form-item>

                <el-form-item label="噪音抑制">
                  <el-switch v-model="qualityConfig.noiseSuppression" />
                </el-form-item>

                <el-form-item label="自动增益">
                  <el-switch v-model="qualityConfig.autoGainControl" />
                </el-form-item>
              </el-form>
            </div>
          </el-tab-pane>

          <!-- 呼叫设置 -->
          <el-tab-pane label="呼叫设置" name="calling">
            <div class="config-section">
              <div class="section-header">
                <h3>呼叫行为配置</h3>
                <p>配置呼叫相关的行为和限制</p>
              </div>

              <el-form :model="callingConfig" ref="callingFormRef" label-width="120px">
                <el-form-item label="最大通话时长">
                  <el-input-number
                    v-model="callingConfig.maxCallDuration"
                    :min="60"
                    :max="7200"
                  />
                  <span style="margin-left: 8px; color: #909399; font-size: 12px;">秒</span>
                </el-form-item>

                <el-form-item label="呼叫超时">
                  <el-input-number
                    v-model="callingConfig.callTimeout"
                    :min="10"
                    :max="120"
                  />
                  <span style="margin-left: 8px; color: #909399; font-size: 12px;">秒</span>
                </el-form-item>

                <el-form-item label="重拨次数">
                  <el-input-number
                    v-model="callingConfig.maxRetries"
                    :min="0"
                    :max="5"
                  />
                </el-form-item>

                <el-form-item label="重拨间隔">
                  <el-input-number
                    v-model="callingConfig.retryInterval"
                    :min="30"
                    :max="300"
                  />
                  <span style="margin-left: 8px; color: #909399; font-size: 12px;">秒</span>
                </el-form-item>

                <el-form-item label="自动应答">
                  <el-switch v-model="callingConfig.autoAnswer" />
                  <span style="margin-left: 8px; color: #909399; font-size: 12px;">
                    启用后将自动接听来电
                  </span>
                </el-form-item>

                <el-form-item label="应答延迟" v-if="callingConfig.autoAnswer">
                  <el-input-number
                    v-model="callingConfig.autoAnswerDelay"
                    :min="0"
                    :max="10"
                  />
                  <span style="margin-left: 8px; color: #909399; font-size: 12px;">秒</span>
                </el-form-item>

                <el-form-item label="呼叫转移">
                  <el-switch v-model="callingConfig.callForwarding" />
                </el-form-item>

                <el-form-item label="转移号码" v-if="callingConfig.callForwarding">
                  <el-input
                    v-model="callingConfig.forwardingNumber"
                    placeholder="请输入转移号码"
                  />
                </el-form-item>

                <el-form-item label="黑名单过滤">
                  <el-switch v-model="callingConfig.blacklistFilter" />
                  <span style="margin-left: 8px; color: #909399; font-size: 12px;">
                    启用后将自动拒绝黑名单号码
                  </span>
                </el-form-item>
              </el-form>
            </div>
          </el-tab-pane>

          <!-- 系统设置 -->
          <el-tab-pane label="系统设置" name="system">
            <div class="config-section">
              <div class="section-header">
                <h3>系统配置</h3>
                <p>配置系统级别的参数和行为</p>
              </div>

              <el-form :model="systemConfig" ref="systemFormRef" label-width="120px">
                <el-form-item label="日志级别">
                  <el-select v-model="systemConfig.logLevel" style="width: 200px;">
                    <el-option label="调试 (Debug)" value="debug" />
                    <el-option label="信息 (Info)" value="info" />
                    <el-option label="警告 (Warning)" value="warning" />
                    <el-option label="错误 (Error)" value="error" />
                  </el-select>
                </el-form-item>

                <el-form-item label="日志保留">
                  <el-input-number
                    v-model="systemConfig.logRetentionDays"
                    :min="1"
                    :max="90"
                  />
                  <span style="margin-left: 8px; color: #909399; font-size: 12px;">天</span>
                </el-form-item>

                <el-form-item label="性能监控">
                  <el-switch v-model="systemConfig.performanceMonitoring" />
                </el-form-item>

                <el-form-item label="统计报告">
                  <el-switch v-model="systemConfig.statisticsReporting" />
                  <span style="margin-left: 8px; color: #909399; font-size: 12px;">
                    启用后将定期生成统计报告
                  </span>
                </el-form-item>

                <el-form-item label="报告频率" v-if="systemConfig.statisticsReporting">
                  <el-select v-model="systemConfig.reportFrequency" style="width: 200px;">
                    <el-option label="每日" value="daily" />
                    <el-option label="每周" value="weekly" />
                    <el-option label="每月" value="monthly" />
                  </el-select>
                </el-form-item>

                <el-form-item label="备份配置">
                  <el-switch v-model="systemConfig.autoBackup" />
                  <span style="margin-left: 8px; color: #909399; font-size: 12px;">
                    启用后将自动备份配置文件
                  </span>
                </el-form-item>

                <el-form-item label="备份间隔" v-if="systemConfig.autoBackup">
                  <el-select v-model="systemConfig.backupInterval" style="width: 200px;">
                    <el-option label="每小时" value="hourly" />
                    <el-option label="每日" value="daily" />
                    <el-option label="每周" value="weekly" />
                  </el-select>
                </el-form-item>

                <el-form-item label="API限流">
                  <el-switch v-model="systemConfig.apiRateLimit" />
                </el-form-item>

                <el-form-item label="限流阈值" v-if="systemConfig.apiRateLimit">
                  <el-input-number
                    v-model="systemConfig.rateLimitThreshold"
                    :min="10"
                    :max="1000"
                  />
                  <span style="margin-left: 8px; color: #909399; font-size: 12px;">请求/分钟</span>
                </el-form-item>
              </el-form>
            </div>
          </el-tab-pane>
        </el-tabs>
      </el-card>
    </div>

    <!-- 连接状态 -->
    <div class="status-section">
      <el-card>
        <template #header>
          <span>连接状态</span>
        </template>

        <el-row :gutter="20">
          <el-col :span="8">
            <div class="status-item">
              <div class="status-icon" :class="connectionStatus.sip ? 'connected' : 'disconnected'">
                <el-icon><Connection /></el-icon>
              </div>
              <div class="status-info">
                <div class="status-label">SIP服务器</div>
                <div class="status-value">{{ connectionStatus.sip ? '已连接' : '未连接' }}</div>
                <div class="status-detail">{{ sipConfig.server }}:{{ sipConfig.port }}</div>
              </div>
            </div>
          </el-col>

          <el-col :span="8">
            <div class="status-item">
              <div class="status-icon" :class="connectionStatus.recording ? 'connected' : 'disconnected'">
                <el-icon><Microphone /></el-icon>
              </div>
              <div class="status-info">
                <div class="status-label">录音服务</div>
                <div class="status-value">{{ connectionStatus.recording ? '正常' : '异常' }}</div>
                <div class="status-detail">{{ recordingConfig.enabled ? '已启用' : '已禁用' }}</div>
              </div>
            </div>
          </el-col>

          <el-col :span="8">
            <div class="status-item">
              <div class="status-icon" :class="connectionStatus.quality ? 'connected' : 'disconnected'">
                <el-icon><Monitor /></el-icon>
              </div>
              <div class="status-info">
                <div class="status-label">质量监控</div>
                <div class="status-value">{{ connectionStatus.quality ? '正常' : '异常' }}</div>
                <div class="status-detail">{{ qualityConfig.enabled ? '已启用' : '已禁用' }}</div>
              </div>
            </div>
          </el-col>
        </el-row>
      </el-card>
    </div>

    <!-- 操作日志 -->
    <div class="log-section">
      <el-card>
        <template #header>
          <div class="log-header">
            <span>操作日志</span>
            <el-button size="small" @click="clearLogs">清空日志</el-button>
          </div>
        </template>

        <div class="log-content">
          <div
            v-for="(log, index) in operationLogs"
            :key="index"
            class="log-item"
            :class="log.level"
          >
            <div class="log-time">{{ formatDateTime(log.timestamp) }}</div>
            <div class="log-level">{{ log.level.toUpperCase() }}</div>
            <div class="log-message">{{ log.message }}</div>
          </div>

          <div v-if="!operationLogs.length" class="no-logs">
            <el-empty description="暂无日志记录" :image-size="80" />
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useCallStore } from '@/stores/call'
import {
  Setting,
  Connection,
  Check,
  Folder,
  Microphone,
  Monitor
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { formatDateTime } from '@/utils/dateFormat'

const callStore = useCallStore()

// 响应式数据
const activeTab = ref('sip')
const testing = ref(false)
const saving = ref(false)

// 表单引用
const sipFormRef = ref<FormInstance>()
const recordingFormRef = ref<FormInstance>()
const qualityFormRef = ref<FormInstance>()
const callingFormRef = ref<FormInstance>()
const systemFormRef = ref<FormInstance>()

// SIP配置
const sipConfig = reactive({
  server: '',
  port: 5060,
  username: '',
  password: '',
  domain: '',
  transport: 'udp',
  enableRegister: true,
  registerInterval: 300
})

// 录音配置
const recordingConfig = reactive({
  enabled: true,
  format: 'mp3',
  quality: 'medium',
  sampleRate: '16000',
  storagePath: '/recordings',
  autoDelete: false,
  retentionDays: 30,
  compress: true
})

// 质量配置
const qualityConfig = reactive({
  enabled: true,
  latencyThreshold: 200,
  packetLossThreshold: 1.0,
  jitterThreshold: 30,
  autoOptimize: true,
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true
})

// 呼叫配置
const callingConfig = reactive({
  maxCallDuration: 3600,
  callTimeout: 30,
  maxRetries: 3,
  retryInterval: 60,
  autoAnswer: false,
  autoAnswerDelay: 2,
  callForwarding: false,
  forwardingNumber: '',
  blacklistFilter: true
})

// 系统配置
const systemConfig = reactive({
  logLevel: 'info',
  logRetentionDays: 7,
  performanceMonitoring: true,
  statisticsReporting: true,
  reportFrequency: 'daily',
  autoBackup: true,
  backupInterval: 'daily',
  apiRateLimit: true,
  rateLimitThreshold: 100
})

// 连接状态
const connectionStatus = reactive({
  sip: false,
  recording: false,
  quality: false
})

// 操作日志
const operationLogs = ref([
  {
    timestamp: new Date().toISOString(),
    level: 'info',
    message: '系统启动完成'
  },
  {
    timestamp: new Date(Date.now() - 60000).toISOString(),
    level: 'warning',
    message: 'SIP服务器连接超时，正在重试...'
  },
  {
    timestamp: new Date(Date.now() - 120000).toISOString(),
    level: 'error',
    message: '录音服务启动失败，请检查配置'
  }
])

// 表单验证规则
const sipRules: FormRules = {
  server: [
    { required: true, message: '请输入SIP服务器地址', trigger: 'blur' }
  ],
  port: [
    { required: true, message: '请输入端口号', trigger: 'blur' }
  ],
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' }
  ]
}

const recordingRules: FormRules = {
  format: [
    { required: true, message: '请选择录音格式', trigger: 'change' }
  ],
  quality: [
    { required: true, message: '请选择音频质量', trigger: 'change' }
  ],
  storagePath: [
    { required: true, message: '请输入存储路径', trigger: 'blur' }
  ]
}

// 方法
// formatDateTime 已从 @/utils/dateFormat 导入

const testConnection = async () => {
  try {
    testing.value = true

    // 测试SIP连接
    const sipResult = await callStore.testPhoneConnection({
      server: sipConfig.server,
      port: sipConfig.port,
      username: sipConfig.username,
      password: sipConfig.password
    })

    connectionStatus.sip = sipResult.success
    connectionStatus.recording = true // 模拟录音服务正常
    connectionStatus.quality = true // 模拟质量监控正常

    if (sipResult.success) {
      ElMessage.success('连接测试成功')
      addLog('info', 'SIP服务器连接测试成功')
    } else {
      ElMessage.error('连接测试失败')
      addLog('error', `SIP服务器连接测试失败: ${sipResult.message}`)
    }
  } catch (error) {
    console.error('测试连接失败:', error)
    ElMessage.error('测试连接失败')
    addLog('error', '连接测试异常')
  } finally {
    testing.value = false
  }
}

const saveAllConfig = async () => {
  try {
    // 验证所有表单
    const forms = [sipFormRef.value, recordingFormRef.value]
    const validationPromises = forms.map(form => form?.validate())

    await Promise.all(validationPromises)

    saving.value = true

    // 保存配置
    const config = {
      sip: sipConfig,
      recording: recordingConfig,
      quality: qualityConfig,
      calling: callingConfig,
      system: systemConfig
    }

    await callStore.updatePhoneConfig(config)

    ElMessage.success('配置保存成功')
    addLog('info', '电话配置已更新')
  } catch (error) {
    console.error('保存配置失败:', error)
    ElMessage.error('保存配置失败')
    addLog('error', '配置保存失败')
  } finally {
    saving.value = false
  }
}

const selectStoragePath = () => {
  // 模拟文件夹选择
  ElMessageBox.prompt('请输入录音存储路径', '选择路径', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    inputValue: recordingConfig.storagePath
  }).then(({ value }) => {
    recordingConfig.storagePath = value
    addLog('info', `录音存储路径已更改为: ${value}`)
  }).catch(() => {
    // 用户取消
  })
}

const addLog = (level: string, message: string) => {
  operationLogs.value.unshift({
    timestamp: new Date().toISOString(),
    level,
    message
  })

  // 限制日志数量
  if (operationLogs.value.length > 50) {
    operationLogs.value = operationLogs.value.slice(0, 50)
  }
}

const clearLogs = () => {
  operationLogs.value = []
  ElMessage.success('日志已清空')
}

const loadConfig = async () => {
  try {
    const config = await callStore.fetchPhoneConfig()

    if (config.sip) {
      Object.assign(sipConfig, config.sip)
    }
    if (config.recording) {
      Object.assign(recordingConfig, config.recording)
    }
    if (config.quality) {
      Object.assign(qualityConfig, config.quality)
    }
    if (config.calling) {
      Object.assign(callingConfig, config.calling)
    }
    if (config.system) {
      Object.assign(systemConfig, config.system)
    }

    addLog('info', '配置加载完成')
  } catch (error) {
    console.error('加载配置失败:', error)
    addLog('error', '配置加载失败')
  }
}

// 生命周期
onMounted(() => {
  loadConfig()
})
</script>

<style scoped>
.phone-config {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: calc(100vh - 60px);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  background: white;
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.header-content {
  flex: 1;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 8px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-description {
  color: #606266;
  margin: 0;
  font-size: 14px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.config-tabs {
  margin-bottom: 20px;
}

.config-section {
  padding: 20px 0;
}

.section-header {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #ebeef5;
}

.section-header h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.section-header p {
  margin: 0;
  color: #606266;
  font-size: 14px;
}

.status-section {
  margin-bottom: 20px;
}

.status-item {
  display: flex;
  align-items: center;
  padding: 16px;
  background-color: #f8f9fa;
  border-radius: 8px;
}

.status-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  font-size: 24px;
  color: white;
}

.status-icon.connected {
  background-color: #67C23A;
}

.status-icon.disconnected {
  background-color: #F56C6C;
}

.status-info {
  flex: 1;
}

.status-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 4px;
}

.status-value {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 2px;
}

.status-detail {
  font-size: 12px;
  color: #C0C4CC;
}

.log-section {
  margin-bottom: 20px;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.log-content {
  max-height: 300px;
  overflow-y: auto;
}

.log-item {
  display: flex;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.log-item:last-child {
  border-bottom: none;
}

.log-time {
  width: 160px;
  font-size: 12px;
  color: #909399;
  flex-shrink: 0;
}

.log-level {
  width: 80px;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.log-message {
  flex: 1;
  font-size: 14px;
  color: #303133;
}

.log-item.info .log-level {
  color: #409EFF;
}

.log-item.warning .log-level {
  color: #E6A23C;
}

.log-item.error .log-level {
  color: #F56C6C;
}

.no-logs {
  padding: 40px;
  text-align: center;
}

:deep(.el-tabs--border-card) {
  border: none;
  box-shadow: none;
}

:deep(.el-tabs--border-card > .el-tabs__content) {
  padding: 0;
}

:deep(.el-tabs--border-card > .el-tabs__header) {
  background-color: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
}

:deep(.el-tabs--border-card > .el-tabs__header .el-tabs__item) {
  border: none;
  background-color: transparent;
}

:deep(.el-tabs--border-card > .el-tabs__header .el-tabs__item.is-active) {
  background-color: white;
  border-bottom: 2px solid #409EFF;
}

:deep(.el-form-item) {
  margin-bottom: 20px;
}

:deep(.el-input-number) {
  width: 100%;
}
</style>
