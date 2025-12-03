<template>
  <div class="customer-tags">
    <div class="page-header">
      <h2>客户标签管理</h2>
      <div class="header-actions">
        <el-button type="primary" @click="handleAdd">
          <el-icon><Plus /></el-icon>
          新增标签
        </el-button>
      </div>
    </div>

    <!-- 搜索筛选 -->
    <el-card class="search-card">
      <el-form :model="searchForm" inline>
        <el-form-item label="标签名称">
          <el-input v-model="searchForm.name" placeholder="请输入标签名称" clearable />
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

    <!-- 标签列表 -->
    <el-card class="table-card">
      <el-table
        :data="tagList"
        v-loading="loading"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="name" label="标签名称" />
        <el-table-column prop="color" label="标签颜色">
          <template #default="{ row }">
            <el-tag :color="row.color" :style="{ color: getTextColor(row.color) }">
              {{ row.name }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="customerCount" label="关联客户数">
          <template #default="{ row }">
            <el-link
              type="primary"
              @click="handleViewCustomers(row)"
              :underline="false"
            >
              {{ row.customerCount }}
            </el-link>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'danger'">
              {{ row.status === 'active' ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" />
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleEdit(row)">编辑</el-button>
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

    <!-- 查看客户对话框 -->
    <el-dialog
      v-model="customersDialogVisible"
      title="标签关联客户列表"
      width="900px"
    >
      <div v-if="currentTag" class="dialog-header">
        <el-tag :color="currentTag.color" :style="{ color: getTextColor(currentTag.color) }">
          {{ currentTag.name }}
        </el-tag>
        <span class="customer-count">共 {{ tagCustomers.length }} 个客户</span>
      </div>

      <el-table :data="tagCustomers" v-loading="customersLoading" style="margin-top: 16px;">
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
        <el-table-column prop="phone" label="手机号" width="140">
          <template #default="{ row }">
            {{ displaySensitiveInfoNew(row.phone, SensitiveInfoType.PHONE, userStore.currentUser?.id || '') }}
          </template>
        </el-table-column>
        <el-table-column prop="level" label="客户等级" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.level === 'diamond'" type="danger">钻石</el-tag>
            <el-tag v-else-if="row.level === 'gold'" type="warning">金牌</el-tag>
            <el-tag v-else-if="row.level === 'silver'" type="info">银牌</el-tag>
            <el-tag v-else type="">铜牌</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="totalAmount" label="消费金额" width="120">
          <template #default="{ row }">
            ¥{{ (row.totalAmount || 0).toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column prop="source" label="客户来源" width="120" />
        <el-table-column prop="createTime" label="注册时间" width="160" />
      </el-table>
    </el-dialog>

    <!-- 新增/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="500px"
      @close="handleDialogClose"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-width="80px"
      >
        <el-form-item label="标签名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入标签名称" />
        </el-form-item>
        <el-form-item label="标签颜色" prop="color">
          <el-color-picker v-model="form.color" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio label="active">启用</el-radio>
            <el-radio label="inactive">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="请输入标签描述"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitLoading">
          确定
        </el-button>
      </template>
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
import { customerTagApi, type CustomerTag, type TagSearchParams } from '@/api/customerTags'

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
const currentTag = ref<CustomerTag | null>(null)

// 搜索表单
const searchForm = reactive({
  name: '',
  status: ''
})

// 标签列表
const tagList = ref<CustomerTag[]>([])
const selectedTags = ref<CustomerTag[]>([])
const tagCustomers = ref<any[]>([])

// 分页
const pagination = reactive({
  currentPage: 1,
  pageSize: 20,
  total: 0
})

// 表单数据
const form = reactive<CustomerTag>({
  id: '',
  name: '',
  color: '#409EFF',
  status: 'active',
  description: '',
  customerCount: 0,
  createTime: ''
})

// 表单验证规则
const formRules = {
  name: [
    { required: true, message: '请输入标签名称', trigger: 'blur' }
  ],
  color: [
    { required: true, message: '请选择标签颜色', trigger: 'change' }
  ],
  status: [
    { required: true, message: '请选择状态', trigger: 'change' }
  ]
}

// 方法
const loadData = async () => {
  loading.value = true
  try {
    // 确保客户数据已加载，用于计算标签关联的客户数量
    if (customerStore.customers.length === 0) {
      await customerStore.loadCustomers()
    }

    const params: TagSearchParams = {
      name: searchForm.name,
      status: searchForm.status,
      page: pagination.currentPage,
      pageSize: pagination.pageSize
    }

    const response = await customerTagApi.getList(params)

    if (response.success) {
      const tags = response.data?.list || []

      // 实时计算每个标签的客户数量
      tags.forEach(tag => {
        tag.customerCount = calculateTagCustomerCount(tag.id)
      })

      tagList.value = tags
      pagination.total = response.data?.total || 0

      console.log('[CustomerTags] 加载标签列表成功:', tags.length)
    } else {
      ElMessage.error(response.message || '加载数据失败')
    }
  } catch (error) {
    console.error('[CustomerTags] 加载标签数据失败:', error)
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
  dialogTitle.value = '新增标签'
  resetForm()
  dialogVisible.value = true
}

const handleEdit = (row: CustomerTag) => {
  dialogTitle.value = '编辑标签'
  Object.assign(form, row)
  dialogVisible.value = true
}

const handleDelete = async (row: CustomerTag) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除标签"${row.name}"吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const response = await customerTagApi.delete(row.id)

    if (response.success) {
      ElMessage.success('删除成功')
      loadData()
    } else {
      ElMessage.error(response.message || '删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除标签失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

const handleSubmit = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()

    submitLoading.value = true

    let response
    if (form.id) {
      // 更新标签
      response = await customerTagApi.update(form.id, {
        name: form.name,
        color: form.color,
        status: form.status,
        description: form.description
      })
    } else {
      // 创建标签
      response = await customerTagApi.create({
        name: form.name,
        color: form.color,
        status: form.status,
        description: form.description
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
    console.error('提交标签失败:', error)
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
  Object.assign(form, {
    id: '',
    name: '',
    color: '#409EFF',
    status: 'active',
    description: ''
  })
}

const handleSelectionChange = (selection: CustomerTag[]) => {
  selectedTags.value = selection
}

const getTextColor = (backgroundColor: string) => {
  // 简单的颜色对比度计算，返回合适的文字颜色
  const hex = backgroundColor.replace('#', '')
  const r = parseInt(hex.substr(0, 2), 16)
  const g = parseInt(hex.substr(2, 2), 16)
  const b = parseInt(hex.substr(4, 2), 16)
  const brightness = (r * 299 + g * 587 + b * 114) / 1000
  return brightness > 128 ? '#000000' : '#FFFFFF'
}

// 查看标签关联的客户
const handleViewCustomers = async (row: CustomerTag) => {
  currentTag.value = row
  customersDialogVisible.value = true
  customersLoading.value = true

  try {
    // 从customerStore获取所有客户
    const allCustomers = customerStore.customers || []

    // 筛选包含该标签的客户
    const filteredCustomers = allCustomers.filter(customer => {
      const customerTags = customer.tags || []
      return customerTags.includes(row.id)
    })

    tagCustomers.value = filteredCustomers

    console.log('[CustomerTags] 标签关联客户数量:', filteredCustomers.length)
  } catch (error) {
    console.error('[CustomerTags] 加载客户数据失败:', error)
    ElMessage.error('加载客户数据失败')
  } finally {
    customersLoading.value = false
  }
}

// 查看客户详情
const handleViewCustomerDetail = (customer: unknown) => {
  // 跳转到客户详情页面
  router.push({
    name: 'CustomerDetail',
    params: { id: customer.id }
  })
}

// 计算标签关联的客户数量
const calculateTagCustomerCount = (tagId: string) => {
  const allCustomers = customerStore.customers || []
  const count = allCustomers.filter(customer => {
    const customerTags = customer.tags || []
    return customerTags.includes(tagId)
  }).length
  return count
}

// 生命周期
onMounted(() => {
  loadData()
})
</script>

<style scoped>
.customer-tags {
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

.dialog-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.customer-count {
  color: #606266;
  font-size: 14px;
}
</style>
