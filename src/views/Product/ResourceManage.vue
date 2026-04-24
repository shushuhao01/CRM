<template>
  <div class="resource-manage">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h2>资源库存管理</h2>
        <span class="header-desc">管理虚拟商品的网盘资源库存</span>
      </div>
      <div class="header-actions">
        <el-button @click="showAddDialog = true" type="primary" :icon="Plus">
          添加资源
        </el-button>
        <el-button @click="showBatchImport = true" :icon="Upload">
          批量导入
        </el-button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <el-row :gutter="16" style="margin-bottom: 20px;">
      <el-col :span="6">
        <el-card shadow="hover">
          <el-statistic title="总数量" :value="stats.total" />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <el-statistic title="未使用" :value="stats.unused" />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <el-statistic title="已使用" :value="stats.used" />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <el-statistic title="已领取" :value="stats.claimed" />
        </el-card>
      </el-col>
    </el-row>

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
          <el-input v-model="filterForm.keyword" placeholder="搜索资源链接" clearable style="width: 200px;" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadData">查询</el-button>
          <el-button @click="resetFilter">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 列表表格 -->
    <el-card>
      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column prop="resourceLink" label="资源链接" min-width="250" show-overflow-tooltip />
        <el-table-column prop="resourcePassword" label="提取码" width="120" />
        <el-table-column prop="productName" label="关联商品" min-width="150" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" size="small">{{ statusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="orderId" label="关联订单" width="150" show-overflow-tooltip />
        <el-table-column prop="createdAt" label="创建时间" width="160" />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.status === 'unused'" size="small" type="danger" link @click="handleVoid(row)">作废</el-button>
            <el-button v-if="row.status === 'expired' || row.status === 'voided'" size="small" type="primary" link @click="handleRestore(row)">恢复</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        style="margin-top: 16px; justify-content: flex-end;"
        v-model:current-page="pagination.currentPage"
        v-model:page-size="pagination.pageSize"
        :total="pagination.total"
        :page-sizes="[20, 50, 100]"
        layout="total, sizes, prev, pager, next"
        @size-change="loadData"
        @current-change="loadData"
      />
    </el-card>

    <!-- 添加资源对话框 -->
    <el-dialog v-model="showAddDialog" title="添加资源" width="500px">
      <el-form :model="addForm" label-width="100px">
        <el-form-item label="关联商品" required>
          <el-select v-model="addForm.productId" placeholder="选择商品" style="width: 100%;">
            <el-option
              v-for="p in virtualProducts.filter(p => p.virtualDeliveryType === 'resource_link')"
              :key="p.id"
              :label="p.name"
              :value="p.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="资源链接" required>
          <el-input v-model="addForm.resourceLink" placeholder="请输入资源链接" />
        </el-form-item>
        <el-form-item label="提取码">
          <el-input v-model="addForm.resourcePassword" placeholder="可选，填写提取码" />
        </el-form-item>
        <el-form-item label="资源说明">
          <el-input v-model="addForm.resourceDescription" type="textarea" :rows="3" placeholder="可选，填写资源说明" />
        </el-form-item>
        <el-form-item label="使用说明">
          <el-input v-model="addForm.usageInstructions" type="textarea" :rows="3" placeholder="可选，填写使用说明（如兑换步骤、注意事项等）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="handleAdd">确认添加</el-button>
      </template>
    </el-dialog>

    <!-- 批量导入对话框 -->
    <el-dialog v-model="showBatchImport" title="批量导入资源" width="640px">
      <el-form label-width="100px">
        <el-form-item label="关联商品" required>
          <el-select v-model="importForm.productId" placeholder="选择商品" style="width: 100%;">
            <el-option
              v-for="p in virtualProducts.filter(p => p.virtualDeliveryType === 'resource_link')"
              :key="p.id"
              :label="p.name"
              :value="p.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="使用说明">
          <el-input
            v-model="importForm.usageInstructions"
            type="textarea"
            :rows="3"
            placeholder="可选，为本次批量导入的资源设置统一使用说明（如访问步骤、注意事项等）"
          />
        </el-form-item>
        <el-form-item label="导入方式">
          <el-radio-group v-model="importForm.method">
            <el-radio label="text">文本粘贴</el-radio>
            <el-radio label="file">文件上传</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="importForm.method === 'text'" label="资源列表">
          <el-input
            v-model="importForm.textContent"
            type="textarea"
            :rows="8"
            placeholder="每行一条资源，格式：资源链接|提取码|说明（提取码和说明可选，用|分隔）"
          />
          <div style="font-size: 12px; color: #909399; margin-top: 4px;">
            示例：https://pan.baidu.com/s/xxx|abcd|视频教程资源
          </div>
        </el-form-item>
        <el-form-item v-if="importForm.method === 'file'" label="上传文件">
          <el-upload
            :auto-upload="false"
            accept=".xlsx,.xls,.csv"
            :limit="1"
            @change="handleFileChange"
          >
            <el-button type="primary">选择文件</el-button>
            <template #tip>
              <div class="el-upload__tip">支持 xlsx/xls/csv 格式，A列资源链接，B列提取码，C列说明</div>
            </template>
          </el-upload>
        </el-form-item>
        <el-alert v-if="importForm.method === 'text' && importForm.textContent"
          :title="`已检测到 ${importForm.textContent.split('\n').filter(s => s.trim()).length} 条资源`"
          type="info" :closable="false" style="margin-top: 8px;"
        />
      </el-form>
      <template #footer>
        <el-button @click="showBatchImport = false">取消</el-button>
        <el-button type="primary" @click="handleBatchImport">确认导入</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Upload } from '@element-plus/icons-vue'
import { useProductStore } from '@/stores/product'
import { apiService } from '@/services/apiService'

const route = useRoute()
const productStore = useProductStore()

const loading = ref(false)
const showAddDialog = ref(false)
const showBatchImport = ref(false)
const tableData = ref<any[]>([])
const virtualProducts = ref<any[]>([])

const stats = reactive({ total: 0, unused: 0, used: 0, claimed: 0, reserved: 0, expired: 0 })

const filterForm = reactive({ productId: '', status: '', keyword: '' })
const pagination = reactive({ currentPage: 1, pageSize: 20, total: 0 })

const addForm = reactive({ productId: '', resourceLink: '', resourcePassword: '', resourceDescription: '', usageInstructions: '' })
const importForm = reactive({ productId: '', method: 'text' as 'text' | 'file', textContent: '', usageInstructions: '', file: null as File | null })

const statusTagType = (status: string) => {
  const map: Record<string, string> = { unused: 'success', reserved: 'warning', used: 'info', claimed: '', expired: '', voided: 'danger' }
  return map[status] || ''
}

const statusText = (status: string) => {
  const map: Record<string, string> = { unused: '未使用', reserved: '已预占', used: '已使用', claimed: '已领取', expired: '已过期', voided: '已作废' }
  return map[status] || status
}

const loadData = async () => {
  loading.value = true
  try {
    const params: any = { page: pagination.currentPage, pageSize: pagination.pageSize }
    if (filterForm.productId) params.productId = filterForm.productId
    if (filterForm.status) params.status = filterForm.status
    if (filterForm.keyword) params.keyword = filterForm.keyword

    const data = await apiService.get('/virtual-inventory/resources', params)
    tableData.value = data.list || []
    pagination.total = data.total || 0

    const statsParams: any = {}
    if (filterForm.productId) statsParams.productId = filterForm.productId
    const statsData = await apiService.get('/virtual-inventory/resources/stats', statsParams)
    Object.assign(stats, statsData)
  } catch (err: any) {
    console.error('加载资源数据失败:', err)
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
  if (!addForm.productId || !addForm.resourceLink) {
    ElMessage.warning('请填写必要信息')
    return
  }
  try {
    await apiService.post('/virtual-inventory/resources', {
      productId: addForm.productId,
      resourceLink: addForm.resourceLink,
      resourcePassword: addForm.resourcePassword || null,
      resourceDescription: addForm.resourceDescription || null,
      usageInstructions: addForm.usageInstructions || null
    })
    ElMessage.success('资源添加成功')
    showAddDialog.value = false
    addForm.resourceLink = ''
    addForm.resourcePassword = ''
    addForm.resourceDescription = ''
    loadData()
  } catch (err: any) {
    ElMessage.error(err?.message || '添加失败')
  }
}

const handleBatchImport = async () => {
  if (!importForm.productId) {
    ElMessage.warning('请选择关联商品')
    return
  }

  let resources: Array<{ resourceLink: string; resourcePassword?: string; resourceDescription?: string }> = []

  if (importForm.method === 'text') {
    const lines = importForm.textContent.split('\n').map(s => s.trim()).filter(s => s.length > 0)
    resources = lines.map(line => {
      const parts = line.split('|')
      return {
        resourceLink: parts[0]?.trim() || '',
        resourcePassword: parts[1]?.trim() || undefined,
        resourceDescription: parts[2]?.trim() || undefined
      }
    }).filter(r => r.resourceLink)
  } else if (importForm.file) {
    const text = await importForm.file.text()
    const lines = text.split('\n').map(s => s.trim()).filter(s => s.length > 0)
    resources = lines.map(line => {
      const parts = line.split(/[,|\t]/)
      return {
        resourceLink: parts[0]?.trim() || '',
        resourcePassword: parts[1]?.trim() || undefined,
        resourceDescription: parts[2]?.trim() || undefined
      }
    }).filter(r => r.resourceLink)
  }

  if (resources.length === 0) {
    ElMessage.warning('未检测到有效资源数据')
    return
  }

  try {
    const result = await apiService.post('/virtual-inventory/resources/batch', {
      productId: importForm.productId,
      resources,
      usageInstructions: importForm.usageInstructions || null
    })
    ElMessage.success(`导入成功 ${result.success} 条`)
    showBatchImport.value = false
    importForm.textContent = ''
    importForm.usageInstructions = ''
    importForm.file = null
    loadData()
  } catch (err: any) {
    ElMessage.error(err?.message || '批量导入失败')
  }
}

const handleFileChange = (file: any) => { importForm.file = file.raw }

const handleVoid = async (_row: any) => {
  try {
    await ElMessageBox.confirm('确定要作废该资源吗？', '确认操作', { type: 'warning' })
    await apiService.put(`/virtual-inventory/resources/${_row.id}`, { status: 'voided' })
    ElMessage.success('作废成功')
    loadData()
  } catch {}
}

const handleRestore = async (_row: any) => {
  try {
    await ElMessageBox.confirm('确定要恢复该资源吗？', '确认操作', { type: 'info' })
    await apiService.put(`/virtual-inventory/resources/${_row.id}`, { status: 'unused' })
    ElMessage.success('恢复成功')
    loadData()
  } catch {}
}

const loadVirtualProducts = async () => {
  try {
    const data = await apiService.get('/virtual-inventory/products', { deliveryType: 'resource_link' })
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

onMounted(() => {
  loadVirtualProducts()
  if (route.query.productId) filterForm.productId = route.query.productId as string
  loadData()
})
</script>

<style scoped>
.resource-manage { padding: 20px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.header-left h2 { margin: 0; color: #303133; font-size: 20px; font-weight: 600; }
.header-desc { color: #606266; font-size: 13px; display: block; margin-top: 4px; }
</style>
