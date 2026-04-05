<template>
  <div class="page-container">
    <el-card shadow="never" class="config-card">
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <span class="title">CRM配置</span>
            <span class="subtitle">配置CRM系统的基本信息，优先级高于租户/私有部署的本地设置</span>
          </div>
          <el-button type="primary" @click="handleSave" :loading="saving">
            <el-icon><Check /></el-icon>保存配置
          </el-button>
        </div>
      </template>

      <el-alert type="warning" :closable="false" class="tip-alert">
        <template #title>
          此处配置的信息将覆盖所有租户和私有部署的系统设置。如果此处未配置，则使用各租户/私有部署自己的设置。
        </template>
      </el-alert>

      <el-tabs v-model="activeTab">
        <!-- 基本设置（合并基本信息+版权信息） -->
        <el-tab-pane label="基本设置" name="basic">
          <el-form :model="form" label-width="120px" class="config-form">
            <h4 class="section-title">基本信息</h4>

            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="系统名称">
                  <el-input v-model="form.systemName" placeholder="请输入系统名称" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="系统版本">
                  <el-input v-model="form.systemVersion" placeholder="请输入系统版本" />
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="公司名称">
                  <el-input v-model="form.companyName" placeholder="请输入公司名称" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="联系电话">
                  <el-input v-model="form.contactPhone" placeholder="请输入联系电话" />
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="联系邮箱">
                  <el-input v-model="form.contactEmail" placeholder="请输入联系邮箱" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="网站地址">
                  <el-input v-model="form.websiteUrl" placeholder="请输入网站地址" />
                </el-form-item>
              </el-col>
            </el-row>

            <el-form-item label="公司地址">
              <el-input v-model="form.companyAddress" placeholder="请输入公司地址" />
            </el-form-item>

            <el-form-item label="系统描述">
              <el-input v-model="form.systemDescription" type="textarea" :rows="3" placeholder="请输入系统描述" />
            </el-form-item>

            <!-- 系统Logo上传（暂时禁用，功能未实际使用）
            <el-form-item label="系统Logo">
              <el-upload
                class="logo-uploader"
                action="#"
                :show-file-list="false"
                :auto-upload="false"
                :on-change="handleLogoChange"
              >
                <img v-if="form.systemLogo" :src="form.systemLogo" class="logo-preview" />
                <el-icon v-else class="logo-icon"><Plus /></el-icon>
              </el-upload>
              <div class="upload-tip">建议尺寸：200x60px，支持 jpg、png 格式</div>
            </el-form-item>
            -->

            <el-divider content-position="left">联系二维码</el-divider>

            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="二维码标签">
                  <el-input v-model="form.contactQRCodeLabel" placeholder="如：微信、联系我们" />
                  <div class="upload-tip">用于说明二维码的用途</div>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="上传二维码">
                  <div class="qr-upload-buttons">
                    <el-button type="primary" size="small" @click="triggerQRUpload">
                      <el-icon><Upload /></el-icon> 点击上传
                    </el-button>
                    <el-button type="success" size="small" @click="pasteQRImage">
                      <el-icon><DocumentCopy /></el-icon> 粘贴图片
                    </el-button>
                  </div>
                  <!-- 二维码预览 -->
                  <div v-if="form.contactQRCode" class="qr-preview-area">
                    <img :src="form.contactQRCode" class="qr-preview-img" />
                    <el-button size="small" type="danger" text @click="form.contactQRCode = ''">
                      <el-icon><Delete /></el-icon> 删除
                    </el-button>
                  </div>
                  <div class="upload-tip">建议尺寸：200x200px，支持 jpg、png 格式</div>
                  <!-- 隐藏的文件输入 -->
                  <input ref="qrFileInput" type="file" accept="image/*" style="display: none" @change="handleQRFileSelect" />
                </el-form-item>
              </el-col>
            </el-row>

            <!-- 版权与备案信息 -->
            <el-divider content-position="left">版权与备案信息</el-divider>

            <el-form-item label="版权文字">
              <el-input v-model="form.copyrightText" placeholder="如：© 2024 XXX公司 版权所有" />
              <div class="upload-tip">显示在系统底部的版权信息</div>
            </el-form-item>

            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="ICP备案号">
                  <el-input v-model="form.icpNumber" placeholder="如：粤ICP备2026XXXXXX号" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="公安备案号">
                  <el-input v-model="form.policeNumber" placeholder="如：粤公网安备 44010XXXXXXXXXX号" />
                </el-form-item>
              </el-col>
            </el-row>

            <el-form-item label="技术支持">
              <el-input v-model="form.techSupport" placeholder="如：技术支持：XXX科技" />
            </el-form-item>

            <!-- 预览效果 -->
            <el-divider content-position="left">版权预览</el-divider>
            <div class="copyright-preview">
              <div class="preview-box">
                <p v-if="form.copyrightText">{{ form.copyrightText }}</p>
                <p v-if="form.icpNumber || form.policeNumber">
                  <span v-if="form.icpNumber">{{ form.icpNumber }}</span>
                  <span v-if="form.icpNumber && form.policeNumber"> | </span>
                  <span v-if="form.policeNumber">{{ form.policeNumber }}</span>
                </p>
                <p v-if="form.techSupport">{{ form.techSupport }}</p>
              </div>
            </div>
          </el-form>
        </el-tab-pane>

        <!-- 用户协议 - 富文本编辑器列表管理 -->
        <el-tab-pane label="用户协议" name="agreement">
          <div class="agreement-section">
            <el-alert type="info" :closable="false" style="margin-bottom: 20px">
              <template #title>
                在此编辑用户协议和隐私政策，保存后开启「启用状态」中的「用户协议覆盖」即可统一下发到所有 CRM 客户端。
              </template>
            </el-alert>
            <el-table :data="agreementList" border stripe class="agreement-table">
              <el-table-column type="index" label="序号" width="60" align="center" />
              <el-table-column prop="title" label="协议标题" width="180">
                <template #default="{ row }">
                  <div style="display:flex;align-items:center;gap:8px">
                    <el-icon v-if="row.type === 'user'" color="#409EFF"><Document /></el-icon>
                    <el-icon v-else color="#67C23A"><Lock /></el-icon>
                    <span style="font-weight:500">{{ row.title }}</span>
                  </div>
                </template>
              </el-table-column>
              <el-table-column prop="type" label="类型" width="120" align="center">
                <template #default="{ row }">
                  <el-tag :type="row.type === 'user' ? 'primary' : 'success'" size="small" effect="light">
                    {{ row.type === 'user' ? '使用协议' : '隐私协议' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="wordCount" label="字数" width="100" align="center">
                <template #default="{ row }">
                  <span style="color:#909399">{{ row.wordCount }} 字</span>
                </template>
              </el-table-column>
              <el-table-column label="内容概述" min-width="240">
                <template #default="{ row }">
                  <div style="color:#909399;font-size:13px;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">{{ row.summary }}</div>
                </template>
              </el-table-column>
              <el-table-column prop="updateTime" label="更新时间" width="170" align="center">
                <template #default="{ row }">
                  <div style="display:flex;align-items:center;justify-content:center;gap:4px;color:#909399;font-size:13px">
                    <el-icon><Clock /></el-icon>
                    <span>{{ row.updateTime }}</span>
                  </div>
                </template>
              </el-table-column>
              <el-table-column label="启用" width="70" align="center">
                <template #default="{ row }">
                  <el-switch v-model="row.enabled" size="small" />
                </template>
              </el-table-column>
              <el-table-column label="操作" width="200" align="center" fixed="right">
                <template #default="{ row }">
                  <el-button type="primary" size="small" @click="openAgreementEditor(row)" round>
                    <el-icon><Edit /></el-icon> 编辑
                  </el-button>
                  <el-button type="info" size="small" @click="previewAgreement(row)" round>
                    <el-icon><View /></el-icon> 预览
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
            <div style="margin-top:20px;display:flex;justify-content:flex-end">
              <el-button type="primary" @click="handleSaveAgreements" :loading="agreementSaving" round>
                <el-icon><Check /></el-icon> 保存协议并同步
              </el-button>
            </div>
          </div>
        </el-tab-pane>

        <!-- 官网信息 -->
        <el-tab-pane label="官网信息" name="website">
          <el-form :model="form" label-width="120px" class="config-form">
            <el-alert type="info" :closable="false" style="margin-bottom: 20px">
              <template #title>
                在此配置官网展示的版权信息、备案号、联系方式和客服信息。保存后将自动同步到官网，无需修改官网代码。
              </template>
            </el-alert>

            <h4 class="section-title">版权与备案</h4>
            <el-form-item label="版权文字">
              <el-input v-model="form.copyrightText" placeholder="如：© 2025 XXX公司. All rights reserved." />
              <div class="upload-tip">显示在官网底部和CRM系统底部</div>
            </el-form-item>
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="ICP备案号">
                  <el-input v-model="form.icpNumber" placeholder="如：粤ICP备2026XXXXXX号" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="公安备案号">
                  <el-input v-model="form.policeNumber" placeholder="如：粤公网安备 44010XXXXXXXXXX号" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-form-item label="技术支持">
              <el-input v-model="form.techSupport" placeholder="如：技术支持：XXX科技" />
            </el-form-item>

            <el-divider content-position="left">联系方式</el-divider>
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="客服电话">
                  <el-input v-model="form.websiteConfig.servicePhone" placeholder="如：400-123-4567 或 13500001111" />
                  <div class="upload-tip">显示在官网底部和客服面板</div>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="客服邮箱">
                  <el-input v-model="form.websiteConfig.serviceEmail" placeholder="如：support@example.com" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-form-item label="公司名称">
              <el-input v-model="form.companyName" placeholder="如：XXX科技有限公司" />
              <div class="upload-tip">同时用于官网品牌展示和CRM系统</div>
            </el-form-item>
            <el-form-item label="公司地址">
              <el-input v-model="form.companyAddress" placeholder="如：广东省深圳市南山区XX路XX号" />
            </el-form-item>
            <el-form-item label="品牌标语">
              <el-input v-model="form.websiteConfig.brandSlogan" placeholder="如：智能销售管理系统，助力企业高效增长" />
              <div class="upload-tip">显示在官网底部品牌区域</div>
            </el-form-item>

            <el-divider content-position="left">客服配置</el-divider>
            <el-form-item label="在线客服链接">
              <el-input v-model="form.websiteConfig.customerServiceUrl" placeholder="如：https://work.weixin.qq.com/kfid/xxx" />
              <div class="upload-tip">企业微信客服链接或其他在线客服系统链接</div>
            </el-form-item>
            <el-form-item label="工作时间">
              <el-input v-model="form.websiteConfig.workingHours" placeholder="如：周一至周五 9:00-18:00" />
            </el-form-item>
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="二维码标签">
                  <el-input v-model="form.contactQRCodeLabel" placeholder="如：微信客服、扫码咨询" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="客服二维码">
                  <div class="qr-upload-buttons">
                    <el-button type="primary" size="small" @click="triggerWebsiteQRUpload">
                      <el-icon><Upload /></el-icon> 上传二维码
                    </el-button>
                  </div>
                  <div v-if="form.websiteConfig.serviceQRCode" class="qr-preview-area">
                    <img :src="form.websiteConfig.serviceQRCode" class="qr-preview-img" />
                    <el-button size="small" type="danger" text @click="form.websiteConfig.serviceQRCode = ''">
                      <el-icon><Delete /></el-icon> 删除
                    </el-button>
                  </div>
                  <div class="upload-tip">官网客服面板和底部显示的二维码图片</div>
                  <input ref="websiteQrFileInput" type="file" accept="image/*" style="display: none" @change="handleWebsiteQRFileSelect" />
                </el-form-item>
              </el-col>
            </el-row>

            <!-- 预览 -->
            <el-divider content-position="left">官网底部预览</el-divider>
            <div class="copyright-preview">
              <div class="preview-box">
                <p v-if="form.copyrightText">{{ form.copyrightText }}</p>
                <p v-else>© {{ new Date().getFullYear() }} {{ form.companyName || '公司名称' }}. All rights reserved.</p>
                <p v-if="form.icpNumber || form.policeNumber">
                  <span v-if="form.icpNumber">{{ form.icpNumber }}</span>
                  <span v-if="form.icpNumber && form.policeNumber"> | </span>
                  <span v-if="form.policeNumber">{{ form.policeNumber }}</span>
                </p>
                <p v-if="form.techSupport" style="color: #b0b3b8;">{{ form.techSupport }}</p>
              </div>
            </div>
          </el-form>
        </el-tab-pane>

        <!-- 启用状态 -->
        <el-tab-pane label="启用状态" name="status">
          <el-form :model="form" label-width="160px" class="config-form">
            <el-alert type="info" :closable="false" style="margin-bottom: 20px">
              <template #title>
                启用后，对应配置将覆盖所有租户和私有部署的设置。未启用的配置项将使用各自的本地设置。
              </template>
            </el-alert>

            <el-form-item label="启用基本信息覆盖">
              <el-switch v-model="form.enableBasicOverride" />
              <span class="form-tip">系统名称、公司信息、Logo等</span>
            </el-form-item>
            <el-form-item label="启用版权信息覆盖">
              <el-switch v-model="form.enableCopyrightOverride" />
              <span class="form-tip">版权文字、备案号等</span>
            </el-form-item>
            <el-form-item label="启用用户协议覆盖">
              <el-switch v-model="form.enableAgreementOverride" />
              <span class="form-tip">用户协议、隐私政策</span>
            </el-form-item>

            <el-divider content-position="left">安全配置</el-divider>

            <el-form-item label="强制控制台加密">
              <el-switch v-model="form.enableConsoleEncryption" />
              <span class="form-tip">
                <strong>启用</strong>：强制所有CRM端控制台日志加密，租户无法自行关闭（开关锁定）。
                <strong>关闭</strong>：CRM端仍默认启用加密，但租户可在超管面板中自行选择关闭。
              </span>
            </el-form-item>
          </el-form>
        </el-tab-pane>
        <el-tab-pane label="功能开关" name="features">
          <div class="features-header">
            <div class="features-title">
              <div>
                <h3>功能模块控制</h3>
                <p>控制CRM系统功能模块的可见性，SaaS租户和私有部署可分别配置</p>
              </div>
            </div>
          </div>

          <el-row :gutter="24" class="feature-flags-container">
            <el-col :span="12">
            <el-card shadow="hover" class="feature-card saas-card">
              <template #header>
                <div class="feature-card-header">
                  <div class="card-title-area">
                    <el-tag type="primary" effect="dark" size="small">SaaS</el-tag>
                    <div class="card-title-text">
                      <span class="card-title">SaaS租户配置</span>
                      <span class="card-subtitle">控制SaaS租户可用的功能</span>
                    </div>
                  </div>
                  <div class="card-actions">
                    <el-button type="primary" text size="small" @click="toggleAll('saas', true)">全开</el-button>
                    <el-divider direction="vertical" />
                    <el-button type="danger" text size="small" @click="toggleAll('saas', false)">全关</el-button>
                  </div>
                </div>
              </template>
              <div class="feature-group">
                <div class="group-label">核心功能</div>
                <div class="group-items">
                  <div class="switch-row">
                    <div class="switch-info">
                      <el-icon class="switch-icon"><Lock /></el-icon>
                      <div class="switch-text">
                        <span class="switch-name">安全设置</span>
                        <span class="switch-desc">登录安全、密码策略</span>
                      </div>
                    </div>
                    <el-switch v-model="form.featureFlags.saas.security" />
                  </div>
                  <div class="switch-row">
                    <div class="switch-info">
                      <el-icon class="switch-icon"><FolderOpened /></el-icon>
                      <div class="switch-text">
                        <span class="switch-name">存储设置</span>
                        <span class="switch-desc">文件存储、云存储</span>
                      </div>
                    </div>
                    <el-switch v-model="form.featureFlags.saas.storage" />
                  </div>
                  <div class="switch-row">
                    <div class="switch-info">
                      <el-icon class="switch-icon"><Goods /></el-icon>
                      <div class="switch-text">
                        <span class="switch-name">商品设置</span>
                        <span class="switch-desc">商品分类、SKU管理</span>
                      </div>
                    </div>
                    <el-switch v-model="form.featureFlags.saas.product" />
                  </div>
                  <div class="switch-row">
                    <div class="switch-info">
                      <el-icon class="switch-icon"><Document /></el-icon>
                      <div class="switch-text">
                        <span class="switch-name">订单设置</span>
                        <span class="switch-desc">订单流程、审批规则</span>
                      </div>
                    </div>
                    <el-switch v-model="form.featureFlags.saas.order" />
                  </div>
                </div>
              </div>
              <div class="feature-group">
                <div class="group-label">通信设置</div>
                <div class="group-items">
                  <div class="switch-row">
                    <div class="switch-info">
                      <el-icon class="switch-icon"><Phone /></el-icon>
                      <div class="switch-text">
                        <span class="switch-name">通话设置</span>
                        <span class="switch-desc">电话外呼、通话录音</span>
                      </div>
                    </div>
                    <el-switch v-model="form.featureFlags.saas.call" />
                  </div>
                  <div class="switch-row">
                    <div class="switch-info">
                      <el-icon class="switch-icon"><Message /></el-icon>
                      <div class="switch-text">
                        <span class="switch-name">邮件设置</span>
                        <span class="switch-desc">SMTP、邮件模板</span>
                      </div>
                    </div>
                    <el-switch v-model="form.featureFlags.saas.email" />
                  </div>
                  <div class="switch-row">
                    <div class="switch-info">
                      <el-icon class="switch-icon"><ChatDotRound /></el-icon>
                      <div class="switch-text">
                        <span class="switch-name">短信设置</span>
                        <span class="switch-desc">短信通道、模板</span>
                      </div>
                    </div>
                    <el-switch v-model="form.featureFlags.saas.sms" />
                  </div>
                  <div class="switch-row">
                    <div class="switch-info">
                      <el-icon class="switch-icon"><Bell /></el-icon>
                      <div class="switch-text">
                        <span class="switch-name">通知设置</span>
                        <span class="switch-desc">消息推送、规则</span>
                      </div>
                    </div>
                    <el-switch v-model="form.featureFlags.saas.notification" />
                  </div>
                </div>
              </div>
              <div class="feature-group">
                <div class="group-label">数据管理</div>
                <div class="group-items">
                  <div class="switch-row">
                    <div class="switch-info">
                      <el-icon class="switch-icon"><Upload /></el-icon>
                      <div class="switch-text">
                        <span class="switch-name">数据备份</span>
                        <span class="switch-desc">自动备份、数据恢复</span>
                      </div>
                    </div>
                    <el-switch v-model="form.featureFlags.saas.backup" />
                  </div>
                  <div class="switch-row">
                    <div class="switch-info">
                      <el-icon class="switch-icon"><Notebook /></el-icon>
                      <div class="switch-text">
                        <span class="switch-name">系统日志</span>
                        <span class="switch-desc">操作日志、审计追踪</span>
                      </div>
                    </div>
                    <el-switch v-model="form.featureFlags.saas.logs" />
                  </div>
                  <div class="switch-row">
                    <div class="switch-info">
                      <el-icon class="switch-icon"><DataLine /></el-icon>
                      <div class="switch-text">
                        <span class="switch-name">系统监控</span>
                        <span class="switch-desc">性能监控、告警通知</span>
                      </div>
                    </div>
                    <el-switch v-model="form.featureFlags.saas.monitor" />
                  </div>
                </div>
              </div>
              <div class="feature-group">
                <div class="group-label">其他功能</div>
                <div class="group-items">
                  <div class="switch-row">
                    <div class="switch-info">
                      <el-icon class="switch-icon"><DocumentChecked /></el-icon>
                      <div class="switch-text">
                        <span class="switch-name">用户协议</span>
                        <span class="switch-desc">服务条款、隐私政策</span>
                      </div>
                    </div>
                    <el-switch v-model="form.featureFlags.saas.agreement" />
                  </div>
                  <div class="switch-row">
                    <div class="switch-info">
                      <el-icon class="switch-icon"><Cellphone /></el-icon>
                      <div class="switch-text">
                        <span class="switch-name">移动应用</span>
                        <span class="switch-desc">APP下载、移动配置</span>
                      </div>
                    </div>
                    <el-switch v-model="form.featureFlags.saas.mobile" />
                  </div>
                  <div class="switch-row">
                    <div class="switch-info">
                      <el-icon class="switch-icon"><Connection /></el-icon>
                      <div class="switch-text">
                        <span class="switch-name">接口管理</span>
                        <span class="switch-desc">API密钥、接口权限</span>
                      </div>
                    </div>
                    <el-switch v-model="form.featureFlags.saas.apiManagement" />
                  </div>
                  <div class="switch-row">
                    <div class="switch-info">
                      <el-icon class="switch-icon"><Setting /></el-icon>
                      <div class="switch-text">
                        <span class="switch-name">超管面板</span>
                        <span class="switch-desc">超级管理员权限配置面板</span>
                      </div>
                    </div>
                    <el-switch v-model="form.featureFlags.saas.superAdminPanel" />
                  </div>
                </div>
              </div>
            </el-card>
            </el-col>
            <el-col :span="12">
            <el-card shadow="hover" class="feature-card private-card">
              <template #header>
                <div class="feature-card-header">
                  <div class="card-title-area">
                    <el-tag type="success" effect="dark" size="small">私有</el-tag>
                    <div class="card-title-text">
                      <span class="card-title">私有部署配置</span>
                      <span class="card-subtitle">控制私有部署客户可用的功能</span>
                    </div>
                  </div>
                  <div class="card-actions">
                    <el-button type="primary" text size="small" @click="toggleAll('private', true)">全开</el-button>
                    <el-divider direction="vertical" />
                    <el-button type="danger" text size="small" @click="toggleAll('private', false)">全关</el-button>
                  </div>
                </div>
              </template>
              <div class="feature-group">
                <div class="group-label">核心功能</div>
                <div class="group-items">
                  <div class="switch-row">
                    <div class="switch-info">
                      <el-icon class="switch-icon"><Lock /></el-icon>
                      <div class="switch-text">
                        <span class="switch-name">安全设置</span>
                        <span class="switch-desc">登录安全、密码策略</span>
                      </div>
                    </div>
                    <el-switch v-model="form.featureFlags.private.security" />
                  </div>
                  <div class="switch-row">
                    <div class="switch-info">
                      <el-icon class="switch-icon"><FolderOpened /></el-icon>
                      <div class="switch-text">
                        <span class="switch-name">存储设置</span>
                        <span class="switch-desc">文件存储、云存储</span>
                      </div>
                    </div>
                    <el-switch v-model="form.featureFlags.private.storage" />
                  </div>
                  <div class="switch-row">
                    <div class="switch-info">
                      <el-icon class="switch-icon"><Goods /></el-icon>
                      <div class="switch-text">
                        <span class="switch-name">商品设置</span>
                        <span class="switch-desc">商品分类、SKU管理</span>
                      </div>
                    </div>
                    <el-switch v-model="form.featureFlags.private.product" />
                  </div>
                  <div class="switch-row">
                    <div class="switch-info">
                      <el-icon class="switch-icon"><Document /></el-icon>
                      <div class="switch-text">
                        <span class="switch-name">订单设置</span>
                        <span class="switch-desc">订单流程、审批规则</span>
                      </div>
                    </div>
                    <el-switch v-model="form.featureFlags.private.order" />
                  </div>
                </div>
              </div>
              <div class="feature-group">
                <div class="group-label">通信设置</div>
                <div class="group-items">
                  <div class="switch-row">
                    <div class="switch-info">
                      <el-icon class="switch-icon"><Phone /></el-icon>
                      <div class="switch-text">
                        <span class="switch-name">通话设置</span>
                        <span class="switch-desc">电话外呼、通话录音</span>
                      </div>
                    </div>
                    <el-switch v-model="form.featureFlags.private.call" />
                  </div>
                  <div class="switch-row">
                    <div class="switch-info">
                      <el-icon class="switch-icon"><Message /></el-icon>
                      <div class="switch-text">
                        <span class="switch-name">邮件设置</span>
                        <span class="switch-desc">SMTP、邮件模板</span>
                      </div>
                    </div>
                    <el-switch v-model="form.featureFlags.private.email" />
                  </div>
                  <div class="switch-row">
                    <div class="switch-info">
                      <el-icon class="switch-icon"><ChatDotRound /></el-icon>
                      <div class="switch-text">
                        <span class="switch-name">短信设置</span>
                        <span class="switch-desc">短信通道、模板</span>
                      </div>
                    </div>
                    <el-switch v-model="form.featureFlags.private.sms" />
                  </div>
                  <div class="switch-row">
                    <div class="switch-info">
                      <el-icon class="switch-icon"><Bell /></el-icon>
                      <div class="switch-text">
                        <span class="switch-name">通知设置</span>
                        <span class="switch-desc">消息推送、规则</span>
                      </div>
                    </div>
                    <el-switch v-model="form.featureFlags.private.notification" />
                  </div>
                </div>
              </div>
              <div class="feature-group">
                <div class="group-label">数据管理</div>
                <div class="group-items">
                  <div class="switch-row">
                    <div class="switch-info">
                      <el-icon class="switch-icon"><Upload /></el-icon>
                      <div class="switch-text">
                        <span class="switch-name">数据备份</span>
                        <span class="switch-desc">自动备份、数据恢复</span>
                      </div>
                    </div>
                    <el-switch v-model="form.featureFlags.private.backup" />
                  </div>
                  <div class="switch-row">
                    <div class="switch-info">
                      <el-icon class="switch-icon"><Notebook /></el-icon>
                      <div class="switch-text">
                        <span class="switch-name">系统日志</span>
                        <span class="switch-desc">操作日志、审计追踪</span>
                      </div>
                    </div>
                    <el-switch v-model="form.featureFlags.private.logs" />
                  </div>
                  <div class="switch-row">
                    <div class="switch-info">
                      <el-icon class="switch-icon"><DataLine /></el-icon>
                      <div class="switch-text">
                        <span class="switch-name">系统监控</span>
                        <span class="switch-desc">性能监控、告警通知</span>
                      </div>
                    </div>
                    <el-switch v-model="form.featureFlags.private.monitor" />
                  </div>
                </div>
              </div>
              <div class="feature-group">
                <div class="group-label">其他功能</div>
                <div class="group-items">
                  <div class="switch-row">
                    <div class="switch-info">
                      <el-icon class="switch-icon"><DocumentChecked /></el-icon>
                      <div class="switch-text">
                        <span class="switch-name">用户协议</span>
                        <span class="switch-desc">服务条款、隐私政策</span>
                      </div>
                    </div>
                    <el-switch v-model="form.featureFlags.private.agreement" />
                  </div>
                  <div class="switch-row">
                    <div class="switch-info">
                      <el-icon class="switch-icon"><Cellphone /></el-icon>
                      <div class="switch-text">
                        <span class="switch-name">移动应用</span>
                        <span class="switch-desc">APP下载、移动配置</span>
                      </div>
                    </div>
                    <el-switch v-model="form.featureFlags.private.mobile" />
                  </div>
                  <div class="switch-row">
                    <div class="switch-info">
                      <el-icon class="switch-icon"><Connection /></el-icon>
                      <div class="switch-text">
                        <span class="switch-name">接口管理</span>
                        <span class="switch-desc">API密钥、接口权限</span>
                      </div>
                    </div>
                    <el-switch v-model="form.featureFlags.private.apiManagement" />
                  </div>
                  <div class="switch-row">
                    <div class="switch-info">
                      <el-icon class="switch-icon"><Setting /></el-icon>
                      <div class="switch-text">
                        <span class="switch-name">超管面板</span>
                        <span class="switch-desc">超级管理员权限配置面板</span>
                      </div>
                    </div>
                    <el-switch v-model="form.featureFlags.private.superAdminPanel" />
                  </div>
                </div>
              </div>
            </el-card>
            </el-col>
          </el-row>

          <div class="feature-save-area">
            <el-button type="primary" size="large" round @click="handleSave" :loading="saving">
              <el-icon><Check /></el-icon>保存功能开关配置
            </el-button>
          </div>
        </el-tab-pane>


      </el-tabs>
    </el-card>

    <!-- 协议富文本编辑弹窗 -->
    <el-dialog
      v-model="agreementEditorVisible"
      :title="`编辑「${editingAgreement?.title || '协议'}」`"
      width="70%"
      top="4vh"
      :close-on-click-modal="false"
      destroy-on-close
      class="agreement-editor-dialog"
    >
      <el-alert type="info" :closable="false" style="margin-bottom:16px">
        <template #title>
          使用富文本编辑器编辑协议内容，支持标题、段落、列表、加粗等格式排版。保存后协议将下发到所有 CRM 客户端。
        </template>
      </el-alert>
      <div class="editor-wrapper">
        <RichTextEditor
          v-model="editorContent"
          height="500px"
          :placeholder="`请输入${editingAgreement?.title || '协议'}内容，支持富文本格式...`"
        />
      </div>
      <template #footer>
        <div style="display:flex;justify-content:flex-end;gap:10px">
          <el-button @click="agreementEditorVisible = false" round>取消</el-button>
          <el-button type="primary" @click="saveAgreementContent" round>
            <el-icon><Check /></el-icon> 保存协议内容
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 协议预览弹窗 -->
    <el-dialog
      v-model="agreementPreviewVisible"
      :title="previewAgreementData?.title || '协议预览'"
      width="65%"
      top="5vh"
      class="agreement-preview-dialog"
    >
      <div class="agreement-preview-body" v-html="previewAgreementData?.content || '<p>暂无内容</p>'"></div>
      <template #footer>
        <el-button type="primary" @click="agreementPreviewVisible = false" round>关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Check, Plus, Upload, DocumentCopy, Delete, Document, Lock, Clock, Edit, View } from '@element-plus/icons-vue'
import type { UploadFile } from 'element-plus'
import request from '@/api/request'
import { adminApi } from '@/api/admin'
import RichTextEditor from '@/components/RichTextEditor.vue'

const saving = ref(false)
const activeTab = ref('basic')
const qrFileInput = ref<HTMLInputElement>()
const websiteQrFileInput = ref<HTMLInputElement>()

const form = reactive({
  // 基本信息
  systemName: '',
  systemVersion: '',
  companyName: '',
  contactPhone: '',
  contactEmail: '',
  websiteUrl: '',
  companyAddress: '',
  systemDescription: '',
  systemLogo: '',
  contactQRCode: '',
  contactQRCodeLabel: '',
  // 版权信息
  copyrightText: '',
  icpNumber: '',
  policeNumber: '',
  techSupport: '',
  // 官网专用配置
  websiteConfig: {
    customerServiceUrl: '',
    serviceQRCode: '',
    servicePhone: '',
    serviceEmail: '',
    workingHours: '周一至周五 9:00-18:00',
    brandSlogan: '',
  },
  // 用户协议
  userAgreement: '',
  privacyPolicy: '',
  // 启用状态
  enableBasicOverride: false,
  enableCopyrightOverride: false,
  enableAgreementOverride: false,
  enableConsoleEncryption: false,
  featureFlags: {
    saas: { security: true, call: true, email: true, sms: true, storage: true, product: true, monitor: true, backup: true, order: true, notification: true, agreement: true, mobile: true, logs: true, apiManagement: true, superAdminPanel: true },
    private: { security: true, call: true, email: true, sms: true, storage: true, product: true, monitor: true, backup: true, order: true, notification: true, agreement: true, mobile: true, logs: true, apiManagement: true, superAdminPanel: true }
  },
  // 配置下发
  distributedConfig: {
    security: null,
    call: null,
    email: null,
    sms: null,
    storage: null
  }
})

// Logo上传处理（暂时禁用，功能未实际使用）
// const handleLogoChange = async (file: UploadFile) => {
//   if (file.raw) {
//     try {
//       const formData = new FormData()
//       formData.append('file', file.raw)
//       const res = await adminApi.uploadFile(formData)
//       if (res.success && res.data?.url) {
//         form.systemLogo = res.data.url
//         ElMessage.success('Logo上传成功')
//       } else {
//         ElMessage.error('Logo上传失败')
//       }
//     } catch (error) {
//       // 上传失败时回退为本地预览
//       const reader = new FileReader()
//       reader.onload = (e) => {
//         form.systemLogo = e.target?.result as string
//       }
//       reader.readAsDataURL(file.raw)
//       ElMessage.warning('服务器上传失败，使用本地预览')
//     }
//   }
// }

// 二维码上传处理 - 真实上传到服务器
const handleQRChange = async (file: UploadFile) => {
  if (file.raw) {
    try {
      const formData = new FormData()
      formData.append('file', file.raw)
      const res = await adminApi.uploadFile(formData)
      if (res.success && res.data?.url) {
        form.contactQRCode = res.data.url
        ElMessage.success('二维码上传成功')
      } else {
        ElMessage.error('二维码上传失败')
      }
    } catch (error) {
      // 上传失败时回退为本地预览
      const reader = new FileReader()
      reader.onload = (e) => {
        form.contactQRCode = e.target?.result as string
      }
      reader.readAsDataURL(file.raw)
      ElMessage.warning('服务器上传失败，使用本地预览')
    }
  }
}

// 触发二维码文件选择
const triggerQRUpload = () => {
  qrFileInput.value?.click()
}

// 处理二维码文件选择
const handleQRFileSelect = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    if (!file.type.startsWith('image/')) {
      ElMessage.error('只能上传图片文件!')
      return
    }
    if (file.size / 1024 / 1024 > 2) {
      ElMessage.error('图片大小不能超过 2MB!')
      return
    }
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await adminApi.uploadFile(formData)
      if (res.success && res.data?.url) {
        form.contactQRCode = res.data.url
        ElMessage.success('二维码上传成功')
      } else {
        ElMessage.error('二维码上传失败')
      }
    } catch (error) {
      const reader = new FileReader()
      reader.onload = (e) => {
        form.contactQRCode = e.target?.result as string
      }
      reader.readAsDataURL(file)
      ElMessage.warning('服务器上传失败，使用本地预览')
    }
  }
  input.value = ''
}

// 粘贴二维码图片
const pasteQRImage = async () => {
  try {
    const clipboardItems = await navigator.clipboard.read()
    for (const item of clipboardItems) {
      for (const type of item.types) {
        if (type.startsWith('image/')) {
          const blob = await item.getType(type)
          try {
            const formData = new FormData()
            formData.append('file', blob, 'qrcode.png')
            const res = await adminApi.uploadFile(formData)
            if (res.success && res.data?.url) {
              form.contactQRCode = res.data.url
              ElMessage.success('图片粘贴上传成功')
              return
            }
          } catch {
            // 上传失败，回退到本地预览
          }
          const reader = new FileReader()
          reader.onload = (e) => {
            form.contactQRCode = e.target?.result as string
            ElMessage.success('图片粘贴成功（本地预览）')
          }
          reader.readAsDataURL(blob)
          return
        }
      }
    }
    ElMessage.warning('剪贴板中没有图片')
  } catch {
    ElMessage.error('无法访问剪贴板，请使用上传功能')
  }
}

// 官网客服二维码上传处理
const triggerWebsiteQRUpload = () => {
  websiteQrFileInput.value?.click()
}

const handleWebsiteQRFileSelect = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    if (!file.type.startsWith('image/')) {
      ElMessage.error('只能上传图片文件!')
      return
    }
    if (file.size / 1024 / 1024 > 2) {
      ElMessage.error('图片大小不能超过 2MB!')
      return
    }
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await adminApi.uploadFile(formData)
      if (res.success && res.data?.url) {
        form.websiteConfig.serviceQRCode = res.data.url
        ElMessage.success('客服二维码上传成功')
      } else {
        ElMessage.error('上传失败')
      }
    } catch (error) {
      const reader = new FileReader()
      reader.onload = (e) => {
        form.websiteConfig.serviceQRCode = e.target?.result as string
      }
      reader.readAsDataURL(file)
      ElMessage.warning('服务器上传失败，使用本地预览')
    }
  }
  input.value = ''
}

// 加载配置
const loadConfig = async () => {
  try {
    const res = await request.get('/system-config') as any
    if (res.success && res.data) {
      const { featureFlags: apiFlags, websiteConfig: apiWebsiteConfig, ...rest } = res.data
      Object.assign(form, rest)
      // 合并websiteConfig
      if (apiWebsiteConfig && typeof apiWebsiteConfig === 'object') {
        Object.assign(form.websiteConfig, apiWebsiteConfig)
      }
      // 合并distributedConfig
      if (res.data.distributedConfig) {
        Object.keys(form.distributedConfig).forEach(key => {
          if (res.data.distributedConfig[key] !== undefined) {
            form.distributedConfig[key] = res.data.distributedConfig[key]
          }
        })
      }
      if (apiFlags && typeof apiFlags === "object") {
        if (apiFlags.saas) Object.assign(form.featureFlags.saas, apiFlags.saas)
        if (apiFlags.private) Object.assign(form.featureFlags.private, apiFlags.private)
      }
      // 加载完成后同步协议列表
      syncAgreementListFromForm()
    }
  } catch (error) {
    console.error('加载配置失败:', error)
  }
}

// 保存配置
// Toggle all feature flags

const toggleAll = (type, value) => {
  const target = form.featureFlags[type]
  Object.keys(target).forEach(key => { target[key] = value })
}

const handleSave = async () => {
  saving.value = true
  try {
    const res = await request.post('/system-config', { ...form }) as any
    if (res.success) {
      ElMessage.success('配置保存成功')
    } else {
      ElMessage.error(res.message || '保存失败')
    }
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

// ============ 用户协议管理 ============
interface AgreementItem {
  id: number
  type: 'user' | 'privacy'
  title: string
  content: string
  wordCount: number
  summary: string
  updateTime: string
  enabled: boolean
}

const agreementSaving = ref(false)
const agreementEditorVisible = ref(false)
const agreementPreviewVisible = ref(false)
const editingAgreement = ref<AgreementItem | null>(null)
const previewAgreementData = ref<AgreementItem | null>(null)
const editorContent = ref('')

// 默认用户协议内容
const getDefaultUserAgreement = () => `<h2 style="color: #303133; border-bottom: 3px solid #409eff; padding-bottom: 15px; margin-bottom: 30px; text-align: center; font-size: 24px; font-weight: 700;">用户使用协议</h2>
<p style="color: #606266; margin: 20px 0; font-size: 15px; line-height: 2.2; background: #f8f9fa; padding: 18px; border-radius: 8px; border-left: 4px solid #409eff;">
  <strong>欢迎使用本CRM客户管理系统</strong>（以下简称"本系统"）。在使用本系统之前，<strong style="color: #409eff;">请您仔细阅读并充分理解本协议的全部内容</strong>。
</p>
<h3 style="color: #409eff; margin-top: 36px; margin-bottom: 16px; font-size: 18px; font-weight: 600; padding-left: 14px; border-left: 4px solid #409eff;">一、协议的接受</h3>
<p style="color: #606266; margin: 14px 0; padding-left: 14px; line-height: 2;"><strong>1.1</strong> 本协议是您与本系统运营方之间关于使用本系统服务所订立的协议。</p>
<p style="color: #606266; margin: 14px 0; padding-left: 14px; line-height: 2;"><strong>1.2</strong> 您点击<strong style="color: #409eff;">"同意"</strong>按钮即表示您完全接受本协议的全部条款。</p>
<h3 style="color: #409eff; margin-top: 36px; margin-bottom: 16px; font-size: 18px; font-weight: 600; padding-left: 14px; border-left: 4px solid #409eff;">二、服务内容</h3>
<p style="color: #606266; margin: 14px 0; padding-left: 14px; line-height: 2;"><strong>2.1</strong> 本系统为企业提供客户关系管理服务，包括但不限于：</p>
<ul style="color: #606266; padding-left: 44px; margin: 16px 0; line-height: 2.2;">
  <li style="margin: 8px 0;">✓ 客户信息管理</li>
  <li style="margin: 8px 0;">✓ 订单管理</li>
  <li style="margin: 8px 0;">✓ 业绩统计</li>
  <li style="margin: 8px 0;">✓ 数据分析</li>
  <li style="margin: 8px 0;">✓ 团队协作</li>
</ul>
<p style="color: #606266; margin: 14px 0; padding-left: 14px; line-height: 2;"><strong>2.2</strong> 本系统保留随时修改或中断服务而不需通知用户的权利。</p>
<h3 style="color: #409eff; margin-top: 36px; margin-bottom: 16px; font-size: 18px; font-weight: 600; padding-left: 14px; border-left: 4px solid #409eff;">三、用户权利和义务</h3>
<p style="color: #606266; margin: 18px 0; padding-left: 14px;"><strong style="font-size: 16px; color: #333;">3.1 用户权利：</strong></p>
<ul style="color: #606266; padding-left: 44px; margin: 16px 0; line-height: 2.2;">
  <li style="margin: 8px 0;">✓ 使用本系统提供的各项功能</li>
  <li style="margin: 8px 0;">✓ 管理自己的客户数据</li>
  <li style="margin: 8px 0;">✓ 查看业绩统计报表</li>
  <li style="margin: 8px 0;">✓ 获得技术支持服务</li>
</ul>
<p style="color: #606266; margin: 18px 0; padding-left: 14px;"><strong style="font-size: 16px; color: #333;">3.2 用户义务：</strong></p>
<ul style="color: #606266; padding-left: 44px; margin: 16px 0; line-height: 2.2;">
  <li style="margin: 12px 0; padding: 12px; background: #fff3f3; border-left: 4px solid #f56c6c; border-radius: 4px;"><strong style="color: #f56c6c;">⚠️ 严禁将本系统用于任何违法犯罪活动，包括但不限于诈骗、洗钱、传销等</strong></li>
  <li style="margin: 8px 0;">• 遵守国家法律法规和社会公德</li>
  <li style="margin: 8px 0;">• 不得利用本系统侵害他人合法权益</li>
  <li style="margin: 8px 0;">• 妥善保管账号密码，对账号下的所有行为负责</li>
  <li style="margin: 8px 0;">• 不得恶意攻击、破坏系统</li>
  <li style="margin: 8px 0;">• 不得泄露客户隐私信息</li>
</ul>
<h3 style="color: #409eff; margin-top: 36px; margin-bottom: 16px; font-size: 18px; font-weight: 600; padding-left: 14px; border-left: 4px solid #409eff;">四、免责声明</h3>
<p style="color: #f56c6c; font-weight: bold; margin: 20px 0; padding: 16px; background: #fff3f3; border-left: 4px solid #f56c6c; border-radius: 8px; font-size: 15px;">
  <strong>⚠️ 重要提示：</strong>本系统仅作为工具提供服务，<strong>不对用户使用本系统产生的内容、行为及后果承担任何责任</strong>。
</p>
<p style="color: #606266; margin: 14px 0; padding-left: 14px; line-height: 2;"><strong>4.2</strong> 本系统不对因以下原因导致的损失承担责任：</p>
<ul style="color: #606266; padding-left: 44px; margin: 16px 0; line-height: 2.2;">
  <li style="margin: 8px 0;">• 用户违法违规使用本系统</li>
  <li style="margin: 8px 0;">• 不可抗力因素（自然灾害、战争、政府行为等）</li>
  <li style="margin: 8px 0;">• 网络故障、设备故障</li>
  <li style="margin: 8px 0;">• 用户操作不当或误操作</li>
  <li style="margin: 8px 0;">• 第三方侵权行为</li>
</ul>
<p style="color: #f56c6c; font-weight: bold; margin: 20px 0; padding: 16px; background: #fff3f3; border-left: 4px solid #f56c6c; border-radius: 8px;">
  <strong>4.3</strong> 用户应对其使用本系统的行为<strong>承担全部法律责任</strong>。如因用户违法违规使用本系统导致任何法律纠纷或损失，用户应自行承担全部责任。
</p>
<h3 style="color: #409eff; margin-top: 36px; margin-bottom: 16px; font-size: 18px; font-weight: 600; padding-left: 14px; border-left: 4px solid #409eff;">五、数据安全</h3>
<p style="color: #606266; margin: 14px 0; padding-left: 14px; line-height: 2;"><strong>5.1</strong> 本系统采用<strong style="color: #409eff;">行业标准的安全措施</strong>保护用户数据。</p>
<p style="color: #606266; margin: 14px 0; padding-left: 14px; line-height: 2;"><strong>5.2</strong> 用户应定期备份重要数据，本系统不对数据丢失承担责任。</p>
<p style="color: #606266; margin: 14px 0; padding-left: 14px; line-height: 2;"><strong>5.3</strong> 未经授权访问、使用、修改或破坏系统数据的行为将<strong style="color: #f56c6c;">承担法律责任</strong>。</p>
<h3 style="color: #409eff; margin-top: 36px; margin-bottom: 16px; font-size: 18px; font-weight: 600; padding-left: 14px; border-left: 4px solid #409eff;">六、知识产权</h3>
<p style="color: #606266; margin: 14px 0; padding-left: 14px; line-height: 2;"><strong>6.1</strong> 本系统的所有内容，包括但不限于文字、图片、软件、程序等，均受<strong style="color: #409eff;">知识产权法保护</strong>。</p>
<p style="color: #606266; margin: 14px 0; padding-left: 14px; line-height: 2;"><strong>6.2</strong> 未经许可，用户不得复制、传播、修改本系统的任何内容。</p>
<h3 style="color: #409eff; margin-top: 36px; margin-bottom: 16px; font-size: 18px; font-weight: 600; padding-left: 14px; border-left: 4px solid #409eff;">七、违规处理</h3>
<p style="color: #606266; margin: 14px 0; padding-left: 14px; line-height: 2;"><strong>7.1</strong> 如发现用户违反本协议或从事违法活动，本系统有权：</p>
<ul style="color: #606266; padding-left: 44px; margin: 16px 0; line-height: 2.2;">
  <li style="margin: 8px 0;">• 立即终止服务</li>
  <li style="margin: 8px 0;">• 删除违规内容</li>
  <li style="margin: 8px 0;">• 冻结或注销账号</li>
  <li style="margin: 8px 0;">• 向有关部门报告</li>
  <li style="margin: 8px 0;">• 追究法律责任</li>
</ul>
<h3 style="color: #409eff; margin-top: 36px; margin-bottom: 16px; font-size: 18px; font-weight: 600; padding-left: 14px; border-left: 4px solid #409eff;">八、协议的变更</h3>
<p style="color: #606266; margin: 14px 0; padding-left: 14px; line-height: 2;"><strong>8.1</strong> 本系统有权随时修改本协议条款。</p>
<p style="color: #606266; margin: 14px 0; padding-left: 14px; line-height: 2;"><strong>8.2</strong> 协议变更后，继续使用本系统即视为接受新协议。</p>
<h3 style="color: #409eff; margin-top: 36px; margin-bottom: 16px; font-size: 18px; font-weight: 600; padding-left: 14px; border-left: 4px solid #409eff;">九、争议解决</h3>
<p style="color: #606266; margin: 14px 0; padding-left: 14px; line-height: 2;"><strong>9.1</strong> 本协议的解释、效力及纠纷的解决，适用<strong style="color: #409eff;">中华人民共和国法律</strong>。</p>
<p style="color: #606266; margin: 14px 0; padding-left: 14px; line-height: 2;"><strong>9.2</strong> 若发生争议，双方应友好协商解决；协商不成的，可向本系统所在地人民法院提起诉讼。</p>
<h3 style="color: #409eff; margin-top: 36px; margin-bottom: 16px; font-size: 18px; font-weight: 600; padding-left: 14px; border-left: 4px solid #409eff;">十、其他</h3>
<p style="color: #606266; margin: 14px 0; padding-left: 14px; line-height: 2;"><strong>10.1</strong> 本协议自用户点击同意之日起生效。</p>
<p style="color: #606266; margin: 14px 0; padding-left: 14px; line-height: 2;"><strong>10.2</strong> 如本协议中的任何条款无论因何种原因完全或部分无效或不具有执行力，本协议的其余条款仍应有效并且有约束力。</p>
<div style="margin-top: 40px; padding-top: 20px; border-top: 2px dashed #e0e0e0; text-align: center;">
  <p style="color: #909399; font-size: 13px; margin: 0;">最后更新日期：${new Date().toLocaleDateString('zh-CN')}</p>
</div>`

// 默认隐私协议内容
const getDefaultPrivacyPolicy = () => `<h2 style="color: #303133; border-bottom: 3px solid #67C23A; padding-bottom: 15px; margin-bottom: 30px; text-align: center; font-size: 24px; font-weight: 700;">用户隐私协议</h2>
<p style="color: #606266; margin: 20px 0; font-size: 15px; line-height: 2.2; background: #f8f9fa; padding: 18px; border-radius: 8px; border-left: 4px solid #67C23A;">
  本隐私协议（以下简称<strong style="color: #67C23A;">"本协议"</strong>）适用于本CRM客户管理系统（以下简称<strong style="color: #67C23A;">"本系统"</strong>）。我们非常重视用户的隐私保护，特制定本协议。
</p>
<h3 style="color: #67C23A; margin-top: 36px; margin-bottom: 16px; font-size: 18px; font-weight: 600; padding-left: 14px; border-left: 4px solid #67C23A;">一、信息收集</h3>
<p style="color: #606266; margin: 14px 0; padding-left: 14px; line-height: 2;"><strong>1.1 我们收集的信息类型：</strong></p>
<ul style="color: #606266; padding-left: 44px; margin: 16px 0; line-height: 2.2;">
  <li style="margin: 6px 0;"><strong>账号信息：</strong>用户名、密码、邮箱、手机号</li>
  <li style="margin: 6px 0;"><strong>个人信息：</strong>姓名、部门、职位、头像</li>
  <li style="margin: 6px 0;"><strong>业务信息：</strong>客户数据、订单信息、业绩数据、通话记录</li>
  <li style="margin: 6px 0;"><strong>使用信息：</strong>登录日志、操作记录、访问时间、IP地址</li>
  <li style="margin: 6px 0;"><strong>设备信息：</strong>浏览器类型、操作系统、设备型号</li>
</ul>
<p style="color: #606266; margin: 14px 0; padding-left: 14px; line-height: 2;"><strong>1.2 信息收集方式：</strong></p>
<ul style="color: #606266; padding-left: 44px; margin: 16px 0; line-height: 2.2;">
  <li style="margin: 6px 0;">用户主动提供</li>
  <li style="margin: 6px 0;">系统自动收集</li>
  <li style="margin: 6px 0;">第三方合法提供</li>
</ul>
<h3 style="color: #67C23A; margin-top: 36px; margin-bottom: 16px; font-size: 18px; font-weight: 600; padding-left: 14px; border-left: 4px solid #67C23A;">二、信息使用</h3>
<p style="color: #606266; margin: 14px 0; padding-left: 14px; line-height: 2;"><strong>2.1 我们使用收集的信息用于：</strong></p>
<ul style="color: #606266; padding-left: 44px; margin: 16px 0; line-height: 2.2;">
  <li style="margin: 6px 0;">提供系统服务和功能</li>
  <li style="margin: 6px 0;">改进用户体验</li>
  <li style="margin: 6px 0;">数据统计和分析</li>
  <li style="margin: 6px 0;">安全监控和风险防范</li>
  <li style="margin: 6px 0;">技术支持和客户服务</li>
</ul>
<p style="color: #606266; margin: 14px 0; padding-left: 14px; line-height: 2;"><strong>2.2 我们承诺：</strong></p>
<ul style="color: #606266; padding-left: 44px; margin: 16px 0; line-height: 2.2;">
  <li style="margin: 6px 0;">不会将用户信息用于本协议未载明的其他用途</li>
  <li style="margin: 6px 0;">不会向第三方出售、出租或共享用户信息</li>
  <li style="margin: 6px 0;">严格限制信息访问权限，仅授权人员可访问</li>
</ul>
<h3 style="color: #67C23A; margin-top: 36px; margin-bottom: 16px; font-size: 18px; font-weight: 600; padding-left: 14px; border-left: 4px solid #67C23A;">三、信息存储</h3>
<p style="color: #606266; margin: 14px 0; padding-left: 14px; line-height: 2;"><strong>3.1 存储位置：</strong></p>
<ul style="color: #606266; padding-left: 44px; margin: 16px 0; line-height: 2.2;">
  <li style="margin: 6px 0;">用户数据存储在安全的服务器上</li>
  <li style="margin: 6px 0;">采用加密技术保护敏感信息</li>
</ul>
<p style="color: #606266; margin: 14px 0; padding-left: 14px; line-height: 2;"><strong>3.2 存储期限：</strong></p>
<ul style="color: #606266; padding-left: 44px; margin: 16px 0; line-height: 2.2;">
  <li style="margin: 6px 0;">账号存续期间持续存储</li>
  <li style="margin: 6px 0;">账号注销后，数据将在30天内删除</li>
  <li style="margin: 6px 0;">法律法规要求保留的除外</li>
</ul>
<h3 style="color: #67C23A; margin-top: 36px; margin-bottom: 16px; font-size: 18px; font-weight: 600; padding-left: 14px; border-left: 4px solid #67C23A;">四、信息保护</h3>
<p style="color: #606266; margin: 14px 0; padding-left: 14px; line-height: 2;"><strong>4.1 安全措施：</strong></p>
<ul style="color: #606266; padding-left: 44px; margin: 16px 0; line-height: 2.2;">
  <li style="margin: 6px 0;">数据加密传输（HTTPS）</li>
  <li style="margin: 6px 0;">密码加密存储（不可逆加密）</li>
  <li style="margin: 6px 0;">访问权限控制（角色权限管理）</li>
  <li style="margin: 6px 0;">定期安全审计</li>
  <li style="margin: 6px 0;">异常行为监控和预警</li>
  <li style="margin: 6px 0;">数据备份和恢复机制</li>
</ul>
<h3 style="color: #67C23A; margin-top: 36px; margin-bottom: 16px; font-size: 18px; font-weight: 600; padding-left: 14px; border-left: 4px solid #67C23A;">五、信息共享</h3>
<p style="color: #f56c6c; font-weight: bold; margin: 14px 0; padding-left: 14px; line-height: 2;">5.1 我们不会与第三方共享用户信息，除非：</p>
<ul style="color: #606266; padding-left: 44px; margin: 16px 0; line-height: 2.2;">
  <li style="margin: 6px 0;">获得用户明确同意</li>
  <li style="margin: 6px 0;">法律法规明确要求</li>
  <li style="margin: 6px 0;">司法机关或行政机关依法要求</li>
  <li style="margin: 6px 0;">保护系统安全所必需</li>
</ul>
<h3 style="color: #67C23A; margin-top: 36px; margin-bottom: 16px; font-size: 18px; font-weight: 600; padding-left: 14px; border-left: 4px solid #67C23A;">六、用户权利</h3>
<p style="color: #606266; margin: 14px 0; padding-left: 14px; line-height: 2;"><strong>6.1 您享有以下权利：</strong></p>
<ul style="color: #606266; padding-left: 44px; margin: 16px 0; line-height: 2.2;">
  <li style="margin: 6px 0;">访问您的个人信息</li>
  <li style="margin: 6px 0;">更正不准确的信息</li>
  <li style="margin: 6px 0;">删除您的个人信息</li>
  <li style="margin: 6px 0;">撤回信息使用授权</li>
  <li style="margin: 6px 0;">注销您的账号</li>
</ul>
<h3 style="color: #67C23A; margin-top: 36px; margin-bottom: 16px; font-size: 18px; font-weight: 600; padding-left: 14px; border-left: 4px solid #67C23A;">七、Cookie和类似技术</h3>
<p style="color: #606266; margin: 14px 0; padding-left: 14px; line-height: 2;">7.1 本系统使用Cookie和localStorage技术记住登录状态、保存用户偏好设置。</p>
<p style="color: #606266; margin: 14px 0; padding-left: 14px; line-height: 2;">7.2 您可以通过浏览器设置管理Cookie和localStorage。</p>
<h3 style="color: #67C23A; margin-top: 36px; margin-bottom: 16px; font-size: 18px; font-weight: 600; padding-left: 14px; border-left: 4px solid #67C23A;">八、未成年人保护</h3>
<p style="color: #606266; margin: 14px 0; padding-left: 14px; line-height: 2;">8.1 本系统不向未满18周岁的未成年人提供服务。</p>
<p style="color: #606266; margin: 14px 0; padding-left: 14px; line-height: 2;">8.2 如发现未成年人使用本系统，我们将立即停止服务并删除相关信息。</p>
<h3 style="color: #67C23A; margin-top: 36px; margin-bottom: 16px; font-size: 18px; font-weight: 600; padding-left: 14px; border-left: 4px solid #67C23A;">九、隐私协议的变更</h3>
<p style="color: #606266; margin: 14px 0; padding-left: 14px; line-height: 2;">9.1 我们可能适时修订本协议。</p>
<p style="color: #606266; margin: 14px 0; padding-left: 14px; line-height: 2;">9.2 变更后的协议将在系统内公布，继续使用即视为接受新协议。</p>
<p style="color: #606266; margin: 14px 0; padding-left: 14px; line-height: 2;">9.3 重大变更将通过系统通知或邮件方式告知用户。</p>
<h3 style="color: #67C23A; margin-top: 36px; margin-bottom: 16px; font-size: 18px; font-weight: 600; padding-left: 14px; border-left: 4px solid #67C23A;">十、联系我们</h3>
<p style="color: #606266; margin: 14px 0; padding-left: 14px; line-height: 2;">如您对本隐私协议有任何疑问、意见或建议，请通过系统内的联系方式与我们取得联系。</p>
<p style="color: #606266; margin: 14px 0; padding-left: 14px; line-height: 2;">我们将在收到您的反馈后15个工作日内予以回复。</p>
<div style="margin-top: 40px; padding-top: 20px; border-top: 2px dashed #e0e0e0; text-align: center;">
  <p style="color: #909399; font-size: 13px; margin: 0;">最后更新日期：${new Date().toLocaleDateString('zh-CN')}</p>
</div>`

const defaultUserContent = getDefaultUserAgreement()
const defaultPrivacyContent = getDefaultPrivacyPolicy()

const stripHtml = (html: string): string => {
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return tmp.textContent || tmp.innerText || ''
}
const countWords = (html: string): number => stripHtml(html).replace(/\s/g, '').length
const generateSummary = (html: string): string => {
  const text = stripHtml(html).replace(/\s+/g, ' ').trim()
  return text.length > 100 ? text.substring(0, 100) + '...' : text
}

const agreementList = ref<AgreementItem[]>([
  { id: 1, type: 'user', title: '用户使用协议', content: defaultUserContent, wordCount: countWords(defaultUserContent), summary: generateSummary(defaultUserContent), updateTime: new Date().toLocaleString('zh-CN'), enabled: true },
  { id: 2, type: 'privacy', title: '用户隐私协议', content: defaultPrivacyContent, wordCount: countWords(defaultPrivacyContent), summary: generateSummary(defaultPrivacyContent), updateTime: new Date().toLocaleString('zh-CN'), enabled: true }
])

const openAgreementEditor = (item: AgreementItem) => {
  editingAgreement.value = item
  editorContent.value = item.content || ''
  agreementEditorVisible.value = true
}

const saveAgreementContent = () => {
  if (!editingAgreement.value) return
  if (!editorContent.value.trim() || editorContent.value === '<p><br></p>') {
    ElMessage.warning('协议内容不能为空')
    return
  }
  const item = editingAgreement.value
  item.content = editorContent.value
  item.wordCount = countWords(editorContent.value)
  item.summary = generateSummary(editorContent.value)
  item.updateTime = new Date().toLocaleString('zh-CN')
  agreementEditorVisible.value = false
  ElMessage.success(`「${item.title}」内容已更新`)
}

const previewAgreement = (item: AgreementItem) => {
  if (!item.content) {
    ElMessage.warning('该协议暂未编辑内容')
    return
  }
  previewAgreementData.value = item
  agreementPreviewVisible.value = true
}

const handleSaveAgreements = async () => {
  agreementSaving.value = true
  try {
    const userItem = agreementList.value.find(a => a.type === 'user')
    const privacyItem = agreementList.value.find(a => a.type === 'privacy')
    form.userAgreement = userItem?.enabled && userItem?.content ? userItem.content : ''
    form.privacyPolicy = privacyItem?.enabled && privacyItem?.content ? privacyItem.content : ''
    const res = await request.post('/system-config', { ...form }) as any
    if (res.success) {
      ElMessage.success('协议已保存，开启「启用状态→用户协议覆盖」后将下发到所有CRM客户端')
    } else {
      ElMessage.error(res.message || '保存失败')
    }
  } catch {
    ElMessage.error('保存失败，请稍后重试')
  } finally {
    agreementSaving.value = false
  }
}

const syncAgreementListFromForm = () => {
  const userItem = agreementList.value.find(a => a.type === 'user')
  const privacyItem = agreementList.value.find(a => a.type === 'privacy')
  if (userItem && form.userAgreement) {
    userItem.content = form.userAgreement
    userItem.wordCount = countWords(form.userAgreement)
    userItem.summary = generateSummary(form.userAgreement)
    userItem.updateTime = '已配置'
  }
  if (privacyItem && form.privacyPolicy) {
    privacyItem.content = form.privacyPolicy
    privacyItem.wordCount = countWords(form.privacyPolicy)
    privacyItem.summary = generateSummary(form.privacyPolicy)
    privacyItem.updateTime = '已配置'
  }
}

onMounted(() => {
  loadConfig()
})
</script>

<style scoped lang="scss">
.page-container {
  min-height: 100%;
}

.config-card {
  border-radius: 12px;
  border: none;

  :deep(.el-card__header) {
    border-bottom: 1px solid #f0f0f0;
    padding: 20px 24px;
  }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .header-left {
    .title {
      font-size: 18px;
      font-weight: 600;
      color: #303133;
    }

    .subtitle {
      display: block;
      font-size: 13px;
      color: #909399;
      margin-top: 4px;
    }
  }
}

.tip-alert {
  margin-bottom: 20px;
}

.config-form {
  max-width: 900px;
  padding: 20px 0;
}

.logo-uploader, .qr-uploader {
  :deep(.el-upload) {
    border: 1px dashed #d9d9d9;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: border-color 0.3s;

    &:hover {
      border-color: #409eff;
    }
  }
}

.logo-uploader :deep(.el-upload) {
  width: 200px;
  height: 60px;
}

.qr-uploader :deep(.el-upload) {
  width: 120px;
  height: 120px;
}

.logo-preview {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.qr-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 8px;
}

.logo-icon, .qr-icon {
  font-size: 28px;
  color: #8c939d;
}

.upload-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
}

.form-tip {
  margin-left: 12px;
  font-size: 12px;
  color: #909399;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 16px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
}

.qr-upload-buttons {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

.qr-preview-area {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-top: 10px;
}

.qr-preview-img {
  width: 120px;
  height: 120px;
  object-fit: cover;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
}

.copyright-preview {
  .preview-box {
    background: #1d1e1f;
    color: #909399;
    padding: 20px;
    border-radius: 8px;
    text-align: center;
    font-size: 12px;

    p {
      margin: 5px 0;
    }
  }
}

.features-header {
  margin-bottom: 24px;
}

.features-title {
  display: flex;
  align-items: center;
  gap: 16px;
}

.features-title h3 {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 4px 0;
}

.features-title p {
  font-size: 13px;
  color: #909399;
  margin: 0;
}

.feature-flags-container {
  margin-top: 0;
}

.feature-card {
  border-radius: 12px;
  transition: all 0.3s ease;
  overflow: hidden;

  :deep(.el-card__header) {
    padding: 16px 20px;
    background: linear-gradient(135deg, #f8f9fe 0%, #f0f2ff 100%);
  }

  :deep(.el-card__body) {
    padding: 8px 20px 20px;
  }

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }
}

.saas-card {
  border-top: 3px solid #409eff;

  :deep(.el-card__header) {
    background: linear-gradient(135deg, #f0f7ff 0%, #e8f4ff 100%);
  }
}

.private-card {
  border-top: 3px solid #67c23a;

  :deep(.el-card__header) {
    background: linear-gradient(135deg, #f0f9eb 0%, #e8f5e0 100%);
  }
}

.feature-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;

  .card-title-area {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .card-title-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .card-title {
    font-size: 16px;
    font-weight: 600;
    color: #303133;
  }

  .card-subtitle {
    font-size: 12px;
    color: #909399;
  }

  .card-actions {
    display: flex;
    align-items: center;
    gap: 4px;
  }
}

.feature-group {
  margin-bottom: 16px;

  &:last-child {
    margin-bottom: 0;
  }

  .group-label {
    font-size: 13px;
    font-weight: 600;
    color: #606266;
    padding: 10px 0 6px;
    border-bottom: 1px solid #ebeef5;
    margin-bottom: 4px;
    letter-spacing: 1px;
  }

  .group-items {
    padding: 0;
  }
}

.switch-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  border-radius: 8px;
  transition: all 0.2s ease;
  margin: 2px 0;

  &:hover {
    background: #f5f7fa;
  }

  .switch-info {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
  }

  .switch-icon {
    font-size: 18px;
    color: #909399;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f4f4f5;
    border-radius: 8px;
    flex-shrink: 0;
  }

  .switch-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .switch-name {
    font-size: 14px;
    color: #303133;
    font-weight: 500;
  }

  .switch-desc {
    font-size: 12px;
    color: #909399;
    line-height: 1.4;
  }
}

.feature-save-area {
  margin-top: 24px;
  text-align: center;
  padding: 16px 0;
}

// 协议预览弹窗样式
.agreement-preview-dialog {
  :deep(.el-dialog) {
    border-radius: 12px;
    overflow: hidden;
  }
  :deep(.el-dialog__header) {
    padding: 18px 24px;
    border-bottom: 1px solid #f0f0f0;
    background: linear-gradient(135deg, #fafbfc 0%, #f0f2ff 100%);
  }
  :deep(.el-dialog__body) {
    padding: 0;
    max-height: 65vh;
    overflow-y: auto;
  }
  :deep(.el-dialog__footer) {
    border-top: 1px solid #f0f0f0;
    padding: 14px 24px;
    background: #fafbfc;
  }
}

.agreement-preview-body {
  padding: 28px 32px;
  line-height: 2;
  font-size: 14px;
  color: #4a5568;
}

// 协议编辑弹窗
.agreement-editor-dialog {
  :deep(.el-dialog) {
    border-radius: 12px;
  }
  :deep(.el-dialog__header) {
    border-bottom: 1px solid #f0f0f0;
  }
}

// 协议表格区域
.agreement-section {
  .agreement-table {
    border-radius: 8px;
    overflow: hidden;
  }
}
</style>
