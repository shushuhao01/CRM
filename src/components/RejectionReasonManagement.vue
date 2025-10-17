<template>
  <div class="rejection-reason-management">
    <!-- 添加新原因 -->
    <div class="add-reason-section">
      <h4>添加新的拒绝原因</h4>
      <el-form
        ref="addFormRef"
        :model="addForm"
        :rules="addRules"
        @submit.prevent="handleAdd"
      >
        <el-form-item prop="name" label="原因名称">
          <el-input
            v-model="addForm.name"
            placeholder="请输入拒绝原因名称"
            maxlength="30"
            show-word-limit
          />
        </el-form-item>
        <el-form-item prop="description" label="详细描述">
          <el-input
            v-model="addForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入详细描述（选填）"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
        <el-form-item>
          <el-button 
            type="primary" 
            @click="handleAdd"
            :loading="addLoading"
            :icon="Plus"
          >
            添加原因
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 原因列表 - 按钮形式 -->
    <div class="reason-buttons-section">
      <h4>现有拒绝原因</h4>
      <div class="reason-buttons-grid">
        <div 
          v-for="reason in rejectionReasonStore.reasons" 
          :key="reason.id"
          class="reason-button-item"
        >
          <div class="reason-button-content">
            <div class="reason-info">
              <div class="reason-name">{{ reason.name }}</div>
              <div v-if="reason.description" class="reason-description">
                {{ reason.description }}
              </div>
              <div class="reason-meta">
                <span class="create-time">{{ reason.createTime }}</span>
                <span class="creator">{{ reason.createdBy }}</span>
              </div>
            </div>
            <div class="reason-actions">
              <el-button
                v-if="!reason.isDefault"
                type="danger"
                size="small"
                :icon="Delete"
                @click="handleDelete(reason)"
                :loading="deleteLoading === reason.id"
                circle
                title="删除"
              />
              <el-tag v-else type="info" size="small">系统预设</el-tag>
            </div>
          </div>
        </div>
      </div>
      
      <div v-if="rejectionReasonStore.reasons.length === 0" class="empty-state">
        <el-empty description="暂无拒绝原因" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Plus, Delete } from '@element-plus/icons-vue'
import { useRejectionReasonStore } from '@/stores/rejectionReason'
import { useUserStore } from '@/stores/user'

defineEmits<{
  close: []
}>()

const rejectionReasonStore = useRejectionReasonStore()
const userStore = useUserStore()

// 表单引用
const addFormRef = ref<FormInstance>()

// 添加表单
const addForm = reactive({
  name: '',
  description: ''
})

// 表单验证规则
const addRules: FormRules = {
  name: [
    { required: true, message: '请输入拒绝原因名称', trigger: 'blur' },
    { min: 2, max: 30, message: '长度在 2 到 30 个字符', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (rejectionReasonStore.reasons.some(reason => reason.name === value)) {
          callback(new Error('该拒绝原因已存在'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ],
  description: [
    { max: 200, message: '描述不能超过200个字符', trigger: 'blur' }
  ]
}

// 加载状态
const addLoading = ref(false)
const deleteLoading = ref<string | null>(null)

/**
 * 添加拒绝原因
 */
const handleAdd = async () => {
  if (!addFormRef.value) return

  await addFormRef.value.validate(async (valid) => {
    if (valid) {
      addLoading.value = true
      try {
        await rejectionReasonStore.addReason({
          name: addForm.name,
          description: addForm.description || undefined,
          createdBy: userStore.user?.name || '当前用户'
        })
        
        ElMessage.success('添加成功')
        addForm.name = ''
        addForm.description = ''
        addFormRef.value?.resetFields()
      } catch (_error) {
        ElMessage.error('添加失败')
      } finally {
        addLoading.value = false
      }
    }
  })
}

/**
 * 删除拒绝原因
 */
const handleDelete = async (reason: { id: string; name: string }) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除拒绝原因"${reason.name}"吗？`,
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    deleteLoading.value = reason.id
    try {
      await rejectionReasonStore.deleteReason(reason.id)
      ElMessage.success('删除成功')
    } catch (_error) {
      ElMessage.error('删除失败')
    } finally {
      deleteLoading.value = null
    }
  } catch {
    // 用户取消删除
  }
}
</script>

<style scoped>
.rejection-reason-management {
  padding: 0;
  max-height: 70vh;
  overflow-y: auto;
}

.add-reason-section {
  margin-bottom: 24px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.add-reason-section h4 {
  margin: 0 0 16px 0;
  color: #303133;
  font-size: 16px;
  font-weight: 600;
}

.reason-buttons-section {
  padding: 0 4px;
}

.reason-buttons-section h4 {
  margin: 0 0 16px 0;
  color: #303133;
  font-size: 16px;
  font-weight: 600;
}

.reason-buttons-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  max-height: 400px;
  overflow-y: auto;
  padding-right: 8px;
}

.reason-button-item {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  background: #fff;
  transition: all 0.3s ease;
  overflow: hidden;
}

.reason-button-item:hover {
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
  transform: translateY(-1px);
}

.reason-button-content {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 16px;
  gap: 12px;
}

.reason-info {
  flex: 1;
  min-width: 0;
}

.reason-name {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 4px;
  line-height: 1.4;
}

.reason-description {
  font-size: 13px;
  color: #606266;
  line-height: 1.5;
  margin-bottom: 8px;
  word-wrap: break-word;
}

.reason-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #909399;
}

.reason-actions {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
}

/* 美化滚动条 */
.reason-buttons-grid::-webkit-scrollbar {
  width: 6px;
}

.reason-buttons-grid::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.reason-buttons-grid::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.reason-buttons-grid::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

.rejection-reason-management::-webkit-scrollbar {
  width: 6px;
}

.rejection-reason-management::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.rejection-reason-management::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.rejection-reason-management::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>