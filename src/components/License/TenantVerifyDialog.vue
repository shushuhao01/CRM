<template>
  <el-dialog
    v-model="visible"
    title="租户授权验证"
    width="420px"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :show-close="false"
    class="tenant-verify-dialog"
  >
    <div class="verify-content">
      <!-- Logo和标题 -->
      <div class="verify-header">
        <div class="logo-icon">
          <svg width="48" height="48" viewBox="0 0 44 44" fill="none">
            <defs>
              <linearGradient id="verifyLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#6ee7b7"/>
                <stop offset="100%" stop-color="#34d399"/>
              </linearGradient>
            </defs>
            <rect width="44" height="44" rx="10" fill="url(#verifyLogoGrad)"/>
            <rect x="10" y="10" width="10" height="10" rx="2" fill="white"/>
            <circle cx="29" cy="15" r="5" fill="white" opacity="0.85"/>
            <rect x="10" y="24" width="10" height="10" rx="5" fill="white" opacity="0.7"/>
            <rect x="24" y="24" width="10" height="10" rx="2" fill="white"/>
          </svg>
        </div>
        <h3>欢迎使用云客CRM</h3>
        <p>请输入您的租户授权码以继续</p>
      </div>

      <!-- 授权码输入 -->
      <el-form ref="formRef" :model="form" :rules="rules" @submit.prevent="handleVerify">
        <el-form-item prop="licenseKey">
          <el-input
            v-model="form.licenseKey"
            placeholder="请输入授权码，如：TENANT-XXXX-XXXX-XXXX-XXXX"
            size="large"
            clearable
            :disabled="loading"
            @keyup.enter="handleVerify"
          >
            <template #prefix>
              <el-icon><Key /></el-icon>
            </template>
          </el-input>
        </el-form-item>

        <!-- 错误提示 -->
        <el-alert
          v-if="errorMessage"
          :title="errorMessage"
          type="error"
          show-icon
          :closable="false"
          style="margin-bottom: 16px;"
        />

        <!-- 验证成功信息 -->
        <div v-if="tenantInfo" class="tenant-info">
          <el-alert type="success" :closable="false">
            <template #title>
              <div class="tenant-info-content">
                <div class="info-row">
                  <span class="label">租户名称：</span>
                  <span class="value">{{ tenantInfo.tenantName }}</span>
                </div>
                <div class="info-row">
                  <span class="label">套餐类型：</span>
                  <span class="value">{{ tenantInfo.packageName }}</span>
                </div>
                <div class="info-row" v-if="tenantInfo.expireDate">
                  <span class="label">有效期至：</span>
                  <span class="value">{{ formatDate(tenantInfo.expireDate) }}</span>
                </div>
              </div>
            </template>
          </el-alert>
        </div>

        <el-form-item style="margin-bottom: 0; margin-top: 20px;">
          <el-button
            type="primary"
            size="large"
            :loading="loading"
            style="width: 100%;"
            @click="handleVerify"
          >
            {{ tenantInfo ? '确认并继续' : '验证授权码' }}
          </el-button>
        </el-form-item>
      </el-form>

      <!-- 帮助信息 -->
      <div class="help-info">
        <p>
          <el-icon><InfoFilled /></el-icon>
          授权码由管理员在购买套餐后提供
        </p>
        <p>
          <el-icon><QuestionFilled /></el-icon>
          如有问题，请联系客服：400-xxx-xxxx
        </p>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Key, InfoFilled, QuestionFilled } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import { verifyTenantLicense, saveLocalTenantInfo, type TenantInfo } from '@/api/tenantLicense'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'verified', info: TenantInfo): void
}>()

const visible = ref(props.modelValue)
const loading = ref(false)
const errorMessage = ref('')
const tenantInfo = ref<TenantInfo | null>(null)
const formRef = ref<FormInstance>()

const form = ref({
  licenseKey: ''
})

const rules: FormRules = {
  licenseKey: [
    { required: true, message: '请输入授权码', trigger: 'blur' },
    {
      pattern: /^TENANT-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/,
      message: '授权码格式不正确',
      trigger: 'blur'
    }
  ]
}

watch(() => props.modelValue, (val) => {
  visible.value = val
})

watch(visible, (val) => {
  emit('update:modelValue', val)
})

const handleVerify = async () => {
  if (!formRef.value) return

  // 如果已验证成功，直接确认
  if (tenantInfo.value) {
    saveLocalTenantInfo(tenantInfo.value)
    emit('verified', tenantInfo.value)
    visible.value = false
    return
  }

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    loading.value = true
    errorMessage.value = ''

    try {
      const response = await verifyTenantLicense(form.value.licenseKey)

      if (response.success && response.data) {
        tenantInfo.value = response.data
        ElMessage.success('授权验证成功')
      } else {
        errorMessage.value = response.message || '授权验证失败'
      }
    } catch (error: any) {
      errorMessage.value = error?.response?.data?.message || error?.message || '验证失败，请稍后重试'
    } finally {
      loading.value = false
    }
  })
}

const formatDate = (date: string) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('zh-CN')
}
</script>

<style scoped lang="scss">
.tenant-verify-dialog {
  :deep(.el-dialog__header) {
    display: none;
  }

  :deep(.el-dialog__body) {
    padding: 32px;
  }
}

.verify-content {
  .verify-header {
    text-align: center;
    margin-bottom: 28px;

    .logo-icon {
      margin-bottom: 16px;

      svg {
        width: 56px;
        height: 56px;
      }
    }

    h3 {
      margin: 0 0 8px 0;
      font-size: 20px;
      font-weight: 600;
      color: #1f2937;
    }

    p {
      margin: 0;
      font-size: 14px;
      color: #6b7280;
    }
  }

  .tenant-info {
    margin-bottom: 16px;

    .tenant-info-content {
      .info-row {
        display: flex;
        align-items: center;
        margin-bottom: 4px;

        &:last-child {
          margin-bottom: 0;
        }

        .label {
          color: #6b7280;
          margin-right: 8px;
        }

        .value {
          font-weight: 500;
          color: #1f2937;
        }
      }
    }
  }

  .help-info {
    margin-top: 24px;
    padding-top: 16px;
    border-top: 1px solid #e5e7eb;

    p {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 8px 0;
      font-size: 12px;
      color: #9ca3af;

      .el-icon {
        font-size: 14px;
      }
    }
  }
}
</style>
