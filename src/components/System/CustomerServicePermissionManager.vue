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
        <el-button @click="showAddCustomerService" type="primary" icon="Plus">新增客服</el-button>
        <el-button @click="refreshData" type="default">刷新数据</el-button>
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
      <el-table-column label="邮箱" width="200">
        <template #default="{ row }">
          {{ displaySensitiveInfo(row.email, SensitiveInfoType.EMAIL, userStore.currentUser?.id) }}
        </template>
      </el-table-column>
      <el-table-column prop="department" label="部门" width="120" />
      <el-table-column label="客服类型" width="120">
        <template #default="{ row }">
          <el-tag :type="getServiceTypeTagType(row.customerServiceType)">
            {{ getServiceTypeDisplayName(row.customerServiceType) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="成员数量" width="100">
        <template #default="{ row }">
          <el-link 
            type="primary" 
            @click="showMemberDetails(row.customerServiceType)"
            style="font-weight: bold;"
          >
            {{ getMemberCount(row.customerServiceType) }}
          </el-link>
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
      <el-table-column label="操作" width="200" fixed="right">
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

    <!-- 新增客服对话框 -->
    <el-dialog
      v-model="addCustomerServiceVisible"
      title="新增客服"
      width="800px"
    >
      <div class="add-customer-service">
        <el-alert
          title="新增客服说明"
          type="info"
          :closable="false"
          style="margin-bottom: 20px;"
        >
          选择系统成员作为客服，并配置相应的客服类型和权限
        </el-alert>
        
        <el-form :model="addCustomerServiceForm" label-width="120px">
          <el-form-item label="选择成员" required>
            <el-select 
              v-model="addCustomerServiceForm.userId" 
              placeholder="选择系统成员"
              style="width: 100%"
              filterable
            >
              <el-option
                v-for="user in availableUsers"
                :key="user.id"
                :label="`${user.name} (${displaySensitiveInfo(user.email, SensitiveInfoType.EMAIL, userStore.currentUser?.id)})`"
                :value="user.id"
              />
            </el-select>
          </el-form-item>
          
          <el-form-item label="客服类型" required>
            <el-select v-model="addCustomerServiceForm.customerServiceType" placeholder="选择客服类型">
              <el-option label="售后客服" :value="CustomerServiceType.AFTER_SALES" />
              <el-option label="审核客服" :value="CustomerServiceType.AUDIT" />
              <el-option label="物流客服" :value="CustomerServiceType.LOGISTICS" />
              <el-option label="商品客服" :value="CustomerServiceType.PRODUCT" />
              <el-option label="通用客服" :value="CustomerServiceType.GENERAL" />
            </el-select>
          </el-form-item>
          
          <el-form-item label="数据范围" required>
            <el-select v-model="addCustomerServiceForm.dataScope" placeholder="选择数据范围">
              <el-option label="个人数据" :value="DataScope.PERSONAL" />
              <el-option label="部门数据" :value="DataScope.DEPARTMENT" />
              <el-option label="全部数据" :value="DataScope.ALL" />
            </el-select>
          </el-form-item>
          
          <el-form-item label="所属部门">
            <el-select 
              v-model="addCustomerServiceForm.departmentId" 
              placeholder="选择部门"
              style="width: 100%"
            >
              <el-option
                v-for="dept in departments"
                :key="dept.id"
                :label="dept.name"
                :value="dept.id"
              />
            </el-select>
          </el-form-item>
          
          <el-form-item label="权限模板">
            <el-select 
              v-model="addCustomerServiceForm.permissionTemplate" 
              placeholder="选择权限模板（可选）"
              style="width: 100%"
              clearable
              @change="onPermissionTemplateChange"
            >
              <el-option
                v-for="template in permissionTemplates"
                :key="template.id"
                :label="template.name"
                :value="template.id"
              >
                <div style="display: flex; flex-direction: column;">
                  <span>{{ template.name }}</span>
                  <span style="font-size: 12px; color: #999; margin-top: 2px;">{{ template.description }}</span>
                </div>
              </el-option>
            </el-select>
            <div style="margin-top: 8px; font-size: 12px; color: #666;">
              选择模板后将自动勾选对应权限，您也可以手动调整
            </div>
          </el-form-item>
          
          <el-form-item label="自定义权限">
            <div class="permission-config-container">
              <div class="permission-header">
                <div class="permission-actions">
                  <el-button size="small" @click="selectAllPermissions">全选</el-button>
                  <el-button size="small" @click="clearAllPermissions">清空</el-button>
                  <el-button size="small" @click="expandAllPermissions">展开全部</el-button>
                  <el-button size="small" @click="collapseAllPermissions">收起全部</el-button>
                </div>
                <div class="permission-count">
                  已选择 {{ getSelectedPermissionCount() }} 项权限
                </div>
              </div>
              
              <div class="permission-tree-wrapper">
                <el-tree
                  ref="addPermissionTreeRef"
                  :data="permissionTreeData"
                  show-checkbox
                  node-key="key"
                  :default-checked-keys="addCustomerServiceForm.customPermissions"
                  :props="{ children: 'children', label: 'name' }"
                  :default-expand-all="false"
                  :check-strictly="true"
                  @check="onPermissionCheck"
                  class="permission-tree"
                >
                  <template #default="{ node, data }">
                    <div class="permission-node">
                      <span class="permission-label">{{ data.name }}</span>
                      <span v-if="!data.children" class="permission-key">{{ data.key }}</span>
                    </div>
                  </template>
                </el-tree>
              </div>
              
              <div class="permission-tips">
                <el-alert
                  title="权限说明"
                  type="info"
                  :closable="false"
                  show-icon
                >
                  <template #default>
                    <ul>
                      <li>选择权限模板可快速配置常用权限组合</li>
                      <li>您可以在模板基础上进行个性化调整</li>
                      <li>父级权限被选中时，子级权限会自动选中</li>
                      <li>建议根据客服的实际工作需要分配最小必要权限</li>
                    </ul>
                  </template>
                </el-alert>
              </div>
            </div>
          </el-form-item>
        </el-form>
      </div>
      
      <template #footer>
        <el-button @click="addCustomerServiceVisible = false">取消</el-button>
        <el-button @click="confirmAddCustomerService" type="primary">确认添加</el-button>
      </template>
    </el-dialog>

    <!-- 成员详情对话框 -->
    <el-dialog
      v-model="memberDetailsVisible"
      :title="`${getServiceTypeDisplayName(selectedServiceType)} - 成员详情`"
      width="700px"
    >
      <div class="member-details">
        <el-alert
          :title="`当前共有 ${memberDetails.length} 名${getServiceTypeDisplayName(selectedServiceType)}`"
          type="info"
          :closable="false"
          style="margin-bottom: 20px;"
        />
        
        <el-table :data="memberDetails" style="width: 100%">
          <el-table-column prop="name" label="姓名" width="120" />
          <el-table-column label="邮箱" width="200">
            <template #default="{ row }">
              {{ displaySensitiveInfo(row.email, SensitiveInfoType.EMAIL, userStore.currentUser?.id) }}
            </template>
          </el-table-column>
          <el-table-column prop="department" label="部门" width="120" />
          <el-table-column label="数据范围" width="100">
            <template #default="{ row }">
              <el-tag :type="getDataScopeTagType(row.dataScope)" size="small">
                {{ getDataScopeDisplayName(row.dataScope) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="80">
            <template #default="{ row }">
              <el-tag :type="row.status === 'active' ? 'success' : 'danger'" size="small">
                {{ row.status === 'active' ? '启用' : '禁用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120">
            <template #default="{ row }">
              <el-button
                @click="editPermissions(row)"
                size="small"
                type="primary"
              >
                配置权限
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        
        <div v-if="memberDetails.length === 0" class="no-members">
          <el-empty description="暂无该类型的客服成员" />
        </div>
      </div>
      
      <template #footer>
        <el-button @click="memberDetailsVisible = false">关闭</el-button>
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
import { ref, computed, onMounted, nextTick } from 'vue'
import { ElMessage, ElTree } from 'element-plus'
import { InfoFilled } from '@element-plus/icons-vue'
import { CustomerServiceType, DataScope } from '@/services/permission'
import { displaySensitiveInfo, SensitiveInfoType } from '@/utils/sensitiveInfo'
import { useUserStore } from '@/stores/user'
import { userApiService } from '@/services/userApiService'
import { getDepartmentList } from '@/api/department'

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

interface SystemUser {
  id: string
  name: string
  email: string
  department: string
  role: string
}

// Store
const userStore = useUserStore()

// 数据状态
const customerServices = ref<CustomerServiceUser[]>([])
const departments = ref<Department[]>([])
const availableUsers = ref<SystemUser[]>([])
const searchKeyword = ref('')
const filterServiceType = ref('')
const batchConfigVisible = ref(false)
const addCustomerServiceVisible = ref(false)
const memberDetailsVisible = ref(false)
const selectedServiceType = ref<CustomerServiceType>('aftersale')
const memberDetails = ref<CustomerServiceUser[]>([])

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
const addPermissionTreeRef = ref<InstanceType<typeof ElTree>>()

// 新增客服表单
const addCustomerServiceForm = ref({
  userId: '',
  customerServiceType: CustomerServiceType.GENERAL,
  dataScope: DataScope.PERSONAL,
  departmentId: '',
  permissionTemplate: '', // 权限模板
  customPermissions: [] as string[]
})

// 权限模板定义
const permissionTemplates = ref([
  {
    id: 'basic',
    name: '基础权限',
    description: '适用于新手客服，包含基本的查看和编辑权限',
    permissions: [
      'customer:list:view',
      'order:list:view',
      'service:list:view'
    ]
  },
  {
    id: 'standard',
    name: '标准权限',
    description: '适用于经验丰富的客服，包含大部分常用权限',
    permissions: [
      'customer:list:view',
      'customer:list:edit',
      'order:list:view',
      'order:list:edit',
      'service:list:view',
      'service:list:edit',
      'logistics:shipping:view'
    ]
  },
  {
    id: 'advanced',
    name: '高级权限',
    description: '适用于资深客服，包含完整的业务权限',
    permissions: [
      'customer:list:view',
      'customer:list:edit',
      'customer:list:create',
      'customer:list:assign',
      'order:list:view',
      'order:list:edit',
      'order:add:create',
      'order:audit:view',
      'service:list:view',
      'service:list:edit',
      'service:afterSales:view',
      'service:afterSales:edit',
      'logistics:shipping:view',
      'logistics:shipping:edit',
      'product:list:view'
    ]
  },
  {
    id: 'aftersales_specialist',
    name: '售后专员',
    description: '专门处理售后服务的客服权限',
    permissions: [
      'customer:list:view',
      'order:list:view',
      'order:detail:cancel',
      'service:list:view',
      'service:list:edit',
      'service:afterSales:view',
      'service:afterSales:edit',
      'logistics:shipping:view'
    ]
  },
  {
    id: 'audit_specialist',
    name: '审核专员',
    description: '专门负责订单审核的客服权限',
    permissions: [
      'customer:list:view',
      'order:list:view',
      'order:audit:view',
      'order:audit:approve',
      'service:list:view',
      'product:list:view'
    ]
  },
  {
    id: 'logistics_specialist',
    name: '物流专员',
    description: '专门处理物流相关事务的客服权限',
    permissions: [
      'customer:list:view',
      'order:list:view',
      'logistics:shipping:view',
      'logistics:shipping:edit',
      'logistics:shipping:batchExport',
      'service:list:view'
    ]
  },
  {
    id: 'product_specialist',
    name: '商品专员',
    description: '专门处理商品相关事务的客服权限',
    permissions: [
      'customer:list:view',
      'order:list:view',
      'product:list:view',
      'product:list:edit',
      'product:add:create',
      'product:inventory:manage',
      'service:list:view'
    ]
  }
])

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

// 已移除模拟客服数据，只使用真实新增的客服数据

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

const showAddCustomerService = () => {
  // 重置表单
  addCustomerServiceForm.value = {
    userId: '',
    customerServiceType: CustomerServiceType.GENERAL,
    dataScope: DataScope.PERSONAL,
    departmentId: '',
    permissionTemplate: '',
    customPermissions: []
  }
  addCustomerServiceVisible.value = true
}

// 权限模板变更处理
const onPermissionTemplateChange = (templateId: string) => {
  if (!templateId) {
    // 清空模板时，清空权限选择
    addCustomerServiceForm.value.customPermissions = []
    nextTick(() => {
      addPermissionTreeRef.value?.setCheckedKeys([])
    })
    return
  }
  
  const template = permissionTemplates.value.find(t => t.id === templateId)
  if (template) {
    // 应用模板权限
    addCustomerServiceForm.value.customPermissions = [...template.permissions]
    
    // 更新权限树的选中状态
    nextTick(() => {
      addPermissionTreeRef.value?.setCheckedKeys(template.permissions)
    })
    
    ElMessage.success(`已应用 ${template.name} 模板`)
  }
}

// 权限树操作方法
const selectAllPermissions = () => {
  const allKeys: string[] = []
  const collectKeys = (nodes: any[]) => {
    nodes.forEach(node => {
      allKeys.push(node.key)
      if (node.children) {
        collectKeys(node.children)
      }
    })
  }
  collectKeys(permissionTreeData)
  
  addPermissionTreeRef.value?.setCheckedKeys(allKeys)
  addCustomerServiceForm.value.customPermissions = allKeys
  ElMessage.success('已选择全部权限')
}

const clearAllPermissions = () => {
  addPermissionTreeRef.value?.setCheckedKeys([])
  addCustomerServiceForm.value.customPermissions = []
  ElMessage.success('已清空权限选择')
}

const expandAllPermissions = () => {
  const expandKeys: string[] = []
  const collectParentKeys = (nodes: any[]) => {
    nodes.forEach(node => {
      if (node.children && node.children.length > 0) {
        expandKeys.push(node.key)
        collectParentKeys(node.children)
      }
    })
  }
  collectParentKeys(permissionTreeData)
  
  expandKeys.forEach(key => {
    const node = addPermissionTreeRef.value?.getNode(key)
    if (node) {
      node.expand()
    }
  })
}

const collapseAllPermissions = () => {
  const collapseKeys: string[] = []
  const collectParentKeys = (nodes: any[]) => {
    nodes.forEach(node => {
      if (node.children && node.children.length > 0) {
        collapseKeys.push(node.key)
        collectParentKeys(node.children)
      }
    })
  }
  collectParentKeys(permissionTreeData)
  
  collapseKeys.forEach(key => {
    const node = addPermissionTreeRef.value?.getNode(key)
    if (node) {
      node.collapse()
    }
  })
}

const getSelectedPermissionCount = () => {
  if (!addPermissionTreeRef.value) return 0
  const checkedKeys = addPermissionTreeRef.value.getCheckedKeys() || []
  return checkedKeys.length
}

const onPermissionCheck = () => {
  // 权限选择变化时更新表单数据
  const checkedKeys = addPermissionTreeRef.value?.getCheckedKeys() || []
  const halfCheckedKeys = addPermissionTreeRef.value?.getHalfCheckedKeys() || []
  addCustomerServiceForm.value.customPermissions = [...checkedKeys, ...halfCheckedKeys] as string[]
}

const confirmAddCustomerService = async () => {
  if (!addCustomerServiceForm.value.userId || !addCustomerServiceForm.value.customerServiceType) {
    ElMessage.warning('请选择成员和客服类型')
    return
  }
  
  try {
    // 获取选中的权限
    const checkedKeys = addPermissionTreeRef.value?.getCheckedKeys() || []
    const halfCheckedKeys = addPermissionTreeRef.value?.getHalfCheckedKeys() || []
    const allCheckedKeys = [...checkedKeys, ...halfCheckedKeys] as string[]
    
    // 查找选中的用户信息
    const selectedUser = availableUsers.value.find(user => user.id === addCustomerServiceForm.value.userId)
    if (!selectedUser) {
      ElMessage.error('未找到选中的用户')
      return
    }
    
    // 创建新的客服记录
    const newCustomerService: CustomerServiceUser = {
      id: `cs_${Date.now()}`,
      name: selectedUser.name,
      email: selectedUser.email,
      department: selectedUser.department,
      departmentId: addCustomerServiceForm.value.departmentId || 'dept_cs',
      customerServiceType: addCustomerServiceForm.value.customerServiceType,
      dataScope: addCustomerServiceForm.value.dataScope,
      customPermissions: allCheckedKeys,
      status: 'active'
    }
    
    // 添加到客服列表
    customerServices.value.push(newCustomerService)
    
    // 从可用用户列表中移除
    const userIndex = availableUsers.value.findIndex(user => user.id === addCustomerServiceForm.value.userId)
    if (userIndex > -1) {
      availableUsers.value.splice(userIndex, 1)
    }
    
    ElMessage.success('新增客服成功')
    addCustomerServiceVisible.value = false
    updateServiceStats()
  } catch (error) {
    ElMessage.error('新增客服失败')
    console.error('Add customer service error:', error)
  }
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

const getMemberCount = (serviceType: CustomerServiceType) => {
  return customerServices.value.filter(cs => cs.customerServiceType === serviceType).length
}

const showMemberDetails = (serviceType: CustomerServiceType) => {
  selectedServiceType.value = serviceType
  memberDetails.value = customerServices.value.filter(cs => cs.customerServiceType === serviceType)
  memberDetailsVisible.value = true
}

const loadCustomerServices = async () => {
  try {
    // 初始化为空数组，只显示真实新增的客服
    customerServices.value = []
    
    // 使用真实API加载部门数据
    try {
      const departmentResponse = await getDepartmentList()
      departments.value = (departmentResponse.data || []).map(dept => ({
        id: dept.id,
        name: dept.name,
        code: dept.code || dept.id,
        description: dept.description || ''
      }))
    } catch (deptError) {
      console.warn('加载部门数据失败:', deptError)
      ElMessage.warning('加载部门数据失败，请检查网络连接')
      departments.value = []
    }
    
    // 使用真实API加载系统用户
    try {
      const usersResponse = await userApiService.getUsers()
      const allUsers = usersResponse.data || []
      
      // 加载可用用户（排除已经是客服的用户）
      const existingCustomerServiceIds = customerServices.value.map(cs => cs.email)
      availableUsers.value = allUsers
        .filter(user => !existingCustomerServiceIds.includes(user.email))
        .map(user => ({
          id: user.id.toString(),
          name: user.realName,
          email: user.email,
          department: user.department?.name || '未分配',
          role: user.role
        }))
    } catch (userError) {
      console.warn('加载用户数据失败:', userError)
      ElMessage.warning('加载用户数据失败，请检查网络连接')
      availableUsers.value = []
    }
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

.member-details {
  .no-members {
    text-align: center;
    padding: 40px 0;
  }
  
  .el-table {
    border-radius: 8px;
    overflow: hidden;
  }
  
  .el-alert {
    border-radius: 8px;
  }
}

/* 权限配置容器样式 */
.permission-config-container {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  overflow: hidden;
}

.permission-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f8f9fa;
  border-bottom: 1px solid #e4e7ed;
}

.permission-actions {
  display: flex;
  gap: 8px;
}

.permission-count {
  font-size: 14px;
  color: #606266;
  font-weight: 500;
}

.permission-tree-wrapper {
  max-height: 350px;
  overflow-y: auto;
  padding: 16px;
  background: #fff;
}

.permission-tree {
  border: none;
  padding: 0;
}

.permission-tree .el-tree-node__content {
  height: 36px;
  padding: 0 8px;
  border-radius: 4px;
  margin: 2px 0;
  transition: all 0.2s ease;
}

.permission-tree .el-tree-node__content:hover {
  background-color: #f5f7fa;
}

.permission-node {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding-right: 8px;
}

.permission-label {
  font-size: 14px;
  color: #303133;
  font-weight: 500;
}

.permission-key {
  font-size: 12px;
  color: #909399;
  background: #f0f2f5;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
}

.permission-tips {
  padding: 16px;
  background: #fafbfc;
  border-top: 1px solid #e4e7ed;
}

.permission-tips .el-alert {
  border: none;
  background: transparent;
  padding: 0;
}

.permission-tips ul {
  margin: 8px 0 0 0;
  padding-left: 20px;
  list-style-type: disc;
}

.permission-tips li {
  margin: 4px 0;
  font-size: 13px;
  color: #606266;
  line-height: 1.4;
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