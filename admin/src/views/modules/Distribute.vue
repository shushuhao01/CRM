<template>
  <div class="page-container">
    <!-- 页面头部 -->
    <el-card shadow="never" class="header-card">
      <div class="page-header">
        <div class="header-info">
          <div class="title-row">
            <div class="title-icon">
              <el-icon :size="28"><Promotion /></el-icon>
            </div>
            <div>
              <h2 class="page-title">配置下发</h2>
              <p class="page-desc">统一管控 CRM 系统各模块的配置项，编辑配置内容后开启管控，同步下发到所有客户端</p>
            </div>
          </div>
        </div>
        <div class="header-actions">
          <div class="stats-group">
            <div class="stat-item stat-enabled">
              <el-icon><CircleCheck /></el-icon>
              <span class="stat-num">{{ managedCount }}</span>
              <span class="stat-label">已管控</span>
            </div>
            <div class="stat-divider"></div>
            <div class="stat-item stat-disabled">
              <el-icon><Unlock /></el-icon>
              <span class="stat-num">{{ unmanagedCount }}</span>
              <span class="stat-label">自主管理</span>
            </div>
          </div>
          <el-button type="primary" :loading="syncing" @click="handleSyncAll" round>
            <el-icon><Refresh /></el-icon>
            <span>全部同步下发</span>
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- 提示条 -->
    <div class="tip-banner">
      <el-icon class="tip-icon"><InfoFilled /></el-icon>
      <span>使用流程：① 点击「编辑配置」填写具体配置内容 → ② 保存配置 → ③ 开启「管控」开关 → ④ 点击「全部同步下发」推送到所有客户端。未开启管控的配置项由各租户/私有部署自行管理。</span>
    </div>

    <!-- 配置下发卡片列表 -->
    <div class="distribute-grid" v-loading="loading" element-loading-text="加载中...">
      <div
        v-for="item in distributeItems"
        :key="item.key"
        class="distribute-card"
        :class="{ 'is-managed': item.enabled }"
      >
        <!-- 状态指示灯 -->
        <div class="status-dot" :class="item.enabled ? 'dot-on' : 'dot-off'"></div>

        <!-- 图标 -->
        <div class="card-icon-wrapper">
          <div class="card-icon" :style="{ background: item.enabled ? item.gradient : '#f0f2f5' }">
            <el-icon :size="28" :color="item.enabled ? '#fff' : '#c0c4cc'">
              <component :is="item.icon" />
            </el-icon>
          </div>
        </div>

        <!-- 内容 -->
        <div class="card-content">
          <h3 class="item-name">{{ item.name }}</h3>
          <p class="item-desc">{{ item.description }}</p>
        </div>

        <!-- 配置状态 -->
        <div class="config-status">
          <el-tag v-if="item.enabled && item.configured" type="success" effect="light" size="small" round>
            <el-icon style="margin-right:2px"><CircleCheck /></el-icon>已配置 · 管控中
          </el-tag>
          <el-tag v-else-if="item.enabled && !item.configured" type="warning" effect="light" size="small" round>
            <el-icon style="margin-right:2px"><Warning /></el-icon>已管控 · 未编辑配置
          </el-tag>
          <el-tag v-else-if="item.configured" type="info" effect="light" size="small" round>
            <el-icon style="margin-right:2px"><Document /></el-icon>已编辑 · 未管控
          </el-tag>
          <el-tag v-else type="info" effect="plain" size="small" round>
            自主管理
          </el-tag>
        </div>

        <!-- 编辑配置按钮 -->
        <div class="edit-btn-area">
          <el-button type="primary" plain size="small" round @click="openEditDialog(item)">
            <el-icon><Edit /></el-icon> 编辑配置
          </el-button>
        </div>

        <!-- 操作区 -->
        <div class="card-action">
          <el-switch
            :model-value="item.enabled"
            :loading="item.loading"
            active-text="管控"
            inactive-text="放开"
            inline-prompt
            style="--el-switch-on-color: #409eff; --el-switch-off-color: #dcdfe6"
            @change="(val: boolean) => handleToggle(item, val)"
          />
        </div>
      </div>
    </div>

    <!-- 下发操作记录 -->
    <el-card shadow="never" class="log-card" style="margin-top: 20px">
      <template #header>
        <div class="log-header">
          <div class="log-title"><el-icon><Document /></el-icon><span>下发操作记录</span></div>
        </div>
      </template>
      <el-timeline v-if="logs.length > 0">
        <el-timeline-item v-for="log in logs" :key="log.id" :timestamp="log.time" :type="log.type" placement="top">
          <div class="log-content"><span class="log-action">{{ log.action }}</span><span class="log-detail">{{ log.detail }}</span></div>
        </el-timeline-item>
      </el-timeline>
      <el-empty v-else description="暂无操作记录" :image-size="60" />
    </el-card>

    <!-- ==================== 编辑配置弹窗 ==================== -->
    <el-dialog
      v-model="showEditDialog"
      :title="`编辑「${editingItem?.name}」下发配置`"
      width="680px"
      :close-on-click-modal="false"
      destroy-on-close
      top="5vh"
    >
      <el-alert type="info" :closable="false" style="margin-bottom: 20px">
        <template #title>此处编辑的配置内容将在管控开启后同步下发到所有 CRM 客户端，覆盖客户端本地设置。</template>
      </el-alert>

      <!-- ===== 安全策略表单 ===== -->
      <el-form v-if="editingKey === 'security'" :model="securityForm" label-width="140px" class="edit-form">
        <el-form-item label="密码最小长度">
          <el-input-number v-model="securityForm.passwordMinLength" :min="6" :max="20" />
          <span class="form-tip">建议 6~20 位</span>
        </el-form-item>
        <el-form-item label="密码复杂度">
          <el-checkbox-group v-model="securityForm.passwordComplexity">
            <el-checkbox label="uppercase">大写字母</el-checkbox>
            <el-checkbox label="lowercase">小写字母</el-checkbox>
            <el-checkbox label="number">数字</el-checkbox>
            <el-checkbox label="special">特殊字符</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="密码有效期">
          <el-input-number v-model="securityForm.passwordExpireDays" :min="0" :max="365" />
          <span class="form-tip">天（0=永不过期）</span>
        </el-form-item>
        <el-form-item label="登录失败锁定">
          <el-switch v-model="securityForm.loginFailLock" />
        </el-form-item>
        <el-form-item v-if="securityForm.loginFailLock" label="最大失败次数">
          <el-input-number v-model="securityForm.maxLoginFails" :min="3" :max="10" />
          <span class="form-tip">次</span>
        </el-form-item>
        <el-form-item v-if="securityForm.loginFailLock" label="锁定时间">
          <el-input-number v-model="securityForm.lockDuration" :min="5" :max="1440" />
          <span class="form-tip">分钟</span>
        </el-form-item>
        <el-form-item label="会话超时">
          <el-input-number v-model="securityForm.sessionTimeout" :min="30" :max="1440" />
          <span class="form-tip">分钟</span>
        </el-form-item>
        <el-form-item label="强制HTTPS">
          <el-switch v-model="securityForm.forceHttps" />
        </el-form-item>
        <el-form-item label="IP白名单">
          <el-input v-model="securityForm.ipWhitelist" type="textarea" :rows="2" placeholder="多个IP用换行分隔，留空不限制" />
        </el-form-item>
      </el-form>

      <!-- ===== 存储设置表单 ===== -->
      <el-form v-else-if="editingKey === 'storage'" :model="storageForm" label-width="140px" class="edit-form">
        <el-form-item label="存储类型">
          <el-radio-group v-model="storageForm.storageType">
            <el-radio-button value="local">本地存储</el-radio-button>
            <el-radio-button value="oss">阿里云OSS</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <template v-if="storageForm.storageType === 'local'">
          <el-form-item label="存储路径">
            <el-input v-model="storageForm.localPath" placeholder="/uploads" />
          </el-form-item>
          <el-form-item label="访问域名">
            <el-input v-model="storageForm.localDomain" placeholder="http://localhost:3000" />
            <span class="form-tip">用于拼接文件访问URL</span>
          </el-form-item>
        </template>
        <template v-if="storageForm.storageType === 'oss'">
          <el-form-item label="AccessKey ID">
            <el-input v-model="storageForm.accessKey" placeholder="请输入AccessKey ID" />
          </el-form-item>
          <el-form-item label="AccessKey Secret">
            <el-input v-model="storageForm.secretKey" type="password" show-password placeholder="请输入AccessKey Secret" />
          </el-form-item>
          <el-form-item label="Bucket名称">
            <el-input v-model="storageForm.bucketName" placeholder="请输入Bucket名称" />
          </el-form-item>
          <el-form-item label="地域(Region)">
            <el-input v-model="storageForm.region" placeholder="如 oss-cn-hangzhou" />
          </el-form-item>
          <el-form-item label="自定义域名">
            <el-input v-model="storageForm.customDomain" placeholder="CDN加速域名（选填）" />
          </el-form-item>
        </template>
        <el-form-item label="最大文件大小">
          <el-input-number v-model="storageForm.maxFileSize" :min="1" :max="100" />
          <span class="form-tip">MB</span>
        </el-form-item>
        <el-form-item label="允许文件类型">
          <el-input v-model="storageForm.allowedTypes" placeholder="jpg,png,gif,pdf,doc" />
        </el-form-item>
      </el-form>

      <!-- ===== 邮件设置表单 ===== -->
      <el-form v-else-if="editingKey === 'email'" :model="emailForm" label-width="140px" class="edit-form">
        <el-form-item label="SMTP服务器">
          <el-input v-model="emailForm.smtpHost" placeholder="如 smtp.qq.com" />
        </el-form-item>
        <el-form-item label="SMTP端口">
          <el-input-number v-model="emailForm.smtpPort" :min="1" :max="65535" />
        </el-form-item>
        <el-form-item label="发件人邮箱">
          <el-input v-model="emailForm.senderEmail" placeholder="xxx@qq.com" />
        </el-form-item>
        <el-form-item label="发件人名称">
          <el-input v-model="emailForm.senderName" placeholder="CRM系统" />
        </el-form-item>
        <el-form-item label="邮箱密码/授权码">
          <el-input v-model="emailForm.emailPassword" type="password" show-password placeholder="SMTP授权码" />
        </el-form-item>
        <el-form-item label="启用SSL">
          <el-switch v-model="emailForm.enableSsl" />
        </el-form-item>
        <el-form-item label="启用TLS">
          <el-switch v-model="emailForm.enableTls" />
        </el-form-item>
      </el-form>

      <!-- ===== 通话设置表单 ===== -->
      <el-form v-else-if="editingKey === 'call'" :model="callForm" label-width="140px" class="edit-form">
        <el-divider content-position="left">SIP 服务器</el-divider>
        <el-row :gutter="16">
          <el-col :span="14">
            <el-form-item label="服务器地址">
              <el-input v-model="callForm.sipServer" placeholder="SIP服务器地址" />
            </el-form-item>
          </el-col>
          <el-col :span="10">
            <el-form-item label="端口">
              <el-input-number v-model="callForm.sipPort" :min="1" :max="65535" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="SIP用户名">
              <el-input v-model="callForm.sipUsername" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="SIP密码">
              <el-input v-model="callForm.sipPassword" type="password" show-password />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="传输协议">
          <el-radio-group v-model="callForm.sipTransport">
            <el-radio-button value="UDP">UDP</el-radio-button>
            <el-radio-button value="TCP">TCP</el-radio-button>
            <el-radio-button value="TLS">TLS</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-divider content-position="left">录音与功能</el-divider>
        <el-form-item label="自动录音">
          <el-switch v-model="callForm.autoRecord" />
        </el-form-item>
        <el-form-item label="来电弹屏">
          <el-switch v-model="callForm.incomingCallPopup" />
        </el-form-item>
        <el-form-item label="通话质检">
          <el-switch v-model="callForm.qualityMonitoring" />
        </el-form-item>
        <el-form-item label="最大通话时长">
          <el-input-number v-model="callForm.maxCallDuration" :min="60" :max="7200" :step="60" />
          <span class="form-tip">秒</span>
        </el-form-item>
        <el-form-item label="录音保留天数">
          <el-input-number v-model="callForm.recordRetentionDays" :min="7" :max="365" />
          <span class="form-tip">天</span>
        </el-form-item>
      </el-form>

      <!-- ===== 短信设置表单 ===== -->
      <el-form v-else-if="editingKey === 'sms'" :model="smsForm" label-width="140px" class="edit-form">
        <el-form-item label="短信服务商">
          <el-select v-model="smsForm.provider" style="width: 100%">
            <el-option label="阿里云短信" value="aliyun" />
            <el-option label="腾讯云短信" value="tencent" />
            <el-option label="华为云短信" value="huawei" />
          </el-select>
        </el-form-item>
        <el-form-item label="AccessKey">
          <el-input v-model="smsForm.accessKey" placeholder="请输入AccessKey" />
        </el-form-item>
        <el-form-item label="SecretKey">
          <el-input v-model="smsForm.secretKey" type="password" show-password placeholder="请输入SecretKey" />
        </el-form-item>
        <el-form-item label="短信签名">
          <el-input v-model="smsForm.signName" placeholder="需在服务商平台审核通过" />
        </el-form-item>
        <el-form-item label="每日发送限制">
          <el-input-number v-model="smsForm.dailyLimit" :min="1" :max="10000" />
          <span class="form-tip">条/用户/天</span>
        </el-form-item>
        <el-form-item label="每月发送限制">
          <el-input-number v-model="smsForm.monthlyLimit" :min="1" :max="100000" />
          <span class="form-tip">条/用户/月</span>
        </el-form-item>
        <el-form-item label="启用短信功能">
          <el-switch v-model="smsForm.enabled" />
        </el-form-item>
        <el-form-item label="发送需审核">
          <el-switch v-model="smsForm.requireApproval" />
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showEditDialog = false" round>取消</el-button>
          <el-button
            v-if="editingKey === 'storage' && storageForm.storageType === 'oss'"
            type="warning"
            :loading="testingOSS"
            @click="handleTestOSSConnection"
            round
          >
            <el-icon><Connection /></el-icon> 测试OSS连接
          </el-button>
          <el-button type="primary" :loading="editSaving" @click="saveEditConfig" round>
            <el-icon><Check /></el-icon> 保存配置
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- ==================== 管控确认弹窗 ==================== -->
    <el-dialog
      v-model="showConfirmDialog"
      :title="confirmAction === 'enable' ? '开启配置管控' : '关闭配置管控'"
      width="480px"
      :close-on-click-modal="false"
      class="confirm-dialog"
    >
      <div class="dialog-content">
        <div class="dialog-warning-box" :class="confirmAction === 'enable' ? 'info-box' : 'warning-box'">
          <div class="warning-icon-big">
            <el-icon :size="40" :color="confirmAction === 'enable' ? '#409eff' : '#e6a23c'">
              <component :is="confirmAction === 'enable' ? Lock : Unlock" />
            </el-icon>
          </div>
          <div class="warning-text">
            <h4>{{ confirmAction === 'enable'
              ? `确定要统一管控「${currentItem?.name}」配置吗？`
              : `确定要放开「${currentItem?.name}」配置吗？` }}</h4>
            <p>{{ confirmAction === 'enable'
              ? '开启后，已编辑的配置将覆盖所有客户端的本地设置'
              : '放开后，各租户/私有部署将恢复自行管理此项' }}</p>
          </div>
        </div>
        <!-- 未配置警告 -->
        <el-alert v-if="confirmAction === 'enable' && currentItem && !currentItem.configured" type="warning" style="margin-bottom:16px">
          <template #title>⚠️ 您尚未编辑「{{ currentItem.name }}」的具体配置内容，管控将使用默认值。建议先点击「编辑配置」填写后再开启管控。</template>
        </el-alert>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="cancelConfirm" round>取消</el-button>
          <el-button v-if="confirmAction === 'enable' && currentItem && !currentItem.configured" type="warning" round @click="cancelConfirmAndEdit">
            <el-icon><Edit /></el-icon> 先去编辑配置
          </el-button>
          <el-button :type="confirmAction === 'enable' ? 'primary' : 'warning'" :loading="submitting" @click="doConfirm" round>
            <el-icon><component :is="confirmAction === 'enable' ? Lock : Unlock" /></el-icon>
            {{ confirmAction === 'enable' ? '确认管控' : '确认放开' }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, type Component, markRaw } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Promotion, CircleCheck, Unlock, Refresh, InfoFilled, Lock, Document,
  Edit, Check, Warning, Connection,
  Key, FolderOpened, Phone, Message, ChatDotRound
} from '@element-plus/icons-vue'
import request from '@/api/request'

// ==================== 类型 ====================
interface DistributeItem {
  key: string
  name: string
  description: string
  icon: Component
  gradient: string
  enabled: boolean
  configured: boolean  // 是否已编辑过配置内容
  loading: boolean
}
interface LogItem {
  id: number; time: string; action: string; detail: string
  type: 'primary' | 'success' | 'warning' | 'danger' | 'info'
}

// ==================== 状态 ====================
const loading = ref(false)
const syncing = ref(false)
const submitting = ref(false)
const editSaving = ref(false)
const testingOSS = ref(false)
const showEditDialog = ref(false)
const showConfirmDialog = ref(false)
const confirmAction = ref<'enable' | 'disable'>('enable')
const currentItem = ref<DistributeItem | null>(null)
const editingItem = ref<DistributeItem | null>(null)
const editingKey = ref('')
const logs = ref<LogItem[]>([])

// ==================== 各配置表单 ====================
const securityForm = reactive({
  passwordMinLength: 8,
  passwordComplexity: ['lowercase', 'number'] as string[],
  passwordExpireDays: 90,
  loginFailLock: true,
  maxLoginFails: 5,
  lockDuration: 30,
  sessionTimeout: 120,
  forceHttps: false,
  ipWhitelist: ''
})

const storageForm = reactive({
  storageType: 'local' as 'local' | 'oss',
  localPath: '/uploads',
  localDomain: 'http://localhost:3000',
  accessKey: '',
  secretKey: '',
  bucketName: '',
  region: '',
  customDomain: '',
  maxFileSize: 10,
  allowedTypes: 'jpg,png,gif,pdf,doc,docx,xls,xlsx'
})

const emailForm = reactive({
  smtpHost: 'smtp.qq.com',
  smtpPort: 587,
  senderEmail: '',
  senderName: 'CRM系统',
  emailPassword: '',
  enableSsl: false,
  enableTls: true
})

const callForm = reactive({
  sipServer: '',
  sipPort: 5060,
  sipUsername: '',
  sipPassword: '',
  sipTransport: 'UDP',
  autoRecord: false,
  incomingCallPopup: true,
  qualityMonitoring: false,
  maxCallDuration: 3600,
  recordRetentionDays: 90
})

const smsForm = reactive({
  provider: 'aliyun',
  accessKey: '',
  secretKey: '',
  signName: '',
  dailyLimit: 100,
  monthlyLimit: 3000,
  enabled: false,
  requireApproval: false
})

// 表单映射
const formMap: Record<string, any> = { security: securityForm, storage: storageForm, email: emailForm, call: callForm, sms: smsForm }

// ==================== 配置卡片 ====================
const distributeItems = reactive<DistributeItem[]>([
  { key: 'security', name: '安全策略', description: '密码策略、登录安全、失败锁定、会话超时等', icon: markRaw(Key), gradient: 'linear-gradient(135deg, #f56c6c 0%, #f89898 100%)', enabled: false, configured: false, loading: false },
  { key: 'call', name: '通话设置', description: 'SIP服务器、通话录音、质检等', icon: markRaw(Phone), gradient: 'linear-gradient(135deg, #9c27b0 0%, #ba68c8 100%)', enabled: false, configured: false, loading: false },
  { key: 'email', name: '邮件设置', description: 'SMTP服务器、发件人、SSL/TLS加密等', icon: markRaw(Message), gradient: 'linear-gradient(135deg, #67c23a 0%, #85ce61 100%)', enabled: false, configured: false, loading: false },
  { key: 'sms', name: '短信设置', description: '短信服务商、签名、发送限额等', icon: markRaw(ChatDotRound), gradient: 'linear-gradient(135deg, #e6a23c 0%, #f5ba62 100%)', enabled: false, configured: false, loading: false },
  { key: 'storage', name: '存储设置', description: '文件存储方式、OSS云存储、访问域名等', icon: markRaw(FolderOpened), gradient: 'linear-gradient(135deg, #409eff 0%, #66b1ff 100%)', enabled: false, configured: false, loading: false }
])

const managedCount = computed(() => distributeItems.filter(i => i.enabled).length)
const unmanagedCount = computed(() => distributeItems.filter(i => !i.enabled).length)

// ==================== 加载 ====================
const loadDistributeConfig = async () => {
  loading.value = true
  try {
    const res = await request.get('/system-config') as any
    if (res.success && res.data?.distributedConfig) {
      const dc = res.data.distributedConfig
      distributeItems.forEach(item => {
        const val = dc[item.key]
        if (val !== null && val !== undefined) {
          item.enabled = true
          // 检查是否有实际配置内容（不是空对象）
          if (typeof val === 'object' && Object.keys(val).length > 0) {
            item.configured = true
            // 回填表单
            Object.assign(formMap[item.key], val)
          } else {
            item.configured = false
          }
        } else {
          item.enabled = false
          item.configured = false
        }
      })
    }
  } catch (error) {
    console.error('加载配置下发状态失败:', error)
  } finally {
    loading.value = false
  }
}

// ==================== 编辑配置 ====================
const openEditDialog = (item: DistributeItem) => {
  editingItem.value = item
  editingKey.value = item.key
  showEditDialog.value = true
}

const handleTestOSSConnection = async () => {
  const { accessKey, secretKey, bucketName, region } = storageForm
  if (!accessKey || !secretKey || !bucketName || !region) {
    ElMessage.warning('请先填写完整的OSS配置（AccessKey ID、AccessKey Secret、Bucket名称、地域）')
    return
  }
  testingOSS.value = true
  try {
    const res = await request.post('/system-config/storage/test-oss', {
      accessKey: storageForm.accessKey,
      secretKey: storageForm.secretKey,
      bucketName: storageForm.bucketName,
      region: storageForm.region,
      customDomain: storageForm.customDomain || ''
    }) as any
    if (res.success) {
      ElMessage.success('OSS连接测试成功！Bucket可正常访问')
    } else {
      ElMessage.error(res.message || 'OSS连接测试失败')
    }
  } catch (error: any) {
    const msg = error.response?.data?.message || error.message || 'OSS连接测试失败，请检查配置'
    ElMessage.error(msg)
    console.error('[配置下发] OSS连接测试失败:', error)
  } finally {
    testingOSS.value = false
  }
}

const saveEditConfig = async () => {
  if (!editingItem.value) return
  editSaving.value = true
  const item = editingItem.value
  try {
    // 获取完整配置
    const getRes = await request.get('/system-config') as any
    const fullConfig = getRes.success && getRes.data ? getRes.data : {}
    if (!fullConfig.distributedConfig) {
      fullConfig.distributedConfig = { security: null, call: null, email: null, sms: null, storage: null }
    }
    // 将表单内容写入 distributedConfig[key]
    const formData = { ...formMap[item.key] }
    if (item.enabled) {
      // 已管控：直接写入配置值
      fullConfig.distributedConfig[item.key] = formData
    } else {
      // 未管控：先暂存配置值（保存为对象但不开启管控，后续方便开关时直接用）
      // 用特殊标记 __draft = true 表示这是草稿，CRM端判断时忽略
      fullConfig.distributedConfig[item.key] = { ...formData, __draft: true }
    }
    // 保存到后端
    const res = await request.post('/system-config', fullConfig) as any
    if (res.success) {
      item.configured = true
      ElMessage.success(`「${item.name}」配置已保存`)
      showEditDialog.value = false
      addLog(item, 'edit')
    } else {
      ElMessage.error(res.message || '保存失败')
    }
  } catch (error) {
    console.error('保存配置失败:', error)
    ElMessage.error('保存失败，请稍后重试')
  } finally {
    editSaving.value = false
  }
}

// ==================== 开关管控 ====================
const handleToggle = (item: DistributeItem, val: boolean) => {
  currentItem.value = item
  confirmAction.value = val ? 'enable' : 'disable'
  showConfirmDialog.value = true
}

const cancelConfirm = () => {
  showConfirmDialog.value = false
  currentItem.value = null
}

const cancelConfirmAndEdit = () => {
  const item = currentItem.value
  showConfirmDialog.value = false
  currentItem.value = null
  if (item) openEditDialog(item)
}

const doConfirm = async () => {
  if (!currentItem.value) return
  submitting.value = true
  const item = currentItem.value
  item.loading = true
  try {
    const getRes = await request.get('/system-config') as any
    const fullConfig = getRes.success && getRes.data ? getRes.data : {}
    if (!fullConfig.distributedConfig) {
      fullConfig.distributedConfig = { security: null, call: null, email: null, sms: null, storage: null }
    }
    if (confirmAction.value === 'enable') {
      // 开启管控：用表单数据（去除__draft标记）
      const formData = { ...formMap[item.key] }
      delete formData.__draft
      fullConfig.distributedConfig[item.key] = item.configured ? formData : {}
    } else {
      // 关闭管控
      fullConfig.distributedConfig[item.key] = null
    }
    const res = await request.post('/system-config', fullConfig) as any
    if (res.success) {
      item.enabled = confirmAction.value === 'enable'
      ElMessage.success(confirmAction.value === 'enable' ? `「${item.name}」已开启管控` : `「${item.name}」已放开自主管理`)
      addLog(item, confirmAction.value)
    } else {
      ElMessage.error(res.message || '操作失败')
    }
  } catch (error) {
    ElMessage.error('操作失败，请稍后重试')
  } finally {
    item.loading = false
    submitting.value = false
    showConfirmDialog.value = false
    currentItem.value = null
  }
}

// ==================== 全部同步 ====================
const handleSyncAll = async () => {
  const managed = distributeItems.filter(i => i.enabled)
  if (managed.length === 0) {
    ElMessage.warning('当前没有已管控的配置项，请先开启管控')
    return
  }
  const unconfigured = managed.filter(i => !i.configured)
  if (unconfigured.length > 0) {
    ElMessage.warning(`以下配置已管控但未编辑内容：${unconfigured.map(i => i.name).join('、')}，建议先编辑配置`)
  }
  syncing.value = true
  try {
    const getRes = await request.get('/system-config') as any
    if (getRes.success && getRes.data) {
      // 确保所有已管控且已配置的项都写入最新表单值
      const fullConfig = getRes.data
      if (!fullConfig.distributedConfig) fullConfig.distributedConfig = {}
      distributeItems.forEach(item => {
        if (item.enabled && item.configured) {
          const formData = { ...formMap[item.key] }
          delete formData.__draft
          fullConfig.distributedConfig[item.key] = formData
        }
      })
      const res = await request.post('/system-config', fullConfig) as any
      if (res.success) {
        ElMessage.success(`已将 ${managed.length} 项管控配置同步到所有客户端`)
        addLog(null, 'sync')
      } else {
        ElMessage.error(res.message || '同步失败')
      }
    }
  } catch (error) {
    ElMessage.error('同步失败，请稍后重试')
  } finally {
    syncing.value = false
  }
}

// ==================== 操作日志 ====================
let logId = 0
const addLog = (item: DistributeItem | null, action: string) => {
  const now = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
  const map: Record<string, LogItem> = {
    sync: { id: ++logId, time: now, action: '全部同步', detail: `已将所有管控配置同步下发到所有客户端`, type: 'primary' },
    enable: { id: ++logId, time: now, action: '开启管控', detail: `「${item!.name}」已开启统一管控`, type: 'success' },
    disable: { id: ++logId, time: now, action: '放开管控', detail: `「${item!.name}」已放开自主管理`, type: 'warning' },
    edit: { id: ++logId, time: now, action: '编辑配置', detail: `「${item!.name}」配置内容已更新`, type: 'info' }
  }
  logs.value.unshift(map[action])
}

onMounted(() => { loadDistributeConfig() })
</script>

<style scoped lang="scss">
.page-container { padding: 0; }

/* ===== 头部 ===== */
.header-card {
  margin-bottom: 16px; border-radius: 16px; border: none;
  background: linear-gradient(135deg, #409eff 0%, #6366f1 100%); color: #fff;
  :deep(.el-card__body) { padding: 24px 28px; }
}
.page-header { display: flex; justify-content: space-between; align-items: center; }
.title-row { display: flex; align-items: center; gap: 16px; }
.title-icon { width: 52px; height: 52px; border-radius: 14px; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; }
.page-title { font-size: 22px; font-weight: 700; color: #fff; margin: 0 0 4px 0; }
.page-desc { font-size: 13px; color: rgba(255,255,255,0.85); margin: 0; }
.header-actions { display: flex; align-items: center; gap: 20px; }
.stats-group { display: flex; align-items: center; gap: 16px; background: rgba(255,255,255,0.15); border-radius: 12px; padding: 10px 20px; }
.stat-item { display: flex; align-items: center; gap: 6px; color: #fff; .el-icon { font-size: 18px; } }
.stat-num { font-size: 22px; font-weight: 700; line-height: 1; }
.stat-label { font-size: 12px; opacity: 0.85; }
.stat-divider { width: 1px; height: 28px; background: rgba(255,255,255,0.3); }
.header-actions .el-button { background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: #fff; &:hover { background: rgba(255,255,255,0.35); } }

/* ===== 提示条 ===== */
.tip-banner { display: flex; align-items: flex-start; gap: 8px; padding: 12px 20px; margin-bottom: 20px; background: #ecf5ff; border: 1px solid #d9ecff; border-radius: 10px; font-size: 13px; color: #409eff; line-height: 1.6; }
.tip-icon { font-size: 18px; flex-shrink: 0; margin-top: 2px; }

/* ===== 卡片网格 ===== */
.distribute-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 18px; min-height: 200px; }
.distribute-card {
  position: relative; background: #fff; border-radius: 16px; padding: 24px 20px 18px;
  border: 1px solid #ebeef5; transition: all 0.35s cubic-bezier(0.4,0,0.2,1);
  display: flex; flex-direction: column; align-items: center; text-align: center; overflow: hidden;
  &::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, #dcdfe6, #e4e7ed); transition: background 0.3s; }
  &:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(0,0,0,0.08); border-color: transparent; }
  &.is-managed {
    &::before { background: linear-gradient(90deg, #409eff, #6366f1); }
    border-color: #d9ecff; background: linear-gradient(180deg, #f8fbff 0%, #fff 30%);
  }
}
.status-dot { position: absolute; top: 14px; right: 14px; width: 10px; height: 10px; border-radius: 50%;
  &.dot-on { background: #409eff; box-shadow: 0 0 8px rgba(64,158,255,0.5); animation: pulse-blue 2s ease-in-out infinite; }
  &.dot-off { background: #dcdfe6; }
}
@keyframes pulse-blue { 0%,100% { box-shadow: 0 0 6px rgba(64,158,255,0.4); } 50% { box-shadow: 0 0 12px rgba(64,158,255,0.7); } }
.card-icon-wrapper { margin-bottom: 12px; }
.card-icon { width: 56px; height: 56px; border-radius: 16px; display: flex; align-items: center; justify-content: center; box-shadow: 0 6px 16px rgba(0,0,0,0.1); transition: all 0.3s; }
.card-content { margin-bottom: 8px; width: 100%; }
.item-name { font-size: 15px; font-weight: 600; color: #303133; margin: 0 0 4px 0; }
.item-desc { font-size: 12px; color: #909399; margin: 0; line-height: 1.5; min-height: 36px; }
.config-status { margin-bottom: 8px; }
.edit-btn-area { margin-bottom: 10px; }
.card-action { margin-top: auto; padding-top: 12px; border-top: 1px solid #f5f5f5; width: 100%; display: flex; justify-content: center; }

/* ===== 记录卡片 ===== */
.log-card { border-radius: 16px; border: none;
  :deep(.el-card__header) { padding: 16px 24px; border-bottom: 1px solid #f0f0f0; }
  :deep(.el-card__body) { padding: 20px 24px; }
}
.log-header { display: flex; justify-content: space-between; align-items: center; }
.log-title { display: flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 600; color: #303133; .el-icon { color: #409eff; } }
.log-content { display: flex; align-items: center; gap: 8px; }
.log-action { font-weight: 600; color: #303133; font-size: 14px; }
.log-detail { color: #909399; font-size: 13px; }

/* ===== 弹窗 ===== */
.edit-form { max-height: 55vh; overflow-y: auto; padding-right: 10px; }
.form-tip { margin-left: 10px; font-size: 12px; color: #909399; }
.dialog-footer { display: flex; justify-content: flex-end; gap: 10px; }
.confirm-dialog {
  :deep(.el-dialog) { border-radius: 16px; overflow: hidden; }
  :deep(.el-dialog__header) { padding: 20px 24px 12px; margin: 0; }
  :deep(.el-dialog__body) { padding: 0 24px; }
  :deep(.el-dialog__footer) { padding: 16px 24px 20px; }
}
.dialog-content { padding: 0; }
.dialog-warning-box { display: flex; align-items: center; gap: 16px; padding: 20px; border-radius: 12px; margin-bottom: 16px;
  &.info-box { background: linear-gradient(135deg, #ecf5ff 0%, #d9ecff 100%); }
  &.warning-box { background: linear-gradient(135deg, #fdf6ec 0%, #faecd8 100%); }
}
.warning-icon-big { flex-shrink: 0; width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.6); border-radius: 50%; }
.warning-text { h4 { margin: 0 0 4px 0; font-size: 15px; color: #303133; font-weight: 600; } p { margin: 0; font-size: 13px; color: #909399; } }
</style>

