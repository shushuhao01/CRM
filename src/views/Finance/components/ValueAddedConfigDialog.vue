<template>
  <el-dialog
    v-model="dialogVisible"
    title="状态配置管理"
    width="700px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <el-tabs v-model="activeTab">
      <!-- 有效状态配置 -->
      <el-tab-pane label="有效状态" name="validStatus">
        <div class="config-section">
          <div class="config-group">
            <div class="config-header">
              <span class="config-title">有效状态预设</span>
              <div class="config-add">
                <el-input
                  v-model="newValidStatus"
                  placeholder="输入新状态"
                  size="small"
                  style="width: 150px;"
                  @keyup.enter="addValidStatus"
                />
                <el-button type="primary" size="small" @click="addValidStatus">添加</el-button>
              </div>
            </div>
            <div class="config-tags">
              <el-tag
                v-for="item in validStatusList"
                :key="item.id"
                closable
                class="config-tag"
                :type="getValidStatusTagType(item.value)"
                @close="deleteValidStatus(item.id)"
              >
                {{ item.label }}
              </el-tag>
              <span v-if="validStatusList.length === 0" class="empty-hint">暂无配置，请添加</span>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <!-- 结算状态配置 -->
      <el-tab-pane label="结算状态" name="settlementStatus">
        <div class="config-section">
          <div class="config-group">
            <div class="config-header">
              <span class="config-title">结算状态预设</span>
              <div class="config-add">
                <el-input
                  v-model="newSettlementStatus"
                  placeholder="输入新状态"
                  size="small"
                  style="width: 150px;"
                  @keyup.enter="addSettlementStatus"
                />
                <el-button type="primary" size="small" @click="addSettlementStatus">添加</el-button>
              </div>
            </div>
            <div class="config-tags">
              <el-tag
                v-for="item in settlementStatusList"
                :key="item.id"
                closable
                class="config-tag"
                :type="getSettlementStatusTagType(item.value)"
                @close="deleteSettlementStatus(item.id)"
              >
                {{ item.label }}
              </el-tag>
              <span v-if="settlementStatusList.length === 0" class="empty-hint">暂无配置，请添加</span>
            </div>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <template #footer>
      <el-button @click="handleClose">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getValueAddedStatusConfigs,
  addValueAddedStatusConfig,
  deleteValueAddedStatusConfig,
  type StatusConfig
} from '@/api/valueAdded'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void
  (e: 'saved'): void
}>()

const dialogVisible = ref(false)
const activeTab = ref('validStatus')

const validStatusList = ref<StatusConfig[]>([])
const settlementStatusList = ref<StatusConfig[]>([])

const newValidStatus = ref('')
const newSettlementStatus = ref('')

watch(() => props.visible, (val) => {
  dialogVisible.value = val
  if (val) loadConfigs()
})

watch(dialogVisible, (val) => {
  emit('update:visible', val)
})

// 获取有效状态标签类型
const getValidStatusTagType = (value: string) => {
  const typeMap: Record<string, any> = {
    'pending': 'info',
    'valid': 'success',
    'invalid': 'danger',
    'supplemented': 'warning'
  }
  return typeMap[value] || ''
}

// 获取结算状态标签类型
const getSettlementStatusTagType = (value: string) => {
  const typeMap: Record<string, any> = {
    'unsettled': 'warning',
    'settled': 'success'
  }
  return typeMap[value] || ''
}

// 加载配置
const loadConfigs = async () => {
  try {
    const res = await getValueAddedStatusConfigs() as any
    // 🔥 修复：axios拦截器已经返回data，不需要再访问res.data
    if (res) {
      validStatusList.value = res.validStatus || []
      settlementStatusList.value = res.settlementStatus || []
    }
  } catch (e) {
    console.error('加载配置失败:', e)
    ElMessage.error('加载配置失败')
  }
}

// 添加有效状态
const addValidStatus = async () => {
  if (!newValidStatus.value?.trim()) {
    ElMessage.warning('请输入状态名称')
    return
  }

  try {
    await addValueAddedStatusConfig({
      type: 'validStatus',
      value: newValidStatus.value.trim(),
      label: newValidStatus.value.trim()
    })
    ElMessage.success('添加成功')
    newValidStatus.value = ''
    await loadConfigs()
    emit('saved')
  } catch (e: any) {
    ElMessage.error(e?.message || '添加失败')
  }
}

// 添加结算状态
const addSettlementStatus = async () => {
  if (!newSettlementStatus.value?.trim()) {
    ElMessage.warning('请输入状态名称')
    return
  }

  try {
    await addValueAddedStatusConfig({
      type: 'settlementStatus',
      value: newSettlementStatus.value.trim(),
      label: newSettlementStatus.value.trim()
    })
    ElMessage.success('添加成功')
    newSettlementStatus.value = ''
    await loadConfigs()
    emit('saved')
  } catch (e: any) {
    ElMessage.error(e?.message || '添加失败')
  }
}

// 删除有效状态
const deleteValidStatus = async (id: string) => {
  try {
    await ElMessageBox.confirm('确定删除此状态配置？', '提示', { type: 'warning' })
  } catch { return }

  try {
    await deleteValueAddedStatusConfig(id)
    ElMessage.success('删除成功')
    await loadConfigs()
    emit('saved')
  } catch (e: any) {
    ElMessage.error(e?.message || '删除失败')
  }
}

// 删除结算状态
const deleteSettlementStatus = async (id: string) => {
  try {
    await ElMessageBox.confirm('确定删除此状态配置？', '提示', { type: 'warning' })
  } catch { return }

  try {
    await deleteValueAddedStatusConfig(id)
    ElMessage.success('删除成功')
    await loadConfigs()
    emit('saved')
  } catch (e: any) {
    ElMessage.error(e?.message || '删除失败')
  }
}

const handleClose = () => {
  dialogVisible.value = false
}
</script>

<style scoped>
.config-section {
  padding: 10px 0;
}

.config-group {
  background: #f5f7fa;
  border-radius: 8px;
  padding: 16px;
}

.config-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.config-title {
  font-weight: 600;
  font-size: 14px;
  color: #303133;
}

.config-add {
  display: flex;
  gap: 8px;
}

.config-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  min-height: 36px;
  align-items: center;
}

.config-tag {
  font-size: 13px;
  padding: 6px 12px;
}

.empty-hint {
  color: #909399;
  font-size: 13px;
}
</style>
