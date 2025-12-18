<template>
  <div class="customer-service-permission-manager">
    <div class="header">
      <div class="header-title">
        <h1 class="page-title">客服权限管理</h1>
        <p class="page-subtitle">专门针对客服团队的权限管理工具，按业务类型进行权限配置和数据范围控制</p>
        <div class="header-stats">
          <el-statistic title="客服总数" :value="serviceStats.total" />
          <el-statistic title="已配置" :value="serviceStats.configured" />
          <el-statistic title="权限配置完成率" :value="serviceStats.configRate" suffix="%" />
        </div>
      </div>
      <div class="header-actions">
        <el-button @click="showAddCustomerService" type="primary" :icon="Plus">新增客服</el-button>
        <el-button @click="refreshData" :loading="loading">刷新数据</el-button>
        <el-button @click="showBatchConfig" type="warning">批量配置</el-button>
      </div>
    </div>

    <div class="filters">
      <el-input v-model="searchKeyword" placeholder="搜索客服姓名" style="width: 200px; margin-right: 10px;" clearable />
      <el-select v-model="filterServiceType" placeholder="客服类型" style="width: 150px; margin-right: 10px;" clearable>
        <el-option label="全部" value="" />
        <el-option label="售后客服" value="after_sales" />
        <el-option label="审核客服" value="audit" />
        <el-option label="物流客服" value="logistics" />
        <el-option label="商品客服" value="product" />
        <el-option label="通用客服" value="general" />
      </el-select>
      <el-button @click="loadCustomerServices" type="primary">搜索</el-button>
    </div>

    <el-table :data="customerServices" style="width: 100%" v-loading="loading">
      <el-table-column prop="userName" label="姓名" width="120" />
      <el-table-column prop="userEmail" label="邮箱" width="180" />
      <el-table-column prop="userDepartment" label="部门" width="120" />
      <el-table-column label="客服类型" width="120">
        <template #default="{ row }">
          <el-tag :type="getServiceTypeTagType(row.customerServiceType)">{{ getServiceTypeDisplayName(row.customerServiceType) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="数据范围" width="120">
        <template #default="{ row }">
          <el-tag :type="getDataScopeTagType(row.dataScope)">{{ getDataScopeDisplayName(row.dataScope) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="自定义权限" min-width="250">
        <template #default="{ row }">
          <div class="custom-permissions">
            <el-tag v-for="perm in (row.customPermissions || []).slice(0, 5)" :key="perm" size="small" style="margin: 2px;">{{ getPermissionDisplayName(perm) }}</el-tag>
            <el-tag v-if="(row.customPermissions || []).length > 5" size="small" type="info">+{{ row.customPermissions.length - 5 }}</el-tag>
            <span v-if="!row.customPermissions?.length" class="no-permissions">无自定义权限</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="row.status === 'active' ? 'success' : 'danger'">{{ row.status === 'active' ? '启用' : '禁用' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button @click="editPermissions(row)" size="small" type="primary">配置权限</el-button>
          <el-button @click="deletePermission(row)" size="small" type="danger">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div v-if="customerServices.length === 0 && !loading" class="empty-state">
      <el-empty description="暂无客服权限配置">
        <el-button type="primary" @click="showAddCustomerService">新增客服</el-button>
      </el-empty>
    </div>

    <!-- 新增客服对话框 -->
    <el-dialog v-model="addDialogVisible" title="新增客服" width="800px" destroy-on-close>
      <el-form :model="addForm" label-width="120px">
        <el-form-item label="选择成员" required>
          <el-select v-model="addForm.userId" placeholder="选择系统成员" style="width: 100%" filterable>
            <el-option v-for="user in availableUsers" :key="user.id" :label="`${user.name} (${user.email})`" :value="user.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="客服类型" required>
          <el-select v-model="addForm.customerServiceType" placeholder="选择客服类型" style="width: 100%">
            <el-option label="售后客服" value="after_sales" />
            <el-option label="审核客服" value="audit" />
            <el-option label="物流客服" value="logistics" />
            <el-option label="商品客服" value="product" />
            <el-option label="通用客服" value="general" />
          </el-select>
        </el-form-item>
        <el-form-item label="数据范围" required>
          <el-select v-model="addForm.dataScope" placeholder="选择数据范围" style="width: 100%">
            <el-option label="个人数据" value="self" />
            <el-option label="部门数据" value="department" />
            <el-option label="全部数据" value="all" />
            <el-option label="自定义范围" value="custom" />
          </el-select>
        </el-form-item>
        <el-form-item label="权限模板">
          <el-select v-model="addForm.permissionTemplate" placeholder="选择权限模板（可选）" style="width: 100%" clearable @change="onTemplateChange">
            <el-option v-for="tpl in permissionTemplates" :key="tpl.id" :label="tpl.name" :value="tpl.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="自定义权限">
          <div class="permission-config-container">
            <div class="permission-header">
              <div class="permission-actions">
                <el-button size="small" @click="selectAllPermissions('add')">全选</el-button>
                <el-button size="small" @click="clearAllPermissions('add')">清空</el-button>
              </div>
              <div class="permission-count">已选择 {{ addForm.customPermissions.length }} 项权限</div>
            </div>
            <div class="permission-tree-wrapper">
              <el-tree ref="addTreeRef" :data="permissionTreeData" show-checkbox node-key="key" :default-checked-keys="addForm.customPermissions" :props="{ children: 'children', label: 'name' }" @check="onAddTreeCheck" />
            </div>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmAddCustomerService" :loading="saving">确认添加</el-button>
      </template>
    </el-dialog>

    <!-- 编辑权限对话框 -->
    <el-dialog v-model="editDialogVisible" :title="`配置客服权限 - ${currentPermission?.userName}`" width="800px" destroy-on-close>
      <el-form :model="editForm" label-width="120px">
        <el-form-item label="客服类型">
          <el-select v-model="editForm.customerServiceType" style="width: 100%">
            <el-option label="售后客服" value="after_sales" />
            <el-option label="审核客服" value="audit" />
            <el-option label="物流客服" value="logistics" />
            <el-option label="商品客服" value="product" />
            <el-option label="通用客服" value="general" />
          </el-select>
        </el-form-item>
        <el-form-item label="数据范围">
          <el-select v-model="editForm.dataScope" style="width: 100%">
            <el-option label="个人数据" value="self" />
            <el-option label="部门数据" value="department" />
            <el-option label="全部数据" value="all" />
            <el-option label="自定义范围" value="custom" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="editForm.status" active-value="active" inactive-value="inactive" active-text="启用" inactive-text="禁用" />
        </el-form-item>
        <el-form-item label="自定义权限">
          <div class="permission-config-container">
            <div class="permission-header">
              <div class="permission-actions">
                <el-button size="small" @click="selectAllPermissions('edit')">全选</el-button>
                <el-button size="small" @click="clearAllPermissions('edit')">清空</el-button>
              </div>
              <div class="permission-count">已选择 {{ editForm.customPermissions.length }} 项权限</div>
            </div>
            <div class="permission-tree-wrapper">
              <el-tree ref="editTreeRef" :data="permissionTreeData" show-checkbox node-key="key" :default-checked-keys="editForm.customPermissions" :props="{ children: 'children', label: 'name' }" @check="onEditTreeCheck" />
            </div>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmEditPermissions" :loading="saving">保存</el-button>
      </template>
    </el-dialog>

    <!-- 批量配置对话框 -->
    <el-dialog v-model="batchDialogVisible" title="批量权限配置" width="600px">
      <el-alert title="批量配置说明" type="warning" :closable="false" style="margin-bottom: 20px;">选择客服类型和权限，可以快速为多个用户配置相同的权限设置</el-alert>
      <el-form :model="batchForm" label-width="120px">
        <el-form-item label="目标客服类型">
          <el-select v-model="batchForm.customerServiceType" placeholder="选择客服类型">
            <el-option label="售后客服" value="after_sales" />
            <el-option label="审核客服" value="audit" />
            <el-option label="物流客服" value="logistics" />
            <el-option label="商品客服" value="product" />
            <el-option label="通用客服" value="general" />
          </el-select>
        </el-form-item>
        <el-form-item label="数据范围">
          <el-select v-model="batchForm.dataScope" placeholder="选择数据范围">
            <el-option label="个人数据" value="self" />
            <el-option label="部门数据" value="department" />
            <el-option label="全部数据" value="all" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="batchDialogVisible = false">取消</el-button>
        <el-button @click="confirmBatchConfig" type="primary">确认配置</el-button>
      </template>
    </el-dialog>

    <!-- 底部说明 -->
    <div class="bottom-info" style="margin-top: 30px;">
      <div class="info-content">
        <div class="info-title"><el-icon><InfoFilled /></el-icon><span>使用说明</span></div>
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
import { ref, onMounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox, ElTree } from 'element-plus'
import { Plus, InfoFilled } from '@element-plus/icons-vue'
import { customerServicePermissionApi, type CustomerServicePermission, type AvailableUser } from '@/api/customerServicePermission'

const loading = ref(false)
const saving = ref(false)
const customerServices = ref<CustomerServicePermission[]>([])
const availableUsers = ref<AvailableUser[]>([])
const searchKeyword = ref('')
const filterServiceType = ref('')
const serviceStats = ref({ total: 0, configured: 0, configRate: 0 })
const addDialogVisible = ref(false)
const editDialogVisible = ref(false)
const batchDialogVisible = ref(false)
const currentPermission = ref<CustomerServicePermission | null>(null)
const addTreeRef = ref<InstanceType<typeof ElTree>>()
const editTreeRef = ref<InstanceType<typeof ElTree>>()

const addForm = ref({ userId: '', customerServiceType: 'general', dataScope: 'self', permissionTemplate: '', customPermissions: [] as string[] })
const editForm = ref({ customerServiceType: 'general', dataScope: 'self', status: 'active' as 'active' | 'inactive', customPermissions: [] as string[] })
const batchForm = ref({ customerServiceType: '', dataScope: '' })

const permissionTemplates = [
  { id: 'basic', name: '基础权限', description: '基本的查看权限', permissions: ['customer:list:view', 'order:list:view', 'service:list:view'] },
  { id: 'standard', name: '标准权限', description: '常用业务权限', permissions: ['customer:list:view', 'customer:list:edit', 'order:list:view', 'order:list:edit', 'service:list:view', 'service:list:edit', 'logistics:shipping:view'] },
  { id: 'advanced', name: '高级权限', description: '完整业务权限', permissions: ['customer:list:view', 'customer:list:edit', 'customer:list:create', 'order:list:view', 'order:list:edit', 'order:add:create', 'order:audit:view', 'service:list:view', 'service:list:edit', 'service:afterSales:view', 'service:afterSales:edit', 'logistics:shipping:view', 'logistics:shipping:edit', 'product:list:view'] },
  { id: 'aftersales', name: '售后专员', description: '售后服务权限', permissions: ['customer:list:view', 'order:list:view', 'service:list:view', 'service:list:edit', 'service:afterSales:view', 'service:afterSales:edit', 'logistics:shipping:view'] },
  { id: 'audit', name: '审核专员', description: '订单审核权限', permissions: ['customer:list:view', 'order:list:view', 'order:audit:view', 'order:audit:approve', 'service:list:view', 'product:list:view'] },
  { id: 'logistics', name: '物流专员', description: '物流管理权限', permissions: ['customer:list:view', 'order:list:view', 'logistics:shipping:view', 'logistics:shipping:edit', 'logistics:shipping:batchExport', 'service:list:view'] }
]

const permissionTreeData = [
  { key: 'customer', name: '客户管理', children: [{ key: 'customer:list:view', name: '查看客户列表' }, { key: 'customer:list:edit', name: '编辑客户信息' }, { key: 'customer:list:create', name: '创建客户' }, { key: 'customer:list:assign', name: '分配客户' }] },
  { key: 'order', name: '订单管理', children: [{ key: 'order:list:view', name: '查看订单列表' }, { key: 'order:list:edit', name: '编辑订单' }, { key: 'order:add:create', name: '创建订单' }, { key: 'order:audit:view', name: '查看审核订单' }, { key: 'order:audit:approve', name: '审核订单' }, { key: 'order:detail:cancel', name: '取消订单' }] },
  { key: 'service', name: '客服管理', children: [{ key: 'service:list:view', name: '查看服务列表' }, { key: 'service:list:edit', name: '编辑服务记录' }, { key: 'service:afterSales:view', name: '查看售后服务' }, { key: 'service:afterSales:edit', name: '处理售后服务' }] },
  { key: 'logistics', name: '物流管理', children: [{ key: 'logistics:shipping:view', name: '查看发货列表' }, { key: 'logistics:shipping:edit', name: '编辑发货信息' }, { key: 'logistics:shipping:batchExport', name: '批量导出' }] },
  { key: 'product', name: '商品管理', children: [{ key: 'product:list:view', name: '查看商品列表' }, { key: 'product:list:edit', name: '编辑商品信息' }, { key: 'product:add:create', name: '添加商品' }, { key: 'product:inventory:manage', name: '库存管理' }] }
]

const permissionNameMap: Record<string, string> = {
  'customer:list:view': '查看客户', 'customer:list:edit': '编辑客户', 'customer:list:create': '创建客户', 'customer:list:assign': '分配客户',
  'order:list:view': '查看订单', 'order:list:edit': '编辑订单', 'order:add:create': '创建订单', 'order:audit:view': '查看审核', 'order:audit:approve': '审核订单', 'order:detail:cancel': '取消订单',
  'service:list:view': '查看服务', 'service:list:edit': '编辑服务', 'service:afterSales:view': '查看售后', 'service:afterSales:edit': '处理售后',
  'logistics:shipping:view': '查看物流', 'logistics:shipping:edit': '编辑物流', 'logistics:shipping:batchExport': '批量导出',
  'product:list:view': '查看商品', 'product:list:edit': '编辑商品', 'product:add:create': '添加商品', 'product:inventory:manage': '库存管理'
}

const loadCustomerServices = async () => {
  loading.value = true
  try {
    const params: Record<string, any> = { page: 1, limit: 100 }
    if (filterServiceType.value) params.customerServiceType = filterServiceType.value
    if (searchKeyword.value) params.search = searchKeyword.value
    const result = await customerServicePermissionApi.getList(params)
    customerServices.value = result.items || []
  } catch (error) {
    console.error('加载客服权限列表失败:', error)
    ElMessage.error('加载客服权限列表失败')
  } finally {
    loading.value = false
  }
}

const loadStats = async () => {
  try {
    const stats = await customerServicePermissionApi.getStats()
    serviceStats.value = { total: stats.total, configured: stats.configured, configRate: stats.configRate }
  } catch (error) { console.error('加载统计数据失败:', error) }
}

const loadAvailableUsers = async () => {
  try { availableUsers.value = await customerServicePermissionApi.getAvailableUsers() }
  catch (error) { console.error('加载可用用户失败:', error) }
}

const refreshData = async () => {
  await Promise.all([loadCustomerServices(), loadStats(), loadAvailableUsers()])
  ElMessage.success('数据刷新成功')
}

const showAddCustomerService = async () => {
  await loadAvailableUsers()
  addForm.value = { userId: '', customerServiceType: 'general', dataScope: 'self', permissionTemplate: '', customPermissions: [] }
  addDialogVisible.value = true
  nextTick(() => { addTreeRef.value?.setCheckedKeys([]) })
}

const onTemplateChange = (templateId: string) => {
  if (!templateId) { addForm.value.customPermissions = []; nextTick(() => { addTreeRef.value?.setCheckedKeys([]) }); return }
  const tpl = permissionTemplates.find(t => t.id === templateId)
  if (tpl) { addForm.value.customPermissions = [...tpl.permissions]; nextTick(() => { addTreeRef.value?.setCheckedKeys(tpl.permissions) }); ElMessage.success(`已应用 ${tpl.name} 模板`) }
}

const onAddTreeCheck = () => {
  const checked = addTreeRef.value?.getCheckedKeys(false) || []
  addForm.value.customPermissions = checked.filter(k => !['customer', 'order', 'service', 'logistics', 'product'].includes(k as string)) as string[]
}

const onEditTreeCheck = () => {
  const checked = editTreeRef.value?.getCheckedKeys(false) || []
  editForm.value.customPermissions = checked.filter(k => !['customer', 'order', 'service', 'logistics', 'product'].includes(k as string)) as string[]
}

const selectAllPermissions = (type: 'add' | 'edit') => {
  const allKeys: string[] = []
  permissionTreeData.forEach(node => { node.children?.forEach(child => allKeys.push(child.key)) })
  if (type === 'add') { addForm.value.customPermissions = allKeys; nextTick(() => { addTreeRef.value?.setCheckedKeys(allKeys) }) }
  else { editForm.value.customPermissions = allKeys; nextTick(() => { editTreeRef.value?.setCheckedKeys(allKeys) }) }
}

const clearAllPermissions = (type: 'add' | 'edit') => {
  if (type === 'add') { addForm.value.customPermissions = []; nextTick(() => { addTreeRef.value?.setCheckedKeys([]) }) }
  else { editForm.value.customPermissions = []; nextTick(() => { editTreeRef.value?.setCheckedKeys([]) }) }
}

const confirmAddCustomerService = async () => {
  if (!addForm.value.userId) { ElMessage.warning('请选择成员'); return }
  saving.value = true
  try {
    await customerServicePermissionApi.create({
      userId: addForm.value.userId,
      customerServiceType: addForm.value.customerServiceType,
      dataScope: addForm.value.dataScope,
      customPermissions: addForm.value.customPermissions,
      permissionTemplate: addForm.value.permissionTemplate || undefined
    })
    ElMessage.success('新增客服成功')
    addDialogVisible.value = false
    await refreshData()
  } catch (error: any) { ElMessage.error(error.message || '新增客服失败') }
  finally { saving.value = false }
}

const editPermissions = (row: CustomerServicePermission) => {
  currentPermission.value = row
  editForm.value = { customerServiceType: row.customerServiceType, dataScope: row.dataScope, status: row.status, customPermissions: [...(row.customPermissions || [])] }
  editDialogVisible.value = true
  nextTick(() => { editTreeRef.value?.setCheckedKeys(row.customPermissions || []) })
}

const confirmEditPermissions = async () => {
  if (!currentPermission.value) return
  saving.value = true
  try {
    await customerServicePermissionApi.update(currentPermission.value.id, {
      customerServiceType: editForm.value.customerServiceType,
      dataScope: editForm.value.dataScope,
      status: editForm.value.status,
      customPermissions: editForm.value.customPermissions
    })
    ElMessage.success('保存成功')
    editDialogVisible.value = false
    await loadCustomerServices()
  } catch (error: any) { ElMessage.error(error.message || '保存失败') }
  finally { saving.value = false }
}

const deletePermission = async (row: CustomerServicePermission) => {
  try {
    await ElMessageBox.confirm(`确定要删除 ${row.userName} 的客服权限配置吗？`, '确认删除', { type: 'warning' })
    await customerServicePermissionApi.delete(row.id)
    ElMessage.success('删除成功')
    await refreshData()
  } catch (error: any) { if (error !== 'cancel') ElMessage.error(error.message || '删除失败') }
}

const showBatchConfig = () => { batchDialogVisible.value = true }
const confirmBatchConfig = () => { ElMessage.info('批量配置功能需要先选择用户'); batchDialogVisible.value = false }

const getServiceTypeDisplayName = (type: string) => ({ after_sales: '售后客服', audit: '审核客服', logistics: '物流客服', product: '商品客服', general: '通用客服' }[type] || '未知')
const getServiceTypeTagType = (type: string) => ({ after_sales: 'warning', audit: 'info', logistics: 'success', product: 'primary', general: '' }[type] || '')
const getDataScopeDisplayName = (scope: string) => ({ all: '全部数据', department: '部门数据', self: '个人数据', custom: '自定义' }[scope] || '未知')
const getDataScopeTagType = (scope: string) => ({ all: 'danger', department: 'warning', self: 'info', custom: 'primary' }[scope] || '')
const getPermissionDisplayName = (perm: string) => permissionNameMap[perm] || perm

// 暴露给模板使用
defineExpose({ Plus, InfoFilled })

onMounted(() => { refreshData() })
</script>

<style scoped>
.customer-service-permission-manager { padding: 20px; }
.header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid #ebeef5; }
.header-title { flex: 1; }
.page-title { margin: 0 0 8px 0; font-size: 20px; font-weight: 600; }
.page-subtitle { margin: 0 0 15px 0; color: #666; font-size: 14px; }
.header-stats { display: flex; gap: 40px; }
.header-actions { display: flex; gap: 10px; }
.filters { margin-bottom: 20px; display: flex; align-items: center; }
.custom-permissions { display: flex; flex-wrap: wrap; gap: 4px; }
.no-permissions { color: #999; font-size: 12px; }
.empty-state { padding: 60px 0; text-align: center; }
.permission-config-container { border: 1px solid #e4e7ed; border-radius: 8px; overflow: hidden; }
.permission-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: #f8f9fa; border-bottom: 1px solid #e4e7ed; }
.permission-actions { display: flex; gap: 8px; }
.permission-count { font-size: 14px; color: #606266; }
.permission-tree-wrapper { max-height: 300px; overflow-y: auto; padding: 16px; }
.bottom-info { background: #f8f9fa; border-radius: 8px; padding: 20px; }
.info-content { display: flex; flex-direction: column; gap: 10px; }
.info-title { display: flex; align-items: center; gap: 8px; font-weight: 600; color: #303133; }
.info-text { color: #606266; font-size: 14px; }
.service-types-simple { display: flex; gap: 15px; margin-top: 10px; }
.type-item { padding: 4px 12px; background: #ecf5ff; color: #409eff; border-radius: 4px; font-size: 13px; }
</style>
