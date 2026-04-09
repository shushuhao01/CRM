<template>
  <div class="logistics-companies">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2>物流公司管理</h2>
      <div class="header-actions">
        <el-tooltip content="查看物流API配置指南" placement="bottom">
          <el-button @click="router.push('/help-center?section=logistics-api-guide')" link type="primary" class="help-link-btn">
            <el-icon><QuestionFilled /></el-icon>
            配置指南
          </el-button>
        </el-tooltip>
        <el-button @click="handleKuaidi100Config" type="success" :icon="Setting">
          快递100配置
        </el-button>
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
              v-if="supportedApiCompanies.includes(row.code)"
              @click="handleApiConfig(row)"
              type="warning"
              link
              size="small"
            >
              <el-icon><Setting /></el-icon>
              API配置
            </el-button>
            <el-tooltip
              :content="isSystemCompany(row.code) ? '系统预设快递公司，不可删除' : '删除'"
              placement="top"
            >
              <span>
                <el-button
                  @click="handleDelete(row)"
                  type="danger"
                  link
                  size="small"
                  :disabled="isSystemCompany(row.code)"
                >
                  删除
                </el-button>
              </span>
            </el-tooltip>
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

    <!-- 通用物流API配置对话框（支持所有快递公司） -->
    <LogisticsApiConfigDialog
      v-model:visible="apiConfigVisible"
      :company-code="currentApiCompanyCode"
      :config="currentApiConfig"
      @success="handleApiConfigSuccess"
    />

    <!-- 快递100配置对话框 -->
    <el-dialog
      v-model="kuaidi100DialogVisible"
      title="快递100 API配置"
      width="550px"
    >
      <el-alert
        title="快递100是第三方物流查询平台，可以查询任意运单号（无权限限制）"
        type="info"
        :closable="false"
        show-icon
        style="margin-bottom: 20px"
      />

      <el-form
        ref="kuaidi100FormRef"
        :model="kuaidi100Form"
        :rules="kuaidi100FormRules"
        label-width="120px"
      >
        <el-form-item label="Customer" prop="customer">
          <el-input
            v-model="kuaidi100Form.customer"
            placeholder="请输入快递100的Customer"
          />
          <div class="form-tip">在快递100开放平台获取</div>
        </el-form-item>

        <el-form-item label="Key" prop="key">
          <el-input
            v-model="kuaidi100Form.key"
            placeholder="请输入快递100的Key"
            show-password
          />
          <div class="form-tip">在快递100开放平台获取</div>
        </el-form-item>

        <el-form-item label="API地址" prop="url">
          <el-input
            v-model="kuaidi100Form.url"
            placeholder="https://poll.kuaidi100.com/poll/query.do"
          />
          <div class="form-tip">一般不需要修改</div>
        </el-form-item>

        <el-form-item label="启用状态">
          <el-switch
            v-model="kuaidi100Form.enabled"
            active-text="启用"
            inactive-text="禁用"
          />
          <div class="form-tip">启用后，当官方API查询失败时自动使用快递100</div>
        </el-form-item>
      </el-form>

      <div class="kuaidi100-help">
        <el-divider content-position="left">如何获取快递100 API密钥？</el-divider>
        <ol>
          <li>访问 <el-link type="primary" href="https://www.kuaidi100.com/openapi/" target="_blank">快递100开放平台</el-link></li>
          <li>注册并登录账号</li>
          <li>创建应用，获取 Customer 和 Key</li>
          <li>将获取的密钥填入上方表单</li>
        </ol>
      </div>

      <template #footer>
        <el-button @click="kuaidi100DialogVisible = false">取消</el-button>
        <el-button
          @click="handleTestKuaidi100"
          :loading="testingKuaidi100"
        >
          测试连接
        </el-button>
        <el-button
          @click="handleSaveKuaidi100"
          type="primary"
          :loading="savingKuaidi100"
        >
          保存配置
        </el-button>
      </template>
    </el-dialog>

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
  Setting,
  QuestionFilled
} from '@element-plus/icons-vue'
import LogisticsApiConfigDialog from '@/components/Logistics/LogisticsApiConfigDialog.vue'
import { logisticsApi } from '@/api/logistics'

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
// 通用API配置对话框
const apiConfigVisible = ref(false)
const currentApiCompanyCode = ref('')
const currentApiConfig = ref(null)

// 快递100配置相关
const kuaidi100DialogVisible = ref(false)
const testingKuaidi100 = ref(false)
const savingKuaidi100 = ref(false)
const kuaidi100FormRef = ref()
const kuaidi100Form = reactive({
  customer: '',
  key: '',
  url: 'https://poll.kuaidi100.com/poll/query.do',
  enabled: true
})
const kuaidi100FormRules = {
  customer: [{ required: true, message: '请输入Customer', trigger: 'blur' }],
  key: [{ required: true, message: '请输入Key', trigger: 'blur' }]
}

// 支持API配置的快递公司代码（所有主流快递公司）
const supportedApiCompanies = ['SF', 'ZTO', 'YTO', 'STO', 'YD', 'JTSD', 'EMS', 'JD', 'DBL']

// 系统预设的快递公司代码（不可删除）
const systemCompanyCodes = ['SF', 'ZTO', 'YTO', 'STO', 'YD', 'JTSD', 'EMS', 'JD', 'DB', 'DBL']

/**
 * 判断是否为系统预设快递公司
 */
const isSystemCompany = (code: string): boolean => {
  return systemCompanyCodes.includes(code)
}

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
const tableData = ref<LogisticsCompany[]>([])

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
 * 通用API配置（支持所有快递公司）
 */
const handleApiConfig = async (row: LogisticsCompany) => {
  currentApiCompanyCode.value = row.code

  // 尝试从API获取已保存的配置
  try {
    const response = await logisticsApi.getApiConfig(row.code)
    if (response.success && response.data) {
      currentApiConfig.value = {
        appId: response.data.appId,
        appKey: response.data.appKey,
        appSecret: response.data.appSecret,
        customerId: response.data.customerId,
        apiEnvironment: response.data.apiEnvironment,
        enabled: response.data.enabled === 1
      }
    } else {
      currentApiConfig.value = null
    }
  } catch (error) {
    console.error('获取API配置失败:', error)
    currentApiConfig.value = null
  }

  apiConfigVisible.value = true
}

/**
 * 通用API配置成功回调
 */
const handleApiConfigSuccess = (_config: unknown) => {
  const companyNames: Record<string, string> = {
    'SF': '顺丰速运',
    'ZTO': '中通快递',
    'YTO': '圆通速递',
    'STO': '申通快递',
    'YD': '韵达速递',
    'JTSD': '极兔速递',
    'EMS': '邮政EMS',
    'JD': '京东物流',
    'DBL': '德邦快递'
  }
  const name = companyNames[currentApiCompanyCode.value] || currentApiCompanyCode.value
  ElMessage.success(`${name}配置已保存,现在可以使用API功能了`)
}

/**
 * 打开快递100配置对话框
 */
const handleKuaidi100Config = async () => {
  // 加载已保存的配置
  try {
    const { apiService } = await import('@/services/apiService')
    const response = await apiService.get('/logistics/kuaidi100/config')
    if (response.success && response.data) {
      kuaidi100Form.customer = response.data.customer || ''
      kuaidi100Form.key = response.data.key || ''
      kuaidi100Form.url = response.data.url || 'https://poll.kuaidi100.com/poll/query.do'
      kuaidi100Form.enabled = response.data.enabled !== false
    }
  } catch (error) {
    console.log('加载快递100配置失败，使用默认值')
  }
  kuaidi100DialogVisible.value = true
}

/**
 * 测试快递100连接
 */
const handleTestKuaidi100 = async () => {
  if (!kuaidi100Form.customer || !kuaidi100Form.key) {
    ElMessage.warning('请先填写Customer和Key')
    return
  }

  testingKuaidi100.value = true
  try {
    const { apiService } = await import('@/services/apiService')
    const response = await apiService.post('/logistics/kuaidi100/test', {
      customer: kuaidi100Form.customer,
      key: kuaidi100Form.key,
      url: kuaidi100Form.url
    })

    if (response.success) {
      ElMessage.success('连接测试成功！')
    } else {
      ElMessage.error(response.message || '连接测试失败')
    }
  } catch (error: any) {
    ElMessage.error('连接测试失败: ' + (error.message || '未知错误'))
  } finally {
    testingKuaidi100.value = false
  }
}

/**
 * 保存快递100配置
 */
const handleSaveKuaidi100 = async () => {
  const valid = await kuaidi100FormRef.value?.validate().catch(() => false)
  if (!valid) return

  savingKuaidi100.value = true
  try {
    const { apiService } = await import('@/services/apiService')
    const response = await apiService.post('/logistics/kuaidi100/config', {
      customer: kuaidi100Form.customer,
      key: kuaidi100Form.key,
      url: kuaidi100Form.url,
      enabled: kuaidi100Form.enabled
    })

    if (response.success) {
      ElMessage.success('快递100配置已保存')
      kuaidi100DialogVisible.value = false
    } else {
      ElMessage.error(response.message || '保存失败')
    }
  } catch (error: any) {
    ElMessage.error('保存失败: ' + (error.message || '未知错误'))
  } finally {
    savingKuaidi100.value = false
  }
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
  // 创建隐藏的文件输入元素
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.xlsx,.xls,.json'
  input.onchange = async (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return

    const ext = file.name.split('.').pop()?.toLowerCase()

    try {
      loading.value = true

      if (ext === 'json') {
        // JSON 格式导入
        const text = await file.text()
        const importData = JSON.parse(text)
        await doImport(importData)
      } else if (ext === 'xlsx' || ext === 'xls') {
        // Excel 格式导入
        const XLSX = await import('xlsx')
        const data = await file.arrayBuffer()
        const workbook = XLSX.read(data, { type: 'array' })

        // 解析物流公司 sheet
        const companiesSheet = workbook.Sheets['物流公司']
        if (!companiesSheet) {
          ElMessage.error('Excel文件中未找到"物流公司"工作表')
          return
        }
        const companiesData = XLSX.utils.sheet_to_json(companiesSheet) as any[]

        // 映射 Excel 列名到字段名
        const companies = companiesData.map((row: any) => ({
          code: row['公司代码'] || row['code'] || '',
          name: row['公司名称'] || row['name'] || '',
          shortName: row['简称'] || row['shortName'] || '',
          logo: row['Logo'] || row['logo'] || '',
          website: row['官网'] || row['website'] || '',
          trackingUrl: row['跟踪地址'] || row['trackingUrl'] || '',
          apiUrl: row['API地址'] || row['apiUrl'] || '',
          apiKey: row['API Key'] || row['apiKey'] || '',
          apiSecret: row['API Secret'] || row['apiSecret'] || '',
          contactPhone: row['联系电话'] || row['contactPhone'] || '',
          contactEmail: row['联系邮箱'] || row['contactEmail'] || '',
          serviceArea: row['服务区域'] || row['serviceArea'] || '',
          status: row['状态'] === '启用' ? 'active' : (row['状态'] === '禁用' ? 'inactive' : (row['status'] || 'active')),
          sortOrder: Number(row['排序'] || row['sortOrder'] || 0),
          remark: row['备注'] || row['remark'] || ''
        })).filter((c: any) => c.code && c.name)

        // 解析 API配置 sheet
        let apiConfigs: any[] = []
        const apiConfigSheet = workbook.Sheets['API配置']
        if (apiConfigSheet) {
          const apiConfigData = XLSX.utils.sheet_to_json(apiConfigSheet) as any[]
          apiConfigs = apiConfigData.map((row: any) => ({
            companyCode: row['公司代码'] || row['companyCode'] || '',
            companyName: row['公司名称'] || row['companyName'] || '',
            appId: row['App ID'] || row['appId'] || '',
            appKey: row['App Key'] || row['appKey'] || '',
            appSecret: row['App Secret'] || row['appSecret'] || '',
            customerId: row['Customer ID'] || row['customerId'] || '',
            apiUrl: row['API地址'] || row['apiUrl'] || '',
            apiEnvironment: row['环境'] === '生产' ? 'production' : (row['apiEnvironment'] || 'sandbox'),
            supportCreateOrder: row['支持下单'] === '是' ? 1 : (Number(row['supportCreateOrder']) || 0),
            enabled: row['启用'] === '是' ? 1 : (Number(row['enabled']) || 0)
          })).filter((ac: any) => ac.companyCode)
        }

        // 解析快递100配置 sheet
        let kuaidi100Config: any = null
        const kuaidi100Sheet = workbook.Sheets['快递100配置']
        if (kuaidi100Sheet) {
          const kuaidi100Data = XLSX.utils.sheet_to_json(kuaidi100Sheet) as any[]
          if (kuaidi100Data.length > 0) {
            const row = kuaidi100Data[0] as any
            kuaidi100Config = {
              customer: row['Customer'] || row['customer'] || '',
              key: row['Key'] || row['key'] || '',
              url: row['API地址'] || row['url'] || 'https://poll.kuaidi100.com/poll/query.do',
              enabled: row['启用'] === '是' ? true : (row['enabled'] !== false)
            }
          }
        }

        await doImport({ companies, apiConfigs, kuaidi100Config })
      } else {
        ElMessage.error('不支持的文件格式，请上传 .xlsx 或 .json 文件')
      }
    } catch (error: any) {
      console.error('导入失败:', error)
      ElMessage.error('导入失败: ' + (error.message || '文件解析错误'))
    } finally {
      loading.value = false
    }
  }
  input.click()
}

/**
 * 执行导入操作
 */
const doImport = async (importData: any) => {
  const companies = importData.companies || []
  const apiConfigs = importData.apiConfigs || []
  const kuaidi100Config = importData.kuaidi100Config || null

  if (companies.length === 0) {
    ElMessage.warning('未找到有效的物流公司数据')
    return
  }

  try {
    await ElMessageBox.confirm(
      `将导入 ${companies.length} 个物流公司${apiConfigs.length > 0 ? `、${apiConfigs.length} 个API配置` : ''}${kuaidi100Config ? '、快递100配置' : ''}，重复的将被覆盖。是否继续？`,
      '确认导入',
      {
        confirmButtonText: '确认导入',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
  } catch {
    return // 用户取消
  }

  try {
    const response = await logisticsApi.importCompanies({
      companies,
      apiConfigs,
      kuaidi100Config
    })
    if (response.success) {
      ElMessage.success(response.message || '导入成功')
      loadData()
    } else {
      ElMessage.error(response.message || '导入失败')
    }
  } catch (error: any) {
    ElMessage.error('导入失败: ' + (error.message || '未知错误'))
  }
}

/**
 * 导出数据
 */
const handleExport = async () => {
  try {
    loading.value = true
    ElMessage.info('正在导出数据...')

    const response = await logisticsApi.exportCompanies()

    if (!response.success || !response.data) {
      ElMessage.error('导出失败：未获取到数据')
      return
    }

    const exportData = response.data
    const XLSX = await import('xlsx')
    const workbook = XLSX.utils.book_new()

    // Sheet 1: 物流公司信息
    const companiesRows = (exportData.companies || []).map((c: any) => ({
      '公司代码': c.code,
      '公司名称': c.name,
      '简称': c.shortName || '',
      'Logo': c.logo || '',
      '官网': c.website || '',
      '跟踪地址': c.trackingUrl || '',
      'API地址': c.apiUrl || '',
      'API Key': c.apiKey || '',
      'API Secret': c.apiSecret || '',
      '联系电话': c.contactPhone || '',
      '联系邮箱': c.contactEmail || '',
      '服务区域': c.serviceArea || '',
      '状态': c.status === 'active' ? '启用' : '禁用',
      '排序': c.sortOrder || 0,
      '备注': c.remark || '',
      '创建时间': c.createdAt ? new Date(c.createdAt).toLocaleString('zh-CN') : '',
      '更新时间': c.updatedAt ? new Date(c.updatedAt).toLocaleString('zh-CN') : ''
    }))
    const companiesSheet = XLSX.utils.json_to_sheet(companiesRows)
    // 设置列宽
    companiesSheet['!cols'] = [
      { wch: 12 }, { wch: 16 }, { wch: 10 }, { wch: 30 }, { wch: 30 },
      { wch: 50 }, { wch: 40 }, { wch: 30 }, { wch: 30 }, { wch: 15 },
      { wch: 25 }, { wch: 20 }, { wch: 8 }, { wch: 6 }, { wch: 20 },
      { wch: 20 }, { wch: 20 }
    ]
    XLSX.utils.book_append_sheet(workbook, companiesSheet, '物流公司')

    // Sheet 2: API配置
    if (exportData.apiConfigs && exportData.apiConfigs.length > 0) {
      const apiConfigRows = exportData.apiConfigs.map((ac: any) => ({
        '公司代码': ac.companyCode,
        '公司名称': ac.companyName || '',
        'App ID': ac.appId || '',
        'App Key': ac.appKey || '',
        'App Secret': ac.appSecret || '',
        'Customer ID': ac.customerId || '',
        'API地址': ac.apiUrl || '',
        '环境': ac.apiEnvironment === 'production' ? '生产' : '沙箱',
        '支持下单': ac.supportCreateOrder ? '是' : '否',
        '启用': ac.enabled ? '是' : '否'
      }))
      const apiConfigSheet = XLSX.utils.json_to_sheet(apiConfigRows)
      apiConfigSheet['!cols'] = [
        { wch: 12 }, { wch: 16 }, { wch: 25 }, { wch: 30 }, { wch: 40 },
        { wch: 25 }, { wch: 40 }, { wch: 8 }, { wch: 10 }, { wch: 8 }
      ]
      XLSX.utils.book_append_sheet(workbook, apiConfigSheet, 'API配置')
    }

    // Sheet 3: 快递100配置
    if (exportData.kuaidi100Config) {
      const k100 = exportData.kuaidi100Config
      const kuaidi100Rows = [{
        'Customer': k100.customer || '',
        'Key': k100.key || '',
        'API地址': k100.url || 'https://poll.kuaidi100.com/poll/query.do',
        '启用': k100.enabled !== false ? '是' : '否'
      }]
      const kuaidi100Sheet = XLSX.utils.json_to_sheet(kuaidi100Rows)
      kuaidi100Sheet['!cols'] = [
        { wch: 30 }, { wch: 40 }, { wch: 50 }, { wch: 8 }
      ]
      XLSX.utils.book_append_sheet(workbook, kuaidi100Sheet, '快递100配置')
    }

    // 生成文件并下载
    const fileName = `物流公司数据_${new Date().toISOString().slice(0, 10)}.xlsx`
    XLSX.writeFile(workbook, fileName)

    ElMessage.success(`导出成功：${companiesRows.length} 个物流公司`)
  } catch (error: any) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败: ' + (error.message || '未知错误'))
  } finally {
    loading.value = false
  }
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
    const response = await logisticsApi.getCompanies({
      name: searchForm.name || undefined,
      code: searchForm.code || undefined,
      status: searchForm.status || undefined,
      page: pagination.page,
      pageSize: pagination.size
    })

    // 检查组件是否已卸载
    if (isUnmounted.value) return

    if (response && response.data && response.data.list) {
      tableData.value = response.data.list.map((item: LogisticsCompany) => ({
        ...item,
        statusLoading: false
      }))
      pagination.total = response.data.total || 0
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
  align-items: center;
}

.help-link-btn {
  font-size: 13px;
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

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-left: 8px;
}

.kuaidi100-help {
  margin-top: 20px;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 4px;
}

.kuaidi100-help ol {
  margin: 10px 0 0 20px;
  padding: 0;
  color: #606266;
  font-size: 14px;
}

.kuaidi100-help li {
  margin-bottom: 8px;
}
</style>
