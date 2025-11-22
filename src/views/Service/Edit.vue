<template>
  <div class="service-edit">
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
        <h1 class="page-title">编辑售后</h1>
      </div>
      <div class="header-actions">
        <el-button @click="handleBack">取消</el-button>
        <el-button
          type="primary"
          @click="handleSave"
          :loading="saveLoading"
        >
          保存
        </el-button>
      </div>
    </div>

    <!-- 表单内容 -->
    <el-card shadow="never">
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="120px"
        :label-position="isMobile ? 'top' : 'right'"
        class="service-form"
      >
        <!-- 基本信息 -->
        <div class="form-section">
          <h3 class="section-title">基本信息</h3>
          <el-row :gutter="20">
            <el-col :span="isMobile ? 24 : 12">
              <el-form-item label="售后单号" prop="serviceNumber">
                <el-input
                  v-model="form.serviceNumber"
                  disabled
                  placeholder="系统自动生成"
                />
              </el-form-item>
            </el-col>
            <el-col :span="isMobile ? 24 : 12">
              <el-form-item label="原订单号" prop="orderNumber">
                <div class="order-input-group">
                  <el-input
                    v-model="form.orderNumber"
                    placeholder="请输入原订单号"
                    :disabled="orderLoaded"
                  />
                  <el-button
                    type="primary"
                    :icon="Search"
                    @click="searchOrder"
                    :disabled="orderLoaded"
                  >
                    搜索
                  </el-button>
                </div>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="isMobile ? 24 : 12">
              <el-form-item label="服务类型" prop="serviceType">
                <el-select
                  v-model="form.serviceType"
                  placeholder="请选择服务类型"
                  style="width: 100%"
                >
                  <el-option label="退货" value="return" />
                  <el-option label="换货" value="exchange" />
                  <el-option label="维修" value="repair" />
                  <el-option label="退款" value="refund" />
                  <el-option label="投诉" value="complaint" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="isMobile ? 24 : 12">
              <el-form-item label="优先级" prop="priority">
                <el-select
                  v-model="form.priority"
                  placeholder="请选择优先级"
                  style="width: 100%"
                >
                  <el-option label="低" value="low" />
                  <el-option label="中" value="medium" />
                  <el-option label="高" value="high" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="isMobile ? 24 : 12">
              <el-form-item label="处理人员" prop="assignedTo">
                <el-select
                  v-model="form.assignedTo"
                  placeholder="请选择处理人员"
                  style="width: 100%"
                  clearable
                  filterable
                  @change="handleAssignedToChange"
                >
                  <!-- 最近选择的用户 -->
                  <el-option-group v-if="recentUsers.length > 0" label="最近选择">
                    <el-option
                      v-for="user in recentUsers"
                      :key="'recent-' + user.id"
                      :label="user.name"
                      :value="user.name"
                    >
                      <span>{{ user.name }}</span>
                      <span style="float: right; color: #8492a6; font-size: 13px">
                        {{ user.department || '未分配部门' }}
                      </span>
                    </el-option>
                  </el-option-group>

                  <!-- 所有用户 -->
                  <el-option-group label="所有用户">
                    <el-option
                      v-for="user in sortedUserOptions"
                      :key="user.id"
                      :label="user.name"
                      :value="user.name"
                    >
                      <span>{{ user.name }}</span>
                      <span style="float: right; color: #8492a6; font-size: 13px">
                        {{ user.department || '未分配部门' }}
                      </span>
                    </el-option>
                  </el-option-group>
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="isMobile ? 24 : 12">
              <el-form-item label="状态" prop="status">
                <el-select
                  v-model="form.status"
                  placeholder="请选择状态"
                  style="width: 100%"
                >
                  <el-option label="待处理" value="pending" />
                  <el-option label="处理中" value="processing" />
                  <el-option label="已解决" value="resolved" />
                  <el-option label="已关闭" value="closed" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <!-- 客户信息 -->
        <div class="form-section">
          <h3 class="section-title">客户信息</h3>
          <el-row :gutter="20">
            <el-col :span="isMobile ? 24 : 12">
              <el-form-item label="客户姓名" prop="customerName">
                <el-input
                  v-model="form.customerName"
                  placeholder="请输入客户姓名"
                  :disabled="orderLoaded"
                />
              </el-form-item>
            </el-col>
            <el-col :span="isMobile ? 24 : 12">
              <el-form-item label="联系电话" prop="customerPhone">
                <div class="phone-management">
                  <el-select
                    v-model="form.customerPhone"
                    placeholder="请选择联系电话"
                    style="width: 100%"
                    clearable
                  >
                    <el-option
                      v-for="phone in customerPhones"
                      :key="phone.id"
                      :label="maskPhone(phone.phone)"
                      :value="phone.phone"
                    />
                  </el-select>
                  <el-button
                    type="primary"
                    size="small"
                    @click="showAddCustomerPhoneDialog = true"
                    style="margin-left: 8px;"
                    :icon="Plus"
                  >
                    新增
                  </el-button>
                </div>
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <!-- 商品信息 -->
        <div class="form-section">
          <h3 class="section-title">商品信息</h3>
          <el-row :gutter="20">
            <el-col :span="isMobile ? 24 : 12">
              <el-form-item label="商品名称" prop="productName">
                <el-input
                  v-model="form.productName"
                  placeholder="请输入商品名称"
                  :disabled="orderLoaded"
                />
              </el-form-item>
            </el-col>
            <el-col :span="isMobile ? 24 : 12">
              <el-form-item label="商品规格" prop="productSpec">
                <el-input
                  v-model="form.productSpec"
                  placeholder="请输入商品规格"
                  :disabled="orderLoaded"
                />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="isMobile ? 24 : 8">
              <el-form-item label="数量" prop="quantity">
                <el-input-number
                  v-model="form.quantity"
                  :min="1"
                  :max="999"
                  style="width: 100%"
                  :disabled="orderLoaded"
                />
              </el-form-item>
            </el-col>
            <el-col :span="isMobile ? 24 : 8">
              <el-form-item label="单价" prop="price">
                <el-input-number
                  v-model="form.price"
                  :min="0"
                  :precision="2"
                  style="width: 100%"
                  :disabled="orderLoaded"
                />
              </el-form-item>
            </el-col>
            <el-col :span="isMobile ? 24 : 8">
              <el-form-item label="总金额">
                <el-input
                  :value="`¥${(form.quantity * form.price).toFixed(2)}`"
                  disabled
                />
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <!-- 申请信息 -->
        <div class="form-section">
          <h3 class="section-title">申请信息</h3>
          <el-row :gutter="20">
            <el-col :span="24">
              <el-form-item label="问题原因" prop="reason">
                <el-select
                  v-model="form.reason"
                  placeholder="请选择问题原因"
                  style="width: 100%"
                  filterable
                  allow-create
                >
                  <el-option label="商品质量问题" value="商品质量问题" />
                  <el-option label="商品损坏" value="商品损坏" />
                  <el-option label="商品不符合描述" value="商品不符合描述" />
                  <el-option label="发错商品" value="发错商品" />
                  <el-option label="物流损坏" value="物流损坏" />
                  <el-option label="不喜欢/不合适" value="不喜欢/不合适" />
                  <el-option label="其他原因" value="其他原因" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="24">
              <el-form-item label="问题描述" prop="description">
                <el-input
                  v-model="form.description"
                  type="textarea"
                  :rows="4"
                  placeholder="请详细描述遇到的问题"
                  maxlength="500"
                  show-word-limit
                />
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <!-- 联系信息 -->
        <div class="form-section">
          <h3 class="section-title">联系信息</h3>
          <el-row :gutter="20">
            <el-col :span="isMobile ? 24 : 12">
              <el-form-item label="联系人" prop="contactName">
                <el-input
                  v-model="form.contactName"
                  placeholder="请输入联系人姓名"
                />
              </el-form-item>
            </el-col>
            <el-col :span="isMobile ? 24 : 12">
              <el-form-item label="联系电话" prop="contactPhone">
                <div class="phone-management">
                  <el-select
                    v-model="form.contactPhone"
                    placeholder="请选择联系电话"
                    style="width: 100%"
                    clearable
                  >
                    <el-option
                      v-for="phone in contactPhones"
                      :key="phone.id"
                      :label="maskPhone(phone.phone)"
                      :value="phone.phone"
                    />
                  </el-select>
                  <el-button
                    type="primary"
                    size="small"
                    @click="showAddContactPhoneDialog = true"
                    style="margin-left: 8px;"
                    :icon="Plus"
                  >
                    新增
                  </el-button>
                </div>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="24">
              <el-form-item label="联系地址" prop="contactAddress">
                <el-input
                  v-model="form.contactAddress"
                  placeholder="请输入详细地址"
                />
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <!-- 附件上传 -->
        <div class="form-section">
          <h3 class="section-title">相关附件</h3>
          <el-row :gutter="20">
            <el-col :span="24">
              <el-form-item label="上传图片">
                <el-upload
                  v-model:file-list="fileList"
                  action="#"
                  list-type="picture-card"
                  :auto-upload="false"
                  :on-preview="handlePreview"
                  :on-remove="handleRemove"
                  :before-upload="beforeUpload"
                  multiple
                  accept="image/*"
                >
                  <el-icon><Plus /></el-icon>
                </el-upload>
                <div class="upload-tip">
                  支持 jpg、png、gif 格式，单个文件不超过 5MB，最多上传 9 张图片
                </div>
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <!-- 备注信息 -->
        <div class="form-section">
          <h3 class="section-title">备注信息</h3>
          <el-row :gutter="20">
            <el-col :span="24">
              <el-form-item label="备注" prop="remark">
                <el-input
                  v-model="form.remark"
                  type="textarea"
                  :rows="3"
                  placeholder="请输入备注信息"
                  maxlength="200"
                  show-word-limit
                />
              </el-form-item>
            </el-col>
          </el-row>
        </div>
      </el-form>
    </el-card>

    <!-- 图片预览对话框 -->
    <el-dialog v-model="previewVisible" title="图片预览" width="50%">
      <img :src="previewUrl" alt="预览图片" style="width: 100%" />
    </el-dialog>

    <!-- 订单搜索对话框 -->
    <el-dialog
      v-model="orderDialogVisible"
      title="搜索订单"
      width="600px"
    >
      <div class="order-search">
        <el-input
          v-model="orderSearchKeyword"
          placeholder="请输入订单号或客户信息"
          @keyup.enter="searchOrderList"
        >
          <template #append>
            <el-button :icon="Search" @click="searchOrderList" />
          </template>
        </el-input>

        <el-table
          :data="orderSearchResults"
          style="margin-top: 16px"
          @row-click="selectOrder"
          highlight-current-row
        >
          <el-table-column prop="orderNumber" label="订单号" width="150" />
          <el-table-column prop="customerName" label="客户姓名" width="100" />
          <el-table-column prop="productName" label="商品名称" />
          <el-table-column prop="totalAmount" label="订单金额" width="100">
            <template #default="{ row }">
              ¥{{ row.totalAmount }}
            </template>
          </el-table-column>
          <el-table-column prop="createTime" label="下单时间" width="150" />
        </el-table>
      </div>
      <template #footer>
        <el-button @click="orderDialogVisible = false">取消</el-button>
      </template>
    </el-dialog>

    <!-- 新增客户手机号对话框 -->
    <el-dialog
      v-model="showAddCustomerPhoneDialog"
      title="新增客户手机号"
      width="400px"
      :before-close="handleCloseAddCustomerPhoneDialog"
    >
      <el-form
        ref="addCustomerPhoneFormRef"
        :model="addCustomerPhoneForm"
        :rules="addPhoneRules"
        label-width="80px"
      >
        <el-form-item label="手机号" prop="phone">
          <el-input
            v-model="addCustomerPhoneForm.phone"
            placeholder="请输入手机号"
            clearable
          />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input
            v-model="addCustomerPhoneForm.remark"
            placeholder="请输入备注（可选）"
            clearable
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="handleCloseAddCustomerPhoneDialog">取消</el-button>
          <el-button type="primary" @click="handleAddCustomerPhone" :loading="addingCustomerPhone">
            确认添加
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 新增联系手机号对话框 -->
    <el-dialog
      v-model="showAddContactPhoneDialog"
      title="新增联系手机号"
      width="400px"
      :before-close="handleCloseAddContactPhoneDialog"
    >
      <el-form
        ref="addContactPhoneFormRef"
        :model="addContactPhoneForm"
        :rules="addPhoneRules"
        label-width="80px"
      >
        <el-form-item label="手机号" prop="phone">
          <el-input
            v-model="addContactPhoneForm.phone"
            placeholder="请输入手机号"
            clearable
          />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input
            v-model="addContactPhoneForm.remark"
            placeholder="请输入备注（可选）"
            clearable
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="handleCloseAddContactPhoneDialog">取消</el-button>
          <el-button type="primary" @click="handleAddContactPhone" :loading="addingContactPhone">
            确认添加
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Plus, Search } from '@element-plus/icons-vue'
import type { FormInstance, FormRules, UploadUserFile } from 'element-plus'
import { useResponsive } from '@/utils/responsive'
import { maskPhone } from '@/utils/phone'
import { PhoneSyncService } from '@/services/phoneSync'
import { createSafeNavigator } from '@/utils/navigation'
import { useServiceStore, type AfterSalesService } from '@/stores/service'
import { useUserStore } from '@/stores/user'
import { useOrderStore } from '@/stores/order'
import { isProduction } from '@/utils/env'

// 路由
const router = useRouter()
const route = useRoute()
const safeNavigator = createSafeNavigator(router)

// Store
const serviceStore = useServiceStore()
const userStore = useUserStore()
const orderStore = useOrderStore()

// 响应式
const { isMobile } = useResponsive()

// 响应式数据
const formRef = ref<FormInstance>()
const saveLoading = ref(false)
const orderLoaded = ref(false)
const previewVisible = ref(false)
const previewUrl = ref('')
const orderDialogVisible = ref(false)
const orderSearchKeyword = ref('')
const orderSearchResults = ref<any[]>([])

// 手机号管理相关数据
const customerPhones = ref<Array<{ id: number; phone: string; remark: string }>>([])
const contactPhones = ref<Array<{ id: number; phone: string; remark: string }>>([])

// 新增客户手机号对话框
const showAddCustomerPhoneDialog = ref(false)
const addCustomerPhoneFormRef = ref()
const addingCustomerPhone = ref(false)

// 新增联系手机号对话框
const showAddContactPhoneDialog = ref(false)
const addContactPhoneFormRef = ref()
const addingContactPhone = ref(false)

// 新增客户手机号表单
const addCustomerPhoneForm = reactive({
  phone: '',
  remark: ''
})

// 新增联系手机号表单
const addContactPhoneForm = reactive({
  phone: '',
  remark: ''
})

// 手机号表单验证规则
const addPhoneRules = {
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号格式', trigger: 'blur' }
  ]
}

// 表单数据
const form = reactive({
  id: '',
  serviceNumber: '',
  orderNumber: '',
  serviceType: '',
  status: '',
  priority: '',
  customerName: '',
  customerPhone: '',
  assignedTo: '',
  productName: '',
  productSpec: '',
  quantity: 1,
  price: 0,
  reason: '',
  description: '',
  contactName: '',
  contactPhone: '',
  contactAddress: '',
  remark: '',
  customerId: '',
  contactId: '',
  createdBy: '',
  createTime: '',
  updateTime: ''
})

// 文件列表
const fileList = ref<UploadUserFile[]>([])

// 最近选择的用户
const recentUsers = ref<Array<{ id: string; name: string; department?: string }>>([])

// 用户选项
const userOptions = ref<Array<{ id: string; name: string; department?: string }>>([])

// 表单验证规则
const rules: FormRules = {
  orderNumber: [
    { required: true, message: '请输入原订单号', trigger: 'blur' }
  ],
  serviceType: [
    { required: true, message: '请选择服务类型', trigger: 'change' }
  ],
  customerName: [
    { required: true, message: '请输入客户姓名', trigger: 'blur' }
  ],
  customerPhone: [
    { required: true, message: '请输入联系电话', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码', trigger: 'blur' }
  ],
  productName: [
    { required: true, message: '请输入商品名称', trigger: 'blur' }
  ],
  quantity: [
    { required: true, message: '请输入数量', trigger: 'blur' }
  ],
  price: [
    { required: true, message: '请输入单价', trigger: 'blur' }
  ],
  reason: [
    { required: true, message: '请选择问题原因', trigger: 'change' }
  ],
  description: [
    { required: true, message: '请输入问题描述', trigger: 'blur' }
  ],
  contactName: [
    { required: true, message: '请输入联系人', trigger: 'blur' }
  ],
  contactPhone: [
    { required: true, message: '请输入联系电话', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码', trigger: 'blur' }
  ],
  contactAddress: [
    { required: true, message: '请输入联系地址', trigger: 'blur' }
  ]
}

// 方法定义
/**
 * 返回上一页
 */
const handleBack = () => {
  router.back()
}

/**
 * 保存售后信息
 */
const handleSave = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()

    saveLoading.value = true

    if (isProduction()) {
      // 生产环境:调用API
      const response = await fetch(`/api/service/${form.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(form)
      })

      if (!response.ok) {
        throw new Error('保存失败')
      }

      ElMessage.success('保存成功')
    } else {
      // 开发环境:更新store
      const updateData: Partial<AfterSalesService> = {
        serviceNumber: form.serviceNumber,
        orderNumber: form.orderNumber,
        serviceType: form.serviceType as 'return' | 'exchange' | 'repair' | 'refund',
        status: form.status as 'pending' | 'processing' | 'resolved' | 'closed',
        priority: form.priority as 'low' | 'normal' | 'high' | 'urgent',
        customerName: form.customerName,
        customerPhone: form.customerPhone,
        assignedTo: form.assignedTo,
        productName: form.productName,
        productSpec: form.productSpec,
        quantity: form.quantity,
        price: form.price,
        reason: form.reason,
        description: form.description,
        contactName: form.contactName,
        contactAddress: form.contactAddress,
        remark: form.remark,
        updateTime: new Date().toISOString().replace('T', ' ').substring(0, 19)
      }

      serviceStore.updateService(form.id, updateData)
      ElMessage.success('保存成功')
    }

    safeNavigator.push('/service/list')
  } catch (error) {
    console.error('Save failed:', error)
    ElMessage.error('保存失败')
  } finally {
    saveLoading.value = false
  }
}

/**
 * 搜索订单
 */
const searchOrder = () => {
  if (!form.orderNumber) {
    ElMessage.warning('请输入订单号')
    return
  }

  orderDialogVisible.value = true
  searchOrderList()
}

/**
 * 加载客户手机号列表
 */
const loadCustomerPhones = async () => {
  try {
    // 模拟从API获取客户手机号列表
    customerPhones.value = [
      { id: 1, phone: '13800138001', remark: '主要联系方式' },
      { id: 2, phone: '13800138002', remark: '备用联系方式' }
    ]
  } catch (error) {
    console.error('加载客户手机号失败:', error)
  }
}

/**
 * 加载联系手机号列表
 */
const loadContactPhones = async () => {
  try {
    // 模拟从API获取联系手机号列表
    contactPhones.value = [
      { id: 1, phone: '13800138003', remark: '联系人手机' },
      { id: 2, phone: '13800138004', remark: '紧急联系方式' }
    ]
  } catch (error) {
    console.error('加载联系手机号失败:', error)
  }
}

/**
 * 新增客户手机号
 */
const handleAddCustomerPhone = async () => {
  if (!addCustomerPhoneFormRef.value) return

  try {
    await addCustomerPhoneFormRef.value.validate()

    addingCustomerPhone.value = true

    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))

    // 添加到列表
    const newPhone = {
      id: Date.now(),
      phone: addCustomerPhoneForm.phone,
      remark: addCustomerPhoneForm.remark || '无备注'
    }
    customerPhones.value.push(newPhone)

    // 设置为当前选中的手机号
    form.customerPhone = newPhone.phone

    // 同步手机号到客户详情页
    try {
      const customerId = form.customerId || 'default-customer-id' // 实际应用中应该从表单或路由获取
      const syncResult = await PhoneSyncService.syncCustomerPhone(customerId, {
        id: newPhone.id,
        phone: newPhone.phone,
        remark: newPhone.remark
      })

      if (syncResult.success) {
        ElMessage.success('添加成功，已同步到客户详情')
      } else {
        ElMessage.warning('添加成功，但同步失败：' + syncResult.message)
      }
    } catch (syncError) {
      console.error('同步客户手机号失败:', syncError)
      ElMessage.warning('添加成功，但同步失败')
    }

    handleCloseAddCustomerPhoneDialog()
  } catch (error) {
    console.error('添加客户手机号失败:', error)
    ElMessage.error('添加失败')
  } finally {
    addingCustomerPhone.value = false
  }
}

/**
 * 新增联系手机号
 */
const handleAddContactPhone = async () => {
  if (!addContactPhoneFormRef.value) return

  try {
    await addContactPhoneFormRef.value.validate()

    addingContactPhone.value = true

    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))

    // 添加到列表
    const newPhone = {
      id: Date.now(),
      phone: addContactPhoneForm.phone,
      remark: addContactPhoneForm.remark || '无备注'
    }
    contactPhones.value.push(newPhone)

    // 设置为当前选中的手机号
    form.contactPhone = newPhone.phone

    // 同步手机号到联系人详情页
    try {
      const contactId = form.contactId || 'default-contact-id' // 实际应用中应该从表单获取
      const syncResult = await PhoneSyncService.syncContactPhone(contactId, {
        id: newPhone.id,
        phone: newPhone.phone,
        remark: newPhone.remark
      })

      if (syncResult.success) {
        ElMessage.success('添加成功，已同步到联系人详情')
      } else {
        ElMessage.warning('添加成功，但同步失败：' + syncResult.message)
      }
    } catch (syncError) {
      console.error('同步联系手机号失败:', syncError)
      ElMessage.warning('添加成功，但同步失败')
    }

    handleCloseAddContactPhoneDialog()
  } catch (error) {
    console.error('添加联系手机号失败:', error)
    ElMessage.error('添加失败')
  } finally {
    addingContactPhone.value = false
  }
}

/**
 * 关闭新增客户手机号对话框
 */
const handleCloseAddCustomerPhoneDialog = () => {
  showAddCustomerPhoneDialog.value = false
  addCustomerPhoneForm.phone = ''
  addCustomerPhoneForm.remark = ''
  if (addCustomerPhoneFormRef.value) {
    addCustomerPhoneFormRef.value.clearValidate()
  }
}

/**
 * 关闭新增联系手机号对话框
 */
const handleCloseAddContactPhoneDialog = () => {
  showAddContactPhoneDialog.value = false
  addContactPhoneForm.phone = ''
  addContactPhoneForm.remark = ''
  if (addContactPhoneFormRef.value) {
    addContactPhoneFormRef.value.clearValidate()
  }
}

/**
 * 搜索订单列表
 */
const searchOrderList = () => {
  if (isProduction()) {
    // 生产环境:调用API搜索
    fetch(`/api/orders/search?keyword=${orderSearchKeyword.value}`)
      .then(res => res.json())
      .then(data => {
        orderSearchResults.value = data
      })
      .catch(error => {
        console.error('搜索订单失败:', error)
        ElMessage.error('搜索订单失败')
      })
  } else {
    // 开发环境:从store搜索
    const keyword = orderSearchKeyword.value.trim().toLowerCase()
    const allOrders = orderStore.orders || []

    if (!keyword) {
      orderSearchResults.value = allOrders.slice(0, 10)
    } else {
      orderSearchResults.value = allOrders.filter((order: any) => {
        return order.orderNumber?.toLowerCase().includes(keyword) ||
               order.customerName?.toLowerCase().includes(keyword) ||
               order.productName?.toLowerCase().includes(keyword)
      }).slice(0, 10)
    }
  }
}

/**
 * 选择订单
 */
const selectOrder = (order: any) => {
  form.orderNumber = order.orderNumber
  form.customerName = order.customerName
  form.customerPhone = order.customerPhone || ''
  form.productName = order.productName
  form.productSpec = order.productSpec || ''
  form.quantity = order.quantity || 1
  form.price = order.price || order.totalAmount || 0
  form.contactName = order.customerName
  form.contactPhone = order.customerPhone || ''
  form.contactAddress = order.shippingAddress || ''
  orderLoaded.value = true
  orderDialogVisible.value = false
  ElMessage.success('订单信息已加载')
}

/**
 * 预览图片
 */
const handlePreview = (file: UploadUserFile) => {
  previewUrl.value = file.url!
  previewVisible.value = true
}

/**
 * 移除图片
 */
const handleRemove = (file: UploadUserFile) => {
  console.log('Remove file:', file)
}

/**
 * 上传前检查
 */
const beforeUpload = (file: File) => {
  const isImage = file.type.startsWith('image/')
  const isLt5M = file.size / 1024 / 1024 < 5

  if (!isImage) {
    ElMessage.error('只能上传图片文件!')
    return false
  }
  if (!isLt5M) {
    ElMessage.error('图片大小不能超过 5MB!')
    return false
  }
  return true
}

/**
 * 加载售后详情
 */
const loadServiceDetail = async () => {
  try {
    const serviceId = route.params.id as string
    console.log('Loading service detail for ID:', serviceId)

    if (!serviceId) {
      ElMessage.error('售后ID不存在')
      safeNavigator.push('/service/list')
      return
    }

    if (isProduction()) {
      // 生产环境:调用API
      const response = await fetch(`/api/service/${serviceId}`)
      if (!response.ok) {
        throw new Error('加载失败')
      }
      const data = await response.json()
      Object.assign(form, data)
    } else {
      // 开发环境:从store获取
      const service = serviceStore.getServiceById(serviceId)

      if (!service) {
        ElMessage.error('售后记录不存在')
        safeNavigator.push('/service/list')
        return
      }

      // 填充表单数据
      Object.assign(form, {
        id: service.id,
        serviceNumber: service.serviceNumber,
        orderNumber: service.orderNumber,
        serviceType: service.serviceType,
        status: service.status,
        priority: service.priority,
        customerName: service.customerName,
        customerPhone: service.customerPhone,
        assignedTo: service.assignedTo || '',
        productName: service.productName,
        productSpec: service.productSpec || '',
        quantity: service.quantity || 1,
        price: service.price || 0,
        reason: service.reason,
        description: service.description,
        contactName: service.contactName || service.customerName,
        contactPhone: service.contactPhone || service.customerPhone,
        contactAddress: service.contactAddress || '',
        remark: service.remark || '',
        customerId: service.customerId || '',
        contactId: service.contactId || '',
        createdBy: service.createdBy,
        createTime: service.createTime,
        updateTime: service.updateTime
      })

      // 如果有附件,加载附件列表
      if (service.attachments && service.attachments.length > 0) {
        fileList.value = service.attachments.map((url: string, index: number) => ({
          name: `附件${index + 1}.jpg`,
          url: url
        }))
      }

      orderLoaded.value = true
    }
  } catch (error) {
    console.error('Failed to load service detail:', error)
    ElMessage.error('加载售后详情失败')
    safeNavigator.push('/service/list')
  }
}

/**
 * 加载用户列表
 */
const loadUserOptions = () => {
  if (isProduction()) {
    // 生产环境:调用API
    fetch('/api/users')
      .then(res => res.json())
      .then(data => {
        userOptions.value = data.map((user: any) => ({
          id: user.id,
          name: user.name || user.username
        }))
      })
      .catch(error => {
        console.error('加载用户列表失败:', error)
      })
  } else {
    // 开发环境:从store获取
    const users = userStore.users || []
    userOptions.value = users.map((user: any) => ({
      id: user.id,
      name: user.name || user.username
    }))
  }
}

// 生命周期
onMounted(() => {
  loadServiceDetail()
  loadCustomerPhones()
  loadContactPhones()
  loadUserOptions()
})
</script>

<style scoped>
.service-edit {
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

.page-title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.service-form {
  max-width: 1200px;
}

.form-section {
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid #f0f0f0;
}

.form-section:last-child {
  border-bottom: none;
}

.section-title {
  margin: 0 0 20px 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  padding-bottom: 8px;
  border-bottom: 2px solid #409EFF;
}

.order-input-group {
  display: flex;
  gap: 8px;
}

.order-input-group .el-input {
  flex: 1;
}

.upload-tip {
  margin-top: 8px;
  font-size: 12px;
  color: #909399;
  line-height: 1.4;
}

.order-search {
  padding: 16px 0;
}

/* 手机号管理样式 */
.phone-management {
  display: flex;
  align-items: center;
  gap: 8px;
}

.phone-management .el-select {
  flex: 1;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .service-edit {
    padding: 10px;
  }

  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }

  .header-left {
    justify-content: flex-start;
  }

  .header-actions {
    justify-content: flex-end;
  }

  .order-input-group {
    flex-direction: column;
  }

  .order-input-group .el-button {
    align-self: flex-start;
  }
}
</style>
