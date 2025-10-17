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
            <p v-if="remainingDays > 0">
              您的密码将在 <strong>{{ remainingDays }}</strong> 天后过期，建议您及时修改密码以确保账户安全。
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
          <label class="checkbox-label">
            <input 
              v-model="dontRemindToday" 
              type="checkbox"
              :disabled="remainingDays <= 0"
            />
            今天不再提醒
          </label>
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
  lastChanged?: Date
}

interface Emits {
  (e: 'close'): void
  (e: 'changePassword'): void
  (e: 'remindLater', dontRemindToday: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const dontRemindToday = ref(false)

const formatDate = (date?: Date): string => {
  if (!date) return '未知'
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
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
  emit('close')
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
  padding-top: 16px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #666;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  margin: 0;
}

.checkbox-label input[type="checkbox"]:disabled {
  cursor: not-allowed;
}
</style>