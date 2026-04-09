<template>
  <el-dialog
    v-model="visible"
    :title="dialogTitle"
    width="500px"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :show-close="!activating"
    @close="handleClose"
  >
    <div class="activate-content">
      <!-- 模式选择（仅在未确定模式时显示） -->
      <div v-if="!currentMode && !activateResult" class="mode-selector">
        <div class="mode-tip">请选择您的使用方式：</div>
        <div class="mode-cards">
          <div class="mode-card" @click="selectMode('tenant')">
            <div class="mode-icon tenant">
              <el-icon :size="32"><OfficeBuilding /></el-icon>
            </div>
            <div class="mode-name">SaaS租户</div>
            <div class="mode-desc">我是云端租户用户，已有租户授权码</div>
          </div>
          <div class="mode-card" @click="selectMode('private')">
            <div class="mode-icon private">
              <el-icon :size="32"><Monitor /></el-icon>
            </div>
            <div class="mode-name">私有部署</div>
            <div class="mode-desc">我是私有部署用户，已有系统授权码</div>
          </div>
        </div>
      </div>

      <!-- 授权码输入 -->
      <div v-if="currentMode && !activateResult" class="license-input-section">
        <div class="mode-badge" @click="currentMode = null">
          <el-tag :type="currentMode === 'tenant' ? 'success' : 'primary'" size="small">
            {{ currentMode === 'tenant' ? 'SaaS租户' : '私有部署' }}
          </el-tag>
          <span class="change-mode">切换</span>
        </div>

        <div class="activate-icon">
          <el-icon :size="48" :color="currentMode === 'tenant' ? '#10b981' : '#409eff'">
            <Key />
          </el-icon>
        </div>

        <p class="activate-tip">
          {{ currentMode === 'tenant'
            ? '请输入您的租户授权码，类似企业微信的企业ID。'
            : '请输入您的系统授权码以激活系统。' }}
          <br>
          <span class="sub-tip">如果您还没有授权码，请联系管理员获取。</span>
        </p>

        <el-form ref="formRef" :model="form" :rules="rules" label-width="0">
          <el-form-item prop="licenseKey">
            <el-input
              v-model="form.licenseKey"
              :placeholder="currentMode === 'tenant' ? '请输入租户授权码 (TENANT-XXXX-XXXX-XXXX-XXXX)' : '请输入系统授权码'"
              size="large"
              :disabled="activating"
              @keyup.enter="handleActivate"
            >
              <template #prefix>
                <el-icon><Ticket /></el-icon>
              </template>
            </el-input>
          </el-form-item>
        </el-form>
      </div>

      <!-- 激活成功信息 - 租户模式 -->
      <div v-if="activateResult && currentMode === 'tenant'" class="activate-result">
        <el-result icon="success" title="租户验证成功">
          <template #sub-title>
            <div class="result-info tenant-info">
              <div class="company-name">
                <el-icon><OfficeBuilding /></el-icon>
                <span>{{ activateResult.tenantName }}</span>
              </div>
              <div class="info-grid">
                <div class="info-item">
                  <span class="label">租户编码</span>
                  <span class="value">{{ activateResult.tenantCode }}</span>
                </div>
                <div class="info-item">
                  <span class="label">套餐</span>
                  <span class="value">{{ activateResult.packageName || '标准版' }}</span>
                </div>
                <div class="info-item">
                  <span class="label">最大用户数</span>
                  <span class="value">{{ activateResult.maxUsers }}</span>
                </div>
                <div class="info-item" v-if="activateResult.expireDate">
                  <span class="label">有效期至</span>
                  <span class="value">{{ activateResult.expireDate }}</span>
                </div>
              </div>
            </div>
          </template>
          <template #extra>
            <el-button type="primary" @click="handleConfirm">确认并登录</el-button>
          </template>
        </el-result>
      </div>

      <!-- 激活成功信息 - 私有部署模式 -->
      <div v-if="activateResult && currentMode === 'private'" class="activate-result">
        <el-result icon="success" :title="activateResult.isFirstActivation ? '🎉 系统首次激活成功' : '系统激活成功'">
          <template #sub-title>
            <div class="result-info">
              <p>客户名称：{{ activateResult.customerName }}</p>
              <p>授权类型：{{ getLicenseTypeText(activateResult.licenseType) }}</p>
              <p>最大用户数：{{ activateResult.maxUsers }}</p>
              <p v-if="activateResult.expiresAt">有效期至：{{ formatDate(activateResult.expiresAt) }}</p>
            </div>

            <!-- 🔒 首次激活：显示默认管理员信息（仅此一次） -->
            <div v-if="activateResult.defaultAdmin" class="first-time-admin-section">
              <div class="onetime-banner">
                <div class="onetime-icon">⚠️</div>
                <div class="onetime-text">
                  <strong>以下信息仅展示一次，请立即保存！</strong>
                  <span>关闭此窗口后将无法再次查看默认管理员密码</span>
                </div>
              </div>

              <div class="admin-credentials-card">
                <div class="credential-row">
                  <span class="credential-label">管理员账号</span>
                  <span class="credential-value">
                    <strong>{{ activateResult.defaultAdmin.username }}</strong>
                    <template v-if="activateResult.defaultAdmin.isPhoneAccount">
                      <span class="credential-hint">（即您注册官网时的手机号）</span>
                    </template>
                  </span>
                </div>
                <div class="credential-row">
                  <span class="credential-label">初始密码</span>
                  <span class="credential-value">
                    <strong>{{ activateResult.defaultAdmin.password }}</strong>
                  </span>
                </div>
              </div>

              <el-button type="warning" plain class="copy-credentials-btn" @click="copyAdminCredentials">
                📋 一键复制管理员账号密码
              </el-button>

              <div class="security-warning">
                <el-icon><WarningFilled /></el-icon>
                <span>请登录后 <strong>立即修改密码</strong>！此信息仅展示一次，后续输入授权码将不再显示。</span>
              </div>
            </div>

            <!-- 非首次激活：不显示管理员信息 -->
            <div v-if="!activateResult.defaultAdmin && !activateResult.isFirstActivation" class="reactivate-notice">
              <el-alert type="info" :closable="false" show-icon>
                <template #title>
                  此授权码已成功重新激活。管理员账号信息仅在首次激活时展示，如忘记密码请联系管理员重置。
                </template>
              </el-alert>
            </div>
          </template>
          <template #extra>
            <el-button type="primary" @click="handleConfirm">
              {{ activateResult.defaultAdmin ? '我已保存，去登录' : '去登录' }}
            </el-button>
          </template>
        </el-result>
      </div>
    </div>

    <template #footer v-if="currentMode && !activateResult">
      <el-button @click="handleClose" :disabled="activating">取消</el-button>
      <el-button type="primary" @click="handleActivate" :loading="activating">
        {{ activating ? '验证中...' : (currentMode === 'tenant' ? '验证授权' : '激活系统') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Key, Ticket, OfficeBuilding, Monitor, WarningFilled } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'

const props = defineProps<{
  modelValue: boolean
  defaultMode?: 'tenant' | 'private' | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'activated', data: any): void
}>()

const visible = ref(false)
const activating = ref(false)
const formRef = ref<FormInstance>()
const activateResult = ref<any>(null)
const currentMode = ref<'tenant' | 'private' | null>(null)

const form = reactive({
  licenseKey: ''
})

const dialogTitle = computed(() => {
  if (!currentMode.value) return '选择使用方式'
  return currentMode.value === 'tenant' ? '租户授权验证' : '系统激活'
})

const rules: FormRules = {
  licenseKey: [
    { required: true, message: '请输入授权码', trigger: 'blur' },
    { min: 10, message: '授权码格式不正确', trigger: 'blur' }
  ]
}

watch(() => props.modelValue, (val) => {
  visible.value = val
  if (val) {
    activateResult.value = null
    form.licenseKey = ''
    // 检查是否有已保存的模式
    const savedMode = localStorage.getItem('crm_license_mode')
    currentMode.value = props.defaultMode || (savedMode as any) || null
  }
})

watch(visible, (val) => {
  emit('update:modelValue', val)
})

const selectMode = (mode: 'tenant' | 'private') => {
  currentMode.value = mode
}

const handleActivate = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    activating.value = true
    try {
      const apiUrl = currentMode.value === 'tenant'
        ? '/api/v1/tenant-license/verify'
        : '/api/v1/license/activate'

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey: form.licenseKey })
      })

      const result = await response.json()

      if (result.success) {
        activateResult.value = result.data

        // 保存授权信息到本地
        if (currentMode.value === 'tenant') {
          localStorage.setItem('crm_license_mode', 'tenant')
          localStorage.setItem('crm_tenant_info', JSON.stringify({
            tenantId: result.data.tenantId,
            tenantCode: result.data.tenantCode,
            tenantName: result.data.tenantName,
            licenseKey: form.licenseKey
          }))
          localStorage.setItem('crm_license_info', JSON.stringify({
            customerName: result.data.tenantName,
            mode: 'tenant'
          }))
        } else {
          localStorage.setItem('crm_license_mode', 'private')
          localStorage.setItem('crm_license_info', JSON.stringify({
            customerName: result.data.customerName,
            mode: 'private'
          }))
        }

        ElMessage.success(currentMode.value === 'tenant' ? '租户验证成功' : '系统激活成功')
      } else {
        ElMessage.error(result.message || '验证失败')
      }
    } catch (error: any) {
      ElMessage.error('验证失败: ' + (error.message || '网络错误'))
    } finally {
      activating.value = false
    }
  })
}

const handleClose = () => {
  if (!activating.value) {
    visible.value = false
  }
}

const copyAdminCredentials = async () => {
  if (!activateResult.value?.defaultAdmin) return
  const admin = activateResult.value.defaultAdmin
  const text = `【云客CRM - 管理员账号信息】\n管理员账号：${admin.username}\n初始密码：${admin.password}\n\n⚠️ 请登录后立即修改密码！`
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('管理员账号密码已复制到剪贴板，请妥善保存！')
  } catch {
    ElMessage.warning('复制失败，请手动记录账号密码')
  }
}

const handleConfirm = () => {
  visible.value = false
  emit('activated', activateResult.value)
}

const getLicenseTypeText = (type: string) => {
  const types: Record<string, string> = {
    trial: '试用版',
    perpetual: '永久授权',
    annual: '年度授权',
    monthly: '月度授权'
  }
  return types[type] || type
}

const formatDate = (date: string) => {
  if (!date) return ''
  return new Date(date).toLocaleDateString('zh-CN')
}
</script>

<style scoped lang="scss">
.activate-content {
  padding: 10px 0;
}

.mode-selector {
  text-align: center;
}

.mode-tip {
  font-size: 15px;
  color: #606266;
  margin-bottom: 24px;
}

.mode-cards {
  display: flex;
  gap: 20px;
  justify-content: center;
}

.mode-card {
  width: 180px;
  padding: 24px 16px;
  border: 2px solid #e4e7ed;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
  text-align: center;

  &:hover {
    border-color: #409eff;
    box-shadow: 0 4px 12px rgba(64, 158, 255, 0.15);
    transform: translateY(-2px);
  }
}

.mode-icon {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 12px;

  &.tenant {
    background: linear-gradient(135deg, #10b981, #059669);
    color: white;
  }

  &.private {
    background: linear-gradient(135deg, #6366f1, #4f46e5);
    color: white;
  }
}

.mode-name {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
}

.mode-desc {
  font-size: 12px;
  color: #909399;
  line-height: 1.5;
}

.license-input-section {
  text-align: center;
}

.mode-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  cursor: pointer;

  .change-mode {
    font-size: 12px;
    color: #909399;
    &:hover { color: #409eff; }
  }
}

.activate-icon {
  margin-bottom: 16px;
}

.activate-tip {
  color: #606266;
  font-size: 14px;
  line-height: 1.6;
  margin-bottom: 24px;

  .sub-tip {
    font-size: 12px;
    color: #909399;
  }
}

.activate-result {
  margin-top: 10px;
}

.result-info {
  text-align: left;
  padding: 10px 20px;

  p {
    margin: 8px 0;
    color: #606266;
  }

  &.tenant-info {
    text-align: center;
    padding: 0;
  }
}

.company-name {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 20px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 20px;

  .el-icon {
    color: #10b981;
  }
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  text-align: left;
  background: #f5f7fa;
  padding: 16px;
  border-radius: 8px;
}

.info-item {
  .label {
    display: block;
    font-size: 12px;
    color: #909399;
    margin-bottom: 4px;
  }
  .value {
    font-size: 14px;
    color: #303133;
    font-weight: 500;
  }
}

.default-admin-info {
  margin-top: 16px;
  text-align: left;

  .warning-text {
    color: #e6a23c;
    font-weight: bold;
  }
}

// 首次激活 - 管理员凭据展示区
.first-time-admin-section {
  margin-top: 20px;
  text-align: left;
}

.onetime-banner {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 14px 16px;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border: 2px solid #f59e0b;
  border-radius: 10px;
  margin-bottom: 16px;
  animation: bannerPulse 2s ease-in-out infinite;

  .onetime-icon {
    font-size: 24px;
    flex-shrink: 0;
    line-height: 1;
  }

  .onetime-text {
    strong {
      display: block;
      font-size: 15px;
      color: #92400e;
      margin-bottom: 2px;
    }

    span {
      font-size: 12px;
      color: #b45309;
    }
  }
}

@keyframes bannerPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.3); }
  50% { box-shadow: 0 0 0 6px rgba(245, 158, 11, 0); }
}

.admin-credentials-card {
  background: #1e293b;
  border-radius: 10px;
  padding: 16px 20px;
  margin-bottom: 12px;

  .credential-row {
    display: flex;
    align-items: center;
    padding: 10px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);

    &:last-child {
      border-bottom: none;
    }
  }

  .credential-label {
    min-width: 90px;
    font-size: 13px;
    color: #94a3b8;
  }

  .credential-value {
    flex: 1;
    font-size: 16px;
    color: #f1f5f9;

    strong {
      font-family: 'Consolas', 'Monaco', monospace;
      color: #fbbf24;
      font-size: 18px;
      letter-spacing: 1px;
    }

    .credential-hint {
      display: inline-block;
      margin-left: 8px;
      font-size: 11px;
      color: #64748b;
    }
  }
}

.copy-credentials-btn {
  width: 100%;
  margin-bottom: 12px;
  font-weight: 600;
  font-size: 14px;
  height: 40px;
}

.security-warning {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 10px 14px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  font-size: 12px;
  color: #991b1b;
  line-height: 1.6;

  .el-icon {
    color: #ef4444;
    margin-top: 2px;
    flex-shrink: 0;
  }

  strong {
    color: #dc2626;
  }
}

.reactivate-notice {
  margin-top: 16px;
}
</style>
