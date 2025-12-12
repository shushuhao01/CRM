<template>
  <div class="message-config">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h3>通知配置管理</h3>
        <p>配置各种通知方式的部门和成员设置，管理通知渠道的可用性</p>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="showCreateDialog">
          <el-icon><Plus /></el-icon>
          新建配置
        </el-button>
      </div>
    </div>

    <!-- 筛选区域 -->
    <div class="filter-section">
      <el-form inline>
        <el-form-item label="通知方式">
          <el-select v-model="filters.notificationMethod" placeholder="选择通知方式" clearable style="width: 200px;">
            <el-option label="全部" value="" />
            <el-option
              v-for="method in notificationMethods"
              :key="method.value"
              :label="method.label"
              :value="method.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="部门">
          <el-select v-model="filters.departmentId" placeholder="选择部门" clearable style="width: 200px;">
            <el-option label="全部" value="" />
            <el-option
              v-for="dept in departments"
              :key="dept.id"
              :label="dept.name"
              :value="dept.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.status" placeholder="选择状态" clearable style="width: 200px;">
            <el-option label="全部" value="" />
            <el-option label="启用" value="enabled" />
            <el-option label="禁用" value="disabled" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadConfigurations">搜索</el-button>
          <el-button @click="resetFilters">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 配置卡片列表 -->
    <div class="config-cards" v-loading="loading">
      <div
        v-for="config in filteredConfigurations"
        :key="config.id"
        class="config-card"
      >
        <!-- 卡片头部 -->
        <div class="card-header">
          <div class="header-left">
            <div class="method-icon">
              <!-- 钉钉图标 -->
              <el-icon v-if="config.notificationMethod === 'dingtalk'" class="dingtalk-icon">
                <svg viewBox="0 0 1024 1024" width="32" height="32">
                  <defs>
                    <linearGradient id="dingtalkGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style="stop-color:#1890FF;stop-opacity:1" />
                      <stop offset="100%" style="stop-color:#096DD9;stop-opacity:1" />
                    </linearGradient>
                  </defs>
                  <circle cx="512" cy="512" r="448" fill="url(#dingtalkGradient)"/>
                  <path d="M512 128c-212.1 0-384 171.9-384 384 0 84.4 27.2 162.4 73.3 225.9L288 864l134.4-67.2c29.1 8.9 59.8 13.6 91.6 13.6 212.1 0 384-171.9 384-384S724.1 128 512 128z" fill="white"/>
                  <path d="M685.7 394.1c-2.3-8.1-3.8-16.5-4.4-25.1-1.2-17.1 0-34.4 3.6-51.2 2.4-11.2 6-22.1 10.7-32.6 3.6-8.1 8.1-15.8 13.4-23 4.8-6.5 10.4-12.4 16.7-17.6l-15.2-19.6c-9.8 8.1-18.7 17.3-26.5 27.4-8.5 11-15.8 22.9-21.6 35.6-6.3 13.8-11 28.3-13.9 43.2-2.7 13.8-3.6 27.9-2.7 41.9 0.6 9.5 2.2 18.9 4.8 28.1l35.1-6.1z" fill="#1890FF"/>
                  <path d="M512 320c-106 0-192 86-192 192s86 192 192 192 192-86 192-192-86-192-192-192zm0 320c-70.7 0-128-57.3-128-128s57.3-128 128-128 128 57.3 128 128-57.3 128-128 128z" fill="#1890FF"/>
                  <circle cx="512" cy="512" r="64" fill="#1890FF"/>
                </svg>
              </el-icon>
              <!-- 企业微信图标 -->
              <el-icon v-else-if="config.notificationMethod === 'wechat_work'" class="wechat-icon">
                <svg viewBox="0 0 1024 1024" width="32" height="32">
                  <defs>
                    <linearGradient id="wechatGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style="stop-color:#52C41A;stop-opacity:1" />
                      <stop offset="100%" style="stop-color:#389E0D;stop-opacity:1" />
                    </linearGradient>
                  </defs>
                  <circle cx="512" cy="512" r="448" fill="url(#wechatGradient)"/>
                  <path d="M663.2 394.9c-103.1-45.7-226.4-19.7-299.2 63.1-72.8 82.8-72.8 207.6 0 290.4 36.4 41.4 86.9 67.8 142.4 74.6l-28.4-42.6c-38.5-5.8-73.9-24.1-100.8-52.2-53.6-56.1-53.6-147.9 0-204 53.6-56.1 140.4-56.1 194 0 26.9 28.1 42.4 65.5 43.6 105.4h56.8c-1.2-57.4-24.1-111.9-63.1-152.3-19.5-20.2-42.6-36.4-68.1-47.8 41.4-28.1 94.3-28.1 135.7 0 20.2 13.7 36.4 32.5 47.8 54.9l42.6-28.4c-16.2-32.5-40.2-60.6-70.7-81.1z" fill="white"/>
                  <circle cx="420" cy="460" r="24" fill="white"/>
                  <circle cx="604" cy="460" r="24" fill="white"/>
                  <path d="M380 580c0-22.1 17.9-40 40-40h184c22.1 0 40 17.9 40 40s-17.9 40-40 40H420c-22.1 0-40-17.9-40-40z" fill="white"/>
                </svg>
              </el-icon>
              <!-- 邮件图标 -->
              <el-icon v-else-if="config.notificationMethod === 'email'" class="email-icon">
                <svg viewBox="0 0 1024 1024" width="32" height="32">
                  <defs>
                    <linearGradient id="emailGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style="stop-color:#FA8C16;stop-opacity:1" />
                      <stop offset="100%" style="stop-color:#D46B08;stop-opacity:1" />
                    </linearGradient>
                  </defs>
                  <circle cx="512" cy="512" r="448" fill="url(#emailGradient)"/>
                  <path d="M160 288c0-17.7 14.3-32 32-32h640c17.7 0 32 14.3 32 32v448c0 17.7-14.3 32-32 32H192c-17.7 0-32-14.3-32-32V288z" fill="white"/>
                  <path d="M832 320L512 544 192 320v416h640V320z" fill="#FA8C16"/>
                  <path d="M192 320l320 224 320-224H192z" fill="white"/>
                  <path d="M192 320l160 112v-112H192zm480 0v112l160-112H672z" fill="#D46B08"/>
                </svg>
              </el-icon>
              <!-- 短信图标 -->
              <el-icon v-else-if="config.notificationMethod === 'sms'" class="sms-icon">
                <svg viewBox="0 0 1024 1024" width="32" height="32">
                  <defs>
                    <linearGradient id="smsGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style="stop-color:#FF4D4F;stop-opacity:1" />
                      <stop offset="100%" style="stop-color:#CF1322;stop-opacity:1" />
                    </linearGradient>
                  </defs>
                  <circle cx="512" cy="512" r="448" fill="url(#smsGradient)"/>
                  <rect x="256" y="192" width="512" height="640" rx="64" ry="64" fill="white"/>
                  <rect x="288" y="224" width="448" height="576" rx="32" ry="32" fill="#F5F5F5"/>
                  <rect x="320" y="256" width="384" height="32" rx="16" ry="16" fill="#FF4D4F"/>
                  <rect x="320" y="320" width="384" height="320" rx="16" ry="16" fill="white"/>
                  <circle cx="400" cy="420" r="16" fill="#FF4D4F"/>
                  <circle cx="512" cy="420" r="16" fill="#FF4D4F"/>
                  <circle cx="624" cy="420" r="16" fill="#FF4D4F"/>
                  <rect x="320" y="480" width="256" height="16" rx="8" ry="8" fill="#D9D9D9"/>
                  <rect x="320" y="520" width="320" height="16" rx="8" ry="8" fill="#D9D9D9"/>
                  <rect x="320" y="560" width="192" height="16" rx="8" ry="8" fill="#D9D9D9"/>
                  <circle cx="512" cy="720" r="32" fill="#FF4D4F"/>
                </svg>
              </el-icon>
              <!-- 系统消息图标 -->
              <el-icon v-else class="system-icon">
                <svg viewBox="0 0 1024 1024" width="32" height="32">
                  <defs>
                    <linearGradient id="systemGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style="stop-color:#722ED1;stop-opacity:1" />
                      <stop offset="100%" style="stop-color:#531DAB;stop-opacity:1" />
                    </linearGradient>
                  </defs>
                  <circle cx="512" cy="512" r="448" fill="url(#systemGradient)"/>
                  <path d="M512 128c-212.1 0-384 171.9-384 384s171.9 384 384 384 384-171.9 384-384-171.9-384-384-384z" fill="white"/>
                  <path d="M512 192c-176.7 0-320 143.3-320 320s143.3 320 320 320 320-143.3 320-320-143.3-320-320-320z" fill="#722ED1"/>
                  <path d="M448 320h128v64H448v-64zm0 128h128v192H448V448z" fill="white"/>
                  <circle cx="512" cy="352" r="24" fill="white"/>
                  <rect x="480" y="416" width="64" height="160" rx="8" ry="8" fill="white"/>
                </svg>
              </el-icon>
            </div>
            <div class="method-info">
              <h4 class="method-name">{{ getMethodLabel(config.notificationMethod) }}</h4>
              <p class="config-name">{{ config.name }}</p>
            </div>
          </div>
          <div class="header-right">
            <el-switch
              v-model="config.enabled"
              @change="toggleConfigStatus(config)"
              :loading="config.statusLoading"
              size="large"
            />
          </div>
        </div>

        <!-- 卡片内容 -->
        <div class="card-content">
          <!-- 支持部门 -->
          <div class="content-section">
            <div class="section-label">支持部门</div>
            <div class="department-selection">
              <el-select
                :model-value="config.departments.map(d => d.id)"
                multiple
                placeholder="选择支持的部门"
                @change="updateDepartments(config, $event)"
                class="department-select"
              >
                <el-option
                  v-for="dept in departments"
                  :key="dept.id"
                  :label="dept.name"
                  :value="dept.id"
                />
              </el-select>
              <div class="selected-departments">
                <el-tag
                  v-for="dept in config.departments.slice(0, 3)"
                  :key="dept.id"
                  size="small"
                  class="dept-tag"
                >
                  {{ dept.name }}
                </el-tag>
                <el-tag
                  v-if="config.departments.length > 3"
                  size="small"
                  type="info"
                  class="dept-tag"
                >
                  +{{ config.departments.length - 3 }}
                </el-tag>
              </div>
            </div>
          </div>

          <!-- 通知成员 -->
          <div class="content-section">
            <div class="section-label">通知成员</div>
            <div class="member-selection">
              <div v-if="config.notificationMethod === 'system_message'" class="all-members-notice">
                <el-icon><User /></el-icon>
                <span>全员通知</span>
              </div>
              <div v-else class="member-config">
                <el-button
                  type="primary"
                  size="small"
                  @click="showMemberSelector(config)"
                  class="select-member-btn"
                >
                  选择成员 ({{ config.members.length }}人)
                </el-button>
                <div v-if="config.members.length > 0" class="selected-members">
                  <el-tag
                    v-for="member in config.members.slice(0, 2)"
                    :key="member.id"
                    size="small"
                    class="member-tag"
                  >
                    {{ member.name }}
                  </el-tag>
                  <el-tag
                    v-if="config.members.length > 2"
                    size="small"
                    type="info"
                    class="member-tag"
                  >
                    +{{ config.members.length - 2 }}
                  </el-tag>
                </div>
              </div>
            </div>
          </div>

          <!-- 配置参数 -->
          <div class="content-section">
            <div class="section-label">配置参数</div>
            <div class="config-params">
              <el-button
                type="text"
                @click="showConfigDialog(config)"
                class="config-btn"
              >
                <el-icon><Setting /></el-icon>
                配置参数
              </el-button>
              <div class="config-status">
                <el-tag
                  :type="isConfigComplete(config) ? 'success' : 'warning'"
                  size="small"
                >
                  {{ isConfigComplete(config) ? '已配置' : '待配置' }}
                </el-tag>
              </div>
            </div>
          </div>
        </div>

        <!-- 卡片底部操作 -->
        <div class="card-footer">
          <div class="footer-left">
            <span class="created-info">{{ config.createdBy }} · {{ config.createdAt }}</span>
          </div>
          <div class="footer-right">
            <el-button type="text" size="small" @click="testConfig(config)" :loading="config.testLoading">
              <el-icon><Connection /></el-icon>
              测试
            </el-button>
            <el-button type="text" size="small" @click="editConfig(config)">
              <el-icon><Edit /></el-icon>
              编辑
            </el-button>
            <el-button type="text" size="small" @click="deleteConfig(config)" class="delete-btn">
              <el-icon><Delete /></el-icon>
              删除
            </el-button>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="filteredConfigurations.length === 0" class="empty-state">
        <el-empty description="暂无通知配置">
          <el-button type="primary" @click="showCreateDialog">创建第一个配置</el-button>
        </el-empty>
      </div>
    </div>

    <!-- 分页 -->
    <div v-if="filteredConfigurations.length > 0" class="pagination-wrapper">
      <el-pagination
        v-model:current-page="pagination.currentPage"
        v-model:page-size="pagination.pageSize"
        :page-sizes="[6, 12, 18, 24]"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>

    <!-- 新建/编辑配置弹窗 -->
    <el-dialog
      v-model="configDialogVisible"
      :title="isEdit ? '编辑通知配置' : '新建通知配置'"
      width="800px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="configFormRef"
        :model="configForm"
        :rules="configRules"
        label-width="120px"
      >
        <el-form-item label="配置名称" prop="name">
          <el-input v-model="configForm.name" placeholder="请输入配置名称" />
        </el-form-item>

        <el-form-item label="通知方式" prop="notificationMethod">
          <el-select v-model="configForm.notificationMethod" placeholder="选择通知方式" style="width: 100%">
            <el-option
              v-for="method in notificationMethods"
              :key="method.value"
              :label="method.label"
              :value="method.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="支持部门" prop="departmentIds">
          <el-select
            v-model="configForm.departmentIds"
            multiple
            placeholder="选择支持的部门"
            style="width: 100%"
          >
            <el-option
              v-for="dept in departments"
              :key="dept.id"
              :label="dept.name"
              :value="dept.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item
          v-if="configForm.notificationMethod !== 'system_message'"
          label="通知成员"
          prop="memberIds"
        >
          <div class="member-selection">
            <el-button type="primary" @click="showMemberSelector">
              选择成员 (已选 {{ configForm.memberIds.length }} 人)
            </el-button>
            <div v-if="selectedMembers.length > 0" class="selected-members">
              <el-tag
                v-for="member in selectedMembers.slice(0, 5)"
                :key="member.id"
                closable
                @close="removeMember(member.id)"
                style="margin-right: 8px; margin-top: 8px;"
              >
                {{ member.name }} ({{ member.departmentName }})
              </el-tag>
              <el-tag
                v-if="selectedMembers.length > 5"
                type="info"
                style="margin-top: 8px;"
              >
                +{{ selectedMembers.length - 5 }} 人
              </el-tag>
            </div>
          </div>
        </el-form-item>

        <el-form-item
          v-if="configForm.notificationMethod === 'system_message'"
          label="通知范围"
        >
          <el-alert
            title="系统消息支持全员通知"
            type="info"
            :closable="false"
            show-icon
          />
        </el-form-item>

        <el-form-item label="配置参数">
          <div class="config-params">
            <!-- 钉钉配置 -->
            <template v-if="configForm.notificationMethod === 'dingtalk'">
              <el-form-item label="Webhook地址">
                <el-input v-model="configForm.params.webhook" placeholder="请输入钉钉机器人Webhook地址" />
              </el-form-item>
              <el-form-item label="签名密钥">
                <el-input v-model="configForm.params.secret" placeholder="请输入签名密钥" />
              </el-form-item>
              <el-form-item label="@所有人">
                <el-switch v-model="configForm.params.atAll" />
              </el-form-item>
            </template>

            <!-- 企业微信配置 -->
            <template v-if="configForm.notificationMethod === 'wechat_work'">
              <el-form-item label="Webhook地址" required>
                <el-input
                  v-model="configForm.params.webhook"
                  placeholder="请输入企业微信群机器人Webhook地址"
                  style="width: 100%"
                />
                <div class="form-tip">
                  企业微信群机器人Webhook地址，格式：https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxxxxxxx
                </div>
              </el-form-item>
              <el-form-item label="群名称">
                <el-input
                  v-model="configForm.params.groupName"
                  placeholder="请输入群名称（可选）"
                  style="width: 100%"
                />
                <div class="form-tip">用于标识该机器人所在的群，便于管理</div>
              </el-form-item>
              <el-form-item label="@所有人">
                <el-switch v-model="configForm.params.mentionAll" />
                <div class="form-tip">开启后，消息将@所有人</div>
              </el-form-item>
              <el-form-item label="@指定成员">
                <el-input
                  v-model="configForm.params.mentionedList"
                  placeholder="请输入要@的成员手机号，多个用逗号分隔"
                  style="width: 100%"
                />
                <div class="form-tip">指定要@的成员手机号，多个用逗号分隔，如：13800138000,13800138001</div>
              </el-form-item>
            </template>

            <!-- 邮件配置 -->
            <template v-if="configForm.notificationMethod === 'email'">
              <el-form-item label="SMTP服务器">
                <el-input v-model="configForm.params.smtpHost" placeholder="请输入SMTP服务器地址" />
              </el-form-item>
              <el-form-item label="SMTP端口">
                <el-input v-model="configForm.params.smtpPort" placeholder="请输入SMTP端口" />
              </el-form-item>
              <el-form-item label="发件人邮箱">
                <el-input v-model="configForm.params.fromEmail" placeholder="请输入发件人邮箱" />
              </el-form-item>
            </template>

            <!-- 短信配置 -->
            <template v-if="configForm.notificationMethod === 'sms'">
              <el-form-item label="短信平台">
                <el-select v-model="configForm.params.smsProvider" placeholder="选择短信平台">
                  <el-option label="阿里云" value="aliyun" />
                  <el-option label="腾讯云" value="tencent" />
                  <el-option label="华为云" value="huawei" />
                </el-select>
              </el-form-item>
              <el-form-item label="AccessKey">
                <el-input v-model="configForm.params.accessKey" placeholder="请输入AccessKey" />
              </el-form-item>
              <el-form-item label="SecretKey">
                <el-input v-model="configForm.params.secretKey" type="password" placeholder="请输入SecretKey" />
              </el-form-item>
            </template>
          </div>
        </el-form-item>

        <el-form-item label="描述">
          <el-input v-model="configForm.description" type="textarea" :rows="3" placeholder="请输入配置描述" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="configDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveConfig" :loading="saving">
          {{ isEdit ? '更新' : '创建' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 成员选择弹窗 -->
    <el-dialog
      v-model="memberSelectorVisible"
      title="选择通知成员"
      width="800px"
      :close-on-click-modal="false"
    >
      <div class="member-selector">
        <!-- 筛选区域 -->
        <div class="member-filter">
          <el-form inline>
            <el-form-item label="部门">
              <el-select v-model="memberFilter.departmentId" placeholder="选择部门" clearable>
                <el-option label="全部部门" value="" />
                <el-option
                  v-for="dept in availableDepartments"
                  :key="dept.id"
                  :label="dept.name"
                  :value="dept.id"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="姓名">
              <el-input v-model="memberFilter.name" placeholder="输入姓名搜索" clearable />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="filterMembers">搜索</el-button>
            </el-form-item>
          </el-form>
        </div>

        <el-table
          ref="memberTableRef"
          :data="filteredMembers"
          style="width: 100%"
          @selection-change="handleMemberSelection"
          max-height="400"
        >
          <el-table-column type="selection" width="55" />
          <el-table-column prop="name" label="姓名" width="120" />
          <el-table-column prop="departmentName" label="部门" width="120" />
          <el-table-column prop="position" label="职位" width="120" />
          <el-table-column prop="email" label="邮箱" />
          <el-table-column prop="phone" label="手机号" width="120" />
        </el-table>
      </div>

      <template #footer>
        <el-button @click="memberSelectorVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmMemberSelection">
          确定 (已选 {{ tempSelectedMembers.length }} 人)
        </el-button>
      </template>
    </el-dialog>

    <!-- 查看配置弹窗 -->
    <el-dialog
      v-model="viewDialogVisible"
      title="查看通知配置"
      width="600px"
    >
      <div v-if="currentConfig" class="config-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="配置名称">
            {{ currentConfig.name }}
          </el-descriptions-item>
          <el-descriptions-item label="通知方式">
            <el-tag :type="getMethodTagType(currentConfig.notificationMethod)">
              {{ getMethodLabel(currentConfig.notificationMethod) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="currentConfig.enabled ? 'success' : 'danger'">
              {{ currentConfig.enabled ? '启用' : '禁用' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="支持部门">
            <div class="department-list">
              <el-tag
                v-for="dept in currentConfig.departments"
                :key="dept.id"
                size="small"
                style="margin-right: 4px; margin-bottom: 4px;"
              >
                {{ dept.name }}
              </el-tag>
            </div>
          </el-descriptions-item>
          <el-descriptions-item label="通知成员" :span="2">
            <div v-if="currentConfig.notificationMethod === 'system_message'">
              全员通知
            </div>
            <div v-else class="member-list">
              <el-tag
                v-for="member in currentConfig.members"
                :key="member.id"
                size="small"
                style="margin-right: 4px; margin-bottom: 4px;"
              >
                {{ member.name }} ({{ member.departmentName }})
              </el-tag>
            </div>
          </el-descriptions-item>
          <el-descriptions-item label="创建人">
            {{ currentConfig.createdBy }}
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">
            {{ currentConfig.createdAt }}
          </el-descriptions-item>
          <el-descriptions-item label="描述" :span="2">
            {{ currentConfig.description || '无' }}
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <template #footer>
        <el-button @click="viewDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, User, Setting, Connection, Edit, Delete } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import { notificationService, type NotificationConfig } from '@/services/notificationService'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

// 通知方式定义
const notificationMethods = ref([
  { value: 'dingtalk', label: '钉钉' },
  { value: 'wechat_work', label: '企业微信' },
  { value: 'email', label: '邮件' },
  { value: 'sms', label: '短信' },
  { value: 'system_message', label: '系统消息' }
])

// 部门数据
const departments = ref([
  { id: '1', name: '销售部', memberCount: 15 },
  { id: '2', name: '客服部', memberCount: 8 },
  { id: '3', name: '技术部', memberCount: 12 },
  { id: '4', name: '财务部', memberCount: 5 },
  { id: '5', name: '人事部', memberCount: 3 }
])

// 成员数据 - 从userStore获取真实用户
// 🔥 【修复】过滤掉禁用用户，只显示启用的用户
const members = computed(() => {
  return userStore.users
    .filter((u: any) => !u.status || u.status === 'active')
    .map((u: any) => ({
      id: u.id,
      name: u.realName || u.name || u.username,
      departmentId: u.departmentId || '',
      departmentName: u.departmentName || u.department || '未分配',
      position: u.position || '员工',
      email: u.email || '',
      phone: u.phone || ''
    }))
})

// 配置数据
const configurations = ref([
  {
    id: '1',
    name: '销售部钉钉通知',
    notificationMethod: 'dingtalk',
    departments: [{ id: '1', name: '销售部' }],
    members: [
      { id: '1', name: '张三', departmentName: '销售部' },
      { id: '2', name: '李四', departmentName: '销售部' }
    ],
    enabled: true,
    createdBy: '系统管理员',
    createdAt: '2024-01-15 10:00:00',
    description: '销售部门钉钉通知配置',
    params: {
      webhook: 'https://oapi.dingtalk.com/robot/send?access_token=xxx',
      secret: 'xxx',
      atAll: false
    },
    statusLoading: false,
    testLoading: false
  },
  {
    id: '2',
    name: '全员系统消息',
    notificationMethod: 'system_message',
    departments: departments.value,
    members: [],
    enabled: true,
    createdBy: '系统管理员',
    createdAt: '2024-01-15 09:30:00',
    description: '系统消息全员通知',
    params: {
      retentionDays: 30,
      autoMarkRead: false,
      pushToMobile: true
    },
    statusLoading: false,
    testLoading: false
  }
])

// 状态管理
const loading = ref(false)
const saving = ref(false)
const configDialogVisible = ref(false)
const memberSelectorVisible = ref(false)
const viewDialogVisible = ref(false)
const isEdit = ref(false)
const currentConfig = ref(null)

// 筛选条件
const filters = reactive({
  notificationMethod: '',
  departmentId: '',
  status: ''
})

// 分页
const pagination = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 0
})

// 表单
const configFormRef = ref<FormInstance>()
const configForm = reactive({
  id: '',
  name: '',
  notificationMethod: '',
  departmentIds: [],
  memberIds: [],
  description: '',
  params: {}
})

const configRules: FormRules = {
  name: [
    { required: true, message: '请输入配置名称', trigger: 'blur' }
  ],
  notificationMethod: [
    { required: true, message: '请选择通知方式', trigger: 'change' }
  ],
  departmentIds: [
    { required: true, message: '请选择支持的部门', trigger: 'change' }
  ]
}

// 成员选择
const memberTableRef = ref()
const memberFilter = reactive({
  departmentId: '',
  name: ''
})
const filteredMembers = ref([])
const tempSelectedMembers = ref([])

// 计算属性
const filteredConfigurations = computed(() => {
  let result = [...configurations.value]

  if (filters.notificationMethod) {
    result = result.filter(config => config.notificationMethod === filters.notificationMethod)
  }

  if (filters.departmentId) {
    result = result.filter(config =>
      config.departments.some(dept => dept.id === filters.departmentId)
    )
  }

  if (filters.status) {
    const enabled = filters.status === 'enabled'
    result = result.filter(config => config.enabled === enabled)
  }

  pagination.total = result.length
  const start = (pagination.currentPage - 1) * pagination.pageSize
  const end = start + pagination.pageSize

  return result.slice(start, end)
})

const selectedMembers = computed(() => {
  return members.value.filter(member => configForm.memberIds.includes(member.id))
})

const availableDepartments = computed(() => {
  // 如果表单中已选择了支持的部门，则只显示这些部门下的成员
  // 否则显示所有部门
  if (configForm.departmentIds.length > 0) {
    return departments.value.filter(dept => configForm.departmentIds.includes(dept.id))
  }
  return departments.value
})

// 方法
const getMethodLabel = (value: string) => {
  const method = notificationMethods.value.find(m => m.value === value)
  return method ? method.label : value
}

const getMethodTagType = (value: string) => {
  const typeMap = {
    'dingtalk': 'primary',
    'wechat_work': 'success',
    'email': 'warning',
    'sms': 'danger',
    'system_message': 'info'
  }
  return typeMap[value] || 'default'
}

const loadConfigurations = async () => {
  loading.value = true
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 500))
    // 这里会根据筛选条件重新计算 filteredConfigurations
  } catch (error) {
    ElMessage.error('加载配置失败')
  } finally {
    loading.value = false
  }
}

const resetFilters = () => {
  filters.notificationMethod = ''
  filters.departmentId = ''
  filters.status = ''
  loadConfigurations()
}

const showCreateDialog = () => {
  isEdit.value = false
  resetConfigForm()
  configDialogVisible.value = true
}

const editConfig = (config: any) => {
  isEdit.value = true
  currentConfig.value = config

  // 填充表单
  configForm.id = config.id
  configForm.name = config.name
  configForm.notificationMethod = config.notificationMethod
  configForm.departmentIds = config.departments.map(dept => dept.id)
  configForm.memberIds = config.members.map(member => member.id)
  configForm.description = config.description
  configForm.params = { ...config.params }

  configDialogVisible.value = true
}

const viewConfig = (config: any) => {
  currentConfig.value = config
  viewDialogVisible.value = true
}

const deleteConfig = async (config: any) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除配置"${config.name}"吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 500))

    const index = configurations.value.findIndex(c => c.id === config.id)
    if (index > -1) {
      configurations.value.splice(index, 1)
    }

    ElMessage.success('删除成功')
  } catch (error) {
    // 用户取消删除
  }
}

const toggleConfigStatus = async (config: any) => {
  config.statusLoading = true
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 500))

    ElMessage.success(`配置已${config.enabled ? '启用' : '禁用'}`)
  } catch (error) {
    // 恢复状态
    config.enabled = !config.enabled
    ElMessage.error('状态更新失败')
  } finally {
    config.statusLoading = false
  }
}

const testConfig = async (config: any) => {
  config.testLoading = true
  try {
    // 使用通知服务进行实际测试
    const success = await notificationService.testConfiguration(config as NotificationConfig)

    if (success) {
      ElMessage.success(`${getMethodLabel(config.notificationMethod)}测试通知发送成功`)
    } else {
      ElMessage.error('测试通知发送失败')
    }
  } catch (error) {
    ElMessage.error('测试通知发送失败')
  } finally {
    config.testLoading = false
  }
}

const resetConfigForm = () => {
  configForm.id = ''
  configForm.name = ''
  configForm.notificationMethod = ''
  configForm.departmentIds = []
  configForm.memberIds = []
  configForm.description = ''
  configForm.params = {}
}

const saveConfig = async () => {
  if (!configFormRef.value) return

  try {
    await configFormRef.value.validate()

    saving.value = true

    const configData: NotificationConfig = {
      id: isEdit.value ? configForm.id : Date.now().toString(),
      name: configForm.name,
      notificationMethod: configForm.notificationMethod,
      messageType: configForm.messageType,
      departmentIds: configForm.departmentIds,
      memberIds: configForm.notificationMethod === 'system_message' ? [] : configForm.memberIds,
      enabled: true,
      params: configForm.params
    }

    // 使用通知服务保存配置
    await notificationService.saveConfiguration(configData)

    // 更新本地数据
    const displayData = {
      ...configData,
      departments: departments.value.filter(dept => configData.departmentIds.includes(dept.id)),
      members: members.value.filter(member => configData.memberIds.includes(member.id)),
      createdBy: '当前用户',
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      statusLoading: false,
      testLoading: false
    }

    if (isEdit.value) {
      // 更新配置
      const index = configurations.value.findIndex(c => c.id === configData.id)
      if (index > -1) {
        configurations.value[index] = { ...configurations.value[index], ...displayData }
      }
      ElMessage.success('配置更新成功')
    } else {
      // 创建新配置
      configurations.value.unshift(displayData)
      ElMessage.success('配置创建成功')
    }

    configDialogVisible.value = false
  } catch (error) {
    console.error('保存失败:', error)
  } finally {
    saving.value = false
  }
}

const filterMembers = () => {
  let filtered = members.value

  // 如果表单中已选择了支持的部门，则只显示这些部门下的成员
  if (configForm.departmentIds.length > 0) {
    filtered = filtered.filter(member =>
      configForm.departmentIds.includes(member.departmentId)
    )
  }

  // 如果在成员选择器中选择了特定部门，进一步过滤
  if (memberFilter.departmentId) {
    filtered = filtered.filter(member => member.departmentId === memberFilter.departmentId)
  }

  // 如果输入了姓名，按姓名过滤
  if (memberFilter.name) {
    filtered = filtered.filter(member => member.name.includes(memberFilter.name))
  }

  filteredMembers.value = filtered
}

const handleMemberSelection = (selection: any[]) => {
  tempSelectedMembers.value = selection
}

const confirmMemberSelection = () => {
  if (currentConfig.value) {
    // 卡片模式：直接更新配置的成员
    currentConfig.value.members = [...tempSelectedMembers.value]
    ElMessage.success('成员配置已更新')
  } else {
    // 表单模式：更新表单数据
    configForm.memberIds = tempSelectedMembers.value.map(member => member.id)
  }
  memberSelectorVisible.value = false
}

const removeMember = (memberId: string) => {
  const index = configForm.memberIds.indexOf(memberId)
  if (index > -1) {
    configForm.memberIds.splice(index, 1)
  }
}

const handleSizeChange = (size: number) => {
  pagination.pageSize = size
  pagination.currentPage = 1
}

const handleCurrentChange = (page: number) => {
  pagination.currentPage = page
}

// 卡片布局相关方法
const updateDepartments = (config: any, departmentIds: string[]) => {
  config.departments = departments.value.filter(dept => departmentIds.includes(dept.id))
  // 这里可以添加API调用来保存更改
  ElMessage.success('部门配置已更新')
}

const showMemberSelector = (config?: any) => {
  if (config) {
    // 卡片模式
    currentConfig.value = config
    // 确保 config.members 是数组
    tempSelectedMembers.value = [...(config.members || [])]
  } else {
    // 表单模式
    tempSelectedMembers.value = [...selectedMembers.value]
  }

  filterMembers()
  memberSelectorVisible.value = true

  // 设置已选中的成员
  nextTick(() => {
    if (memberTableRef.value) {
      tempSelectedMembers.value.forEach(member => {
        memberTableRef.value.toggleRowSelection(member, true)
      })
    }
  })
}

const showConfigDialog = (config: any) => {
  currentConfig.value = config
  isEdit.value = true

  // 填充表单数据
  configForm.id = config.id
  configForm.name = config.name
  configForm.notificationMethod = config.notificationMethod
  configForm.departmentIds = (config.departments || []).map(d => d.id)
  configForm.memberIds = (config.members || []).map(m => m.id)

  // 填充配置参数
  if (config.config) {
    Object.assign(configForm, config.config)
  }

  configDialogVisible.value = true
}

const isConfigComplete = (config: any) => {
  if (!config.config) return false

  switch (config.notificationMethod) {
    case 'dingtalk':
      return !!(config.config.webhook && config.config.secret)
    case 'wechat_work':
      return !!(config.config.webhook)
    case 'email':
      return !!(config.config.smtpHost && config.config.smtpPort && config.config.username && config.config.password)
    case 'sms':
      return !!(config.config.accessKeyId && config.config.accessKeySecret && config.config.signName && config.config.templateCode)
    case 'system_message':
      return true // 系统消息不需要额外配置
    default:
      return false
  }
}



// 生命周期
onMounted(async () => {
  // 加载用户列表
  await userStore.loadUsers()
  // 初始化通知服务
  await notificationService.loadConfigurations()
  loadConfigurations()
})
</script>

<style scoped>
.message-config {
  padding: 20px;
  background-color: #f5f5f5;
  min-height: calc(100vh - 60px);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.header-left h3 {
  margin: 0 0 8px 0;
  color: #303133;
  font-size: 20px;
  font-weight: 600;
}

.header-left p {
  margin: 0;
  color: #606266;
  font-size: 14px;
}

.filter-section {
  margin-bottom: 20px;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.config-cards {
  margin-top: 20px;
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
}

.config-card {
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 12px;
  padding: 24px;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.config-card:hover {
  border-color: #409eff;
  box-shadow: 0 4px 16px rgba(64, 158, 255, 0.1);
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f2f5;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.method-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8f9fa;
}

.dingtalk-icon {
  color: #2196F3;
}

.wechat-icon {
  color: #4CAF50;
}

.email-icon {
  color: #FF9800;
}

.sms-icon {
  color: #F44336;
}

.system-icon {
  color: #9E9E9E;
}

.method-info h4 {
  margin: 0 0 4px 0;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.method-info p {
  margin: 0;
  font-size: 14px;
  color: #909399;
}

.card-content {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 24px;
  margin-bottom: 20px;
}

.content-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-label {
  font-size: 14px;
  font-weight: 600;
  color: #606266;
  margin-bottom: 8px;
}

.department-selection {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.department-select {
  width: 100%;
}

.selected-departments {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.dept-tag {
  margin: 0;
}

.member-selection {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.all-members-notice {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #409eff;
  font-size: 14px;
  padding: 8px 12px;
  background: #ecf5ff;
  border-radius: 6px;
}

.member-config {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.select-member-btn {
  align-self: flex-start;
}

.selected-members {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.member-tag {
  margin: 0;
}

.config-params {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.config-btn {
  align-self: flex-start;
  padding: 8px 12px;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  transition: all 0.3s ease;
}

.config-btn:hover {
  border-color: #409eff;
  color: #409eff;
}

.config-status {
  margin-top: 4px;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16px;
  border-top: 1px solid #f0f2f5;
}

.created-info {
  font-size: 12px;
  color: #909399;
}

.footer-right {
  display: flex;
  gap: 8px;
}

.footer-right .el-button {
  padding: 4px 8px;
}

.delete-btn {
  color: #f56c6c;
}

.delete-btn:hover {
  color: #f56c6c;
  background: #fef0f0;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.pagination-wrapper {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .card-content {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 768px) {
  .card-content {
    grid-template-columns: 1fr;
  }

  .config-card {
    padding: 16px;
  }

  .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
}

.member-selection {
  width: 100%;
}

.selected-members {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.member-selector {
  max-height: 500px;
}

.member-filter {
  margin-bottom: 16px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 4px;
}

.config-detail {
  max-height: 400px;
  overflow-y: auto;
}

.department-list,
.member-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.config-params {
  width: 100%;
}

.config-params .el-form-item {
  margin-bottom: 16px;
}

:deep(.el-descriptions__label) {
  font-weight: 600;
}

:deep(.el-table .cell) {
  word-break: break-word;
}
</style>
