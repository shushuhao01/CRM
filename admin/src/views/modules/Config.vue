<template>
  <div class="page-container">
    <el-card shadow="never" class="config-card">
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <span class="title">基础配置</span>
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

        <!-- 用户协议 -->
        <el-tab-pane label="用户协议" name="agreement">
          <el-form :model="form" label-width="120px" class="config-form">
            <el-form-item label="用户协议">
              <el-input v-model="form.userAgreement" type="textarea" :rows="10" placeholder="请输入用户使用协议内容" />
            </el-form-item>
            <el-form-item label="隐私政策">
              <el-input v-model="form.privacyPolicy" type="textarea" :rows="10" placeholder="请输入隐私政策内容" />
            </el-form-item>
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

        <!-- 配置下发 -->
        <el-tab-pane label="配置下发" name="distribute">
          <el-alert type="info" :closable="false" style="margin-bottom: 20px">
            <template #title>
              开启配置下发后，对应配置项将统一下发到所有CRM客户端，客户端将无法自行修改。未开启的配置项则由各租户/私有部署自行管理。
            </template>
          </el-alert>

          <el-card shadow="hover" class="distribute-card" style="margin-bottom: 16px">
            <div class="switch-row">
              <div class="switch-info">
                <el-icon class="switch-icon"><Lock /></el-icon>
                <div class="switch-text">
                  <span class="switch-name">安全策略</span>
                  <span class="switch-desc">密码策略、登录安全等配置统一下发</span>
                </div>
              </div>
              <el-switch :model-value="form.distributedConfig.security !== null" @change="toggleDistribute('security', $event)" />
            </div>
          </el-card>
          <el-card shadow="hover" class="distribute-card" style="margin-bottom: 16px">
            <div class="switch-row">
              <div class="switch-info">
                <el-icon class="switch-icon"><FolderOpened /></el-icon>
                <div class="switch-text">
                  <span class="switch-name">存储设置</span>
                  <span class="switch-desc">文件存储、OSS等配置统一下发</span>
                </div>
              </div>
              <el-switch :model-value="form.distributedConfig.storage !== null" @change="toggleDistribute('storage', $event)" />
            </div>
          </el-card>
          <el-card shadow="hover" class="distribute-card" style="margin-bottom: 16px">
            <div class="switch-row">
              <div class="switch-info">
                <el-icon class="switch-icon"><Goods /></el-icon>
                <div class="switch-text">
                  <span class="switch-name">商品策略</span>
                  <span class="switch-desc">商品分类、SKU等配置统一下发</span>
                </div>
              </div>
              <el-switch :model-value="form.distributedConfig.product !== null" @change="toggleDistribute('product', $event)" />
            </div>
          </el-card>
          <el-card shadow="hover" class="distribute-card" style="margin-bottom: 16px">
            <div class="switch-row">
              <div class="switch-info">
                <el-icon class="switch-icon"><Phone /></el-icon>
                <div class="switch-text">
                  <span class="switch-name">通话设置</span>
                  <span class="switch-desc">SIP服务器、通话录音等配置统一下发</span>
                </div>
              </div>
              <el-switch :model-value="form.distributedConfig.call !== null" @change="toggleDistribute('call', $event)" />
            </div>
          </el-card>
          <el-card shadow="hover" class="distribute-card" style="margin-bottom: 16px">
            <div class="switch-row">
              <div class="switch-info">
                <el-icon class="switch-icon"><Document /></el-icon>
                <div class="switch-text">
                  <span class="switch-name">订单设置</span>
                  <span class="switch-desc">订单流程、审批规则等配置统一下发</span>
                </div>
              </div>
              <el-switch :model-value="form.distributedConfig.order !== null" @change="toggleDistribute('order', $event)" />
            </div>
          </el-card>

          <div class="feature-save-area">
            <el-button type="primary" size="large" round @click="handleSave" :loading="saving">
              <el-icon><Check /></el-icon>保存配置下发设置
            </el-button>
          </div>
        </el-tab-pane>

      </el-tabs>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Check, Plus, Upload, DocumentCopy, Delete } from '@element-plus/icons-vue'
import type { UploadFile } from 'element-plus'
import request from '@/api/request'
import { adminApi } from '@/api/admin'

const saving = ref(false)
const activeTab = ref('basic')
const qrFileInput = ref<HTMLInputElement>()

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
  // 用户协议
  userAgreement: '',
  privacyPolicy: '',
  // 启用状态
  enableBasicOverride: false,
  enableCopyrightOverride: false,
  enableAgreementOverride: false,
  featureFlags: {
    saas: { security: true, call: true, email: true, sms: true, storage: true, product: true, monitor: true, backup: true, order: true, notification: true, agreement: true, mobile: true, logs: true, apiManagement: true },
    private: { security: true, call: true, email: true, sms: true, storage: true, product: true, monitor: true, backup: true, order: true, notification: true, agreement: true, mobile: true, logs: true, apiManagement: true }
  },
  // 配置下发
  distributedConfig: {
    security: null,
    product: null,
    call: null,
    order: null,
    storage: null
  }
})

// Logo上传处理 - 真实上传到服务器
const handleLogoChange = async (file: UploadFile) => {
  if (file.raw) {
    try {
      const formData = new FormData()
      formData.append('file', file.raw)
      const res = await adminApi.uploadFile(formData)
      if (res.success && res.data?.url) {
        form.systemLogo = res.data.url
        ElMessage.success('Logo上传成功')
      } else {
        ElMessage.error('Logo上传失败')
      }
    } catch (error) {
      // 上传失败时回退为本地预览
      const reader = new FileReader()
      reader.onload = (e) => {
        form.systemLogo = e.target?.result as string
      }
      reader.readAsDataURL(file.raw)
      ElMessage.warning('服务器上传失败，使用本地预览')
    }
  }
}

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

// 加载配置
const loadConfig = async () => {
  try {
    const res = await request.get('/system-config') as any
    if (res.success && res.data) {
      const { featureFlags: apiFlags, ...rest } = res.data
      Object.assign(form, rest)
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
    }
  } catch (error) {
    console.error('加载配置失败:', error)
  }
}

// 保存配置
// Toggle all feature flags
// 切换配置下发开关
const toggleDistribute = (key: string, enabled: boolean) => {
  if (enabled) {
    // 开启: 设置为空对象（表示管控但尚未配置具体值）
    form.distributedConfig[key] = {}
  } else {
    // 关闭: 设置为null（表示不管控）
    form.distributedConfig[key] = null
  }
}

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
</style>
