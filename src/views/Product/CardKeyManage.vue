<template>
  <div class="card-key-manage">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h2>卡密库存管理</h2>
        <span class="header-desc">管理虚拟商品的卡密库存</span>
      </div>
      <div class="header-actions">
        <el-button @click="showAddDialog = true" type="primary" :icon="Plus">
          添加卡密
        </el-button>
        <el-button @click="showBatchImport = true" :icon="Upload">
          批量导入
        </el-button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-grid">
      <div class="stats-card blue">
        <div class="stats-card-icon">📦</div>
        <div class="stats-card-body">
          <div class="stats-card-value">{{ stats.total }}</div>
          <div class="stats-card-label">总数量</div>
        </div>
      </div>
      <div class="stats-card green">
        <div class="stats-card-icon">✅</div>
        <div class="stats-card-body">
          <div class="stats-card-value">{{ stats.unused }}</div>
          <div class="stats-card-label">未使用</div>
        </div>
      </div>
      <div class="stats-card amber">
        <div class="stats-card-icon">📤</div>
        <div class="stats-card-body">
          <div class="stats-card-value">{{ stats.used + stats.claimed }}</div>
          <div class="stats-card-label">已发出</div>
        </div>
      </div>
      <div class="stats-card purple">
        <div class="stats-card-icon">🔒</div>
        <div class="stats-card-body">
          <div class="stats-card-value">{{ stats.reserved }}</div>
          <div class="stats-card-label">已预占</div>
        </div>
      </div>
      <div class="stats-card red">
        <div class="stats-card-icon">🚫</div>
        <div class="stats-card-body">
          <div class="stats-card-value">{{ stats.voided }}</div>
          <div class="stats-card-label">已作废</div>
        </div>
      </div>
    </div>

    <!-- 筛选区 -->
    <el-card style="margin-bottom: 20px;">
      <el-form :model="filterForm" inline>
        <el-form-item label="关联商品">
          <el-select v-model="filterForm.productId" placeholder="选择商品" clearable style="width: 200px;">
            <el-option
              v-for="p in virtualProducts"
              :key="p.id"
              :label="p.name"
              :value="p.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filterForm.status" placeholder="全部状态" clearable style="width: 140px;">
            <el-option label="未使用" value="unused" />
            <el-option label="已预占" value="reserved" />
            <el-option label="已使用" value="used" />
            <el-option label="已领取" value="claimed" />
            <el-option label="已过期" value="expired" />
            <el-option label="已作废" value="voided" />
          </el-select>
        </el-form-item>
        <el-form-item label="搜索">
          <el-input v-model="filterForm.keyword" placeholder="搜索卡密编码" clearable style="width: 200px;" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadData">查询</el-button>
          <el-button @click="resetFilter">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 列表表格 -->
    <el-card>
      <div style="margin-bottom: 12px; display: flex; justify-content: flex-end; gap: 8px;">
        <el-button type="danger" :disabled="selectedRows.length === 0" @click="handleBatchVoid">批量作废</el-button>
        <el-button type="primary" :disabled="selectedRows.length === 0" @click="handleBatchRestore">批量恢复</el-button>
        <el-button type="danger" plain :disabled="selectedRows.length === 0" @click="handleBatchDelete">批量删除</el-button>
        <el-button :icon="Download" :disabled="selectedRows.length === 0" @click="handleBatchExport">批量导出</el-button>
        <el-button type="warning" :disabled="selectedRows.length === 0" @click="openAssociateDialog(selectedRows)">批量关联商品</el-button>
        <el-button :disabled="selectedRows.length === 0" @click="handleBatchDisassociate">批量取消关联</el-button>
      </div>
      <el-table :data="tableData" v-loading="loading" stripe @selection-change="handleSelectionChange" table-layout="auto">
        <el-table-column type="selection" width="42" />
        <el-table-column prop="cardKey" label="卡密编码" min-width="180" show-overflow-tooltip />
        <el-table-column prop="productName" label="关联商品" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="row.productName">{{ row.productName }}</span>
            <el-link v-else type="primary" @click="openAssociateDialog([row])">暂无关联商品，立即关联</el-link>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" size="small">{{ statusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="orderId" label="关联订单" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            <el-link v-if="row.orderId" type="primary" @click="router.push(`/order/detail/${row.orderId}`)">{{ row.orderNumber || row.orderId }}</el-link>
            <el-link v-else-if="row.reservedOrderId" type="warning" @click="router.push(`/order/detail/${row.reservedOrderId}`)">{{ row.reservedOrderNumber || row.reservedOrderId }}</el-link>
            <span v-else style="color: #909399;">--</span>
          </template>
        </el-table-column>
        <el-table-column prop="claimMethod" label="领取方式" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.claimMethod === 'customer_self'" type="primary" size="small">客户领取</el-tag>
            <el-tag v-else-if="row.claimMethod === 'member_send'" type="warning" size="small">成员发送</el-tag>
            <el-tag v-else-if="row.claimMethod === 'email_send'" type="success" size="small">邮件发送</el-tag>
            <span v-else style="color: #909399;">--</span>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="170">
          <template #default="{ row }">
            {{ formatTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="260" fixed="right">
          <template #default="{ row }">
            <div style="display: flex; align-items: center; gap: 4px; flex-wrap: nowrap;">
              <el-button size="small" type="primary" link @click="handleDetail(row)">详情</el-button>
              <template v-if="!['used','claimed'].includes(row.status)">
                <el-button v-if="row.status === 'unused' || row.status === 'reserved'" size="small" type="danger" link @click="handleVoid(row)">作废</el-button>
                <el-button v-if="row.status === 'expired' || row.status === 'voided'" size="small" type="primary" link @click="handleRestore(row)">恢复</el-button>
                <el-button v-if="['unused','voided','expired'].includes(row.status)" size="small" type="danger" link @click="handleDelete(row)">删除</el-button>
                <el-button size="small" type="warning" link @click="openAssociateDialog([row])">关联</el-button>
              </template>
              <el-tag v-else type="info" size="small" effect="light">已使用</el-tag>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        style="margin-top: 16px; justify-content: flex-end;"
        v-model:current-page="pagination.currentPage"
        v-model:page-size="pagination.pageSize"
        :total="pagination.total"
        :page-sizes="[10, 20, 50, 100, 200, 500, 1000]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="loadData"
        @current-change="loadData"
      />
    </el-card>

    <!-- 添加卡密对话框 -->
    <el-dialog v-model="showAddDialog" title="添加卡密" width="500px" @open="loadVirtualProducts">
      <el-form :model="addForm" label-width="100px">
        <el-form-item label="关联商品" required>
          <div style="display: flex; gap: 8px; width: 100%;">
            <el-select v-model="addForm.productId" placeholder="选择商品" filterable style="flex: 1;">
              <el-option
                v-for="p in virtualProducts.filter(p => p.virtualDeliveryType === 'card_key')"
                :key="p.id"
                :label="p.name"
                :value="p.id"
              />
            </el-select>
            <el-button :icon="Refresh" @click="loadVirtualProducts" title="刷新商品列表" />
          </div>
        </el-form-item>
        <el-form-item label="卡密编码" required>
          <el-input v-model="addForm.cardKey" placeholder="请输入卡密编码" />
        </el-form-item>
        <el-form-item label="使用说明">
          <el-input v-model="addForm.usageInstructions" type="textarea" :rows="3" placeholder="可选，填写使用说明（如兑换步骤、注意事项、有效期等）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="handleAdd">确认添加</el-button>
      </template>
    </el-dialog>

    <!-- 批量导入对话框 -->
    <el-dialog v-model="showBatchImport" title="批量导入卡密" width="640px" @open="loadVirtualProducts">
      <el-form label-width="100px">
        <el-form-item label="关联商品" required>
          <div style="display: flex; gap: 8px; width: 100%;">
            <el-select v-model="importForm.productId" placeholder="选择商品" filterable style="flex: 1;">
              <el-option
                v-for="p in virtualProducts.filter(p => p.virtualDeliveryType === 'card_key')"
                :key="p.id"
                :label="p.name"
                :value="p.id"
              />
            </el-select>
            <el-button :icon="Refresh" @click="loadVirtualProducts" title="刷新商品列表" />
          </div>
        </el-form-item>
        <el-form-item label="使用说明">
          <el-input
            v-model="importForm.usageInstructions"
            type="textarea"
            :rows="3"
            placeholder="可选，为本次批量导入的卡密设置统一使用说明（如兑换步骤、注意事项、有效期等）"
          />
        </el-form-item>
        <el-form-item label="导入方式">
          <el-radio-group v-model="importForm.method">
            <el-radio label="text">文本粘贴</el-radio>
            <el-radio label="file">文件上传</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="importForm.method === 'text'" label="卡密列表">
          <el-input
            v-model="importForm.textContent"
            type="textarea"
            :rows="8"
            placeholder="每行一个卡密编码，支持批量粘贴"
          />
          <div style="font-size: 12px; color: #909399; margin-top: 4px;">
            每行一个卡密编码，自动去除重复和空行
          </div>
        </el-form-item>
        <el-form-item v-if="importForm.method === 'file'" label="上传文件">
          <div class="import-file-actions">
            <el-upload
              :auto-upload="false"
              accept=".xlsx,.xls,.csv,.txt"
              :limit="1"
              @change="handleFileChange"
              class="import-upload"
            >
              <el-button type="primary" :icon="Upload">选择文件</el-button>
            </el-upload>
            <el-button type="success" :icon="Download" @click="downloadCardKeyTemplate">下载导入模板</el-button>
          </div>
          <div class="el-upload__tip" style="margin-top: 8px;">
            支持 xlsx/xls/csv/txt 格式，每行一个卡密编码（A列）
          </div>
        </el-form-item>
        <el-alert v-if="importForm.method === 'text' && importForm.textContent"
          :title="`已检测到 ${importForm.textContent.split('\n').filter(s => s.trim()).length} 个卡密`"
          type="info" :closable="false" style="margin-top: 8px;"
        />
      </el-form>
      <template #footer>
        <el-button @click="showBatchImport = false">取消</el-button>
        <el-button type="primary" @click="handleBatchImport">确认导入</el-button>
      </template>
    </el-dialog>
    <!-- 详情对话框 -->
    <el-dialog v-model="showDetailDialog" title="卡密详情" width="560px">
      <el-descriptions :column="1" border v-if="detailData">
        <el-descriptions-item label="卡密编码">{{ detailData.cardKey }}</el-descriptions-item>
        <el-descriptions-item label="关联商品">{{ detailData.productName }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="statusTagType(detailData.status)" size="small">{{ statusText(detailData.status) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="关联订单">
          <el-link v-if="detailData.orderId" type="primary" @click="router.push(`/order/detail/${detailData.orderId}`)">{{ detailData.orderId }}</el-link>
          <span v-else>--</span>
        </el-descriptions-item>
        <el-descriptions-item label="领取方式">
          <span v-if="detailData.claimMethod === 'customer_self'">客户领取</span>
          <span v-else-if="detailData.claimMethod === 'member_send'">成员发送</span>
          <span v-else-if="detailData.claimMethod === 'email_send'">邮件发送</span>
          <span v-else>--</span>
        </el-descriptions-item>
        <el-descriptions-item label="领取时间">{{ detailData.claimedAt ? formatTime(detailData.claimedAt) : '--' }}</el-descriptions-item>
        <el-descriptions-item label="使用说明">{{ detailData.usageInstructions || '--' }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ formatTime(detailData.createdAt) }}</el-descriptions-item>
        <el-descriptions-item label="更新时间">{{ formatTime(detailData.updatedAt) }}</el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="showDetailDialog = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 关联商品对话框 -->
    <el-dialog v-model="showAssociateDialog" title="关联商品" width="420px" @open="loadVirtualProducts">
      <el-form label-width="80px">
        <el-form-item label="选择商品">
          <div style="display: flex; gap: 8px; width: 100%;">
            <el-select v-model="associateProductId" placeholder="选择要关联的虚拟商品" style="flex: 1;" filterable>
              <el-option v-for="p in virtualProducts" :key="p.id" :label="p.name" :value="p.id" />
            </el-select>
            <el-button :icon="Refresh" @click="loadVirtualProducts" title="刷新商品列表" />
          </div>
        </el-form-item>
        <el-form-item>
          <span style="font-size: 12px; color: #909399;">将选中的 {{ associateTargetIds.length }} 条卡密关联到所选商品</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAssociateDialog = false">取消</el-button>
        <el-button type="primary" :loading="associateLoading" @click="confirmAssociate">确认关联</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Upload, Download, Refresh } from '@element-plus/icons-vue'
import { useProductStore } from '@/stores/product'
import { apiService } from '@/services/apiService'
import { formatTime } from '@/utils/date'

const route = useRoute()
const router = useRouter()
const productStore = useProductStore()

const loading = ref(false)
const showAddDialog = ref(false)
const showBatchImport = ref(false)
const tableData = ref<any[]>([])

// 虚拟商品列表
const virtualProducts = ref<any[]>([])

// 统计数据
const stats = reactive({
  total: 0,
  unused: 0,
  used: 0,
  claimed: 0,
  reserved: 0,
  expired: 0,
  voided: 0
})

// 筛选
const filterForm = reactive({
  productId: '',
  status: '',
  keyword: ''
})

// 分页
const pagination = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 0
})

// 勾选行
const selectedRows = ref<any[]>([])
const handleSelectionChange = (rows: any[]) => {
  selectedRows.value = rows
}

// 添加表单
const addForm = reactive({
  productId: '',
  cardKey: '',
  usageInstructions: ''
})

// 导入表单
const importForm = reactive({
  productId: '',
  method: 'text',
  textContent: '',
  usageInstructions: '',
  file: null as File | null
})

const statusTagType = (status: string) => {
  const map: Record<string, string> = {
    unused: 'success',
    reserved: 'warning',
    used: 'info',
    claimed: '',
    expired: '',
    voided: 'danger'
  }
  return map[status] || ''
}

const statusText = (status: string) => {
  const map: Record<string, string> = {
    unused: '未使用',
    reserved: '已预占',
    used: '已使用',
    claimed: '已领取',
    expired: '已过期',
    voided: '已作废'
  }
  return map[status] || status
}

const loadData = async () => {
  loading.value = true
  try {
    const params: any = {
      page: pagination.currentPage,
      pageSize: pagination.pageSize
    }
    if (filterForm.productId) params.productId = filterForm.productId
    if (filterForm.status) params.status = filterForm.status
    if (filterForm.keyword) params.keyword = filterForm.keyword

    const statsParams: any = {}
    if (filterForm.productId) statsParams.productId = filterForm.productId

    // 并行加载列表和统计，互不阻断
    const [listResult, statsResult] = await Promise.allSettled([
      apiService.get('/virtual-inventory/card-keys', params),
      apiService.get('/virtual-inventory/card-keys/stats', statsParams)
    ])

    if (listResult.status === 'fulfilled') {
      const data = listResult.value
      tableData.value = data.list || []
      pagination.total = data.total || 0
    } else {
      console.error('加载卡密列表失败:', listResult.reason)
      tableData.value = []
      pagination.total = 0
    }

    if (statsResult.status === 'fulfilled') {
      Object.assign(stats, statsResult.value)
    } else {
      console.warn('加载卡密统计失败:', statsResult.reason)
    }
  } catch (err: any) {
    console.error('加载卡密数据失败:', err)
  } finally {
    loading.value = false
  }
}

const resetFilter = () => {
  filterForm.productId = ''
  filterForm.status = ''
  filterForm.keyword = ''
  pagination.currentPage = 1
  loadData()
}

const handleAdd = async () => {
  if (!addForm.productId || !addForm.cardKey) {
    ElMessage.warning('请填写必要信息')
    return
  }
  try {
    await apiService.post('/virtual-inventory/card-keys', {
      productId: addForm.productId,
      cardKey: addForm.cardKey,
      usageInstructions: addForm.usageInstructions || null
    })
    ElMessage.success('卡密添加成功')
    showAddDialog.value = false
    addForm.cardKey = ''
    addForm.usageInstructions = ''
    await loadData()
  } catch (err: any) {
    ElMessage.error(err?.message || '添加失败')
  }
}

const handleBatchImport = async () => {
  if (!importForm.productId) {
    ElMessage.warning('请选择关联商品')
    return
  }

  let cardKeys: string[] = []

  if (importForm.method === 'text') {
    cardKeys = importForm.textContent
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0)
  } else if (importForm.file) {
    // 简单文本文件读取
    const text = await importForm.file.text()
    cardKeys = text.split('\n').map(s => s.trim()).filter(s => s.length > 0)
  }

  if (cardKeys.length === 0) {
    ElMessage.warning('未检测到有效卡密数据')
    return
  }

  try {
    const result = await apiService.post('/virtual-inventory/card-keys/batch', {
      productId: importForm.productId,
      cardKeys,
      usageInstructions: importForm.usageInstructions || null
    })
    ElMessage.success(`导入成功 ${result.success} 条，重复跳过 ${result.duplicate} 条`)
    showBatchImport.value = false
    importForm.textContent = ''
    importForm.usageInstructions = ''
    importForm.file = null
    await loadData()
  } catch (err: any) {
    ElMessage.error(err?.message || '批量导入失败')
  }
}

const handleFileChange = (file: any) => {
  const raw = file.raw || file
  if (!raw) return
  // 使用xlsx库正确解析文件，避免乱码
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      import('xlsx').then(XLSX => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as unknown[][]
        // 从A列提取卡密（跳过表头）
        const keys: string[] = []
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i]
          if (row && row[0]) {
            const val = String(row[0]).trim()
            if (val) keys.push(val)
          }
        }
        if (keys.length > 0) {
          importForm.textContent = keys.join('\n')
          importForm.method = 'text'
          ElMessage.success(`文件解析成功，共 ${keys.length} 条卡密`)
        } else {
          ElMessage.warning('文件中未检测到有效卡密数据')
        }
      }).catch(() => {
        ElMessage.error('文件解析失败，请确保格式正确')
      })
    } catch {
      ElMessage.error('文件读取失败')
    }
  }
  reader.readAsArrayBuffer(raw)
}

// 详情对话框
const showDetailDialog = ref(false)
const detailData = ref<any>(null)

const handleDetail = async (row: any) => {
  try {
    const data = await apiService.get(`/virtual-inventory/card-keys/${row.id}`)
    detailData.value = data
    showDetailDialog.value = true
  } catch {
    detailData.value = row
    showDetailDialog.value = true
  }
}

const handleDelete = async (row: any) => {
  try {
    await ElMessageBox.confirm('确定要删除该卡密吗？删除后不可恢复！', '确认删除', { type: 'warning' })
    await apiService.delete(`/virtual-inventory/card-keys/${row.id}`)
    ElMessage.success('删除成功')
    loadData()
  } catch {}
}

const handleBatchExport = async () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请先勾选要导出的数据')
    return
  }
  try {
    const XLSX = await import('xlsx')
    const headers = ['卡密编码', '关联商品', '状态', '关联订单', '领取方式', '创建时间']
    const data = selectedRows.value.map((row: any) => [
      row.cardKey,
      row.productName,
      statusText(row.status),
      row.orderId || '',
      row.claimMethod === 'customer_self' ? '客户领取' : row.claimMethod === 'member_send' ? '成员发送' : row.claimMethod === 'email_send' ? '邮件发送' : '',
      row.createdAt || ''
    ])
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data])
    ws['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 10 }, { wch: 20 }, { wch: 12 }, { wch: 22 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '卡密导出')
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
    XLSX.writeFile(wb, `卡密导出_${timestamp}.xlsx`)
    ElMessage.success(`导出成功，共 ${data.length} 条`)
  } catch {
    ElMessage.error('导出失败')
  }
}

const downloadCardKeyTemplate = async () => {
  try {
    const XLSX = await import('xlsx')
    const headers = ['卡密编码']
    const sampleData = [['XXXX-XXXX-XXXX-XXXX'], ['YYYY-YYYY-YYYY-YYYY']]
    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData])
    ws['!cols'] = [{ wch: 30 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '卡密导入模板')
    XLSX.writeFile(wb, '卡密导入模板.xlsx')
    ElMessage.success('模板下载成功')
  } catch {
    ElMessage.error('下载失败')
  }
}

const handleVoid = async (_row: any) => {
  try {
    await ElMessageBox.confirm('确定要作废该卡密吗？', '确认操作', { type: 'warning' })
    await apiService.put(`/virtual-inventory/card-keys/${_row.id}`, { status: 'voided' })
    ElMessage.success('作废成功')
    loadData()
  } catch {}
}

const handleRestore = async (_row: any) => {
  try {
    await ElMessageBox.confirm('确定要恢复该卡密吗？', '确认操作', { type: 'info' })
    await apiService.put(`/virtual-inventory/card-keys/${_row.id}`, { status: 'unused' })
    ElMessage.success('恢复成功')
    loadData()
  } catch {}
}

// 批量作废
const handleBatchVoid = async () => {
  const rows = selectedRows.value.filter(r => r.status === 'unused')
  if (rows.length === 0) { ElMessage.warning('所选项中没有可作废的卡密（仅未使用状态可作废）'); return }
  try {
    await ElMessageBox.confirm(`确定要作废选中的 ${rows.length} 个卡密吗？`, '批量作废', { type: 'warning' })
    let ok = 0, fail = 0
    for (const row of rows) {
      try { await apiService.put(`/virtual-inventory/card-keys/${row.id}`, { status: 'voided' }); ok++ } catch { fail++ }
    }
    ElMessage.success(`批量作废完成：成功 ${ok}，失败 ${fail}`)
    await loadData()
  } catch {}
}

// 批量恢复
const handleBatchRestore = async () => {
  const rows = selectedRows.value.filter(r => ['voided', 'expired'].includes(r.status))
  if (rows.length === 0) { ElMessage.warning('所选项中没有可恢复的卡密（仅已作废/已过期可恢复）'); return }
  try {
    await ElMessageBox.confirm(`确定要恢复选中的 ${rows.length} 个卡密吗？`, '批量恢复', { type: 'info' })
    let ok = 0, fail = 0
    for (const row of rows) {
      try { await apiService.put(`/virtual-inventory/card-keys/${row.id}`, { status: 'unused' }); ok++ } catch { fail++ }
    }
    ElMessage.success(`批量恢复完成：成功 ${ok}，失败 ${fail}`)
    await loadData()
  } catch {}
}

// 批量删除
const handleBatchDelete = async () => {
  const rows = selectedRows.value.filter(r => ['unused', 'voided', 'expired'].includes(r.status))
  if (rows.length === 0) { ElMessage.warning('所选项中没有可删除的卡密（已使用/已领取/已预占不可删除）'); return }
  try {
    await ElMessageBox.confirm(`确定要删除选中的 ${rows.length} 个卡密吗？删除后不可恢复！`, '批量删除', { type: 'warning' })
    let ok = 0, fail = 0
    for (const row of rows) {
      try { await apiService.delete(`/virtual-inventory/card-keys/${row.id}`); ok++ } catch { fail++ }
    }
    ElMessage.success(`批量删除完成：成功 ${ok}，失败 ${fail}`)
    await loadData()
  } catch {}
}

const loadVirtualProducts = async () => {
  try {
    // 优先使用虚拟库存专用API获取虚拟商品
    const data = await apiService.get('/virtual-inventory/products', { deliveryType: 'card_key' })
    virtualProducts.value = Array.isArray(data) ? data : []
  } catch (_error) {
    console.warn('通过专用API加载虚拟商品失败，尝试从商品列表获取:', _error)
    try {
      await productStore.loadProducts({ productType: 'virtual' })
      virtualProducts.value = (productStore.products || []).filter((p: any) => p.productType === 'virtual')
    } catch (e) {
      console.error('加载虚拟商品失败:', e)
      virtualProducts.value = []
    }
  }
}

// ==================== 关联商品功能 ====================
const showAssociateDialog = ref(false)
const associateProductId = ref('')
const associateTargetIds = ref<string[]>([])
const associateLoading = ref(false)

const openAssociateDialog = (rows: any[]) => {
  const protectedStatuses = ['used', 'claimed', 'reserved']
  const safeRows = rows.filter(r => !protectedStatuses.includes(r.status))
  if (safeRows.length === 0) {
    ElMessage.warning('所选卡密均已被使用/领取/预占，无法修改关联')
    return
  }
  if (safeRows.length < rows.length) {
    ElMessage.info(`已自动跳过 ${rows.length - safeRows.length} 个已使用/领取/预占的卡密`)
  }
  associateTargetIds.value = safeRows.map(r => r.id)
  associateProductId.value = ''
  showAssociateDialog.value = true
}

const confirmAssociate = async () => {
  if (!associateProductId.value) {
    ElMessage.warning('请选择要关联的商品')
    return
  }
  associateLoading.value = true
  try {
    await apiService.put('/virtual-inventory/card-keys/batch-associate', {
      ids: associateTargetIds.value,
      productId: associateProductId.value
    })
    ElMessage.success('关联成功')
    showAssociateDialog.value = false
    loadData()
  } catch (_e) {
    ElMessage.error('关联失败')
  } finally {
    associateLoading.value = false
  }
}

const handleBatchDisassociate = async () => {
  if (selectedRows.value.length === 0) return
  const protectedStatuses = ['used', 'claimed', 'reserved']
  const safeRows = selectedRows.value.filter(r => !protectedStatuses.includes(r.status))
  if (safeRows.length === 0) {
    ElMessage.warning('所选卡密均已被使用/领取/预占，无法取消关联')
    return
  }
  try {
    const skipCount = selectedRows.value.length - safeRows.length
    const msg = skipCount > 0
      ? `将取消 ${safeRows.length} 条卡密的商品关联（跳过 ${skipCount} 条已使用/领取/预占）`
      : `确定取消 ${safeRows.length} 条卡密的商品关联？`
    await ElMessageBox.confirm(msg, '确认取消关联', { type: 'warning' })
    await apiService.put('/virtual-inventory/card-keys/batch-associate', {
      ids: safeRows.map(r => r.id),
      productId: null
    })
    ElMessage.success('取消关联成功')
    loadData()
  } catch (_e) {
    // cancelled or error
  }
}

// ==================== 自动刷新：监控订单创建后库存状态变化 ====================
let pollTimer: ReturnType<typeof setInterval> | null = null
const POLL_INTERVAL = 30000 // 30秒轮询

const startPolling = () => {
  stopPolling()
  pollTimer = setInterval(() => {
    loadData()
  }, POLL_INTERVAL)
}

const stopPolling = () => {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

// 监听全局订单事件（订单创建/状态变化时立即刷新）
const handleOrderEvent = () => {
  ElMessage.info('检测到订单变化，正在刷新库存数据...')
  loadData()
}

onMounted(() => {
  loadVirtualProducts()
  if (route.query.productId) {
    filterForm.productId = route.query.productId as string
  }
  loadData()
  startPolling()
  window.addEventListener('order-created', handleOrderEvent)
  window.addEventListener('order-status-update', handleOrderEvent as EventListener)
})

onUnmounted(() => {
  stopPolling()
  window.removeEventListener('order-created', handleOrderEvent)
  window.removeEventListener('order-status-update', handleOrderEvent as EventListener)
})
</script>

<style scoped>
.card-key-manage {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-left h2 {
  margin: 0;
  color: #303133;
  font-size: 20px;
  font-weight: 600;
}

.header-desc {
  color: #606266;
  font-size: 13px;
  display: block;
  margin-top: 4px;
}

/* 统计卡片 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}
.stats-card {
  display: flex;
  align-items: center;
  gap: 16px;
  background: #fff;
  border: 1px solid #EBEEF5;
  border-radius: 14px;
  padding: 20px 24px;
  transition: all 0.3s;
}
.stats-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0,0,0,0.08);
}
.stats-card-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
}
.stats-card.blue .stats-card-icon { background: #EEF2FF; }
.stats-card.green .stats-card-icon { background: #ECFDF5; }
.stats-card.amber .stats-card-icon { background: #FFFBEB; }
.stats-card.purple .stats-card-icon { background: #F5F3FF; }
.stats-card.red .stats-card-icon { background: #FEF2F2; }
.stats-card-body { flex: 1; }
.stats-card-value {
  font-size: 28px;
  font-weight: 700;
  line-height: 1.2;
  color: #1F2937;
}
.stats-card.blue .stats-card-value { color: #4C6EF5; }
.stats-card.green .stats-card-value { color: #10B981; }
.stats-card.amber .stats-card-value { color: #F59E0B; }
.stats-card.purple .stats-card-value { color: #7C3AED; }
.stats-card.red .stats-card-value { color: #EF4444; }
.stats-card-label {
  font-size: 13px;
  color: #9CA3AF;
  margin-top: 4px;
}

/* 导入文件按钮横向排列 */
.import-file-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
.import-file-actions .import-upload {
  display: inline-flex;
  align-items: center;
  margin: 0;
}
.import-file-actions .import-upload :deep(.el-upload) {
  display: inline-flex;
  align-items: center;
  margin: 0;
}
.import-file-actions .import-upload :deep(.el-upload-list) {
  display: none;
}
.import-file-actions > .el-button {
  margin: 0;
}
</style>


