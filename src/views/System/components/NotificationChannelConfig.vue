<template>
  <div class="notification-channel-config">
    <!-- 渠道类型说明 -->
    <el-card class="channel-intro-card">
      <template #header>
        <div class="card-header">
          <el-icon><InfoFilled /></el-icon>
          <span>支持的通知渠道</span>
        </div>
      </template>
      <el-row :gutter="16">
        <el-col :span="4" v-for="channel in channelTypeList" :key="channel.value">
          <div class="channel-type-item" :class="{ 'is-active': selectedChannelType === channel.value }" @click="selectChannelType(channel.value)">
            <div class="channel-icon" :style="{ background: channel.color }">
              <el-icon v-if="channel.value === 'dingtalk'"><ChatDotRound /></el-icon>
              <el-icon v-else-if="channel.value === 'wechat_work'"><ChatLineSquare /></el-icon>
              <el-icon v-else-if="channel.value === 'wechat_mp'"><Promotion /></el-icon>
              <el-icon v-else-if="channel.value === 'email'"><Message /></el-icon>
              <el-icon v-else-if="channel.value === 'sms'"><Iphone /></el-icon>
              <el-icon v-else><Bell /></el-icon>
            </div>
            <div class="channel-name">{{ channel.label }}</div>
            <div class="channel-status">
              <el-tag v-if="getChannelStatus(channel.value)" type="success" size="small">已配置</el-tag>
              <el-tag v-else type="info" size="small">未配置</el-tag>
            </div>
          </div>
        </el-col>
      </el-row>
    </el-card>

    <!-- 配置表单 -->
    <el-card v-if="selectedChannelType" class="config-form-card">
      <template #header>
        <div class="card-header">
          <span>{{ getChannelLabel(selectedChannelType) }} 配置</span>
          <el-button type="primary" size="small" @click="testCurrentChannel" :loading="testing">
            <el-icon><Connection /></el-icon>
            测试连接
          </el-button>
        </div>
      </template>

      <!-- 钉钉配置 -->
      <el-form v-if="selectedChannelType === 'dingtalk'" :model="dingtalkConfig" label-width="120px">
        <el-alert type="info" :closable="false" style="margin-bottom: 20px;">
          <template #title>
            <span>配置说明：在钉钉群中添加自定义机器人，获取Webhook地址和加签密钥</span>
          </template>
        </el-alert>
        <el-form-item label="Webhook地址" required>
          <el-input v-model="dingtalkConfig.webhook" placeholder="https://oapi.dingtalk.com/robot/send?access_token=xxx" />
        </el-form-item>
        <el-form-item label="加签密钥">
          <el-input v-model="dingtalkConfig.secret" placeholder="SEC开头的密钥（可选）" show-password />
          <div class="form-tip">如果机器人开启了加签验证，请填写SEC开头的密钥</div>
        </el-form-item>
        <el-form-item label="@所有人">
          <el-switch v-model="dingtalkConfig.at_all" />
        </el-form-item>
        <el-form-item label="@指定手机号">
          <el-select v-model="dingtalkConfig.at_mobiles" multiple filterable allow-create placeholder="输入手机号后回车">
          </el-select>
        </el-form-item>
      </el-form>

      <!-- 企业微信配置 -->
      <el-form v-else-if="selectedChannelType === 'wechat_work'" :model="wechatWorkConfig" label-width="120px">
        <el-alert type="info" :closable="false" style="margin-bottom: 20px;">
          <template #title>
            <span>配置说明：在企业微信群中添加群机器人，获取Webhook地址</span>
          </template>
        </el-alert>
        <el-form-item label="Webhook地址" required>
          <el-input v-model="wechatWorkConfig.webhook" placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx" />
        </el-form-item>
        <el-form-item label="@成员">
          <el-select v-model="wechatWorkConfig.mentioned_list" multiple filterable allow-create placeholder="输入企业微信用户ID">
          </el-select>
          <div class="form-tip">填写企业微信用户ID，@all表示所有人</div>
        </el-form-item>
        <el-form-item label="@手机号">
          <el-select v-model="wechatWorkConfig.mentioned_mobile_list" multiple filterable allow-create placeholder="输入手机号">
          </el-select>
        </el-form-item>
      </el-form>

      <!-- 微信公众号配置 -->
      <el-form v-else-if="selectedChannelType === 'wechat_mp'" :model="wechatMpConfig" label-width="120px">
        <el-alert type="warning" :closable="false" style="margin-bottom: 20px;">
          <template #title>
            <span>注意：需要用户关注公众号并授权后才能发送模板消息</span>
          </template>
        </el-alert>
        <el-form-item label="AppID" required>
          <el-input v-model="wechatMpConfig.app_id" placeholder="公众号AppID" />
        </el-form-item>
        <el-form-item label="AppSecret" required>
          <el-input v-model="wechatMpConfig.app_secret" placeholder="公众号AppSecret" show-password />
        </el-form-item>
        <el-form-item label="模板ID" required>
          <el-input v-model="wechatMpConfig.template_id" placeholder="消息模板ID" />
        </el-form-item>
        <el-form-item label="接收用户OpenID">
          <el-select v-model="wechatMpConfig.openids" multiple filterable allow-create placeholder="输入用户OpenID">
          </el-select>
        </el-form-item>
      </el-form>

      <!-- 邮件配置 -->
      <el-form v-else-if="selectedChannelType === 'email'" :model="emailConfig" label-width="120px">
        <el-alert type="info" :closable="false" style="margin-bottom: 20px;">
          <template #title>
            <span>配置说明：使用SMTP协议发送邮件，支持QQ邮箱、163邮箱、企业邮箱等</span>
          </template>
        </el-alert>
        <el-form-item label="SMTP服务器" required>
          <el-input v-model="emailConfig.smtp_host" placeholder="如：smtp.qq.com" />
        </el-form-item>
        <el-form-item label="SMTP端口" required>
          <el-input-number v-model="emailConfig.smtp_port" :min="1" :max="65535" />
          <div class="form-tip">SSL端口通常为465，非SSL端口通常为25或587</div>
        </el-form-item>
        <el-form-item label="发件人账号" required>
          <el-input v-model="emailConfig.username" placeholder="邮箱地址" />
        </el-form-item>
        <el-form-item label="授权密码" required>
          <el-input v-model="emailConfig.password" placeholder="邮箱授权码（非登录密码）" show-password />
        </el-form-item>
        <el-form-item label="发件人名称">
          <el-input v-model="emailConfig.from_name" placeholder="如：CRM系统" />
        </el-form-item>
        <el-form-item label="收件人邮箱">
          <el-select v-model="emailConfig.to_emails" multiple filterable allow-create placeholder="输入邮箱地址后回车">
          </el-select>
        </el-form-item>
      </el-form>

      <!-- 短信配置 -->
      <el-form v-else-if="selectedChannelType === 'sms'" :model="smsConfig" label-width="120px">
        <el-alert type="info" :closable="false" style="margin-bottom: 20px;">
          <template #title>
            <span>配置说明：支持阿里云短信和腾讯云短信服务</span>
          </template>
        </el-alert>
        <el-form-item label="服务商" required>
          <el-radio-group v-model="smsConfig.provider">
            <el-radio label="aliyun">阿里云短信</el-radio>
            <el-radio label="tencent">腾讯云短信</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="AccessKey" required>
          <el-input v-model="smsConfig.access_key" placeholder="AccessKey ID" />
        </el-form-item>
        <el-form-item label="AccessSecret" required>
          <el-input v-model="smsConfig.access_secret" placeholder="AccessKey Secret" show-password />
        </el-form-item>
        <el-form-item v-if="smsConfig.provider === 'tencent'" label="SDK AppID" required>
          <el-input v-model="smsConfig.sdk_app_id" placeholder="腾讯云短信应用ID" />
        </el-form-item>
        <el-form-item label="签名名称" required>
          <el-input v-model="smsConfig.sign_name" placeholder="短信签名" />
        </el-form-item>
        <el-form-item label="模板ID" required>
          <el-input v-model="smsConfig.template_code" placeholder="短信模板ID" />
        </el-form-item>
        <el-form-item label="接收手机号">
          <el-select v-model="smsConfig.phones" multiple filterable allow-create placeholder="输入手机号后回车">
          </el-select>
        </el-form-item>
      </el-form>

      <!-- 保存按钮 -->
      <div class="form-actions">
        <el-button type="primary" @click="saveConfig" :loading="saving">
          <el-icon><Check /></el-icon>
          保存配置
        </el-button>
        <el-button @click="resetConfig">
          <el-icon><Refresh /></el-icon>
          重置
        </el-button>
      </div>
    </el-card>

    <!-- 发送记录 -->
    <el-card class="logs-card">
      <template #header>
        <div class="card-header">
          <span>发送记录</span>
          <el-button type="primary" link @click="loadLogs">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>
      </template>
      <el-table :data="logs" v-loading="logsLoading" max-height="300">
        <el-table-column prop="channelType" label="渠道" width="100">
          <template #default="{ row }">
            <el-tag size="small">{{ getChannelLabel(row.channelType) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="标题" min-width="150" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 'success' ? 'success' : 'danger'" size="small">
              {{ row.status === 'success' ? '成功' : '失败' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="sentAt" label="发送时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.sentAt) }}
          </template>
        </el-table-column>
        <el-table-column prop="errorMessage" label="错误信息" min-width="200" show-overflow-tooltip />
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { messageApi } from '@/api/message'
import {
  InfoFilled,
  ChatDotRound,
  ChatLineSquare,
  Promotion,
  Message,
  Iphone,
  Bell,
  Connection,
  Check,
  Refresh
} from '@element-plus/icons-vue'

// 渠道类型列表
const channelTypeList = [
  { value: 'dingtalk', label: '钉钉', color: '#1890ff' },
  { value: 'wechat_work', label: '企业微信', color: '#07c160' },
  { value: 'wechat_mp', label: '微信公众号', color: '#576b95' },
  { value: 'email', label: '邮件', color: '#f5222d' },
  { value: 'sms', label: '短信', color: '#fa8c16' },
  { value: 'system', label: '系统通知', color: '#722ed1' }
]

// 当前选中的渠道类型
const selectedChannelType = ref('')

// 各渠道配置
const dingtalkConfig = reactive({
  webhook: '',
  secret: '',
  at_all: false,
  at_mobiles: [] as string[]
})

const wechatWorkConfig = reactive({
  webhook: '',
  mentioned_list: [] as string[],
  mentioned_mobile_list: [] as string[]
})

const wechatMpConfig = reactive({
  app_id: '',
  app_secret: '',
  template_id: '',
  openids: [] as string[]
})

const emailConfig = reactive({
  smtp_host: '',
  smtp_port: 465,
  username: '',
  password: '',
  from_name: 'CRM系统',
  to_emails: [] as string[]
})

const smsConfig = reactive({
  provider: 'aliyun',
  access_key: '',
  access_secret: '',
  sdk_app_id: '',
  sign_name: '',
  template_code: '',
  phones: [] as string[]
})

// 已配置的渠道
const configuredChannels = ref<Record<string, any>>({})

// 发送记录
const logs = ref<any[]>([])
const logsLoading = ref(false)

// 状态
const saving = ref(false)
const testing = ref(false)

// 获取渠道标签
const getChannelLabel = (type: string) => {
  return channelTypeList.find(c => c.value === type)?.label || type
}

// 获取渠道配置状态
const getChannelStatus = (type: string) => {
  return !!configuredChannels.value[type]
}

// 选择渠道类型
const selectChannelType = (type: string) => {
  selectedChannelType.value = type
  loadChannelConfig(type)
}

// 加载渠道配置
const loadChannelConfig = async (type: string) => {
  try {
    const response = await messageApi.getNotificationChannels()
    if (response.success && response.data) {
      const channels = Array.isArray(response.data) ? response.data : []
      const channel = channels.find((c: any) => c.channelType === type)

      if (channel) {
        configuredChannels.value[type] = channel
        const config = channel.config || {}

        switch (type) {
          case 'dingtalk':
            Object.assign(dingtalkConfig, config)
            break
          case 'wechat_work':
            Object.assign(wechatWorkConfig, config)
            break
          case 'wechat_mp':
            Object.assign(wechatMpConfig, config)
            break
          case 'email':
            Object.assign(emailConfig, config)
            break
          case 'sms':
            Object.assign(smsConfig, config)
            break
        }
      }
    }
  } catch (error) {
    console.error('加载渠道配置失败:', error)
  }
}

// 保存配置
const saveConfig = async () => {
  if (!selectedChannelType.value) return

  saving.value = true
  try {
    let config: any = {}

    switch (selectedChannelType.value) {
      case 'dingtalk':
        config = { ...dingtalkConfig }
        break
      case 'wechat_work':
        config = { ...wechatWorkConfig }
        break
      case 'wechat_mp':
        config = { ...wechatMpConfig }
        break
      case 'email':
        config = { ...emailConfig }
        break
      case 'sms':
        config = { ...smsConfig }
        break
    }

    const existingChannel = configuredChannels.value[selectedChannelType.value]

    if (existingChannel) {
      // 更新
      await messageApi.updateNotificationChannel(existingChannel.id, {
        config,
        isEnabled: true
      })
    } else {
      // 创建
      await messageApi.createNotificationChannel({
        name: `${getChannelLabel(selectedChannelType.value)}通知`,
        channelType: selectedChannelType.value,
        config
      })
    }

    ElMessage.success('配置保存成功')
    loadChannelConfig(selectedChannelType.value)
  } catch (error) {
    console.error('保存配置失败:', error)
    ElMessage.error('保存配置失败')
  } finally {
    saving.value = false
  }
}

// 重置配置
const resetConfig = () => {
  switch (selectedChannelType.value) {
    case 'dingtalk':
      Object.assign(dingtalkConfig, { webhook: '', secret: '', at_all: false, at_mobiles: [] })
      break
    case 'wechat_work':
      Object.assign(wechatWorkConfig, { webhook: '', mentioned_list: [], mentioned_mobile_list: [] })
      break
    case 'wechat_mp':
      Object.assign(wechatMpConfig, { app_id: '', app_secret: '', template_id: '', openids: [] })
      break
    case 'email':
      Object.assign(emailConfig, { smtp_host: '', smtp_port: 465, username: '', password: '', from_name: 'CRM系统', to_emails: [] })
      break
    case 'sms':
      Object.assign(smsConfig, { provider: 'aliyun', access_key: '', access_secret: '', sdk_app_id: '', sign_name: '', template_code: '', phones: [] })
      break
  }
}

// 测试当前渠道
const testCurrentChannel = async () => {
  const channel = configuredChannels.value[selectedChannelType.value]
  if (!channel) {
    ElMessage.warning('请先保存配置')
    return
  }

  testing.value = true
  try {
    const response = await messageApi.testNotificationChannel(channel.id, '这是一条来自CRM系统的测试消息 🎉')
    if (response.success) {
      ElMessage.success(response.message || '测试成功')
    } else {
      ElMessage.error(response.message || '测试失败')
    }
  } catch (error: any) {
    ElMessage.error('测试失败: ' + (error.message || '未知错误'))
  } finally {
    testing.value = false
  }
}

// 加载发送记录
const loadLogs = async () => {
  logsLoading.value = true
  try {
    const response = await messageApi.getNotificationLogs({ pageSize: 20 })
    if (response.success && response.data) {
      logs.value = Array.isArray(response.data) ? response.data : (response.data as any).list || []
    }
  } catch (error) {
    console.error('加载发送记录失败:', error)
  } finally {
    logsLoading.value = false
  }
}

// 格式化日期
const formatDate = (date: string | Date) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}

// 初始化
onMounted(async () => {
  // 加载所有渠道配置状态
  try {
    const response = await messageApi.getNotificationChannels()
    if (response.success && response.data) {
      const channels = Array.isArray(response.data) ? response.data : []
      channels.forEach((c: any) => {
        configuredChannels.value[c.channelType] = c
      })
    }
  } catch (error) {
    console.error('加载渠道配置失败:', error)
  }

  loadLogs()
})
</script>

<style scoped>
.notification-channel-config {
  padding: 0;
}

.channel-intro-card,
.config-form-card,
.logs-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.card-header span {
  display: flex;
  align-items: center;
  gap: 8px;
}

.channel-type-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  border: 2px solid transparent;
}

.channel-type-item:hover {
  background: #f5f7fa;
}

.channel-type-item.is-active {
  background: #ecf5ff;
  border-color: #409eff;
}

.channel-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
  margin-bottom: 8px;
}

.channel-name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 4px;
}

.channel-status {
  margin-top: 4px;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.form-actions {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
  display: flex;
  gap: 12px;
}

:deep(.el-form-item) {
  margin-bottom: 18px;
}
</style>
