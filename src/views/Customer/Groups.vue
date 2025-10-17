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
            <el-radio value="active">启用</el-radio>
            <el-radio value="inactive">禁用</el-radio>
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
        <el-table-column prop="name" label="客户姓名" />
        <el-table-column prop="phone" label="手机号">
          <template #default="{ row }">
            {{ displaySensitiveInfoNew(row.phone, SensitiveInfoType.PHONE, userStore.currentUser?.id || '') }}
          </template>
        </el-table-column>
        <el-table-column prop="level" label="客户等级" />
        <el-table-column prop="totalAmount" label="消费金额" />
        <el-table-column prop="lastOrderTime" label="最后消费时间" />
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { maskPhone } from '@/utils/phone'
import { displaySensitiveInfo as displaySensitiveInfoNew } from '@/utils/sensitiveInfo'
import { SensitiveInfoType } from '@/services/permission'
import { useUserStore } from '@/stores/user'
import { customerGroupApi, type CustomerGroup, type GroupSearchParams } from '@/api/customerGroups'

// 响应式数据
const userStore = useUserStore()
const loading = ref(false)
const submitLoading = ref(false)
const customersLoading = ref(false)
const dialogVisible = ref(false)
const customersDialogVisible = ref(false)
const dialogTitle = ref('')
const formRef = ref()

// 搜索表单
const searchForm = reactive({
  name: '',
  status: ''
})

// 分组列表
const groupList = ref([])
const selectedGroups = ref([])
const groupCustomers = ref([])

// 分页
const pagination = reactive({
  currentPage: 1,
  pageSize: 20,
  total: 0
})

// 表单数据
const form = reactive({
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
    const params: GroupSearchParams = {
      name: searchForm.name,
      status: searchForm.status,
      page: pagination.currentPage,
      pageSize: pagination.pageSize
    }
    
    const response = await customerGroupApi.getList(params)
    
    if (response.success) {
      groupList.value = response.data.list
      pagination.total = response.data.total
    } else {
      ElMessage.error(response.message || '加载数据失败')
    }
  } catch (error) {
    console.error('加载分组数据失败:', error)
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
  Object.keys(searchForm).forEach(key => {
    searchForm[key] = ''
  })
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
  customersDialogVisible.value = true
  customersLoading.value = true
  
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 500))
    
    groupCustomers.value = [
      {
        name: '张三',
        phone: '13800138001',
        level: 'gold',
        totalAmount: 15000,
        lastOrderTime: '2024-01-20 14:30:00'
      },
      {
        name: '李四',
        phone: '13800138002',
        level: 'silver',
        totalAmount: 8500,
        lastOrderTime: '2024-01-18 10:15:00'
      }
    ]
  } catch (error) {
    ElMessage.error('加载客户数据失败')
  } finally {
    customersLoading.value = false
  }
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
  Object.assign(form, {
    id: '',
    name: '',
    description: '',
    status: 'active',
    conditions: []
  })
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