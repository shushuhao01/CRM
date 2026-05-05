<template>
  <div class="page-container">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>服务商应用管理</span>
        </div>
      </template>

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
            </el-form-item>
            <el-form-item label="Suite Ticket">
              <el-tag v-if="suiteConfig.suiteTicket" type="success" size="small">自动接收中</el-tag>
              <el-tag v-else type="warning" size="small">未接收</el-tag>
              <span v-if="suiteConfig.ticketUpdateTime" style="margin-left: 8px; font-size: 12px; color: #909399">
                最近: {{ formatDate(suiteConfig.ticketUpdateTime) }}
              </span>
            </el-form-item>

            <el-divider content-position="left">服务商信息</el-divider>
            <el-form-item label="服务商CorpID">
              <el-input v-model="suiteConfig.providerCorpId" placeholder="ww_provider_..." />
            </el-form-item>
            <el-form-item label="服务商Secret">
              <el-input v-model="suiteConfig.providerSecret" placeholder="Secret" show-password />
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

            <el-divider content-position="left">会话存档RSA私钥</el-divider>
            <el-alert type="warning" :closable="false" style="margin-bottom: 12px">
              <template #title>此RSA私钥为<strong>服务商级别全局配置</strong></template>
              在企微后台「会话存档」中上传的公钥对应的私钥。所有授权企业的会话消息都使用此公钥加密，服务端用此私钥解密。配置后，租户扫码授权即可自动使用会话存档功能，无需每个租户单独配置。
            </el-alert>
            <el-form-item label="RSA私钥">
              <div style="width: 100%">
                <el-button v-if="!showRsaInput" size="small" @click="showRsaInput = true">
                  {{ suiteConfig.chatArchiveRsaPrivateKey === '******' ? '已配置 - 点击修改' : '上传/粘贴私钥' }}
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
          <div class="tab-toolbar">
            <div class="auth-stats">
              <el-tag effect="dark" type="primary">已授权: {{ authStats.total }}</el-tag>
              <el-tag effect="dark" type="success">活跃: {{ authStats.active }}</el-tag>
              <el-tag effect="dark" type="warning">待处理: {{ authStats.pending }}</el-tag>
              <el-tag effect="dark" type="info">已取消: {{ authStats.cancelled }}</el-tag>
            </div>
            <div>
              <el-button v-permission="'wecom-management:suite:edit'" type="primary" @click="showAuthLinkDialog = true">生成授权链接</el-button>
              <el-button @click="fetchAuths">刷新</el-button>
            </div>
          </div>

          <el-table :data="authList" v-loading="authLoading" stripe>
            <el-table-column prop="corpName" label="企业名称" min-width="150" />
            <el-table-column prop="corpId" label="CorpID" width="180" show-overflow-tooltip />
            <el-table-column label="关联租户" width="140">
              <template #default="{ row }">
                <span v-if="row.tenantId" style="color: #67c23a">{{ row.tenantName || row.tenantId }}</span>
                <el-button v-else v-permission="'wecom-management:suite:edit'" type="warning" link size="small" @click="openBindDialog(row)">待关联</el-button>
              </template>
            </el-table-column>
            <el-table-column label="授权时间" width="160">
              <template #default="{ row }">{{ formatDate(row.authTime) }}</template>
            </el-table-column>
            <el-table-column label="状态" width="90" align="center">
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
        </el-tab-pane>

        <!-- Tab3: 回调配置 -->
        <el-tab-pane label="回调配置" name="callback">
          <el-alert type="info" :closable="false" style="margin-bottom: 16px">
            <template #title><strong>💡 回调配置说明</strong></template>
            <div style="font-size: 12px; line-height: 1.8; margin-top: 4px">
              <p><strong>回调 = 企微服务器主动推送事件到我们服务器</strong>。配置步骤：</p>
              <p>1. 复制下方的回调URL、Token、EncodingAESKey</p>
              <p>2. 登录<a href="https://open.work.weixin.qq.com" target="_blank" style="color:#409eff">企微服务商后台</a> → 应用管理 → 找到我们的应用 → 填入这3个值</p>
              <p>3. 保存后，企微会每10分钟推送 suite_ticket，用于获取access_token</p>
              <p>4. 当有企业安装/卸载应用时也会推送通知到此地址</p>
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

            <el-divider content-position="left">回调事件接收日志</el-divider>
          </el-form>
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
              <p>常见场景：新订单提醒、客户跟进提醒、付款到期提醒、审批通知等。</p>
            </div>
          </el-alert>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px">
            <el-tag effect="dark" type="primary">已配置: {{ templateList.length }}</el-tag>
            <el-button v-permission="'wecom-management:suite:edit'" type="primary" @click="openTemplateDialog()">添加模板</el-button>
          </div>

          <el-table :data="templateList" v-loading="templateLoading" stripe size="small">
            <el-table-column label="模板名称" min-width="150">
              <template #default="{ row }">
                <div style="font-weight: 600">{{ row.templateName }}</div>
                <div style="font-size: 11px; color: #909399">{{ row.description || '-' }}</div>
              </template>
            </el-table-column>
            <el-table-column label="模板ID" min-width="200">
              <template #default="{ row }">
                <code style="font-size: 11px; word-break: break-all">{{ row.templateId }}</code>
              </template>
            </el-table-column>
            <el-table-column label="类型" width="100" align="center">
              <template #default="{ row }">
                <el-tag size="small" :type="templateTypeTagMap[row.templateType] || 'info'">{{ templateTypeLabels[row.templateType] || row.templateType }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="80" align="center">
              <template #default="{ row }">
                <el-switch v-model="row.isEnabled" size="small" @change="handleToggleTemplate(row)" />
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120" align="center">
              <template #default="{ row }">
                <el-button type="primary" link size="small" @click="openTemplateDialog(row)">编辑</el-button>
                <el-button type="danger" link size="small" @click="handleDeleteTemplate(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 生成授权链接弹窗 -->
    <el-dialog v-model="showAuthLinkDialog" title="生成授权链接" width="560px" destroy-on-close>
      <el-alert type="info" :closable="false" style="margin-bottom: 16px">
        <template #title><strong>📋 使用说明</strong></template>
        <div style="margin-top: 4px; font-size: 12px; line-height: 1.8">
          <p>1. 生成链接后，将链接/二维码发送给目标企业的管理员</p>
          <p>2. 企业管理员用企微扫码 → 确认授权安装我们的应用</p>
          <p>3. 授权成功后，该企业会出现在上方「授权管理」列表中</p>
          <p>4. 管理员点击"关联租户"绑定到CRM租户 → 该租户即可使用企微功能</p>
          <p style="color: #e6a23c">⚠️ 授权权限范围由「应用配置」Tab中已勾选的权限决定，此处无需单独选择</p>
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
        <p style="margin-top: 12px; font-size: 13px; color: #606266">企业管理员用企微扫码即可授权安装</p>
        <el-button type="primary" size="small" style="margin-top: 8px" @click="downloadAuthQr">下载二维码</el-button>
      </div>
    </el-dialog>

    <!-- 关联租户弹窗 -->
    <el-dialog v-model="showBindDialog" title="关联租户" width="400px" destroy-on-close>
      <el-form label-width="80px">
        <el-form-item label="企业">{{ bindTarget?.corpName }}</el-form-item>
        <el-form-item label="租户ID">
          <el-input v-model="bindTenantId" placeholder="输入要关联的租户ID" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showBindDialog = false">取消</el-button>
        <el-button v-permission="'wecom-management:suite:edit'" type="primary" @click="handleBindTenant" :loading="binding">确认关联</el-button>
      </template>
    </el-dialog>
    <!-- 通知模板编辑弹窗 -->
    <el-dialog v-model="templateDialogVisible" :title="editingTemplate ? '编辑模板' : '添加模板'" width="520px" destroy-on-close>
      <el-form :model="templateForm" label-width="100px">
        <el-form-item label="模板名称" required>
          <el-input v-model="templateForm.templateName" placeholder="如：新订单通知" />
        </el-form-item>
        <el-form-item label="模板ID" required>
          <el-input v-model="templateForm.templateId" placeholder="企微服务商后台获取的模板ID" />
        </el-form-item>
        <el-form-item label="模板类型" required>
          <el-select v-model="templateForm.templateType" style="width: 100%">
            <el-option label="订单通知" value="order" />
            <el-option label="客户提醒" value="customer" />
            <el-option label="跟进提醒" value="follow_up" />
            <el-option label="付款提醒" value="payment" />
            <el-option label="审批通知" value="approval" />
            <el-option label="系统通知" value="system" />
            <el-option label="自定义" value="custom" />
          </el-select>
        </el-form-item>
        <el-form-item label="用途描述">
          <el-input v-model="templateForm.description" type="textarea" :rows="2" placeholder="模板的用途说明" />
        </el-form-item>
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
import {
  getSuiteConfig, saveSuiteConfig, testSuiteConnection, generateAuthLink,
  getSuiteAuths, cancelSuiteAuth, bindSuiteAuthTenant, getSuiteCallbackLogs,
  getNotificationTemplates, createNotificationTemplate, updateNotificationTemplate,
  deleteNotificationTemplate, toggleNotificationTemplate,
  getMpConfig, saveMpConfig
} from '@/api/wecomManagement'

const activeTab = ref('config')
const saving = ref(false)
const testingConnection = ref(false)

// Suite config
const suiteConfig = ref<any>({
  suiteId: '', suiteSecret: '', suiteTicket: '', ticketUpdateTime: '',
  providerCorpId: '', providerSecret: '', appName: '', appDescription: '',
  appStatus: '', permissions: [],
  callbackToken: '', callbackEncodingAesKey: '',
  chatArchiveRsaPrivateKey: ''
})
const showRsaInput = ref(false)
const rsaPrivateKeyInput = ref('')

const callbackUrl = computed(() => {
  const base = window.location.origin
  return `${base}/api/v1/wecom/suite/callback`
})

// Auth list
const authLoading = ref(false)
const authList = ref<any[]>([])
const authStats = ref({ total: 0, active: 0, pending: 0, cancelled: 0 })

// Auth link dialog
const showAuthLinkDialog = ref(false)
const generatingLink = ref(false)
const generatedLink = ref('')
const authLinkForm = ref({ type: 'general', tenantId: '', scope: 'full', expireDays: 7 })
const showQrCodeDialog = ref(false)
const authQrCanvas = ref<HTMLCanvasElement | null>(null)

// Bind dialog
const showBindDialog = ref(false)
const bindTarget = ref<any>(null)
const bindTenantId = ref('')
const binding = ref(false)

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
    if (data && typeof data === 'object') Object.assign(suiteConfig.value, data)
  } catch { /* ignore */ }
}

const handleSaveConfig = async () => {
  saving.value = true
  try {
    const payload = { ...suiteConfig.value }
    // 如果用户填写了新的RSA私钥，替换到payload中
    if (rsaPrivateKeyInput.value) {
      payload.chatArchiveRsaPrivateKey = rsaPrivateKeyInput.value
    }
    await saveSuiteConfig(payload)
    ElMessage.success('配置已保存')
    rsaPrivateKeyInput.value = ''
    showRsaInput.value = false
    fetchConfig()
  } catch (e: any) { ElMessage.error(e?.message || '保存失败') }
  saving.value = false
}

const handleTestSuiteConnection = async () => {
  testingConnection.value = true
  try {
    const res: any = await testSuiteConnection()
    ElMessage.success(`连接成功${res?.latency ? `，延迟${res.latency}ms` : ''}`)
  } catch (e: any) { ElMessage.error(e?.message || '连接失败') }
  testingConnection.value = false
}

const fetchAuths = async () => {
  authLoading.value = true
  try {
    const res: any = await getSuiteAuths()
    const list = Array.isArray(res) ? res : (res?.data || [])
    authList.value = list
    authStats.value = {
      total: list.length,
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
    generatedLink.value = res?.url || res?.link || res?.data?.authUrl || ''
    if (generatedLink.value) {
      ElMessage.success('链接已生成')
    } else {
      ElMessage.warning('后端返回空链接，请确认服务商应用配置是否完整')
    }
  } catch (e: any) { ElMessage.error(e?.message || '生成失败') }
  generatingLink.value = false
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
  ElMessage.info(`授权详情: ${row.corpName} (${row.corpId})`)
}

const openBindDialog = (row: any) => {
  bindTarget.value = row
  bindTenantId.value = ''
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

// ==================== 通知模板 ====================

const templateLoading = ref(false)
const templateList = ref<any[]>([])
const templateDialogVisible = ref(false)
const editingTemplate = ref<any>(null)
const templateSaving = ref(false)
const templateForm = ref<any>({ templateId: '', templateName: '', templateType: 'order', description: '', sortOrder: 0 })

const templateTypeLabels: Record<string, string> = {
  order: '订单通知', customer: '客户提醒', follow_up: '跟进提醒',
  payment: '付款提醒', approval: '审批通知', system: '系统通知', custom: '自定义'
}
const templateTypeTagMap: Record<string, string> = {
  order: 'warning', customer: 'success', follow_up: 'primary',
  payment: 'danger', approval: '', system: 'info', custom: ''
}

const fetchTemplates = async () => {
  templateLoading.value = true
  try {
    const res: any = await getNotificationTemplates()
    templateList.value = Array.isArray(res) ? res : (res?.data || [])
  } catch { templateList.value = [] }
  templateLoading.value = false
}

const openTemplateDialog = (row?: any) => {
  if (row) {
    editingTemplate.value = row
    templateForm.value = {
      templateId: row.templateId, templateName: row.templateName,
      templateType: row.templateType, description: row.description || '',
      sortOrder: row.sortOrder || 0
    }
  } else {
    editingTemplate.value = null
    templateForm.value = { templateId: '', templateName: '', templateType: 'order', description: '', sortOrder: 0 }
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
    if (editingTemplate.value) {
      await updateNotificationTemplate(editingTemplate.value.id, templateForm.value)
    } else {
      await createNotificationTemplate(templateForm.value)
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
  mpCallbackToken: '', mpCallbackEncodingAesKey: '',
  mpCardTitle: '', mpCardCoverUrl: '', mpPosterUrl: '',
  mpLinkExpireDays: 7
})

const mpCallbackUrl = computed(() => {
  const base = window.location.origin
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
  fetchCallbackLogs()
  fetchTemplates()
  fetchMpConfig()
})
</script>

<style scoped>
.page-container { padding: 0; }
.card-header { display: flex; justify-content: space-between; align-items: center; font-size: 16px; font-weight: 600; }
.tab-toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.auth-stats { display: flex; gap: 8px; }
</style>

