<template>
  <div class="customer-form">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2>编辑客户</h2>
      <div class="header-actions">
        <el-button @click="handleCancel">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="loading">
          更新
        </el-button>
      </div>
    </div>

    <!-- 客户信息表单 -->
    <el-card class="form-card">
      <el-form
        ref="customerFormRef"
        :model="customerForm"
        :rules="formRules"
        label-width="100px"
        size="default"
      >
        <!-- 基本信息 -->
        <div class="form-section">
          <h3 class="section-title">基本信息</h3>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="客户姓名" prop="name">
                <el-input
                  v-model="customerForm.name"
                  placeholder="请输入客户姓名"
                  clearable
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="性别" prop="gender">
                <el-radio-group v-model="customerForm.gender">
                  <el-radio label="male">男</el-radio>
                  <el-radio label="female">女</el-radio>
                  <el-radio label="unknown">未知</el-radio>
                </el-radio-group>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="手机号" prop="phone">
                <el-input
                  :value="displaySensitiveInfoNew(customerForm.phone, SensitiveInfoType.PHONE)"
                  readonly
                  placeholder="敏感信息已加密显示"
                >
                  <template #suffix>
                    <el-tooltip content="敏感信息已加密显示，不可修改">
                      <el-icon><InfoFilled /></el-icon>
                    </el-tooltip>
                  </template>
                </el-input>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="年龄" prop="age">
                <el-input-number
                  v-model="customerForm.age"
                  :min="1"
                  :max="120"
                  placeholder="请输入年龄"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="邮箱" prop="email">
                <el-input
                  :value="displaySensitiveInfoNew(customerForm.email, SensitiveInfoType.EMAIL)"
                  readonly
                  placeholder="敏感信息已加密显示"
                >
                  <template #suffix>
                    <el-tooltip content="敏感信息已加密显示，不可修改">
                      <el-icon><InfoFilled /></el-icon>
                    </el-tooltip>
                  </template>
                </el-input>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="微信号" prop="wechat">
                <el-input
                  :value="displaySensitiveInfoNew(customerForm.wechat, SensitiveInfoType.WECHAT)"
                  readonly
                  placeholder="敏感信息已加密显示"
                >
                  <template #suffix>
                    <el-tooltip content="敏感信息已加密显示，不可修改">
                      <el-icon><InfoFilled /></el-icon>
                    </el-tooltip>
                  </template>
                </el-input>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="身高(cm)" prop="height">
                <el-input-number
                  v-model="customerForm.height"
                  :min="50"
                  :max="250"
                  placeholder="请输入身高"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="体重(kg)" prop="weight">
                <el-input-number
                  v-model="customerForm.weight"
                  :min="20"
                  :max="300"
                  placeholder="请输入体重"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <!-- 收货地址信息 -->
        <div class="form-section">
          <h3 class="section-title">收货地址</h3>
          <el-row :gutter="20">
            <el-col :span="6">
              <el-form-item label="省份" prop="province">
                <el-select
                  v-model="customerForm.province"
                  placeholder="请选择省份"
                  style="width: 100%"
                  @change="handleProvinceChange"
                >
                  <el-option
                    v-for="province in provinces"
                    :key="province.value"
                    :label="province.label"
                    :value="province.value"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="城市" prop="city">
                <el-select
                  v-model="customerForm.city"
                  placeholder="请选择城市"
                  style="width: 100%"
                  @change="handleCityChange"
                >
                  <el-option
                    v-for="city in cities"
                    :key="city.value"
                    :label="city.label"
                    :value="city.value"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="区县" prop="district">
                <el-select
                  v-model="customerForm.district"
                  placeholder="请选择区县"
                  style="width: 100%"
                  @change="handleDistrictChange"
                >
                  <el-option
                    v-for="district in districts"
                    :key="district.value"
                    :label="district.label"
                    :value="district.value"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="街道" prop="street">
                <el-select
                  v-model="customerForm.street"
                  placeholder="请选择街道"
                  style="width: 100%"
                >
                  <el-option
                    v-for="street in streets"
                    :key="street.value"
                    :label="street.label"
                    :value="street.value"
                  />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="详细地址" prop="detailAddress">
            <el-input
              v-model="customerForm.detailAddress"
              placeholder="请输入详细地址（门牌号、楼层等）"
              clearable
            />
          </el-form-item>

          <el-form-item label="境外地址" prop="overseasAddress">
            <el-input
              v-model="customerForm.overseasAddress"
              placeholder="如为境外地址，请在此输入完整地址"
              clearable
            />
          </el-form-item>
        </div>

        <!-- 健康信息 -->
        <div class="form-section">
          <h3 class="section-title">健康信息</h3>
          <el-form-item label="疾病史" prop="medicalHistory">
            <el-input
              v-model="customerForm.medicalHistory"
              type="textarea"
              :rows="3"
              placeholder="请输入疾病史（如有）"
            />
          </el-form-item>

          <el-form-item label="改善问题" prop="improvementGoals">
            <el-checkbox-group v-model="customerForm.improvementGoals">
              <el-checkbox label="减肥瘦身">减肥瘦身</el-checkbox>
              <el-checkbox label="增肌塑形">增肌塑形</el-checkbox>
              <el-checkbox label="改善睡眠">改善睡眠</el-checkbox>
              <el-checkbox label="提高免疫力">提高免疫力</el-checkbox>
              <el-checkbox label="调理肠胃">调理肠胃</el-checkbox>
              <el-checkbox label="美容养颜">美容养颜</el-checkbox>
              <el-checkbox label="其他">其他</el-checkbox>
            </el-checkbox-group>
          </el-form-item>

          <el-form-item label="其他改善目标" prop="otherGoals" v-if="customerForm.improvementGoals.includes('其他')">
            <el-input
              v-model="customerForm.otherGoals"
              placeholder="请输入其他改善目标"
              clearable
            />
          </el-form-item>
        </div>

        <!-- 客户分类 -->
        <div class="form-section">
          <h3 class="section-title">客户分类</h3>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="客户等级" prop="level">
                <el-select
                  v-model="customerForm.level"
                  placeholder="请选择客户等级"
                  style="width: 100%"
                >
                  <el-option label="铜牌客户" value="bronze" />
                  <el-option label="银牌客户" value="silver" />
                  <el-option label="金牌客户" value="gold" />
                  <el-option label="钻石客户" value="diamond" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="客户来源" prop="source">
                <el-select
                  v-model="customerForm.source"
                  placeholder="请选择客户来源"
                  style="width: 100%"
                >
                  <el-option label="线上推广" value="online" />
                  <el-option label="朋友推荐" value="referral" />
                  <el-option label="电话营销" value="telemarketing" />
                  <el-option label="门店到访" value="store" />
                  <el-option label="其他" value="other" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="客户标签" prop="tags">
                <el-select
                  v-model="customerForm.tags"
                  placeholder="请选择客户标签"
                  multiple
                  style="width: 100%"
                  :loading="loadingTags"
                >
                  <el-option
                    v-for="tag in availableTags"
                    :key="tag.id"
                    :label="tag.name"
                    :value="tag.id"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="负责销售" prop="salesPerson">
                <el-select
                  v-model="customerForm.salesPerson"
                  placeholder="请选择负责销售"
                  style="width: 100%"
                  :disabled="!userStore.isAdmin"
                >
                  <el-option
                    v-for="user in salesUsers"
                    :key="user.id"
                    :label="user.name"
                    :value="user.id"
                  />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <!-- 备注信息 -->
        <div class="form-section">
          <h3 class="section-title">备注信息</h3>
          <el-form-item label="备注" prop="remark">
            <el-input
              v-model="customerForm.remark"
              type="textarea"
              :rows="4"
              placeholder="请输入备注信息"
            />
          </el-form-item>
        </div>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { InfoFilled } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { useCustomerStore } from '@/stores/customer'
import { getProvinces, getCitiesByProvince, getDistrictsByCity, getStreetsByDistrict } from '@/utils/addressData'
import { displaySensitiveInfo as displaySensitiveInfoNew } from '@/utils/sensitiveInfo'
import { SensitiveInfoType } from '@/services/permission'
import { customerTagApi, type CustomerTag } from '@/api/customerTags'
import { createSafeNavigator } from '@/utils/navigation'

const route = useRoute()
const router = useRouter()
const safeNavigator = createSafeNavigator(router)
const userStore = useUserStore()
const customerStore = useCustomerStore()

// 响应式数据
const customerFormRef = ref()
const loading = ref(false)
const currentCustomer = ref(null)

// 权限检查
const canEditCustomer = computed(() => {
  if (!currentCustomer.value || !userStore.currentUser) {
    return false
  }

  const currentUser = userStore.currentUser
  const customer = currentCustomer.value

  // 超级管理员可以编辑所有客户
  if (userStore.isSuperAdmin) {
    return true
  }

  // 部门负责人可以编辑本部门的客户
  if (userStore.isDepartmentLeader) {
    // 可以编辑自己创建或负责的客户
    if (customer.createdBy === currentUser.id || customer.salesPersonId === currentUser.id) {
      return true
    }

    // 可以编辑本部门成员创建的客户
    const customerCreator = userStore.users.find(u => u.id === customer.createdBy)
    const customerSalesPerson = userStore.users.find(u => u.id === customer.salesPersonId)

    return (customerCreator && customerCreator.departmentId === currentUser.departmentId) ||
           (customerSalesPerson && customerSalesPerson.departmentId === currentUser.departmentId)
  }

  // 普通用户只能编辑自己创建或被分配的客户
  return customer.createdBy === currentUser.id || customer.salesPersonId === currentUser.id
})

// 表单数据
const customerForm = reactive({
  name: '',
  gender: 'unknown',
  phone: '',
  age: null,
  email: '',
  wechat: '',
  height: null,
  weight: null,
  province: '',
  city: '',
  district: '',
  street: '',
  detailAddress: '',
  overseasAddress: '',
  medicalHistory: '',
  improvementGoals: [],
  otherGoals: '',
  level: 'normal',
  source: 'online',
  tags: [],
  salesPerson: '',
  remark: ''
})

// 表单验证规则
const formRules = {
  name: [
    { required: true, message: '请输入客户姓名', trigger: 'blur' }
  ],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }
  ],
  email: [
    { type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' }
  ],
  age: [
    { type: 'number', min: 1, max: 120, message: '年龄必须在1-120之间', trigger: 'blur' }
  ],
  level: [
    { required: true, message: '请选择客户等级', trigger: 'change' }
  ],
  salesPerson: [
    { required: true, message: '请选择负责销售', trigger: 'change' }
  ]
}

// 地址数据
const provinces = ref([])
const cities = ref([])
const districts = ref([])
const streets = ref([])

// 销售人员数据
const salesUsers = ref([
  { id: '1', name: '张三', department: '销售一部' },
  { id: '2', name: '李四', department: '销售二部' },
  { id: '3', name: '王五', department: '销售一部' },
  { id: '4', name: '赵六', department: '销售三部' }
])

// 客户标签数据
const availableTags = ref<CustomerTag[]>([])
const loadingTags = ref(false)

// 地址处理方法
const handleProvinceChange = (value: string) => {
  customerForm.city = ''
  customerForm.district = ''
  customerForm.street = ''
  cities.value = getCitiesByProvince(value)
  districts.value = []
  streets.value = []
}

const handleCityChange = (value: string) => {
  customerForm.district = ''
  customerForm.street = ''
  districts.value = getDistrictsByCity(customerForm.province, value)
  streets.value = []
}

const handleDistrictChange = (value: string) => {
  customerForm.street = ''
  streets.value = getStreetsByDistrict(customerForm.province, customerForm.city, value)
}

// 表单初始化
const initForm = () => {
  // 设置默认负责销售为当前用户
  customerForm.salesPerson = userStore.currentUser?.id || ''
}

// 加载标签数据
const loadTags = async () => {
  try {
    loadingTags.value = true
    const response = await customerTagApi.getActiveList()
    availableTags.value = response.data
  } catch (error) {
    console.error('加载标签失败:', error)
    ElMessage.error('加载标签失败')
  } finally {
    loadingTags.value = false
  }
}

// 方法
const handleCancel = () => {
  safeNavigator.back()
}

const handleSubmit = async () => {
  try {
    await customerFormRef.value.validate()
    loading.value = true

    // 构建完整地址
    const fullAddress = [
      customerForm.province,
      customerForm.city,
      customerForm.district,
      customerForm.street,
      customerForm.detailAddress
    ].filter(Boolean).join('')

    // 准备更新数据
    const updateData = {
      ...customerForm,
      address: fullAddress,
      // 保存详细地址字段
      province: customerForm.province,
      city: customerForm.city,
      district: customerForm.district,
      street: customerForm.street,
      detailAddress: customerForm.detailAddress,
      overseasAddress: customerForm.overseasAddress
    }

    // 使用客户store更新数据
    await customerStore.updateCustomer(updateData)

    ElMessage.success('客户信息更新成功')
    safeNavigator.push('/customer/list')
  } catch (error) {
    console.error('更新失败:', error)
    ElMessage.error('更新客户信息失败')
  } finally {
    loading.value = false
  }
}

const loadCustomerDetail = async () => {
  const customerId = route.params.id as string
  if (!customerId) {
    ElMessage.error('客户ID不存在')
    safeNavigator.push('/customer/list')
    return
  }

  try {
    loading.value = true

    // 🔥 修复：生产环境从API获取客户详情，确保数据最新
    const { isProduction } = await import('@/utils/env')
    const { shouldUseMockApi } = await import('@/api/mock')

    let customer = null

    if (isProduction() || !shouldUseMockApi()) {
      // 生产环境：从API获取客户详情
      console.log('[Edit.vue] 🌐 生产环境：从API获取客户详情')
      try {
        const { customerApi } = await import('@/api/customer')
        const response = await customerApi.getDetail(customerId)
        if (response.data) {
          customer = response.data
          console.log('[Edit.vue] ✅ API获取客户详情成功:', customer.name)
        }
      } catch (apiError) {
        console.error('[Edit.vue] ❌ API获取客户详情失败:', apiError)
        // API失败时尝试从本地store获取
        customer = customerStore.getCustomerById(customerId)
      }
    } else {
      // 开发环境：从本地store获取
      console.log('[Edit.vue] 💻 开发环境：从本地store获取客户详情')
      customer = customerStore.getCustomerById(customerId)
    }

    if (!customer) {
      ElMessage.error('客户不存在')
      safeNavigator.push('/customer/list')
      return
    }

    // 设置当前客户数据
    currentCustomer.value = customer

    // 检查编辑权限
    if (!canEditCustomer.value) {
      await ElMessageBox.alert(
        '您没有权限编辑此客户信息。只能编辑自己创建或被分配的客户。',
        '权限不足',
        {
          confirmButtonText: '返回',
          type: 'warning'
        }
      )
      safeNavigator.push('/customer/list')
      return
    }

    // 填充表单数据
    Object.assign(customerForm, {
      name: customer.name || '',
      gender: customer.gender || 'unknown',
      phone: customer.phone || '',
      age: customer.age || null,
      email: customer.email || '',
      wechat: customer.wechat || '',
      height: customer.height || null,
      weight: customer.weight || null,
      province: customer.province || '',
      city: customer.city || '',
      district: customer.district || '',
      street: customer.street || '',
      detailAddress: customer.detailAddress || '',
      medicalHistory: customer.medicalHistory || '',
      improvementGoals: customer.improvementGoals || [],
      otherGoals: customer.otherGoals || '',
      level: customer.level || 'normal',
      source: customer.source || 'online',
      tags: customer.tags || [],
      salesPerson: customer.salesPersonId || '',
      remark: customer.remark || ''
    })

    // 根据省份、城市和区县加载对应的下拉选项
    if (customerForm.province) {
      handleProvinceChange(customerForm.province)
    }
    if (customerForm.city) {
      handleCityChange(customerForm.city)
    }
    if (customerForm.district) {
      handleDistrictChange(customerForm.district)
    }

  } catch (error) {
    console.error('加载客户详情失败:', error)
    ElMessage.error('加载客户信息失败')
    safeNavigator.push('/customer/list')
  } finally {
    loading.value = false
  }
}

// 初始化地址数据
const initAddressData = () => {
  provinces.value = getProvinces()
}

// 生命周期
onMounted(() => {
  initForm()
  initAddressData()
  loadTags()
  loadCustomerDetail()
})
</script>

<style scoped>
.customer-form {
  padding: 20px;
  background-color: #f5f5f5;
  min-height: 100vh;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.page-header h2 {
  margin: 0;
  color: #303133;
  font-size: 20px;
  font-weight: 500;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.form-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 24px;
}

.form-section {
  margin-bottom: 32px;
}

.form-section:last-child {
  margin-bottom: 0;
}

.section-title {
  margin: 0 0 20px 0;
  padding-bottom: 12px;
  border-bottom: 2px solid #409eff;
  color: #303133;
  font-size: 16px;
  font-weight: 500;
}

@media (max-width: 768px) {
  .customer-form {
    padding: 10px;
  }

  .page-header {
    flex-direction: column;
    gap: 15px;
    align-items: stretch;
  }

  .header-actions {
    justify-content: flex-end;
  }

  .form-card {
    padding: 16px;
  }
}
</style>
