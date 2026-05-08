<template>
  <div class="page-container">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>租户授权管理</span>
          <div class="header-actions">
            <el-input v-model="searchKeyword" placeholder="搜索租户/企业ID/企业名称" clearable style="width: 240px" @keyup.enter="fetchList" />
            <el-select v-model="searchAuthType" placeholder="授权类型" clearable style="width: 140px" @change="fetchList">
              <el-option label="全部" value="all" />
              <el-option label="自建应用" value="self_built" />
              <el-option label="第三方应用" value="third_party" />
            </el-select>
            <el-select v-model="searchStatus" placeholder="连接状态" clearable style="width: 130px" @change="fetchList">
              <el-option label="已连接" value="connected" />
              <el-option label="未连接" value="disconnected" />
            </el-select>
            <el-button type="primary" @click="fetchList">搜索</el-button>
          </div>
        </div>
      </template>

      <el-table :data="authList" v-loading="loading" stripe>
        <el-table-column label="企业信息" min-width="220">
          <template #default="{ row }">
            <div style="display: flex; align-items: center; gap: 8px">
              <img v-if="row.corpSquareLogoUrl" :src="row.corpSquareLogoUrl" style="max-width: 120px; max-height: 32px; object-fit: contain; border-radius: 4px; flex-shrink: 0" />
              <div style="min-width: 0">
                <div style="font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap" :title="row.corpFullName || row.authCorpName || row.configName">
                  {{ row.authCorpName || row.configName }}
                </div>
                <div v-if="row.corpFullName && row.corpFullName !== (row.authCorpName || row.configName)" style="font-size: 12px; color: #909399; overflow: hidden; text-overflow: ellipsis; white-space: nowrap" :title="row.corpFullName">
                  {{ row.corpFullName }}
                </div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="corpId" label="CorpID" width="170" show-overflow-tooltip />
        <el-table-column label="行业/规模" width="130">
          <template #default="{ row }">
            <div v-if="row.corpIndustry || row.corpScale">
              <div v-if="row.corpIndustry" style="font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap" :title="`${row.corpIndustry}${row.corpSubIndustry ? ' - ' + row.corpSubIndustry : ''}`">{{ row.corpIndustry }}</div>
              <div v-if="row.corpScale" style="font-size: 12px; color: #909399">{{ row.corpScale }}</div>
            </div>
            <span v-else style="color: #c0c4cc; font-size: 12px">-</span>
          </template>
        </el-table-column>
        <el-table-column label="关联租户" width="140">
          <template #default="{ row }">
            <div v-if="row.tenantId">
              <div style="color: #67c23a; font-size: 13px">{{ row.tenantName || row.tenantId }}</div>
              <div v-if="row.tenantCode" style="font-size: 12px; color: #909399">{{ row.tenantCode }}</div>
            </div>
            <el-button v-else v-permission="'wecom-management:tenant-auth:edit'" type="warning" link size="small" @click="openBindDialog(row)">待关联</el-button>
          </template>
        </el-table-column>
        <el-table-column label="授权类型" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.authType === 'third_party' ? 'warning' : ''" size="small" effect="plain">
              {{ row.authType === 'third_party' ? '第三方' : '自建' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="连接状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.connectionStatus === 'connected' ? 'success' : row.connectionStatus === 'disconnected' ? 'danger' : 'info'" size="small" effect="plain">
              {{ { connected: '已连接', disconnected: '已断开', pending: '待连接' }[row.connectionStatus] || '未知' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="启用" width="65" align="center">
          <template #default="{ row }">
            <el-tag :type="row.isEnabled ? 'success' : 'danger'" size="small">{{ row.isEnabled ? '是' : '否' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="增值服务" width="95" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.vasChatArchive" type="success" size="small" effect="plain">已开通</el-tag>
            <span v-else style="color: #c0c4cc; font-size: 12px">未开通</span>
          </template>
        </el-table-column>
        <el-table-column label="API调用" prop="apiCallCount" width="80" align="center" />
        <el-table-column label="更新时间" width="150">
          <template #default="{ row }">{{ formatDate(row.updatedAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="viewDetail(row)">详情</el-button>
            <el-button v-if="!row.tenantId" v-permission="'wecom-management:tenant-auth:edit'" link type="warning" size="small" @click="openBindDialog(row)">关联租户</el-button>
            <el-button v-if="row.isEnabled" v-permission="'wecom-management:tenant-auth:edit'" link type="danger" size="small" @click="handleRevoke(row)">停用</el-button>
            <el-button v-else v-permission="'wecom-management:tenant-auth:edit'" link type="success" size="small" @click="handleRestore(row)">恢复</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div style="margin-top: 16px; display: flex; justify-content: flex-end">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @size-change="fetchList"
          @current-change="fetchList"
        />
      </div>
    </el-card>

    <!-- 授权详情弹窗 -->
    <el-dialog v-model="detailVisible" title="授权详情" width="820px" top="5vh" destroy-on-close>
      <div v-if="detailData" v-loading="detailLoading">
        <el-tabs v-model="detailTab">
          <!-- Tab: 基本信息 -->
          <el-tab-pane label="基本信息" name="info">
            <div v-if="detailData.authCorpInfo?.corp_square_logo_url" style="text-align: center; margin-bottom: 12px">
              <img :src="detailData.authCorpInfo.corp_square_logo_url" style="max-width: 200px; max-height: 48px; object-fit: contain; border-radius: 8px" />
            </div>
            <el-descriptions :column="2" border size="small">
              <el-descriptions-item label="配置名称">{{ detailData.configName }}</el-descriptions-item>
              <el-descriptions-item label="企业ID">{{ detailData.corpId }}</el-descriptions-item>
              <el-descriptions-item label="企业全称">{{ detailData.authCorpInfo?.corp_full_name || '-' }}</el-descriptions-item>
              <el-descriptions-item label="SuiteID" v-if="detailData.authType === 'third_party'">{{ detailData.suiteId || '-' }}</el-descriptions-item>
              <el-descriptions-item label="行业">
                {{ detailData.authCorpInfo?.corp_industry ? `${detailData.authCorpInfo.corp_industry}${detailData.authCorpInfo.corp_sub_industry ? ' - ' + detailData.authCorpInfo.corp_sub_industry : ''}` : '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="企业规模">{{ detailData.authCorpInfo?.corp_scale || '-' }}</el-descriptions-item>
              <el-descriptions-item label="授权管理员">{{ detailData.authUserInfo?.userid || '-' }}</el-descriptions-item>
              <el-descriptions-item label="授权类型">
                <el-tag :type="detailData.authType === 'third_party' ? 'warning' : ''" size="small">
                  {{ detailData.authType === 'third_party' ? '第三方应用' : '自建应用' }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="连接状态">
                <el-tag :type="detailData.connectionStatus === 'connected' ? 'success' : detailData.connectionStatus === 'disconnected' ? 'danger' : 'info'" size="small">
                  {{ { connected: '已连接', disconnected: '已断开', pending: '待连接' }[detailData.connectionStatus] || '未知' }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="启用状态">
                <el-tag :type="detailData.isEnabled ? 'success' : 'danger'" size="small">{{ detailData.isEnabled ? '已启用' : '已停用' }}</el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="关联租户">
                <span v-if="detailData.tenantName" style="color: #67c23a">{{ detailData.tenantName }} ({{ detailData.tenantCode }})</span>
                <span v-else style="color: #e6a23c">未关联</span>
              </el-descriptions-item>
              <el-descriptions-item label="会话存档">
                <el-tag :type="detailData.chatArchiveAuth ? 'success' : 'info'" size="small">{{ detailData.chatArchiveAuth ? '已授权' : '未授权' }}</el-tag>
              </el-descriptions-item>
              <el-descriptions-item>
                <template #label>
                  <el-tooltip content="企业微信数据与智能专区API授权状态，授权后可调用数据分析相关接口" placement="top">
                    <span style="cursor: help; border-bottom: 1px dashed #c0c4cc">数据API</span>
                  </el-tooltip>
                </template>
                <el-tag :type="detailData.dataApiStatus === 1 ? 'success' : detailData.dataApiStatus === 2 ? 'danger' : 'info'" size="small">{{ dataApiStatusLabel(detailData.dataApiStatus) }}</el-tag>
                <span v-if="detailData.dataApiExpireTime" style="font-size: 12px; color: #909399; margin-left: 6px">到期: {{ formatDate(detailData.dataApiExpireTime) }}</span>
              </el-descriptions-item>
              <el-descriptions-item>
                <template #label>
                  <el-tooltip content="会话存档增值服务，开通后可获取企业成员的聊天记录（需企业在企微后台单独购买）" placement="top">
                    <span style="cursor: help; border-bottom: 1px dashed #c0c4cc">增值服务</span>
                  </el-tooltip>
                </template>
                <el-tag v-if="detailData.vasChatArchive" type="success" size="small">会话存档已开通 ({{ detailData.vasUserCount || 0 }}人)</el-tag>
                <span v-else style="color: #c0c4cc">未开通</span>
                <span v-if="detailData.vasChatArchive && detailData.vasExpireDate" style="font-size: 12px; color: #909399; margin-left: 6px">到期: {{ detailData.vasExpireDate }}</span>
              </el-descriptions-item>
              <el-descriptions-item label="API调用次数">{{ detailData.apiCallCount || 0 }}</el-descriptions-item>
              <el-descriptions-item label="创建时间">{{ formatDate(detailData.createdAt) }}</el-descriptions-item>
              <el-descriptions-item label="更新时间">{{ formatDate(detailData.updatedAt) }}</el-descriptions-item>
              <el-descriptions-item label="最后错误" :span="2" v-if="detailData.lastError">
                <el-text type="danger" size="small">{{ detailData.lastError }}</el-text>
              </el-descriptions-item>
            </el-descriptions>

            <!-- 统计数据 -->
            <el-divider content-position="left">关联数据统计</el-divider>
            <el-row :gutter="16">
              <el-col :span="6"><el-statistic title="企微客户" :value="detailData.stats?.customerCount || 0" /></el-col>
              <el-col :span="6"><el-statistic title="成员绑定" :value="detailData.stats?.bindingCount || 0" /></el-col>
              <el-col :span="6"><el-statistic title="会话记录" :value="detailData.stats?.chatRecordCount || 0" /></el-col>
              <el-col :span="6"><el-statistic title="授权人数上限" :value="detailData.authCorpInfo?.corp_user_max || '-'" /></el-col>
            </el-row>
          </el-tab-pane>

          <!-- Tab: 授权范围 -->
          <el-tab-pane label="授权范围" name="scope">
            <!-- 应用被删除/取消授权提示 -->
            <el-alert
              v-if="detailData.connectionStatus === 'disconnected' && !detailData.isEnabled"
              type="error"
              :closable="false"
              style="margin-bottom: 16px"
            >
              <template #title><strong>⚠️ 企业已取消授权（主动删除应用）</strong></template>
              <div style="font-size: 12px; margin-top: 4px">
                该企业已在企业微信后台删除/停用了本服务商应用，所有API调用将不可用。
                <span v-if="detailData.lastError" style="color: #f56c6c">{{ detailData.lastError }}</span>
              </div>
            </el-alert>

            <!-- 刷新按钮 -->
            <div style="display: flex; justify-content: flex-end; margin-bottom: 12px" v-if="detailData.authType === 'third_party'">
              <el-button size="small" type="primary" :loading="refreshingAuth" @click="handleRefreshAuth">
                🔄 从企微同步最新授权信息
              </el-button>
            </div>

            <template v-if="detailData.authScope">
              <!-- 已授权权限概览 -->
              <el-divider content-position="left">已授权权限</el-divider>
              <div style="margin-bottom: 16px">
                <template v-if="parsedPermissions.length > 0">
                  <el-tag
                    v-for="perm in parsedPermissions"
                    :key="perm.key"
                    :type="perm.granted ? 'success' : 'info'"
                    effect="plain"
                    size="default"
                    style="margin: 0 8px 8px 0"
                  >
                    <span v-if="perm.granted" style="color: #67c23a; margin-right: 4px; font-weight: bold">✓</span>
                    <span v-else style="color: #c0c4cc; margin-right: 4px">○</span>
                    {{ perm.label }}
                  </el-tag>
                </template>
                <el-text v-else type="info" size="small">暂无权限数据（授权信息可能未同步，请点击上方刷新按钮）</el-text>
              </div>

              <!-- 授权应用列表 -->
              <el-divider content-position="left">授权应用范围</el-divider>
              <template v-if="detailData.authScope.agent && detailData.authScope.agent.length > 0">
                <el-card v-for="(agent, idx) in detailData.authScope.agent" :key="idx" shadow="never" style="margin-bottom: 12px; border: 1px solid #ebeef5">
                  <template #header>
                    <div style="display: flex; align-items: center; gap: 8px">
                      <img v-if="agent.square_logo_url" :src="agent.square_logo_url" style="width: 24px; height: 24px; border-radius: 4px" />
                      <span style="font-weight: 600">{{ agent.name || `应用 ${agent.agentid}` }}</span>
                      <el-tag size="small" type="info">AgentID: {{ agent.agentid }}</el-tag>
                      <el-tag v-if="agent.privilege?.level === 1" size="small" type="warning">管理权限</el-tag>
                      <el-tag v-else size="small">使用权限</el-tag>
                    </div>
                  </template>
                  <el-descriptions :column="1" border size="small" v-if="agent.privilege">
                    <el-descriptions-item label="授权部门">
                      <template v-if="agent.privilege.allow_party && agent.privilege.allow_party.length > 0">
                        <el-tag v-for="partyId in agent.privilege.allow_party" :key="partyId" size="small" style="margin: 0 4px 4px 0" effect="plain">
                          {{ resolveDeptName(partyId) }}
                        </el-tag>
                        <span style="font-size: 12px; color: #909399; margin-left: 4px">共 {{ agent.privilege.allow_party.length }} 个部门</span>
                      </template>
                      <span v-else style="color: #c0c4cc">全部部门 / 未限制</span>
                    </el-descriptions-item>
                    <el-descriptions-item label="授权成员">
                      <template v-if="agent.privilege.allow_user && agent.privilege.allow_user.length > 0">
                        <el-tag v-for="userId in agent.privilege.allow_user.slice(0, 5)" :key="userId" size="small" style="margin: 0 4px 4px 0" effect="plain">
                          {{ resolveMemberName(userId) }}
                        </el-tag>
                        <el-button link type="primary" size="small" style="margin-left: 4px" @click="openMemberListDialog(agent.privilege.allow_user, agent.name || ('应用 ' + agent.agentid))">
                          共 {{ agent.privilege.allow_user.length }} 人 ›
                        </el-button>
                      </template>
                      <span v-else style="color: #c0c4cc">全部成员 / 未限制</span>
                    </el-descriptions-item>
                    <el-descriptions-item label="授权标签">
                      <template v-if="agent.privilege.allow_tag && agent.privilege.allow_tag.length > 0">
                        <el-tag v-for="tagId in agent.privilege.allow_tag" :key="tagId" size="small" style="margin: 0 4px 4px 0" effect="plain" type="warning">
                          标签ID: {{ tagId }}
                        </el-tag>
                        <span style="font-size: 12px; color: #909399; margin-left: 4px">共 {{ agent.privilege.allow_tag.length }} 个标签</span>
                      </template>
                      <span v-else style="color: #c0c4cc">无标签限制</span>
                    </el-descriptions-item>
                    <el-descriptions-item label="额外可见部门" v-if="agent.privilege.extra_party && agent.privilege.extra_party.length > 0">
                      <el-tag v-for="partyId in agent.privilege.extra_party" :key="partyId" size="small" style="margin: 0 4px 4px 0" effect="plain" type="info">
                        {{ resolveDeptName(partyId) }}
                      </el-tag>
                    </el-descriptions-item>
                    <el-descriptions-item label="额外可见成员" v-if="agent.privilege.extra_user && agent.privilege.extra_user.length > 0">
                      <el-tag v-for="userId in agent.privilege.extra_user" :key="userId" size="small" style="margin: 0 4px 4px 0" effect="plain" type="info">
                        {{ resolveMemberName(userId) }}
                      </el-tag>
                    </el-descriptions-item>
                  </el-descriptions>
                </el-card>
              </template>
              <el-empty v-else description="暂无应用授权范围数据" :image-size="60" />
            </template>
            <el-empty v-else description="暂无授权范围数据，请点击刷新获取最新信息" :image-size="60" />

            <!-- 企业信息 -->
            <template v-if="detailData.authCorpInfo">
              <el-divider content-position="left">授权企业信息</el-divider>
              <el-descriptions :column="2" border size="small">
                <el-descriptions-item label="企业名称">{{ detailData.authCorpInfo.corp_name || '-' }}</el-descriptions-item>
                <el-descriptions-item label="企业全称">{{ detailData.authCorpInfo.corp_full_name || '-' }}</el-descriptions-item>
                <el-descriptions-item label="企业类型">{{ corpTypeLabel(detailData.authCorpInfo.corp_type) }}</el-descriptions-item>
                <el-descriptions-item label="企业规模">{{ detailData.authCorpInfo.corp_scale || '-' }}</el-descriptions-item>
                <el-descriptions-item label="行业">
                  {{ detailData.authCorpInfo.corp_industry || '-' }}
                  {{ detailData.authCorpInfo.corp_sub_industry ? ' - ' + detailData.authCorpInfo.corp_sub_industry : '' }}
                </el-descriptions-item>
                <el-descriptions-item label="授权人数上限">{{ detailData.authCorpInfo.corp_user_max || '-' }}</el-descriptions-item>
                <el-descriptions-item label="企业微信ID">{{ detailData.authCorpInfo.corpid || '-' }}</el-descriptions-item>
                <el-descriptions-item label="认证到期">{{ detailData.authCorpInfo.corp_wxqrcode ? '已认证' : '-' }}</el-descriptions-item>
              </el-descriptions>
            </template>
          </el-tab-pane>

          <!-- Tab: 操作日志 -->
          <el-tab-pane label="操作日志" name="logs">
            <!-- 自动清理配置 -->
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; padding: 8px 12px; background: #f5f7fa; border-radius: 6px">
              <div style="display: flex; align-items: center; gap: 8px; font-size: 13px; color: #606266">
                <span>自动清理：</span>
                <el-switch v-model="logAutoClean.enabled" size="small" @change="handleLogAutoCleanChange" />
                <template v-if="logAutoClean.enabled">
                  <span>保留</span>
                  <el-input-number v-model="logAutoClean.retentionDays" :min="7" :max="365" :step="7" size="small" style="width: 100px" @change="handleLogAutoCleanChange" />
                  <span>天</span>
                </template>
                <span v-else style="color: #909399">（关闭后日志将永久保留）</span>
              </div>
              <el-button size="small" type="danger" plain @click="handleManualCleanLogs" :loading="logCleaning">手动清理</el-button>
            </div>
            <el-table :data="logList" v-loading="logLoading" stripe size="small" style="margin-bottom: 12px">
              <el-table-column prop="operator" label="来源" width="120">
                <template #default="{ row }">
                  <el-tag :type="row.operator === '企业微信回调' ? 'warning' : row.operator === '系统同步' ? '' : 'info'" size="small" effect="plain">
                    {{ row.operator || '-' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="actionType" label="操作类型" width="140">
                <template #default="{ row }">
                  <el-tag
                    :type="logActionTagType(row.actionType)"
                    size="small"
                    effect="plain"
                  >{{ row.actionType || '-' }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="detail" label="操作详情" min-width="220" show-overflow-tooltip />
              <el-table-column label="时间" width="155">
                <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
              </el-table-column>
            </el-table>
            <el-empty v-if="!logLoading && logList.length === 0" description="暂无操作日志" />
            <div v-if="logTotal > 0" style="display: flex; justify-content: flex-end">
              <el-pagination
                v-model:current-page="logPage"
                v-model:page-size="logPageSize"
                :total="logTotal"
                :page-sizes="[10, 20, 50]"
                layout="total, sizes, prev, pager, next"
                small
                @size-change="fetchLogs(1)"
                @current-change="fetchLogs"
              />
            </div>
          </el-tab-pane>

          <!-- Tab: 账单记录 -->
          <el-tab-pane label="账单记录" name="billing">
            <el-table :data="billingList" v-loading="billingLoading" stripe size="small" style="margin-bottom: 12px">
              <el-table-column prop="orderNo" label="订单号" width="180" show-overflow-tooltip />
              <el-table-column prop="packageName" label="服务/套餐" min-width="150" show-overflow-tooltip />
              <el-table-column label="金额" width="100" align="right">
                <template #default="{ row }">
                  <span style="font-weight: 500; color: #e6a23c">¥{{ row.amount || row.costPrice || 0 }}</span>
                </template>
              </el-table-column>
              <el-table-column label="状态" width="90" align="center">
                <template #default="{ row }">
                  <el-tag :type="row.status === 'paid' || row.status === 'active' || row.fulfillmentStatus === 'fulfilled' ? 'success' : row.status === 'pending_payment' ? 'warning' : 'info'" size="small">
                    {{ { paid: '已付', active: '生效', pending_payment: '待付', fulfilled: '已履约', failed: '失败' }[row.status || row.fulfillmentStatus] || row.status || '-' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="时间" width="155">
                <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
              </el-table-column>
            </el-table>
            <el-empty v-if="!billingLoading && billingList.length === 0" :description="detailData?.tenantId ? '暂无账单记录' : '未关联租户，无账单记录'" />
            <div v-if="billingTotal > 0" style="display: flex; justify-content: flex-end">
              <el-pagination
                v-model:current-page="billingPage"
                :page-size="10"
                :total="billingTotal"
                layout="total, prev, pager, next"
                small
                @current-change="fetchBilling"
              />
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
        <el-button v-if="detailData && !detailData.tenantId" v-permission="'wecom-management:tenant-auth:edit'" type="warning" @click="detailVisible = false; openBindDialog(detailData)">关联租户</el-button>
      </template>
    </el-dialog>

    <!-- 授权成员列表弹窗 -->
    <el-dialog v-model="memberListVisible" :title="`授权成员 - ${memberListTitle}`" width="720px" destroy-on-close append-to-body>
      <div style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center">
        <span style="font-size: 14px; color: #606266">共 <strong>{{ memberListAll.length }}</strong> 名成员</span>
        <el-input v-model="memberListSearch" placeholder="搜索成员姓名/ID" clearable style="width: 200px" size="small" />
      </div>
      <el-table :data="paginatedMemberList" stripe size="small" style="margin-bottom: 12px">
        <el-table-column label="#" type="index" width="50" :index="(i: number) => (memberListPage - 1) * memberListPageSize + i + 1" />
        <el-table-column label="成员姓名" min-width="120">
          <template #default="{ row }">
            <span style="font-weight: 500">{{ row.name || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="账号(UserID)" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">
            <span style="font-size: 12px; font-family: monospace; color: #606266">{{ row.userId }}</span>
          </template>
        </el-table-column>
        <el-table-column label="部门" min-width="120" show-overflow-tooltip>
          <template #default="{ row }">
            <span>{{ row.deptNames || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="140">
          <template #default="{ row }">{{ row.createdAt ? formatDate(row.createdAt) : '-' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.isEnabled === false ? 'danger' : 'success'" size="small">{{ row.isEnabled === false ? '异常' : '正常' }}</el-tag>
          </template>
        </el-table-column>
      </el-table>
      <div style="display: flex; justify-content: flex-end">
        <el-pagination
          v-model:current-page="memberListPage"
          v-model:page-size="memberListPageSize"
          :total="filteredMemberList.length"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          small
        />
      </div>
    </el-dialog>

    <!-- 关联租户弹窗 -->
    <el-dialog v-model="showBindDialog" title="关联租户" width="480px" destroy-on-close>
      <el-form label-width="80px">
        <el-form-item label="企业">{{ bindTarget?.authCorpName || bindTarget?.configName }}</el-form-item>
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
            <el-option v-for="item in bindableCustomers" :key="item.id" :label="item.label" :value="item.id">
              <div style="display: flex; justify-content: space-between; align-items: center">
                <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap">{{ item.name }}</span>
                <el-tag :type="item.customerType === 'tenant' ? '' : 'warning'" size="small" style="margin-left: 8px; flex-shrink: 0">
                  {{ item.customerType === 'tenant' ? '租户' : '私有' }}
                </el-tag>
              </div>
              <div style="font-size: 12px; color: #909399; line-height: 1.4">{{ item.code }}{{ item.contact ? ` · ${item.contact}` : '' }}</div>
            </el-option>
            <el-option v-if="bindableHasMore" value="__loadmore__" disabled>
              <div style="text-align: center; cursor: pointer; color: #409eff; font-size: 13px; padding: 4px 0" @click.stop="loadMoreBindable">
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
        <el-button v-permission="'wecom-management:tenant-auth:edit'" type="primary" @click="handleBindTenant" :loading="binding" :disabled="!bindTenantId || bindTenantId === '__loadmore__' || bindTenantId === '__empty__'">确认关联</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/api/request'
import { getBindableCustomers } from '@/api/wecomManagement'

// ==================== 列表相关 ====================
const loading = ref(false)
const authList = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const searchKeyword = ref('')
const searchAuthType = ref('all')
const searchStatus = ref('')

// ==================== 详情弹窗相关 ====================
const detailVisible = ref(false)
const detailLoading = ref(false)
const detailData = ref<any>(null)
const detailTab = ref('info')
const refreshingAuth = ref(false)

// ==================== 操作日志 ====================
const logList = ref<any[]>([])
const logLoading = ref(false)
const logTotal = ref(0)
const logPage = ref(1)
const logPageSize = ref(10)
const logAutoClean = ref({ enabled: false, retentionDays: 30 })
const logCleaning = ref(false)

const handleLogAutoCleanChange = async () => {
  try {
    const configId = detailData.value?.configId
    if (!configId) return
    await request.put(`/wecom-management/tenant-auth/${configId}/log-auto-clean`, {
      enabled: logAutoClean.value.enabled,
      retentionDays: logAutoClean.value.retentionDays
    })
    ElMessage.success('自动清理设置已保存')
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  }
}

const handleManualCleanLogs = async () => {
  const configId = detailData.value?.configId
  if (!configId) return
  try {
    await ElMessageBox.confirm(
      `确定清理 ${logAutoClean.value.retentionDays} 天前的操作日志？此操作不可恢复。`,
      '手动清理',
      { type: 'warning' }
    )
    logCleaning.value = true
    await request.delete(`/wecom-management/tenant-auth/${configId}/logs`, {
      params: { beforeDays: logAutoClean.value.retentionDays }
    })
    ElMessage.success('清理完成')
    fetchLogs(1)
  } catch { /* cancelled */ }
  logCleaning.value = false
}

// ==================== 账单记录 ====================
const billingList = ref<any[]>([])
const billingLoading = ref(false)
const billingTotal = ref(0)
const billingPage = ref(1)

// ==================== 授权成员列表弹窗 ====================
const memberListVisible = ref(false)
const memberListTitle = ref('')
const memberListAll = ref<string[]>([])
const memberListSearch = ref('')
const memberListPage = ref(1)
const memberListPageSize = ref(10)

const filteredMemberList = computed(() => {
  if (!memberListSearch.value) return memberListAll.value
  const kw = memberListSearch.value.toLowerCase()
  return memberListAll.value.filter(u => {
    const info = detailData.value?.memberInfoMap?.[u]
    const name = info?.name || ''
    return u.toLowerCase().includes(kw) || name.toLowerCase().includes(kw)
  })
})

const paginatedMemberList = computed(() => {
  const start = (memberListPage.value - 1) * memberListPageSize.value
  return filteredMemberList.value.slice(start, start + memberListPageSize.value).map(userId => {
    const info = detailData.value?.memberInfoMap?.[userId]
    return {
      userId,
      name: info?.name || '',
      deptNames: info?.deptNames || '',
      isEnabled: info?.isEnabled !== false,
      createdAt: info?.createdAt || ''
    }
  })
})

const openMemberListDialog = (users: string[], appName: string) => {
  memberListAll.value = users
  memberListTitle.value = appName
  memberListSearch.value = ''
  memberListPage.value = 1
  memberListVisible.value = true
}

/** 解析部门ID为名称 */
const resolveDeptName = (partyId: number) => {
  const nameMap = detailData.value?.deptNameMap
  if (nameMap && nameMap[partyId]) return nameMap[partyId]
  return `部门${partyId}`
}

/** 解析成员ID为姓名 */
const resolveMemberName = (userId: string) => {
  const infoMap = detailData.value?.memberInfoMap
  if (infoMap && infoMap[userId]?.name) return infoMap[userId].name
  return userId
}

// ==================== 关联租户弹窗 ====================
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

const bindableHasMore = computed(() => bindableCustomers.value.length < bindableTotal.value)

const formatDate = (date: string) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const dataApiStatusLabel = (status: number) => {
  const map: Record<number, string> = { 0: '未授权', 1: '已授权', 2: '已过期' }
  return map[status] || '未知'
}

const corpTypeLabel = (type: string) => {
  const map: Record<string, string> = { verified: '已认证企业', unverified: '未认证企业', trial: '试用企业' }
  return map[type] || type || '-'
}

const logActionTagType = (actionType: string) => {
  if (!actionType) return 'info'
  if (actionType.includes('取消') || actionType.includes('删除') || actionType.includes('停用')) return 'danger'
  if (actionType.includes('授权') || actionType.includes('安装')) return 'success'
  if (actionType.includes('变更') || actionType.includes('重置')) return 'warning'
  if (actionType.includes('同步')) return ''
  return 'info'
}

// 权限类别映射表（企微服务商应用常见权限）
const PERMISSION_CATEGORIES = [
  { key: 'contact', label: '组织架构/通讯录' },
  { key: 'external_contact', label: '客户联系' },
  { key: 'customer_acquisition', label: '获客助手' },
  { key: 'customer_group', label: '客户群管理' },
  { key: 'contact_way', label: '联系我(活码)' },
  { key: 'chat_archive', label: '会话存档' },
  { key: 'kf', label: '微信客服' },
  { key: 'external_pay', label: '对外收款' },
  { key: 'sidebar', label: '侧边栏' },
  { key: 'corp_info', label: '企业信息' },
  { key: 'employee_info', label: '员工信息' },
  { key: 'data_intelligence', label: '数据与智能专区' },
]

// 根据授权数据解析已授权的权限列表
const parsedPermissions = computed(() => {
  if (!detailData.value?.authScope) return []
  const scope = detailData.value.authScope
  const agents = scope.agent || []
  if (agents.length === 0) return []

  // 有agent即代表该应用已被授权使用，第三方应用授权后所配置的权限均已授权
  const hasAgent = agents.length > 0
  return PERMISSION_CATEGORIES.map(cat => ({
    key: cat.key,
    label: cat.label,
    granted: hasAgent
  }))
})

// ==================== 列表加载 ====================
const fetchList = async () => {
  loading.value = true
  try {
    const res = await request.get('/wecom-management/tenant-auth', {
      params: {
        keyword: searchKeyword.value || undefined,
        authType: searchAuthType.value || undefined,
        status: searchStatus.value || undefined,
        page: page.value,
        pageSize: pageSize.value
      }
    })
    if (res.data) {
      authList.value = res.data.list || []
      total.value = res.data.total || 0
    }
  } catch (e) {
    console.error('Fetch tenant auth list error:', e)
    ElMessage.error('租户授权列表加载失败')
  } finally {
    loading.value = false
  }
}

// ==================== 刷新授权信息 ====================
const handleRefreshAuth = async () => {
  if (!detailData.value?.configId) return
  refreshingAuth.value = true
  try {
    const res = await request.post(`/wecom-management/tenant-auth/${detailData.value.configId}/refresh-auth`)
    if (res.success !== false && res.data) {
      // 更新本地数据
      detailData.value.authScope = res.data.authScope || detailData.value.authScope
      detailData.value.authCorpInfo = res.data.authCorpInfo || detailData.value.authCorpInfo
      detailData.value.connectionStatus = 'connected'
      detailData.value.lastError = null
      ElMessage.success(res.message || '授权信息已刷新')
    } else {
      ElMessage.warning(res.message || '刷新失败')
      // 如果是授权失效，更新本地状态
      if (res.message?.includes('取消授权') || res.message?.includes('已删除')) {
        detailData.value.connectionStatus = 'disconnected'
        detailData.value.isEnabled = false
      }
    }
  } catch (e: any) {
    ElMessage.error(e?.message || '刷新授权信息失败')
  }
  refreshingAuth.value = false
}

// ==================== 详情 ====================
const viewDetail = async (row: any) => {
  detailLoading.value = true
  detailVisible.value = true
  detailData.value = null
  detailTab.value = 'info'
  logList.value = []
  logTotal.value = 0
  logPage.value = 1
  billingList.value = []
  billingTotal.value = 0
  billingPage.value = 1
  const configId = row.configId || row.id
  try {
    const res = await request.get(`/wecom-management/tenant-auth/${configId}/detail`)
    if (res.data) {
      detailData.value = res.data
      // 同时加载日志和账单
      fetchLogs(1)
      fetchBilling(1)
    }
  } catch (e: any) {
    ElMessage.error(e?.message || '获取详情失败')
  } finally {
    detailLoading.value = false
  }
}

// ==================== 操作日志 ====================
const fetchLogs = async (pg?: number) => {
  if (!detailData.value) return
  if (pg) logPage.value = pg
  logLoading.value = true
  try {
    const configId = detailData.value.configId
    const res = await request.get(`/wecom-management/tenant-auth/${configId}/logs`, {
      params: { page: logPage.value, pageSize: logPageSize.value }
    })
    const data = res.data
    logList.value = data?.list || []
    logTotal.value = data?.total || 0
  } catch { logList.value = [] }
  logLoading.value = false
}

// ==================== 账单记录 ====================
const fetchBilling = async (pg?: number) => {
  if (!detailData.value) return
  if (pg) billingPage.value = pg
  billingLoading.value = true
  try {
    const configId = detailData.value.configId
    const res = await request.get(`/wecom-management/tenant-auth/${configId}/billing`, {
      params: { page: billingPage.value, pageSize: 10 }
    })
    const data = res.data
    billingList.value = data?.list || []
    billingTotal.value = data?.total || 0
  } catch { billingList.value = [] }
  billingLoading.value = false
}

// ==================== 关联租户 ====================
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

const loadMoreBindable = () => {
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
    const configId = bindTarget.value.configId || bindTarget.value.id
    await request.post(`/wecom-management/tenant-auth/${configId}/bind-tenant`, { tenantId: bindTenantId.value })
    ElMessage.success('已关联租户')
    showBindDialog.value = false
    fetchList()
  } catch (e: any) {
    ElMessage.error(e?.message || '关联失败')
  }
  binding.value = false
}

// ==================== 停用/恢复 ====================
const handleRevoke = (row: any) => {
  ElMessageBox.prompt(
    `确定停用配置「${row.authCorpName || row.configName}」（${row.corpId}）的授权？\n停用后该租户将无法使用企微功能。`,
    '停用授权',
    { confirmButtonText: '确认停用', cancelButtonText: '取消', inputPlaceholder: '停用原因（可选）', type: 'warning' }
  ).then(async ({ value: reason }: { value: string }) => {
    try {
      await request.post(`/wecom-management/tenant-auth/${row.configId}/revoke`, { reason })
      ElMessage.success('已停用授权')
      fetchList()
    } catch (e: any) {
      ElMessage.error(e?.message || '操作失败')
    }
  }).catch(() => {})
}

const handleRestore = async (row: any) => {
  try {
    await ElMessageBox.confirm(`确定恢复配置「${row.authCorpName || row.configName}」的授权？`, '恢复授权', { type: 'info' })
    await request.post(`/wecom-management/tenant-auth/${row.configId}/restore`)
    ElMessage.success('已恢复授权')
    fetchList()
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error(e?.message || '操作失败')
  }
}

onMounted(() => fetchList())
</script>

<style scoped>
.page-container { padding: 20px; }
.card-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; }
.header-actions { display: flex; gap: 10px; flex-wrap: wrap; }
.json-block {
  background: #f5f7fa;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  padding: 12px;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 300px;
  overflow-y: auto;
  margin: 0;
}
</style>

