<template>
  <!-- 快捷跟进弹窗 -->
  <el-dialog :model-value="quickFollowUpVisible" @update:model-value="$emit('update:quickFollowUpVisible', $event)" title="快捷跟进" width="600px" @close="$emit('reset-follow-up-form')">
    <div class="quick-followup">
      <div class="customer-info">
        <p><strong>客户：</strong>{{ currentCustomer?.name }}</p>
        <p><strong>电话：</strong>{{ displaySensitiveInfoNew(currentCustomer?.phone, SensitiveInfoType.PHONE) }}</p>
        <p><strong>收货地址：</strong>{{ customerShippingAddress }}</p>
      </div>
      <el-form :model="quickFollowUpForm" :rules="quickFollowUpRules" ref="quickFollowUpFormRef" label-width="100px">
        <el-form-item label="跟进类型" prop="type">
          <el-select v-model="quickFollowUpForm.type" placeholder="请选择跟进类型" style="width: 100%">
            <el-option label="电话跟进" value="call" /><el-option label="上门拜访" value="visit" />
            <el-option label="邮件跟进" value="email" /><el-option label="短信跟进" value="message" />
          </el-select>
        </el-form-item>
        <el-form-item label="跟进内容" prop="content">
          <el-input v-model="quickFollowUpForm.content" type="textarea" :rows="4" placeholder="请输入跟进内容..." maxlength="500" show-word-limit />
        </el-form-item>
        <el-form-item label="下次跟进" prop="nextFollowTime">
          <el-date-picker v-model="quickFollowUpForm.nextFollowTime" type="datetime" placeholder="选择下次跟进时间"
            style="width: 100%" format="YYYY-MM-DD HH:mm" value-format="YYYY-MM-DD HH:mm:ss"
            :disabled-date="disablePastDate" :default-time="new Date()" />
        </el-form-item>
        <el-form-item label="客户意向" prop="intention">
          <el-select v-model="quickFollowUpForm.intention" placeholder="请选择客户意向" style="width: 100%">
            <el-option label="很有意向" value="high" /><el-option label="一般意向" value="medium" />
            <el-option label="意向较低" value="low" /><el-option label="暂无意向" value="none" />
          </el-select>
        </el-form-item>
        <el-form-item label="通话标签">
          <el-select v-model="quickFollowUpForm.callTags" multiple placeholder="选择通话标签（可多选）" style="width: 100%" collapse-tags collapse-tags-tooltip>
            <el-option v-for="tag in callTagOptions" :key="tag" :label="tag" :value="tag" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="quickFollowUpForm.remark" type="textarea" :rows="2" placeholder="备注信息（可选）" maxlength="200" show-word-limit />
        </el-form-item>
      </el-form>
    </div>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="$emit('update:quickFollowUpVisible', false)">取消</el-button>
        <el-button type="primary" @click="$emit('submit-follow-up')" :loading="quickFollowUpSubmitting">保存跟进</el-button>
      </div>
    </template>
  </el-dialog>

  <!-- 呼入弹窗 -->
  <el-dialog :model-value="incomingCallVisible" @update:model-value="$emit('update:incomingCallVisible', $event)"
    title="来电提醒" width="500px" :close-on-click-modal="false" :close-on-press-escape="false" :show-close="false" center>
    <div class="incoming-call" v-if="incomingCallData">
      <div class="caller-info">
        <div class="caller-avatar"><el-icon size="60"><User /></el-icon></div>
        <div class="caller-details">
          <h3>{{ incomingCallData.customerName || '未知客户' }}</h3>
          <p class="phone-number">{{ displaySensitiveInfoNew(incomingCallData.phone, SensitiveInfoType.PHONE) }}</p>
          <p class="company-info" v-if="incomingCallData.company">
            <span style="color: #909399; font-size: 13px;">{{ incomingCallData.company }}</span>
          </p>
          <p class="customer-level" v-if="incomingCallData.customerLevel">
            <el-tag :type="getLevelType(incomingCallData.customerLevel)">{{ getLevelText(incomingCallData.customerLevel) }}</el-tag>
          </p>
          <p class="call-source" v-if="incomingCallData.callSource">
            <el-tag size="small" :type="incomingCallData.callSource === 'mobile' ? 'success' : 'primary'">
              {{ incomingCallData.callSource === 'mobile' ? '工作手机' : (incomingCallData.callSource === 'sip' ? 'SIP线路' : '网络电话') }}
            </el-tag>
          </p>
          <p class="last-call" v-if="incomingCallData.lastCallTime">上次通话：{{ incomingCallData.lastCallTime }}</p>
        </div>
      </div>
      <div class="call-actions">
        <el-button type="success" size="large" :icon="Phone" @click="$emit('answer-call')" class="answer-btn">接听</el-button>
        <el-button type="danger" size="large" :icon="TurnOff" @click="$emit('reject-call')" class="reject-btn">挂断</el-button>
      </div>
      <div class="quick-actions">
        <el-button size="small" @click="$emit('view-customer-detail')">查看详情</el-button>
        <el-button size="small" @click="$emit('quick-follow-up')">快速跟进</el-button>
      </div>
    </div>
  </el-dialog>

  <!-- 通话中浮动窗口 -->
  <Teleport to="body">
    <div v-if="callInProgressVisible && currentCallData"
      class="call-floating-window" :class="{ 'is-minimized': isCallWindowMinimized }"
      :style="callWindowStyle" ref="callWindowRef">
      <div class="call-window-header" @mousedown="startDrag">
        <div class="header-left">
          <span class="status-dot" :class="{ 'is-connected': true }"></span>
          <span class="header-title">{{ isCallWindowMinimized ? '通话中' : '正在通话' }}</span>
        </div>
        <div class="header-actions">
          <el-tooltip :content="isCallWindowMinimized ? '展开' : '最小化'" placement="top">
            <el-button :icon="isCallWindowMinimized ? 'FullScreen' : 'Minus'" size="small" circle @click.stop="$emit('toggle-minimize')" />
          </el-tooltip>
        </div>
      </div>
      <!-- 最小化状态 -->
      <div v-if="isCallWindowMinimized" class="call-minimized-content">
        <div class="mini-info">
          <span class="mini-name">{{ currentCallData.customerName || '未知客户' }}</span>
          <span class="mini-phone">{{ displaySensitiveInfoNew(currentCallData.phone, SensitiveInfoType.PHONE) }}</span>
        </div>
        <el-button type="danger" size="small" :icon="TurnOff" @click="$emit('end-call-click')" circle />
      </div>
      <!-- 展开状态 -->
      <div v-else class="call-window-content">
        <div class="call-timer">
          <div class="timer-display">📞</div>
          <div class="call-status"><el-icon class="is-loading"><Loading /></el-icon> 正在通话中...</div>
        </div>
        <div class="caller-info-mini">
          <p class="caller-name">{{ currentCallData.customerName || '未知客户' }}</p>
          <p class="caller-phone">
            {{ displaySensitiveInfoNew(currentCallData.phone, SensitiveInfoType.PHONE) }}
            <el-tag v-if="getPhoneCarrier(currentCallData.phone)" size="small" type="info" style="margin-left: 8px;">{{ getPhoneCarrier(currentCallData.phone) }}</el-tag>
          </p>
          <div class="call-method-info">
            <el-tag v-if="currentCallData.callMethod === 'work_phone'" type="success" size="small">
              <el-icon><Cellphone /></el-icon> 工作手机: {{ currentCallData.workPhoneName || '未知' }}
            </el-tag>
            <el-tag v-else-if="currentCallData.callMethod === 'network_phone'" type="primary" size="small">
              <el-icon><Phone /></el-icon> 网络电话: {{ currentCallData.lineName || '未知线路' }}
            </el-tag>
          </div>
        </div>
        <div class="call-controls">
          <el-button type="danger" size="large" :icon="TurnOff" @click="$emit('end-call-click')" class="end-call-btn">
            {{ currentCallData.callMethod === 'work_phone' ? '挂断提示' : '结束通话' }}
          </el-button>
        </div>
        <div class="call-notes">
          <div class="notes-header">
            <span>通话备注</span>
            <el-button type="primary" size="small" @click="$emit('save-call-notes')" :loading="savingNotes">保存备注</el-button>
          </div>
          <el-input :model-value="callNotes" @update:model-value="$emit('update:callNotes', $event)"
            type="textarea" :rows="3" placeholder="通话备注（可在通话中随时记录）..." maxlength="500" show-word-limit />
        </div>
        <div class="call-quick-actions">
          <el-button size="small" @click="$emit('open-quick-followup-from-call')"><el-icon><EditPen /></el-icon> 快速跟进</el-button>
          <el-button size="small" @click="$emit('view-customer-detail-from-call')"><el-icon><User /></el-icon> 查看客户</el-button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, reactive, onUnmounted } from 'vue'
import { Phone, User, TurnOff, Loading, Cellphone, EditPen } from '@element-plus/icons-vue'
import { displaySensitiveInfoNew, SensitiveInfoType } from '@/utils/sensitiveInfo'
import { getLevelType, getLevelText, getPhoneCarrier } from './helpers'

const props = defineProps<{
  // 快捷跟进
  quickFollowUpVisible: boolean
  currentCustomer: any
  quickFollowUpForm: any
  quickFollowUpRules: any
  quickFollowUpSubmitting: boolean
  callTagOptions: string[]
  customerShippingAddress: string
  // 呼入
  incomingCallVisible: boolean
  incomingCallData: any
  // 通话中浮动窗口
  callInProgressVisible: boolean
  currentCallData: any
  isCallWindowMinimized: boolean
  callWindowStyle: any
  callNotes: string
  savingNotes: boolean
}>()

defineEmits<{
  'update:quickFollowUpVisible': [value: boolean]
  'update:incomingCallVisible': [value: boolean]
  'update:callNotes': [value: string]
  'reset-follow-up-form': []
  'submit-follow-up': []
  'answer-call': []
  'reject-call': []
  'view-customer-detail': []
  'quick-follow-up': []
  'toggle-minimize': []
  'end-call-click': []
  'save-call-notes': []
  'open-quick-followup-from-call': []
  'view-customer-detail-from-call': []
}>()

const quickFollowUpFormRef = ref()
const callWindowRef = ref<HTMLElement | null>(null)

// 拖动逻辑（浮动窗口内部管理）
const isDragging = ref(false)
const dragOffset = reactive({ x: 0, y: 0 })
const localPosition = reactive({ x: 0, y: 0 })
let positionInitialized = false

const startDrag = (e: MouseEvent) => {
  if ((e.target as HTMLElement).closest('.header-actions')) return
  isDragging.value = true
  const rect = callWindowRef.value?.getBoundingClientRect()
  if (rect) {
    if (!positionInitialized) {
      localPosition.x = rect.left
      localPosition.y = rect.top
      positionInitialized = true
    }
    dragOffset.x = e.clientX - rect.left
    dragOffset.y = e.clientY - rect.top
  }
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
}

const onDrag = (e: MouseEvent) => {
  if (!isDragging.value) return
  const el = callWindowRef.value
  if (!el) return
  let newX = e.clientX - dragOffset.x
  let newY = e.clientY - dragOffset.y
  const windowWidth = props.isCallWindowMinimized ? 280 : 420
  const windowHeight = props.isCallWindowMinimized ? 60 : 400
  newX = Math.max(0, Math.min(newX, window.innerWidth - windowWidth))
  newY = Math.max(0, Math.min(newY, window.innerHeight - windowHeight))
  el.style.left = `${newX}px`
  el.style.top = `${newY}px`
}

const stopDrag = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
}

// 禁止选择过去的日期
const disablePastDate = (time: Date) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return time.getTime() < today.getTime()
}

onUnmounted(() => {
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
})
</script>

<style scoped>
.quick-followup { padding: 20px; }
.quick-followup .customer-info { margin-bottom: 20px; padding: 16px; background-color: #f8f9fa; border-radius: 8px; border-left: 4px solid #409eff; }
.quick-followup .customer-info p { margin: 8px 0; font-size: 14px; color: #606266; }
.quick-followup .customer-info strong { color: #303133; font-weight: 600; }
.dialog-footer { display: flex; justify-content: flex-end; gap: 12px; }
.incoming-call { text-align: center; padding: 20px; }
.caller-info { display: flex; align-items: center; justify-content: center; margin-bottom: 30px; gap: 20px; }
.caller-avatar { color: #409eff; }
.caller-details { text-align: left; }
.caller-details h3 { margin: 0 0 8px 0; font-size: 20px; color: #303133; }
.phone-number { font-size: 16px; color: #606266; margin: 4px 0; }
.customer-level { margin: 8px 0; }
.last-call { font-size: 14px; color: #909399; margin: 4px 0; }
.call-actions { display: flex; justify-content: center; gap: 20px; margin-bottom: 20px; }
.answer-btn, .reject-btn { width: 120px; height: 50px; font-size: 16px; border-radius: 25px; }
.quick-actions { display: flex; justify-content: center; gap: 12px; }

/* 通话浮动窗口样式 */
.call-floating-window { position: fixed; z-index: 9999; width: 420px; background: white; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.1); overflow: hidden; transition: width 0.3s ease, height 0.3s ease; }
.call-floating-window.is-minimized { width: 280px; }
.call-window-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: linear-gradient(135deg, #409eff 0%, #36cfc9 100%); color: white; cursor: move; user-select: none; }
.header-left { display: flex; align-items: center; gap: 8px; }
.status-dot { width: 10px; height: 10px; background: #e6a23c; border-radius: 50%; animation: pulse 1.5s ease-in-out infinite; }
.status-dot.is-connected { background: #67c23a; }
@keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.6; transform: scale(1.2); } }
.header-title { font-weight: 600; font-size: 14px; }
.call-floating-window .header-actions { display: flex; gap: 4px; }
.call-floating-window .header-actions .el-button { background: rgba(255,255,255,0.2); border: none; color: white; }
.call-floating-window .header-actions .el-button:hover { background: rgba(255,255,255,0.3); }
.call-minimized-content { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: #f8f9fa; }
.mini-info { display: flex; flex-direction: column; gap: 2px; }
.mini-name { font-weight: 600; font-size: 14px; color: #303133; }
.mini-phone { font-size: 12px; color: #909399; }
.call-window-content { padding: 20px; text-align: center; }
.call-window-content .call-timer { margin-bottom: 16px; }
.call-window-content .timer-display { font-size: 36px; font-weight: bold; color: #409eff; margin-bottom: 6px; font-family: 'Courier New', monospace; }
.call-window-content .call-status { font-size: 13px; color: #67c23a; display: flex; align-items: center; justify-content: center; gap: 6px; }
.call-window-content .call-status .is-loading { animation: rotating 2s linear infinite; }
@keyframes rotating { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.call-window-content .caller-info-mini { margin-bottom: 16px; padding: 14px; background: linear-gradient(135deg, #f5f7fa 0%, #e8f4ff 100%); border-radius: 10px; border: 1px solid #e4e7ed; }
.call-window-content .caller-name { font-size: 16px; font-weight: 600; color: #303133; margin: 0 0 4px 0; }
.call-window-content .caller-phone { font-size: 14px; color: #606266; margin: 0 0 8px 0; }
.call-window-content .call-method-info { margin-top: 6px; }
.call-window-content .call-method-info .el-tag { display: inline-flex; align-items: center; gap: 4px; }
.call-window-content .call-controls { margin-bottom: 16px; }
.call-window-content .end-call-btn { width: 140px; height: 44px; font-size: 15px; border-radius: 22px; font-weight: 500; }
.call-window-content .call-notes { margin-top: 12px; text-align: left; }
.call-window-content .call-notes .notes-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 14px; color: #606266; }
.call-window-content .call-quick-actions { margin-top: 12px; display: flex; justify-content: center; gap: 10px; }
.call-window-content .call-quick-actions .el-button { display: inline-flex; align-items: center; gap: 4px; }
</style>

