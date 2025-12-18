<template>
  <el-dialog
    v-model="visible"
    :title="`预览角色模板 - ${template?.name}`"
    width="900px"
    @close="handleClose"
  >
    <div class="preview-content" v-if="template">
      <!-- 基本信息 -->
      <div class="template-info">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="模板名称">{{ template.name }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ template.createTime }}</el-descriptions-item>
          <el-descriptions-item label="描述" :span="2">{{ template.description }}</el-descriptions-item>
          <el-descriptions-item label="权限总数">{{ totalPermissions }}</el-descriptions-item>
          <el-descriptions-item label="适用角色">{{ template.applicableRoles?.join(', ') || '通用' }}</el-descriptions-item>
        </el-descriptions>
      </div>

      <!-- 权限详情 -->
      <div class="permissions-detail">
        <h3>权限配置详情</h3>

        <el-tabs v-model="activeTab" type="border-card">
          <!-- 功能权限 -->
          <el-tab-pane label="功能权限" name="functional">
            <div class="permission-grid">
              <div v-for="(permissions, module) in functionalPermissions" :key="module" class="permission-module">
                <div class="module-header">
                  <el-icon><component :is="getModuleIcon(module)" /></el-icon>
                  <span>{{ getModuleName(module) }}</span>
                  <el-tag size="small" type="info">{{ permissions.length }}</el-tag>
                </div>
                <div class="permission-list">
                  <el-tag
                    v-for="permission in permissions"
                    :key="permission.code"
                    :type="getPermissionType(permission.level)"
                    size="small"
                    class="permission-tag"
                  >
                    {{ permission.name }}
                  </el-tag>
                </div>
              </div>
            </div>
          </el-tab-pane>

          <!-- 数据权限 -->
          <el-tab-pane label="数据权限" name="data">
            <div class="data-permissions">
              <div v-for="(scope, resource) in dataPermissions" :key="resource" class="data-scope">
                <h4>{{ getResourceName(resource) }}</h4>
                <el-descriptions :column="1" size="small" border>
                  <el-descriptions-item label="访问范围">
                    <el-tag :type="getScopeType(scope.level)">{{ getScopeText(scope.level) }}</el-tag>
                  </el-descriptions-item>
                  <el-descriptions-item label="具体权限">
                    <div class="scope-permissions">
                      <el-tag
                        v-for="perm in scope.permissions"
                        :key="perm"
                        size="small"
                        style="margin: 2px;"
                      >
                        {{ perm }}
                      </el-tag>
                    </div>
                  </el-descriptions-item>
                  <el-descriptions-item label="限制条件" v-if="scope.conditions">
                    <div class="scope-conditions">
                      <div v-for="condition in scope.conditions" :key="condition.field">
                        <span class="condition-field">{{ condition.field }}:</span>
                        <span class="condition-value">{{ condition.value }}</span>
                      </div>
                    </div>
                  </el-descriptions-item>
                </el-descriptions>
              </div>
            </div>
          </el-tab-pane>

          <!-- 系统权限 -->
          <el-tab-pane label="系统权限" name="system">
            <div class="system-permissions">
              <el-row :gutter="20">
                <el-col :span="12">
                  <div class="system-section">
                    <h4>系统配置</h4>
                    <el-checkbox-group v-model="systemConfig" disabled>
                      <el-checkbox
                        v-for="config in template.systemPermissions?.config || []"
                        :key="config.code"
                        :label="config.code"
                      >
                        {{ config.name }}
                      </el-checkbox>
                    </el-checkbox-group>
                  </div>
                </el-col>
                <el-col :span="12">
                  <div class="system-section">
                    <h4>安全设置</h4>
                    <el-checkbox-group v-model="securitySettings" disabled>
                      <el-checkbox
                        v-for="setting in template.systemPermissions?.security || []"
                        :key="setting.code"
                        :label="setting.code"
                      >
                        {{ setting.name }}
                      </el-checkbox>
                    </el-checkbox-group>
                  </div>
                </el-col>
              </el-row>
            </div>
          </el-tab-pane>

          <!-- 权限矩阵 -->
          <el-tab-pane label="权限矩阵" name="matrix">
            <div class="permission-matrix">
              <el-table :data="permissionMatrix" style="width: 100%;" border>
                <el-table-column prop="module" label="功能模块" width="150" fixed />
                <el-table-column prop="view" label="查看" width="80" align="center">
                  <template #default="{ row }">
                    <el-icon v-if="row.view" color="#67C23A"><Check /></el-icon>
                    <el-icon v-else color="#F56C6C"><Close /></el-icon>
                  </template>
                </el-table-column>
                <el-table-column prop="create" label="创建" width="80" align="center">
                  <template #default="{ row }">
                    <el-icon v-if="row.create" color="#67C23A"><Check /></el-icon>
                    <el-icon v-else color="#F56C6C"><Close /></el-icon>
                  </template>
                </el-table-column>
                <el-table-column prop="edit" label="编辑" width="80" align="center">
                  <template #default="{ row }">
                    <el-icon v-if="row.edit" color="#67C23A"><Check /></el-icon>
                    <el-icon v-else color="#F56C6C"><Close /></el-icon>
                  </template>
                </el-table-column>
                <el-table-column prop="delete" label="删除" width="80" align="center">
                  <template #default="{ row }">
                    <el-icon v-if="row.delete" color="#67C23A"><Check /></el-icon>
                    <el-icon v-else color="#F56C6C"><Close /></el-icon>
                  </template>
                </el-table-column>
                <el-table-column prop="export" label="导出" width="80" align="center">
                  <template #default="{ row }">
                    <el-icon v-if="row.export" color="#67C23A"><Check /></el-icon>
                    <el-icon v-else color="#F56C6C"><Close /></el-icon>
                  </template>
                </el-table-column>
                <el-table-column prop="special" label="特殊权限" min-width="200">
                  <template #default="{ row }">
                    <el-tag
                      v-for="perm in row.special"
                      :key="perm"
                      size="small"
                      style="margin: 2px;"
                    >
                      {{ perm }}
                    </el-tag>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>

      <!-- 应用统计 -->
      <div class="usage-stats" v-if="template.usageStats">
        <h3>应用统计</h3>
        <el-row :gutter="20">
          <el-col :span="6">
            <el-statistic title="应用次数" :value="template.usageStats.applyCount" />
          </el-col>
          <el-col :span="6">
            <el-statistic title="当前使用" :value="template.usageStats.currentUsers" />
          </el-col>
          <el-col :span="6">
            <el-statistic title="最后应用" :value="template.usageStats.lastApplied" />
          </el-col>
          <el-col :span="6">
            <el-statistic title="成功率" :value="template.usageStats.successRate" suffix="%" />
          </el-col>
        </el-row>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">关闭</el-button>
        <el-button @click="exportTemplate" type="primary">导出模板</el-button>
        <el-button @click="applyTemplate" type="success">应用模板</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Check,
  Close,
  User,
  ShoppingCart,
  Document,
  Setting,
  DataAnalysis,
  Service,
  Goods,
  Van
} from '@element-plus/icons-vue'

interface Props {
  modelValue: boolean
  template?: any
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'apply', template: any): void
  (e: 'export', template: any): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const activeTab = ref('functional')
const systemConfig = ref([])
const securitySettings = ref([])

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// 权限名称映射
const permissionNameMap: Record<string, string> = {
  'dashboard': '数据看板',
  'dashboard.personal': '个人看板',
  'dashboard.personal.view': '查看个人看板',
  'dashboard.department': '部门看板',
  'dashboard.department.view': '查看部门看板',
  'customer': '客户管理',
  'customer.list': '客户列表',
  'customer.list.view': '查看客户',
  'customer.list.edit': '编辑客户',
  'customer.list.export': '导出客户',
  'customer.list.import': '导入客户',
  'customer.add': '新增客户',
  'customer.add.create': '创建客户',
  'customer.groups': '客户分组',
  'customer.tags': '客户标签',
  'order': '订单管理',
  'order.list': '订单列表',
  'order.list.view': '查看订单',
  'order.list.edit': '编辑订单',
  'order.add': '新增订单',
  'order.add.create': '创建订单',
  'order.audit': '订单审核',
  'order.audit.view': '查看审核',
  'order.audit.approve': '审核通过',
  'order.audit.reject': '审核拒绝',
  'service': '服务管理',
  'service.call': '通话记录',
  'service.call.view': '查看通话',
  'service.call.make': '发起通话',
  'service.sms': '短信管理',
  'performance': '业绩统计',
  'performance.personal': '个人业绩',
  'performance.personal.view': '查看个人业绩',
  'performance.team': '团队业绩',
  'performance.team.view': '查看团队业绩',
  'performance.analysis': '业绩分析',
  'performance.analysis.view': '查看业绩分析',
  'performance.share': '业绩分享',
  'performance.share.view': '查看业绩分享',
  'logistics': '物流管理',
  'logistics.list': '物流列表',
  'logistics.list.view': '查看物流',
  'logistics.shipping': '发货管理',
  'logistics.shipping.view': '查看发货',
  'logistics.shipping.create': '创建发货',
  'logistics.track': '物流跟踪',
  'logistics.track.view': '查看跟踪',
  'logistics.track.update': '更新跟踪',
  'logistics.status': '状态更新',
  'logistics.status.view': '查看状态',
  'logistics.status.update': '更新状态',
  'afterSales': '售后管理',
  'afterSales.list': '售后列表',
  'afterSales.list.view': '查看售后',
  'afterSales.add': '新增售后',
  'afterSales.add.create': '创建售后',
  'afterSales.data': '售后数据',
  'afterSales.data.view': '查看售后数据',
  'afterSales.data.analysis': '售后分析',
  'data': '资料管理',
  'data.list': '资料列表',
  'data.list.view': '查看资料',
  'data.search': '资料搜索',
  'data.search.basic': '基础搜索',
  'data.search.advanced': '高级搜索',
  'data.recycle': '回收站',
  'system': '系统管理',
  '*': '所有权限'
}

// 根据模板权限生成功能权限分组
const functionalPermissions = computed(() => {
  const permissions = props.template?.permissions || []

  // 如果是所有权限
  if (permissions.includes('*')) {
    return {
      all: [{ code: '*', name: '所有权限', level: 'advanced' }]
    }
  }

  // 按模块分组
  const grouped: Record<string, Array<{ code: string; name: string; level: string }>> = {}

  for (const perm of permissions) {
    const parts = perm.split('.')
    const module = parts[0]

    if (!grouped[module]) {
      grouped[module] = []
    }

    // 确定权限级别
    let level = 'basic'
    if (perm.includes('delete') || perm.includes('admin') || perm.includes('audit')) {
      level = 'advanced'
    } else if (perm.includes('edit') || perm.includes('export') || perm.includes('create')) {
      level = 'intermediate'
    }

    grouped[module].push({
      code: perm,
      name: permissionNameMap[perm] || perm,
      level
    })
  }

  return grouped
})

const dataPermissions = computed(() => ({
  customer: {
    level: 'department',
    permissions: ['查看', '编辑', '分配', '导出'],
    conditions: [
      { field: '部门', value: '所属部门及下级部门' },
      { field: '状态', value: '有效客户' },
      { field: '创建时间', value: '近一年' }
    ]
  },
  order: {
    level: 'personal',
    permissions: ['查看', '处理', '审核'],
    conditions: [
      { field: '负责人', value: '本人创建或分配' },
      { field: '订单状态', value: '待处理、处理中' }
    ]
  },
  product: {
    level: 'category',
    permissions: ['查看', '编辑', '上下架'],
    conditions: [
      { field: '分类', value: '负责分类及子分类' },
      { field: '状态', value: '正常状态' }
    ]
  },
  service: {
    level: 'department',
    permissions: ['查看', '处理', '分配'],
    conditions: [
      { field: '部门', value: '所属部门' },
      { field: '优先级', value: '普通、紧急' }
    ]
  },
  logistics: {
    level: 'region',
    permissions: ['查看', '跟踪', '更新'],
    conditions: [
      { field: '区域', value: '负责区域' },
      { field: '状态', value: '运输中、待配送' }
    ]
  },
  report: {
    level: 'department',
    permissions: ['查看', '导出', '分享'],
    conditions: [
      { field: '数据范围', value: '部门数据' },
      { field: '时间范围', value: '近三个月' }
    ]
  }
}))

const permissionMatrix = computed(() => [
  {
    module: '客户管理',
    view: true,
    create: true,
    edit: true,
    delete: false,
    export: true,
    special: ['客户分配', '客户转移', '客户合并']
  },
  {
    module: '订单管理',
    view: true,
    create: true,
    edit: true,
    delete: false,
    export: true,
    special: ['订单审核', '价格调整', '退款处理']
  },
  {
    module: '商品管理',
    view: true,
    create: true,
    edit: true,
    delete: false,
    export: false,
    special: ['上架商品', '下架商品', '分类管理', '库存管理']
  },
  {
    module: '服务管理',
    view: true,
    create: true,
    edit: true,
    delete: false,
    export: false,
    special: ['服务分配', '服务升级', '服务关闭']
  },
  {
    module: '物流管理',
    view: true,
    create: false,
    edit: true,
    delete: false,
    export: false,
    special: ['物流跟踪', '状态更新', '配送管理']
  },
  {
    module: '报表管理',
    view: true,
    create: false,
    edit: false,
    delete: false,
    export: true,
    special: ['自定义报表', '报表分享', '定时报表']
  },
  {
    module: '系统管理',
    view: true,
    create: false,
    edit: false,
    delete: false,
    export: false,
    special: ['用户管理', '权限管理', '系统配置', '数据备份']
  },
  {
    module: '商品管理',
    view: true,
    create: false,
    edit: false,
    delete: false,
    export: false,
    special: []
  },
  {
    module: '报表管理',
    view: true,
    create: false,
    edit: false,
    delete: false,
    export: true,
    special: ['自定义报表']
  }
])

const totalPermissions = computed(() => {
  return Object.values(functionalPermissions.value).reduce((total, perms) => total + perms.length, 0)
})

// 方法
const getModuleIcon = (module: string) => {
  const icons: Record<string, any> = {
    customer: User,
    order: ShoppingCart,
    product: Goods,
    report: DataAnalysis,
    service: Service,
    logistics: Van,
    system: Setting
  }
  return icons[module] || Document
}

const getModuleName = (module: string) => {
  const names: Record<string, string> = {
    customer: '客户管理',
    order: '订单管理',
    product: '商品管理',
    report: '报表管理',
    service: '客服管理',
    logistics: '物流管理',
    system: '系统管理'
  }
  return names[module] || module
}

const getPermissionType = (level: string) => {
  const types: Record<string, string> = {
    basic: 'success',
    intermediate: 'warning',
    advanced: 'danger'
  }
  return types[level] || 'info'
}

const getResourceName = (resource: string) => {
  const names: Record<string, string> = {
    customer: '客户数据',
    order: '订单数据',
    product: '商品数据',
    report: '报表数据'
  }
  return names[resource] || resource
}

const getScopeType = (level: string) => {
  const types: Record<string, string> = {
    all: 'danger',
    department: 'warning',
    personal: 'success'
  }
  return types[level] || 'info'
}

const getScopeText = (level: string) => {
  const texts: Record<string, string> = {
    all: '全部数据',
    department: '部门数据',
    personal: '个人数据'
  }
  return texts[level] || level
}

const exportTemplate = () => {
  ElMessage.success('模板导出成功')
  emit('export', props.template)
}

const applyTemplate = () => {
  ElMessage.success('模板应用成功')
  emit('apply', props.template)
  handleClose()
}

const handleClose = () => {
  emit('update:modelValue', false)
}
</script>

<style scoped>
.preview-content {
  padding: 20px 0;
}

.template-info {
  margin-bottom: 30px;
}

.permissions-detail h3 {
  margin-bottom: 20px;
  color: #303133;
}

.permission-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  padding: 20px;
}

.permission-module {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 15px;
}

.module-header {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
  font-weight: 600;
  color: #303133;
}

.module-header .el-icon {
  margin-right: 8px;
  font-size: 18px;
}

.module-header .el-tag {
  margin-left: auto;
}

.permission-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.permission-tag {
  margin: 2px;
}

.data-permissions {
  padding: 20px;
}

.data-scope {
  margin-bottom: 30px;
  padding: 20px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
}

.data-scope h4 {
  margin-bottom: 15px;
  color: #606266;
}

.scope-permissions {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.scope-conditions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.condition-field {
  font-weight: 600;
  color: #606266;
  margin-right: 8px;
}

.condition-value {
  color: #303133;
}

.system-permissions {
  padding: 20px;
}

.system-section {
  padding: 20px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
}

.system-section h4 {
  margin-bottom: 15px;
  color: #606266;
}

.permission-matrix {
  padding: 20px;
}

.usage-stats {
  margin-top: 30px;
  padding: 20px;
  background-color: #fafafa;
  border-radius: 8px;
}

.usage-stats h3 {
  margin-bottom: 20px;
  color: #303133;
}

.dialog-footer {
  text-align: right;
}

:deep(.el-checkbox-group) {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

:deep(.el-statistic__content) {
  font-size: 24px;
  font-weight: 600;
}
</style>
