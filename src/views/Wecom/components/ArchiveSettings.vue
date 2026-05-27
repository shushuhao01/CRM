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
          <el-button type="primary" @click="openScopeDialog" :loading="scopeLoading">
            <el-icon><Edit /></el-icon> 编辑生效范围
          </el-button>
        </div>

        <!-- 额度提示 -->
        <div class="quota-bar">
          <div class="quota-info">
            <span>已生效 <strong>{{ enabledMemberList.length }}</strong> 人</span>
            <span class="quota-sep">/</span>
            <span>套餐额度 <strong>{{ settings.maxUsers }}</strong> 人</span>
          </div>
          <el-progress
            :percentage="settings.maxUsers > 0 ? Math.min(100, Math.round(enabledMemberList.length / settings.maxUsers * 100)) : 0"
            :color="enabledMemberList.length > settings.maxUsers ? '#f56c6c' : '#409eff'"
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
          <!-- 已生效成员列表 -->
          <div v-if="enabledMemberList.length > 0" class="scope-member-list">
            <div class="member-list-header">
              <span class="member-list-title">当前生效成员（{{ enabledMemberList.length }}人）</span>
            </div>
            <div class="member-list-body">
              <div v-for="m in pagedEnabledMembers" :key="m.wecomUserId" class="member-item">
                <div class="member-avatar">
                  <img v-if="m.avatar" :src="m.avatar" class="avatar-img" />
                  <span v-else class="avatar-text">{{ (m.name || m.wecomUserId).slice(-1) }}</span>
                </div>
                <div class="member-info">
                  <span class="member-name">{{ m.name || m.wecomUserName || m.wecomUserId }}</span>
                  <span class="member-id">{{ m.wecomUserId }}</span>
                </div>
                <el-button type="danger" link size="small" @click="handleRemoveMember(m)">
                  <el-icon><Delete /></el-icon> 移除
                </el-button>
              </div>
            </div>
            <!-- 分页 -->
            <div class="member-list-footer">
              <el-pagination
                v-model:current-page="memberPage"
                :page-size="memberPageSize"
                :total="enabledMemberList.length"
                layout="total, prev, pager, next"
                small
                background
              />
            </div>
          </div>
          <!-- 无成员时 -->
          <div v-else class="scope-empty">
            <el-empty description="暂无生效成员" :image-size="64">
              <el-button type="primary" @click="openScopeDialog">选择生效成员</el-button>
            </el-empty>
          </div>
        </template>
      </div>

      <!-- ==================== 生效范围弹窗 ==================== -->
      <el-dialog
        v-model="scopeDialogVisible"
        title="选择生效范围"
        width="640px"
        :close-on-click-modal="false"
        destroy-on-close
      >
        <div class="scope-dialog-content">
          <!-- 弹窗顶部额度信息 -->
          <div class="dialog-quota-bar">
            <div class="dialog-quota-left">
              <span>已选 <strong :class="{ 'over-limit': dialogSelectedCount > settings.maxUsers && settings.maxUsers > 0 }">{{ dialogSelectedCount }}</strong> 人</span>
              <span class="quota-sep">/</span>
              <span>套餐额度 <strong>{{ settings.maxUsers }}</strong> 人</span>
            </div>
            <el-tag v-if="settings.maxUsers > 0 && dialogSelectedCount > settings.maxUsers" type="danger" size="small">
              超出额度，无法保存
            </el-tag>
            <el-tag v-else-if="dialogSelectedCount > 0" type="success" size="small">
              未超出额度
            </el-tag>
          </div>
          <!-- 搜索 -->
          <el-input
            v-model="dialogSearch"
            placeholder="搜索成员姓名或ID..."
            clearable
            :prefix-icon="Search"
            style="margin-bottom: 12px"
          />
          <!-- 全选/反选 -->
          <div class="dialog-actions">
            <el-checkbox v-model="dialogSelectAll" :indeterminate="dialogIndeterminate" @change="handleDialogSelectAll">
              全选（{{ filteredDialogMembers.length }}人）
            </el-checkbox>
          </div>
          <!-- 成员列表 -->
          <div class="dialog-member-list" v-loading="dialogLoading">
            <el-checkbox-group v-model="dialogCheckedIds">
              <div v-for="m in pagedDialogMembers" :key="m.wecomUserId" class="dialog-member-item">
                <el-checkbox :label="m.wecomUserId" :value="m.wecomUserId">
                  <div class="dialog-member-row">
                    <div class="member-avatar sm">
                      <img v-if="m.avatar" :src="m.avatar" class="avatar-img" />
                      <span v-else class="avatar-text">{{ (m.name || m.wecomUserId).slice(-1) }}</span>
                    </div>
                    <span class="dialog-member-name">{{ m.name || m.wecomUserName || m.wecomUserId }}</span>
                    <span class="dialog-member-id">{{ m.wecomUserId }}</span>
                  </div>
                </el-checkbox>
              </div>
            </el-checkbox-group>
            <el-empty v-if="filteredDialogMembers.length === 0 && !dialogLoading" description="没有找到匹配的成员" :image-size="48" />
          </div>
          <!-- 弹窗内分页 -->
          <div class="dialog-pagination" v-if="filteredDialogMembers.length > dialogPageSize">
            <el-pagination
              v-model:current-page="dialogPage"
              :page-size="dialogPageSize"
              :total="filteredDialogMembers.length"
              layout="prev, pager, next"
              small
              background
            />
          </div>
        </div>
        <template #footer>
          <el-button @click="scopeDialogVisible = false">取消</el-button>
          <el-button
            type="primary"
            :loading="scopeSaving"
            :disabled="settings.maxUsers > 0 && dialogSelectedCount > settings.maxUsers"
            @click="handleDialogSave"
          >
            确定保存（{{ dialogSelectedCount }}人）
          </el-button>
        </template>
      </el-dialog>

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
          <el-form-item label="质检人员">
            <div>
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px">
                <el-button size="small" type="primary" plain @click="openAuditMemberDialog">选择质检人员</el-button>
                <span class="field-hint">可查看「标记风险」按钮、「风险审计」和「敏感词管理」的CRM成员</span>
              </div>
              <div v-if="form.auditMembers.length > 0" class="audit-member-tags">
                <el-tag v-for="uid in form.auditMembers" :key="uid" closable size="small" @close="removeAuditMember(uid)" style="margin: 2px 4px 2px 0">
                  {{ getAuditMemberName(uid) }}
                </el-tag>
              </div>
              <div v-else style="font-size: 12px; color: #9ca3af">未设置时仅管理员可见</div>
            </div>
          </el-form-item>
        </el-form>
      </div>

      <!-- 质检人员选择弹窗 -->
      <el-dialog v-model="auditDialogVisible" title="选择质检人员" width="500px" destroy-on-close>
        <el-input v-model="auditSearch" placeholder="搜索成员" clearable size="small" prefix-icon="Search" style="margin-bottom: 12px" />
        <div style="max-height: 360px; overflow-y: auto; border: 1px solid #f0f0f0; border-radius: 6px; padding: 8px" v-loading="auditUsersLoading">
          <el-checkbox-group v-model="auditCheckedIds">
            <div v-for="user in filteredCrmUsers" :key="user.id" style="padding: 6px 8px; display: flex; align-items: center; gap: 8px; border-bottom: 1px solid #fafafa">
              <el-checkbox :label="String(user.id)" :value="String(user.id)">
                <span style="font-size: 13px">{{ user.name || user.username }}</span>
                <span style="font-size: 11px; color: #9ca3af; margin-left: 6px">{{ user.role === 'admin' ? '管理员' : user.role === 'super_admin' ? '超级管理员' : user.roleName || user.role || '' }}</span>
              </el-checkbox>
            </div>
          </el-checkbox-group>
          <el-empty v-if="filteredCrmUsers.length === 0 && !auditUsersLoading" description="暂无成员" :image-size="40" />
        </div>
        <div style="margin-top: 8px; font-size: 12px; color: #6b7280">已选 {{ auditCheckedIds.length }} 人</div>
        <template #footer>
          <el-button @click="auditDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="confirmAuditMembers">确定</el-button>
        </template>
      </el-dialog>

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
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Loading, CopyDocument, Edit, Delete, Search } from '@element-plus/icons-vue'
import { getArchiveSettings, updateArchiveSettings, getArchiveSeats, updateArchiveSeatMembers, getArchiveRsaPublicKey } from '@/api/wecom'
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
  rsaPublicKey: '',
  auditMembers: [] as string[],
})

const auditDialogVisible = ref(false)
const auditSearch = ref('')
const auditCheckedIds = ref<string[]>([])
const crmUsers = ref<any[]>([])
const auditUsersLoading = ref(false)

const loadCrmUsers = async () => {
  auditUsersLoading.value = true
  try {
    const res: any = await request.get('/users', { params: { pageSize: 500 } })
    const data = res?.data?.list || res?.list || res?.data || []
    crmUsers.value = Array.isArray(data) ? data : []
  } catch { crmUsers.value = [] }
  finally { auditUsersLoading.value = false }
}

const filteredCrmUsers = computed(() => {
  const kw = auditSearch.value.trim().toLowerCase()
  if (!kw) return crmUsers.value
  return crmUsers.value.filter((u: any) =>
    (u.name || '').toLowerCase().includes(kw) || (u.username || '').toLowerCase().includes(kw)
  )
})

const openAuditMemberDialog = async () => {
  if (crmUsers.value.length === 0) await loadCrmUsers()
  auditCheckedIds.value = [...form.auditMembers]
  auditSearch.value = ''
  auditDialogVisible.value = true
}

const confirmAuditMembers = () => {
  form.auditMembers = [...auditCheckedIds.value]
  auditDialogVisible.value = false
}

const removeAuditMember = (userId: string) => {
  form.auditMembers = form.auditMembers.filter(id => id !== userId)
}

const getAuditMemberName = (userId: string) => {
  const user = crmUsers.value.find((u: any) => String(u.id) === String(userId))
  return user?.name || user?.username || userId
}

// ==================== 生效范围 ====================
const scopeLoading = ref(false)
const scopeSaving = ref(false)
const allMembers = ref<any[]>([])
const memberPage = ref(1)
const memberPageSize = 10

const enabledMemberList = computed(() => allMembers.value.filter(m => m.isEnabled))
const pagedEnabledMembers = computed(() => {
  const start = (memberPage.value - 1) * memberPageSize
  return enabledMemberList.value.slice(start, start + memberPageSize)
})

const loadMembers = async () => {
  if (!props.configId) return
  scopeLoading.value = true
  try {
    const res: any = await getArchiveSeats(props.configId)
    const data = res?.data || res
    if (data?.members) {
      allMembers.value = data.members
    }
    if (data?.maxUsers !== undefined) settings.maxUsers = data.maxUsers
    if (data?.usedUsers !== undefined) settings.usedUsers = data.usedUsers
  } catch (e: any) {
    console.error('[ArchiveSettings] Load members error:', e)
  } finally {
    scopeLoading.value = false
  }
}

const handleRemoveMember = async (member: any) => {
  try {
    await ElMessageBox.confirm(`确定移除「${member.name || member.wecomUserId}」的存档生效权限？`, '移除成员', {
      type: 'warning',
      confirmButtonText: '确定移除',
      cancelButtonText: '取消'
    })
  } catch { return }

  if (!props.configId) return
  scopeSaving.value = true
  try {
    const remaining = enabledMemberList.value
      .filter(m => m.wecomUserId !== member.wecomUserId)
    await updateArchiveSeatMembers({
      configId: props.configId,
      members: remaining.map((m: any) => ({
        wecomUserId: m.wecomUserId,
        wecomUserName: m.name || m.wecomUserName,
        isEnabled: true
      }))
    })
    const target = allMembers.value.find(m => m.wecomUserId === member.wecomUserId)
    if (target) target.isEnabled = false
    settings.usedUsers = remaining.length
    ElMessage.success('已移除')
  } catch (e: any) {
    ElMessage.error(e?.message || '移除失败')
  } finally {
    scopeSaving.value = false
  }
}

// ==================== 生效范围弹窗 ====================
const scopeDialogVisible = ref(false)
const dialogLoading = ref(false)
const dialogSearch = ref('')
const dialogCheckedIds = ref<string[]>([])
const dialogPage = ref(1)
const dialogPageSize = 20
const dialogSelectAll = ref(false)
const dialogIndeterminate = ref(false)

const filteredDialogMembers = computed(() => {
  const kw = dialogSearch.value.trim().toLowerCase()
  if (!kw) return allMembers.value
  return allMembers.value.filter(m =>
    (m.name || '').toLowerCase().includes(kw) ||
    (m.wecomUserName || '').toLowerCase().includes(kw) ||
    (m.wecomUserId || '').toLowerCase().includes(kw)
  )
})

const pagedDialogMembers = computed(() => {
  const start = (dialogPage.value - 1) * dialogPageSize
  return filteredDialogMembers.value.slice(start, start + dialogPageSize)
})

const dialogSelectedCount = computed(() => dialogCheckedIds.value.length)

watch(dialogCheckedIds, (ids) => {
  const total = filteredDialogMembers.value.length
  if (total === 0) {
    dialogSelectAll.value = false
    dialogIndeterminate.value = false
  } else if (ids.length === total) {
    dialogSelectAll.value = true
    dialogIndeterminate.value = false
  } else if (ids.length > 0) {
    dialogSelectAll.value = false
    dialogIndeterminate.value = true
  } else {
    dialogSelectAll.value = false
    dialogIndeterminate.value = false
  }
})

watch(dialogSearch, () => { dialogPage.value = 1 })

const handleDialogSelectAll = (val: any) => {
  if (val) {
    dialogCheckedIds.value = filteredDialogMembers.value.map(m => m.wecomUserId)
  } else {
    dialogCheckedIds.value = []
  }
}

const openScopeDialog = async () => {
  if (!props.configId) return
  scopeDialogVisible.value = true
  dialogSearch.value = ''
  dialogPage.value = 1

  if (allMembers.value.length === 0) {
    dialogLoading.value = true
    await loadMembers()
    dialogLoading.value = false
  }
  dialogCheckedIds.value = enabledMemberList.value.map(m => m.wecomUserId)
}

const handleDialogSave = async () => {
  if (!props.configId) return
  const selectedIds = new Set(dialogCheckedIds.value)
  const enabledCount = selectedIds.size

  if (settings.maxUsers > 0 && enabledCount > settings.maxUsers) {
    ElMessage.error(`已选 ${enabledCount} 人，超出套餐额度 ${settings.maxUsers} 人，请减少选择`)
    return
  }

  scopeSaving.value = true
  try {
    const members = allMembers.value
      .filter(m => selectedIds.has(m.wecomUserId))
      .map(m => ({
        wecomUserId: m.wecomUserId,
        wecomUserName: m.name || m.wecomUserName || '',
        isEnabled: true
      }))
    await updateArchiveSeatMembers({ configId: props.configId, members })
    // 更新本地状态
    for (const m of allMembers.value) {
      m.isEnabled = selectedIds.has(m.wecomUserId)
    }
    settings.usedUsers = enabledCount
    memberPage.value = 1
    scopeDialogVisible.value = false
    ElMessage.success(`生效范围已保存，共 ${enabledCount} 人`)
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
      try { form.auditMembers = typeof res.auditMembers === 'string' ? JSON.parse(res.auditMembers || '[]') : (res.auditMembers || []) } catch { form.auditMembers = [] }
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
      auditMembers: form.auditMembers,
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
  if (val) {
    fetchSettings()
    loadMembers()
  }
})

onMounted(() => {
  if (props.configId) {
    fetchSettings()
    loadMembers()
  }
  fetchRsaPublicKey()
  loadCrmUsers()
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

/* 成员列表区域 */
.scope-member-list {
  border: 1px solid #ebeef5; border-radius: 8px; overflow: hidden;
}
.member-list-header {
  padding: 10px 16px; background: #f5f7fa; border-bottom: 1px solid #ebeef5;
  display: flex; justify-content: space-between; align-items: center;
}
.member-list-title { font-size: 13px; font-weight: 500; color: #606266; }
.member-list-body { padding: 4px 0; }
.member-item {
  display: flex; align-items: center; gap: 12px; padding: 10px 16px;
  transition: background 0.15s;
  &:hover { background: #f9fafb; }
  &:not(:last-child) { border-bottom: 1px solid #f2f3f5; }
}
.member-avatar {
  width: 36px; height: 36px; border-radius: 50%; overflow: hidden;
  flex-shrink: 0; display: flex; align-items: center; justify-content: center;
  background: #409eff; color: #fff; font-size: 14px; font-weight: 500;
  &.sm { width: 28px; height: 28px; font-size: 12px; }
  .avatar-img { width: 100%; height: 100%; object-fit: cover; }
  .avatar-text { line-height: 1; }
}
.member-info { flex: 1; min-width: 0; }
.member-name { font-size: 14px; color: #303133; display: block; font-weight: 500; }
.member-id { font-size: 12px; color: #909399; display: block; margin-top: 2px; }
.member-list-footer {
  padding: 10px 16px; border-top: 1px solid #ebeef5; background: #fafbfc;
  display: flex; justify-content: flex-end;
}

.scope-empty {
  padding: 32px; text-align: center; color: #909399; font-size: 13px;
  background: #fafafa; border-radius: 6px; border: 1px dashed #dcdfe6;
}

/* 弹窗内样式 */
.scope-dialog-content { max-height: 520px; display: flex; flex-direction: column; }
.dialog-quota-bar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 14px; background: #f5f7fa; border-radius: 6px; margin-bottom: 12px;
  font-size: 13px; color: #606266;
  strong.over-limit { color: #f56c6c; }
}
.dialog-quota-left { display: flex; align-items: center; gap: 4px; }
.dialog-actions {
  display: flex; align-items: center; margin-bottom: 8px; padding: 0 4px;
  font-size: 13px;
}
.dialog-member-list {
  flex: 1; overflow-y: auto; max-height: 340px;
  border: 1px solid #ebeef5; border-radius: 6px; padding: 4px 0;
}
.dialog-member-item {
  padding: 8px 14px;
  &:hover { background: #f5f7fa; }
  :deep(.el-checkbox__label) { display: flex; align-items: center; }
}
.dialog-member-row {
  display: flex; align-items: center; gap: 10px;
}
.dialog-member-name { font-size: 14px; color: #303133; font-weight: 500; }
.dialog-member-id { font-size: 12px; color: #909399; margin-left: 4px; }
.dialog-pagination { padding-top: 12px; display: flex; justify-content: center; }

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
