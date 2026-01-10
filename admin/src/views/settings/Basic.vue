<template>
  <div class="page-container">
    <el-card shadow="never" class="config-card">
      <template #header>
        <div class="card-header">
          <span>基础配置</span>
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
          <el-form :model="smsForm" label-width="140px" class="config-form">
            <el-alert type="info" :closable="false" style="margin-bottom: 20px">
              配置阿里云短信服务，用于官网注册验证码发送
            </el-alert>
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
            <el-form-item label="模板代码">
              <el-input v-model="smsForm.templateCode" placeholder="如：SMS_123456789" />
              <div class="form-tip">验证码模板，需包含 ${code} 变量</div>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleTestSms">发送测试短信</el-button>
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
import { Check, Plus } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import request from '@/api/request'

const saving = ref(false)
const activeTab = ref('admin')
const pwdFormRef = ref<FormInstance>()

const adminForm = reactive({ name: '平台管理后台', logo: '', loginBg: '', primaryColor: '#409eff' })
const securityForm = reactive({ loginCaptcha: false, maxLoginAttempts: 5, lockDuration: 30, sessionTimeout: 120, ipWhitelistEnabled: false, ipWhitelist: '' })
const logForm = reactive({ operationLog: true, loginLog: true, retentionDays: 90 })
const pwdForm = reactive({ oldPassword: '', newPassword: '', confirmPassword: '' })
const smsForm = reactive({ enabled: false, accessKeyId: '', accessKeySecret: '', signName: '', templateCode: '' })

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

// 保存配置
const handleSave = async () => {
  saving.value = true
  try {
    // 保存短信配置
    if (activeTab.value === 'sms') {
      await request.post('/system-config/sms', smsForm)
    }
    ElMessage.success('保存成功')
  } catch (e) {
    ElMessage.error('保存失败')
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

const handleClearLogs = () => ElMessageBox.confirm('确定清理过期日志？').then(() => ElMessage.success('清理完成'))
const handleChangePwd = async () => { await pwdFormRef.value?.validate(); ElMessage.success('密码修改成功'); pwdFormRef.value?.resetFields() }

onMounted(() => {
  loadSmsConfig()
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
</style>
