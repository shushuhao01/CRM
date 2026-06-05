<template>
  <div v-if="visible" class="modal-overlay">
    <div class="modal-container">
      <div class="modal-header">
        <h3>密码过期提醒</h3>
        <button @click="closeModal" class="close-btn">&times;</button>
      </div>

      <div class="modal-body">
        <div class="reminder-message">
          <div class="reminder-icon">🔔</div>
          <div class="reminder-text">
            <p v-if="remainingDays > 30">
              您的密码已使用超过30天，距离强制修改还有 <strong>{{ remainingDays }}</strong> 天，建议您及时修改密码以确保账户安全。
            </p>
            <p v-else-if="remainingDays > 0">
              您的密码已使用超过60天，距离强制修改仅剩 <strong>{{ remainingDays }}</strong> 天，请尽快修改密码！
            </p>
            <p v-else>
              您的密码已过期，请立即修改密码。
            </p>
            <p class="last-changed">
              上次修改时间：{{ formatDate(lastChanged) }}
            </p>
          </div>
        </div>

        <div class="reminder-actions">
          <button @click="changePasswordNow" class="primary-btn">
            立即修改密码
          </button>
          <button v-if="remainingDays > 0" @click="remindLater" class="secondary-btn">
            稍后提醒
          </button>
        </div>

        <div class="reminder-options">
          <div class="options-row">
            <label class="checkbox-label">
              <input
                v-model="dontRemindToday"
                type="checkbox"
                :disabled="remainingDays <= 0"
                @change="onCheckToday"
              />
              今天不再提醒
            </label>
            <div class="options-divider">或</div>
            <div class="remind-later-inline">
              <select
                v-model="remindAfterDays"
                class="remind-select"
                :disabled="dontRemindToday"
                :class="{ 'is-disabled': dontRemindToday }"
                @change="onSelectDays"
              >
                <option :value="7">7天后提醒</option>
                <option :value="15">15天后提醒</option>
                <option :value="30">30天后提醒</option>
              </select>
            </div>
            <button @click="handleConfirmRemindOption" class="remind-confirm-btn">确定</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Props {
  visible: boolean
  remainingDays: number
  lastChanged?: Date | string | null
}

interface Emits {
  (e: 'close'): void
  (e: 'changePassword'): void
  (e: 'remindLater', dontRemindToday: boolean): void
  (e: 'remindAfterDays', days: number): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const dontRemindToday = ref(false)
const remindAfterDays = ref(7)
const remindMode = ref<'today' | 'days'>('days')

const formatDate = (date?: Date | string | null): string => {
  if (!date) return '未知'
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) return '未知'
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(d)
}

const changePasswordNow = () => {
  emit('changePassword')
  closeModal()
}

const remindLater = () => {
  emit('remindLater', dontRemindToday.value)
  closeModal()
}

const closeModal = () => {
  dontRemindToday.value = false
  remindAfterDays.value = 7
  remindMode.value = 'days'
  emit('close')
}

const remindAfterSelected = () => {
  emit('remindAfterDays', remindAfterDays.value)
  closeModal()
}

const onCheckToday = () => {
  if (dontRemindToday.value) {
    remindMode.value = 'today'
  }
}

const onSelectDays = () => {
  dontRemindToday.value = false
  remindMode.value = 'days'
}

const handleConfirmRemindOption = () => {
  if (dontRemindToday.value) {
    emit('remindLater', true)
  } else {
    emit('remindAfterDays', remindAfterDays.value)
  }
  closeModal()
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-container {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 450px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #eee;
}

.modal-header h3 {
  margin: 0;
  color: #333;
  font-size: 18px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #999;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: #666;
}

.modal-body {
  padding: 20px;
}

.reminder-message {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background-color: #e7f3ff;
  border: 1px solid #b3d9ff;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 20px;
}

.reminder-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.reminder-text p {
  margin: 0 0 8px 0;
  color: #0c5aa6;
}

.reminder-text p:last-child {
  margin-bottom: 0;
}

.reminder-text strong {
  color: #d63384;
  font-weight: 600;
}

.last-changed {
  font-size: 12px;
  color: #666 !important;
  margin-top: 8px;
}

.reminder-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.primary-btn {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background-color 0.3s;
  flex: 1;
}

.primary-btn:hover {
  background-color: #0056b3;
}

.secondary-btn {
  background-color: #6c757d;
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background-color 0.3s;
  flex: 1;
}

.secondary-btn:hover {
  background-color: #545b62;
}

.reminder-options {
  border-top: 1px solid #eee;
  padding-top: 14px;
}

.options-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: nowrap;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  color: #666;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
}

.checkbox-label input[type="checkbox"] {
  margin: 0;
}

.checkbox-label input[type="checkbox"]:disabled {
  cursor: not-allowed;
}

.options-divider {
  color: #bbb;
  font-size: 12px;
  flex-shrink: 0;
}

.remind-later-inline {
  flex-shrink: 0;
}

.remind-select {
  padding: 5px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
  color: #333;
  background: white;
  cursor: pointer;
}

.remind-select:focus {
  outline: none;
  border-color: #007bff;
}

.remind-select.is-disabled {
  opacity: 0.45;
  cursor: not-allowed;
  background: #f5f5f5;
}

.remind-confirm-btn {
  padding: 5px 14px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  transition: background-color 0.2s;
  flex-shrink: 0;
  white-space: nowrap;
}

.remind-confirm-btn:hover {
  background-color: #0056b3;
}
</style>
