<template>
  <div class="acquisition-tag-manager">
    <el-alert type="success" :closable="true" style="margin-bottom: 16px" show-icon>
      <template #title>
        标签管理通过企微API（<strong>externalcontact/add_corp_tag</strong>）实现双向同步：CRM创建的标签自动同步到企微后台，企微后台的标签也可同步到CRM。创建链接时可直接选择已有标签。
      </template>
    </el-alert>

    <div class="tab-actions">
      <el-button type="primary" @click="handleAdd">
        <el-icon><Plus /></el-icon>创建标签组
      </el-button>
      <el-button @click="handleSyncFromWecom" :loading="syncing">
        <el-icon><Refresh /></el-icon>同步企微标签
      </el-button>
      <el-button @click="showMergeDialog = true" :disabled="tagGroups.length < 2">
        <el-icon><Connection /></el-icon>标签合并
      </el-button>
      <div style="flex: 1" />
      <el-input v-model="searchKeyword" placeholder="搜索标签组或标签" style="width: 220px" clearable prefix-icon="Search" />
    </div>

    <!-- 标签使用统计可视化 -->
    <div class="tag-usage-chart" v-if="tagGroups.length > 0">
      <div class="chart-title">📊 标签使用统计</div>
      <div class="chart-bars">
        <div v-for="group in filteredTagGroups.slice(0, 8)" :key="group.id" class="chart-bar-item">
          <span class="chart-label">{{ group.groupName }}</span>
          <div class="chart-bar-wrapper">
            <div class="chart-bar-fill" :style="{ width: calcUsagePercent(group.usageCount) + '%' }" />
          </div>
          <span class="chart-count">{{ group.usageCount || 0 }}</span>
        </div>
      </div>
    </div>

    <!-- 标签组表格 -->
    <el-table :data="pagedTagGroups" v-loading="loading" stripe>
      <el-table-column label="标签组" min-width="150">
        <template #default="{ row }">
          <div style="font-weight: 600">{{ row.groupName }}</div>
          <div v-if="row.syncStatus" style="font-size: 11px; color: #9CA3AF; margin-top: 2px">
            {{ row.syncStatus === 'synced' ? '✅ 已同步企微' : '⏳ 待同步' }}
          </div>
        </template>
      </el-table-column>
      <el-table-column label="标签" min-width="300">
        <template #default="{ row }">
          <el-tag v-for="tag in row.tags" :key="tag.id" size="small" :type="tag.type || ''" style="margin: 2px 4px 2px 0; cursor: pointer" @click="filterByTag(tag.name)">
            {{ tag.name }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="使用量" width="100" sortable :sort-by="'usageCount'">
        <template #default="{ row }">
          <span style="font-weight: 600; color: #4C6EF5">{{ row.usageCount || 0 }}</span>
        </template>
      </el-table-column>
      <el-table-column label="创建时间" width="160">
        <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link size="small" @click="handleEdit(row)">编辑</el-button>
          <el-button type="info" link size="small" @click="showTagCustomers(row)">查看客户</el-button>
          <el-button type="danger" link size="small" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 翻页控件 -->
    <div class="pagination-bar">
      <span class="page-info">共 {{ filteredTagGroups.length }} 个标签组</span>
      <el-pagination
        v-model:current-page="tagPage"
        v-model:page-size="tagPageSize"
        :page-sizes="[10, 20, 50]"
        :total="filteredTagGroups.length"
        layout="sizes, prev, pager, next"
        small
        background
      />
    </div>

    <!-- 创建/编辑标签组弹窗 -->
    <el-dialog v-model="dialogVisible" :title="editingGroup ? '编辑标签组' : '创建标签组'" width="500px">
      <el-form label-width="100px">
        <el-form-item label="标签组名称" required>
          <el-input v-model="tagForm.groupName" placeholder="如：客户意向分类" />
        </el-form-item>
        <el-form-item v-if="!editingGroup" label="标签名称" required>
          <el-input v-model="tagForm.tagsInput" type="textarea" :rows="3" placeholder="多个标签用逗号、顿号或换行分隔，如：VIP客户、意向客户、潜在客户" />
        </el-form-item>
        <el-form-item v-if="editingGroup" label="现有标签">
          <div>
            <el-tag v-for="tag in editingGroup.tags" :key="tag.id" size="small" style="margin: 2px 4px 2px 0">{{ tag.name }}</el-tag>
          </div>
          <div class="form-tip">提示：编辑模式仅可修改标签组名称，标签名称修改请在企微管理后台操作</div>
        </el-form-item>
      </el-form>
      <el-alert type="info" :closable="false" style="margin-top: 12px">
        <template #title>创建后将通过企微API（externalcontact/add_corp_tag）自动同步到企业微信后台，创建链接时可直接选择。</template>
      </el-alert>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">{{ editingGroup ? '保存' : '创建并同步' }}</el-button>
      </template>
    </el-dialog>

    <!-- 标签合并弹窗 -->
    <el-dialog v-model="showMergeDialog" title="标签合并" width="520px">
      <el-alert type="warning" :closable="false" style="margin-bottom: 16px">
        合并后，被合并标签的客户将自动转移到目标标签下，被合并标签将被删除，此操作不可撤销。
      </el-alert>
      <el-form label-width="100px">
        <el-form-item label="选择标签">
          <el-select v-model="mergeForm.sourceTagIds" multiple placeholder="选择要合并的标签" style="width: 100%">
            <el-option-group v-for="group in tagGroups" :key="group.id" :label="group.groupName">
              <el-option v-for="tag in group.tags" :key="tag.id" :label="tag.name" :value="tag.id" />
            </el-option-group>
          </el-select>
        </el-form-item>
        <el-form-item label="合并到">
          <el-select v-model="mergeForm.targetTagId" placeholder="选择目标标签" style="width: 100%">
            <el-option-group v-for="group in tagGroups" :key="group.id" :label="group.groupName">
              <el-option v-for="tag in group.tags" :key="tag.id" :label="tag.name" :value="tag.id" :disabled="mergeForm.sourceTagIds.includes(tag.id)" />
            </el-option-group>
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showMergeDialog = false">取消</el-button>
        <el-button type="warning" @click="handleMerge">确认合并</el-button>
      </template>
    </el-dialog>

    <!-- 按标签查看客户弹窗 -->
    <el-dialog v-model="showCustomerDialog" :title="`标签「${selectedTagName}」客户列表`" width="600px">
      <el-empty description="标签客户筛选功能将在后端API完善后对接" />
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Connection, Refresh } from '@element-plus/icons-vue'
import { formatDateTime } from '@/utils/date'

const props = defineProps<{
  tagGroups: any[]
  loading: boolean
  isDemoMode: boolean
  selectedConfigId: number | null
}>()

const emit = defineEmits(['create', 'edit', 'delete', 'refresh'])

const searchKeyword = ref('')
const dialogVisible = ref(false)
const editingGroup = ref<any>(null)
const showMergeDialog = ref(false)
const showCustomerDialog = ref(false)
const selectedTagName = ref('')
const syncing = ref(false)
const tagPage = ref(1)
const tagPageSize = ref(10)

const tagForm = reactive({ groupName: '', tagsInput: '' })
const mergeForm = reactive({ sourceTagIds: [] as number[], targetTagId: null as number | null })

const formatDate = (date: string) => date ? formatDateTime(date) : '-'

const filteredTagGroups = computed(() => {
  if (!searchKeyword.value) return props.tagGroups
  const kw = searchKeyword.value.toLowerCase()
  return props.tagGroups.filter((g: any) => {
    if (g.groupName.toLowerCase().includes(kw)) return true
    return g.tags?.some((t: any) => t.name.toLowerCase().includes(kw))
  })
})

const pagedTagGroups = computed(() => {
  const s = (tagPage.value - 1) * tagPageSize.value
  return filteredTagGroups.value.slice(s, s + tagPageSize.value)
})

const maxUsage = computed(() => Math.max(...props.tagGroups.map((g: any) => g.usageCount || 0), 1))
const calcUsagePercent = (count: number) => Math.min(((count || 0) / maxUsage.value) * 100, 100)

const filterByTag = (tagName: string) => { searchKeyword.value = tagName }

const showTagCustomers = (group: any) => {
  selectedTagName.value = group.groupName
  showCustomerDialog.value = true
}

const handleSyncFromWecom = async () => {
  if (props.isDemoMode) { ElMessage.info('示例模式：授权企微后可同步标签'); return }
  syncing.value = true
  try {
    emit('refresh')
    ElMessage.success('已从企业微信同步最新标签数据')
  } finally { syncing.value = false }
}

const handleAdd = () => {
  if (props.isDemoMode) { ElMessage.info('示例模式：授权企微后可管理标签'); return }
  if (!props.selectedConfigId) { ElMessage.warning('请先选择企微配置'); return }
  editingGroup.value = null
  tagForm.groupName = ''
  tagForm.tagsInput = ''
  dialogVisible.value = true
}

const handleEdit = (row: any) => {
  if (props.isDemoMode) { ElMessage.info('示例模式：授权企微后可编辑标签'); return }
  editingGroup.value = row
  tagForm.groupName = row.groupName
  dialogVisible.value = true
}

const handleDelete = async (row: any) => {
  if (props.isDemoMode) { ElMessage.info('示例模式：授权企微后可删除标签'); return }
  try {
    await ElMessageBox.confirm(`确定删除标签组「${row.groupName}」？将同时从企微后台删除（API: externalcontact/del_corp_tag），不可恢复。`, '删除确认', { type: 'warning' })
    emit('delete', row.id)
  } catch { /* cancelled */ }
}

const handleSubmit = () => {
  if (!tagForm.groupName.trim()) { ElMessage.warning('请输入标签组名称'); return }
  if (editingGroup.value) {
    emit('edit', { id: editingGroup.value.id, groupName: tagForm.groupName.trim() })
  } else {
    const tagNames = tagForm.tagsInput.split(/[,，、\n]/).map(s => s.trim()).filter(Boolean)
    if (tagNames.length === 0) { ElMessage.warning('请输入至少一个标签名称'); return }
    emit('create', { groupName: tagForm.groupName.trim(), tags: tagNames.map(name => ({ name })) })
  }
  dialogVisible.value = false
}

const handleMerge = () => {
  if (mergeForm.sourceTagIds.length === 0) { ElMessage.warning('请选择要合并的标签'); return }
  if (!mergeForm.targetTagId) { ElMessage.warning('请选择合并目标标签'); return }
  ElMessage.success('标签合并功能将在后端API完善后生效')
  showMergeDialog.value = false
}
</script>

<style scoped>
.acquisition-tag-manager { padding: 0; }
.tab-actions { display: flex; gap: 8px; margin-bottom: 16px; align-items: center; }
.form-tip { font-size: 12px; color: #9CA3AF; margin-top: 4px; }
.pagination-bar { display: flex; justify-content: space-between; align-items: center; margin-top: 16px; padding: 8px 0; }
.page-info { font-size: 13px; color: #9CA3AF; }
.tag-usage-chart { background: #F9FAFB; border-radius: 12px; padding: 16px 20px; margin-bottom: 16px; }
.chart-title { font-weight: 600; font-size: 14px; color: #1F2937; margin-bottom: 12px; }
.chart-bars { display: flex; flex-direction: column; gap: 8px; }
.chart-bar-item { display: flex; align-items: center; gap: 12px; }
.chart-label { width: 100px; font-size: 13px; color: #4B5563; text-align: right; flex-shrink: 0; }
.chart-bar-wrapper { flex: 1; height: 18px; background: #E5E7EB; border-radius: 9px; overflow: hidden; }
.chart-bar-fill { height: 100%; background: linear-gradient(90deg, #4C6EF5, #818CF8); border-radius: 9px; transition: width 0.5s ease; min-width: 4px; }
.chart-count { font-size: 13px; font-weight: 600; color: #4C6EF5; width: 50px; }
</style>

