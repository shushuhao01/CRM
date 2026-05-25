<template>
  <div class="page-container">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>服务商应用管理</span>
        </div>
      </template>

      <!-- 多应用选择器 -->
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px; padding: 12px 16px; background: #f9fafb; border-radius: 8px;">
        <span style="font-size: 13px; color: #606266; white-space: nowrap;">当前应用：</span>
        <el-select v-model="currentConfigId" placeholder="选择应用" style="width: 280px" @change="handleSwitchConfig">
          <el-option v-for="item in suiteConfigList" :key="item.id" :value="item.id"
            :label="`${item.appName || '未命名'} (${item.appType === 'miniprogram' ? '小程序' : '网页应用'})${item.isEnabled ? '' : ' [已禁用]'}`"
          />
        </el-select>
        <el-button type="primary" plain size="small" @click="handleAddConfig">+ 添加应用</el-button>
        <el-button v-if="suiteConfigList.length > 1 && currentConfigId" type="danger" plain size="small" @click="handleDeleteConfig">删除当前</el-button>
      </div>

      <el-tabs v-model="activeTab">
        <!-- Tab1: 应用配置 -->
        <el-tab-pane label="应用配置" name="config">
          <el-alert type="info" :closable="false" style="margin-bottom: 16px">
            <template #title><strong>💡 应用配置说明</strong></template>
            <div style="font-size: 12px; line-height: 1.8; margin-top: 4px">
              在此配置我们作为第三方服务商开发的企微应用信息。配置好Suite ID/Secret后，系统即可生成授权链接让租户扫码安装。
              租户扫码授权后，我们的CRM即可调用企微API获取该企业的通讯录、客户、群、会话存档等能力。
            </div>
          </el-alert>
          <el-form :model="suiteConfig" label-width="130px" style="max-width: 700px">
            <el-divider content-position="left">基础信息</el-divider>
            <el-form-item label="应用类型">
              <el-radio-group v-model="suiteConfig.appType">
                <el-radio value="web">网页应用</el-radio>
                <el-radio value="miniprogram">小程序应用</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="应用名称">
              <el-input v-model="suiteConfig.appName" placeholder="如：云客CRM企微助手" />
            </el-form-item>
            <el-form-item label="应用简介">
              <el-input v-model="suiteConfig.appDescription" type="textarea" :rows="2" />
            </el-form-item>
            <el-form-item label="应用状态">
              <el-tag :type="suiteConfig.appStatus === 'online' ? 'success' : 'info'" size="small">
                {{ suiteConfig.appStatus === 'online' ? '已上线' : '未上线' }}
              </el-tag>
            </el-form-item>

            <el-divider content-position="left">开发凭证</el-divider>
            <el-form-item label="Suite ID">
              <div style="display: flex; gap: 8px; width: 100%">
                <el-input v-model="suiteConfig.suiteId" placeholder="ww..." />
                <el-button size="small" @click="copyText(suiteConfig.suiteId)">复制</el-button>
              </div>
            </el-form-item>
            <el-form-item label="Suite Secret">
              <div style="display: flex; gap: 8px; width: 100%">
                <el-input v-model="suiteConfig.suiteSecret" placeholder="Suite Secret" show-password />
                <el-button size="small" @click="handleTestSuiteConnection" :loading="testingConnection">测试</el-button>
              </div>
              <div class="key-field-actions" style="margin-top: 4px">
                <el-button text size="small" @click="toggleSuiteSecret('suiteSecret')">
                  {{ showSuiteSecret ? '🙈 隐藏' : '👁️ 查看实际值' }}
                </el-button>
                <el-button v-if="showSuiteSecret" text size="small" @click="copySuiteSecret('suiteSecret')">
                  📋 复制
                </el-button>
                <span style="font-size: 11px; color: #909399; margin-left: 8px">保存后密钥仅显示掩码</span>
              </div>
            </el-form-item>
            <el-form-item label="Suite Ticket">
              <el-tag v-if="suiteConfig.suiteTicket" type="success" size="small">自动接收中</el-tag>
              <el-tag v-else type="warning" size="small">未接收</el-tag>
              <span v-if="suiteConfig.ticketUpdateTime" style="margin-left: 8px; font-size: 12px; color: #909399">
                最近: {{ formatDate(suiteConfig.ticketUpdateTime) }}
              </span>
              <el-button text size="small" style="margin-left: 8px" @click="handleClearSuiteCache">🔄 清除Token缓存</el-button>
            </el-form-item>

            <el-divider content-position="left">服务商信息</el-divider>
            <el-form-item label="服务商CorpID">
              <el-input v-model="suiteConfig.providerCorpId" placeholder="ww_provider_..." />
            </el-form-item>
            <el-form-item label="服务商Secret">
              <div style="display: flex; gap: 8px; width: 100%">
                <el-input v-model="suiteConfig.providerSecret" placeholder="Secret" show-password />
                <el-button size="small" @click="handleTestProviderConnection" :loading="testingProvider">测试</el-button>
              </div>
              <div class="key-field-actions" style="margin-top: 4px">
                <el-button text size="small" @click="toggleSuiteSecret('providerSecret')">
                  {{ showProviderSecret ? '🙈 隐藏' : '👁️ 查看实际值' }}
                </el-button>
                <el-button v-if="showProviderSecret" text size="small" @click="copySuiteSecret('providerSecret')">
                  📋 复制
                </el-button>
                <span style="font-size: 11px; color: #909399; margin-left: 8px">保存后密钥仅显示掩码，此配置同步到「会话存档代购-供应商配置」</span>
              </div>
            </el-form-item>

            <el-divider content-position="left">授权回调域名</el-divider>
            <el-form-item label="回调域名">
              <div style="display: flex; gap: 8px; width: 100%">
                <el-input v-model="suiteConfig.redirectDomain" placeholder="https://admin.yunkes.com" />
              </div>
              <div style="font-size: 11px; color: #e6a23c; margin-top: 4px; line-height: 1.6">
                ⚠️ 必须与企微服务商后台「授权完成回调域名」配置完全一致（含https://前缀，不含路径）。
                生成授权链接时将使用此域名构造redirect_uri，域名不匹配会导致扫码报错。
              </div>
            </el-form-item>

            <el-divider content-position="left">应用权限范围</el-divider>
            <el-form-item label="权限">
              <el-checkbox-group v-model="suiteConfig.permissions">
                <el-checkbox label="contact">通讯录(读取)</el-checkbox>
                <el-checkbox label="external_contact">外部联系人</el-checkbox>
                <el-checkbox label="customer_group">客户群</el-checkbox>
                <el-checkbox label="customer_acquisition">获客助手</el-checkbox>
                <el-checkbox label="contact_way">联系我(活码)</el-checkbox>
                <el-checkbox label="sidebar">侧边栏</el-checkbox>
                <el-checkbox label="chat_archive">会话存档</el-checkbox>
                <el-checkbox label="kf">微信客服</el-checkbox>
                <el-checkbox label="external_pay">对外收款</el-checkbox>
              </el-checkbox-group>
            </el-form-item>

            <el-divider content-position="left">会话存档RSA密钥对</el-divider>
            <el-alert type="warning" :closable="false" style="margin-bottom: 12px">
              <template #title>此RSA密钥对为<strong>服务商级别全局配置</strong></template>
              公钥：租户在CRM「存档设置」中复制，粘贴到企微后台「管理工具 → 企业会话内容 → 加密密钥」。<br/>
              私钥：服务端用于解密所有授权企业的会话消息。公钥和私钥必须为同一对。
            </el-alert>
            <el-form-item label="RSA公钥">
              <div style="width: 100%">
                <el-button v-if="!showRsaPublicKeyInput" size="small" @click="showRsaPublicKeyInput = true">
                  {{ suiteConfig.chatArchiveRsaPublicKey ? '已配置 - 点击修改' : '粘贴公钥' }}
                </el-button>
                <template v-else>
                  <el-input
                    v-model="rsaPublicKeyInput"
                    type="textarea"
                    :rows="6"
                    placeholder="-----BEGIN PUBLIC KEY-----&#10;...&#10;-----END PUBLIC KEY-----"
                    style="margin-bottom: 8px"
                  />
                  <p style="font-size: 12px; color: #909399; margin: 0 0 4px">此公钥将展示给租户，供其复制到企微后台「加密密钥」处。</p>
                  <el-button size="small" @click="showRsaPublicKeyInput = false">收起</el-button>
                </template>
              </div>
            </el-form-item>
            <el-form-item label="RSA私钥">
              <div style="width: 100%">
                <el-button v-if="!showRsaInput" size="small" @click="showRsaInput = true">
                  {{ suiteConfig.chatArchiveRsaPrivateKey === '******' ? '已配置 - 点击修改' : '粘贴私钥' }}
                </el-button>
                <template v-else>
                  <el-input
                    v-model="rsaPrivateKeyInput"
                    type="textarea"
                    :rows="6"
                    placeholder="-----BEGIN PRIVATE KEY-----&#10;...&#10;-----END PRIVATE KEY-----"
                    style="margin-bottom: 8px"
                  />
                  <el-button size="small" @click="showRsaInput = false">收起</el-button>
                </template>
              </div>
            </el-form-item>

            <el-divider content-position="left">数据与智能专区程序</el-divider>
            <el-alert type="info" :closable="false" style="margin-bottom: 12px">
              <div style="font-size: 12px; line-height: 1.8">
                第三方应用需通过专区程序拉取会话存档消息。请在企微服务商后台创建专区程序后，将分配的程序ID和能力ID填写到下方。
                未配置时，会话存档将使用外部联系人元数据模式（仅显示会话列表，不含聊天内容）。
              </div>
            </el-alert>
            <el-form-item label="专区程序ID">
              <el-input v-model="suiteConfig.zoneProgramId" placeholder="program_id（企微服务商后台分配）" />
            </el-form-item>
            <el-form-item label="专区能力ID（通用）">
              <el-input v-model="suiteConfig.zoneAbilityId" placeholder="ability_id（专区程序默认能力ID，如 chat_analysis）" />
            </el-form-item>
            <el-form-item label="会话记录能力ID">
              <el-input v-model="suiteConfig.zoneSyncMsgAbilityId" placeholder="可选，获取会话记录专用（如 invoke_sync_msg），为空则使用上方通用能力ID" />
            </el-form-item>

            <el-form-item>
              <el-button v-permission="'wecom-management:suite:edit'" type="primary" @click="handleSaveConfig" :loading="saving">保存配置</el-button>
              <el-button v-permission="'wecom-management:suite:edit'" @click="handleTestSuiteConnection" :loading="testingConnection">测试连接</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- Tab2: 授权管理 -->
        <el-tab-pane label="授权管理" name="auth">
          <el-alert type="info" :closable="false" style="margin-bottom: 12px">
            <template #title><strong>💡 授权管理说明</strong></template>
            <div style="font-size: 12px; line-height: 1.8; margin-top: 4px">
              管理哪些企业已安装了我们的第三方应用。企业管理员扫描授权链接二维码 → 同意安装 → 出现在下方列表 →
              管理员点击"关联租户"将该企业绑定到CRM租户 → 该租户的CRM系统即可使用企微功能（通讯录、客户、群、会话存档等）。
              <strong>授权权限范围由「应用配置」Tab中勾选的权限统一控制，所有企业获得相同权限。</strong>
            </div>
          </el-alert>
          <!-- 授权链接记录 -->
          <el-divider content-position="left">授权链接</el-divider>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px">
            <span style="font-size: 13px; color: #606266">已生成的授权链接，可查看二维码、复制链接或下载二维码</span>
            <div>
              <el-button v-permission="'wecom-management:suite:edit'" type="primary" size="small" @click="showAuthLinkDialog = true">创建授权链接</el-button>
              <el-button size="small" @click="fetchAuthLinks">刷新</el-button>
            </div>
          </div>
          <el-table :data="pagedAuthLinkList" v-loading="authLinksLoading" stripe size="small">
            <el-table-column label="类型" width="90">
              <template #default="{ row }">
                <el-tag size="small" :type="row.type === 'tenant' ? 'warning' : ''">{{ row.type === 'tenant' ? '指定租户' : '通用' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="80" align="center">
              <template #default="{ row }">
                <el-tag size="small" :type="row.status === 'authorized' ? 'success' : row.status === 'expired' ? 'info' : 'warning'">
                  {{ { pending: '待扫码', authorized: '已授权', expired: '已过期', cancelled: '已取消' }[row.status] || row.status }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="创建时间" width="160">
              <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
            </el-table-column>
            <el-table-column label="过期时间" width="160">
              <template #default="{ row }">{{ formatDate(row.expiresAt) }}</template>
            </el-table-column>
            <el-table-column label="授权企业" min-width="120">
              <template #default="{ row }">
                <span v-if="row.authCorpName">{{ row.authCorpName }}</span>
                <span v-else style="color: #909399">-</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="240" fixed="right">
              <template #default="{ row }">
                <el-button type="primary" link size="small" @click="viewLinkQrCode(row)">二维码</el-button>
                <el-button type="success" link size="small" @click="copyText(row.authUrl)">复制链接</el-button>
                <el-button link size="small" @click="openLinkInBrowser(row)">打开</el-button>
                <el-button v-permission="'wecom-management:suite:edit'" type="danger" link size="small" @click="handleDeleteAuthLink(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <div style="display: flex; justify-content: flex-end; margin-top: 12px; margin-bottom: 24px">
            <el-pagination
              v-model:current-page="authLinkPage"
              :page-size="authLinkPageSize"
              :total="authLinkList.length"
              layout="total, prev, pager, next"
              small
            />
          </div>

          <!-- 已授权企业列表 -->
          <el-divider content-position="left">已授权企业</el-divider>
          <div class="tab-toolbar">
            <div class="auth-stats">
              <el-tag effect="dark" type="primary">已授权: {{ authStats.total }}</el-tag>
              <el-tag effect="dark" type="success">活跃: {{ authStats.active }}</el-tag>
              <el-tag effect="dark" type="warning">待处理: {{ authStats.pending }}</el-tag>
              <el-tag effect="dark" type="info">已取消: {{ authStats.cancelled }}</el-tag>
            </div>
            <div>
              <el-button @click="fetchAuths">刷新</el-button>
            </div>
          </div>

          <el-table :data="pagedAuthList" v-loading="authLoading" stripe>
            <el-table-column label="企业信息" min-width="220">
              <template #default="{ row }">
                <div style="display: flex; align-items: center; gap: 8px">
                  <img v-if="row.corpSquareLogoUrl" :src="row.corpSquareLogoUrl" style="max-width: 120px; max-height: 32px; object-fit: contain; border-radius: 4px; flex-shrink: 0" />
                  <div style="min-width: 0">
                    <div style="font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap" :title="row.corpFullName || row.authCorpName || row.corpName">
                      {{ row.authCorpName || row.corpName }}
                    </div>
                    <div v-if="row.corpFullName && row.corpFullName !== row.authCorpName" style="font-size: 12px; color: #909399; overflow: hidden; text-overflow: ellipsis; white-space: nowrap" :title="row.corpFullName">
                      {{ row.corpFullName }}
                    </div>
                  </div>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="corpId" label="CorpID" width="170" show-overflow-tooltip />
            <el-table-column label="行业/规模" width="140">
              <template #default="{ row }">
                <div v-if="row.corpIndustry || row.corpScale">
                  <div v-if="row.corpIndustry" style="font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap" :title="`${row.corpIndustry}${row.corpSubIndustry ? ' - ' + row.corpSubIndustry : ''}`">
                    {{ row.corpIndustry }}
                  </div>
                  <div v-if="row.corpScale" style="font-size: 12px; color: #909399">{{ row.corpScale }}</div>
                </div>
                <span v-else style="color: #c0c4cc; font-size: 12px">-</span>
              </template>
            </el-table-column>
            <el-table-column label="授权管理员" width="120" show-overflow-tooltip>
              <template #default="{ row }">
                <span v-if="row.authAdminUserId">{{ row.authAdminUserId }}</span>
                <span v-else style="color: #c0c4cc; font-size: 12px">-</span>
              </template>
            </el-table-column>
            <el-table-column label="关联租户" width="140">
              <template #default="{ row }">
                <span v-if="row.tenantId" style="color: #67c23a">{{ row.tenantName || row.tenantId }}</span>
                <el-button v-else v-permission="'wecom-management:suite:edit'" type="warning" link size="small" @click="openBindDialog(row)">待关联</el-button>
              </template>
            </el-table-column>
            <el-table-column label="授权时间" width="155">
              <template #default="{ row }">{{ formatDate(row.authTime) }}</template>
            </el-table-column>
            <el-table-column label="连接状态" width="90" align="center">
              <template #default="{ row }">
                <el-tag :type="row.connectionStatus === 'connected' ? 'success' : row.connectionStatus === 'disconnected' ? 'danger' : 'info'" size="small" effect="plain">
                  {{ { connected: '已连接', disconnected: '已断开', pending: '待连接' }[row.connectionStatus] || row.connectionStatus || '未知' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="85" align="center">
              <template #default="{ row }">
                <el-tag :type="row.status === 'active' ? 'success' : row.status === 'pending' ? 'warning' : 'info'" size="small">
                  {{ { active: '活跃', pending: '待处理', cancelled: '已取消' }[row.status] || row.status }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="200" fixed="right">
              <template #default="{ row }">
                <el-button type="primary" link size="small" @click="viewAuthDetail(row)">详情</el-button>
                <el-button v-if="!row.tenantId" v-permission="'wecom-management:suite:edit'" type="warning" link size="small" @click="openBindDialog(row)">关联租户</el-button>
                <el-button v-if="row.status === 'active'" v-permission="'wecom-management:suite:edit'" type="danger" link size="small" @click="handleCancelAuth(row)">取消</el-button>
              </template>
            </el-table-column>
          </el-table>
          <div style="display: flex; justify-content: flex-end; margin-top: 12px">
            <el-pagination
              v-model:current-page="authListPage"
              :page-size="authListPageSize"
              :total="authList.length"
              layout="total, prev, pager, next"
              small
            />
          </div>
        </el-tab-pane>

        <!-- Tab3: 回调配置 -->
        <el-tab-pane label="回调配置" name="callback">
          <el-alert type="info" :closable="false" style="margin-bottom: 16px">
            <template #title><strong>💡 回调配置说明</strong></template>
            <div style="font-size: 12px; line-height: 1.8; margin-top: 4px">
              <p><strong>回调 = 企微服务器主动推送事件到我们服务器</strong>。配置步骤：</p>
              <p>1. 复制下方的回调URL、Token、EncodingAESKey</p>
              <p>2. 登录<a href="https://open.work.weixin.qq.com" target="_blank" style="color:#409eff">企微服务商后台</a>，<strong style="color:#E6A23C">在以下两处都填入相同的URL、Token、AESKey</strong>：</p>
              <p style="padding-left:12px">① <strong>通用开发参数 → 系统事件接收URL</strong>（接收 suite_ticket 自动推送，每10分钟一次）</p>
              <p style="padding-left:12px">② <strong>应用管理 → 应用 → 回调配置 → 数据回调URL / 指令回调URL</strong>（接收授权变更等事件）</p>
              <p>3. <strong style="color:#F56C6C">重要：两处必须使用完全相同的 Token 和 EncodingAESKey，否则自动推送的 suite_ticket 会因签名不匹配被丢弃！</strong></p>
              <p>4. 保存后，企微会每10分钟推送 suite_ticket，用于获取access_token</p>
            </div>
          </el-alert>
          <el-form label-width="140px" style="max-width: 700px">
            <el-divider content-position="left">服务商回调(接收suite_ticket)</el-divider>
            <el-form-item label="回调URL">
              <div style="display: flex; gap: 8px; width: 100%">
                <el-input :model-value="callbackUrl" readonly />
                <el-button size="small" @click="copyText(callbackUrl)">复制</el-button>
              </div>
            </el-form-item>
            <el-form-item label="Token">
              <div style="display: flex; gap: 8px; width: 100%">
                <el-input v-model="suiteConfig.callbackToken" />
                <el-button size="small" @click="suiteConfig.callbackToken = generateRandom(32)">随机生成</el-button>
              </div>
            </el-form-item>
            <el-form-item label="EncodingAESKey">
              <div style="display: flex; gap: 8px; width: 100%">
                <el-input v-model="suiteConfig.callbackEncodingAesKey" />
                <el-button size="small" @click="suiteConfig.callbackEncodingAesKey = generateRandom(43)">随机生成</el-button>
              </div>
            </el-form-item>
            <el-form-item>
              <el-button v-permission="'wecom-management:suite:edit'" type="primary" @click="handleSaveConfig" :loading="saving">保存回调配置</el-button>
            </el-form-item>

            <!-- Web登录授权配置 -->
            <el-divider content-position="left">Web登录授权配置（会话展示组件需要）</el-divider>
            <el-alert type="info" :closable="false" style="margin-bottom: 12px">
              <template #title><strong>💡 Web登录授权说明</strong></template>
              <div style="font-size: 12px; line-height: 1.7; margin-top: 4px">
                <p>会话展示组件在普通浏览器中使用时，需要用户通过企微扫码登录。</p>
                <p>请在服务商后台「登录授权」页面获取 SuiteID 和 Secret，并配置可信域名、Token、Key。</p>
                <p><strong style="color:#E6A23C">注意：登录授权的 SuiteID/Secret 与应用的 Suite ID/Secret 不同！</strong></p>
              </div>
            </el-alert>
            <el-form-item label="登录授权AppID">
              <div style="display: flex; gap: 8px; width: 100%">
                <el-input v-model="suiteConfig.webLoginAppId" placeholder="服务商后台「登录授权」页面的SuiteID（如: ww21d5ed18ba4402af）" />
              </div>
            </el-form-item>
            <el-form-item label="登录授权Secret">
              <div style="display: flex; gap: 8px; width: 100%">
                <el-input v-model="suiteConfig.webLoginSecret" placeholder="服务商后台「登录授权」页面的Secret" />
              </div>
            </el-form-item>
            <el-form-item label="可信域名">
              <el-input v-model="suiteConfig.webLoginRedirectDomain" placeholder="如: crm.yunkes.com（与服务商后台登录授权的可信域名一致）" />
            </el-form-item>
            <el-form-item label="指令回调URL">
              <div style="display: flex; gap: 8px; width: 100%; align-items: center">
                <el-input :model-value="webLoginCallbackUrl" readonly />
                <el-button size="small" @click="copyText(webLoginCallbackUrl)">复制</el-button>
              </div>
            </el-form-item>
            <el-form-item label="Token">
              <div style="display: flex; gap: 8px; width: 100%">
                <el-input v-model="suiteConfig.webLoginToken" placeholder="与服务商后台登录授权配置的Token一致" />
                <el-button size="small" @click="suiteConfig.webLoginToken = generateRandom(32)">随机生成</el-button>
              </div>
            </el-form-item>
            <el-form-item label="EncodingAESKey">
              <div style="display: flex; gap: 8px; width: 100%">
                <el-input v-model="suiteConfig.webLoginEncodingAesKey" placeholder="与服务商后台登录授权配置的EncodingAESKey一致" />
                <el-button size="small" @click="suiteConfig.webLoginEncodingAesKey = generateRandom(43)">随机生成</el-button>
              </div>
            </el-form-item>
            <el-form-item>
              <el-button v-permission="'wecom-management:suite:edit'" type="primary" @click="handleSaveConfig" :loading="saving">保存Web登录配置</el-button>
              <el-button :loading="webLoginTesting" @click="testWebLoginConnection">测试连接</el-button>
              <el-tag v-if="suiteConfig.webLoginToken && suiteConfig.webLoginAppId" type="success" size="small" style="margin-left: 12px">已配置 ✓</el-tag>
              <el-tag v-else type="info" size="small" style="margin-left: 12px">未配置</el-tag>
            </el-form-item>

            <!-- ★ Suite Ticket 健康诊断 + 手动注入（用于回调URL故障期间的紧急保活） -->
            <el-divider content-position="left">Suite Ticket 诊断 / 紧急救急</el-divider>
            <el-alert type="warning" :closable="false" style="margin-bottom: 12px">
              <template #title><strong>⚠️ 当 CRM 端报错「invalid suite ticket」(40085) 时</strong></template>
              <div style="font-size: 12px; line-height: 1.7; margin-top: 4px">
                <p>1. 先点击「Ticket诊断」查看回调推送是否正常、ticket 是否过期、推荐排查方向；</p>
                <p>2. 若回调URL不可达，可在企微服务商后台「应用 → 数据回调 → 调用日志」复制最新 SuiteTicket，使用「手动注入」临时救急；</p>
                <p>3. 注入后会自动清除 suite/corp 双 token 缓存，CRM 端无需重启即可恢复连接。</p>
              </div>
            </el-alert>
            <el-form-item>
              <div style="display: flex; gap: 8px; flex-wrap: wrap">
                <el-button :loading="diagnosticLoading" @click="loadDiagnostic">🔍 Ticket诊断</el-button>
                <el-button type="warning" plain @click="manualTicketDialogVisible = true">🚑 手动注入Ticket</el-button>
                <el-button type="info" plain @click="handleClearSuiteCache">🔄 清除Token缓存</el-button>
              </div>
            </el-form-item>
            <el-form-item v-if="diagnosticData">
              <div class="diagnostic-card">
                <div class="diag-row">
                  <span class="diag-label">Suite ID:</span>
                  <code>{{ diagnosticData.suiteId || '未配置' }}</code>
                </div>
                <div class="diag-row">
                  <span class="diag-label">Ticket状态:</span>
                  <el-tag :type="diagnosticData.ticketStale ? 'danger' : 'success'" size="small">
                    {{ diagnosticData.ticketStale ? '已过期' : '有效' }}
                  </el-tag>
                  <span v-if="diagnosticData.ticketPreview" style="margin-left:8px;color:#909399;font-size:12px">{{ diagnosticData.ticketPreview }}</span>
                </div>
                <div class="diag-row">
                  <span class="diag-label">距上次推送:</span>
                  <span>{{ diagnosticData.ticketAgeMinutes >= 0 ? diagnosticData.ticketAgeMinutes + ' 分钟' : '从未' }}</span>
                </div>
                <div class="diag-row">
                  <span class="diag-label">回调健康度:</span>
                  <el-tag :type="diagnosticData.callbackHealth === 'healthy' ? 'success' : 'danger'" size="small">
                    {{ healthLabel(diagnosticData.callbackHealth) }}
                  </el-tag>
                  <span style="margin-left:8px;color:#909399;font-size:12px">最近1小时推送 {{ diagnosticData.suiteTicketEventCountLastHour }} 次</span>
                </div>
                <div class="diag-row">
                  <span class="diag-label">期望回调URL:</span>
                  <code style="font-size:11px;word-break:break-all">{{ diagnosticData.callbackUrlExpected }}</code>
                </div>
                <div v-if="diagnosticData.recentCallback" class="diag-row">
                  <span class="diag-label">最近一次回调:</span>
                  <el-tag :type="diagnosticData.recentCallback.status === 'success' ? 'success' : 'danger'" size="small">
                    {{ diagnosticData.recentCallback.infoType }} - {{ diagnosticData.recentCallback.status }}
                  </el-tag>
                  <span style="margin-left:8px;color:#909399;font-size:12px">{{ formatDate(diagnosticData.recentCallback.time) }}</span>
                </div>
                <!-- 实时企微API探测结果 -->
                <div v-if="diagnosticData.liveProbe" class="diag-row" style="border-top:1px dashed #e4e7ed;margin-top:8px;padding-top:8px">
                  <span class="diag-label">实时探测:</span>
                  <el-tag :type="diagnosticData.liveProbe.errcode === 0 ? 'success' : 'danger'" size="small">
                    errcode={{ diagnosticData.liveProbe.errcode }}
                  </el-tag>
                  <span style="margin-left:8px;color:#606266;font-size:12px">
                    secretLen={{ diagnosticData.liveProbe.secretLength }} | ticketLen={{ diagnosticData.liveProbe.ticketLengthClean }}{{ diagnosticData.liveProbe.ticketWasTrimmed ? '(已自动trim)' : '' }}
                  </span>
                </div>
                <div v-if="diagnosticData.liveProbe?.reason" class="diag-recommendation" :class="{ 'diag-error': diagnosticData.liveProbe.errcode !== 0 }">
                  <strong>探测结论：</strong>
                  <pre>{{ diagnosticData.liveProbe.reason }}</pre>
                  <pre v-if="diagnosticData.liveProbe.errmsg" style="color:#909399;font-size:11px">{{ diagnosticData.liveProbe.errmsg }}</pre>
                </div>
                <div v-if="diagnosticData.recommendation" class="diag-recommendation">
                  <strong>诊断建议：</strong>
                  <pre>{{ diagnosticData.recommendation }}</pre>
                </div>
              </div>
            </el-form-item>

            <el-divider content-position="left">回调事件接收日志</el-divider>
          </el-form>

          <!-- 手动注入 Ticket 弹窗 -->
          <el-dialog v-model="manualTicketDialogVisible" title="🚑 手动注入 Suite Ticket" width="560px">
            <el-alert type="info" :closable="false" style="margin-bottom: 12px">
              <div style="font-size: 12px; line-height: 1.7">
                <p><strong>使用场景：</strong>回调URL暂时不可达，但企微服务商后台仍能看到 ticket 推送日志。</p>
                <p><strong>获取方式：</strong>登录企微服务商后台 → 应用管理 → 找到我们的应用 → 数据回调 → 调用日志，复制最新一条 suite_ticket 的 Ticket 字段。</p>
                <p style="color:#e6a23c"><strong>注意：</strong>ticket 30 分钟过期，注入后请尽快修复回调URL，否则下次仍会失效。</p>
              </div>
            </el-alert>
            <el-form label-width="100px">
              <el-form-item label="Suite Ticket" required>
                <el-input v-model="manualTicketInput" type="textarea" :rows="3" placeholder="粘贴从企微后台复制的 suite_ticket（一长串字符）" />
              </el-form-item>
            </el-form>
            <template #footer>
              <el-button @click="manualTicketDialogVisible = false">取消</el-button>
              <el-button type="primary" :loading="manualTicketSubmitting" @click="handleManualTicketSubmit">验证并注入</el-button>
            </template>
          </el-dialog>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px">
            <div style="display: flex; align-items: center; gap: 8px">
              <span style="font-size: 13px; color: #606266">手动清理</span>
              <el-select v-model="cleanDays" size="small" style="width: 130px">
                <el-option :value="7" label="7天前" />
                <el-option :value="15" label="15天前" />
                <el-option :value="30" label="30天前" />
                <el-option :value="60" label="60天前" />
                <el-option :value="90" label="90天前" />
              </el-select>
              <el-button type="danger" size="small" plain :loading="cleaning" @click="handleCleanLogs">清理日志</el-button>
              <el-button size="small" :loading="callbackLogsLoading" @click="fetchCallbackLogs" icon="Refresh">刷新</el-button>
            </div>
            <div style="display: flex; align-items: center; gap: 8px">
              <span style="font-size: 13px; color: #606266">自动清理</span>
              <el-switch v-model="autoCleanConfig.enabled" size="small" @change="handleAutoCleanChange" />
              <template v-if="autoCleanConfig.enabled">
                <span style="font-size: 12px; color: #909399">保留</span>
                <el-input-number v-model="autoCleanConfig.retentionDays" :min="1" :max="365" size="small" style="width: 100px" />
                <span style="font-size: 12px; color: #909399">天</span>
                <el-button size="small" @click="handleSaveAutoClean" :loading="savingAutoClean">保存</el-button>
              </template>
            </div>
          </div>
          <el-table :data="pagedCallbackLogs" v-loading="callbackLogsLoading" stripe size="small">
            <el-table-column label="时间" width="170">
              <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
            </el-table-column>
            <el-table-column prop="eventType" label="事件类型" width="160" />
            <el-table-column label="状态" width="90" align="center">
              <template #default="{ row }">
                <el-tag :type="row.status === 'success' ? 'success' : 'danger'" size="small">{{ row.status === 'success' ? '成功' : '失败' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="detail" label="详情" min-width="200" show-overflow-tooltip />
          </el-table>
          <div style="margin-top: 12px; display: flex; justify-content: flex-end">
            <el-pagination
              v-model:current-page="callbackLogPage"
              v-model:page-size="callbackLogPageSize"
              :total="callbackLogTotal"
              :page-sizes="[10, 20, 50]"
              layout="total, sizes, prev, pager, next"
              small
              @size-change="fetchCallbackLogs"
              @current-change="fetchCallbackLogs"
            />
          </div>
        </el-tab-pane>

        <!-- Tab4: 小程序配置 -->
        <el-tab-pane label="小程序配置" name="miniprogram">
          <el-alert type="info" :closable="false" style="margin-bottom: 16px">
            <template #title><strong>📱 小程序配置说明</strong></template>
            <div style="font-size: 12px; line-height: 1.8; margin-top: 4px">
              <p>配置客户自助填写资料的微信小程序相关信息。配置好后，CRM侧边栏的「客户资料收集」应用即可向客户发送小程序卡片。</p>
              <p>需在<a href="https://mp.weixin.qq.com" target="_blank" style="color:#409eff">微信公众平台</a>注册小程序并获取AppID和AppSecret。</p>
            </div>
          </el-alert>
          <el-form :model="mpConfig" label-width="140px" style="max-width: 700px">
            <el-form-item label="启用小程序资料收集">
              <el-switch v-model="mpConfig.mpEnabled" />
              <span style="margin-left: 12px; font-size: 12px; color: #909399">{{ mpConfig.mpEnabled ? '已启用，侧边栏可发送小程序卡片收集客户资料' : '未启用' }}</span>
            </el-form-item>
            <el-divider content-position="left">小程序凭证</el-divider>
            <el-form-item label="小程序 AppID">
              <div style="display: flex; gap: 8px; width: 100%">
                <el-input v-model="mpConfig.mpAppId" placeholder="wx..." />
                <el-button size="small" @click="copyText(mpConfig.mpAppId)">复制</el-button>
              </div>
            </el-form-item>
            <el-form-item label="小程序 AppSecret">
              <el-input v-model="mpConfig.mpAppSecret" placeholder="小程序Secret" show-password />
              <div class="key-field-actions" style="margin-top: 4px">
                <el-button text size="small" @click="toggleMpSecret">
                  {{ showMpAppSecret ? '🙈 隐藏' : '👁️ 查看实际值' }}
                </el-button>
                <el-button v-if="showMpAppSecret" text size="small" @click="copyMpSecret">
                  📋 复制
                </el-button>
                <span style="font-size: 11px; color: #909399; margin-left: 8px">保存后密钥会加密存储，前端仅显示掩码</span>
              </div>
            </el-form-item>
            <el-form-item label="表单签名密钥">
              <div style="display: flex; gap: 8px; width: 100%">
                <el-input v-model="mpConfig.mpFormSecret" placeholder="点击右侧按钮随机生成即可" show-password />
                <el-button size="small" @click="mpConfig.mpFormSecret = generateRandom(32)">随机生成</el-button>
              </div>
              <div style="font-size: 11px; color: #909399; margin-top: 4px">
                系统内部使用的防篡改密钥，非微信密钥，点击「随机生成」即可。签名公式: sign = MD5(tenantId + memberId + ts + SECRET)
              </div>
            </el-form-item>

            <el-divider content-position="left">消息推送回调（预留）</el-divider>
            <el-alert type="warning" :closable="false" style="margin-bottom: 12px">
              <div style="font-size: 11px; line-height: 1.6">
                当前小程序功能暂不依赖消息推送，此配置为预留。如后续需要接入客服消息、订阅通知等功能，请在
                <a href="https://mp.weixin.qq.com" target="_blank" style="color:#409eff">微信公众平台</a>
                → 开发管理 → 消息推送 中填入以下回调URL、Token和EncodingAESKey。
              </div>
            </el-alert>
            <el-form-item label="回调URL">
              <div style="display: flex; gap: 8px; width: 100%">
                <el-input :model-value="mpCallbackUrl" readonly />
                <el-button size="small" @click="copyText(mpCallbackUrl)">复制</el-button>
              </div>
              <div style="font-size: 11px; color: #909399; margin-top: 4px">
                微信公众平台 → 开发管理 → 消息推送 → URL(服务器地址) 填入此地址
              </div>
            </el-form-item>
            <el-form-item label="Token(令牌)">
              <div style="display: flex; gap: 8px; width: 100%">
                <el-input v-model="mpConfig.mpCallbackToken" placeholder="与微信后台消息推送配置中的Token一致" />
                <el-button size="small" @click="mpConfig.mpCallbackToken = generateRandom(32)">随机生成</el-button>
              </div>
            </el-form-item>
            <el-form-item label="EncodingAESKey">
              <div style="display: flex; gap: 8px; width: 100%">
                <el-input v-model="mpConfig.mpCallbackEncodingAesKey" placeholder="与微信后台消息推送配置中的EncodingAESKey一致" />
                <el-button size="small" @click="mpConfig.mpCallbackEncodingAesKey = generateRandom(43)">随机生成</el-button>
              </div>
            </el-form-item>

            <el-divider content-position="left">卡片与链接配置</el-divider>
            <el-form-item label="卡片标题">
              <el-input v-model="mpConfig.mpCardTitle" placeholder="如：请填写您的个人资料" />
              <div style="font-size: 11px; color: #909399; margin-top: 4px">
                默认值：「请填写您的个人资料」，各租户可在侧边栏中覆盖
              </div>
            </el-form-item>
            <el-form-item label="卡片封面图">
              <div style="display:flex;gap:8px;width:100%;align-items:center">
                <el-input v-model="mpConfig.mpCardCoverUrl" placeholder="https://... 或点击上传" style="flex:1" />
                <el-button type="primary" size="small" @click="triggerImageUpload('cover', 500, 400)">📤 上传图片</el-button>
                <div v-if="mpConfig.mpCardCoverUrl" style="display:flex;align-items:center;gap:6px;flex-shrink:0">
                  <el-image :src="mpConfig.mpCardCoverUrl" :preview-src-list="[mpConfig.mpCardCoverUrl]" fit="contain" style="width:64px;height:48px;border-radius:6px;border:1px solid #ebeef5;cursor:pointer" preview-teleported />
                  <el-button type="danger" link size="small" @click="handleDeleteMpFile('mpCardCoverUrl')">✕</el-button>
                </div>
              </div>
              <div style="font-size:11px;color:#909399;margin-top:4px">推荐尺寸 500×400（5:4），用于小程序分享卡片封面。上传后自动裁剪到合适尺寸</div>
            </el-form-item>
            <el-form-item label="海报模板">
              <div style="display:flex;gap:8px;width:100%;align-items:center">
                <el-input v-model="mpConfig.mpPosterUrl" placeholder="https://... 或点击上传" style="flex:1" />
                <el-button type="primary" size="small" @click="triggerImageUpload('poster', 750, 1334)">📤 上传图片</el-button>
                <div v-if="mpConfig.mpPosterUrl" style="display:flex;align-items:center;gap:6px;flex-shrink:0">
                  <el-image :src="mpConfig.mpPosterUrl" :preview-src-list="[mpConfig.mpPosterUrl]" fit="contain" style="width:36px;height:64px;border-radius:6px;border:1px solid #ebeef5;cursor:pointer" preview-teleported />
                  <el-button type="danger" link size="small" @click="handleDeleteMpFile('mpPosterUrl')">✕</el-button>
                </div>
              </div>
              <div style="font-size:11px;color:#909399;margin-top:4px">推荐尺寸 750×1334，用于生成含小程序码的推广海报。各租户可在侧边栏覆盖</div>
            </el-form-item>
            <el-form-item label="链接有效期(天)">
              <el-input-number v-model="mpConfig.mpLinkExpireDays" :min="1" :max="365" />
              <span style="margin-left: 8px; font-size: 12px; color: #909399">默认7天</span>
            </el-form-item>

            <el-form-item>
              <el-button v-permission="'wecom-management:suite:edit'" type="primary" @click="handleSaveMpConfig" :loading="mpSaving">保存小程序配置</el-button>
              <el-button @click="handleTestMpConnection" :loading="mpTesting" :disabled="!mpConfig.mpAppId">🔗 测试连接</el-button>
            </el-form-item>
          </el-form>

          <!-- 小程序卡片预览 (仿微信转发卡片样式) -->
          <el-divider content-position="left">小程序卡片预览</el-divider>
          <div style="margin-bottom:24px;max-width:360px">
            <div style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 6px rgba(0,0,0,0.1);border:1px solid #e8e8e8">
              <div style="padding:10px 12px 6px">
                <div style="font-size:14px;color:#303133;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">{{ mpConfig.mpCardTitle || '请填写您的个人资料' }}</div>
              </div>
              <div style="position:relative;width:100%;height:0;padding-bottom:80%;overflow:hidden;background:#f5f7fa">
                <img v-if="mpConfig.mpCardCoverUrl" :src="mpConfig.mpCardCoverUrl" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover" />
                <div v-else style="position:absolute;top:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#c0c4cc;font-size:13px">未设置封面图</div>
              </div>
              <div style="padding:6px 12px;display:flex;align-items:center;gap:4px;border-top:1px solid #f0f0f0">
                <span style="font-size:12px;color:#b0b0b0">🔗</span>
                <span style="font-size:11px;color:#909399">小程序</span>
              </div>
            </div>
          </div>

          <!-- 海报预览 (含小程序码) -->
          <el-divider content-position="left">海报预览</el-divider>
          <div style="margin-bottom:24px;max-width:360px">
            <div v-if="mpConfig.mpPosterUrl" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);border:1px solid #ebeef5">
              <div style="position:relative;width:100%">
                <img :src="mpConfig.mpPosterUrl" style="width:100%;display:block;object-fit:contain" />
              </div>
              <div style="padding:16px;text-align:center;border-top:1px solid #f0f0f0">
                <div v-if="adminWxacodeBase64" style="margin-bottom:12px">
                  <img :src="adminWxacodeBase64" style="width:120px;height:120px;border-radius:8px" />
                  <div style="font-size:11px;color:#909399;margin-top:4px">长按识别小程序码</div>
                </div>
                <div v-else style="margin-bottom:12px">
                  <div style="width:120px;height:120px;margin:0 auto;border:2px dashed #dcdfe6;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#c0c4cc;font-size:12px;line-height:1.4;text-align:center;flex-direction:column">
                    <span>暂无小程序码</span>
                    <span style="font-size:11px;margin-top:2px">请先配置AppID</span>
                  </div>
                </div>
                <el-button size="small" type="primary" @click="handleFetchAdminWxacode" :loading="adminWxacodeLoading" style="margin-right:8px">生成小程序码</el-button>
                <el-button size="small" @click="handleDownloadAdminPoster" :disabled="!mpConfig.mpPosterUrl">下载海报</el-button>
              </div>
            </div>
            <div v-else style="padding:32px;text-align:center;color:#c0c4cc;background:#fafafa;border-radius:12px;border:1px dashed #dcdfe6">
              <div style="font-size:32px;margin-bottom:8px">🖼️</div>
              <div style="font-size:13px">未设置海报模板，请上传海报图片</div>
            </div>
          </div>
        </el-tab-pane>

        <!-- Tab5: 通知模板 -->
        <el-tab-pane label="通知模板" name="templates">
          <el-alert type="info" :closable="false" style="margin-bottom: 16px">
            <template #title><strong>💡 通知模板说明</strong></template>
            <div style="font-size: 12px; line-height: 1.8; margin-top: 4px">
              <p>在企微服务商后台申请的消息通知模板，审核通过后会获得模板ID。将模板ID配置到此处后，系统即可通过企微API向授权企业推送应用通知。</p>
              <p>每种通知场景可配置多个模板（用于不同服务商应用），启用后系统会自动按通知范围推送：<strong>个人看个人、部门经理看团队、管理员收到所有通知</strong>。</p>
            </div>
          </el-alert>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px">
            <div style="display: flex; align-items: center; gap: 8px">
              <el-tag effect="dark" type="primary">已配置: {{ templateList.length }}</el-tag>
              <el-tag effect="dark" type="success">已启用: {{ templateList.filter((t: any) => t.isEnabled).length }}</el-tag>
            </div>
            <el-button v-permission="'wecom-management:suite:edit'" type="primary" @click="openTemplateDialog()">+ 添加模板</el-button>
          </div>

          <!-- 按预定义场景分组展示模板 -->
          <div v-loading="templateLoading">
            <div v-for="preset in PRESET_TEMPLATES" :key="preset.type" class="tpl-category-card">
              <div class="tpl-category-header">
                <div class="tpl-category-title">
                  <el-icon :size="16" style="margin-right: 6px; color: #409eff"><component :is="iconMap[preset.icon]" /></el-icon>
                  <strong>{{ preset.name }}</strong>
                  <el-tag size="small" type="info" style="margin-left: 8px">{{ preset.type }}</el-tag>
                </div>
                <div style="display: flex; align-items: center; gap: 8px">
                  <el-tag v-if="getTemplatesByType(preset.type).length > 0" size="small" :type="getTemplatesByType(preset.type).some((t: any) => t.isEnabled) ? 'success' : 'info'">
                    {{ getTemplatesByType(preset.type).some((t: any) => t.isEnabled) ? '已启用' : '未启用' }}
                  </el-tag>
                  <el-tag v-else size="small" type="warning">未配置</el-tag>
                  <el-button v-permission="'wecom-management:suite:edit'" type="primary" link size="small" @click="openTemplateDialog(undefined, preset.type)">+ 添加</el-button>
                </div>
              </div>
              <div class="tpl-category-desc">{{ preset.description }}</div>

              <!-- 通知内容预览 -->
              <div class="tpl-content-preview">
                <div class="tpl-content-label">通知内容模板：</div>
                <div class="tpl-content-text">{{ preset.sampleContent }}</div>
              </div>

              <!-- 变量列表 -->
              <div class="tpl-variables">
                <span class="tpl-var-label">模板变量：</span>
                <el-tag v-for="v in preset.variables" :key="v.key" size="small" effect="plain" style="margin-right: 4px; margin-bottom: 4px">
                  {{ wrapVar(v.key) }} {{ v.label }}
                </el-tag>
              </div>

              <!-- 已配置的模板列表 -->
              <div v-if="getTemplatesByType(preset.type).length > 0" class="tpl-items">
                <div v-for="tpl in getTemplatesByType(preset.type)" :key="tpl.id" class="tpl-item">
                  <div class="tpl-item-main">
                    <div class="tpl-item-id">
                      <span style="color: #606266; font-size: 12px; margin-right: 6px">模板ID：</span>
                      <code style="font-size: 12px; color: #303133; word-break: break-all; user-select: all">{{ tpl.templateId }}</code>
                      <el-button type="primary" link size="small" style="margin-left: 4px" @click="copyText(tpl.templateId)">复制</el-button>
                    </div>
                    <div class="tpl-item-meta">
                      <el-tag size="small" :type="notifyScopeTagType(tpl.notifyScope)">
                        {{ notifyScopeLabels[tpl.notifyScope] || '全部通知' }}
                      </el-tag>
                      <span v-if="tpl.description" style="font-size: 11px; color: #909399; margin-left: 8px">{{ tpl.description }}</span>
                    </div>
                  </div>
                  <div class="tpl-item-actions">
                    <el-switch v-model="tpl.isEnabled" size="small" @change="handleToggleTemplate(tpl)" />
                    <el-button v-permission="'wecom-management:suite:edit'" type="primary" link size="small" @click="openTemplateDialog(tpl)">编辑</el-button>
                    <el-button v-permission="'wecom-management:suite:edit'" type="danger" link size="small" @click="handleDeleteTemplate(tpl)">删除</el-button>
                  </div>
                </div>
              </div>
            </div>

            <!-- 自定义模板区域 -->
            <div v-if="getTemplatesByType('custom').length > 0" class="tpl-category-card">
              <div class="tpl-category-header">
                <div class="tpl-category-title">
                  <el-icon :size="16" style="margin-right: 6px; color: #909399"><component :is="iconMap['Setting']" /></el-icon>
                  <strong>自定义模板</strong>
                </div>
              </div>
              <div class="tpl-category-desc">除以上预设场景外的自定义通知模板</div>
              <div class="tpl-items">
                <div v-for="tpl in getTemplatesByType('custom')" :key="tpl.id" class="tpl-item">
                  <div class="tpl-item-main">
                    <div style="font-weight: 500; font-size: 13px; margin-bottom: 2px">{{ tpl.templateName }}</div>
                    <div class="tpl-item-id">
                      <span style="color: #606266; font-size: 12px; margin-right: 6px">模板ID：</span>
                      <code style="font-size: 12px; color: #303133; word-break: break-all; user-select: all">{{ tpl.templateId }}</code>
                    </div>
                    <div class="tpl-item-meta">
                      <el-tag size="small" :type="notifyScopeTagType(tpl.notifyScope)">
                        {{ notifyScopeLabels[tpl.notifyScope] || '全部通知' }}
                      </el-tag>
                      <span v-if="tpl.description" style="font-size: 11px; color: #909399; margin-left: 8px">{{ tpl.description }}</span>
                    </div>
                  </div>
                  <div class="tpl-item-actions">
                    <el-switch v-model="tpl.isEnabled" size="small" @change="handleToggleTemplate(tpl)" />
                    <el-button v-permission="'wecom-management:suite:edit'" type="primary" link size="small" @click="openTemplateDialog(tpl)">编辑</el-button>
                    <el-button v-permission="'wecom-management:suite:edit'" type="danger" link size="small" @click="handleDeleteTemplate(tpl)">删除</el-button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 生成授权链接弹窗 -->
    <el-dialog v-model="showAuthLinkDialog" title="生成授权链接" width="560px" destroy-on-close>
      <el-alert type="info" :closable="false" style="margin-bottom: 16px">
        <template #title><strong>📋 使用说明</strong></template>
        <div style="margin-top: 4px; font-size: 12px; line-height: 1.8">
          <p>1. 生成链接后，将链接发送给目标企业的管理员</p>
          <p>2. 管理员在<strong>电脑浏览器</strong>中打开链接 → 页面会展示企微官方授权二维码</p>
          <p>3. 管理员用<strong>企业微信App</strong>扫描页面上的二维码 → 确认授权安装</p>
          <p>4. 授权成功后，该企业会出现在「已授权企业」列表中</p>
          <p>5. 管理员点击"关联租户"绑定到CRM租户 → 该租户即可使用企微功能</p>
          <p style="color: #e6a23c">⚠️ 此链接必须在PC浏览器打开（企微限制），不能直接手机扫码打开</p>
          <p style="color: #e6a23c">⚠️ 请确保「应用配置」中已填写正确的「授权回调域名」，否则会报域名不一致错误</p>
        </div>
      </el-alert>
      <el-form label-width="100px">
        <el-form-item label="授权类型">
          <el-radio-group v-model="authLinkForm.type">
            <el-radio label="general">
              <span>通用链接</span>
              <span style="font-size: 11px; color: #909399; margin-left: 4px">（任意企业可扫码授权）</span>
            </el-radio>
            <el-radio label="tenant">
              <span>指定租户链接</span>
              <span style="font-size: 11px; color: #909399; margin-left: 4px">（仅指定租户可用）</span>
            </el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="authLinkForm.type === 'tenant'" label="指定租户">
          <el-input v-model="authLinkForm.tenantId" placeholder="输入租户ID" />
        </el-form-item>
        <el-form-item label="有效期">
          <el-select v-model="authLinkForm.expireDays" style="width: 100%">
            <el-option label="1天（临时测试）" :value="1" />
            <el-option label="7天" :value="7" />
            <el-option label="30天" :value="30" />
            <el-option label="90天" :value="90" />
            <el-option label="365天（1年）" :value="365" />
            <el-option label="永久有效" :value="0" />
          </el-select>
          <div style="font-size: 11px; color: #909399; margin-top: 4px">
            链接有效期指扫码安装的有效期，授权成功后不受此限制
          </div>
        </el-form-item>
        <el-form-item v-if="generatedLink" label="授权链接">
          <el-input :model-value="generatedLink" readonly type="textarea" :rows="3" />
          <div style="display: flex; gap: 8px; margin-top: 8px">
            <el-button size="small" type="primary" @click="copyText(generatedLink)">📋 复制链接</el-button>
            <el-button size="small" @click="showQrCodeDialog = true">📱 生成二维码</el-button>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAuthLinkDialog = false">关闭</el-button>
        <el-button v-permission="'wecom-management:suite:edit'" type="primary" @click="handleGenerateLink" :loading="generatingLink">生成链接</el-button>
      </template>
    </el-dialog>

    <!-- 二维码弹窗 -->
    <el-dialog v-model="showQrCodeDialog" title="授权二维码" width="360px" append-to-body>
      <div style="text-align: center; padding: 16px">
        <canvas ref="authQrCanvas" style="border: 1px solid #e5e7eb; border-radius: 12px; padding: 8px"></canvas>
        <p style="margin-top: 12px; font-size: 13px; color: #606266">请在电脑浏览器中打开此链接，页面会显示企微官方二维码供管理员扫码授权</p>
        <p style="margin-top: 4px; font-size: 11px; color: #e6a23c">注意：此二维码不能直接用手机扫码，需在PC打开链接后扫描页面中的二维码</p>
        <el-button type="primary" size="small" style="margin-top: 8px" @click="downloadAuthQr">下载二维码</el-button>
      </div>
    </el-dialog>

    <!-- 关联租户弹窗 -->
    <el-dialog v-model="showBindDialog" title="关联租户" width="480px" destroy-on-close>
      <el-form label-width="80px">
        <el-form-item label="企业">{{ bindTarget?.corpName }}</el-form-item>
        <el-form-item label="关联对象">
          <el-select
            v-model="bindTenantId"
            filterable
            remote
            reserve-keyword
            :remote-method="searchBindableCustomers"
            :loading="bindableLoading"
            placeholder="搜索租户名称/编码/联系人"
            style="width: 100%"
            clearable
            popper-class="bind-customer-select-popper"
            @visible-change="onBindSelectVisible"
          >
            <el-option
              v-for="item in bindableCustomers"
              :key="item.id"
              :label="item.label"
              :value="item.id"
            >
              <div style="display: flex; justify-content: space-between; align-items: center">
                <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap">{{ item.name }}</span>
                <el-tag :type="item.customerType === 'tenant' ? '' : 'warning'" size="small" style="margin-left: 8px; flex-shrink: 0">
                  {{ item.customerType === 'tenant' ? '租户' : '私有' }}
                </el-tag>
              </div>
              <div style="font-size: 12px; color: #909399; line-height: 1.4">{{ item.code }}{{ item.contact ? ` · ${item.contact}` : '' }}</div>
            </el-option>
            <el-option v-if="bindableHasMore" value="__loadmore__" disabled>
              <div
                style="text-align: center; cursor: pointer; color: #409eff; font-size: 13px; padding: 4px 0"
                @click.stop="loadMoreBindableCustomers"
              >
                {{ bindableLoadingMore ? '加载中...' : '点击加载更多' }}
              </div>
            </el-option>
            <el-option v-if="!bindableLoading && bindableCustomers.length === 0 && bindableKeyword" value="__empty__" disabled>
              <div style="text-align: center; color: #909399; font-size: 13px">无匹配结果</div>
            </el-option>
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showBindDialog = false">取消</el-button>
        <el-button v-permission="'wecom-management:suite:edit'" type="primary" @click="handleBindTenant" :loading="binding" :disabled="!bindTenantId || bindTenantId === '__loadmore__' || bindTenantId === '__empty__'">确认关联</el-button>
      </template>
    </el-dialog>

    <!-- 授权企业详情弹窗 -->
    <el-dialog v-model="showAuthDetailDialog" title="授权企业详情" width="680px">
      <div v-if="authDetailData">
        <div v-if="authDetailData.corpSquareLogoUrl" style="text-align: center; margin-bottom: 12px">
          <img :src="authDetailData.corpSquareLogoUrl" style="max-width: 120px; height: 48px; object-fit: contain; border-radius: 8px" />
        </div>
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="企业简称">{{ authDetailData.authCorpName || authDetailData.corpName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="企业全称">{{ authDetailData.corpFullName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="CorpID">{{ authDetailData.corpId }}</el-descriptions-item>
          <el-descriptions-item label="SuiteID">{{ authDetailData.suiteId || '-' }}</el-descriptions-item>
          <el-descriptions-item label="行业">
            {{ authDetailData.corpIndustry ? `${authDetailData.corpIndustry}${authDetailData.corpSubIndustry ? ' - ' + authDetailData.corpSubIndustry : ''}` : '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="企业规模">{{ authDetailData.corpScale || '-' }}</el-descriptions-item>
          <el-descriptions-item label="授权管理员">{{ authDetailData.authAdminUserId || '-' }}</el-descriptions-item>
          <el-descriptions-item label="授权时间">{{ formatDate(authDetailData.authTime) }}</el-descriptions-item>
          <el-descriptions-item label="授权模式">
            <el-tag :type="authDetailData.authMode === 'third_party' ? 'warning' : ''" size="small">
              {{ authDetailData.authMode === 'third_party' ? '第三方应用' : '自建应用' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="连接状态">
            <el-tag :type="authDetailData.connectionStatus === 'connected' ? 'success' : authDetailData.connectionStatus === 'disconnected' ? 'danger' : 'info'" size="small">
              {{ { connected: '已连接', disconnected: '已断开', pending: '待连接' }[authDetailData.connectionStatus] || '未知' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="启用状态">
            <el-tag :type="authDetailData.isEnabled ? 'success' : 'danger'" size="small">{{ authDetailData.isEnabled ? '已启用' : '已停用' }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="业务状态">
            <el-tag :type="authDetailData.status === 'active' ? 'success' : authDetailData.status === 'pending' ? 'warning' : 'info'" size="small">
              {{ { active: '活跃', pending: '待处理', cancelled: '已取消' }[authDetailData.status] || authDetailData.status }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="关联租户">
            <span v-if="authDetailData.tenantId" style="color: #67c23a">{{ authDetailData.tenantName || authDetailData.tenantId }}</span>
            <span v-else style="color: #e6a23c">未关联</span>
          </el-descriptions-item>
          <el-descriptions-item label="增值服务">
            <el-tag v-if="authDetailData.vasChatArchive" type="success" size="small">会话存档已开通 ({{ authDetailData.vasUserCount || 0 }}人)</el-tag>
            <span v-else style="color: #c0c4cc">未开通</span>
          </el-descriptions-item>
          <el-descriptions-item label="增值到期" v-if="authDetailData.vasChatArchive">{{ authDetailData.vasExpireDate || '-' }}</el-descriptions-item>
          <el-descriptions-item label="API调用次数">{{ authDetailData.apiCallCount || 0 }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDate(authDetailData.createdAt) }}</el-descriptions-item>
        </el-descriptions>
      </div>
      <template #footer>
        <el-button @click="showAuthDetailDialog = false">关闭</el-button>
        <el-button v-if="authDetailData && !authDetailData.tenantId" v-permission="'wecom-management:suite:edit'" type="warning" @click="showAuthDetailDialog = false; openBindDialog(authDetailData)">关联租户</el-button>
      </template>
    </el-dialog>

    <!-- 通知模板编辑弹窗 -->
    <el-dialog v-model="templateDialogVisible" :title="editingTemplate ? '编辑模板' : '添加模板'" width="600px" destroy-on-close>
      <el-form :model="templateForm" label-width="100px">
        <el-form-item label="模板类型" required>
          <el-select v-model="templateForm.templateType" style="width: 100%" @change="handleTemplateTypeChange">
            <el-option-group label="预设通知场景">
              <el-option v-for="p in PRESET_TEMPLATES" :key="p.type" :label="p.name" :value="p.type" />
            </el-option-group>
            <el-option-group label="其他">
              <el-option label="自定义" value="custom" />
            </el-option-group>
          </el-select>
        </el-form-item>
        <el-form-item label="模板名称" required>
          <el-input v-model="templateForm.templateName" placeholder="如：客户删除好友提醒" />
        </el-form-item>
        <el-form-item label="模板ID" required>
          <el-input v-model="templateForm.templateId" placeholder="从企微服务商后台获取的模板ID（如：tteXZIcwAA...）" />
          <div style="font-size: 11px; color: #909399; margin-top: 4px">在企微服务商后台「应用管理 → 应用通知 → 模板管理」中获取</div>
        </el-form-item>
        <el-form-item label="通知范围" required>
          <el-radio-group v-model="templateForm.notifyScope">
            <el-radio value="self">
              <span>仅当事人</span>
              <span style="font-size: 11px; color: #909399; margin-left: 4px">（个人看个人）</span>
            </el-radio>
            <el-radio value="team">
              <span>当事人+经理</span>
              <span style="font-size: 11px; color: #909399; margin-left: 4px">（部门经理看团队）</span>
            </el-radio>
            <el-radio value="all">
              <span>全部</span>
              <span style="font-size: 11px; color: #909399; margin-left: 4px">（管理员收到所有）</span>
            </el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="关联应用">
          <el-select v-model="templateForm.suiteConfigId" placeholder="不限（所有应用通用）" clearable style="width: 100%">
            <el-option v-for="item in suiteConfigList" :key="item.id" :value="item.id"
              :label="`${item.appName || '未命名'} (${item.suiteId || '-'})`" />
          </el-select>
          <div style="font-size: 11px; color: #909399; margin-top: 4px">关联到指定的服务商应用，不选则对所有应用生效</div>
        </el-form-item>
        <el-form-item label="用途描述">
          <el-input v-model="templateForm.description" type="textarea" :rows="2" placeholder="模板的用途说明（可选）" />
        </el-form-item>

        <!-- 选中预设模板时，显示变量与内容预览 -->
        <template v-if="selectedPreset">
          <el-divider content-position="left" style="margin: 12px 0">通知内容预览</el-divider>
          <el-form-item label="通知内容">
            <div style="background: #f5f7fa; padding: 10px 14px; border-radius: 6px; font-size: 13px; color: #303133; line-height: 1.8; border: 1px solid #e4e7ed">
              {{ selectedPreset.sampleContent }}
            </div>
          </el-form-item>
          <el-form-item label="模板变量">
            <div style="display: flex; flex-wrap: wrap; gap: 6px">
              <el-tag v-for="v in selectedPreset.variables" :key="v.key" effect="plain" size="small">
                <strong>{{ wrapVar(v.key) }}</strong>
                <span style="margin-left: 4px; color: #909399">{{ v.label }}</span>
                <span v-if="v.sample" style="margin-left: 4px; color: #c0c4cc; font-size: 11px">示例: {{ v.sample }}</span>
              </el-tag>
            </div>
          </el-form-item>
        </template>

        <el-form-item label="排序">
          <el-input-number v-model="templateForm.sortOrder" :min="0" :max="999" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="templateDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSaveTemplate" :loading="templateSaving">保存</el-button>
      </template>
    </el-dialog>

    <!-- 图片上传隐藏input -->
    <input ref="mpImageFileInput" type="file" accept="image/png,image/jpeg,image/jpg,image/webp" style="display:none" @change="handleMpImageSelected" />

    <!-- 图片裁剪弹窗 -->
    <el-dialog v-model="cropDialogVisible" title="裁剪图片" width="560px" :close-on-click-modal="false" destroy-on-close>
      <div style="text-align:center">
        <div style="font-size:13px;color:#606266;margin-bottom:12px">
          目标尺寸: <strong>{{ cropTargetW }} × {{ cropTargetH }}</strong> px
          <span v-if="cropOriginalSize" style="margin-left:12px;color:#909399">原图: {{ cropOriginalSize }}</span>
        </div>
        <div style="position:relative;display:inline-block;background:#f5f7fa;border-radius:8px;overflow:hidden;max-height:400px">
          <canvas ref="cropCanvas" style="max-width:100%;max-height:380px;cursor:crosshair" @mousedown="onCropMouseDown" @mousemove="onCropMouseMove" @mouseup="onCropMouseUp" />
        </div>
        <div style="margin-top:8px;font-size:12px;color:#909399">在图片上拖拽选择裁剪区域，或直接确认使用自动居中裁剪</div>
      </div>
      <template #footer>
        <el-button @click="cropDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleCropConfirm" :loading="cropUploading">确认裁剪并上传</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Bell, ChatDotRound, UserFilled, Warning, ShoppingCart, Odometer, DataAnalysis, Setting } from '@element-plus/icons-vue'
import {
  getSuiteConfig, saveSuiteConfig, testSuiteConnection, generateAuthLink,
  getSuiteAuths, cancelSuiteAuth, bindSuiteAuthTenant, getSuiteCallbackLogs,
  cleanCallbackLogs, getCallbackLogAutoClean, saveCallbackLogAutoClean,
  getNotificationTemplates, createNotificationTemplate, updateNotificationTemplate,
  deleteNotificationTemplate, toggleNotificationTemplate,
  getMpConfig, saveMpConfig,
  getBindableCustomers,
  getSuiteDiagnostic, submitManualSuiteTicket
} from '@/api/wecomManagement'

// Suite Ticket 诊断 / 紧急救急
const diagnosticData = ref<any>(null)
const diagnosticLoading = ref(false)
const manualTicketDialogVisible = ref(false)
const manualTicketInput = ref('')
const manualTicketSubmitting = ref(false)

const healthLabel = (h: string): string => {
  const map: Record<string, string> = { healthy: '正常', stale: '已停止推送', never: '从未收到' }
  return map[h] || h
}

const loadDiagnostic = async () => {
  diagnosticLoading.value = true
  try {
    const res: any = await getSuiteDiagnostic()
    diagnosticData.value = res?.data || res
    if (diagnosticData.value?.callbackHealth === 'healthy') {
      ElMessage.success('诊断完成：回调健康')
    } else if (diagnosticData.value?.callbackHealth === 'stale') {
      ElMessage.warning('诊断完成：回调已停止推送，请按建议排查')
    } else if (diagnosticData.value?.callbackHealth === 'never') {
      ElMessage.error('诊断完成：从未收到回调推送，请检查回调URL配置')
    }
  } catch (e: any) {
    ElMessage.error(e?.message || '诊断接口调用失败')
  } finally {
    diagnosticLoading.value = false
  }
}

const handleManualTicketSubmit = async () => {
  const ticket = (manualTicketInput.value || '').trim()
  if (!ticket || ticket.length < 10) {
    ElMessage.warning('请粘贴有效的 suite_ticket（长度需大于10个字符）')
    return
  }
  manualTicketSubmitting.value = true
  try {
    const res: any = await submitManualSuiteTicket(ticket)
    ElMessage.success(res?.message || 'Ticket 注入成功')
    manualTicketDialogVisible.value = false
    manualTicketInput.value = ''
    // 自动刷新诊断和配置
    fetchConfig()
    loadDiagnostic()
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || e?.message || '注入失败')
  } finally {
    manualTicketSubmitting.value = false
  }
}

const activeTab = ref('config')
const saving = ref(false)
const testingConnection = ref(false)
const testingProvider = ref(false)

// Suite config
const suiteConfig = ref<any>({
  id: null, suiteId: '', suiteSecret: '', suiteTicket: '', ticketUpdateTime: '',
  providerCorpId: '', providerSecret: '', appName: '', appDescription: '',
  appStatus: '', permissions: [], redirectDomain: '', appType: 'web',
  callbackToken: '', callbackEncodingAesKey: '',
  chatArchiveRsaPublicKey: '', chatArchiveRsaPrivateKey: '',
  zoneProgramId: '', zoneAbilityId: '', zoneSyncMsgAbilityId: '',
  isEnabled: true, mpAppId: '', mpEnabled: false,
  webLoginToken: '', webLoginEncodingAesKey: '', webLoginRedirectDomain: '',
  webLoginAppId: '', webLoginSecret: ''
})
const suiteConfigList = ref<any[]>([])
const currentConfigId = ref<number | null>(null)
const showRsaInput = ref(false)
const rsaPrivateKeyInput = ref('')
const showRsaPublicKeyInput = ref(false)

// Web登录回调URL（自动生成）
const webLoginCallbackUrl = computed(() => {
  const domain = suiteConfig.value.webLoginRedirectDomain || suiteConfig.value.redirectDomain || 'crm.yunkes.com'
  const protocol = domain.startsWith('http') ? '' : 'https://'
  return `${protocol}${domain}/api/v1/wecom/web-login/callback`
})

// Web登录测试连接
const webLoginTesting = ref(false)
const testWebLoginConnection = async () => {
  if (!suiteConfig.value.webLoginAppId) {
    ElMessage.warning('请先填写并保存登录授权AppID')
    return
  }
  webLoginTesting.value = true
  try {
    const { default: request } = await import('@/api/request')
    const res = await request.post('/wecom-management/suite/test-web-login', {
      appId: suiteConfig.value.webLoginAppId
    })
    if (res.data?.connected) {
      ElMessage.success('✅ Web登录配置验证成功！凭证有效')
    } else {
      ElMessage.error(res.data?.message || '连接失败，请检查配置')
    }
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || e?.message || '测试失败')
  } finally {
    webLoginTesting.value = false
  }
}

const rsaPublicKeyInput = ref('')
const showSuiteSecret = ref(false)
const showProviderSecret = ref(false)

/** 从用户填写的「授权回调域名」中提取 origin（协议+域名），剥离任何路径，避免拼接出双重路径 */
const extractOrigin = (raw: string): string => {
  const v = (raw || '').trim()
  if (!v) return ''
  try {
    // 兼容用户填了完整URL（含路径）的情况，例如 https://crm.yunkes.com/api/v1/wecom/suite/callback
    return new URL(v.startsWith('http') ? v : `https://${v}`).origin
  } catch {
    // 退化处理：手动剥离首个 / 之后的内容
    return v.replace(/^(https?:\/\/[^/]+).*$/i, '$1').replace(/\/+$/, '')
  }
}

const callbackUrl = computed(() => {
  // 优先使用「授权回调域名」字段(对外API域名)，避免使用浏览器当前域(admin.yunkes.com)误导运维
  const base = extractOrigin(suiteConfig.value?.redirectDomain || '') || window.location.origin
  return `${base}/api/v1/wecom/suite/callback`
})

// Auth list
const authLoading = ref(false)
const authList = ref<any[]>([])
const authStats = ref({ total: 0, active: 0, pending: 0, cancelled: 0 })

// Auth link records
const authLinkList = ref<any[]>([])
const authLinksLoading = ref(false)
const authLinkPage = ref(1)
const authLinkPageSize = 10

// Auth list pagination
const authListPage = ref(1)
const authListPageSize = 10

const pagedAuthLinkList = computed(() => {
  const start = (authLinkPage.value - 1) * authLinkPageSize
  return authLinkList.value.slice(start, start + authLinkPageSize)
})

const pagedAuthList = computed(() => {
  const start = (authListPage.value - 1) * authListPageSize
  return authList.value.slice(start, start + authListPageSize)
})

// Auth link dialog
const showAuthLinkDialog = ref(false)
const generatingLink = ref(false)
const generatedLink = ref('')
const authLinkForm = ref({ type: 'general', tenantId: '', scope: 'full', expireDays: 7 })
const showQrCodeDialog = ref(false)
const authQrCanvas = ref<HTMLCanvasElement | null>(null)

// Auth detail dialog
const showAuthDetailDialog = ref(false)
const authDetailData = ref<any>(null)

// Bind dialog
const showBindDialog = ref(false)
const bindTarget = ref<any>(null)
const bindTenantId = ref('')
const binding = ref(false)
const bindableCustomers = ref<any[]>([])
const bindableLoading = ref(false)
const bindableLoadingMore = ref(false)
const bindablePage = ref(1)
const bindableTotal = ref(0)
const bindableKeyword = ref('')
const bindablePageSize = 20

// Callback logs
const callbackLogsLoading = ref(false)
const callbackLogs = ref<any[]>([])
const callbackLogPage = ref(1)
const callbackLogPageSize = ref(10)
const callbackLogTotal = ref(0)

const pagedCallbackLogs = computed(() => {
  // 如果后端返回分页数据则直接用，否则前端分页
  if (callbackLogTotal.value > 0 && callbackLogs.value.length <= callbackLogPageSize.value) {
    return callbackLogs.value
  }
  const start = (callbackLogPage.value - 1) * callbackLogPageSize.value
  return callbackLogs.value.slice(start, start + callbackLogPageSize.value)
})

const formatDate = (d: string) => d ? new Date(d).toLocaleString('zh-CN') : '-'
const copyText = (text: string) => { navigator.clipboard.writeText(text); ElMessage.success('已复制') }
const generateRandom = (len: number) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

const fetchConfig = async () => {
  try {
    const res: any = await getSuiteConfig()
    const data = res?.data || res
    const list = res?.list || []
    if (list.length > 0) {
      suiteConfigList.value = list
      // 以数据库为准：默认选中 isEnabled=true 的应用
      if (!currentConfigId.value) {
        const enabled = list.find((c: any) => c.isEnabled)
        currentConfigId.value = enabled ? enabled.id : list[0].id
      }
      const current = list.find((c: any) => c.id === currentConfigId.value) || list[0]
      Object.assign(suiteConfig.value, current)
    } else if (data && typeof data === 'object') {
      Object.assign(suiteConfig.value, data)
      if (data.id) {
        suiteConfigList.value = [data]
        currentConfigId.value = data.id
      }
    }
  } catch { /* ignore */ }
}

async function handleSwitchConfig(id: number) {
  const item = suiteConfigList.value.find(c => c.id === id)
  if (item) {
    currentConfigId.value = id
    Object.assign(suiteConfig.value, item)
    // 切换即启用：立即更新数据库，当前选中的应用启用，其他禁用
    try {
      await saveSuiteConfig({ id, isEnabled: true })
      // 更新本地列表状态
      suiteConfigList.value.forEach(c => { c.isEnabled = (c.id === id) })
      ElMessage.success(`已切换为「${item.appName || '未命名'}」并启用`)
    } catch { /* ignore */ }
  }
}

function handleAddConfig() {
  currentConfigId.value = null
  suiteConfig.value = {
    id: null, suiteId: '', suiteSecret: '', suiteTicket: '', ticketUpdateTime: '',
    providerCorpId: suiteConfig.value.providerCorpId || '',
    providerSecret: '', appName: '', appDescription: '',
    appStatus: 'offline', permissions: [], redirectDomain: suiteConfig.value.redirectDomain || '',
    appType: 'miniprogram',
    callbackToken: '', callbackEncodingAesKey: '',
    chatArchiveRsaPublicKey: '', chatArchiveRsaPrivateKey: '',
    isEnabled: true, mpAppId: '', mpEnabled: false
  }
  ElMessage.info('请填写新应用配置后保存')
}

async function handleDeleteConfig() {
  if (!currentConfigId.value) return
  try {
    await ElMessageBox.confirm('确定删除当前应用配置？删除后不可恢复。', '删除确认', { type: 'warning' })
    const { deleteSuiteConfig } = await import('@/api/wecomManagement')
    await deleteSuiteConfig(currentConfigId.value)
    ElMessage.success('已删除')
    currentConfigId.value = null
    await fetchConfig()
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error(e?.message || '删除失败')
  }
}

const handleSaveConfig = async () => {
  saving.value = true
  try {
    const payload = { ...suiteConfig.value, isEnabled: true }
    if (currentConfigId.value) payload.id = currentConfigId.value
    if (rsaPublicKeyInput.value) payload.chatArchiveRsaPublicKey = rsaPublicKeyInput.value
    if (rsaPrivateKeyInput.value) payload.chatArchiveRsaPrivateKey = rsaPrivateKeyInput.value
    const saveRes: any = await saveSuiteConfig(payload)
    if (saveRes?.data?.id) currentConfigId.value = saveRes.data.id
    ElMessage.success('配置已保存，当前应用已启用（其他应用已自动禁用）')
    rsaPublicKeyInput.value = ''
    rsaPrivateKeyInput.value = ''
    showRsaPublicKeyInput.value = false
    showRsaInput.value = false
    showSuiteSecret.value = false
    showProviderSecret.value = false
    fetchConfig()
  } catch { /* interceptor already shows error */ }
  saving.value = false
}

const handleClearSuiteCache = async () => {
  try {
    const { default: request } = await import('@/api/request')
    const res: any = await request.post('/wecom-management/suite/clear-cache')
    ElMessage.success(res?.message || 'Token缓存已清除')
  } catch (e: any) { ElMessage.error(e?.message || '操作失败') }
}

const handleTestSuiteConnection = async () => {
  testingConnection.value = true
  try {
    const res: any = await testSuiteConnection()
    // 后端始终返回 success:true，测试结果在 data 中
    const result = res?.data
    if (result?.connected) {
      ElMessage.success(`连接成功！${result.latency ? `延迟${result.latency}ms` : ''}${result.suiteTicketAge ? ` (ticket: ${result.suiteTicketAge})` : ''}`)
      // 连接成功后刷新配置，反映可能的appStatus自动更新
      fetchConfig()
    } else {
      ElMessage.error(result?.message || '连接失败，请检查配置')
    }
  } catch (e: any) {
    ElMessage.error(e?.message || '连接测试请求失败')
  }
  testingConnection.value = false
}

// 测试服务商Secret连接（provider_access_token）
const handleTestProviderConnection = async () => {
  if (!suiteConfig.value.providerCorpId) {
    ElMessage.warning('请先填写服务商CorpID')
    return
  }
  testingProvider.value = true
  try {
    const { default: request } = await import('@/api/request')
    const res: any = await request.post('/wecom-management/supplier-config/test-connection', {
      providerCorpId: suiteConfig.value.providerCorpId,
      providerSecret: suiteConfig.value.providerSecret || ''
    })
    const data = res?.data || res
    const connected = data?.data?.connected || data?.connected
    const message = data?.message || data?.data?.message || ''
    if (data?.success !== false && connected) {
      ElMessage.success(message || '服务商连接成功！')
    } else {
      ElMessage.error(message || '服务商连接失败，请检查CorpID和Secret')
    }
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || e?.message || '服务商连接测试失败')
  }
  testingProvider.value = false
}

// 查看/隐藏 Suite Secret 和 Provider Secret 真实值
const toggleSuiteSecret = async (field: 'suiteSecret' | 'providerSecret') => {
  const isShow = field === 'suiteSecret' ? showSuiteSecret : showProviderSecret
  if (!isShow.value) {
    try {
      const { default: request } = await import('@/api/request')
      const res: any = await request.get('/wecom-management/suite/secrets')
      if (res?.success && res?.data?.[field]) {
        suiteConfig.value[field] = res.data[field]
        if (field === 'suiteSecret') showSuiteSecret.value = true
        else showProviderSecret.value = true
      } else {
        ElMessage.warning('未找到已保存的密钥，请先保存配置')
      }
    } catch { /* interceptor handles */ }
  } else {
    suiteConfig.value[field] = '******'
    if (field === 'suiteSecret') showSuiteSecret.value = false
    else showProviderSecret.value = false
  }
}

const copySuiteSecret = (field: 'suiteSecret' | 'providerSecret') => {
  const value = suiteConfig.value[field]
  if (value && value !== '******') {
    navigator.clipboard.writeText(value)
    ElMessage.success('已复制到剪贴板')
  } else {
    ElMessage.warning('请先点击查看实际值')
  }
}

const fetchAuths = async () => {
  authLoading.value = true
  try {
    const res: any = await getSuiteAuths({ pageSize: 200 })
    const list = res?.data?.list || (Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []))
    authList.value = list
    authListPage.value = 1
    authStats.value = {
      total: res?.data?.total || list.length,
      active: list.filter((a: any) => a.status === 'active').length,
      pending: list.filter((a: any) => a.status === 'pending').length,
      cancelled: list.filter((a: any) => a.status === 'cancelled').length,
    }
  } catch { authList.value = [] }
  authLoading.value = false
}

const handleGenerateLink = async () => {
  generatingLink.value = true
  try {
    const res: any = await generateAuthLink(authLinkForm.value)
    generatedLink.value = res?.data?.url || res?.url || res?.data?.authUrl || res?.link || ''
    if (generatedLink.value) {
      ElMessage.success('链接已生成')
      fetchAuthLinks() // 刷新授权链接列表
    } else {
      ElMessage.warning('后端返回空链接，请确认服务商应用配置是否完整')
    }
  } catch (e: any) { ElMessage.error(e?.message || '生成失败') }
  generatingLink.value = false
}

// 授权链接记录管理
const fetchAuthLinks = async () => {
  authLinksLoading.value = true
  try {
    const { default: request } = await import('@/api/request')
    const res: any = await request.get('/wecom-management/suite/auth-links')
    authLinkList.value = res?.data?.list || []
  } catch { authLinkList.value = [] }
  authLinksLoading.value = false
}

const viewLinkQrCode = (row: any) => {
  generatedLink.value = row.authUrl
  showQrCodeDialog.value = true
}

const openLinkInBrowser = (row: any) => {
  window.open(row.authUrl, '_blank')
}

const handleDeleteAuthLink = async (row: any) => {
  await ElMessageBox.confirm('确定删除此授权链接记录？', '删除确认', { type: 'warning' })
  try {
    const { default: request } = await import('@/api/request')
    await request.delete(`/wecom-management/suite/auth-links/${row.id}`)
    ElMessage.success('已删除')
    fetchAuthLinks()
  } catch (e: any) { ElMessage.error(e?.message || '删除失败') }
}

// QR code

watch(showQrCodeDialog, async (v) => {
  if (v && generatedLink.value) {
    await nextTick()
    try {
      const QRCode = (await import('qrcode')).default
      if (authQrCanvas.value) {
        await QRCode.toCanvas(authQrCanvas.value, generatedLink.value, { width: 260, margin: 2 })
      }
    } catch {
      ElMessage.warning('二维码生成失败，请复制链接手动生成')
    }
  }
})

const downloadAuthQr = () => {
  if (!authQrCanvas.value) return
  const url = authQrCanvas.value.toDataURL('image/png')
  const a = document.createElement('a')
  a.href = url
  a.download = `企微授权二维码_${new Date().toISOString().slice(0, 10)}.png`
  a.click()
}

const viewAuthDetail = (row: any) => {
  authDetailData.value = row
  showAuthDetailDialog.value = true
}

const bindableHasMore = computed(() => bindableCustomers.value.length < bindableTotal.value)

const fetchBindableCustomers = async (keyword: string = '', append = false) => {
  if (!append) {
    bindableLoading.value = true
    bindablePage.value = 1
  } else {
    bindableLoadingMore.value = true
  }
  try {
    const res: any = await getBindableCustomers({
      keyword: keyword || undefined,
      page: bindablePage.value,
      pageSize: bindablePageSize
    })
    const data = res?.data || res
    const list = data?.list || []
    if (append) {
      bindableCustomers.value = [...bindableCustomers.value, ...list]
    } else {
      bindableCustomers.value = list
    }
    bindableTotal.value = data?.total || 0
  } catch (e: any) {
    console.error('Fetch bindable customers error:', e)
  } finally {
    bindableLoading.value = false
    bindableLoadingMore.value = false
  }
}

const searchBindableCustomers = (keyword: string) => {
  bindableKeyword.value = keyword
  fetchBindableCustomers(keyword)
}

const loadMoreBindableCustomers = () => {
  if (bindableLoadingMore.value || !bindableHasMore.value) return
  bindablePage.value++
  fetchBindableCustomers(bindableKeyword.value, true)
}

const onBindSelectVisible = (visible: boolean) => {
  if (visible && bindableCustomers.value.length === 0) {
    fetchBindableCustomers('')
  }
}

const openBindDialog = (row: any) => {
  bindTarget.value = row
  bindTenantId.value = ''
  bindableCustomers.value = []
  bindableKeyword.value = ''
  bindablePage.value = 1
  bindableTotal.value = 0
  showBindDialog.value = true
}

const handleBindTenant = async () => {
  if (!bindTenantId.value || !bindTarget.value) return
  binding.value = true
  try {
    await bindSuiteAuthTenant(bindTarget.value.id, { tenantId: bindTenantId.value })
    ElMessage.success('已关联租户')
    showBindDialog.value = false
    fetchAuths()
  } catch (e: any) { ElMessage.error(e?.message || '关联失败') }
  binding.value = false
}

const handleCancelAuth = async (row: any) => {
  await ElMessageBox.confirm(`确定取消"${row.corpName}"的授权？`, '取消授权', { type: 'warning' })
  try {
    await cancelSuiteAuth(row.id)
    ElMessage.success('已取消授权')
    fetchAuths()
  } catch (e: any) { ElMessage.error(e?.message || '操作失败') }
}

const fetchCallbackLogs = async () => {
  callbackLogsLoading.value = true
  try {
    const res: any = await getSuiteCallbackLogs({ page: callbackLogPage.value, pageSize: callbackLogPageSize.value })
    const data = res?.data || res
    if (data?.list) {
      callbackLogs.value = data.list
      callbackLogTotal.value = data.total || data.list.length
    } else {
      callbackLogs.value = Array.isArray(data) ? data : []
      callbackLogTotal.value = callbackLogs.value.length
    }
  } catch { callbackLogs.value = []; callbackLogTotal.value = 0 }
  callbackLogsLoading.value = false
}

// Callback log cleanup
const cleanDays = ref(30)
const cleaning = ref(false)
const savingAutoClean = ref(false)
const autoCleanConfig = ref({ enabled: false, retentionDays: 30 })

const fetchAutoCleanConfig = async () => {
  try {
    const res: any = await getCallbackLogAutoClean()
    const data = res?.data || res
    if (data) {
      autoCleanConfig.value.enabled = !!data.enabled
      autoCleanConfig.value.retentionDays = data.retentionDays || 30
    }
  } catch { /* ignore */ }
}

const handleCleanLogs = async () => {
  try {
    await ElMessageBox.confirm(`确定清理 ${cleanDays.value} 天前的回调日志？此操作不可恢复。`, '清理确认', { type: 'warning' })
  } catch { return }
  cleaning.value = true
  try {
    const res: any = await cleanCallbackLogs(cleanDays.value)
    ElMessage.success(res?.message || '清理完成')
    fetchCallbackLogs()
  } catch (e: any) { ElMessage.error(e?.message || '清理失败') }
  cleaning.value = false
}

const handleAutoCleanChange = async (val: boolean) => {
  if (!val) {
    savingAutoClean.value = true
    try {
      await saveCallbackLogAutoClean({ enabled: false, retentionDays: autoCleanConfig.value.retentionDays })
      ElMessage.success('已关闭自动清理')
    } catch (e: any) { ElMessage.error(e?.message || '操作失败') }
    savingAutoClean.value = false
  }
}

const handleSaveAutoClean = async () => {
  savingAutoClean.value = true
  try {
    await saveCallbackLogAutoClean({ enabled: true, retentionDays: autoCleanConfig.value.retentionDays })
    ElMessage.success('自动清理配置已保存')
    fetchCallbackLogs()
  } catch (e: any) { ElMessage.error(e?.message || '保存失败') }
  savingAutoClean.value = false
}

// ==================== 通知模板 ====================

const iconMap: Record<string, any> = { Bell, ChatDotRound, UserFilled, Warning, ShoppingCart, Odometer, DataAnalysis, Setting }

const wrapVar = (key: string) => `\u007B\u007B${key}\u007D\u007D`

/** 预定义的7种通知场景（对应企微服务商后台的应用通知模板） */
const PRESET_TEMPLATES = [
  {
    type: 'customer_delete_friend',
    name: '客户删除好友提醒',
    icon: 'Warning',
    description: '当客户将企微成员删除好友时，通知对应成员及管理员，便于及时挽回客户',
    defaultScope: 'team',
    sampleContent: '您的客户 {{customer_name}} 已将您({{member_name}})删除好友，删除时间：{{delete_time}}。请及时通过其他方式联系客户挽回关系。',
    variables: [
      { key: 'customer_name', label: '客户名称', sample: '张三' },
      { key: 'member_name', label: '成员名称', sample: '李经理' },
      { key: 'delete_time', label: '删除时间', sample: '2026-05-14 15:30' },
    ],
  },
  {
    type: 'acquisition_quota_low',
    name: '获客助手额度不足提醒',
    icon: 'Odometer',
    description: '当获客助手用量接近上限时，提醒管理员及时充值或扩容',
    defaultScope: 'all',
    sampleContent: '获客助手额度预警：当前剩余额度 {{remaining_quota}}，已使用 {{used_quota}}/{{total_quota}}（使用率 {{usage_rate}}），请及时处理。',
    variables: [
      { key: 'remaining_quota', label: '剩余额度', sample: '50' },
      { key: 'used_quota', label: '已用额度', sample: '950' },
      { key: 'total_quota', label: '总额度', sample: '1000' },
      { key: 'usage_rate', label: '使用率', sample: '95%' },
    ],
  },
  {
    type: 'member_delete_customer',
    name: '成员删除客户提醒',
    icon: 'UserFilled',
    description: '当成员主动删除外部联系人(客户)时，通知部门经理和管理员',
    defaultScope: 'team',
    sampleContent: '成员 {{member_name}}({{department}}) 于 {{delete_time}} 删除了客户 {{customer_name}}，请知悉。',
    variables: [
      { key: 'member_name', label: '成员名称', sample: '王销售' },
      { key: 'department', label: '所属部门', sample: '销售一部' },
      { key: 'customer_name', label: '客户名称', sample: '张总' },
      { key: 'delete_time', label: '删除时间', sample: '2026-05-14 10:00' },
    ],
  },
  {
    type: 'abnormal_login',
    name: '账号异常登录提醒',
    icon: 'Warning',
    description: '检测到异常登录行为时通知账号所有者和管理员',
    defaultScope: 'all',
    sampleContent: '您的账号在 {{login_time}} 发生异常登录，登录IP：{{login_ip}}，设备：{{device_info}}。如非本人操作，请立即修改密码。',
    variables: [
      { key: 'login_time', label: '登录时间', sample: '2026-05-14 03:22' },
      { key: 'login_ip', label: '登录IP', sample: '192.168.1.100' },
      { key: 'device_info', label: '设备信息', sample: 'Chrome/Windows' },
    ],
  },
  {
    type: 'order_status',
    name: '订单状态通知',
    icon: 'ShoppingCart',
    description: '订单创建、支付、发货、完成等状态变更时通知相关人员',
    defaultScope: 'self',
    sampleContent: '订单 {{order_no}} 状态已变更为「{{order_status}}」，客户：{{customer_name}}，金额：¥{{order_amount}}。',
    variables: [
      { key: 'order_no', label: '订单编号', sample: 'ORD20260514001' },
      { key: 'order_status', label: '订单状态', sample: '已支付' },
      { key: 'customer_name', label: '客户名称', sample: '李总' },
      { key: 'order_amount', label: '订单金额', sample: '5,800.00' },
    ],
  },
  {
    type: 'customer_follow_up',
    name: '客户跟进提醒',
    icon: 'ChatDotRound',
    description: '客户超过设定天数未跟进时自动提醒负责成员',
    defaultScope: 'self',
    sampleContent: '您有客户 {{customer_name}} 已 {{days_no_follow}} 天未跟进，上次跟进时间：{{last_follow_time}}，请及时跟进。',
    variables: [
      { key: 'customer_name', label: '客户名称', sample: '王总' },
      { key: 'days_no_follow', label: '未跟进天数', sample: '7' },
      { key: 'last_follow_time', label: '上次跟进时间', sample: '2026-05-07' },
    ],
  },
  {
    type: 'performance_report',
    name: '业绩统计报告',
    icon: 'DataAnalysis',
    description: '定期推送业绩统计数据，个人看个人数据，经理看团队汇总，管理员看全局',
    defaultScope: 'all',
    sampleContent: '{{report_period}} 业绩报告：新增客户 {{new_customers}} 个，新增订单 {{new_orders}} 笔，成交金额 ¥{{total_amount}}，跟进记录 {{follow_count}} 条。',
    variables: [
      { key: 'report_period', label: '统计周期', sample: '本周(05.08-05.14)' },
      { key: 'new_customers', label: '新增客户数', sample: '12' },
      { key: 'new_orders', label: '新增订单数', sample: '5' },
      { key: 'total_amount', label: '成交总额', sample: '28,600.00' },
      { key: 'follow_count', label: '跟进记录数', sample: '45' },
    ],
  },
]

const templateLoading = ref(false)
const templateList = ref<any[]>([])
const templateDialogVisible = ref(false)
const editingTemplate = ref<any>(null)
const templateSaving = ref(false)
const templateForm = ref<any>({
  templateId: '', templateName: '', templateType: 'order_status',
  description: '', notifyScope: 'all', suiteConfigId: null, sortOrder: 0
})

const notifyScopeLabels: Record<string, string> = {
  self: '仅当事人', team: '当事人+经理', all: '全部通知'
}

const notifyScopeTagType = (scope: string): string => {
  return { self: 'info', team: 'warning', all: 'success' }[scope] || 'info'
}

const selectedPreset = computed(() => {
  return PRESET_TEMPLATES.find(p => p.type === templateForm.value.templateType) || null
})

const getTemplatesByType = (type: string) => {
  return templateList.value.filter(t => t.templateType === type)
}

const fetchTemplates = async () => {
  templateLoading.value = true
  try {
    const res: any = await getNotificationTemplates()
    templateList.value = Array.isArray(res) ? res : (res?.data || [])
  } catch { templateList.value = [] }
  templateLoading.value = false
}

const handleTemplateTypeChange = (type: string) => {
  const preset = PRESET_TEMPLATES.find(p => p.type === type)
  if (preset && !editingTemplate.value) {
    templateForm.value.templateName = preset.name
    templateForm.value.notifyScope = preset.defaultScope
    templateForm.value.description = preset.description
  }
}

const openTemplateDialog = (row?: any, presetType?: string) => {
  if (row) {
    editingTemplate.value = row
    templateForm.value = {
      templateId: row.templateId, templateName: row.templateName,
      templateType: row.templateType, description: row.description || '',
      notifyScope: row.notifyScope || 'all',
      suiteConfigId: row.suiteConfigId || null,
      sortOrder: row.sortOrder || 0
    }
  } else {
    editingTemplate.value = null
    const type = presetType || 'order_status'
    const preset = PRESET_TEMPLATES.find(p => p.type === type)
    templateForm.value = {
      templateId: '', templateName: preset?.name || '',
      templateType: type, description: preset?.description || '',
      notifyScope: preset?.defaultScope || 'all',
      suiteConfigId: null, sortOrder: 0
    }
  }
  templateDialogVisible.value = true
}

const handleSaveTemplate = async () => {
  if (!templateForm.value.templateId || !templateForm.value.templateName || !templateForm.value.templateType) {
    ElMessage.warning('请填写模板ID、名称和类型')
    return
  }
  templateSaving.value = true
  try {
    const payload = {
      ...templateForm.value,
      templateVariables: selectedPreset.value?.variables || null,
    }
    if (editingTemplate.value) {
      await updateNotificationTemplate(editingTemplate.value.id, payload)
    } else {
      await createNotificationTemplate(payload)
    }
    ElMessage.success(editingTemplate.value ? '模板更新成功' : '模板添加成功')
    templateDialogVisible.value = false
    fetchTemplates()
  } catch (e: any) { ElMessage.error(e?.message || '保存失败') }
  templateSaving.value = false
}

const handleDeleteTemplate = async (row: any) => {
  await ElMessageBox.confirm(`确定删除模板「${row.templateName}」？`, '删除确认', { type: 'warning' })
  try {
    await deleteNotificationTemplate(row.id)
    ElMessage.success('模板已删除')
    fetchTemplates()
  } catch (e: any) { ElMessage.error(e?.message || '删除失败') }
}

const handleToggleTemplate = async (row: any) => {
  try {
    await toggleNotificationTemplate(row.id)
  } catch (e: any) {
    ElMessage.error(e?.message || '操作失败')
    row.isEnabled = !row.isEnabled
  }
}

// ==================== 小程序配置 ====================

const mpSaving = ref(false)
const showMpAppSecret = ref(false)
const mpConfig = ref<any>({
  mpAppId: '', mpAppSecret: '', mpFormSecret: '',
  mpEnabled: false,
  mpCallbackToken: '', mpCallbackEncodingAesKey: '',
  mpCardTitle: '', mpCardCoverUrl: '', mpPosterUrl: '',
  mpLinkExpireDays: 7
})

const mpCallbackUrl = computed(() => {
  const base = extractOrigin(suiteConfig.value?.redirectDomain || '') || window.location.origin
  return `${base}/api/v1/mp/callback`
})

const fetchMpConfig = async () => {
  try {
    const res: any = await getMpConfig()
    const data = res?.data || res
    if (data && typeof data === 'object') Object.assign(mpConfig.value, data)
  } catch { /* ignore */ }
}

const handleSaveMpConfig = async () => {
  mpSaving.value = true
  try {
    await saveMpConfig(mpConfig.value)
    ElMessage.success('小程序配置已保存')
    showMpAppSecret.value = false
    fetchMpConfig()
  } catch { /* interceptor already shows error */ }
  mpSaving.value = false
}

// 查看/隐藏小程序 AppSecret 真实值
const toggleMpSecret = async () => {
  if (!showMpAppSecret.value) {
    try {
      const { default: request } = await import('@/api/request')
      const res: any = await request.get('/wecom-management/suite/mp-secret')
      if (res?.success && res?.data?.mpAppSecret) {
        mpConfig.value.mpAppSecret = res.data.mpAppSecret
        showMpAppSecret.value = true
      } else {
        ElMessage.warning('未找到已保存的密钥，请先保存配置')
      }
    } catch { /* interceptor handles */ }
  } else {
    mpConfig.value.mpAppSecret = '******'
    showMpAppSecret.value = false
  }
}

const copyMpSecret = () => {
  const value = mpConfig.value.mpAppSecret
  if (value && value !== '******') {
    navigator.clipboard.writeText(value)
    ElMessage.success('已复制到剪贴板')
  } else {
    ElMessage.warning('请先点击查看实际值')
  }
}

// ==================== 小程序连接测试 ====================
const mpTesting = ref(false)
const handleTestMpConnection = async () => {
  if (!mpConfig.value.mpAppId) { ElMessage.warning('请先填写小程序AppID'); return }
  mpTesting.value = true
  try {
    const { default: request } = await import('@/api/request')
    const res: any = await request.get('/wecom-management/suite/mp-test-connection')
    // 后端始终返回 success:true，测试结果在 data 中
    const result = res?.data
    if (result?.connected) {
      ElMessage.success(`连接成功！access_token已获取 (耗时${result.latency || '-'}ms)`)
    } else {
      ElMessage.error(result?.message || '连接失败，请检查AppID和AppSecret是否正确')
    }
  } catch (e: any) {
    ElMessage.error(e?.message || '连接测试请求失败')
  } finally { mpTesting.value = false }
}

// ==================== 小程序码 & 海报下载 ====================
const adminWxacodeBase64 = ref('')
const adminWxacodeLoading = ref(false)

const handleFetchAdminWxacode = async () => {
  adminWxacodeLoading.value = true
  try {
    const { default: request } = await import('@/api/request')
    const res: any = await request.get('/wecom-management/suite/wxacode', { params: { page: 'pages/form/form', scene: 'admin_preview' } })
    const data = res?.data || res
    if (data?.wxacodeBase64) {
      adminWxacodeBase64.value = data.wxacodeBase64
      ElMessage.success('小程序码生成成功')
    } else {
      ElMessage.warning('生成失败，请检查小程序配置')
    }
  } catch (e: any) {
    const msg = e?.response?.data?.message || e?.message || '生成失败'
    if (e?.response?.data?.code === 'MP_NOT_CONFIGURED') {
      ElMessage.warning('暂无关联小程序，请先配置AppID和AppSecret')
    } else {
      ElMessage.error(msg)
    }
  }
  adminWxacodeLoading.value = false
}

const handleDownloadAdminPoster = async () => {
  if (!mpConfig.value.mpPosterUrl) { ElMessage.warning('请先上传海报模板'); return }
  try {
    const canvas = document.createElement('canvas')
    const posterImg = new Image()
    posterImg.crossOrigin = 'anonymous'
    posterImg.onload = () => {
      canvas.width = posterImg.width
      canvas.height = posterImg.height + 200
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(posterImg, 0, 0)
      if (adminWxacodeBase64.value) {
        const qrImg = new Image()
        qrImg.onload = () => {
          const qrSize = 160
          const qrX = (canvas.width - qrSize) / 2
          const qrY = posterImg.height + 20
          ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize)
          const link = document.createElement('a')
          link.download = `miniprogram_poster_${Date.now()}.png`
          link.href = canvas.toDataURL('image/png')
          link.click()
          ElMessage.success('海报已下载')
        }
        qrImg.src = adminWxacodeBase64.value
      } else {
        const link = document.createElement('a')
        link.download = `miniprogram_poster_${Date.now()}.png`
        link.href = canvas.toDataURL('image/png')
        link.click()
        ElMessage.success('海报已下载（无小程序码）')
      }
    }
    posterImg.onerror = () => ElMessage.error('海报图片加载失败')
    posterImg.src = mpConfig.value.mpPosterUrl
  } catch (e: any) { ElMessage.error('下载失败') }
}

const handleDeleteMpFile = async (field: 'mpCardCoverUrl' | 'mpPosterUrl') => {
  const url = mpConfig.value[field]
  if (!url) return
  try {
    const { default: request } = await import('@/api/request')
    await request.delete('/mp/upload-file', { params: { url } })
  } catch { /* ignore, still clear the field */ }
  mpConfig.value[field] = ''
  ElMessage.success('已删除')
}

// ==================== 图片上传 & 裁剪 ====================
const mpImageFileInput = ref<HTMLInputElement>()
const cropDialogVisible = ref(false)
const cropCanvas = ref<HTMLCanvasElement>()
const cropUploading = ref(false)
const cropTargetW = ref(500)
const cropTargetH = ref(400)
const cropOriginalSize = ref('')
const cropFieldKey = ref<'cover' | 'poster'>('cover')
let _cropImage: HTMLImageElement | null = null
let _cropSelection = { x: 0, y: 0, w: 0, h: 0, dragging: false, startX: 0, startY: 0 }

const triggerImageUpload = (field: 'cover' | 'poster', w: number, h: number) => {
  cropFieldKey.value = field
  cropTargetW.value = w
  cropTargetH.value = h
  mpImageFileInput.value?.click()
}

const handleMpImageSelected = (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  input.value = ''
  if (file.size > 10 * 1024 * 1024) { ElMessage.error('图片不能超过10MB'); return }

  const img = new Image()
  img.onload = () => {
    _cropImage = img
    cropOriginalSize.value = `${img.width}×${img.height}`
    _cropSelection = { x: 0, y: 0, w: 0, h: 0, dragging: false, startX: 0, startY: 0 }
    cropDialogVisible.value = true
    nextTick(() => drawCropPreview())
  }
  img.onerror = () => ElMessage.error('图片加载失败')
  img.src = URL.createObjectURL(file)
}

const drawCropPreview = () => {
  const canvas = cropCanvas.value
  if (!canvas || !_cropImage) return
  const img = _cropImage
  const scale = Math.min(500 / img.width, 380 / img.height, 1)
  canvas.width = Math.round(img.width * scale)
  canvas.height = Math.round(img.height * scale)
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

  // Draw auto-crop guide (centered)
  const sel = _cropSelection
  if (sel.w > 2 && sel.h > 2) {
    // User selection: dim outside, highlight inside
    ctx.fillStyle = 'rgba(0,0,0,0.4)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.clearRect(sel.x, sel.y, sel.w, sel.h)
    ctx.drawImage(img, sel.x / scale, sel.y / scale, sel.w / scale, sel.h / scale, sel.x, sel.y, sel.w, sel.h)
    ctx.strokeStyle = '#409eff'
    ctx.lineWidth = 2
    ctx.setLineDash([4, 3])
    ctx.strokeRect(sel.x, sel.y, sel.w, sel.h)
    ctx.setLineDash([])
  } else {
    // Show auto center-crop guide
    const tw = cropTargetW.value, th = cropTargetH.value
    const ratio = tw / th
    let gw: number, gh: number
    if (canvas.width / canvas.height > ratio) {
      gh = canvas.height
      gw = gh * ratio
    } else {
      gw = canvas.width
      gh = gw / ratio
    }
    const gx = (canvas.width - gw) / 2, gy = (canvas.height - gh) / 2
    ctx.fillStyle = 'rgba(0,0,0,0.25)'
    ctx.fillRect(0, 0, canvas.width, gy)
    ctx.fillRect(0, gy + gh, canvas.width, canvas.height - gy - gh)
    ctx.fillRect(0, gy, gx, gh)
    ctx.fillRect(gx + gw, gy, canvas.width - gx - gw, gh)
    ctx.strokeStyle = '#409eff'
    ctx.lineWidth = 1.5
    ctx.setLineDash([6, 4])
    ctx.strokeRect(gx, gy, gw, gh)
    ctx.setLineDash([])
  }
}

const onCropMouseDown = (e: MouseEvent) => {
  const rect = cropCanvas.value!.getBoundingClientRect()
  _cropSelection = { x: 0, y: 0, w: 0, h: 0, dragging: true, startX: e.clientX - rect.left, startY: e.clientY - rect.top }
}
const onCropMouseMove = (e: MouseEvent) => {
  if (!_cropSelection.dragging) return
  const rect = cropCanvas.value!.getBoundingClientRect()
  const cx = e.clientX - rect.left, cy = e.clientY - rect.top
  const sx = _cropSelection.startX, sy = _cropSelection.startY
  // Enforce aspect ratio
  const ratio = cropTargetW.value / cropTargetH.value
  let w = cx - sx, h = cy - sy
  if (Math.abs(w) / ratio > Math.abs(h)) { h = Math.sign(h || 1) * Math.abs(w) / ratio }
  else { w = Math.sign(w || 1) * Math.abs(h) * ratio }
  _cropSelection.x = w > 0 ? sx : sx + w
  _cropSelection.y = h > 0 ? sy : sy + h
  _cropSelection.w = Math.abs(w)
  _cropSelection.h = Math.abs(h)
  drawCropPreview()
}
const onCropMouseUp = () => { _cropSelection.dragging = false }

const handleCropConfirm = async () => {
  if (!_cropImage) return
  cropUploading.value = true
  try {
    const img = _cropImage
    const scale = Math.min(500 / img.width, 380 / img.height, 1)
    const tw = cropTargetW.value, th = cropTargetH.value
    const sel = _cropSelection

    // Determine source rect in original image coords
    let sx: number, sy: number, sw: number, sh: number
    if (sel.w > 10 && sel.h > 10) {
      sx = sel.x / scale; sy = sel.y / scale; sw = sel.w / scale; sh = sel.h / scale
    } else {
      // Auto center-crop
      const ratio = tw / th
      if (img.width / img.height > ratio) {
        sh = img.height; sw = sh * ratio
      } else {
        sw = img.width; sh = sw / ratio
      }
      sx = (img.width - sw) / 2; sy = (img.height - sh) / 2
    }

    // Draw cropped result
    const outCanvas = document.createElement('canvas')
    outCanvas.width = tw; outCanvas.height = th
    const ctx = outCanvas.getContext('2d')!
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, tw, th)

    // Convert to blob
    const blob: Blob = await new Promise(resolve => outCanvas.toBlob(b => resolve(b!), 'image/jpeg', 0.9))
    const formData = new FormData()
    formData.append('file', blob, `mp_${cropFieldKey.value}_${Date.now()}.jpg`)

    // Upload via admin API
    const { adminApi } = await import('@/api/admin')
    const res: any = await adminApi.uploadFile(formData)
    const url = res?.data?.url || res?.url
    if (!url) throw new Error('上传失败: 未获取到URL')

    if (cropFieldKey.value === 'cover') { mpConfig.value.mpCardCoverUrl = url }
    else { mpConfig.value.mpPosterUrl = url }

    cropDialogVisible.value = false
    ElMessage.success('图片上传成功')
  } catch (e: any) {
    ElMessage.error(e?.message || '上传失败')
  }
  cropUploading.value = false
}

onMounted(() => {
  fetchConfig()
  fetchAuths()
  fetchAuthLinks()
  fetchCallbackLogs()
  fetchAutoCleanConfig()
  fetchTemplates()
  fetchMpConfig()
})
</script>

<style scoped>
.page-container { padding: 0; }
.card-header { display: flex; justify-content: space-between; align-items: center; font-size: 16px; font-weight: 600; }
.tab-toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.auth-stats { display: flex; gap: 8px; }

/* Suite Ticket 诊断卡片 */
.diagnostic-card {
  width: 100%;
  background: #f5f7fa;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  padding: 12px 16px;
}
.diag-row { display: flex; align-items: center; gap: 8px; padding: 4px 0; font-size: 13px; }
.diag-label { color: #606266; min-width: 110px; flex-shrink: 0; }
.diag-recommendation { margin-top: 8px; padding: 8px 12px; background: #fff7e6; border-left: 3px solid #faad14; border-radius: 4px; font-size: 12px; line-height: 1.7; color: #595959; }
.diag-recommendation pre { margin: 4px 0 0; white-space: pre-wrap; word-break: break-word; font-family: inherit; }
.diag-recommendation.diag-error { background: #fef0f0; border-left-color: #f56c6c; color: #c45656; }

/* 通知模板卡片样式 */
.tpl-category-card {
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 16px 20px;
  margin-bottom: 12px;
  transition: box-shadow 0.2s;
}
.tpl-category-card:hover { box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06); }
.tpl-category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}
.tpl-category-title {
  display: flex;
  align-items: center;
  font-size: 14px;
}
.tpl-category-desc {
  font-size: 12px;
  color: #909399;
  line-height: 1.6;
  margin-bottom: 8px;
}
.tpl-content-preview {
  background: #f9fafb;
  border: 1px dashed #dcdfe6;
  border-radius: 6px;
  padding: 8px 12px;
  margin-bottom: 8px;
}
.tpl-content-label {
  font-size: 12px;
  color: #606266;
  font-weight: 500;
  margin-bottom: 4px;
}
.tpl-content-text {
  font-size: 12px;
  color: #303133;
  line-height: 1.7;
}
.tpl-variables {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  margin-bottom: 10px;
}
.tpl-var-label {
  font-size: 12px;
  color: #606266;
  font-weight: 500;
  margin-right: 4px;
}
.tpl-items {
  border-top: 1px solid #f0f2f5;
  padding-top: 8px;
}
.tpl-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #fafbfc;
  border-radius: 6px;
  margin-bottom: 6px;
  border: 1px solid #ebeef5;
}
.tpl-item:last-child { margin-bottom: 0; }
.tpl-item-main { flex: 1; min-width: 0; }
.tpl-item-id { margin-bottom: 2px; }
.tpl-item-meta { display: flex; align-items: center; gap: 4px; }
.tpl-item-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  margin-left: 12px;
}
</style>

