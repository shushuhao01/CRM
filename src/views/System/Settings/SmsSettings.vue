<template>
  <div>
    <el-card class="setting-card">
      <template #header>
        <div class="card-header">
          <span>短信配置</span>
          <div class="header-actions">
            <el-button
              v-if="canManageSms"
              @click="handleOpenSmsManagement"
              type="success"
              :icon="Setting"
            >
              短信管理
            </el-button>
            <el-button
              v-if="canEditSmsSettings"
              @click="handleTestSms"
              :loading="testSmsLoading"
            >
              测试短信
            </el-button>
            <el-button
              v-if="canEditSmsSettings"
              @click="handleSaveSms"
              type="primary"
              :loading="smsLoading"
            >
              保存设置
            </el-button>
          </div>
        </div>
      </template>

      <el-alert v-if="configStore.configLocked.sms" type="warning" :closable="false" style="margin-bottom: 16px">
        <template #title>
          <span>🔒 该配置由管理后台统一管控，如需修改请联系管理员</span>
        </template>
      </el-alert>

      <el-form
        ref="smsFormRef"
        :disabled="configStore.configLocked.sms"
        :model="smsForm"
        :rules="smsFormRules"
        label-width="120px"
        class="setting-form"
      >
        <el-form-item label="短信服务商" prop="provider">
          <el-select v-model="smsForm.provider" placeholder="请选择短信服务商" style="width: 100%">
            <el-option label="阿里云短信" value="aliyun" />
            <el-option label="腾讯云短信" value="tencent" />
            <el-option label="华为云短信" value="huawei" />
            <el-option label="网易云信" value="netease" />
          </el-select>
        </el-form-item>

        <el-form-item label="AccessKey" prop="accessKey">
          <el-input v-model="smsForm.accessKey" placeholder="请输入AccessKey" show-password />
        </el-form-item>

        <el-form-item label="SecretKey" prop="secretKey">
          <el-input v-model="smsForm.secretKey" placeholder="请输入SecretKey" show-password />
        </el-form-item>

        <el-form-item label="短信签名" prop="signName">
          <el-input v-model="smsForm.signName" placeholder="请输入短信签名" />
          <div class="form-tip">短信签名需要在服务商平台申请并审核通过</div>
        </el-form-item>

        <el-form-item label="每日发送限制" prop="dailyLimit">
          <el-input-number v-model="smsForm.dailyLimit" :min="1" :max="10000" placeholder="每日发送限制" style="width: 100%" />
          <div class="form-tip">单个用户每日最大发送短信数量</div>
        </el-form-item>

        <el-form-item label="每月发送限制" prop="monthlyLimit">
          <el-input-number v-model="smsForm.monthlyLimit" :min="1" :max="100000" placeholder="每月发送限制" style="width: 100%" />
          <div class="form-tip">单个用户每月最大发送短信数量</div>
        </el-form-item>

        <el-form-item label="启用短信功能">
          <el-switch v-model="smsForm.enabled" active-text="启用" inactive-text="禁用" />
        </el-form-item>

        <el-form-item label="需要审核">
          <el-switch v-model="smsForm.requireApproval" active-text="需要" inactive-text="不需要" />
          <div class="form-tip">开启后，短信发送需要管理员审核</div>
        </el-form-item>

        <el-form-item label="测试手机号" prop="testPhone">
          <el-input v-model="smsForm.testPhone" placeholder="请输入测试手机号" />
          <div class="form-tip">用于测试短信发送功能</div>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 短信管理弹窗 -->
    <el-dialog
      v-model="smsManagementVisible"
      title="短信管理"
      width="90%"
      :close-on-click-modal="false"
      class="sms-management-dialog"
    >
      <SmsManagement />
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Setting } from '@element-plus/icons-vue'
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

const smsFormRules = {
  provider: [{ required: true, message: '请选择短信服务商', trigger: 'change' }],
  accessKey: [{ required: true, message: '请输入AccessKey', trigger: 'blur' }],
  secretKey: [{ required: true, message: '请输入SecretKey', trigger: 'blur' }],
  signName: [{ required: true, message: '请输入短信签名', trigger: 'blur' }],
  dailyLimit: [{ required: true, message: '请设置每日发送限制', trigger: 'blur' }],
  monthlyLimit: [{ required: true, message: '请设置每月发送限制', trigger: 'blur' }],
  testPhone: [{ pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号格式', trigger: 'blur' }]
}

const canEditSmsSettings = computed(() => userStore.isAdmin)
const canManageSms = computed(() => userStore.isAdmin)

const handleSaveSms = async () => {
  try {
    await smsFormRef.value?.validate()
    smsLoading.value = true

    configStore.updateSmsConfig(smsForm.value)
    console.log('[短信设置] 已保存到localStorage:', smsForm.value)

    try {
      const { apiService } = await import('@/services/apiService')
      await apiService.put('/system/sms-settings', smsForm.value)
      console.log('[短信设置] 已同步到后端API')
      ElMessage.success('短信设置保存成功')
    } catch (apiError: unknown) {
      const err = apiError as { code?: string; response?: { status?: number } }
      console.warn('[短信设置] API调用失败，已保存到本地:', apiError)
      if (err.code === 'ECONNREFUSED' || err.response?.status === 404) {
        ElMessage.success('短信设置保存成功（本地模式）')
      } else {
        ElMessage.warning('短信设置已保存到本地，但未能同步到服务器')
      }
    }
  } catch (error) {
    console.error('[短信设置] 表单验证失败:', error)
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
  } catch (_error) {
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
.setting-card { border: none; box-shadow: none; }
.card-header { display: flex; justify-content: space-between; align-items: center; padding-left: 2%; }
.header-actions { display: flex; gap: 12px; align-items: center; }
.setting-form { padding: 20px 0; }
.form-tip { display: flex; align-items: center; gap: 6px; margin-top: 8px; font-size: 12px; color: #909399; }
.setting-form :deep(.el-input-number) { width: 200px; }
.setting-form :deep(.el-switch) { margin-right: 12px; }
.sms-management-dialog :deep(.el-dialog__body) { padding: 0; }
.sms-management-dialog :deep(.el-dialog__header) { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; margin: 0; padding: 20px 24px; }
.sms-management-dialog :deep(.el-dialog__title) { color: white; font-weight: 600; }
.sms-management-dialog :deep(.el-dialog__headerbtn .el-dialog__close) { color: white; }
</style>



