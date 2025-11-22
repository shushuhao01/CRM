<template>
  <el-dialog
    v-model="visible"
    title="服务类型配置"
    width="600px"
    :before-close="handleClose"
  >
    <div class="service-type-config">
      <!-- 添加新类型 -->
      <div class="add-section">
        <el-input
          v-model="newTypeLabel"
          placeholder="输入新的服务类型名称"
          style="width: 200px; margin-right: 10px;"
          @keyup.enter="handleAdd"
        />
        <el-button type="primary" @click="handleAdd" :icon="Plus">
          添加
        </el-button>
      </div>

      <!-- 类型列表 -->
      <div class="type-list">
        <el-table :data="sortedTypes" style="width: 100%">
          <el-table-column label="排序" width="80">
            <template #default="{ $index }">
              <div class="sort-buttons">
                <el-button
                  size="small"
                  :icon="ArrowUp"
                  :disabled="$index === 0"
                  @click="moveUp($index)"
                  link
                />
                <el-button
                  size="small"
                  :icon="ArrowDown"
                  :disabled="$index === sortedTypes.length - 1"
                  @click="moveDown($index)"
                  link
                />
              </div>
            </template>
          </el-table-column>

          <el-table-column label="类型名称" prop="label">
            <template #default="{ row }">
              <el-input
                v-if="editingId === row.id"
                v-model="editingLabel"
                size="small"
                @blur="saveEdit(row)"
                @keyup.enter="saveEdit(row)"
              />
              <span v-else>{{ row.label }}</span>
            </template>
          </el-table-column>

          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-switch
                v-model="row.enabled"
                @change="handleToggle(row)"
              />
            </template>
          </el-table-column>

          <el-table-column label="操作" width="150">
            <template #default="{ row }">
              <el-button
                size="small"
                @click="startEdit(row)"
                link
              >
                编辑
              </el-button>
              <el-button
                size="small"
                type="danger"
                @click="handleDelete(row)"
                link
              >
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="tip">
        <el-alert
          title="提示"
          type="info"
          :closable="false"
          show-icon
        >
          <template #default>
            <p>• 禁用的服务类型不会在下拉列表中显示</p>
            <p>• 可以通过上下箭头调整显示顺序</p>
            <p>• 配置后全局生效并自动保存</p>
          </template>
        </el-alert>
      </div>
    </div>

    <template #footer>
      <el-button @click="handleClose">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, ArrowUp, ArrowDown } from '@element-plus/icons-vue'
import { useServiceTypeStore } from '@/stores/serviceType'
import type { ServiceType } from '@/stores/serviceType'
import { useUserStore } from '@/stores/user'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const serviceTypeStore = useServiceTypeStore()
const userStore = useUserStore()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const newTypeLabel = ref('')
const editingId = ref('')
const editingLabel = ref('')

// 排序后的类型列表
const sortedTypes = computed(() => {
  return [...serviceTypeStore.serviceTypes].sort((a, b) => a.order - b.order)
})

// 添加新类型
const handleAdd = () => {
  if (!newTypeLabel.value.trim()) {
    ElMessage.warning('请输入服务类型名称')
    return
  }

  // 检查是否重复
  const exists = serviceTypeStore.serviceTypes.some(
    t => t.label === newTypeLabel.value.trim()
  )
  if (exists) {
    ElMessage.warning('该服务类型已存在')
    return
  }

  // 生成value (拼音或英文)
  const value = newTypeLabel.value.trim().toLowerCase().replace(/\s+/g, '_')

  serviceTypeStore.addServiceType({
    label: newTypeLabel.value.trim(),
    value: value,
    enabled: true,
    order: serviceTypeStore.serviceTypes.length + 1,
    createdBy: userStore.currentUser?.id || 'system'
  })

  ElMessage.success('添加成功')
  newTypeLabel.value = ''
}

// 开始编辑
const startEdit = (row: ServiceType) => {
  editingId.value = row.id
  editingLabel.value = row.label
}

// 保存编辑
const saveEdit = (row: ServiceType) => {
  if (!editingLabel.value.trim()) {
    ElMessage.warning('服务类型名称不能为空')
    editingLabel.value = row.label
    editingId.value = ''
    return
  }

  serviceTypeStore.updateServiceType(row.id, {
    label: editingLabel.value.trim()
  })

  editingId.value = ''
  editingLabel.value = ''
  ElMessage.success('修改成功')
}

// 切换启用状态
const handleToggle = (row: ServiceType) => {
  const status = row.enabled ? '启用' : '禁用'
  ElMessage.success(`已${status}`)
}

// 删除类型
const handleDelete = (row: ServiceType) => {
  ElMessageBox.confirm(
    '确定要删除这个服务类型吗？',
    '确认删除',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    serviceTypeStore.deleteServiceType(row.id)
    ElMessage.success('删除成功')
  })
}

// 上移
const moveUp = (index: number) => {
  if (index === 0) return
  const types = [...sortedTypes.value]
  ;[types[index], types[index - 1]] = [types[index - 1], types[index]]
  serviceTypeStore.updateOrder(types)
}

// 下移
const moveDown = (index: number) => {
  if (index === sortedTypes.value.length - 1) return
  const types = [...sortedTypes.value]
  ;[types[index], types[index + 1]] = [types[index + 1], types[index]]
  serviceTypeStore.updateOrder(types)
}

// 关闭对话框
const handleClose = () => {
  visible.value = false
}
</script>

<style scoped>
.service-type-config {
  padding: 10px 0;
}

.add-section {
  margin-bottom: 20px;
  display: flex;
  align-items: center;
}

.type-list {
  margin-bottom: 20px;
}

.sort-buttons {
  display: flex;
  gap: 4px;
}

.tip {
  margin-top: 20px;
}

.tip :deep(.el-alert__content) p {
  margin: 4px 0;
  font-size: 13px;
}
</style>
