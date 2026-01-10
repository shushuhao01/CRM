<template>
  <div class="page-container">
    <el-card shadow="never" class="table-card">
      <template #header>
        <div class="card-header">
          <span>套餐管理</span>
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon>新增套餐
          </el-button>
        </div>
      </template>

      <el-tabs v-model="activeTab" @tab-change="loadPackages">
        <el-tab-pane label="SaaS云端版" name="saas" />
        <el-tab-pane label="私有部署版" name="private" />
      </el-tabs>

      <div v-loading="loading" class="package-grid">
        <div
          v-for="pkg in packages"
          :key="pkg.id"
          class="package-card"
          :class="{ recommended: pkg.is_recommended, trial: pkg.is_trial, disabled: !pkg.status }"
        >
          <div v-if="pkg.is_recommended" class="recommend-badge">推荐</div>
          <div v-if="pkg.is_trial" class="trial-badge">免费试用</div>
          <div v-if="!pkg.status" class="disabled-badge">已禁用</div>

          <div class="package-header">
            <h3>{{ pkg.name }}</h3>
            <div class="price">
              <span v-if="pkg.price === 0" class="amount free">免费</span>
              <span v-else class="amount">¥{{ pkg.price }}</span>
              <span class="unit">/{{ getBillingText(pkg.billing_cycle) }}</span>
            </div>
          </div>

          <div class="package-info">
            <div class="info-item">
              <el-icon><User /></el-icon>
              <span>{{ pkg.max_users >= 99999 ? '不限' : pkg.max_users }} 用户</span>
            </div>
            <div class="info-item" v-if="pkg.max_storage_gb > 0">
              <el-icon><Files /></el-icon>
              <span>{{ pkg.max_storage_gb }}GB 存储</span>
            </div>
          </div>

          <div class="package-features">
            <div v-for="f in pkg.features" :key="f" class="feature-item">
              <el-icon><Check /></el-icon>{{ f }}
            </div>
          </div>

          <div class="package-meta">
            <el-tag size="small" :type="pkg.is_visible ? 'success' : 'info'">
              {{ pkg.is_visible ? '官网显示' : '官网隐藏' }}
            </el-tag>
            <span class="sort-order">排序: {{ pkg.sort_order }}</span>
          </div>

          <div class="package-actions">
            <el-button type="primary" text @click="handleEdit(pkg)">编辑</el-button>
            <el-button :type="pkg.status ? 'warning' : 'success'" text @click="handleToggleStatus(pkg)">
              {{ pkg.status ? '禁用' : '启用' }}
            </el-button>
            <el-button type="danger" text @click="handleDelete(pkg)">删除</el-button>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 编辑弹窗 -->
    <el-dialog v-model="showDialog" :title="editingId ? '编辑套餐' : '新增套餐'" width="600px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="套餐名称" prop="name">
          <el-input v-model="form.name" placeholder="如：基础版" />
        </el-form-item>
        <el-form-item label="套餐代码" prop="code">
          <el-input v-model="form.code" placeholder="如：SAAS_BASIC" :disabled="!!editingId" />
        </el-form-item>
        <el-form-item label="套餐类型" prop="type">
          <el-select v-model="form.type" :disabled="!!editingId">
            <el-option label="SaaS云端版" value="saas" />
            <el-option label="私有部署版" value="private" />
          </el-select>
        </el-form-item>
        <el-form-item label="套餐描述">
          <el-input v-model="form.description" type="textarea" rows="2" />
        </el-form-item>
        <el-form-item label="价格" prop="price">
          <el-input-number v-model="form.price" :min="0" :precision="2" style="width: 150px" />
          <el-select v-model="form.billing_cycle" style="width: 120px; margin-left: 8px">
            <el-option label="月付" value="monthly" />
            <el-option label="年付" value="yearly" />
            <el-option label="一次性" value="once" />
          </el-select>
        </el-form-item>
        <el-form-item label="有效期">
          <el-input-number v-model="form.duration_days" :min="1" /> 天
        </el-form-item>
        <el-form-item label="用户数上限">
          <el-input-number v-model="form.max_users" :min="1" />
        </el-form-item>
        <el-form-item label="存储空间">
          <el-input-number v-model="form.max_storage_gb" :min="0" /> GB
        </el-form-item>
        <el-form-item label="功能特性">
          <div v-for="(f, i) in form.features" :key="i" class="feature-input">
            <el-input v-model="form.features[i]" placeholder="输入功能特性" />
            <el-button type="danger" link @click="form.features.splice(i, 1)">
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
          <el-button type="primary" link @click="form.features.push('')">
            <el-icon><Plus /></el-icon>添加特性
          </el-button>
        </el-form-item>
        <el-form-item label="选项">
          <el-checkbox v-model="form.is_trial">试用套餐</el-checkbox>
          <el-checkbox v-model="form.is_recommended">推荐套餐</el-checkbox>
          <el-checkbox v-model="form.is_visible">官网显示</el-checkbox>
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort_order" :min="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, User, Files, Check, Delete } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import { getPackages, createPackage, updatePackage, deletePackage, type Package } from '@/api/packages'

const activeTab = ref('saas')
const loading = ref(false)
const submitting = ref(false)
const showDialog = ref(false)
const editingId = ref<number | null>(null)
const formRef = ref<FormInstance>()
const packages = ref<Package[]>([])

const form = reactive({
  name: '',
  code: '',
  type: 'saas' as 'saas' | 'private',
  description: '',
  price: 0,
  billing_cycle: 'monthly' as 'monthly' | 'yearly' | 'once',
  duration_days: 30,
  max_users: 10,
  max_storage_gb: 5,
  features: [''] as string[],
  is_trial: false,
  is_recommended: false,
  is_visible: true,
  sort_order: 0,
  status: true
})

const rules: FormRules = {
  name: [{ required: true, message: '请输入套餐名称' }],
  code: [{ required: true, message: '请输入套餐代码' }],
  type: [{ required: true, message: '请选择套餐类型' }],
  price: [{ required: true, message: '请输入价格' }]
}

const getBillingText = (cycle: string) => {
  const map: Record<string, string> = {
    monthly: '月',
    yearly: '年',
    once: '永久'
  }
  return map[cycle] || cycle
}

const loadPackages = async () => {
  loading.value = true
  try {
    const res = await getPackages({ type: activeTab.value })
    packages.value = res.data || []
  } catch (error) {
    console.error('加载套餐失败:', error)
  } finally {
    loading.value = false
  }
}

const resetForm = () => {
  Object.assign(form, {
    name: '', code: '', type: activeTab.value, description: '',
    price: 0, billing_cycle: 'monthly', duration_days: 30,
    max_users: 10, max_storage_gb: 5, features: [''],
    is_trial: false, is_recommended: false, is_visible: true,
    sort_order: 0, status: true
  })
}

const handleAdd = () => {
  editingId.value = null
  resetForm()
  showDialog.value = true
}

const handleEdit = (pkg: Package) => {
  editingId.value = pkg.id
  Object.assign(form, {
    ...pkg,
    features: pkg.features?.length ? [...pkg.features] : ['']
  })
  showDialog.value = true
}

const handleToggleStatus = async (pkg: Package) => {
  try {
    await updatePackage(pkg.id, { ...pkg, status: !pkg.status })
    ElMessage.success(pkg.status ? '已禁用' : '已启用')
    loadPackages()
  } catch (error) {
    ElMessage.error('操作失败')
  }
}

const handleDelete = async (pkg: Package) => {
  try {
    await ElMessageBox.confirm(`确定删除套餐"${pkg.name}"？`, '提示', { type: 'warning' })
    await deletePackage(pkg.id)
    ElMessage.success('删除成功')
    loadPackages()
  } catch (error) {
    // 取消删除
  }
}

const handleSubmit = async () => {
  await formRef.value?.validate()
  submitting.value = true
  try {
    const data = {
      ...form,
      features: form.features.filter(f => f.trim())
    }
    if (editingId.value) {
      await updatePackage(editingId.value, data)
    } else {
      await createPackage(data)
    }
    ElMessage.success('保存成功')
    showDialog.value = false
    loadPackages()
  } catch (error) {
    ElMessage.error('保存失败')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadPackages()
})
</script>

<style scoped lang="scss">
.page-container { display: flex; flex-direction: column; gap: 16px; }
.table-card { border-radius: 8px; border: none; }
.card-header { display: flex; justify-content: space-between; align-items: center; }

.package-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  margin-top: 16px;
}

.package-card {
  position: relative;
  padding: 24px;
  border: 1px solid #e4e7ed;
  border-radius: 12px;
  background: #fff;
  transition: all 0.3s;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }

  &.recommended {
    border-color: #409eff;
    box-shadow: 0 0 0 1px #409eff;
  }

  &.trial {
    border-color: #67c23a;
  }

  &.disabled {
    opacity: 0.6;
    background: #f5f7fa;
  }
}

.recommend-badge, .trial-badge, .disabled-badge {
  position: absolute;
  top: -1px;
  right: 16px;
  padding: 4px 12px;
  font-size: 12px;
  border-radius: 0 0 8px 8px;
  color: #fff;
}

.recommend-badge { background: #409eff; }
.trial-badge { background: #67c23a; }
.disabled-badge { background: #909399; }

.package-header {
  text-align: center;
  margin-bottom: 16px;

  h3 {
    margin: 0 0 8px;
    font-size: 18px;
    color: #303133;
  }

  .price {
    .amount {
      font-size: 32px;
      font-weight: bold;
      color: #409eff;

      &.free { color: #67c23a; }
    }
    .unit {
      font-size: 14px;
      color: #909399;
    }
  }
}

.package-info {
  display: flex;
  justify-content: center;
  gap: 24px;
  padding: 12px 0;
  border-top: 1px solid #ebeef5;
  border-bottom: 1px solid #ebeef5;

  .info-item {
    display: flex;
    align-items: center;
    gap: 4px;
    color: #606266;
    font-size: 14px;
  }
}

.package-features {
  padding: 16px 0;
  min-height: 100px;

  .feature-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 0;
    font-size: 13px;
    color: #606266;

    .el-icon { color: #67c23a; }
  }
}

.package-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-top: 1px solid #ebeef5;

  .sort-order {
    font-size: 12px;
    color: #909399;
  }
}

.package-actions {
  display: flex;
  justify-content: center;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid #ebeef5;
}

.feature-input {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
</style>
