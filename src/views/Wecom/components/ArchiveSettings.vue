<template>
  <div class="archive-settings" v-loading="loading">
    <!-- 未选择配置 -->
    <el-alert v-if="!configId" type="warning" :closable="false" style="margin-bottom: 16px">
      请先在顶部选择企微配置后再进行设置。
    </el-alert>

    <template v-else>

      <!-- ==================== 第一区：服务状态总览 ==================== -->
      <div class="section-card" :class="settings.status === 'active' ? 'card-ok' : 'card-warn'">
        <div class="section-header">
          <div class="section-icon" :class="settings.status === 'active' ? 'icon-ok' : 'icon-warn'">
            {{ settings.status === 'active' ? '✅' : '⚠️' }}
          </div>
          <div class="section-main">
            <h3 class="section-title">{{ settings.status === 'active' ? '会话存档已激活' : '会话存档未激活' }}</h3>
            <p class="section-desc" v-if="settings.status === 'active'">
              到期时间：{{ formatDate(settings.expireDate) }} · 席位：{{ settings.usedUsers }}/{{ settings.maxUsers }}人
            </p>
            <p class="section-desc" v-else>
              {{ isSaas ? '请在企业微信中完成授权并上传确认函后即可激活' : '请配置Secret和RSA私钥后开通服务' }}
            </p>
          </div>
        </div>
      </div>

      <!-- ==================== 第二区：SaaS模式 - 授权状态检查 ==================== -->
      <div v-if="isSaas" class="section-card">
        <div class="block-header">
          <div>
            <h3 class="block-title">📋 企微授权状态</h3>
            <p class="block-desc">会话存档需要企业在企业微信完成以下授权，方可使用。</p>
          </div>
          <el-button type="primary" :loading="refreshingAuth" @click="handleRefreshAuthStatus">
            <el-icon><Refresh /></el-icon> 刷新授权状态
          </el-button>
        </div>
        <div class="auth-checklist">
          <div class="auth-item" :class="settings.hasSecret ? 'auth-ok' : 'auth-pending'">
            <span class="auth-dot">{{ settings.hasSecret ? '✓' : '!' }}</span>
            <div class="auth-content">
              <span class="auth-label">应用授权</span>
              <span class="auth-hint" v-if="settings.hasSecret">已完成第三方应用授权</span>
              <span class="auth-hint" v-else>请先完成企微第三方应用授权</span>
            </div>
          </div>
          <div class="auth-item" :class="(settings.dataApiStatus === 1 || settings.status === 'active') ? 'auth-ok' : 'auth-pending'">
            <span class="auth-dot">{{ (settings.dataApiStatus === 1 || settings.status === 'active') ? '✓' : '!' }}</span>
            <div class="auth-content">
              <span class="auth-label">数据与智能专区权限</span>
              <span class="auth-hint" v-if="settings.dataApiStatus === 1">已授权数据访问</span>
              <span class="auth-hint" v-else-if="settings.status === 'active'">已通过（通过增值服务激活）</span>
              <span class="auth-hint" v-else>
                需在企业微信 → 云客CRM应用 → 应用权限 → 数据与智能专区 中授权
              </span>
            </div>
          </div>
          <div class="auth-item" :class="settings.vasChatArchive ? 'auth-ok' : 'auth-pending'">
            <span class="auth-dot">{{ settings.vasChatArchive ? '✓' : '!' }}</span>
            <div class="auth-content">
              <span class="auth-label">会话存档增值服务</span>
              <span class="auth-hint" v-if="settings.vasChatArchive">已开通（席位 {{ settings.usedUsers }}/{{ settings.maxUsers }}）</span>
              <span class="auth-hint" v-else>请在「套餐与配额」中购买会话存档服务</span>
            </div>
          </div>
        </div>

        <!-- 刷新结果提示 -->
        <el-alert
          v-if="authRefreshResult"
          :type="authRefreshResult.type"
          :closable="true"
          style="margin-top: 12px"
          show-icon
          @close="authRefreshResult = null"
        >
          <template #title>{{ authRefreshResult.message }}</template>
          <template v-if="authRefreshResult.detail" #default>
            <p style="margin: 4px 0 0; font-size: 12px; color: #606266">{{ authRefreshResult.detail }}</p>
          </template>
        </el-alert>

        <!-- 未授权时的指引 -->
        <el-alert
          v-if="settings.dataApiStatus !== 1 && settings.status !== 'active'"
          type="info"
          :closable="false"
          style="margin-top: 16px"
          show-icon
        >
          <template #title>如何授权数据与智能专区？</template>
          <ol class="guide-steps">
            <li>企业管理员在企业微信中打开 <strong>云客CRM</strong> 应用</li>
            <li>进入 <strong>应用管理 → 应用权限</strong></li>
            <li>分别授权 <strong>「组织架构信息」</strong> 和 <strong>「数据与智能专区权限」</strong></li>
            <li>在数据与智能专区中选择 <strong>会话内容 → 配置人员范围</strong></li>
            <li>填写企业确认函（在企业微信端完成，CRM无需上传）</li>
            <li>等待官方审核通过后，回到本页面点击「刷新授权状态」，然后配置生效范围</li>
          </ol>
        </el-alert>
      </div>

      <!-- ==================== 第二区：SaaS模式 - 密钥说明（服务商统一管理，租户无需配置） ==================== -->
      <div v-if="isSaas" class="section-card">
        <div class="block-header">
          <div>
            <h3 class="block-title">加密与安全</h3>
            <p class="block-desc">第三方服务商模式下，加密密钥由平台统一管理，您无需手动配置公钥/私钥。</p>
          </div>
        </div>
        <el-alert type="success" :closable="false" show-icon>
          <template #title>密钥由平台统一管理</template>
          <p style="margin: 4px 0 0; font-size: 12px; color: #606266">
            会话消息的加密与解密由服务商平台统一完成，企业仅需完成授权和上传确认函即可使用会话存档功能。无需自行配置RSA公钥或私钥。
          </p>
        </el-alert>
      </div>

      <!-- ==================== 第二区（替代）：私有部署 - Secret配置提醒 ==================== -->
      <div v-if="!isSaas" class="section-card">
        <h3 class="block-title">🔑 凭证配置</h3>
        <p class="block-desc">私有部署模式需要手动配置Secret和RSA私钥，请在「企微授权」页面的Secret管理中配置。</p>
        <div class="auth-checklist">
          <div class="auth-item" :class="settings.hasSecret ? 'auth-ok' : 'auth-pending'">
            <span class="auth-dot">{{ settings.hasSecret ? '✓' : '!' }}</span>
            <div class="auth-content">
              <span class="auth-label">会话存档Secret</span>
              <span class="auth-hint">{{ settings.hasSecret ? '已配置' : '请在Secret管理中配置' }}</span>
            </div>
          </div>
          <div class="auth-item" :class="settings.hasPrivateKey ? 'auth-ok' : 'auth-pending'">
            <span class="auth-dot">{{ settings.hasPrivateKey ? '✓' : '!' }}</span>
            <div class="auth-content">
              <span class="auth-label">RSA私钥</span>
              <span class="auth-hint">{{ settings.hasPrivateKey ? '已配置' : '请在Secret管理中配置' }}</span>
            </div>
          </div>
        </div>
        <!-- RSA公钥（仅私有部署） -->
        <div style="margin-top: 16px">
          <label class="field-label">RSA公钥（可选）</label>
          <el-input
            v-model="form.rsaPublicKey"
            type="textarea"
            :rows="4"
            placeholder="粘贴RSA公钥，用于消息加密传输验证..."
            style="max-width: 600px"
          />
          <p class="field-hint">在企微管理后台获取RSA公钥，配置后可用于消息加密传输验证。</p>
        </div>
      </div>

      <!-- ==================== 第三区：生效范围 ==================== -->
      <div class="section-card">
        <div class="block-header">
          <div>
            <h3 class="block-title">👥 生效范围</h3>
            <p class="block-desc">选择会话存档生效的成员，聊天会话、消息记录、数据统计均以此范围为准。</p>
          </div>
          <el-button type="primary" plain size="small" @click="loadScopeTree" :loading="scopeLoading">
            <el-icon><Refresh /></el-icon>
            {{ scopeTree.length > 0 ? '刷新成员' : '选择生效成员' }}
          </el-button>
        </div>

        <!-- 额度提示 -->
        <div class="quota-bar">
          <div class="quota-info">
            <span>已选 <strong>{{ scopeSelectedCount }}</strong> 人</span>
            <span class="quota-sep">/</span>
            <span>套餐额度 <strong>{{ settings.maxUsers }}</strong> 人</span>
            <el-tag v-if="settings.maxUsers > 0 && scopeSelectedCount > settings.maxUsers" type="danger" size="small" style="margin-left: 8px">超出额度</el-tag>
          </div>
          <el-progress
            :percentage="settings.maxUsers > 0 ? Math.min(100, Math.round(scopeSelectedCount / settings.maxUsers * 100)) : 0"
            :color="scopeSelectedCount > settings.maxUsers ? '#f56c6c' : '#409eff'"
            :stroke-width="8"
            style="width: 200px"
          />
        </div>

        <template v-if="isSaas && settings.dataApiStatus !== 1 && settings.status !== 'active'">
          <el-alert type="warning" :closable="false" show-icon>
            请先在企业微信中授权「数据与智能专区权限」，授权后才能加载和选择生效成员。
          </el-alert>
        </template>
        <template v-else>
          <!-- 操作提示 -->
          <el-alert v-if="scopeTree.length === 0 && !scopeLoading" type="info" :closable="false" style="margin-bottom: 12px">
            <template #title>点击右上角「选择生效成员」加载企微已授权会话存档范围内的成员列表</template>
            <p style="margin: 4px 0 0; font-size: 12px">
              加载的成员来自企业微信中已授权会话存档的人员范围。选中后不超过您购买的CRM套餐席位数量即可生效。
            </p>
          </el-alert>

          <!-- 成员树 -->
          <div v-if="scopeTree.length > 0" class="scope-tree-area">
            <el-tree
              ref="scopeTreeRef"
              :data="scopeTree"
              show-checkbox
              node-key="nodeId"
              :default-checked-keys="scopeCheckedKeys"
              :props="{ label: 'label', children: 'children' }"
              @check="onScopeCheck"
              style="max-height: 360px; overflow-y: auto; border: 1px solid #ebeef5; border-radius: 6px; padding: 8px"
            />
            <div style="margin-top: 12px; display: flex; gap: 8px; align-items: center">
              <el-button type="primary" :loading="scopeSaving" @click="handleSaveScope" :disabled="settings.maxUsers > 0 && scopeSelectedCount > settings.maxUsers">
                确定生效（{{ scopeSelectedCount }}人）
              </el-button>
              <span v-if="settings.maxUsers > 0 && scopeSelectedCount > settings.maxUsers" class="field-hint" style="color: #f56c6c; line-height: 32px">
                已选人数超出套餐额度，请减少选择或增购席位
              </span>
              <span v-else-if="scopeSelectedCount > 0" class="field-hint" style="color: #67c23a; line-height: 32px">
                ✅ 选中 {{ scopeSelectedCount }} 人，未超出套餐额度
              </span>
            </div>
          </div>
          <div v-else-if="scopeLoading" class="scope-empty">
            <el-icon class="is-loading" :size="24" color="#409eff"><Loading /></el-icon>
            <p style="margin-top: 8px">正在加载企微授权成员列表...</p>
          </div>
        </template>
      </div>

      <!-- ==================== 第四区：数据可见范围 ==================== -->
      <div class="section-card">
        <h3 class="block-title">👁️ 数据可见范围</h3>
        <p class="block-desc">控制CRM中不同角色的成员可以查看哪些聊天记录（管理员始终可见全部）。</p>
        <el-radio-group v-model="form.visibility" class="visibility-group">
          <div class="visibility-option" :class="{ active: form.visibility === 'self' }" @click="form.visibility = 'self'">
            <el-radio label="self" />
            <div class="visibility-text">
              <span class="visibility-label">仅自己</span>
              <span class="visibility-desc">成员只能查看自己的聊天记录</span>
            </div>
          </div>
          <div class="visibility-option" :class="{ active: form.visibility === 'department' }" @click="form.visibility = 'department'">
            <el-radio label="department" />
            <div class="visibility-text">
              <span class="visibility-label">本部门</span>
              <span class="visibility-desc">成员可查看同部门所有同事的聊天记录</span>
            </div>
          </div>
          <div class="visibility-option" :class="{ active: form.visibility === 'all' }" @click="form.visibility = 'all'">
            <el-radio label="all" />
            <div class="visibility-text">
              <span class="visibility-label">全部可见</span>
              <span class="visibility-desc">所有成员可查看全部聊天记录</span>
            </div>
          </div>
        </el-radio-group>
      </div>

      <!-- ==================== 第五区：拉取与质检设置 ==================== -->
      <div class="section-card">
        <h3 class="block-title">⚙️ 拉取与质检</h3>
        <el-form :model="form" label-width="100px" label-position="right" style="max-width: 560px; margin-top: 16px">
          <el-form-item label="拉取间隔">
            <div style="display: flex; align-items: center; gap: 8px">
              <el-input-number v-model="form.fetchInterval" :min="1" :max="60" :step="1" size="default" />
              <span class="field-hint">分钟（建议 5~15）</span>
            </div>
          </el-form-item>
          <el-form-item label="拉取模式">
            <el-radio-group v-model="form.fetchMode">
              <el-radio label="default">默认模式</el-radio>
              <el-radio label="pre_page">预分页模式</el-radio>
              <el-radio label="adaptive">自适应模式</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="保留天数">
            <div style="display: flex; align-items: center; gap: 8px">
              <el-input-number v-model="form.retentionDays" :min="7" :max="3650" :step="30" size="default" />
              <span class="field-hint">天（超期数据将自动清理）</span>
            </div>
          </el-form-item>
          <el-form-item label="自动质检">
            <div style="display: flex; align-items: center; gap: 8px">
              <el-switch v-model="form.autoInspect" />
              <span class="field-hint">开启后新消息自动触发敏感词和质检规则</span>
            </div>
          </el-form-item>
        </el-form>
      </div>

      <!-- ==================== 第六区：存储设置（仅私有部署） ==================== -->
      <div v-if="!isSaas" class="section-card">
        <h3 class="block-title">💾 存储设置</h3>
        <p class="block-desc">配置媒体文件（图片、语音、视频等）的存储方式。</p>
        <el-form label-width="100px" style="max-width: 400px; margin-top: 12px">
          <el-form-item label="媒体存储">
            <el-radio-group v-model="form.mediaStorage">
              <el-radio label="local">本地存储</el-radio>
              <el-radio label="oss">OSS云存储</el-radio>
            </el-radio-group>
          </el-form-item>
        </el-form>
      </div>

      <!-- ==================== 底部：保存按钮 ==================== -->
      <div class="save-bar">
        <el-button type="primary" size="large" :loading="saving" @click="handleSave" :disabled="!configId">
          保存设置
        </el-button>
        <el-button size="large" @click="fetchSettings">重置</el-button>
      </div>

    </template>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'ArchiveSettings' })
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { ElMessage, ElTree } from 'element-plus'
import { Refresh, Loading, CopyDocument } from '@element-plus/icons-vue'
import { getArchiveSettings, updateArchiveSettings, getArchiveSeats, getArchiveSeatWecomTree, updateArchiveSeatMembers, getArchiveRsaPublicKey } from '@/api/wecom'
import request from '@/utils/request'

const props = defineProps<{
  configId: number | null
  isDemoMode?: boolean
  authType?: string
}>()

const loading = ref(false)
const saving = ref(false)

const isSaas = computed(() => props.authType === 'third_party')

// ==================== RSA公钥（SaaS模式） ====================
const rsaPublicKey = ref('')
const rsaPublicKeyHint = ref('')
const rsaPublicKeyLoading = ref(false)

const fetchRsaPublicKey = async () => {
  if (!isSaas.value) return
  rsaPublicKeyLoading.value = true
  try {
    const res: any = await getArchiveRsaPublicKey()
    rsaPublicKey.value = res?.publicKey || ''
    rsaPublicKeyHint.value = res?.hint || ''
  } catch {
    rsaPublicKey.value = ''
  } finally {
    rsaPublicKeyLoading.value = false
  }
}

const copyPublicKey = async () => {
  if (!rsaPublicKey.value) return
  try {
    await navigator.clipboard.writeText(rsaPublicKey.value)
    ElMessage.success('公钥已复制到剪贴板')
  } catch {
    // fallback
    const ta = document.createElement('textarea')
    ta.value = rsaPublicKey.value
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    ElMessage.success('公钥已复制到剪贴板')
  }
}

// ==================== 刷新授权状态 ====================
const refreshingAuth = ref(false)
const authRefreshResult = ref<{ type: 'success' | 'warning' | 'error'; message: string; detail?: string } | null>(null)

const handleRefreshAuthStatus = async () => {
  if (!props.configId) return
  refreshingAuth.value = true
  authRefreshResult.value = null
  try {
    const res: any = await request.post('/wecom/chat-archive/refresh-auth-status', { configId: props.configId })
    const data = res?.data || res
    if (data?.activated) {
      // ★ 根据后端返回的实际检测结果更新本地状态
      settings.status = 'active'
      settings.hasSecret = !!data.hasSecret
      settings.dataApiStatus = data.dataApiAuthorized ? 1 : 0
      settings.vasChatArchive = !!data.vasPurchased
      if (data.maxUsers > 0) settings.maxUsers = data.maxUsers
      if (data.usedUsers !== undefined) settings.usedUsers = data.usedUsers

      // 根据实际检测结果生成准确的提示信息
      const passedItems: string[] = []
      const failedItems: string[] = []
      if (data.hasSecret) passedItems.push('应用授权')
      else failedItems.push('应用授权')
      if (data.dataApiAuthorized) passedItems.push('数据与智能专区')
      else failedItems.push('数据与智能专区')
      if (data.vasPurchased) passedItems.push('增值服务')
      else failedItems.push('增值服务')

      if (failedItems.length === 0) {
        authRefreshResult.value = {
          type: 'success',
          message: '✅ 所有授权检测通过，会话存档已激活！',
          detail: `席位 ${data.usedUsers || 0}/${data.maxUsers || 0} 人，可以选择生效成员了`
        }
      } else {
        authRefreshResult.value = {
          type: 'warning',
          message: '⚠️ 会话存档已激活，但部分检测未通过',
          detail: `通过: ${passedItems.join('、') || '无'} | 未通过: ${failedItems.join('、')}。未通过项不影响基本功能，但可能限制部分高级特性。`
        }
      }
    } else {
      const issues: string[] = []
      if (!data?.hasSecret) issues.push('应用授权未完成')
      if (!data?.dataApiAuthorized) issues.push('数据与智能专区未授权')
      if (!data?.vasPurchased) issues.push('未购买会话存档服务')
      authRefreshResult.value = {
        type: 'warning',
        message: '授权状态已刷新，但尚未满足激活条件',
        detail: issues.length > 0 ? `待完成项：${issues.join('、')}` : '请确认企微端已完成所有授权步骤'
      }
      await fetchSettings()
    }
  } catch (e: any) {
    authRefreshResult.value = {
      type: 'error',
      message: '刷新授权状态失败',
      detail: e?.response?.data?.message || e?.message || '请稍后重试'
    }
  } finally {
    refreshingAuth.value = false
  }
}

const settings = reactive({
  status: 'inactive',
  hasSecret: false,
  hasPrivateKey: false,
  maxUsers: 0,
  usedUsers: 0,
  expireDate: null as string | null,
  dataApiStatus: 0,
  vasChatArchive: false,
})

const form = reactive({
  fetchInterval: 5,
  fetchMode: 'default',
  retentionDays: 180,
  mediaStorage: 'local',
  autoInspect: false,
  visibility: 'all',
  rsaPublicKey: ''
})

// ==================== 生效范围 ====================
const scopeLoading = ref(false)
const scopeSaving = ref(false)
const scopeTree = ref<any[]>([])
const scopeCheckedKeys = ref<string[]>([])
const scopeTreeRef = ref<InstanceType<typeof ElTree> | null>(null)
const scopeSelectedCount = ref(0)
const seatMembers = ref<any[]>([])

const loadScopeTree = async () => {
  if (!props.configId) return
  scopeLoading.value = true
  try {
    const [treeRes, seatRes]: any[] = await Promise.all([
      getArchiveSeatWecomTree(props.configId),
      getArchiveSeats(props.configId)
    ])
    const treeData = treeRes?.data || treeRes
    const seatData = seatRes?.data || seatRes

    if (seatData?.members) {
      seatMembers.value = seatData.members
    }

    // 构建树数据
    if (treeData?.tree) {
      const checkedKeys: string[] = []
      const transform = (nodes: any[]): any[] => {
        return nodes.map((n: any) => {
          const children: any[] = []
          // 子部门
          if (n.children?.length) {
            children.push(...transform(n.children))
          }
          // 成员节点
          if (n.members?.length) {
            for (const m of n.members) {
              const nodeId = `user_${m.wecomUserId}`
              children.push({ nodeId, label: m.name || m.wecomUserId, isUser: true, wecomUserId: m.wecomUserId })
              if (m.isSelected) checkedKeys.push(nodeId)
            }
          }
          return { nodeId: `dept_${n.id}`, label: n.name, children }
        })
      }
      scopeTree.value = transform(treeData.tree)
      scopeCheckedKeys.value = checkedKeys
      scopeSelectedCount.value = checkedKeys.length
    }
  } catch (e: any) {
    ElMessage.error(e?.message || '加载成员失败')
  } finally {
    scopeLoading.value = false
  }
}

const onScopeCheck = () => {
  if (!scopeTreeRef.value) return
  const checked = scopeTreeRef.value.getCheckedNodes(true) as any[]
  const users = checked.filter((n: any) => n.isUser)
  scopeSelectedCount.value = users.length
}

const handleSaveScope = async () => {
  if (!props.configId || !scopeTreeRef.value) return
  const checked = scopeTreeRef.value.getCheckedNodes(true) as any[]
  const users = checked.filter((n: any) => n.isUser)

  if (settings.maxUsers > 0 && users.length > settings.maxUsers) {
    ElMessage.error(`已选 ${users.length} 人，超出套餐额度 ${settings.maxUsers} 人`)
    return
  }

  scopeSaving.value = true
  try {
    await updateArchiveSeatMembers({
      configId: props.configId,
      members: users.map((u: any) => ({
        wecomUserId: u.wecomUserId,
        wecomUserName: u.label,
        isEnabled: true
      }))
    })
    ElMessage.success('生效范围已保存')
    settings.usedUsers = users.length
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  } finally {
    scopeSaving.value = false
  }
}

// ==================== 设置加载/保存 ====================
const fetchSettings = async () => {
  if (!props.configId) return
  loading.value = true
  try {
    const res: any = await getArchiveSettings(props.configId)
    if (res) {
      settings.status = res.status || 'inactive'
      settings.hasSecret = !!res.hasSecret
      settings.hasPrivateKey = !!res.hasPrivateKey
      settings.maxUsers = res.maxUsers || 0
      settings.usedUsers = res.usedUsers || 0
      settings.expireDate = res.expireDate || null
      settings.dataApiStatus = res.dataApiStatus || 0
      settings.vasChatArchive = !!res.vasChatArchive

      form.fetchInterval = res.fetchInterval || 5
      form.fetchMode = res.fetchMode || 'default'
      form.retentionDays = res.retentionDays || 180
      form.mediaStorage = res.mediaStorage || 'local'
      form.autoInspect = !!res.autoInspect
      form.visibility = res.visibility || 'all'
      form.rsaPublicKey = res.rsaPublicKey || ''
    }
  } catch (e) {
    console.error('[ArchiveSettings] Fetch error:', e)
  } finally {
    loading.value = false
  }
}

const handleSave = async () => {
  if (!props.configId) return
  saving.value = true
  try {
    const payload: any = {
      configId: props.configId,
      fetchInterval: form.fetchInterval,
      fetchMode: form.fetchMode,
      retentionDays: form.retentionDays,
      autoInspect: form.autoInspect,
      visibility: form.visibility,
    }
    // 仅私有部署模式才传这些
    if (!isSaas.value) {
      payload.mediaStorage = form.mediaStorage
      payload.rsaPublicKey = form.rsaPublicKey || undefined
    }
    await updateArchiveSettings(payload)
    ElMessage.success('存档设置已保存')
    fetchSettings()
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

const formatDate = (d: string | null | undefined) => {
  if (!d) return '-'
  try { return new Date(d).toLocaleDateString('zh-CN') } catch { return String(d) }
}

watch(() => props.configId, (val) => {
  if (val) fetchSettings()
})

onMounted(() => {
  if (props.configId) fetchSettings()
  fetchRsaPublicKey()
})

defineExpose({ fetchSettings })
</script>

<style scoped lang="scss">
.archive-settings { padding: 0; }

/* 区块卡片 */
.section-card {
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 20px 24px;
  margin-bottom: 16px;
  &.card-ok { border-left: 4px solid #67c23a; }
  &.card-warn { border-left: 4px solid #e6a23c; }
}
.section-header {
  display: flex; align-items: center; gap: 14px;
}
.section-icon { font-size: 28px; flex-shrink: 0; }
.section-main { flex: 1; }
.section-title { font-size: 17px; font-weight: 600; color: #303133; margin: 0; }
.section-desc { font-size: 13px; color: #909399; margin: 4px 0 0; }

/* 区块标题 */
.block-title { font-size: 15px; font-weight: 600; color: #303133; margin: 0 0 4px; }
.block-desc { font-size: 13px; color: #909399; margin: 0 0 12px; }
.block-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }

/* 授权检查清单 */
.auth-checklist { display: flex; flex-direction: column; gap: 10px; }
.auth-item {
  display: flex; align-items: center; gap: 10px; padding: 10px 14px;
  border-radius: 6px; background: #f5f7fa;
  &.auth-ok { background: #f0f9eb; }
  &.auth-pending { background: #fdf6ec; }
}
.auth-dot {
  width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700; flex-shrink: 0;
  .auth-ok & { background: #67c23a; color: #fff; }
  .auth-pending & { background: #e6a23c; color: #fff; }
}
.auth-content { flex: 1; }
.auth-label { font-size: 14px; font-weight: 500; color: #303133; display: block; }
.auth-hint { font-size: 12px; color: #909399; display: block; margin-top: 2px; }

/* 指引步骤 */
.guide-steps {
  margin: 8px 0 0; padding-left: 20px; font-size: 13px; color: #606266; line-height: 1.8;
  li { margin-bottom: 2px; }
}

/* 额度条 */
.quota-bar {
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
  padding: 10px 14px; background: #f5f7fa; border-radius: 6px; margin-bottom: 14px;
}
.quota-info { font-size: 13px; color: #606266; display: flex; align-items: center; gap: 4px; }
.quota-sep { color: #c0c4cc; margin: 0 2px; }

/* 成员树区域 */
.scope-tree-area { margin-top: 8px; }
.scope-empty {
  padding: 24px; text-align: center; color: #909399; font-size: 13px;
  background: #fafafa; border-radius: 6px; border: 1px dashed #dcdfe6;
  p { margin: 0; }
}

/* 可见范围 */
.visibility-group {
  display: flex !important; flex-direction: row !important; gap: 12px !important; width: 100%; flex-wrap: nowrap !important;
}
.visibility-group :deep(.el-radio) { margin-right: 0; }
.visibility-option {
  display: flex; align-items: center; gap: 10px; padding: 14px 16px;
  border: 1px solid #ebeef5; border-radius: 6px; flex: 1; min-width: 0;
  cursor: pointer; transition: all 0.2s;
  &:hover { border-color: #c0c4cc; }
  &.active { border-color: #409eff; background: #ecf5ff; }
}
.visibility-text { flex: 1; }
.visibility-label { font-size: 14px; font-weight: 500; color: #303133; display: block; }
.visibility-desc { font-size: 12px; color: #909399; display: block; margin-top: 2px; }

/* 字段提示 */
.field-label { font-size: 13px; font-weight: 500; color: #606266; display: block; margin-bottom: 6px; }
.field-hint { font-size: 12px; color: #909399; }

/* 保存栏 */
.save-bar {
  padding: 16px 0; display: flex; gap: 10px;
  border-top: 1px solid #ebeef5; margin-top: 8px;
}
</style>
