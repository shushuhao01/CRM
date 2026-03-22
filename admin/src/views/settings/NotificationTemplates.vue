<template>
  <div class="notification-templates">
    <el-card>
      <!-- 顶部操作栏 -->
      <el-row :gutter="20" class="toolbar">
        <el-col :span="6">
          <el-select v-model="filterCategory" placeholder="选择分类" @change="loadTemplates" clearable>
            <el-option label="全部分类" value="" />
            <el-option label="租户注册" value="tenant" />
            <el-option label="支付相关" value="payment" />
            <el-option label="授权码" value="license" />
          </el-select>
        </el-col>
        <el-col :span="12">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索模板名称或代码"
            clearable
            @input="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-col>
        <el-col :span="6" style="text-align: right;">
          <el-button type="primary" @click="handleCreate">
            <el-icon><Plus /></el-icon>
            新建模板
          </el-button>
        </el-col>
      </el-row>

      <!-- 模板列表 -->
      <el-table
        :data="filteredTemplates"
        border
        style="margin-top: 20px;"
        v-loading="loading"
      >
        <el-table-column prop="templateCode" label="模板代码" width="180" />
        <el-table-column prop="templateName" label="模板名称" width="200" />
        <el-table-column prop="category" label="分类" width="120">
          <template #default="{ row }">
            <el-tag>{{ getCategoryName(row.category) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="templateType" label="类型" width="120">
          <template #default="{ row }">
            <el-tag v-if="row.templateType === 'email'" type="info">邮件</el-tag>
            <el-tag v-else-if="row.templateType === 'sms'" type="warning">短信</el-tag>
            <el-tag v-else type="success">邮件+短信</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="scene" label="使用场景" min-width="150" show-overflow-tooltip />
        <el-table-column prop="isEnabled" label="状态" width="100">
          <template #default="{ row }">
            <el-switch
              v-model="row.isEnabled"
              :active-value="1"
              :inactive-value="0"
              @change="handleToggleStatus(row)"
            />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button size="small" type="success" @click="handleTest(row)">测试</el-button>
            <el-button
              size="small"
              type="danger"
              @click="handleDelete(row)"
              :disabled="row.isSystem === 1"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 编辑/新建对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑模板' : '新建模板'"
      width="80%"
      :close-on-click-modal="false"
      top="3vh"
    >
      <el-form :model="formData" label-width="120px" :rules="formRules" ref="formRef">
        <!-- 快捷选择场景（仅新建时显示） -->
        <el-form-item v-if="!isEdit" label="快捷场景">
          <el-select
            v-model="selectedPreset"
            placeholder="选择预设场景自动填充模板"
            @change="applyPreset"
            style="width: 100%;"
            clearable
          >
            <el-option-group v-for="group in presetGroups" :key="group.label" :label="group.label">
              <el-option
                v-for="preset in group.options"
                :key="preset.code"
                :label="preset.name"
                :value="preset.code"
              >
                <span>{{ preset.name }}</span>
                <span style="color: #999; font-size: 12px; margin-left: 8px;">{{ preset.code }}</span>
              </el-option>
            </el-option-group>
          </el-select>
        </el-form-item>

        <el-form-item label="模板代码" prop="templateCode">
          <el-input
            v-model="formData.templateCode"
            :disabled="formData.isSystem === 1 || isEdit"
            placeholder="如: tenant_register_success"
          />
        </el-form-item>

        <el-form-item label="模板名称" prop="templateName">
          <el-input v-model="formData.templateName" placeholder="如: 租户注册成功" />
        </el-form-item>

        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="模板类型" prop="templateType">
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
                <el-option label="租户注册" value="tenant" />
                <el-option label="支付相关" value="payment" />
                <el-option label="授权码" value="license" />
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
          <el-input v-model="formData.scene" placeholder="如: 租户注册成功后发送欢迎邮件和短信" />
        </el-form-item>

        <!-- 可用变量管理 -->
        <el-divider content-position="left">可用变量</el-divider>

        <el-form-item label="选择变量">
          <div class="variable-selector">
            <el-tag
              v-for="(desc, key) in availableVariables"
              :key="key"
              :type="isVariableSelected(key as string) ? 'success' : 'info'"
              :effect="isVariableSelected(key as string) ? 'dark' : 'plain'"
              class="variable-tag"
              @click="toggleVariable(key as string, desc as string)"
              style="cursor: pointer;"
            >
              <el-icon v-if="isVariableSelected(key as string)"><Check /></el-icon>
              {{ key }}: {{ desc }}
            </el-tag>
          </div>
          <div class="form-tip" style="margin-top: 8px;">点击标签选择/取消变量，在内容中使用 <code v-pre>{{变量名}}</code> 引用</div>
        </el-form-item>

        <el-form-item label="已选变量">
          <div v-if="formData.variables && Object.keys(formData.variables).length > 0" class="variables-display">
            <el-tag
              v-for="(desc, key) in formData.variables"
              :key="key"
              closable
              @close="removeVariable(key as string)"
              style="margin: 4px;"
              type="success"
            >
              <span @click="insertVariable(key as string)" style="cursor: pointer;" title="点击复制变量">
                <span v-text="'\u007B\u007B' + key + '\u007D\u007D'"></span> - {{ desc }}
              </span>
            </el-tag>
          </div>
          <el-text v-else type="info">请从上方选择变量</el-text>
        </el-form-item>

        <!-- 邮件配置 -->
        <el-divider content-position="left" v-if="formData.templateType !== 'sms'">邮件配置</el-divider>

        <template v-if="formData.templateType !== 'sms'">
          <el-form-item label="邮件主题">
            <el-input v-model="formData.emailSubject" placeholder="支持变量: {{变量名}}">
              <template #append>
                <el-dropdown trigger="click" @command="(cmd: string) => insertToField('emailSubject', cmd)">
                  <el-button>插入变量</el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item
                        v-for="(desc, key) in formData.variables"
                        :key="key"
                        :command="key as string"
                      >{{ key }} - {{ desc }}</el-dropdown-item>
                      <el-dropdown-item v-if="!formData.variables || Object.keys(formData.variables).length === 0" disabled>
                        请先选择变量
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </template>
            </el-input>
          </el-form-item>

          <el-form-item label="邮件内容">
            <div style="width: 100%;">
              <div style="margin-bottom: 8px;">
                <el-dropdown trigger="click" @command="(cmd: string) => insertToField('emailContent', cmd)">
                  <el-button size="small">插入变量</el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item
                        v-for="(desc, key) in formData.variables"
                        :key="key"
                        :command="key as string"
                      >{{ key }} - {{ desc }}</el-dropdown-item>
                      <el-dropdown-item v-if="!formData.variables || Object.keys(formData.variables).length === 0" disabled>
                        请先选择变量
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
              <el-input
                v-model="formData.emailContent"
                type="textarea"
                :rows="10"
                placeholder="支持HTML和变量: {{变量名}}"
              />
            </div>
          </el-form-item>
        </template>

        <!-- 短信配置 -->
        <el-divider content-position="left" v-if="formData.templateType !== 'email'">短信配置</el-divider>

        <template v-if="formData.templateType !== 'email'">
          <el-form-item label="短信内容">
            <div style="width: 100%;">
              <div style="margin-bottom: 8px;">
                <el-dropdown trigger="click" @command="(cmd: string) => insertToField('smsContent', cmd)">
                  <el-button size="small">插入变量</el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item
                        v-for="(desc, key) in formData.variables"
                        :key="key"
                        :command="key as string"
                      >{{ key }} - {{ desc }}</el-dropdown-item>
                      <el-dropdown-item v-if="!formData.variables || Object.keys(formData.variables).length === 0" disabled>
                        请先选择变量
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
              <el-input
                v-model="formData.smsContent"
                type="textarea"
                :rows="3"
                maxlength="500"
                show-word-limit
                placeholder="支持变量: {{变量名}}，建议70字以内"
              />
            </div>
          </el-form-item>
        </template>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave" :loading="saving">保存</el-button>
      </template>
    </el-dialog>

    <!-- 测试对话框 - 优化版 -->
    <el-dialog
      v-model="testDialogVisible"
      title="测试通知模板"
      width="75%"
      :close-on-click-modal="false"
      top="3vh"
    >
      <!-- 模板基本信息 -->
      <el-descriptions :column="3" border size="small" style="margin-bottom: 20px;">
        <el-descriptions-item label="模板代码">{{ currentTemplate.templateCode }}</el-descriptions-item>
        <el-descriptions-item label="模板名称">{{ currentTemplate.templateName }}</el-descriptions-item>
        <el-descriptions-item label="模板类型">
          <el-tag v-if="currentTemplate.templateType === 'email'" type="info" size="small">邮件</el-tag>
          <el-tag v-else-if="currentTemplate.templateType === 'sms'" type="warning" size="small">短信</el-tag>
          <el-tag v-else type="success" size="small">邮件+短信</el-tag>
        </el-descriptions-item>
      </el-descriptions>

      <el-form :model="testForm" label-width="140px" :rules="testFormRules" ref="testFormRef">
        <!-- 收件人信息 -->
        <el-divider content-position="left">
          <el-icon><Message /></el-icon> 收件人信息
        </el-divider>

        <el-form-item
          v-if="currentTemplate.templateType !== 'sms'"
          label="收件邮箱"
          prop="recipientEmail"
        >
          <el-input
            v-model="testForm.recipientEmail"
            placeholder="请输入测试收件邮箱，如 test@example.com"
          />
        </el-form-item>

        <el-form-item
          v-if="currentTemplate.templateType !== 'email'"
          label="收件手机号"
          prop="recipientPhone"
        >
          <el-input
            v-model="testForm.recipientPhone"
            placeholder="请输入测试手机号，如 13800138000"
            maxlength="11"
          />
        </el-form-item>

        <!-- 模板变量 -->
        <el-divider content-position="left">
          <el-icon><EditPen /></el-icon> 模板变量
        </el-divider>

        <template v-if="currentTemplate.variables && Object.keys(currentTemplate.variables).length > 0">
          <el-form-item
            v-for="(desc, key) in currentTemplate.variables"
            :key="key"
            :label="String(desc)"
          >
            <el-input
              v-model="testForm.variables[key as string]"
              :placeholder="getVariablePlaceholder(key as string)"
            >
              <template #append>
                <el-button @click="fillSampleValue(key as string)" title="填充示例值">示例</el-button>
              </template>
            </el-input>
          </el-form-item>
          <el-form-item>
            <el-button type="info" plain size="small" @click="fillAllSampleValues">
              <el-icon><MagicStick /></el-icon> 一键填充示例值
            </el-button>
          </el-form-item>
        </template>
        <el-alert v-else type="info" :closable="false" style="margin-bottom: 16px;">
          该模板没有定义变量，将直接使用原始模板内容
        </el-alert>
      </el-form>

      <!-- 预览效果 -->
      <el-divider content-position="left">
        <el-icon><View /></el-icon> 预览效果
      </el-divider>

      <div v-if="previewResult.emailSubject || previewResult.smsContent" class="preview-result">
        <div v-if="previewResult.emailSubject" class="email-preview">
          <h4><el-icon><Message /></el-icon> 邮件主题</h4>
          <div class="preview-box">{{ previewResult.emailSubject }}</div>

          <h4><el-icon><Document /></el-icon> 邮件内容</h4>
          <div class="preview-box email-content" v-html="previewResult.emailContent"></div>
        </div>

        <div v-if="previewResult.smsContent" class="sms-preview">
          <h4><el-icon><ChatDotRound /></el-icon> 短信内容</h4>
          <div class="preview-box sms-box">
            {{ previewResult.smsContent }}
            <div class="sms-count">{{ previewResult.smsContent?.length || 0 }} / 500 字</div>
          </div>
        </div>
      </div>
      <el-empty v-else description="点击「预览」按钮查看渲染效果" :image-size="60" />

      <template #footer>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <el-text type="info" size="small">预览仅渲染模板变量，发送测试将实际发送邮件/短信</el-text>
          </div>
          <div>
            <el-button @click="testDialogVisible = false">关闭</el-button>
            <el-button type="primary" @click="handlePreview" :loading="previewing">
              <el-icon><View /></el-icon> 预览
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
  Document, ChatDotRound, MagicStick
} from '@element-plus/icons-vue';
import request from '@/api/request';

// ==================== 预设场景定义 ====================

// 按分类预设的变量集合
const CATEGORY_VARIABLES: Record<string, Record<string, string>> = {
  tenant: {
    tenantName: '租户名称',
    contactPerson: '联系人',
    contactEmail: '联系邮箱',
    contactPhone: '联系电话',
    companyName: '公司名称',
    packageName: '套餐名称',
    expiryDate: '到期日期',
    loginUrl: '登录地址',
    accountId: '账号ID',
    crmUrl: 'CRM系统地址',
    websiteUrl: '官网地址',
  },
  payment: {
    tenantName: '租户名称',
    contactPerson: '联系人',
    contactEmail: '联系邮箱',
    orderNo: '订单编号',
    packageName: '套餐名称',
    amount: '支付金额',
    paymentMethod: '支付方式',
    paymentTime: '支付时间',
    expiryDate: '到期日期',
    refundAmount: '退款金额',
    refundReason: '退款原因',
    renewalPeriod: '续费周期',
    websiteUrl: '官网地址',
  },
  license: {
    tenantName: '租户名称',
    contactPerson: '联系人',
    contactEmail: '联系邮箱',
    licenseKey: '授权码',
    licenseType: '授权类型',
    expiryDate: '到期日期',
    remainingDays: '剩余天数',
    maxUsers: '最大用户数',
    packageName: '套餐名称',
    websiteUrl: '官网地址',
  }
};

// 变量示例值
const VARIABLE_SAMPLES: Record<string, string> = {
  tenantName: '测试企业科技有限公司',
  contactPerson: '张三',
  contactEmail: 'zhangsan@example.com',
  contactPhone: '13800138000',
  companyName: '测试企业科技有限公司',
  packageName: '专业版',
  expiryDate: '2026-12-31',
  loginUrl: 'https://crm.example.com/login',
  accountId: 'T20260319001',
  crmUrl: 'https://crm.example.com',
  websiteUrl: 'https://www.example.com',
  orderNo: 'ORD20260319001',
  amount: '¥2,999.00',
  paymentMethod: '微信支付',
  paymentTime: '2026-03-19 14:30:00',
  refundAmount: '¥2,999.00',
  refundReason: '客户申请退款',
  renewalPeriod: '1年',
  licenseKey: 'XXXX-XXXX-XXXX-XXXX',
  licenseType: '企业版',
  remainingDays: '7',
  maxUsers: '50',
};

// 预设场景模板
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
  {
    code: 'tenant_register_success',
    name: '租户注册成功',
    category: 'tenant',
    templateType: 'both',
    scene: '租户注册成功后发送欢迎邮件和短信',
    priority: 'high',
    variables: { tenantName: '租户名称', contactPerson: '联系人', contactEmail: '联系邮箱', packageName: '套餐名称', loginUrl: '登录地址' },
    emailSubject: '欢迎注册 - {{tenantName}}',
    emailContent: '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">\n  <h2 style="color: #409eff;">欢迎使用CRM系统</h2>\n  <p>尊敬的 {{contactPerson}}，您好！</p>\n  <p>恭喜您的企业 <strong>{{tenantName}}</strong> 已成功注册CRM系统。</p>\n  <div style="background: #f5f7fa; padding: 16px; border-radius: 8px; margin: 16px 0;">\n    <p><strong>套餐信息：</strong>{{packageName}}</p>\n    <p><strong>登录地址：</strong><a href="{{loginUrl}}">{{loginUrl}}</a></p>\n    <p><strong>账号邮箱：</strong>{{contactEmail}}</p>\n  </div>\n  <p>如有任何问题，请联系我们的客服团队。</p>\n  <p style="color: #999; font-size: 12px;">此邮件由系统自动发送，请勿回复。</p>\n</div>',
    smsContent: '【CRM系统】尊敬的{{contactPerson}}，您的企业{{tenantName}}已成功注册，套餐：{{packageName}}，请登录系统开始使用。',
  },
  {
    code: 'tenant_activated',
    name: '账号激活成功',
    category: 'tenant',
    templateType: 'both',
    scene: '账号激活成功后通知',
    priority: 'normal',
    variables: { tenantName: '租户名称', contactPerson: '联系人', packageName: '套餐名称', loginUrl: '登录地址' },
    emailSubject: '账号已激活 - {{tenantName}}',
    emailContent: '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">\n  <h2 style="color: #67c23a;">账号激活成功</h2>\n  <p>尊敬的 {{contactPerson}}，您好！</p>\n  <p>您的企业 <strong>{{tenantName}}</strong> 账号已成功激活。</p>\n  <p>当前套餐：<strong>{{packageName}}</strong></p>\n  <p>登录地址：<a href="{{loginUrl}}">{{loginUrl}}</a></p>\n  <p style="color: #999; font-size: 12px;">此邮件由系统自动发送，请勿回复。</p>\n</div>',
    smsContent: '【CRM系统】尊敬的{{contactPerson}}，您的企业{{tenantName}}账号已激活，套餐：{{packageName}}。',
  },
  {
    code: 'tenant_suspended',
    name: '账号已暂停',
    category: 'tenant',
    templateType: 'both',
    scene: '账号暂停通知',
    priority: 'high',
    variables: { tenantName: '租户名称', contactPerson: '联系人', contactEmail: '联系邮箱', websiteUrl: '官网地址' },
    emailSubject: '账号暂停通知 - {{tenantName}}',
    emailContent: '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">\n  <h2 style="color: #e6a23c;">账号暂停通知</h2>\n  <p>尊敬的 {{contactPerson}}，您好！</p>\n  <p>您的企业 <strong>{{tenantName}}</strong> 账号已被暂停使用。</p>\n  <p>如有疑问，请联系客服或访问 <a href="{{websiteUrl}}">官网</a> 了解详情。</p>\n  <p style="color: #999; font-size: 12px;">此邮件由系统自动发送，请勿回复。</p>\n</div>',
    smsContent: '【CRM系统】尊敬的{{contactPerson}}，您的企业{{tenantName}}账号已暂停，如有疑问请联系客服。',
  },
  {
    code: 'tenant_resumed',
    name: '账号已恢复',
    category: 'tenant',
    templateType: 'both',
    scene: '账号恢复通知',
    priority: 'normal',
    variables: { tenantName: '租户名称', contactPerson: '联系人', loginUrl: '登录地址' },
    emailSubject: '账号恢复通知 - {{tenantName}}',
    emailContent: '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">\n  <h2 style="color: #67c23a;">账号已恢复</h2>\n  <p>尊敬的 {{contactPerson}}，您好！</p>\n  <p>您的企业 <strong>{{tenantName}}</strong> 账号已恢复正常使用。</p>\n  <p>登录地址：<a href="{{loginUrl}}">{{loginUrl}}</a></p>\n  <p style="color: #999; font-size: 12px;">此邮件由系统自动发送，请勿回复。</p>\n</div>',
    smsContent: '【CRM系统】尊敬的{{contactPerson}}，您的企业{{tenantName}}账号已恢复，请登录使用。',
  },
  {
    code: 'package_upgraded',
    name: '套餐升级成功',
    category: 'tenant',
    templateType: 'both',
    scene: '套餐升级成功通知',
    priority: 'normal',
    variables: { tenantName: '租户名称', contactPerson: '联系人', packageName: '套餐名称', expiryDate: '到期日期' },
    emailSubject: '套餐升级成功 - {{tenantName}}',
    emailContent: '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">\n  <h2 style="color: #409eff;">套餐升级成功</h2>\n  <p>尊敬的 {{contactPerson}}，您好！</p>\n  <p>您的企业 <strong>{{tenantName}}</strong> 已成功升级到 <strong>{{packageName}}</strong>。</p>\n  <p>有效期至：{{expiryDate}}</p>\n  <p style="color: #999; font-size: 12px;">此邮件由系统自动发送，请勿回复。</p>\n</div>',
    smsContent: '【CRM系统】尊敬的{{contactPerson}}，您的企业{{tenantName}}已升级到{{packageName}}，有效期至{{expiryDate}}。',
  },
  {
    code: 'capacity_expanded',
    name: '容量扩容成功',
    category: 'tenant',
    templateType: 'email',
    scene: '容量扩容成功通知',
    priority: 'normal',
    variables: { tenantName: '租户名称', contactPerson: '联系人', maxUsers: '最大用户数' },
    emailSubject: '容量扩容成功 - {{tenantName}}',
    emailContent: '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">\n  <h2 style="color: #409eff;">容量扩容成功</h2>\n  <p>尊敬的 {{contactPerson}}，您好！</p>\n  <p>您的企业 <strong>{{tenantName}}</strong> 容量扩容已完成。</p>\n  <p>当前最大用户数：<strong>{{maxUsers}}</strong></p>\n  <p style="color: #999; font-size: 12px;">此邮件由系统自动发送，请勿回复。</p>\n</div>',
    smsContent: '',
  },
  {
    code: 'payment_success',
    name: '支付成功通知',
    category: 'payment',
    templateType: 'both',
    scene: '支付成功后通知',
    priority: 'high',
    variables: { tenantName: '租户名称', contactPerson: '联系人', orderNo: '订单编号', packageName: '套餐名称', amount: '支付金额', paymentMethod: '支付方式', paymentTime: '支付时间' },
    emailSubject: '支付成功 - 订单 {{orderNo}}',
    emailContent: '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">\n  <h2 style="color: #67c23a;">支付成功</h2>\n  <p>尊敬的 {{contactPerson}}，您好！</p>\n  <p>您的订单已支付成功，详情如下：</p>\n  <div style="background: #f5f7fa; padding: 16px; border-radius: 8px; margin: 16px 0;">\n    <p><strong>订单编号：</strong>{{orderNo}}</p>\n    <p><strong>套餐名称：</strong>{{packageName}}</p>\n    <p><strong>支付金额：</strong>{{amount}}</p>\n    <p><strong>支付方式：</strong>{{paymentMethod}}</p>\n    <p><strong>支付时间：</strong>{{paymentTime}}</p>\n  </div>\n  <p>感谢您的购买！</p>\n  <p style="color: #999; font-size: 12px;">此邮件由系统自动发送，请勿回复。</p>\n</div>',
    smsContent: '【CRM系统】尊敬的{{contactPerson}}，订单{{orderNo}}已支付成功，金额{{amount}}，套餐{{packageName}}。',
  },
  {
    code: 'payment_pending',
    name: '待支付提醒',
    category: 'payment',
    templateType: 'both',
    scene: '订单创建后待支付提醒',
    priority: 'normal',
    variables: { tenantName: '租户名称', contactPerson: '联系人', orderNo: '订单编号', packageName: '套餐名称', amount: '支付金额', websiteUrl: '官网地址' },
    emailSubject: '待支付提醒 - 订单 {{orderNo}}',
    emailContent: '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">\n  <h2 style="color: #e6a23c;">订单待支付</h2>\n  <p>尊敬的 {{contactPerson}}，您好！</p>\n  <p>您有一笔待支付的订单：</p>\n  <div style="background: #f5f7fa; padding: 16px; border-radius: 8px; margin: 16px 0;">\n    <p><strong>订单编号：</strong>{{orderNo}}</p>\n    <p><strong>套餐名称：</strong>{{packageName}}</p>\n    <p><strong>应付金额：</strong>{{amount}}</p>\n  </div>\n  <p>请尽快完成支付，如需帮助请访问 <a href="{{websiteUrl}}">官网</a>。</p>\n  <p style="color: #999; font-size: 12px;">此邮件由系统自动发送，请勿回复。</p>\n</div>',
    smsContent: '【CRM系统】尊敬的{{contactPerson}}，您有待支付订单{{orderNo}}，金额{{amount}}，请尽快完成支付。',
  },
  {
    code: 'payment_refund',
    name: '退款成功通知',
    category: 'payment',
    templateType: 'both',
    scene: '退款成功通知',
    priority: 'high',
    variables: { tenantName: '租户名称', contactPerson: '联系人', orderNo: '订单编号', refundAmount: '退款金额', refundReason: '退款原因' },
    emailSubject: '退款成功 - 订单 {{orderNo}}',
    emailContent: '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">\n  <h2 style="color: #409eff;">退款成功</h2>\n  <p>尊敬的 {{contactPerson}}，您好！</p>\n  <p>您的退款申请已处理完成：</p>\n  <div style="background: #f5f7fa; padding: 16px; border-radius: 8px; margin: 16px 0;">\n    <p><strong>订单编号：</strong>{{orderNo}}</p>\n    <p><strong>退款金额：</strong>{{refundAmount}}</p>\n    <p><strong>退款原因：</strong>{{refundReason}}</p>\n  </div>\n  <p>退款将在1-3个工作日内原路退回，请注意查收。</p>\n  <p style="color: #999; font-size: 12px;">此邮件由系统自动发送，请勿回复。</p>\n</div>',
    smsContent: '【CRM系统】尊敬的{{contactPerson}}，订单{{orderNo}}退款{{refundAmount}}已处理，将在1-3个工作日内退回。',
  },
  {
    code: 'renew_success',
    name: '续费成功通知',
    category: 'payment',
    templateType: 'both',
    scene: '续费成功通知',
    priority: 'normal',
    variables: { tenantName: '租户名称', contactPerson: '联系人', packageName: '套餐名称', renewalPeriod: '续费周期', expiryDate: '到期日期', amount: '支付金额' },
    emailSubject: '续费成功 - {{tenantName}}',
    emailContent: '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">\n  <h2 style="color: #67c23a;">续费成功</h2>\n  <p>尊敬的 {{contactPerson}}，您好！</p>\n  <p>您的企业 <strong>{{tenantName}}</strong> 已成功续费：</p>\n  <div style="background: #f5f7fa; padding: 16px; border-radius: 8px; margin: 16px 0;">\n    <p><strong>套餐名称：</strong>{{packageName}}</p>\n    <p><strong>续费周期：</strong>{{renewalPeriod}}</p>\n    <p><strong>支付金额：</strong>{{amount}}</p>\n    <p><strong>有效期至：</strong>{{expiryDate}}</p>\n  </div>\n  <p>感谢您的持续信赖！</p>\n  <p style="color: #999; font-size: 12px;">此邮件由系统自动发送，请勿回复。</p>\n</div>',
    smsContent: '【CRM系统】尊敬的{{contactPerson}}，{{tenantName}}续费成功，套餐{{packageName}}，有效期至{{expiryDate}}。',
  },
  {
    code: 'license_generated',
    name: '授权码生成通知',
    category: 'license',
    templateType: 'email',
    scene: '授权码生成后发送',
    priority: 'high',
    variables: { tenantName: '租户名称', contactPerson: '联系人', licenseKey: '授权码', licenseType: '授权类型', expiryDate: '到期日期', maxUsers: '最大用户数' },
    emailSubject: '授权码已生成 - {{tenantName}}',
    emailContent: '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">\n  <h2 style="color: #409eff;">授权码已生成</h2>\n  <p>尊敬的 {{contactPerson}}，您好！</p>\n  <p>您的企业 <strong>{{tenantName}}</strong> 的授权码已生成：</p>\n  <div style="background: #f0f9eb; padding: 16px; border-radius: 8px; margin: 16px 0; border: 1px solid #e1f3d8;">\n    <p style="font-size: 18px; font-weight: bold; letter-spacing: 2px; color: #67c23a; text-align: center;">{{licenseKey}}</p>\n  </div>\n  <div style="background: #f5f7fa; padding: 16px; border-radius: 8px; margin: 16px 0;">\n    <p><strong>授权类型：</strong>{{licenseType}}</p>\n    <p><strong>有效期至：</strong>{{expiryDate}}</p>\n    <p><strong>最大用户数：</strong>{{maxUsers}}</p>\n  </div>\n  <p style="color: #e6a23c;">请妥善保管授权码，勿泄露给他人。</p>\n  <p style="color: #999; font-size: 12px;">此邮件由系统自动发送，请勿回复。</p>\n</div>',
    smsContent: '',
  },
  {
    code: 'license_expire_soon',
    name: '授权即将到期提醒',
    category: 'license',
    templateType: 'both',
    scene: '授权到期前7天提醒',
    priority: 'high',
    variables: { tenantName: '租户名称', contactPerson: '联系人', expiryDate: '到期日期', remainingDays: '剩余天数', packageName: '套餐名称', websiteUrl: '官网地址' },
    emailSubject: '授权即将到期提醒 - {{tenantName}}',
    emailContent: '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">\n  <h2 style="color: #e6a23c;">授权即将到期</h2>\n  <p>尊敬的 {{contactPerson}}，您好！</p>\n  <p>您的企业 <strong>{{tenantName}}</strong> 的授权将在 <strong style="color: #f56c6c;">{{remainingDays}}</strong> 天后到期。</p>\n  <div style="background: #fdf6ec; padding: 16px; border-radius: 8px; margin: 16px 0; border: 1px solid #faecd8;">\n    <p><strong>当前套餐：</strong>{{packageName}}</p>\n    <p><strong>到期日期：</strong>{{expiryDate}}</p>\n  </div>\n  <p>为避免服务中断，请尽快续费。<a href="{{websiteUrl}}">点击续费</a></p>\n  <p style="color: #999; font-size: 12px;">此邮件由系统自动发送，请勿回复。</p>\n</div>',
    smsContent: '【CRM系统】尊敬的{{contactPerson}}，您的企业{{tenantName}}授权将于{{remainingDays}}天后到期（{{expiryDate}}），请尽快续费。',
  },
  {
    code: 'license_expired',
    name: '授权已到期通知',
    category: 'license',
    templateType: 'both',
    scene: '授权到期后通知',
    priority: 'urgent',
    variables: { tenantName: '租户名称', contactPerson: '联系人', expiryDate: '到期日期', packageName: '套餐名称', websiteUrl: '官网地址' },
    emailSubject: '授权已到期 - {{tenantName}}',
    emailContent: '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">\n  <h2 style="color: #f56c6c;">授权已到期</h2>\n  <p>尊敬的 {{contactPerson}}，您好！</p>\n  <p>您的企业 <strong>{{tenantName}}</strong> 的授权已于 <strong>{{expiryDate}}</strong> 到期。</p>\n  <div style="background: #fef0f0; padding: 16px; border-radius: 8px; margin: 16px 0; border: 1px solid #fde2e2;">\n    <p><strong>到期套餐：</strong>{{packageName}}</p>\n    <p><strong>到期日期：</strong>{{expiryDate}}</p>\n    <p style="color: #f56c6c;">服务已受限，请尽快续费以恢复正常使用。</p>\n  </div>\n  <p><a href="{{websiteUrl}}" style="background: #409eff; color: #fff; padding: 10px 20px; border-radius: 4px; text-decoration: none; display: inline-block;">立即续费</a></p>\n  <p style="color: #999; font-size: 12px;">此邮件由系统自动发送，请勿回复。</p>\n</div>',
    smsContent: '【CRM系统】尊敬的{{contactPerson}}，您的企业{{tenantName}}授权已于{{expiryDate}}到期，服务已受限，请尽快续费。',
  },
];

// 预设场景分组
const presetGroups = computed(() => [
  { label: '租户注册', options: PRESET_TEMPLATES.filter(p => p.category === 'tenant') },
  { label: '支付相关', options: PRESET_TEMPLATES.filter(p => p.category === 'payment') },
  { label: '授权码', options: PRESET_TEMPLATES.filter(p => p.category === 'license') },
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

const formData = ref<any>({
  templateCode: '',
  templateName: '',
  templateType: 'both',
  category: 'tenant',
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
  sendSms: 0
});

const formRules = {
  templateCode: [{ required: true, message: '请输入模板代码', trigger: 'blur' }],
  templateName: [{ required: true, message: '请输入模板名称', trigger: 'blur' }],
  templateType: [{ required: true, message: '请选择模板类型', trigger: 'change' }],
  category: [{ required: true, message: '请选择业务分类', trigger: 'change' }],
  scene: [{ required: true, message: '请输入使用场景', trigger: 'blur' }]
};

// 测试对话框
const testDialogVisible = ref(false);
const currentTemplate = ref<any>({});
const testFormRef = ref();
const testForm = ref<any>({
  recipientEmail: '',
  recipientPhone: '',
  variables: {}
});
const previewResult = ref<any>({});
const previewing = ref(false);
const sending = ref(false);

const testFormRules = {
  recipientEmail: [
    { type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' }
  ],
  recipientPhone: [
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }
  ]
};

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

// 当前分类下可选的变量
const availableVariables = computed(() => {
  const category = formData.value.category;
  return CATEGORY_VARIABLES[category] || {};
});

// ==================== 方法 ====================
const getCategoryName = (category: string) => {
  const map: any = { tenant: '租户注册', payment: '支付相关', license: '授权码' };
  return map[category] || category;
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

const insertVariable = (key: string) => {
  const varStr = `{{${key}}}`;
  navigator.clipboard.writeText(varStr).then(() => {
    ElMessage.success(`已复制 ${varStr} 到剪贴板，请粘贴到内容中`);
  }).catch(() => {
    ElMessage.info(`请手动输入: ${varStr}`);
  });
};

const insertToField = (field: string, key: string) => {
  const varStr = `{{${key}}}`;
  formData.value[field] = (formData.value[field] || '') + varStr;
};

const onCategoryChange = () => {
  // 切换分类时清空已选变量（仅新建时）
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
  formData.value.templateName = preset.name;
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

  ElMessage.success(`已应用预设场景: ${preset.name}`);
};

// 变量示例值相关
const getVariablePlaceholder = (key: string): string => {
  return VARIABLE_SAMPLES[key] ? `示例: ${VARIABLE_SAMPLES[key]}` : `请输入${key}的值`;
};

const fillSampleValue = (key: string) => {
  if (VARIABLE_SAMPLES[key]) {
    testForm.value.variables[key] = VARIABLE_SAMPLES[key];
  }
};

const fillAllSampleValues = () => {
  if (currentTemplate.value.variables) {
    const vars: Record<string, string> = {};
    for (const key of Object.keys(currentTemplate.value.variables)) {
      vars[key] = VARIABLE_SAMPLES[key] || `测试${key}`;
    }
    testForm.value.variables = vars;
  }
  ElMessage.success('已填充所有示例值');
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
  formData.value = {
    templateCode: '', templateName: '', templateType: 'both', category: 'tenant',
    scene: '', emailSubject: '', emailContent: '', smsContent: '',
    variables: {}, variableDescription: '', isEnabled: 1, isSystem: 0,
    priority: 'normal', sendEmail: 1, sendSms: 0
  };
  dialogVisible.value = true;
};

const handleEdit = (row: any) => {
  isEdit.value = true;
  selectedPreset.value = '';
  formData.value = { ...row, variables: row.variables ? { ...row.variables } : {} };
  dialogVisible.value = true;
};

const handleSave = async () => {
  try {
    await formRef.value.validate();
    saving.value = true;

    // 自动设置sendEmail/sendSms
    formData.value.sendEmail = formData.value.templateType !== 'sms' ? 1 : 0;
    formData.value.sendSms = formData.value.templateType !== 'email' ? 1 : 0;

    // 自动生成变量说明
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

  const confirmLines = [];
  if (tplType !== 'sms') confirmLines.push(`邮件将发送至: ${testForm.value.recipientEmail}`);
  if (tplType !== 'email') confirmLines.push(`短信将发送至: ${testForm.value.recipientPhone}`);

  try {
    await ElMessageBox.confirm(
      `确定要发送测试通知吗？\n${confirmLines.join('\n')}`,
      '发送测试',
      { type: 'info' }
    );

    sending.value = true;
    const res = await request.post(
      `/notification-templates/${currentTemplate.value.templateCode}/send`,
      {
        variables: testForm.value.variables,
        options: {
          priority: 'normal',
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
      ElMessage.error(error.response?.data?.message || '发送失败，请检查邮件/短信服务配置');
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
    margin-bottom: 20px;
  }

  .variable-selector {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .variable-tag {
    transition: all 0.2s;
    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
  }

  .variables-display {
    display: flex;
    flex-wrap: wrap;
  }

  .form-tip {
    font-size: 12px;
    color: #909399;
    code {
      background: #f5f7fa;
      padding: 2px 6px;
      border-radius: 3px;
      color: #409eff;
    }
  }

  .preview-result {
    margin-top: 10px;

    h4 {
      margin: 15px 0 10px 0;
      color: #409eff;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .preview-box {
      border: 1px solid #dcdfe6;
      border-radius: 4px;
      padding: 15px;
      background: #f5f7fa;
      min-height: 50px;
    }

    .email-content {
      max-height: 400px;
      overflow-y: auto;
    }

    .sms-box {
      position: relative;
      padding-bottom: 30px;
    }

    .sms-count {
      position: absolute;
      bottom: 8px;
      right: 12px;
      font-size: 12px;
      color: #909399;
    }

    .email-preview {
      margin-bottom: 20px;
    }
  }
}
</style>
