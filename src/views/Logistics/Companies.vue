<template>
  <div class="logistics-companies">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2>物流公司管理</h2>
      <div class="header-actions">
        <el-button @click="handleAdd" type="primary" :icon="Plus">
          新增物流公司
        </el-button>
        <el-button @click="handleImport" :icon="Upload">
          导入数据
        </el-button>
        <el-button @click="handleExport" :icon="Download">
          导出数据
        </el-button>
      </div>
    </div>

    <!-- 搜索筛选 -->
    <el-card class="search-card">
      <el-form :model="searchForm" :inline="true" class="search-form">
        <el-form-item label="公司名称">
          <el-input
            v-model="searchForm.name"
            placeholder="请输入公司名称"
            clearable
            style="width: 200px"
          />
        </el-form-item>
        <el-form-item label="公司代码">
          <el-input
            v-model="searchForm.code"
            placeholder="请输入公司代码"
            clearable
            style="width: 150px"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select
            v-model="searchForm.status"
            placeholder="请选择状态"
            clearable
            style="width: 120px"
          >
            <el-option label="启用" value="active" />
            <el-option label="禁用" value="inactive" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button @click="handleSearch" type="primary" :icon="Search">
            搜索
          </el-button>
          <el-button @click="handleReset" :icon="Refresh">
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 数据表格 -->
    <el-card class="table-card">
      <el-table :data="tableData" style="width: 100%" v-loading="loading">
        <el-table-column label="启用" width="80" fixed="left">
          <template #default="{ row }">
            <el-switch
              v-model="row.status"
              active-value="active"
              inactive-value="inactive"
              @change="handleStatusChange(row)"
              :loading="row.statusLoading"
            />
          </template>
        </el-table-column>
        <el-table-column prop="logo" label="Logo" width="80">
          <template #default="{ row }">
            <el-avatar :src="row.logo" :size="40" shape="square">
              {{ row.name.charAt(0) }}
            </el-avatar>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="公司名称" width="150" />
        <el-table-column prop="code" label="公司代码" width="120" />
        <el-table-column prop="website" label="官网" width="200">
          <template #default="{ row }">
            <el-link :href="row.website" target="_blank" type="primary">
              {{ row.website }}
            </el-link>
          </template>
        </el-table-column>
        <el-table-column prop="trackingUrl" label="跟踪地址" show-overflow-tooltip min-width="200" />
        <el-table-column prop="contactPhone" label="联系电话" width="120" />
        <el-table-column prop="createdAt" label="创建时间" width="170">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button @click="handleEdit(row)" type="primary" link size="small">
              编辑
            </el-button>
            <el-button
              v-if="row.code === 'SF'"
              @click="handleSFConfig(row)"
              type="warning"
              link
              size="small"
            >
              <el-icon><Setting /></el-icon>
              配置
            </el-button>
            <el-button
              v-if="row.code === 'YTO'"
              @click="handleYTOConfig(row)"
              type="warning"
              link
              size="small"
            >
              <el-icon><Setting /></el-icon>
              配置
            </el-button>
            <el-button @click="handleDelete(row)" type="danger" link size="small">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.size"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 顺丰配置对话框 -->
    <SFExpressConfigDialog
      v-model:visible="sfConfigVisible"
      :config="sfConfig"
      @success="handleSFConfigSuccess"
    />

    <!-- 圆通配置对话框 -->
    <YTOExpressConfigDialog
      v-model:visible="ytoConfigVisible"
      :config="ytoConfig"
      @success="handleYTOConfigSuccess"
    />

    <!-- 新增/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="600px"
      :before-close="handleDialogClose"
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="100px"
      >
        <el-form-item label="公司名称" prop="name">
          <el-input v-model="formData.name" placeholder="请输入公司名称" />
        </el-form-item>
        <el-form-item label="公司代码" prop="code">
          <el-input v-model="formData.code" placeholder="请输入公司代码" />
        </el-form-item>
        <el-form-item label="Logo" prop="logo">
          <el-input v-model="formData.logo" placeholder="请输入Logo地址" />
        </el-form-item>
        <el-form-item label="官网地址" prop="website">
          <el-input v-model="formData.website" placeholder="请输入官网地址" />
        </el-form-item>
        <el-form-item label="跟踪地址" prop="trackingUrl">
          <el-input
            v-model="formData.trackingUrl"
            placeholder="请输入跟踪地址模板，如：https://www.sf-express.com/cn/sc/dynamic_function/waybill/#search/bill-number/{trackingNo}"
            type="textarea"
            :rows="2"
          />
        </el-form-item>
        <el-form-item label="API地址" prop="apiUrl">
          <el-input
            v-model="formData.apiUrl"
            placeholder="请输入API地址"
            type="textarea"
            :rows="2"
          />
        </el-form-item>
        <el-form-item label="联系电话" prop="contactPhone">
          <el-input v-model="formData.contactPhone" placeholder="请输入联系电话" />
        </el-form-item>
        <el-form-item label="客服电话" prop="servicePhone">
          <el-input v-model="formData.servicePhone" placeholder="请输入客服电话" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="formData.status">
            <el-radio label="active">启用</el-radio>
            <el-radio label="inactive">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input
            v-model="formData.remark"
            placeholder="请输入备注信息"
            type="textarea"
            :rows="3"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="handleDialogClose">取消</el-button>
          <el-button @click="handleSubmit" type="primary" :loading="submitLoading">
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { createSafeNavigator } from '@/utils/navigation'
import {
  Plus,
  Upload,
  Download,
  Search,
  Refresh,
  Setting
} from '@element-plus/icons-vue'
import SFExpressConfigDialog from '@/components/Logistics/SFExpressConfigDialog.vue'
import YTOExpressConfigDialog from '@/components/Logistics/YTOExpressConfigDialog.vue'

interface LogisticsCompany {
  id: string
  name: string
  code: string
  shortName?: string
  logo?: string
  website?: string
  trackingUrl?: string
  apiUrl?: string
  contactPhone?: string
  servicePhone?: string
  status: 'active' | 'inactive'
  sortOrder?: number
  createdAt?: string
  remark?: string
  statusLoading?: boolean
}

// 路由
const router = useRouter()
const safeNavigator = createSafeNavigator(router)

// 响应式数据
const loading = ref(false)
const dialogVisible = ref(false)
const submitLoading = ref(false)
const isEdit = ref(false)
const sfConfigVisible = ref(false)
const sfConfig = ref(null)
const ytoConfigVisible = ref(false)
const ytoConfig = ref(null)

// 超时ID跟踪，用于清理异步操作
const timeoutIds = new Set<NodeJS.Timeout>()

// 组件卸载状态跟踪
const isUnmounted = ref(false)

// 搜索表单
const searchForm = reactive({
  name: '',
  code: '',
  status: ''
})

// 表格数据
const tableData = ref([])

// 分页数据
const pagination = reactive({
  page: 1,
  size: 10,
  total: 0
})

// 表单数据
const formData = reactive({
  id: '',
  name: '',
  code: '',
  logo: '',
  website: '',
  trackingUrl: '',
  apiUrl: '',
  contactPhone: '',
  servicePhone: '',
  status: 'active',
  remark: ''
})

// 表单引用
const formRef = ref()

// 表单验证规则
const formRules = {
  name: [
    { required: true, message: '请输入公司名称', trigger: 'blur' }
  ],
  code: [
    { required: true, message: '请输入公司代码', trigger: 'blur' },
    { pattern: /^[A-Z0-9]+$/, message: '公司代码只能包含大写字母和数字', trigger: 'blur' }
  ],
  website: [
    { type: 'url', message: '请输入正确的网址格式', trigger: 'blur' }
  ],
  trackingUrl: [
    { required: true, message: '请输入跟踪地址', trigger: 'blur' }
  ],
  contactPhone: [
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码', trigger: 'blur' }
  ]
}

// 计算属性
const dialogTitle = computed(() => {
  return isEdit.value ? '编辑物流公司' : '新增物流公司'
})

// 方法定义
/**
 * 搜索
 */
const handleSearch = () => {
  pagination.page = 1
  loadData()
}

/**
 * 重置搜索
 */
const handleReset = () => {
  Object.assign(searchForm, {
    name: '',
    code: '',
    status: ''
  })
  handleSearch()
}

/**
 * 新增
 */
const handleAdd = () => {
  isEdit.value = false
  resetForm()
  dialogVisible.value = true
}

/**
 * 顺丰配置
 */
const handleSFConfig = (row: LogisticsCompany) => {
  // 从localStorage加载已保存的配置
  const savedConfig = localStorage.getItem('sf_express_config')
  if (savedConfig) {
    try {
      sfConfig.value = JSON.parse(savedConfig)
    } catch (error) {
      console.error('解析顺丰配置失败:', error)
      sfConfig.value = null
    }
  } else {
    sfConfig.value = null
  }

  sfConfigVisible.value = true
}

/**
 * 顺丰配置成功回调
 */
const handleSFConfigSuccess = (config: unknown) => {
  ElMessage.success('顺丰配置已保存,现在可以使用顺丰API功能了')
  // 可以在这里更新顺丰公司的状态或其他操作
}

/**
 * 圆通配置
 */
const handleYTOConfig = (row: LogisticsCompany) => {
  // 从localStorage加载已保存的配置
  const savedConfig = localStorage.getItem('yto_express_config')
  if (savedConfig) {
    try {
      ytoConfig.value = JSON.parse(savedConfig)
    } catch (error) {
      console.error('解析圆通配置失败:', error)
      ytoConfig.value = null
    }
  } else {
    ytoConfig.value = null
  }

  ytoConfigVisible.value = true
}

/**
 * 圆通配置成功回调
 */
const handleYTOConfigSuccess = (config: unknown) => {
  ElMessage.success('圆通配置已保存,现在可以使用圆通API功能了')
  // 可以在这里更新圆通公司的状态或其他操作
}

/**
 * 查看
 */
const handleView = (row: LogisticsCompany) => {
  safeNavigator.push(`/logistics/company/detail/${row.id}`)
}

/**
 * 编辑
 */
const handleEdit = (row: LogisticsCompany) => {
  isEdit.value = true
  Object.assign(formData, row)
  dialogVisible.value = true
}

/**
 * 状态开关变化处理
 */
const handleStatusChange = async (row: LogisticsCompany) => {
  if (isUnmounted.value) return

  row.statusLoading = true
  try {
    const { apiService } = await import('@/services/apiService')
    await apiService.patch(`/logistics/companies/${row.id}/status`, {
      status: row.status
    })

    if (!isUnmounted.value) {
      ElMessage.success(row.status === 'active' ? '已启用' : '已禁用')
    }
  } catch (error) {
    // 恢复原状态
    row.status = row.status === 'active' ? 'inactive' : 'active'
    if (!isUnmounted.value) {
      ElMessage.error('操作失败')
    }
  } finally {
    row.statusLoading = false
  }
}

/**
 * 格式化日期
 */
const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * 删除
 */
const handleDelete = async (row: LogisticsCompany) => {
  if (isUnmounted.value) return

  try {
    await ElMessageBox.confirm('确定要删除该物流公司吗？此操作不可撤销', '提示', {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning'
    })

    if (isUnmounted.value) return

    const { apiService } = await import('@/services/apiService')
    await apiService.delete(`/logistics/companies/${row.id}`)

    if (!isUnmounted.value) {
      ElMessage.success('删除成功')
      loadData()
    }
  } catch (error) {
    // 用户取消操作或API错误
    if ((error as string) !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

/**
 * 导入数据
 */
const handleImport = () => {
  ElMessage.info('导入功能开发中...')
}

/**
 * 导出数据
 */
const handleExport = () => {
  ElMessage.info('导出功能开发中...')
}

/**
 * 分页处理
 */
const handleSizeChange = (size: number) => {
  pagination.size = size
  loadData()
}

const handleCurrentChange = (page: number) => {
  pagination.page = page
  loadData()
}

/**
 * 提交表单
 */
const handleSubmit = async () => {
  if (!formRef.value || isUnmounted.value) return

  await formRef.value.validate(async (valid) => {
    if (valid && !isUnmounted.value) {
      submitLoading.value = true
      try {
        const { apiService } = await import('@/services/apiService')

        if (isEdit.value) {
          // 编辑
          await apiService.put(`/logistics/companies/${formData.id}`, formData)
        } else {
          // 新增
          await apiService.post('/logistics/companies', formData)
        }

        if (!isUnmounted.value) {
          ElMessage.success(isEdit.value ? '编辑成功' : '新增成功')
          dialogVisible.value = false
          loadData()
        }
      } catch (error: unknown) {
        if (!isUnmounted.value) {
          const errMsg = (error as { message?: string })?.message || (isEdit.value ? '编辑失败' : '新增失败')
          ElMessage.error(errMsg)
        }
      } finally {
        if (!isUnmounted.value) {
          submitLoading.value = false
        }
      }
    }
  })
}

/**
 * 关闭对话框
 */
const handleDialogClose = () => {
  dialogVisible.value = false
  resetForm()
}

/**
 * 重置表单
 */
const resetForm = () => {
  Object.assign(formData, {
    id: '',
    name: '',
    code: '',
    logo: '',
    website: '',
    trackingUrl: '',
    apiUrl: '',
    contactPhone: '',
    servicePhone: '',
    status: 'active',
    remark: ''
  })
  formRef.value?.clearValidate()
}

/**
 * 加载数据
 */
const loadData = async () => {
  if (isUnmounted.value) return

  loading.value = true

  try {
    const { apiService } = await import('@/services/apiService')
    const response = await apiService.get('/logistics/companies/list', {
      params: {
        name: searchForm.name || undefined,
        code: searchForm.code || undefined,
        status: searchForm.status || undefined,
        page: pagination.page,
        pageSize: pagination.size
      }
    })

    // 检查组件是否已卸载
    if (isUnmounted.value) return

    if (response && response.list) {
      tableData.value = response.list.map((item: LogisticsCompany) => ({
        ...item,
        statusLoading: false
      }))
      pagination.total = response.total || 0
    } else {
      tableData.value = []
      pagination.total = 0
    }
  } catch (error) {
    if (!isUnmounted.value) {
      console.error('加载物流公司数据失败:', error)
      // 如果API失败，使用默认数据
      tableData.value = []
      pagination.total = 0
    }
  } finally {
    if (!isUnmounted.value) {
      loading.value = false
    }
  }
}

// 生命周期钩子
onMounted(() => {
  loadData()
})

// 组件卸载时清理异步操作
onBeforeUnmount(() => {
  // 设置组件卸载状态
  isUnmounted.value = true

  // 清理所有未完成的超时操作
  timeoutIds.forEach(timeoutId => {
    clearTimeout(timeoutId)
  })
  timeoutIds.clear()
})
</script>

<style scoped>
.logistics-companies {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
  color: #303133;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.search-card,
.table-card {
  margin-bottom: 20px;
}

.search-form {
  margin: 0;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
