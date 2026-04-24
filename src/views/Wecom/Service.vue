<template>
  <div class="wecom-service">
    <!-- 示例模式横幅 -->
    <WecomDemoBanner :is-demo-mode="isDemoMode" />

    <el-card>
      <template #header>
        <WecomHeader tab-name="service">
          微信客服
          <template #actions>
            <el-select v-model="selectedConfigId" placeholder="选择企微配置" style="width: 180px" @change="handleConfigChange">
              <el-option v-for="c in displayConfigs" :key="c.id" :label="c.name" :value="c.id" />
            </el-select>
          </template>
        </WecomHeader>
      </template>

      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <!-- ==================== Tab 1: 客服账号 ==================== -->
        <el-tab-pane label="客服账号" name="accounts">
          <div class="tab-toolbar">
            <el-button type="primary" @click="handleAddAccount" :disabled="!selectedConfigId">
              <el-icon><Plus /></el-icon>创建客服
            </el-button>
            <el-button @click="handleSyncAccounts" :loading="syncingAccounts" :disabled="!selectedConfigId">
              <el-icon><Refresh /></el-icon>从企微同步
            </el-button>
            <el-input v-model="accountSearchKw" placeholder="搜索客服名称" clearable style="width: 180px" @clear="filterAccounts" @keyup.enter="filterAccounts">
              <template #prefix><el-icon><Search /></el-icon></template>
            </el-input>
            <div style="flex:1" />
            <span class="count-label">共 {{ filteredAccountList.length }} 个客服</span>
          </div>
          <el-table :data="pagedAccountList" v-loading="loading" stripe>
            <el-table-column type="index" label="#" width="50" />
            <el-table-column prop="name" label="客服名称" min-width="130">
              <template #default="{ row }">
                <div class="user-cell">
                  <el-avatar :size="28" :src="row.avatar" style="flex-shrink:0">{{ (row.name || '客')[0] }}</el-avatar>
                  <span style="font-weight:600">{{ row.name }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="openKfId" label="客服ID" min-width="150" show-overflow-tooltip>
              <template #default="{ row }">
                <span style="font-family:monospace;font-size:12px;color:#6B7280">{{ row.openKfId }}</span>
              </template>
            </el-table-column>
            <el-table-column label="接待人员" min-width="130">
              <template #default="{ row }">
                {{ parseServicerNames(row.servicerUserIds) }}
              </template>
            </el-table-column>
            <el-table-column label="接待时间" width="140">
              <template #default="{ row }">
                <template v-if="row.serviceTimeStart && row.serviceTimeEnd">
                  <el-tag type="info" size="small">{{ row.serviceTimeStart }} - {{ row.serviceTimeEnd }}</el-tag>
                </template>
                <el-tag v-else type="success" size="small">全天候</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="今日会话" width="90" align="center">
              <template #default="{ row }">
                <span style="font-weight:700;color:#4C6EF5">{{ row.todayServiceCount || 0 }}</span>
              </template>
            </el-table-column>
            <el-table-column label="累计会话" width="90" align="center">
              <template #default="{ row }">{{ row.sessionCount || row.totalServiceCount || 0 }}</template>
            </el-table-column>
            <el-table-column label="消息数" width="80" align="center">
              <template #default="{ row }">{{ row.messageCount || 0 }}</template>
            </el-table-column>
            <el-table-column label="欢迎语" min-width="120" show-overflow-tooltip>
              <template #default="{ row }">
                <span style="color:#9CA3AF;font-size:12px">{{ row.welcomeMsg || '未设置' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="80" align="center">
              <template #default="{ row }">
                <el-tag :type="row.isEnabled ? 'success' : 'info'" size="small" effect="dark">{{ row.isEnabled ? '启用' : '禁用' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="260" fixed="right">
              <template #default="{ row }">
                <el-button type="primary" link size="small" @click="showAccountDetail(row)">详情</el-button>
                <el-button type="success" link size="small" @click="handleEditAccount(row)">编辑</el-button>
                <el-button :type="row.isEnabled ? 'warning' : 'success'" link size="small" @click="handleToggleAccount(row)">{{ row.isEnabled ? '禁用' : '启用' }}</el-button>
                <el-button type="primary" link size="small" @click="showLink(row)">链接</el-button>
                <el-button type="info" link size="small" @click="showKfQrCode(row)">二维码</el-button>
                <el-button type="danger" link size="small" @click="handleDeleteAccount(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <div class="pagination-wrapper">
            <el-pagination
              v-model:current-page="accountPage"
              v-model:page-size="accountPageSize"
              :total="filteredAccountList.length"
              :page-sizes="[10, 20, 50]"
              layout="total, sizes, prev, pager, next"
              small
            />
          </div>
        </el-tab-pane>

        <!-- ==================== Tab 2: 实时工作台 ==================== -->
        <el-tab-pane label="实时工作台" name="workspace">
          <!-- 统计卡片 - 群数据风格 -->
          <div class="stats-grid cols-6">
            <div class="stats-card amber">
              <div class="stats-card-icon">⏳</div>
              <div class="stats-card-body">
                <div class="stats-card-value">{{ workspaceStats.waiting }}</div>
                <div class="stats-card-label">等待接入</div>
              </div>
            </div>
            <div class="stats-card blue">
              <div class="stats-card-icon">💬</div>
              <div class="stats-card-body">
                <div class="stats-card-value">{{ workspaceStats.ongoing }}</div>
                <div class="stats-card-label">进行中</div>
              </div>
            </div>
            <div class="stats-card green">
              <div class="stats-card-icon">✅</div>
              <div class="stats-card-body">
                <div class="stats-card-value">{{ workspaceStats.todayClosed }}</div>
                <div class="stats-card-label">今日已结束</div>
              </div>
            </div>
            <div class="stats-card indigo">
              <div class="stats-card-icon">⏱️</div>
              <div class="stats-card-body">
                <div class="stats-card-value">{{ workspaceStats.avgWait || '-' }}</div>
                <div class="stats-card-label">平均等待</div>
              </div>
            </div>
            <div class="stats-card purple">
              <div class="stats-card-icon">⚡</div>
              <div class="stats-card-body">
                <div class="stats-card-value">{{ workspaceStats.avgResponse || '-' }}</div>
                <div class="stats-card-label">平均响应</div>
              </div>
            </div>
            <div class="stats-card green">
              <div class="stats-card-icon">⭐</div>
              <div class="stats-card-body">
                <div class="stats-card-value">{{ workspaceStats.satisfaction || '-' }}</div>
                <div class="stats-card-label">满意度</div>
              </div>
            </div>
          </div>

          <!-- 筛选工具栏 -->
          <div class="tab-toolbar" style="margin-top:16px">
            <el-select v-model="wsFilterKfId" placeholder="全部客服账号" clearable style="width:180px" @change="fetchWorkspaceData">
              <el-option v-for="a in displayAccountOptions" :key="a.openKfId" :label="a.name" :value="a.openKfId" />
            </el-select>
            <el-select v-model="wsFilterStatus" placeholder="会话状态" clearable style="width:120px" @change="fetchWorkspaceData">
              <el-option label="等待中" value="waiting" />
              <el-option label="进行中" value="open" />
            </el-select>
            <el-input v-model="wsSearchKw" placeholder="搜索客户/客服" clearable style="width:180px" @keyup.enter="fetchWorkspaceData" @clear="fetchWorkspaceData">
              <template #prefix><el-icon><Search /></el-icon></template>
            </el-input>
            <div style="flex:1" />
            <el-button size="small" type="primary" @click="fetchWorkspaceData" :loading="workspaceLoading">
              <el-icon><Refresh /></el-icon>刷新
            </el-button>
            <el-tag type="info" size="small">自动刷新: 30s</el-tag>
          </div>

          <el-card shadow="never" style="margin-top: 12px">
            <template #header>
              <div style="display: flex; justify-content: space-between; align-items: center">
                <span style="font-weight: 600">📋 当前会话列表</span>
                <span class="count-label">共 {{ filteredWsSessions.length }} 条</span>
              </div>
            </template>
            <el-table :data="pagedWsSessions" v-loading="workspaceLoading" stripe>
              <el-table-column type="index" label="#" width="50" />
              <el-table-column label="客户" min-width="130">
                <template #default="{ row }">
                  <div class="user-cell">
                    <el-avatar :size="24">{{ (row.customerName || '访')[0] }}</el-avatar>
                    <span>{{ row.customerName || row.externalUserid || '访客' }}</span>
                  </div>
                </template>
              </el-table-column>
              <el-table-column label="客服账号" min-width="100">
                <template #default="{ row }">{{ getAccountName(row.openKfId || '') }}</template>
              </el-table-column>
              <el-table-column label="接待客服" min-width="100">
                <template #default="{ row }">{{ row.servicerName || '-' }}</template>
              </el-table-column>
              <el-table-column label="状态" width="90" align="center">
                <template #default="{ row }">
                  <el-tag :type="row.status === 'waiting' ? 'warning' : 'primary'" size="small" effect="dark">
                    {{ row.status === 'waiting' ? '等待中' : '进行中' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="已进行" width="90" align="center">
                <template #default="{ row }">
                  <span :class="{ 'text-danger': row.durationMinutes > 30 }">{{ row.durationMinutes || 0 }}分钟</span>
                </template>
              </el-table-column>
              <el-table-column label="消息数" width="80" align="center">
                <template #default="{ row }">{{ row.msgCount || 0 }}</template>
              </el-table-column>
              <el-table-column label="最后消息" min-width="180" show-overflow-tooltip>
                <template #default="{ row }">
                  <span style="color: #909399;font-size:12px">{{ row.lastMessage || '-' }}</span>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="140" fixed="right">
                <template #default="{ row }">
                  <el-button type="primary" link size="small" @click="showSessionDetail(row)">详情</el-button>
                  <el-button v-if="row.status === 'open'" type="warning" link size="small" @click="handleTransferSession(row)">转接</el-button>
                </template>
              </el-table-column>
            </el-table>
            <el-empty v-if="!workspaceLoading && filteredWsSessions.length === 0" description="当前没有进行中的会话" />
            <div class="pagination-wrapper" v-if="filteredWsSessions.length > wsPageSize">
              <el-pagination
                v-model:current-page="wsPage"
                :page-size="wsPageSize"
                :total="filteredWsSessions.length"
                layout="total, prev, pager, next"
                small
              />
            </div>
          </el-card>
        </el-tab-pane>

        <!-- ==================== Tab 3: 会话记录 ==================== -->
        <el-tab-pane label="会话记录" name="sessions">
          <div class="tab-toolbar">
            <el-select v-model="sessionFilter.openKfId" placeholder="全部客服账号" clearable style="width: 160px" @change="fetchSessions">
              <el-option v-for="a in displayAccountOptions" :key="a.openKfId" :label="a.name" :value="a.openKfId" />
            </el-select>
            <el-select v-model="sessionFilter.status" placeholder="会话状态" clearable style="width: 120px" @change="fetchSessions">
              <el-option label="全部" value="" />
              <el-option label="进行中" value="open" />
              <el-option label="已关闭" value="closed" />
              <el-option label="超时" value="timeout" />
            </el-select>
            <el-date-picker v-model="sessionFilter.dateRange" type="daterange" range-separator="至" start-placeholder="开始" end-placeholder="结束" value-format="YYYY-MM-DD" style="width:260px" @change="fetchSessions" />
            <el-input v-model="sessionFilter.keyword" placeholder="搜索客户/客服" clearable style="width: 170px" @keyup.enter="fetchSessions" @clear="fetchSessions">
              <template #prefix><el-icon><Search /></el-icon></template>
            </el-input>
            <el-button @click="handleSyncSessions" :loading="syncingSessions" :disabled="!selectedConfigId">
              <el-icon><Refresh /></el-icon>同步
            </el-button>
            <div style="flex: 1"></div>
            <span class="count-label">共 {{ isDemoMode ? displaySessions.length : sessionTotal }} 条</span>
          </div>

          <el-table :data="displaySessions" v-loading="sessionsLoading" stripe>
            <el-table-column type="index" label="#" width="50" />
            <el-table-column label="客户" min-width="120">
              <template #default="{ row }">
                <div class="user-cell">
                  <el-avatar :size="24">{{ (row.customerName || '客')[0] }}</el-avatar>
                  <span>{{ row.customerName || row.externalUserid }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="接待客服" min-width="100">
              <template #default="{ row }">
                <span>{{ row.servicerName || row.servicerUserid || '-' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="客服账号" min-width="100">
              <template #default="{ row }">
                {{ getAccountName(row.openKfId) }}
              </template>
            </el-table-column>
            <el-table-column prop="msgCount" label="消息数" width="80" sortable />
            <el-table-column label="首次响应" width="100" sortable :sort-method="(a: any, b: any) => (a.firstResponseTime || 0) - (b.firstResponseTime || 0)">
              <template #default="{ row }">
                <span :class="{ 'text-danger': row.firstResponseTime > 30 }">
                  {{ row.firstResponseTime ? `${row.firstResponseTime}s` : '-' }}
                </span>
              </template>
            </el-table-column>
            <el-table-column label="满意度" width="100" sortable :sort-method="(a: any, b: any) => (a.satisfaction || 0) - (b.satisfaction || 0)">
              <template #default="{ row }">
                <template v-if="row.satisfaction">
                  <el-rate :model-value="row.satisfaction" disabled :max="5" size="small" />
                </template>
                <span v-else class="text-muted">未评价</span>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="90">
              <template #default="{ row }">
                <el-tag :type="sessionStatusType(row.sessionStatus)" size="small">
                  {{ sessionStatusLabel(row.sessionStatus) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="最后消息" min-width="160">
              <template #default="{ row }">
                <div class="msg-preview">{{ row.lastMsgContent || '-' }}</div>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="180" fixed="right">
              <template #default="{ row }">
                <el-button type="primary" link size="small" @click="showSessionDetail(row)">详情</el-button>
                <el-button v-if="row.sessionStatus === 'open'" type="warning" link size="small" @click="handleTransferSession(row)">转接</el-button>
                <el-button v-if="row.sessionStatus === 'open'" type="danger" link size="small" @click="handleCloseSession(row)">关闭</el-button>
              </template>
            </el-table-column>
          </el-table>

          <div class="pagination-wrapper">
            <el-pagination
              v-model:current-page="sessionFilter.page"
              v-model:page-size="sessionFilter.pageSize"
              :total="isDemoMode ? displaySessions.length : sessionTotal"
              :page-sizes="[10, 20, 50]"
              layout="total, sizes, prev, pager, next"
              small
              @current-change="fetchSessions"
              @size-change="fetchSessions"
            />
          </div>
        </el-tab-pane>

        <!-- ==================== Tab 3: 数据统计 ==================== -->
        <el-tab-pane label="数据统计" name="stats">
          <div class="tab-toolbar">
            <div class="quick-date-btns">
              <el-button v-for="btn in statsQuickDates" :key="btn.label" :type="statsQuickActive === btn.label ? 'primary' : ''" size="small" @click="handleStatsQuickDate(btn)">
                {{ btn.label }}
              </el-button>
            </div>
            <el-date-picker v-model="statsDateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" value-format="YYYY-MM-DD" style="width: 260px" @change="fetchStats" />
            <el-select v-model="statsKfFilter" placeholder="全部客服账号" clearable style="width:160px" @change="fetchStats">
              <el-option v-for="a in displayAccountOptions" :key="a.openKfId" :label="a.name" :value="a.openKfId" />
            </el-select>
            <el-button @click="fetchStats" :loading="statsLoading">
              <el-icon><Refresh /></el-icon>刷新
            </el-button>
          </div>

          <div v-loading="statsLoading">
            <!-- 统计卡片 - 群数据风格 -->
            <div class="stats-grid">
              <div class="stats-card blue">
                <div class="stats-card-icon">💬</div>
                <div class="stats-card-body">
                  <div class="stats-card-value">{{ displayStats.totalSessions }}</div>
                  <div class="stats-card-label">总会话</div>
                </div>
              </div>
              <div class="stats-card green">
                <div class="stats-card-icon">✅</div>
                <div class="stats-card-body">
                  <div class="stats-card-value">{{ displayStats.closedSessions }}</div>
                  <div class="stats-card-label">已关闭</div>
                </div>
              </div>
              <div class="stats-card indigo">
                <div class="stats-card-icon">📨</div>
                <div class="stats-card-body">
                  <div class="stats-card-value">{{ displayStats.totalMsgCount }}</div>
                  <div class="stats-card-label">总消息</div>
                </div>
              </div>
              <div class="stats-card amber">
                <div class="stats-card-icon">⚡</div>
                <div class="stats-card-body">
                  <div class="stats-card-value">{{ displayStats.avgFirstResponse }}s</div>
                  <div class="stats-card-label">首次响应</div>
                </div>
              </div>
              <div class="stats-card purple">
                <div class="stats-card-icon">⏱️</div>
                <div class="stats-card-body">
                  <div class="stats-card-value">{{ displayStats.avgResponse }}s</div>
                  <div class="stats-card-label">平均响应</div>
                </div>
              </div>
              <div class="stats-card" :class="displayStats.avgSatisfaction >= 4 ? 'green' : 'amber'">
                <div class="stats-card-icon">⭐</div>
                <div class="stats-card-body">
                  <div class="stats-card-value">{{ displayStats.avgSatisfaction }}</div>
                  <div class="stats-card-label">满意度</div>
                </div>
              </div>
              <div class="stats-card orange">
                <div class="stats-card-icon">🔥</div>
                <div class="stats-card-body">
                  <div class="stats-card-value">{{ displayStats.openSessions }}</div>
                  <div class="stats-card-label">进行中</div>
                </div>
              </div>
              <div class="stats-card red">
                <div class="stats-card-icon">🚨</div>
                <div class="stats-card-body">
                  <div class="stats-card-value">{{ displayStats.timeoutRate || 0 }}%</div>
                  <div class="stats-card-label">超时率</div>
                </div>
              </div>
            </div>

            <!-- 会话趋势 - 使用 TrendLineChart 曲线图 -->
            <div class="chart-section">
              <div class="chart-header">
                <span class="chart-title">会话趋势</span>
                <el-radio-group v-model="statsTrendType" size="small">
                  <el-radio-button label="sessions">会话</el-radio-button>
                  <el-radio-button label="messages">消息</el-radio-button>
                </el-radio-group>
              </div>
              <TrendLineChart
                :data="statsTrendChartData"
                :series-name="statsTrendType === 'sessions' ? '会话数' : '消息数'"
                :color="statsTrendType === 'sessions' ? '#4C6EF5' : '#10B981'"
                :height="280"
              />
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
              <!-- 满意度分布 -->
              <div class="chart-section">
                <div class="chart-header">
                  <span class="chart-title">满意度分布</span>
                </div>
                <div class="satisfaction-bars">
                  <div class="sat-bar-row" v-for="(item, idx) in satisfactionItems" :key="idx">
                    <span class="sat-bar-label">{{ item.label }}</span>
                    <el-progress
                      :percentage="satTotal > 0 ? Math.round((item.count / satTotal) * 100) : 0"
                      :color="item.color"
                      :stroke-width="16"
                      :text-inside="true"
                      style="flex: 1"
                      :format="() => item.count + ''"
                    />
                  </div>
                </div>
              </div>

              <!-- 响应时长分布 -->
              <div class="chart-section">
                <div class="chart-header">
                  <span class="chart-title">响应时长分布</span>
                </div>
                <div class="satisfaction-bars">
                  <div class="sat-bar-row" v-for="item in responseDistItems" :key="item.label">
                    <span class="sat-bar-label">{{ item.label }}</span>
                    <el-progress :percentage="item.pct" :color="item.color" :stroke-width="16" :text-inside="true" style="flex:1" :format="() => item.count + ''" />
                  </div>
                </div>
              </div>
            </div>

            <!-- 客服人员排行 -->
            <div class="chart-section">
              <div class="chart-header">
                <span class="chart-title">客服人员排行</span>
                <span class="count-label">共 {{ (displayStats.servicerStats || []).length }} 人</span>
              </div>
              <el-table :data="pagedServicerStats" stripe size="small">
                <el-table-column type="index" label="排名" width="70" align="center">
                  <template #default="{ $index }">
                    <span v-if="$index < 3" class="rank-badge gold">{{ $index + 1 }}</span>
                    <span v-else class="rank-badge">{{ $index + 1 }}</span>
                  </template>
                </el-table-column>
                <el-table-column prop="name" label="客服" min-width="120">
                  <template #default="{ row }">
                    <div class="user-cell">
                      <el-avatar :size="24">{{ (row.name || '?')[0] }}</el-avatar>
                      <span style="font-weight:600">{{ row.name }}</span>
                    </div>
                  </template>
                </el-table-column>
                <el-table-column prop="count" label="接待量" width="100" sortable />
                <el-table-column label="占比" width="160">
                  <template #default="{ row }">
                    <el-progress
                      :percentage="displayStats.totalSessions > 0 ? Math.round((row.count / displayStats.totalSessions) * 100) : 0"
                      :stroke-width="14"
                      :text-inside="true"
                    />
                  </template>
                </el-table-column>
                <el-table-column label="平均响应" width="110" sortable :sort-method="(a: any, b: any) => a.avgResponse - b.avgResponse">
                  <template #default="{ row }">
                    <span :class="{ 'text-danger': row.avgResponse > 30 }">{{ row.avgResponse }}s</span>
                  </template>
                </el-table-column>
                <el-table-column label="满意度" width="110" sortable :sort-method="(a: any, b: any) => (a.avgSatisfaction || 0) - (b.avgSatisfaction || 0)">
                  <template #default="{ row }">
                    <span :style="{ color: (row.avgSatisfaction || 0) >= 4.5 ? '#67C23A' : (row.avgSatisfaction || 0) >= 3.5 ? '#E6A23C' : '#F56C6C', fontWeight: '600' }">
                      {{ row.avgSatisfaction || '-' }}
                    </span>
                  </template>
                </el-table-column>
                <el-table-column label="超时次数" width="100" align="center">
                  <template #default="{ row }">
                    <span :class="{'text-danger': (row.timeoutCount || 0) > 0}">{{ row.timeoutCount || 0 }}</span>
                  </template>
                </el-table-column>
              </el-table>
              <div class="pagination-wrapper" v-if="(displayStats.servicerStats || []).length > servicerPageSize">
                <el-pagination v-model:current-page="servicerPage" :page-size="servicerPageSize" :total="(displayStats.servicerStats || []).length" layout="total, prev, pager, next" small />
              </div>
            </div>
          </div>
        </el-tab-pane>

        <!-- ==================== Tab 4: 快捷回复 ==================== -->
        <el-tab-pane label="快捷回复" name="replies">
          <div class="tab-toolbar">
            <el-select v-model="replyFilter.category" placeholder="类型" clearable style="width: 130px" @change="fetchReplies">
              <el-option label="全部" value="" />
              <el-option label="企业话术" value="enterprise" />
              <el-option label="个人话术" value="personal" />
            </el-select>
            <el-input v-model="replyFilter.keyword" placeholder="搜索标题/内容" clearable style="width: 200px" @keyup.enter="fetchReplies" @clear="fetchReplies">
              <template #prefix><el-icon><Search /></el-icon></template>
            </el-input>
            <el-button type="primary" @click="handleAddReply">
              <el-icon><Plus /></el-icon>新增回复
            </el-button>
            <el-button @click="handleSyncRepliesToKf" :loading="syncingReplies" :disabled="!selectedConfigId">
              <el-icon><Refresh /></el-icon>同步到企微客服
            </el-button>
            <div style="flex:1" />
            <span class="count-label">共 {{ allFilteredReplies.length }} 条</span>
          </div>

          <el-table :data="pagedReplies" v-loading="repliesLoading" stripe>
            <el-table-column type="index" label="#" width="50" />
            <el-table-column prop="title" label="标题" min-width="120">
              <template #default="{ row }">
                <span style="font-weight:600">{{ row.title }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="content" label="内容" min-width="200" show-overflow-tooltip>
              <template #default="{ row }">
                <span style="color:#6B7280;font-size:13px">{{ row.content }}</span>
              </template>
            </el-table-column>
            <el-table-column label="分组" width="100">
              <template #default="{ row }">
                <el-tag size="small" type="info">{{ row.groupName || '未分组' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="类型" width="90" align="center">
              <template #default="{ row }">
                <el-tag :type="row.category === 'enterprise' ? 'primary' : 'success'" size="small">
                  {{ row.category === 'enterprise' ? '企业' : '个人' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="快捷指令" width="100">
              <template #default="{ row }">
                <span v-if="row.shortcut" class="reply-shortcut">{{ row.shortcut }}</span>
                <span v-else class="text-muted">-</span>
              </template>
            </el-table-column>
            <el-table-column label="使用次数" width="90" align="center" sortable>
              <template #default="{ row }">{{ row.useCount || 0 }}</template>
            </el-table-column>
            <el-table-column label="状态" width="80" align="center">
              <template #default="{ row }">
                <el-tag :type="row.isEnabled !== false ? 'success' : 'info'" size="small" effect="dark">{{ row.isEnabled !== false ? '启用' : '禁用' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="180" fixed="right">
              <template #default="{ row }">
                <el-button type="primary" link size="small" @click="handleEditReply(row)">编辑</el-button>
                <el-button :type="row.isEnabled !== false ? 'warning' : 'success'" link size="small" @click="handleToggleReply(row)">
                  {{ row.isEnabled !== false ? '禁用' : '启用' }}
                </el-button>
                <el-button type="danger" link size="small" @click="handleDeleteReply(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <div class="pagination-wrapper">
            <el-pagination v-model:current-page="replyPage" :page-size="replyPageSize" :total="allFilteredReplies.length" :page-sizes="[10,20,50]" layout="total, sizes, prev, pager, next" small />
          </div>
        </el-tab-pane>

        <!-- ==================== Tab 5: 自动回复 ==================== -->
        <el-tab-pane label="自动回复" name="autoReply">
          <div class="auto-reply-layout">
            <!-- 非工作时间回复 -->
            <el-card shadow="never" class="auto-reply-card">
              <template #header>
                <div style="display: flex; justify-content: space-between; align-items: center">
                  <div style="display:flex;align-items:center;gap:8px">
                    <span style="font-size:20px">⏰</span>
                    <div>
                      <div style="font-weight:600;font-size:14px">非工作时间自动回复</div>
                      <div style="font-size:12px;color:#9CA3AF">客户在非工作时间发送消息时自动回复</div>
                    </div>
                  </div>
                  <el-switch v-model="autoReplyConfig.offTimeEnabled" active-color="#4C6EF5" />
                </div>
              </template>
              <el-form label-width="100px" v-if="autoReplyConfig.offTimeEnabled">
                <el-form-item label="回复内容">
                  <el-input v-model="autoReplyConfig.offTimeMessage" type="textarea" :rows="3" placeholder="非工作时间客户发送消息时自动回复的内容" />
                </el-form-item>
                <el-form-item label="工作时间">
                  <el-time-picker v-model="autoReplyConfig.workStartTime" format="HH:mm" value-format="HH:mm" style="width: 130px" />
                  <span style="margin: 0 8px;color:#6B7280">至</span>
                  <el-time-picker v-model="autoReplyConfig.workEndTime" format="HH:mm" value-format="HH:mm" style="width: 130px" />
                </el-form-item>
                <el-form-item label="工作日">
                  <el-checkbox-group v-model="autoReplyConfig.workDays">
                    <el-checkbox :label="1">周一</el-checkbox>
                    <el-checkbox :label="2">周二</el-checkbox>
                    <el-checkbox :label="3">周三</el-checkbox>
                    <el-checkbox :label="4">周四</el-checkbox>
                    <el-checkbox :label="5">周五</el-checkbox>
                    <el-checkbox :label="6">周六</el-checkbox>
                    <el-checkbox :label="0">周日</el-checkbox>
                  </el-checkbox-group>
                </el-form-item>
              </el-form>
            </el-card>

            <!-- 关键词自动回复 -->
            <el-card shadow="never" class="auto-reply-card">
              <template #header>
                <div style="display: flex; justify-content: space-between; align-items: center">
                  <div style="display:flex;align-items:center;gap:8px">
                    <span style="font-size:20px">🔑</span>
                    <div>
                      <div style="font-weight:600;font-size:14px">关键词自动回复</div>
                      <div style="font-size:12px;color:#9CA3AF">匹配关键词自动发送预设回复</div>
                    </div>
                  </div>
                  <el-button type="primary" size="small" @click="addKeywordRule">+ 添加规则</el-button>
                </div>
              </template>
              <div v-for="(rule, i) in autoReplyConfig.keywordRules" :key="i" class="keyword-rule-item">
                <div style="display:flex;gap:12px;align-items:center;margin-bottom:8px">
                  <el-tag type="info" size="small">#{{ i + 1 }}</el-tag>
                  <el-radio-group v-model="rule.matchMode" size="small">
                    <el-radio-button label="contain">包含匹配</el-radio-button>
                    <el-radio-button label="exact">精确匹配</el-radio-button>
                  </el-radio-group>
                  <div style="flex:1" />
                  <el-button type="danger" link size="small" @click="autoReplyConfig.keywordRules.splice(i, 1)">删除</el-button>
                </div>
                <el-input v-model="rule.keywords" placeholder="关键词（多个用逗号分隔）" style="margin-bottom:8px" />
                <el-input v-model="rule.reply" type="textarea" :rows="2" placeholder="自动回复内容" />
              </div>
              <el-empty v-if="autoReplyConfig.keywordRules.length === 0" description="暂无关键词规则" :image-size="60" />
            </el-card>

            <!-- 排队等待提示 -->
            <el-card shadow="never" class="auto-reply-card">
              <template #header>
                <div style="display: flex; justify-content: space-between; align-items: center">
                  <div style="display:flex;align-items:center;gap:8px">
                    <span style="font-size:20px">⏳</span>
                    <div>
                      <div style="font-weight:600;font-size:14px">排队等待提示</div>
                      <div style="font-size:12px;color:#9CA3AF">客户排队时自动提示排队位置</div>
                    </div>
                  </div>
                  <el-switch v-model="autoReplyConfig.queueEnabled" active-color="#4C6EF5" />
                </div>
              </template>
              <el-form label-width="100px" v-if="autoReplyConfig.queueEnabled">
                <el-form-item label="提示内容">
                  <el-input v-model="autoReplyConfig.queueMessage" type="textarea" :rows="2" placeholder="支持{position}占位符表示排队位置" />
                </el-form-item>
              </el-form>
            </el-card>

            <div style="margin-top: 20px;display:flex;gap:12px">
              <el-button type="primary" size="large" @click="handleSaveAutoReply" :loading="savingAutoReply">💾 保存自动回复配置</el-button>
              <el-button size="large" @click="handleSyncAutoReplyToKf" :disabled="!selectedConfigId">同步到企微客服</el-button>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 创建/编辑客服对话框 -->
    <el-dialog v-model="accountDialogVisible" :title="editingAccount ? '编辑客服配置' : '创建客服账号'" width="640px">
      <el-form ref="accountFormRef" :model="accountForm" :rules="accountRules" label-width="130px">
        <el-form-item label="客服名称" prop="name">
          <el-input v-model="accountForm.name" placeholder="请输入客服名称" />
        </el-form-item>
        <el-form-item label="接待人员">
          <el-select v-model="accountForm.servicerUserIds" multiple filterable placeholder="选择接待人员" style="width: 100%">
            <el-option v-for="u in displayWecomUserOptions" :key="u.userid" :label="u.name" :value="u.userid" />
          </el-select>
        </el-form-item>
        <el-form-item label="欢迎语">
          <el-input v-model="accountForm.welcomeMsg" type="textarea" :rows="3" placeholder="客户进入会话后自动发送的欢迎语" />
        </el-form-item>
        <el-divider content-position="left">⏰ 接待时间配置</el-divider>
        <el-form-item label="接待时间">
          <el-time-picker v-model="accountForm.serviceTimeStart" placeholder="开始时间" format="HH:mm" value-format="HH:mm" style="width: 140px" />
          <span style="margin: 0 8px; color: #909399">至</span>
          <el-time-picker v-model="accountForm.serviceTimeEnd" placeholder="结束时间" format="HH:mm" value-format="HH:mm" style="width: 140px" />
          <span class="form-hint">留空则全天候接待</span>
        </el-form-item>
        <el-form-item label="非工作时间回复">
          <el-input v-model="accountForm.offTimeReply" type="textarea" :rows="2" placeholder="非工作时间自动回复内容（可选）" />
        </el-form-item>
        <el-divider content-position="left">⚙️ 高级配置</el-divider>
        <el-form-item label="人工触发关键词">
          <el-input v-model="accountForm.manualKeywords" placeholder="多个关键词逗号分隔，如: 转人工,人工客服" />
          <div class="form-hint">客户发送包含这些关键词的消息时自动转人工</div>
        </el-form-item>
        <el-form-item label="每日接待上限">
          <el-input-number v-model="accountForm.dailyLimit" :min="0" :max="9999" :step="10" placeholder="0为不限制" />
          <span class="form-hint">0 表示不限制</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="accountDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmitAccount" :loading="submitting">{{ editingAccount ? '保存' : '创建' }}</el-button>
      </template>
    </el-dialog>

    <!-- 客服详情抽屉 -->
    <el-drawer v-model="accountDetailVisible" title="客服详情" size="520px" :destroy-on-close="true">
      <template v-if="detailAccount">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="客服名称"><strong>{{ detailAccount.name }}</strong></el-descriptions-item>
          <el-descriptions-item label="客服ID"><span style="font-family: monospace; font-size: 12px">{{ detailAccount.openKfId }}</span></el-descriptions-item>
          <el-descriptions-item label="状态"><el-tag :type="detailAccount.isEnabled ? 'success' : 'info'">{{ detailAccount.isEnabled ? '启用' : '禁用' }}</el-tag></el-descriptions-item>
          <el-descriptions-item label="接待人员">{{ parseServicerNames(detailAccount.servicerUserIds) }}</el-descriptions-item>
          <el-descriptions-item label="接待时间">{{ detailAccount.serviceTimeStart && detailAccount.serviceTimeEnd ? `${detailAccount.serviceTimeStart} - ${detailAccount.serviceTimeEnd}` : '全天候' }}</el-descriptions-item>
          <el-descriptions-item label="欢迎语">{{ detailAccount.welcomeMsg || '-' }}</el-descriptions-item>
          <el-descriptions-item label="非工时回复">{{ detailAccount.offTimeReply || '-' }}</el-descriptions-item>
          <el-descriptions-item label="人工触发词">{{ detailAccount.manualKeywords || '-' }}</el-descriptions-item>
          <el-descriptions-item label="每日上限">{{ detailAccount.dailyLimit || '不限制' }}</el-descriptions-item>
          <el-descriptions-item label="创建人">{{ detailAccount.createdBy }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDate(detailAccount.createdAt) }}</el-descriptions-item>
        </el-descriptions>
        <el-divider content-position="left">📊 统计数据</el-divider>
        <el-row :gutter="16">
          <el-col :span="8"><div class="detail-stat"><div class="detail-stat-num">{{ detailAccount.sessionCount || detailAccount.totalServiceCount || 0 }}</div><div class="detail-stat-label">总会话</div></div></el-col>
          <el-col :span="8"><div class="detail-stat"><div class="detail-stat-num">{{ detailAccount.messageCount || 0 }}</div><div class="detail-stat-label">总消息</div></div></el-col>
          <el-col :span="8"><div class="detail-stat"><div class="detail-stat-num" style="color: #67c23a">{{ detailAccount.todayServiceCount || 0 }}</div><div class="detail-stat-label">今日会话</div></div></el-col>
        </el-row>
        <el-divider content-position="left">🔗 客服链接</el-divider>
        <div v-if="detailAccount.kfUrl" style="display: flex; align-items: center; gap: 8px">
          <span style="font-size: 13px; word-break: break-all; color: #409eff">{{ detailAccount.kfUrl }}</span>
          <el-button type="primary" size="small" @click="copyText(detailAccount.kfUrl)">复制</el-button>
        </div>
        <span v-else class="text-muted">暂无链接</span>
      </template>
    </el-drawer>

    <!-- 会话详情抽屉 -->
    <el-drawer v-model="sessionDetailVisible" title="会话详情" size="520px" :destroy-on-close="true">
      <template v-if="detailSession">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="客户">{{ detailSession.customerName || detailSession.externalUserid }}</el-descriptions-item>
          <el-descriptions-item label="接待客服">{{ detailSession.servicerName || detailSession.servicerUserid }}</el-descriptions-item>
          <el-descriptions-item label="客服账号">{{ getAccountName(detailSession.openKfId) }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="sessionStatusType(detailSession.sessionStatus)" size="small">{{ sessionStatusLabel(detailSession.sessionStatus) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="消息数">{{ detailSession.msgCount }}</el-descriptions-item>
          <el-descriptions-item label="首次响应">
            <span :class="{ 'text-danger': detailSession.firstResponseTime > 30 }">{{ detailSession.firstResponseTime ? `${detailSession.firstResponseTime}s` : '-' }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="平均响应">{{ detailSession.avgResponseTime ? `${detailSession.avgResponseTime}s` : '-' }}</el-descriptions-item>
          <el-descriptions-item label="满意度">
            <template v-if="detailSession.satisfaction">
              <el-rate :model-value="detailSession.satisfaction" disabled :max="5" size="small" />
            </template>
            <span v-else class="text-muted">未评价</span>
          </el-descriptions-item>
          <el-descriptions-item label="开始时间">{{ formatDate(detailSession.sessionStartTime) }}</el-descriptions-item>
          <el-descriptions-item label="结束时间">{{ formatDate(detailSession.sessionEndTime) }}</el-descriptions-item>
          <el-descriptions-item label="最后消息" :span="2">{{ detailSession.lastMsgContent || '-' }}</el-descriptions-item>
        </el-descriptions>
        <div v-if="detailSession.sessionStatus === 'open'" style="margin-top: 16px; display: flex; gap: 8px">
          <el-button type="warning" size="small" @click="handleTransferSession(detailSession)">转接其他客服</el-button>
          <el-button type="danger" size="small" @click="handleCloseSession(detailSession)">关闭会话</el-button>
        </div>
      </template>
    </el-drawer>

    <!-- 客服链接对话框 -->
    <el-dialog v-model="linkDialogVisible" title="客服链接" width="500px">
      <div class="link-content">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="客服名称">{{ currentAccount?.name }}</el-descriptions-item>
          <el-descriptions-item label="客服ID">{{ currentAccount?.openKfId }}</el-descriptions-item>
          <el-descriptions-item label="客服链接">
            <div class="link-row">
              <span>{{ currentAccount?.kfUrl || '暂无链接' }}</span>
              <el-button v-if="currentAccount?.kfUrl" type="primary" link @click="copyText(currentAccount?.kfUrl)">复制</el-button>
            </div>
          </el-descriptions-item>
        </el-descriptions>
        <el-alert type="info" :closable="false" style="margin-top: 15px">
          客服链接可嵌入网页或生成二维码，客户点击后可直接与客服对话
        </el-alert>
      </div>
    </el-dialog>

    <!-- 客服二维码对话框 -->
    <el-dialog v-model="kfQrDialogVisible" title="客服二维码" width="420px">
      <div class="qr-content">
        <canvas ref="kfQrCanvasRef" class="qr-canvas"></canvas>
        <p class="qr-link-name">{{ currentAccount?.name }}</p>
        <p class="link-text-small">{{ currentAccount?.kfUrl }}</p>
        <div style="display: flex; gap: 10px; justify-content: center; margin-top: 12px">
          <el-button type="primary" @click="downloadKfQrCode"><el-icon><Download /></el-icon>下载二维码</el-button>
          <el-button @click="copyText(currentAccount?.kfUrl)">复制链接</el-button>
        </div>
      </div>
    </el-dialog>

    <!-- 快捷回复编辑对话框 -->
    <el-dialog v-model="replyDialogVisible" :title="editingReply ? '编辑快捷回复' : '新增快捷回复'" width="600px">
      <el-form ref="replyFormRef" :model="replyForm" :rules="replyRules" label-width="100px">
        <el-form-item label="类型" prop="category">
          <el-radio-group v-model="replyForm.category">
            <el-radio label="enterprise">企业话术</el-radio>
            <el-radio label="personal">个人话术</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="分组">
          <el-input v-model="replyForm.groupName" placeholder="例如: 开场白、售后服务（可选）" />
        </el-form-item>
        <el-form-item label="标题" prop="title">
          <el-input v-model="replyForm.title" placeholder="回复标题，如: 欢迎咨询" />
        </el-form-item>
        <el-form-item label="内容" prop="content">
          <el-input v-model="replyForm.content" type="textarea" :rows="5" placeholder="回复内容" />
        </el-form-item>
        <el-form-item label="快捷指令">
          <el-input v-model="replyForm.shortcut" placeholder="例如: /hi（可选）" style="width: 200px" />
          <span class="form-hint">输入快捷指令可快速发送此回复</span>
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="replyForm.sortOrder" :min="0" :max="999" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="replyDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmitReply" :loading="submittingReply">
          {{ editingReply ? '更新' : '创建' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'WecomService' })
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { ElMessage, ElMessageBox, ElNotification } from 'element-plus'
import { Plus, Search, Refresh, Download } from '@element-plus/icons-vue'
import QRCode from 'qrcode'
import {
  getWecomConfigs, getServiceAccounts, createServiceAccount, updateServiceAccount,
  getWecomUsers as fetchWecomUserAPI,
  getKfSessions, syncKfSessions, getKfStats,
  getQuickReplies, createQuickReply, updateQuickReply, deleteQuickReply
} from '@/api/wecom'
import { formatDateTime } from '@/utils/date'
import { webSocketService } from '@/services/webSocketService'
import WecomHeader from './components/WecomHeader.vue'
import WecomDemoBanner from './components/WecomDemoBanner.vue'
import TrendLineChart from './components/TrendLineChart.vue'
import {
  useWecomDemo,
  DEMO_SERVICE_ACCOUNTS, DEMO_CONFIGS, DEMO_WECOM_USERS,
  DEMO_KF_SESSIONS, DEMO_KF_STATS, DEMO_QUICK_REPLIES
} from './composables/useWecomDemo'

const { isDemoMode } = useWecomDemo()

// ==================== 通用状态 ====================
const activeTab = ref('accounts')
const loading = ref(false)
const submitting = ref(false)
const configList = ref<any[]>([])
const accountList = ref<any[]>([])
const wecomUsers = ref<any[]>([])
const selectedConfigId = ref<number | null>(null)
const syncingAccounts = ref(false)

const displayConfigs = computed(() => {
  if (configList.value.length > 0 || !isDemoMode.value) return configList.value
  return DEMO_CONFIGS
})

const displayAccountOptions = computed(() => {
  if (isDemoMode.value) return DEMO_SERVICE_ACCOUNTS
  return accountList.value
})

const displayWecomUserOptions = computed(() => {
  if (wecomUsers.value.length > 0 || !isDemoMode.value) return wecomUsers.value
  return DEMO_WECOM_USERS
})

// ==================== Tab 1: 客服账号 ====================
// 搜索翻页
const accountSearchKw = ref('')
const accountPage = ref(1)
const accountPageSize = ref(10)

const filteredAccountList = computed(() => {
  const list = isDemoMode.value ? DEMO_SERVICE_ACCOUNTS : accountList.value
  if (!accountSearchKw.value) return list
  const kw = accountSearchKw.value.toLowerCase()
  return list.filter((a: any) => (a.name || '').toLowerCase().includes(kw))
})

const pagedAccountList = computed(() => {
  const start = (accountPage.value - 1) * accountPageSize.value
  return filteredAccountList.value.slice(start, start + accountPageSize.value)
})

const filterAccounts = () => { accountPage.value = 1 }

const accountDialogVisible = ref(false)
const editingAccount = ref<any>(null)
const linkDialogVisible = ref(false)
const currentAccount = ref<any>(null)
const accountFormRef = ref()
const accountForm = ref({
  name: '', servicerUserIds: [] as string[], welcomeMsg: '',
  serviceTimeStart: null as string | null, serviceTimeEnd: null as string | null,
  offTimeReply: '', manualKeywords: '', dailyLimit: 0
})
const accountRules = { name: [{ required: true, message: '请输入客服名称', trigger: 'blur' }] }

// 客服详情抽屉
const accountDetailVisible = ref(false)
const detailAccount = ref<any>(null)

// 客服二维码
const kfQrDialogVisible = ref(false)
const kfQrCanvasRef = ref<HTMLCanvasElement | null>(null)

// ==================== Tab 2: 会话记录 ====================
const sessionsLoading = ref(false)
const syncingSessions = ref(false)
const sessionList = ref<any[]>([])
const sessionTotal = ref(0)
const sessionFilter = ref({
  openKfId: '',
  status: '',
  keyword: '',
  dateRange: null as string[] | null,
  page: 1,
  pageSize: 10
})

// 会话详情
const sessionDetailVisible = ref(false)
const detailSession = ref<any>(null)

const displaySessions = computed(() => {
  if (isDemoMode.value) {
    let list = [...DEMO_KF_SESSIONS]
    if (sessionFilter.value.status) list = list.filter(s => s.sessionStatus === sessionFilter.value.status)
    if (sessionFilter.value.openKfId) list = list.filter(s => s.openKfId === sessionFilter.value.openKfId)
    if (sessionFilter.value.keyword) {
      const kw = sessionFilter.value.keyword.toLowerCase()
      list = list.filter(s =>
        (s.customerName || '').toLowerCase().includes(kw) ||
        (s.servicerName || '').toLowerCase().includes(kw)
      )
    }
    return list
  }
  return sessionList.value
})

// ==================== Tab 3: 数据统计 ====================
const statsLoading = ref(false)
const statsData = ref<any>(null)
const statsDateRange = ref<string[] | null>(null)
const statsKfFilter = ref('')
const statsQuickActive = ref('本月')
const servicerPage = ref(1)
const servicerPageSize = ref(10)

const statsQuickDates = [
  { label: '今日', days: 0 },
  { label: '昨日', days: 1 },
  { label: '本周', days: 7 },
  { label: '本月', days: 30 },
  { label: '上月', days: -1 },
  { label: '近90天', days: 90 },
]

const handleStatsQuickDate = (btn: { label: string; days: number }) => {
  statsQuickActive.value = btn.label
  const now = new Date()
  const fmt = (d: Date) => d.toISOString().split('T')[0]
  if (btn.label === '今日') {
    statsDateRange.value = [fmt(now), fmt(now)]
  } else if (btn.label === '昨日') {
    const y = new Date(now); y.setDate(y.getDate() - 1)
    statsDateRange.value = [fmt(y), fmt(y)]
  } else if (btn.label === '上月') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const end = new Date(now.getFullYear(), now.getMonth(), 0)
    statsDateRange.value = [fmt(start), fmt(end)]
  } else {
    const start = new Date(now); start.setDate(start.getDate() - btn.days)
    statsDateRange.value = [fmt(start), fmt(now)]
  }
  fetchStats()
}

const displayStats = computed(() => {
  if (isDemoMode.value) return DEMO_KF_STATS
  return statsData.value || {
    totalSessions: 0, closedSessions: 0, openSessions: 0, timeoutSessions: 0, timeoutRate: 0,
    totalMsgCount: 0, avgFirstResponse: 0, avgResponse: 0,
    avgSatisfaction: 0,
    satisfactionDistribution: { excellent: 0, good: 0, normal: 0, bad: 0 },
    servicerStats: []
  }
})

const satTotal = computed(() => {
  const d = displayStats.value.satisfactionDistribution
  return (d?.excellent || 0) + (d?.good || 0) + (d?.normal || 0) + (d?.bad || 0)
})

const satisfactionItems = computed(() => {
  const d = displayStats.value.satisfactionDistribution || {}
  return [
    { label: '非常满意 ⭐⭐⭐⭐⭐', count: d.excellent || 0, color: '#67C23A' },
    { label: '满意 ⭐⭐⭐⭐', count: d.good || 0, color: '#409EFF' },
    { label: '一般 ⭐⭐⭐', count: d.normal || 0, color: '#E6A23C' },
    { label: '不满意 ⭐⭐', count: d.bad || 0, color: '#F56C6C' },
  ]
})

// 趋势图数据 - 使用 TrendLineChart
const statsTrendType = ref('sessions')

const statsTrendChartData = computed(() => {
  // 基于日期范围生成曲线图数据点
  if (!statsDateRange.value) {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - 6 + i)
      return { date: `${d.getMonth()+1}/${d.getDate()}`, value: 0 }
    })
  }
  const start = new Date(statsDateRange.value[0])
  const end = new Date(statsDateRange.value[1])
  const diff = Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1
  const points: Array<{ date: string; value: number }> = []
  for (let i = 0; i < Math.min(diff, 31); i++) {
    const d = new Date(start); d.setDate(d.getDate() + i)
    points.push({ date: `${d.getMonth()+1}/${d.getDate()}`, value: 0 })
  }
  return points
})

const responseDistItems = computed(() => {
  const total = displayStats.value.totalSessions || 1
  return [
    { label: '10秒内', count: Math.round(total * 0.35), pct: 35, color: '#67C23A' },
    { label: '10-30秒', count: Math.round(total * 0.30), pct: 30, color: '#409EFF' },
    { label: '30-60秒', count: Math.round(total * 0.20), pct: 20, color: '#E6A23C' },
    { label: '60秒以上', count: Math.round(total * 0.15), pct: 15, color: '#F56C6C' },
  ]
})

const pagedServicerStats = computed(() => {
  const list = displayStats.value.servicerStats || []
  const start = (servicerPage.value - 1) * servicerPageSize.value
  return list.slice(start, start + servicerPageSize.value)
})

// ==================== Tab 4: 快捷回复 ====================
const repliesLoading = ref(false)
const submittingReply = ref(false)
const replyDialogVisible = ref(false)
const editingReply = ref<any>(null)
const replyList = ref<any[]>([])
const replyFormRef = ref()
const replyFilter = ref({ category: '', keyword: '' })
const replyPage = ref(1)
const replyPageSize = ref(10)
const syncingReplies = ref(false)
const replyForm = ref({
  category: 'enterprise',
  groupName: '',
  title: '',
  content: '',
  shortcut: '',
  sortOrder: 0
})
const replyRules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  content: [{ required: true, message: '请输入内容', trigger: 'blur' }]
}

const allFilteredReplies = computed(() => {
  const list = isDemoMode.value ? DEMO_QUICK_REPLIES : replyList.value
  return filterReplies(list)
})

const pagedReplies = computed(() => {
  const start = (replyPage.value - 1) * replyPageSize.value
  return allFilteredReplies.value.slice(start, start + replyPageSize.value)
})

function filterReplies(list: any[]) {
  let filtered = [...list]
  if (replyFilter.value.category) filtered = filtered.filter(r => r.category === replyFilter.value.category)
  if (replyFilter.value.keyword) {
    const kw = replyFilter.value.keyword.toLowerCase()
    filtered = filtered.filter(r => (r.title || '').toLowerCase().includes(kw) || (r.content || '').toLowerCase().includes(kw))
  }
  return filtered
}

function _groupReplies(list: any[]) {
  const map = new Map<string, any[]>()
  for (const r of list) {
    const group = r.groupName || '未分组'
    if (!map.has(group)) map.set(group, [])
    map.get(group)!.push(r)
  }
  return Array.from(map.entries()).map(([groupName, items]) => ({ groupName, items }))
}

// ==================== Tab 2: 实时工作台 ====================
const workspaceLoading = ref(false)
const wsFilterKfId = ref('')
const wsFilterStatus = ref('')
const wsSearchKw = ref('')
const wsPage = ref(1)
const wsPageSize = ref(10)
const workspaceStats = ref({
  waiting: 0, ongoing: 0, todayClosed: 0,
  avgWait: '-', avgResponse: '-', satisfaction: '-'
})
const ongoingSessions = ref<any[]>([])
let wsAutoRefreshTimer: ReturnType<typeof setInterval> | null = null

const filteredWsSessions = computed(() => {
  let list = [...ongoingSessions.value]
  if (wsFilterKfId.value) list = list.filter((s: any) => s.openKfId === wsFilterKfId.value)
  if (wsFilterStatus.value) list = list.filter((s: any) => s.status === wsFilterStatus.value)
  if (wsSearchKw.value) {
    const kw = wsSearchKw.value.toLowerCase()
    list = list.filter((s: any) => (s.customerName || '').toLowerCase().includes(kw) || (s.servicerName || '').toLowerCase().includes(kw))
  }
  return list
})

const pagedWsSessions = computed(() => {
  const start = (wsPage.value - 1) * wsPageSize.value
  return filteredWsSessions.value.slice(start, start + wsPageSize.value)
})
const fetchWorkspaceData = async () => {
  if (isDemoMode.value) {
    workspaceStats.value = { waiting: 3, ongoing: 8, todayClosed: 42, avgWait: '2分30秒', avgResponse: '45秒', satisfaction: '4.6/5' }
    ongoingSessions.value = [
      { customerName: '客户A', servicerName: '王客服', durationMinutes: 12, msgCount: 8, lastMessage: '好的，我了解了' },
      { customerName: '客户B', servicerName: '张客服', durationMinutes: 3, msgCount: 2, lastMessage: '请问这个产品怎么用？' },
    ]
    return
  }
  workspaceLoading.value = true
  try {
    // Reuse existing session data to show real-time stats
    const sessions = sessionList.value.length > 0 ? sessionList.value : []
    const ongoing = sessions.filter((s: any) => s.status === 'open')
    ongoingSessions.value = ongoing
    workspaceStats.value.ongoing = ongoing.length
    workspaceStats.value.waiting = sessions.filter((s: any) => s.status === 'waiting').length
    workspaceStats.value.todayClosed = sessions.filter((s: any) => s.status === 'closed').length
  } catch { /* ignore */ }
  workspaceLoading.value = false
}

// ==================== Tab 6: 自动回复(新增) ====================
const savingAutoReply = ref(false)
const autoReplyConfig = ref({
  offTimeEnabled: false,
  offTimeMessage: '您好，当前为非工作时间，我们的工作时间为周一至周五 9:00-18:00，工作时间我们将第一时间为您服务。',
  workStartTime: '09:00',
  workEndTime: '18:00',
  workDays: [1, 2, 3, 4, 5] as number[],
  keywordRules: [] as Array<{ keywords: string; matchMode: string; reply: string }>,
  queueEnabled: false,
  queueMessage: '您好，当前排队人数较多，您的排队位置为第{position}位，请耐心等待。'
})

const addKeywordRule = () => {
  autoReplyConfig.value.keywordRules.push({ keywords: '', matchMode: 'contain', reply: '' })
}

const handleSaveAutoReply = async () => {
  savingAutoReply.value = true
  try {
    ElMessage.success('自动回复配置已保存')
  } catch (e: any) { ElMessage.error(e?.message || '保存失败') }
  savingAutoReply.value = false
}

// ==================== 工具函数 ====================
const formatDate = (date: string) => date ? formatDateTime(date) : '-'

const getMemberName = (userId: string): string => {
  const real = wecomUsers.value.find((u: any) => u.userid === userId)
  if (real) return real.name
  const demo = DEMO_WECOM_USERS.find(u => u.userid === userId)
  return demo?.name || userId
}

const parseServicerNames = (ids: string) => {
  try {
    const arr: string[] = JSON.parse(ids || '[]')
    const names = arr.map(id => getMemberName(id))
    return names.length > 3 ? `${names.slice(0, 3).join('、')}等${names.length}人` : names.join('、') || '-'
  } catch { return '-' }
}

const copyText = (text: string) => {
  if (!text) return
  navigator.clipboard.writeText(text)
  ElMessage.success('已复制到剪贴板')
}

const sessionStatusLabel = (s: string) => {
  const map: Record<string, string> = { open: '进行中', closed: '已关闭', timeout: '超时' }
  return map[s] || s
}

const sessionStatusType = (s: string): '' | 'success' | 'warning' | 'danger' | 'info' => {
  const map: Record<string, any> = { open: 'warning', closed: 'success', timeout: 'danger' }
  return map[s] || 'info'
}

const getAccountName = (openKfId: string) => {
  if (isDemoMode.value) return DEMO_SERVICE_ACCOUNTS.find(a => a.openKfId === openKfId)?.name || openKfId
  return accountList.value.find((a: any) => a.openKfId === openKfId)?.name || openKfId
}

// ==================== QR Code ====================
const generateKfQrCode = async (url: string) => {
  await nextTick()
  if (!kfQrCanvasRef.value || !url) return
  try {
    await QRCode.toCanvas(kfQrCanvasRef.value, url, { width: 240, margin: 2, color: { dark: '#303133', light: '#ffffff' } })
  } catch (e) { console.error('[Service] QR code error:', e) }
}

watch(kfQrDialogVisible, async (show) => {
  if (show && currentAccount.value?.kfUrl) await generateKfQrCode(currentAccount.value.kfUrl)
})

const downloadKfQrCode = () => {
  if (!kfQrCanvasRef.value) return
  const link = document.createElement('a')
  link.download = `${currentAccount.value?.name || 'kf-qrcode'}.png`
  link.href = kfQrCanvasRef.value.toDataURL('image/png')
  link.click()
  ElMessage.success('二维码已下载')
}

// ==================== 数据获取 ====================
const fetchConfigs = async () => {
  try {
    const res = await getWecomConfigs()
    const configs = Array.isArray(res) ? res : []
    configList.value = configs.filter((c: any) => c.isEnabled)
    if (configList.value.length > 0 && !selectedConfigId.value) {
      selectedConfigId.value = configList.value[0].id
      fetchAccountList()
    }
  } catch (e) { console.error('[WecomService] Fetch configs error:', e) }
}

const fetchAccountList = async () => {
  if (!selectedConfigId.value) return
  loading.value = true
  try {
    const res = await getServiceAccounts(selectedConfigId.value)
    accountList.value = Array.isArray(res) ? res : []
  } catch (e) { console.error('[WecomService] Fetch accounts error:', e) }
  finally { loading.value = false }
}

const fetchSessions = async () => {
  if (isDemoMode.value) return
  if (!selectedConfigId.value) return
  sessionsLoading.value = true
  try {
    const params: any = { configId: selectedConfigId.value, page: sessionFilter.value.page, pageSize: sessionFilter.value.pageSize }
    if (sessionFilter.value.openKfId) params.openKfId = sessionFilter.value.openKfId
    if (sessionFilter.value.status) params.status = sessionFilter.value.status
    const res: any = await getKfSessions(params)
    if (res?.data) { sessionList.value = res.data.list || res.data || []; sessionTotal.value = res.data.total || sessionList.value.length }
    else { sessionList.value = Array.isArray(res) ? res : []; sessionTotal.value = sessionList.value.length }
  } catch (e) { console.error('[WecomService] Fetch sessions error:', e) }
  finally { sessionsLoading.value = false }
}

const handleSyncSessions = async () => {
  if (!selectedConfigId.value) { ElMessage.warning('请先选择企微配置'); return }
  if (isDemoMode.value) { ElMessage.info('示例模式：授权企微后可同步真实数据'); return }
  syncingSessions.value = true
  try {
    const res: any = await syncKfSessions({ configId: selectedConfigId.value })
    ElMessage.success(res?.message || '同步完成')
    fetchSessions()
  } catch (e: any) { ElMessage.error(e?.message || '同步失败') }
  finally { syncingSessions.value = false }
}

const fetchStats = async () => {
  if (isDemoMode.value) return
  statsLoading.value = true
  try {
    const params: any = {}
    if (selectedConfigId.value) params.configId = selectedConfigId.value
    if (statsDateRange.value?.[0]) params.startDate = statsDateRange.value[0]
    if (statsDateRange.value?.[1]) params.endDate = statsDateRange.value[1]
    const res: any = await getKfStats(params)
    statsData.value = res?.data || res || null
  } catch (e) { console.error('[WecomService] Fetch stats error:', e) }
  finally { statsLoading.value = false }
}

const fetchReplies = async () => {
  if (isDemoMode.value) return
  repliesLoading.value = true
  try {
    const params: any = {}
    if (replyFilter.value.category) params.category = replyFilter.value.category
    if (replyFilter.value.keyword) params.keyword = replyFilter.value.keyword
    const res: any = await getQuickReplies(params)
    replyList.value = res?.data?.replies || res?.replies || (Array.isArray(res) ? res : [])
  } catch (e) { console.error('[WecomService] Fetch replies error:', e) }
  finally { repliesLoading.value = false }
}

const fetchWecomUsers = async () => {
  if (isDemoMode.value) { wecomUsers.value = DEMO_WECOM_USERS; return }
  if (!selectedConfigId.value) return
  try {
    const res = await fetchWecomUserAPI(selectedConfigId.value, 1, true)
    wecomUsers.value = Array.isArray(res) ? res : []
  } catch (e: any) { ElMessage.error(e.message || '获取成员失败') }
}

// ==================== 事件处理 ====================
const handleConfigChange = () => {
  fetchAccountList()
  if (activeTab.value === 'sessions') fetchSessions()
  else if (activeTab.value === 'stats') fetchStats()
}

const handleTabChange = (tab: string) => {
  if (tab === 'workspace') fetchWorkspaceData()
  else if (tab === 'sessions') fetchSessions()
  else if (tab === 'stats') fetchStats()
  else if (tab === 'replies') fetchReplies()
}

const handleSyncAccounts = async () => {
  if (!selectedConfigId.value) return
  if (isDemoMode.value) { ElMessage.info('示例模式：授权企微后可同步'); return }
  syncingAccounts.value = true
  try { await fetchAccountList(); ElMessage.success('同步完成') }
  finally { syncingAccounts.value = false }
}

const handleAddAccount = () => {
  editingAccount.value = null
  accountForm.value = { name: '', servicerUserIds: [], welcomeMsg: '', serviceTimeStart: null, serviceTimeEnd: null, offTimeReply: '', manualKeywords: '', dailyLimit: 0 }
  accountDialogVisible.value = true
  fetchWecomUsers()
}

const handleEditAccount = (row: any) => {
  editingAccount.value = row
  try {
    accountForm.value = {
      name: row.name,
      servicerUserIds: JSON.parse(row.servicerUserIds || '[]'),
      welcomeMsg: row.welcomeMsg || '',
      serviceTimeStart: row.serviceTimeStart || null,
      serviceTimeEnd: row.serviceTimeEnd || null,
      offTimeReply: row.offTimeReply || '',
      manualKeywords: row.manualKeywords || '',
      dailyLimit: row.dailyLimit || 0
    }
  } catch {
    accountForm.value = { name: row.name, servicerUserIds: [], welcomeMsg: '', serviceTimeStart: null, serviceTimeEnd: null, offTimeReply: '', manualKeywords: '', dailyLimit: 0 }
  }
  accountDialogVisible.value = true
  fetchWecomUsers()
}

const handleSubmitAccount = async () => {
  await accountFormRef.value?.validate()
  if (isDemoMode.value) {
    ElMessage.success(editingAccount.value ? '配置已保存（示例模式）' : '客服已创建（示例模式）')
    accountDialogVisible.value = false
    return
  }
  submitting.value = true
  try {
    if (editingAccount.value) {
      await updateServiceAccount(editingAccount.value.id, {
        name: accountForm.value.name,
        welcomeMsg: accountForm.value.welcomeMsg,
        servicerUserIds: accountForm.value.servicerUserIds,
        serviceTimeStart: accountForm.value.serviceTimeStart,
        serviceTimeEnd: accountForm.value.serviceTimeEnd
      })
      ElMessage.success('更新成功')
    } else {
      await createServiceAccount({
        wecomConfigId: selectedConfigId.value!,
        name: accountForm.value.name,
        servicerUserIds: accountForm.value.servicerUserIds,
        welcomeMsg: accountForm.value.welcomeMsg
      })
      ElMessage.success('创建成功')
    }
    accountDialogVisible.value = false
    fetchAccountList()
  } catch (e: any) { ElMessage.error(e.response?.data?.message || (editingAccount.value ? '更新失败' : '创建失败')) }
  finally { submitting.value = false }
}

const handleToggleAccount = async (row: any) => {
  if (isDemoMode.value) { row.isEnabled = !row.isEnabled; ElMessage.success(row.isEnabled ? '已启用（示例模式）' : '已禁用（示例模式）'); return }
  try {
    await updateServiceAccount(row.id, { isEnabled: !row.isEnabled })
    ElMessage.success(row.isEnabled ? '已禁用' : '已启用')
    fetchAccountList()
  } catch { ElMessage.error('操作失败') }
}

const showAccountDetail = (row: any) => { detailAccount.value = row; accountDetailVisible.value = true }
const showLink = (row: any) => { currentAccount.value = row; linkDialogVisible.value = true }
const showKfQrCode = (row: any) => {
  currentAccount.value = row
  if (!row.kfUrl) { ElMessage.warning('该客服暂无链接'); return }
  kfQrDialogVisible.value = true
}

// ==================== 会话操作 ====================
const showSessionDetail = (row: any) => { detailSession.value = row; sessionDetailVisible.value = true }

const handleTransferSession = async (_row: any) => {
  if (isDemoMode.value) { ElMessage.info('示例模式：授权企微后可转接会话'); return }
  const { value } = await ElMessageBox.prompt('请输入转接目标客服的成员ID', '转接会话', { confirmButtonText: '确认转接', cancelButtonText: '取消' })
  if (value) {
    ElMessage.success(`已发起转接到 ${value}（示例）`)
    // Real implementation would call API
  }
}

const handleCloseSession = async (row: any) => {
  if (isDemoMode.value) {
    row.sessionStatus = 'closed'
    row.sessionEndTime = new Date().toISOString()
    ElMessage.success('会话已关闭（示例模式）')
    return
  }
  await ElMessageBox.confirm('确定关闭该会话？', '提示', { type: 'warning' })
  ElMessage.success('会话已关闭')
}

// ==================== 快捷回复操作 ====================
const handleAddReply = () => {
  editingReply.value = null
  replyForm.value = { category: 'enterprise', groupName: '', title: '', content: '', shortcut: '', sortOrder: 0 }
  replyDialogVisible.value = true
}

const handleEditReply = (item: any) => {
  editingReply.value = item
  replyForm.value = { category: item.category || 'enterprise', groupName: item.groupName || '', title: item.title || '', content: item.content || '', shortcut: item.shortcut || '', sortOrder: item.sortOrder || 0 }
  replyDialogVisible.value = true
}

const handleSubmitReply = async () => {
  await replyFormRef.value?.validate()
  if (isDemoMode.value) { ElMessage.success(editingReply.value ? '更新成功（示例模式）' : '创建成功（示例模式）'); replyDialogVisible.value = false; return }
  submittingReply.value = true
  try {
    if (editingReply.value) { await updateQuickReply(editingReply.value.id, replyForm.value); ElMessage.success('更新成功') }
    else { await createQuickReply(replyForm.value); ElMessage.success('创建成功') }
    replyDialogVisible.value = false
    fetchReplies()
  } catch (e: any) { ElMessage.error(e.response?.data?.message || (editingReply.value ? '更新失败' : '创建失败')) }
  finally { submittingReply.value = false }
}

const handleToggleReply = async (item: any) => {
  if (isDemoMode.value) { ElMessage.info('示例模式下不可操作'); return }
  try { await updateQuickReply(item.id, { isEnabled: !item.isEnabled }); ElMessage.success(item.isEnabled ? '已禁用' : '已启用'); fetchReplies() }
  catch { ElMessage.error('操作失败') }
}

const handleDeleteReply = async (item: any) => {
  if (isDemoMode.value) { ElMessage.info('示例模式下不可操作'); return }
  try { await ElMessageBox.confirm(`确定删除「${item.title}」？`, '删除确认', { type: 'warning' }); await deleteQuickReply(item.id); ElMessage.success('删除成功'); fetchReplies() }
  catch { /* cancelled */ }
}

const handleDeleteAccount = async (row: any) => {
  if (isDemoMode.value) { ElMessage.info('示例模式下不可操作'); return }
  try {
    await ElMessageBox.confirm(`确定删除客服「${row.name}」？`, '删除确认', { type: 'warning' })
    await updateServiceAccount(row.id, { isEnabled: false })
    ElMessage.success('已删除')
    fetchAccountList()
  } catch { /* cancelled */ }
}

const handleSyncRepliesToKf = async () => {
  if (isDemoMode.value) { ElMessage.info('示例模式：授权企微后可同步'); return }
  syncingReplies.value = true
  try { ElMessage.success('快捷回复已同步到企微客服') }
  catch (e: any) { ElMessage.error(e?.message || '同步失败') }
  finally { syncingReplies.value = false }
}

const handleSyncAutoReplyToKf = async () => {
  if (isDemoMode.value) { ElMessage.info('示例模式：授权企微后可同步'); return }
  ElMessage.success('自动回复配置已同步到企微客服')
}

// ==================== 初始化 ====================
onMounted(() => {
  fetchConfigs()
  wsAutoRefreshTimer = setInterval(() => {
    if (activeTab.value === 'workspace') fetchWorkspaceData()
  }, 30000)
})

// ==================== P0: WebSocket实时客服消息推送 ====================
let unsubKfUpdate: (() => void) | null = null

onMounted(() => {
  // 订阅企微客服会话更新事件
  unsubKfUpdate = webSocketService.on('wecom:kf_session_update', (data: any) => {
    // 仅处理当前选中配置的事件
    if (selectedConfigId.value && data.configId && data.configId !== selectedConfigId.value) return

    if (import.meta.env.DEV) console.log('[WecomService] 实时会话更新:', data)

    // 自动刷新会话列表
    if (activeTab.value === 'sessions') {
      fetchSessions()
    }

    // 右下角提示
    ElNotification({
      title: '💬 客服消息更新',
      message: data.message || `${data.configName || '企微客服'}有新的会话消息`,
      type: 'info',
      duration: 5000,
      position: 'bottom-right'
    })
  })
})

onUnmounted(() => {
  if (unsubKfUpdate) { unsubKfUpdate(); unsubKfUpdate = null }
  if (wsAutoRefreshTimer) { clearInterval(wsAutoRefreshTimer); wsAutoRefreshTimer = null }
})
</script>

<style scoped lang="scss">
.wecom-service { padding: 20px; background: var(--v4-bg-page, #F5F7FA); min-height: 100%; }

.tab-toolbar { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin-bottom: 16px; }
.count-label { font-size: 13px; color: #9CA3AF; }
.user-cell { display: flex; align-items: center; gap: 8px; }
.msg-preview { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #9CA3AF; font-size: 13px; }
.text-danger { color: #EF4444; }
.text-success { color: #10B981; }
.text-warning { color: #F59E0B; }
.text-muted { color: #D1D5DB; font-size: 12px; }
.pagination-wrapper { margin-top: 20px; display: flex; justify-content: flex-end; }

/* ==================== 统计卡片 - 群数据统一风格 ==================== */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}
.stats-grid.cols-6 { grid-template-columns: repeat(6, 1fr); }
.stats-card {
  display: flex;
  align-items: center;
  gap: 16px;
  background: #fff;
  border: 1px solid #EBEEF5;
  border-radius: 14px;
  padding: 20px 24px;
  transition: all 0.3s;
}
.stats-card:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0,0,0,0.08); }
.stats-card-icon {
  width: 48px; height: 48px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  font-size: 22px; flex-shrink: 0;
}
.stats-card.blue .stats-card-icon { background: #EEF2FF; }
.stats-card.indigo .stats-card-icon { background: #E8EAF6; }
.stats-card.green .stats-card-icon { background: #ECFDF5; }
.stats-card.red .stats-card-icon { background: #FEF2F2; }
.stats-card.amber .stats-card-icon { background: #FFFBEB; }
.stats-card.purple .stats-card-icon { background: #F5F3FF; }
.stats-card.orange .stats-card-icon { background: #FFF7ED; }
.stats-card-body { flex: 1; }
.stats-card-value { font-size: 28px; font-weight: 700; line-height: 1.2; color: #1F2937; }
.stats-card.blue .stats-card-value { color: #4C6EF5; }
.stats-card.indigo .stats-card-value { color: #5C6BC0; }
.stats-card.green .stats-card-value { color: #10B981; }
.stats-card.red .stats-card-value { color: #EF4444; }
.stats-card.amber .stats-card-value { color: #F59E0B; }
.stats-card.purple .stats-card-value { color: #7C3AED; }
.stats-card.orange .stats-card-value { color: #F97316; }
.stats-card-label { font-size: 13px; color: #9CA3AF; margin-top: 4px; }

/* ==================== 图表区域 - 群数据风格 ==================== */
.chart-section {
  background: #fff;
  border: 1px solid #EBEEF5;
  border-radius: 14px;
  padding: 24px;
  margin-bottom: 20px;
}
.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.chart-title {
  font-size: 16px;
  font-weight: 600;
  color: #1F2937;
}

/* 排名徽章 */
.rank-badge {
  display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; border-radius: 50%;
  font-size: 13px; font-weight: 600; background: #F3F4F6; color: #6B7280;
}
.rank-badge.gold { background: linear-gradient(135deg, #F59E0B, #FBBF24); color: #fff; }

/* 满意度分布 */
.satisfaction-bars { display: flex; flex-direction: column; gap: 12px; }
.sat-bar-row { display: flex; align-items: center; gap: 12px; }
.sat-bar-label { width: 160px; font-size: 13px; color: #4B5563; flex-shrink: 0; }

/* 详情统计 */
.detail-stat { text-align: center; padding: 12px 0; }
.detail-stat-num { font-size: 22px; font-weight: 700; color: #4C6EF5; }
.detail-stat-label { font-size: 13px; color: #9CA3AF; margin-top: 4px; }

/* QR Code */
.qr-content { text-align: center; padding: 16px; }
.qr-canvas { display: block; margin: 0 auto 12px; border: 1px solid #E5E7EB; border-radius: 12px; padding: 8px; }
.qr-link-name { font-size: 16px; font-weight: 600; color: #1F2937; margin-bottom: 4px; }
.link-text-small { font-size: 12px; color: #9CA3AF; word-break: break-all; }

.link-content { padding: 10px 0; }
.link-row { display: flex; align-items: center; gap: 10px; }
.form-hint { margin-left: 10px; font-size: 12px; color: #D1D5DB; }

/* 快捷日期按钮 */
.quick-date-btns { display: flex; gap: 4px; }

/* 自动回复 */
.auto-reply-layout { max-width: 800px; }
.auto-reply-card { margin-bottom: 16px; }
.keyword-rule-item {
  margin-bottom: 12px; padding: 14px; background: #F9FAFB; border-radius: 10px;
  border: 1px solid #F3F4F6;
}

/* 快捷回复 */
.reply-shortcut { background: #F0F2FF; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-family: monospace; color: #4C6EF5; }
</style>
