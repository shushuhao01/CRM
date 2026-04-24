<template>
  <div class="payment-qrcode">
    <div class="filter-bar">
      <div class="filter-row">
        <el-button type="primary" @click="openCreate">
          <el-icon><Plus /></el-icon> 创建收款码
        </el-button>
        <div style="flex: 1" />
        <span class="result-count">共 {{ qrcodes.length }} 个收款码</span>
      </div>
    </div>

    <el-table :data="qrcodes" stripe border v-loading="loading">
      <el-table-column prop="name" label="收款码名称" min-width="150">
        <template #default="{ row }">
          <span style="font-weight: 600">{{ row.name }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="description" label="描述" min-width="150" show-overflow-tooltip />
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
      <el-table-column label="创建时间" width="160">
        <template #default="{ row }">{{ row.createdAt ? formatDate(row.createdAt) : '-' }}</template>
      </el-table-column>
      <el-table-column label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="row.isEnabled ? 'success' : 'info'" size="small">{{ row.isEnabled ? '启用' : '停用' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link size="small" @click="handleEdit(row)">编辑</el-button>
          <el-button type="success" link size="small" @click="showQrCode(row)">二维码</el-button>
          <el-button :type="row.isEnabled ? 'warning' : 'success'" link size="small" @click="toggleQrcode(row)">
            {{ row.isEnabled ? '停用' : '启用' }}
          </el-button>
          <el-button type="danger" link size="small" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 创建/编辑收款码弹窗 -->
    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑收款码' : '创建收款码'" width="560px" destroy-on-close>
      <el-form :model="form" label-width="100px" ref="formRef" :rules="formRules">
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" placeholder="如：标准产品收款" maxlength="30" show-word-limit />
        </el-form-item>
        <el-form-item label="描述">
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
          <span style="margin-left: 8px; font-size: 12px; color: #909399">单位: 分（即 ¥{{ (form.fixedAmount / 100).toFixed(2) }}）</span>
        </el-form-item>
        <el-form-item label="使用成员">
          <el-select v-model="form.members" multiple filterable allow-create placeholder="输入或选择使用成员" style="width: 100%">
            <el-option label="王销售" value="王销售" />
            <el-option label="陈经理" value="陈经理" />
            <el-option label="张客服" value="张客服" />
            <el-option label="李助理" value="李助理" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注模板">
          <el-input v-model="form.remarkTemplate" placeholder="如：购买{产品名}" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave" :loading="saving">保存</el-button>
      </template>
    </el-dialog>

    <!-- 二维码展示弹窗 -->
    <el-dialog v-model="qrVisible" title="收款码二维码" width="400px">
      <div class="qr-display" v-if="currentQr">
        <div class="qr-title">{{ currentQr.name }}</div>
        <div class="qr-image-wrapper">
          <canvas ref="qrCanvasRef" />
        </div>
        <div class="qr-info" v-if="currentQr.amountType === 'fixed'">
          固定金额: &yen;{{ (currentQr.fixedAmount / 100).toFixed(2) }}
        </div>
        <div class="qr-info" v-else>自定义金额</div>
        <div class="qr-stats">
          累计收款: <span style="color: #EF4444; font-weight: 600">&yen;{{ (currentQr.totalAmount / 100).toFixed(2) }}</span>
          &nbsp;|&nbsp; {{ currentQr.totalCount }} 笔
        </div>
        <div class="qr-url" v-if="qrDataUrl">
          <el-input :model-value="qrDataUrl" readonly size="small">
            <template #append>
              <el-button @click="copyQrUrl">复制</el-button>
            </template>
          </el-input>
        </div>
        <div style="display: flex; gap: 10px; margin-top: 12px">
          <el-button type="primary" style="flex: 1" @click="downloadQr">下载二维码</el-button>
          <el-button style="flex: 1" @click="copyQrUrl">复制链接</el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, nextTick, onMounted } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getWecomPaymentQrcodes, createWecomPaymentQrcode, updateWecomPaymentQrcode, deleteWecomPaymentQrcode } from '@/api/wecom'
import { formatDateTime } from '@/utils/date'
import QRCode from 'qrcode'

const props = defineProps<{ configId?: number | null }>()

const loading = ref(false)
const dialogVisible = ref(false)
const qrVisible = ref(false)
const editingId = ref<number | null>(null)
const saving = ref(false)
const formRef = ref()
const currentQr = ref<any>(null)
const qrCanvasRef = ref<HTMLCanvasElement>()
const qrDataUrl = ref('')
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
      ElMessage.success('收款码已更新')
    } else {
      await createWecomPaymentQrcode(data)
      ElMessage.success('收款码已创建')
    }
    dialogVisible.value = false
    fetchQrcodes()
  } catch (e: any) { ElMessage.error(e?.message || '保存失败') }
  finally { saving.value = false }
}

const showQrCode = async (row: any) => {
  currentQr.value = row
  // 生成二维码内容：收款码URL或信息摘要
  const qrContent = row.qrUrl || `wecom://pay?name=${encodeURIComponent(row.name)}&id=${row.id}&amount=${row.fixedAmount || 0}`
  qrDataUrl.value = qrContent
  qrVisible.value = true
  await nextTick()
  if (qrCanvasRef.value) {
    try {
      await QRCode.toCanvas(qrCanvasRef.value, qrContent, {
        width: 240, margin: 2,
        color: { dark: '#1F2937', light: '#FFFFFF' }
      })
    } catch (e) { console.error('QRCode generate error:', e) }
  }
}

const toggleQrcode = async (row: any) => {
  try {
    await updateWecomPaymentQrcode(row.id, { isEnabled: !row.isEnabled })
    row.isEnabled = !row.isEnabled
    ElMessage.success(row.isEnabled ? '已启用' : '已停用')
  } catch (e: any) { ElMessage.error(e?.message || '操作失败') }
}

const handleDelete = async (row: any) => {
  try { await ElMessageBox.confirm(`确认删除收款码"${row.name}"？`, '删除确认') } catch { return }
  try {
    await deleteWecomPaymentQrcode(row.id)
    ElMessage.success('已删除')
    fetchQrcodes()
  } catch (e: any) { ElMessage.error(e?.message || '删除失败') }
}

const copyQrUrl = () => {
  if (qrDataUrl.value) {
    navigator.clipboard.writeText(qrDataUrl.value).then(() => ElMessage.success('已复制到剪贴板')).catch(() => ElMessage.error('复制失败'))
  }
}

const downloadQr = () => {
  if (!qrCanvasRef.value) return
  const link = document.createElement('a')
  link.download = `收款码-${currentQr.value?.name || 'qr'}.png`
  link.href = qrCanvasRef.value.toDataURL('image/png')
  link.click()
  ElMessage.success('二维码已下载')
}

onMounted(() => fetchQrcodes())
</script>

<style scoped>
.filter-bar { background: #fff; border: 1px solid #EBEEF5; border-radius: 10px; padding: 16px 20px; margin-bottom: 16px; }
.filter-row { display: flex; gap: 8px; align-items: center; }
.result-count { font-size: 13px; color: #9CA3AF; }
.qr-display { text-align: center; }
.qr-title { font-size: 18px; font-weight: 600; margin-bottom: 16px; }
.qr-image-wrapper { display: flex; justify-content: center; margin-bottom: 12px; }
.qr-image-wrapper canvas { border: 1px solid #EBEEF5; border-radius: 8px; }
.qr-info { font-size: 14px; color: #1F2937; font-weight: 600; margin-bottom: 4px; }
.qr-stats { font-size: 13px; color: #6B7280; margin-bottom: 12px; }
.qr-url { margin-top: 8px; }
</style>

