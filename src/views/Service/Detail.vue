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
              <span class="value">
                <el-link 
                  type="primary" 
                  @click="viewOrder(serviceInfo.orderNumber)"
                >
                  {{ serviceInfo.orderNumber }}
                </el-link>
              </span>
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
              <span class="value">{{ serviceInfo.customerName }}</span>
            </div>
            <div class="info-item">
              <label>联系电话：</label>
              <span class="value">
                <el-link 
                  v-if="userStore.canViewPhone" 
                  type="primary" 
                  @click="handleCall"
                >
                  {{ maskPhone(serviceInfo.customerPhone) }}
                </el-link>
                <span v-else class="restricted-info">***-****-****</span>
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
              :timestamp="step.time"
              :type="step.type"
              :icon="step.icon"
            >
              <div class="timeline-content">
                <h4>{{ step.title }}</h4>
                <p>{{ step.description }}</p>
                <p v-if="step.operator" class="operator">操作人：{{ step.operator }}</p>
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
              size="small" 
              @click="assignHandler"
              :disabled="serviceInfo.status === 'closed'"
            >
              分配处理人
            </el-button>
            <el-button 
              v-if="canProcess"
              type="success" 
              size="small" 
              @click="updateStatus"
              :disabled="serviceInfo.status === 'closed'"
            >
              更新状态
            </el-button>
            <el-button 
              v-if="canEdit"
              type="warning" 
              size="small" 
              @click="addRemark"
            >
              添加备注
            </el-button>
            <el-button 
              v-if="canViewDetails"
              type="info" 
              size="small" 
              @click="exportReport"
            >
              导出报告
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
              <span>{{ serviceInfo.createdBy }}</span>
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
      width="400px"
    >
      <el-form :model="assignForm" label-width="80px">
        <el-form-item label="处理人员">
          <el-select v-model="assignForm.assignedTo" placeholder="请选择处理人员" style="width: 100%">
            <el-option
              v-for="user in userOptions"
              :key="user.id"
              :label="user.name"
              :value="user.name"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="assignForm.remark"
            type="textarea"
            :rows="3"
            placeholder="请输入分配备注"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="assignDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmAssign">确定</el-button>
      </template>
    </el-dialog>

    <!-- 状态更新对话框 -->
    <el-dialog
      v-model="statusDialogVisible"
      title="更新状态"
      width="400px"
    >
      <el-form :model="statusForm" label-width="80px">
        <el-form-item label="新状态">
          <el-select v-model="statusForm.status" placeholder="请选择状态" style="width: 100%">
            <el-option label="待处理" value="pending" />
            <el-option label="处理中" value="processing" />
            <el-option label="已解决" value="resolved" />
            <el-option label="已关闭" value="closed" />
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
  Close
} from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { useNotificationStore } from '@/stores/notification'
import { maskPhone, formatPhone } from '@/utils/phone'
import { createSafeNavigator } from '@/utils/navigation'

// 路由相关
const router = useRouter()
const route = useRoute()
const safeNavigator = createSafeNavigator(router)
const userStore = useUserStore()

// 通知store
const notificationStore = useNotificationStore()

// 响应式数据
const loading = ref(false)
const assignDialogVisible = ref(false)
const statusDialogVisible = ref(false)

// 售后信息
const serviceInfo = reactive({
  id: '',
  serviceNumber: 'SH202401150001',
  orderNumber: 'ORD202401150001',
  serviceType: 'return',
  status: 'processing',
  priority: 'high',
  customerName: '张三',
  customerPhone: '13812345678',
  contactName: '张三',
  contactAddress: '北京市朝阳区xxx街道xxx号',
  productName: '智能手机',
  productSpec: '128GB 黑色',
  quantity: 1,
  price: 2999,
  reason: '商品质量问题',
  description: '手机屏幕出现黑屏现象，无法正常使用',
  remark: '客户要求退货处理',
  assignedTo: '李四',
  createdBy: '张三',
  createTime: '2024-01-15 10:30:00',
  updateTime: '2024-01-15 14:20:00',
  expectedTime: '2024-01-20 18:00:00',
  attachments: [
    { name: '问题图片1.jpg', size: 1024000, url: '/uploads/image1.jpg' },
    { name: '问题图片2.jpg', size: 856000, url: '/uploads/image2.jpg' }
  ]
})

// 处理步骤
const processSteps = ref([
  {
    title: '售后申请提交',
    description: '客户提交售后申请',
    time: '2024-01-15 10:30:00',
    type: 'success',
    icon: User,
    operator: '张三'
  },
  {
    title: '申请审核通过',
    description: '售后申请已通过审核',
    time: '2024-01-15 11:00:00',
    type: 'success',
    icon: Check,
    operator: '王五'
  },
  {
    title: '分配处理人员',
    description: '已分配给李四处理',
    time: '2024-01-15 11:30:00',
    type: 'success',
    icon: User,
    operator: '王五'
  },
  {
    title: '开始处理',
    description: '处理人员开始处理售后问题',
    time: '2024-01-15 14:00:00',
    type: 'primary',
    icon: Clock,
    operator: '李四'
  }
])

// 分配表单
const assignForm = reactive({
  assignedTo: '',
  remark: ''
})

// 状态表单
const statusForm = reactive({
  status: '',
  remark: ''
})

// 用户选项
const userOptions = ref([
  { id: '1', name: '李四' },
  { id: '2', name: '赵六' },
  { id: '3', name: '孙八' },
  { id: '4', name: '周九' }
])

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
      notificationStore.MessageType.AFTER_SALES_CLOSED,
      `售后申请 ${serviceInfo.serviceNumber} 已关闭，客户：${serviceInfo.customerName}`,
      {
        relatedId: serviceInfo.serviceNumber,
        relatedType: 'service',
        actionUrl: `/service/detail/${serviceInfo.serviceNumber}`,
        metadata: {
          customerName: serviceInfo.customerName,
          serviceType: serviceInfo.serviceType,
          closedAt: new Date().toISOString()
        }
      }
    )
    
    ElMessage.success('售后申请已关闭')
  })
}

/**
 * 查看订单
 */
const viewOrder = (orderNumber: string) => {
  // 这里应该跳转到订单详情页面
  ElMessage.info(`查看订单 ${orderNumber}`)
}

/**
 * 拨打电话
 */
const handleCall = () => {
  ElMessage.success(`正在拨打 ${serviceInfo.customerPhone}`)
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
const confirmAssign = () => {
  if (!assignForm.assignedTo) {
    ElMessage.warning('请选择处理人员')
    return
  }
  
  serviceInfo.assignedTo = assignForm.assignedTo
  assignDialogVisible.value = false
  
  // 发送分配处理人成功的消息提醒
  notificationStore.sendMessage(
    notificationStore.MessageType.AFTER_SALES_ASSIGNED,
    `售后申请 ${serviceInfo.serviceNumber} 已分配给 ${assignForm.assignedTo}，客户：${serviceInfo.customerName}`,
    {
      relatedId: serviceInfo.serviceNumber,
      relatedType: 'service',
      actionUrl: `/service/detail/${serviceInfo.serviceNumber}`,
      metadata: {
        customerName: serviceInfo.customerName,
        serviceType: serviceInfo.serviceType,
        assignedTo: assignForm.assignedTo
      }
    }
  )
  
  ElMessage.success('分配成功')
  
  // 添加处理步骤
  processSteps.value.push({
    title: '重新分配处理人',
    description: `已分配给${assignForm.assignedTo}处理`,
    time: new Date().toLocaleString(),
    type: 'success',
    icon: User,
    operator: userStore.currentUser?.name || '系统'
  })
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
const confirmStatusUpdate = () => {
  if (!statusForm.status) {
    ElMessage.warning('请选择状态')
    return
  }
  
  serviceInfo.status = statusForm.status
  statusDialogVisible.value = false
  
  // 发送状态更新的消息提醒
  notificationStore.sendMessage(
    notificationStore.MessageType.AFTER_SALES_STATUS_CHANGED,
    `售后申请 ${serviceInfo.serviceNumber} 状态已更新为${getStatusText(statusForm.status)}，客户：${serviceInfo.customerName}`,
    {
      relatedId: serviceInfo.serviceNumber,
      relatedType: 'service',
      actionUrl: `/service/detail/${serviceInfo.serviceNumber}`,
      metadata: {
        customerName: serviceInfo.customerName,
        serviceType: serviceInfo.serviceType,
        newStatus: statusForm.status,
        remark: statusForm.remark
      }
    }
  )
  
  ElMessage.success('状态更新成功')
  
  // 添加处理步骤
  processSteps.value.push({
    title: '状态更新',
    description: statusForm.remark || `状态更新为${getStatusText(statusForm.status)}`,
    time: new Date().toLocaleString(),
    type: 'primary',
    icon: Clock,
    operator: userStore.currentUser?.name || '系统'
  })
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
 * 加载售后详情
 */
const loadServiceDetail = async () => {
  loading.value = true
  try {
    // 这里应该调用API获取售后详情
    const id = route.params.id
    console.log('Loading service detail for ID:', id)
    
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 500))
    
    serviceInfo.id = id as string
  } catch (error) {
    console.error('Failed to load service detail:', error)
    ElMessage.error('加载售后详情失败')
  } finally {
    loading.value = false
  }
}

// 生命周期
onMounted(() => {
  loadServiceDetail()
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
</style>