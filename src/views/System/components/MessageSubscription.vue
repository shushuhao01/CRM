<template>
  <div class="message-subscription">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h3>消息订阅管理</h3>
        <p>管理各部门的消息订阅规则，设置不同消息类型的通知方式</p>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="showCreateDialog">
          <el-icon><Plus /></el-icon>
          新建订阅规则
        </el-button>
      </div>
    </div>

    <!-- 筛选区域 -->
    <div class="filter-section">
      <el-form :model="filterForm" inline>
        <el-form-item label="部门">
          <el-select v-model="filterForm.departmentId" placeholder="选择部门" clearable style="width: 200px">
            <el-option label="全部部门" value="" />
            <el-option 
              v-for="dept in departments" 
              :key="dept.id" 
              :label="dept.name" 
              :value="dept.id" 
            />
          </el-select>
        </el-form-item>
        <el-form-item label="消息类型">
          <el-select v-model="filterForm.messageType" placeholder="选择消息类型" clearable style="width: 200px">
            <el-option label="全部类型" value="" />
            <el-option 
              v-for="type in messageTypes" 
              :key="type.value" 
              :label="type.label" 
              :value="type.value" 
            />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filterForm.status" placeholder="选择状态" clearable style="width: 120px">
            <el-option label="全部状态" value="" />
            <el-option label="启用" value="enabled" />
            <el-option label="禁用" value="disabled" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadSubscriptions">查询</el-button>
          <el-button @click="resetFilter">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 订阅规则列表 -->
    <div class="table-section">
      <el-table 
        :data="subscriptions" 
        v-loading="loading"
        stripe
        border
        style="width: 100%"
      >
        <el-table-column prop="id" label="规则ID" width="80" />
        <el-table-column prop="departmentName" label="订阅部门" width="120" />
        <el-table-column label="消息类型" width="250">
          <template #default="{ row }">
            <div class="message-types">
              <el-tag 
                v-for="messageType in row.messageTypes" 
                :key="messageType"
                :type="getMessageTypeTagType(messageType)"
                size="small"
                style="margin-right: 4px; margin-bottom: 2px;"
              >
                {{ getMessageTypeName(messageType) }}
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="通知方式" width="200">
          <template #default="{ row }">
            <div class="notification-methods">
              <el-tag 
                v-for="method in row.notificationMethods" 
                :key="method"
                :type="getNotificationMethodTagType(method)"
                size="small"
                style="margin-right: 4px; margin-bottom: 2px;"
              >
                {{ getNotificationMethodName(method) }}
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="createdBy" label="创建人" width="100" />
        <el-table-column prop="createdAt" label="创建时间" width="160">
          <template #default="{ row }">
            {{ formatDateTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-switch 
              v-model="row.isEnabled" 
              @change="toggleSubscriptionStatus(row)"
              :loading="row.statusLoading"
            />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="viewSubscription(row)">
              查看
            </el-button>
            <el-button type="warning" size="small" @click="editSubscription(row)">
              编辑
            </el-button>
            <el-button type="danger" size="small" @click="deleteSubscription(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-section">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.size"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadSubscriptions"
          @current-change="loadSubscriptions"
        />
      </div>
    </div>

    <!-- 新建/编辑订阅规则弹窗 -->
    <el-dialog 
      v-model="dialogVisible" 
      :title="dialogTitle"
      width="700px"
      :close-on-click-modal="false"
      class="subscription-dialog"
    >
      <el-form 
        ref="subscriptionFormRef"
        :model="subscriptionForm" 
        :rules="subscriptionRules"
        label-width="90px"
        class="subscription-form"
      >
        <el-form-item label="订阅部门" prop="departmentId">
          <el-select 
            v-model="subscriptionForm.departmentId" 
            placeholder="请选择部门"
            style="width: 100%"
            :disabled="isEdit"
          >
            <el-option 
              v-for="dept in departments" 
              :key="dept.id" 
              :label="dept.name" 
              :value="dept.id" 
            />
          </el-select>
        </el-form-item>

        <el-form-item label="消息类型" prop="messageTypes">
          <div class="message-type-selection">
            <div class="selection-tip">选择要订阅的消息类型（支持多选）</div>
            <div class="type-categories-compact">
              <div 
                v-for="category in messageTypeCategories" 
                :key="category.name"
                class="type-category-compact"
              >
                <div class="category-header-compact">
                  <span class="category-name-compact">{{ category.name }}</span>
                  <el-checkbox
                    :indeterminate="isCategoryIndeterminate(category)"
                    :model-value="isCategoryAllChecked(category)"
                    @change="handleCategoryCheckAllChange(category, $event)"
                    class="category-check-all-compact"
                    size="small"
                  >
                    全选
                  </el-checkbox>
                </div>
                <div class="type-options-compact">
                  <el-checkbox
                    v-for="type in category.types"
                    :key="type.value"
                    v-model="subscriptionForm.messageTypes"
                    :label="type.value"
                    class="type-option-compact"
                    :disabled="isEdit"
                    size="small"
                  >
                    {{ type.label }}
                  </el-checkbox>
                </div>
              </div>
            </div>
          </div>
        </el-form-item>

        <el-form-item label="通知方式" prop="notificationMethods">
          <div class="notification-methods-selection">
            <el-alert 
              v-if="!subscriptionForm.departmentId"
              title="请先选择订阅部门"
              description="系统将根据部门的通知配置显示可用的通知方式"
              type="info"
              :closable="false"
              show-icon
              class="department-alert"
            />
            <div v-else class="methods-grid">
              <el-checkbox-group v-model="subscriptionForm.notificationMethods" class="methods-group">
                <div 
                  v-for="method in availableNotificationMethods" 
                  :key="method.value"
                  class="method-card"
                >
                  <el-checkbox :label="method.value" class="method-checkbox">
                    <div class="method-content">
                      <div class="method-name">{{ method.label }}</div>
                      <div class="method-meta">
                        <span v-if="method.memberCount" class="member-count">{{ method.memberCount }}人</span>
                        <el-tag 
                          v-if="method.configStatus"
                          :type="method.configStatus === '已配置' ? 'success' : 'warning'"
                          size="small"
                          class="config-status"
                        >
                          {{ method.configStatus }}
                        </el-tag>
                      </div>
                    </div>
                  </el-checkbox>
                </div>
              </el-checkbox-group>
            </div>
          </div>
        </el-form-item>

        <el-form-item label="优先级" prop="priority">
          <el-radio-group v-model="subscriptionForm.priority" class="priority-group">
            <el-radio label="low" class="priority-option">低</el-radio>
            <el-radio label="normal" class="priority-option">普通</el-radio>
            <el-radio label="high" class="priority-option">高</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="时间设置">
          <div class="time-settings">
            <el-checkbox v-model="subscriptionForm.scheduleEnabled" label="启用时间限制" />
            <div v-if="subscriptionForm.scheduleEnabled" class="time-range">
              <el-time-picker
                v-model="subscriptionForm.scheduleStart"
                placeholder="开始时间"
                format="HH:mm"
                value-format="HH:mm"
                class="time-picker"
              />
              <span class="time-separator">至</span>
              <el-time-picker
                v-model="subscriptionForm.scheduleEnd"
                placeholder="结束时间"
                format="HH:mm"
                value-format="HH:mm"
                class="time-picker"
              />
              <el-checkbox v-model="subscriptionForm.excludeWeekends" label="排除周末" class="weekend-option" />
            </div>
          </div>
        </el-form-item>

        <el-form-item label="备注">
          <el-input 
            v-model="subscriptionForm.remark" 
            type="textarea" 
            :rows="2"
            placeholder="可选：输入备注信息"
            class="remark-input"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="saveSubscription" :loading="saving">
            {{ isEdit ? '更新' : '创建' }}
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 查看订阅规则详情弹窗 -->
    <el-dialog 
      v-model="viewDialogVisible" 
      title="订阅规则详情"
      width="500px"
    >
      <div v-if="currentSubscription" class="subscription-detail">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="规则ID">{{ currentSubscription.id }}</el-descriptions-item>
          <el-descriptions-item label="订阅部门">{{ currentSubscription.departmentName }}</el-descriptions-item>
          <el-descriptions-item label="消息类型">
            <el-tag :type="getMessageTypeTagType(currentSubscription.messageType)">
              {{ currentSubscription.messageTypeName }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="通知方式">
            <div class="notification-methods">
              <el-tag 
                v-for="method in currentSubscription.notificationMethods" 
                :key="method"
                :type="getNotificationMethodTagType(method)"
                size="small"
                style="margin-right: 4px; margin-bottom: 2px;"
              >
                {{ getNotificationMethodName(method) }}
              </el-tag>
            </div>
          </el-descriptions-item>
          <el-descriptions-item label="优先级">
            <el-tag :type="getPriorityTagType(currentSubscription.priority)">
              {{ getPriorityName(currentSubscription.priority) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="currentSubscription.isEnabled ? 'success' : 'danger'">
              {{ currentSubscription.isEnabled ? '启用' : '禁用' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="创建人">{{ currentSubscription.createdBy }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDateTime(currentSubscription.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="更新时间">{{ formatDateTime(currentSubscription.updatedAt) }}</el-descriptions-item>
          <el-descriptions-item v-if="currentSubscription.remark" label="备注">{{ currentSubscription.remark }}</el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import request from '@/utils/request'

// 消息类型分类定义
const messageTypeCategories = [
  {
    name: '订单管理',
    types: [
      { value: 'order_created', label: '新建订单通知', description: '有新订单创建时通知' },
      { value: 'order_submitted', label: '订单提交成功', description: '订单提交成功时通知' },
      { value: 'order_paid', label: '订单支付成功', description: '订单支付成功时通知' },
      { value: 'order_shipped', label: '订单发货通知', description: '订单发货时通知' },
      { value: 'order_delivered', label: '订单送达通知', description: '订单送达时通知' },
      { value: 'order_signed', label: '订单签收通知', description: '订单签收时通知' },
      { value: 'order_cancelled', label: '订单取消通知', description: '订单取消时通知' },
      { value: 'order_cancel_request', label: '订单取消申请', description: '订单取消申请时通知' },
      { value: 'order_cancel_approved', label: '订单取消通过', description: '订单取消申请通过时通知' },
      { value: 'order_modify_approved', label: '订单修改申请通过', description: '订单修改申请通过时通知' },
      { value: 'order_refunded', label: '订单退款通知', description: '订单退款时通知' },
      { value: 'payment_reminder', label: '付款提醒', description: '订单待付款提醒' }
    ]
  },
  {
    name: '售后服务',
    types: [
      { value: 'after_sales_created', label: '新售后申请', description: '新售后申请时通知' },
      { value: 'after_sales_processing', label: '售后处理中', description: '售后处理中时通知' },
      { value: 'after_sales_urgent', label: '紧急售后', description: '紧急售后时通知' },
      { value: 'after_sales_completed', label: '售后完成', description: '售后完成时通知' },
      { value: 'return_notification', label: '退货通知', description: '退货申请时通知' }
    ]
  },
  {
    name: '客户管理',
    types: [
      { value: 'customer_created', label: '新建客户通知', description: '新客户注册时通知' },
      { value: 'customer_updated', label: '客户信息更新', description: '客户信息更新时通知' },
      { value: 'customer_call', label: '客户来电', description: '客户来电时通知' },
      { value: 'customer_complaint', label: '客户投诉', description: '客户投诉时通知' },
      { value: 'customer_rejected', label: '客户拒收', description: '客户拒收时通知' },
      { value: 'customer_sharing', label: '客户分享通知', description: '客户分享时通知' },
      { value: 'customer_feedback', label: '客户反馈', description: '收到客户反馈时通知' }
    ]
  },
  {
    name: '商品管理',
    types: [
      { value: 'product_created', label: '商品添加成功', description: '商品添加成功时通知' },
      { value: 'product_updated', label: '商品信息更新', description: '商品信息更新时通知' },
      { value: 'product_out_of_stock', label: '商品缺货', description: '商品缺货时通知' },
      { value: 'product_price_changed', label: '商品价格变更', description: '商品价格变更时通知' }
    ]
  },
  {
    name: '物流管理',
    types: [
      { value: 'shipping_notification', label: '发货通知', description: '商品发货时通知' },
      { value: 'delivery_confirmation', label: '签收通知', description: '商品签收时通知' },
      { value: 'logistics_pickup', label: '物流揽件', description: '物流揽件时通知' },
      { value: 'logistics_in_transit', label: '物流运输中', description: '物流运输中时通知' },
      { value: 'logistics_delivered', label: '物流已送达', description: '物流已送达时通知' },
      { value: 'package_anomaly', label: '包裹异常', description: '包裹异常时通知' }
    ]
  },
  {
    name: '财务管理',
    types: [
      { value: 'payment_notification', label: '付款通知', description: '付款时通知' },
      { value: 'payment_received', label: '收款确认', description: '收款确认时通知' },
      { value: 'invoice_generated', label: '发票生成', description: '发票生成时通知' },
      { value: 'refund_processed', label: '退款处理', description: '退款处理时通知' }
    ]
  },
  {
    name: '审批流程',
    types: [
      { value: 'audit_notification', label: '审核通知', description: '需要审核时通知' },
      { value: 'audit_pending', label: '待审核', description: '待审核时通知' },
      { value: 'audit_approved', label: '审核通过', description: '审核通过时通知' },
      { value: 'audit_rejected', label: '审核拒绝', description: '审核拒绝时通知' }
    ]
  },
  {
    name: '业绩分享',
    types: [
      { value: 'performance_share_created', label: '业绩分享创建', description: '业绩分享创建时通知' },
      { value: 'performance_share_received', label: '收到业绩分享', description: '收到业绩分享时通知' },
      { value: 'performance_share_confirmed', label: '业绩分享确认', description: '业绩分享确认时通知' },
      { value: 'performance_share_rejected', label: '业绩分享拒绝', description: '业绩分享拒绝时通知' },
      { value: 'performance_share_cancelled', label: '业绩分享取消', description: '业绩分享取消时通知' }
    ]
  },
  {
    name: '服务管理',
    types: [
      { value: 'call_incoming', label: '来电提醒', description: '有新的来电时通知' },
      { value: 'call_missed', label: '未接来电', description: '有未接来电时通知' },
      { value: 'call_record_created', label: '通话记录创建', description: '新增通话记录时通知' },
      { value: 'call_followup_due', label: '跟进提醒', description: '客户跟进到期时通知' },
      { value: 'sms_sent', label: '短信发送', description: '短信发送成功时通知' },
      { value: 'sms_failed', label: '短信失败', description: '短信发送失败时通知' },
      { value: 'sms_quota_low', label: '短信余额不足', description: '短信余额不足时通知' }
    ]
  },
  {
    name: '资料管理',
    types: [
      { value: 'customer_data_created', label: '客户资料创建', description: '新增客户资料时通知' },
      { value: 'customer_data_updated', label: '客户资料更新', description: '客户资料更新时通知' },
      { value: 'customer_data_imported', label: '客户资料导入', description: '批量导入客户资料时通知' },
      { value: 'customer_query_executed', label: '客户查询执行', description: '执行客户查询时通知' },
      { value: 'customer_data_exported', label: '客户资料导出', description: '导出客户资料时通知' },
      { value: 'data_deleted', label: '资料删除', description: '资料被删除移入回收站时通知' },
      { value: 'data_recovered', label: '资料恢复', description: '资料从回收站恢复时通知' },
      { value: 'data_permanently_deleted', label: '资料永久删除', description: '资料从回收站永久删除时通知' },
      { value: 'recycle_bin_cleanup', label: '回收站清理', description: '回收站定期清理时通知' }
    ]
  },
  {
    name: '短信管理',
    types: [
      { value: 'sms_template_applied', label: '短信模板申请', description: '短信模板申请时通知' },
      { value: 'sms_template_approved', label: '短信模板审核通过', description: '短信模板审核通过时通知' },
      { value: 'sms_template_rejected', label: '短信模板审核拒绝', description: '短信模板审核拒绝时通知' },
      { value: 'sms_send_applied', label: '短信发送申请', description: '短信发送申请时通知' },
      { value: 'sms_send_approved', label: '短信发送审核通过', description: '短信发送审核通过时通知' },
      { value: 'sms_send_rejected', label: '短信发送审核拒绝', description: '短信发送审核拒绝时通知' },
      { value: 'sms_send_success', label: '短信发送成功', description: '短信发送成功时通知' },
      { value: 'sms_send_failed', label: '短信发送失败', description: '短信发送失败时通知' }
    ]
  },
  {
    name: '系统管理',
    types: [
      { value: 'system_maintenance', label: '系统维护通知', description: '系统维护时通知' },
      { value: 'system_update', label: '系统更新', description: '系统更新时通知' },
      { value: 'user_login', label: '用户登录', description: '用户登录时通知' },
      { value: 'user_created', label: '系统用户添加成功', description: '系统用户添加成功时通知' },
      { value: 'permission_configured', label: '权限配置成功', description: '权限配置成功时通知' },
      { value: 'data_export_success', label: '导出成功', description: '数据导出成功时通知' },
      { value: 'data_import_completed', label: '导入完成', description: '数据导入完成时通知' },
      { value: 'system_alert', label: '系统告警', description: '系统异常时通知' }
    ]
  }
]

// 扁平化的消息类型列表（用于筛选等场景）
const messageTypes = messageTypeCategories.flatMap(category => category.types)

// 通知方式定义
const notificationMethods = [
  { value: 'dingtalk', label: '钉钉' },
  { value: 'wechat_work', label: '企业微信' },
  { value: 'email', label: '邮件' },
  { value: 'sms', label: '短信' },
  { value: 'system_message', label: '系统消息' }
]

// 部门数据
const departments = ref([
  { id: '1', name: '销售部' },
  { id: '2', name: '客服部' },
  { id: '3', name: '技术部' },
  { id: '4', name: '财务部' },
  { id: '5', name: '人事部' }
])

// 筛选表单
const filterForm = reactive({
  departmentId: '',
  messageType: '',
  status: ''
})

// 订阅规则列表
const subscriptions = ref([])
const loading = ref(false)

// 通知配置数据
const notificationConfigs = ref([])
const configsLoading = ref(false)

// 分页
const pagination = reactive({
  page: 1,
  size: 20,
  total: 0
})

// 弹窗相关
const dialogVisible = ref(false)
const viewDialogVisible = ref(false)
const isEdit = ref(false)
const saving = ref(false)
const currentSubscription = ref(null)

// 表单相关
const subscriptionFormRef = ref<FormInstance>()
const subscriptionForm = reactive({
  id: '',
  departmentId: '',
  messageTypes: [], // 改为数组支持多选
  notificationMethods: [],
  priority: 'normal',
  scheduleEnabled: false,
  scheduleStart: '',
  scheduleEnd: '',
  excludeWeekends: false,
  remark: ''
})

const subscriptionRules: FormRules = {
  departmentId: [
    { required: true, message: '请选择订阅部门', trigger: 'change' }
  ],
  messageTypes: [
    { required: true, message: '请选择至少一种消息类型', trigger: 'change' }
  ],
  notificationMethods: [
    { required: true, message: '请选择至少一种通知方式', trigger: 'change' }
  ]
}

// 计算属性
const dialogTitle = computed(() => {
  return isEdit.value ? '编辑订阅规则' : '新建订阅规则'
})

// 根据选择的部门获取可用的通知方式
const availableNotificationMethods = computed(() => {
  if (!subscriptionForm.departmentId || notificationConfigs.value.length === 0) {
    return notificationMethods
  }
  
  const availableMethods = []
  
  notificationConfigs.value.forEach(config => {
    if (config.enabled && config.supportedDepartments.includes(subscriptionForm.departmentId)) {
      const method = notificationMethods.find(m => m.value === config.method)
      if (method) {
        availableMethods.push({
          ...method,
          memberCount: config.members.length,
          configStatus: config.enabled ? '已配置' : '未配置'
        })
      }
    }
  })
  
  return availableMethods.length > 0 ? availableMethods : notificationMethods
})

// 方法
const loadSubscriptions = async () => {
  loading.value = true
  try {
    // 调用后端API获取订阅规则列表
    const response = await request.get('/message/subscription-rules', {
      params: {
        page: pagination.page,
        pageSize: pagination.size,
        departmentId: filterForm.departmentId,
        messageType: filterForm.messageType,
        status: filterForm.status
      }
    })
    
    if (response.success && response.data) {
      // 处理返回的数据，确保每个订阅规则都有statusLoading属性
      const processedData = response.data.map(item => ({
        ...item,
        statusLoading: false,
        // 处理消息类型名称显示
        messageTypeNames: item.messageTypes ? 
          item.messageTypes.map(type => getMessageTypeName(type)).join(', ') : 
          getMessageTypeName(item.messageType)
      }))
      
      subscriptions.value = processedData
      pagination.total = response.total || processedData.length
    } else {
      subscriptions.value = []
      pagination.total = 0
    }
  } catch (error) {
    console.error('加载订阅规则失败:', error)
    ElMessage.error('加载订阅规则失败')
    subscriptions.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

const resetFilter = () => {
  filterForm.departmentId = ''
  filterForm.messageType = ''
  filterForm.status = ''
  loadSubscriptions()
}

// 获取通知配置
const loadNotificationConfigs = async () => {
  configsLoading.value = true
  try {
    const response = await request.get('/message/notification-configs')
    notificationConfigs.value = (response.success && response.data) ? response.data : []
  } catch (error) {
    console.error('获取通知配置失败:', error)
    ElMessage.error('获取通知配置失败')
  } finally {
    configsLoading.value = false
  }
}

const showCreateDialog = () => {
  isEdit.value = false
  resetForm()
  dialogVisible.value = true
}

const resetForm = () => {
  subscriptionForm.id = ''
  subscriptionForm.departmentId = ''
  subscriptionForm.messageTypes = [] // 改为数组
  subscriptionForm.notificationMethods = []
  subscriptionForm.priority = 'normal'
  subscriptionForm.scheduleEnabled = false
  subscriptionForm.scheduleStart = ''
  subscriptionForm.scheduleEnd = ''
  subscriptionForm.excludeWeekends = false
  subscriptionForm.remark = ''
}

const saveSubscription = async () => {
  if (!subscriptionFormRef.value) return
  
  try {
    await subscriptionFormRef.value.validate()
    saving.value = true
    
    // 准备提交数据
    const submitData = {
      departmentId: subscriptionForm.departmentId,
      messageTypes: subscriptionForm.messageTypes,
      notificationMethods: subscriptionForm.notificationMethods,
      priority: subscriptionForm.priority,
      scheduleEnabled: subscriptionForm.scheduleEnabled,
      scheduleStart: subscriptionForm.scheduleStart,
      scheduleEnd: subscriptionForm.scheduleEnd,
      excludeWeekends: subscriptionForm.excludeWeekends,
      remark: subscriptionForm.remark
    }
    
    // 调用后端API
    if (isEdit.value) {
      await request.put(`/message/subscription-rules/${subscriptionForm.id}`, submitData)
    } else {
      await request.post('/message/subscription-rules', submitData)
    }
    
    ElMessage.success(isEdit.value ? '订阅规则更新成功' : '订阅规则创建成功')
    dialogVisible.value = false
    loadSubscriptions()
  } catch (error) {
    console.error('保存失败:', error)
    ElMessage.error('保存失败，请重试')
  } finally {
    saving.value = false
  }
}

const viewSubscription = (row: any) => {
  currentSubscription.value = row
  viewDialogVisible.value = true
}

const editSubscription = (row: any) => {
  isEdit.value = true
  Object.assign(subscriptionForm, row)
  dialogVisible.value = true
}

const deleteSubscription = async (row: any) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除"${row.departmentName}"的订阅规则吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    // 调用后端API删除订阅规则
    await request.delete(`/message/subscription-rules/${row.id}`)
    
    ElMessage.success('删除成功')
    loadSubscriptions()
  } catch (error) {
    if (error.message !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error('删除失败，请重试')
    }
  }
}

const toggleSubscriptionStatus = async (row: any) => {
  row.statusLoading = true
  try {
    // 调用后端API切换订阅规则状态
    await request.put(`/message/subscription-rules/${row.id}/toggle`, {
      isEnabled: row.isEnabled
    })
    
    ElMessage.success(`订阅规则已${row.isEnabled ? '启用' : '禁用'}`)
  } catch (error) {
    // 恢复状态
    row.isEnabled = !row.isEnabled
    console.error('状态更新失败:', error)
    ElMessage.error('状态更新失败')
  } finally {
    row.statusLoading = false
  }
}

// 辅助方法
const getMessageTypeName = (type: string) => {
  const messageType = messageTypes.find(item => item.value === type)
  return messageType ? messageType.label : type
}

const getMessageTypeTagType = (type: string) => {
  const typeMap: Record<string, string> = {
    'audit_notification': 'warning',
    'approval_result': 'warning',
    'shipping_notification': 'success',
    'delivery_confirmation': 'success',
    'return_notification': 'danger',
    'customer_created': 'primary',
    'customer_share': 'info',
    'customer_feedback': 'info',
    'order_created': 'success',
    'order_updated': 'primary',
    'payment_reminder': 'warning',
    'system_maintenance': 'danger',
    'system_alert': 'danger'
  }
  return typeMap[type] || 'info'
}

const getNotificationMethodTagType = (method: string) => {
  const methodMap: Record<string, string> = {
    'dingtalk': 'primary',
    'wechat_work': 'success',
    'email': 'warning',
    'sms': 'danger',
    'system_message': 'info'
  }
  return methodMap[method] || 'info'
}

const getNotificationMethodName = (method: string) => {
  const methodMap: Record<string, string> = {
    'dingtalk': '钉钉',
    'wechat_work': '企业微信',
    'email': '邮件',
    'sms': '短信',
    'system_message': '系统消息'
  }
  return methodMap[method] || method
}

const getPriorityTagType = (priority: string) => {
  const priorityMap: Record<string, string> = {
    'low': 'info',
    'normal': 'primary',
    'high': 'danger'
  }
  return priorityMap[priority] || 'primary'
}

const getPriorityName = (priority: string) => {
  const priorityMap: Record<string, string> = {
    'low': '低',
    'normal': '普通',
    'high': '高'
  }
  return priorityMap[priority] || priority
}

const formatDateTime = (dateTime: string) => {
  return dateTime || '-'
}

// 消息类型选择辅助方法
const isMessageTypeChecked = (categoryTypes: any[], messageType: string) => {
  return subscriptionForm.messageTypes.includes(messageType)
}

const handleMessageTypeChange = (categoryTypes: any[], messageType: string, checked: boolean) => {
  if (checked) {
    if (!subscriptionForm.messageTypes.includes(messageType)) {
      subscriptionForm.messageTypes.push(messageType)
    }
  } else {
    const index = subscriptionForm.messageTypes.indexOf(messageType)
    if (index > -1) {
      subscriptionForm.messageTypes.splice(index, 1)
    }
  }
}

const isCategoryAllChecked = (category: any) => {
  return category.types.every(type => subscriptionForm.messageTypes.includes(type.value))
}

const isCategoryIndeterminate = (category: any) => {
  const checkedCount = category.types.filter(type => subscriptionForm.messageTypes.includes(type.value)).length
  return checkedCount > 0 && checkedCount < category.types.length
}

const handleCategoryCheckAllChange = (category: any, checked: boolean) => {
  if (checked) {
    category.types.forEach(type => {
      if (!subscriptionForm.messageTypes.includes(type.value)) {
        subscriptionForm.messageTypes.push(type.value)
      }
    })
  } else {
    category.types.forEach(type => {
      const index = subscriptionForm.messageTypes.indexOf(type.value)
      if (index > -1) {
        subscriptionForm.messageTypes.splice(index, 1)
      }
    })
  }
}

// 监听部门选择变化
watch(() => subscriptionForm.departmentId, (newDepartmentId, oldDepartmentId) => {
  if (newDepartmentId !== oldDepartmentId && subscriptionForm.notificationMethods.length > 0) {
    // 检查当前选择的通知方式是否在新部门的可用方式中
    const availableMethodValues = availableNotificationMethods.value.map(m => m.value)
    subscriptionForm.notificationMethods = subscriptionForm.notificationMethods.filter(method => 
      availableMethodValues.includes(method)
    )
  }
})

// 初始化
onMounted(() => {
  loadSubscriptions()
  loadNotificationConfigs()
})
</script>

<style scoped>
.message-subscription {
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
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.header-left h3 {
  margin: 0 0 8px 0;
  color: #303133;
  font-size: 20px;
  font-weight: 600;
}

.header-left p {
  margin: 0;
  color: #606266;
  font-size: 14px;
}

.filter-section {
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
  padding: 20px;
}

.pagination-section {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.notification-methods {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.subscription-detail {
  padding: 10px 0;
}

:deep(.el-descriptions__label) {
  font-weight: 600;
}

:deep(.el-table .cell) {
  padding: 8px 12px;
}

:deep(.el-checkbox-group) {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

:deep(.el-checkbox) {
  margin-right: 0;
}

/* 弹窗样式 */
.subscription-dialog {
  :deep(.el-dialog__body) {
    padding: 20px 24px;
  }
}

.subscription-form {
  :deep(.el-form-item) {
    margin-bottom: 24px;
  }
  
  :deep(.el-form-item__label) {
    font-weight: 500;
    color: #303133;
  }
}

/* 消息类型选择样式 */
.message-type-selection {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 16px;
  background-color: #fafbfc;
}

.selection-tip {
  font-size: 13px;
  color: #606266;
  margin-bottom: 16px;
  padding-left: 4px;
}

/* 紧凑型横向布局 */
.type-categories-compact {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 12px;
  max-height: 400px;
  overflow-y: auto;
}

.type-category-compact {
  background: #fafbfc;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 8px;
}

.category-header-compact {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
  padding-bottom: 4px;
  border-bottom: 1px solid #e4e7ed;
}

.category-name-compact {
  font-weight: 500;
  color: #303133;
  font-size: 12px;
}

.category-check-all-compact {
  :deep(.el-checkbox__label) {
    font-size: 11px;
    color: #606266;
  }
}

.type-options-compact {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.type-option-compact {
  flex: 0 0 auto;
  margin-right: 0;
  margin-bottom: 0;
  
  :deep(.el-checkbox__label) {
    font-size: 11px;
    color: #606266;
    line-height: 1.2;
    padding-left: 6px;
  }
  
  :deep(.el-checkbox__input) {
    .el-checkbox__inner {
      width: 12px;
      height: 12px;
    }
  }
}

/* 保留原有样式作为备用 */
.type-categories {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.type-category {
  background: white;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  padding: 12px;
}

.category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
}

.category-name {
  font-weight: 600;
  color: #303133;
  font-size: 14px;
}

.category-check-all {
  :deep(.el-checkbox__label) {
    font-size: 12px;
    color: #606266;
  }
}

.type-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 8px;
}

.type-option {
  :deep(.el-checkbox__label) {
    font-size: 13px;
    color: #606266;
    line-height: 1.4;
  }
}

/* 通知方式选择样式 */
.notification-methods-selection {
  width: 100%;
}

.department-alert {
  margin-bottom: 16px;
  :deep(.el-alert__description) {
    font-size: 12px;
    margin-top: 4px;
  }
}

.methods-grid {
  background: #fafbfc;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 16px;
}

.methods-group {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
  
  :deep(.el-checkbox-group) {
    display: contents;
  }
}

.method-card {
  background: white;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  padding: 12px;
  transition: all 0.2s ease;
  cursor: pointer;
}

.method-card:hover {
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
}

.method-checkbox {
  width: 100%;
  margin: 0;
  
  :deep(.el-checkbox__input) {
    position: absolute;
    top: 8px;
    right: 8px;
  }
  
  :deep(.el-checkbox__label) {
    width: 100%;
    padding-left: 0;
    padding-right: 24px;
  }
}

.method-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.method-name {
  font-weight: 500;
  color: #303133;
  font-size: 14px;
}

.method-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.member-count {
  font-size: 12px;
  color: #909399;
}

.config-status {
  font-size: 11px;
}

/* 优先级选择样式 */
.priority-group {
  display: flex;
  gap: 24px;
}

.priority-option {
  :deep(.el-radio__label) {
    font-size: 14px;
  }
}

/* 时间设置样式 */
.time-settings {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.time-range {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 8px;
  padding: 12px;
  background: #fafbfc;
  border-radius: 6px;
}

.time-picker {
  width: 120px;
}

.time-separator {
  color: #606266;
  font-size: 14px;
}

.weekend-option {
  margin-left: 8px;
}

/* 备注输入样式 */
.remark-input {
  :deep(.el-textarea__inner) {
    font-size: 13px;
    color: #909399;
    background-color: #fafbfc;
    border-color: #e4e7ed;
  }
  
  :deep(.el-textarea__inner::placeholder) {
    color: #c0c4cc;
    font-size: 12px;
  }
  
  :deep(.el-textarea__inner:focus) {
    color: #606266;
    background-color: white;
  }
}

/* 弹窗底部样式 */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* 保留原有样式 */
.message-types {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.method-info {
  display: flex;
  align-items: center;
  width: 100%;
}

.method-label {
  font-weight: 500;
  color: #303133;
}

.method-detail {
  font-size: 12px;
  color: #909399;
  margin-left: 4px;
}
</style>