<template>
  <div class="wecom-config">
    <!-- 配额显示 -->
    <div class="quota-bar" v-if="configList.length > 0">
      <span class="quota-label">企微配额</span>
      <el-progress
        :percentage="quotaPercent"
        :stroke-width="14"
        :text-inside="true"
        :color="quotaPercent >= 100 ? '#EF4444' : quotaPercent >= 70 ? '#F59E0B' : '#10B981'"
        :format="() => `${currentQuota.used}/${currentQuota.max}`"
        style="width: 160px"
      />
      <el-button size="small" type="primary" text @click="handleQuotaUpgrade">增购</el-button>
    </div>

    <el-card>
      <template #header>
        <WecomHeader tab-name="config">
          企微授权
          <template #actions>
            <el-button type="success" @click="showAuthGuide = true">
              <el-icon><Connection /></el-icon>扫码授权
            </el-button>
            <el-button v-if="allowSelfBuild" type="primary" @click="handleAdd" :disabled="quotaPercent >= 100">
              <el-icon><Plus /></el-icon>自建应用
            </el-button>
          </template>
        </WecomHeader>
      </template>

      <el-tabs v-model="activeTab">
        <!-- Tab 1: 基础配置 -->
        <el-tab-pane label="基础配置" name="basic">
          <!-- 接入方式引导(无配置时显示) -->
          <div class="auth-mode-cards" v-if="configList.length === 0">
            <div class="auth-mode-card-sm recommended" @click="showAuthGuide = true">
              <div class="auth-mode-badge">推荐</div>
              <div class="auth-mode-icon">🔐</div>
              <div class="auth-mode-title">第三方应用授权</div>
              <div class="auth-mode-desc">扫码即可完成授权，无需手动填写</div>
              <el-button type="success" size="small">开始授权</el-button>
            </div>
            <div v-if="allowSelfBuild" class="auth-mode-card-sm" @click="handleAdd">
              <div class="auth-mode-icon">🔧</div>
              <div class="auth-mode-title">自建应用配置</div>
              <div class="auth-mode-desc">手动填写CorpID和Secret</div>
              <el-button type="primary" size="small" plain>手动配置</el-button>
            </div>
          </div>

          <!-- 已授权企业列表 -->
          <template v-if="configList.length > 0">
            <div class="basic-view-toggle">
              <el-radio-group v-model="basicViewMode" size="small">
                <el-radio-button label="card"><el-icon style="margin-right: 4px"><Grid /></el-icon>卡片</el-radio-button>
                <el-radio-button label="list"><el-icon style="margin-right: 4px"><List /></el-icon>列表</el-radio-button>
              </el-radio-group>
            </div>

            <!-- 卡片视图 -->
            <div v-if="basicViewMode === 'card'" class="config-card-grid">
              <div v-for="row in configList" :key="row.id" class="config-card" :class="{ 'config-card--disabled': !row.isEnabled }">
                <div class="config-card__header">
                  <div class="config-card__name">
                    <span>{{ row.name || '未命名企业' }}</span>
                    <el-tag :type="row.authType === 'third_party' ? 'warning' : 'primary'" size="small">
                      {{ row.authType === 'third_party' ? '第三方授权' : '自建应用' }}
                    </el-tag>
                  </div>
                  <el-switch v-model="row.isEnabled" size="small" @change="handleToggle(row)" />
                </div>
                <div class="config-card__body">
                  <div class="config-card__info-row">
                    <span class="config-card__label">企业ID</span>
                    <span class="mono">{{ row.corpId }}</span>
                  </div>
                  <div class="config-card__info-row" v-if="row.agentId">
                    <span class="config-card__label">AgentID</span>
                    <span>{{ row.agentId }}</span>
                  </div>
                  <div class="config-card__info-row">
                    <span class="config-card__label">连接状态</span>
                    <el-tag :type="getStatusType(row.connectionStatus)" size="small" effect="light" round>
                      {{ getStatusText(row.connectionStatus) }}
                    </el-tag>
                  </div>
                  <div class="config-card__info-row">
                    <span class="config-card__label">授权人</span>
                    <span>{{ row.bindOperator || '-' }}</span>
                  </div>
                  <div class="config-card__info-row">
                    <span class="config-card__label">授权时间</span>
                    <span>{{ formatDate(row.authTime || row.bindTime) }}</span>
                  </div>
                  <div class="config-card__info-row">
                    <span class="config-card__label">API调用</span>
                    <span>{{ row.apiCallCount || 0 }}次 · 最后{{ formatDate(row.lastApiCallTime) }}</span>
                  </div>
                </div>
                <div class="config-card__footer">
                  <el-button type="success" link size="small" @click="handleTest(row)">
                    <el-icon><Connection /></el-icon>测试
                  </el-button>
                  <el-button type="primary" link size="small" @click="handleEdit(row)">
                    <el-icon><Edit /></el-icon>编辑
                  </el-button>
                  <el-button type="info" link size="small" @click="handleViewDetail(row)">
                    详情
                  </el-button>
                  <el-button type="danger" link size="small" @click="handleDelete(row)">
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </div>
              </div>
            </div>

            <!-- 列表视图 -->
            <el-table v-else :data="configList" stripe border v-loading="loading">
              <el-table-column label="企业名称" min-width="160">
                <template #default="{ row }">
                  <div style="display: flex; align-items: center; gap: 8px">
                    <span style="font-weight: 600">{{ row.name || '未命名企业' }}</span>
                    <el-tag :type="row.authType === 'third_party' ? 'warning' : 'primary'" size="small">
                      {{ row.authType === 'third_party' ? '第三方授权' : '自建应用' }}
                    </el-tag>
                  </div>
                </template>
              </el-table-column>
              <el-table-column label="企业ID" width="200">
                <template #default="{ row }">
                  <span class="mono">{{ row.corpId }}</span>
                </template>
              </el-table-column>
              <el-table-column label="AgentID" width="100">
                <template #default="{ row }">{{ row.agentId || '-' }}</template>
              </el-table-column>
              <el-table-column label="连接状态" width="100" align="center">
                <template #default="{ row }">
                  <el-tag :type="getStatusType(row.connectionStatus)" size="small" effect="light" round>
                    {{ getStatusText(row.connectionStatus) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="启用" width="70" align="center">
                <template #default="{ row }">
                  <el-switch v-model="row.isEnabled" size="small" @change="handleToggle(row)" />
                </template>
              </el-table-column>
              <el-table-column label="授权人" width="90">
                <template #default="{ row }">{{ row.bindOperator || '-' }}</template>
              </el-table-column>
              <el-table-column label="授权时间" width="160">
                <template #default="{ row }">{{ formatDate(row.authTime || row.bindTime) }}</template>
              </el-table-column>
              <el-table-column label="最后调用" width="160">
                <template #default="{ row }">{{ formatDate(row.lastApiCallTime) }}</template>
              </el-table-column>
              <el-table-column label="API调用" width="80" align="center">
                <template #default="{ row }">{{ row.apiCallCount || 0 }}</template>
              </el-table-column>
              <el-table-column label="操作" width="220" fixed="right">
                <template #default="{ row }">
                  <el-button type="success" link size="small" @click="handleTest(row)">
                    <el-icon><Connection /></el-icon>测试
                  </el-button>
                  <el-button type="primary" link size="small" @click="handleEdit(row)">
                    <el-icon><Edit /></el-icon>编辑
                  </el-button>
                  <el-button type="info" link size="small" @click="handleViewDetail(row)">
                    详情
                  </el-button>
                  <el-button type="danger" link size="small" @click="handleDelete(row)">
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </template>
        </el-tab-pane>

        <!-- Tab 2: Secret管理 (仅自建应用需要) -->
        <el-tab-pane label="Secret管理" name="secret">
          <el-alert v-if="hasThirdPartyOnly" type="success" :closable="false" style="margin-bottom: 16px">
            <template #title>当前为<strong>第三方应用授权</strong>模式</template>
            第三方应用授权自动获取所需权限，无需手动管理Secret。如需配置额外API（如通讯录同步、会话存档），可在此处补充。
          </el-alert>
          <ConfigSecretManager :config-id="selectedConfigId" :config-name="selectedConfigName" :corp-id="selectedCorpId" />
        </el-tab-pane>

        <!-- Tab 3: 回调配置 -->
        <el-tab-pane label="回调配置" name="callback">
          <ConfigCallbackManager :config-id="selectedConfigId" />
        </el-tab-pane>

        <!-- Tab 4: 功能授权 -->
        <el-tab-pane label="功能授权" name="feature">
          <ConfigFeatureAuth :config-id="selectedConfigId" />
        </el-tab-pane>

        <!-- Tab 5: API诊断 -->
        <el-tab-pane label="API诊断" name="diagnostic">
          <ConfigApiDiagnostic :config-id="selectedConfigId" />
        </el-tab-pane>

        <!-- Tab 6: 企微套餐 -->
        <el-tab-pane label="企微套餐" name="package">
          <PackagePurchaseTab type="wecom" />
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- ========== 扫码授权引导弹窗 ========== -->
    <el-dialog v-model="showAuthGuide" title="企业微信扫码授权" width="600px" :close-on-click-modal="false">
      <div class="auth-guide-content">
        <el-steps :active="authStep" align-center finish-status="success" style="margin-bottom: 24px;">
          <el-step title="生成授权链接" />
          <el-step title="扫码确认" />
          <el-step title="授权完成" />
        </el-steps>

        <!-- Step 0: 生成二维码 -->
        <div v-if="authStep === 0" class="auth-step-content">
          <div class="qr-section">
            <div class="qr-placeholder" v-loading="loadingQr">
              <img v-if="authQrUrl" :src="authQrUrl" alt="授权二维码" class="qr-image" />
              <div v-else class="qr-empty">
                <el-icon :size="48" color="#dcdfe6"><Picture /></el-icon>
                <p>点击下方按钮生成授权二维码</p>
              </div>
            </div>
            <el-button v-if="!authQrUrl" type="success" size="large" @click="generateAuthQr" :loading="loadingQr">
              生成授权二维码
            </el-button>
            <div v-else style="display: flex; gap: 8px; justify-content: center">
              <el-button type="primary" @click="authStep = 1">已扫码，下一步</el-button>
              <el-button plain @click="generateAuthQr" :loading="loadingQr">刷新二维码</el-button>
            </div>
          </div>
          <div class="auth-tips">
            <h4>📋 操作步骤</h4>
            <ol>
              <li>点击按钮生成企业微信第三方应用授权二维码</li>
              <li>使用<strong>企业微信管理员</strong>手机APP扫描二维码</li>
              <li>在手机端选择授权范围（部门/人员），点击「同意授权」</li>
              <li>授权完成后点击「已扫码，下一步」确认</li>
            </ol>
            <el-alert type="warning" :closable="false" show-icon style="margin-top: 12px;">
              <template #title>仅企业微信<strong>超级管理员</strong>或<strong>应用管理员</strong>可完成授权</template>
            </el-alert>
          </div>
        </div>

        <!-- Step 1: 等待确认 -->
        <div v-if="authStep === 1" class="auth-step-content">
          <el-result icon="info" title="等待授权确认" sub-title="请确认已在企业微信手机端完成以下授权">
            <template #extra>
              <div class="auth-scope-list">
                <div class="scope-item">✅ 通讯录管理 — 读取部门和成员列表</div>
                <div class="scope-item">✅ 客户联系 — 管理外部联系人和客户群</div>
                <div class="scope-item">✅ 客户群管理 — 读取客户群列表和成员</div>
                <div class="scope-item">✅ 应用消息 — 发送应用通知消息</div>
                <div class="scope-item">⚡ 会话存档 — 需额外开通(可选增值服务)</div>
                <div class="scope-item">💰 对外收款 — 需在后台单独授权(可选)</div>
              </div>
              <div style="display: flex; gap: 10px">
                <el-button @click="authStep = 0">返回上一步</el-button>
                <el-button type="primary" size="large" :loading="checkingAuth" @click="checkAuthResult">
                  确认已完成授权
                </el-button>
              </div>
            </template>
          </el-result>
        </div>

        <!-- Step 2: 授权完成 -->
        <div v-if="authStep === 2" class="auth-step-content">
          <el-result icon="success" title="🎉 授权成功！" sub-title="企业微信已成功接入系统">
            <template #extra>
              <div v-if="authResult" class="auth-result-info">
                <el-descriptions :column="1" border size="small">
                  <el-descriptions-item label="企业名称">{{ authResult.corpName || '-' }}</el-descriptions-item>
                  <el-descriptions-item label="企业ID">
                    <span class="mono">{{ authResult.corpId || '-' }}</span>
                  </el-descriptions-item>
                  <el-descriptions-item label="授权管理员">{{ authResult.authUserName || '-' }}</el-descriptions-item>
                  <el-descriptions-item label="授权类型">
                    <el-tag type="warning" size="small">第三方应用授权</el-tag>
                  </el-descriptions-item>
                </el-descriptions>
              </div>
              <el-button type="primary" size="large" @click="finishAuth">完成，开始使用</el-button>
            </template>
          </el-result>
        </div>
      </div>
    </el-dialog>

    <!-- ========== 企业详情抽屉 ========== -->
    <el-drawer v-model="detailVisible" title="企微主体详情" size="520px">
      <template v-if="detailRow">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="企业名称">{{ detailRow.name }}</el-descriptions-item>
          <el-descriptions-item label="企业ID"><span class="mono">{{ detailRow.corpId }}</span></el-descriptions-item>
          <el-descriptions-item label="授权类型">
            <el-tag :type="detailRow.authType === 'third_party' ? 'warning' : 'primary'" size="small">
              {{ detailRow.authType === 'third_party' ? '第三方应用授权' : '自建应用' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="AgentID">{{ detailRow.agentId || '-' }}</el-descriptions-item>
          <el-descriptions-item label="连接状态">
            <el-tag :type="getStatusType(detailRow.connectionStatus)">{{ getStatusText(detailRow.connectionStatus) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="启用状态">
            <el-tag :type="detailRow.isEnabled ? 'success' : 'info'">{{ detailRow.isEnabled ? '已启用' : '已禁用' }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="授权人">{{ detailRow.bindOperator || '-' }}</el-descriptions-item>
          <el-descriptions-item label="授权时间">{{ formatDate(detailRow.authTime || detailRow.bindTime) }}</el-descriptions-item>
          <el-descriptions-item label="最后API调用">{{ formatDate(detailRow.lastApiCallTime) }}</el-descriptions-item>
          <el-descriptions-item label="API总调用次数">{{ detailRow.apiCallCount || 0 }}</el-descriptions-item>
          <el-descriptions-item label="最后错误">
            <span v-if="detailRow.lastError" style="color: #EF4444">{{ detailRow.lastError }}</span>
            <span v-else style="color: #10B981">无</span>
          </el-descriptions-item>
          <el-descriptions-item label="备注">{{ detailRow.remark || '-' }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDate(detailRow.createdAt) }}</el-descriptions-item>
        </el-descriptions>

        <div style="margin-top: 20px">
          <h4 style="margin-bottom: 12px; color: #303133">Secret配置状态</h4>
          <div class="secret-status-list">
            <div class="secret-status-item">
              <span>应用Secret</span>
              <el-tag :type="detailRow.corpSecret ? 'success' : 'danger'" size="small">{{ detailRow.corpSecret ? '已配置' : '未配置' }}</el-tag>
            </div>
            <div class="secret-status-item">
              <span>通讯录Secret</span>
              <el-tag :type="detailRow.contactSecret ? 'success' : 'info'" size="small">{{ detailRow.contactSecret ? '已配置' : '未配置' }}</el-tag>
            </div>
            <div class="secret-status-item">
              <span>客户联系Secret</span>
              <el-tag :type="detailRow.externalContactSecret ? 'success' : 'info'" size="small">{{ detailRow.externalContactSecret ? '已配置' : '未配置' }}</el-tag>
            </div>
            <div class="secret-status-item">
              <span>会话存档Secret</span>
              <el-tag :type="detailRow.chatArchiveSecret ? 'success' : 'info'" size="small">{{ detailRow.chatArchiveSecret ? '已配置' : '未配置' }}</el-tag>
            </div>
            <div class="secret-status-item">
              <span>回调配置</span>
              <el-tag :type="detailRow.callbackToken ? 'success' : 'info'" size="small">{{ detailRow.callbackToken ? '已配置' : '未配置' }}</el-tag>
            </div>
          </div>
        </div>
      </template>
    </el-drawer>

    <!-- ========== 新增/编辑配置对话框 ========== -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑配置' : '新增自建应用配置'" width="650px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="120px">
        <el-form-item label="配置名称" prop="name">
          <el-input v-model="form.name" placeholder="如：云客CRM主体" />
          <div class="form-tip">自定义名称，便于区分多个企业主体</div>
        </el-form-item>
        <el-form-item label="企业ID" prop="corpId">
          <el-input v-model="form.corpId" placeholder="如：wwef39016ab6decd65" :disabled="isEdit" />
          <div class="form-tip">企业微信管理后台 → 我的企业 → 企业信息 → 企业ID</div>
        </el-form-item>
        <el-form-item label="应用Secret" prop="corpSecret">
          <el-input v-model="form.corpSecret" type="password" show-password placeholder="应用Secret" />
          <div class="form-tip">应用管理 → 自建应用 → 点击应用 → Secret</div>
        </el-form-item>
        <el-form-item label="应用ID">
          <el-input-number v-model="form.agentId" :min="0" :controls="false" placeholder="如：1000013" style="width: 100%" />
          <div class="form-tip">应用管理 → 自建应用 → AgentId</div>
        </el-form-item>
        <el-divider content-position="left">回调配置（可选）</el-divider>
        <el-form-item label="回调Token"><el-input v-model="form.callbackToken" placeholder="自定义字符串" /></el-form-item>
        <el-form-item label="EncodingAESKey"><el-input v-model="form.encodingAesKey" type="password" show-password placeholder="43位字符串" /></el-form-item>
        <el-form-item label="回调URL"><el-input v-model="form.callbackUrl" placeholder="如：https://域名/api/v1/wecom/callback" /></el-form-item>
        <el-divider content-position="left">扩展Secret（可选）</el-divider>
        <el-form-item label="通讯录Secret"><el-input v-model="form.contactSecret" type="password" show-password placeholder="通讯录同步Secret" /></el-form-item>
        <el-form-item label="客户联系Secret"><el-input v-model="form.externalContactSecret" type="password" show-password placeholder="客户联系API Secret" /></el-form-item>
        <el-form-item label="会话存档Secret"><el-input v-model="form.chatArchiveSecret" type="password" show-password placeholder="会话存档Secret" /></el-form-item>
        <el-form-item label="存档RSA私钥">
          <el-input v-model="form.chatArchivePrivateKey" type="textarea" :rows="4" placeholder="-----BEGIN RSA PRIVATE KEY-----" />
        </el-form-item>
        <el-form-item label="备注"><el-input v-model="form.remark" type="textarea" :rows="2" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'WecomConfig' })
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Connection, Picture, Edit, Delete, Grid, List } from '@element-plus/icons-vue'
import { getWecomConfigs, createWecomConfig, updateWecomConfig, deleteWecomConfig, testWecomConnection } from '@/api/wecom'
import WecomHeader from './components/WecomHeader.vue'
import ConfigSecretManager from './components/ConfigSecretManager.vue'
import ConfigCallbackManager from './components/ConfigCallbackManager.vue'
import ConfigFeatureAuth from './components/ConfigFeatureAuth.vue'
import ConfigApiDiagnostic from './components/ConfigApiDiagnostic.vue'
import PackagePurchaseTab from './components/PackagePurchaseTab.vue'
import { formatDateTime } from '@/utils/date'
import { generateQRCodeDataUrl } from '@/utils/qrcode'

const loading = ref(false)
const submitting = ref(false)
const configList = ref<any[]>([])
const dialogVisible = ref(false)
const isEdit = ref(false)
const currentId = ref<number | null>(null)
const formRef = ref()
const activeTab = ref('basic')
const basicViewMode = ref('card')
const allowSelfBuild = ref(true) // 管理后台控制
const detailVisible = ref(false)
const detailRow = ref<any>(null)

const selectedConfigId = computed(() => configList.value[0]?.id || undefined)
const selectedConfigName = computed(() => configList.value[0]?.name || '')
const selectedCorpId = computed(() => configList.value[0]?.corpId || '')
const hasThirdPartyOnly = computed(() => configList.value.length > 0 && configList.value.every(c => c.authType === 'third_party'))

const currentQuota = computed(() => ({ used: configList.value.length, max: 3 }))
const quotaPercent = computed(() => Math.round((currentQuota.value.used / currentQuota.value.max) * 100))

// 扫码授权
const showAuthGuide = ref(false)
const authStep = ref(0)
const loadingQr = ref(false)
const authQrUrl = ref('')
const checkingAuth = ref(false)
const authResult = ref<any>(null)

const form = ref({
  name: '', corpId: '', corpSecret: '', agentId: undefined as number | undefined,
  callbackToken: '', encodingAesKey: '', callbackUrl: '', contactSecret: '', externalContactSecret: '', chatArchiveSecret: '', chatArchivePrivateKey: '', remark: ''
})

const rules = {
  name: [{ required: true, message: '请输入配置名称', trigger: 'blur' }],
  corpId: [{ required: true, message: '请输入企业ID', trigger: 'blur' }],
  corpSecret: [{ required: true, message: '请输入应用Secret', trigger: 'blur' }]
}

const formatDate = (date: string) => date ? formatDateTime(date) : '-'
const getStatusType = (s: string) => ({ connected: 'success', failed: 'danger', pending: 'info' }[s] || 'info') as string
const getStatusText = (s: string) => ({ connected: '已连接', failed: '连接失败', pending: '待测试' }[s] || '未知')

const fetchList = async () => {
  loading.value = true
  try {
    const res = await getWecomConfigs()
    configList.value = Array.isArray(res) ? res : []
  } catch (e) { console.error('[WecomConfig] Fetch error:', e) }
  finally { loading.value = false }
}

// 检查管理后台是否允许自建应用
const checkSelfBuildPermission = async () => {
  try {
    const res = await fetch('/api/v1/system/config/wecom_settings', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    const json = await res.json()
    if (json?.data?.allowSelfBuild === false) allowSelfBuild.value = false
  } catch { /* default allow */ }
}

const handleAdd = () => {
  isEdit.value = false; currentId.value = null
  form.value = { name: '', corpId: '', corpSecret: '', agentId: undefined, callbackToken: '', encodingAesKey: '', callbackUrl: '', contactSecret: '', externalContactSecret: '', chatArchiveSecret: '', chatArchivePrivateKey: '', remark: '' }
  dialogVisible.value = true
}

const handleEdit = (row: any) => {
  isEdit.value = true; currentId.value = row.id
  form.value = { ...row, corpSecret: '', encodingAesKey: '', contactSecret: '', externalContactSecret: '', chatArchiveSecret: '', chatArchivePrivateKey: '' }
  dialogVisible.value = true
}

const handleViewDetail = (row: any) => {
  detailRow.value = row
  detailVisible.value = true
}

const handleSubmit = async () => {
  await formRef.value?.validate()
  submitting.value = true
  try {
    if (isEdit.value && currentId.value) {
      await updateWecomConfig(currentId.value, form.value)
      ElMessage.success('更新成功')
    } else {
      await createWecomConfig(form.value as any)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    fetchList()
  } catch (e: any) { ElMessage.error(e.message || '操作失败') }
  finally { submitting.value = false }
}

const handleToggle = async (row: any) => {
  try {
    await updateWecomConfig(row.id, { isEnabled: row.isEnabled })
    ElMessage.success(row.isEnabled ? '已启用' : '已禁用')
  } catch { row.isEnabled = !row.isEnabled; ElMessage.error('操作失败') }
}

const handleTest = async (row: any) => {
  try {
    const res = await testWecomConnection(row.id) as any
    if (res?.connected) { ElMessage.success('连接测试成功'); fetchList() }
    else { ElMessage.error(res?.message || '连接测试失败') }
  } catch (e: any) { ElMessage.error(e.message || '连接测试失败') }
}

const handleDelete = async (row: any) => {
  await ElMessageBox.confirm(`确定要删除企业「${row.name}」的配置吗？此操作不可恢复。`, '删除确认', { type: 'warning' })
  try { await deleteWecomConfig(row.id); ElMessage.success('删除成功'); fetchList() }
  catch { ElMessage.error('删除失败') }
}

const handleQuotaUpgrade = () => { ElMessage.info('增购配额 — 请联系管理员') }

// ========== 扫码授权 ==========
const generateAuthQr = async () => {
  loadingQr.value = true
  try {
    const res = await fetch('/api/v1/wecom/callback/auth-url', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    const json = await res.json()
    if (json.data?.authUrl) {
      authQrUrl.value = await generateQRCodeDataUrl(json.data.authUrl, 240)
    } else if (json.data?.suiteId && json.data?.preAuthCode) {
      const redirectUri = `${window.location.origin}/api/v1/wecom/callback/auth-callback`
      const installUrl = `https://open.work.weixin.qq.com/3rdapp/install?suite_id=${json.data.suiteId}&pre_auth_code=${json.data.preAuthCode}&redirect_uri=${encodeURIComponent(redirectUri)}&state=crm_auth`
      authQrUrl.value = await generateQRCodeDataUrl(installUrl, 240)
    } else {
      // 后台未配置服务商应用信息，不生成虚拟二维码
      authQrUrl.value = ''
      ElMessage.warning('后台未配置服务商应用信息(SuiteID/SuiteSecret)，请联系管理员在管理后台 → 企微设置中完成服务商应用配置后再进行扫码授权')
    }
  } catch (e) {
    console.error('[WecomConfig] Generate QR error:', e)
    ElMessage.error('生成授权二维码失败，请检查后端服务是否正常')
  } finally { loadingQr.value = false }
}

const checkAuthResult = async () => {
  checkingAuth.value = true
  try {
    const res = await getWecomConfigs()
    const configs = Array.isArray(res) ? res : []
    const thirdPartyConfigs = configs.filter((c: any) => c.authType === 'third_party')
    if (thirdPartyConfigs.length > configList.value.filter((c: any) => c.authType === 'third_party').length) {
      const newest = thirdPartyConfigs[thirdPartyConfigs.length - 1]
      authResult.value = { corpName: newest.name || newest.authCorpName, corpId: newest.corpId, authUserName: newest.bindOperator || '管理员' }
      authStep.value = 2
      configList.value = configs
    } else {
      ElMessage.warning('暂未检测到新的授权记录。请确认：\n1. 已在企微手机端完成扫码\n2. 已点击「同意授权」\n3. 授权范围已勾选所需权限')
    }
  } catch { ElMessage.error('检查授权状态失败') }
  finally { checkingAuth.value = false }
}

const finishAuth = () => {
  showAuthGuide.value = false; authStep.value = 0; authQrUrl.value = ''; authResult.value = null
  fetchList()
}

onMounted(() => { fetchList(); checkSelfBuildPermission() })
</script>

<style scoped lang="scss">
.wecom-config { padding: 20px; background: var(--v4-bg-page, #F5F7FA); min-height: 100%; }
.form-tip { font-size: 12px; color: #9CA3AF; margin-top: 4px; line-height: 1.4; }
.mono { font-family: 'SF Mono', 'Menlo', monospace; color: #6B7280; font-size: 13px; }

.quota-bar {
  display: flex; align-items: center; gap: 12px; margin-bottom: 16px;
  padding: 12px 18px; background: linear-gradient(135deg, #EEF2FF 0%, #F5F7FA 100%);
  border-radius: 12px; border: 1px solid #E0E7FF;
}
.quota-label { font-weight: 600; font-size: 14px; color: #1F2937; white-space: nowrap; }

/* 紧凑授权卡片 */
.auth-mode-cards { display: flex; gap: 16px; margin-bottom: 24px; padding-top: 8px; }
.auth-mode-card-sm {
  flex: 1; max-width: 280px; padding: 20px; border: 2px solid #E5E7EB; border-radius: 10px;
  text-align: center; cursor: pointer; transition: all 0.25s; position: relative; overflow: visible;
  &:hover { border-color: #4C6EF5; box-shadow: 0 4px 12px rgba(76,110,245,0.1); transform: translateY(-1px); }
}
.auth-mode-card-sm.recommended { border-color: #10B981; background: #ECFDF5; }
.auth-mode-badge {
  position: absolute; top: -10px; right: 12px; background: linear-gradient(135deg, #10B981, #059669);
  color: #fff; padding: 2px 10px; border-radius: 10px; font-size: 11px; font-weight: 600;
  box-shadow: 0 2px 6px rgba(16, 185, 129, 0.3); z-index: 1;
}
.auth-mode-icon { font-size: 28px; margin-bottom: 8px; }
.auth-mode-title { font-size: 14px; font-weight: 600; color: #1F2937; margin-bottom: 4px; }
.auth-mode-desc { font-size: 12px; color: #6B7280; margin-bottom: 12px; }

/* 扫码授权弹窗 */
.auth-guide-content { padding: 0 8px; }
.auth-step-content { min-height: 280px; }
.qr-section { text-align: center; margin-bottom: 20px; }
.qr-placeholder {
  width: 260px; height: 260px; margin: 0 auto 16px;
  border: 2px dashed #E5E7EB; border-radius: 12px;
  display: flex; align-items: center; justify-content: center; flex-direction: column; background: #FAFBFC;
}
.qr-image { width: 240px; height: 240px; border-radius: 8px; }
.qr-empty { text-align: center; color: #D1D5DB; }
.qr-empty p { font-size: 13px; margin-top: 8px; }
.auth-tips { background: #F9FAFB; border-radius: 12px; padding: 16px; }
.auth-tips h4 { margin: 0 0 8px; font-size: 14px; color: #1F2937; }
.auth-tips ol { margin: 0; padding-left: 20px; color: #4B5563; font-size: 13px; line-height: 2; }
.auth-scope-list { text-align: left; margin-bottom: 20px; }
.scope-item { padding: 6px 0; font-size: 14px; color: #4B5563; }
.auth-result-info { margin-bottom: 16px; }

/* 详情抽屉 */
.secret-status-list { display: flex; flex-direction: column; gap: 8px; }
.secret-status-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #F9FAFB; border-radius: 6px; font-size: 13px; }

/* 基础配置视图切换 */
.basic-view-toggle { display: flex; justify-content: flex-end; margin-bottom: 16px; }

/* 卡片网格视图 */
.config-card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 16px; }
.config-card {
  border: 1px solid #E5E7EB; border-radius: 12px; background: #fff;
  transition: all 0.25s; overflow: hidden;
  &:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.06); border-color: #C7D2FE; }
}
.config-card--disabled { opacity: 0.6; }
.config-card__header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px 20px 12px; border-bottom: 1px solid #F3F4F6;
}
.config-card__name { display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 15px; color: #1F2937; }
.config-card__body { padding: 12px 20px; }
.config-card__info-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 5px 0; font-size: 13px; color: #4B5563;
}
.config-card__label { color: #9CA3AF; min-width: 70px; }
.config-card__footer {
  display: flex; justify-content: flex-end; gap: 4px; padding: 10px 16px;
  border-top: 1px solid #F3F4F6; background: #FAFBFC;
}
</style>
