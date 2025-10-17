<template>
  <div class="customer-service-permission-manager">
    <div class="header">
      <div class="header-title">
        <h1 class="page-title">客服权限管理</h1>
        <p class="page-subtitle">专门针对客服团队的权限管理工具，按业务类型进行权限配置</p>
        <div class="header-stats">
          <el-statistic title="客服总数" :value="serviceStats.total" />
          <el-statistic title="在线客服" :value="serviceStats.online" />
          <el-statistic title="权限配置完成率" :value="serviceStats.configRate" suffix="%" />
        </div>
      </div>
      <div class="header-actions">
        <el-button @click="refreshData" type="primary">刷新数据</el-button>
        <el-button @click="exportPermissions" type="success">导出配置</el-button>
        <el-button @click="showBatchConfig" type="warning">批量配置</el-button>
      </div>
    </div>

    <div class="filters">
      <el-input
        v-model="searchKeyword"
        placeholder="搜索客服姓名"
        style="width: 200px; margin-right: 10px;"
      />
      <el-select
        v-model="filterServiceType"
        placeholder="客服类型"
        style="width: 150px; margin-right: 10px;"
        clearable
      >
        <el-option label="全部" value="" />
        <el-option label="售后客服" :value="CustomerServiceType.AFTER_SALES" />
        <el-option label="审核客服" :value="CustomerServiceType.AUDIT" />
        <el-option label="物流客服" :value="CustomerServiceType.LOGISTICS" />
        <el-option label="商品客服" :value="CustomerServiceType.PRODUCT" />
        <el-option label="通用客服" :value="CustomerServiceType.GENERAL" />
      </el-select>
      <el-button @click="searchCustomerService" type="primary">搜索</el-button>
    </div>

    <el-table :data="filteredCustomerServices" style="width: 100%">
      <el-table-column prop="name" label="姓名" width="120" />
      <el-table-column prop="email" label="邮箱" width="200" />
      <el-table-column prop="department" label="部门" width="120" />
      <el-table-column label="客服类型" width="120">
        <template #default="{ row }">
          <el-tag :type="getServiceTypeTagType(row.customerServiceType)">
            {{ getServiceTypeDisplayName(row.customerServiceType) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="数据范围" width="120">
        <template #default="{ row }">
          <el-tag :type="getDataScopeTagType(row.dataScope)">
            {{ getDataScopeDisplayName(row.dataScope) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="自定义权限" min-width="200">
        <template #default="{ row }">
          <div class="custom-permissions">
            <el-tag
              v-for="permission in row.customPermissions"
              :key="permission"
              size="small"
              style="margin-right: 5px; margin-bottom: 2px;"
            >
              {{ getPermissionDisplayName(permission) }}
            </el-tag>
            <span v-if="!row.customPermissions?.length" class="no-permissions">
              无自定义权限
            </span>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="row.status === 'active' ? 'success' : 'danger'">
            {{ row.status === 'active' ? '启用' : '禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200">
        <template #default="{ row }">
          <el-button
            @click="editPermissions(row)"
            size="small"
            type="primary"
          >
            配置权限
          </el-button>
          <el-button
            @click="viewPermissions(row)"
            size="small"
          >
            查看详情
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 权限配置对话框 -->
    <el-dialog
      v-model="permissionDialogVisible"
      :title="`配置客服权限 - ${currentCustomerService?.name}`"
      width="800px"
    >
      <el-form :model="permissionForm" label-width="120px">
        <el-form-item label="客服类型">
          <el-select v-model="permissionForm.customerServiceType" style="width: 100%;">
            <el-option label="售后客服" :value="CustomerServiceType.AFTER_SALES" />
            <el-option label="审核客服" :value="CustomerServiceType.AUDIT" />
            <el-option label="物流客服" :value="CustomerServiceType.LOGISTICS" />
            <el-option label="商品客服" :value="CustomerServiceType.PRODUCT" />
            <el-option label="通用客服" :value="CustomerServiceType.GENERAL" />
          </el-select>
        </el-form-item>

        <el-form-item label="数据范围">
          <el-select v-model="permissionForm.dataScope" style="width: 100%;">
            <el-option label="自定义范围" :value="DataScope.CUSTOM" />
            <el-option label="个人数据" :value="DataScope.SELF" />
            <el-option label="部门数据" :value="DataScope.DEPARTMENT" />
          </el-select>
        </el-form-item>

        <el-form-item label="可访问部门" v-if="permissionForm.dataScope === DataScope.DEPARTMENT">
          <el-select
            v-model="permissionForm.departmentIds"
            multiple
            placeholder="选择可访问的部门"
            style="width: 100%;"
          >
            <el-option
              v-for="dept in departments"
              :key="dept.id"
              :label="dept.name"
              :value="dept.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="自定义权限">
          <div class="permission-tree">
            <el-tree
              ref="permissionTreeRef"
              :data="permissionTreeData"
              :props="{ children: 'children', label: 'name' }"
              show-checkbox
              node-key="key"
              :default-checked-keys="permissionForm.customPermissions"
              @check="handlePermissionCheck"
            />
          </div>
        </el-form-item>

        <el-form-item label="权限说明">
          <div class="permission-description">
            <div v-if="permissionForm.customerServiceType === CustomerServiceType.AFTER_SALES">
              <p><strong>售后客服权限说明：</strong></p>
              <ul>
                <li>可以查看和处理所有售后订单</li>
                <li>可以查看退款、退货相关订单</li>
                <li>可以处理客户投诉和售后问题</li>
              </ul>
            </div>
            <div v-else-if="permissionForm.customerServiceType === CustomerServiceType.AUDIT">
              <p><strong>审核客服权限说明：</strong></p>
              <ul>
                <li>可以查看和处理待审核订单</li>
                <li>可以审核客户信息和订单信息</li>
                <li>可以批准或拒绝订单审核</li>
              </ul>
            </div>
            <div v-else-if="permissionForm.customerServiceType === CustomerServiceType.LOGISTICS">
              <p><strong>物流客服权限说明：</strong></p>
              <ul>
                <li>可以查看和处理物流订单</li>
                <li>可以更新物流状态和跟踪信息</li>
                <li>可以处理配送相关问题</li>
              </ul>
            </div>
            <div v-else-if="permissionForm.customerServiceType === CustomerServiceType.PRODUCT">
              <p><strong>商品客服权限说明：</strong></p>
              <ul>
                <li>可以查看和管理商品列表</li>
                <li>可以处理商品相关咨询</li>
                <li>可以查看所有订单信息</li>
              </ul>
            </div>
            <div v-else-if="permissionForm.customerServiceType === CustomerServiceType.GENERAL">
              <p><strong>通用客服权限说明：</strong></p>
              <ul>
                <li>根据自定义权限配置访问数据</li>
                <li>可以处理一般性客户咨询</li>
                <li>权限范围由管理员具体配置</li>
              </ul>
            </div>
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="permissionDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="savePermissions">保存</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 权限详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      :title="`权限详情 - ${currentCustomerService?.name}`"
      width="600px"
    >
      <div v-if="currentCustomerService" class="permission-details">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="姓名">
            {{ currentCustomerService.name }}
          </el-descriptions-item>
          <el-descriptions-item label="邮箱">
            {{ currentCustomerService.email }}
          </el-descriptions-item>
          <el-descriptions-item label="部门">
            {{ currentCustomerService.department }}
          </el-descriptions-item>
          <el-descriptions-item label="客服类型">
            <el-tag :type="getServiceTypeTagType(currentCustomerService.customerServiceType)">
              {{ getServiceTypeDisplayName(currentCustomerService.customerServiceType) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="数据范围">
            <el-tag :type="getDataScopeTagType(currentCustomerService.dataScope)">
              {{ getDataScopeDisplayName(currentCustomerService.dataScope) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="currentCustomerService.status === 'active' ? 'success' : 'danger'">
              {{ currentCustomerService.status === 'active' ? '启用' : '禁用' }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>

        <div class="custom-permissions-detail" style="margin-top: 20px;">
          <h4>自定义权限列表：</h4>
          <div v-if="currentCustomerService.customPermissions?.length">
            <el-tag
              v-for="permission in currentCustomerService.customPermissions"
              :key="permission"
              style="margin-right: 8px; margin-bottom: 8px;"
            >
              {{ getPermissionDisplayName(permission) }}
            </el-tag>
          </div>
          <div v-else class="no-permissions">
            无自定义权限
          </div>
        </div>
      </div>
    </el-dialog>

    <!-- 批量配置对话框 -->
    <el-dialog
      v-model="batchConfigVisible"
      title="批量权限配置"
      width="600px"
    >
      <div class="batch-config">
        <el-alert
          title="批量配置说明"
          type="warning"
          :closable="false"
          style="margin-bottom: 20px;"
        >
          选择客服类型和权限模板，可以快速为多个客服配置相同的权限设置
        </el-alert>
        
        <el-form label-width="120px">
          <el-form-item label="目标客服类型">
            <el-select v-model="batchConfig.targetType" placeholder="选择客服类型">
              <el-option label="售后客服" value="after_sales" />
              <el-option label="审核客服" value="audit" />
              <el-option label="物流客服" value="logistics" />
              <el-option label="商品客服" value="product" />
              <el-option label="通用客服" value="general" />
            </el-select>
          </el-form-item>
          
          <el-form-item label="权限模板">
            <el-select v-model="batchConfig.template" placeholder="选择权限模板">
              <el-option label="基础权限" value="basic" />
              <el-option label="标准权限" value="standard" />
              <el-option label="高级权限" value="advanced" />
            </el-select>
          </el-form-item>
          
          <el-form-item label="数据范围">
            <el-select v-model="batchConfig.dataScope" placeholder="选择数据范围">
              <el-option label="个人数据" value="personal" />
              <el-option label="部门数据" value="department" />
              <el-option label="全部数据" value="all" />
            </el-select>
          </el-form-item>
        </el-form>
      </div>
      
      <template #footer>
        <el-button @click="batchConfigVisible = false">取消</el-button>
        <el-button @click="confirmBatchConfig" type="primary">确认配置</el-button>
      </template>
    </el-dialog>

    <!-- 底部页面说明 -->
    <div class="bottom-info" style="margin-top: 30px;">
      <div class="info-content">
        <div class="info-title">
          <el-icon><InfoFilled /></el-icon>
          <span>使用说明</span>
        </div>
        <div class="info-text">
          <p>专门针对客服团队的权限管理工具，支持按业务类型进行权限配置和数据范围控制</p>
          <div class="service-types-simple">
            <span class="type-item">售后客服</span>
            <span class="type-item">审核客服</span>
            <span class="type-item">物流客服</span>
            <span class="type-item">商品客服</span>
            <span class="type-item">通用客服</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElTree } from 'element-plus'
import { InfoFilled } from '@element-plus/icons-vue'
import { CustomerServiceType, DataScope } from '@/services/permission'

interface CustomerServiceUser {
  id: string
  name: string
  email: string
  department: string
  departmentId: string
  customerServiceType: CustomerServiceType
  dataScope: DataScope
  departmentIds?: string[]
  customPermissions?: string[]
  status: 'active' | 'inactive'
}

interface Department {
  id: string
  name: string
}

interface PermissionTreeNode {
  key: string
  name: string
  children?: PermissionTreeNode[]
}

// 数据状态
const customerServices = ref<CustomerServiceUser[]>([])
const departments = ref<Department[]>([])
const searchKeyword = ref('')
const filterServiceType = ref('')
const batchConfigVisible = ref(false)

// 统计数据
const serviceStats = ref({
  total: 0,
  online: 0,
  configRate: 0
})

// 批量配置数据
const batchConfig = ref({
  targetType: '',
  template: '',
  dataScope: ''
})

// 对话框状态
const permissionDialogVisible = ref(false)
const detailDialogVisible = ref(false)
const currentCustomerService = ref<CustomerServiceUser | null>(null)

// 权限表单
const permissionForm = ref({
  customerServiceType: CustomerServiceType.GENERAL,
  dataScope: DataScope.CUSTOM,
  departmentIds: [] as string[],
  customPermissions: [] as string[]
})

// 权限树引用
const permissionTreeRef = ref<InstanceType<typeof ElTree>>()

// 权限树数据
const permissionTreeData: PermissionTreeNode[] = [
  {
    key: 'customer',
    name: '客户管理',
    children: [
      { key: 'customer:list:view', name: '查看客户列表' },
      { key: 'customer:list:edit', name: '编辑客户信息' },
      { key: 'customer:list:create', name: '创建客户' },
      { key: 'customer:list:assign', name: '分配客户' }
    ]
  },
  {
    key: 'order',
    name: '订单管理',
    children: [
      { key: 'order:list:view', name: '查看订单列表' },
      { key: 'order:list:edit', name: '编辑订单' },
      { key: 'order:add:create', name: '创建订单' },
      { key: 'order:audit:view', name: '查看审核订单' },
      { key: 'order:audit:approve', name: '审核订单' },
      { key: 'order:detail:cancel', name: '取消订单' }
    ]
  },
  {
    key: 'service',
    name: '客服管理',
    children: [
      { key: 'service:list:view', name: '查看服务列表' },
      { key: 'service:list:edit', name: '编辑服务记录' },
      { key: 'service:afterSales:view', name: '查看售后服务' },
      { key: 'service:afterSales:edit', name: '处理售后服务' }
    ]
  },
  {
    key: 'logistics',
    name: '物流管理',
    children: [
      { key: 'logistics:shipping:view', name: '查看发货列表' },
      { key: 'logistics:shipping:edit', name: '编辑发货信息' },
      { key: 'logistics:shipping:batchExport', name: '批量导出' }
    ]
  },
  {
    key: 'product',
    name: '商品管理',
    children: [
      { key: 'product:list:view', name: '查看商品列表' },
      { key: 'product:list:edit', name: '编辑商品信息' },
      { key: 'product:add:create', name: '添加商品' },
      { key: 'product:inventory:manage', name: '库存管理' }
    ]
  }
]

// 过滤后的客服列表
const filteredCustomerServices = computed(() => {
  return customerServices.value.filter(cs => {
    const matchesKeyword = !searchKeyword.value || cs.name.includes(searchKeyword.value)
    const matchesType = !filterServiceType.value || cs.customerServiceType === filterServiceType.value
    return matchesKeyword && matchesType
  })
})

// 获取客服类型显示名称
const getServiceTypeDisplayName = (type: CustomerServiceType) => {
  switch (type) {
    case CustomerServiceType.AFTER_SALES: return '售后客服'
    case CustomerServiceType.AUDIT: return '审核客服'
    case CustomerServiceType.LOGISTICS: return '物流客服'
    case CustomerServiceType.PRODUCT: return '商品客服'
    case CustomerServiceType.GENERAL: return '通用客服'
    default: return '未知'
  }
}

// 获取客服类型标签类型
const getServiceTypeTagType = (type: CustomerServiceType) => {
  switch (type) {
    case CustomerServiceType.AFTER_SALES: return 'warning'
    case CustomerServiceType.AUDIT: return 'info'
    case CustomerServiceType.LOGISTICS: return 'success'
    case CustomerServiceType.PRODUCT: return 'primary'
    case CustomerServiceType.GENERAL: return ''
    default: return ''
  }
}

// 获取数据范围显示名称
const getDataScopeDisplayName = (scope: DataScope) => {
  switch (scope) {
    case DataScope.ALL: return '全部数据'
    case DataScope.DEPARTMENT: return '部门数据'
    case DataScope.SELF: return '个人数据'
    case DataScope.CUSTOM: return '自定义范围'
    default: return '未知'
  }
}

// 获取数据范围标签类型
const getDataScopeTagType = (scope: DataScope) => {
  switch (scope) {
    case DataScope.ALL: return 'danger'
    case DataScope.DEPARTMENT: return 'warning'
    case DataScope.SELF: return 'info'
    case DataScope.CUSTOM: return 'primary'
    default: return ''
  }
}

// 获取权限显示名称
const getPermissionDisplayName = (permission: string) => {
  const permissionMap: Record<string, string> = {
    'customer:list:view': '查看客户列表',
    'customer:list:edit': '编辑客户信息',
    'customer:list:create': '创建客户',
    'customer:list:assign': '分配客户',
    'order:list:view': '查看订单列表',
    'order:list:edit': '编辑订单',
    'order:add:create': '创建订单',
    'order:audit:view': '查看审核订单',
    'order:audit:approve': '审核订单',
    'order:detail:cancel': '取消订单',
    'service:list:view': '查看服务列表',
    'service:list:edit': '编辑服务记录',
    'service:afterSales:view': '查看售后服务',
    'service:afterSales:edit': '处理售后服务',
    'logistics:shipping:view': '查看发货列表',
    'logistics:shipping:edit': '编辑发货信息',
    'logistics:shipping:batchExport': '批量导出',
    'product:list:view': '查看商品列表',
    'product:list:edit': '编辑商品信息',
    'product:add:create': '添加商品',
    'product:inventory:manage': '库存管理'
  }
  return permissionMap[permission] || permission
}

// 模拟数据
const mockCustomerServices: CustomerServiceUser[] = [
  {
    id: 'cs_001',
    name: '张客服',
    email: 'zhangcs@example.com',
    department: '客服部',
    departmentId: 'dept_cs',
    customerServiceType: CustomerServiceType.AFTER_SALES,
    dataScope: DataScope.CUSTOM,
    customPermissions: ['service:afterSales:view', 'service:afterSales:edit', 'order:list:view'],
    status: 'active'
  },
  {
    id: 'cs_002',
    name: '李客服',
    email: 'lics@example.com',
    department: '客服部',
    departmentId: 'dept_cs',
    customerServiceType: CustomerServiceType.AUDIT,
    dataScope: DataScope.CUSTOM,
    customPermissions: ['order:audit:view', 'order:audit:approve', 'customer:list:view'],
    status: 'active'
  },
  {
    id: 'cs_003',
    name: '王客服',
    email: 'wangcs@example.com',
    department: '客服部',
    departmentId: 'dept_cs',
    customerServiceType: CustomerServiceType.LOGISTICS,
    dataScope: DataScope.CUSTOM,
    customPermissions: ['logistics:shipping:view', 'logistics:shipping:edit', 'order:list:view'],
    status: 'active'
  }
]

const mockDepartments: Department[] = [
  { id: 'dept_001', name: '销售一部' },
  { id: 'dept_002', name: '销售二部' },
  { id: 'dept_003', name: '销售三部' },
  { id: 'dept_cs', name: '客服部' },
  { id: 'dept_logistics', name: '物流部' }
]

// 方法
const refreshData = async () => {
  await loadCustomerServices()
  updateServiceStats()
  ElMessage.success('数据刷新成功')
}

const exportPermissions = () => {
  ElMessage.info('导出权限配置功能开发中')
}

const showBatchConfig = () => {
  batchConfigVisible.value = true
}

const confirmBatchConfig = async () => {
  if (!batchConfig.value.targetType || !batchConfig.value.template) {
    ElMessage.warning('请选择客服类型和权限模板')
    return
  }
  
  try {
    // 这里调用批量配置API
    ElMessage.success('批量配置成功')
    batchConfigVisible.value = false
    refreshData()
  } catch (error) {
    ElMessage.error('批量配置失败')
  }
}

const updateServiceStats = () => {
  const total = customerServices.value.length
  const online = customerServices.value.filter(cs => cs.status === 'active').length
  const configured = customerServices.value.filter(cs => cs.customPermissions && cs.customPermissions.length > 0).length
  
  serviceStats.value = {
    total,
    online,
    configRate: total > 0 ? Math.round((configured / total) * 100) : 0
  }
}

const searchCustomerService = () => {
  // 搜索逻辑已在计算属性中实现
  ElMessage.info('搜索完成')
}

const loadCustomerServices = async () => {
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 500))
    customerServices.value = [...mockCustomerServices]
    departments.value = [...mockDepartments]
  } catch (error) {
    ElMessage.error('加载客服数据失败')
    console.error('Load customer services error:', error)
  }
}

const editPermissions = (cs: CustomerServiceUser) => {
  currentCustomerService.value = cs
  permissionForm.value = {
    customerServiceType: cs.customerServiceType,
    dataScope: cs.dataScope,
    departmentIds: cs.departmentIds || [],
    customPermissions: cs.customPermissions || []
  }
  permissionDialogVisible.value = true
}

const viewPermissions = (cs: CustomerServiceUser) => {
  currentCustomerService.value = cs
  detailDialogVisible.value = true
}

const handlePermissionCheck = () => {
  if (permissionTreeRef.value) {
    permissionForm.value.customPermissions = permissionTreeRef.value.getCheckedKeys() as string[]
  }
}

const savePermissions = async () => {
  try {
    if (!currentCustomerService.value) return

    // 模拟保存API调用
    await new Promise(resolve => setTimeout(resolve, 500))

    // 更新本地数据
    const index = customerServices.value.findIndex(cs => cs.id === currentCustomerService.value!.id)
    if (index > -1) {
      customerServices.value[index] = {
        ...customerServices.value[index],
        customerServiceType: permissionForm.value.customerServiceType,
        dataScope: permissionForm.value.dataScope,
        departmentIds: permissionForm.value.departmentIds,
        customPermissions: permissionForm.value.customPermissions
      }
    }

    permissionDialogVisible.value = false
    ElMessage.success('权限配置保存成功')
  } catch (error) {
    ElMessage.error('保存权限配置失败')
    console.error('Save permissions error:', error)
  }
}

// 组件挂载时加载数据
onMounted(() => {
  loadCustomerServices()
  updateServiceStats()
})
</script>

<style scoped>
.customer-service-permission-manager {
  padding: 20px;
}

.manager-description {
  line-height: 1.6;
}

.manager-description ul {
  margin: 10px 0;
  padding-left: 20px;
}

.manager-description li {
  margin: 5px 0;
}

.service-types {
  margin: 10px 0;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.service-types .el-tag {
  margin-right: 10px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #ebeef5;
}

.header-title {
  flex: 1;
}

.header-title h2 {
  margin: 0 0 15px 0;
}

.header-stats {
  display: flex;
  gap: 40px;
}

.header-actions {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.filters {
  margin-bottom: 20px;
}

.custom-permissions {
  max-width: 200px;
}

.no-permissions {
  color: #999;
  font-size: 12px;
}

.permission-tree {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 10px;
}

.permission-description {
  background-color: #f5f7fa;
  padding: 15px;
  border-radius: 4px;
  margin-top: 10px;
}

.permission-description ul {
  margin: 10px 0;
  padding-left: 20px;
}

.permission-description li {
  margin: 5px 0;
}

.permission-details {
  padding: 10px 0;
}

.custom-permissions-detail h4 {
  margin-bottom: 10px;
  color: #303133;
}

/* 页面标题样式 */
.page-title {
  font-size: 28px;
  font-weight: 700;
  color: #303133;
  margin: 0 0 8px 0;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.page-subtitle {
  font-size: 14px;
  color: #606266;
  margin: 0 0 15px 0;
  line-height: 1.5;
}

/* 底部信息样式 */
.bottom-info {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 20px;
}

.info-content {
  text-align: center;
}

.info-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #409eff;
  margin-bottom: 15px;
}

.info-text p {
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
  margin: 0 0 15px 0;
}

.service-types-simple {
  display: flex;
  justify-content: center;
  gap: 15px;
  flex-wrap: wrap;
}

.type-item {
  background: #e3f2fd;
  color: #1976d2;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 13px;
  font-weight: 500;
}
</style>