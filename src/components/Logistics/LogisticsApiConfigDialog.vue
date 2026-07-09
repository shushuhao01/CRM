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

      <!-- 专属接口地址（圆通等按客户分配地址的快递需要） -->
      <el-form-item v-if="showApiUrl" label="接口地址" prop="apiUrl">
        <el-input
          v-model="formData.apiUrl"
          :placeholder="apiUrlPlaceholder"
          clearable
        >
          <template #prepend>
            <el-icon><Link /></el-icon>
          </template>
        </el-input>
        <div class="form-tip">{{ apiUrlTip }}</div>
      </el-form-item>

      <!-- API环境 -->
      <el-form-item v-if="showEnvironment" label="API环境" prop="apiEnvironment">
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
import { Key, Lock, Connection, User, Link } from '@element-plus/icons-vue'
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
  showApiUrl?: boolean
  showEnvironment?: boolean
  apiUrlTip?: string
  apiUrlPlaceholder?: string
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
    showAppKey: false,
    showCustomerId: false,
    fieldLabels: {
      appId: 'AppKey',
      appKey: '',
      appSecret: 'AppSecret',
      customerId: ''
    },
    fieldTips: {
      appId: '中通开放平台"个人中心"的appKey（放在请求头x-appkey/x-companyid）',
      appKey: '',
      appSecret: '中通开放平台的密钥appSecret（用于Base64(MD5(报文+密钥))签名）',
      customerId: ''
    },
    apiUrls: {
      sandbox: 'https://japi-test.zto.com/zto.merchant.waybill.track.query',
      production: 'https://japi.zto.com/zto.merchant.waybill.track.query'
    },
    setupSteps: [
      '1. 登录中通开放平台 (open.zto.com)，注册并完成企业实名认证',
      '2. 在"个人中心"获取 appKey 和 密钥(appSecret)',
      '3. 申请"商家运单轨迹查询"(zto.merchant.waybill.track.query)接口权限（免费，需与中通有合作/月结关系）',
      '4. 签名方式: x-datadigest = Base64(MD5(请求报文 + AppSecret))，请求头携带x-appkey',
      '5. 将 AppKey 和 AppSecret 填入下方配置，用真实中通单号测试连接'
    ]
  },
  // 圆通速递 - 圆通开放平台 https://open.yto.net.cn/
  YTO: {
    name: '圆通速递',
    platformUrl: 'https://open.yto.net.cn/',
    showAppKey: false,
    showCustomerId: true,
    showApiUrl: true,
    showEnvironment: false,
    fieldLabels: {
      appId: '客户编码(app_key)',
      appKey: '',
      appSecret: '客户密钥(secret)',
      customerId: '用户ID(user_id)'
    },
    fieldTips: {
      appId: '圆通开放平台"个人中心"的客户编码，作为接口的app_key参数',
      appKey: '',
      appSecret: '圆通开放平台的客户密钥，用于Base64(MD5(param+method+v+密钥))签名',
      customerId: '开放平台账号的用户ID(user_id)，在个人中心查看'
    },
    apiUrls: {
      sandbox: 'https://openapi.yto.net.cn/service/waybill_query/v1/{专属编码}',
      production: 'https://openapi.yto.net.cn/service/waybill_query/v1/{专属编码}'
    },
    apiUrlTip: '圆通为每个客户分配专属接口地址：登录开放平台 → 控制台 → 接口管理 → 添加"物流轨迹查询"接口后，复制平台显示的完整调用地址（含waybill_query路径），必填',
    apiUrlPlaceholder: '如: https://openapi.yto.net.cn/service/waybill_query/v1/AbCdEf',
    callbackUrl: '/api/v1/logistics/yto-callback',
    setupSteps: [
      '1. 登录圆通开放平台 (open.yto.net.cn)，注册并完成企业认证',
      '2. 在"个人中心"获取 客户编码(app_key)、客户密钥(secret) 和 用户ID(user_id)',
      '3. 进入"控制台-接口管理"，添加"物流轨迹查询"(yto.Marketing.WaybillTrace)接口（免费）',
      '4. 复制平台分配的专属接口地址，填入下方"接口地址"（必填）',
      '5. 签名方式: sign = Base64(MD5(param + method + v + 密钥))，表单方式提交',
      '6. 保存配置后用真实圆通单号测试连接'
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
      appId: '申通开放平台分配的appKey（from_appkey参数）',
      appKey: '',
      appSecret: '申通开放平台分配的secretKey（用于Base64(MD5())签名）',
      customerId: '客户编码（可选）'
    },
    apiUrls: {
      sandbox: 'http://cloudinter-linkgatewaytest.sto.cn/gateway/link.do',
      production: 'https://cloudinter-linkgateway.sto.cn/gateway/link.do'
    },
    setupSteps: [
      '1. 登录申通开放平台 (open.sto.cn)，注册开发者账号',
      '2. 进入"应用管理"，创建应用获取AppKey和SecretKey',
      '3. 在"LinkGateway接口"中申请"STO_TRACE_QUERY_COMMON"轨迹查询接口',
      '4. 签名方式: Base64(MD5(content + SecretKey))',
      '5. 在测试环境完成接口调试（注意测试环境为HTTP协议）',
      '6. 将AppKey和SecretKey填入下方配置'
    ]
  },
  // 韵达速递 - 韵达开放平台 http://open.yundaex.com/
  YD: {
    name: '韵达速递',
    platformUrl: 'http://open.yundaex.com/',
    showAppKey: false,
    showCustomerId: false,
    fieldLabels: {
      appId: 'AppKey(app-key)',
      appKey: '',
      appSecret: 'AppSecret',
      customerId: ''
    },
    fieldTips: {
      appId: '韵达开放平台分配的app-key（放在请求头app-key）',
      appKey: '',
      appSecret: '韵达开放平台分配的appSecret，用于MD5(请求报文 + "_" + AppSecret)签名（放在请求头sign）',
      customerId: ''
    },
    apiUrls: {
      sandbox: 'https://u-openapi.yundasys.com/openapi/outer/logictis/query',
      production: 'https://openapi.yundaex.com/openapi/outer/logictis/query'
    },
    setupSteps: [
      '1. 登录韵达开放平台 (open.yundaex.com)，注册企业账号并完成认证',
      '2. 创建应用，获取AppKey和AppSecret（轨迹查询接口免费，需为韵达合作客户）',
      '3. 申请"物流轨迹订阅/查询"接口权限（接口路径 /openapi/outer/logictis/query）',
      '4. 签名方式: sign = MD5(请求报文 + "_" + AppSecret)，与app-key、req-time一起放请求头',
      '5. 注意: 韵达查询前需先订阅运单轨迹（下单走韵达接口的运单自动订阅）',
      '6. 将AppKey和AppSecret填入下方配置，用真实韵达单号测试连接'
    ]
  },
  // 极兔速递 - 极兔开放平台 https://open.jtexpress.com.cn/
  JTSD: {
    name: '极兔速递',
    platformUrl: 'https://open.jtexpress.com.cn/',
    showAppKey: false,
    showCustomerId: false,
    fieldLabels: {
      appId: 'API账号(apiAccount)',
      appKey: '',
      appSecret: '私钥(privateKey)',
      customerId: ''
    },
    fieldTips: {
      appId: '极兔开放平台分配的apiAccount（放在请求头apiAccount）',
      appKey: '',
      appSecret: '极兔开放平台分配的privateKey，用于digest = Base64(MD5(bizContent + privateKey))签名',
      customerId: ''
    },
    apiUrls: {
      sandbox: 'https://uat-openapi.jtexpress.com.cn/webopenplatformapi/api/logistics/trace',
      production: 'https://openapi.jtexpress.com.cn/webopenplatformapi/api/logistics/trace'
    },
    setupSteps: [
      '1. 登录极兔开放平台 (open.jtexpress.com.cn)，注册企业账号',
      '2. 进入"应用管理"，创建应用获取API账号(apiAccount)和私钥(privateKey)',
      '3. 在"接口管理"中申请"物流轨迹查询"(/api/logistics/trace)接口（免费）',
      '4. 签名方式: digest = Base64(MD5(bizContent + privateKey))，与apiAccount、timestamp一起放请求头，表单提交bizContent',
      '5. 在UAT环境(uat-openapi)完成接口联调测试',
      '6. 将API账号和私钥填入下方配置，用真实极兔单号测试连接'
    ]
  },
  // 邮政EMS - 中国邮政国内协议客户API开放平台 https://api.ems.com.cn/
  EMS: {
    name: '邮政EMS',
    platformUrl: 'https://api.ems.com.cn/',
    showAppKey: true,
    showCustomerId: false,
    fieldLabels: {
      appId: '协议客户号(senderNo)',
      appKey: 'SM4密钥',
      appSecret: '授权码(authorization)',
      customerId: ''
    },
    fieldTips: {
      appId: '中国邮政开放平台分配的协议客户号（senderNo，需先与当地邮政签订协议）',
      appKey: '邮政开放平台分配的SM4报文加密密钥（Base64格式，16字节）',
      appSecret: '邮政开放平台分配的授权码（authorization）',
      customerId: ''
    },
    apiUrls: {
      sandbox: 'https://api.ems.com.cn/amp-prod-api/f/amp/api/open',
      production: 'https://api.ems.com.cn/amp-prod-api/f/amp/api/open'
    },
    setupSteps: [
      '1. 与当地邮政/EMS签订协议成为协议客户（需有月结账户）',
      '2. 登录中国邮政国内协议客户API开放平台 (api.ems.com.cn)，注册并绑定协议客户号',
      '3. 获取 协议客户号(senderNo)、授权码(authorization) 和 SM4密钥',
      '4. 申请"运单轨迹查询"(apiCode=040001)接口权限（免费）',
      '5. 报文加密方式: SM4-ECB(业务JSON + SM4密钥)，Base64输出，表单提交',
      '6. 将三项凭证填入下方配置，用真实EMS单号测试连接'
    ]
  },
  // 京东物流 - 京东物流开放平台 https://open.jdl.com/
  JD: {
    name: '京东物流',
    platformUrl: 'https://open.jdl.com/',
    showAppKey: true,
    showCustomerId: true,
    fieldLabels: {
      appId: 'AppKey',
      appKey: 'AccessToken',
      appSecret: 'AppSecret',
      customerId: '商家编码'
    },
    fieldTips: {
      appId: '京东物流开放平台应用的AppKey（app_key）',
      appKey: '用签约商家的京东账号在应用详情页OAuth授权后获取的access_token（过期需刷新）',
      appSecret: '应用的AppSecret（用于md5-salt网关签名）',
      customerId: '京东物流商家编码（可选）'
    },
    apiUrls: {
      sandbox: 'https://uat-api.jdl.com/jd/tracking/query',
      production: 'https://api.jdl.com/jd/tracking/query'
    },
    setupSteps: [
      '1. 登录京东物流开放平台 (open.jdl.com)，注册企业账号并创建应用（获取AppKey/AppSecret）',
      '2. 申请"快递轨迹查询"API权限（对接方案编码Tracking_JD，接口/jd/tracking/query，免费）',
      '3. 在应用详情页点击授权链接，用与京东物流签约的商家账号登录并授权，获取AccessToken',
      '4. 签名方式: MD5(secret+access_token+…+v2.0+secret)大写（md5-salt），参数拼在URL上',
      '5. 在UAT环境(uat-api.jdl.com)完成接口联调测试',
      '6. 将AppKey、AppSecret、AccessToken填入下方配置，用真实京东单号测试连接'
    ]
  },
  // 德邦快递 - 德邦开放平台 https://open.deppon.com/
  DBL: {
    name: '德邦快递',
    platformUrl: 'https://open.deppon.com/',
    showAppKey: false,
    showCustomerId: false,
    fieldLabels: {
      appId: '公司编码(companyCode)',
      appKey: '',
      appSecret: '密钥(appkey)',
      customerId: ''
    },
    fieldTips: {
      appId: '德邦开放平台分配的公司编码（companyCode）',
      appKey: '',
      appSecret: '德邦开放平台分配的appkey密钥，用于digest = Base64(MD5十六进制(params+密钥+timestamp))签名',
      customerId: ''
    },
    apiUrls: {
      sandbox: 'http://dpsanbox.deppon.com/sandbox-web/standard-order/newTraceQuery.action',
      production: 'https://dpapi.deppon.com/dop-interface-sync/standard-order/newTraceQuery.action'
    },
    setupSteps: [
      '1. 登录德邦开放平台 (open.deppon.com)，注册企业账号（需与德邦有业务合作）',
      '2. 申请API接入，获取公司编码(companyCode)和密钥(appkey)',
      '3. 在dop平台配置并申请"新轨迹查询"(NEW_TRACE_QUERY / newTraceQuery.action)接口',
      '4. 签名方式: digest = Base64(MD5十六进制字符串(params + 密钥 + timestamp))，表单提交',
      '5. 在沙箱环境(dpsanbox.deppon.com)完成接口调试',
      '6. 将公司编码和密钥填入下方配置，用真实德邦单号测试连接'
    ]
  }
}

// 计算属性
const currentConfig = computed(() => companyConfigs[props.companyCode] || companyConfigs.ZTO)
const currentCompanyConfig = computed(() => companyConfigs[props.companyCode] || null)
const companyName = computed(() => currentConfig.value.name)
const platformUrl = computed(() => currentConfig.value.platformUrl)
const showAppKey = computed(() => currentConfig.value.showAppKey)
const showCustomerId = computed(() => currentConfig.value.showCustomerId)
const showApiUrl = computed(() => currentConfig.value.showApiUrl === true)
const showEnvironment = computed(() => currentConfig.value.showEnvironment !== false)
const apiUrlTip = computed(() => currentConfig.value.apiUrlTip || '')
const apiUrlPlaceholder = computed(() => currentConfig.value.apiUrlPlaceholder || '请输入接口地址')
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
  apiUrl: '',
  apiEnvironment: 'sandbox',
  enabled: true
})

const rules = computed<FormRules>(() => {
  const r: FormRules = {
    appId: [{ required: true, message: `请输入${fieldLabels.value.appId || '应用ID'}`, trigger: 'blur' }],
    appSecret: [{ required: true, message: `请输入${fieldLabels.value.appSecret || '密钥'}`, trigger: 'blur' }]
  }
  // 圆通等需要客户专属接口地址的快递，接口地址必填
  if (showApiUrl.value) {
    r.apiUrl = [{ required: true, message: '请输入专属接口地址', trigger: 'blur' }]
  }
  return r
})

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
    formData.apiUrl = newConfig.apiUrl || ''
    formData.apiEnvironment = newConfig.apiEnvironment || 'sandbox'
    formData.enabled = newConfig.enabled !== false
  }
}, { immediate: true })

// 计算最终保存/测试使用的接口地址
const resolveApiUrl = (): string => {
  if (showApiUrl.value) {
    return (formData.apiUrl || '').trim()
  }
  return formData.apiEnvironment === 'production'
    ? apiUrls.value.production
    : apiUrls.value.sandbox
}

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
    const apiUrl = resolveApiUrl()

    const response = await logisticsApi.testApiConfig(props.companyCode, {
      appId: formData.appId,
      appKey: showAppKey.value ? formData.appKey : '',
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

    const apiUrl = resolveApiUrl()

    const config = {
      appId: formData.appId,
      // 隐藏的appKey字段保存空值，避免旧数据残留干扰后端取值
      appKey: showAppKey.value ? formData.appKey : '',
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
