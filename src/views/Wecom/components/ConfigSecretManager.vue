<template>
  <div class="secret-manager">
    <el-alert v-if="!configId" type="warning" :closable="false" style="margin-bottom: 16px">
      请先在基础配置中添加企微配置后再管理Secret。
    </el-alert>

    <template v-else>
      <div class="config-info">
        <span class="config-label">当前配置:</span>
        <span class="config-name">{{ configName }}</span>
        <el-tag size="small" type="info">{{ corpId }}</el-tag>
        <el-tag v-if="isThirdParty" type="warning" size="small" style="margin-left: 4px">第三方授权</el-tag>
        <el-tag v-else type="primary" size="small" style="margin-left: 4px">自建应用</el-tag>
      </div>

      <!-- ========== 第三方授权模式 ========== -->
      <template v-if="isThirdParty">
        <el-alert type="success" :closable="false" style="margin-bottom: 20px">
          <template #title><strong>第三方应用授权模式 — Secret自动管理</strong></template>
          当前企业通过服务商第三方应用扫码授权接入，系统通过 <code>suite_access_token</code> + <code>permanent_code</code> 自动获取企业AccessToken，<strong>无需手动配置各类Secret</strong>。
        </el-alert>

        <div class="tp-secret-grid">
          <div v-for="item in thirdPartySecrets" :key="item.key" class="tp-secret-card">
            <div class="tp-secret-card__header">
              <span class="tp-secret-card__icon">{{ item.icon }}</span>
              <span class="tp-secret-card__name">{{ item.name }}</span>
              <el-tag :type="item.autoManaged ? 'success' : 'info'" size="small">
                {{ item.autoManaged ? '自动获取' : '需额外配置' }}
              </el-tag>
            </div>
            <div class="tp-secret-card__desc">{{ item.desc }}</div>
            <div class="tp-secret-card__status">
              <el-icon v-if="item.autoManaged" color="#10B981" :size="16"><CircleCheckFilled /></el-icon>
              <el-icon v-else color="#F59E0B" :size="16"><WarningFilled /></el-icon>
              <span :style="{ color: item.autoManaged ? '#10B981' : '#F59E0B' }">{{ item.statusText }}</span>
            </div>
          </div>
        </div>

        <el-divider content-position="left" style="margin: 28px 0 20px">
          <span style="font-size: 13px; color: #6B7280">可选：增值Secret补充配置（仅特定场景需要）</span>
        </el-divider>

        <div class="secret-list">
          <!-- 会话存档Secret(增值-第三方模式也可能需要) -->
          <div class="secret-item">
            <div class="secret-header">
              <span class="secret-name">会话存档Secret <el-tag size="small">增值-可选</el-tag></span>
              <el-tag :type="statusTagType(secrets.archiveSecret.status)" size="small">
                {{ statusLabel(secrets.archiveSecret.status) }}
              </el-tag>
            </div>
            <div class="secret-hint">第三方授权模式下，会话存档可通过授权自动获取。如有独立会话存档Secret可在此补充。</div>
            <div class="secret-input-row">
              <el-input
                v-model="secrets.archiveSecret.value"
                :type="secrets.archiveSecret.visible ? 'text' : 'password'"
                placeholder="管理工具 → 会话内容存档 → Secret（可选）"
                style="flex: 1"
              />
              <el-button :icon="secrets.archiveSecret.visible ? Hide : View" @click="secrets.archiveSecret.visible = !secrets.archiveSecret.visible" />
              <el-button type="success" @click="testSecret('archive')" :loading="secrets.archiveSecret.testing">测试</el-button>
            </div>
            <div class="secret-sub">
              <span class="secret-sub-label">RSA私钥:</span>
              <el-button size="small" @click="showRsaInput = !showRsaInput">
                {{ showRsaInput ? '收起' : rsaKeySet ? '已配置 - 点击修改' : '上传/粘贴' }}
              </el-button>
            </div>
            <div v-if="showRsaInput" class="rsa-input-area">
              <el-input
                v-model="rsaPrivateKey"
                type="textarea"
                :rows="5"
                placeholder="-----BEGIN RSA PRIVATE KEY-----&#10;...&#10;-----END RSA PRIVATE KEY-----"
              />
            </div>
          </div>
        </div>

        <div class="save-row">
          <el-button type="primary" @click="handleSaveAll" :loading="saving">保存补充配置</el-button>
        </div>
      </template>

      <!-- ========== 自建应用模式 ========== -->
      <template v-else>
        <div class="secret-list">
          <!-- 应用Secret(必填) -->
          <div class="secret-item">
            <div class="secret-header">
              <span class="secret-name">应用Secret <el-tag type="danger" size="small">必填</el-tag></span>
              <el-tag :type="secrets.appSecret.status === 'ok' ? 'success' : 'danger'" size="small">
                {{ secrets.appSecret.status === 'ok' ? '正常' : '未配置' }}
              </el-tag>
            </div>
            <div class="secret-input-row">
              <el-input
                v-model="secrets.appSecret.value"
                :type="secrets.appSecret.visible ? 'text' : 'password'"
                placeholder="应用管理 → 自建应用 → Secret"
                style="flex: 1"
              />
              <el-button :icon="secrets.appSecret.visible ? Hide : View" @click="secrets.appSecret.visible = !secrets.appSecret.visible" />
              <el-button type="success" @click="testSecret('app')" :loading="secrets.appSecret.testing">测试</el-button>
            </div>
          </div>

          <!-- 通讯录Secret(可选) -->
          <div class="secret-item">
            <div class="secret-header">
              <span class="secret-name">通讯录Secret <el-tag type="info" size="small">可选</el-tag></span>
              <el-tag :type="statusTagType(secrets.contactSecret.status)" size="small">
                {{ statusLabel(secrets.contactSecret.status) }}
              </el-tag>
            </div>
            <div class="secret-input-row">
              <el-input
                v-model="secrets.contactSecret.value"
                :type="secrets.contactSecret.visible ? 'text' : 'password'"
                placeholder="管理工具 → 通讯录同步 → Secret"
                style="flex: 1"
              />
              <el-button :icon="secrets.contactSecret.visible ? Hide : View" @click="secrets.contactSecret.visible = !secrets.contactSecret.visible" />
              <el-button type="success" @click="testSecret('contact')" :loading="secrets.contactSecret.testing">测试</el-button>
            </div>
          </div>

          <!-- 客户联系Secret(推荐) -->
          <div class="secret-item">
            <div class="secret-header">
              <span class="secret-name">客户联系Secret <el-tag type="warning" size="small">推荐</el-tag></span>
              <el-tag :type="statusTagType(secrets.externalSecret.status)" size="small">
                {{ statusLabel(secrets.externalSecret.status) }}
              </el-tag>
            </div>
            <div class="secret-input-row">
              <el-input
                v-model="secrets.externalSecret.value"
                :type="secrets.externalSecret.visible ? 'text' : 'password'"
                placeholder="客户联系 → API → Secret"
                style="flex: 1"
              />
              <el-button :icon="secrets.externalSecret.visible ? Hide : View" @click="secrets.externalSecret.visible = !secrets.externalSecret.visible" />
              <el-button type="success" @click="testSecret('external')" :loading="secrets.externalSecret.testing">测试</el-button>
            </div>
          </div>

          <!-- 会话存档Secret(增值) -->
          <div class="secret-item">
            <div class="secret-header">
              <span class="secret-name">会话存档Secret <el-tag size="small">增值</el-tag></span>
              <el-tag :type="statusTagType(secrets.archiveSecret.status)" size="small">
                {{ statusLabel(secrets.archiveSecret.status) }}
              </el-tag>
            </div>
            <div class="secret-input-row">
              <el-input
                v-model="secrets.archiveSecret.value"
                :type="secrets.archiveSecret.visible ? 'text' : 'password'"
                placeholder="管理工具 → 会话内容存档 → Secret"
                style="flex: 1"
              />
              <el-button :icon="secrets.archiveSecret.visible ? Hide : View" @click="secrets.archiveSecret.visible = !secrets.archiveSecret.visible" />
              <el-button type="success" @click="testSecret('archive')" :loading="secrets.archiveSecret.testing">测试</el-button>
            </div>
            <div class="secret-sub">
              <span class="secret-sub-label">RSA私钥:</span>
              <el-button size="small" @click="showRsaInput = !showRsaInput">
                {{ showRsaInput ? '收起' : rsaKeySet ? '已配置 - 点击修改' : '上传/粘贴' }}
              </el-button>
            </div>
            <div v-if="showRsaInput" class="rsa-input-area">
              <el-input
                v-model="rsaPrivateKey"
                type="textarea"
                :rows="5"
                placeholder="-----BEGIN RSA PRIVATE KEY-----&#10;...&#10;-----END RSA PRIVATE KEY-----"
              />
            </div>
          </div>

          <!-- 对外收款说明 -->
          <div class="secret-item">
            <div class="secret-header">
              <span class="secret-name">对外收款 <el-tag type="info" size="small">无需独立Secret</el-tag></span>
            </div>
            <div style="font-size: 12px; color: #909399; line-height: 1.8; padding: 4px 0">
              2023年12月起企微不再支持独立的「对外收款Secret」。<br/>
              请在企微管理后台 → 对外收款 → API → 设置「可调用接口的应用」中勾选当前自建应用，<br/>
              系统将使用上方配置的应用Secret调用收款API。可在「对外收款 → 收款设置」中测试连接。
            </div>
          </div>
        </div>

        <div class="save-row">
          <el-button type="primary" size="large" @click="handleSaveAll" :loading="saving">保存全部Secret</el-button>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { View, Hide, CircleCheckFilled, WarningFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const props = defineProps<{
  configId?: number
  configName?: string
  corpId?: string
  authType?: string
}>()

const isThirdParty = computed(() => props.authType === 'third_party')

const thirdPartySecrets = computed(() => [
  {
    key: 'app', icon: '🔑', name: '应用AccessToken',
    autoManaged: true,
    desc: '通过 suite_access_token + permanent_code 自动换取企业token',
    statusText: '授权后自动获取，无需手动配置'
  },
  {
    key: 'contact', icon: '📋', name: '通讯录权限',
    autoManaged: true,
    desc: '通讯录读取权限由第三方应用授权范围决定',
    statusText: '随授权自动获取，取决于授权范围'
  },
  {
    key: 'external', icon: '👥', name: '客户联系权限',
    autoManaged: true,
    desc: '客户联系/客户群权限由第三方应用授权范围决定',
    statusText: '随授权自动获取，取决于授权范围'
  },
  {
    key: 'archive', icon: '📝', name: '会话存档',
    autoManaged: false,
    desc: '会话存档为增值服务，需企业单独开通并授权',
    statusText: '需企业开通会话存档后授权，可在下方补充配置'
  },
  {
    key: 'payment', icon: '💰', name: '对外收款',
    autoManaged: true,
    desc: '对外收款权限在企业授权安装时勾选授予，无需单独配置Secret',
    statusText: '随授权自动获取，取决于授权时是否勾选收款权限'
  },
])

const saving = ref(false)
const showRsaInput = ref(false)
const rsaPrivateKey = ref('')
const rsaKeySet = ref(false)

interface SecretItem {
  value: string
  visible: boolean
  status: string
  testing: boolean
}

const secrets = reactive<Record<string, SecretItem>>({
  appSecret: { value: '', visible: false, status: 'ok', testing: false },
  contactSecret: { value: '', visible: false, status: 'ok', testing: false },
  externalSecret: { value: '', visible: false, status: 'ok', testing: false },
  archiveSecret: { value: '', visible: false, status: 'ok', testing: false },
  paymentSecret: { value: '', visible: false, status: 'none', testing: false },
})

const statusTagType = (s: string) => {
  if (s === 'ok') return 'success' as const
  if (s === 'fail') return 'danger' as const
  return 'info' as const
}

const statusLabel = (s: string) => {
  if (s === 'ok') return '正常'
  if (s === 'fail') return '异常'
  return '未配置'
}

const testSecret = async (type: string) => {
  const key = type + 'Secret'
  const target = type === 'app' ? secrets.appSecret : secrets[key]
  target.testing = true
  try {
    if (!target.value && target.status !== 'ok') {
      target.testing = false
      ElMessage.warning('请先填写Secret')
      return
    }
    const res = await fetch(`/api/v1/wecom/configs/${props.configId}/diagnose/${type === 'app' ? 'token' : type === 'contact' ? 'address' : type === 'external' ? 'external' : type === 'archive' ? 'archive' : 'payment'}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token') || localStorage.getItem('token')}` }
    })
    const json = await res.json()
    target.testing = false
    if (json?.data?.status === 'ok') {
      target.status = 'ok'
      ElMessage.success(`${type} Secret 测试通过`)
    } else if (json?.data?.status === 'none') {
      target.status = 'none'
      ElMessage.warning(json?.data?.detail || '未配置')
    } else {
      target.status = 'fail'
      ElMessage.error(json?.data?.detail || '测试失败')
    }
  } catch {
    target.testing = false
    target.status = 'fail'
    ElMessage.error('测试请求失败')
  }
}

const handleSaveAll = async () => {
  if (!props.configId) return
  saving.value = true
  try {
    const body: any = {}
    if (!isThirdParty.value) {
      if (secrets.appSecret.value) body.corpSecret = secrets.appSecret.value
      if (secrets.contactSecret.value) body.contactSecret = secrets.contactSecret.value
      if (secrets.externalSecret.value) body.externalContactSecret = secrets.externalSecret.value
    }
    if (secrets.archiveSecret.value) body.chatArchiveSecret = secrets.archiveSecret.value
    if (rsaPrivateKey.value) body.chatArchivePrivateKey = rsaPrivateKey.value

    const res = await fetch(`/api/v1/wecom/configs/${props.configId}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token') || localStorage.getItem('token')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    const json = await res.json()
    if (json?.success) {
      ElMessage.success(isThirdParty.value ? '补充配置已保存' : '全部Secret已保存')
    } else {
      ElMessage.error(json?.message || '保存失败')
    }
  } catch {
    ElMessage.error('保存失败')
  }
  finally { saving.value = false }
}
</script>

<style scoped>
.config-info { display: flex; align-items: center; gap: 8px; margin-bottom: 20px; padding: 12px 16px; background: #F9FAFB; border-radius: 8px; }
.config-label { font-size: 13px; color: #6B7280; }
.config-name { font-weight: 600; color: #1F2937; }

/* 第三方授权模式卡片网格 */
.tp-secret-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; max-width: 960px; }
.tp-secret-card {
  padding: 16px 18px; background: #fff; border: 1px solid #E5E7EB; border-radius: 10px;
  transition: all 0.2s;
}
.tp-secret-card:hover { border-color: #C7D2FE; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
.tp-secret-card__header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.tp-secret-card__icon { font-size: 18px; }
.tp-secret-card__name { font-weight: 600; color: #1F2937; font-size: 14px; }
.tp-secret-card__desc { font-size: 12px; color: #9CA3AF; margin-bottom: 8px; line-height: 1.5; }
.tp-secret-card__status { display: flex; align-items: center; gap: 6px; font-size: 13px; }

.secret-list { display: flex; flex-direction: column; gap: 20px; max-width: 680px; }
.secret-item { padding: 16px; background: #fff; border: 1px solid #EBEEF5; border-radius: 10px; }
.secret-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.secret-name { font-weight: 600; color: #1F2937; display: flex; align-items: center; gap: 8px; }
.secret-hint { font-size: 12px; color: #9CA3AF; margin-bottom: 10px; line-height: 1.5; }
.secret-input-row { display: flex; gap: 8px; }
.secret-sub { display: flex; align-items: center; gap: 8px; margin-top: 10px; }
.secret-sub-label { font-size: 13px; color: #6B7280; }
.rsa-input-area { margin-top: 8px; }

.save-row { margin-top: 24px; }
</style>

