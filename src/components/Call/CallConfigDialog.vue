<template>
  <el-dialog
    v-model="visible"
    title="呼出配置"
    width="900px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <el-tabs v-model="activeTab" type="border-card">
      <!-- 管理员配置标签页 (仅管理员可见) -->
      <el-tab-pane v-if="isAdmin" label="系统线路管理" name="lines">
        <div class="config-section">
          <div class="section-header">
            <span class="section-title">外呼线路列表</span>
            <el-button type="primary" size="small" :icon="Plus" @click="openLineDialog()">
              添加线路
            </el-button>
          </div>

          <el-table :data="callLines" v-loading="linesLoading" style="width: 100%">
            <el-table-column prop="name" label="线路名称" width="150" />
            <el-table-column prop="provider" label="服务商" width="100">
              <template #default="{ row }">
                <el-tag size="small">{{ getProviderText(row.provider) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="callerNumber" label="主叫号码" width="130" />
            <el-table-column prop="status" label="状态" width="80">
              <template #default="{ row }">
                <el-tag :type="row.status === 'active' ? 'success' : 'danger'" size="small">
                  {{ row.status === 'active' ? '正常' : '异常' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="isEnabled" label="启用" width="70">
              <template #default="{ row }">
                <el-switch v-model="row.isEnabled" size="small" @change="toggleLineStatus(row)" />
              </template>
            </el-table-column>
            <el-table-column prop="dailyUsed" label="今日使用" width="100">
              <template #default="{ row }">
                {{ row.dailyUsed || 0 }} / {{ row.dailyLimit || 1000 }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120">
              <template #default="{ row }">
                <el-button type="primary" link size="small" @click="openLineDialog(row)">编辑</el-button>
                <el-button type="danger" link size="small" @click="deleteLine(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <!-- 网络电话配置 (仅管理员可见) -->
      <el-tab-pane v-if="isAdmin" label="网络电话配置" name="voip">
        <div class="config-section">
          <el-form :model="globalConfig" label-width="140px">
            <el-form-item label="默认服务商">
              <el-select v-model="globalConfig.voipProvider" style="width: 200px">
                <el-option label="阿里云通信" value="aliyun" />
                <el-option label="腾讯云通信" value="tencent" />
                <el-option label="华为云通信" value="huawei" />
              </el-select>
            </el-form-item>

            <template v-if="globalConfig.voipProvider === 'aliyun'">
              <el-divider content-position="left">阿里云通信配置</el-divider>
              <el-form-item label="AccessKey ID" required>
                <el-input v-model="globalConfig.aliyunConfig.accessKeyId" placeholder="请输入" show-password style="width: 100%" />
              </el-form-item>
              <el-form-item label="AccessKey Secret" required>
                <el-input v-model="globalConfig.aliyunConfig.accessKeySecret" placeholder="请输入" type="password" show-password style="width: 100%" />
              </el-form-item>
              <el-form-item label="应用ID" required>
                <el-input v-model="globalConfig.aliyunConfig.appId" placeholder="请输入语音通话应用ID" style="width: 100%" />
              </el-form-item>
              <el-form-item label="主叫号码">
                <el-input v-model="globalConfig.aliyunConfig.callerNumber" placeholder="客户接听时显示的号码" style="width: 100%" />
              </el-form-item>
              <el-form-item label="服务区域">
                <el-select v-model="globalConfig.aliyunConfig.region" style="width: 200px">
                  <el-option label="华东1（杭州）" value="cn-hangzhou" />
                  <el-option label="华东2（上海）" value="cn-shanghai" />
                  <el-option label="华北2（北京）" value="cn-beijing" />
                  <el-option label="华南1（深圳）" value="cn-shenzhen" />
                </el-select>
              </el-form-item>
              <el-form-item label="启用录音">
                <el-switch v-model="globalConfig.aliyunConfig.enableRecording" />
              </el-form-item>
            </template>

            <template v-if="globalConfig.voipProvider === 'tencent'">
              <el-divider content-position="left">腾讯云通信配置</el-divider>
              <el-form-item label="SecretId" required>
                <el-input v-model="globalConfig.tencentConfig.secretId" placeholder="请输入" show-password style="width: 100%" />
              </el-form-item>
              <el-form-item label="SecretKey" required>
                <el-input v-model="globalConfig.tencentConfig.secretKey" placeholder="请输入" type="password" show-password style="width: 100%" />
              </el-form-item>
              <el-form-item label="应用ID" required>
                <el-input v-model="globalConfig.tencentConfig.appId" placeholder="请输入" style="width: 100%" />
              </el-form-item>
            </template>

            <template v-if="globalConfig.voipProvider === 'huawei'">
              <el-divider content-position="left">华为云通信配置</el-divider>
              <el-form-item label="Access Key" required>
                <el-input v-model="globalConfig.huaweiConfig.accessKey" placeholder="请输入" show-password style="width: 100%" />
              </el-form-item>
              <el-form-item label="Secret Key" required>
                <el-input v-model="globalConfig.huaweiConfig.secretKey" placeholder="请输入" type="password" show-password style="width: 100%" />
              </el-form-item>
            </template>

            <el-form-item>
              <el-button type="primary" @click="saveGlobalConfig" :loading="savingGlobal">保存配置</el-button>
              <el-button @click="testVoipConnection" :loading="testingVoip">测试连接</el-button>
            </el-form-item>
          </el-form>
        </div>
      </el-tab-pane>

      <!-- 号码分配 (仅管理员可见) -->
      <el-tab-pane v-if="isAdmin" label="号码分配" name="assignments">
        <div class="config-section">
          <div class="section-header">
            <span class="section-title">用户线路分配</span>
            <el-button type="primary" size="small" :icon="Plus" @click="openAssignDialog">
              分配线路
            </el-button>
          </div>

          <el-table :data="assignments" v-loading="assignmentsLoading" style="width: 100%">
            <el-table-column prop="userName" label="用户" width="120" />
            <el-table-column prop="lineName" label="线路" width="150" />
            <el-table-column prop="callerNumber" label="主叫号码" width="130" />
            <el-table-column prop="isDefault" label="默认" width="70">
              <template #default="{ row }">
                <el-tag v-if="row.isDefault" type="success" size="small">是</el-tag>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column prop="dailyLimit" label="日限额" width="80" />
            <el-table-column label="操作" width="80">
              <template #default="{ row }">
                <el-button type="danger" link size="small" @click="removeAssignment(row)">取消</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <!-- 工作手机标签页 (全员可见) -->
      <el-tab-pane label="工作手机" name="workPhone">
        <div class="config-section">
          <el-alert type="info" :closable="false" style="margin-bottom: 16px;">
            <template #title>
              工作手机说明：绑定您的工作手机后，可通过手机直接拨打客户电话，系统自动录音并同步通话记录。
            </template>
          </el-alert>

          <div class="section-header">
            <span class="section-title">已绑定手机</span>
            <div class="section-actions">
              <el-button type="default" size="small" :icon="Refresh" @click="refreshWorkPhoneStatus" :loading="refreshingStatus">
                刷新状态
              </el-button>
              <el-button type="primary" size="small" :icon="Plus" @click="showBindQRCode">
                绑定新手机
              </el-button>
            </div>
          </div>

          <div v-if="workPhones.length > 0" class="work-phones-list">
            <div v-for="phone in workPhones" :key="phone.id" class="phone-card">
              <div class="phone-info">
                <div class="phone-number">
                  <el-icon><Cellphone /></el-icon>
                  {{ phone.phoneNumber }}
                  <el-tag v-if="phone.isPrimary" type="success" size="small" style="margin-left: 8px;">主要</el-tag>
                </div>
                <div class="phone-meta">
                  <span>{{ phone.deviceName || '未知设备' }}</span>
                  <span v-if="phone.deviceModel"> · {{ phone.deviceModel }}</span>
                </div>
                <div class="phone-status">
                  <el-tag :type="phone.onlineStatus === 'online' ? 'success' : 'danger'" size="small">
                    {{ phone.onlineStatus === 'online' ? '在线' : '离线' }}
                  </el-tag>
                </div>
              </div>
              <div class="phone-actions">
                <el-button v-if="phone.onlineStatus !== 'online'" type="primary" link size="small" @click="showBindQRCode">
                  重新扫码
                </el-button>
                <el-button v-if="!phone.isPrimary" type="primary" link size="small" @click="setAsPrimary(phone)">
                  设为主要
                </el-button>
                <el-button type="danger" link size="small" @click="unbindPhone(phone)">解绑</el-button>
              </div>
            </div>
          </div>
          <el-empty v-else description="暂未绑定工作手机" />
        </div>
      </el-tab-pane>

      <!-- 我的外呼设置 (全员可见) -->
      <el-tab-pane label="我的设置" name="mySettings">
        <div class="config-section">
          <el-form :model="userPreference" label-width="140px">
            <el-form-item label="优先使用工作手机">
              <el-switch v-model="userPreference.preferMobile" />
              <div class="form-tip">开启后，有绑定的工作手机时优先使用工作手机拨打</div>
            </el-form-item>

            <el-form-item label="默认外呼线路">
              <el-select v-model="userPreference.defaultLineId" placeholder="请选择" clearable style="width: 300px">
                <el-option v-for="line in myAvailableLines" :key="line.id" :label="line.name" :value="line.id" />
              </el-select>
              <div class="form-tip">当不使用工作手机时，默认选择的外呼线路</div>
            </el-form-item>

            <el-form-item>
              <el-button type="primary" @click="saveUserPreference" :loading="savingPreference">
                保存设置
              </el-button>
            </el-form-item>
          </el-form>

          <el-divider content-position="left">我的可用线路</el-divider>
          <div v-if="myAvailableLines.length > 0" class="my-lines-list">
            <div v-for="line in myAvailableLines" :key="line.id" class="line-item">
              <div class="line-info">
                <span class="line-name">{{ line.name }}</span>
                <el-tag size="small" type="info">{{ getProviderText(line.provider) }}</el-tag>
                <el-tag v-if="line.isDefault" size="small" type="success">默认</el-tag>
              </div>
              <div class="line-meta">
                主叫号码: {{ line.callerNumber || '未设置' }}
              </div>
            </div>
          </div>
          <el-empty v-else description="暂无可用线路，请联系管理员分配" />
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 线路编辑弹窗 -->
    <el-dialog v-model="lineDialogVisible" :title="editingLine ? '编辑线路' : '添加线路'" width="600px" append-to-body>
      <el-form :model="lineForm" :rules="lineRules" ref="lineFormRef" label-width="120px">
        <el-form-item label="线路名称" prop="name">
          <el-input v-model="lineForm.name" placeholder="请输入线路名称" />
        </el-form-item>
        <el-form-item label="服务商" prop="provider">
          <el-select v-model="lineForm.provider" style="width: 100%" @change="onProviderChange">
            <el-option label="阿里云通信" value="aliyun" />
            <el-option label="腾讯云通信" value="tencent" />
            <el-option label="华为云通信" value="huawei" />
            <el-option label="自定义" value="custom" />
          </el-select>
        </el-form-item>
        <el-form-item label="线路类型" prop="type">
          <el-select v-model="lineForm.type" style="width: 100%">
            <el-option label="网络电话(VoIP)" value="voip" />
            <el-option label="传统电话(PSTN)" value="pstn" />
            <el-option label="SIP线路" value="sip" />
          </el-select>
        </el-form-item>

        <!-- 阿里云配置 -->
        <template v-if="lineForm.provider === 'aliyun'">
          <el-divider content-position="left">阿里云配置</el-divider>
          <el-form-item label="AccessKey ID">
            <el-input v-model="lineForm.config.accessKeyId" placeholder="请输入阿里云AccessKey ID" />
          </el-form-item>
          <el-form-item label="AccessKey Secret">
            <el-input v-model="lineForm.config.accessKeySecret" placeholder="请输入" type="password" show-password />
          </el-form-item>
          <el-form-item label="应用ID">
            <el-input v-model="lineForm.config.appId" placeholder="请输入语音通话应用ID" />
          </el-form-item>
        </template>

        <!-- 腾讯云配置 -->
        <template v-if="lineForm.provider === 'tencent'">
          <el-divider content-position="left">腾讯云配置</el-divider>
          <el-form-item label="SecretId">
            <el-input v-model="lineForm.config.secretId" placeholder="请输入腾讯云SecretId" />
          </el-form-item>
          <el-form-item label="SecretKey">
            <el-input v-model="lineForm.config.secretKey" placeholder="请输入" type="password" show-password />
          </el-form-item>
          <el-form-item label="应用ID">
            <el-input v-model="lineForm.config.appId" placeholder="请输入应用ID" />
          </el-form-item>
        </template>

        <!-- 华为云配置 -->
        <template v-if="lineForm.provider === 'huawei'">
          <el-divider content-position="left">华为云配置</el-divider>
          <el-form-item label="Access Key">
            <el-input v-model="lineForm.config.accessKey" placeholder="请输入华为云Access Key" />
          </el-form-item>
          <el-form-item label="Secret Key">
            <el-input v-model="lineForm.config.secretKey" placeholder="请输入" type="password" show-password />
          </el-form-item>
        </template>

        <!-- 自定义配置 -->
        <template v-if="lineForm.provider === 'custom'">
          <el-divider content-position="left">自定义配置</el-divider>
          <el-form-item label="API地址">
            <el-input v-model="lineForm.config.apiUrl" placeholder="请输入API地址" />
          </el-form-item>
          <el-form-item label="API密钥">
            <el-input v-model="lineForm.config.apiKey" placeholder="请输入API密钥" type="password" show-password />
          </el-form-item>
        </template>

        <el-divider content-position="left">基本设置</el-divider>
        <el-form-item label="主叫号码">
          <el-input v-model="lineForm.callerNumber" placeholder="客户接听时显示的号码" />
        </el-form-item>
        <el-form-item label="日呼叫限额">
          <el-input-number v-model="lineForm.dailyLimit" :min="0" :max="10000" style="width: 200px" />
        </el-form-item>
        <el-form-item label="最大并发">
          <el-input-number v-model="lineForm.maxConcurrent" :min="1" :max="100" style="width: 200px" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="lineForm.description" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="lineForm.isEnabled" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="lineDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveLine" :loading="savingLine">保存</el-button>
      </template>
    </el-dialog>

    <!-- 分配线路弹窗 -->
    <el-dialog v-model="assignDialogVisible" title="分配线路给用户" width="500px" append-to-body>
      <el-form :model="assignForm" :rules="assignRules" ref="assignFormRef" label-width="100px">
        <el-form-item label="选择用户" prop="userId">
          <el-select v-model="assignForm.userId" filterable placeholder="请选择用户" style="width: 100%" :loading="usersLoading">
            <el-option v-for="user in userList" :key="user.id" :label="user.realName || user.name" :value="user.id">
              <div style="display: flex; justify-content: space-between;">
                <span>{{ user.realName || user.name }}</span>
                <span style="color: #909399; font-size: 12px;">{{ user.departmentName }}</span>
              </div>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="选择线路" prop="lineId">
          <el-select v-model="assignForm.lineId" placeholder="请选择线路" style="width: 100%">
            <el-option v-for="line in enabledLines" :key="line.id" :label="line.name" :value="line.id">
              <div style="display: flex; justify-content: space-between;">
                <span>{{ line.name }}</span>
                <el-tag size="small">{{ getProviderText(line.provider) }}</el-tag>
              </div>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="主叫号码">
          <el-input v-model="assignForm.callerNumber" placeholder="可覆盖线路默认号码" />
        </el-form-item>
        <el-form-item label="日呼叫限额">
          <el-input-number v-model="assignForm.dailyLimit" :min="0" :max="1000" style="width: 100%" />
        </el-form-item>
        <el-form-item label="设为默认">
          <el-switch v-model="assignForm.isDefault" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="assignDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveAssignment" :loading="savingAssignment">确定分配</el-button>
      </template>
    </el-dialog>

    <!-- 绑定二维码弹窗 -->
    <el-dialog v-model="qrDialogVisible" title="扫码绑定工作手机" width="400px" append-to-body>
      <div class="qr-bind-content">
        <div v-if="qrCodeUrl" class="qr-code-wrapper">
          <img :src="qrCodeUrl" alt="绑定二维码" class="qr-code-img" />
          <div class="qr-status">
            <template v-if="bindStatus === 'pending'">
              <el-icon class="is-loading"><Loading /></el-icon>
              等待扫码...
            </template>
            <template v-else-if="bindStatus === 'connected'">
              <el-icon style="color: #67c23a;"><CircleCheckFilled /></el-icon>
              绑定成功！
            </template>
            <template v-else-if="bindStatus === 'expired'">
              <el-icon style="color: #f56c6c;"><WarningFilled /></el-icon>
              二维码已过期
            </template>
          </div>
        </div>
        <div v-else class="qr-loading">
          <el-icon class="is-loading" size="32"><Loading /></el-icon>
          <p>正在生成二维码...</p>
        </div>
        <div class="qr-tips">
          <p>1. 在工作手机上打开"外呼助手"APP</p>
          <p>2. 点击"扫码绑定"功能</p>
          <p>3. 扫描上方二维码完成绑定</p>
        </div>
      </div>
      <template #footer>
        <el-button v-if="bindStatus === 'expired'" type="primary" @click="refreshQRCode">
          重新生成
        </el-button>
        <el-button @click="qrDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </el-dialog>
</template>


<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Cellphone, Loading, CircleCheckFilled, WarningFilled, Refresh } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import * as callConfigApi from '@/api/callConfig'
import type { CallLine, UserLineAssignment, WorkPhone, UserCallPreference } from '@/api/callConfig'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const userStore = useUserStore()

// 计算属性
const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const isAdmin = computed(() => ['super_admin', 'admin'].includes(userStore.user?.role || ''))

// 标签页
const activeTab = ref(isAdmin.value ? 'lines' : 'workPhone')

// 加载状态
const linesLoading = ref(false)
const assignmentsLoading = ref(false)
const usersLoading = ref(false)
const savingGlobal = ref(false)
const testingVoip = ref(false)
const savingLine = ref(false)
const savingAssignment = ref(false)
const savingPreference = ref(false)
const refreshingStatus = ref(false)

// 数据
const callLines = ref<CallLine[]>([])
const assignments = ref<UserLineAssignment[]>([])
const workPhones = ref<WorkPhone[]>([])
const myAvailableLines = ref<any[]>([])
const userList = ref<any[]>([])

// 计算启用的线路
const enabledLines = computed(() => {
  const filtered = callLines.value.filter(line => line.isEnabled)
  console.log('[CallConfig] enabledLines:', filtered.length, 'from', callLines.value.length, 'total')
  return filtered
})

// 全局配置
const globalConfig = reactive({
  voipProvider: 'aliyun',
  aliyunConfig: {
    accessKeyId: '',
    accessKeySecret: '',
    appId: '',
    callerNumber: '',
    region: 'cn-hangzhou',
    enableRecording: false
  },
  tencentConfig: {
    secretId: '',
    secretKey: '',
    appId: ''
  },
  huaweiConfig: {
    accessKey: '',
    secretKey: ''
  }
})

// 用户偏好
const userPreference = reactive<UserCallPreference>({
  preferMobile: false,
  defaultLineId: undefined
})

// 线路编辑
const lineDialogVisible = ref(false)
const editingLine = ref<CallLine | null>(null)
const lineFormRef = ref()
const lineForm = reactive({
  name: '',
  provider: 'aliyun' as 'aliyun' | 'tencent' | 'huawei' | 'custom',
  type: 'voip' as 'voip' | 'pstn' | 'sip',
  callerNumber: '',
  dailyLimit: 1000,
  maxConcurrent: 10,
  description: '',
  isEnabled: true,
  config: {
    accessKeyId: '',
    accessKeySecret: '',
    appId: '',
    secretId: '',
    secretKey: '',
    accessKey: '',
    apiUrl: '',
    apiKey: ''
  }
})
const lineRules = {
  name: [{ required: true, message: '请输入线路名称', trigger: 'blur' }],
  provider: [{ required: true, message: '请选择服务商', trigger: 'change' }],
  type: [{ required: true, message: '请选择线路类型', trigger: 'change' }]
}

// 分配线路
const assignDialogVisible = ref(false)
const assignFormRef = ref()
const assignForm = reactive({
  userId: undefined as number | undefined,
  lineId: undefined as number | undefined,
  callerNumber: '',
  dailyLimit: 100,
  isDefault: false
})
const assignRules = {
  userId: [{ required: true, message: '请选择用户', trigger: 'change' }],
  lineId: [{ required: true, message: '请选择线路', trigger: 'change' }]
}

// 工作手机绑定
const qrDialogVisible = ref(false)
const qrCodeUrl = ref('')
const connectionId = ref('')
const bindStatus = ref<'pending' | 'connected' | 'expired'>('pending')
let bindCheckTimer: ReturnType<typeof setInterval> | null = null

// 方法
const getProviderText = (provider: string) => {
  const map: Record<string, string> = {
    aliyun: '阿里云',
    tencent: '腾讯云',
    huawei: '华为云',
    custom: '自定义',
    system: '系统'
  }
  return map[provider] || provider
}

// 切换服务商时清空配置
const onProviderChange = () => {
  // 清空所有配置字段
  lineForm.config.accessKeyId = ''
  lineForm.config.accessKeySecret = ''
  lineForm.config.appId = ''
  lineForm.config.secretId = ''
  lineForm.config.secretKey = ''
  lineForm.config.accessKey = ''
  lineForm.config.apiUrl = ''
  lineForm.config.apiKey = ''
}

// 加载数据
const loadData = async () => {
  console.log('[CallConfig] ========== loadData called ==========')
  console.log('[CallConfig] isAdmin:', isAdmin.value)
  console.log('[CallConfig] userStore.token:', userStore.token ? userStore.token.substring(0, 30) + '...' : 'EMPTY')

  if (isAdmin.value) {
    console.log('[CallConfig] Loading admin data...')
    // 并行加载所有数据，不要让一个失败影响其他
    Promise.all([
      loadCallLines().catch(e => console.error('loadCallLines error:', e)),
      loadAssignments().catch(e => console.error('loadAssignments error:', e)),
      loadGlobalConfig().catch(e => console.error('loadGlobalConfig error:', e)),
      loadUserList().catch(e => console.error('loadUserList error:', e))
    ])
  }

  console.log('[CallConfig] Loading common data (workPhones, myAvailableLines, userPreference)...')
  loadWorkPhones()
  loadMyAvailableLines()
  loadUserPreference()
}

const loadCallLines = async () => {
  console.log('[CallConfig] loadCallLines called')
  linesLoading.value = true
  try {
    const res = await callConfigApi.getCallLines()
    console.log('[CallConfig] getCallLines response:', res)
    console.log('[CallConfig] response type:', typeof res)
    console.log('[CallConfig] is array:', Array.isArray(res))

    // request.ts 响应拦截器已经提取了 data，所以 res 可能直接是数组
    if (Array.isArray(res)) {
      callLines.value = res as CallLine[]
      console.log('[CallConfig] callLines set from array:', callLines.value.length, 'items')
    } else if (res && (res as any).success !== undefined) {
      // 标准响应格式
      if ((res as any).success) {
        callLines.value = (res as any).data || []
        console.log('[CallConfig] callLines set from response.data:', callLines.value.length, 'items')
      } else {
        console.log('[CallConfig] getCallLines failed:', res)
      }
    } else if (res) {
      // 其他情况，尝试直接使用
      callLines.value = ((res as any).data || res || []) as CallLine[]
      console.log('[CallConfig] callLines set from fallback:', callLines.value.length, 'items')
    }
  } catch (e: any) {
    console.error('[CallConfig] 加载线路失败:', e.message || e)
  } finally {
    linesLoading.value = false
  }
}

const loadAssignments = async () => {
  assignmentsLoading.value = true
  try {
    const res = await callConfigApi.getLineAssignments()
    console.log('[CallConfig] getLineAssignments response:', res)
    // 处理不同的响应格式
    if (Array.isArray(res)) {
      assignments.value = res
    } else if (res && (res as any).success !== undefined) {
      assignments.value = (res as any).data || []
    } else if (res) {
      assignments.value = ((res as any).data || res || []) as UserLineAssignment[]
    }
    console.log('[CallConfig] assignments set to:', assignments.value.length, 'items')
  } catch (e) {
    console.error('加载分配失败:', e)
  } finally {
    assignmentsLoading.value = false
  }
}

const loadGlobalConfig = async () => {
  try {
    const res = await callConfigApi.getGlobalConfig()
    if (res.success && res.data) {
      const data = res.data as any
      if (data.voip_provider) globalConfig.voipProvider = data.voip_provider
      if (data.aliyun_config) Object.assign(globalConfig.aliyunConfig, data.aliyun_config)
      if (data.tencent_config) Object.assign(globalConfig.tencentConfig, data.tencent_config)
      if (data.huawei_config) Object.assign(globalConfig.huaweiConfig, data.huawei_config)
    }
  } catch (e) {
    console.error('加载全局配置失败:', e)
  }
}

const loadWorkPhones = async () => {
  try {
    const res = await callConfigApi.getMyWorkPhones()
    console.log('[CallConfig] loadWorkPhones response:', res)
    console.log('[CallConfig] loadWorkPhones raw data:', JSON.stringify(res))

    // request.ts 响应拦截器返回的是 data
    let phones: any[] = []

    if (Array.isArray(res)) {
      phones = res
      console.log('[CallConfig] workPhones from array:', phones.length)
    } else if (res && (res as any).success !== undefined) {
      phones = (res as any).data || []
      console.log('[CallConfig] workPhones from success response:', phones.length)
    } else if (res) {
      phones = (res as unknown as any[]) || []
      console.log('[CallConfig] workPhones from other:', phones.length)
    }

    // 🔥 修复：确保每个手机对象都有正确的 id 字段
    workPhones.value = phones.map((p: any, index: number) => {
      const phone = {
        id: p.id,  // 数据库自增 ID
        phoneNumber: p.phoneNumber || p.phone_number,
        deviceName: p.deviceName || p.device_name,
        deviceModel: p.deviceModel || p.device_model,
        onlineStatus: p.onlineStatus || p.online_status || 'offline',
        isPrimary: p.isPrimary || p.is_primary === 1,
        lastActiveAt: p.lastActiveAt || p.last_active_at
      }
      console.log(`[CallConfig] 映射手机 ${index}:`, phone)
      return phone
    })

    console.log('[CallConfig] workPhones 最终数据:', workPhones.value)
  } catch (e) {
    console.error('加载工作手机失败:', e)
  }
}

// 刷新工作手机状态
const refreshWorkPhoneStatus = async () => {
  refreshingStatus.value = true
  try {
    await loadWorkPhones()
    ElMessage.success('状态已刷新')
  } catch (_e) {
    ElMessage.error('刷新失败')
  } finally {
    refreshingStatus.value = false
  }
}

const loadMyAvailableLines = async () => {
  try {
    console.log('[CallConfig] loadMyAvailableLines called')
    const res = await callConfigApi.getMyAvailableLines()
    console.log('[CallConfig] loadMyAvailableLines response:', res)
    console.log('[CallConfig] loadMyAvailableLines response type:', typeof res)
    console.log('[CallConfig] loadMyAvailableLines assignedLines:', (res as any)?.assignedLines)
    // request.ts 响应拦截器返回的是 data，所以 res 可能直接是 {assignedLines, workPhones, hasAvailableMethod}
    if (res && (res as any).assignedLines !== undefined) {
      myAvailableLines.value = (res as any).assignedLines || []
      console.log('[CallConfig] myAvailableLines set to:', myAvailableLines.value.length, 'items')
    } else if (res && (res as any).success && (res as any).data) {
      // 兼容完整响应格式
      myAvailableLines.value = (res as any).data.assignedLines || []
      console.log('[CallConfig] myAvailableLines set from data:', myAvailableLines.value.length, 'items')
    } else {
      console.log('[CallConfig] loadMyAvailableLines: unexpected response format')
    }
  } catch (e) {
    console.error('加载可用线路失败:', e)
  }
}

const loadUserPreference = async () => {
  try {
    const res = await callConfigApi.getUserPreference()
    console.log('[CallConfig] loadUserPreference response:', res)
    // request.ts 响应拦截器返回的是 data
    if (res && (res as any).preferMobile !== undefined) {
      Object.assign(userPreference, res)
    } else if (res && (res as any).success && (res as any).data) {
      Object.assign(userPreference, (res as any).data)
    }
  } catch (e) {
    console.error('加载用户偏好失败:', e)
  }
}

const loadUserList = async () => {
  usersLoading.value = true
  try {
    console.log('[CallConfig] loadUserList called')
    const res = await fetch('/api/v1/users?pageSize=1000', {
      headers: {
        'Authorization': `Bearer ${userStore.token}`
      }
    })
    const data = await res.json()
    console.log('[CallConfig] loadUserList response:', data)

    if (data.success && data.data) {
      // API 返回的是 data.data.items 或 data.data.users
      userList.value = data.data.items || data.data.users || []
      console.log('[CallConfig] userList set to:', userList.value.length, 'users')
    }
  } catch (e) {
    console.error('[CallConfig] 加载用户列表失败:', e)
  } finally {
    usersLoading.value = false
  }
}


// 线路管理
const openLineDialog = (line?: CallLine) => {
  editingLine.value = line || null
  if (line) {
    lineForm.name = line.name
    lineForm.provider = line.provider
    lineForm.type = line.type
    lineForm.callerNumber = line.callerNumber || ''
    lineForm.dailyLimit = line.dailyLimit
    lineForm.maxConcurrent = line.maxConcurrent
    lineForm.description = line.description || ''
    lineForm.isEnabled = line.isEnabled
    // 处理配置
    const cfg = line.config || {}
    lineForm.config.accessKeyId = cfg.accessKeyId || ''
    lineForm.config.accessKeySecret = cfg.accessKeySecret || ''
    lineForm.config.appId = cfg.appId || ''
    lineForm.config.secretId = cfg.secretId || ''
    lineForm.config.secretKey = cfg.secretKey || ''
    lineForm.config.accessKey = cfg.accessKey || ''
    lineForm.config.apiUrl = cfg.apiUrl || ''
    lineForm.config.apiKey = cfg.apiKey || ''
  } else {
    // 重置表单
    lineForm.name = ''
    lineForm.provider = 'aliyun'
    lineForm.type = 'voip'
    lineForm.callerNumber = ''
    lineForm.dailyLimit = 1000
    lineForm.maxConcurrent = 10
    lineForm.description = ''
    lineForm.isEnabled = true
    lineForm.config.accessKeyId = ''
    lineForm.config.accessKeySecret = ''
    lineForm.config.appId = ''
    lineForm.config.secretId = ''
    lineForm.config.secretKey = ''
    lineForm.config.accessKey = ''
    lineForm.config.apiUrl = ''
    lineForm.config.apiKey = ''
  }
  lineDialogVisible.value = true
}

const saveLine = async () => {
  try {
    await lineFormRef.value?.validate()
    savingLine.value = true

    // 根据服务商构建配置
    let config: Record<string, any> = {}
    if (lineForm.provider === 'aliyun') {
      config = {
        accessKeyId: lineForm.config.accessKeyId,
        accessKeySecret: lineForm.config.accessKeySecret,
        appId: lineForm.config.appId
      }
    } else if (lineForm.provider === 'tencent') {
      config = {
        secretId: lineForm.config.secretId,
        secretKey: lineForm.config.secretKey,
        appId: lineForm.config.appId
      }
    } else if (lineForm.provider === 'huawei') {
      config = {
        accessKey: lineForm.config.accessKey,
        secretKey: lineForm.config.secretKey
      }
    } else if (lineForm.provider === 'custom') {
      config = {
        apiUrl: lineForm.config.apiUrl,
        apiKey: lineForm.config.apiKey
      }
    }

    const data = {
      name: lineForm.name,
      provider: lineForm.provider as 'aliyun' | 'tencent' | 'huawei' | 'custom',
      type: lineForm.type as 'voip' | 'pstn' | 'sip',
      callerNumber: lineForm.callerNumber,
      dailyLimit: lineForm.dailyLimit,
      maxConcurrent: lineForm.maxConcurrent,
      description: lineForm.description,
      isEnabled: lineForm.isEnabled,
      config
    }

    if (editingLine.value) {
      await callConfigApi.updateCallLine(editingLine.value.id, data)
      ElMessage.success('线路更新成功')
    } else {
      await callConfigApi.createCallLine(data)
      ElMessage.success('线路创建成功')
    }
    lineDialogVisible.value = false
    loadCallLines()
  } catch (e: any) {
    if (e !== 'cancel' && e?.message) {
      ElMessage.error(e.message || '保存失败')
    }
  } finally {
    savingLine.value = false
  }
}

const toggleLineStatus = async (line: CallLine) => {
  try {
    await callConfigApi.updateCallLine(line.id, { isEnabled: line.isEnabled })
    ElMessage.success(line.isEnabled ? '线路已启用' : '线路已禁用')
  } catch (_e) {
    line.isEnabled = !line.isEnabled
    ElMessage.error('操作失败')
  }
}

const deleteLine = async (line: CallLine) => {
  try {
    await ElMessageBox.confirm(`确定要删除线路"${line.name}"吗？`, '确认删除', { type: 'warning' })
    await callConfigApi.deleteCallLine(line.id)
    ElMessage.success('删除成功')
    loadCallLines()
  } catch (e: any) {
    if (e !== 'cancel' && e?.message) {
      ElMessage.error(e.message || '删除失败')
    }
  }
}

// 分配管理
const openAssignDialog = () => {
  assignForm.userId = undefined
  assignForm.lineId = undefined
  assignForm.callerNumber = ''
  assignForm.dailyLimit = 100
  assignForm.isDefault = false
  assignDialogVisible.value = true
}

const saveAssignment = async () => {
  try {
    await assignFormRef.value?.validate()
    savingAssignment.value = true
    await callConfigApi.assignLineToUser({
      userId: assignForm.userId!,
      lineId: assignForm.lineId!,
      callerNumber: assignForm.callerNumber || undefined,
      dailyLimit: assignForm.dailyLimit,
      isDefault: assignForm.isDefault
    })
    ElMessage.success('分配成功')
    assignDialogVisible.value = false
    loadAssignments()
  } catch (e: any) {
    if (e !== 'cancel' && e?.message) {
      ElMessage.error(e.message || '分配失败')
    }
  } finally {
    savingAssignment.value = false
  }
}

const removeAssignment = async (assignment: UserLineAssignment) => {
  try {
    await ElMessageBox.confirm(`确定要取消${assignment.userName}的线路分配吗？`, '确认取消', { type: 'warning' })
    await callConfigApi.removeLineAssignment(assignment.id)
    ElMessage.success('已取消分配')
    loadAssignments()
  } catch (e: any) {
    if (e !== 'cancel' && e?.message) {
      ElMessage.error(e.message || '操作失败')
    }
  }
}

// 全局配置
const saveGlobalConfig = async () => {
  savingGlobal.value = true
  try {
    const config: Record<string, any> = {
      voip_provider: globalConfig.voipProvider
    }
    if (globalConfig.voipProvider === 'aliyun') {
      config.aliyun_config = globalConfig.aliyunConfig
    } else if (globalConfig.voipProvider === 'tencent') {
      config.tencent_config = globalConfig.tencentConfig
    } else if (globalConfig.voipProvider === 'huawei') {
      config.huawei_config = globalConfig.huaweiConfig
    }
    await callConfigApi.updateGlobalConfig(config)
    ElMessage.success('配置已保存')
  } catch (e: any) {
    ElMessage.error(e.message || '保存失败')
  } finally {
    savingGlobal.value = false
  }
}

const testVoipConnection = async () => {
  if (globalConfig.voipProvider === 'aliyun') {
    if (!globalConfig.aliyunConfig.accessKeyId || !globalConfig.aliyunConfig.accessKeySecret || !globalConfig.aliyunConfig.appId) {
      ElMessage.warning('请先填写阿里云 AccessKey ID、AccessKey Secret 和应用ID')
      return
    }
  } else if (globalConfig.voipProvider === 'tencent') {
    if (!globalConfig.tencentConfig.secretId || !globalConfig.tencentConfig.secretKey || !globalConfig.tencentConfig.appId) {
      ElMessage.warning('请先填写腾讯云 SecretId、SecretKey 和应用ID')
      return
    }
  } else if (globalConfig.voipProvider === 'huawei') {
    if (!globalConfig.huaweiConfig.accessKey || !globalConfig.huaweiConfig.secretKey) {
      ElMessage.warning('请先填写华为云 Access Key 和 Secret Key')
      return
    }
  }

  testingVoip.value = true
  try {
    await new Promise(resolve => setTimeout(resolve, 1000))
    ElMessage.success('配置格式验证通过，请保存后进行实际通话测试')
  } catch (_e) {
    ElMessage.error('连接测试失败')
  } finally {
    testingVoip.value = false
  }
}

// 用户偏好
const saveUserPreference = async () => {
  savingPreference.value = true
  try {
    await callConfigApi.updateUserPreference(userPreference)
    ElMessage.success('设置已保存')
  } catch (e: any) {
    ElMessage.error(e.message || '保存失败')
  } finally {
    savingPreference.value = false
  }
}


// 工作手机
const showBindQRCode = async () => {
  qrDialogVisible.value = true
  qrCodeUrl.value = ''
  bindStatus.value = 'pending'
  await generateQRCode()
}

const generateQRCode = async () => {
  try {
    const res = await callConfigApi.generateWorkPhoneQRCode()
    console.log('[CallConfig] generateQRCode response:', res)
    // request.ts 返回的是 data，所以 res 直接是 {qrCodeUrl, connectionId, expiresAt}
    if (res && (res as any).qrCodeUrl) {
      qrCodeUrl.value = (res as any).qrCodeUrl
      connectionId.value = (res as any).connectionId
      startBindCheck()
    } else if (res && (res as any).success && (res as any).data) {
      // 兼容完整响应格式
      qrCodeUrl.value = (res as any).data.qrCodeUrl
      connectionId.value = (res as any).data.connectionId
      startBindCheck()
    } else {
      ElMessage.error('生成二维码失败')
    }
  } catch (_e) {
    console.error('[CallConfig] generateQRCode error:', _e)
    ElMessage.error('生成二维码失败')
  }
}

const refreshQRCode = () => {
  stopBindCheck()
  generateQRCode()
}

const startBindCheck = () => {
  stopBindCheck()
  bindCheckTimer = setInterval(async () => {
    try {
      const res = await callConfigApi.checkWorkPhoneBindStatus(connectionId.value)
      console.log('[CallConfig] checkWorkPhoneBindStatus response:', res)
      // 处理不同的响应格式
      const status = (res as any).status || ((res as any).data?.status)
      if (status) {
        bindStatus.value = status
        if (status === 'connected') {
          stopBindCheck()
          ElMessage.success('绑定成功')
          loadWorkPhones()
          setTimeout(() => {
            qrDialogVisible.value = false
          }, 1500)
        } else if (status === 'expired') {
          stopBindCheck()
        }
      }
    } catch (_e) {
      console.error('检查绑定状态失败:', _e)
    }
  }, 2000)
}

const stopBindCheck = () => {
  if (bindCheckTimer) {
    clearInterval(bindCheckTimer)
    bindCheckTimer = null
  }
}

const setAsPrimary = async (phone: WorkPhone) => {
  try {
    await callConfigApi.setPrimaryWorkPhone(phone.id)
    ElMessage.success('已设为主要手机')
    loadWorkPhones()
  } catch (e: any) {
    ElMessage.error(e.message || '操作失败')
  }
}

const unbindPhone = async (phone: WorkPhone) => {
  try {
    console.log('[unbindPhone] phone:', phone)
    console.log('[unbindPhone] phone.id:', phone.id, 'type:', typeof phone.id)

    // 🔥 修复：确保 phone.id 存在
    if (!phone.id && phone.id !== 0) {
      console.error('[unbindPhone] phone.id 为空，无法解绑')
      ElMessage.error('手机ID无效，无法解绑')
      return
    }

    await ElMessageBox.confirm(`确定要解绑手机 ${phone.phoneNumber} 吗？`, '确认解绑', { type: 'warning' })

    // 🔥 修复：确保传递正确的 ID
    const phoneId = phone.id
    console.log('[unbindPhone] 调用API解绑，phoneId:', phoneId)

    await callConfigApi.unbindWorkPhone(phoneId)
    ElMessage.success('解绑成功')
    loadWorkPhones()
  } catch (e: any) {
    if (e !== 'cancel' && e?.message) {
      console.error('[unbindPhone] 解绑失败:', e)
      ElMessage.error(e.message || '解绑失败')
    }
  }
}

const handleClose = () => {
  stopBindCheck()
}

// 监听弹窗打开
watch(visible, (val) => {
  if (val) {
    loadData()
  } else {
    stopBindCheck()
  }
})

onMounted(() => {
  if (visible.value) {
    loadData()
  }
})
</script>

<style scoped lang="scss">
.config-section {
  padding: 16px;

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;

    .section-title {
      font-size: 15px;
      font-weight: 500;
      color: #303133;
    }

    .section-actions {
      display: flex;
      gap: 8px;
    }
  }
}

.form-tip {
  color: #909399;
  font-size: 12px;
  margin-top: 4px;
}

.work-phones-list {
  .phone-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    border: 1px solid #ebeef5;
    border-radius: 8px;
    margin-bottom: 12px;

    &:hover {
      border-color: #409eff;
      background: #f5f7fa;
    }

    .phone-info {
      .phone-number {
        font-size: 16px;
        font-weight: 500;
        color: #303133;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .phone-meta {
        font-size: 13px;
        color: #909399;
        margin-top: 4px;
      }

      .phone-status {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-top: 8px;
      }
    }

    .phone-actions {
      display: flex;
      gap: 8px;
    }
  }
}

.my-lines-list {
  .line-item {
    padding: 12px 16px;
    border: 1px solid #ebeef5;
    border-radius: 6px;
    margin-bottom: 8px;

    .line-info {
      display: flex;
      align-items: center;
      gap: 8px;

      .line-name {
        font-weight: 500;
        color: #303133;
      }
    }

    .line-meta {
      font-size: 13px;
      color: #909399;
      margin-top: 4px;
    }
  }
}

.qr-bind-content {
  text-align: center;

  .qr-code-wrapper {
    .qr-code-img {
      width: 200px;
      height: 200px;
      border: 1px solid #ebeef5;
      border-radius: 8px;
    }

    .qr-status {
      margin-top: 12px;
      font-size: 14px;
      color: #606266;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
  }

  .qr-loading {
    padding: 40px;
    color: #909399;

    p {
      margin-top: 12px;
    }
  }

  .qr-tips {
    margin-top: 20px;
    padding: 12px;
    background: #f5f7fa;
    border-radius: 6px;
    text-align: left;
    font-size: 13px;
    color: #606266;

    p {
      margin: 4px 0;
    }
  }
}
</style>
