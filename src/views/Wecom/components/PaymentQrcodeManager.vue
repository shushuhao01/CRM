<template>
  <div class="payment-qrcode">
    <el-alert type="warning" :closable="false" style="margin-bottom: 16px">
      <template #title>
        <strong>收款码说明</strong>
      </template>
      <p style="margin: 6px 0 0; line-height: 1.8; color: #606266">
        企微收款码只能由成员在<strong>企微APP</strong>中创建（路径：工作台 → 对外收款 → 收款码），<strong>无法通过API生成</strong>。<br/>
        本页面用于在CRM中<strong>登记和追踪</strong>团队成员已创建的收款码，便于统一管理和业绩统计。
      </p>
    </el-alert>

    <div class="filter-bar">
      <div class="filter-row">
        <el-button type="primary" @click="openCreate">
          <el-icon><Plus /></el-icon> 登记收款码
        </el-button>
        <div style="flex: 1" />
        <span class="result-count">共 {{ qrcodes.length }} 条记录</span>
      </div>
    </div>

    <el-table :data="qrcodes" stripe border v-loading="loading">
      <el-table-column prop="name" label="收款码名称" min-width="150">
        <template #default="{ row }">
          <span style="font-weight: 600">{{ row.name }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="description" label="描述/用途" min-width="150" show-overflow-tooltip />
      <el-table-column label="金额类型" width="140">
        <template #default="{ row }">
          <el-tag size="small" :type="row.amountType === 'fixed' ? 'warning' : 'info'">
            {{ row.amountType === 'fixed' ? `固定 ¥${(row.fixedAmount / 100).toFixed(2)}` : '自定义金额' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="memberNames" label="使用成员" min-width="120" show-overflow-tooltip />
      <el-table-column label="累计收款" width="130" align="right">
        <template #default="{ row }">
          <span style="font-weight: 600; color: #EF4444">&yen;{{ (row.totalAmount / 100).toFixed(2) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="收款笔数" width="90" align="center">
        <template #default="{ row }">{{ row.totalCount }}</template>
      </el-table-column>
      <el-table-column label="登记时间" width="160">
        <template #default="{ row }">{{ row.createdAt ? formatDate(row.createdAt) : '-' }}</template>
      </el-table-column>
      <el-table-column label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="row.isEnabled ? 'success' : 'info'" size="small">{{ row.isEnabled ? '使用中' : '已停用' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link size="small" @click="handleEdit(row)">编辑</el-button>
          <el-button :type="row.isEnabled ? 'warning' : 'success'" link size="small" @click="toggleQrcode(row)">
            {{ row.isEnabled ? '停用' : '启用' }}
          </el-button>
          <el-button type="danger" link size="small" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 登记/编辑收款码弹窗 -->
    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑收款码记录' : '登记收款码'" width="560px" destroy-on-close>
      <el-alert type="info" :closable="false" style="margin-bottom: 16px">
        请先在企微APP中创建收款码，然后在此登记以便CRM统一追踪管理。
      </el-alert>
      <el-form :model="form" label-width="100px" ref="formRef" :rules="formRules">
        <el-form-item label="收款码名称" prop="name">
          <el-input v-model="form.name" placeholder="如：标准产品收款码" maxlength="30" show-word-limit />
        </el-form-item>
        <el-form-item label="描述/用途">
          <el-input v-model="form.description" placeholder="收款码用途描述" maxlength="100" />
        </el-form-item>
        <el-form-item label="金额类型">
          <el-radio-group v-model="form.amountType">
            <el-radio label="fixed">固定金额</el-radio>
            <el-radio label="custom">自定义金额</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="form.amountType === 'fixed'" label="固定金额" prop="fixedAmount">
          <el-input-number v-model="form.fixedAmount" :min="1" :step="100" style="width: 200px" />
          <span style="margin-left: 8px; font-size: 12px; color: #909399">单位: 分（即 &yen;{{ (form.fixedAmount / 100).toFixed(2) }}）</span>
        </el-form-item>
        <el-form-item label="使用成员">
          <el-select v-model="form.members" multiple filterable allow-create placeholder="输入成员名（在企微中生成此收款码的人）" style="width: 100%">
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remarkTemplate" placeholder="附加备注信息" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave" :loading="saving">{{ editingId ? '更新' : '登记' }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getWecomPaymentQrcodes, createWecomPaymentQrcode, updateWecomPaymentQrcode, deleteWecomPaymentQrcode } from '@/api/wecom'
import { formatDateTime } from '@/utils/date'

const props = defineProps<{ configId?: number | null }>()

const loading = ref(false)
const dialogVisible = ref(false)
const editingId = ref<number | null>(null)
const saving = ref(false)
const formRef = ref()
const qrcodes = ref<any[]>([])

const form = reactive({
  name: '', description: '', amountType: 'fixed' as 'fixed' | 'custom',
  fixedAmount: 100, members: [] as string[], remarkTemplate: ''
})

const formRules = {
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
  fixedAmount: [{ required: true, message: '请输入金额', trigger: 'blur' }]
}

const formatDate = (d: string) => d ? formatDateTime(d) : '-'

const fetchQrcodes = async () => {
  loading.value = true
  try {
    const res = await getWecomPaymentQrcodes()
    qrcodes.value = res?.data || res || []
  } catch (e) { console.error('[Qrcode] Fetch error:', e) }
  finally { loading.value = false }
}

const openCreate = () => {
  editingId.value = null
  Object.assign(form, { name: '', description: '', amountType: 'fixed', fixedAmount: 100, members: [], remarkTemplate: '' })
  dialogVisible.value = true
}

const handleEdit = (row: any) => {
  editingId.value = row.id
  Object.assign(form, {
    name: row.name, description: row.description || '',
    amountType: row.amountType, fixedAmount: row.fixedAmount,
    members: row.memberNames?.split('、').filter(Boolean) || [],
    remarkTemplate: row.remarkTemplate || ''
  })
  dialogVisible.value = true
}

const handleSave = async () => {
  try { await formRef.value?.validate() } catch { return }
  saving.value = true
  try {
    const data = {
      name: form.name, description: form.description,
      amountType: form.amountType, fixedAmount: form.fixedAmount,
      memberNames: form.members.join('、'), memberUserIds: form.members,
      remarkTemplate: form.remarkTemplate, configId: props.configId || 0
    }
    if (editingId.value) {
      await updateWecomPaymentQrcode(editingId.value, data)
      ElMessage.success('记录已更新')
    } else {
      await createWecomPaymentQrcode(data)
      ElMessage.success('收款码已登记')
    }
    dialogVisible.value = false
    fetchQrcodes()
  } catch (e: any) { ElMessage.error(e?.message || '保存失败') }
  finally { saving.value = false }
}

const toggleQrcode = async (row: any) => {
  try {
    await updateWecomPaymentQrcode(row.id, { isEnabled: !row.isEnabled })
    row.isEnabled = !row.isEnabled
    ElMessage.success(row.isEnabled ? '已启用' : '已停用')
  } catch (e: any) { ElMessage.error(e?.message || '操作失败') }
}

const handleDelete = async (row: any) => {
  try { await ElMessageBox.confirm(`确认删除"${row.name}"的登记记录？`, '删除确认') } catch { return }
  try {
    await deleteWecomPaymentQrcode(row.id)
    ElMessage.success('已删除')
    fetchQrcodes()
  } catch (e: any) { ElMessage.error(e?.message || '删除失败') }
}

onMounted(() => fetchQrcodes())
</script>

<style scoped>
.filter-bar { background: #fff; border: 1px solid #EBEEF5; border-radius: 10px; padding: 16px 20px; margin-bottom: 16px; }
.filter-row { display: flex; gap: 8px; align-items: center; }
.result-count { font-size: 13px; color: #9CA3AF; }
</style>

