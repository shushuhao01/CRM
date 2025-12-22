<template>
  <el-dialog
    v-model="dialogVisible"
    title="手机号验证"
    width="400px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <el-alert
      title="该运单需要手机号验证才能查询物流轨迹"
      type="info"
      :closable="false"
      show-icon
      style="margin-bottom: 20px"
    />

    <el-form label-width="120px">
      <el-form-item label="快递单号">
        <el-tag type="primary">{{ trackingNo }}</el-tag>
      </el-form-item>
      <el-form-item label="手机号后4位">
        <el-input
          ref="phoneInputRef"
          v-model="phoneInput"
          placeholder="请输入收件人/寄件人手机号后4位"
          maxlength="4"
          @keyup.enter="handleSubmit"
        />
        <div class="form-tip">输入寄件人或收件人的手机号后4位进行验证</div>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" @click="handleSubmit" :loading="loading">
        确认查询
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { ElMessage } from 'element-plus'

interface Props {
  visible: boolean
  trackingNo: string
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'submit', phone: string): void
}>()

const phoneInput = ref('')
const phoneInputRef = ref()

const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

// 弹窗打开时聚焦输入框
watch(() => props.visible, (newVal) => {
  if (newVal) {
    phoneInput.value = ''
    nextTick(() => {
      phoneInputRef.value?.focus()
    })
  }
})

const handleSubmit = () => {
  if (!phoneInput.value || phoneInput.value.length !== 4) {
    ElMessage.warning('请输入手机号后4位')
    return
  }
  emit('submit', phoneInput.value)
}

const handleClose = () => {
  phoneInput.value = ''
  emit('update:visible', false)
}
</script>

<style scoped>
.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}
</style>
