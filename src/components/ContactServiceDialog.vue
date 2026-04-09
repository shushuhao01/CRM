<template>
  <el-dialog
    v-model="visible"
    title="联系客服续费"
    width="420px"
    :show-close="true"
    :close-on-click-modal="true"
    destroy-on-close
    class="contact-service-dialog"
  >
    <!-- 头部说明 -->
    <div class="cs-header">
      <div class="cs-header-icon">💬</div>
      <div class="cs-header-text">
        <h4>联系专属客服</h4>
        <p>扫码或点击下方方式，快速完成续费</p>
      </div>
    </div>

    <!-- 二维码区域 -->
    <div v-if="qrCodeSrc" class="cs-qrcode-section">
      <div class="cs-qrcode-wrapper">
        <img :src="qrCodeSrc" :alt="qrCodeLabel" />
      </div>
      <p class="cs-qrcode-label">{{ qrCodeLabel }}</p>
    </div>

    <!-- 分隔线 -->
    <div v-if="qrCodeSrc && (serviceUrl || contactPhone || contactEmail)" class="cs-divider">
      <span>其他联系方式</span>
    </div>

    <!-- 联系方式列表 -->
    <div class="cs-contact-list">
      <!-- 在线客服链接 -->
      <a v-if="serviceUrl" :href="serviceUrl" target="_blank" rel="noopener noreferrer" class="cs-contact-item cs-wechat">
        <div class="cs-contact-icon">
          <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
            <path d="M8.5 11.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm7 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/>
            <path d="M12 2C6.477 2 2 6.145 2 11.243c0 2.936 1.444 5.544 3.678 7.227V22l3.27-1.795c.87.24 1.79.37 2.752.37h.3c5.523 0 10-4.145 10-9.243S17.523 2 12 2zm0 16.486h-.25c-.82 0-1.62-.11-2.38-.32l-.48-.13-2.14 1.18.05-1.95-.4-.32C4.88 15.67 4 13.56 4 11.243 4 7.25 7.582 4 12 4s8 3.25 8 7.243-3.582 7.243-8 7.243z"/>
          </svg>
        </div>
        <div class="cs-contact-info">
          <span class="cs-contact-title">微信在线客服</span>
          <span class="cs-contact-desc">点击直达微信客服对话</span>
        </div>
        <div class="cs-contact-arrow">→</div>
      </a>

      <!-- 客服电话 -->
      <a v-if="contactPhone" :href="`tel:${contactPhone}`" class="cs-contact-item cs-phone">
        <div class="cs-contact-icon">📞</div>
        <div class="cs-contact-info">
          <span class="cs-contact-title">客服热线</span>
          <span class="cs-contact-desc">{{ contactPhone }}</span>
        </div>
        <div class="cs-contact-arrow">→</div>
      </a>

      <!-- 客服邮箱 -->
      <a v-if="contactEmail" :href="`mailto:${contactEmail}?subject=续费咨询`" class="cs-contact-item cs-email">
        <div class="cs-contact-icon">📧</div>
        <div class="cs-contact-info">
          <span class="cs-contact-title">客服邮箱</span>
          <span class="cs-contact-desc">{{ contactEmail }}</span>
        </div>
        <div class="cs-contact-arrow">→</div>
      </a>
    </div>

    <!-- 无任何联系信息的空状态 -->
    <div v-if="!qrCodeSrc && !serviceUrl && !contactPhone && !contactEmail" class="cs-empty">
      <el-empty description="暂无客服联系方式，请联系系统管理员" :image-size="80" />
    </div>

    <!-- 工作时间 -->
    <div v-if="workingHours" class="cs-footer">
      <el-icon><Clock /></el-icon>
      <span>工作时间：{{ workingHours }}</span>
    </div>

    <template #footer>
      <el-button @click="visible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Clock } from '@element-plus/icons-vue'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

// 客服信息
const qrCodeSrc = ref('')
const qrCodeLabel = ref('微信扫一扫，添加专属客服')
const serviceUrl = ref('')
const contactPhone = ref('')
const contactEmail = ref('')
const workingHours = ref('')

/**
 * 从 localStorage 和公开API获取客服配置信息
 */
const loadContactInfo = async () => {
  // 1. 先从 CRM 本地配置中读取基本信息
  try {
    const configStr = localStorage.getItem('crm_config_system')
    if (configStr) {
      const config = JSON.parse(configStr)
      contactPhone.value = config.contactPhone || ''
      contactEmail.value = config.contactEmail || ''
      qrCodeSrc.value = config.contactQRCode || ''
      qrCodeLabel.value = config.contactQRCodeLabel || '微信扫一扫，添加专属客服'
    }
  } catch {
    // 静默处理
  }

  // 2. 尝试从公开API获取更完整的客服配置（含微信客服链接等）
  try {
    const response = await fetch('/api/v1/public/website-config')
    const res = await response.json()
    if (res.success && res.data) {
      const data = res.data
      // 优先使用公开API中更完整的配置
      if (data.customerServiceUrl) serviceUrl.value = data.customerServiceUrl
      if (data.serviceQRCode) qrCodeSrc.value = data.serviceQRCode
      if (data.servicePhone) contactPhone.value = contactPhone.value || data.servicePhone
      if (data.serviceEmail) contactEmail.value = contactEmail.value || data.serviceEmail
      if (data.workingHours) workingHours.value = data.workingHours
      if (data.contactQRCodeLabel) qrCodeLabel.value = data.contactQRCodeLabel || qrCodeLabel.value
    }
  } catch {
    // 静默处理，使用本地配置
  }
}

// 弹窗打开时加载配置
watch(visible, (val) => {
  if (val) {
    loadContactInfo()
  }
})
</script>

<style scoped>
.cs-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 20px;
  background: linear-gradient(135deg, #ecf5ff, #f0f9eb);
  border-radius: 12px;
  margin-bottom: 20px;
}

.cs-header-icon {
  font-size: 36px;
  line-height: 1;
}

.cs-header-text h4 {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.cs-header-text p {
  margin: 0;
  font-size: 13px;
  color: #909399;
}

/* 二维码区域 */
.cs-qrcode-section {
  text-align: center;
  margin-bottom: 16px;
}

.cs-qrcode-wrapper {
  width: 180px;
  height: 180px;
  margin: 0 auto 10px;
  padding: 8px;
  background: #f8fafc;
  border-radius: 12px;
  border: 2px dashed #e4e7ed;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cs-qrcode-wrapper img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 6px;
}

.cs-qrcode-label {
  font-size: 13px;
  color: #909399;
  margin: 0;
}

/* 分隔线 */
.cs-divider {
  display: flex;
  align-items: center;
  margin: 16px 0;
}

.cs-divider::before,
.cs-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #e4e7ed;
}

.cs-divider span {
  padding: 0 14px;
  font-size: 12px;
  color: #c0c4cc;
}

/* 联系方式列表 */
.cs-contact-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.cs-contact-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 10px;
  text-decoration: none;
  transition: all 0.25s ease;
  cursor: pointer;
  border: 1px solid #e4e7ed;
  background: #fff;
}

.cs-contact-item:hover {
  transform: translateX(4px);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.cs-contact-item.cs-wechat {
  border-color: #d1f0d1;
  background: #f6ffed;
}
.cs-contact-item.cs-wechat:hover {
  border-color: #07c160;
  background: #efffed;
}

.cs-contact-item.cs-phone {
  border-color: #d9ecff;
  background: #f4f9ff;
}
.cs-contact-item.cs-phone:hover {
  border-color: #409eff;
  background: #ecf5ff;
}

.cs-contact-item.cs-email {
  border-color: #fde2e2;
  background: #fef8f8;
}
.cs-contact-item.cs-email:hover {
  border-color: #f56c6c;
  background: #fef0f0;
}

.cs-contact-icon {
  font-size: 22px;
  line-height: 1;
  width: 28px;
  text-align: center;
  flex-shrink: 0;
  color: #07c160;
}

.cs-contact-item.cs-phone .cs-contact-icon {
  color: #409eff;
}
.cs-contact-item.cs-email .cs-contact-icon {
  color: #f56c6c;
}

.cs-contact-info {
  flex: 1;
  min-width: 0;
}

.cs-contact-title {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 2px;
}

.cs-contact-desc {
  display: block;
  font-size: 12px;
  color: #909399;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cs-contact-arrow {
  font-size: 16px;
  color: #c0c4cc;
  flex-shrink: 0;
  transition: transform 0.2s;
}

.cs-contact-item:hover .cs-contact-arrow {
  transform: translateX(3px);
  color: #909399;
}

/* 空状态 */
.cs-empty {
  padding: 20px 0;
}

/* 工作时间 */
.cs-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 16px;
  padding: 10px 16px;
  background: #f5f7fa;
  border-radius: 8px;
  font-size: 12px;
  color: #909399;
}

/* 对话框全局样式微调 */
:deep(.el-dialog__header) {
  padding-bottom: 10px;
  border-bottom: 1px solid #f0f0f0;
}

:deep(.el-dialog__body) {
  padding: 20px;
}
</style>

