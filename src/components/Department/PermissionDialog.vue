<template>
  <el-dialog
    :model-value="modelValue"
    title="权限配置"
    width="1200px"
    :before-close="handleClose"
    class="permission-dialog"
    align-center
    destroy-on-close
  >
    <!-- 弹窗头部 -->
    <div class="dialog-header">
      <div class="header-left">
        <div class="department-info">
          <div class="dept-avatar">
            <el-icon><OfficeBuilding /></el-icon>
          </div>
          <div class="dept-details">
            <h3 class="dept-name">{{ department?.name || '未选择部门' }}</h3>
            <p class="dept-code">部门编码：{{ department?.code || '暂无' }}</p>
          </div>
        </div>
      </div>
      <div class="header-right">
        <div class="permission-stats">
          <div class="stat-item">
            <span class="stat-number">{{ formData.permissions.length }}</span>
            <span class="stat-label">已选权限</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-number">{{ totalPermissions }}</span>
            <span class="stat-label">总权限数</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 快捷操作栏 -->
    <div class="action-bar">
      <div class="action-left">
        <h4 class="section-title">
          <el-icon><Setting /></el-icon>
          权限配置
        </h4>
      </div>
      <div class="action-right">
        <el-button-group class="action-buttons">
          <el-button @click="selectAll" type="primary" plain size="small">
            <el-icon><Check /></el-icon>
            全选
          </el-button>
          <el-button @click="clearAll" size="small">
            <el-icon><Close /></el-icon>
            清空
          </el-button>
          <el-button @click="handleReset" size="small">
            <el-icon><Refresh /></el-icon>
            重置
          </el-button>
        </el-button-group>
      </div>
    </div>

    <!-- 权限模板 -->
    <div class="template-section">
      <div class="template-header">
        <el-icon><Star /></el-icon>
        <span>快捷模板</span>
      </div>
      <div class="template-grid">
        <div 
          v-for="template in permissionTemplates" 
          :key="template.key"
          @click="applyTemplate(template.key)"
          class="template-card"
          :class="{ active: currentTemplate === template.key }"
        >
          <div class="template-icon">
            <el-icon><component :is="template.icon" /></el-icon>
          </div>
          <div class="template-content">
            <h5 class="template-name">{{ template.name }}</h5>
            <p class="template-desc">{{ template.description }}</p>
          </div>
          <div class="template-badge">
            <span>{{ template.count }}项</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 权限配置主体 -->
    <div class="permission-content">
      <div class="permission-grid">
        <div 
          v-for="category in permissionCategories" 
          :key="category.key" 
          class="permission-category"
        >
          <div class="category-header">
            <div class="category-title">
              <el-checkbox
                :model-value="isCategorySelected(category.key)"
                :indeterminate="isCategoryIndeterminate(category.key)"
                @change="(checked) => handleCategoryChange(category.key, checked)"
                @click.stop
                class="category-checkbox"
              >
                <div class="category-info">
                  <div class="category-icon" :style="{ backgroundColor: category.color }">
                    <el-icon><component :is="category.icon" /></el-icon>
                  </div>
                  <div class="category-text">
                    <span class="category-name">{{ category.name }}</span>
                    <span class="category-count">{{ getSelectedCount(category.key) }}/{{ category.permissions.length }}</span>
                  </div>
                </div>
              </el-checkbox>
            </div>
          </div>
          
          <div class="permission-list">
            <el-checkbox-group v-model="formData.permissions">
              <div 
                v-for="permission in category.permissions" 
                :key="permission.key"
                class="permission-item"
              >
                <el-checkbox 
                  :value="permission.key"
                  class="permission-checkbox"
                >
                  <div class="permission-info">
                    <div class="permission-main">
                      <span class="permission-name">{{ permission.name }}</span>
                      <el-tag
                        :type="getPermissionLevel(permission.level).type"
                        size="small"
                        class="permission-level"
                      >
                        {{ getPermissionLevel(permission.level).text }}
                      </el-tag>
                    </div>
                    <p class="permission-desc">{{ permission.description }}</p>
                  </div>
                </el-checkbox>
              </div>
            </el-checkbox-group>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部操作 -->
    <template #footer>
      <div class="dialog-footer">
        <div class="footer-left">
          <div class="selected-summary">
            <el-icon><List /></el-icon>
            <span>已选择 {{ formData.permissions.length }} 项权限</span>
            <el-tag 
              v-for="category in getSelectedCategories()" 
              :key="category"
              size="small"
              class="category-tag"
            >
              {{ getCategoryName(category) }}
            </el-tag>
          </div>
        </div>
        <div class="footer-right">
          <el-button @click="handleClose" size="large">
            取消
          </el-button>
          <el-button 
            type="primary" 
            @click="handleSubmit" 
            :loading="loading"
            size="large"
          >
            <el-icon><Check /></el-icon>
            保存配置
          </el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  OfficeBuilding,
  User,
  ShoppingCart,
  CreditCard,
  Van,
  Service,
  TrendCharts,
  Setting,
  Star,
  Lock,
  Key,
  Check,
  Close,
  Refresh,
  List,
  Files
} from '@element-plus/icons-vue'
import { useDepartmentStore, type Department } from '@/stores/department'

interface Props {
  modelValue: boolean
  department?: Department | null
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'success'): void
}

interface Permission {
  key: string
  name: string
  description: string
  level: 'basic' | 'advanced' | 'admin'
}

interface PermissionCategory {
  key: string
  name: string
  icon: unknown
  color: string
  permissions: Permission[]
}

interface PermissionTemplate {
  key: string
  name: string
  description: string
  icon: unknown
  count: number
  permissions: string[]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const departmentStore = useDepartmentStore()
const loading = ref(false)
const currentTemplate = ref('')

// 表单数据
const formData = reactive({
  permissions: [] as string[]
})

// 权限分类数据
const permissionCategories: PermissionCategory[] = [
  {
    key: 'customer',
    name: '客户管理',
    icon: User,
    color: '#3b82f6',
    permissions: [
      { key: 'customer.view', name: '查看客户', description: '查看客户列表和详细信息', level: 'basic' },
      { key: 'customer.create', name: '新增客户', description: '创建新的客户记录', level: 'basic' },
      { key: 'customer.edit', name: '编辑客户', description: '修改客户信息', level: 'advanced' },
      { key: 'customer.delete', name: '删除客户', description: '删除客户记录', level: 'admin' },
      { key: 'customer.export', name: '导出客户', description: '导出客户数据', level: 'advanced' },
      { key: 'customer.import', name: '导入客户', description: '批量导入客户数据', level: 'admin' }
    ]
  },
  {
    key: 'order',
    name: '订单管理',
    icon: ShoppingCart,
    color: '#10b981',
    permissions: [
      { key: 'order.view', name: '查看订单', description: '查看订单列表和详情', level: 'basic' },
      { key: 'order.create', name: '创建订单', description: '新建订单', level: 'basic' },
      { key: 'order.edit', name: '编辑订单', description: '修改订单信息', level: 'advanced' },
      { key: 'order.cancel', name: '取消订单', description: '取消订单', level: 'advanced' },
      { key: 'order.delete', name: '删除订单', description: '删除订单记录', level: 'admin' },
      { key: 'order.audit', name: '审核订单', description: '订单审核权限', level: 'admin' }
    ]
  },
  {
    key: 'finance',
    name: '财务管理',
    icon: CreditCard,
    color: '#f59e0b',
    permissions: [
      { key: 'finance.view', name: '查看财务', description: '查看财务报表', level: 'basic' },
      { key: 'finance.invoice', name: '开具发票', description: '开具和管理发票', level: 'advanced' },
      { key: 'finance.payment', name: '付款管理', description: '处理付款事务', level: 'advanced' },
      { key: 'finance.report', name: '财务报告', description: '生成财务报告', level: 'admin' },
      { key: 'finance.audit', name: '财务审核', description: '财务数据审核', level: 'admin' }
    ]
  },
  {
    key: 'logistics',
    name: '物流管理',
    icon: Van,
    color: '#8b5cf6',
    permissions: [
      { key: 'logistics.view', name: '查看物流', description: '查看物流信息', level: 'basic' },
      { key: 'logistics.track', name: '物流跟踪', description: '跟踪物流状态', level: 'basic' },
      { key: 'logistics.manage', name: '物流管理', description: '管理物流配送', level: 'advanced' },
      { key: 'logistics.config', name: '物流配置', description: '配置物流参数', level: 'admin' }
    ]
  },
  {
    key: 'service',
    name: '客服管理',
    icon: Service,
    color: '#06b6d4',
    permissions: [
      { key: 'service.view', name: '查看工单', description: '查看客服工单', level: 'basic' },
      { key: 'service.handle', name: '处理工单', description: '处理客服工单', level: 'basic' },
      { key: 'service.assign', name: '分配工单', description: '分配工单给其他人', level: 'advanced' },
      { key: 'service.close', name: '关闭工单', description: '关闭已完成工单', level: 'advanced' },
      { key: 'service.report', name: '客服报告', description: '生成客服报告', level: 'admin' }
    ]
  },
  {
    key: 'data',
    name: '资料管理',
    icon: Files,
    color: '#f59e0b',
    permissions: [
      { key: 'data.view', name: '查看资料', description: '查看资料列表和详情', level: 'basic' },
      { key: 'data.search', name: '客户查询', description: '查询客户归属信息', level: 'basic' },
      { key: 'data.assign', name: '分配资料', description: '分配资料给其他成员', level: 'advanced' },
      { key: 'data.archive', name: '封存资料', description: '封存和恢复资料', level: 'advanced' },
      { key: 'data.export', name: '导出资料', description: '导出资料数据', level: 'admin' }
    ]
  },
  {
    key: 'analytics',
    name: '数据分析',
    icon: TrendCharts,
    color: '#ef4444',
    permissions: [
      { key: 'analytics.view', name: '查看报表', description: '查看数据报表', level: 'basic' },
      { key: 'analytics.export', name: '导出报表', description: '导出分析报表', level: 'advanced' },
      { key: 'analytics.custom', name: '自定义报表', description: '创建自定义报表', level: 'admin' },
      { key: 'analytics.dashboard', name: '数据看板', description: '访问数据看板', level: 'admin' }
    ]
  }
]

// 权限模板
const permissionTemplates: PermissionTemplate[] = [
  {
    key: 'basic',
    name: '基础权限',
    description: '适合普通员工的基础操作权限',
    icon: User,
    count: 10,
    permissions: ['customer.view', 'customer.create', 'order.view', 'order.create', 'finance.view', 'logistics.view', 'service.view', 'analytics.view', 'data.view', 'data.search']
  },
  {
    key: 'advanced',
    name: '高级权限',
    description: '适合主管级别的进阶操作权限',
    icon: Star,
    count: 18,
    permissions: [
      'customer.view', 'customer.create', 'customer.edit', 'customer.export',
      'order.view', 'order.create', 'order.edit', 'order.cancel',
      'finance.view', 'finance.invoice', 'finance.payment',
      'logistics.view', 'logistics.track', 'logistics.manage',
      'service.view', 'service.handle', 'service.assign', 'service.close',
      'analytics.view', 'analytics.export',
      'data.view', 'data.search', 'data.assign'
    ]
  },
  {
    key: 'admin',
    name: '管理员权限',
    description: '拥有所有操作权限，适合管理员',
    icon: Lock,
    count: 25,
    permissions: permissionCategories.flatMap(cat => cat.permissions.map(p => p.key))
  },
  {
    key: 'custom',
    name: '自定义权限',
    description: '根据需要自由选择权限组合',
    icon: Setting,
    count: 0,
    permissions: []
  }
]

// 计算属性
const totalPermissions = computed(() => {
  return permissionCategories.reduce((total, category) => total + category.permissions.length, 0)
})

// 权限级别配置
const getPermissionLevel = (level: string) => {
  const levels = {
    basic: { text: '基础', type: 'success' },
    advanced: { text: '高级', type: 'warning' },
    admin: { text: '管理', type: 'danger' }
  }
  return levels[level as keyof typeof levels] || levels.basic
}

// 检查分类是否全选
const isCategorySelected = (categoryKey: string) => {
  const category = permissionCategories.find(cat => cat.key === categoryKey)
  if (!category) return false
  return category.permissions.every(permission => formData.permissions.includes(permission.key))
}

// 检查分类是否部分选中
const isCategoryIndeterminate = (categoryKey: string) => {
  const category = permissionCategories.find(cat => cat.key === categoryKey)
  if (!category) return false
  const selectedCount = category.permissions.filter(permission => 
    formData.permissions.includes(permission.key)
  ).length
  return selectedCount > 0 && selectedCount < category.permissions.length
}

// 获取分类已选数量
const getSelectedCount = (categoryKey: string) => {
  const category = permissionCategories.find(cat => cat.key === categoryKey)
  if (!category) return 0
  return category.permissions.filter(permission => 
    formData.permissions.includes(permission.key)
  ).length
}

// 处理分类选择
const handleCategoryChange = (categoryKey: string, checked: boolean) => {
  const category = permissionCategories.find(cat => cat.key === categoryKey)
  if (!category) return

  if (checked) {
    // 添加该分类下所有权限
    category.permissions.forEach(permission => {
      if (!formData.permissions.includes(permission.key)) {
        formData.permissions.push(permission.key)
      }
    })
  } else {
    // 移除该分类下所有权限
    category.permissions.forEach(permission => {
      const index = formData.permissions.indexOf(permission.key)
      if (index > -1) {
        formData.permissions.splice(index, 1)
      }
    })
  }
}

// 获取已选择的分类
const getSelectedCategories = () => {
  return permissionCategories
    .filter(category => getSelectedCount(category.key) > 0)
    .map(category => category.key)
}

// 获取分类名称
const getCategoryName = (categoryKey: string) => {
  const category = permissionCategories.find(cat => cat.key === categoryKey)
  return category?.name || categoryKey
}

// 全选
const selectAll = () => {
  formData.permissions = permissionCategories.flatMap(category => 
    category.permissions.map(permission => permission.key)
  )
}

// 清空
const clearAll = () => {
  formData.permissions = []
  currentTemplate.value = ''
}

// 重置
const handleReset = () => {
  formData.permissions = [...(props.department?.permissions || [])]
  currentTemplate.value = ''
}

// 应用模板
const applyTemplate = (templateKey: string) => {
  const template = permissionTemplates.find(t => t.key === templateKey)
  if (!template) return

  if (templateKey === 'custom') {
    currentTemplate.value = templateKey
    return
  }

  formData.permissions = [...template.permissions]
  currentTemplate.value = templateKey
}

// 关闭弹窗
const handleClose = () => {
  emit('update:modelValue', false)
}

// 提交
const handleSubmit = async () => {
  if (!props.department) {
    ElMessage.error('请先选择部门')
    return
  }

  loading.value = true
  try {
    await departmentStore.updateDepartmentPermissions(props.department.id, formData.permissions)
    ElMessage.success('权限配置保存成功')
    emit('success')
    handleClose()
  } catch (error) {
    ElMessage.error('保存失败，请重试')
  } finally {
    loading.value = false
  }
}

// 监听部门变化，初始化权限
watch(() => props.department, (newDept) => {
  if (newDept) {
    formData.permissions = [...(newDept.permissions || [])]
  }
}, { immediate: true })
</script>

<style scoped>
.permission-dialog {
  :deep(.el-dialog) {
    border-radius: 12px;
    overflow: hidden;
  }

  :deep(.el-dialog__header) {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 20px 24px;
    margin: 0;

    .el-dialog__title {
      font-size: 18px;
      font-weight: 600;
    }

    .el-dialog__headerbtn {
      top: 20px;
      right: 24px;
      
      .el-dialog__close {
        color: white;
        font-size: 18px;
        
        &:hover {
          color: rgba(255, 255, 255, 0.8);
        }
      }
    }
  }

  :deep(.el-dialog__body) {
    padding: 0;
  }

  :deep(.el-dialog__footer) {
    padding: 0;
  }
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;

  .header-left {
    .department-info {
      display: flex;
      align-items: center;
      gap: 16px;

      .dept-avatar {
        width: 48px;
        height: 48px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 20px;
      }

      .dept-details {
        .dept-name {
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 4px 0;
        }

        .dept-code {
          font-size: 14px;
          color: #6b7280;
          margin: 0;
        }
      }
    }
  }

  .header-right {
    .permission-stats {
      display: flex;
      align-items: center;
      gap: 16px;

      .stat-item {
        text-align: center;

        .stat-number {
          display: block;
          font-size: 24px;
          font-weight: 700;
          color: #667eea;
          line-height: 1;
        }

        .stat-label {
          font-size: 12px;
          color: #6b7280;
          margin-top: 4px;
        }
      }

      .stat-divider {
        width: 1px;
        height: 32px;
        background: #e2e8f0;
      }
    }
  }
}

.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  background: white;
  border-bottom: 1px solid #f1f5f9;

  .action-left {
    .section-title {
      font-size: 16px;
      font-weight: 600;
      color: #1f2937;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 8px;

      .el-icon {
        color: #667eea;
      }
    }
  }

  .action-right {
    .action-buttons {
      .el-button {
        border-radius: 8px;
        font-weight: 500;
      }
    }
  }
}

.template-section {
  padding: 20px 24px;
  background: #fafbfc;
  border-bottom: 1px solid #f1f5f9;

  .template-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
    font-size: 14px;
    font-weight: 600;
    color: #374151;

    .el-icon {
      color: #667eea;
    }
  }

  .template-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;

    .template-card {
      background: white;
      border: 2px solid #e5e7eb;
      border-radius: 12px;
      padding: 16px;
      cursor: pointer;
      transition: all 0.2s ease;
      position: relative;

      &:hover {
        border-color: #667eea;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
      }

      &.active {
        border-color: #667eea;
        background: #f0f4ff;
      }

      .template-icon {
        width: 40px;
        height: 40px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 18px;
        margin-bottom: 12px;
      }

      .template-content {
        .template-name {
          font-size: 14px;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 4px 0;
        }

        .template-desc {
          font-size: 12px;
          color: #6b7280;
          margin: 0;
          line-height: 1.4;
        }
      }

      .template-badge {
        position: absolute;
        top: 12px;
        right: 12px;
        background: #667eea;
        color: white;
        font-size: 10px;
        padding: 2px 6px;
        border-radius: 6px;
        font-weight: 500;
      }
    }
  }
}

.permission-content {
  padding: 24px;
  max-height: 500px;
  overflow-y: auto;

  .permission-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 24px;

    .permission-category {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      overflow: hidden;

      .category-header {
        padding: 16px 20px;
        background: #f9fafb;
        border-bottom: 1px solid #e5e7eb;

        .category-title {
          .category-checkbox {
            :deep(.el-checkbox__label) {
              width: 100%;
            }

            .category-info {
              display: flex;
              align-items: center;
              gap: 12px;
              width: 100%;

              .category-icon {
                width: 32px;
                height: 32px;
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 14px;
              }

              .category-text {
                flex: 1;

                .category-name {
                  display: block;
                  font-size: 14px;
                  font-weight: 600;
                  color: #1f2937;
                }

                .category-count {
                  font-size: 12px;
                  color: #6b7280;
                  font-weight: normal;
                }
              }
            }
          }
        }
      }

      .permission-list {
        padding: 16px 20px;

        .permission-item {
          padding: 12px 0;
          border-bottom: 1px solid #f3f4f6;

          &:last-child {
            border-bottom: none;
          }

          .permission-checkbox {
            :deep(.el-checkbox__label) {
              width: 100%;
            }

            .permission-info {
              .permission-main {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 4px;

                .permission-name {
                  font-size: 14px;
                  font-weight: 500;
                  color: #1f2937;
                }

                .permission-level {
                  font-size: 10px;
                  border-radius: 6px;
                  padding: 2px 6px;
                }
              }

              .permission-desc {
                font-size: 12px;
                color: #6b7280;
                margin: 0;
                line-height: 1.4;
              }
            }
          }
        }
      }
    }
  }
}

.dialog-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;

  .footer-left {
    .selected-summary {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: #374151;

      .el-icon {
        color: #667eea;
      }

      .category-tag {
        margin-left: 4px;
      }
    }
  }

  .footer-right {
    display: flex;
    gap: 12px;

    .el-button {
      border-radius: 8px;
      font-weight: 500;
      padding: 12px 24px;
    }
  }
}
</style>