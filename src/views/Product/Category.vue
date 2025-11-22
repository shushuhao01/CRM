<template>
  <div class="category-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">商品分类管理</h1>
        <p class="page-description">管理商品分类，支持多级分类结构</p>
      </div>
      <div class="header-actions">
        <el-button type="primary" @click="handleAddCategory">
          <el-icon><Plus /></el-icon>
          新增分类
        </el-button>
      </div>
    </div>

    <!-- 搜索区域 -->
    <div class="search-section">
      <el-form :model="searchForm" inline>
        <el-form-item label="分类名称">
          <el-input
            v-model="searchForm.name"
            placeholder="请输入分类名称"
            clearable
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="请选择状态" clearable>
            <el-option label="启用" value="1" />
            <el-option label="禁用" value="0" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 分类树形表格 -->
    <div class="table-section">
      <el-table
        :data="categoryList"
        row-key="id"
        :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
        v-loading="loading"
        stripe
        border
      >
        <el-table-column prop="name" label="分类名称" min-width="200">
          <template #default="{ row }">
            <div class="category-name">
              <el-icon v-if="row.level === 1" class="level-icon"><Folder /></el-icon>
              <el-icon v-else class="level-icon"><Document /></el-icon>
              {{ row.name }}
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="code" label="分类编码" width="120" />
        <el-table-column prop="level" label="层级" width="80">
          <template #default="{ row }">
            <el-tag :type="row.level === 1 ? 'primary' : 'success'" size="small">
              {{ row.level === 1 ? '一级' : '二级' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="productCount" label="商品数量" width="100" align="center" />
        <el-table-column prop="sort" label="排序" width="80" align="center" />
        <el-table-column prop="status" label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-switch
              v-model="row.status"
              :active-value="1"
              :inactive-value="0"
              @change="handleStatusChange(row)"
            />
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" width="160" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.level === 1"
              type="primary"
              size="small"
              link
              @click="handleAddSubCategory(row)"
            >
              添加子分类
            </el-button>
            <el-button type="primary" size="small" link @click="handleEdit(row)">
              编辑
            </el-button>
            <el-button
              type="danger"
              size="small"
              link
              @click="handleDelete(row)"
              :disabled="row.productCount > 0"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 新增/编辑分类对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="600px"
      @close="handleDialogClose"
    >
      <el-form
        ref="formRef"
        :model="categoryForm"
        :rules="formRules"
        label-width="100px"
      >
        <el-form-item label="上级分类" prop="parentId">
          <el-select
            v-model="categoryForm.parentId"
            placeholder="请选择上级分类（不选则为一级分类）"
            clearable
            style="width: 100%"
          >
            <el-option label="无（一级分类）" :value="0" />
            <el-option
              v-for="item in parentCategoryOptions"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="分类名称" prop="name">
          <el-input
            v-model="categoryForm.name"
            placeholder="请输入分类名称"
            maxlength="50"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="分类编码" prop="code">
          <el-input
            v-model="categoryForm.code"
            placeholder="请输入分类编码"
            maxlength="20"
          />
        </el-form-item>
        <el-form-item label="排序" prop="sort">
          <el-input-number
            v-model="categoryForm.sort"
            :min="0"
            :max="999"
            controls-position="right"
            style="width: 150px"
          />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="categoryForm.status">
            <el-radio :label="1">启用</el-radio>
            <el-radio :label="0">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="categoryForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入分类描述"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmit" :loading="submitLoading">
            确定
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Folder, Document } from '@element-plus/icons-vue'
import { useProductStore } from '@/stores/product'

// 使用 productStore
const productStore = useProductStore()

// 接口定义
interface Category {
  id: string | number
  name: string
  code: string
  level: number
  parentId: string | number
  productCount: number
  sort: number
  status: number
  createTime: string
  children?: Category[]
}

// 响应式数据
const loading = ref(false)
const submitLoading = ref(false)
const dialogVisible = ref(false)
const dialogTitle = ref('新增分类')
const formRef = ref()

// 搜索表单
const searchForm = reactive({
  name: '',
  status: ''
})

// 分类表单
const categoryForm = reactive({
  id: null,
  parentId: '0',
  name: '',
  code: '',
  sort: 0,
  status: 1,
  description: ''
})

// 表单验证规则
const formRules = {
  name: [
    { required: true, message: '请输入分类名称', trigger: 'blur' },
    { min: 2, max: 50, message: '分类名称长度在 2 到 50 个字符', trigger: 'blur' }
  ],
  code: [
    { required: true, message: '请输入分类编码', trigger: 'blur' },
    { pattern: /^[A-Za-z0-9_-]+$/, message: '分类编码只能包含字母、数字、下划线和横线', trigger: 'blur' }
  ],
  sort: [
    { required: true, message: '请输入排序值', trigger: 'blur' }
  ]
}

// 分类列表数据 - 从 productStore 获取
const categoryList = computed(() => Array.isArray(productStore.categories) ? productStore.categories : [])

// 上级分类选项（一级分类）- 从 productStore 获取
const parentCategoryOptions = computed(() => 
  (Array.isArray(productStore.categories) ? productStore.categories : []).filter(cat => cat.level === 1)
)

// 方法
const loadData = async () => {
  loading.value = true
  try {
    // 从API加载分类数据
    await productStore.loadCategories()
    
    // 初始化状态标记，防止初始化时触发状态变化事件
    const categories = Array.isArray(productStore.categories) ? productStore.categories : []
    categories.forEach(category => {
      category._initializing = true
      category._lastStatus = category.status
      // 使用 nextTick 确保 DOM 更新后再移除初始化标记
      setTimeout(() => {
        category._initializing = false
      }, 100)
    })
    
    console.log('分类数据加载完成')
  } catch (error) {
    console.error('加载数据失败:', error)
    ElMessage.error('加载分类数据失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  console.log('搜索分类:', searchForm)
  loadData()
}

const handleReset = () => {
  searchForm.name = ''
  searchForm.status = ''
  loadData()
}

const handleAddCategory = () => {
  dialogTitle.value = '新增分类'
  resetForm()
  dialogVisible.value = true
}

const handleAddSubCategory = (row: Category) => {
  dialogTitle.value = '新增子分类'
  resetForm()
  categoryForm.parentId = row.id
  dialogVisible.value = true
}

const handleEdit = (row: Category) => {
  dialogTitle.value = '编辑分类'
  Object.assign(categoryForm, {
    id: row.id,
    parentId: row.parentId,
    name: row.name,
    code: row.code,
    sort: row.sort,
    status: row.status,
    description: row.description || ''
  })
  dialogVisible.value = true
}

const handleDelete = async (row: Category) => {
  if (row.productCount && row.productCount > 0) {
    ElMessage.warning('该分类下有商品，无法删除')
    return
  }
  
  try {
    await ElMessageBox.confirm(
      `确定要删除分类"${row.name}"吗？`,
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    // 调用真实API删除分类
    await productStore.deleteCategory(row.id.toString())
    ElMessage.success('删除成功')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

const handleStatusChange = async (row: Category) => {
  const originalStatus = row.status
  
  // 防止重复调用和初始化时的意外触发
  if (row._updating || row._initializing || !row.id) {
    return
  }
  
  // 检查状态是否真的发生了变化
  if (row._lastStatus !== undefined && row._lastStatus === row.status) {
    return
  }
  
  try {
    row._updating = true
    // 调用真实API更新状态
    await productStore.updateCategory(row.id.toString(), { status: row.status })
    
    // 更新最后状态记录
    row._lastStatus = row.status
    
    ElMessage.success(`${row.status ? '启用' : '禁用'}成功`)
  } catch (error) {
    // 恢复原状态
    row.status = originalStatus
    row._lastStatus = originalStatus
    console.error('状态更新失败:', error)
    ElMessage.error('状态更新失败')
  } finally {
    row._updating = false
  }
}

const handleSubmit = async () => {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    submitLoading.value = true
    
    if (categoryForm.id) {
      // 编辑分类 - 调用真实API
      await productStore.updateCategory(categoryForm.id.toString(), {
        name: categoryForm.name,
        code: categoryForm.code,
        sort: categoryForm.sort,
        status: categoryForm.status
      })
      ElMessage.success('编辑成功')
    } else {
      // 新增分类 - 调用真实API
      const newCategoryData = {
        name: categoryForm.name,
        code: categoryForm.code,
        level: (!categoryForm.parentId || categoryForm.parentId === '0') ? 1 : 2,
        parentId: (!categoryForm.parentId || categoryForm.parentId === '0') ? null : categoryForm.parentId,
        productCount: 0,
        sort: categoryForm.sort,
        status: categoryForm.status
      }
      
      await productStore.addCategory(newCategoryData)
      ElMessage.success('新增成功')
    }
    
    dialogVisible.value = false
  } catch (error) {
    console.error('操作失败:', error)
    ElMessage.error('操作失败，请重试')
  } finally {
    submitLoading.value = false
  }
}

const handleDialogClose = () => {
  formRef.value?.resetFields()
  resetForm()
}

const resetForm = () => {
  Object.assign(categoryForm, {
    id: null,
    parentId: 0,
    name: '',
    code: '',
    sort: 0,
    status: 1,
    description: ''
  })
}

// 生命周期
onMounted(() => {
  loadData()
})
</script>

<style scoped>
.category-container {
  padding: 20px;
  background: #f5f5f5;
  min-height: 100vh;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.header-left {
  flex: 1;
}

.page-title {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.page-description {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.search-section {
  margin-bottom: 20px;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.table-section {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.category-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.level-icon {
  color: #409eff;
}

.dialog-footer {
  text-align: right;
}

:deep(.el-table) {
  border-radius: 0;
}

:deep(.el-table__header) {
  background-color: #fafafa;
}

:deep(.el-form-item) {
  margin-bottom: 20px;
}
</style>