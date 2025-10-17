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
                >
                  <el-option
                    v-for="user in userOptions"
                    :key="user.id"
                    :label="user.name"
                    :value="user.name"
                  />
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
                      :label="maskPhone(phone.number)"
                      :value="phone.number"
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
                      :label="maskPhone(phone.number)"
                      :value="phone.number"
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
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, Plus, Search } from '@element-plus/icons-vue'
import type { FormInstance, FormRules, UploadUserFile } from 'element-plus'
import { useResponsive } from '@/utils/responsive'
import { maskPhone } from '@/utils/phone'
import { PhoneSyncService } from '@/services/phoneSync'
import { createSafeNavigator } from '@/utils/navigation'

// 路由
const router = useRouter()
const route = useRoute()
const safeNavigator = createSafeNavigator(router)

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
const orderSearchResults = ref([])

// 手机号管理相关数据
const customerPhones = ref([])
const contactPhones = ref([])

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
  serviceNumber: 'SH202401150001',
  orderNumber: 'ORD202401150001',
  serviceType: 'return',
  status: 'processing',
  priority: 'high',
  customerName: '张三',
  customerPhone: '13812345678',
  assignedTo: '李四',
  productName: '智能手机',
  productSpec: '128GB 黑色',
  quantity: 1,
  price: 2999,
  reason: '商品质量问题',
  description: '手机屏幕出现黑屏现象，无法正常使用',
  contactName: '张三',
  contactPhone: '13812345678',
  contactAddress: '北京市朝阳区xxx街道xxx号',
  remark: '客户要求退货处理'
})

// 文件列表
const fileList = ref<UploadUserFile[]>([
  {
    name: '问题图片1.jpg',
    url: '/uploads/image1.jpg'
  },
  {
    name: '问题图片2.jpg',
    url: '/uploads/image2.jpg'
  }
])

// 用户选项
const userOptions = ref([
  { id: '1', name: '李四' },
  { id: '2', name: '赵六' },
  { id: '3', name: '孙八' },
  { id: '4', name: '周九' }
])

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
    
    // 这里应该调用API保存售后信息
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    ElMessage.success('保存成功')
    safeNavigator.push('/service/list')
  } catch (error) {
    console.error('Validation failed:', error)
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
  // 模拟搜索结果
  orderSearchResults.value = [
    {
      orderNumber: 'ORD202401150001',
      customerName: '张三',
      productName: '智能手机',
      totalAmount: 2999,
      createTime: '2024-01-15 10:30:00'
    },
    {
      orderNumber: 'ORD202401150002',
      customerName: '李四',
      productName: '平板电脑',
      totalAmount: 1999,
      createTime: '2024-01-15 11:30:00'
    }
  ]
}

/**
 * 选择订单
 */
const selectOrder = (order: { orderNumber: string; customerName: string; productName: string; totalAmount: number }) => {
  form.orderNumber = order.orderNumber
  form.customerName = order.customerName
  form.productName = order.productName
  form.price = order.totalAmount
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
    const id = route.params.id
    console.log('Loading service detail for ID:', id)
    
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 500))
    
    form.id = id as string
    orderLoaded.value = true
  } catch (error) {
    console.error('Failed to load service detail:', error)
    ElMessage.error('加载售后详情失败')
  }
}

// 生命周期
onMounted(() => {
  loadServiceDetail()
  loadCustomerPhones()
  loadContactPhones()
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