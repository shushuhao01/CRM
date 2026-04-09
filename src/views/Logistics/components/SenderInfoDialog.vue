<template>
  <el-dialog
    v-model="dialogVisible"
    width="800px"
    :before-close="handleClose"
    class="sender-info-dialog"
    append-to-body
  >
    <template #header>
      <div class="dialog-header-with-help">
        <span class="el-dialog__title">寄件人与退货地址管理</span>
        <el-tooltip content="查看寄件人配置指南" placement="bottom">
          <el-button link type="primary" class="help-icon-btn" @click="goToHelp">
            <el-icon :size="18"><QuestionFilled /></el-icon>
          </el-button>
        </el-tooltip>
      </div>
    </template>
    <el-tabs v-model="activeTab" type="border-card">
      <!-- 寄件人信息 -->
      <el-tab-pane label="寄件人信息" name="sender">
        <div class="tab-header">
          <span class="tab-desc">管理发货寄件人信息，打印面单时使用默认寄件人</span>
          <el-button type="primary" size="small" @click="openForm('sender')">
            <el-icon><Plus /></el-icon> 添加寄件人
          </el-button>
        </div>
        <el-table :data="senderList" stripe size="default" class="addr-table" v-loading="loading">
          <el-table-column prop="name" label="姓名" width="100" />
          <el-table-column prop="phone" label="电话" width="130" />
          <el-table-column prop="fullAddress" label="地址" show-overflow-tooltip min-width="200">
            <template #default="{ row }">{{ row.fullAddress || row.address }}</template>
          </el-table-column>
          <el-table-column prop="remark" label="备注" width="120" show-overflow-tooltip />
          <el-table-column label="默认" width="80" align="center">
            <template #default="{ row }">
              <el-tag v-if="row.isDefault" type="warning" size="small">默认</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="220" align="center" fixed="right">
            <template #default="{ row }">
              <el-button v-if="!row.isDefault" size="small" type="warning" link @click="handleSetDefault(row)">设为默认</el-button>
              <el-button v-else size="small" link @click="handleCancelDefault(row)">取消默认</el-button>
              <el-button size="small" type="primary" link @click="openEditForm(row)">编辑</el-button>
              <el-button size="small" type="danger" link @click="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- 退货地址 -->
      <el-tab-pane label="退货地址" name="return">
        <div class="tab-header">
          <span class="tab-desc">管理退货地址，售后退货时匹配使用</span>
          <el-button type="primary" size="small" @click="openForm('return')">
            <el-icon><Plus /></el-icon> 添加退货地址
          </el-button>
        </div>
        <el-table :data="returnList" stripe size="default" class="addr-table" v-loading="loading">
          <el-table-column prop="name" label="联系人" width="100" />
          <el-table-column prop="phone" label="电话" width="130" />
          <el-table-column prop="fullAddress" label="地址" show-overflow-tooltip min-width="200">
            <template #default="{ row }">{{ row.fullAddress || row.address }}</template>
          </el-table-column>
          <el-table-column label="关联售后类型" width="150">
            <template #default="{ row }">
              <div class="service-tags">
                <el-tag v-for="st in (row.linkedServiceTypes || [])" :key="st" size="small" type="info">
                  {{ serviceTypeText(st) }}
                </el-tag>
                <span v-if="!row.linkedServiceTypes || row.linkedServiceTypes.length === 0" class="no-data">未关联</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="默认" width="80" align="center">
            <template #default="{ row }">
              <el-tag v-if="row.isDefault" type="warning" size="small">默认</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="220" align="center" fixed="right">
            <template #default="{ row }">
              <el-button v-if="!row.isDefault" size="small" type="warning" link @click="handleSetDefault(row)">设为默认</el-button>
              <el-button v-else size="small" link @click="handleCancelDefault(row)">取消默认</el-button>
              <el-button size="small" type="primary" link @click="openEditForm(row)">编辑</el-button>
              <el-button size="small" type="danger" link @click="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <!-- 新增/编辑表单弹窗 -->
    <el-dialog
      v-model="formVisible"
      :title="editingId ? '编辑地址' : '添加地址'"
      width="550px"
      append-to-body
      :close-on-click-modal="false"
    >
      <el-form :model="form" ref="formRef" :rules="formRules" label-width="100px" size="default">
        <el-form-item label="联系人" prop="name">
          <el-input v-model="form.name" placeholder="请输入联系人姓名" maxlength="50" />
        </el-form-item>
        <el-form-item label="联系电话" prop="phone">
          <el-input v-model="form.phone" placeholder="请输入联系电话" maxlength="20" />
        </el-form-item>
        <el-form-item label="省">
          <el-input v-model="form.province" placeholder="省/自治区/直辖市" maxlength="50" />
        </el-form-item>
        <el-form-item label="市">
          <el-input v-model="form.city" placeholder="市" maxlength="50" />
        </el-form-item>
        <el-form-item label="区/县">
          <el-input v-model="form.district" placeholder="区/县" maxlength="50" />
        </el-form-item>
        <el-form-item label="详细地址" prop="address">
          <el-input v-model="form.address" type="textarea" :rows="2" placeholder="请输入详细地址（不含省市区）" maxlength="500" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" placeholder="备注信息" maxlength="200" />
        </el-form-item>
        <!-- 退货地址才显示关联售后类型 -->
        <el-form-item v-if="form.type === 'return'" label="关联售后">
          <el-checkbox-group v-model="form.linkedServiceTypes">
            <el-checkbox label="return">退货</el-checkbox>
            <el-checkbox label="exchange">换货</el-checkbox>
            <el-checkbox label="repair">维修</el-checkbox>
          </el-checkbox-group>
          <div class="form-tip">选择关联的售后类型，售后退货时自动匹配此地址</div>
        </el-form-item>
        <el-form-item label="设为默认">
          <el-switch v-model="form.isDefault" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave" :loading="saving">保存</el-button>
      </template>
    </el-dialog>

    <template #footer>
      <el-button @click="handleClose">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, QuestionFilled } from '@element-plus/icons-vue'
import { senderAddressApi, type SenderAddressItem } from '@/api/senderAddress'

interface Props {
  visible: boolean
}
interface Emits {
  (e: 'update:visible', value: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const router = useRouter()

const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const goToHelp = () => {
  dialogVisible.value = false
  nextTick(() => {
    router.push('/help-center?section=logistics-sender-guide')
  })
}

const activeTab = ref<'sender' | 'return'>('sender')
const loading = ref(false)
const saving = ref(false)
const formVisible = ref(false)
const editingId = ref('')
const formRef = ref()

const senderList = ref<SenderAddressItem[]>([])
const returnList = ref<SenderAddressItem[]>([])

const form = ref({
  type: 'sender' as 'sender' | 'return',
  name: '',
  phone: '',
  province: '',
  city: '',
  district: '',
  address: '',
  remark: '',
  linkedServiceTypes: [] as string[],
  isDefault: false
})

const formRules = {
  name: [{ required: true, message: '请输入联系人姓名', trigger: 'blur' }],
  phone: [{ required: true, message: '请输入联系电话', trigger: 'blur' }],
  address: [{ required: true, message: '请输入详细地址', trigger: 'blur' }]
}

const serviceTypeText = (type: string) => {
  const map: Record<string, string> = { return: '退货', exchange: '换货', repair: '维修' }
  return map[type] || type
}

const loadData = async () => {
  loading.value = true
  try {
    const [senderRes, returnRes] = await Promise.all([
      senderAddressApi.getList('sender'),
      senderAddressApi.getList('return')
    ])
    senderList.value = senderRes?.data || []
    returnList.value = returnRes?.data || []
  } catch (error) {
    console.error('[寄件人管理] 加载数据失败:', error)
  } finally {
    loading.value = false
  }
}

watch(() => props.visible, (val) => {
  if (val) loadData()
})

const openForm = (type: 'sender' | 'return') => {
  editingId.value = ''
  form.value = {
    type,
    name: '',
    phone: '',
    province: '',
    city: '',
    district: '',
    address: '',
    remark: '',
    linkedServiceTypes: [],
    isDefault: false
  }
  formVisible.value = true
}

const openEditForm = (row: SenderAddressItem) => {
  editingId.value = row.id
  form.value = {
    type: row.type as 'sender' | 'return',
    name: row.name,
    phone: row.phone,
    province: row.province || '',
    city: row.city || '',
    district: row.district || '',
    address: row.address,
    remark: row.remark || '',
    linkedServiceTypes: row.linkedServiceTypes || [],
    isDefault: !!row.isDefault
  }
  formVisible.value = true
}

const handleSave = async () => {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  saving.value = true
  try {
    if (editingId.value) {
      await senderAddressApi.update(editingId.value, form.value)
      // 如果切换默认状态
      if (form.value.isDefault) {
        await senderAddressApi.setDefault(editingId.value)
      }
      ElMessage.success('更新成功')
    } else {
      await senderAddressApi.create(form.value)
      ElMessage.success('创建成功')
    }
    formVisible.value = false
    await loadData()
  } catch (error: any) {
    ElMessage.error(error?.message || '操作失败')
  } finally {
    saving.value = false
  }
}

const handleSetDefault = async (row: SenderAddressItem) => {
  try {
    await senderAddressApi.setDefault(row.id)
    ElMessage.success(`已将「${row.name}」设为默认`)
    await loadData()
  } catch (error: any) {
    ElMessage.error(error?.message || '设置默认失败')
  }
}

const handleCancelDefault = async (row: SenderAddressItem) => {
  try {
    await senderAddressApi.cancelDefault(row.id)
    ElMessage.success('已取消默认')
    await loadData()
  } catch (error: any) {
    ElMessage.error(error?.message || '取消默认失败')
  }
}

const handleDelete = async (row: SenderAddressItem) => {
  try {
    await ElMessageBox.confirm(`确定删除「${row.name}」的地址吗？`, '确认删除', { type: 'warning' })
    await senderAddressApi.remove(row.id)
    ElMessage.success('删除成功')
    await loadData()
  } catch { /* cancelled */ }
}

const handleClose = () => {
  dialogVisible.value = false
}
</script>

<style scoped>
.dialog-header-with-help {
  display: flex;
  align-items: center;
  gap: 8px;
}
.help-icon-btn {
  padding: 2px;
  margin-left: 4px;
}

.sender-info-dialog :deep(.el-dialog__body) {
  padding: 10px 20px;
}

.tab-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.tab-desc {
  font-size: 13px;
  color: #909399;
}

.addr-table {
  border-radius: 8px;
}

.service-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.no-data {
  color: #c0c4cc;
  font-size: 12px;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}
</style>

