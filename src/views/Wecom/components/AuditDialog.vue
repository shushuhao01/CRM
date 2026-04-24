<template>
  <el-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" title="质检标记" width="500px">
    <el-form label-width="80px">
      <el-form-item label="敏感标记">
        <el-switch v-model="auditForm.isSensitive" active-text="敏感" inactive-text="正常" />
      </el-form-item>
      <el-form-item label="质检备注">
        <el-input v-model="auditForm.auditRemark" type="textarea" :rows="3" placeholder="请输入质检备注" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :loading="auditLoading" @click="submitAudit">确认</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { auditChatRecord } from '@/api/wecom'
import type { AuditForm, ChatRecord } from '../types'

defineOptions({ name: 'AuditDialog' })

defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'audit-success'): void
}>()

const auditLoading = ref(false)
const auditForm = ref<AuditForm>({ id: 0, isSensitive: false, auditRemark: '' })

/** 打开弹窗 */
const open = (row: ChatRecord) => {
  auditForm.value = {
    id: row.id,
    isSensitive: row.isSensitive || false,
    auditRemark: row.auditRemark || ''
  }
}

const submitAudit = async () => {
  auditLoading.value = true
  try {
    await auditChatRecord(auditForm.value.id, {
      isSensitive: auditForm.value.isSensitive,
      auditRemark: auditForm.value.auditRemark
    })
    ElMessage.success('质检标记成功')
    emit('update:modelValue', false)
    emit('audit-success')
  } catch (e: any) {
    ElMessage.error(e?.message || '质检标记失败')
  } finally {
    auditLoading.value = false
  }
}

defineExpose({ open })
</script>

