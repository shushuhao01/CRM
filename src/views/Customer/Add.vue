<template>
  <div class="customer-form">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2>{{ isEdit ? '编辑客户' : '新增客户' }}</h2>
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
          <!-- 第一排：手机号、姓名、性别 -->
          <el-row :gutter="20">
            <el-col :span="10">
              <el-form-item label="手机号" prop="phone">
                <div class="phone-input-group">
                  <el-input
                    v-model="customerForm.phone"
                    placeholder="请输入手机号"
                    clearable
                    @blur="handlePhoneBlur"
                  />
                  <el-button
                    type="primary"
                    size="default"
                    @click="verifyCustomer"
                    :loading="verifyLoading"
                    :disabled="!customerForm.phone || customerForm.phone.length !== 11"
                  >
                    验证客户
                  </el-button>
                </div>
                <!-- 客户验证结果提示 -->
                <div v-if="customerVerifyResult" class="verify-result">
                  <el-alert
                    :title="customerVerifyResult.message"
                    :type="customerVerifyResult.type"
                    :closable="false"
                    show-icon
                  >
                    <template v-if="customerVerifyResult.type === 'warning'" #default>
                      <p>{{ customerVerifyResult.message }}</p>
                      <p v-if="customerVerifyResult.owner"><strong>归属人：</strong>{{ customerVerifyResult.owner }}</p>
                      <p v-if="customerVerifyResult.createTime"><strong>创建时间：</strong>{{ customerVerifyResult.createTime }}</p>

                      <!-- 权限提示 -->
                      <div v-if="shouldDisableSave" class="permission-warning">
                        <el-divider />
                        <p style="color: #e6a23c; font-weight: 500;">
                          <el-icon><Warning /></el-icon>
                          权限提示：该客户由其他成员创建，您没有权限保存修改。如需操作，请联系管理员或客户创建者。
                        </p>
                      </div>

                      <div style="margin-top: 12px;">
                        <el-button size="small" type="text" @click="viewExistingCustomer">查看客户详情</el-button>
                      </div>
                    </template>
                  </el-alert>
                </div>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="客户姓名" prop="name">
                <el-input
                  v-model="customerForm.name"
                  placeholder="请输入客户姓名"
                  clearable
                />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="性别" prop="gender">
                <el-radio-group v-model="customerForm.gender">
                  <el-radio label="male">男</el-radio>
                  <el-radio label="female">女</el-radio>
                </el-radio-group>
              </el-form-item>
            </el-col>
          </el-row>

          <!-- 第二排：年龄、身高、体重 -->
          <el-row :gutter="20">
            <el-col :span="8">
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
            <el-col :span="8">
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
            <el-col :span="8">
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

          <!-- 第三排：进粉时间、微信号、邮箱 -->
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="进粉时间" prop="fanAcquisitionTime">
                <el-date-picker
                  v-model="customerForm.fanAcquisitionTime"
                  type="date"
                  placeholder="请选择进粉时间"
                  style="width: 100%"
                  format="YYYY-MM-DD"
                  value-format="YYYY-MM-DD"
                />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="微信号" prop="wechat">
                <el-input
                  v-model="customerForm.wechat"
                  placeholder="请输入微信号"
                  clearable
                />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="邮箱" prop="email">
                <el-input
                  v-model="customerForm.email"
                  placeholder="请输入邮箱地址"
                  clearable
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
              <el-form-item
                label="省份"
                prop="province"
                :required="!customerForm.isOverseas"
              >
                <el-select
                  v-model="customerForm.province"
                  placeholder="请选择省份"
                  style="width: 100%"
                  @change="handleProvinceChange"
                  :disabled="customerForm.isOverseas"
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
              <el-form-item
                label="城市"
                prop="city"
                :required="!customerForm.isOverseas"
              >
                <el-select
                  v-model="customerForm.city"
                  placeholder="请选择城市"
                  style="width: 100%"
                  @change="handleCityChange"
                  :disabled="customerForm.isOverseas"
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
              <el-form-item
                label="区县"
                prop="district"
                :required="!customerForm.isOverseas"
              >
                <el-select
                  v-model="customerForm.district"
                  placeholder="请选择区县"
                  style="width: 100%"
                  @change="handleDistrictChange"
                  :disabled="customerForm.isOverseas"
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
                  :disabled="customerForm.isOverseas"
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

          <el-form-item
            label="详细地址"
            prop="detailAddress"
            :required="!customerForm.isOverseas"
          >
            <el-input
              v-model="customerForm.detailAddress"
              placeholder="请输入详细地址（门牌号、楼层等）"
              clearable
              :disabled="customerForm.isOverseas"
            />
          </el-form-item>

          <el-form-item>
            <el-checkbox
              v-model="customerForm.isOverseas"
              @change="handleOverseasChange"
            >
              使用境外地址
            </el-checkbox>
          </el-form-item>

          <el-form-item
            label="境外地址"
            prop="overseasAddress"
            v-show="customerForm.isOverseas"
            :required="customerForm.isOverseas"
          >
            <el-input
              v-model="customerForm.overseasAddress"
              placeholder="请输入完整的境外地址"
              clearable
            />
          </el-form-item>
        </div>

        <!-- 健康信息 -->
        <div class="form-section">
          <h3 class="section-title">健康信息</h3>
          <el-form-item label="疾病史" prop="medicalHistory" required>
            <el-input
              v-model="customerForm.medicalHistory"
              type="textarea"
              :rows="3"
              placeholder="请输入疾病史（如有）"
            />
          </el-form-item>

          <el-form-item label="改善问题" prop="improvementGoals" required>
            <div class="improvement-goals-section">
              <el-checkbox-group v-model="customerForm.improvementGoals" class="improvement-goals-group">
                <el-checkbox
                  v-for="goal in improvementGoalsStore.allGoals"
                  :key="goal.id"
                  :label="goal.value"
                >
                  {{ goal.label }}
                </el-checkbox>
              </el-checkbox-group>

              <!-- 超级管理员编辑按钮 -->
              <el-button
                v-if="userStore.isSuperAdmin"
                type="text"
                size="small"
                @click="showGoalsManager = true"
                class="edit-goals-btn"
              >
                <el-icon><Setting /></el-icon>
                修改
              </el-button>
            </div>
          </el-form-item>

          <el-form-item
            label="其他改善目标"
            prop="otherGoals"
            v-if="customerForm.improvementGoals.includes('其他')"
            required
          >
            <el-row :gutter="20">
              <el-col :span="24">
                <el-input
                  v-model="customerForm.otherGoals"
                  placeholder="请输入其他改善目标"
                  clearable
                />
              </el-col>
            </el-row>
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
                  <el-option label="普通客户" value="normal" />
                  <el-option label="白银客户" value="silver" />
                  <el-option label="黄金客户" value="gold" />
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
                  <el-option label="朋友介绍" value="referral" />
                  <el-option label="电话营销" value="telemarketing" />
                  <el-option label="门店到访" value="store" />
                  <el-option label="其他" value="other" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="客户状态" prop="status">
                <el-select
                  v-model="customerForm.status"
                  placeholder="请选择客户状态"
                  style="width: 100%"
                >
                  <el-option label="活跃" value="active" />
                  <el-option label="非活跃" value="inactive" />
                  <el-option label="潜在客户" value="potential" />
                  <el-option label="已流失" value="lost" />
                  <el-option label="黑名单" value="blacklist" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="客户标签" prop="tags">
                <el-select
                  v-model="customerForm.tags"
                  multiple
                  placeholder="请选择客户标签"
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
            <el-col :span="8">
              <el-form-item label="负责销售" prop="salesPerson">
                <el-input
                  v-model="customerForm.salesPerson"
                  placeholder="负责销售"
                  style="width: 100%"
                  readonly
                >
                  <template #suffix>
                    <el-tooltip content="新建客户的负责销售默认为当前创建者，不可修改" placement="top">
                      <el-icon><InfoFilled /></el-icon>
                    </el-tooltip>
                  </template>
                </el-input>
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <!-- 备注信息 -->
        <div class="form-section">
          <h3 class="section-title">备注信息</h3>
          <el-form-item label="客户备注" prop="remark">
            <el-input
              v-model="customerForm.remark"
              type="textarea"
              :rows="4"
              placeholder="请输入客户备注信息"
            />
          </el-form-item>
        </div>
      </el-form>
    </el-card>

    <!-- 底部操作按钮 -->
    <div class="form-footer">
      <el-button @click="handleCancel" size="large">取消</el-button>
      <el-tooltip
        :content="getSaveButtonTooltip"
        :disabled="!shouldDisableSave"
        placement="top"
      >
        <el-button
          type="primary"
          @click="handleSubmit"
          :loading="loading"
          :disabled="shouldDisableSave"
          size="large"
        >
          {{ isEdit ? '更新' : '保存' }}
        </el-button>
      </el-tooltip>
      <el-tooltip
        :content="getSaveButtonTooltip"
        :disabled="!shouldDisableSave"
        placement="top"
      >
        <el-button
          v-if="!isEdit"
          type="success"
          @click="handleSaveAndOrder"
          :loading="loading"
          :disabled="shouldDisableSave"
          size="large"
        >
          保存并下单
        </el-button>
      </el-tooltip>
    </div>

    <!-- 改善问题管理对话框 -->
    <ImprovementGoalsManager v-model="showGoalsManager" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed, nextTick, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Warning, InfoFilled, Setting } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { useAppStore } from '@/stores/app'
import { useCustomerStore } from '@/stores/customer'
import { useNotificationStore } from '@/stores/notification'
import { useImprovementGoalsStore } from '@/stores/improvementGoals'
import { customerApi } from '@/api/customer'
import { customerTagApi, type CustomerTag } from '@/api/customerTags'
import { formRules as validationRules } from '@/utils/validation'
import { useResponsive } from '@/utils/responsive'
import { getProvinces, getCitiesByProvince, getDistrictsByCity, getStreetsByDistrict } from '@/utils/addressData'
import ImprovementGoalsManager from '@/components/ImprovementGoalsManager.vue'
import { createSafeNavigator } from '@/utils/navigation'

// 路由相关
const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const appStore = useAppStore()
const customerStore = useCustomerStore()
const notificationStore = useNotificationStore()
const improvementGoalsStore = useImprovementGoalsStore()
const { isMobile, getMobileFormConfig } = useResponsive()

// 创建安全导航器
const safeNavigator = createSafeNavigator(router)

// 响应式数据
const loading = ref(false)
const customerFormRef = ref<FormInstance>()
const verifyLoading = ref(false)
const showGoalsManager = ref(false)
const customerVerifyResult = ref<{
  type: 'success' | 'warning' | 'error'
  message: string
  owner?: string
  createTime?: string
  customerId?: string
} | null>(null)



// 判断是否为编辑模式
const isEdit = computed(() => route.name === 'CustomerEdit')

// 权限检查
const hasCreatePermission = computed(() => {
  // 所有已认证用户都可以创建客户
  return userStore.isLoggedIn && userStore.currentUser
})

// 判断是否应该禁用保存按钮
const shouldDisableSave = computed(() => {
  // 如果客户验证结果显示客户已存在，则禁用保存按钮
  if (customerVerifyResult.value && customerVerifyResult.value.type === 'warning') {
    return true
  }

  // 其他情况不禁用保存按钮
  return false
})

// 获取保存按钮的提示文本
const getSaveButtonTooltip = computed(() => {
  if (!shouldDisableSave.value) {
    return ''
  }

  if (customerVerifyResult.value && customerVerifyResult.value.type === 'warning') {
    return '该手机号已存在客户记录，无法重复创建。请点击"查看详情"查看已有客户信息。'
  }

  return '保存按钮已禁用'
})

// 如果没有权限，重定向到客户列表页
if (!hasCreatePermission.value && !isEdit.value) {
  ElMessage.error('您没有创建客户的权限')
  safeNavigator.push('/customer/list')
}

// 客户表单数据
const customerForm = reactive({
  name: '',           // 客户姓名
  gender: '',         // 性别（必填）
  phone: '',          // 手机号
  age: null,          // 年龄（必填）
  fanAcquisitionTime: '', // 进粉时间（必填）
  email: '',          // 邮箱
  wechat: '',         // 微信号
  height: null,       // 身高（必填）
  weight: null,       // 体重（必填）
  province: '',       // 省份
  city: '',           // 城市
  district: '',       // 区县
  street: '',         // 街道
  detailAddress: '',  // 详细地址
  isOverseas: false,  // 是否为境外地址
  overseasAddress: '', // 境外地址
  medicalHistory: '', // 疾病史
  improvementGoals: [], // 改善问题
  otherGoals: '',     // 其他改善目标
  level: 'normal',    // 客户等级
  status: 'active',   // 客户状态（默认为活跃）
  source: '',         // 客户来源
  tags: [],           // 客户标签
  salesPerson: userStore.currentUser?.name || '',    // 负责销售（默认为当前用户）
  remark: ''          // 备注
})

// 地址数据
const provinces = ref([])
const cities = ref([])
const districts = ref([])
const streets = ref([])

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

// 处理境外地址勾选变化
const handleOverseasChange = (value: boolean) => {
  if (value) {
    // 勾选境外地址时，清空国内地址相关字段
    customerForm.province = ''
    customerForm.city = ''
    customerForm.district = ''
    customerForm.street = ''
    customerForm.detailAddress = ''
    cities.value = []
    districts.value = []
    streets.value = []
  } else {
    // 取消勾选境外地址时，清空境外地址字段
    customerForm.overseasAddress = ''
  }
}

// 销售人员数据
const salesUsers = ref([
  { label: '张三', value: 'zhangsan' },
  { label: '李四', value: 'lisi' },
  { label: '王五', value: 'wangwu' },
  { label: '赵六', value: 'zhaoliu' },
  { label: '钱七', value: 'qianqi' }
])

// 客户标签数据
const availableTags = ref<CustomerTag[]>([])
const loadingTags = ref(false)

// 初始化表单数据
const initForm = () => {
  // 设置默认负责销售为当前用户
  if (!isEdit.value) {
    customerForm.salesPerson = userStore.currentUser?.realName || userStore.currentUser?.username || '当前用户'
  }
}

// 表单验证规则
const formRules: FormRules = {
  name: [
    validationRules.required('请输入客户姓名'),
    validationRules.chineseName('请输入正确的中文姓名')
  ],
  phone: [
    validationRules.required('请输入手机号'),
    validationRules.phone('请输入正确的手机号格式')
  ],
  email: [
    validationRules.email('请输入正确的邮箱格式')
  ],
  gender: [
    validationRules.required('请选择性别')
  ],
  age: [
    { required: true, message: '请输入年龄', trigger: 'blur' },
    { type: 'number', min: 1, max: 120, message: '年龄应在1-120之间', trigger: 'blur' }
  ],
  fanAcquisitionTime: [
    validationRules.required('请选择进粉时间')
  ],
  height: [
    { required: true, message: '请输入身高', trigger: 'blur' },
    { type: 'number', min: 50, max: 250, message: '身高应在50-250cm之间', trigger: 'blur' }
  ],
  weight: [
    { required: true, message: '请输入体重', trigger: 'blur' },
    { type: 'number', min: 20, max: 300, message: '体重应在20-300kg之间', trigger: 'blur' }
  ],
  level: [
    { required: true, message: '请选择客户等级', trigger: 'change' }
  ],
  status: [
    { required: true, message: '请选择客户状态', trigger: 'change' }
  ],
  // medicalHistory 改为可选
  medicalHistory: [
    { max: 500, message: '疾病史长度不能超过500个字符', trigger: 'blur' }
  ],
  salesPerson: [
    { required: true, message: '请选择负责销售', trigger: 'change' }
  ],
  province: [
    {
      validator: (rule: unknown, value: string, callback: (error?: Error) => void) => {
        if (!customerForm.isOverseas && !value) {
          callback(new Error('请选择省份'))
        } else {
          callback()
        }
      },
      trigger: 'change'
    }
  ],
  city: [
    {
      validator: (rule: unknown, value: string, callback: (error?: Error) => void) => {
        if (!customerForm.isOverseas && !value) {
          callback(new Error('请选择城市'))
        } else {
          callback()
        }
      },
      trigger: 'change'
    }
  ],
  district: [
    {
      validator: (rule: unknown, value: string, callback: (error?: Error) => void) => {
        if (!customerForm.isOverseas && !value) {
          callback(new Error('请选择区县'))
        } else {
          callback()
        }
      },
      trigger: 'change'
    }
  ],
  street: [
    { min: 1, max: 100, message: '街道长度应在1-100个字符之间', trigger: 'blur' }
  ],
  detailAddress: [
    {
      validator: (rule: unknown, value: string, callback: (error?: Error) => void) => {
        if (!customerForm.isOverseas && !value) {
          callback(new Error('请输入详细地址'))
        } else if (!customerForm.isOverseas && value && (value.length < 5 || value.length > 200)) {
          callback(new Error('详细地址长度应在5-200个字符之间'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ],
  overseasAddress: [
    {
      validator: (rule: unknown, value: string, callback: (error?: Error) => void) => {
        if (customerForm.isOverseas && !value) {
          callback(new Error('请输入境外地址'))
        } else if (customerForm.isOverseas && value && (value.length < 5 || value.length > 200)) {
          callback(new Error('境外地址长度应在5-200个字符之间'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ],
  address: [
    { min: 5, max: 200, message: '地址长度应在5-200个字符之间', trigger: 'blur' }
  ],
  wechat: [
    { min: 3, max: 50, message: '微信号长度应在3-50个字符之间', trigger: 'blur' }
  ],
  qq: [
    { type: 'number', min: 10000, max: 9999999999, message: '请输入正确的QQ号', trigger: 'blur' }
  ],
  improvementGoals: [
    {
      required: true,
      validator: (rule: unknown, value: string[], callback: (error?: Error) => void) => {
        if (!value || value.length === 0) {
          callback(new Error('请至少选择一个改善问题'))
        } else {
          callback()
        }
      },
      trigger: 'change'
    }
  ],
  otherGoals: [
    {
      validator: (rule: unknown, value: string, callback: (error?: Error) => void) => {
        if (customerForm.improvementGoals.includes('其他') && (!value || value.trim() === '')) {
          callback(new Error('选择其他时，请填写具体的改善目标'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

// 方法定义
/**
 * 验证客户是否已存在
 */
const verifyCustomer = async () => {
  if (!customerForm.phone || customerForm.phone.length !== 11) {
    ElMessage.warning('请输入正确的手机号')
    return
  }

  verifyLoading.value = true
  customerVerifyResult.value = null

  try {
    // 调用API验证客户是否存在
    const response = await customerApi.checkExists(customerForm.phone)

    // 检查API调用是否成功
    if (!response.success) {
      console.error('API调用失败:', response.message)
      customerVerifyResult.value = {
        type: 'error',
        message: `验证失败: ${response.message}`
      }
      ElMessage.error(`验证失败: ${response.message}`)
      return
    }

    if (response.data) {
      // 客户已存在
      const existingCustomer = response.data
      customerVerifyResult.value = {
        type: 'warning',
        message: '该手机号已存在客户记录',
        owner: existingCustomer.creatorName || existingCustomer.name,
        createTime: existingCustomer.createTime,
        customerId: existingCustomer.id
      }
      console.log('客户已存在:', existingCustomer)
      ElMessage.warning('客户已存在，请查看详情')
    } else {
      // 客户不存在，可以创建
      customerVerifyResult.value = {
        type: 'success',
        message: '该手机号可以创建新客户'
      }
      console.log('客户不存在，可以创建')
      ElMessage.success('验证通过，可以创建新客户')
    }
    console.log('=== 验证客户完成 ===')
  } catch (error) {
    console.error('验证客户失败:', error)

    // 提供更详细的错误信息
    let errorMessage = '验证失败，请重试'
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      errorMessage = '网络连接失败，请检查网络连接后重试'
    } else if (error instanceof Error) {
      errorMessage = `验证失败: ${error.message}`
    }

    customerVerifyResult.value = {
      type: 'error',
      message: errorMessage
    }
    ElMessage.error(errorMessage)
  } finally {
    verifyLoading.value = false
  }
}

/**
 * 查看已存在的客户详情
 */
const viewExistingCustomer = () => {
  if (customerVerifyResult.value?.customerId) {
    safeNavigator.push(`/customer/detail/${customerVerifyResult.value.customerId}`)
  }
}

/**
 * 手机号失焦时自动验证
 */
const handlePhoneBlur = async () => {
  // 如果手机号长度正确，自动触发验证
  if (customerForm.phone && customerForm.phone.length === 11) {
    await verifyCustomer()
  } else {
    // 如果手机号不正确，清除之前的验证结果
    customerVerifyResult.value = null
  }
}

/**
 * 处理表单提交
 */
const handleSubmit = async () => {
  if (!customerFormRef.value) return

  try {
    // 表单验证
    const valid = await customerFormRef.value.validate()
    if (!valid) return

    await appStore.withLoading(async () => {
      if (isEdit.value) {
        // 编辑客户逻辑
        console.log('更新客户信息:', customerForm)

        // 实际API调用示例：
        // await request.put(`/api/customers/${route.params.id}`, customerForm)
      } else {
        console.log('=== 开始保存客户 ===')
        console.log('表单数据:', customerForm)

        // 新增客户逻辑 - 先检查是否已存在
        const existsResponse = await customerApi.checkExists(customerForm.phone)
        console.log('检查客户是否存在响应:', existsResponse)

        if (existsResponse.data) {
          const existingCustomer = existsResponse.data
          console.log('客户已存在，抛出错误:', existingCustomer)
          throw new Error(`手机号 ${customerForm.phone} 已存在，客户姓名：${existingCustomer.name}`)
        }

        // 构建完整地址
        const fullAddress = [
          customerForm.province,
          customerForm.city,
          customerForm.district,
          customerForm.street,
          customerForm.detailAddress
        ].filter(Boolean).join(' ')

        const customerData = {
          name: customerForm.name,
          phone: customerForm.phone,
          age: customerForm.age || 0,
          address: fullAddress,
          level: customerForm.level as 'normal' | 'silver' | 'gold',
          status: customerForm.status as 'active' | 'inactive' | 'potential' | 'lost' | 'blacklist',
          salesPersonId: userStore.currentUser?.id || 'admin',
          createdBy: userStore.currentUser?.id || 'admin',
          wechatId: customerForm.wechat,
          email: customerForm.email,
          fanAcquisitionTime: customerForm.fanAcquisitionTime,
          company: '',
          position: '',
          source: customerForm.source,
          tags: customerForm.tags,
          remarks: customerForm.remark,
          height: customerForm.height,
          weight: customerForm.weight,
          gender: customerForm.gender,
          medicalHistory: customerForm.medicalHistory,
          improvementGoals: customerForm.improvementGoals,
          otherGoals: customerForm.otherGoals
        }

        console.log('准备保存的客户数据:', customerData)

        // 使用customer store保存数据
        const result = await customerStore.createCustomer(customerData)
        console.log('保存客户结果:', result)

        // 发送客户添加成功的消息提醒
        if (!isEdit.value) {
          notificationStore.sendMessage(
            notificationStore.MessageType.CUSTOMER_CREATED,
            `客户 ${customerForm.name}（${customerForm.phone}）添加成功`,
            {
              relatedId: customerData.phone,
              relatedType: 'customer',
              actionUrl: '/customer/list'
            }
          )
        }

        console.log('=== 保存客户完成 ===')
      }
    }, isEdit.value ? '正在更新客户信息...' : '正在添加客户...')

    ElMessage.success(isEdit.value ? '客户信息更新成功' : '客户添加成功')

    // 强化数据同步机制：
    // 1. 等待一小段时间确保数据完全保存
    await new Promise(resolve => setTimeout(resolve, 100))

    // 2. 强制触发Store数据同步（确保所有计算属性更新）
    await customerStore.forceSyncData()

    // 3. 等待Vue响应式更新完成
    await nextTick()

    console.log('客户添加成功，已完成强化数据同步')

    // 返回客户列表页，并传递刷新参数
    safeNavigator.push({
      path: '/customer/list',
      query: { refresh: 'true', timestamp: Date.now().toString() }
    })
  } catch (error) {
    console.error('保存客户失败:', error)
    appStore.showError({
      title: isEdit.value ? '更新客户信息失败' : '添加客户失败',
      message: error instanceof Error ? error.message : String(error)
    })
  }
}

/**
 * 处理取消操作
 */
const handleCancel = async () => {
  try {
    await ElMessageBox.confirm('确定要取消吗？未保存的数据将丢失', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '继续编辑',
      type: 'warning'
    })

    safeNavigator.push('/customer/list')
  } catch (error) {
    // 用户取消操作
  }
}

/**
 * 处理保存并下单操作
 */
const handleSaveAndOrder = async () => {
  console.log('=== handleSaveAndOrder 开始 ===')

  if (!customerFormRef.value) {
    console.error('customerFormRef 不存在')
    return
  }

  try {
    console.log('开始表单验证...')
    // 表单验证
    const valid = await customerFormRef.value.validate()
    if (!valid) {
      console.log('表单验证失败')
      return
    }
    console.log('表单验证通过')

    await appStore.withLoading(async () => {
      console.log('检查客户是否已存在，手机号:', customerForm.phone)

      // 先检查客户是否已存在
      const existsResponse = await customerApi.checkExists(customerForm.phone)
      console.log('客户存在检查结果:', existsResponse)

      if (existsResponse.data) {
        const existingCustomer = existsResponse.data
        console.log('客户已存在，客户信息:', existingCustomer)

        // 如果客户已存在，直接跳转到下单页面
        ElMessage.success('客户已存在，正在跳转到下单页面...')

        const fullAddress = [
          customerForm.province,
          customerForm.city,
          customerForm.district,
          customerForm.street,
          customerForm.detailAddress
        ].filter(Boolean).join(' ')

        console.log('准备跳转到订单页面，参数:', {
          customerId: existingCustomer.id,
          customerName: existingCustomer.name,
          customerPhone: existingCustomer.phone,
          customerAddress: existingCustomer.address || fullAddress
        })

        safeNavigator.push({
          path: '/order/add',
          query: {
            customerId: existingCustomer.id,
            customerName: existingCustomer.name,
            customerPhone: existingCustomer.phone,
            customerAddress: existingCustomer.address || fullAddress
          }
        })
        return
      }

      console.log('客户不存在，开始创建新客户')

      // 构建完整地址
      const fullAddress = [
        customerForm.province,
        customerForm.city,
        customerForm.district,
        customerForm.street,
        customerForm.detailAddress
      ].filter(Boolean).join(' ')

      // 确保用户信息正确设置
      const currentUserId = userStore.currentUser?.id
      const currentUserName = userStore.currentUser?.name

      console.log('当前用户信息检查:', {
        currentUser: userStore.currentUser,
        currentUserId,
        currentUserName,
        isLoggedIn: userStore.isLoggedIn
      })

      // 如果用户信息不完整，尝试重新初始化
      if (!currentUserId && userStore.isLoggedIn) {
        console.warn('用户已登录但用户ID为空，尝试重新初始化用户信息')
        userStore.initUser()
      }

      // 最终的用户ID，确保不为空
      const finalUserId = userStore.currentUser?.id || 'admin'
      const finalUserName = userStore.currentUser?.name || '系统管理员'

      console.log('最终使用的用户信息:', {
        finalUserId,
        finalUserName
      })

      const customerData = {
        name: customerForm.name,
        phone: customerForm.phone,
        age: customerForm.age || 0,
        address: fullAddress,
        level: customerForm.level as 'normal' | 'silver' | 'gold',
        status: customerForm.status as 'active' | 'inactive' | 'potential' | 'lost' | 'blacklist',
        salesPersonId: finalUserId,
        createdBy: finalUserId,
        wechatId: customerForm.wechat,
        email: customerForm.email,
        fanAcquisitionTime: customerForm.fanAcquisitionTime,
        company: '',
        position: '',
        source: customerForm.source,
        tags: customerForm.tags,
        remarks: customerForm.remark,
        height: customerForm.height,
        weight: customerForm.weight,
        gender: customerForm.gender,
        medicalHistory: customerForm.medicalHistory,
        improvementGoals: customerForm.improvementGoals,
        otherGoals: customerForm.otherGoals,
        // 保存详细地址字段
        province: customerForm.province,
        city: customerForm.city,
        district: customerForm.district,
        street: customerForm.street,
        detailAddress: customerForm.detailAddress,
        overseasAddress: customerForm.overseasAddress
      }

      console.log('准备创建客户，数据:', customerData)

      // 使用customer store保存数据
      const newCustomer = await customerStore.createCustomer(customerData)
      console.log('客户创建成功，新客户信息:', newCustomer)

      // 立即强制刷新客户列表数据，确保新客户显示在列表中
      console.log('强制刷新客户列表数据以确保新客户显示')
      await customerStore.forceRefreshCustomers()
      console.log('客户列表数据刷新完成，当前客户数量:', customerStore.customers.length)

      // 发送客户添加成功的消息提醒
      notificationStore.sendMessage(
        notificationStore.MessageType.CUSTOMER_CREATED,
        `客户 ${customerForm.name}（${customerForm.phone}）添加成功`,
        {
          relatedId: customerData.phone,
          relatedType: 'customer',
          actionUrl: '/customer/list'
        }
      )

      ElMessage.success('客户添加成功！')

      // 显示选择对话框，让用户决定下一步操作
      ElMessageBox.confirm(
        '客户添加成功！您希望：',
        '操作选择',
        {
          confirmButtonText: '立即为该客户下单',
          cancelButtonText: '查看客户列表',
          type: 'success',
          distinguishCancelAndClose: true
        }
      ).then(() => {
        // 用户选择跳转到订单页面
        console.log('用户选择跳转到订单页面，参数:', {
          customerId: newCustomer.id,
          customerName: customerForm.name,
          customerPhone: customerForm.phone,
          customerAddress: fullAddress
        })

        safeNavigator.push({
          path: '/order/add',
          query: {
            customerId: newCustomer.id,
            customerName: customerForm.name,
            customerPhone: customerForm.phone,
            customerAddress: fullAddress
          }
        })
      }).catch((action) => {
        if (action === 'cancel') {
          // 用户选择查看客户列表
          console.log('用户选择查看客户列表')
          safeNavigator.push({
            path: '/customer/list',
            query: { refresh: 'true', timestamp: Date.now().toString() }
          })
        }
        // 如果是关闭对话框，则不做任何操作，留在当前页面
      })
    }, '正在保存客户信息...')

    console.log('=== handleSaveAndOrder 完成 ===')

  } catch (error) {
    console.error('handleSaveAndOrder 失败:', error)
    appStore.showError('保存客户信息失败', error as Error)
  }
}

/**
 * 加载客户详情（编辑模式）
 */
const loadCustomerDetail = async () => {
  if (!isEdit.value) return

  const customerId = route.params.id
  loading.value = true

  try {
    // 模拟API调用获取客户详情
    await new Promise(resolve => setTimeout(resolve, 500))

    // 编辑模式下加载客户数据
    const customer = await customerStore.getCustomerById(customerId as string)
    if (customer) {
      Object.assign(customerForm, {
        name: customer.name,
        gender: customer.gender,
        phone: customer.phone,
        age: customer.age,
        email: customer.email,
        wechatId: customer.wechatId,
        address: customer.address,
        level: customer.level,
        source: customer.source,
        tags: customer.tags || [],
        salesPerson: customer.salesPersonId,
        remark: customer.remarks
      })
    } else {
      ElMessage.error('客户不存在')
      safeNavigator.push('/customer/list')
    }
  } catch (error) {
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

// 监听手机号变化，清除验证结果
watch(() => customerForm.phone, (newPhone, oldPhone) => {
  // 当手机号发生变化时，清除之前的验证结果
  if (newPhone !== oldPhone && customerVerifyResult.value) {
    customerVerifyResult.value = null
  }
})

// 生命周期钩子
onMounted(() => {
  initForm()
  initAddressData()
  loadTags()
  loadCustomerDetail()
})
</script>

<style scoped>
.customer-form {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.page-header h2 {
  margin: 0;
  color: #303133;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.form-card {
  border: none;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.form-section {
  margin-bottom: 32px;
}

.form-section:last-child {
  margin-bottom: 0;
}

.section-title {
  margin: 0 0 20px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid #e4e7ed;
  color: #303133;
  font-size: 16px;
  font-weight: 600;
}

/* 手机号验证样式 */
.phone-input-group {
  display: flex;
  gap: 8px;
  align-items: stretch;
}

.phone-input-group .el-input {
  flex: 1;
}

.phone-input-group .el-button {
  flex-shrink: 0;
  height: 32px; /* 与默认输入框高度一致 */
  align-self: stretch;
}

.verify-result {
  margin-top: 8px;
}

.verify-result .el-alert {
  border-radius: 4px;
}

.verify-result .el-alert p {
  margin: 4px 0;
  font-size: 13px;
}

/* 必填标记样式 */
.required-mark {
  color: #f56c6c;
  font-weight: normal;
  margin-left: 4px;
}

/* 改善问题组样式 */
.improvement-goals-group {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.improvement-goals-section {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.improvement-goals-group {
  flex: 1;
}

.improvement-goals-group .el-checkbox {
  margin-right: 0;
  margin-bottom: 8px;
}

.edit-goals-btn {
  margin-top: 2px;
  color: #409eff;
  font-size: 12px;
  padding: 4px 8px;
}

.edit-goals-btn:hover {
  background-color: #ecf5ff;
}

/* 底部按钮样式 */
.form-footer {
  position: sticky;
  bottom: 0;
  background: white;
  padding: 20px;
  margin-top: 20px;
  border-top: 1px solid #e4e7ed;
  display: flex;
  justify-content: center;
  gap: 16px;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
  z-index: 100;
}

.form-footer .el-button {
  min-width: 120px;
}



/* 响应式设计 */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }

  .header-actions {
    justify-content: center;
  }
}
</style>
