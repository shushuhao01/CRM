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
      </div>

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

        <!-- 对外收款Secret(可选) -->
        <div class="secret-item">
          <div class="secret-header">
            <span class="secret-name">对外收款Secret <el-tag type="info" size="small">可选</el-tag></span>
            <el-tag :type="statusTagType(secrets.paymentSecret.status)" size="small">
              {{ statusLabel(secrets.paymentSecret.status) }}
            </el-tag>
          </div>
          <div class="secret-input-row">
            <el-input
              v-model="secrets.paymentSecret.value"
              :type="secrets.paymentSecret.visible ? 'text' : 'password'"
              placeholder="对外收款API Secret"
              style="flex: 1"
            />
            <el-button :icon="secrets.paymentSecret.visible ? Hide : View" @click="secrets.paymentSecret.visible = !secrets.paymentSecret.visible" />
            <el-button type="success" @click="testSecret('payment')" :loading="secrets.paymentSecret.testing">测试</el-button>
          </div>
        </div>
      </div>

      <div class="save-row">
        <el-button type="primary" size="large" @click="handleSaveAll" :loading="saving">保存全部Secret</el-button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { View, Hide } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const props = defineProps<{
  configId?: number
  configName?: string
  corpId?: string
}>()

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
    // 真实测试: 调用后端API验证Secret
    const res = await fetch(`/api/v1/wecom/configs/${props.configId}/diagnose/${type === 'app' ? 'token' : type === 'contact' ? 'address' : type === 'external' ? 'external' : type === 'archive' ? 'archive' : 'payment'}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
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
    if (secrets.appSecret.value) body.corpSecret = secrets.appSecret.value
    if (secrets.contactSecret.value) body.contactSecret = secrets.contactSecret.value
    if (secrets.externalSecret.value) body.externalContactSecret = secrets.externalSecret.value
    if (secrets.archiveSecret.value) body.chatArchiveSecret = secrets.archiveSecret.value
    if (rsaPrivateKey.value) body.chatArchivePrivateKey = rsaPrivateKey.value
    // paymentSecret handled separately via payment settings

    const res = await fetch(`/api/v1/wecom/configs/${props.configId}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    const json = await res.json()
    if (json?.success) {
      ElMessage.success('全部Secret已保存')
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

.secret-list { display: flex; flex-direction: column; gap: 20px; max-width: 680px; }
.secret-item { padding: 16px; background: #fff; border: 1px solid #EBEEF5; border-radius: 10px; }
.secret-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.secret-name { font-weight: 600; color: #1F2937; display: flex; align-items: center; gap: 8px; }
.secret-input-row { display: flex; gap: 8px; }
.secret-sub { display: flex; align-items: center; gap: 8px; margin-top: 10px; }
.secret-sub-label { font-size: 13px; color: #6B7280; }
.rsa-input-area { margin-top: 8px; }

.save-row { margin-top: 24px; }
</style>

