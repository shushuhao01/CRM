<template>
  <!-- 全局来电弹窗 -->
  <el-dialog
    :model-value="incomingCallVisible"
    title="来电提醒"
    width="500px"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :show-close="true"
    @close="$emit('dismiss')"
    center
    append-to-body
    class="global-incoming-call-dialog"
  >
    <div class="incoming-call" v-if="incomingCallData">
      <!-- 来电类型标签 -->
      <div class="call-type-bar">
        <el-tag v-if="incomingCallData.isNewCustomer" type="warning" effect="dark" size="large">
          新客户来电
        </el-tag>
        <el-tag v-else type="success" effect="dark" size="large">
          老客户来电
        </el-tag>
        <el-tag v-if="incomingCallData.callSource" size="small" :type="incomingCallData.callSource === 'mobile' ? 'success' : 'primary'" style="margin-left: 8px;">
          {{ incomingCallData.callSource === 'mobile' ? '工作手机' : (incomingCallData.callSource === 'sip' ? 'SIP线路' : '网络电话') }}
        </el-tag>
      </div>

      <!-- 客户信息 -->
      <div class="caller-info">
        <div class="caller-avatar" :class="{ 'is-new': incomingCallData.isNewCustomer }">
          <el-icon :size="48"><User /></el-icon>
        </div>
        <div class="caller-details">
          <h3>{{ incomingCallData.customerName || '未知客户' }}</h3>
          <p class="phone-number">{{ displayPhone }}</p>
          <p class="company-info" v-if="incomingCallData.company">
            <span>{{ incomingCallData.company }}</span>
          </p>
          <div class="detail-tags">
            <el-tag v-if="incomingCallData.customerLevel" :type="getLevelType(incomingCallData.customerLevel)" size="small">
              {{ getLevelText(incomingCallData.customerLevel) }}
            </el-tag>
            <el-tag v-if="incomingCallData.tags && incomingCallData.tags.length > 0" v-for="tag in incomingCallData.tags.slice(0, 3)" :key="tag" size="small" type="info">
              {{ tag }}
            </el-tag>
          </div>
          <p class="last-call" v-if="incomingCallData.lastCallTime">
            上次通话：{{ incomingCallData.lastCallTime }}
          </p>
        </div>
      </div>

      <!-- 接听/挂断 -->
      <div class="call-actions">
        <el-button type="success" size="large" @click="$emit('answer')">接听</el-button>
        <el-button type="danger" size="large" @click="$emit('reject')">挂断</el-button>
      </div>

      <!-- 快捷操作 -->
      <div class="quick-actions">
        <el-button v-if="!incomingCallData.isNewCustomer && incomingCallData.customerId" size="small" @click="$emit('view-customer')">
          查看客户详情
        </el-button>
        <el-button v-if="incomingCallData.isNewCustomer" size="small" type="warning" @click="$emit('add-new-customer')">
          新增客户
        </el-button>
        <el-button size="small" type="primary" @click="$emit('go-call-management')">通话管理</el-button>
      </div>
    </div>
  </el-dialog>

  <!-- 全局通话中悬浮窗 -->
  <Teleport to="body">
    <div
      v-if="callInProgressVisible && currentCallData"
      class="global-call-floating"
      :class="{ 'is-minimized': isMinimized }"
    >
      <div class="floating-header" @click="isMinimized ? $emit('toggle-minimize') : undefined">
        <div class="header-left">
          <span class="status-dot"></span>
          <span class="header-title">{{ isMinimized ? '通话中' : '正在通话' }}</span>
        </div>
        <div class="header-actions">
          <el-button
            size="small"
            circle
            @click.stop="$emit('toggle-minimize')"
            style="background: rgba(255,255,255,0.2); border: none; color: white;"
          >
            <el-icon v-if="isMinimized"><FullScreen /></el-icon>
            <el-icon v-else><Minus /></el-icon>
          </el-button>
        </div>
      </div>
      <div v-if="isMinimized" class="floating-mini">
        <span class="mini-name">{{ currentCallData.customerName || '未知客户' }}</span>
        <el-button type="danger" size="small" circle @click="$emit('end-call')">
          <el-icon><Close /></el-icon>
        </el-button>
      </div>
      <div v-else class="floating-body">
        <div class="caller-mini">
          <el-tag v-if="currentCallData.isNewCustomer" type="warning" size="small" style="margin-bottom: 6px;">新客户</el-tag>
          <el-tag v-else type="success" size="small" style="margin-bottom: 6px;">老客户</el-tag>
          <p class="caller-name">{{ currentCallData.customerName || '未知客户' }}</p>
          <p class="caller-phone">{{ displayCurrentPhone }}</p>
          <el-tag v-if="currentCallData.callSource === 'mobile'" type="success" size="small">工作手机</el-tag>
        </div>
        <div class="floating-actions">
          <el-button type="danger" size="small" @click="$emit('end-call')">结束通话</el-button>
          <el-button v-if="!currentCallData.isNewCustomer && currentCallData.customerId" size="small" @click="$emit('view-customer')">查看客户</el-button>
          <el-button v-if="currentCallData.isNewCustomer" size="small" type="warning" @click="$emit('add-new-customer')">新增客户</el-button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { User, FullScreen, Minus, Close } from '@element-plus/icons-vue'
import { displaySensitiveInfoNew, SensitiveInfoType } from '@/utils/sensitiveInfo'
import type { IncomingCallData } from '@/composables/useIncomingCall'

const props = defineProps<{
  incomingCallVisible: boolean
  incomingCallData: IncomingCallData | null
  callInProgressVisible: boolean
  currentCallData: IncomingCallData | null
  isMinimized: boolean
}>()

defineEmits<{
  answer: []
  reject: []
  dismiss: []
  'view-customer': []
  'add-new-customer': []
  'go-call-management': []
  'end-call': []
  'toggle-minimize': []
}>()

const getLevelType = (level: string) => {
  const map: Record<string, string> = { normal: '', silver: 'info', gold: 'warning', diamond: 'success' }
  return map[level] || ''
}

const getLevelText = (level: string) => {
  const map: Record<string, string> = { normal: '普通', silver: '白银', gold: '黄金', diamond: '钻石' }
  return map[level] || '普通'
}

const displayPhone = computed(() => {
  const phone = props.incomingCallData?.phone
  if (!phone) return ''
  return displaySensitiveInfoNew(phone, SensitiveInfoType.PHONE)
})

const displayCurrentPhone = computed(() => {
  const phone = props.currentCallData?.phone
  if (!phone) return ''
  return displaySensitiveInfoNew(phone, SensitiveInfoType.PHONE)
})
</script>

<style scoped>
.incoming-call {
  text-align: center;
  padding: 16px 16px 8px;
}
.call-type-bar {
  margin-bottom: 20px;
}
.caller-info {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
  gap: 20px;
}
.caller-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: #ecf5ff;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #409eff;
  flex-shrink: 0;
}
.caller-avatar.is-new {
  background: #fdf6ec;
  color: #e6a23c;
}
.caller-details {
  text-align: left;
}
.caller-details h3 {
  margin: 0 0 6px 0;
  font-size: 18px;
  color: #303133;
}
.phone-number {
  font-size: 15px;
  color: #606266;
  margin: 4px 0;
  font-family: 'SF Mono', 'Menlo', monospace;
}
.company-info {
  font-size: 13px;
  color: #909399;
  margin: 4px 0;
}
.detail-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin: 6px 0;
}
.last-call {
  font-size: 12px;
  color: #c0c4cc;
  margin: 4px 0;
}
.call-actions {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-bottom: 16px;
}
.call-actions .el-button {
  width: 110px;
  height: 44px;
  font-size: 15px;
  border-radius: 22px;
}
.quick-actions {
  display: flex;
  justify-content: center;
  gap: 10px;
  padding-bottom: 4px;
}

/* 悬浮窗 */
.global-call-floating {
  position: fixed;
  top: 80px;
  right: 24px;
  z-index: 9999;
  width: 320px;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}
.global-call-floating.is-minimized {
  width: 240px;
}
.floating-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: linear-gradient(135deg, #409eff 0%, #36cfc9 100%);
  color: #fff;
  cursor: pointer;
  user-select: none;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.status-dot {
  width: 8px;
  height: 8px;
  background: #67c23a;
  border-radius: 50%;
  animation: pulse-dot 1.5s ease-in-out infinite;
}
@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
.header-title {
  font-weight: 600;
  font-size: 13px;
}
.floating-mini {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
}
.mini-name {
  font-weight: 600;
  font-size: 13px;
  color: #303133;
}
.floating-body {
  padding: 16px;
}
.caller-mini {
  text-align: center;
  margin-bottom: 12px;
}
.caller-name {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 4px 0;
}
.caller-phone {
  font-size: 13px;
  color: #909399;
  margin: 0 0 6px 0;
  font-family: 'SF Mono', 'Menlo', monospace;
}
.floating-actions {
  display: flex;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
}
</style>
