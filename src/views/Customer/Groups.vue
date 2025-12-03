<template>
  <div class="customer-groups">
    <div class="page-header">
      <h2>客户分组管理</h2>
      <div class="header-actions">
        <el-button type="primary" @click="handleAdd">
          <el-icon><Plus /></el-icon>
          新增分组
        </el-button>
      </div>
    </div>

    <!-- 搜索筛选 -->
    <el-card class="search-card">
      <el-form :model="searchForm" inline>
        <el-form-item label="分组名称">
          <el-input v-model="searchForm.name" placeholder="请输入分组名称" clearable />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="请选择状态" clearable>
            <el-option label="启用" value="active" />
            <el-option label="禁用" value="inactive" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 分组列表 -->
    <el-card class="table-card">
      <el-table
        :data="groupList"
        v-loading="loading"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="name" label="分组名称" />
        <el-table-column prop="description" label="分组描述" />
        <el-table-column prop="customerCount" label="客户数量" />
        <el-table-column prop="status" label="状态">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'danger'">
              {{ row.status === 'active' ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" />
        <el-table-column label="操作" width="250">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button type="info" size="small" @click="handleViewCustomers(row)">查看客户</el-button>
            <el-button type="danger" size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="pagination.currentPage"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadData"
          @current-change="loadData"
        />
      </div>
    </el-card>

    <!-- 新增/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="600px"
      @close="handleDialogClose"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-width="100px"
      >
        <el-form-item label="分组名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入分组名称" />
        </el-form-item>
        <el-form-item label="分组描述" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="请输入分组描述"
          />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio label="active">启用</el-radio>
            <el-radio label="inactive">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="分组条件">
          <div class="condition-builder">
            <div v-for="(condition, index) in form.conditions" :key="index" class="condition-item">
              <el-select v-model="condition.field" placeholder="选择字段">
                <el-option label="客户等级" value="level" />
                <el-option label="注册时间" value="registerTime" />
                <el-option label="最后消费时间" value="lastOrderTime" />
                <el-option label="消费金额" value="totalAmount" />
              </el-select>
              <el-select v-model="condition.operator" placeholder="选择条件">
                <el-option label="等于" value="eq" />
                <el-option label="不等于" value="ne" />
                <el-option label="大于" value="gt" />
                <el-option label="小于" value="lt" />
                <el-option label="包含" value="contains" />
              </el-select>
              <el-input v-model="condition.value" placeholder="输入值" />
              <el-button type="danger" size="small" @click="removeCondition(index)">删除</el-button>
            </div>
            <el-button type="primary" size="small" @click="addCondition">添加条件</el-button>
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitLoading">
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 查看客户对话框 -->
    <el-dialog
      v-model="customersDialogVisible"
      title="分组客户列表"
      width="800px"
    >
      <el-table :data="groupCustomers" v-loading="customersLoading">
        <el-table-column prop="name" label="客户姓名" width="120">
          <template #default="{ row }">
            <el-link
              type="primary"
              @click="handleViewCustomerDetail(row)"
              :underline="false"
            >
              {{ row.name }}
            </el-link>
          </template>
        </el-table-column>
        <el-table-column prop="phone" label="手机号">
          <template #default="{ row }">
            {{ displaySensitiveInfoNew(row.phone, SensitiveInfoType.PHONE, userStore.currentUser?.id || '') }}
          </template>
        </el-table-column>
        <el-table-column prop="level" label="客户等级">
          <template #default="{ row }">
            <el-tag v-if="row.level === 'diamond'" type="danger">钻石</el-tag>
            <el-tag v-else-if="row.level === 'gold'" type="warning">金牌</el-tag>
            <el-tag v-else-if="row.level === 'silver'" type="info">银牌</el-tag>
            <el-tag v-else type="">铜牌</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="totalAmount" label="消费金额">
          <template #default="{ row }">
            ¥{{ (row.totalAmount || 0).toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column prop="lastOrderTime" label="最后消费时间" />
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { displaySensitiveInfo as displaySensitiveInfoNew } from '@/utils/sensitiveInfo'
import { SensitiveInfoType } from '@/services/permission'
import { useUserStore } from '@/stores/user'
import { useCustomerStore } from '@/stores/customer'
import { customerGroupApi, type CustomerGroup, type GroupSearchParams } from '@/api/customerGroups'

// 响应式数据
const router = useRouter()
const userStore = useUserStore()
const customerStore = useCustomerStore()
const loading = ref(false)
const submitLoading = ref(false)
const customersLoading = ref(false)
const dialogVisible = ref(false)
const customersDialogVisible = ref(false)
const dialogTitle = ref('')
const formRef = ref()
const currentGroup = ref<CustomerGroup | null>(null)

// 搜索表单
const searchForm = reactive({
  name: '',
  status: ''
})

// 分组列表
const groupList = ref<CustomerGroup[]>([])
const selectedGroups = ref<CustomerGroup[]>([])
const groupCustomers = ref<any[]>([])

// 分页
const pagination = reactive({
  currentPage: 1,
  pageSize: 20,
  total: 0
})

// 表单数据
const form = reactive<{
  id: string
  name: string
  description: string
  status: 'active' | 'inactive'
  conditions: Array<{
    field: string
    operator: string
    value: string
  }>
}>({
  id: '',
  name: '',
  description: '',
  status: 'active',
  conditions: []
})

// 表单验证规则
const formRules = {
  name: [
    { required: true, message: '请输入分组名称', trigger: 'blur' }
  ],
  description: [
    { required: true, message: '请输入分组描述', trigger: 'blur' }
  ],
  status: [
    { required: true, message: '请选择状态', trigger: 'change' }
  ]
}

// 方法
const loadData = async () => {
  loading.value = true
  try {
    // 确保客户数据已加载，用于计算分组关联的客户数量
    if (customerStore.customers.length === 0) {
      await customerStore.loadCustomers()
    }

    const params: GroupSearchParams = {
      name: searchForm.name,
      status: searchForm.status,
      page: pagination.currentPage,
      pageSize: pagination.pageSize
    }

    const response = await customerGroupApi.getList(params)

    if (response.success) {
      const groups = response.data?.list || []

      // 实时计算每个分组的客户数量
      groups.forEach(group => {
        group.customerCount = calculateGroupCustomerCount(group)
      })

      groupList.value = groups
      pagination.total = response.data?.total || 0

      console.log('[CustomerGroups] 加载分组列表成功:', groups.length)
    } else {
      ElMessage.error(response.message || '加载数据失败')
    }
  } catch (error) {
    console.error('[CustomerGroups] 加载分组数据失败:', error)
    ElMessage.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.currentPage = 1
  loadData()
}

const handleReset = () => {
  searchForm.name = ''
  searchForm.status = ''
  handleSearch()
}

const handleAdd = () => {
  dialogTitle.value = '新增分组'
  resetForm()
  dialogVisible.value = true
}

const handleEdit = (row: CustomerGroup) => {
  dialogTitle.value = '编辑分组'
  Object.assign(form, {
    ...row,
    conditions: row.conditions || []
  })
  dialogVisible.value = true
}

const handleDelete = async (row: CustomerGroup) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除分组"${row.name}"吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const response = await customerGroupApi.delete(row.id)

    if (response.success) {
      ElMessage.success('删除成功')
      loadData()
    } else {
      ElMessage.error(response.message || '删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除分组失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

const handleViewCustomers = async (row: CustomerGroup) => {
  currentGroup.value = row
  customersDialogVisible.value = true
  customersLoading.value = true

  try {
    // 从customerStore获取所有客户
    const allCustomers = customerStore.customers || []

    // 根据分组条件筛选客户
    const filteredCustomers = filterCustomersByConditions(allCustomers, row.conditions)

    groupCustomers.value = filteredCustomers

    console.log('[CustomerGroups] 分组客户数量:', filteredCustomers.length)
  } catch (error) {
    console.error('[CustomerGroups] 加载客户数据失败:', error)
    ElMessage.error('加载客户数据失败')
  } finally {
    customersLoading.value = false
  }
}

// 根据条件筛选客户
const filterCustomersByConditions = (customers: any[], conditions: any[]) => {
  if (!conditions || conditions.length === 0) {
    return customers
  }

  return customers.filter(customer => {
    return conditions.every(condition => {
      const { field, operator, value } = condition

      if (!field || !operator || value === undefined || value === '') {
        return true
      }

      let customerValue = customer[field]

      // 处理不同字段的值
      switch (field) {
        case 'level':
          customerValue = customer.level || 'bronze'
          break
        case 'registerTime':
          customerValue = customer.createTime ? new Date(customer.createTime).getTime() : 0
          break
        case 'lastOrderTime':
          customerValue = customer.lastOrderTime ? new Date(customer.lastOrderTime).getTime() : 0
          break
        case 'totalAmount':
          customerValue = customer.totalAmount || 0
          break
      }

      // 执行条件匹配
      switch (operator) {
        case 'eq':
          return customerValue === value
        case 'ne':
          return customerValue !== value
        case 'gt':
          return Number(customerValue) > Number(value)
        case 'lt':
          return Number(customerValue) < Number(value)
        case 'gte':
          return Number(customerValue) >= Number(value)
        case 'lte':
          return Number(customerValue) <= Number(value)
        case 'contains':
          return String(customerValue).toLowerCase().includes(String(value).toLowerCase())
        default:
          return false
      }
    })
  })
}

// 计算分组客户数量
const calculateGroupCustomerCount = (group: CustomerGroup) => {
  const allCustomers = customerStore.customers || []
  const filteredCustomers = filterCustomersByConditions(allCustomers, group.conditions)
  return filteredCustomers.length
}

const handleSubmit = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()

    submitLoading.value = true

    let response
    if (form.id) {
      // 更新分组
      response = await customerGroupApi.update(form.id, {
        name: form.name,
        description: form.description,
        status: form.status,
        conditions: form.conditions
      })
    } else {
      // 创建分组
      response = await customerGroupApi.create({
        name: form.name,
        description: form.description,
        status: form.status,
        conditions: form.conditions
      })
    }

    if (response.success) {
      ElMessage.success(form.id ? '更新成功' : '创建成功')
      dialogVisible.value = false
      loadData()
    } else {
      ElMessage.error(response.message || '操作失败')
    }
  } catch (error) {
    console.error('提交分组失败:', error)
    ElMessage.error('操作失败')
  } finally {
    submitLoading.value = false
  }
}

const handleDialogClose = () => {
  formRef.value?.clearValidate()
  resetForm()
}

const resetForm = () => {
  form.id = ''
  form.name = ''
  form.description = ''
  form.status = 'active'
  form.conditions = []
}

const handleSelectionChange = (selection: CustomerGroup[]) => {
  selectedGroups.value = selection
}

const addCondition = () => {
  form.conditions.push({
    field: '',
    operator: '',
    value: ''
  })
}

const removeCondition = (index: number) => {
  form.conditions.splice(index, 1)
}

// 查看客户详情
const handleViewCustomerDetail = (customer: unknown) => {
  // 跳转到客户详情页面
  router.push({
    name: 'CustomerDetail',
    params: { id: customer.id }
  })
}

// 生命周期
onMounted(() => {
  loadData()
})
</script>

<style scoped>
.customer-groups {
  padding: 20px;
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

.search-card {
  margin-bottom: 20px;
}

.table-card {
  margin-bottom: 20px;
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.condition-builder {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 12px;
  background-color: #f5f7fa;
}

.condition-item {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  align-items: center;
}

.condition-item:last-child {
  margin-bottom: 0;
}
</style>
