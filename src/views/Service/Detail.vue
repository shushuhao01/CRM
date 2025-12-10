<template>
  <div class="service-detail">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <el-button
          type="primary"
          :icon="ArrowLeft"
          @click="handleBack"
          class="back-btn"
        >
          返回
        </el-button>
        <div class="title-section">
          <h1 class="page-title">售后详情</h1>
          <div class="service-status">
            <el-tag
              :type="getStatusType(serviceInfo.status)"
              size="large"
              effect="dark"
            >
              {{ getStatusText(serviceInfo.status) }}
            </el-tag>
          </div>
        </div>
      </div>
      <div class="header-actions">
        <el-button
          v-if="canEdit"
          type="primary"
          :icon="Edit"
          @click="handleEdit"
        >
          编辑
        </el-button>
        <el-button
          v-if="canProcess"
          type="success"
          @click="handleProcess"
        >
          处理
        </el-button>
        <el-button
          v-if="canClose"
          type="warning"
          @click="handleClose"
        >
          关闭
        </el-button>
      </div>
    </div>

    <el-row :gutter="20">
      <!-- 左侧主要信息 -->
      <el-col :span="16">
        <!-- 基本信息 -->
        <el-card class="info-card" shadow="never">
          <template #header>
            <div class="card-header">
              <h3>基本信息</h3>
            </div>
          </template>

          <div class="info-grid">
            <div class="info-item">
              <label>售后单号：</label>
              <span class="value">{{ serviceInfo.serviceNumber }}</span>
            </div>
            <div class="info-item">
              <label>原订单号：</label>
              <el-link
                type="primary"
                @click="handleViewOrder"
                class="value-link"
              >
                {{ serviceInfo.orderNumber }}
              </el-link>
            </div>
            <div class="info-item">
              <label>服务类型：</label>
              <span class="value">{{ getServiceTypeText(serviceInfo.serviceType) }}</span>
            </div>
            <div class="info-item">
              <label>优先级：</label>
              <el-tag :type="getPriorityType(serviceInfo.priority)">
                {{ getPriorityText(serviceInfo.priority) }}
              </el-tag>
            </div>
            <div class="info-item">
              <label>申请时间：</label>
              <span class="value">{{ serviceInfo.createTime }}</span>
            </div>
            <div class="info-item">
              <label>处理人员：</label>
              <span class="value">{{ serviceInfo.assignedTo || '未分配' }}</span>
            </div>
          </div>
        </el-card>

        <!-- 客户信息 -->
        <el-card class="info-card" shadow="never">
          <template #header>
            <div class="card-header">
              <h3>客户信息</h3>
            </div>
          </template>

          <div class="info-grid">
            <div class="info-item">
              <label>客户姓名：</label>
              <el-link
                type="primary"
                @click="handleViewCustomer"
                class="value-link"
              >
                {{ serviceInfo.customerName }}
              </el-link>
            </div>
            <div class="info-item">
              <label>联系电话：</label>
              <span class="value">
                <el-link
                  type="primary"
                  :icon="Phone"
                  @click="handleCallCustomer"
                >
                  {{ displaySensitiveInfoNew(serviceInfo.customerPhone, SensitiveInfoType.PHONE) }}
                </el-link>
              </span>
            </div>
            <div class="info-item">
              <label>联系地址：</label>
              <span class="value">
                <span v-if="canViewDetails">{{ serviceInfo.contactAddress }}</span>
                <span v-else class="restricted-info">地址信息受限</span>
              </span>
            </div>
            <div class="info-item">
              <label>联系人：</label>
              <span class="value">{{ serviceInfo.contactName }}</span>
            </div>
          </div>
        </el-card>

        <!-- 商品信息 -->
        <el-card class="info-card" shadow="never">
          <template #header>
            <div class="card-header">
              <h3>商品信息</h3>
            </div>
          </template>

          <div class="product-info">
            <div class="product-item">
              <div class="product-details">
                <h4>{{ serviceInfo.productName }}</h4>
                <p class="product-spec">规格：{{ serviceInfo.productSpec }}</p>
                <div class="product-meta">
                  <span>数量：{{ serviceInfo.quantity }}</span>
                  <span>单价：¥{{ serviceInfo.price }}</span>
                </div>
              </div>
            </div>
          </div>
        </el-card>

        <!-- 问题描述 -->
        <el-card class="info-card" shadow="never">
          <template #header>
            <div class="card-header">
              <h3>问题描述</h3>
            </div>
          </template>

          <div class="description-content">
            <div class="reason-section">
              <h4>问题原因</h4>
              <p>{{ serviceInfo.reason }}</p>
            </div>
            <div class="description-section">
              <h4>详细描述</h4>
              <p>{{ serviceInfo.description }}</p>
            </div>
            <div v-if="serviceInfo.remark" class="remark-section">
              <h4>备注信息</h4>
              <p>{{ serviceInfo.remark }}</p>
            </div>
          </div>
        </el-card>

        <!-- 跟进记录 -->
        <el-card class="info-card" shadow="never">
          <template #header>
            <div class="card-header">
              <h3>跟进记录</h3>
              <el-button
                type="primary"
                size="small"
                :icon="Plus"
                @click="handleAddFollowUp"
              >
                添加跟进
              </el-button>
            </div>
          </template>

          <div class="follow-up-content">
            <!-- 没有记录时的提示 -->
            <el-empty
              v-if="followUpRecords.length === 0"
              description="暂无跟进记录"
              :image-size="80"
            />

            <!-- 跟进记录列表 -->
            <div v-else class="follow-up-list">
              <!-- 最新一条记录(始终显示) -->
              <div
                v-if="followUpRecords.length > 0"
                class="follow-up-item latest"
              >
                <div class="follow-up-header">
                  <div class="follow-up-time">
                    <el-icon><Clock /></el-icon>
                    {{ followUpRecords[0].followUpTime }}
                  </div>
                  <div class="follow-up-user">
                    {{ followUpRecords[0].createdBy }}
                  </div>
                </div>
                <div class="follow-up-body">
                  <p>{{ followUpRecords[0].content }}</p>
                </div>
              </div>

              <!-- 历史记录(折叠显示) -->
              <el-collapse v-if="followUpRecords.length > 1" v-model="followUpCollapseActive">
                <el-collapse-item name="history">
                  <template #title>
                    <span class="history-title">
                      查看历史记录 ({{ followUpRecords.length - 1 }}条)
                    </span>
                  </template>
                  <div
                    v-for="(record, index) in followUpRecords.slice(1)"
                    :key="record.id"
                    class="follow-up-item"
                  >
                    <div class="follow-up-header">
                      <div class="follow-up-time">
                        <el-icon><Clock /></el-icon>
                        {{ record.followUpTime }}
                      </div>
                      <div class="follow-up-user">
                        {{ record.createdBy }}
                      </div>
                    </div>
                    <div class="follow-up-body">
                      <p>{{ record.content }}</p>
                    </div>
                  </div>
                </el-collapse-item>
              </el-collapse>
            </div>
          </div>
        </el-card>

        <!-- 附件信息 -->
        <el-card v-if="serviceInfo.attachments && serviceInfo.attachments.length" class="info-card" shadow="never">
          <template #header>
            <div class="card-header">
              <h3>相关附件</h3>
            </div>
          </template>

          <div class="attachments-grid">
            <div
              v-for="(file, index) in serviceInfo.attachments"
              :key="index"
              class="attachment-item"
              @click="previewFile(file)"
            >
              <div class="file-icon">
                <el-icon size="24">
                  <Picture v-if="isImage(file.name)" />
                  <Document v-else />
                </el-icon>
              </div>
              <div class="file-info">
                <p class="file-name">{{ file.name }}</p>
                <p class="file-size">{{ formatFileSize(file.size) }}</p>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 右侧操作区域 -->
      <el-col :span="8">
        <!-- 处理进度 -->
        <el-card class="progress-card" shadow="never">
          <template #header>
            <div class="card-header">
              <h3>处理进度</h3>
            </div>
          </template>

          <el-timeline>
            <el-timeline-item
              v-for="(step, index) in processSteps"
              :key="index"
              :timestamp="step?.time || ''"
              :type="step?.type || 'info'"
              :icon="step?.icon"
            >
              <div class="timeline-content">
                <h4>{{ step?.title || '未知步骤' }}</h4>
                <p>{{ step?.description || '' }}</p>
                <p v-if="step?.operator" class="operator">操作人：{{ getOperatorName(step.operator) }}</p>
              </div>
            </el-timeline-item>
          </el-timeline>
        </el-card>

        <!-- 快速操作 -->
        <el-card class="action-card" shadow="never">
          <template #header>
            <div class="card-header">
              <h3>快速操作</h3>
            </div>
          </template>

          <div class="quick-actions">
            <el-button
              v-if="canAssign"
              type="primary"
              :icon="User"
              @click="assignHandler"
              :disabled="serviceInfo.status === 'closed'"
              class="action-btn"
            >
              分配处理人
            </el-button>
            <el-button
              v-if="canProcess"
              type="success"
              :icon="Check"
              @click="updateStatus"
              :disabled="serviceInfo.status === 'closed'"
              class="action-btn"
            >
              更新状态
            </el-button>
            <el-button
              v-if="canEdit"
              type="warning"
              :icon="Edit"
              @click="handleEdit"
              class="action-btn"
            >
              编辑售后
            </el-button>
            <el-button
              v-if="canClose"
              type="danger"
              :icon="Close"
              @click="handleClose"
              class="action-btn"
            >
              关闭售后
            </el-button>
          </div>
        </el-card>

        <!-- 相关信息 -->
        <el-card class="related-card" shadow="never">
          <template #header>
            <div class="card-header">
              <h3>相关信息</h3>
            </div>
          </template>

          <div class="related-info">
            <div class="related-item">
              <label>创建人：</label>
              <span>{{ getCreatorName(serviceInfo.createdBy) }}</span>
            </div>
            <div class="related-item">
              <label>最后更新：</label>
              <span>{{ serviceInfo.updateTime }}</span>
            </div>
            <div class="related-item">
              <label>预计完成：</label>
              <span>{{ serviceInfo.expectedTime || '未设定' }}</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 分配处理人对话框 -->
    <el-dialog
      v-model="assignDialogVisible"
      title="分配处理人"
      width="500px"
    >
      <el-form :model="assignForm" label-width="100px">
        <el-form-item label="分配方式">
          <el-radio-group v-model="assignForm.assignType">
            <el-radio label="user">指定用户</el-radio>
            <el-radio label="department">部门随机</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="筛选部门" v-if="assignForm.assignType === 'user'">
          <el-select
            v-model="assignForm.filterDepartmentId"
            placeholder="全部部门"
            clearable
            style="width: 100%"
            @change="handleDepartmentFilterChange"
          >
            <el-option label="全部部门" value="" />
            <el-option
              v-for="dept in departmentOptions"
              :key="dept.id"
              :label="dept.name"
              :value="dept.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="选择用户" v-if="assignForm.assignType === 'user'">
          <el-select
            v-model="assignForm.userId"
            placeholder="请选择处理人"
            filterable
            style="width: 100%"
          >
            <el-option
              v-for="user in filteredUserOptions"
              :key="user.id"
              :label="`${user.name} (${user.department || '未分配部门'})`"
              :value="user.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="选择部门" v-if="assignForm.assignType === 'department'">
          <el-select
            v-model="assignForm.departmentId"
            placeholder="请选择部门"
            style="width: 100%"
          >
            <el-option
              v-for="dept in departmentOptions"
              :key="dept.id"
              :label="dept.name"
              :value="dept.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="备注">
          <el-input
            v-model="assignForm.remark"
            type="textarea"
            :rows="3"
            placeholder="请输入分配备注(可选)"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="assignDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmAssign" :loading="assignLoading">
          确定分配
        </el-button>
      </template>
    </el-dialog>

    <!-- 状态更新对话框 -->
    <el-dialog
      v-model="statusDialogVisible"
      title="更新状态"
      width="500px"
    >
      <el-form :model="statusForm" label-width="100px">
        <el-form-item label="新状态">
          <el-select v-model="statusForm.status" placeholder="请选择状态" style="width: 100%">
            <el-option label="待处理" value="pending" />
            <el-option label="处理中" value="processing" />
            <el-option label="已解决" value="resolved" />
            <el-option label="已关闭" value="closed" />
          </el-select>
        </el-form-item>

        <!-- 处理结果字段 -->
        <el-form-item label="处理结果" v-if="currentHandleResults.length > 0">
          <el-select v-model="statusForm.handleResult" placeholder="请选择处理结果" style="width: 100%">
            <el-option
              v-for="result in currentHandleResults"
              :key="result?.value || ''"
              :label="result?.title || result?.label || '未知'"
              :value="result?.value || ''"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="处理说明">
          <el-input
            v-model="statusForm.remark"
            type="textarea"
            :rows="3"
            placeholder="请输入处理说明"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="statusDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmStatusUpdate">确定</el-button>
      </template>
    </el-dialog>

    <!-- 外呼对话框 -->
    <el-dialog v-model="callDialogVisible" title="发起外呼" width="500px">
      <el-form :model="callForm" label-width="80px">
        <el-form-item label="电话号码">
          <el-input v-model="callForm.phone" disabled />
        </el-form-item>
        <el-form-item label="通话目的">
          <el-select v-model="callForm.purpose" placeholder="请选择" style="width: 100%">
            <el-option label="售后跟进" value="service" />
            <el-option label="客户回访" value="callback" />
            <el-option label="问题确认" value="confirm" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="callForm.note" type="textarea" rows="3" placeholder="请输入备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="callDialogVisible = false">取消</el-button>
        <el-button @click="startCall" type="primary" :loading="calling">开始通话</el-button>
      </template>
    </el-dialog>

    <!-- 添加跟进记录对话框 -->
    <el-dialog
      v-model="followUpDialogVisible"
      title="添加跟进记录"
      width="600px"
    >
      <el-form :model="followUpForm" label-width="100px">
        <el-form-item label="跟进时间" required>
          <el-date-picker
            v-model="followUpForm.followUpTime"
            type="datetime"
            placeholder="选择跟进时间"
            format="YYYY-MM-DD HH:mm:ss"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="跟进内容" required>
          <el-input
            v-model="followUpForm.content"
            type="textarea"
            :rows="6"
            placeholder="请输入跟进内容"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="followUpDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSaveFollowUp">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ArrowLeft,
  Edit,
  Picture,
  Document,
  User,
  Clock,
  Check,
  Close,
  Plus,
  Phone
} from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { useServiceStore } from '@/stores/service'
import { useOrderStore } from '@/stores/order'
import { useNotificationStore } from '@/stores/notification'
import { useDepartmentStore } from '@/stores/department'
import { displaySensitiveInfoNew, SensitiveInfoType } from '@/utils/sensitiveInfo'
import { formatPhone } from '@/utils/phone'
import { createSafeNavigator } from '@/utils/navigation'
import { serviceApi } from '@/api/service'

// 路由相关
const router = useRouter()
const route = useRoute()
const safeNavigator = createSafeNavigator(router)

// Store
const userStore = useUserStore()
const serviceStore = useServiceStore()
const orderStore = useOrderStore()
const notificationStore = useNotificationStore()
const departmentStore = useDepartmentStore()

// 响应式数据
const loading = ref(false)
const assignDialogVisible = ref(false)
const statusDialogVisible = ref(false)

// 售后信息(初始化为空,从store或API加载)
const serviceInfo = reactive({
  id: '',
  serviceNumber: '',
  orderId: '',
  orderNumber: '',
  customerId: '',
  serviceType: 'return',
  status: 'pending',
  priority: 'normal',
  customerName: '',
  customerPhone: '',
  contactName: '',
  contactAddress: '',
  productName: '',
  productSpec: '',
  quantity: 0,
  price: 0,
  reason: '',
  description: '',
  remark: '',
  handleResult: '',  // 处理结果
  assignedTo: '',
  createdBy: '',
  createTime: '',
  updateTime: '',
  expectedTime: '',
  attachments: [] as Array<{ name: string; size: number; url: string }>
})

// 处理步骤(从售后记录动态生成)
const processSteps = ref<Array<{
  title: string
  description: string
  time: string
  type: string
  icon: unknown
  operator?: string
}>>([])

// 分配表单
const assignForm = reactive({
  assignType: 'user',
  filterDepartmentId: '',
  userId: '',
  departmentId: '',
  assignedTo: '',
  remark: ''
})

// 分配加载状态
const assignLoading = ref(false)

// 状态表单
const statusForm = reactive({
  status: '',
  handleResult: '',  // 处理结果
  remark: ''
})

// 跟进记录相关
const followUpRecords = ref<Array<{
  id: string
  followUpTime: string
  content: string
  createdBy: string
  createTime: string
}>>([])

const followUpCollapseActive = ref<string[]>([])
const followUpDialogVisible = ref(false)
const followUpForm = reactive({
  followUpTime: '',
  content: ''
})

// 外呼相关
const callDialogVisible = ref(false)
const calling = ref(false)
const callForm = reactive({
  phone: '',
  purpose: 'service',
  note: ''
})

// 用户选项 - 从userStore获取,修复字段映射
const userOptions = computed(() => {
  const users = userStore.users || []
  return users.map((user: any) => {
    const name = user.name || user.username || user.realName || `用户${user.id}`
    const department = user.departmentName || user.department || user.deptName || '未分配部门'

    return {
      id: user.id,
      name: name,
      department: department
    }
  })
})

// 部门选项 - 从departmentStore获取
const departmentOptions = computed(() => {
  const departments = departmentStore.departments || []
  return departments.map((dept: any) => ({
    id: dept.id,
    name: dept.name
  }))
})

// 根据部门筛选的用户选项
const filteredUserOptions = computed(() => {
  if (!assignForm.filterDepartmentId) {
    return userOptions.value
  }

  const dept = departmentOptions.value.find((d: any) => d.id === assignForm.filterDepartmentId)
  if (!dept) {
    return userOptions.value
  }

  return userOptions.value.filter((u: any) => {
    return u.department === dept.name ||
           u.department === dept.id ||
           (u.department && u.department.includes(dept.name))
  })
})

// 获取当前服务类型的处理结果选项
const currentHandleResults = computed(() => {
  try {
    // 从localStorage获取服务类型配置
    const serviceTypesStr = localStorage.getItem('crm_service_types')
    if (!serviceTypesStr) {
      return []
    }

    const serviceTypes = JSON.parse(serviceTypesStr)
    const currentType = serviceTypes.find((t: any) => t.value === serviceInfo.serviceType)

    if (!currentType || !currentType.handleResults) {
      return []
    }

    // 确保每个处理结果都有完整的字段
    return currentType.handleResults.map((result: any) => ({
      value: result?.value || '',
      label: result?.label || result?.title || '未知',
      title: result?.title || result?.label || '未知'
    }))
  } catch (error) {
    console.error('获取处理结果选项失败:', error)
    return []
  }
})

// 部门筛选变化处理
const handleDepartmentFilterChange = () => {
  assignForm.userId = ''
}

// 权限控制
const canEdit = computed(() => {
  // 超级管理员或有编辑权限的用户，或者是分配给自己的售后单
  return userStore.canEditAfterSales ||
         (serviceInfo.assignedTo === userStore.currentUser?.name && userStore.hasAfterSalesPermission('service:write'))
})

const canProcess = computed(() => {
  // 必须有处理权限，且售后单状态允许处理
  return userStore.canProcessAfterSales &&
         serviceInfo.status !== 'closed' &&
         serviceInfo.status !== 'resolved'
})

const canClose = computed(() => {
  // 必须有关闭权限，且售后单状态为已解决
  return userStore.canCloseAfterSales &&
         serviceInfo.status === 'resolved'
})

// 新增：分配权限检查
const canAssign = computed(() => {
  // 超级管理员或有分配权限的用户
  return userStore.isAdmin || userStore.hasAfterSalesPermission('service:assign')
})

// 新增：查看权限检查（用于控制敏感信息显示）
const canViewDetails = computed(() => {
  // 至少要有读取权限
  return userStore.hasAfterSalesPermission('service:read')
})

// 方法定义
/**
 * 返回上一页
 */
const handleBack = () => {
  router.back()
}

/**
 * 编辑售后
 */
const handleEdit = () => {
  safeNavigator.push(`/service/edit/${serviceInfo.id}`)
}

/**
 * 处理售后
 */
const handleProcess = () => {
  statusDialogVisible.value = true
  statusForm.status = serviceInfo.status
}

/**
 * 关闭售后
 */
const handleClose = () => {
  ElMessageBox.confirm(
    '确定要关闭此售后申请吗？',
    '确认关闭',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    serviceInfo.status = 'closed'

    // 发送售后申请关闭的消息提醒
    notificationStore.sendMessage(
      notificationStore.MessageType.AFTER_SALES_CREATED,
      `售后申请 ${serviceInfo.serviceNumber} 已关闭，客户：${serviceInfo.customerName}`,
      {
        relatedId: serviceInfo.serviceNumber,
        relatedType: 'service',
        actionUrl: `/service/detail/${serviceInfo.serviceNumber}`
      }
    )

    ElMessage.success('售后申请已关闭')
  })
}

/**
 * 查看客户详情
 */
const handleViewCustomer = () => {
  // 根据客户姓名或ID跳转到客户详情页面
  // 这里需要根据实际的客户ID来跳转
  if (serviceInfo.customerId) {
    safeNavigator.push(`/customer/detail/${serviceInfo.customerId}`)
  } else {
    ElMessage.warning('客户信息不完整,无法跳转')
  }
}

/**
 * 查看订单详情
 */
const handleViewOrder = () => {
  // 根据订单号跳转到订单详情页面
  if (serviceInfo.orderId) {
    safeNavigator.push(`/order/detail/${serviceInfo.orderId}`)
  } else if (serviceInfo.orderNumber) {
    // 如果没有orderId,尝试用orderNumber
    safeNavigator.push(`/order/detail/${serviceInfo.orderNumber}`)
  } else {
    ElMessage.warning('订单信息不完整,无法跳转')
  }
}

/**
 * 拨打电话(弹出外呼对话框)
 */
const handleCallCustomer = () => {
  callForm.phone = serviceInfo.customerPhone
  callForm.purpose = 'service'
  callForm.note = `售后单号: ${serviceInfo.serviceNumber}`
  callDialogVisible.value = true
}

/**
 * 开始通话
 */
const startCall = async () => {
  if (!callForm.phone) {
    ElMessage.warning('请输入电话号码')
    return
  }

  if (!callForm.purpose) {
    ElMessage.warning('请选择通话目的')
    return
  }

  calling.value = true
  try {
    // 这里应该调用外呼API
    // 模拟外呼
    await new Promise(resolve => setTimeout(resolve, 1000))

    ElMessage.success('外呼成功,正在接通...')
    callDialogVisible.value = false

    // 可以记录通话记录
    console.log('外呼记录:', {
      phone: callForm.phone,
      purpose: callForm.purpose,
      note: callForm.note,
      serviceNumber: serviceInfo.serviceNumber,
      time: new Date().toISOString()
    })
  } catch (error) {
    console.error('外呼失败:', error)
    ElMessage.error('外呼失败')
  } finally {
    calling.value = false
  }
}

/**
 * 分配处理人
 */
const assignHandler = () => {
  assignDialogVisible.value = true
  assignForm.assignedTo = serviceInfo.assignedTo
}

/**
 * 确认分配
 */
const confirmAssign = async () => {
  let assignedToName = ''

  if (assignForm.assignType === 'user') {
    if (!assignForm.userId) {
      ElMessage.warning('请选择处理人')
      return
    }
    const user = userOptions.value.find((u: any) => u.id === assignForm.userId)
    if (!user) {
      ElMessage.error('找不到选择的用户')
      return
    }
    assignedToName = user.name
  } else {
    if (!assignForm.departmentId) {
      ElMessage.warning('请选择部门')
      return
    }

    const dept = departmentOptions.value.find((d: any) => d.id === assignForm.departmentId)
    if (!dept) {
      ElMessage.error('找不到选择的部门')
      return
    }

    const deptUsers = userOptions.value.filter((u: unknown) => {
      return u.department === dept.name ||
             u.department === dept.id ||
             (u.department && u.department.includes(dept.name))
    })

    if (deptUsers.length === 0) {
      ElMessage.warning(`部门"${dept.name}"下没有可分配的用户`)
      return
    }

    const randomUser = deptUsers[Math.floor(Math.random() * deptUsers.length)]
    assignedToName = randomUser.name
  }

  assignLoading.value = true
  try {
    // 调用API分配处理人
    const assignedToId = assignForm.assignType === 'user' ? assignForm.userId : undefined
    await serviceApi.assign(serviceInfo.id, assignedToName, assignedToId, assignForm.remark)

    serviceInfo.assignedTo = assignedToName

    // 发送分配处理人成功的消息提醒
    notificationStore.sendMessage(
      notificationStore.MessageType.AFTER_SALES_CREATED,
      `售后申请 ${serviceInfo.serviceNumber} 已分配给 ${assignedToName}，客户：${serviceInfo.customerName}`,
      {
        relatedId: serviceInfo.serviceNumber,
        relatedType: 'service',
        actionUrl: `/service/detail/${serviceInfo.serviceNumber}`
      }
    )

    ElMessage.success('分配成功')
    assignDialogVisible.value = false

    // 添加处理步骤
    processSteps.value.push({
      title: '重新分配处理人',
      description: `已分配给${assignedToName}处理`,
      time: new Date().toLocaleString(),
      type: 'success',
      icon: User,
      operator: userStore.currentUser?.name || '系统'
    })
  } catch (error) {
    console.error('分配失败:', error)
    ElMessage.error('分配失败')
  } finally {
    assignLoading.value = false
  }
}

/**
 * 更新状态
 */
const updateStatus = () => {
  statusDialogVisible.value = true
}

/**
 * 确认状态更新
 */
const confirmStatusUpdate = async () => {
  if (!statusForm.status) {
    ElMessage.warning('请选择状态')
    return
  }

  try {
    // 调用API更新状态
    await serviceApi.updateStatus(serviceInfo.id, statusForm.status, statusForm.remark)

    serviceInfo.status = statusForm.status
    if (statusForm.handleResult) {
      serviceInfo.handleResult = statusForm.handleResult
    }
    statusDialogVisible.value = false

    // 发送状态更新的消息提醒
    notificationStore.sendMessage(
      notificationStore.MessageType.AFTER_SALES_CREATED,
      `售后申请 ${serviceInfo.serviceNumber} 状态已更新为${getStatusText(statusForm.status)}，客户：${serviceInfo.customerName}`,
      {
        relatedId: serviceInfo.serviceNumber,
        relatedType: 'service',
        actionUrl: `/service/detail/${serviceInfo.serviceNumber}`
      }
    )

    ElMessage.success('状态更新成功')

    // 获取处理结果文本
    let resultText = ''
    if (statusForm.handleResult && currentHandleResults.value.length > 0) {
      const result = currentHandleResults.value.find((r: unknown) => r.value === statusForm.handleResult)
      resultText = result?.title || result?.label || ''
    }

    // 添加处理步骤
    const description = [
      statusForm.remark,
      resultText ? `处理结果: ${resultText}` : '',
      !statusForm.remark && !resultText ? `状态更新为${getStatusText(statusForm.status)}` : ''
    ].filter(Boolean).join(' - ')

    processSteps.value.push({
      title: '状态更新',
      description: description,
      time: new Date().toLocaleString(),
      type: 'primary',
      icon: Clock,
      operator: userStore.currentUser?.name || '系统'
    })
  } catch (error) {
    console.error('状态更新失败:', error)
    ElMessage.error('状态更新失败')
  }
}

/**
 * 添加备注
 */
const addRemark = () => {
  ElMessageBox.prompt('请输入备注信息', '添加备注', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    inputType: 'textarea'
  }).then(({ value }) => {
    if (value) {
      ElMessage.success('备注添加成功')
      // 添加处理步骤
      processSteps.value.push({
        title: '添加备注',
        description: value,
        time: new Date().toLocaleString(),
        type: 'info',
        icon: Edit,
        operator: userStore.currentUser?.name || '系统'
      })
    }
  })
}

/**
 * 导出报告
 */
const exportReport = () => {
  ElMessage.success('报告导出功能开发中...')
}

/**
 * 预览文件
 */
const previewFile = (file: { name: string; url: string; size: number }) => {
  ElMessage.info(`预览文件：${file.name}`)
}

/**
 * 判断是否为图片
 */
const isImage = (filename: string) => {
  const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'))
  return imageExts.includes(ext)
}

/**
 * 格式化文件大小
 */
const formatFileSize = (size: number) => {
  if (size < 1024) return size + ' B'
  if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB'
  return (size / (1024 * 1024)).toFixed(1) + ' MB'
}

/**
 * 获取状态类型
 */
const getStatusType = (status: string) => {
  const statusMap: Record<string, string> = {
    pending: 'warning',
    processing: 'primary',
    resolved: 'success',
    closed: 'info'
  }
  return statusMap[status] || 'info'
}

/**
 * 获取状态文本
 */
const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    pending: '待处理',
    processing: '处理中',
    resolved: '已解决',
    closed: '已关闭'
  }
  return statusMap[status] || '未知'
}

/**
 * 获取服务类型文本
 */
const getServiceTypeText = (type: string) => {
  const typeMap: Record<string, string> = {
    return: '退货',
    exchange: '换货',
    repair: '维修',
    refund: '退款',
    complaint: '投诉'
  }
  return typeMap[type] || '其他'
}

/**
 * 获取优先级类型
 */
const getPriorityType = (priority: string) => {
  const priorityMap: Record<string, string> = {
    low: 'info',
    medium: 'warning',
    high: 'danger'
  }
  return priorityMap[priority] || 'info'
}

/**
 * 获取优先级文本
 */
const getPriorityText = (priority: string) => {
  const priorityMap: Record<string, string> = {
    low: '低',
    medium: '中',
    high: '高'
  }
  return priorityMap[priority] || '未知'
}

/**
 * 获取创建人姓名
 * 如果createdBy是手机号或用户ID,则查找对应的用户姓名
 */
const getCreatorName = (createdBy: string) => {
  if (!createdBy) return '未知'

  // 如果是手机号格式(11位数字)
  if (/^\d{11}$/.test(createdBy)) {
    const user = userOptions.value.find((u: any) => u.phone === createdBy || u.id === createdBy)
    return user?.name || createdBy
  }

  // 如果是用户ID
  const user = userOptions.value.find((u: any) => u.id === createdBy)
  if (user) {
    return user.name
  }

  // 否则直接返回(可能已经是姓名)
  return createdBy
}

/**
 * 获取操作人姓名
 * 用于处理进度中的操作人显示
 */
const getOperatorName = (operator: string) => {
  if (!operator) return '系统'

  // 如果是手机号格式(11位数字)
  if (/^\d{11}$/.test(operator)) {
    const user = userOptions.value.find((u: unknown) => u.phone === operator || u.id === operator)
    return user?.name || operator
  }

  // 如果是用户ID
  const user = userOptions.value.find((u: unknown) => u.id === operator)
  if (user) {
    return user.name
  }

  // 否则直接返回(可能已经是姓名)
  return operator
}

/**
 * 加载售后详情
 */
const loadServiceDetail = async () => {
  loading.value = true
  try {
    const serviceId = route.params.id as string

    if (!serviceId) {
      ElMessage.error('售后ID不能为空')
      router.back()
      return
    }

    console.log('[售后详情] 加载售后记录:', serviceId)

    // 始终从API获取数据
    try {
      const data = await serviceApi.getDetail(serviceId)
      Object.assign(serviceInfo, data)
      console.log('[售后详情] API获取成功:', serviceInfo)
    } catch (apiError) {
      console.warn('[售后详情] API获取失败,尝试从store获取:', apiError)
      // API失败时回退到store
      const service = serviceStore.getServiceById(serviceId)
      if (!service) {
        ElMessage.error('售后记录不存在')
        router.back()
        return
      }
      Object.assign(serviceInfo, service)
    }

    // 生成处理步骤
    generateProcessSteps()
  } catch (error) {
    console.error('[售后详情] 加载失败:', error)
    ElMessage.error('加载售后详情失败')
    router.back()
  } finally {
    loading.value = false
  }
}

/**
 * 生成处理步骤
 */
const generateProcessSteps = () => {
  const steps: Array<{
    title: string
    description: string
    time: string
    type: string
    icon: unknown
    operator?: string
  }> = []

  // 创建步骤
  steps.push({
    title: '售后申请提交',
    description: '客户提交售后申请',
    time: serviceInfo.createTime,
    type: 'success',
    icon: User,
    operator: serviceInfo.createdBy
  })

  // 根据状态添加步骤
  if (serviceInfo.status !== 'pending') {
    steps.push({
      title: '申请已受理',
      description: '售后申请已受理,等待处理',
      time: serviceInfo.createTime,
      type: 'success',
      icon: Check,
      operator: '系统'
    })
  }

  if (serviceInfo.assignedTo) {
    steps.push({
      title: '分配处理人员',
      description: `已分配给${serviceInfo.assignedTo}处理`,
      time: serviceInfo.updateTime || serviceInfo.createTime,
      type: 'success',
      icon: User,
      operator: '系统'
    })
  }

  if (serviceInfo.status === 'processing') {
    steps.push({
      title: '开始处理',
      description: '处理人员开始处理售后问题',
      time: serviceInfo.updateTime || serviceInfo.createTime,
      type: 'primary',
      icon: Clock,
      operator: serviceInfo.assignedTo || '系统'
    })
  }

  if (serviceInfo.status === 'resolved') {
    steps.push({
      title: '问题已解决',
      description: '售后问题已解决',
      time: serviceInfo.updateTime || serviceInfo.createTime,
      type: 'success',
      icon: Check,
      operator: serviceInfo.assignedTo || '系统'
    })
  }

  if (serviceInfo.status === 'closed') {
    steps.push({
      title: '售后已关闭',
      description: '售后申请已关闭',
      time: serviceInfo.updateTime || serviceInfo.createTime,
      type: 'info',
      icon: Close,
      operator: '系统'
    })
  }

  processSteps.value = steps
}

/**
 * 添加跟进记录
 */
const handleAddFollowUp = () => {
  followUpDialogVisible.value = true
  // 默认当前时间
  followUpForm.followUpTime = new Date().toISOString().replace('T', ' ').substring(0, 19)
  followUpForm.content = ''
}

/**
 * 保存跟进记录 - 调用API保存到数据库
 */
const handleSaveFollowUp = async () => {
  if (!followUpForm.followUpTime) {
    ElMessage.warning('请选择跟进时间')
    return
  }

  if (!followUpForm.content || followUpForm.content.trim() === '') {
    ElMessage.warning('请输入跟进内容')
    return
  }

  try {
    const serviceId = route.params.id as string
    const savedRecord = await serviceApi.addFollowUp(serviceId, {
      followUpTime: followUpForm.followUpTime,
      content: followUpForm.content.trim()
    })

    // 添加到列表开头(最新的在前面)
    followUpRecords.value.unshift(savedRecord)

    // 关闭对话框
    followUpDialogVisible.value = false

    ElMessage.success('跟进记录已保存')
  } catch (error) {
    console.error('[售后详情] 保存跟进记录失败:', error)
    ElMessage.error('保存跟进记录失败')
  }
}

/**
 * 加载跟进记录 - 从API获取
 */
const loadFollowUpRecords = async () => {
  try {
    const serviceId = route.params.id as string
    if (!serviceId) return

    const records = await serviceApi.getFollowUps(serviceId)
    followUpRecords.value = records || []
    console.log('[售后详情] 跟进记录加载成功:', followUpRecords.value.length, '条')
  } catch (error) {
    console.error('[售后详情] 加载跟进记录失败:', error)
    followUpRecords.value = []
  }
}

// 生命周期
onMounted(async () => {
  // 加载用户和部门数据
  await userStore.loadUsers()
  // 加载售后详情
  await loadServiceDetail()
  // 加载跟进记录(从API获取)
  await loadFollowUpRecords()
})
</script>

<style scoped>
.service-detail {
  padding: 20px;
  background-color: #f5f5f5;
  min-height: calc(100vh - 60px);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.back-btn {
  margin-right: 16px;
}

.title-section {
  display: flex;
  align-items: center;
  gap: 16px;
}

.page-title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.service-status {
  margin-left: 16px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.info-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.info-item {
  display: flex;
  align-items: center;
}

.info-item label {
  min-width: 80px;
  color: #606266;
  font-weight: 500;
}

.info-item .value {
  color: #303133;
  font-weight: 500;
}

.product-info {
  padding: 16px 0;
}

.product-item {
  display: flex;
  align-items: center;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
}

.product-details h4 {
  margin: 0 0 8px 0;
  font-size: 16px;
  color: #303133;
}

.product-spec {
  margin: 0 0 8px 0;
  color: #606266;
}

.product-meta {
  display: flex;
  gap: 16px;
  font-size: 14px;
  color: #909399;
}

.description-content {
  padding: 16px 0;
}

.reason-section,
.description-section,
.remark-section {
  margin-bottom: 20px;
}

.reason-section h4,
.description-section h4,
.remark-section h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 600;
  color: #606266;
}

.reason-section p,
.description-section p,
.remark-section p {
  margin: 0;
  color: #303133;
  line-height: 1.6;
}

.attachments-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 16px;
}

.attachment-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.attachment-item:hover {
  background: #e9ecef;
  transform: translateY(-2px);
}

.file-icon {
  margin-bottom: 8px;
  color: #409EFF;
}

.file-info {
  text-align: center;
}

.file-name {
  margin: 0 0 4px 0;
  font-size: 12px;
  color: #303133;
  word-break: break-all;
}

.file-size {
  margin: 0;
  font-size: 11px;
  color: #909399;
}

.progress-card,
.action-card,
.related-card {
  margin-bottom: 20px;
}

.timeline-content h4 {
  margin: 0 0 4px 0;
  font-size: 14px;
  color: #303133;
}

.timeline-content p {
  margin: 0 0 4px 0;
  font-size: 13px;
  color: #606266;
}

.operator {
  font-size: 12px;
  color: #909399;
}

.quick-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.quick-actions .el-button {
  width: 100%;
}

.related-info {
  padding: 16px 0;
}

.related-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.related-item:last-child {
  border-bottom: none;
}

.related-item label {
  color: #606266;
  font-size: 14px;
}

.related-item span {
  color: #303133;
  font-size: 14px;
  font-weight: 500;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .service-detail {
    padding: 10px;
  }

  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }

  .header-left {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .title-section {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }

  .attachments-grid {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  }
}

/* 受限信息样式 */
.restricted-info {
  color: #909399;
  font-style: italic;
  font-size: 13px;
}

/* 超链接样式 */
.value-link {
  font-size: 14px;
  font-weight: 500;
}

.value-link:hover {
  text-decoration: underline;
}

/* 跟进记录样式 */
.follow-up-content {
  min-height: 200px;
}

.follow-up-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.follow-up-item {
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
  border-left: 3px solid #e4e7ed;
  transition: all 0.3s;
}

.follow-up-item.latest {
  background: #ecf5ff;
  border-left-color: #409eff;
}

.follow-up-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.follow-up-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e4e7ed;
}

.follow-up-time {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #606266;
  font-size: 13px;
}

.follow-up-time .el-icon {
  color: #909399;
}

.follow-up-user {
  color: #409eff;
  font-size: 13px;
  font-weight: 500;
}

.follow-up-body {
  color: #303133;
  font-size: 14px;
  line-height: 1.6;
}

.follow-up-body p {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}

.history-title {
  color: #606266;
  font-size: 14px;
}

.el-collapse {
  border: none;
}

:deep(.el-collapse-item__header) {
  background: transparent;
  border: none;
  padding: 8px 0;
}

:deep(.el-collapse-item__wrap) {
  background: transparent;
  border: none;
}

:deep(.el-collapse-item__content) {
  padding: 0;
}

/* 快捷操作按钮样式 */
.quick-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.action-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  font-size: 14px;
  height: 40px;
  border-radius: 8px;
  transition: all 0.3s;
  padding: 0 16px;
}

.action-btn:hover:not(:disabled) {
  transform: translateX(4px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 确保按钮内的图标和文字对齐 */
.action-btn :deep(.el-icon) {
  margin-right: 8px;
  font-size: 16px;
  display: inline-flex;
  align-items: center;
}

.action-btn :deep(span) {
  display: inline-flex;
  align-items: center;
}
</style>
