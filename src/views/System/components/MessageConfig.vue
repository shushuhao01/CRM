<template>
  <div class="notification-config">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h3>通知配置管理</h3>
        <p>配置各种通知方式的部门和成员设置，管理通知渠道的可用性</p>
      </div>
      <div class="header-right">
        <el-button type="warning" @click="showPerformanceDialog">
          <el-icon><DataAnalysis /></el-icon>
          业绩消息配置
        </el-button>
        <el-button type="primary" @click="showCreateDialog">
          <el-icon><Plus /></el-icon>
          新增普通配置
        </el-button>
      </div>
    </div>

    <!-- 筛选区域 -->
    <div class="filter-section">
      <el-form inline>
        <el-form-item label="通知方式">
          <el-select v-model="filters.channelType" placeholder="全部" clearable style="width: 160px;">
            <el-option
              v-for="type in channelTypes"
              :key="type.value"
              :label="type.label"
              :value="type.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="部门">
          <el-select v-model="filters.departmentId" placeholder="全部" clearable style="width: 160px;">
            <el-option
              v-for="dept in departments"
              :key="dept.id"
              :label="dept.name"
              :value="dept.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.status" placeholder="全部" clearable style="width: 120px;">
            <el-option label="启用" value="enabled" />
            <el-option label="禁用" value="disabled" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadChannels">搜索</el-button>
          <el-button @click="resetFilters">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 业绩消息配置卡片 -->
    <div v-if="performanceConfigs.length > 0" class="channel-list performance-list">
      <div
        v-for="config in performanceConfigs"
        :key="config.id"
        class="channel-card performance-card"
        :class="{ 'is-disabled': !config.isEnabled }"
      >
        <div class="card-header">
          <div class="channel-info">
            <div class="channel-icon icon-performance">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
              </svg>
            </div>
            <div class="channel-meta">
              <h4>{{ config.name }}</h4>
              <span class="channel-type">
                {{ config.channelType === 'dingtalk' ? '钉钉' : '企业微信' }} ·
                {{ config.sendFrequency === 'daily' ? '每天' : config.sendFrequency === 'weekly' ? '每周' : '每月' }}
                {{ config.sendTime }} 发送
              </span>
            </div>
          </div>
          <el-switch
            v-model="config.isEnabled"
            @change="togglePerformanceStatus(config)"
          />
        </div>
        <div class="card-body">
          <div class="info-row">
            <span class="info-label">报表类型</span>
            <div class="info-value">
              <el-tag v-for="type in (config.reportTypes || []).slice(0, 3)" :key="type" size="small" style="margin-right: 4px;">
                {{ getReportTypeLabel(type) }}
              </el-tag>
              <el-tag v-if="(config.reportTypes || []).length > 3" size="small" type="info">
                +{{ (config.reportTypes || []).length - 3 }}
              </el-tag>
            </div>
          </div>
          <div class="info-row">
            <span class="info-label">上次发送</span>
            <div class="info-value">
              <span v-if="config.lastSentAt" class="last-sent-time">{{ formatDate(config.lastSentAt) }}</span>
              <span v-else class="no-sent-yet">暂未发送</span>
              <el-tag v-if="config.lastSentStatus" :type="config.lastSentStatus === 'success' ? 'success' : 'danger'" size="small" style="margin-left: 8px;">
                {{ config.lastSentStatus === 'success' ? '成功' : '失败' }}
              </el-tag>
            </div>
          </div>
          <div class="info-row">
            <span class="info-label">视角范围</span>
            <div class="info-value">
              <el-tag size="small" type="info">
                {{ config.viewScope === 'company' ? '全公司' : '部门视角' }}
              </el-tag>
            </div>
          </div>
        </div>
        <div class="card-footer">
          <span class="create-info">{{ config.createdByName }} · {{ formatDate(config.createdAt) }}</span>
          <div class="action-buttons">
            <el-button type="primary" link size="small" @click="testPerformanceReport(config)" :loading="config.testLoading">
              <el-icon><Connection /></el-icon>
              测试发送
            </el-button>
            <el-button type="primary" link size="small" @click="editPerformanceConfig(config)">
              <el-icon><Edit /></el-icon>
              编辑
            </el-button>
            <el-button type="danger" link size="small" @click="deletePerformanceConfig(config)">
              <el-icon><Delete /></el-icon>
              删除
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 通知渠道卡片列表 -->
    <div class="channel-list" v-loading="loading">
      <div
        v-for="channel in filteredChannels"
        :key="channel.id"
        class="channel-card"
        :class="{ 'is-disabled': !channel.isEnabled }"
      >
        <!-- 卡片头部 -->
        <div class="card-header">
          <div class="channel-info">
            <div class="channel-icon" :class="`icon-${channel.channelType}`">
              <!-- 钉钉图标 -->
              <svg v-if="channel.channelType === 'dingtalk'" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.03-1.99 1.27-5.62 3.72-.53.36-1.01.54-1.44.53-.47-.01-1.38-.27-2.06-.49-.83-.27-1.49-.42-1.43-.88.03-.24.37-.49 1.02-.74 3.98-1.73 6.64-2.87 7.97-3.43 3.8-1.57 4.59-1.85 5.1-1.86.11 0 .37.03.53.17.14.12.18.28.2.45-.01.06.01.24 0 .38z"/>
              </svg>
              <!-- 企业微信图标 -->
              <svg v-else-if="channel.channelType === 'wechat_work'" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 00.167-.054l1.903-1.114a.864.864 0 01.717-.098 10.16 10.16 0 002.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178A1.17 1.17 0 014.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178 1.17 1.17 0 01-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 01.598.082l1.584.926a.272.272 0 00.14.045c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 01-.023-.156.49.49 0 01.201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89c-.135-.01-.269-.03-.406-.03zm-2.53 3.274c.535 0 .969.44.969.982a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.542.434-.982.969-.982z"/>
              </svg>
              <!-- 微信公众号图标 -->
              <svg v-else-if="channel.channelType === 'wechat_mp'" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-2-9c.55 0 1-.45 1-1s-.45-1-1-1-1 .45-1 1 .45 1 1 1zm4 0c.55 0 1-.45 1-1s-.45-1-1-1-1 .45-1 1 .45 1 1 1zm-2 5.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/>
              </svg>
              <!-- 邮件图标 -->
              <svg v-else-if="channel.channelType === 'email'" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
              </svg>
              <!-- 短信图标 -->
              <svg v-else-if="channel.channelType === 'sms'" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14zm-4.2-5.78v1.75l3.2-2.99L12.8 9v1.7c-3.11.43-4.35 2.56-4.8 4.7 1.11-1.5 2.58-2.18 4.8-2.18z"/>
              </svg>
              <!-- 系统通知图标 -->
              <svg v-else viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
              </svg>
            </div>
            <div class="channel-meta">
              <h4>{{ channel.name }}</h4>
              <span class="channel-type">{{ getChannelLabel(channel.channelType) }}</span>
            </div>
          </div>
          <el-switch
            v-model="channel.isEnabled"
            @change="toggleChannelStatus(channel)"
            :loading="channel.statusLoading"
          />
        </div>

        <!-- 卡片内容 -->
        <div class="card-body">
          <!-- 支持部门 -->
          <div class="info-row">
            <span class="info-label">支持部门</span>
            <div class="info-value">
              <el-select
                v-model="channel.targetDepartments"
                multiple
                collapse-tags
                collapse-tags-tooltip
                placeholder="选择支持的部门"
                size="small"
                style="width: 100%"
                @change="updateChannelDepartments(channel)"
              >
                <el-option
                  v-for="dept in departments"
                  :key="dept.id"
                  :label="dept.name"
                  :value="dept.id"
                />
              </el-select>
            </div>
          </div>

          <!-- 通知成员 -->
          <div class="info-row">
            <span class="info-label">通知成员</span>
            <div class="info-value">
              <template v-if="channel.channelType === 'system'">
                <el-tag type="success" size="small">
                  <el-icon><User /></el-icon>
                  全员通知
                </el-tag>
              </template>
              <template v-else>
                <el-button
                  type="primary"
                  size="small"
                  plain
                  @click="showMemberSelector(channel)"
                >
                  选择成员 ({{ (channel.targetUsers || []).length }}人)
                </el-button>
                <div v-if="(channel.targetUsers || []).length > 0" class="member-tags">
                  <el-tag
                    v-for="userId in (channel.targetUsers || []).slice(0, 2)"
                    :key="userId"
                    size="small"
                    closable
                    @close="removeMember(channel, userId)"
                  >
                    {{ getMemberName(userId) }}
                  </el-tag>
                  <el-tag v-if="(channel.targetUsers || []).length > 2" size="small" type="info">
                    +{{ (channel.targetUsers || []).length - 2 }}
                  </el-tag>
                </div>
              </template>
            </div>
          </div>

          <!-- 配置参数 -->
          <div class="info-row">
            <span class="info-label">配置参数</span>
            <div class="info-value config-actions">
              <el-button type="primary" link size="small" @click="showConfigDialog(channel)">
                <el-icon><Setting /></el-icon>
                配置参数
              </el-button>
              <el-tag :type="isConfigComplete(channel) ? 'success' : 'warning'" size="small">
                {{ isConfigComplete(channel) ? '已配置' : '待配置' }}
              </el-tag>
            </div>
          </div>
        </div>

        <!-- 卡片底部 -->
        <div class="card-footer">
          <span class="create-info">{{ channel.createdByName }} · {{ formatDate(channel.createdAt) }}</span>
          <div class="action-buttons">
            <el-button type="primary" link size="small" @click="testChannel(channel)" :loading="channel.testLoading">
              <el-icon><Connection /></el-icon>
              测试
            </el-button>
            <el-button type="primary" link size="small" @click="editChannel(channel)">
              <el-icon><Edit /></el-icon>
              编辑
            </el-button>
            <el-button type="danger" link size="small" @click="deleteChannel(channel)">
              <el-icon><Delete /></el-icon>
              删除
            </el-button>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <el-empty v-if="filteredChannels.length === 0 && !loading" description="暂无通知配置">
        <el-button type="primary" @click="showCreateDialog">创建第一个配置</el-button>
      </el-empty>
    </div>

    <!-- 分页 -->
    <div v-if="pagination.total > pagination.pageSize" class="pagination-wrapper">
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :total="pagination.total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        @size-change="loadChannels"
        @current-change="loadChannels"
      />
    </div>

    <!-- 新建/编辑配置弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑通知配置' : '新建通知配置'"
      width="700px"
      :close-on-click-modal="false"
    >
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="100px">
        <el-form-item label="配置名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入配置名称" />
        </el-form-item>

        <el-form-item label="通知方式" prop="channelType">
          <el-select v-model="form.channelType" placeholder="选择通知方式" style="width: 100%" :disabled="isEdit">
            <el-option
              v-for="type in channelTypes"
              :key="type.value"
              :label="type.label"
              :value="type.value"
            >
              <div class="channel-option">
                <span class="channel-dot" :style="{ background: type.color }"></span>
                <span>{{ type.label }}</span>
                <span class="channel-desc">{{ type.description }}</span>
              </div>
            </el-option>
          </el-select>
        </el-form-item>

        <!-- 消息类型选择 -->
        <el-form-item label="消息类型" prop="messageTypes">
          <div class="message-types-section">
            <!-- 主要消息类型（始终显示） -->
            <div class="message-types-main">
              <el-checkbox-group v-model="form.messageTypes">
                <el-checkbox
                  v-for="type in primaryMessageTypes"
                  :key="type.value"
                  :label="type.value"
                >
                  {{ type.label }}
                </el-checkbox>
              </el-checkbox-group>
            </div>
            <!-- 更多消息类型（折叠） -->
            <div v-if="otherMessageTypes && otherMessageTypes.length > 0" class="message-types-more">
              <div class="more-divider" @click="toggleMessageTypesExpand">
                <span class="divider-line"></span>
                <span class="divider-text">
                  <el-icon :class="{ 'is-expanded': messageTypesExpanded.includes('more') }"><ArrowDown /></el-icon>
                  更多消息类型
                </span>
                <span class="divider-line"></span>
              </div>
              <div v-show="messageTypesExpanded.includes('more')" class="message-types-grid">
                <template v-for="category in messageTypeCategories" :key="category?.name || 'unknown'">
                  <div v-if="category && category.types" class="message-category">
                    <div class="category-title">{{ category.name }}</div>
                    <el-checkbox-group v-model="form.messageTypes">
                      <template v-for="type in category.types" :key="type?.value || Math.random()">
                        <el-checkbox v-if="type && type.value" :label="type.value">
                          {{ type.label }}
                        </el-checkbox>
                      </template>
                    </el-checkbox-group>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </el-form-item>

        <!-- 动态配置参数 -->
        <template v-if="currentChannelConfig">
          <el-divider content-position="left">{{ getChannelLabel(form.channelType) }}配置</el-divider>
          <el-form-item
            v-for="field in currentChannelConfig.configFields"
            :key="field.key"
            :label="field.label"
            :prop="`config.${field.key}`"
            :rules="field.required ? [{ required: true, message: `请输入${field.label}` }] : []"
          >
            <template v-if="field.type === 'text'">
              <el-input v-model="form.config[field.key]" :placeholder="field.placeholder" />
            </template>
            <template v-else-if="field.type === 'password'">
              <el-input v-model="form.config[field.key]" type="password" show-password :placeholder="field.placeholder" />
            </template>
            <template v-else-if="field.type === 'number'">
              <el-input-number v-model="form.config[field.key]" :placeholder="field.placeholder" style="width: 100%" />
            </template>
            <template v-else-if="field.type === 'boolean'">
              <el-switch v-model="form.config[field.key]" />
            </template>
            <template v-else-if="field.type === 'select'">
              <el-select v-model="form.config[field.key]" style="width: 100%">
                <el-option
                  v-for="opt in field.options"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>
            </template>
          </el-form-item>
        </template>

        <!-- 通知对象 -->
        <el-divider content-position="left">通知对象</el-divider>
        <el-form-item label="通知范围">
          <el-radio-group v-model="form.targetType">
            <el-radio label="all">所有人</el-radio>
            <el-radio label="departments">指定部门</el-radio>
            <el-radio label="users">指定用户</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item v-if="form.targetType === 'departments'" label="选择部门">
          <el-select v-model="form.targetDepartments" multiple placeholder="选择部门" style="width: 100%">
            <el-option
              v-for="dept in departments"
              :key="dept.id"
              :label="dept.name"
              :value="dept.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item v-if="form.targetType === 'users'" label="选择用户">
          <el-select v-model="form.targetUsers" multiple filterable placeholder="选择用户" style="width: 100%">
            <el-option
              v-for="user in users"
              :key="user.id"
              :label="(user as any).realName || (user as any).name || user.id"
              :value="user.id"
            />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveChannel" :loading="saving">
          {{ isEdit ? '更新' : '创建' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 成员选择弹窗 -->
    <el-dialog v-model="memberDialogVisible" title="选择通知成员" width="600px">
      <el-transfer
        v-model="selectedMemberIds"
        :data="transferMembers"
        :titles="['可选成员', '已选成员']"
        filterable
        filter-placeholder="搜索成员"
      />
      <template #footer>
        <el-button @click="memberDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmMemberSelection">确定</el-button>
      </template>
    </el-dialog>

    <!-- 业绩消息配置弹窗 -->
    <el-dialog v-model="performanceDialogVisible" :title="isEditPerformance ? '编辑业绩消息配置' : '新建业绩消息配置'" width="800px" :close-on-click-modal="false">
      <el-form ref="performanceFormRef" :model="performanceForm" :rules="performanceRules" label-width="100px">
        <el-form-item label="配置名称" prop="name">
          <el-input v-model="performanceForm.name" placeholder="如：每日业绩汇报" />
        </el-form-item>

        <el-divider content-position="left">发送时间</el-divider>

        <el-form-item label="发送频率" prop="sendFrequency">
          <el-radio-group v-model="performanceForm.sendFrequency">
            <el-radio label="daily">每天</el-radio>
            <el-radio label="weekly">每周</el-radio>
            <el-radio label="monthly">每月</el-radio>
            <el-radio label="custom">自定义</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item v-if="performanceForm.sendFrequency === 'weekly'" label="选择周几">
          <el-checkbox-group v-model="performanceForm.sendDays">
            <el-checkbox :label="1">周一</el-checkbox>
            <el-checkbox :label="2">周二</el-checkbox>
            <el-checkbox :label="3">周三</el-checkbox>
            <el-checkbox :label="4">周四</el-checkbox>
            <el-checkbox :label="5">周五</el-checkbox>
            <el-checkbox :label="6">周六</el-checkbox>
            <el-checkbox :label="7">周日</el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <el-form-item v-if="performanceForm.sendFrequency === 'monthly'" label="选择日期">
          <el-select v-model="performanceForm.sendDays" multiple placeholder="选择每月几号" style="width: 100%">
            <el-option v-for="d in 31" :key="d" :label="`${d}号`" :value="d" />
          </el-select>
        </el-form-item>

        <el-form-item label="发送时间" prop="sendTime">
          <el-time-select v-model="performanceForm.sendTime" start="06:00" step="00:30" end="12:00" placeholder="选择时间" />
          <span style="margin-left: 12px; color: #909399; font-size: 12px;">次日发送前一天数据</span>
        </el-form-item>

        <el-form-item label="重复类型">
          <el-radio-group v-model="performanceForm.repeatType">
            <el-radio label="everyday">每天</el-radio>
            <el-radio label="workday">仅工作日</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-divider content-position="left">业绩类型</el-divider>

        <el-form-item label="报表数据" prop="reportTypes">
          <div class="report-types-section">
            <!-- 主要指标（始终显示） -->
            <div class="report-types-main">
              <el-checkbox-group v-model="performanceForm.reportTypes">
                <el-checkbox
                  v-for="type in primaryReportTypes"
                  :key="type.value"
                  :label="type.value"
                >
                  {{ type.label }}
                </el-checkbox>
              </el-checkbox-group>
            </div>
            <!-- 更多指标（折叠） -->
            <div v-if="otherReportTypes && otherReportTypes.length > 0" class="report-types-more">
              <div class="more-divider" @click="toggleReportTypesExpand">
                <span class="divider-line"></span>
                <span class="divider-text">
                  <el-icon :class="{ 'is-expanded': reportTypesExpanded.includes('more') }"><ArrowDown /></el-icon>
                  更多指标
                </span>
                <span class="divider-line"></span>
              </div>
              <div v-show="reportTypesExpanded.includes('more')" class="report-types-grid">
                <template v-for="category in otherReportTypeCategories" :key="category?.name || 'unknown'">
                  <div v-if="category && category.types" class="report-category">
                    <div class="category-title">{{ category.name }}</div>
                    <el-checkbox-group v-model="performanceForm.reportTypes">
                      <template v-for="type in category.types" :key="type?.value || Math.random()">
                        <el-checkbox v-if="type && type.value" :label="type.value">
                          {{ type.label }}
                        </el-checkbox>
                      </template>
                    </el-checkbox-group>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </el-form-item>

        <el-form-item label="包含月累计">
          <el-switch v-model="performanceForm.includeMonthly" />
        </el-form-item>

        <el-form-item label="包含排名">
          <el-switch v-model="performanceForm.includeRanking" />
          <el-input-number v-if="performanceForm.includeRanking" v-model="performanceForm.rankingLimit" :min="3" :max="20" style="margin-left: 12px;" />
          <span v-if="performanceForm.includeRanking" style="margin-left: 8px; color: #909399;">名</span>
        </el-form-item>

        <el-divider content-position="left">通知方式</el-divider>

        <el-form-item label="消息格式">
          <el-radio-group v-model="performanceForm.messageFormat">
            <el-radio label="text">
              纯文本消息
              <el-tooltip content="简洁的文本格式，兼容性好" placement="top">
                <el-icon class="info-icon"><InfoFilled /></el-icon>
              </el-tooltip>
            </el-radio>
            <el-radio label="image">
              精美卡片消息
              <el-tooltip content="Markdown格式，支持标题、列表等富文本展示" placement="top">
                <el-icon class="info-icon"><InfoFilled /></el-icon>
              </el-tooltip>
            </el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="通知渠道" prop="channelType">
          <el-radio-group v-model="performanceForm.channelType">
            <el-radio label="dingtalk">钉钉群机器人</el-radio>
            <el-radio label="wechat_work">企业微信群机器人</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="Webhook" prop="webhook">
          <el-input v-model="performanceForm.webhook" placeholder="请输入Webhook地址" />
        </el-form-item>

        <el-form-item v-if="performanceForm.channelType === 'dingtalk'" label="加签密钥">
          <el-input v-model="performanceForm.secret" placeholder="可选，SEC开头的密钥" show-password />
        </el-form-item>

        <el-divider content-position="left">通知视角</el-divider>

        <el-form-item label="数据范围">
          <el-radio-group v-model="performanceForm.viewScope">
            <el-radio label="company">全公司视角</el-radio>
            <el-radio label="department">部门视角</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item v-if="performanceForm.viewScope === 'department'" label="选择部门">
          <el-select v-model="performanceForm.targetDepartments" multiple placeholder="选择部门" style="width: 100%">
            <el-option v-for="dept in departments" :key="dept.id" :label="dept.name" :value="dept.id" />
          </el-select>
        </el-form-item>

        <!-- 预览区域 -->
        <el-divider content-position="left">效果预览</el-divider>
        <div class="preview-section">
          <div class="preview-card">
            <div class="preview-title">📊 {{ performanceForm.name || '业绩日报' }}</div>
            <div class="preview-line">━━━━━━━━━━━━━━━━</div>
            <div class="preview-date">📅 {{ previewDate }}</div>
            <div class="preview-section-title">💰 当日业绩</div>
            <div v-if="performanceForm.reportTypes.includes('order_count')" class="preview-item">   订单数: {{ previewData.daily?.orderCount || 0 }} 单</div>
            <div v-if="performanceForm.reportTypes.includes('order_amount')" class="preview-item">   订单金额: ¥{{ (previewData.daily?.orderAmount || 0).toLocaleString() }}</div>
            <div v-if="performanceForm.reportTypes.includes('refund_count')" class="preview-item">   退款单数: {{ previewData.daily?.refundCount || 0 }} 单</div>
            <div v-if="performanceForm.reportTypes.includes('refund_amount')" class="preview-item">   退款金额: ¥{{ (previewData.daily?.refundAmount || 0).toLocaleString() }}</div>
            <div v-if="performanceForm.reportTypes.includes('refund_rate')" class="preview-item">   退款率: {{ previewData.daily?.refundRate || 0 }}%</div>
            <div v-if="performanceForm.reportTypes.includes('avg_order_amount')" class="preview-item">   客单价: ¥{{ (previewData.daily?.avgOrderAmount || 0).toLocaleString() }}</div>
            <template v-if="performanceForm.includeMonthly">
              <div class="preview-section-title">📈 当月累计</div>
              <div class="preview-item">   订单数: {{ previewData.monthly?.orderCount || 0 }} 单</div>
              <div class="preview-item">   订单金额: ¥{{ (previewData.monthly?.orderAmount || 0).toLocaleString() }}</div>
              <div v-if="performanceForm.reportTypes.includes('monthly_signed_count')" class="preview-item">   签收单数: {{ previewData.monthly?.signedCount || 0 }} 单</div>
              <div v-if="performanceForm.reportTypes.includes('monthly_signed_amount')" class="preview-item">   签收金额: ¥{{ (previewData.monthly?.signedAmount || 0).toLocaleString() }}</div>
              <div v-if="performanceForm.reportTypes.includes('monthly_signed_rate')" class="preview-item">   签收率: {{ previewData.monthly?.signedRate || 0 }}%</div>
              <div v-if="performanceForm.reportTypes.includes('refund_count') || performanceForm.reportTypes.includes('refund_amount')" class="preview-item">   退款单数: {{ previewData.monthly?.refundCount || 0 }} 单</div>
              <div v-if="performanceForm.reportTypes.includes('refund_count') || performanceForm.reportTypes.includes('refund_amount')" class="preview-item">   退款金额: ¥{{ (previewData.monthly?.refundAmount || 0).toLocaleString() }}</div>
              <div v-if="performanceForm.reportTypes.includes('refund_rate')" class="preview-item">   退款率: {{ previewData.monthly?.refundRate || 0 }}%</div>
              <div v-if="performanceForm.reportTypes.includes('avg_order_amount')" class="preview-item">   客单价: ¥{{ (previewData.monthly?.avgOrderAmount || 0).toLocaleString() }}</div>
            </template>
            <template v-if="performanceForm.includeRanking">
              <div class="preview-section-title">🏆 业绩排行榜</div>
              <div v-for="(item, index) in (previewData.topRanking || []).slice(0, performanceForm.rankingLimit || 10)" :key="index" class="preview-item">
                   {{ ['🥇', '🥈', '🥉'][index] || (index + 1) + '.' }} {{ item.name }}: ¥{{ (item.amount || 0).toLocaleString() }} ({{ item.orderCount || 0 }}单)
              </div>
              <div v-if="!previewData.topRanking || previewData.topRanking.length === 0" class="preview-item" style="color: #909399;">
                   暂无排名数据
              </div>
            </template>
            <div class="preview-line">━━━━━━━━━━━━━━━━</div>
            <div class="preview-footer">📱 智能销售CRM</div>
          </div>
          <el-button type="primary" link @click="loadPreviewData">
            <el-icon><Refresh /></el-icon>
            刷新预览数据
          </el-button>
        </div>
      </el-form>

      <template #footer>
        <el-button @click="performanceDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="savePerformanceConfig" :loading="savingPerformance">
          {{ isEditPerformance ? '更新' : '创建' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Plus, User, Setting, Connection, Edit, Delete, InfoFilled,
  ChatDotRound, ChatLineSquare, ChatRound, Message, Iphone, Monitor,
  DataAnalysis, Refresh, ArrowDown
} from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import { messageApi } from '@/api/message'
import { performanceReportApi } from '@/api/performanceReport'
import { useUserStore } from '@/stores/user'
import { useDepartmentStore } from '@/stores/department'
import dayjs from 'dayjs'

const userStore = useUserStore()
const departmentStore = useDepartmentStore()

// 数据
const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)

// 业绩消息配置相关
const performanceDialogVisible = ref(false)
const isEditPerformance = ref(false)
const savingPerformance = ref(false)
const performanceConfigs = ref<any[]>([])
const reportTypes = ref<any[]>([])
const previewData = ref<any>({})
const performanceFormRef = ref<FormInstance>()
const reportTypesExpanded = ref<string[]>([]) // 报表类型折叠状态
const messageTypesExpanded = ref<string[]>([]) // 消息类型折叠状态

const performanceForm = reactive({
  id: '',
  name: '',
  sendFrequency: 'daily',
  sendTime: '09:00',
  sendDays: [] as number[],
  repeatType: 'workday',
  reportTypes: ['order_count', 'order_amount', 'monthly_signed_count', 'monthly_signed_amount', 'monthly_signed_rate'],
  messageFormat: 'image',
  channelType: 'wechat_work',
  webhook: '',
  secret: '',
  viewScope: 'company',
  targetDepartments: [] as string[],
  includeMonthly: true,
  includeRanking: true,
  rankingLimit: 10
})

const performanceRules: FormRules = {
  name: [{ required: true, message: '请输入配置名称', trigger: 'blur' }],
  channelType: [{ required: true, message: '请选择通知渠道', trigger: 'change' }],
  webhook: [{ required: true, message: '请输入Webhook地址', trigger: 'blur' }],
  reportTypes: [{ required: true, message: '请选择至少一个报表类型', trigger: 'change', type: 'array', min: 1 }]
}

// 报表类型分类（保留用于兼容）
const _reportTypeCategories = computed(() => {
  if (!Array.isArray(reportTypes.value)) return []
  const categories: Record<string, any[]> = {}
  reportTypes.value.forEach((type: any) => {
    if (!type || !type.category) return
    if (!categories[type.category]) {
      categories[type.category] = []
    }
    categories[type.category].push(type)
  })
  return Object.entries(categories).map(([name, types]) => ({ name, types }))
})

// 主要报表类型（始终显示）
const primaryReportTypes = computed(() => {
  if (!Array.isArray(reportTypes.value)) return []
  return reportTypes.value.filter((t: any) => t?.primary === true)
})

// 其他报表类型（折叠显示）
const otherReportTypes = computed(() => {
  if (!Array.isArray(reportTypes.value)) return []
  return reportTypes.value.filter((t: any) => t?.primary !== true)
})

// 其他报表类型分类（用于折叠区域）
const otherReportTypeCategories = computed(() => {
  const categories: Record<string, any[]> = {}
  if (!Array.isArray(otherReportTypes.value)) return []
  otherReportTypes.value.forEach((type: any) => {
    if (!type) return
    const cat = type.category || '其他'
    if (!categories[cat]) {
      categories[cat] = []
    }
    categories[cat].push(type)
  })
  return Object.entries(categories).map(([name, types]) => ({ name, types }))
})

// 主要消息类型（始终显示）
const primaryMessageTypes = computed(() => {
  if (!Array.isArray(messageTypes.value)) return []
  return messageTypes.value.filter((t: any) => t?.primary === true)
})

// 其他消息类型（折叠显示）
const otherMessageTypes = computed(() => {
  if (!Array.isArray(messageTypes.value)) return []
  return messageTypes.value.filter((t: any) => t?.primary !== true)
})

// 消息类型分类（用于折叠区域）
const messageTypeCategories = computed(() => {
  const categories: Record<string, any[]> = {}
  if (!Array.isArray(otherMessageTypes.value)) return []
  otherMessageTypes.value.forEach((type: any) => {
    if (!type) return
    const cat = type.category || '其他'
    if (!categories[cat]) {
      categories[cat] = []
    }
    categories[cat].push(type)
  })
  return Object.entries(categories).map(([name, types]) => ({ name, types }))
})

// 切换消息类型展开/折叠
const toggleMessageTypesExpand = () => {
  if (messageTypesExpanded.value.includes('more')) {
    messageTypesExpanded.value = []
  } else {
    messageTypesExpanded.value = ['more']
  }
}

// 切换报表类型展开/折叠
const toggleReportTypesExpand = () => {
  if (reportTypesExpanded.value.includes('more')) {
    reportTypesExpanded.value = []
  } else {
    reportTypesExpanded.value = ['more']
  }
}

// 预览日期（使用北京时间）
const previewDate = computed(() => {
  const now = new Date()
  const beijingOffset = 8 * 60 * 60 * 1000
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60 * 1000)
  const beijingNow = new Date(utcTime + beijingOffset)
  const yesterday = new Date(beijingNow.getFullYear(), beijingNow.getMonth(), beijingNow.getDate() - 1)
  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return `${yesterday.getFullYear()}年${yesterday.getMonth() + 1}月${yesterday.getDate()}日 (${weekDays[yesterday.getDay()]})`
})
const memberDialogVisible = ref(false)
const isEdit = ref(false)
const channels = ref<any[]>([])
const channelTypes = ref<any[]>([])
const messageTypes = ref<any[]>([])
const currentEditChannel = ref<any>(null)
const selectedMemberIds = ref<string[]>([])

// 筛选
const filters = reactive({
  channelType: '',
  departmentId: '',
  status: ''
})

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

// 表单
const formRef = ref<FormInstance>()
const form = reactive({
  id: '',
  name: '',
  channelType: '',
  config: {} as Record<string, any>,
  messageTypes: [] as string[],
  targetType: 'all',
  targetDepartments: [] as string[],
  targetUsers: [] as string[]
})

const formRules: FormRules = {
  name: [{ required: true, message: '请输入配置名称', trigger: 'blur' }],
  channelType: [{ required: true, message: '请选择通知方式', trigger: 'change' }]
}

// 计算属性
const departments = computed(() => departmentStore.departments || [])
const users = computed(() => userStore.users?.filter((u: any) => u.status !== 'disabled') || [])

const filteredChannels = computed(() => {
  let result = [...channels.value]
  if (filters.channelType) {
    result = result.filter(c => c.channelType === filters.channelType)
  }
  if (filters.departmentId) {
    result = result.filter(c => (c.targetDepartments || []).includes(filters.departmentId))
  }
  if (filters.status) {
    const enabled = filters.status === 'enabled'
    result = result.filter(c => c.isEnabled === enabled)
  }
  return result
})

const currentChannelConfig = computed(() => {
  return channelTypes.value.find(t => t.value === form.channelType)
})

const transferMembers = computed(() => {
  return users.value.map((u: any) => ({
    key: u.id,
    label: u.realName || u.name || u.username || u.id,
    disabled: false
  }))
})

// 方法
const loadChannels = async () => {
  loading.value = true
  try {
    console.log('[MessageConfig] 开始加载通知渠道配置...')
    const res = await messageApi.getNotificationChannels() as any
    console.log('[MessageConfig] 通知渠道配置响应:', JSON.stringify(res))
    if (res && res.success) {
      const data = res.data || []
      console.log('[MessageConfig] 响应数据:', JSON.stringify(data))
      channels.value = data.map((c: any) => ({
        ...c,
        statusLoading: false,
        testLoading: false
      }))
      console.log('[MessageConfig] 加载到', channels.value.length, '个通知渠道配置')
    } else {
      console.warn('[MessageConfig] 加载通知渠道配置失败:', res?.message || '响应无效')
      channels.value = []
    }
  } catch (_error) {
    console.error('[MessageConfig] 加载通知配置异常:', _error)
    channels.value = []
  } finally {
    loading.value = false
  }
}

const loadOptions = async () => {
  try {
    const res = await messageApi.getNotificationOptions() as any
    if (res.success && res.data) {
      channelTypes.value = res.data.channelTypes || []
      messageTypes.value = res.data.messageTypes || []
    }
  } catch (_error) {
    console.error('加载配置选项失败:', _error)
  }
}

const resetFilters = () => {
  filters.channelType = ''
  filters.departmentId = ''
  filters.status = ''
}

const getChannelLabel = (type: string) => {
  const found = channelTypes.value.find(t => t.value === type)
  return found?.label || type
}

// 图标颜色和类型现在通过CSS类实现，保留这些方法用于其他地方
const _getChannelColor = (type: string) => {
  const colors: Record<string, string> = {
    system: '#722ED1',
    dingtalk: '#1890FF',
    wechat_work: '#52C41A',
    wechat_mp: '#07C160',
    email: '#FA8C16',
    sms: '#FF4D4F'
  }
  return colors[type] || '#909399'
}

const _getChannelIcon = (type: string) => {
  const icons: Record<string, any> = {
    system: Monitor,
    dingtalk: ChatDotRound,
    wechat_work: ChatLineSquare,
    wechat_mp: ChatRound,
    email: Message,
    sms: Iphone
  }
  return icons[type] || Monitor
}

const formatDate = (date: string) => {
  return date ? dayjs(date).format('YYYY-MM-DD HH:mm') : ''
}

const getMemberName = (userId: string) => {
  const user = users.value.find((u: any) => u.id === userId) as any
  return user?.realName || user?.name || user?.username || userId
}

const isConfigComplete = (channel: any) => {
  if (channel.channelType === 'system') return true
  const config = channel.config || {}
  const typeConfig = channelTypes.value.find(t => t.value === channel.channelType)
  if (!typeConfig) return false
  const requiredFields = (typeConfig.configFields || []).filter((f: any) => f.required)
  return requiredFields.every((f: any) => config[f.key])
}

const showCreateDialog = () => {
  isEdit.value = false
  resetForm()
  dialogVisible.value = true
}

const editChannel = (channel: any) => {
  isEdit.value = true
  form.id = channel.id
  form.name = channel.name
  form.channelType = channel.channelType
  form.config = { ...(channel.config || {}) }
  form.messageTypes = [...(channel.messageTypes || [])]
  form.targetType = channel.targetType || 'all'
  form.targetDepartments = [...(channel.targetDepartments || [])]
  form.targetUsers = [...(channel.targetUsers || [])]
  dialogVisible.value = true
}

const resetForm = () => {
  form.id = ''
  form.name = ''
  form.channelType = ''
  form.config = {}
  form.messageTypes = []
  form.targetType = 'all'
  form.targetDepartments = []
  form.targetUsers = []
}

const saveChannel = async () => {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
    saving.value = true

    const data = {
      name: form.name,
      channelType: form.channelType,
      config: form.config,
      messageTypes: form.messageTypes,
      targetType: form.targetType,
      targetDepartments: form.targetType === 'departments' ? form.targetDepartments : [],
      targetUsers: form.targetType === 'users' ? form.targetUsers : []
    }

    if (isEdit.value) {
      await messageApi.updateNotificationChannel(form.id, data)
      ElMessage.success('更新成功')
    } else {
      await messageApi.createNotificationChannel(data)
      ElMessage.success('创建成功')
    }

    dialogVisible.value = false
    loadChannels()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '保存失败')
    }
  } finally {
    saving.value = false
  }
}

const deleteChannel = async (channel: any) => {
  try {
    await ElMessageBox.confirm(`确定要删除"${channel.name}"吗？`, '确认删除', { type: 'warning' })
    await messageApi.deleteNotificationChannel(channel.id)
    ElMessage.success('删除成功')
    loadChannels()
  } catch (_e) {
    // 用户取消
  }
}

const toggleChannelStatus = async (channel: any) => {
  channel.statusLoading = true
  try {
    await messageApi.updateNotificationChannel(channel.id, { isEnabled: channel.isEnabled })
    ElMessage.success(channel.isEnabled ? '已启用' : '已禁用')
  } catch (_e) {
    channel.isEnabled = !channel.isEnabled
    ElMessage.error('状态更新失败')
  } finally {
    channel.statusLoading = false
  }
}

const testChannel = async (channel: any) => {
  channel.testLoading = true
  try {
    const res = await messageApi.testNotificationChannel(channel.id, '这是一条测试消息') as any
    if (res.success) {
      ElMessage.success(res.message || '测试发送成功')
    } else {
      ElMessage.error(res.message || '测试发送失败')
    }
  } catch (_e) {
    ElMessage.error('测试发送失败')
  } finally {
    channel.testLoading = false
  }
}

const updateChannelDepartments = async (channel: any) => {
  try {
    await messageApi.updateNotificationChannel(channel.id, {
      targetDepartments: channel.targetDepartments
    })
  } catch (_e) {
    ElMessage.error('更新部门失败')
  }
}

const showMemberSelector = (channel: any) => {
  currentEditChannel.value = channel
  selectedMemberIds.value = [...(channel.targetUsers || [])]
  memberDialogVisible.value = true
}

const confirmMemberSelection = async () => {
  if (!currentEditChannel.value) return
  try {
    await messageApi.updateNotificationChannel(currentEditChannel.value.id, {
      targetUsers: selectedMemberIds.value
    })
    currentEditChannel.value.targetUsers = [...selectedMemberIds.value]
    memberDialogVisible.value = false
    ElMessage.success('成员更新成功')
  } catch (_e) {
    ElMessage.error('更新成员失败')
  }
}

const removeMember = async (channel: any, userId: string) => {
  const newUsers = (channel.targetUsers || []).filter((id: string) => id !== userId)
  try {
    await messageApi.updateNotificationChannel(channel.id, { targetUsers: newUsers })
    channel.targetUsers = newUsers
  } catch (_e) {
    ElMessage.error('移除成员失败')
  }
}

const showConfigDialog = (channel: any) => {
  editChannel(channel)
}

// 监听渠道类型变化，重置配置
watch(() => form.channelType, () => {
  if (!isEdit.value) {
    form.config = {}
  }
})

// =====================================================
// 业绩消息配置相关方法
// =====================================================

const loadPerformanceConfigs = async () => {
  try {
    console.log('[MessageConfig] 开始加载业绩消息配置...')
    const res = await performanceReportApi.getConfigs() as any
    console.log('[MessageConfig] 业绩消息配置响应:', res)
    if (res.success) {
      performanceConfigs.value = (res.data || []).map((c: any) => ({
        ...c,
        testLoading: false
      }))
      console.log('[MessageConfig] 加载到', performanceConfigs.value.length, '个业绩消息配置')
    } else {
      console.warn('[MessageConfig] 加载业绩消息配置失败:', res.message)
    }
  } catch (_e) {
    console.error('[MessageConfig] 加载业绩配置异常:', _e)
  }
}

const loadReportTypes = async () => {
  try {
    const res = await performanceReportApi.getReportTypes() as any
    if (res.success) {
      reportTypes.value = res.data || []
    }
  } catch (_e) {
    console.error('加载报表类型失败:', _e)
  }
}

const loadPreviewData = async () => {
  try {
    const res = await performanceReportApi.previewReport({
      reportTypes: performanceForm.reportTypes,
      viewScope: performanceForm.viewScope,
      targetDepartments: performanceForm.targetDepartments,
      rankingLimit: performanceForm.rankingLimit || 10
    }) as any
    if (res.success) {
      previewData.value = res.data || {}
    }
  } catch (_e) {
    console.error('加载预览数据失败:', _e)
  }
}

// 监听视角和部门变化，自动刷新预览数据
watch(
  () => [performanceForm.viewScope, performanceForm.targetDepartments],
  () => {
    if (performanceDialogVisible.value) {
      loadPreviewData()
    }
  },
  { deep: true }
)

const showPerformanceDialog = () => {
  isEditPerformance.value = false
  resetPerformanceForm()
  performanceDialogVisible.value = true
  loadPreviewData()
}

const resetPerformanceForm = () => {
  performanceForm.id = ''
  performanceForm.name = ''
  performanceForm.sendFrequency = 'daily'
  performanceForm.sendTime = '09:00'
  performanceForm.sendDays = []
  performanceForm.repeatType = 'workday'
  performanceForm.reportTypes = ['order_count', 'order_amount', 'monthly_signed_count', 'monthly_signed_amount', 'monthly_signed_rate']
  performanceForm.messageFormat = 'image'
  performanceForm.channelType = 'wechat_work'
  performanceForm.webhook = ''
  performanceForm.secret = ''
  performanceForm.viewScope = 'company'
  performanceForm.targetDepartments = []
  performanceForm.includeMonthly = true
  performanceForm.includeRanking = true
  performanceForm.rankingLimit = 10
}

const editPerformanceConfig = (config: any) => {
  isEditPerformance.value = true
  performanceForm.id = config.id
  performanceForm.name = config.name
  performanceForm.sendFrequency = config.sendFrequency
  performanceForm.sendTime = config.sendTime
  performanceForm.sendDays = config.sendDays || []
  performanceForm.repeatType = config.repeatType
  performanceForm.reportTypes = config.reportTypes || []
  performanceForm.messageFormat = config.messageFormat || 'image'
  performanceForm.channelType = config.channelType
  performanceForm.webhook = config.webhook
  performanceForm.secret = config.secret || ''
  performanceForm.viewScope = config.viewScope
  performanceForm.targetDepartments = config.targetDepartments || []
  performanceForm.includeMonthly = config.includeMonthly
  performanceForm.includeRanking = config.includeRanking
  performanceForm.rankingLimit = config.rankingLimit
  performanceDialogVisible.value = true
  loadPreviewData()
}

const savePerformanceConfig = async () => {
  if (!performanceFormRef.value) return
  try {
    await performanceFormRef.value.validate()
    savingPerformance.value = true

    const data = {
      name: performanceForm.name,
      sendFrequency: performanceForm.sendFrequency,
      sendTime: performanceForm.sendTime,
      sendDays: performanceForm.sendDays,
      repeatType: performanceForm.repeatType,
      reportTypes: performanceForm.reportTypes,
      messageFormat: performanceForm.messageFormat,
      channelType: performanceForm.channelType,
      webhook: performanceForm.webhook,
      secret: performanceForm.secret || undefined,
      viewScope: performanceForm.viewScope,
      targetDepartments: performanceForm.viewScope === 'department' ? performanceForm.targetDepartments : [],
      includeMonthly: performanceForm.includeMonthly,
      includeRanking: performanceForm.includeRanking,
      rankingLimit: performanceForm.rankingLimit
    }

    if (isEditPerformance.value) {
      await performanceReportApi.updateConfig(performanceForm.id, data)
      ElMessage.success('更新成功')
    } else {
      await performanceReportApi.createConfig(data)
      ElMessage.success('创建成功')
    }

    performanceDialogVisible.value = false
    loadPerformanceConfigs()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '保存失败')
    }
  } finally {
    savingPerformance.value = false
  }
}

const deletePerformanceConfig = async (config: any) => {
  try {
    await ElMessageBox.confirm(`确定要删除"${config.name}"吗？`, '确认删除', { type: 'warning' })
    await performanceReportApi.deleteConfig(config.id)
    ElMessage.success('删除成功')
    loadPerformanceConfigs()
  } catch (_e) {
    // 用户取消
  }
}

const togglePerformanceStatus = async (config: any) => {
  try {
    await performanceReportApi.updateConfig(config.id, { isEnabled: config.isEnabled })
    ElMessage.success(config.isEnabled ? '已启用' : '已禁用')
  } catch (_e) {
    config.isEnabled = !config.isEnabled
    ElMessage.error('状态更新失败')
  }
}

const testPerformanceReport = async (config: any) => {
  config.testLoading = true
  try {
    const res = await performanceReportApi.testSend(config.id) as any
    if (res.success) {
      ElMessage.success(res.message || '测试发送成功')
      loadPerformanceConfigs() // 刷新状态
    } else {
      ElMessage.error(res.message || '测试发送失败')
    }
  } catch (_e) {
    ElMessage.error('测试发送失败')
  } finally {
    config.testLoading = false
  }
}

const getReportTypeLabel = (value: string) => {
  const found = reportTypes.value.find((t: any) => t.value === value)
  return found?.label || value
}

// 初始化
onMounted(async () => {
  console.log('[MessageConfig] 组件挂载，开始加载数据...')
  try {
    // 并行加载基础数据，每个都有独立的错误处理
    await Promise.all([
      loadOptions().catch((e: unknown) => console.error('[MessageConfig] loadOptions失败:', e)),
      loadReportTypes().catch((e: unknown) => console.error('[MessageConfig] loadReportTypes失败:', e)),
      userStore.loadUsers?.().catch((e: unknown) => console.error('[MessageConfig] loadUsers失败:', e)),
      departmentStore.fetchDepartments?.().catch((e: unknown) => console.error('[MessageConfig] fetchDepartments失败:', e))
    ])
    // 等待通知渠道和业绩配置加载完成
    await Promise.all([
      loadChannels().catch((e: unknown) => console.error('[MessageConfig] loadChannels失败:', e)),
      loadPerformanceConfigs().catch((e: unknown) => console.error('[MessageConfig] loadPerformanceConfigs失败:', e))
    ])
    console.log('[MessageConfig] 所有数据加载完成')
  } catch (error) {
    console.error('[MessageConfig] 初始化失败:', error)
  }
})
</script>


<style scoped>
.notification-config {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.header-left h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.header-left p {
  margin: 0;
  font-size: 14px;
  color: #909399;
}

.filter-section {
  margin-bottom: 20px;
  padding: 16px 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.filter-section :deep(.el-form-item) {
  margin-bottom: 0;
  margin-right: 16px;
}

.channel-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.channel-card {
  background: white;
  border-radius: 12px;
  border: 1px solid #e4e7ed;
  border-left: 4px solid #409eff;
  overflow: hidden;
  transition: all 0.3s ease;
}

.channel-card:hover {
  border-color: #409eff;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.15);
}

.channel-card.is-disabled {
  opacity: 0.7;
  background: #fafafa;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #f0f2f5;
}

.channel-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.channel-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
}

.channel-icon svg {
  width: 26px;
  height: 26px;
}

/* 各渠道图标颜色 */
.channel-icon.icon-dingtalk {
  background: linear-gradient(135deg, #1890FF 0%, #096DD9 100%);
}

.channel-icon.icon-wechat_work {
  background: linear-gradient(135deg, #52C41A 0%, #389E0D 100%);
}

.channel-icon.icon-wechat_mp {
  background: linear-gradient(135deg, #07C160 0%, #06AD56 100%);
}

.channel-icon.icon-email {
  background: linear-gradient(135deg, #FA8C16 0%, #D46B08 100%);
}

.channel-icon.icon-sms {
  background: linear-gradient(135deg, #FF4D4F 0%, #CF1322 100%);
}

.channel-icon.icon-system {
  background: linear-gradient(135deg, #722ED1 0%, #531DAB 100%);
}

.channel-meta h4 {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.channel-type {
  font-size: 13px;
  color: #909399;
}

.card-body {
  padding: 20px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.info-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-label {
  font-size: 13px;
  font-weight: 500;
  color: #606266;
}

.info-value {
  min-height: 32px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  color: #303133;
}

.last-sent-time {
  color: #409EFF;
  font-weight: 500;
}

.no-sent-yet {
  color: #909399;
}

.member-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.config-actions {
  gap: 12px;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: #fafafa;
  border-top: 1px solid #f0f2f5;
}

.create-info {
  font-size: 12px;
  color: #909399;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.pagination-wrapper {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

/* 弹窗样式 */
.channel-option {
  display: flex;
  align-items: center;
  gap: 8px;
}

.channel-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.channel-desc {
  margin-left: auto;
  font-size: 12px;
  color: #909399;
}

.info-icon {
  margin-left: 4px;
  color: #909399;
  cursor: help;
}

:deep(.el-checkbox-group) {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

:deep(.el-checkbox) {
  margin-right: 0;
}

:deep(.el-divider__text) {
  font-size: 14px;
  font-weight: 500;
  color: #606266;
}

:deep(.el-transfer) {
  display: flex;
  justify-content: center;
}

:deep(.el-transfer-panel) {
  width: 220px;
}

/* 业绩卡片样式 */
.performance-list {
  margin-bottom: 24px;
}

.performance-card {
  border-left: 4px solid #E6A23C;
}

.performance-card:hover {
  border-color: #E6A23C;
  box-shadow: 0 4px 12px rgba(230, 162, 60, 0.2);
}

.channel-icon.icon-performance {
  background: linear-gradient(135deg, #E6A23C 0%, #F56C6C 100%);
}

/* 报表类型选择区域 */
.report-types-section,
.message-types-section {
  width: 100%;
}

.report-types-main,
.message-types-main {
  margin-bottom: 8px;
}

.report-types-main :deep(.el-checkbox-group),
.message-types-main :deep(.el-checkbox-group) {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
}

.report-types-main .category-label {
  font-size: 12px;
  color: #909399;
  margin-right: 8px;
}

/* 更多消息类型折叠区域 */
.message-types-more,
.report-types-more {
  margin-top: 12px;
}

.more-divider {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 8px 0;
  user-select: none;
}

.more-divider:hover .divider-text {
  color: #409EFF;
}

.divider-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(to right, transparent, #dcdfe6, transparent);
}

.divider-text {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 12px;
  font-size: 13px;
  color: #909399;
  transition: color 0.2s;
}

.divider-text .el-icon {
  transition: transform 0.3s;
}

.divider-text .el-icon.is-expanded {
  transform: rotate(180deg);
}

.report-types-collapse,
.message-types-collapse {
  border: none;
}

.report-types-collapse :deep(.el-collapse-item__header),
.message-types-collapse :deep(.el-collapse-item__header) {
  height: 32px;
  line-height: 32px;
  font-size: 13px;
  color: #409EFF;
  background: transparent;
  border: none;
}

.report-types-collapse :deep(.el-collapse-item__wrap),
.message-types-collapse :deep(.el-collapse-item__wrap) {
  border: none;
}

.report-types-collapse :deep(.el-collapse-item__content),
.message-types-collapse :deep(.el-collapse-item__content) {
  padding: 12px 0 0 0;
}

/* 报表类型选择网格 */
.report-types-grid,
.message-types-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.report-category,
.message-category {
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
}

.category-title {
  font-size: 13px;
  font-weight: 600;
  color: #606266;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e4e7ed;
}

.report-category :deep(.el-checkbox-group),
.message-category :deep(.el-checkbox-group) {
  flex-direction: column;
  gap: 8px;
}

/* 预览区域样式 */
.preview-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.preview-card {
  width: 320px;
  padding: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  color: white;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
}

.preview-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 4px;
}

.preview-line {
  opacity: 0.6;
  margin: 8px 0;
}

.preview-date {
  margin-bottom: 12px;
}

.preview-section-title {
  font-weight: 600;
  margin: 8px 0 4px 0;
}

.preview-item {
  opacity: 0.9;
}

.preview-footer {
  text-align: center;
  opacity: 0.7;
  font-size: 12px;
}

.header-right {
  display: flex;
  gap: 12px;
}

/* 响应式 */
@media (max-width: 1200px) {
  .card-body {
    grid-template-columns: repeat(2, 1fr);
  }

  .report-types-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .card-body {
    grid-template-columns: 1fr;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .header-right {
    flex-direction: column;
    width: 100%;
  }
}
</style>
