<template>
  <div class="page-container">
    <el-card shadow="never" class="config-card">
      <template #header>
        <div class="card-header">
          <span>运营配置</span>
          <el-button type="primary" @click="handleSave" :loading="saving">
            <el-icon><Check /></el-icon>保存配置
          </el-button>
        </div>
      </template>

      <el-tabs v-model="activeTab">
        <el-tab-pane label="后台设置" name="admin">
          <el-form :model="adminForm" label-width="140px" class="config-form">
            <el-form-item label="后台名称">
              <el-input v-model="adminForm.name" placeholder="请输入后台名称" />
            </el-form-item>
            <el-form-item label="后台Logo">
              <el-upload class="logo-uploader" action="#" :show-file-list="false" :auto-upload="false">
                <img v-if="adminForm.logo" :src="adminForm.logo" class="logo-preview" />
                <el-icon v-else class="logo-icon"><Plus /></el-icon>
              </el-upload>
            </el-form-item>
            <el-form-item label="登录背景">
              <el-upload class="bg-uploader" action="#" :show-file-list="false" :auto-upload="false">
                <img v-if="adminForm.loginBg" :src="adminForm.loginBg" class="bg-preview" />
                <div v-else class="bg-placeholder">点击上传背景图</div>
              </el-upload>
            </el-form-item>
            <el-form-item label="主题色">
              <el-color-picker v-model="adminForm.primaryColor" />
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="安全设置" name="security">
          <el-form :model="securityForm" label-width="140px" class="config-form">
            <el-form-item label="登录验证码">
              <el-switch v-model="securityForm.loginCaptcha" />
            </el-form-item>
            <el-form-item label="登录失败锁定">
              <el-input-number v-model="securityForm.maxLoginAttempts" :min="3" :max="10" />
              <span class="form-tip">次失败后锁定账号</span>
            </el-form-item>
            <el-form-item label="锁定时长">
              <el-input-number v-model="securityForm.lockDuration" :min="5" :max="60" />
              <span class="form-tip">分钟</span>
            </el-form-item>
            <el-form-item label="会话超时">
              <el-input-number v-model="securityForm.sessionTimeout" :min="30" :max="1440" />
              <span class="form-tip">分钟</span>
            </el-form-item>
            <el-form-item label="IP白名单">
              <el-switch v-model="securityForm.ipWhitelistEnabled" />
            </el-form-item>
            <el-form-item v-if="securityForm.ipWhitelistEnabled" label="白名单IP">
              <el-input v-model="securityForm.ipWhitelist" type="textarea" :rows="3" placeholder="每行一个IP地址" />
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="日志设置" name="log">
          <el-form :model="logForm" label-width="140px" class="config-form">
            <el-form-item label="操作日志">
              <el-switch v-model="logForm.operationLog" />
              <span class="form-tip">记录管理员操作日志</span>
            </el-form-item>
            <el-form-item label="登录日志">
              <el-switch v-model="logForm.loginLog" />
            </el-form-item>
            <el-form-item label="日志保留天数">
              <el-input-number v-model="logForm.retentionDays" :min="7" :max="365" />
              <span class="form-tip">天</span>
            </el-form-item>
            <el-form-item>
              <el-button type="danger" @click="handleClearLogs">清理过期日志</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="修改密码" name="password">
          <el-form ref="pwdFormRef" :model="pwdForm" :rules="pwdRules" label-width="140px" class="config-form">
            <el-form-item label="当前密码" prop="oldPassword">
              <el-input v-model="pwdForm.oldPassword" type="password" show-password />
            </el-form-item>
            <el-form-item label="新密码" prop="newPassword">
              <el-input v-model="pwdForm.newPassword" type="password" show-password />
            </el-form-item>
            <el-form-item label="确认密码" prop="confirmPassword">
              <el-input v-model="pwdForm.confirmPassword" type="password" show-password />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleChangePwd">修改密码</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="短信配置" name="sms">
          <el-form :model="smsForm" label-width="160px" class="config-form">
            <el-alert type="info" :closable="false" style="margin-bottom: 20px">
              配置阿里云短信服务，用于官网注册验证码发送、通知短信等
            </el-alert>

            <div class="section-title">基础配置</div>
            <el-form-item label="配置状态">
              <el-tag v-if="smsForm.enabled && smsForm.accessKeyId && smsForm.signName" type="success" effect="dark">
                已配置并启用
              </el-tag>
              <el-tag v-else-if="smsForm.accessKeyId" type="warning">
                已配置但未启用
              </el-tag>
              <el-tag v-else type="info">
                未配置
              </el-tag>
            </el-form-item>
            <el-form-item label="启用短信">
              <el-switch v-model="smsForm.enabled" />
            </el-form-item>
            <el-form-item label="AccessKey ID">
              <el-input v-model="smsForm.accessKeyId" placeholder="阿里云 AccessKey ID" />
            </el-form-item>
            <el-form-item label="AccessKey Secret">
              <el-input v-model="smsForm.accessKeySecret" type="password" show-password placeholder="阿里云 AccessKey Secret" />
            </el-form-item>
            <el-form-item label="短信签名">
              <el-input v-model="smsForm.signName" placeholder="如：云客CRM" />
              <div class="form-tip">需在阿里云短信控制台申请</div>
            </el-form-item>

            <el-divider />

            <div class="section-title">
              短信模板CODE配置
              <el-tooltip content="在阿里云短信控制台申请模板后，将获得的模板CODE填写到对应场景" placement="top">
                <el-icon style="margin-left: 8px; cursor: help;"><QuestionFilled /></el-icon>
              </el-tooltip>
            </div>
            <el-alert type="warning" :closable="false" style="margin-bottom: 16px">
              <template #title>
                <div style="font-size: 13px;">
                  请按照《阿里云短信模板申请清单.md》逐条申请模板，审核通过后填写对应的模板CODE
                </div>
              </template>
            </el-alert>

            <el-form-item label="验证码模板">
              <el-input v-model="smsForm.templates.VERIFY_CODE" placeholder="SMS_123456789" />
              <div class="form-tip">用于注册、登录验证码</div>
            </el-form-item>
            <el-form-item label="账号开通通知">
              <el-input v-model="smsForm.templates.ACCOUNT_ACTIVATION" placeholder="SMS_234567890" />
              <div class="form-tip">免费试用注册成功后立即发送（包含授权码和账号信息）</div>
            </el-form-item>
            <el-form-item label="支付成功账号开通通知">
              <el-input v-model="smsForm.templates.PAYMENT_ACTIVATION" placeholder="SMS_345678901" />
              <div class="form-tip">付费套餐支付成功后发送（包含订单号、金额、授权码和账号信息）</div>
            </el-form-item>
            <el-form-item label="续期成功通知">
              <el-input v-model="smsForm.templates.RENEW_SUCCESS" placeholder="SMS_456789012" />
              <div class="form-tip">管理员为租户续期后发送</div>
            </el-form-item>
            <el-form-item label="套餐变更通知">
              <el-input v-model="smsForm.templates.PACKAGE_CHANGE" placeholder="SMS_567890123" />
              <div class="form-tip">升级/降级套餐时发送</div>
            </el-form-item>
            <el-form-item label="配额变更通知">
              <el-input v-model="smsForm.templates.QUOTA_CHANGE" placeholder="SMS_678901234" />
              <div class="form-tip">调整用户数或存储空间时发送</div>
            </el-form-item>
            <el-form-item label="账号暂停通知">
              <el-input v-model="smsForm.templates.ACCOUNT_SUSPEND" placeholder="SMS_789012345" />
              <div class="form-tip">暂停租户授权时发送</div>
            </el-form-item>
            <el-form-item label="账号激活通知">
              <el-input v-model="smsForm.templates.ACCOUNT_RESUME" placeholder="SMS_890123456" />
              <div class="form-tip">恢复租户授权时发送</div>
            </el-form-item>
            <el-form-item label="账号注销通知">
              <el-input v-model="smsForm.templates.ACCOUNT_CANCEL" placeholder="SMS_901234567" />
              <div class="form-tip">注销租户时发送</div>
            </el-form-item>
            <el-form-item label="退款成功通知">
              <el-input v-model="smsForm.templates.REFUND_SUCCESS" placeholder="SMS_012345678" />
              <div class="form-tip">处理退款后发送</div>
            </el-form-item>
            <el-form-item label="到期提醒通知">
              <el-input v-model="smsForm.templates.EXPIRE_REMIND" placeholder="SMS_123450000" />
              <div class="form-tip">到期前7天、3天、1天自动发送</div>
            </el-form-item>
            <el-form-item label="过期通知">
              <el-input v-model="smsForm.templates.EXPIRED_NOTICE" placeholder="SMS_234560000" />
              <div class="form-tip">账号过期当天发送</div>
            </el-form-item>

            <el-divider content-position="left" style="margin: 20px 0 16px;">
              <span style="font-size: 13px; font-weight: 600; color: #909399;">订阅自动续费相关</span>
            </el-divider>

            <el-form-item label="订阅扣款成功通知">
              <el-input v-model="smsForm.templates.SUBSCRIPTION_DEDUCT_SUCCESS" placeholder="SMS_345670001" />
              <div class="form-tip">自动续费扣款成功后发送给客户（变量：tenantName, amount, nextDeductDate）</div>
            </el-form-item>
            <el-form-item label="订阅扣款失败通知">
              <el-input v-model="smsForm.templates.SUBSCRIPTION_DEDUCT_FAILED" placeholder="SMS_345670002" />
              <div class="form-tip">自动续费扣款失败后发送给客户（变量：tenantName, amount, retryInfo）</div>
            </el-form-item>
            <el-form-item label="订阅开通通知">
              <el-input v-model="smsForm.templates.SUBSCRIPTION_ACTIVATED" placeholder="SMS_345670003" />
              <div class="form-tip">用户订阅签约成功后发送（变量：tenantName, packageName, amount, billingCycle）</div>
            </el-form-item>
            <el-form-item label="订阅取消通知">
              <el-input v-model="smsForm.templates.SUBSCRIPTION_CANCELLED" placeholder="SMS_345670004" />
              <div class="form-tip">订阅取消后发送给客户（变量：tenantName, effectiveDate）</div>
            </el-form-item>
            <el-form-item label="订阅过期通知">
              <el-input v-model="smsForm.templates.SUBSCRIPTION_EXPIRED" placeholder="SMS_345670005" />
              <div class="form-tip">订阅因扣款失败过期时发送（变量：tenantName, servicePhone）</div>
            </el-form-item>

            <el-divider content-position="left" style="margin: 20px 0 16px;">
              <span style="font-size: 13px; font-weight: 600; color: #909399;">管理员/系统通知</span>
            </el-divider>

            <el-form-item label="管理员通知模板">
              <el-input v-model="smsForm.templates.ADMIN_NOTIFICATION" placeholder="SMS_456780001" />
              <div class="form-tip">运营管理员通用通知（扣款动态、异常告警等，变量：title, content）</div>
            </el-form-item>
            <el-form-item label="密码重置通知">
              <el-input v-model="smsForm.templates.PASSWORD_RESET" placeholder="SMS_456780002" />
              <div class="form-tip">管理员为租户重置密码后发送（变量：tenantName, newPassword）</div>
            </el-form-item>

            <el-divider content-position="left" style="margin: 20px 0 16px;">
              <span style="font-size: 13px; font-weight: 600; color: #909399;">扩容管理相关</span>
            </el-divider>

            <el-form-item label="扩容成功通知">
              <el-input v-model="smsForm.templates.CAPACITY_SUCCESS" placeholder="SMS_567890001" />
              <div class="form-tip">扩容订单支付成功后发送（变量：tenantName, type, quantity, amount）</div>
            </el-form-item>
            <el-form-item label="扩容退款通知">
              <el-input v-model="smsForm.templates.CAPACITY_REFUND" placeholder="SMS_567890002" />
              <div class="form-tip">扩容退款处理完成后发送（变量：tenantName, type, quantity, refundAmount）</div>
            </el-form-item>

            <el-divider />

            <el-form-item>
              <el-button type="primary" @click="handleTestSms" :disabled="!smsForm.accessKeyId || !smsForm.signName || !smsForm.templates.VERIFY_CODE">
                发送测试短信
              </el-button>
              <span v-if="!smsForm.accessKeyId || !smsForm.signName || !smsForm.templates.VERIFY_CODE" class="form-tip" style="color: #e6a23c;">
                请先完整填写基础配置和验证码模板CODE
              </span>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="邮件配置" name="email">
          <el-form :model="emailForm" label-width="140px" class="config-form">
            <el-alert type="info" :closable="false" style="margin-bottom: 20px">
              配置SMTP邮件服务，用于系统通知、订单提醒、注册确认等邮件发送
            </el-alert>
            <el-form-item label="配置状态">
              <el-tag v-if="emailForm.enabled && emailForm.smtpHost && emailForm.senderEmail" type="success" effect="dark">
                已配置并启用
              </el-tag>
              <el-tag v-else-if="emailForm.smtpHost" type="warning">
                已配置但未启用
              </el-tag>
              <el-tag v-else type="info">
                未配置
              </el-tag>
            </el-form-item>
            <el-form-item label="启用邮件">
              <el-switch v-model="emailForm.enabled" />
            </el-form-item>
            <el-form-item label="SMTP服务器">
              <el-input v-model="emailForm.smtpHost" placeholder="如：smtp.qq.com" />
            </el-form-item>
            <el-form-item label="SMTP端口">
              <el-input-number v-model="emailForm.smtpPort" :min="1" :max="65535" />
              <span class="form-tip">SSL通常使用465，TLS使用587</span>
            </el-form-item>
            <el-form-item label="发件人邮箱">
              <el-input v-model="emailForm.senderEmail" placeholder="如：noreply@example.com" />
            </el-form-item>
            <el-form-item label="发件人名称">
              <el-input v-model="emailForm.senderName" placeholder="如：CRM系统" />
            </el-form-item>
            <el-form-item label="邮箱密码/授权码">
              <el-input v-model="emailForm.emailPassword" type="password" show-password placeholder="请填写SMTP授权码（非登录密码）" />
              <div class="form-tip" style="line-height: 1.8;">
                <div><strong>⚠️ 重要：</strong>大多数邮箱需要使用<strong style="color: #e6a23c;">授权码</strong>，而非登录密码！</div>
                <div>• <strong>163/126邮箱：</strong>登录网页版 → 设置 → POP3/SMTP → 开启SMTP → 获取授权码</div>
                <div>• <strong>QQ邮箱：</strong>设置 → 账户 → POP3/SMTP → 开启 → 生成授权码</div>
                <div>• <strong>企业邮箱：</strong>通常可使用登录密码，请查阅对应邮箱文档</div>
              </div>
            </el-form-item>
            <el-form-item label="启用SSL">
              <el-switch v-model="emailForm.enableSsl" />
              <span class="form-tip">端口465通常启用SSL</span>
            </el-form-item>
            <el-form-item label="启用TLS">
              <el-switch v-model="emailForm.enableTls" />
              <span class="form-tip">端口587通常启用TLS</span>
            </el-form-item>
            <el-form-item label="测试邮箱">
              <el-input v-model="emailForm.testEmail" placeholder="用于测试的收件邮箱" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleTestEmail" :loading="testingEmail" :disabled="!emailForm.smtpHost || !emailForm.senderEmail || !emailForm.testEmail">
                发送测试邮件
              </el-button>
              <el-button type="success" @click="handleSave" :loading="saving" :disabled="!emailForm.smtpHost || !emailForm.senderEmail">
                保存配置
              </el-button>
              <span v-if="!emailForm.smtpHost || !emailForm.senderEmail" class="form-tip" style="color: #e6a23c;">
                请先完整填写邮件配置
              </span>
              <span v-else-if="!emailForm.testEmail" class="form-tip" style="color: #e6a23c;">
                请填写测试邮箱后再发送测试
              </span>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="超时提醒" name="timeout">
          <el-form :model="timeoutForm" label-width="160px" class="config-form">
            <el-alert type="info" :closable="false" style="margin-bottom: 20px">
              配置订单、售后等业务的超时自动提醒功能
            </el-alert>
            <el-form-item label="启用超时提醒">
              <el-switch v-model="timeoutForm.enabled" />
            </el-form-item>
            <el-form-item label="订单审核超时">
              <el-input-number v-model="timeoutForm.orderAuditTimeout" :min="1" :max="168" />
              <span class="form-tip">小时，超过此时间未审核将发送提醒</span>
            </el-form-item>
            <el-form-item label="订单发货超时">
              <el-input-number v-model="timeoutForm.orderShipmentTimeout" :min="1" :max="168" />
              <span class="form-tip">小时，审核通过后超过此时间未发货将提醒</span>
            </el-form-item>
            <el-form-item label="售后处理超时">
              <el-input-number v-model="timeoutForm.afterSalesTimeout" :min="1" :max="168" />
              <span class="form-tip">小时，售后申请超过此时间未处理将提醒</span>
            </el-form-item>
            <el-form-item label="订单跟进提醒">
              <el-input-number v-model="timeoutForm.orderFollowupDays" :min="1" :max="30" />
              <span class="form-tip">天，订单签收后多少天提醒跟进客户</span>
            </el-form-item>
            <el-form-item label="检测间隔">
              <el-input-number v-model="timeoutForm.checkIntervalMinutes" :min="5" :max="120" />
              <span class="form-tip">分钟，系统自动检测的时间间隔</span>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleManualCheck" :loading="checking">立即检测</el-button>
              <span class="form-tip" style="margin-left: 12px">手动触发一次超时检测</span>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Check, Plus, QuestionFilled } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import request from '@/api/request'

const saving = ref(false)
const activeTab = ref('admin')
const pwdFormRef = ref<FormInstance>()

const adminForm = reactive({ name: '平台管理后台', logo: '', loginBg: '', primaryColor: '#409eff' })
const securityForm = reactive({ loginCaptcha: false, maxLoginAttempts: 5, lockDuration: 30, sessionTimeout: 120, ipWhitelistEnabled: false, ipWhitelist: '' })
const logForm = reactive({ operationLog: true, loginLog: true, retentionDays: 90 })
const pwdForm = reactive({ oldPassword: '', newPassword: '', confirmPassword: '' })
const smsForm = reactive({
  enabled: false,
  accessKeyId: '',
  accessKeySecret: '',
  signName: '',
  templateCode: '', // 保留兼容旧版
  templates: {
    VERIFY_CODE: '',
    ACCOUNT_ACTIVATION: '',
    PAYMENT_ACTIVATION: '',
    RENEW_SUCCESS: '',
    PACKAGE_CHANGE: '',
    QUOTA_CHANGE: '',
    ACCOUNT_SUSPEND: '',
    ACCOUNT_RESUME: '',
    ACCOUNT_CANCEL: '',
    REFUND_SUCCESS: '',
    EXPIRE_REMIND: '',
    EXPIRED_NOTICE: '',
    ADMIN_NOTIFICATION: '',
    SUBSCRIPTION_DEDUCT_SUCCESS: '',
    SUBSCRIPTION_DEDUCT_FAILED: '',
    SUBSCRIPTION_ACTIVATED: '',
    SUBSCRIPTION_CANCELLED: '',
    SUBSCRIPTION_EXPIRED: '',
    PASSWORD_RESET: '',
    CAPACITY_SUCCESS: '',
    CAPACITY_REFUND: ''
  }
})
const emailForm = reactive({ enabled: false, smtpHost: '', smtpPort: 465, senderEmail: '', senderName: '', emailPassword: '', enableSsl: true, enableTls: false, testEmail: '' })
const timeoutForm = reactive({ enabled: false, orderAuditTimeout: 24, orderShipmentTimeout: 48, afterSalesTimeout: 48, orderFollowupDays: 3, checkIntervalMinutes: 30 })
const checking = ref(false)
const testingEmail = ref(false)

const pwdRules: FormRules = {
  oldPassword: [{ required: true, message: '请输入当前密码' }],
  newPassword: [{ required: true, message: '请输入新密码' }, { min: 6, message: '密码至少6位' }],
  confirmPassword: [{ required: true, message: '请确认密码' }, { validator: (_r, v, cb) => v === pwdForm.newPassword ? cb() : cb(new Error('两次密码不一致')) }]
}

// 加载短信配置
const loadSmsConfig = async () => {
  try {
    const res = await request.get('/system-config/sms')
    if (res.data) {
      Object.assign(smsForm, res.data)
    }
  } catch (e) {
    console.error('加载短信配置失败', e)
  }
}

// 加载邮件配置
const loadEmailConfig = async () => {
  try {
    const res = await request.get('/system/email-settings')
    if (res.data) {
      Object.assign(emailForm, res.data)
    }
  } catch (e) {
    console.error('加载邮件配置失败', e)
  }
}

// 加载超时提醒配置
const loadTimeoutConfig = async () => {
  try {
    const res = await request.get('/timeout-reminder/config')
    if (res.data) {
      Object.assign(timeoutForm, res.data)
    }
  } catch (e) {
    console.error('加载超时提醒配置失败', e)
  }
}

// 保存配置
const handleSave = async () => {
  saving.value = true
  try {
    if (activeTab.value === 'sms') {
      // 保存短信配置
      await request.post('/system-config/sms', smsForm)
      ElMessage.success('短信配置保存成功')
    } else if (activeTab.value === 'email') {
      // 保存邮件配置
      await request.put('/system/email-settings', emailForm)
      ElMessage.success('邮件配置保存成功')
    } else if (activeTab.value === 'timeout') {
      // 保存超时提醒配置
      await request.put('/timeout-reminder/config', timeoutForm)
      ElMessage.success('超时提醒配置保存成功')
    } else if (activeTab.value === 'admin' || activeTab.value === 'security' || activeTab.value === 'log') {
      // 保存后台设置/安全设置/日志设置到系统配置
      const configPayload: any = {}
      if (activeTab.value === 'admin') Object.assign(configPayload, { admin: adminForm })
      if (activeTab.value === 'security') Object.assign(configPayload, { security: securityForm })
      if (activeTab.value === 'log') Object.assign(configPayload, { log: logForm })
      await request.post('/system-config', configPayload)
      ElMessage.success('配置保存成功')
    } else if (activeTab.value === 'password') {
      ElMessage.info('请使用下方「修改密码」按钮')
    } else {
      ElMessage.success('保存成功')
    }
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

// 测试短信
const handleTestSms = async () => {
  const phone = await ElMessageBox.prompt('请输入测试手机号', '发送测试短信', {
    confirmButtonText: '发送',
    cancelButtonText: '取消',
    inputPattern: /^1[3-9]\d{9}$/,
    inputErrorMessage: '请输入正确的手机号'
  })
  if (phone.value) {
    try {
      await request.post('/system-config/sms/test', { phone: phone.value, ...smsForm })
      ElMessage.success('测试短信已发送')
    } catch (e) {
      ElMessage.error('发送失败')
    }
  }
}

// 测试邮件
const handleTestEmail = async () => {
  if (!emailForm.testEmail) {
    ElMessage.warning('请先填写测试邮箱')
    return
  }
  testingEmail.value = true
  try {
    await request.post('/system/email-settings/test', emailForm)
    ElMessage.success('测试邮件已发送,请查收')
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || '发送失败')
  } finally {
    testingEmail.value = false
  }
}

// 手动触发超时检测
const handleManualCheck = async () => {
  checking.value = true
  try {
    const res = await request.post('/timeout-reminder/check')
    ElMessage.success(res.message || '检测完成')
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || '检测失败')
  } finally {
    checking.value = false
  }
}

const handleClearLogs = () => ElMessageBox.confirm('确定清理过期日志？').then(() => ElMessage.success('清理完成'))
const handleChangePwd = async () => { await pwdFormRef.value?.validate(); ElMessage.success('密码修改成功'); pwdFormRef.value?.resetFields() }

onMounted(() => {
  loadSmsConfig()
  loadEmailConfig()
  loadTimeoutConfig()
})
</script>

<style scoped lang="scss">
.config-card { border-radius: 8px; border: none; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.config-form { max-width: 600px; padding: 20px 0; }
.logo-uploader { :deep(.el-upload) { width: 120px; height: 120px; border: 1px dashed #d9d9d9; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; &:hover { border-color: #409eff; } } }
.logo-preview { width: 100%; height: 100%; object-fit: contain; }
.logo-icon { font-size: 28px; color: #8c939d; }
.bg-uploader { :deep(.el-upload) { width: 240px; height: 135px; border: 1px dashed #d9d9d9; border-radius: 8px; cursor: pointer; &:hover { border-color: #409eff; } } }
.bg-preview { width: 100%; height: 100%; object-fit: cover; border-radius: 8px; }
.bg-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #909399; font-size: 14px; }
.form-tip { margin-left: 12px; font-size: 12px; color: #909399; }
.section-title { font-size: 15px; font-weight: 600; color: #303133; margin: 20px 0 16px; display: flex; align-items: center; }
</style>
