<template>
  <el-dialog
    v-model="dialogVisible"
    :title="`${companyName}API配置`"
    width="650px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      label-width="120px"
    >
      <el-alert
        :title="`${companyName}开放平台配置`"
        type="info"
        :closable="false"
        style="margin-bottom: 20px"
      >
        <template #default>
          <div style="font-size: 13px; line-height: 1.8">
            <p style="margin: 0 0 8px 0"><strong>配置步骤:</strong></p>
            <template v-if="currentCompanyConfig?.setupSteps">
              <p v-for="(step, index) in currentCompanyConfig.setupSteps" :key="index" style="margin: 0 0 4px 0">
                {{ step }}
              </p>
            </template>
            <template v-else>
              <p style="margin: 0 0 4px 0">1. 登录 <a :href="platformUrl" target="_blank" style="color: #409eff">{{ companyName }}开放平台</a></p>
              <p style="margin: 0 0 4px 0">2. 创建应用，获取API密钥信息</p>
              <p style="margin: 0 0 4px 0">3. 填入下方配置信息并测试连接</p>
            </template>
          </div>
        </template>
      </el-alert>

      <!-- 应用ID -->
      <el-form-item :label="fieldLabels.appId" prop="appId">
        <el-input
          v-model="formData.appId"
          :placeholder="`请输入${fieldLabels.appId}`"
          clearable
        >
          <template #prepend>
            <el-icon><Key /></el-icon>
          </template>
        </el-input>
        <div class="form-tip">{{ fieldTips.appId }}</div>
      </el-form-item>

      <!-- 应用密钥 -->
      <el-form-item v-if="showAppKey" :label="fieldLabels.appKey" prop="appKey">
        <el-input
          v-model="formData.appKey"
          :placeholder="`请输入${fieldLabels.appKey}`"
          clearable
        >
          <template #prepend>
            <el-icon><Key /></el-icon>
          </template>
        </el-input>
        <div class="form-tip">{{ fieldTips.appKey }}</div>
      </el-form-item>

      <!-- 校验码/密钥 -->
      <el-form-item :label="fieldLabels.appSecret" prop="appSecret">
        <el-input
          v-model="formData.appSecret"
          type="password"
          :placeholder="`请输入${fieldLabels.appSecret}`"
          show-password
          clearable
        >
          <template #prepend>
            <el-icon><Lock /></el-icon>
          </template>
        </el-input>
        <div class="form-tip">{{ fieldTips.appSecret }}</div>
      </el-form-item>

      <!-- 客户ID（部分快递需要） -->
      <el-form-item v-if="showCustomerId" :label="fieldLabels.customerId" prop="customerId">
        <el-input
          v-model="formData.customerId"
          :placeholder="`请输入${fieldLabels.customerId}`"
          clearable
        >
          <template #prepend>
            <el-icon><User /></el-icon>
          </template>
        </el-input>
        <div class="form-tip">{{ fieldTips.customerId }}</div>
      </el-form-item>

      <!-- API环境 -->
      <el-form-item label="API环境" prop="apiEnvironment">
        <el-select v-model="formData.apiEnvironment" style="width: 100%">
          <el-option label="测试环境" value="sandbox">
            <div style="display: flex; flex-direction: column">
              <span style="font-weight: 500">测试环境</span>
              <span style="font-size: 12px; color: #909399">{{ apiUrls.sandbox }}</span>
            </div>
          </el-option>
          <el-option label="生产环境" value="production">
            <div style="display: flex; flex-direction: column">
              <span style="font-weight: 500">生产环境</span>
              <span style="font-size: 12px; color: #909399">{{ apiUrls.production }}</span>
            </div>
          </el-option>
        </el-select>
        <div class="form-tip">测试环境用于开发调试，生产环境用于正式业务</div>
      </el-form-item>

      <!-- 启用状态 -->
      <el-form-item label="启用状态">
        <el-switch
          v-model="formData.enabled"
          active-text="启用"
          inactive-text="禁用"
        />
      </el-form-item>

      <el-divider />

      <!-- 测试连接 -->
      <el-form-item label="测试连接">
        <el-input
          v-model="testTrackingNo"
          placeholder="输入测试运单号（可选）"
          style="width: 200px; margin-right: 10px"
        />
        <el-button
          @click="handleTestConnection"
          :loading="testing"
          :disabled="!canTest"
        >
          <el-icon><Connection /></el-icon>
          测试连接
        </el-button>
        <span v-if="testResult.status" :class="['test-result', testResult.status]">
          {{ testResult.message }}
        </span>
      </el-form-item>
    </el-form>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button
          @click="handleSave"
          type="primary"
          :loading="saving"
        >
          保存配置
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Key, Lock, Connection, User } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import { logisticsApi } from '@/api/logistics'

// Props
interface Props {
  visible: boolean
  companyCode: string
  config?: LogisticsApiConfig | null
}

interface LogisticsApiConfig {
  appId?: string
  appKey?: string
  appSecret?: string
  customerId?: string
  apiUrl?: string
  apiEnvironment?: 'sandbox' | 'production'
  enabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  config: null
})

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'success', config: LogisticsApiConfig): void
}>()

// 快递公司配置信息 - 基于各公司官方开放平台API文档
const companyConfigs: Record<string, {
  name: string
  platformUrl: string
  showAppKey: boolean
  showCustomerId: boolean
  fieldLabels: Record<string, string>
  fieldTips: Record<string, string>
  apiUrls: { sandbox: string; production: string }
  callbackUrl?: string
  setupSteps?: string[]
}> = {
  // 顺丰速运 - 丰桥开放平台 https://open.sf-express.com/
  SF: {
    name: '顺丰速运',
    platformUrl: 'https://open.sf-express.com/',
    showAppKey: false,
    showCustomerId: true,
    fieldLabels: {
      appId: '顾客编码',
      appKey: '',
      appSecret: '校验码',
      customerId: '月结卡号'
    },
    fieldTips: {
      appId: '顺丰开放平台分配的顾客编码(partnerID)，如：YL0LZ7MO',
      appKey: '',
      appSecret: '顺丰开放平台分配的校验码(checkword)',
      customerId: '月结卡号（可选，用于下单）'
    },
    apiUrls: {
      sandbox: 'https://sfapi-sbox.sf-express.com/std/service',
      production: 'https://sfapi.sf-express.com/std/service'
    },
    setupSteps: [
      '1. 登录顺丰开放平台 (open.sf-express.com)',
      '2. 进入"业务对接" -> "开发者对接"，创建应用',
      '3. 在API列表中关联"路由查询接口"(EXP_RECE_SEARCH_ROUTES)',
      '4. 进入"沙箱工具" -> "API测试工具"进行接口测试',
      '5. 测试通过后，获取顾客编码和校验码',
      '6. 将顾客编码和校验码填入下方配置'
    ]
  },
  // 中通快递 - 中通开放平台 https://open.zto.com/
  ZTO: {
    name: '中通快递',
    platformUrl: 'https://open.zto.com/',
    showAppKey: true,
    showCustomerId: true,
    fieldLabels: {
      appId: '公司ID',
      appKey: 'AppKey',
      appSecret: 'AppSecret',
      customerId: '合作商ID'
    },
    fieldTips: {
      appId: '中通开放平台分配的company_id',
      appKey: '中通开放平台分配的app_key',
      appSecret: '中通开放平台分配的app_secret',
      customerId: '合作商ID（可选）'
    },
    apiUrls: {
      sandbox: 'https://japi-test.zto.com/zto.open.getTraceInfo',
      production: 'https://japi.zto.com/zto.open.getTraceInfo'
    }
  },
  // 圆通速递 - 圆通开放平台 https://open.yto.net.cn/
  YTO: {
    name: '圆通速递',
    platformUrl: 'https://open.yto.net.cn/',
    showAppKey: true,
    showCustomerId: true,
    fieldLabels: {
      appId: 'AppKey',
      appKey: 'AppSecret',
      appSecret: 'UserId',
      customerId: '客户编码'
    },
    fieldTips: {
      appId: '圆通开放平台分配的AppKey（如：YTOxxxxxxxx）',
      appKey: '圆通开放平台分配的AppSecret',
      appSecret: '圆通开放平台分配的UserId',
      customerId: '客户编码（如：open19341749）'
    },
    apiUrls: {
      sandbox: 'https://openuat.yto56test.com:5443/open/track_query_adapter/v1',
      production: 'https://openapi.yto.net.cn/open/track_query_adapter/v1'
    },
    // 圆通需要先进行API在线调试，回调URL填写: {您的域名}/api/v1/logistics/yto-callback
    callbackUrl: '/api/v1/logistics/yto-callback',
    setupSteps: [
      '1. 登录圆通速递开放平台',
      '2. 进入"接口管理"，申请"物流轨迹推送服务"接口',
      '3. 进入"API在线调试"页面',
      '4. URL地址填写: {您的服务器域名}/api/v1/logistics/yto-callback',
      '5. 点击"提交测试"，调试成功后获取客户编码和请求地址',
      '6. 将获取的参数填入下方配置'
    ]
  },
  // 申通快递 - 申通开放平台 https://open.sto.cn/
  STO: {
    name: '申通快递',
    platformUrl: 'https://open.sto.cn/',
    showAppKey: false,
    showCustomerId: true,
    fieldLabels: {
      appId: 'AppKey',
      appKey: '',
      appSecret: 'SecretKey',
      customerId: '客户编码'
    },
    fieldTips: {
      appId: '申通开放平台分配的appKey',
      appKey: '',
      appSecret: '申通开放平台分配的secretKey',
      customerId: '客户编码（可选）'
    },
    apiUrls: {
      sandbox: 'http://cloudinter-linkgatewaytest.sto.cn/gateway/link.do',
      production: 'https://cloudinter-linkgateway.sto.cn/gateway/link.do'
    }
  },
  // 韵达速递 - 韵达开放平台 https://open.yundaex.com/
  YD: {
    name: '韵达速递',
    platformUrl: 'https://open.yundaex.com/',
    showAppKey: false,
    showCustomerId: true,
    fieldLabels: {
      appId: 'AppKey',
      appKey: '',
      appSecret: 'AppSecret',
      customerId: 'PartnerId'
    },
    fieldTips: {
      appId: '韵达开放平台分配的appKey',
      appKey: '',
      appSecret: '韵达开放平台分配的appSecret',
      customerId: '合作伙伴ID（可选）'
    },
    apiUrls: {
      sandbox: 'https://u-openapi.yundasys.com/openapi/outer/logictis/query',
      production: 'https://openapi.yundaex.com/openapi/outer/logictis/query'
    }
  },
  // 极兔速递 - 极兔开放平台 https://open.jtexpress.com.cn/
  JTSD: {
    name: '极兔速递',
    platformUrl: 'https://open.jtexpress.com.cn/',
    showAppKey: false,
    showCustomerId: true,
    fieldLabels: {
      appId: 'API账号',
      appKey: '',
      appSecret: '私钥',
      customerId: '客户编码'
    },
    fieldTips: {
      appId: '极兔开放平台分配的apiAccount',
      appKey: '',
      appSecret: '极兔开放平台分配的privateKey',
      customerId: '客户编码（可选）'
    },
    apiUrls: {
      sandbox: 'https://openapi-test.jtexpress.com.cn/webopenplatformapi/api',
      production: 'https://openapi.jtexpress.com.cn/webopenplatformapi/api'
    }
  },
  // 邮政EMS - 邮政开放平台
  EMS: {
    name: '邮政EMS',
    platformUrl: 'https://eis.11183.com.cn/',
    showAppKey: false,
    showCustomerId: true,
    fieldLabels: {
      appId: 'AppKey',
      appKey: '',
      appSecret: 'AppSecret',
      customerId: '客户编码'
    },
    fieldTips: {
      appId: '邮政EMS开放平台分配的appKey',
      appKey: '',
      appSecret: '邮政EMS开放平台分配的appSecret',
      customerId: '客户编码（可选）'
    },
    apiUrls: {
      sandbox: 'https://eis.11183.com.cn/openapi/test',
      production: 'https://eis.11183.com.cn/openapi'
    }
  },
  // 京东物流 - 京东物流开放平台 https://open.jdl.com/
  JD: {
    name: '京东物流',
    platformUrl: 'https://open.jdl.com/',
    showAppKey: false,
    showCustomerId: true,
    fieldLabels: {
      appId: 'AppKey',
      appKey: '',
      appSecret: 'AppSecret',
      customerId: '商家编码'
    },
    fieldTips: {
      appId: '京东物流开放平台分配的appKey',
      appKey: '',
      appSecret: '京东物流开放平台分配的appSecret',
      customerId: '商家编码（可选）'
    },
    apiUrls: {
      sandbox: 'https://uat-api.jdl.com',
      production: 'https://api.jdl.com'
    }
  },
  // 德邦快递 - 德邦开放平台 https://open.deppon.com/
  DBL: {
    name: '德邦快递',
    platformUrl: 'https://open.deppon.com/',
    showAppKey: false,
    showCustomerId: true,
    fieldLabels: {
      appId: 'AppKey',
      appKey: '',
      appSecret: 'AppSecret',
      customerId: '公司编码'
    },
    fieldTips: {
      appId: '德邦开放平台分配的appKey',
      appKey: '',
      appSecret: '德邦开放平台分配的appSecret',
      customerId: '公司编码（可选）'
    },
    apiUrls: {
      sandbox: 'http://dpapi-test.deppon.com/dop-interface-sync/standard-order',
      production: 'https://dpapi.deppon.com/dop-interface-sync/standard-order'
    }
  }
}

// 计算属性
const currentConfig = computed(() => companyConfigs[props.companyCode] || companyConfigs.ZTO)
const currentCompanyConfig = computed(() => companyConfigs[props.companyCode] || null)
const companyName = computed(() => currentConfig.value.name)
const platformUrl = computed(() => currentConfig.value.platformUrl)
const showAppKey = computed(() => currentConfig.value.showAppKey)
const showCustomerId = computed(() => currentConfig.value.showCustomerId)
const fieldLabels = computed(() => currentConfig.value.fieldLabels)
const fieldTips = computed(() => currentConfig.value.fieldTips)
const apiUrls = computed(() => currentConfig.value.apiUrls)

const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

// Form
const formRef = ref<FormInstance>()
const formData = reactive<LogisticsApiConfig & { enabled: boolean }>({
  appId: '',
  appKey: '',
  appSecret: '',
  customerId: '',
  apiEnvironment: 'sandbox',
  enabled: true
})

const rules: FormRules = {
  appId: [{ required: true, message: '请输入应用ID', trigger: 'blur' }],
  appSecret: [{ required: true, message: '请输入密钥', trigger: 'blur' }]
}

// State
const testing = ref(false)
const saving = ref(false)
const testTrackingNo = ref('')
const testResult = reactive({
  status: '' as '' | 'success' | 'error',
  message: ''
})

const canTest = computed(() => {
  return formData.appId && formData.appSecret
})

// Watch props.config
watch(() => props.config, (newConfig) => {
  if (newConfig) {
    formData.appId = newConfig.appId || ''
    formData.appKey = newConfig.appKey || ''
    formData.appSecret = newConfig.appSecret || ''
    formData.customerId = newConfig.customerId || ''
    formData.apiEnvironment = newConfig.apiEnvironment || 'sandbox'
    formData.enabled = newConfig.enabled !== false
  }
}, { immediate: true })

// Methods
const handleClose = () => {
  formRef.value?.resetFields()
  testResult.status = ''
  testResult.message = ''
  emit('update:visible', false)
}

const handleTestConnection = async () => {
  testing.value = true
  testResult.status = ''
  testResult.message = ''

  try {
    const apiUrl = formData.apiEnvironment === 'production'
      ? apiUrls.value.production
      : apiUrls.value.sandbox

    const response = await logisticsApi.testApiConfig(props.companyCode, {
      appId: formData.appId,
      appKey: formData.appKey,
      appSecret: formData.appSecret,
      customerId: formData.customerId,
      apiUrl,
      apiEnvironment: formData.apiEnvironment,
      testTrackingNo: testTrackingNo.value
    })

    if (response.success) {
      testResult.status = 'success'
      testResult.message = response.message || '连接成功'
    } else {
      testResult.status = 'error'
      testResult.message = response.message || '连接失败'
    }
  } catch (error) {
    testResult.status = 'error'
    testResult.message = '测试失败: ' + (error instanceof Error ? error.message : '未知错误')
  } finally {
    testing.value = false
  }
}

const handleSave = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
    saving.value = true

    const apiUrl = formData.apiEnvironment === 'production'
      ? apiUrls.value.production
      : apiUrls.value.sandbox

    const config = {
      appId: formData.appId,
      appKey: formData.appKey,
      appSecret: formData.appSecret,
      customerId: formData.customerId,
      apiUrl,
      apiEnvironment: formData.apiEnvironment,
      enabled: formData.enabled
    }

    await logisticsApi.saveApiConfig(props.companyCode, config)

    ElMessage.success(`${companyName.value}配置保存成功`)
    emit('success', config)
    handleClose()
  } catch (error) {
    console.error('保存配置失败:', error)
    ElMessage.error('保存配置失败')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.test-result {
  margin-left: 12px;
  font-size: 13px;
}

.test-result.success {
  color: #67c23a;
}

.test-result.error {
  color: #f56c6c;
}
</style>
