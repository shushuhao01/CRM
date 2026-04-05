<template>
  <div class="notification-templates">
    <el-card>
      <!-- 顶部操作栏 -->
      <el-row :gutter="16" class="toolbar" align="middle">
        <el-col :span="5">
          <el-select v-model="filterCategory" placeholder="全部分类" @change="loadTemplates" clearable size="default">
            <el-option label="全部分类" value="" />
            <el-option label="账号管理" value="account" />
            <el-option label="支付相关" value="payment" />
            <el-option label="授权/套餐" value="license" />
          </el-select>
        </el-col>
        <el-col :span="10">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索模板名称或代码..."
            clearable
            @input="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-col>
        <el-col :span="9" style="text-align: right;">
          <el-button type="primary" @click="handleCreate">
            <el-icon><Plus /></el-icon> 新建模板
          </el-button>
        </el-col>
      </el-row>

      <!-- 模板列表 -->
      <el-table :data="filteredTemplates" border style="margin-top: 16px;" v-loading="loading" stripe>
        <el-table-column prop="templateCode" label="模板代码" width="200">
          <template #default="{ row }">
            <span style="font-family: monospace; font-size: 13px;">{{ row.templateCode }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="templateName" label="模板名称" width="180" />
        <el-table-column prop="category" label="分类" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="getCategoryTagType(row.category)" size="small">{{ getCategoryName(row.category) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="templateType" label="通知类型" width="110" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.templateType === 'email'" type="info" size="small">仅邮件</el-tag>
            <el-tag v-else-if="row.templateType === 'sms'" type="warning" size="small">仅短信</el-tag>
            <el-tag v-else type="success" size="small">邮件+短信</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="scene" label="使用场景" min-width="200" show-overflow-tooltip />
        <el-table-column prop="isEnabled" label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-switch v-model="row.isEnabled" :active-value="1" :inactive-value="0" @change="handleToggleStatus(row)" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="240" fixed="right" align="center">
          <template #default="{ row }">
            <el-button size="small" type="primary" plain @click="handleEdit(row)">
              <el-icon><Edit /></el-icon> 编辑
            </el-button>
            <el-button size="small" type="success" plain @click="handleTest(row)">
              <el-icon><Position /></el-icon> 测试
            </el-button>
            <el-button size="small" type="danger" plain @click="handleDelete(row)" :disabled="row.isSystem === 1">
              <el-icon><Delete /></el-icon>
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- ================== 编辑/新建对话框 ================== -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑通知模板' : '新建通知模板'"
      width="900px"
      :close-on-click-modal="false"
      top="3vh"
      destroy-on-close
    >
      <el-form :model="formData" label-width="110px" :rules="formRules" ref="formRef" size="default">
        <!-- 快捷场景选择（仅新建时显示） -->
        <el-alert v-if="!isEdit" type="success" :closable="false" style="margin-bottom: 16px;">
          <template #title>
            <div style="display: flex; align-items: center; gap: 8px;">
              <el-icon><MagicStick /></el-icon>
              <span>快捷创建：选择预设场景可自动填充模板内容（与阿里云短信模板一一对应）</span>
            </div>
          </template>
        </el-alert>
        <el-form-item v-if="!isEdit" label="预设场景">
          <el-select
            v-model="selectedPreset"
            placeholder="选择预设场景自动填充..."
            @change="applyPreset"
            style="width: 100%;"
            clearable
            filterable
          >
            <el-option-group v-for="group in presetGroups" :key="group.label" :label="group.label">
              <el-option v-for="preset in group.options" :key="preset.code" :label="preset.name" :value="preset.code">
                <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                  <span>{{ preset.name }}</span>
                  <el-tag size="small" type="info" style="margin-left: 12px;">{{ preset.code }}</el-tag>
                </div>
              </el-option>
            </el-option-group>
          </el-select>
        </el-form-item>

        <el-tabs v-model="editActiveTab" type="border-card" style="margin-bottom: 0;">
          <!-- Tab 1: 基本信息 -->
          <el-tab-pane label="基本信息" name="basic">
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="模板代码" prop="templateCode">
                  <el-input
                    v-model="formData.templateCode"
                    :disabled="formData.isSystem === 1 || isEdit"
                    placeholder="如: ACCOUNT_ACTIVATION"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="模板名称" prop="templateName">
                  <el-input v-model="formData.templateName" placeholder="如: 账号开通通知" />
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="16">
              <el-col :span="8">
                <el-form-item label="通知类型" prop="templateType">
                  <el-select v-model="formData.templateType" style="width: 100%;">
                    <el-option label="仅邮件" value="email" />
                    <el-option label="仅短信" value="sms" />
                    <el-option label="邮件+短信" value="both" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="业务分类" prop="category">
                  <el-select v-model="formData.category" style="width: 100%;" @change="onCategoryChange">
                    <el-option label="账号管理" value="account" />
                    <el-option label="支付相关" value="payment" />
                    <el-option label="授权/套餐" value="license" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="优先级" prop="priority">
                  <el-select v-model="formData.priority" style="width: 100%;">
                    <el-option label="低" value="low" />
                    <el-option label="普通" value="normal" />
                    <el-option label="高" value="high" />
                    <el-option label="紧急" value="urgent" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>

            <el-form-item label="使用场景" prop="scene">
              <el-input v-model="formData.scene" placeholder="描述该模板的触发场景，如: 免费试用注册成功后发送" />
            </el-form-item>

            <!-- 阿里云短信KEY提示 -->
            <el-alert v-if="formData.templateCode && getSmsKeyMapping(formData.templateCode)" type="info" :closable="false" style="margin-bottom: 12px;">
              <template #title>
                <span>对应基础配置短信模板KEY：<code style="background: #ecf5ff; padding: 2px 8px; border-radius: 3px; font-weight: bold;">{{ getSmsKeyMapping(formData.templateCode) }}</code>
                  （请确保已在「基础配置 → 短信配置」中填写对应的阿里云模板CODE）
                </span>
              </template>
            </el-alert>

            <!-- 变量管理 -->
            <el-divider content-position="left">
              <el-icon><Connection /></el-icon> 模板变量
            </el-divider>

            <el-form-item label="可选变量">
              <div class="variable-selector">
                <el-check-tag
                  v-for="(desc, key) in availableVariables"
                  :key="key"
                  :checked="isVariableSelected(String(key))"
                  @change="toggleVariable(String(key), desc as string)"
                  class="variable-check-tag"
                >
                  <code>{{ key }}</code>
                  <span class="var-desc">{{ desc }}</span>
                </el-check-tag>
              </div>
            </el-form-item>

            <el-form-item label="已选变量">
              <div v-if="formData.variables && Object.keys(formData.variables).length > 0" class="selected-variables">
                <el-tag
                  v-for="(desc, key) in formData.variables"
                  :key="key"
                  closable
                  @close="removeVariable(String(key))"
                  type="success"
                  effect="light"
                  class="selected-var-tag"
                >
                  <span @click="copyVariable(String(key))" style="cursor: pointer;" :title="`点击复制 {{${key}}}`">
                    <code v-text="'{{' + key + '}}'"></code> {{ desc }}
                  </span>
                </el-tag>
              </div>
              <el-text v-else type="info" size="small">请从上方点击选择需要的变量</el-text>
            </el-form-item>
          </el-tab-pane>

          <!-- Tab 2: 邮件内容 -->
          <el-tab-pane label="邮件内容" name="email" :disabled="formData.templateType === 'sms'">
            <div class="content-editor-section">
              <el-form-item label="邮件主题">
                <el-input v-model="formData.emailSubject" placeholder="支持变量: {{变量名}}">
                  <template #append>
                    <el-dropdown trigger="click" @command="(cmd: string) => insertToField('emailSubject', cmd)">
                      <el-button :icon="CirclePlus">插入变量</el-button>
                      <template #dropdown>
                        <el-dropdown-menu>
                          <el-dropdown-item v-for="(desc, key) in formData.variables" :key="key" :command="String(key)">
                            <code>{{ key }}</code> - {{ desc }}
                          </el-dropdown-item>
                          <el-dropdown-item v-if="!formData.variables || Object.keys(formData.variables).length === 0" disabled>
                            请先在「基本信息」中选择变量
                          </el-dropdown-item>
                        </el-dropdown-menu>
                      </template>
                    </el-dropdown>
                  </template>
                </el-input>
              </el-form-item>

              <el-form-item label="邮件正文">
                <div style="width: 100%;">
                  <div class="editor-toolbar">
                    <el-dropdown trigger="click" @command="(cmd: string) => insertToField('emailContent', cmd)">
                      <el-button size="small" :icon="CirclePlus">插入变量</el-button>
                      <template #dropdown>
                        <el-dropdown-menu>
                          <el-dropdown-item v-for="(desc, key) in formData.variables" :key="key" :command="String(key)">
                            <code>{{ key }}</code> - {{ desc }}
                          </el-dropdown-item>
                          <el-dropdown-item v-if="!formData.variables || Object.keys(formData.variables).length === 0" disabled>
                            请先选择变量
                          </el-dropdown-item>
                        </el-dropdown-menu>
                      </template>
                    </el-dropdown>
                    <el-text type="info" size="small" style="margin-left: 8px;">支持HTML格式</el-text>
                  </div>
                  <el-input v-model="formData.emailContent" type="textarea" :rows="12" placeholder="邮件HTML内容，使用 {{变量名}} 引用变量" />
                </div>
              </el-form-item>
            </div>
          </el-tab-pane>

          <!-- Tab 3: 短信内容 -->
          <el-tab-pane label="短信内容" name="sms" :disabled="formData.templateType === 'email'">
            <div class="content-editor-section">
              <el-alert type="warning" :closable="false" style="margin-bottom: 16px;">
                <template #title>
                  <div>
                    <strong>重要提示：</strong>短信实际通过阿里云模板CODE发送，此处内容仅用于<strong>预览参考</strong>。
                    请确保变量与阿里云申请的模板一致。阿里云变量格式为 <code>${变量名}</code>，系统内使用 <code v-pre>{{变量名}}</code>。
                  </div>
                </template>
              </el-alert>

              <!-- 阿里云模板变量对照 -->
              <div v-if="currentAliyunTemplateInfo" class="aliyun-template-info">
                <div class="info-header">
                  <el-icon><InfoFilled /></el-icon>
                  <span>阿里云短信模板变量参考</span>
                </div>
                <div class="info-content">
                  {{ currentAliyunTemplateInfo }}
                </div>
              </div>

              <el-form-item label="短信内容">
                <div style="width: 100%;">
                  <div class="editor-toolbar">
                    <el-dropdown trigger="click" @command="(cmd: string) => insertToField('smsContent', cmd)">
                      <el-button size="small" :icon="CirclePlus">插入变量</el-button>
                      <template #dropdown>
                        <el-dropdown-menu>
                          <el-dropdown-item v-for="(desc, key) in formData.variables" :key="key" :command="String(key)">
                            <code>{{ key }}</code> - {{ desc }}
                          </el-dropdown-item>
                          <el-dropdown-item v-if="!formData.variables || Object.keys(formData.variables).length === 0" disabled>
                            请先选择变量
                          </el-dropdown-item>
                        </el-dropdown-menu>
                      </template>
                    </el-dropdown>
                    <el-text type="info" size="small" style="margin-left: 8px;">
                      字数：{{ (formData.smsContent || '').length }} / 500
                    </el-text>
                  </div>
                  <el-input
                    v-model="formData.smsContent"
                    type="textarea"
                    :rows="5"
                    maxlength="500"
                    show-word-limit
                    placeholder="短信内容预览，使用 {{变量名}} 引用"
                  />
                </div>
              </el-form-item>
            </div>
          </el-tab-pane>
        </el-tabs>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave" :loading="saving">
          <el-icon><Check /></el-icon> 保存
        </el-button>
      </template>
    </el-dialog>

    <!-- ================== 测试对话框 - 全新设计 ================== -->
    <el-dialog
      v-model="testDialogVisible"
      title="测试通知模板"
      width="1000px"
      :close-on-click-modal="false"
      top="3vh"
      destroy-on-close
    >
      <!-- 模板信息卡片 -->
      <div class="test-template-header">
        <div class="header-left">
          <el-tag type="primary" effect="dark" size="large">{{ currentTemplate.templateCode }}</el-tag>
          <span class="template-title">{{ currentTemplate.templateName }}</span>
        </div>
        <div class="header-right">
          <el-tag v-if="currentTemplate.templateType === 'email'" type="info">邮件</el-tag>
          <el-tag v-else-if="currentTemplate.templateType === 'sms'" type="warning">短信</el-tag>
          <el-tag v-else type="success">邮件+短信</el-tag>
        </div>
      </div>

      <!-- 左右分栏布局 -->
      <el-row :gutter="20" class="test-content">
        <!-- 左侧：输入区域 -->
        <el-col :span="12">
          <div class="test-input-panel">
            <!-- 收件人 -->
            <div class="panel-section">
              <div class="section-label">
                <el-icon><User /></el-icon> 收件人
              </div>
              <el-form :model="testForm" label-width="90px" size="default">
                <el-form-item v-if="currentTemplate.templateType !== 'sms'" label="邮箱">
                  <el-input v-model="testForm.recipientEmail" placeholder="test@example.com" />
                </el-form-item>
                <el-form-item v-if="currentTemplate.templateType !== 'email'" label="手机号">
                  <el-input v-model="testForm.recipientPhone" placeholder="13800138000" maxlength="11" />
                </el-form-item>
              </el-form>
            </div>

            <!-- 模板变量 -->
            <div class="panel-section">
              <div class="section-label" style="display: flex; justify-content: space-between; align-items: center;">
                <span><el-icon><EditPen /></el-icon> 模板变量</span>
                <el-button
                  v-if="currentTemplate.variables && Object.keys(currentTemplate.variables).length > 0"
                  type="primary"
                  size="small"
                  plain
                  @click="fillAllSampleValues"
                >
                  <el-icon><MagicStick /></el-icon> 一键填充
                </el-button>
              </div>

              <template v-if="currentTemplate.variables && Object.keys(currentTemplate.variables).length > 0">
                <div class="variable-input-list">
                  <div v-for="(desc, key) in currentTemplate.variables" :key="key" class="variable-input-item">
                    <div class="var-label">
                      <code>{{ key }}</code>
                      <span class="var-label-desc">{{ desc }}</span>
                      <el-icon
                        v-if="!testForm.variables[String(key)]"
                        class="var-status-empty"
                        title="未填写"
                      ><WarningFilled /></el-icon>
                      <el-icon
                        v-else
                        class="var-status-filled"
                        title="已填写"
                      ><CircleCheckFilled /></el-icon>
                    </div>
                    <el-input
                      v-model="testForm.variables[String(key)]"
                      :placeholder="getVariablePlaceholder(String(key))"
                      size="small"
                      @input="autoPreview"
                    >
                      <template #append>
                        <el-button size="small" @click="fillSampleValue(String(key))" title="填充示例值">
                          <el-icon><MagicStick /></el-icon>
                        </el-button>
                      </template>
                    </el-input>
                  </div>
                </div>
              </template>
              <el-empty v-else description="该模板无需变量" :image-size="40" />
            </div>
          </div>
        </el-col>

        <!-- 右侧：预览区域 -->
        <el-col :span="12">
          <div class="test-preview-panel">
            <div class="panel-section">
              <div class="section-label">
                <el-icon><View /></el-icon> 实时预览
              </div>

              <!-- 短信预览 - 手机模拟 -->
              <div v-if="currentTemplate.templateType !== 'email'" class="sms-phone-mockup">
                <div class="phone-header">
                  <span>短信预览</span>
                </div>
                <div class="phone-body">
                  <div class="sms-bubble" v-if="previewResult.smsContent">
                    {{ previewResult.smsContent }}
                  </div>
                  <div class="sms-bubble sms-placeholder" v-else>
                    {{ renderSmsPreview() || '填写变量后自动预览...' }}
                  </div>
                  <div class="sms-meta">
                    {{ (previewResult.smsContent || renderSmsPreview() || '').length }} / 500 字
                  </div>
                </div>
              </div>

              <!-- 邮件预览 -->
              <div v-if="currentTemplate.templateType !== 'sms'" class="email-preview-card">
                <div class="email-header-bar">
                  <el-icon><Message /></el-icon>
                  <span>邮件预览</span>
                </div>
                <div v-if="previewResult.emailSubject" class="email-subject-preview">
                  <strong>主题：</strong>{{ previewResult.emailSubject }}
                </div>
                <div
                  v-if="previewResult.emailContent"
                  class="email-body-preview"
                  v-html="previewResult.emailContent"
                ></div>
                <div v-else class="email-body-preview email-placeholder">
                  填写变量后点击「预览渲染」查看邮件效果...
                </div>
              </div>
            </div>
          </div>
        </el-col>
      </el-row>

      <template #footer>
        <div class="test-dialog-footer">
          <el-text type="info" size="small">
            <el-icon><InfoFilled /></el-icon>
            预览仅渲染变量，发送测试将实际发送邮件/短信
          </el-text>
          <div class="footer-actions">
            <el-button @click="testDialogVisible = false">关闭</el-button>
            <el-button type="primary" plain @click="handlePreview" :loading="previewing">
              <el-icon><View /></el-icon> 预览渲染
            </el-button>
            <el-button type="success" @click="handleSendTest" :loading="sending">
              <el-icon><Promotion /></el-icon> 发送测试
            </el-button>
          </div>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Search, Plus, Check, Message, EditPen, View, Promotion,
  MagicStick, Edit, Position, Delete, Connection, CirclePlus,
  InfoFilled, WarningFilled, CircleCheckFilled, User
} from '@element-plus/icons-vue';
import request from '@/api/request';

// ==================== 分类变量定义（与阿里云短信模板完全一致） ====================

const CATEGORY_VARIABLES: Record<string, Record<string, string>> = {
  account: {
    code: '验证码',
    tenantName: '租户名称',
    tenantCode: '租户编码',
    licenseKey: '授权码',
    adminPassword: '初始密码',
    packageName: '套餐名称',
    expireDate: '到期日期',
    reason: '原因说明',
    servicePhone: '客服电话',
    retentionDays: '数据保留天数',
    loginUrl: '登录链接（自动）',
  },
  payment: {
    tenantName: '租户名称',
    tenantCode: '租户编码',
    licenseKey: '授权码',
    adminPassword: '初始密码',
    orderNo: '订单号',
    amount: '支付金额',
    packageName: '套餐名称',
    expireDate: '到期日期',
    months: '续费月数',
    refundAmount: '退款金额',
    refundDays: '退款到账天数',
    servicePhone: '客服电话',
    loginUrl: '登录链接（自动）',
    renewUrl: '续费链接（自动）',
  },
  license: {
    tenantName: '租户名称',
    newPackageName: '新套餐名称',
    packageName: '套餐名称',
    maxUsers: '最大用户数',
    maxStorageGb: '存储空间(GB)',
    expireDate: '到期日期',
    remainDays: '剩余天数',
    servicePhone: '客服电话',
    renewUrl: '续费链接（自动）',
    loginUrl: '登录链接（自动）',
  },
};

// 变量示例值（与阿里云短信模板变量完全对应）
const VARIABLE_SAMPLES: Record<string, string> = {
  code: '123456',
  tenantName: '测试科技有限公司',
  tenantCode: 'ABC123',
  licenseKey: 'TENANT-A1B2-C3D4-E5F6',
  adminPassword: 'Abc12345',
  packageName: '专业版',
  expireDate: '2027-03-28',
  orderNo: 'PAY20260328120000ABC123',
  amount: '299',
  months: '12',
  newPackageName: '企业版',
  maxUsers: '50',
  maxStorageGb: '100',
  reason: '账号欠费',
  servicePhone: '4001234567',
  retentionDays: '30',
  refundAmount: '299',
  refundDays: '3',
  remainDays: '7',
  loginUrl: 'https://crm.yunkes.com',
  renewUrl: 'https://yunkes.com/pricing',
};

// 阿里云短信模板内容参考（用于编辑时展示）
const ALIYUN_SMS_CONTENT: Record<string, string> = {
  VERIFY_CODE: '变量: ${code} → 6位数字验证码',
  ACCOUNT_ACTIVATION: '变量: ${tenantName}, ${tenantCode}, ${licenseKey}, ${adminPassword}, ${packageName}, ${expireDate}',
  PAYMENT_ACTIVATION: '变量: ${tenantName}, ${orderNo}, ${amount}, ${tenantCode}, ${licenseKey}, ${adminPassword}, ${packageName}, ${expireDate}',
  RENEW_SUCCESS: '变量: ${tenantName}, ${months}, ${expireDate}',
  PACKAGE_CHANGE: '变量: ${tenantName}, ${newPackageName}, ${maxUsers}, ${maxStorageGb}',
  QUOTA_CHANGE: '变量: ${tenantName}, ${maxUsers}, ${maxStorageGb}',
  ACCOUNT_SUSPEND: '变量: ${tenantName}, ${reason}, ${servicePhone}',
  ACCOUNT_RESUME: '变量: ${tenantName}, ${expireDate}',
  ACCOUNT_CANCEL: '变量: ${tenantName}, ${retentionDays}, ${servicePhone}',
  REFUND_SUCCESS: '变量: ${tenantName}, ${refundAmount}, ${refundDays}, ${servicePhone}',
  EXPIRE_REMIND: '变量: ${tenantName}, ${expireDate}, ${remainDays}, ${servicePhone}',
  EXPIRED_NOTICE: '变量: ${tenantName}, ${expireDate}, ${servicePhone}',
};

// 模板CODE与短信配置KEY的映射
const SMS_KEY_MAPPING: Record<string, string> = {
  VERIFY_CODE: 'VERIFY_CODE',
  ACCOUNT_ACTIVATION: 'ACCOUNT_ACTIVATION',
  PAYMENT_ACTIVATION: 'PAYMENT_ACTIVATION',
  RENEW_SUCCESS: 'RENEW_SUCCESS',
  PACKAGE_CHANGE: 'PACKAGE_CHANGE',
  QUOTA_CHANGE: 'QUOTA_CHANGE',
  ACCOUNT_SUSPEND: 'ACCOUNT_SUSPEND',
  ACCOUNT_RESUME: 'ACCOUNT_RESUME',
  ACCOUNT_CANCEL: 'ACCOUNT_CANCEL',
  REFUND_SUCCESS: 'REFUND_SUCCESS',
  EXPIRE_REMIND: 'EXPIRE_REMIND',
  EXPIRED_NOTICE: 'EXPIRED_NOTICE',
};

// ==================== 预设场景模板（与阿里云12个短信模板一一对应） ====================

interface PresetTemplate {
  code: string;
  name: string;
  category: string;
  templateType: 'email' | 'sms' | 'both';
  scene: string;
  priority: string;
  variables: Record<string, string>;
  emailSubject: string;
  emailContent: string;
  smsContent: string;
}

const PRESET_TEMPLATES: PresetTemplate[] = [
  // ===== 账号管理类 =====
  {
    code: 'VERIFY_CODE',
    name: '① 注册验证码',
    category: 'account',
    templateType: 'sms',
    scene: '官网注册时发送手机验证码，验证用户手机号真实性',
    priority: 'urgent',
    variables: { code: '验证码' },
    emailSubject: '',
    emailContent: '',
    smsContent: '您的注册验证码是：{{code}}，5分钟内有效，请勿泄露给他人。',
  },
  {
    code: 'ACCOUNT_ACTIVATION',
    name: '② 账号开通通知（免费试用）',
    category: 'account',
    templateType: 'both',
    scene: '用户选择免费试用套餐完成注册后立即发送，包含登录所需全部信息',
    priority: 'high',
    variables: {
      tenantName: '租户名称', tenantCode: '租户编码', licenseKey: '授权码',
      adminPassword: '初始密码', packageName: '套餐名称', expireDate: '到期日期',
      loginUrl: '登录链接'
    },
    emailSubject: '云客CRM账号已开通 - {{tenantName}}',
    emailContent: '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">\n  <h2 style="color: #409eff;">🎉 云客CRM账号已开通</h2>\n  <p>尊敬的 <strong>{{tenantName}}</strong>，您好！</p>\n  <p>您的云客CRM账号已成功开通，以下是您的账号信息：</p>\n  <div style="background: #f0f9eb; padding: 16px; border-radius: 8px; margin: 16px 0; border: 1px solid #e1f3d8;">\n    <p style="margin: 8px 0;"><strong>租户编码：</strong>{{tenantCode}}</p>\n    <p style="margin: 8px 0;"><strong>授权码：</strong><code style="font-size: 16px; color: #67c23a;">{{licenseKey}}</code></p>\n    <p style="margin: 8px 0;"><strong>管理员账号：</strong>您的注册手机号</p>\n    <p style="margin: 8px 0;"><strong>初始密码：</strong><code>{{adminPassword}}</code></p>\n    <p style="margin: 8px 0;"><strong>套餐：</strong>{{packageName}}</p>\n    <p style="margin: 8px 0;"><strong>到期日期：</strong>{{expireDate}}</p>\n  </div>\n  <div style="text-align: center; margin: 24px 0;">\n    <a href="{{loginUrl}}" style="display: inline-block; padding: 12px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; text-decoration: none; border-radius: 6px; font-size: 15px; font-weight: 500;">立即登录系统</a>\n  </div>\n  <p style="color: #e6a23c;">⚠️ 请妥善保管以上信息，登录后请立即修改密码。</p>\n  <p style="color: #999; font-size: 12px;">此邮件由系统自动发送，请勿回复。</p>\n</div>',
    smsContent: '尊敬的{{tenantName}}，您的云客CRM账号已开通！授权码：{{licenseKey}}，管理员账号为您的手机号，初始密码：{{adminPassword}}，套餐：{{packageName}}，到期日期：{{expireDate}}。请妥善保管，登录后请修改密码。',
  },
  {
    code: 'ACCOUNT_SUSPEND',
    name: '③ 账号暂停通知',
    category: 'account',
    templateType: 'both',
    scene: '管理员在后台暂停租户授权时发送（欠费、违规等）',
    priority: 'high',
    variables: { tenantName: '租户名称', reason: '暂停原因', servicePhone: '客服电话' },
    emailSubject: '账号暂停通知 - {{tenantName}}',
    emailContent: '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">\n  <h2 style="color: #e6a23c;">⚠️ 账号暂停通知</h2>\n  <p>尊敬的 <strong>{{tenantName}}</strong>，您好！</p>\n  <p>您的云客CRM账号已被暂停使用。</p>\n  <div style="background: #fdf6ec; padding: 16px; border-radius: 8px; margin: 16px 0; border: 1px solid #faecd8;">\n    <p><strong>暂停原因：</strong>{{reason}}</p>\n  </div>\n  <p>如需恢复使用，请联系客服：<strong>{{servicePhone}}</strong></p>\n  <p style="color: #999; font-size: 12px;">此邮件由系统自动发送，请勿回复。</p>\n</div>',
    smsContent: '尊敬的{{tenantName}}，您的云客CRM账号已被暂停使用。暂停原因：{{reason}}。如需恢复使用，请联系客服：{{servicePhone}}。',
  },
  {
    code: 'ACCOUNT_RESUME',
    name: '④ 账号激活/解封通知',
    category: 'account',
    templateType: 'both',
    scene: '管理员在后台恢复被暂停的租户时发送',
    priority: 'normal',
    variables: { tenantName: '租户名称', expireDate: '到期日期' },
    emailSubject: '账号恢复通知 - {{tenantName}}',
    emailContent: '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">\n  <h2 style="color: #67c23a;">✅ 账号已恢复</h2>\n  <p>尊敬的 <strong>{{tenantName}}</strong>，您好！</p>\n  <p>您的云客CRM账号已恢复正常使用！</p>\n  <div style="background: #f0f9eb; padding: 16px; border-radius: 8px; margin: 16px 0; border: 1px solid #e1f3d8;">\n    <p><strong>到期日期：</strong>{{expireDate}}</p>\n  </div>\n  <p>感谢您的理解与支持！</p>\n  <p style="color: #999; font-size: 12px;">此邮件由系统自动发送，请勿回复。</p>\n</div>',
    smsContent: '尊敬的{{tenantName}}，您的云客CRM账号已恢复正常使用！到期日期：{{expireDate}}。感谢您的理解与支持！',
  },
  {
    code: 'ACCOUNT_CANCEL',
    name: '⑤ 账号注销通知',
    category: 'account',
    templateType: 'both',
    scene: '管理员在后台注销租户或租户主动申请注销时发送',
    priority: 'normal',
    variables: { tenantName: '租户名称', retentionDays: '数据保留天数', servicePhone: '客服电话' },
    emailSubject: '账号注销通知 - {{tenantName}}',
    emailContent: '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">\n  <h2 style="color: #f56c6c;">账号注销通知</h2>\n  <p>尊敬的 <strong>{{tenantName}}</strong>，您好！</p>\n  <p>您的云客CRM账号已注销。</p>\n  <div style="background: #fef0f0; padding: 16px; border-radius: 8px; margin: 16px 0; border: 1px solid #fde2e2;">\n    <p>注销后数据将保留 <strong>{{retentionDays}}</strong> 天，期间可联系客服恢复。</p>\n  </div>\n  <p>如有疑问请联系：<strong>{{servicePhone}}</strong></p>\n  <p style="color: #999; font-size: 12px;">此邮件由系统自动发送，请勿回复。</p>\n</div>',
    smsContent: '尊敬的{{tenantName}}，您的云客CRM账号已注销。注销后数据将保留{{retentionDays}}天，期间可联系客服恢复。如有疑问联系：{{servicePhone}}。',
  },

  // ===== 支付相关类 =====
  {
    code: 'PAYMENT_ACTIVATION',
    name: '⑥ 支付成功账号开通通知',
    category: 'payment',
    templateType: 'both',
    scene: '用户选择付费套餐，支付成功后发送（微信/支付宝/对公转账确认到账）',
    priority: 'high',
    variables: {
      tenantName: '租户名称', orderNo: '订单号', amount: '支付金额',
      tenantCode: '租户编码', licenseKey: '授权码', adminPassword: '初始密码',
      packageName: '套餐名称', expireDate: '到期日期', loginUrl: '登录链接'
    },
    emailSubject: '支付成功 - 云客CRM账号已开通 - {{tenantName}}',
    emailContent: '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">\n  <h2 style="color: #67c23a;">🎉 支付成功，账号已开通</h2>\n  <p>尊敬的 <strong>{{tenantName}}</strong>，您好！</p>\n  <p>您的订单已支付成功，账号已开通：</p>\n  <div style="background: #f0f9eb; padding: 16px; border-radius: 8px; margin: 16px 0; border: 1px solid #e1f3d8;">\n    <p style="margin: 8px 0;"><strong>订单号：</strong>{{orderNo}}</p>\n    <p style="margin: 8px 0;"><strong>支付金额：</strong>{{amount}}元</p>\n    <p style="margin: 8px 0;"><strong>租户编码：</strong>{{tenantCode}}</p>\n    <p style="margin: 8px 0;"><strong>授权码：</strong><code style="font-size: 16px; color: #67c23a;">{{licenseKey}}</code></p>\n    <p style="margin: 8px 0;"><strong>管理员账号：</strong>您的注册手机号</p>\n    <p style="margin: 8px 0;"><strong>初始密码：</strong><code>{{adminPassword}}</code></p>\n    <p style="margin: 8px 0;"><strong>套餐：</strong>{{packageName}}</p>\n    <p style="margin: 8px 0;"><strong>到期日期：</strong>{{expireDate}}</p>\n  </div>\n  <div style="text-align: center; margin: 24px 0;">\n    <a href="{{loginUrl}}" style="display: inline-block; padding: 12px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; text-decoration: none; border-radius: 6px; font-size: 15px; font-weight: 500;">立即登录系统</a>\n  </div>\n  <p style="color: #e6a23c;">⚠️ 请妥善保管账号信息，登录后请立即修改密码。</p>\n  <p style="color: #999; font-size: 12px;">此邮件由系统自动发送，请勿回复。</p>\n</div>',
    smsContent: '尊敬的{{tenantName}}，支付成功！订单号：{{orderNo}}，金额：{{amount}}元。授权码：{{licenseKey}}，管理员账号为您的手机号，初始密码：{{adminPassword}}，套餐：{{packageName}}，到期日期：{{expireDate}}。请登录后修改密码。',
  },
  {
    code: 'RENEW_SUCCESS',
    name: '⑦ 续期成功通知',
    category: 'payment',
    templateType: 'both',
    scene: '管理员在后台为租户续期或租户自助续费成功后发送',
    priority: 'normal',
    variables: { tenantName: '租户名称', months: '续期月数', expireDate: '新到期日期' },
    emailSubject: '续费成功 - {{tenantName}}',
    emailContent: '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">\n  <h2 style="color: #67c23a;">✅ 续费成功</h2>\n  <p>尊敬的 <strong>{{tenantName}}</strong>，您好！</p>\n  <p>您的账号已成功续期 <strong>{{months}}</strong> 个月！</p>\n  <div style="background: #f0f9eb; padding: 16px; border-radius: 8px; margin: 16px 0; border: 1px solid #e1f3d8;">\n    <p><strong>新的到期日期：</strong>{{expireDate}}</p>\n  </div>\n  <p>感谢您继续使用云客CRM，如有问题请联系客服。</p>\n  <p style="color: #999; font-size: 12px;">此邮件由系统自动发送，请勿回复。</p>\n</div>',
    smsContent: '尊敬的{{tenantName}}，您的账号已成功续期{{months}}个月！新的到期日期为：{{expireDate}}。感谢您继续使用云客CRM，如有问题请联系客服。',
  },
  {
    code: 'REFUND_SUCCESS',
    name: '⑧ 退款成功通知',
    category: 'payment',
    templateType: 'both',
    scene: '管理员处理退款申请或自动退款流程完成后发送',
    priority: 'high',
    variables: { tenantName: '租户名称', refundAmount: '退款金额', refundDays: '到账工作日', servicePhone: '客服电话' },
    emailSubject: '退款成功通知 - {{tenantName}}',
    emailContent: '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">\n  <h2 style="color: #409eff;">退款已处理</h2>\n  <p>尊敬的 <strong>{{tenantName}}</strong>，您好！</p>\n  <p>您的退款申请已处理完成：</p>\n  <div style="background: #f5f7fa; padding: 16px; border-radius: 8px; margin: 16px 0;">\n    <p><strong>退款金额：</strong>{{refundAmount}}元</p>\n    <p><strong>预计到账：</strong>{{refundDays}}个工作日内</p>\n  </div>\n  <p>如有疑问请联系客服：<strong>{{servicePhone}}</strong></p>\n  <p style="color: #999; font-size: 12px;">此邮件由系统自动发送，请勿回复。</p>\n</div>',
    smsContent: '尊敬的{{tenantName}}，您的退款申请已处理完成。退款金额：{{refundAmount}}元，预计{{refundDays}}个工作日内到账。如有疑问联系客服：{{servicePhone}}。',
  },

  // ===== 授权/套餐类 =====
  {
    code: 'PACKAGE_CHANGE',
    name: '⑨ 套餐变更通知',
    category: 'license',
    templateType: 'both',
    scene: '管理员在后台为租户变更套餐或租户自助升级/降级套餐后发送',
    priority: 'normal',
    variables: { tenantName: '租户名称', newPackageName: '新套餐名称', maxUsers: '最大用户数', maxStorageGb: '存储空间(GB)' },
    emailSubject: '套餐变更通知 - {{tenantName}}',
    emailContent: '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">\n  <h2 style="color: #409eff;">套餐变更通知</h2>\n  <p>尊敬的 <strong>{{tenantName}}</strong>，您好！</p>\n  <p>您的套餐已变更，详情如下：</p>\n  <div style="background: #ecf5ff; padding: 16px; border-radius: 8px; margin: 16px 0; border: 1px solid #d9ecff;">\n    <p><strong>新套餐：</strong>{{newPackageName}}</p>\n    <p><strong>最大用户数：</strong>{{maxUsers}}人</p>\n    <p><strong>存储空间：</strong>{{maxStorageGb}}GB</p>\n  </div>\n  <p>变更立即生效，感谢您的支持！</p>\n  <p style="color: #999; font-size: 12px;">此邮件由系统自动发送，请勿回复。</p>\n</div>',
    smsContent: '尊敬的{{tenantName}}，您的套餐已变更为：{{newPackageName}}，最大用户数：{{maxUsers}}人，存储空间：{{maxStorageGb}}GB。变更立即生效，感谢您的支持！',
  },
  {
    code: 'QUOTA_CHANGE',
    name: '⑩ 配额变更通知',
    category: 'license',
    templateType: 'both',
    scene: '管理员单独调整租户的用户数或存储空间限制时发送',
    priority: 'low',
    variables: { tenantName: '租户名称', maxUsers: '最大用户数', maxStorageGb: '存储空间(GB)' },
    emailSubject: '配额调整通知 - {{tenantName}}',
    emailContent: '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">\n  <h2 style="color: #409eff;">配额调整通知</h2>\n  <p>尊敬的 <strong>{{tenantName}}</strong>，您好！</p>\n  <p>您的账号配额已调整：</p>\n  <div style="background: #f5f7fa; padding: 16px; border-radius: 8px; margin: 16px 0;">\n    <p><strong>最大用户数：</strong>{{maxUsers}}人</p>\n    <p><strong>存储空间：</strong>{{maxStorageGb}}GB</p>\n  </div>\n  <p>调整立即生效，如有疑问请联系客服。</p>\n  <p style="color: #999; font-size: 12px;">此邮件由系统自动发送，请勿回复。</p>\n</div>',
    smsContent: '尊敬的{{tenantName}}，您的账号配额已调整：最大用户数{{maxUsers}}人，存储空间{{maxStorageGb}}GB。调整立即生效，如有疑问请联系客服。',
  },
  {
    code: 'EXPIRE_REMIND',
    name: '⑪ 账号到期提醒',
    category: 'license',
    templateType: 'both',
    scene: '到期前7天、3天、1天由定时任务自动发送提醒',
    priority: 'high',
    variables: { tenantName: '租户名称', expireDate: '到期日期', remainDays: '剩余天数', servicePhone: '客服电话', renewUrl: '续费链接' },
    emailSubject: '授权即将到期提醒 - {{tenantName}}',
    emailContent: '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">\n  <h2 style="color: #e6a23c;">⏰ 授权即将到期</h2>\n  <p>尊敬的 <strong>{{tenantName}}</strong>，您好！</p>\n  <p>您的云客CRM账号将在 <strong style="color: #f56c6c;">{{remainDays}}</strong> 天后到期。</p>\n  <div style="background: #fdf6ec; padding: 16px; border-radius: 8px; margin: 16px 0; border: 1px solid #faecd8;">\n    <p style="margin: 8px 0;"><strong>到期日期：</strong>{{expireDate}}</p>\n    <p style="margin: 8px 0;"><strong>剩余天数：</strong>{{remainDays}}天</p>\n  </div>\n  <div style="text-align: center; margin: 24px 0;">\n    <a href="{{renewUrl}}" style="display: inline-block; padding: 12px 40px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: #fff; text-decoration: none; border-radius: 6px; font-size: 15px; font-weight: 500;">立即续费</a>\n  </div>\n  <p>为避免影响使用，请及时续费。续费咨询：<strong>{{servicePhone}}</strong></p>\n  <p style="color: #999; font-size: 12px;">此邮件由系统自动发送，请勿回复。</p>\n</div>',
    smsContent: '尊敬的{{tenantName}}，您的云客CRM账号将于{{expireDate}}到期，剩余{{remainDays}}天。为避免影响使用，请及时续费。续费咨询：{{servicePhone}}。',
  },
  {
    code: 'EXPIRED_NOTICE',
    name: '⑫ 账号已过期通知',
    category: 'license',
    templateType: 'both',
    scene: '账号过期当天由定时任务检测到过期后发送',
    priority: 'urgent',
    variables: { tenantName: '租户名称', expireDate: '过期日期', servicePhone: '客服电话', renewUrl: '续费链接' },
    emailSubject: '授权已到期 - {{tenantName}}',
    emailContent: '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">\n  <h2 style="color: #f56c6c;">❌ 授权已到期</h2>\n  <p>尊敬的 <strong>{{tenantName}}</strong>，您好！</p>\n  <p>您的云客CRM账号已于 <strong>{{expireDate}}</strong> 过期，系统已停止服务。</p>\n  <div style="background: #fef0f0; padding: 16px; border-radius: 8px; margin: 16px 0; border: 1px solid #fde2e2;">\n    <p style="color: #f56c6c; margin: 8px 0;">服务已停止，请尽快续费以恢复使用。</p>\n  </div>\n  <div style="text-align: center; margin: 24px 0;">\n    <a href="{{renewUrl}}" style="display: inline-block; padding: 12px 40px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: #fff; text-decoration: none; border-radius: 6px; font-size: 15px; font-weight: 500;">立即续费</a>\n  </div>\n  <p>如需继续使用，请联系客服续费：<strong>{{servicePhone}}</strong></p>\n  <p style="color: #999; font-size: 12px;">此邮件由系统自动发送，请勿回复。</p>\n</div>',
    smsContent: '尊敬的{{tenantName}}，您的云客CRM账号已于{{expireDate}}过期，系统已停止服务。如需继续使用，请联系客服续费：{{servicePhone}}。',
  },
];

// 预设场景分组
const presetGroups = computed(() => [
  { label: '账号管理（5个）', options: PRESET_TEMPLATES.filter(p => p.category === 'account') },
  { label: '支付相关（3个）', options: PRESET_TEMPLATES.filter(p => p.category === 'payment') },
  { label: '授权/套餐（4个）', options: PRESET_TEMPLATES.filter(p => p.category === 'license') },
]);

// ==================== 数据 ====================
const loading = ref(false);
const templates = ref<any[]>([]);
const filterCategory = ref('');
const searchKeyword = ref('');

// 编辑对话框
const dialogVisible = ref(false);
const isEdit = ref(false);
const saving = ref(false);
const formRef = ref();
const selectedPreset = ref('');
const editActiveTab = ref('basic');

const formData = ref<any>({
  templateCode: '',
  templateName: '',
  templateType: 'both',
  category: 'account',
  scene: '',
  emailSubject: '',
  emailContent: '',
  smsContent: '',
  variables: {},
  variableDescription: '',
  isEnabled: 1,
  isSystem: 0,
  priority: 'normal',
  sendEmail: 1,
  sendSms: 1
});

const formRules = {
  templateCode: [{ required: true, message: '请输入模板代码', trigger: 'blur' }],
  templateName: [{ required: true, message: '请输入模板名称', trigger: 'blur' }],
  templateType: [{ required: true, message: '请选择通知类型', trigger: 'change' }],
  category: [{ required: true, message: '请选择业务分类', trigger: 'change' }],
  scene: [{ required: true, message: '请输入使用场景', trigger: 'blur' }]
};

// 测试对话框
const testDialogVisible = ref(false);
const currentTemplate = ref<any>({});
const testForm = ref<any>({
  recipientEmail: '',
  recipientPhone: '',
  variables: {}
});
const previewResult = ref<any>({});
const previewing = ref(false);
const sending = ref(false);
let previewTimer: any = null;

// ==================== 计算属性 ====================
const filteredTemplates = computed(() => {
  let result = templates.value;
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase();
    result = result.filter(t =>
      t.templateCode.toLowerCase().includes(keyword) ||
      t.templateName.toLowerCase().includes(keyword)
    );
  }
  return result;
});

const availableVariables = computed(() => {
  const category = formData.value.category;
  return CATEGORY_VARIABLES[category] || {};
});

const currentAliyunTemplateInfo = computed(() => {
  const code = formData.value.templateCode;
  return ALIYUN_SMS_CONTENT[code] || '';
});

// ==================== 工具方法 ====================
const getCategoryName = (category: string) => {
  const map: Record<string, string> = { account: '账号管理', payment: '支付相关', license: '授权/套餐' };
  return map[category] || category;
};

const getCategoryTagType = (category: string) => {
  const map: Record<string, string> = { account: '', payment: 'warning', license: 'success' };
  return map[category] || 'info';
};

const getSmsKeyMapping = (code: string): string => {
  return SMS_KEY_MAPPING[code] || '';
};

const isVariableSelected = (key: string) => {
  return formData.value.variables && key in formData.value.variables;
};

const toggleVariable = (key: string, desc: string) => {
  if (!formData.value.variables) formData.value.variables = {};
  if (key in formData.value.variables) {
    const newVars = { ...formData.value.variables };
    delete newVars[key];
    formData.value.variables = newVars;
  } else {
    formData.value.variables = { ...formData.value.variables, [key]: desc };
  }
};

const removeVariable = (key: string) => {
  const newVars = { ...formData.value.variables };
  delete newVars[key];
  formData.value.variables = newVars;
};

const copyVariable = (key: string) => {
  const varStr = `{{${key}}}`;
  navigator.clipboard.writeText(varStr).then(() => {
    ElMessage.success(`已复制 ${varStr}`);
  }).catch(() => {
    ElMessage.info(`请手动输入 ${varStr}`);
  });
};

const insertToField = (field: string, key: string) => {
  const varStr = `{{${key}}}`;
  formData.value[field] = (formData.value[field] || '') + varStr;
};

const onCategoryChange = () => {
  if (!isEdit.value) {
    formData.value.variables = {};
  }
};

const applyPreset = (code: string) => {
  const preset = PRESET_TEMPLATES.find(p => p.code === code);
  if (!preset) return;

  const existing = templates.value.find(t => t.templateCode === preset.code);
  if (existing) {
    ElMessage.warning(`模板代码 ${preset.code} 已存在，将仅填充内容`);
  }

  formData.value.templateCode = preset.code;
  formData.value.templateName = preset.name.replace(/^[①②③④⑤⑥⑦⑧⑨⑩⑪⑫]\s*/, '');
  formData.value.category = preset.category;
  formData.value.templateType = preset.templateType;
  formData.value.scene = preset.scene;
  formData.value.priority = preset.priority;
  formData.value.variables = { ...preset.variables };
  formData.value.emailSubject = preset.emailSubject;
  formData.value.emailContent = preset.emailContent;
  formData.value.smsContent = preset.smsContent;
  formData.value.sendEmail = preset.templateType !== 'sms' ? 1 : 0;
  formData.value.sendSms = preset.templateType !== 'email' ? 1 : 0;

  ElMessage.success(`已应用预设: ${preset.name}`);
};

// 变量示例值相关
const getVariablePlaceholder = (key: string): string => {
  return VARIABLE_SAMPLES[key] ? `示例: ${VARIABLE_SAMPLES[key]}` : `请输入${key}的值`;
};

const fillSampleValue = (key: string) => {
  if (VARIABLE_SAMPLES[key]) {
    testForm.value.variables[key] = VARIABLE_SAMPLES[key];
    autoPreview();
  }
};

const fillAllSampleValues = () => {
  if (currentTemplate.value.variables) {
    const vars: Record<string, string> = {};
    for (const key of Object.keys(currentTemplate.value.variables)) {
      vars[key] = VARIABLE_SAMPLES[key] || `测试${key}`;
    }
    testForm.value.variables = vars;
    autoPreview();
  }
  ElMessage.success('已填充所有示例值');
};

// 自动预览（客户端渲染）
const renderSmsPreview = (): string => {
  if (!currentTemplate.value.smsContent) return '';
  let content = currentTemplate.value.smsContent;
  const vars = testForm.value.variables || {};
  Object.keys(vars).forEach(key => {
    if (vars[key]) {
      content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), vars[key]);
    }
  });
  return content;
};

const autoPreview = () => {
  if (previewTimer) clearTimeout(previewTimer);
  previewTimer = setTimeout(() => {
    const sms = renderSmsPreview();
    if (sms) {
      previewResult.value = { ...previewResult.value, smsContent: sms };
    }
  }, 300);
};

// ==================== CRUD 操作 ====================
const loadTemplates = async () => {
  loading.value = true;
  try {
    const params: any = {};
    if (filterCategory.value) params.category = filterCategory.value;
    const res = await request.get('/notification-templates', { params });
    if (res.success) {
      templates.value = res.data;
    }
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '加载失败');
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => { /* 搜索由计算属性自动处理 */ };

const handleCreate = () => {
  isEdit.value = false;
  selectedPreset.value = '';
  editActiveTab.value = 'basic';
  formData.value = {
    templateCode: '', templateName: '', templateType: 'both', category: 'account',
    scene: '', emailSubject: '', emailContent: '', smsContent: '',
    variables: {}, variableDescription: '', isEnabled: 1, isSystem: 0,
    priority: 'normal', sendEmail: 1, sendSms: 1
  };
  dialogVisible.value = true;
};

const handleEdit = (row: any) => {
  isEdit.value = true;
  selectedPreset.value = '';
  editActiveTab.value = 'basic';
  formData.value = { ...row, variables: row.variables ? { ...row.variables } : {} };
  dialogVisible.value = true;
};

const handleSave = async () => {
  try {
    await formRef.value.validate();
    saving.value = true;

    formData.value.sendEmail = formData.value.templateType !== 'sms' ? 1 : 0;
    formData.value.sendSms = formData.value.templateType !== 'email' ? 1 : 0;

    if (formData.value.variables && Object.keys(formData.value.variables).length > 0) {
      formData.value.variableDescription = Object.entries(formData.value.variables)
        .map(([k, v]) => `{{${k}}} - ${v}`)
        .join('\n');
    }

    if (isEdit.value) {
      await request.put(`/notification-templates/${formData.value.templateCode}`, formData.value);
      ElMessage.success('更新成功');
    } else {
      await request.post('/notification-templates', formData.value);
      ElMessage.success('创建成功');
    }
    dialogVisible.value = false;
    loadTemplates();
  } catch (error: any) {
    if (error.response) {
      ElMessage.error(error.response.data?.message || '保存失败');
    }
  } finally {
    saving.value = false;
  }
};

const handleToggleStatus = async (row: any) => {
  try {
    await request.put(`/notification-templates/${row.templateCode}`, { isEnabled: row.isEnabled });
    ElMessage.success('状态更新成功');
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '更新失败');
    row.isEnabled = row.isEnabled === 1 ? 0 : 1;
  }
};

const handleDelete = async (row: any) => {
  try {
    await ElMessageBox.confirm('确定要删除这个模板吗？删除后不可恢复。', '删除确认', { type: 'warning' });
    await request.delete(`/notification-templates/${row.templateCode}`);
    ElMessage.success('删除成功');
    loadTemplates();
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.response?.data?.message || '删除失败');
    }
  }
};

// ==================== 测试 ====================
const handleTest = (row: any) => {
  currentTemplate.value = row;
  testForm.value = { recipientEmail: '', recipientPhone: '', variables: {} };
  previewResult.value = {};
  testDialogVisible.value = true;
};

const handlePreview = async () => {
  previewing.value = true;
  try {
    const res = await request.post(
      `/notification-templates/${currentTemplate.value.templateCode}/test`,
      { variables: testForm.value.variables }
    );
    if (res.success) {
      previewResult.value = res.data;
      ElMessage.success('预览渲染成功');
    }
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '预览失败');
  } finally {
    previewing.value = false;
  }
};

const handleSendTest = async () => {
  const tplType = currentTemplate.value.templateType;
  if (tplType !== 'sms' && !testForm.value.recipientEmail) {
    ElMessage.warning('请填写收件邮箱');
    return;
  }
  if (tplType !== 'email' && !testForm.value.recipientPhone) {
    ElMessage.warning('请填写收件手机号');
    return;
  }

  // 检查是否填写了变量
  if (currentTemplate.value.variables) {
    const emptyVars = Object.keys(currentTemplate.value.variables).filter(k => !testForm.value.variables[k]);
    if (emptyVars.length > 0) {
      try {
        await ElMessageBox.confirm(
          `以下变量未填写：${emptyVars.join(', ')}，发送后这些位置将显示为空。确定继续发送吗？`,
          '变量未完全填写',
          { type: 'warning' }
        );
      } catch { return; }
    }
  }

  const confirmLines = [];
  if (tplType !== 'sms') confirmLines.push(`📧 邮件 → ${testForm.value.recipientEmail}`);
  if (tplType !== 'email') confirmLines.push(`📱 短信 → ${testForm.value.recipientPhone}`);

  try {
    await ElMessageBox.confirm(
      `确定发送测试通知？\n${confirmLines.join('\n')}`,
      '发送确认',
      { type: 'info' }
    );

    sending.value = true;
    const res = await request.post(
      `/notification-templates/${currentTemplate.value.templateCode}/send`,
      {
        variables: testForm.value.variables,
        options: {
          priority: 'normal',
          emailTo: testForm.value.recipientEmail || undefined,
          smsTo: testForm.value.recipientPhone || undefined,
          to: testForm.value.recipientEmail || testForm.value.recipientPhone
        }
      }
    );

    if (res.success) {
      ElMessage.success(res.message || '发送成功');
    } else {
      ElMessage.warning(res.message || '发送可能未完全成功，请检查配置');
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.response?.data?.message || '发送失败，请检查服务配置');
    }
  } finally {
    sending.value = false;
  }
};

// ==================== 生命周期 ====================
onMounted(() => {
  loadTemplates();
});
</script>

<style scoped lang="scss">
.notification-templates {
  .toolbar {
    margin-bottom: 8px;
  }

  // ===== 编辑弹窗样式 =====
  .variable-selector {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .variable-check-tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
    transition: all 0.2s;

    code {
      font-weight: 600;
      font-size: 12px;
    }

    .var-desc {
      color: #909399;
      font-size: 12px;
    }

    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
    }
  }

  .selected-variables {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .selected-var-tag {
    code {
      font-weight: 600;
      margin-right: 4px;
    }
  }

  .content-editor-section {
    padding: 8px 0;
  }

  .editor-toolbar {
    display: flex;
    align-items: center;
    margin-bottom: 8px;
  }

  .aliyun-template-info {
    background: #f0f9eb;
    border: 1px solid #e1f3d8;
    border-radius: 8px;
    padding: 12px 16px;
    margin-bottom: 16px;

    .info-header {
      font-weight: 600;
      color: #67c23a;
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 6px;
      font-size: 13px;
    }

    .info-content {
      font-size: 13px;
      color: #606266;
      font-family: monospace;
    }
  }

  // ===== 测试弹窗样式 =====
  .test-template-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: #f5f7fa;
    border-radius: 8px;
    margin-bottom: 16px;

    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .template-title {
      font-size: 16px;
      font-weight: 600;
      color: #303133;
    }
  }

  .test-content {
    min-height: 400px;
  }

  .test-input-panel,
  .test-preview-panel {
    height: 100%;
  }

  .panel-section {
    margin-bottom: 16px;

    .section-label {
      font-weight: 600;
      color: #303133;
      margin-bottom: 12px;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 6px;
      padding-bottom: 8px;
      border-bottom: 1px solid #ebeef5;
    }
  }

  .variable-input-list {
    max-height: 360px;
    overflow-y: auto;
    padding-right: 4px;
  }

  .variable-input-item {
    margin-bottom: 10px;

    .var-label {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 4px;
      font-size: 12px;

      code {
        font-weight: 600;
        color: #409eff;
        background: #ecf5ff;
        padding: 1px 6px;
        border-radius: 3px;
      }

      .var-label-desc {
        color: #909399;
      }

      .var-status-empty {
        color: #e6a23c;
        font-size: 14px;
      }

      .var-status-filled {
        color: #67c23a;
        font-size: 14px;
      }
    }
  }

  // 短信手机模拟
  .sms-phone-mockup {
    border: 2px solid #dcdfe6;
    border-radius: 16px;
    overflow: hidden;
    margin-bottom: 16px;
    background: #fff;

    .phone-header {
      background: linear-gradient(135deg, #409eff, #337ecc);
      color: white;
      padding: 10px 16px;
      font-size: 14px;
      font-weight: 600;
      text-align: center;
    }

    .phone-body {
      padding: 16px;
      min-height: 120px;
      background: #f5f7fa;
    }

    .sms-bubble {
      background: white;
      padding: 12px 16px;
      border-radius: 0 12px 12px 12px;
      font-size: 14px;
      line-height: 1.6;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
      word-break: break-all;
    }

    .sms-placeholder {
      color: #c0c4cc;
      font-style: italic;
    }

    .sms-meta {
      text-align: right;
      font-size: 12px;
      color: #909399;
      margin-top: 8px;
    }
  }

  // 邮件预览卡片
  .email-preview-card {
    border: 1px solid #dcdfe6;
    border-radius: 8px;
    overflow: hidden;

    .email-header-bar {
      background: #f5f7fa;
      padding: 10px 16px;
      font-size: 14px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 6px;
      color: #606266;
      border-bottom: 1px solid #ebeef5;
    }

    .email-subject-preview {
      padding: 10px 16px;
      font-size: 13px;
      border-bottom: 1px solid #ebeef5;
      background: #fafafa;
    }

    .email-body-preview {
      padding: 16px;
      max-height: 300px;
      overflow-y: auto;
      font-size: 14px;
      line-height: 1.6;
    }

    .email-placeholder {
      color: #c0c4cc;
      font-style: italic;
      text-align: center;
      padding: 40px 16px;
    }
  }

  .test-dialog-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;

    .footer-actions {
      display: flex;
      gap: 8px;
    }
  }
}
</style>
