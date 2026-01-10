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
        <el-result icon="success" title="系统激活成功">
          <template #sub-title>
            <div class="result-info">
              <p>客户名称：{{ activateResult.customerName }}</p>
              <p>授权类型：{{ getLicenseTypeText(activateResult.licenseType) }}</p>
              <p>最大用户数：{{ activateResult.maxUsers }}</p>
              <p v-if="activateResult.expiresAt">有效期至：{{ formatDate(activateResult.expiresAt) }}</p>
            </div>
            <div v-if="activateResult.defaultAdmin" class="default-admin-info">
              <el-alert type="warning" :closable="false">
                <template #title>
                  <div>
                    已为您创建默认管理员账号：<br>
                    用户名：<strong>{{ activateResult.defaultAdmin.username }}</strong><br>
                    密码：<strong>{{ activateResult.defaultAdmin.password }}</strong><br>
                    <span class="warning-text">请登录后立即修改密码！</span>
                  </div>
                </template>
              </el-alert>
            </div>
          </template>
          <template #extra>
            <el-button type="primary" @click="handleConfirm">去登录</el-button>
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
import { Key, Ticket, OfficeBuilding, Monitor } from '@element-plus/icons-vue'
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
</style>
