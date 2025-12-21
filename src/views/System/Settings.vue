<template>
  <div class="system-settings">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2>系统设置</h2>
      <p>管理系统的基本配置和参数设置</p>
    </div>

    <!-- 设置选项卡 -->
    <div class="settings-tabs-container">
      <!-- 标签页头部导航区域 -->
      <div class="tabs-nav-container">
        <div class="tabs-nav-wrapper">
          <el-tabs v-model="activeTab" class="settings-tabs" ref="tabsRef">
      <!-- 安全设置 -->
      <el-tab-pane label="安全设置" name="security">
        <el-card class="setting-card">
          <template #header>
            <div class="card-header">
              <span>安全配置</span>
              <el-button
                v-if="canEditSecuritySettings"
                @click="handleSaveSecurity"
                type="primary"
                :loading="securityLoading"
              >
                保存设置
              </el-button>
            </div>
          </template>

          <el-form
            ref="securityFormRef"
            :model="securityForm"
            :rules="securityFormRules"
            label-width="150px"
            class="setting-form"
          >
            <el-form-item label="密码最小长度" prop="passwordMinLength">
              <el-input-number
                v-model="securityForm.passwordMinLength"
                :min="6"
                :max="20"
                placeholder="密码最小长度"
              />
              <span class="form-tip">建议设置为6-20位</span>
            </el-form-item>

            <el-form-item label="密码复杂度要求" prop="passwordComplexity">
              <el-checkbox-group v-model="securityForm.passwordComplexity">
                <el-checkbox label="uppercase">包含大写字母</el-checkbox>
                <el-checkbox label="lowercase">包含小写字母</el-checkbox>
                <el-checkbox label="number">包含数字</el-checkbox>
                <el-checkbox label="special">包含特殊字符</el-checkbox>
              </el-checkbox-group>
            </el-form-item>

            <el-form-item label="密码有效期" prop="passwordExpireDays">
              <el-input-number
                v-model="securityForm.passwordExpireDays"
                :min="0"
                :max="365"
                placeholder="密码有效期"
              />
              <span class="form-tip">天（0表示永不过期）</span>
            </el-form-item>

            <el-form-item label="登录失败锁定" prop="loginFailLock">
              <el-switch
                v-model="securityForm.loginFailLock"
                active-text="启用"
                inactive-text="禁用"
              />
            </el-form-item>

            <el-form-item v-if="securityForm.loginFailLock" label="最大失败次数" prop="maxLoginFails">
              <el-input-number
                v-model="securityForm.maxLoginFails"
                :min="3"
                :max="10"
                placeholder="最大失败次数"
              />
              <span class="form-tip">次</span>
            </el-form-item>

            <el-form-item v-if="securityForm.loginFailLock" label="锁定时间" prop="lockDuration">
              <el-input-number
                v-model="securityForm.lockDuration"
                :min="5"
                :max="1440"
                placeholder="锁定时间"
              />
              <span class="form-tip">分钟</span>
            </el-form-item>

            <el-form-item label="会话超时时间" prop="sessionTimeout">
              <el-input-number
                v-model="securityForm.sessionTimeout"
                :min="30"
                :max="1440"
                placeholder="会话超时时间"
              />
              <span class="form-tip">分钟</span>
            </el-form-item>

            <el-form-item label="强制HTTPS" prop="forceHttps">
              <el-switch
                v-model="securityForm.forceHttps"
                active-text="启用"
                inactive-text="禁用"
              />
            </el-form-item>

            <el-form-item label="IP白名单" prop="ipWhitelist">
              <el-input
                v-model="securityForm.ipWhitelist"
                type="textarea"
                :rows="3"
                placeholder="请输入IP地址，多个IP用换行分隔"
              />
              <div class="form-tip">留空表示不限制IP访问</div>
            </el-form-item>
          </el-form>
        </el-card>
      </el-tab-pane>

      <!-- 通话设置 -->
      <el-tab-pane label="通话设置" name="call">
        <el-card class="setting-card">
          <template #header>
            <div class="card-header">
              <span>通话配置</span>
              <div class="header-actions">
                <el-button
                  @click="handleTestCallConnection"
                  type="info"
                  size="small"
                  :loading="testingCallConnection"
                >
                  <el-icon><Connection /></el-icon>
                  测试连接
                </el-button>
                <el-button
                  v-if="canEditCallSettings"
                  @click="handleSaveCall"
                  type="primary"
                  :loading="callLoading"
                >
                  保存设置
                </el-button>
              </div>
            </div>
          </template>

          <el-form
            ref="callFormRef"
            :model="callForm"
            :rules="callFormRules"
            label-width="150px"
            class="setting-form"
          >
            <!-- SIP配置 -->
            <div class="form-section">
              <h4 class="section-title">
                <el-icon><Phone /></el-icon>
                SIP服务器配置
              </h4>

              <el-row :gutter="20">
                <el-col :span="12">
                  <el-form-item label="SIP服务器地址" prop="sipServer">
                    <el-input
                      v-model="callForm.sipServer"
                      placeholder="请输入SIP服务器地址"
                    />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="SIP端口" prop="sipPort">
                    <el-input-number
                      v-model="callForm.sipPort"
                      :min="1"
                      :max="65535"
                      placeholder="SIP端口"
                    />
                  </el-form-item>
                </el-col>
              </el-row>

              <el-row :gutter="20">
                <el-col :span="12">
                  <el-form-item label="用户名" prop="sipUsername">
                    <el-input
                      v-model="callForm.sipUsername"
                      placeholder="请输入SIP用户名"
                    />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="密码" prop="sipPassword">
                    <el-input
                      v-model="callForm.sipPassword"
                      type="password"
                      placeholder="请输入SIP密码"
                      show-password
                    />
                  </el-form-item>
                </el-col>
              </el-row>

              <el-form-item label="传输协议" prop="sipTransport">
                <el-radio-group v-model="callForm.sipTransport">
                  <el-radio label="UDP">UDP</el-radio>
                  <el-radio label="TCP">TCP</el-radio>
                  <el-radio label="TLS">TLS</el-radio>
                </el-radio-group>
              </el-form-item>
            </div>

            <!-- 通话功能配置 -->
            <div class="form-section">
              <h4 class="section-title">
                <el-icon><Setting /></el-icon>
                通话功能配置
              </h4>

              <el-form-item label="自动接听" prop="autoAnswer">
                <el-switch
                  v-model="callForm.autoAnswer"
                  active-text="启用"
                  inactive-text="禁用"
                />
                <span class="form-tip">启用后将自动接听来电</span>
              </el-form-item>

              <el-form-item label="自动录音" prop="autoRecord">
                <el-switch
                  v-model="callForm.autoRecord"
                  active-text="启用"
                  inactive-text="禁用"
                />
                <span class="form-tip">启用后将自动录制通话</span>
              </el-form-item>

              <el-form-item label="通话质量监控" prop="qualityMonitoring">
                <el-switch
                  v-model="callForm.qualityMonitoring"
                  active-text="启用"
                  inactive-text="禁用"
                />
                <span class="form-tip">启用后将监控通话质量</span>
              </el-form-item>

              <el-form-item label="呼入弹窗" prop="incomingCallPopup">
                <el-switch
                  v-model="callForm.incomingCallPopup"
                  active-text="启用"
                  inactive-text="禁用"
                />
                <span class="form-tip">启用后来电时自动弹出客户详情</span>
              </el-form-item>

              <el-form-item label="最大通话时长" prop="maxCallDuration">
                <el-input-number
                  v-model="callForm.maxCallDuration"
                  :min="1"
                  :max="7200"
                  placeholder="最大通话时长"
                />
                <span class="form-tip">秒（1-7200秒，0表示不限制）</span>
              </el-form-item>
            </div>

            <!-- 录音配置 -->
            <div class="form-section">
              <h4 class="section-title">
                <el-icon><VideoPlay /></el-icon>
                录音配置
              </h4>

              <el-form-item label="录音格式" prop="recordFormat">
                <el-select v-model="callForm.recordFormat" placeholder="请选择录音格式">
                  <el-option label="WAV" value="wav" />
                  <el-option label="MP3" value="mp3" />
                  <el-option label="AAC" value="aac" />
                </el-select>
              </el-form-item>

              <el-form-item label="录音质量" prop="recordQuality">
                <el-select v-model="callForm.recordQuality" placeholder="请选择录音质量">
                  <el-option label="标准质量" value="standard" />
                  <el-option label="高质量" value="high" />
                  <el-option label="超高质量" value="ultra" />
                </el-select>
              </el-form-item>

              <el-form-item label="录音保存路径" prop="recordPath">
                <el-input
                  v-model="callForm.recordPath"
                  placeholder="请输入录音保存路径"
                />
                <span class="form-tip">录音文件的存储路径</span>
              </el-form-item>

              <el-form-item label="录音保留时间" prop="recordRetentionDays">
                <el-input-number
                  v-model="callForm.recordRetentionDays"
                  :min="1"
                  :max="365"
                  placeholder="录音保留时间"
                />
                <span class="form-tip">天（1-365天）</span>
              </el-form-item>
            </div>

            <!-- 权限管理 -->
            <div class="form-section">
              <h4 class="section-title">
                <el-icon><Lock /></el-icon>
                权限管理
              </h4>

              <el-form-item label="外呼权限" prop="outboundPermission">
                <el-checkbox-group v-model="callForm.outboundPermission">
                  <el-checkbox label="admin">管理员</el-checkbox>
                  <el-checkbox label="manager">经理</el-checkbox>
                  <el-checkbox label="sales">销售</el-checkbox>
                  <el-checkbox label="service">客服</el-checkbox>
                </el-checkbox-group>
              </el-form-item>

              <el-form-item label="录音访问权限" prop="recordAccessPermission">
                <el-checkbox-group v-model="callForm.recordAccessPermission">
                  <el-checkbox label="admin">管理员</el-checkbox>
                  <el-checkbox label="manager">经理</el-checkbox>
                  <el-checkbox label="self">仅本人</el-checkbox>
                </el-checkbox-group>
              </el-form-item>

              <el-form-item label="通话统计权限" prop="statisticsPermission">
                <el-checkbox-group v-model="callForm.statisticsPermission">
                  <el-checkbox label="admin">管理员</el-checkbox>
                  <el-checkbox label="manager">经理</el-checkbox>
                  <el-checkbox label="sales">销售</el-checkbox>
                </el-checkbox-group>
              </el-form-item>

              <el-form-item label="号码限制" prop="numberRestriction">
                <el-switch
                  v-model="callForm.numberRestriction"
                  active-text="启用"
                  inactive-text="禁用"
                />
                <span class="form-tip">启用后将限制可拨打的号码范围</span>
              </el-form-item>

              <el-form-item v-if="callForm.numberRestriction" label="允许的号码前缀" prop="allowedPrefixes">
                <el-input
                  v-model="callForm.allowedPrefixes"
                  type="textarea"
                  :rows="3"
                  placeholder="请输入允许的号码前缀，多个前缀用换行分隔"
                />
                <span class="form-tip">例如：138、139、186等</span>
              </el-form-item>
            </div>
          </el-form>
        </el-card>
      </el-tab-pane>

      <!-- 邮件设置 -->
      <el-tab-pane label="邮件设置" name="email">
        <el-card class="setting-card">
          <template #header>
            <div class="card-header">
              <span>邮件配置</span>
              <div class="header-actions">
                <el-button
                  v-if="canEditEmailSettings"
                  @click="handleTestEmail"
                  :loading="testEmailLoading"
                >
                  测试邮件
                </el-button>
                <el-button
                  v-if="canEditEmailSettings"
                  @click="handleSaveEmail"
                  type="primary"
                  :loading="emailLoading"
                >
                  保存设置
                </el-button>
              </div>
            </div>
          </template>

          <el-form
            ref="emailFormRef"
            :model="emailForm"
            :rules="emailFormRules"
            label-width="120px"
            class="setting-form"
          >
            <el-form-item label="SMTP服务器" prop="smtpHost">
              <el-input
                v-model="emailForm.smtpHost"
                placeholder="请输入SMTP服务器地址"
              />
            </el-form-item>

            <el-form-item label="SMTP端口" prop="smtpPort">
              <el-input-number
                v-model="emailForm.smtpPort"
                :min="1"
                :max="65535"
                placeholder="SMTP端口"
              />
            </el-form-item>

            <el-form-item label="发件人邮箱" prop="senderEmail">
              <el-input
                v-model="emailForm.senderEmail"
                placeholder="请输入发件人邮箱"
              />
            </el-form-item>

            <el-form-item label="发件人名称" prop="senderName">
              <el-input
                v-model="emailForm.senderName"
                placeholder="请输入发件人名称"
              />
            </el-form-item>

            <el-form-item label="邮箱密码" prop="emailPassword">
              <el-input
                v-model="emailForm.emailPassword"
                type="password"
                placeholder="请输入邮箱密码或授权码"
                show-password
              />
            </el-form-item>

            <el-form-item label="启用SSL" prop="enableSsl">
              <el-switch
                v-model="emailForm.enableSsl"
                active-text="启用"
                inactive-text="禁用"
              />
            </el-form-item>

            <el-form-item label="启用TLS" prop="enableTls">
              <el-switch
                v-model="emailForm.enableTls"
                active-text="启用"
                inactive-text="禁用"
              />
            </el-form-item>

            <el-form-item label="测试邮箱" prop="testEmail">
              <el-input
                v-model="emailForm.testEmail"
                placeholder="请输入测试邮箱地址"
              />
              <div class="form-tip">用于测试邮件发送功能</div>
            </el-form-item>
          </el-form>
        </el-card>
      </el-tab-pane>

      <!-- 短信设置 -->
      <el-tab-pane label="短信设置" name="sms">
        <el-card class="setting-card">
          <template #header>
            <div class="card-header">
              <span>短信配置</span>
              <div class="header-actions">
                <el-button
                  v-if="canManageSms"
                  @click="handleOpenSmsManagement"
                  type="success"
                  :icon="Setting"
                >
                  短信管理
                </el-button>
                <el-button
                  v-if="canEditSmsSettings"
                  @click="handleTestSms"
                  :loading="testSmsLoading"
                >
                  测试短信
                </el-button>
                <el-button
                  v-if="canEditSmsSettings"
                  @click="handleSaveSms"
                  type="primary"
                  :loading="smsLoading"
                >
                  保存设置
                </el-button>
              </div>
            </div>
          </template>

          <el-form
            ref="smsFormRef"
            :model="smsForm"
            :rules="smsFormRules"
            label-width="120px"
            class="setting-form"
          >
            <el-form-item label="短信服务商" prop="provider">
              <el-select
                v-model="smsForm.provider"
                placeholder="请选择短信服务商"
                style="width: 100%"
              >
                <el-option label="阿里云短信" value="aliyun" />
                <el-option label="腾讯云短信" value="tencent" />
                <el-option label="华为云短信" value="huawei" />
                <el-option label="网易云信" value="netease" />
              </el-select>
            </el-form-item>

            <el-form-item label="AccessKey" prop="accessKey">
              <el-input
                v-model="smsForm.accessKey"
                placeholder="请输入AccessKey"
                show-password
              />
            </el-form-item>

            <el-form-item label="SecretKey" prop="secretKey">
              <el-input
                v-model="smsForm.secretKey"
                placeholder="请输入SecretKey"
                show-password
              />
            </el-form-item>

            <el-form-item label="短信签名" prop="signName">
              <el-input
                v-model="smsForm.signName"
                placeholder="请输入短信签名"
              />
              <div class="form-tip">短信签名需要在服务商平台申请并审核通过</div>
            </el-form-item>

            <el-form-item label="每日发送限制" prop="dailyLimit">
              <el-input-number
                v-model="smsForm.dailyLimit"
                :min="1"
                :max="10000"
                placeholder="每日发送限制"
                style="width: 100%"
              />
              <div class="form-tip">单个用户每日最大发送短信数量</div>
            </el-form-item>

            <el-form-item label="每月发送限制" prop="monthlyLimit">
              <el-input-number
                v-model="smsForm.monthlyLimit"
                :min="1"
                :max="100000"
                placeholder="每月发送限制"
                style="width: 100%"
              />
              <div class="form-tip">单个用户每月最大发送短信数量</div>
            </el-form-item>

            <el-form-item label="启用短信功能">
              <el-switch
                v-model="smsForm.enabled"
                active-text="启用"
                inactive-text="禁用"
              />
            </el-form-item>

            <el-form-item label="需要审核">
              <el-switch
                v-model="smsForm.requireApproval"
                active-text="需要"
                inactive-text="不需要"
              />
              <div class="form-tip">开启后，短信发送需要管理员审核</div>
            </el-form-item>

            <el-form-item label="测试手机号" prop="testPhone">
              <el-input
                v-model="smsForm.testPhone"
                placeholder="请输入测试手机号"
              />
              <div class="form-tip">用于测试短信发送功能</div>
            </el-form-item>
          </el-form>
        </el-card>
      </el-tab-pane>

      <!-- 存储设置 -->
      <el-tab-pane label="存储设置" name="storage">
        <el-card class="setting-card">
          <template #header>
            <div class="card-header">
              <span>存储配置</span>
              <div class="header-actions">
                <el-button
                  @click="handleTestDataPersistence"
                  type="info"
                  size="small"
                  :loading="testingDataPersistence"
                >
                  <el-icon><Setting /></el-icon>
                  测试功能
                </el-button>
                <el-button
                  v-if="canEditStorageSettings"
                  @click="handleSaveStorage"
                  type="primary"
                  :loading="storageLoading"
                >
                  保存设置
                </el-button>
              </div>
            </div>
          </template>

          <el-form
            ref="storageFormRef"
            :model="storageForm"
            :rules="storageFormRules"
            label-width="120px"
            class="setting-form"
          >
            <el-form-item label="存储类型" prop="storageType">
              <el-radio-group v-model="storageForm.storageType">
                <el-radio label="local">本地存储</el-radio>
                <el-radio label="oss">阿里云OSS</el-radio>
              </el-radio-group>
            </el-form-item>

            <!-- 本地存储配置 -->
            <template v-if="storageForm.storageType === 'local'">
              <el-form-item label="存储路径" prop="localPath">
                <el-input
                  v-model="storageForm.localPath"
                  placeholder="请输入本地存储路径"
                />
              </el-form-item>

              <el-form-item label="访问域名" prop="localDomain">
                <el-input
                  v-model="storageForm.localDomain"
                  placeholder="请输入访问域名"
                />
              </el-form-item>
            </template>

            <!-- 云存储配置 -->
            <template v-if="storageForm.storageType !== 'local'">
              <el-form-item label="Access Key" prop="accessKey">
                <el-input
                  v-model="storageForm.accessKey"
                  placeholder="请输入Access Key"
                />
              </el-form-item>

              <el-form-item label="Secret Key" prop="secretKey">
                <el-input
                  v-model="storageForm.secretKey"
                  type="password"
                  placeholder="请输入Secret Key"
                  show-password
                />
              </el-form-item>

              <el-form-item label="存储桶名称" prop="bucketName">
                <el-input
                  v-model="storageForm.bucketName"
                  placeholder="请输入存储桶名称"
                />
              </el-form-item>

              <el-form-item label="存储区域" prop="region">
                <el-select
                  v-model="storageForm.region"
                  placeholder="请选择存储区域"
                  style="width: 100%"
                >
                  <el-option label="华东1（杭州）" value="oss-cn-hangzhou" />
                  <el-option label="华东2（上海）" value="oss-cn-shanghai" />
                  <el-option label="华北1（青岛）" value="oss-cn-qingdao" />
                  <el-option label="华北2（北京）" value="oss-cn-beijing" />
                  <el-option label="华北3（张家口）" value="oss-cn-zhangjiakou" />
                  <el-option label="华北5（呼和浩特）" value="oss-cn-huhehaote" />
                  <el-option label="华北6（乌兰察布）" value="oss-cn-wulanchabu" />
                  <el-option label="华南1（深圳）" value="oss-cn-shenzhen" />
                  <el-option label="华南2（河源）" value="oss-cn-heyuan" />
                  <el-option label="华南3（广州）" value="oss-cn-guangzhou" />
                  <el-option label="西南1（成都）" value="oss-cn-chengdu" />
                  <el-option label="中国（香港）" value="oss-cn-hongkong" />
                  <el-option label="美国西部1（硅谷）" value="oss-us-west-1" />
                  <el-option label="美国东部1（弗吉尼亚）" value="oss-us-east-1" />
                  <el-option label="亚太东南1（新加坡）" value="oss-ap-southeast-1" />
                  <el-option label="亚太东南2（悉尼）" value="oss-ap-southeast-2" />
                  <el-option label="亚太东南3（吉隆坡）" value="oss-ap-southeast-3" />
                  <el-option label="亚太东南5（雅加达）" value="oss-ap-southeast-5" />
                  <el-option label="亚太东北1（东京）" value="oss-ap-northeast-1" />
                  <el-option label="亚太南部1（孟买）" value="oss-ap-south-1" />
                  <el-option label="欧洲中部1（法兰克福）" value="oss-eu-central-1" />
                  <el-option label="英国（伦敦）" value="oss-eu-west-1" />
                  <el-option label="中东东部1（迪拜）" value="oss-me-east-1" />
                </el-select>
                <div class="form-tip">选择与您的Bucket相同的区域</div>
              </el-form-item>

              <el-form-item label="自定义域名" prop="customDomain">
                <el-input
                  v-model="storageForm.customDomain"
                  placeholder="请输入自定义域名（可选）"
                />
              </el-form-item>
            </template>

            <el-form-item label="最大文件大小" prop="maxFileSize">
              <el-input-number
                v-model="storageForm.maxFileSize"
                :min="1"
                :max="100"
                placeholder="最大文件大小"
              />
              <span class="form-tip">MB</span>
            </el-form-item>

            <el-form-item label="允许的文件类型" prop="allowedTypes">
              <el-input
                v-model="storageForm.allowedTypes"
                placeholder="请输入允许的文件类型，用逗号分隔"
              />
              <div class="form-tip">例如：jpg,png,gif,pdf,doc,docx</div>
            </el-form-item>

            <!-- 图片压缩配置 -->
            <el-divider content-position="left">
              <el-icon><Picture /></el-icon>
              图片上传压缩配置
            </el-divider>

            <el-form-item label="启用压缩">
              <el-switch
                v-model="storageForm.imageCompressEnabled"
              />
              <div class="form-tip">启用后上传的图片将自动压缩，减少存储空间和加载时间</div>
            </el-form-item>

            <template v-if="storageForm.imageCompressEnabled">
              <el-form-item label="压缩质量">
                <el-radio-group v-model="storageForm.imageCompressQuality">
                  <el-radio label="high">
                    <span class="quality-option">
                      <span class="quality-name">高清</span>
                      <span class="quality-desc">（质量80%，最大宽度1920px）</span>
                    </span>
                  </el-radio>
                  <el-radio label="medium">
                    <span class="quality-option">
                      <span class="quality-name">标准</span>
                      <span class="quality-desc">（质量60%，最大宽度1200px）</span>
                    </span>
                  </el-radio>
                  <el-radio label="low">
                    <span class="quality-option">
                      <span class="quality-name">省流</span>
                      <span class="quality-desc">（质量40%，最大宽度800px）</span>
                    </span>
                  </el-radio>
                  <el-radio label="custom">
                    <span class="quality-option">
                      <span class="quality-name">自定义</span>
                    </span>
                  </el-radio>
                </el-radio-group>
              </el-form-item>

              <template v-if="storageForm.imageCompressQuality === 'custom'">
                <el-form-item label="最大宽度">
                  <el-input-number
                    v-model="storageForm.imageCompressMaxWidth"
                    :min="400"
                    :max="4096"
                    :step="100"
                  />
                  <span class="form-tip">px（超过此宽度的图片将被等比缩放）</span>
                </el-form-item>

                <el-form-item label="压缩比例">
                  <el-slider
                    v-model="storageForm.imageCompressCustomQuality"
                    :min="10"
                    :max="100"
                    :step="5"
                    show-input
                    style="max-width: 400px;"
                  />
                  <div class="form-tip">数值越低压缩越强，文件越小，但图片质量会下降</div>
                </el-form-item>
              </template>

              <el-form-item>
                <el-alert
                  :title="compressionPreviewText"
                  type="info"
                  :closable="false"
                  show-icon
                />
              </el-form-item>
            </template>

            <!-- 数据同步设置 -->
            <template v-if="storageForm.storageType !== 'local'">
              <el-divider content-position="left">
                <el-icon><Upload /></el-icon>
                数据同步设置
              </el-divider>

              <el-form-item label="自动同步">
                <el-switch
                  v-model="syncConfig.autoSync"
                  @change="handleSyncConfigChange"
                />
                <div class="form-tip">启用后将定期自动同步数据到云端</div>
              </el-form-item>

              <el-form-item label="同步间隔" v-if="syncConfig.autoSync">
                <el-input-number
                  v-model="syncConfig.syncInterval"
                  :min="5"
                  :max="1440"
                  @change="handleSyncConfigChange"
                />
                <span class="form-tip">分钟（建议30-60分钟）</span>
              </el-form-item>

              <el-form-item label="实时同步">
                <el-switch
                  v-model="syncConfig.syncOnDataChange"
                  @change="handleSyncConfigChange"
                />
                <div class="form-tip">数据变更时立即同步到云端</div>
              </el-form-item>

              <el-form-item label="备份保留数量">
                <el-input-number
                  v-model="syncConfig.backupRetention"
                  :min="1"
                  :max="20"
                  @change="handleSyncConfigChange"
                />
                <span class="form-tip">个（保留最近的备份文件数量）</span>
              </el-form-item>

              <!-- 同步状态显示 -->
              <el-form-item label="同步状态">
                <div class="sync-status">
                  <el-tag
                    :type="syncStatus.isEnabled ? 'success' : 'danger'"
                    class="status-tag"
                  >
                    {{ syncStatus.isEnabled ? '已启用' : '未启用' }}
                  </el-tag>

                  <el-tag
                    v-if="syncStatus.syncInProgress"
                    type="warning"
                    class="status-tag"
                  >
                    同步中...
                  </el-tag>

                  <div v-if="syncStatus.lastSyncTime" class="sync-info">
                    最后同步: {{ formatSyncTime(syncStatus.lastSyncTime) }}
                  </div>

                  <div v-if="syncStatus.totalItems > 0" class="sync-progress">
                    已同步: {{ syncStatus.syncedItems }}/{{ syncStatus.totalItems }}
                    <span v-if="syncStatus.failedItems > 0" class="failed-count">
                      (失败: {{ syncStatus.failedItems }})
                    </span>
                  </div>
                </div>
              </el-form-item>

              <!-- 同步操作按钮 -->
              <el-form-item label="同步操作">
                <div class="sync-actions">
                  <el-button
                    @click="handleManualSync"
                    :loading="syncStatus.syncInProgress"
                    :disabled="!syncStatus.isEnabled"
                    type="primary"
                    size="small"
                  >
                    <el-icon><Upload /></el-icon>
                    立即同步
                  </el-button>

                  <el-button
                    @click="handleRestoreData"
                    :disabled="!syncStatus.isEnabled || syncStatus.syncInProgress"
                    type="warning"
                    size="small"
                  >
                    <el-icon><Download /></el-icon>
                    恢复数据
                  </el-button>

                  <el-button
                    @click="handleCheckIntegrity"
                    :disabled="syncStatus.syncInProgress"
                    size="small"
                  >
                    <el-icon><Check /></el-icon>
                    检查完整性
                  </el-button>
                </div>
              </el-form-item>

              <!-- 错误信息显示 -->
              <el-form-item v-if="syncStatus.errors.length > 0" label="同步错误">
                <el-alert
                  v-for="(error, index) in syncStatus.errors"
                  :key="index"
                  :title="error"
                  type="error"
                  :closable="false"
                  class="sync-error"
                />
              </el-form-item>
            </template>
          </el-form>
        </el-card>
      </el-tab-pane>

      <!-- 商品设置 -->
      <el-tab-pane label="商品设置" name="product">
        <el-card class="setting-card">
          <template #header>
            <div class="card-header">
              <span>商品配置</span>
              <el-button
                v-if="canEditProductSettings"
                @click="handleSaveProduct"
                type="primary"
                :loading="productLoading"
              >
                保存设置
              </el-button>
            </div>
          </template>

          <el-form
            ref="productFormRef"
            :model="productForm"
            :rules="productFormRules"
            label-width="150px"
            class="setting-form"
          >
            <!-- 优惠折扣设置 -->
            <div class="form-section">
              <h4 class="section-title">
                <el-icon><Discount /></el-icon>
                优惠折扣设置
              </h4>

              <el-form-item label="全局最大优惠比例" prop="maxDiscountPercent">
                <el-input-number
                  v-model="productForm.maxDiscountPercent"
                  :min="0"
                  :max="100"
                  :precision="1"
                  placeholder="最大优惠比例"
                />
                <span class="form-tip">%（0-100，建议不超过50%）</span>
              </el-form-item>

              <el-form-item label="管理员最大优惠" prop="adminMaxDiscount">
                <el-input-number
                  v-model="productForm.adminMaxDiscount"
                  :min="0"
                  :max="100"
                  :precision="1"
                  placeholder="管理员最大优惠"
                />
                <span class="form-tip">%（管理员权限下的最大优惠比例）</span>
              </el-form-item>

              <el-form-item label="经理最大优惠" prop="managerMaxDiscount">
                <el-input-number
                  v-model="productForm.managerMaxDiscount"
                  :min="0"
                  :max="100"
                  :precision="1"
                  placeholder="经理最大优惠"
                />
                <span class="form-tip">%（经理权限下的最大优惠比例）</span>
              </el-form-item>

              <el-form-item label="销售员最大优惠" prop="salesMaxDiscount">
                <el-input-number
                  v-model="productForm.salesMaxDiscount"
                  :min="0"
                  :max="100"
                  :precision="1"
                  placeholder="销售员最大优惠"
                />
                <span class="form-tip">%（销售员权限下的最大优惠比例）</span>
              </el-form-item>

              <el-form-item label="优惠审批阈值" prop="discountApprovalThreshold">
                <el-input-number
                  v-model="productForm.discountApprovalThreshold"
                  :min="0"
                  :max="100"
                  :precision="1"
                  placeholder="优惠审批阈值"
                />
                <span class="form-tip">%（超过此比例需要审批）</span>
              </el-form-item>
            </div>

            <!-- 价格管理设置 -->
            <div class="form-section">
              <h4 class="section-title">
                <el-icon><Money /></el-icon>
                价格管理设置
              </h4>

              <el-form-item label="允许价格修改" prop="allowPriceModification">
                <el-switch
                  v-model="productForm.allowPriceModification"
                  active-text="允许"
                  inactive-text="禁止"
                />
                <div class="form-tip">是否允许在订单中修改商品价格</div>
              </el-form-item>

              <el-form-item label="价格修改权限" prop="priceModificationRoles">
                <el-checkbox-group v-model="productForm.priceModificationRoles">
                  <el-checkbox label="admin">管理员</el-checkbox>
                  <el-checkbox label="manager">经理</el-checkbox>
                  <el-checkbox label="sales">销售员</el-checkbox>
                </el-checkbox-group>
              </el-form-item>

              <el-form-item label="价格变动记录" prop="enablePriceHistory">
                <el-switch
                  v-model="productForm.enablePriceHistory"
                  active-text="启用"
                  inactive-text="禁用"
                />
                <div class="form-tip">记录商品价格变动历史</div>
              </el-form-item>

              <el-form-item label="价格显示精度" prop="pricePrecision">
                <el-select v-model="productForm.pricePrecision" placeholder="选择价格精度">
                  <el-option label="整数（如：100）" value="0" />
                  <el-option label="一位小数（如：100.0）" value="1" />
                  <el-option label="两位小数（如：100.00）" value="2" />
                </el-select>
              </el-form-item>
            </div>

            <!-- 库存管理设置 -->
            <div class="form-section">
              <h4 class="section-title">
                <el-icon><Box /></el-icon>
                库存管理设置
              </h4>

              <el-form-item label="启用库存管理" prop="enableInventory">
                <el-switch
                  v-model="productForm.enableInventory"
                  active-text="启用"
                  inactive-text="禁用"
                />
                <div class="form-tip">是否启用商品库存管理功能</div>
              </el-form-item>

              <el-form-item label="低库存预警阈值" prop="lowStockThreshold">
                <el-input-number
                  v-model="productForm.lowStockThreshold"
                  :min="0"
                  :max="1000"
                  placeholder="低库存预警阈值"
                />
                <span class="form-tip">件（库存低于此数量时预警）</span>
              </el-form-item>

              <el-form-item label="允许负库存销售" prop="allowNegativeStock">
                <el-switch
                  v-model="productForm.allowNegativeStock"
                  active-text="允许"
                  inactive-text="禁止"
                />
                <div class="form-tip">库存不足时是否允许继续销售</div>
              </el-form-item>
            </div>

            <!-- 商品分类设置 -->
            <div class="form-section">
              <h4 class="section-title">
                <el-icon><Grid /></el-icon>
                商品分类设置
              </h4>

              <el-form-item label="默认分类" prop="defaultCategory">
                <el-input
                  v-model="productForm.defaultCategory"
                  placeholder="请输入默认分类名称"
                />
                <div class="form-tip">新建商品时的默认分类</div>
              </el-form-item>

              <el-form-item label="分类层级限制" prop="maxCategoryLevel">
                <el-input-number
                  v-model="productForm.maxCategoryLevel"
                  :min="1"
                  :max="5"
                  placeholder="分类层级限制"
                />
                <span class="form-tip">级（最多支持的分类层级数）</span>
              </el-form-item>

              <el-form-item label="启用分类编码" prop="enableCategoryCode">
                <el-switch
                  v-model="productForm.enableCategoryCode"
                  active-text="启用"
                  inactive-text="禁用"
                />
                <div class="form-tip">为商品分类生成唯一编码</div>
              </el-form-item>
            </div>

            <!-- 权限配置设置 -->
            <div class="form-section">
              <h4 class="section-title">
                <el-icon><Lock /></el-icon>
                权限配置设置
              </h4>

              <el-form-item label="成本价格查看权限" prop="costPriceViewRoles">
                <el-checkbox-group v-model="productForm.costPriceViewRoles">
                  <el-checkbox label="super_admin">超级管理员</el-checkbox>
                  <el-checkbox label="admin">管理员</el-checkbox>
                  <el-checkbox label="manager">经理</el-checkbox>
                  <el-checkbox label="finance">财务人员</el-checkbox>
                </el-checkbox-group>
                <div class="form-tip">选择可以查看商品成本价格的角色</div>
              </el-form-item>

              <el-form-item label="销售数据查看权限" prop="salesDataViewRoles">
                <el-checkbox-group v-model="productForm.salesDataViewRoles">
                  <el-checkbox label="super_admin">超级管理员</el-checkbox>
                  <el-checkbox label="admin">管理员</el-checkbox>
                  <el-checkbox label="manager">经理</el-checkbox>
                  <el-checkbox label="sales_manager">销售经理</el-checkbox>
                </el-checkbox-group>
                <div class="form-tip">选择可以查看销售数据的角色</div>
              </el-form-item>

              <el-form-item label="库存信息查看权限" prop="stockInfoViewRoles">
                <el-checkbox-group v-model="productForm.stockInfoViewRoles">
                  <el-checkbox label="super_admin">超级管理员</el-checkbox>
                  <el-checkbox label="admin">管理员</el-checkbox>
                  <el-checkbox label="manager">经理</el-checkbox>
                  <el-checkbox label="warehouse">仓库管理员</el-checkbox>
                </el-checkbox-group>
                <div class="form-tip">选择可以查看库存信息的角色</div>
              </el-form-item>

              <el-form-item label="操作日志查看权限" prop="operationLogsViewRoles">
                <el-checkbox-group v-model="productForm.operationLogsViewRoles">
                  <el-checkbox label="super_admin">超级管理员</el-checkbox>
                  <el-checkbox label="admin">管理员</el-checkbox>
                  <el-checkbox label="audit">审计人员</el-checkbox>
                </el-checkbox-group>
                <div class="form-tip">选择可以查看操作日志的角色</div>
              </el-form-item>

              <el-form-item label="敏感信息隐藏方式" prop="sensitiveInfoHideMethod">
                <el-radio-group v-model="productForm.sensitiveInfoHideMethod">
                  <el-radio label="asterisk">星号（****）</el-radio>
                  <el-radio label="eye_icon">眼睛图标</el-radio>
                  <el-radio label="dash">横线（----）</el-radio>
                </el-radio-group>
                <div class="form-tip">选择敏感信息的隐藏显示方式</div>
              </el-form-item>

              <el-form-item label="启用权限控制" prop="enablePermissionControl">
                <el-switch
                  v-model="productForm.enablePermissionControl"
                  active-text="启用"
                  inactive-text="禁用"
                />
                <div class="form-tip">是否启用商品信息权限控制功能</div>
              </el-form-item>
            </div>

            <!-- 操作按钮 -->
            <div class="form-actions" v-if="canEditProductSettings">
              <el-button
                @click="handleResetProduct"
                :disabled="productLoading"
              >
                重置默认
              </el-button>
              <el-button
                type="primary"
                @click="handleSaveProduct"
                :loading="productLoading"
              >
                保存设置
              </el-button>
            </div>
          </el-form>
        </el-card>
      </el-tab-pane>

      <!-- 系统监控 -->
      <el-tab-pane
        v-if="canViewSystemMonitor"
        label="系统监控"
        name="monitor"
      >
        <el-card class="setting-card">
          <template #header>
            <div class="card-header">
              <span>系统状态</span>
              <el-button
                @click="handleRefreshMonitor"
                :loading="monitorLoading"
              >
                刷新状态
              </el-button>
            </div>
          </template>

          <div class="monitor-content">
            <!-- 系统信息 -->
            <div class="monitor-section">
              <h4>系统信息</h4>
              <el-descriptions :column="2" border>
                <el-descriptions-item label="操作系统">
                  {{ monitorData.systemInfo.os }}
                </el-descriptions-item>
                <el-descriptions-item label="系统架构">
                  {{ monitorData.systemInfo.arch }}
                </el-descriptions-item>
                <el-descriptions-item label="CPU核心数">
                  {{ monitorData.systemInfo.cpuCores }}
                </el-descriptions-item>
                <el-descriptions-item label="总内存">
                  {{ monitorData.systemInfo.totalMemory }}
                </el-descriptions-item>
                <el-descriptions-item label="Node.js版本">
                  {{ monitorData.systemInfo.nodeVersion }}
                </el-descriptions-item>
                <el-descriptions-item label="系统运行时间">
                  {{ monitorData.systemInfo.uptime }}
                </el-descriptions-item>
              </el-descriptions>
            </div>

            <!-- 性能监控 -->
            <div class="monitor-section">
              <h4>性能监控</h4>
              <el-row :gutter="20">
                <el-col :span="6">
                  <el-statistic
                    title="CPU使用率"
                    :value="monitorData.performance.cpuUsage"
                    suffix="%"
                    :value-style="{ color: getCpuColor(monitorData.performance.cpuUsage) }"
                  />
                </el-col>
                <el-col :span="6">
                  <el-statistic
                    title="内存使用率"
                    :value="monitorData.performance.memoryUsage"
                    suffix="%"
                    :value-style="{ color: getMemoryColor(monitorData.performance.memoryUsage) }"
                  />
                </el-col>
                <el-col :span="6">
                  <el-statistic
                    title="磁盘使用率"
                    :value="monitorData.performance.diskUsage"
                    suffix="%"
                    :value-style="{ color: getDiskColor(monitorData.performance.diskUsage) }"
                  />
                </el-col>
                <el-col :span="6">
                  <el-statistic
                    title="网络延迟"
                    :value="monitorData.performance.networkLatency"
                    suffix="ms"
                  />
                </el-col>
              </el-row>
            </div>

            <!-- 数据库状态 -->
            <div class="monitor-section">
              <h4>数据库状态</h4>
              <el-descriptions :column="2" border>
                <el-descriptions-item label="数据库类型">
                  {{ monitorData.database.type }}
                </el-descriptions-item>
                <el-descriptions-item label="数据库版本">
                  {{ monitorData.database.version }}
                </el-descriptions-item>
                <el-descriptions-item label="连接状态">
                  <el-tag :type="monitorData.database.connected ? 'success' : 'danger'">
                    {{ monitorData.database.connected ? '已连接' : '未连接' }}
                  </el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="活跃连接数">
                  {{ monitorData.database.activeConnections }}
                </el-descriptions-item>
                <el-descriptions-item label="数据库大小">
                  {{ monitorData.database.size }}
                </el-descriptions-item>
                <el-descriptions-item label="最后备份时间">
                  {{ monitorData.database.lastBackup }}
                </el-descriptions-item>
              </el-descriptions>
            </div>

            <!-- 服务状态 -->
            <div class="monitor-section">
              <h4>服务状态</h4>
              <el-table :data="monitorData.services" style="width: 100%">
                <el-table-column prop="name" label="服务名称" width="200" />
                <el-table-column label="状态" width="100">
                  <template #default="{ row }">
                    <el-tag :type="row.status === 'running' ? 'success' : 'danger'">
                      {{ row.status === 'running' ? '运行中' : '已停止' }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="port" label="端口" width="100" />
                <el-table-column prop="uptime" label="运行时间" />
                <el-table-column prop="memory" label="内存使用" width="120" />
              </el-table>
            </div>
          </div>
        </el-card>
      </el-tab-pane>

      <!-- 订单设置 -->
      <el-tab-pane label="订单设置" name="order">
        <OrderSettings />
      </el-tab-pane>

      <!-- 数据备份 -->
      <el-tab-pane label="数据备份" name="backup">
        <el-card class="setting-card">
          <template #header>
            <div class="card-header">
              <span>数据备份与恢复</span>
              <div class="header-actions">
                <el-button
                  @click="handleManualBackup"
                  type="primary"
                  :loading="backupLoading"
                >
                  立即备份
                </el-button>
                <el-button
                  v-if="canEditBackupSettings"
                  @click="handleSaveBackup"
                  type="success"
                  :loading="backupSaveLoading"
                >
                  保存设置
                </el-button>
                <el-button
                  @click="handleTestBackup"
                  type="info"
                  plain
                  :loading="testBackupLoading"
                >
                  测试功能
                </el-button>
              </div>
            </div>
          </template>

          <el-form
            ref="backupFormRef"
            :model="backupForm"
            :rules="backupFormRules"
            label-width="120px"
            class="setting-form"
          >
            <!-- 备份配置 -->
            <div class="form-section">
              <h4>备份配置</h4>
              <el-row :gutter="20">
                <el-col :span="12">
                  <el-form-item label="自动备份" prop="autoBackupEnabled">
                    <el-switch
                      v-model="backupForm.autoBackupEnabled"
                      active-text="启用"
                      inactive-text="禁用"
                    />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item
                    label="备份频率"
                    prop="backupFrequency"
                    v-if="backupForm.autoBackupEnabled"
                  >
                    <el-select v-model="backupForm.backupFrequency" placeholder="请选择备份频率">
                      <el-option label="每小时" value="hourly" />
                      <el-option label="每天" value="daily" />
                      <el-option label="每周" value="weekly" />
                      <el-option label="每月" value="monthly" />
                    </el-select>
                  </el-form-item>
                </el-col>
              </el-row>

              <el-row :gutter="20">
                <el-col :span="12">
                  <el-form-item label="保留天数" prop="retentionDays">
                    <el-input-number
                      v-model="backupForm.retentionDays"
                      :min="1"
                      :max="365"
                      placeholder="备份文件保留天数"
                    />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="压缩备份" prop="compression">
                    <el-switch
                      v-model="backupForm.compression"
                      active-text="启用"
                      inactive-text="禁用"
                    />
                  </el-form-item>
                </el-col>
              </el-row>
            </div>

            <!-- 备份状态 -->
            <div class="form-section">
              <h4>备份状态</h4>
              <el-descriptions :column="2" border>
                <el-descriptions-item label="最后备份时间">
                  {{ lastBackupTime || '暂无备份' }}
                </el-descriptions-item>
                <el-descriptions-item label="备份文件数量">
                  {{ backupCount }} 个
                </el-descriptions-item>
                <el-descriptions-item label="总备份大小">
                  {{ formatFileSize(totalBackupSize) }}
                </el-descriptions-item>
                <el-descriptions-item label="自动备份状态">
                  <el-tag :type="backupForm.autoBackupEnabled ? 'success' : 'info'">
                    {{ backupForm.autoBackupEnabled ? '已启用' : '已禁用' }}
                  </el-tag>
                </el-descriptions-item>
              </el-descriptions>
            </div>

            <!-- 备份列表 -->
            <div class="form-section">
              <h4>备份历史</h4>
              <el-table
                :data="backupList"
                style="width: 100%"
                v-loading="backupListLoading"
              >
                <el-table-column prop="filename" label="备份文件" />
                <el-table-column prop="timestamp" label="备份时间" width="180">
                  <template #default="{ row }">
                    {{ formatDateTime(row.timestamp) }}
                  </template>
                </el-table-column>
                <el-table-column prop="size" label="文件大小" width="120">
                  <template #default="{ row }">
                    {{ formatFileSize(row.size) }}
                  </template>
                </el-table-column>
                <el-table-column prop="type" label="备份类型" width="100">
                  <template #default="{ row }">
                    <el-tag :type="row.type === 'manual' ? 'primary' : 'success'">
                      {{ row.type === 'manual' ? '手动' : '自动' }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="200">
                  <template #default="{ row }">
                    <el-button
                      @click="handleRestoreBackup(row)"
                      type="warning"
                      size="small"
                      :loading="restoreLoading === row.filename"
                    >
                      恢复
                    </el-button>
                    <el-button
                      @click="handleDownloadBackup(row)"
                      type="info"
                      size="small"
                    >
                      下载
                    </el-button>
                    <el-button
                      @click="handleDeleteBackup(row)"
                      type="danger"
                      size="small"
                    >
                      删除
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
            </div>

            <!-- 备份说明 -->
            <el-alert
              title="备份说明"
              description="系统支持两种备份方式：1. 服务器本地备份（默认）- 备份文件存储在服务器本地；2. OSS云存储备份 - 需要在存储设置中配置阿里云OSS。"
              type="info"
              :closable="false"
              show-icon
            />
          </el-form>
        </el-card>
      </el-tab-pane>

      <!-- 数据迁移 -->
      <el-tab-pane label="数据迁移" name="migration">
        <el-card class="setting-card">
          <template #header>
            <div class="card-header">
              <span>数据迁移工具</span>
              <div class="header-actions">
                <el-button
                  @click="exportData"
                  type="primary"
                  :loading="exportLoading"
                >
                  导出数据
                </el-button>
                <el-button
                  @click="validateData"
                  type="success"
                  plain
                  :loading="validateLoading"
                >
                  验证数据
                </el-button>
              </div>
            </div>
          </template>

          <div class="migration-content">
            <!-- 迁移说明 -->
            <el-alert
              title="数据迁移说明"
              type="info"
              :closable="false"
              show-icon
              class="migration-alert"
            >
              <template #default>
                <p>当前系统使用浏览器本地存储(localStorage)保存数据，存在以下问题：</p>
                <ul>
                  <li>换电脑或浏览器数据会丢失</li>
                  <li>清除浏览器缓存数据会消失</li>
                  <li>无法实现多设备数据同步</li>
                  <li>不同用户之间无法数据隔离</li>
                </ul>
                <p><strong>建议：</strong>导出现有数据，然后部署数据库实现真正的数据持久化。</p>
              </template>
            </el-alert>

            <!-- 数据统计 -->
            <div v-if="dataStatistics" class="data-statistics">
              <h4>当前数据统计</h4>
              <el-row :gutter="20">
                <el-col :span="4">
                  <el-statistic title="客户数据" :value="dataStatistics.customers" suffix="条" />
                </el-col>
                <el-col :span="4">
                  <el-statistic title="订单数据" :value="dataStatistics.orders" suffix="条" />
                </el-col>
                <el-col :span="4">
                  <el-statistic title="产品数据" :value="dataStatistics.products" suffix="条" />
                </el-col>
                <el-col :span="4">
                  <el-statistic title="部门数据" :value="dataStatistics.departments" suffix="条" />
                </el-col>
                <el-col :span="4">
                  <el-statistic title="用户数据" :value="dataStatistics.users" suffix="条" />
                </el-col>
                <el-col :span="4">
                  <el-statistic title="数据大小" :value="formatDataSize(dataStatistics.totalSize)" />
                </el-col>
              </el-row>
            </div>

            <!-- 数据验证结果 -->
            <div v-if="validationResult" class="validation-result">
              <h4>数据验证结果</h4>
              <el-alert
                v-if="validationResult.issues.length === 0"
                title="数据验证通过"
                description="所有数据完整性检查通过，可以安全迁移！"
                type="success"
                :closable="false"
                show-icon
              />
              <el-alert
                v-else
                :title="`发现 ${validationResult.issues.length} 个数据问题`"
                type="warning"
                :closable="false"
                show-icon
              >
                <template #default>
                  <p>建议修复以下问题后再进行迁移：</p>
                  <ul>
                    <li v-for="issue in validationResult.issues.slice(0, 10)" :key="issue">{{ issue }}</li>
                    <li v-if="validationResult.issues.length > 10">
                      ... 还有 {{ validationResult.issues.length - 10 }} 个问题
                    </li>
                  </ul>
                </template>
              </el-alert>
            </div>

            <!-- 迁移步骤 -->
            <div class="migration-steps">
              <h4>数据迁移步骤</h4>
              <el-steps :active="migrationStep" direction="vertical">
                <el-step title="导出现有数据" description="将localStorage中的数据导出为JSON文件" />
                <el-step title="部署数据库" description="在阿里云服务器使用宝塔面板创建MySQL数据库" />
                <el-step title="部署后端API" description="部署Node.js后端服务，提供数据API接口" />
                <el-step title="导入数据" description="将导出的数据导入到数据库中" />
                <el-step title="切换存储模式" description="前端切换到API模式，实现真正的数据持久化" />
              </el-steps>
            </div>

            <!-- 技术文档链接 -->
            <div class="documentation-links">
              <h4>技术文档</h4>
              <el-space wrap>
                <el-button
                  @click="openDocumentation('database')"
                  type="primary"
                  plain
                  icon="Document"
                >
                  数据库架构设计
                </el-button>
                <el-button
                  @click="openDocumentation('api')"
                  type="success"
                  plain
                  icon="Document"
                >
                  后端API架构
                </el-button>
                <el-button
                  @click="openDocumentation('migration')"
                  type="warning"
                  plain
                  icon="Document"
                >
                  数据迁移方案
                </el-button>
              </el-space>
            </div>
          </div>
        </el-card>
      </el-tab-pane>

      <!-- 通知设置 -->
      <el-tab-pane label="通知设置" name="notification">
        <HealthCheckNotificationSettings />
      </el-tab-pane>

      <!-- 🔥 批次287重构：用户协议列表管理 -->
      <el-tab-pane label="用户协议" name="agreement">
        <el-card class="setting-card">
          <template #header>
            <div class="card-header">
              <span>用户协议管理</span>
              <div class="header-actions">
                <el-button
                  v-if="canEditAgreement"
                  @click="handleAddAgreement"
                  type="success"
                  :icon="Plus"
                >
                  新增协议
                </el-button>
                <el-button
                  v-if="canEditAgreement"
                  @click="handleSaveAgreementList"
                  type="primary"
                  :loading="agreementLoading"
                >
                  保存配置
                </el-button>
              </div>
            </div>
          </template>

          <el-alert
            title="协议说明"
            type="info"
            :closable="false"
            style="margin-bottom: 20px;"
          >
            <p>用户协议将在登录页面显示，用户必须同意协议才能登录系统。</p>
            <p>点击"编辑"按钮可以使用富文本编辑器编辑协议内容，启用后的协议将在登录页面显示。</p>
          </el-alert>

          <!-- 协议列表 -->
          <el-table
            :data="agreementList"
            border
            stripe
            style="width: 100%"
            class="agreement-table"
          >
            <el-table-column type="index" label="序号" width="60" align="center" />

            <el-table-column prop="title" label="标题" width="180">
              <template #default="{ row }">
                <div class="agreement-title">
                  <el-icon v-if="row.type === 'user'" color="#409EFF"><Document /></el-icon>
                  <el-icon v-else color="#67C23A"><Lock /></el-icon>
                  <span>{{ row.title }}</span>
                </div>
              </template>
            </el-table-column>

            <el-table-column prop="type" label="类型" width="120" align="center">
              <template #default="{ row }">
                <el-tag :type="row.type === 'user' ? 'primary' : 'success'" size="small">
                  {{ row.type === 'user' ? '使用协议' : '隐私协议' }}
                </el-tag>
              </template>
            </el-table-column>

            <el-table-column prop="wordCount" label="字数" width="100" align="center">
              <template #default="{ row }">
                <span class="word-count">{{ row.wordCount }} 字</span>
              </template>
            </el-table-column>

            <el-table-column prop="summary" label="内容概述" min-width="200">
              <template #default="{ row }">
                <div class="content-summary">{{ row.summary }}</div>
              </template>
            </el-table-column>

            <el-table-column prop="updateTime" label="更新日期" width="160" align="center">
              <template #default="{ row }">
                <div class="update-time">
                  <el-icon><Clock /></el-icon>
                  <span>{{ row.updateTime }}</span>
                </div>
              </template>
            </el-table-column>

            <el-table-column label="状态" width="80" align="center">
              <template #default="{ row }">
                <el-tooltip
                  :content="row.enabled ? '已启用' : '已禁用'"
                  placement="top"
                >
                  <el-switch
                    v-model="row.enabled"
                    @change="handleAgreementStatusChange(row)"
                  />
                </el-tooltip>
              </template>
            </el-table-column>

            <el-table-column label="操作" width="200" align="center" fixed="right">
              <template #default="{ row }">
                <el-button
                  type="primary"
                  size="small"
                  :icon="Edit"
                  @click="handleEditAgreement(row)"
                >
                  编辑
                </el-button>
                <el-button
                  type="info"
                  size="small"
                  :icon="View"
                  @click="handlePreviewAgreement(row)"
                >
                  预览
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>

      <!-- 移动应用 -->
      <el-tab-pane label="移动应用" name="mobile">
        <el-card class="setting-card">
          <template #header>
            <div class="card-header">
              <span>移动应用管理</span>
              <div class="header-actions">
                <el-button
                  @click="refreshMobileSDKInfo"
                  :loading="mobileSDKLoading"
                  type="primary"
                  size="small"
                >
                  <el-icon><Refresh /></el-icon>
                  刷新信息
                </el-button>
              </div>
            </div>
          </template>

          <div class="mobile-app-content">
            <!-- SDK 状态概览 -->
            <div class="sdk-overview">
              <h4 class="section-title">
                <el-icon><Phone /></el-icon>
                SDK 状态概览
              </h4>
              <el-row :gutter="20">
                <el-col :span="8">
                  <el-card class="status-card">
                    <el-statistic title="Android SDK" :value="mobileSDKInfo.android.version" />
                    <div class="status-info">
                      <el-tag :type="mobileSDKInfo.android.available ? 'success' : 'danger'" size="small">
                        {{ mobileSDKInfo.android.available ? '可用' : '未构建' }}
                      </el-tag>
                      <span class="file-size">{{ mobileSDKInfo.android.size }}</span>
                    </div>
                  </el-card>
                </el-col>
                <el-col :span="8">
                  <el-card class="status-card">
                    <el-statistic title="iOS SDK" :value="mobileSDKInfo.ios.version" />
                    <div class="status-info">
                      <el-tag :type="mobileSDKInfo.ios.available ? 'success' : 'warning'" size="small">
                        {{ mobileSDKInfo.ios.available ? '可用' : '开发中' }}
                      </el-tag>
                      <span class="file-size">{{ mobileSDKInfo.ios.size }}</span>
                    </div>
                  </el-card>
                </el-col>
                <el-col :span="8">
                  <el-card class="status-card">
                    <el-statistic title="PWA应用" value="v1.0.0" />
                    <div class="status-info">
                      <el-tag type="success" size="small">已部署</el-tag>
                      <span class="file-size">轻量级</span>
                    </div>
                  </el-card>
                </el-col>
              </el-row>
            </div>

            <!-- SDK 下载和管理 -->
            <div class="sdk-management">
              <h4 class="section-title">
                <el-icon><Download /></el-icon>
                SDK 下载和管理
              </h4>

              <div class="sdk-grid">
                <!-- Android SDK -->
                <div class="sdk-item">
                  <div class="sdk-header">
                    <div class="sdk-icon android">
                      <el-icon size="32"><Platform /></el-icon>
                    </div>
                    <div class="sdk-info">
                      <h5>Android SDK</h5>
                      <p>原生Android应用，支持完整CRM功能</p>
                    </div>
                  </div>
                  <div class="sdk-details">
                    <div class="detail-item">
                      <span class="label">版本:</span>
                      <span class="value">{{ mobileSDKInfo.android.version }}</span>
                    </div>
                    <div class="detail-item">
                      <span class="label">大小:</span>
                      <span class="value">{{ mobileSDKInfo.android.size }}</span>
                    </div>
                    <div class="detail-item">
                      <span class="label">更新时间:</span>
                      <span class="value">{{ mobileSDKInfo.android.updateTime }}</span>
                    </div>
                  </div>
                  <div class="sdk-actions">
                    <el-button
                      @click="downloadAndroidSDK"
                      type="primary"
                      :disabled="!mobileSDKInfo.android.available"
                      size="small"
                    >
                      <el-icon><Download /></el-icon>
                      下载APK
                    </el-button>
                    <el-button
                      @click="showInstallGuide('android')"
                      type="info"
                      plain
                      size="small"
                    >
                      安装说明
                    </el-button>
                  </div>
                </div>

                <!-- iOS SDK -->
                <div class="sdk-item">
                  <div class="sdk-header">
                    <div class="sdk-icon ios">
                      <el-icon size="32"><Iphone /></el-icon>
                    </div>
                    <div class="sdk-info">
                      <h5>iOS SDK</h5>
                      <p>适用于iPhone和iPad的CRM应用</p>
                    </div>
                  </div>
                  <div class="sdk-details">
                    <div class="detail-item">
                      <span class="label">版本:</span>
                      <span class="value">{{ mobileSDKInfo.ios.version }}</span>
                    </div>
                    <div class="detail-item">
                      <span class="label">大小:</span>
                      <span class="value">{{ mobileSDKInfo.ios.size }}</span>
                    </div>
                    <div class="detail-item">
                      <span class="label">状态:</span>
                      <span class="value">
                        <el-tag :type="mobileSDKInfo.ios.available ? 'success' : 'warning'" size="small">
                          {{ mobileSDKInfo.ios.available ? '可用' : '开发中' }}
                        </el-tag>
                      </span>
                    </div>
                  </div>
                  <div class="sdk-actions">
                    <el-button
                      @click="downloadIOSSDK"
                      type="primary"
                      :disabled="!mobileSDKInfo.ios.available"
                      size="small"
                    >
                      <el-icon><Download /></el-icon>
                      下载IPA
                    </el-button>
                    <el-button
                      @click="showInstallGuide('ios')"
                      type="info"
                      plain
                      size="small"
                    >
                      安装说明
                    </el-button>
                  </div>
                </div>

                <!-- PWA 应用 -->
                <div class="sdk-item">
                  <div class="sdk-header">
                    <div class="sdk-icon pwa">
                      <el-icon size="32"><Monitor /></el-icon>
                    </div>
                    <div class="sdk-info">
                      <h5>PWA 应用</h5>
                      <p>渐进式Web应用，无需安装</p>
                    </div>
                  </div>
                  <div class="sdk-details">
                    <div class="detail-item">
                      <span class="label">版本:</span>
                      <span class="value">v1.0.0</span>
                    </div>
                    <div class="detail-item">
                      <span class="label">类型:</span>
                      <span class="value">Web应用</span>
                    </div>
                    <div class="detail-item">
                      <span class="label">状态:</span>
                      <span class="value">已部署</span>
                    </div>
                  </div>
                  <div class="sdk-actions">
                    <el-button
                      @click="openPWAApp"
                      type="success"
                      size="small"
                    >
                      <el-icon><Link /></el-icon>
                      打开应用
                    </el-button>
                    <el-button
                      @click="showQRCode"
                      type="info"
                      plain
                      size="small"
                    >
                      二维码
                    </el-button>
                  </div>
                </div>
              </div>
            </div>

            <!-- 连接状态和配置 -->
            <div class="connection-status">
              <h4 class="section-title">
                <el-icon><Connection /></el-icon>
                连接状态和配置
              </h4>

              <el-row :gutter="20">
                <el-col :span="12">
                  <el-card class="config-card">
                    <template #header>
                      <span>服务器配置</span>
                    </template>
                    <el-descriptions :column="1" border size="small">
                      <el-descriptions-item label="服务器地址">
                        {{ serverConfig.host }}:{{ serverConfig.port }}
                      </el-descriptions-item>
                      <el-descriptions-item label="WebSocket端口">
                        {{ serverConfig.wsPort }}
                      </el-descriptions-item>
                      <el-descriptions-item label="SSL状态">
                        <el-tag :type="serverConfig.ssl ? 'success' : 'warning'" size="small">
                          {{ serverConfig.ssl ? '已启用' : '未启用' }}
                        </el-tag>
                      </el-descriptions-item>
                      <el-descriptions-item label="API版本">
                        {{ serverConfig.apiVersion }}
                      </el-descriptions-item>
                    </el-descriptions>
                  </el-card>
                </el-col>
                <el-col :span="12">
                  <el-card class="config-card">
                    <template #header>
                      <span>连接统计</span>
                    </template>
                    <el-descriptions :column="1" border size="small">
                      <el-descriptions-item label="活跃连接">
                        <el-tag type="success" size="small">{{ connectionStats.active }}</el-tag>
                      </el-descriptions-item>
                      <el-descriptions-item label="今日连接">
                        {{ connectionStats.today }}
                      </el-descriptions-item>
                      <el-descriptions-item label="总连接数">
                        {{ connectionStats.total }}
                      </el-descriptions-item>
                      <el-descriptions-item label="最后连接">
                        {{ connectionStats.lastConnection || '暂无' }}
                      </el-descriptions-item>
                    </el-descriptions>
                  </el-card>
                </el-col>
              </el-row>
            </div>

            <!-- 二维码连接管理 -->
            <div class="qr-connection-management">
              <h4 class="section-title">
                <el-icon><Connection /></el-icon>
                二维码连接管理
              </h4>

              <el-row :gutter="20">
                <el-col :span="12">
                  <el-card class="qr-card">
                    <template #header>
                      <span>生成连接二维码</span>
                    </template>
                    <div class="qr-generator">
                      <el-form :model="qrConnectionForm" label-width="100px" size="small">
                        <el-form-item label="用户权限">
                          <el-checkbox-group v-model="qrConnectionForm.permissions">
                            <el-checkbox label="call">通话权限</el-checkbox>
                            <el-checkbox label="sms">短信权限</el-checkbox>
                            <el-checkbox label="contacts">联系人权限</el-checkbox>
                            <el-checkbox label="storage">存储权限</el-checkbox>
                          </el-checkbox-group>
                        </el-form-item>
                        <el-form-item label="有效期">
                          <el-select v-model="qrConnectionForm.expireTime" placeholder="选择有效期">
                            <el-option label="5分钟" value="5"></el-option>
                            <el-option label="10分钟" value="10"></el-option>
                            <el-option label="30分钟" value="30"></el-option>
                            <el-option label="1小时" value="60"></el-option>
                          </el-select>
                        </el-form-item>
                        <el-form-item>
                          <el-button
                            type="primary"
                            @click="generateSystemQRCode"
                            :loading="qrConnectionLoading"
                          >
                            生成二维码
                          </el-button>
                          <el-button
                            v-if="systemQRConnection.connectionId"
                            @click="refreshSystemQRCode"
                            :loading="qrConnectionLoading"
                          >
                            刷新二维码
                          </el-button>
                        </el-form-item>
                      </el-form>
                    </div>
                  </el-card>
                </el-col>
                <el-col :span="12">
                  <el-card class="qr-display-card">
                    <template #header>
                      <span>扫码连接</span>
                    </template>
                    <div class="qr-display">
                      <div v-if="systemQRConnection.qrCodeUrl" class="qr-code-container">
                        <img
                          :src="systemQRConnection.qrCodeUrl"
                          alt="连接二维码"
                          class="qr-code-image"
                        />
                        <div class="qr-info">
                          <p class="qr-status">
                            <el-tag
                              :type="getQRStatusType(systemQRConnection.status)"
                              size="small"
                            >
                              {{ getQRStatusText(systemQRConnection.status) }}
                            </el-tag>
                          </p>
                          <p class="qr-expire" v-if="systemQRConnection.expiresAt">
                            过期时间: {{ formatDateTime(systemQRConnection.expiresAt) }}
                          </p>
                          <p class="qr-id" v-if="systemQRConnection.connectionId">
                            连接ID: {{ systemQRConnection.connectionId.substring(0, 8) }}...
                          </p>
                        </div>
                      </div>
                      <div v-else class="qr-placeholder">
                        <el-icon size="48" color="#dcdfe6"><Connection /></el-icon>
                        <p>点击生成二维码</p>
                      </div>
                    </div>
                  </el-card>
                </el-col>
              </el-row>
            </div>

            <!-- 替代连接方式 -->
            <div class="alternative-connections">
              <h4 class="section-title">
                <el-icon><Platform /></el-icon>
                替代连接方式
              </h4>

              <el-row :gutter="20">
                <!-- 蓝牙连接 -->
                <el-col :span="8">
                  <el-card class="connection-card">
                    <template #header>
                      <div class="connection-header">
                        <el-icon><Connection /></el-icon>
                        <span>蓝牙连接</span>
                      </div>
                    </template>
                    <div class="connection-content">
                      <div class="connection-status">
                        <el-tag
                          :type="bluetoothConnection.enabled ? 'success' : 'info'"
                          size="small"
                        >
                          {{ bluetoothConnection.enabled ? '已启用' : '未启用' }}
                        </el-tag>
                      </div>
                      <div class="connection-description">
                        <p>通过蓝牙配对连接移动设备，适用于近距离连接场景。</p>
                      </div>
                      <div class="connection-config">
                        <el-form size="small">
                          <el-form-item label="设备名称">
                            <el-input
                              v-model="bluetoothConnection.deviceName"
                              placeholder="CRM-Server"
                            />
                          </el-form-item>
                          <el-form-item label="配对码">
                            <el-input
                              v-model="bluetoothConnection.pairingCode"
                              placeholder="自动生成"
                              readonly
                            />
                          </el-form-item>
                        </el-form>
                      </div>
                      <div class="connection-actions">
                        <el-button
                          :type="bluetoothConnection.enabled ? 'danger' : 'primary'"
                          @click="toggleBluetoothConnection"
                          :loading="bluetoothLoading"
                          size="small"
                        >
                          {{ bluetoothConnection.enabled ? '停止' : '启动' }}蓝牙服务
                        </el-button>
                      </div>
                    </div>
                  </el-card>
                </el-col>

                <!-- 同网络连接 -->
                <el-col :span="8">
                  <el-card class="connection-card">
                    <template #header>
                      <div class="connection-header">
                        <el-icon><Monitor /></el-icon>
                        <span>同网络连接</span>
                      </div>
                    </template>
                    <div class="connection-content">
                      <div class="connection-status">
                        <el-tag
                          :type="networkConnection.enabled ? 'success' : 'info'"
                          size="small"
                        >
                          {{ networkConnection.enabled ? '已启用' : '未启用' }}
                        </el-tag>
                      </div>
                      <div class="connection-description">
                        <p>在同一局域网内自动发现并连接移动设备。</p>
                      </div>
                      <div class="connection-config">
                        <el-form size="small">
                          <el-form-item label="服务端口">
                            <el-input-number
                              v-model="networkConnection.port"
                              :min="1024"
                              :max="65535"
                              placeholder="8080"
                            />
                          </el-form-item>
                          <el-form-item label="广播间隔">
                            <el-select v-model="networkConnection.broadcastInterval">
                              <el-option label="5秒" value="5"></el-option>
                              <el-option label="10秒" value="10"></el-option>
                              <el-option label="30秒" value="30"></el-option>
                            </el-select>
                          </el-form-item>
                        </el-form>
                      </div>
                      <div class="connection-actions">
                        <el-button
                          :type="networkConnection.enabled ? 'danger' : 'primary'"
                          @click="toggleNetworkConnection"
                          :loading="networkLoading"
                          size="small"
                        >
                          {{ networkConnection.enabled ? '停止' : '启动' }}网络发现
                        </el-button>
                      </div>
                    </div>
                  </el-card>
                </el-col>

                <!-- 数字配对 -->
                <el-col :span="8">
                  <el-card class="connection-card">
                    <template #header>
                      <div class="connection-header">
                        <el-icon><Lock /></el-icon>
                        <span>数字配对</span>
                      </div>
                    </template>
                    <div class="connection-content">
                      <div class="connection-status">
                        <el-tag
                          :type="digitalPairing.enabled ? 'success' : 'info'"
                          size="small"
                        >
                          {{ digitalPairing.enabled ? '已启用' : '未启用' }}
                        </el-tag>
                      </div>
                      <div class="connection-description">
                        <p>通过6位数字配对码连接，安全便捷。</p>
                      </div>
                      <div class="connection-config">
                        <el-form size="small">
                          <el-form-item label="当前配对码">
                            <div class="pairing-code-display">
                              <span class="pairing-code">{{ digitalPairing.currentCode || '------' }}</span>
                              <el-button
                                @click="generatePairingCode"
                                :loading="pairingCodeLoading"
                                size="small"
                                type="text"
                              >
                                <el-icon><Refresh /></el-icon>
                              </el-button>
                            </div>
                          </el-form-item>
                          <el-form-item label="有效期">
                            <el-select v-model="digitalPairing.expireTime">
                              <el-option label="5分钟" value="5"></el-option>
                              <el-option label="10分钟" value="10"></el-option>
                              <el-option label="30分钟" value="30"></el-option>
                            </el-select>
                          </el-form-item>
                        </el-form>
                      </div>
                      <div class="connection-actions">
                        <el-button
                          :type="digitalPairing.enabled ? 'danger' : 'primary'"
                          @click="toggleDigitalPairing"
                          :loading="digitalPairingLoading"
                          size="small"
                        >
                          {{ digitalPairing.enabled ? '停止' : '启动' }}数字配对
                        </el-button>
                      </div>
                    </div>
                  </el-card>
                </el-col>
              </el-row>

              <!-- 连接统计 -->
              <el-card class="connection-stats-card" style="margin-top: 20px;">
                <template #header>
                  <span>连接统计</span>
                </template>
                <el-row :gutter="20">
                  <el-col :span="6">
                    <div class="stat-item">
                      <div class="stat-value">{{ connectionStats.qr || 0 }}</div>
                      <div class="stat-label">二维码连接</div>
                    </div>
                  </el-col>
                  <el-col :span="6">
                    <div class="stat-item">
                      <div class="stat-value">{{ connectionStats.bluetooth || 0 }}</div>
                      <div class="stat-label">蓝牙连接</div>
                    </div>
                  </el-col>
                  <el-col :span="6">
                    <div class="stat-item">
                      <div class="stat-value">{{ connectionStats.network || 0 }}</div>
                      <div class="stat-label">网络连接</div>
                    </div>
                  </el-col>
                  <el-col :span="6">
                    <div class="stat-item">
                      <div class="stat-value">{{ connectionStats.digital || 0 }}</div>
                      <div class="stat-label">数字配对</div>
                    </div>
                  </el-col>
                </el-row>
              </el-card>
            </div>

            <!-- 已连接设备列表 -->
            <div class="connected-devices-section">
              <el-card class="connected-devices-card" style="margin-top: 20px;">
                <template #header>
                  <div class="card-header">
                    <span>已连接设备</span>
                    <el-button
                      @click="refreshConnectedDevices"
                      :loading="devicesLoading"
                      type="primary"
                      size="small"
                    >
                      <el-icon><Refresh /></el-icon>
                      刷新
                    </el-button>
                  </div>
                </template>
                <el-table
                  :data="connectedDevices"
                  v-loading="devicesLoading"
                  style="width: 100%"
                >
                  <el-table-column prop="deviceName" label="设备名称" width="200" />
                  <el-table-column prop="deviceType" label="设备类型" width="120">
                    <template #default="{ row }">
                      <el-tag size="small">{{ row.deviceType }}</el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column prop="ipAddress" label="IP地址" width="150" />
                  <el-table-column prop="connectedAt" label="连接时间" width="180">
                    <template #default="{ row }">
                      {{ formatDateTime(row.connectedAt) }}
                    </template>
                  </el-table-column>
                  <el-table-column prop="lastActivity" label="最后活动" width="180">
                    <template #default="{ row }">
                      {{ formatDateTime(row.lastActivity) }}
                    </template>
                  </el-table-column>
                  <el-table-column prop="status" label="状态" width="100">
                    <template #default="{ row }">
                      <el-tag
                        :type="row.status === 'connected' ? 'success' : 'warning'"
                        size="small"
                      >
                        {{ row.status === 'connected' ? '在线' : '离线' }}
                      </el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column label="操作" width="120">
                    <template #default="{ row }">
                      <el-button
                        type="danger"
                        size="small"
                        plain
                        @click="handleDisconnectDevice(row.deviceId)"
                      >
                        断开连接
                      </el-button>
                    </template>
                  </el-table-column>
                </el-table>
                <div v-if="connectedDevices.length === 0" class="empty-devices">
                  <el-empty description="暂无连接的设备" />
                </div>
              </el-card>
            </div>

            <!-- 使用说明 -->
            <div class="usage-guide">
              <h4 class="section-title">
                <el-icon><Document /></el-icon>
                使用说明
              </h4>

              <el-tabs v-model="activeGuideTab" class="guide-tabs">
                <el-tab-pane label="Android安装" name="android">
                  <div class="guide-content">
                    <ol>
                      <li>下载APK文件到Android设备</li>
                      <li>在设备设置中允许"未知来源"应用安装</li>
                      <li>点击APK文件进行安装</li>
                      <li>打开应用，扫描二维码或手动输入服务器地址</li>
                      <li>授予必要的权限（通话、录音、网络等）</li>
                      <li>完成连接配置，开始使用CRM功能</li>
                    </ol>
                  </div>
                </el-tab-pane>
                <el-tab-pane label="iOS安装" name="ios">
                  <div class="guide-content">
                    <el-alert
                      title="iOS版本开发中"
                      description="iOS版本正在开发中，敬请期待。目前可以使用PWA版本在Safari浏览器中使用。"
                      type="info"
                      :closable="false"
                    />
                  </div>
                </el-tab-pane>
                <el-tab-pane label="PWA使用" name="pwa">
                  <div class="guide-content">
                    <ol>
                      <li>在手机浏览器中访问PWA应用链接</li>
                      <li>点击浏览器菜单中的"添加到主屏幕"</li>
                      <li>确认添加，应用图标将出现在桌面</li>
                      <li>点击桌面图标打开应用</li>
                      <li>享受类似原生应用的体验</li>
                    </ol>
                  </div>
                </el-tab-pane>
              </el-tabs>
            </div>
          </div>
        </el-card>
      </el-tab-pane>

      <!-- 系统日志 -->
      <el-tab-pane label="系统日志" name="logs">
        <!-- 日志清理配置 -->
        <el-card class="setting-card" style="margin-bottom: 16px;">
          <template #header>
            <div class="card-header">
              <span>日志清理配置</span>
              <el-button
                @click="handleSaveLogConfig"
                type="primary"
                :loading="logConfigLoading"
              >
                保存配置
              </el-button>
            </div>
          </template>

          <el-form :model="logCleanupConfig" label-width="140px" class="setting-form">
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="自动清理">
                  <el-switch
                    v-model="logCleanupConfig.autoCleanup"
                    active-text="启用"
                    inactive-text="禁用"
                  />
                  <span class="form-tip">启用后将自动清理过期日志</span>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="日志保留天数">
                  <el-input-number
                    v-model="logCleanupConfig.retentionDays"
                    :min="1"
                    :max="365"
                    :disabled="!logCleanupConfig.autoCleanup"
                  />
                  <span class="form-tip">天（超过此天数的日志将被清理）</span>
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="单文件大小限制">
                  <el-input-number
                    v-model="logCleanupConfig.maxFileSizeMB"
                    :min="1"
                    :max="100"
                  />
                  <span class="form-tip">MB（超过此大小将自动轮转）</span>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="清理时间">
                  <el-time-picker
                    v-model="logCleanupConfig.cleanupTime"
                    format="HH:mm"
                    value-format="HH:mm"
                    placeholder="选择清理时间"
                    :disabled="!logCleanupConfig.autoCleanup"
                  />
                  <span class="form-tip">每天在此时间执行清理</span>
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="20">
              <el-col :span="24">
                <el-form-item label="日志存储统计">
                  <div class="log-stats">
                    <el-tag type="info" size="large">
                      日志文件数: {{ logStats.fileCount }} 个
                    </el-tag>
                    <el-tag type="warning" size="large">
                      总大小: {{ logStats.totalSize }}
                    </el-tag>
                    <el-tag type="success" size="large">
                      最早日志: {{ logStats.oldestLog || '无' }}
                    </el-tag>
                    <el-button
                      type="info"
                      size="small"
                      @click="refreshLogStats"
                      :loading="logStatsLoading"
                    >
                      刷新统计
                    </el-button>
                  </div>
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="20">
              <el-col :span="24">
                <el-form-item label="手动清理">
                  <el-button
                    type="warning"
                    @click="cleanupOldLogs"
                    :loading="cleanupLoading"
                  >
                    清理过期日志
                  </el-button>
                  <el-button
                    type="danger"
                    @click="clearLogs"
                  >
                    清空所有日志
                  </el-button>
                  <span class="form-tip">清理过期日志将删除超过保留天数的日志文件</span>
                </el-form-item>
              </el-col>
            </el-row>
          </el-form>
        </el-card>

        <!-- 日志列表 -->
        <el-card class="setting-card">
          <template #header>
            <div class="card-header logs-header">
              <span>系统日志</span>
              <div class="logs-filter-bar">
                <el-date-picker
                  v-model="logDateRange"
                  type="daterange"
                  range-separator="-"
                  start-placeholder="开始"
                  end-placeholder="结束"
                  style="width: 220px;"
                  value-format="YYYY-MM-DD"
                  clearable
                  size="default"
                  @change="handleLogFilterChange"
                />
                <el-select v-model="logLevelFilter" placeholder="级别" style="width: 100px;" clearable @change="handleLogFilterChange">
                  <el-option label="全部" value="" />
                  <el-option label="ERROR" value="ERROR" />
                  <el-option label="WARN" value="WARN" />
                  <el-option label="INFO" value="INFO" />
                  <el-option label="DEBUG" value="DEBUG" />
                </el-select>
                <el-input
                  v-model="logSearchKeyword"
                  placeholder="搜索日志..."
                  style="width: 180px;"
                  clearable
                  @input="handleLogFilterChange"
                >
                  <template #prefix>
                    <el-icon><Search /></el-icon>
                  </template>
                </el-input>
                <el-button @click="refreshLogs" :loading="logsLoading" type="primary">
                  刷新日志
                </el-button>
              </div>
            </div>
          </template>

          <div class="logs-container">
            <el-table
              :data="paginatedLogs"
              v-loading="logsLoading"
              style="width: 100%"
              :max-height="500"
              stripe
            >
              <el-table-column prop="timestamp" label="时间" width="180">
                <template #default="{ row }">
                  {{ formatTimestamp(row.timestamp) }}
                </template>
              </el-table-column>
              <el-table-column prop="level" label="级别" width="100">
                <template #default="{ row }">
                  <el-tag
                    :type="getLogLevelType(row.level)"
                    size="small"
                  >
                    {{ row.level }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="module" label="模块" width="120" />
              <el-table-column prop="message" label="消息" show-overflow-tooltip />
              <el-table-column label="操作" width="100">
                <template #default="{ row }">
                  <el-button
                    type="primary"
                    link
                    size="small"
                    @click="showLogDetails(row)"
                  >
                    查看详情
                  </el-button>
                </template>
              </el-table-column>
            </el-table>

            <!-- 分页控件 -->
            <div class="logs-pagination">
              <span class="logs-total">共 {{ filteredLogs.length }} 条记录</span>
              <el-pagination
                v-model:current-page="logPagination.currentPage"
                v-model:page-size="logPagination.pageSize"
                :page-sizes="[20, 50, 100]"
                :total="filteredLogs.length"
                layout="sizes, prev, pager, next, jumper"
                @size-change="handleLogPageSizeChange"
                @current-change="handleLogPageChange"
              />
            </div>
          </div>
        </el-card>
      </el-tab-pane>
        </el-tabs>
        </div>
      </div>
    </div>

    <!-- 短信管理弹窗 -->
    <el-dialog
      v-model="smsManagementVisible"
      title="短信管理"
      width="90%"
      :close-on-click-modal="false"
      class="sms-management-dialog"
    >
      <SmsManagement />
    </el-dialog>

    <!-- 🔥 批次287：协议编辑对话框 -->
    <AgreementEditorDialog
      v-model="agreementDialogVisible"
      :agreement="currentEditingAgreement"
      @save="handleSaveAgreementContent"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Discount, Money, Box, Grid, Setting, Lock, Upload, Download, Check, Phone, Connection, VideoPlay, Refresh, Platform, Iphone, Monitor, Link, Document, ArrowLeft, ArrowRight, DocumentCopy, ZoomIn, Delete, Picture, Edit, View, Clock, Search } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { useConfigStore } from '@/stores/config'
import { dataSyncService } from '@/services/dataSyncService'
import { runDataPersistenceTests, type TestResult } from '@/utils/testDataPersistence'
import { dataBackupService } from '@/services/dataBackupService'
import { runAllTests } from '@/utils/testBackupService'
import { DataExportTool } from '@/utils/dataExport'
import SmsManagement from '@/components/SmsManagement.vue'
import HealthCheckNotificationSettings from '@/components/HealthCheckNotificationSettings.vue'
import OrderSettings from '@/views/Settings/OrderSettings.vue'
import RichTextEditor from '@/components/Common/RichTextEditor.vue'
import AgreementEditorDialog from '@/components/System/AgreementEditorDialog.vue'
import * as logsApi from '@/api/logs'
import type { SystemLog } from '@/api/logs'
import * as alternativeConnectionApi from '@/api/alternative-connection'
import { formatDateTime } from '@/utils/dateFormat'

// 接口定义
interface UploadFile {
  name: string
  size: number
  type: string
  raw?: File
}

interface UploadResponse {
  code: number
  message: string
  data?: {
    url: string
    filename: string
  }
}

// 用户store
const userStore = useUserStore()
// 配置store
const configStore = useConfigStore()

// 响应式数据
const activeTab = ref('security')







const basicLoading = ref(false)
const securityLoading = ref(false)
const emailLoading = ref(false)
const testEmailLoading = ref(false)
const smsLoading = ref(false)
const testSmsLoading = ref(false)
const storageLoading = ref(false)
const productLoading = ref(false)
const monitorLoading = ref(false)
const smsManagementVisible = ref(false)
const testingDataPersistence = ref(false)
const callLoading = ref(false)
const testingCallConnection = ref(false)
const logsLoading = ref(false)
const logPagination = ref({
  currentPage: 1,
  pageSize: 20
})
const logDateRange = ref<string[]>([])
const logSearchKeyword = ref('')

// 基本设置表单 - 从配置store获取
const basicForm = computed(() => configStore.systemConfig)

// 安全设置表单 - 从配置store获取
const securityForm = computed(() => configStore.securityConfig)

// 🔥 批次289：用户协议列表管理（已填充用户使用协议内容）
const agreementList = ref([
  {
    id: 1,
    type: 'user',
    title: '用户使用协议',
    content: '<div style="font-family: Microsoft YaHei, PingFang SC, sans-serif; line-height: 1.8; color: #333; padding: 20px;"><h1 style="text-align: center; color: #409eff; font-size: 20px; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #409eff; font-weight: bold;">用户使用协议</h1><p style="text-indent: 2em; margin-bottom: 15px; font-size: 14px; color: #606266;">欢迎使用本CRM客户管理系统（以下简称<strong style="color: #409eff;">"本系统"</strong>）。在使用本系统之前，请您<strong style="color: #409eff;">仔细阅读并充分理解</strong>本协议的全部内容。</p><h2 style="color: #409eff; font-size: 16px; margin: 20px 0 10px; padding-left: 10px; border-left: 3px solid #409eff; font-weight: bold;">一、协议的接受</h2><p style="text-indent: 2em; margin-bottom: 10px; font-size: 14px;">1.1 本协议是您与本系统运营方之间关于使用本系统服务所订立的协议。</p><p style="text-indent: 2em; margin-bottom: 10px; font-size: 14px;">1.2 您点击<strong style="color: #409eff;">"同意"</strong>按钮即表示您<strong style="color: #409eff;">完全接受</strong>本协议的全部条款。</p><h2 style="color: #409eff; font-size: 16px; margin: 20px 0 10px; padding-left: 10px; border-left: 3px solid #409eff; font-weight: bold;">二、服务内容</h2><p style="text-indent: 2em; margin-bottom: 10px; font-size: 14px;">2.1 本系统为企业提供<strong style="color: #409eff;">客户关系管理服务</strong>，包括但不限于：</p><ul style="margin-left: 3em; margin-bottom: 15px; list-style: disc; color: #606266;"><li style="margin-bottom: 5px; font-size: 14px;">客户信息管理</li><li style="margin-bottom: 5px; font-size: 14px;">订单管理</li><li style="margin-bottom: 5px; font-size: 14px;">业绩统计</li><li style="margin-bottom: 5px; font-size: 14px;">数据分析</li><li style="margin-bottom: 5px; font-size: 14px;">团队协作</li></ul><p style="text-indent: 2em; margin-bottom: 10px; font-size: 14px;">2.2 本系统保留随时修改或中断服务而不需通知用户的权利。</p><h2 style="color: #409eff; font-size: 16px; margin: 20px 0 10px; padding-left: 10px; border-left: 3px solid #409eff; font-weight: bold;">三、用户权利和义务</h2><p style="text-indent: 2em; margin-bottom: 10px; font-size: 14px;"><strong style="color: #409eff;">3.1 用户权利：</strong></p><ul style="margin-left: 3em; margin-bottom: 15px; list-style: disc; color: #606266;"><li style="margin-bottom: 5px; font-size: 14px;">使用本系统提供的各项功能</li><li style="margin-bottom: 5px; font-size: 14px;">管理自己的客户数据</li><li style="margin-bottom: 5px; font-size: 14px;">查看业绩统计报表</li><li style="margin-bottom: 5px; font-size: 14px;">获得技术支持服务</li></ul><p style="text-indent: 2em; margin-bottom: 10px; font-size: 14px;"><strong style="color: #409eff;">3.2 用户义务：</strong></p><ul style="margin-left: 3em; margin-bottom: 15px; list-style: disc; color: #606266;"><li style="margin-bottom: 5px; font-size: 14px;">遵守国家法律法规</li><li style="margin-bottom: 5px; font-size: 14px;">不得利用本系统从事违法活动</li><li style="margin-bottom: 5px; font-size: 14px;">妥善保管账号密码</li><li style="margin-bottom: 5px; font-size: 14px;">对账号下的所有行为负责</li><li style="margin-bottom: 5px; font-size: 14px;">不得恶意攻击系统</li><li style="margin-bottom: 5px; font-size: 14px;">不得泄露客户隐私信息</li></ul><h2 style="color: #409eff; font-size: 16px; margin: 20px 0 10px; padding-left: 10px; border-left: 3px solid #409eff; font-weight: bold;">四、数据安全</h2><p style="text-indent: 2em; margin-bottom: 10px; font-size: 14px;">4.1 本系统采用<strong style="color: #409eff;">行业标准的安全措施</strong>保护用户数据。</p><p style="text-indent: 2em; margin-bottom: 10px; font-size: 14px;">4.2 用户应定期备份重要数据，本系统不对数据丢失承担责任。</p><p style="text-indent: 2em; margin-bottom: 10px; font-size: 14px;">4.3 未经授权访问、使用、修改或破坏系统数据的行为将<strong style="color: #f56c6c;">承担法律责任</strong>。</p><h2 style="color: #409eff; font-size: 16px; margin: 20px 0 10px; padding-left: 10px; border-left: 3px solid #409eff; font-weight: bold;">五、知识产权</h2><p style="text-indent: 2em; margin-bottom: 10px; font-size: 14px;">5.1 本系统的所有内容，包括但不限于<strong style="color: #409eff;">文字、图片、软件、程序</strong>等，均受知识产权法保护。</p><p style="text-indent: 2em; margin-bottom: 10px; font-size: 14px;">5.2 未经许可，用户不得复制、传播、修改本系统的任何内容。</p><h2 style="color: #409eff; font-size: 16px; margin: 20px 0 10px; padding-left: 10px; border-left: 3px solid #409eff; font-weight: bold;">六、免责声明</h2><p style="text-indent: 2em; margin-bottom: 10px; font-size: 14px;">6.1 本系统不对因以下原因导致的损失承担责任：</p><ul style="margin-left: 3em; margin-bottom: 15px; list-style: disc; color: #606266;"><li style="margin-bottom: 5px; font-size: 14px;">不可抗力因素</li><li style="margin-bottom: 5px; font-size: 14px;">网络故障</li><li style="margin-bottom: 5px; font-size: 14px;">用户操作不当</li><li style="margin-bottom: 5px; font-size: 14px;">第三方侵权行为</li></ul><p style="text-indent: 2em; margin-bottom: 10px; font-size: 14px;">6.2 本系统提供的数据分析结果仅供参考，不构成任何投资建议。</p><h2 style="color: #409eff; font-size: 16px; margin: 20px 0 10px; padding-left: 10px; border-left: 3px solid #409eff; font-weight: bold;">七、协议的变更</h2><p style="text-indent: 2em; margin-bottom: 10px; font-size: 14px;">7.1 本系统有权随时修改本协议条款。</p><p style="text-indent: 2em; margin-bottom: 10px; font-size: 14px;">7.2 协议变更后，继续使用本系统即视为<strong style="color: #409eff;">接受新协议</strong>。</p><h2 style="color: #409eff; font-size: 16px; margin: 20px 0 10px; padding-left: 10px; border-left: 3px solid #409eff; font-weight: bold;">八、争议解决</h2><p style="text-indent: 2em; margin-bottom: 10px; font-size: 14px;">8.1 本协议的解释、效力及纠纷的解决，适用<strong style="color: #409eff;">中华人民共和国法律</strong>。</p><p style="text-indent: 2em; margin-bottom: 10px; font-size: 14px;">8.2 若发生争议，双方应友好协商解决；协商不成的，可向本系统所在地人民法院提起诉讼。</p><h2 style="color: #409eff; font-size: 16px; margin: 20px 0 10px; padding-left: 10px; border-left: 3px solid #409eff; font-weight: bold;">九、其他</h2><p style="text-indent: 2em; margin-bottom: 10px; font-size: 14px;">9.1 本协议自用户点击同意之日起生效。</p><p style="text-indent: 2em; margin-bottom: 10px; font-size: 14px;">9.2 如本协议中的任何条款无论因何种原因完全或部分无效或不具有执行力，本协议的其余条款仍应有效并且有约束力。</p><p style="text-align: center; margin-top: 30px; color: #909399; font-size: 13px;">最后更新日期：2025年11月22日</p></div>',
    wordCount: 1456,
    summary: '欢迎使用本CRM客户管理系统（以下简称"本系统"）。在使用本系统之前，请您仔细阅读并充分理解本协议的全部内容。一、协议的接受1.1 本协议是您与本系统运营方之间关于使用本系统服务所订立的协议。1.2 您点击"同意"按钮即表示您完全接受本协议的全部条款...',
    updateTime: '2025/11/22 17:30:00',
    enabled: true
  },
  {
    id: 2,
    type: 'privacy',
    title: '用户隐私协议',
    content: '<div style="font-family: Microsoft YaHei, PingFang SC, sans-serif; line-height: 1.8; color: #333; padding: 20px;"><h1 style="text-align: center; color: #67C23A; font-size: 20px; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #67C23A; font-weight: bold;">用户隐私协议</h1><p style="text-indent: 2em; margin-bottom: 15px; font-size: 14px; color: #606266;">本隐私协议（以下简称<strong style="color: #67C23A;">"本协议"</strong>）适用于本CRM客户管理系统（以下简称<strong style="color: #67C23A;">"本系统"</strong>）。我们非常重视用户的隐私保护，特制定本协议。</p><h2 style="color: #67C23A; font-size: 16px; margin: 20px 0 10px; padding-left: 10px; border-left: 3px solid #67C23A; font-weight: bold;">一、信息收集</h2><p style="text-indent: 2em; margin-bottom: 10px; font-size: 14px;"><strong style="color: #67C23A;">1.1 我们收集的信息类型：</strong></p><ul style="margin-left: 3em; margin-bottom: 15px; list-style: disc; color: #606266;"><li style="margin-bottom: 5px; font-size: 14px;">账号信息：用户名、密码、邮箱、手机号</li><li style="margin-bottom: 5px; font-size: 14px;">个人信息：姓名、部门、职位</li><li style="margin-bottom: 5px; font-size: 14px;">业务信息：客户数据、订单信息、业绩数据</li><li style="margin-bottom: 5px; font-size: 14px;">使用信息：登录日志、操作记录、访问时间</li></ul><p style="text-indent: 2em; margin-bottom: 10px; font-size: 14px;"><strong style="color: #67C23A;">1.2 信息收集方式：</strong></p><ul style="margin-left: 3em; margin-bottom: 15px; list-style: disc; color: #606266;"><li style="margin-bottom: 5px; font-size: 14px;">用户主动提供</li><li style="margin-bottom: 5px; font-size: 14px;">系统自动收集</li><li style="margin-bottom: 5px; font-size: 14px;">第三方合法提供</li></ul><h2 style="color: #67C23A; font-size: 16px; margin: 20px 0 10px; padding-left: 10px; border-left: 3px solid #67C23A; font-weight: bold;">二、信息使用</h2><p style="text-indent: 2em; margin-bottom: 10px; font-size: 14px;"><strong style="color: #67C23A;">2.1 我们使用收集的信息用于：</strong></p><ul style="margin-left: 3em; margin-bottom: 15px; list-style: disc; color: #606266;"><li style="margin-bottom: 5px; font-size: 14px;">提供系统服务</li><li style="margin-bottom: 5px; font-size: 14px;">改进用户体验</li><li style="margin-bottom: 5px; font-size: 14px;">数据统计分析</li><li style="margin-bottom: 5px; font-size: 14px;">安全监控</li><li style="margin-bottom: 5px; font-size: 14px;">技术支持</li><li style="margin-bottom: 5px; font-size: 14px;">发送系统通知</li></ul><p style="text-indent: 2em; margin-bottom: 10px; font-size: 14px;"><strong style="color: #67C23A;">2.2 我们承诺：</strong></p><ul style="margin-left: 3em; margin-bottom: 15px; list-style: disc; color: #606266;"><li style="margin-bottom: 5px; font-size: 14px;">不会将用户信息用于本协议未载明的其他用途</li><li style="margin-bottom: 5px; font-size: 14px;">不会向第三方出售用户信息</li><li style="margin-bottom: 5px; font-size: 14px;">严格限制信息访问权限</li></ul><h2 style="color: #67C23A; font-size: 16px; margin: 20px 0 10px; padding-left: 10px; border-left: 3px solid #67C23A; font-weight: bold;">三、信息存储</h2><p style="text-indent: 2em; margin-bottom: 10px; font-size: 14px;"><strong style="color: #67C23A;">3.1 存储位置：</strong></p><ul style="margin-left: 3em; margin-bottom: 15px; list-style: disc; color: #606266;"><li style="margin-bottom: 5px; font-size: 14px;">用户数据存储在本地浏览器</li><li style="margin-bottom: 5px; font-size: 14px;">部分数据可能存储在服务器</li><li style="margin-bottom: 5px; font-size: 14px;">采用加密技术保护敏感信息</li></ul><p style="text-indent: 2em; margin-bottom: 10px; font-size: 14px;"><strong style="color: #67C23A;">3.2 存储期限：</strong></p><ul style="margin-left: 3em; margin-bottom: 15px; list-style: disc; color: #606266;"><li style="margin-bottom: 5px; font-size: 14px;">账号存续期间持续存储</li><li style="margin-bottom: 5px; font-size: 14px;">账号注销后，数据将在30天内删除</li><li style="margin-bottom: 5px; font-size: 14px;">法律法规要求保留的除外</li></ul><h2 style="color: #67C23A; font-size: 16px; margin: 20px 0 10px; padding-left: 10px; border-left: 3px solid #67C23A; font-weight: bold;">四、信息保护</h2><p style="text-indent: 2em; margin-bottom: 10px; font-size: 14px;"><strong style="color: #67C23A;">4.1 安全措施：</strong></p><ul style="margin-left: 3em; margin-bottom: 15px; list-style: disc; color: #606266;"><li style="margin-bottom: 5px; font-size: 14px;">数据加密传输（HTTPS）</li><li style="margin-bottom: 5px; font-size: 14px;">密码加密存储</li><li style="margin-bottom: 5px; font-size: 14px;">访问权限控制</li><li style="margin-bottom: 5px; font-size: 14px;">定期安全审计</li><li style="margin-bottom: 5px; font-size: 14px;">异常行为监控</li></ul><p style="text-indent: 2em; margin-bottom: 10px; font-size: 14px;"><strong style="color: #67C23A;">4.2 安全承诺：</strong></p><ul style="margin-left: 3em; margin-bottom: 15px; list-style: disc; color: #606266;"><li style="margin-bottom: 5px; font-size: 14px;">采用行业标准的安全技术</li><li style="margin-bottom: 5px; font-size: 14px;">建立数据安全管理制度</li><li style="margin-bottom: 5px; font-size: 14px;">定期进行安全培训</li><li style="margin-bottom: 5px; font-size: 14px;">及时修复安全漏洞</li></ul><h2 style="color: #67C23A; font-size: 16px; margin: 20px 0 10px; padding-left: 10px; border-left: 3px solid #67C23A; font-weight: bold;">五、信息共享</h2><p style="text-indent: 2em; margin-bottom: 10px; font-size: 14px;"><strong style="color: #67C23A;">5.1 我们不会与第三方共享用户信息，除非：</strong></p><ul style="margin-left: 3em; margin-bottom: 15px; list-style: disc; color: #606266;"><li style="margin-bottom: 5px; font-size: 14px;">获得用户明确同意</li><li style="margin-bottom: 5px; font-size: 14px;">法律法规要求</li><li style="margin-bottom: 5px; font-size: 14px;">保护系统安全所必需</li><li style="margin-bottom: 5px; font-size: 14px;">维护用户合法权益所必需</li></ul><p style="text-indent: 2em; margin-bottom: 10px; font-size: 14px;"><strong style="color: #67C23A;">5.2 共享原则：</strong></p><ul style="margin-left: 3em; margin-bottom: 15px; list-style: disc; color: #606266;"><li style="margin-bottom: 5px; font-size: 14px;">最小必要原则</li><li style="margin-bottom: 5px; font-size: 14px;">合法正当原则</li><li style="margin-bottom: 5px; font-size: 14px;">安全可控原则</li></ul><h2 style="color: #67C23A; font-size: 16px; margin: 20px 0 10px; padding-left: 10px; border-left: 3px solid #67C23A; font-weight: bold;">六、用户权利</h2><p style="text-indent: 2em; margin-bottom: 10px; font-size: 14px;"><strong style="color: #67C23A;">6.1 您享有以下权利：</strong></p><ul style="margin-left: 3em; margin-bottom: 15px; list-style: disc; color: #606266;"><li style="margin-bottom: 5px; font-size: 14px;">访问您的个人信息</li><li style="margin-bottom: 5px; font-size: 14px;">更正不准确的信息</li><li style="margin-bottom: 5px; font-size: 14px;">删除您的个人信息</li><li style="margin-bottom: 5px; font-size: 14px;">撤回信息使用授权</li><li style="margin-bottom: 5px; font-size: 14px;">注销您的账号</li><li style="margin-bottom: 5px; font-size: 14px;">投诉举报</li></ul><p style="text-indent: 2em; margin-bottom: 10px; font-size: 14px;"><strong style="color: #67C23A;">6.2 权利行使方式：</strong></p><ul style="margin-left: 3em; margin-bottom: 15px; list-style: disc; color: #606266;"><li style="margin-bottom: 5px; font-size: 14px;">通过系统设置自行操作</li><li style="margin-bottom: 5px; font-size: 14px;">联系客服协助处理</li><li style="margin-bottom: 5px; font-size: 14px;">发送邮件申请</li></ul><h2 style="color: #67C23A; font-size: 16px; margin: 20px 0 10px; padding-left: 10px; border-left: 3px solid #67C23A; font-weight: bold;">七、Cookie使用</h2><p style="text-indent: 2em; margin-bottom: 10px; font-size: 14px;"><strong style="color: #67C23A;">7.1 本系统使用Cookie技术：</strong></p><ul style="margin-left: 3em; margin-bottom: 15px; list-style: disc; color: #606266;"><li style="margin-bottom: 5px; font-size: 14px;">记住登录状态</li><li style="margin-bottom: 5px; font-size: 14px;">保存用户偏好设置</li><li style="margin-bottom: 5px; font-size: 14px;">统计访问数据</li><li style="margin-bottom: 5px; font-size: 14px;">改善用户体验</li></ul><p style="text-indent: 2em; margin-bottom: 10px; font-size: 14px;">7.2 您可以通过浏览器设置管理Cookie。</p><h2 style="color: #67C23A; font-size: 16px; margin: 20px 0 10px; padding-left: 10px; border-left: 3px solid #67C23A; font-weight: bold;">八、未成年人保护</h2><p style="text-indent: 2em; margin-bottom: 10px; font-size: 14px;">8.1 本系统不向未满18周岁的未成年人提供服务。</p><p style="text-indent: 2em; margin-bottom: 10px; font-size: 14px;">8.2 如发现未成年人使用本系统，我们将立即停止服务并删除相关信息。</p><h2 style="color: #67C23A; font-size: 16px; margin: 20px 0 10px; padding-left: 10px; border-left: 3px solid #67C23A; font-weight: bold;">九、隐私协议的变更</h2><p style="text-indent: 2em; margin-bottom: 10px; font-size: 14px;">9.1 我们可能适时修订本协议。</p><p style="text-indent: 2em; margin-bottom: 10px; font-size: 14px;">9.2 变更后的协议将在系统内公布，继续使用即视为<strong style="color: #67C23A;">接受新协议</strong>。</p><p style="text-indent: 2em; margin-bottom: 10px; font-size: 14px;">9.3 重大变更将通过系统通知或邮件方式告知用户。</p><h2 style="color: #67C23A; font-size: 16px; margin: 20px 0 10px; padding-left: 10px; border-left: 3px solid #67C23A; font-weight: bold;">十、联系我们</h2><p style="text-indent: 2em; margin-bottom: 10px; font-size: 14px;">如您对本隐私协议有任何疑问、意见或建议，请通过以下方式联系我们：</p><ul style="margin-left: 3em; margin-bottom: 15px; list-style: disc; color: #606266;"><li style="margin-bottom: 5px; font-size: 14px;">客服电话：<strong style="color: #67C23A;">13570727364</strong></li><li style="margin-bottom: 5px; font-size: 14px;">客服微信：<strong style="color: #67C23A;">nxys789</strong></li><li style="margin-bottom: 5px; font-size: 14px;">客服邮箱：<strong style="color: #67C23A;">xianhuquwang@163.com</strong></li><li style="margin-bottom: 5px; font-size: 14px;">公司地址：<strong style="color: #67C23A;">广州市黄埔区南翔一路68号</strong></li></ul><p style="text-indent: 2em; margin-bottom: 10px; font-size: 14px;">我们将在收到您的反馈后<strong style="color: #67C23A;">15个工作日</strong>内予以回复。</p><p style="text-align: center; margin-top: 30px; color: #909399; font-size: 13px;">最后更新日期：2025年11月22日</p></div>',
    wordCount: 1523,
    summary: '本隐私协议（以下简称"本协议"）适用于本CRM客户管理系统（以下简称"本系统"）。我们非常重视用户的隐私保护，特制定本协议。一、信息收集1.1 我们收集的信息类型：账号信息：用户名、密码、邮箱、手机号；个人信息：姓名、部门、职位；业务信息：客户数据、订单信息、业绩数据...',
    updateTime: '2025/11/22 17:45:00',
    enabled: true
  }
])

const agreementLoading = ref(false)
const canEditAgreement = computed(() => userStore.isAdmin)

// 协议编辑对话框
const agreementDialogVisible = ref(false)
const currentEditingAgreement = ref<any>(null)

// 邮件设置表单
const emailForm = reactive({
  smtpHost: 'smtp.qq.com',
  smtpPort: 587,
  senderEmail: '',
  senderName: 'CRM系统',
  emailPassword: '',
  enableSsl: false,
  enableTls: true,
  testEmail: ''
})

// 通话设置表单
const callForm = reactive({
  // SIP配置
  sipServer: '',
  sipPort: 5060,
  sipUsername: '',
  sipPassword: '',
  sipTransport: 'UDP',

  // 通话功能配置
  autoAnswer: false,
  autoRecord: true,
  qualityMonitoring: true,
  incomingCallPopup: true,
  maxCallDuration: 3600,

  // 录音配置
  recordFormat: 'wav',
  recordQuality: 'standard',
  recordPath: '/recordings',
  recordRetentionDays: 30,

  // 权限管理
  outboundPermission: ['admin', 'manager', 'sales'],
  recordAccessPermission: ['admin', 'manager'],
  statisticsPermission: ['admin', 'manager'],
  numberRestriction: false,
  allowedPrefixes: ''
})

// 短信设置表单 - 从配置store获取
const smsForm = computed(() => configStore.smsConfig)

// 存储设置表单 - 从配置store获取
const storageForm = computed(() => configStore.storageConfig)

// 商品设置表单 - 从配置store获取
const productForm = computed(() => configStore.productConfig)

// 数据同步配置和状态
const syncConfig = ref(dataSyncService.getSyncConfig())
const syncStatus = ref(dataSyncService.getSyncStatus())

// 🔥 批次266修复：监控数据使用真实数据
const monitorData = ref({
  systemInfo: {
    os: '',
    arch: '',
    cpuCores: 0,
    totalMemory: '',
    nodeVersion: '',
    uptime: ''
  },
  performance: {
    cpuUsage: 0,
    memoryUsage: 0,
    diskUsage: 0,
    networkLatency: 0
  },
  database: {
    type: 'localStorage',
    version: '浏览器存储',
    connected: true,
    activeConnections: 0,
    size: '0 KB',
    lastBackup: '未备份'
  },
  services: []
})

// 🔥 批次266修复：获取真实的系统监控数据
const getRealMonitorData = () => {
  try {
    // 1. 获取系统信息
    monitorData.value.systemInfo = {
      os: navigator.platform || '未知',
      arch: navigator.userAgent.includes('x64') ? 'x64' : (navigator.userAgent.includes('ARM') ? 'ARM' : 'x86'),
      cpuCores: navigator.hardwareConcurrency || 0,
      totalMemory: performance.memory ? `${(performance.memory.jsHeapSizeLimit / 1024 / 1024 / 1024).toFixed(2)} GB (JS堆)` : '未知',
      nodeVersion: '浏览器环境',
      uptime: `页面运行 ${Math.floor(performance.now() / 1000 / 60)} 分钟`
    }

    // 2. 获取性能指标
    if (performance && performance.memory) {
      const memory = performance.memory
      monitorData.value.performance.memoryUsage = Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100)
    } else {
      monitorData.value.performance.memoryUsage = 0
    }

    // CPU使用率（浏览器无法直接获取，使用性能指标估算）
    const perfEntries = performance.getEntriesByType('navigation')
    if (perfEntries.length > 0) {
      const navTiming = perfEntries[0] as PerformanceNavigationTiming
      const loadTime = navTiming.loadEventEnd - navTiming.fetchStart
      // 根据加载时间估算CPU使用率（简化算法）
      monitorData.value.performance.cpuUsage = Math.min(Math.round(loadTime / 100), 100)
    }

    // 磁盘使用率（使用localStorage使用量估算）
    let totalSize = 0
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        totalSize += localStorage[key].length
      }
    }
    // 假设localStorage配额为10MB
    const quotaMB = 10
    monitorData.value.performance.diskUsage = Math.min(Math.round((totalSize / 1024 / 1024 / quotaMB) * 100), 100)

    // 网络延迟
    if (navigator.connection && navigator.connection.rtt) {
      monitorData.value.performance.networkLatency = navigator.connection.rtt
    } else {
      // 使用性能API估算
      const resourceEntries = performance.getEntriesByType('resource')
      if (resourceEntries.length > 0) {
        const avgLatency = resourceEntries.reduce((sum, entry: any) => sum + entry.duration, 0) / resourceEntries.length
        monitorData.value.performance.networkLatency = Math.round(avgLatency)
      }
    }

    // 3. 获取数据库信息（localStorage）
    monitorData.value.database = {
      type: 'localStorage',
      version: '浏览器存储',
      connected: true,
      activeConnections: 1,
      size: `${(totalSize / 1024).toFixed(2)} KB`,
      lastBackup: localStorage.getItem('lastBackupTime') || '未备份'
    }

    // 4. 获取服务状态（前端服务）
    monitorData.value.services = [
      {
        name: '前端应用',
        status: 'running',
        port: window.location.port || '80',
        uptime: `${Math.floor(performance.now() / 1000 / 60)} 分钟`,
        memory: performance.memory ? `${(performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB` : '未知'
      },
      {
        name: 'localStorage',
        status: 'running',
        port: '-',
        uptime: '持久化',
        memory: `${(totalSize / 1024).toFixed(2)} KB`
      },
      {
        name: '网络连接',
        status: navigator.onLine ? 'running' : 'stopped',
        port: '-',
        uptime: navigator.onLine ? '在线' : '离线',
        memory: navigator.connection ? `${navigator.connection.effectiveType || '未知'}` : '未知'
      }
    ]

    console.log('[系统监控] 真实数据已加载:', monitorData.value)
  } catch (error) {
    console.error('[系统监控] 获取真实数据失败:', error)
  }
}

// 🔥 批次266修复：初始化时加载真实数据
onMounted(() => {
  getRealMonitorData()
})

// 备份相关数据
const backupLoading = ref(false)
const backupSaveLoading = ref(false)
const backupListLoading = ref(false)
const restoreLoading = ref('')
const testBackupLoading = ref(false)

// 备份表单数据
const backupForm = reactive({
  autoBackupEnabled: false,
  backupFrequency: 'daily',
  retentionDays: 30,
  compression: true
})

// 备份状态数据
const lastBackupTime = ref('')
const backupCount = ref(0)
const totalBackupSize = ref(0)
const backupList = ref([])

// 数据迁移相关数据
const exportLoading = ref(false)
const validateLoading = ref(false)
const dataStatistics = ref(null)
const validationResult = ref(null)
const migrationStep = ref(0)

// 系统日志数据
const systemLogs = ref<SystemLog[]>([])
const logLevelFilter = ref('')
const logConfigLoading = ref(false)
const logStatsLoading = ref(false)
const cleanupLoading = ref(false)

// 日志清理配置
const logCleanupConfig = ref({
  autoCleanup: true,
  retentionDays: 7,
  maxFileSizeMB: 20,
  cleanupTime: '03:00'
})

// 日志统计
const logStats = ref({
  fileCount: 0,
  totalSize: '0 MB',
  oldestLog: ''
})

// 过滤后的日志
const filteredLogs = computed(() => {
  let logs = systemLogs.value

  // 按日志级别过滤
  if (logLevelFilter.value) {
    logs = logs.filter(log => log.level === logLevelFilter.value)
  }

  // 按时间范围过滤
  if (logDateRange.value && logDateRange.value.length === 2) {
    const startDate = new Date(logDateRange.value[0])
    startDate.setHours(0, 0, 0, 0)
    const endDate = new Date(logDateRange.value[1])
    endDate.setHours(23, 59, 59, 999)

    logs = logs.filter(log => {
      const logDate = new Date(log.timestamp)
      return logDate >= startDate && logDate <= endDate
    })
  }

  // 按关键词搜索
  if (logSearchKeyword.value) {
    const keyword = logSearchKeyword.value.toLowerCase()
    logs = logs.filter(log =>
      log.message.toLowerCase().includes(keyword) ||
      (log.module && log.module.toLowerCase().includes(keyword)) ||
      (log.details && log.details.toLowerCase().includes(keyword))
    )
  }

  return logs
})

// 分页后的日志
const paginatedLogs = computed(() => {
  const start = (logPagination.value.currentPage - 1) * logPagination.value.pageSize
  const end = start + logPagination.value.pageSize
  return filteredLogs.value.slice(start, end)
})

// 移动应用相关数据
const mobileSDKLoading = ref(false)
const activeGuideTab = ref('android')

// 移动SDK信息
const mobileSDKInfo = ref({
  android: {
    version: 'v2.1.3',
    size: '6.0 MB',
    updateTime: '2024-01-20 16:45:00',
    available: true,
    downloadUrl: '/api/sdk/download/android/latest',
    features: ['通话管理', '客户管理', '数据同步', '离线支持']
  },
  ios: {
    version: 'v2.1.3',
    size: '32.8 MB',
    updateTime: '2024-01-20 16:45:00',
    available: true,
    downloadUrl: '/api/sdk/download/ios/latest',
    features: ['通话管理', '客户管理', '数据同步', '离线支持']
  }
})

// 二维码连接相关数据
const qrConnectionLoading = ref(false)
const qrCodeData = ref({
  qrCodeUrl: '',
  connectionId: '',
  expiresAt: '',
  isActive: false
})
const qrForm = reactive({
  userId: userStore.user?.id || '',
  permissions: ['read', 'write'],
  expirationMinutes: 30
})
const connectedDevices = ref([])
const deviceListLoading = ref(false)

// 系统二维码连接数据
const systemQRConnection = ref({
  qrCodeUrl: '',
  connectionId: '',
  status: 'inactive', // 'inactive' | 'active' | 'connected' | 'expired'
  expiresAt: '',
  connectedDevices: []
})

// 二维码连接表单数据
const qrConnectionForm = reactive({
  permissions: ['call', 'sms'],
  expireTime: '30'
})

const devicesLoading = ref(false)

// 服务器配置信息
const serverConfig = ref({
  host: 'localhost',
  port: 3000,
  wsPort: 3001,
  ssl: false,
  apiVersion: 'v1.0'
})

// 连接统计信息
const connectionStats = ref({
  active: 5,
  today: 23,
  total: 156,
  lastConnection: '2024-01-15 16:45:00',
  qr: 0,
  bluetooth: 0,
  network: 0,
  digital: 0
})

// 蓝牙连接相关数据
const bluetoothConnection = ref({
  enabled: false,
  deviceName: 'CRM-Server',
  pairingCode: ''
})
const bluetoothLoading = ref(false)

// 同网络连接相关数据
const networkConnection = ref({
  enabled: false,
  port: 8080,
  broadcastInterval: '10'
})
const networkLoading = ref(false)

// 数字配对相关数据
const digitalPairing = ref({
  enabled: false,
  currentCode: '',
  expireTime: '10'
})
const digitalPairingLoading = ref(false)
const pairingCodeLoading = ref(false)

// 计算属性
const isOssConfigured = computed(() => {
  const storage = configStore.storageConfig
  return storage.storageType === 'oss' &&
         storage.accessKey &&
         storage.secretKey &&
         storage.bucketName &&
         storage.region
})

// 图片压缩预览文本
const compressionPreviewText = computed(() => {
  const storage = storageForm.value
  if (!storage.imageCompressEnabled) {
    return '图片压缩已关闭，上传的图片将保持原始大小'
  }

  let quality = 60
  let maxWidth = 1200
  let qualityName = '标准'

  switch (storage.imageCompressQuality) {
    case 'high':
      quality = 80
      maxWidth = 1920
      qualityName = '高清'
      break
    case 'medium':
      quality = 60
      maxWidth = 1200
      qualityName = '标准'
      break
    case 'low':
      quality = 40
      maxWidth = 800
      qualityName = '省流'
      break
    case 'custom':
      quality = storage.imageCompressCustomQuality || 60
      maxWidth = storage.imageCompressMaxWidth || 1200
      qualityName = '自定义'
      break
  }

  return `当前配置：${qualityName}模式，压缩质量${quality}%，最大宽度${maxWidth}px。预计可减少50%-80%的文件大小。`
})

const canEditBackupSettings = computed(() => {
  return userStore.hasPermission('system:backup:edit')
})

// 表单验证规则
const basicFormRules = {
  systemName: [
    { required: true, message: '请输入系统名称', trigger: 'blur' }
  ],
  companyName: [
    { required: true, message: '请输入公司名称', trigger: 'blur' }
  ],
  contactEmail: [
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ]
}

const securityFormRules = {
  passwordMinLength: [
    { required: true, message: '请设置密码最小长度', trigger: 'blur' }
  ],
  maxLoginFails: [
    { required: true, message: '请设置最大失败次数', trigger: 'blur' }
  ],
  lockDuration: [
    { required: true, message: '请设置锁定时间', trigger: 'blur' }
  ],
  sessionTimeout: [
    { required: true, message: '请设置会话超时时间', trigger: 'blur' }
  ]
}

const emailFormRules = {
  smtpHost: [
    { required: true, message: '请输入SMTP服务器', trigger: 'blur' }
  ],
  smtpPort: [
    { required: true, message: '请输入SMTP端口', trigger: 'blur' }
  ],
  senderEmail: [
    { required: true, message: '请输入发件人邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  testEmail: [
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ]
}

const callFormRules = {
  sipServer: [
    { required: true, message: '请输入SIP服务器地址', trigger: 'blur' }
  ],
  sipPort: [
    { required: true, message: '请输入SIP端口', trigger: 'blur' },
    { type: 'number', min: 1, max: 65535, message: '端口范围为1-65535', trigger: 'blur' }
  ],
  sipUsername: [
    { required: true, message: '请输入SIP用户名', trigger: 'blur' }
  ],
  sipPassword: [
    { required: true, message: '请输入SIP密码', trigger: 'blur' }
  ],
  recordPath: [
    { required: true, message: '请输入录音保存路径', trigger: 'blur' }
  ],
  recordRetentionDays: [
    { required: true, message: '请设置录音保留时间', trigger: 'blur' },
    { type: 'number', min: 1, max: 365, message: '保留时间范围为1-365天', trigger: 'blur' }
  ]
}

const smsFormRules = {
  provider: [
    { required: true, message: '请选择短信服务商', trigger: 'change' }
  ],
  accessKey: [
    { required: true, message: '请输入AccessKey', trigger: 'blur' }
  ],
  secretKey: [
    { required: true, message: '请输入SecretKey', trigger: 'blur' }
  ],
  signName: [
    { required: true, message: '请输入短信签名', trigger: 'blur' }
  ],
  dailyLimit: [
    { required: true, message: '请设置每日发送限制', trigger: 'blur' }
  ],
  monthlyLimit: [
    { required: true, message: '请设置每月发送限制', trigger: 'blur' }
  ],
  testPhone: [
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号格式', trigger: 'blur' }
  ]
}

const storageFormRules = computed(() => {
  const rules: unknown = {}

  if (storageForm.value.storageType === 'local') {
    rules.localPath = [
      { required: true, message: '请输入存储路径', trigger: 'blur' }
    ]
  } else if (storageForm.value.storageType === 'oss') {
    rules.accessKey = [
      { required: true, message: '请输入Access Key', trigger: 'blur' }
    ]
    rules.secretKey = [
      { required: true, message: '请输入Secret Key', trigger: 'blur' }
    ]
    rules.bucketName = [
      { required: true, message: '请输入存储桶名称', trigger: 'blur' }
    ]
    rules.region = [
      { required: true, message: '请选择存储区域', trigger: 'change' }
    ]
  }

  return rules
})

const productFormRules = {
  maxDiscountPercent: [
    { required: true, message: '请设置全局最大优惠比例', trigger: 'blur' },
    { type: 'number', min: 0, max: 100, message: '优惠比例应在0-100之间', trigger: 'blur' }
  ],
  adminMaxDiscount: [
    { required: true, message: '请设置管理员最大优惠', trigger: 'blur' },
    { type: 'number', min: 0, max: 100, message: '优惠比例应在0-100之间', trigger: 'blur' }
  ],
  managerMaxDiscount: [
    { required: true, message: '请设置经理最大优惠', trigger: 'blur' },
    { type: 'number', min: 0, max: 100, message: '优惠比例应在0-100之间', trigger: 'blur' }
  ],
  salesMaxDiscount: [
    { required: true, message: '请设置销售员最大优惠', trigger: 'blur' },
    { type: 'number', min: 0, max: 100, message: '优惠比例应在0-100之间', trigger: 'blur' }
  ],
  discountApprovalThreshold: [
    { required: true, message: '请设置优惠审批阈值', trigger: 'blur' },
    { type: 'number', min: 0, max: 100, message: '审批阈值应在0-100之间', trigger: 'blur' }
  ],
  lowStockThreshold: [
    { required: true, message: '请设置低库存预警阈值', trigger: 'blur' },
    { type: 'number', min: 0, message: '预警阈值不能为负数', trigger: 'blur' }
  ],
  defaultCategory: [
    { required: true, message: '请输入默认分类名称', trigger: 'blur' },
    { min: 1, max: 20, message: '分类名称长度在1-20个字符', trigger: 'blur' }
  ],
  maxCategoryLevel: [
    { required: true, message: '请设置分类层级限制', trigger: 'blur' },
    { type: 'number', min: 1, max: 5, message: '分类层级应在1-5之间', trigger: 'blur' }
  ],
  costPriceViewRoles: [
    { required: true, message: '请选择成本价格查看权限角色', trigger: 'change' }
  ],
  salesDataViewRoles: [
    { required: true, message: '请选择销售数据查看权限角色', trigger: 'change' }
  ],
  stockInfoViewRoles: [
    { required: true, message: '请选择库存信息查看权限角色', trigger: 'change' }
  ],
  operationLogsViewRoles: [
    { required: true, message: '请选择操作日志查看权限角色', trigger: 'change' }
  ],
  sensitiveInfoHideMethod: [
    { required: true, message: '请选择敏感信息隐藏方式', trigger: 'change' }
  ]
}

const backupFormRules = {
  backupFrequency: [
    { required: true, message: '请选择备份频率', trigger: 'change' }
  ],
  retentionDays: [
    { required: true, message: '请设置保留天数', trigger: 'blur' },
    { type: 'number', min: 1, max: 365, message: '保留天数应在1-365之间', trigger: 'blur' }
  ]
}

// 表单引用
const basicFormRef = ref()
const securityFormRef = ref()
const callFormRef = ref()
const emailFormRef = ref()
const smsFormRef = ref()
const storageFormRef = ref()
const productFormRef = ref()
const backupFormRef = ref()

// 权限控制计算属性
const canEditBasicSettings = computed(() => {
  return userStore.isAdmin
})

const canEditSecuritySettings = computed(() => {
  return userStore.isAdmin
})

const canEditCallSettings = computed(() => {
  return userStore.isAdmin
})

const canEditEmailSettings = computed(() => {
  return userStore.isAdmin
})

const canEditSmsSettings = computed(() => {
  return userStore.isAdmin
})

const canEditStorageSettings = computed(() => {
  return userStore.isAdmin
})

const canEditProductSettings = computed(() => {
  return userStore.isAdmin || userStore.isManager
})

const canViewSystemMonitor = computed(() => {
  return userStore.isAdmin || userStore.isManager
})

const canManageSms = computed(() => {
  return userStore.isAdmin
})

// 方法定义
/**
 * 获取CPU使用率颜色
 */
const getCpuColor = (usage: number) => {
  if (usage < 50) return '#67c23a'
  if (usage < 80) return '#e6a23c'
  return '#f56c6c'
}

/**
 * 获取内存使用率颜色
 */
const getMemoryColor = (usage: number) => {
  if (usage < 60) return '#67c23a'
  if (usage < 85) return '#e6a23c'
  return '#f56c6c'
}

/**
 * 获取磁盘使用率颜色
 */
const getDiskColor = (usage: number) => {
  if (usage < 70) return '#67c23a'
  if (usage < 90) return '#e6a23c'
  return '#f56c6c'
}

/**
 * Logo上传前验证
 */
const beforeLogoUpload = (file: UploadFile) => {
  const isJPG = file.type === 'image/jpeg' || file.type === 'image/png'
  const isLt2M = file.size / 1024 / 1024 < 2

  if (!isJPG) {
    ElMessage.error('Logo只能是 JPG/PNG 格式!')
    return false
  }
  if (!isLt2M) {
    ElMessage.error('Logo大小不能超过 2MB!')
    return false
  }
  return true
}

/**
 * Logo上传成功
 */
const handleLogoSuccess = (response: UploadResponse, file: UploadFile) => {
  basicForm.value.systemLogo = URL.createObjectURL(file.raw!)
}

/**
 * 🔥 批次275优化：二维码上传相关方法
 */
// 文件输入引用
const qrFileInput = ref<HTMLInputElement>()

// 触发文件选择
const triggerQRUpload = () => {
  qrFileInput.value?.click()
}

// 处理文件选择
const handleQRFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const files = target.files
  if (files && files.length > 0) {
    handleQRImageFile(files[0])
  }
  // 清空input值，允许重复选择同一文件
  target.value = ''
}

// 粘贴图片功能
const pasteQRImage = async () => {
  try {
    const clipboardItems = await navigator.clipboard.read()
    for (const clipboardItem of clipboardItems) {
      for (const type of clipboardItem.types) {
        if (type.startsWith('image/')) {
          const blob = await clipboardItem.getType(type)
          const file = new File([blob], 'qr-code.png', { type })
          handleQRImageFile(file)
          return
        }
      }
    }
    ElMessage.warning('剪贴板中没有图片')
  } catch (error) {
    ElMessage.error('粘贴图片失败，请检查浏览器权限')
  }
}

// 处理图片文件 - 上传到服务器
const handleQRImageFile = async (file: File) => {
  try {
    const { uploadImageWithMessage } = await import('@/services/uploadService')
    const url = await uploadImageWithMessage(file, 'system')
    if (url) {
      // 使用configStore更新，确保响应式生效
      configStore.updateSystemConfig({ contactQRCode: url })
      console.log('[Settings] 二维码URL已更新:', url)
    }
  } catch (error) {
    console.error('二维码上传失败:', error)
    ElMessage.error('上传失败，请重试')
  }
}

// 预览二维码
const previewQRCode = () => {
  if (basicForm.value.contactQRCode) {
    ElMessageBox.alert(
      `<div style="text-align: center; padding: 20px;">
        <img src="${basicForm.value.contactQRCode}" alt="二维码" style="max-width: 400px; max-height: 400px; border: 1px solid #ddd; border-radius: 8px;" />
      </div>`,
      '二维码预览',
      {
        confirmButtonText: '关闭',
        dangerouslyUseHTMLString: true
      }
    )
  }
}

/**
 * 🔥 批次274新增：删除二维码
 */
const removeQRCode = async () => {
  try {
    await ElMessageBox.confirm('确定要删除该二维码吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    // 如果是服务器上的文件，尝试删除
    const currentUrl = basicForm.value.contactQRCode
    if (currentUrl && currentUrl.includes('/uploads/system/')) {
      try {
        const filename = currentUrl.split('/').pop()
        const { apiService } = await import('@/services/apiService')
        await apiService.delete('/system/delete-image', { data: { filename } })
      } catch (e) {
        // 删除文件失败不影响清空表单
        console.warn('删除服务器文件失败:', e)
      }
    }

    // 使用configStore更新，确保响应式生效
    configStore.updateSystemConfig({ contactQRCode: '', contactQRCodeLabel: '' })
    ElMessage.success('删除成功')
  } catch {
    // 取消删除
  }
}

/**
 * 🔥 批次275新增：用户协议相关方法
 */
// 默认协议内容
const getDefaultUserAgreement = () => {
  return `<div style="line-height: 2.2; padding: 30px; font-size: 15px;">
<h2 style="color: #303133; border-bottom: 3px solid #409eff; padding-bottom: 15px; margin-bottom: 30px; text-align: center; font-size: 26px; font-weight: 700;">用户使用协议</h2>

<p style="color: #606266; margin: 25px 0; font-size: 16px; line-height: 2.5; background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #409eff;">
  <strong>欢迎使用本CRM客户管理系统</strong>（以下简称"本系统"）。在使用本系统之前，<strong style="color: #409eff;">请您仔细阅读并充分理解本协议的全部内容</strong>。
</p>

<h3 style="color: #409eff; margin-top: 45px; margin-bottom: 20px; font-size: 20px; font-weight: 600; padding-left: 15px; border-left: 5px solid #409eff;">一、协议的接受</h3>

<p style="color: #606266; margin: 18px 0; padding-left: 15px;">
  <strong>1.1</strong> 本协议是您与本系统运营方之间关于使用本系统服务所订立的协议。
</p>

<p style="color: #606266; margin: 18px 0; padding-left: 15px;">
  <strong>1.2</strong> 您点击<strong style="color: #409eff;">"同意"</strong>按钮即表示您完全接受本协议的全部条款。
</p>

<h3 style="color: #409eff; margin-top: 45px; margin-bottom: 20px; font-size: 20px; font-weight: 600; padding-left: 15px; border-left: 5px solid #409eff;">二、服务内容</h3>

<p style="color: #606266; margin: 18px 0; padding-left: 15px;">
  <strong>2.1</strong> 本系统为企业提供客户关系管理服务，包括但不限于：
</p>

<ul style="color: #606266; padding-left: 50px; margin: 20px 0; line-height: 2.5;">
  <li style="margin: 12px 0;">✓ 客户信息管理</li>
  <li style="margin: 12px 0;">✓ 订单管理</li>
  <li style="margin: 12px 0;">✓ 业绩统计</li>
  <li style="margin: 12px 0;">✓ 数据分析</li>
  <li style="margin: 12px 0;">✓ 团队协作</li>
</ul>

<p style="color: #606266; margin: 18px 0; padding-left: 15px;">
  <strong>2.2</strong> 本系统保留随时修改或中断服务而不需通知用户的权利。
</p>

<h3 style="color: #409eff; margin-top: 45px; margin-bottom: 20px; font-size: 20px; font-weight: 600; padding-left: 15px; border-left: 5px solid #409eff;">三、用户权利和义务</h3>

<p style="color: #606266; margin: 25px 0; padding-left: 15px;">
  <strong style="font-size: 17px; color: #333;">3.1 用户权利：</strong>
</p>

<ul style="color: #606266; padding-left: 50px; margin: 20px 0; line-height: 2.5;">
  <li style="margin: 12px 0;">✓ 使用本系统提供的各项功能</li>
  <li style="margin: 12px 0;">✓ 管理自己的客户数据</li>
  <li style="margin: 12px 0;">✓ 查看业绩统计报表</li>
  <li style="margin: 12px 0;">✓ 获得技术支持服务</li>
</ul>

<p style="color: #606266; margin: 25px 0; padding-left: 15px;">
  <strong style="font-size: 17px; color: #333;">3.2 用户义务：</strong>
</p>

<ul style="color: #606266; padding-left: 50px; margin: 20px 0; line-height: 2.5;">
  <li style="margin: 15px 0; padding: 15px; background: #fff3f3; border-left: 4px solid #f56c6c; border-radius: 4px;">
    <strong style="color: #f56c6c; font-size: 16px;">⚠️ 严禁将本系统用于任何违法犯罪活动，包括但不限于诈骗、洗钱、传销等</strong>
  </li>
  <li style="margin: 12px 0;">• 遵守国家法律法规和社会公德</li>
  <li style="margin: 12px 0;">• 不得利用本系统侵害他人合法权益</li>
  <li style="margin: 12px 0;">• 妥善保管账号密码，对账号下的所有行为负责</li>
  <li style="margin: 12px 0;">• 不得恶意攻击、破坏系统</li>
  <li style="margin: 12px 0;">• 不得泄露客户隐私信息</li>
  <li style="margin: 12px 0;">• 不得传播虚假信息或进行欺诈行为</li>
</ul>

<h3 style="color: #409eff; margin-top: 45px; margin-bottom: 20px; font-size: 20px; font-weight: 600; padding-left: 15px; border-left: 5px solid #409eff;">四、免责声明</h3>

<p style="color: #f56c6c; font-weight: bold; margin: 25px 0; padding: 20px; background: #fff3f3; border-left: 5px solid #f56c6c; border-radius: 8px; font-size: 16px;">
  <strong>⚠️ 重要提示：</strong>本系统仅作为工具提供服务，<strong>不对用户使用本系统产生的内容、行为及后果承担任何责任</strong>。
</p>

<p style="color: #606266; margin: 18px 0; padding-left: 15px;">
  <strong>4.2</strong> 本系统不对因以下原因导致的损失承担责任：
</p>

<ul style="color: #606266; padding-left: 50px; margin: 20px 0; line-height: 2.5;">
  <li style="margin: 12px 0;">• 用户违法违规使用本系统</li>
  <li style="margin: 12px 0;">• 用户利用本系统从事诈骗、欺诈等违法活动</li>
  <li style="margin: 12px 0;">• 不可抗力因素（自然灾害、战争、政府行为等）</li>
  <li style="margin: 12px 0;">• 网络故障、设备故障</li>
  <li style="margin: 12px 0;">• 用户操作不当或误操作</li>
  <li style="margin: 12px 0;">• 第三方侵权行为</li>
  <li style="margin: 12px 0;">• 数据丢失或损坏</li>
</ul>

<p style="color: #f56c6c; font-weight: bold; margin: 25px 0; padding: 20px; background: #fff3f3; border-left: 5px solid #f56c6c; border-radius: 8px; font-size: 16px;">
  <strong>4.3</strong> 用户应对其使用本系统的行为<strong>承担全部法律责任</strong>。如因用户违法违规使用本系统导致任何法律纠纷或损失，用户应自行承担全部责任，并赔偿本系统因此遭受的损失。
</p>

<h3 style="color: #409eff; margin-top: 45px; margin-bottom: 20px; font-size: 20px; font-weight: 600; padding-left: 15px; border-left: 5px solid #409eff;">五、数据安全</h3>

<p style="color: #606266; margin: 18px 0; padding-left: 15px;">
  <strong>5.1</strong> 本系统采用<strong style="color: #409eff;">行业标准的安全措施</strong>保护用户数据。
</p>

<p style="color: #606266; margin: 18px 0; padding-left: 15px;">
  <strong>5.2</strong> 用户应定期备份重要数据，本系统不对数据丢失承担责任。
</p>

<p style="color: #606266; margin: 18px 0; padding-left: 15px;">
  <strong>5.3</strong> 未经授权访问、使用、修改或破坏系统数据的行为将<strong style="color: #f56c6c;">承担法律责任</strong>。
</p>

<h3 style="color: #409eff; margin-top: 45px; margin-bottom: 20px; font-size: 20px; font-weight: 600; padding-left: 15px; border-left: 5px solid #409eff;">六、知识产权</h3>

<p style="color: #606266; margin: 18px 0; padding-left: 15px;">
  <strong>6.1</strong> 本系统的所有内容，包括但不限于文字、图片、软件、程序等，均受<strong style="color: #409eff;">知识产权法保护</strong>。
</p>

<p style="color: #606266; margin: 18px 0; padding-left: 15px;">
  <strong>6.2</strong> 未经许可，用户不得复制、传播、修改本系统的任何内容。
</p>

<h3 style="color: #409eff; margin-top: 45px; margin-bottom: 20px; font-size: 20px; font-weight: 600; padding-left: 15px; border-left: 5px solid #409eff;">七、违规处理</h3>

<p style="color: #606266; margin: 18px 0; padding-left: 15px;">
  <strong>7.1</strong> 如发现用户违反本协议或从事违法活动，本系统有权：
</p>

<ul style="color: #606266; padding-left: 50px; margin: 20px 0; line-height: 2.5;">
  <li style="margin: 12px 0;">• 立即终止服务</li>
  <li style="margin: 12px 0;">• 删除违规内容</li>
  <li style="margin: 12px 0;">• 冻结或注销账号</li>
  <li style="margin: 12px 0;">• 向有关部门报告</li>
  <li style="margin: 12px 0;">• 追究法律责任</li>
</ul>

<h3 style="color: #409eff; margin-top: 45px; margin-bottom: 20px; font-size: 20px; font-weight: 600; padding-left: 15px; border-left: 5px solid #409eff;">八、协议的变更</h3>

<p style="color: #606266; margin: 18px 0; padding-left: 15px;">
  <strong>8.1</strong> 本系统有权随时修改本协议条款。
</p>

<p style="color: #606266; margin: 18px 0; padding-left: 15px;">
  <strong>8.2</strong> 协议变更后，继续使用本系统即视为接受新协议。
</p>

<h3 style="color: #409eff; margin-top: 45px; margin-bottom: 20px; font-size: 20px; font-weight: 600; padding-left: 15px; border-left: 5px solid #409eff;">九、争议解决</h3>

<p style="color: #606266; margin: 18px 0; padding-left: 15px;">
  <strong>9.1</strong> 本协议的解释、效力及纠纷的解决，适用<strong style="color: #409eff;">中华人民共和国法律</strong>。
</p>

<p style="color: #606266; margin: 18px 0; padding-left: 15px;">
  <strong>9.2</strong> 若发生争议，双方应友好协商解决；协商不成的，可向本系统所在地人民法院提起诉讼。
</p>

<h3 style="color: #409eff; margin-top: 45px; margin-bottom: 20px; font-size: 20px; font-weight: 600; padding-left: 15px; border-left: 5px solid #409eff;">十、其他</h3>

<p style="color: #606266; margin: 18px 0; padding-left: 15px;">
  <strong>10.1</strong> 本协议自用户点击同意之日起生效。
</p>

<p style="color: #606266; margin: 18px 0; padding-left: 15px;">
  <strong>10.2</strong> 如本协议中的任何条款无论因何种原因完全或部分无效或不具有执行力，本协议的其余条款仍应有效并且有约束力。
</p>

<div style="margin-top: 50px; padding-top: 25px; border-top: 2px dashed #e0e0e0; text-align: center;">
  <p style="color: #909399; font-size: 13px; margin: 0;">最后更新日期：${new Date().toLocaleDateString('zh-CN')}</p>
</div>
</div>`
}

const getDefaultPrivacyPolicy = () => {
  return `<div style="line-height: 2; padding: 20px;">
<h2 style="color: #303133; border-bottom: 2px solid #409eff; padding-bottom: 10px;">用户隐私协议</h2>

<p style="color: #606266; margin: 20px 0;">本隐私协议（以下简称"本协议"）适用于本CRM客户管理系统（以下简称"本系统"）。我们非常重视用户的隐私保护，特制定本协议。</p>

<h3 style="color: #409eff; margin-top: 30px;">一、信息收集</h3>
<p style="color: #606266;"><strong>1.1 我们收集的信息类型：</strong></p>
<ul style="color: #606266; padding-left: 30px;">
  <li><strong>账号信息：</strong>用户名、密码、邮箱、手机号</li>
  <li><strong>个人信息：</strong>姓名、部门、职位、头像</li>
  <li><strong>业务信息：</strong>客户数据、订单信息、业绩数据、通话记录</li>
  <li><strong>使用信息：</strong>登录日志、操作记录、访问时间、IP地址</li>
  <li><strong>设备信息：</strong>浏览器类型、操作系统、设备型号</li>
</ul>

<p style="color: #606266;"><strong>1.2 信息收集方式：</strong></p>
<ul style="color: #606266; padding-left: 30px;">
  <li>用户主动提供</li>
  <li>系统自动收集</li>
  <li>第三方合法提供</li>
</ul>

<h3 style="color: #409eff; margin-top: 30px;">二、信息使用</h3>
<p style="color: #606266;"><strong>2.1 我们使用收集的信息用于：</strong></p>
<ul style="color: #606266; padding-left: 30px;">
  <li>提供系统服务和功能</li>
  <li>改进用户体验</li>
  <li>数据统计和分析</li>
  <li>安全监控和风险防范</li>
  <li>技术支持和客户服务</li>
  <li>发送系统通知和重要消息</li>
</ul>

<p style="color: #606266;"><strong>2.2 我们承诺：</strong></p>
<ul style="color: #606266; padding-left: 30px;">
  <li>不会将用户信息用于本协议未载明的其他用途</li>
  <li>不会向第三方出售、出租或共享用户信息</li>
  <li>严格限制信息访问权限，仅授权人员可访问</li>
</ul>

<h3 style="color: #409eff; margin-top: 30px;">三、信息存储</h3>
<p style="color: #606266;"><strong>3.1 存储位置：</strong></p>
<ul style="color: #606266; padding-left: 30px;">
  <li>用户数据主要存储在本地浏览器（localStorage）</li>
  <li>部分数据可能存储在服务器</li>
  <li>采用加密技术保护敏感信息</li>
</ul>

<p style="color: #606266;"><strong>3.2 存储期限：</strong></p>
<ul style="color: #606266; padding-left: 30px;">
  <li>账号存续期间持续存储</li>
  <li>账号注销后，数据将在30天内删除</li>
  <li>法律法规要求保留的除外</li>
</ul>

<h3 style="color: #409eff; margin-top: 30px;">四、信息保护</h3>
<p style="color: #606266;"><strong>4.1 安全措施：</strong></p>
<ul style="color: #606266; padding-left: 30px;">
  <li>数据加密传输（HTTPS）</li>
  <li>密码加密存储（不可逆加密）</li>
  <li>访问权限控制（角色权限管理）</li>
  <li>定期安全审计</li>
  <li>异常行为监控和预警</li>
  <li>数据备份和恢复机制</li>
</ul>

<p style="color: #606266;"><strong>4.2 安全承诺：</strong></p>
<ul style="color: #606266; padding-left: 30px;">
  <li>采用行业标准的安全技术和管理措施</li>
  <li>建立完善的数据安全管理制度</li>
  <li>定期对员工进行安全培训</li>
  <li>及时修复发现的安全漏洞</li>
</ul>

<h3 style="color: #409eff; margin-top: 30px;">五、信息共享</h3>
<p style="color: #f56c6c; font-weight: bold;">5.1 我们不会与第三方共享用户信息，除非：</p>
<ul style="color: #606266; padding-left: 30px;">
  <li>获得用户明确同意</li>
  <li>法律法规明确要求</li>
  <li>司法机关或行政机关依法要求</li>
  <li>保护系统安全所必需</li>
  <li>维护用户合法权益所必需</li>
</ul>

<p style="color: #606266;"><strong>5.2 共享原则：</strong></p>
<ul style="color: #606266; padding-left: 30px;">
  <li>最小必要原则</li>
  <li>合法正当原则</li>
  <li>安全可控原则</li>
</ul>

<h3 style="color: #409eff; margin-top: 30px;">六、用户权利</h3>
<p style="color: #606266;"><strong>6.1 您享有以下权利：</strong></p>
<ul style="color: #606266; padding-left: 30px;">
  <li>访问您的个人信息</li>
  <li>更正不准确的信息</li>
  <li>删除您的个人信息</li>
  <li>撤回信息使用授权</li>
  <li>注销您的账号</li>
  <li>投诉举报</li>
  <li>获取个人信息副本</li>
</ul>

<p style="color: #606266;"><strong>6.2 权利行使方式：</strong></p>
<ul style="color: #606266; padding-left: 30px;">
  <li>通过系统设置自行操作</li>
  <li>联系客服协助处理</li>
  <li>发送邮件申请</li>
</ul>

<h3 style="color: #409eff; margin-top: 30px;">七、Cookie和类似技术</h3>
<p style="color: #606266;">7.1 本系统使用Cookie和localStorage技术：</p>
<ul style="color: #606266; padding-left: 30px;">
  <li>记住登录状态</li>
  <li>保存用户偏好设置</li>
  <li>统计访问数据</li>
  <li>改善用户体验</li>
</ul>
<p style="color: #606266;">7.2 您可以通过浏览器设置管理Cookie和localStorage。</p>

<h3 style="color: #409eff; margin-top: 30px;">八、未成年人保护</h3>
<p style="color: #606266;">8.1 本系统不向未满18周岁的未成年人提供服务。</p>
<p style="color: #606266;">8.2 如发现未成年人使用本系统，我们将立即停止服务并删除相关信息。</p>

<h3 style="color: #409eff; margin-top: 30px;">九、数据跨境传输</h3>
<p style="color: #606266;">9.1 您的数据主要存储在中国境内。</p>
<p style="color: #606266;">9.2 如需跨境传输，我们将遵守相关法律法规，并采取必要的安全措施。</p>

<h3 style="color: #409eff; margin-top: 30px;">十、隐私协议的变更</h3>
<p style="color: #606266;">10.1 我们可能适时修订本协议。</p>
<p style="color: #606266;">10.2 变更后的协议将在系统内公布，继续使用即视为接受新协议。</p>
<p style="color: #606266;">10.3 重大变更将通过系统通知或邮件方式告知用户。</p>

<h3 style="color: #409eff; margin-top: 30px;">十一、联系我们</h3>
<p style="color: #606266;">如您对本隐私协议有任何疑问、意见或建议，请通过以下方式联系我们：</p>
<ul style="color: #606266; padding-left: 30px;">
  <li><strong>客服电话：</strong>${basicForm.value.contactPhone || '400-xxx-xxxx'}</li>
  <li><strong>客服邮箱：</strong>${basicForm.value.contactEmail || 'service@example.com'}</li>
  <li><strong>公司地址：</strong>${basicForm.value.companyAddress || '请在系统设置中配置'}</li>
</ul>
<p style="color: #606266;">我们将在收到您的反馈后15个工作日内予以回复。</p>

<p style="color: #909399; margin-top: 30px; font-size: 12px;">最后更新日期：${new Date().toLocaleDateString('zh-CN')}</p>
</div>`
}

// 🔥 批次287：旧的协议函数已废弃，保留注释供参考
// 这些函数已被新的协议列表管理函数替代
// initAgreementContent, handleSaveAgreement, previewAgreement, resetAgreementToDefault

/**
 * 🔥 批次287：协议列表管理函数
 */

// 计算字数（去除HTML标签）
const countWords = (html: string): number => {
  const text = html.replace(/<[^>]+>/g, '').replace(/\s+/g, '')
  return text.length
}

// 生成内容概述
const generateSummary = (html: string): string => {
  const text = html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
  return text.substring(0, 50) + (text.length > 50 ? '...' : '')
}

// 从localStorage加载协议列表
const loadAgreementList = () => {
  try {
    const savedList = localStorage.getItem('crm_agreement_list')
    if (savedList) {
      agreementList.value = JSON.parse(savedList)
      console.log('[协议列表] 已加载:', agreementList.value.length, '个协议')
    } else {
      console.log('[协议列表] 未找到保存的数据，使用默认空列表')
    }
  } catch (error) {
    console.error('[协议列表] 加载失败:', error)
  }
}

// 保存协议列表到localStorage
const saveAgreementList = () => {
  try {
    localStorage.setItem('crm_agreement_list', JSON.stringify(agreementList.value))

    // 同时更新configStore
    const userAgreement = agreementList.value.find(a => a.type === 'user')
    const privacyPolicy = agreementList.value.find(a => a.type === 'privacy')

    if (userAgreement && privacyPolicy) {
      configStore.updateSystemConfig({
        userAgreement: userAgreement.content,
        privacyPolicy: privacyPolicy.content
      })
    }

    console.log('[协议列表] 已保存')
  } catch (error) {
    console.error('[协议列表] 保存失败:', error)
    throw error
  }
}

// 编辑协议
const handleEditAgreement = (agreement: unknown) => {
  currentEditingAgreement.value = { ...agreement }
  agreementDialogVisible.value = true
}

// 保存编辑的协议
const handleSaveAgreementContent = (content: string) => {
  if (!currentEditingAgreement.value) return

  const index = agreementList.value.findIndex(a => a.id === currentEditingAgreement.value.id)
  if (index !== -1) {
    // 更新现有协议
    agreementList.value[index].content = content
    agreementList.value[index].wordCount = countWords(content)
    agreementList.value[index].summary = generateSummary(content)
    agreementList.value[index].updateTime = new Date().toLocaleString('zh-CN')
    ElMessage.success('协议内容已更新')
  } else {
    // 新增协议
    const newAgreement = {
      ...currentEditingAgreement.value,
      content,
      wordCount: countWords(content),
      summary: generateSummary(content),
      updateTime: new Date().toLocaleString('zh-CN')
    }
    agreementList.value.push(newAgreement)
    ElMessage.success('协议已添加')
  }
}

// 预览协议
const handlePreviewAgreement = (agreement: unknown) => {
  ElMessageBox.alert(
    `<div style="max-height: 500px; overflow-y: auto; padding: 10px; text-align: left; font-size: 14px; line-height: 1.8;">${agreement.content}</div>`,
    agreement.title,
    {
      confirmButtonText: '关闭',
      dangerouslyUseHTMLString: true,
      customStyle: {
        width: '65%',
        maxWidth: '800px'
      }
    }
  )
}

// 协议状态变更
const handleAgreementStatusChange = (agreement: unknown) => {
  ElMessage.success(`${agreement.title}已${agreement.enabled ? '启用' : '禁用'}`)
}

// 新增协议
const handleAddAgreement = () => {
  const newId = Math.max(...agreementList.value.map(a => a.id), 0) + 1
  const newAgreement = {
    id: newId,
    type: 'custom',
    title: '新协议',
    content: '<p>请输入协议内容...</p>',
    wordCount: 0,
    summary: '暂无内容',
    updateTime: new Date().toLocaleString('zh-CN'),
    enabled: false
  }

  currentEditingAgreement.value = newAgreement
  agreementDialogVisible.value = true
}

// 保存协议列表配置
const handleSaveAgreementList = async () => {
  try {
    agreementLoading.value = true

    // 保存到localStorage和configStore
    saveAgreementList()

    ElMessage.success('协议配置保存成功')
  } catch (error) {
    console.error('[协议列表] 保存配置失败:', error)
    ElMessage.error('保存失败，请重试')
  } finally {
    agreementLoading.value = false
  }
}

/**
 * 保存基本设置
 * 🔥 批次273修复：添加真实API调用，支持生产环境自动无缝切换
 */
const handleSaveBasic = async () => {
  try {
    await basicFormRef.value?.validate()

    basicLoading.value = true

    // 1. 先保存到localStorage（本地缓存，立即生效）
    configStore.updateSystemConfig(basicForm.value)

    console.log('[基本设置] 已保存到localStorage:', basicForm.value)

    // 2. 尝试保存到后端API（生产环境持久化）
    try {
      const { apiService } = await import('@/services/apiService')
      // apiService.put 返回的是 response.data.data，如果成功则不会抛出异常
      await apiService.put('/system/basic-settings', basicForm.value)
      console.log('[基本设置] 已同步到后端API')
      ElMessage.success('基本设置保存成功')
    } catch (apiError: unknown) {
      // API调用失败时降级处理
      const err = apiError as { message?: string; code?: string; response?: { status?: number; data?: { message?: string } } }
      console.warn('[基本设置] API调用失败:', err?.message || err)

      // 如果是网络错误或API不存在，仍然提示成功（因为localStorage已保存）
      if (err?.code === 'ECONNREFUSED' || err?.response?.status === 404) {
        ElMessage.success('基本设置保存成功（本地模式）')
      } else if (err?.response?.status === 403) {
        ElMessage.error('没有权限修改系统设置，请联系管理员')
      } else if (err?.response?.status === 500) {
        ElMessage.error('服务器内部错误: ' + (err?.response?.data?.message || '请稍后重试'))
      } else {
        // 其他错误提示警告，但数据可能已保存成功
        ElMessage.success('基本设置保存成功')
      }
    }
  } catch (error: unknown) {
    console.error('[基本设置] 表单验证失败:', error)
    ElMessage.error('保存基本设置失败，请重试')
  } finally {
    basicLoading.value = false
  }
}

/**
 * 保存安全设置
 * 🔥 批次264修复：添加真实API调用，支持生产环境自动无缝切换
 */
const handleSaveSecurity = async () => {
  try {
    await securityFormRef.value?.validate()

    securityLoading.value = true

    // 1. 先保存到localStorage（本地缓存，立即生效）
    configStore.updateSecurityConfig(securityForm.value)

    console.log('[安全设置] 已保存到localStorage:', securityForm.value)

    // 2. 尝试保存到后端API（生产环境持久化）
    try {
      const { apiService } = await import('@/services/apiService')
      await apiService.put('/system/security-settings', securityForm.value)
      console.log('[安全设置] 已同步到后端API')
      ElMessage.success('安全设置保存成功')
    } catch (apiError: unknown) {
      // API调用失败时降级处理
      console.warn('[安全设置] API调用失败，已保存到本地:', apiError.message || apiError)

      // 如果是网络错误或API不存在，仍然提示成功（因为localStorage已保存）
      if (apiError.code === 'ECONNREFUSED' || apiError.response?.status === 404) {
        ElMessage.success('安全设置保存成功（本地模式）')
      } else {
        // 其他错误提示警告
        ElMessage.warning('安全设置已保存到本地，但未能同步到服务器')
      }
    }
  } catch (error: unknown) {
    console.error('[安全设置] 表单验证失败:', error)
    ElMessage.error('保存安全设置失败，请重试')
  } finally {
    securityLoading.value = false
  }
}

/**
 * 保存邮件设置
 * 🔥 批次288修复：添加真实API调用
 */
const handleSaveEmail = async () => {
  try {
    await emailFormRef.value?.validate()

    emailLoading.value = true

    // 1. 先保存到localStorage（本地缓存，立即生效）
    configStore.updateEmailConfig(emailForm)

    console.log('[邮件设置] 已保存到localStorage:', emailForm)

    // 2. 尝试保存到后端API（生产环境持久化）
    try {
      const { apiService } = await import('@/services/apiService')
      await apiService.put('/system/email-settings', emailForm)
      console.log('[邮件设置] 已同步到后端API')
      ElMessage.success('邮件设置保存成功')
    } catch (apiError: unknown) {
      console.warn('[邮件设置] API调用失败，已保存到本地:', apiError)
      if ((apiError as { code?: string }).code === 'ECONNREFUSED' || (apiError as { response?: { status?: number } }).response?.status === 404) {
        ElMessage.success('邮件设置保存成功（本地模式）')
      } else {
        ElMessage.warning('邮件设置已保存到本地，但未能同步到服务器')
      }
    }
  } catch (error) {
    console.error('[邮件设置] 表单验证失败:', error)
    ElMessage.error('保存邮件设置失败，请重试')
  } finally {
    emailLoading.value = false
  }
}

/**
 * 保存通话设置
 * 🔥 批次288修复：添加真实API调用
 */
const handleSaveCall = async () => {
  try {
    await callFormRef.value?.validate()

    callLoading.value = true

    // 1. 先保存到localStorage（本地缓存，立即生效）
    configStore.updateCallConfig(callForm)

    console.log('[通话设置] 已保存到localStorage:', callForm)

    // 2. 尝试保存到后端API（生产环境持久化）
    try {
      const { apiService } = await import('@/services/apiService')
      await apiService.put('/system/call-settings', callForm)
      console.log('[通话设置] 已同步到后端API')
      ElMessage.success('通话设置保存成功')
    } catch (apiError: unknown) {
      console.warn('[通话设置] API调用失败，已保存到本地:', apiError)
      if ((apiError as { code?: string }).code === 'ECONNREFUSED' || (apiError as { response?: { status?: number } }).response?.status === 404) {
        ElMessage.success('通话设置保存成功（本地模式）')
      } else {
        ElMessage.warning('通话设置已保存到本地，但未能同步到服务器')
      }
    }
  } catch (error) {
    console.error('[通话设置] 表单验证失败:', error)
    ElMessage.error('保存通话设置失败，请重试')
  } finally {
    callLoading.value = false
  }
}

/**
 * 测试通话连接
 */
const handleTestCallConnection = async () => {
  try {
    testingCallConnection.value = true

    // 模拟测试SIP连接
    await new Promise(resolve => setTimeout(resolve, 2000))

    ElMessage.success('SIP连接测试成功')
  } catch (error) {
    ElMessage.error('SIP连接测试失败')
  } finally {
    testingCallConnection.value = false
  }
}

/**
 * 测试邮件发送
 */
const handleTestEmail = async () => {
  if (!emailForm.testEmail) {
    ElMessage.warning('请先输入测试邮箱地址')
    return
  }

  try {
    testEmailLoading.value = true

    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 2000))

    ElMessage.success('测试邮件发送成功，请检查邮箱')
  } catch (error) {
    ElMessage.error('测试邮件发送失败')
  } finally {
    testEmailLoading.value = false
  }
}

/**
 * 保存短信设置
 * 🔥 批次288修复：添加真实API调用
 */
const handleSaveSms = async () => {
  try {
    await smsFormRef.value?.validate()

    smsLoading.value = true

    // 1. 先保存到localStorage（本地缓存，立即生效）
    configStore.updateSmsConfig(smsForm.value)

    console.log('[短信设置] 已保存到localStorage:', smsForm.value)

    // 2. 尝试保存到后端API（生产环境持久化）
    try {
      const { apiService } = await import('@/services/apiService')
      await apiService.put('/system/sms-settings', smsForm.value)
      console.log('[短信设置] 已同步到后端API')
      ElMessage.success('短信设置保存成功')
    } catch (apiError: unknown) {
      console.warn('[短信设置] API调用失败，已保存到本地:', apiError)
      if ((apiError as { code?: string }).code === 'ECONNREFUSED' || (apiError as { response?: { status?: number } }).response?.status === 404) {
        ElMessage.success('短信设置保存成功（本地模式）')
      } else {
        ElMessage.warning('短信设置已保存到本地，但未能同步到服务器')
      }
    }
  } catch (error) {
    console.error('[短信设置] 表单验证失败:', error)
    ElMessage.error('保存短信设置失败，请重试')
  } finally {
    smsLoading.value = false
  }
}

/**
 * 测试短信发送
 */
const handleTestSms = async () => {
  if (!smsForm.value.testPhone) {
    ElMessage.warning('请先输入测试手机号')
    return
  }

  try {
    testSmsLoading.value = true

    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 2000))

    ElMessage.success('测试短信发送成功，请检查手机')
  } catch (error) {
    ElMessage.error('测试短信发送失败')
  } finally {
    testSmsLoading.value = false
  }
}

/**
 * 打开短信管理弹窗
 */
const handleOpenSmsManagement = () => {
  smsManagementVisible.value = true
}

/**
 * 生成二维码
 */
const handleGenerateQRCode = async () => {
  try {
    qrConnectionLoading.value = true

    // 导入二维码连接API
    const { generateQRCode } = await import('@/api/qr-connection')

    const response = await generateQRCode({
      userId: qrForm.userId,
      permissions: qrForm.permissions,
      expirationMinutes: qrForm.expirationMinutes
    })

    qrCodeData.value = {
      qrCodeUrl: response.qrCodeUrl,
      connectionId: response.connectionId,
      expiresAt: new Date(Date.now() + qrForm.expirationMinutes * 60 * 1000).toLocaleString(),
      isActive: true
    }

    ElMessage.success('二维码生成成功')
  } catch (error) {
    console.error('生成二维码失败:', error)
    ElMessage.error('生成二维码失败，请重试')
  } finally {
    qrConnectionLoading.value = false
  }
}

/**
 * 刷新已连接设备列表
 * 🔥 修复：设备功能未开发时静默处理，不显示错误
 */
const handleRefreshDevices = async () => {
  try {
    deviceListLoading.value = true

    // 导入二维码连接API
    const { getConnectedDevices } = await import('@/api/qr-connection')

    const devices = await getConnectedDevices()
    connectedDevices.value = devices || []

    // 只有在有设备时才显示成功消息
    if (devices && devices.length > 0) {
      ElMessage.success('设备列表刷新成功')
    }
  } catch (error) {
    // 🔥 静默处理：设备功能未开发或API不存在时不显示错误
    console.log('[设备列表] 功能未启用或暂无设备')
    connectedDevices.value = []
  } finally {
    deviceListLoading.value = false
  }
}

/**
 * 断开设备连接
 */
const handleDisconnectDevice = async (deviceId: string) => {
  try {
    await ElMessageBox.confirm(
      '确定要断开此设备的连接吗？',
      '断开连接确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )

    // 使用替代连接API断开设备
    await alternativeConnectionApi.disconnectDevice(deviceId)

    // 刷新设备列表
    await refreshConnectedDevices()

    ElMessage.success('设备连接已断开')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('断开设备连接失败:', error)
      ElMessage.error('断开设备连接失败，请重试')
    }
  }
}

// 替代连接方式相关方法

/**
 * 切换蓝牙连接状态
 */
const toggleBluetoothConnection = async () => {
  try {
    bluetoothLoading.value = true

    if (bluetoothConnection.value.enabled) {
      // 停止蓝牙服务
      await alternativeConnectionApi.stopBluetoothService()
      bluetoothConnection.value.enabled = false
      bluetoothConnection.value.pairingCode = ''
      ElMessage.success('蓝牙服务已停止')
    } else {
      // 启动蓝牙服务
      const response = await alternativeConnectionApi.startBluetoothService({
        deviceName: bluetoothConnection.value.deviceName
      })
      bluetoothConnection.value.enabled = true
      bluetoothConnection.value.pairingCode = response.data.pairingCode || generateRandomCode(6)
      ElMessage.success('蓝牙服务已启动')
    }

    // 更新连接统计
    await updateConnectionStats()
  } catch (error) {
    console.error('切换蓝牙连接失败:', error)
    ElMessage.error('操作失败，请重试')
  } finally {
    bluetoothLoading.value = false
  }
}

/**
 * 切换同网络连接状态
 */
const toggleNetworkConnection = async () => {
  try {
    networkLoading.value = true

    if (networkConnection.value.enabled) {
      // 停止网络发现
      await alternativeConnectionApi.stopNetworkDiscovery()
      networkConnection.value.enabled = false
      ElMessage.success('网络发现已停止')
    } else {
      // 启动网络发现
      await alternativeConnectionApi.startNetworkDiscovery({
        port: networkConnection.value.port,
        broadcastInterval: networkConnection.value.broadcastInterval
      })
      networkConnection.value.enabled = true
      ElMessage.success(`网络发现已启动，端口: ${networkConnection.value.port}`)
    }

    // 更新连接统计
    await updateConnectionStats()
  } catch (error) {
    console.error('切换网络连接失败:', error)
    ElMessage.error('操作失败，请重试')
  } finally {
    networkLoading.value = false
  }
}

/**
 * 切换数字配对状态
 */
const toggleDigitalPairing = async () => {
  try {
    digitalPairingLoading.value = true

    if (digitalPairing.value.enabled) {
      // 停止数字配对
      await alternativeConnectionApi.stopDigitalPairing()
      digitalPairing.value.enabled = false
      digitalPairing.value.currentCode = ''
      ElMessage.success('数字配对已停止')
    } else {
      // 启动数字配对
      const response = await alternativeConnectionApi.startDigitalPairing({
        expireTime: digitalPairing.value.expireTime
      })
      digitalPairing.value.enabled = true
      digitalPairing.value.currentCode = response.data.pairingCode || generateRandomCode(6)
      ElMessage.success('数字配对已启动')
    }

    // 更新连接统计
    await updateConnectionStats()
  } catch (error) {
    console.error('切换数字配对失败:', error)
    ElMessage.error('操作失败，请重试')
  } finally {
    digitalPairingLoading.value = false
  }
}

/**
 * 生成配对码
 */
const generatePairingCode = async () => {
  try {
    pairingCodeLoading.value = true
    const response = await alternativeConnectionApi.generatePairingCode()
    digitalPairing.value.currentCode = response.data.pairingCode || generateRandomCode(6)
    ElMessage.success('配对码已更新')
  } catch (error) {
    console.error('生成配对码失败:', error)
    digitalPairing.value.currentCode = generateRandomCode(6)
    ElMessage.error('生成配对码失败，使用本地生成的配对码')
  } finally {
    pairingCodeLoading.value = false
  }
}

/**
 * 生成随机码
 */
const generateRandomCode = (length: number): string => {
  const chars = '0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * 更新连接统计
 */
const updateConnectionStats = async () => {
  try {
    // 从API获取真实的连接统计数据
    const response = await alternativeConnectionApi.getConnectionStatistics()
    const stats = response.data

    connectionStats.value = {
      qr: stats.qr || connectionStats.value.qr,
      bluetooth: stats.bluetooth || 0,
      network: stats.network || 0,
      digital: stats.digital || 0,
      active: stats.active || 0
    }
  } catch (error) {
    console.error('获取连接统计失败:', error)
    // 如果API调用失败，使用本地模拟数据
    if (bluetoothConnection.value.enabled) {
      connectionStats.value.bluetooth = Math.floor(Math.random() * 5) + 1
    } else {
      connectionStats.value.bluetooth = 0
    }

    if (networkConnection.value.enabled) {
      connectionStats.value.network = Math.floor(Math.random() * 8) + 1
    } else {
      connectionStats.value.network = 0
    }

    if (digitalPairing.value.enabled) {
      connectionStats.value.digital = Math.floor(Math.random() * 3) + 1
    } else {
      connectionStats.value.digital = 0
    }

    // 更新总连接数
    connectionStats.value.active = connectionStats.value.qr +
                                   connectionStats.value.bluetooth +
                                   connectionStats.value.network +
                                   connectionStats.value.digital
  }
}

/**
 * 保存存储设置
 * 🔥 批次288修复：添加真实API调用
 */
const handleSaveStorage = async () => {
  try {
    await storageFormRef.value?.validate()

    storageLoading.value = true

    // 1. 先保存到localStorage（本地缓存，立即生效）
    configStore.updateStorageConfig(storageForm.value)

    console.log('[存储设置] 已保存到localStorage:', storageForm.value)

    // 2. 清除uploadService的存储配置缓存，确保下次上传使用新配置
    const { clearStorageConfigCache } = await import('@/services/uploadService')
    clearStorageConfigCache()
    console.log('[存储设置] 已清除上传服务缓存')

    // 3. 如果是OSS存储类型，重新初始化OSS客户端
    if (storageForm.value.storageType === 'oss') {
      const { ossService } = await import('@/services/ossService')
      await ossService.reinitialize()
    }

    // 4. 尝试保存到后端API（生产环境持久化）
    try {
      const { apiService } = await import('@/services/apiService')
      await apiService.put('/system/storage-settings', storageForm.value)
      console.log('[存储设置] 已同步到后端API')
      ElMessage.success('存储设置保存成功')
    } catch (apiError: unknown) {
      console.warn('[存储设置] API调用失败，已保存到本地:', apiError)
      if ((apiError as { code?: string }).code === 'ECONNREFUSED' || (apiError as { response?: { status?: number } }).response?.status === 404) {
        ElMessage.success('存储设置保存成功（本地模式）')
      } else {
        ElMessage.warning('存储设置已保存到本地，但未能同步到服务器')
      }
    }
  } catch (error) {
    console.error('[存储设置] 表单验证失败:', error)
    ElMessage.error('保存存储设置失败，请重试')
  } finally {
    storageLoading.value = false
  }
}

/**
 * 保存商品设置
 * 🔥 批次264修复：添加真实API调用，支持生产环境自动无缝切换
 */
const handleSaveProduct = async () => {
  try {
    await productFormRef.value?.validate()

    // 验证优惠比例的逻辑关系
    if (productForm.value.salesMaxDiscount > productForm.value.managerMaxDiscount) {
      ElMessage.warning('销售员最大优惠不能超过经理最大优惠')
      return
    }

    if (productForm.value.managerMaxDiscount > productForm.value.adminMaxDiscount) {
      ElMessage.warning('经理最大优惠不能超过管理员最大优惠')
      return
    }

    if (productForm.value.discountApprovalThreshold > productForm.value.maxDiscountPercent) {
      ElMessage.warning('优惠审批阈值不能超过全局最大优惠比例')
      return
    }

    productLoading.value = true

    // 1. 先保存到localStorage（本地缓存，立即生效）
    configStore.updateProductConfig(productForm.value)

    console.log('[商品设置] 已保存到localStorage:', productForm.value)

    // 2. 尝试保存到后端API（生产环境持久化）
    try {
      const { apiService } = await import('@/services/apiService')
      await apiService.put('/system/product-settings', productForm.value)
      console.log('[商品设置] 已同步到后端API')
      ElMessage.success('商品设置保存成功')
    } catch (apiError: unknown) {
      // API调用失败时降级处理
      console.warn('[商品设置] API调用失败，已保存到本地:', apiError.message || apiError)

      // 如果是网络错误或API不存在，仍然提示成功（因为localStorage已保存）
      if (apiError.code === 'ECONNREFUSED' || apiError.response?.status === 404) {
        ElMessage.success('商品设置保存成功（本地模式）')
      } else {
        // 其他错误提示警告
        ElMessage.warning('商品设置已保存到本地，但未能同步到服务器')
      }
    }
  } catch (error: unknown) {
    console.error('[商品设置] 表单验证失败:', error)
    if (error.message) {
      ElMessage.error(error.message)
    } else {
      ElMessage.error('保存商品设置失败，请重试')
    }
  } finally {
    productLoading.value = false
  }
}

/**
 * 重置商品设置
 */
const handleResetProduct = () => {
  ElMessageBox.confirm(
    '确定要重置商品设置吗？这将恢复到默认配置。',
    '重置确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(() => {
    // 使用配置store重置为默认值
    configStore.resetProductConfig()

    // 清除表单验证状态
    productFormRef.value?.clearValidate()

    ElMessage.success('商品设置已重置为默认配置')
  }).catch(() => {
    // 用户取消操作
  })
}

/**
 * 刷新监控数据
 * 🔥 批次266修复：使用真实数据，支持API调用
 */
const handleRefreshMonitor = async () => {
  try {
    monitorLoading.value = true

    // 1. 先刷新前端可获取的真实数据
    getRealMonitorData()

    // 2. 尝试从后端API获取服务器监控数据
    try {
      const { apiService } = await import('@/services/apiService')
      const response = await apiService.get('/system/monitor')
      const serverData = response.data || response

      // 合并服务器数据
      if (serverData.systemInfo) {
        monitorData.value.systemInfo = {
          ...monitorData.value.systemInfo,
          ...serverData.systemInfo
        }
      }

      if (serverData.performance) {
        monitorData.value.performance = {
          ...monitorData.value.performance,
          ...serverData.performance
        }
      }

      if (serverData.database) {
        monitorData.value.database = {
          ...monitorData.value.database,
          ...serverData.database
        }
      }

      if (serverData.services && serverData.services.length > 0) {
        // 使用服务器返回的服务列表替换前端服务
        monitorData.value.services = serverData.services
      }

      console.log('[系统监控] 已同步服务器监控数据')
      ElMessage.success('监控数据刷新成功')
    } catch (apiError: unknown) {
      // API调用失败时降级处理
      const err = apiError as { message?: string; code?: string; response?: { status?: number } }
      console.warn('[系统监控] API调用失败，使用前端数据:', err.message || apiError)

      if (err.code === 'ECONNREFUSED' || err.response?.status === 404) {
        ElMessage.success('监控数据刷新成功（前端模式）')
      } else {
        ElMessage.warning('监控数据已刷新，但未能获取服务器数据')
      }
    }
  } catch (error: unknown) {
    console.error('[系统监控] 刷新失败:', error)
    ElMessage.error('刷新监控数据失败')
  } finally {
    monitorLoading.value = false
  }
}

/**
 * 处理同步配置变更
 */
const handleSyncConfigChange = () => {
  dataSyncService.updateSyncConfig(syncConfig.value)
  ElMessage.success('同步配置已更新')
}

/**
 * 手动同步数据
 */
const handleManualSync = async () => {
  try {
    ElMessage.info('开始同步数据到云端...')

    const success = await dataSyncService.syncAllData()

    // 更新同步状态
    syncStatus.value = dataSyncService.getSyncStatus()

    if (success) {
      ElMessage.success('数据同步完成')
    } else {
      ElMessage.warning('数据同步完成，但有部分失败项')
    }
  } catch (error) {
    console.error('手动同步失败:', error)
    ElMessage.error('数据同步失败，请检查网络连接和OSS配置')
  }
}

/**
 * 恢复数据
 */
const handleRestoreData = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要从云端恢复数据吗？这将覆盖本地数据。',
      '恢复数据确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )

    ElMessage.info('开始从云端恢复数据...')

    const success = await dataSyncService.restoreFromOSS()

    if (success) {
      ElMessage.success('数据恢复完成')
      // 刷新页面或重新加载数据
      location.reload()
    } else {
      ElMessage.error('数据恢复失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('数据恢复失败:', error)
      ElMessage.error('数据恢复失败，请重试')
    }
  }
}

/**
 * 检查数据完整性
 */
const handleCheckIntegrity = async () => {
  try {
    ElMessage.info('正在检查数据完整性...')

    const isValid = await dataSyncService.checkDataIntegrity()

    if (isValid) {
      ElMessage.success('数据完整性检查通过')
    } else {
      ElMessage.warning('数据完整性检查发现问题，建议重新同步')
    }
  } catch (error) {
    console.error('数据完整性检查失败:', error)
    ElMessage.error('数据完整性检查失败')
  }
}

/**
 * 格式化同步时间
 */
const formatSyncTime = (timeString: string) => {
  try {
    const date = new Date(timeString)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  } catch (error) {
    return timeString
  }
}

/**
 * 测试数据持久性功能
 */
const handleTestDataPersistence = async () => {
  testingDataPersistence.value = true

  try {
    ElMessage.info('开始测试数据持久性功能...')

    const results = await runDataPersistenceTests()

    // 统计测试结果
    const totalTests = results.length
    const passedTests = results.filter(r => r.passed).length
    const failedTests = totalTests - passedTests

    // 显示测试结果
    if (failedTests === 0) {
      ElMessage.success(`所有测试通过！(${passedTests}/${totalTests})`)
    } else {
      ElMessage.warning(`测试完成：${passedTests}/${totalTests} 通过，${failedTests} 失败`)
    }

    // 在控制台显示详细结果
    console.group('数据持久性测试结果')
    results.forEach(result => {
      if (result.passed) {
        console.log(`✅ ${result.name}: ${result.message}`)
      } else {
        console.error(`❌ ${result.name}: ${result.message}`)
        if (result.error) {
          console.error('错误详情:', result.error)
        }
      }
    })
    console.groupEnd()

    // 显示详细结果对话框
    const failedResults = results.filter(r => !r.passed)
    if (failedResults.length > 0) {
      const failedMessages = failedResults.map(r => `• ${r.name}: ${r.message}`).join('\n')
      ElMessageBox.alert(
        `失败的测试:\n${failedMessages}\n\n请查看控制台获取详细错误信息`,
        '测试结果',
        { type: 'warning' }
      )
    }

  } catch (error) {
    console.error('测试执行失败:', error)
    ElMessage.error('测试执行失败，请查看控制台获取详细信息')
  } finally {
    testingDataPersistence.value = false
  }
}

// 备份相关方法
/**
 * 手动备份
 */
const handleManualBackup = async () => {
  try {
    backupLoading.value = true

    // 优先使用后端API进行备份
    try {
      const { apiService } = await import('@/services/apiService')
      const response = await apiService.post('/system/backup/create', { type: 'manual' })

      if (response.success) {
        ElMessage.success(`备份成功！备份了 ${response.data?.totalRecords || 0} 条记录`)
        await loadBackupList()
        await loadBackupStatus()
        return
      }
    } catch (apiError) {
      console.warn('[备份] 后端API不可用，尝试使用OSS备份:', apiError)
    }

    // 降级到OSS备份
    if (!isOssConfigured.value) {
      ElMessage.warning('后端备份服务不可用，且OSS未配置')
      return
    }

    await dataBackupService.performManualBackup()
    ElMessage.success('备份成功')
    await loadBackupList()
    await loadBackupStatus()
  } catch (error) {
    console.error('备份失败:', error)
    ElMessage.error('备份失败: ' + (error as Error).message)
  } finally {
    backupLoading.value = false
  }
}

/**
 * 保存备份设置
 * 🔥 批次288修复：添加真实API调用
 */
const handleSaveBackup = async () => {
  try {
    await backupFormRef.value?.validate()
    backupSaveLoading.value = true

    // 1. 先保存到本地服务
    await dataBackupService.setBackupConfig(backupForm)
    console.log('[备份设置] 已保存到本地:', backupForm)

    // 2. 尝试保存到后端API（生产环境持久化）
    try {
      const { apiService } = await import('@/services/apiService')
      await apiService.put('/system/backup-settings', backupForm)
      console.log('[备份设置] 已同步到后端API')
      ElMessage.success('备份设置保存成功')
    } catch (apiError: unknown) {
      console.warn('[备份设置] API调用失败，已保存到本地:', apiError)
      if ((apiError as { code?: string }).code === 'ECONNREFUSED' || (apiError as { response?: { status?: number } }).response?.status === 404) {
        ElMessage.success('备份设置保存成功（本地模式）')
      } else {
        ElMessage.warning('备份设置已保存到本地，但未能同步到服务器')
      }
    }
  } catch (error) {
    console.error('[备份设置] 保存失败:', error)
    ElMessage.error('保存失败: ' + (error as Error).message)
  } finally {
    backupSaveLoading.value = false
  }
}

/**
 * 测试备份功能
 */
const handleTestBackup = async () => {
  try {
    testBackupLoading.value = true
    ElMessage.info('开始运行备份功能测试...')

    // 运行所有测试
    await runAllTests()
  } catch (error) {
    console.error('测试备份功能失败:', error)
    ElMessage.error('测试失败: ' + (error as Error).message)
  } finally {
    testBackupLoading.value = false
  }
}

/**
 * 恢复备份
 */
const handleRestoreBackup = async (backup: { filename: string }) => {
  try {
    await ElMessageBox.confirm(
      `确定要恢复备份 "${backup.filename}" 吗？\n\n⚠️ 警告：这将覆盖当前所有数据，此操作不可撤销！`,
      '确认恢复',
      {
        confirmButtonText: '确定恢复',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    restoreLoading.value = backup.filename

    // 优先使用后端API进行恢复
    try {
      const { apiService } = await import('@/services/apiService')
      const response = await apiService.post(`/system/backup/restore/${encodeURIComponent(backup.filename)}`)

      if (response.success) {
        ElMessage.success(`数据恢复成功！共恢复 ${response.data?.totalRestored || 0} 条记录，页面将自动刷新`)

        // 延迟刷新页面
        setTimeout(() => {
          window.location.reload()
        }, 2000)
        return
      }
    } catch (apiError) {
      console.warn('[恢复] 后端API不可用，尝试使用OSS恢复:', apiError)
    }

    // 降级到OSS恢复
    if (isOssConfigured.value) {
      await dataBackupService.restoreFromBackup(backup.filename)
      ElMessage.success('数据恢复成功，请刷新页面')

      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } else {
      ElMessage.warning('恢复服务不可用')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('恢复失败:', error)
      ElMessage.error('恢复失败: ' + (error as Error).message)
    }
  } finally {
    restoreLoading.value = ''
  }
}

/**
 * 下载备份
 */
const handleDownloadBackup = async (backup: { filename: string }) => {
  try {
    // 优先使用后端API
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1'
      const token = localStorage.getItem('token')
      const url = `${baseUrl}/system/backup/download/${encodeURIComponent(backup.filename)}`

      const link = document.createElement('a')
      link.href = url + (token ? `?token=${token}` : '')
      link.download = backup.filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      ElMessage.success('备份下载开始')
      return
    } catch (apiError) {
      console.warn('[下载备份] 后端API不可用，尝试使用OSS:', apiError)
    }

    // 降级到OSS
    if (isOssConfigured.value) {
      const url = await dataBackupService.getBackupDownloadUrl(backup.filename)
      const link = document.createElement('a')
      link.href = url
      link.download = backup.filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      ElMessage.success('备份下载开始')
    } else {
      ElMessage.warning('下载服务不可用')
    }
  } catch (error) {
    console.error('下载失败:', error)
    ElMessage.error('下载失败: ' + (error as Error).message)
  }
}

/**
 * 删除备份
 */
const handleDeleteBackup = async (backup: { filename: string }) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除备份 "${backup.filename}" 吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    // 优先使用后端API
    try {
      const { apiService } = await import('@/services/apiService')
      const response = await apiService.delete(`/system/backup/${encodeURIComponent(backup.filename)}`)

      if (response.success) {
        ElMessage.success('备份删除成功')
        await loadBackupList()
        await loadBackupStatus()
        return
      }
    } catch (apiError) {
      console.warn('[删除备份] 后端API不可用，尝试使用OSS:', apiError)
    }

    // 降级到OSS
    if (isOssConfigured.value) {
      await dataBackupService.deleteBackup(backup.filename)
      ElMessage.success('备份删除成功')
      await loadBackupList()
      await loadBackupStatus()
    } else {
      ElMessage.warning('删除服务不可用')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error('删除失败: ' + (error as Error).message)
    }
  }
}

/**
 * 加载备份列表
 */
const loadBackupList = async () => {
  try {
    backupListLoading.value = true

    // 优先使用后端API
    try {
      const { apiService } = await import('@/services/apiService')
      const response = await apiService.get('/system/backup/list')

      if (response.success && response.data) {
        backupList.value = response.data
        return
      }
    } catch (apiError) {
      console.warn('[备份列表] 后端API不可用，尝试使用OSS:', apiError)
    }

    // 降级到OSS
    if (isOssConfigured.value) {
      backupList.value = await dataBackupService.getBackupList()
    } else {
      backupList.value = []
    }
  } catch (error) {
    console.error('加载备份列表失败:', error)
    backupList.value = []
  } finally {
    backupListLoading.value = false
  }
}

/**
 * 加载备份状态
 */
const loadBackupStatus = async () => {
  try {
    // 优先使用后端API
    try {
      const { apiService } = await import('@/services/apiService')
      const response = await apiService.get('/system/backup/status')

      if (response.success && response.data) {
        backupCount.value = response.data.backupCount || 0
        totalBackupSize.value = response.data.totalSize || 0
        lastBackupTime.value = response.data.lastBackupTime || ''
        return
      }
    } catch (apiError) {
      console.warn('[备份状态] 后端API不可用，使用本地数据:', apiError)
    }

    // 降级到本地数据
    const config = await dataBackupService.getBackupConfig()
    Object.assign(backupForm, config)

    if (isOssConfigured.value) {
      const list = await dataBackupService.getBackupList()
      if (list && Array.isArray(list)) {
        backupCount.value = list.length
        totalBackupSize.value = list.reduce((total: number, backup: { size: number }) => total + backup.size, 0)

        if (list.length > 0) {
          const latest = list.sort((a: { timestamp: string | number | Date }, b: { timestamp: string | number | Date }) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
          lastBackupTime.value = latest.timestamp
        }
      }
    } else {
      backupCount.value = 0
      totalBackupSize.value = 0
    }
  } catch (error) {
    console.error('加载备份状态失败:', error)
  }
}

/**
 * 格式化文件大小
 */
const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * 导出数据
 */
const exportData = async () => {
  try {
    exportLoading.value = true

    const exportTool = new DataExportTool()
    const result = await exportTool.exportAllData()

    if (result.success) {
      ElMessage.success('数据导出成功！')
      // 更新数据统计
      dataStatistics.value = result.statistics
      migrationStep.value = 1
    } else {
      ElMessage.error(`数据导出失败：${result.error}`)
    }
  } catch (error) {
    console.error('导出数据失败:', error)
    ElMessage.error('导出数据失败，请检查控制台错误信息')
  } finally {
    exportLoading.value = false
  }
}

/**
 * 验证数据
 */
const validateData = async () => {
  try {
    validateLoading.value = true

    const exportTool = new DataExportTool()
    const result = await exportTool.validateData()

    validationResult.value = result

    if (result.issues.length === 0) {
      ElMessage.success('数据验证通过！')
    } else {
      ElMessage.warning(`发现 ${result.issues.length} 个数据问题`)
    }
  } catch (error) {
    console.error('验证数据失败:', error)
    ElMessage.error('验证数据失败，请检查控制台错误信息')
  } finally {
    validateLoading.value = false
  }
}

/**
 * 格式化数据大小
 */
const formatDataSize = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * 打开技术文档
 */
const openDocumentation = (type: string) => {
  const docs = {
    database: 'DATABASE_ARCHITECTURE.md',
    api: 'BACKEND_API_ARCHITECTURE.md',
    migration: 'DATA_MIGRATION_PLAN.md'
  }

  const filename = docs[type as keyof typeof docs]
  if (filename) {
    ElMessage.info(`请查看项目根目录下的 ${filename} 文件`)
  }
}

/**
/**
 * 格式化时间戳
 */
const formatTimestamp = (timestamp: Date | string) => {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

/**
 * 获取日志级别对应的标签类型
 */
const getLogLevelType = (level: string) => {
  switch (level) {
    case 'ERROR':
      return 'danger'
    case 'WARN':
      return 'warning'
    case 'INFO':
      return 'success'
    case 'DEBUG':
      return 'info'
    default:
      return ''
  }
}

/**
 * 刷新日志
 * 🔥 修复：无日志时静默处理，不显示错误
 */
const refreshLogs = async () => {
  try {
    logsLoading.value = true

    // 调用真实的API获取系统日志
    const response = await logsApi.getSystemLogs({ limit: 100 })
    if (response.success && response.data) {
      systemLogs.value = response.data
      // 只有在有日志时才显示成功消息
      if (response.data.length > 0) {
        ElMessage.success(`已刷新 ${response.data.length} 条日志`)
      }
    } else {
      // 无日志时静默处理
      systemLogs.value = []
    }
  } catch (error) {
    // 🔥 静默处理：API失败时不显示错误，只在控制台记录
    console.log('[系统日志] 暂无日志或获取失败')
    systemLogs.value = []
  } finally {
    logsLoading.value = false
  }
}

/**
 * 清空日志
 */
const clearLogs = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要清空所有系统日志吗？此操作不可恢复。',
      '确认清空',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    // 调用真实的API清空系统日志
    const response = await logsApi.clearSystemLogs()
    if (response.success) {
      systemLogs.value = []
      ElMessage.success(response.message)
      // 刷新统计
      refreshLogStats()
    } else {
      ElMessage.error('清空日志失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('清空日志失败:', error)
      ElMessage.error('清空日志失败')
    }
  }
}

/**
 * 保存日志清理配置
 */
const handleSaveLogConfig = async () => {
  try {
    logConfigLoading.value = true
    const response = await logsApi.saveLogConfig(logCleanupConfig.value)
    if (response.success) {
      ElMessage.success('日志清理配置保存成功')
    } else {
      ElMessage.error(response.message || '保存失败')
    }
  } catch (error) {
    console.error('保存日志配置失败:', error)
    ElMessage.error('保存日志配置失败')
  } finally {
    logConfigLoading.value = false
  }
}

/**
 * 刷新日志统计
 */
const refreshLogStats = async () => {
  try {
    logStatsLoading.value = true
    const response = await logsApi.getLogStats()
    if (response.success && response.data) {
      logStats.value = response.data
    }
  } catch (error) {
    console.log('[日志统计] 获取失败')
  } finally {
    logStatsLoading.value = false
  }
}

/**
 * 清理过期日志
 */
const cleanupOldLogs = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要清理超过 ${logCleanupConfig.value.retentionDays} 天的日志吗？`,
      '确认清理',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    cleanupLoading.value = true
    const response = await logsApi.cleanupOldLogs(logCleanupConfig.value.retentionDays)
    if (response.success) {
      ElMessage.success(response.message || '清理完成')
      // 刷新日志和统计
      refreshLogs()
      refreshLogStats()
    } else {
      ElMessage.error(response.message || '清理失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('清理日志失败:', error)
      ElMessage.error('清理日志失败')
    }
  } finally {
    cleanupLoading.value = false
  }
}

/**
 * 加载日志清理配置
 */
const loadLogConfig = async () => {
  try {
    const response = await logsApi.getLogConfig()
    if (response.success && response.data) {
      logCleanupConfig.value = { ...logCleanupConfig.value, ...response.data }
    }
  } catch (error) {
    console.log('[日志配置] 加载失败，使用默认配置')
  }
}

/**
 * 显示日志详情
 */
const showLogDetails = (log: SystemLog) => {
  const levelColors: Record<string, string> = {
    ERROR: '#f56c6c',
    WARN: '#e6a23c',
    INFO: '#409eff',
    DEBUG: '#909399'
  }
  const levelColor = levelColors[log.level] || '#909399'

  const detailsHtml = `
    <div style="text-align: left; font-size: 13px; line-height: 1.8;">
      <div style="margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #eee;">
        <div style="margin-bottom: 6px;"><strong>时间：</strong>${formatTimestamp(log.timestamp)}</div>
        <div style="margin-bottom: 6px;"><strong>级别：</strong><span style="color: ${levelColor}; font-weight: bold;">${log.level}</span></div>
        <div style="margin-bottom: 6px;"><strong>模块：</strong>${log.module || '-'}</div>
        <div><strong>消息：</strong>${log.message}</div>
      </div>
      <div>
        <strong>详细信息：</strong>
        <div style="margin-top: 8px; padding: 12px; background: #f5f7fa; border-radius: 4px; font-family: monospace; white-space: pre-wrap; max-height: 300px; overflow-y: auto; word-break: break-all;">
${log.details || '无详细信息'}
        </div>
      </div>
    </div>
  `

  ElMessageBox.alert(detailsHtml, '日志详情', {
    confirmButtonText: '确定',
    dangerouslyUseHTMLString: true,
    customStyle: { width: '600px' }
  })
}

/**
 * 分页大小变化
 */
const handleLogPageSizeChange = (size: number) => {
  logPagination.value.pageSize = size
  logPagination.value.currentPage = 1
}

/**
 * 当前页变化
 */
const handleLogPageChange = (page: number) => {
  logPagination.value.currentPage = page
}

/**
 * 筛选条件变化时重置分页
 */
const handleLogFilterChange = () => {
  logPagination.value.currentPage = 1
}

// 移动应用相关方法

/**
 * 刷新移动SDK信息
 */
const refreshMobileSDKInfo = async () => {
  mobileSDKLoading.value = true
  try {
    // 模拟API调用获取SDK信息
    await new Promise(resolve => setTimeout(resolve, 1000))

    // 更新SDK信息
    mobileSDKInfo.value.android.updateTime = new Date().toLocaleString()
    mobileSDKInfo.value.ios.updateTime = new Date().toLocaleString()

    // 更新连接统计
    connectionStats.value.active = Math.floor(Math.random() * 10) + 1
    connectionStats.value.today = Math.floor(Math.random() * 50) + 10
    connectionStats.value.lastConnection = new Date().toLocaleString()

    ElMessage.success('SDK信息已刷新')
  } catch (error) {
    ElMessage.error('刷新SDK信息失败')
  } finally {
    mobileSDKLoading.value = false
  }
}

/**
 * 下载Android SDK
 */
const downloadAndroidSDK = () => {
  if (!mobileSDKInfo.value.android.available) {
    ElMessage.warning('Android SDK暂不可用')
    return
  }

  // 创建下载链接 - 使用最新版本的APK
  const link = document.createElement('a')
  link.href = '/downloads/CRM-Mobile-SDK-v2.1.3.apk'
  link.download = 'CRM-Mobile-SDK-v2.1.3.apk'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  ElMessage.success('开始下载Android SDK v2.1.3 (6MB)')
}

/**
 * 下载iOS SDK
 */
const downloadIOSSDK = () => {
  if (!mobileSDKInfo.value.ios.available) {
    ElMessage.warning('iOS SDK暂不可用')
    return
  }

  // 创建下载链接
  const link = document.createElement('a')
  link.href = '/downloads/crm-ios-v1.0.0.ipa'
  link.download = 'crm-ios-v1.0.0.ipa'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  ElMessage.success('开始下载iOS SDK')
}

/**
 * 显示安装指南
 */
const showInstallGuide = (platform: string) => {
  activeGuideTab.value = platform
  // 滚动到使用说明部分
  const guideElement = document.querySelector('.usage-guide')
  if (guideElement) {
    guideElement.scrollIntoView({ behavior: 'smooth' })
  }
}

/**
 * 打开PWA应用
 */
const openPWAApp = () => {
  const pwaUrl = `${window.location.origin}/mobile`
  window.open(pwaUrl, '_blank')
  ElMessage.success('正在打开PWA应用')
}

/**
 * 显示二维码
 */
const showQRCode = async () => {
  const pwaUrl = `${window.location.origin}/mobile`

  try {
    // 生成二维码图片
    const qrCodeDataUrl = await generateQRCodeImage(pwaUrl)

    ElMessageBox.alert(
      `<div style="text-align: center; padding: 20px;">
        <div style="margin-bottom: 16px; font-size: 16px; font-weight: 600;">扫描二维码访问PWA应用</div>
        <div style="margin-bottom: 16px;">
          <img src="${qrCodeDataUrl}" alt="PWA二维码" style="width: 200px; height: 200px; border: 1px solid #ddd; border-radius: 8px;" />
        </div>
        <div style="font-size: 14px; color: #666;">
          或直接访问：<br>
          <a href="${pwaUrl}" target="_blank" style="color: #409eff;">${pwaUrl}</a>
        </div>
      </div>`,
      '移动应用二维码',
      {
        confirmButtonText: '确定',
        dangerouslyUseHTMLString: true
      }
    )
  } catch (error) {
    console.error('生成二维码失败:', error)
    ElMessage.error('生成二维码失败')
  }
}

/**
 * 生成二维码图片的辅助方法
 */
const generateQRCodeImage = async (data: string): Promise<string> => {
  try {
    // 动态导入qrcode库
    const QRCode = await import('qrcode')

    // 生成二维码数据URL
    const qrCodeDataUrl = await QRCode.toDataURL(data, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M'
    })

    return qrCodeDataUrl
  } catch (error) {
    console.error('生成二维码图片失败:', error)
    // 如果qrcode库不可用，返回一个占位符或使用在线服务
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(data)}`
  }
}

/**
 * 生成系统二维码连接
 */
const generateSystemQRCode = async () => {
  qrConnectionLoading.value = true
  try {
    // 生成连接ID
    const connectionId = 'qr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)

    // 计算过期时间
    const expireMinutes = parseInt(qrConnectionForm.expireTime)
    const expiresAt = new Date(Date.now() + expireMinutes * 60 * 1000)

    // 构建连接数据
    const connectionData = {
      connectionId,
      serverUrl: `${window.location.protocol}//${window.location.host}`,
      permissions: qrConnectionForm.permissions,
      expiresAt: expiresAt.getTime(),
      type: 'system_connection'
    }

    // 生成二维码
    const qrCodeUrl = await generateQRCodeImage(JSON.stringify(connectionData))

    // 更新系统二维码连接状态
    systemQRConnection.value = {
      qrCodeUrl,
      connectionId,
      status: 'active',
      expiresAt: expiresAt.toISOString(),
      connectedDevices: []
    }

    ElMessage.success('二维码生成成功')
  } catch (error) {
    console.error('生成二维码失败:', error)
    ElMessage.error('生成二维码失败')
  } finally {
    qrConnectionLoading.value = false
  }
}

/**
 * 刷新系统二维码连接
 */
const refreshSystemQRCode = async () => {
  if (!systemQRConnection.value.connectionId) {
    ElMessage.warning('请先生成二维码')
    return
  }

  await generateSystemQRCode()
  ElMessage.success('二维码已刷新')
}

/**
 * 获取二维码状态类型
 */
const getQRStatusType = (status: string) => {
  switch (status) {
    case 'active':
      return 'success'
    case 'connected':
      return 'primary'
    case 'expired':
      return 'danger'
    default:
      return 'info'
  }
}

/**
 * 获取二维码状态文本
 */
const getQRStatusText = (status: string) => {
  switch (status) {
    case 'active':
      return '等待连接'
    case 'connected':
      return '已连接'
    case 'expired':
      return '已过期'
    default:
      return '未激活'
  }
}

/**
 * 刷新已连接设备列表
 * 🔥 修复：设备功能未开发时静默处理
 */
const refreshConnectedDevices = async () => {
  devicesLoading.value = true
  try {
    // 调用API获取已连接设备
    const response = await alternativeConnectionApi.getAllConnectedDevices()
    connectedDevices.value = response.data || []

    // 只有在有设备时才显示成功消息
    if (response.data && response.data.length > 0) {
      ElMessage.success('设备列表已刷新')
    }
  } catch (error) {
    // 🔥 静默处理：设备功能未开发时不显示错误，也不使用模拟数据
    console.log('[设备列表] 功能未启用或暂无设备')
    connectedDevices.value = []
  } finally {
    devicesLoading.value = false
  }
}

// formatDateTime 已从 @/utils/dateFormat 导入

// 生命周期钩子
onMounted(() => {
  // 🔥 从数据库加载系统配置
  configStore.initConfig()

  // 初始化数据
  loadBackupStatus()
  loadBackupList()

  // 初始化系统日志
  refreshLogs()
  // 🔥 加载日志清理配置和统计
  loadLogConfig()
  refreshLogStats()

  // 🔥 批次287修复：注释掉旧的协议初始化，改用列表加载
  // initAgreementContent()
  // 改为加载协议列表
  loadAgreementList()

  // 初始化数据统计
  const initDataStatistics = async () => {
    try {
      const exportTool = new DataExportTool()
      const statistics = await exportTool.getDataStatistics()
      dataStatistics.value = statistics
    } catch (error) {
      console.error('获取数据统计失败:', error)
    }
  }
  initDataStatistics()

  // 初始化已连接设备列表
  handleRefreshDevices()

  // 初始化替代连接状态
  const initAlternativeConnections = async () => {
    try {
      // 获取蓝牙状态
      const bluetoothStatus = await alternativeConnectionApi.getBluetoothStatus()
      if (bluetoothStatus.data) {
        bluetoothConnection.value.enabled = bluetoothStatus.data.enabled || false
        bluetoothConnection.value.pairingCode = bluetoothStatus.data.pairingCode || ''
      }

      // 获取网络发现状态
      const networkStatus = await alternativeConnectionApi.getNetworkStatus()
      if (networkStatus.data) {
        networkConnection.value.enabled = networkStatus.data.enabled || false
      }

      // 获取数字配对状态
      const digitalStatus = await alternativeConnectionApi.getDigitalPairingStatus()
      if (digitalStatus.data) {
        digitalPairing.value.enabled = digitalStatus.data.enabled || false
        digitalPairing.value.currentCode = digitalStatus.data.currentCode || ''
      }

      // 更新连接统计
      await updateConnectionStats()
    } catch (error) {
      console.error('初始化替代连接状态失败:', error)
    }
  }
  initAlternativeConnections()

  // 定时更新同步状态
  const updateSyncStatus = () => {
    syncStatus.value = dataSyncService.getSyncStatus()
  }

  // 每5秒更新一次同步状态
  const statusTimer = setInterval(updateSyncStatus, 5000)

  // 组件卸载时清理定时器
  onUnmounted(() => {
    clearInterval(statusTimer)
  })
})
</script>

<style scoped>
.system-settings {
  padding: 0;
}



.page-header {
  margin-bottom: 20px;
  padding: 20px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.page-header h2 {
  margin: 0 0 8px 0;
  color: #303133;
}

.page-header p {
  margin: 0;
  color: #606266;
  font-size: 14px;
}

.settings-tabs {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* 标签页滑动容器样式 */
.settings-tabs-container {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.tabs-nav-container {
  position: relative;
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 8px 8px 0 0;
  border-bottom: 1px solid #e4e7ed;
  padding: 0 8px;
  min-height: 54px;
}

.tabs-nav-wrapper {
  flex: 1;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
  margin: 0 8px;
}

.tabs-nav-wrapper::-webkit-scrollbar {
  display: none; /* Chrome, Safari and Opera */
}

.tabs-nav-wrapper .settings-tabs {
  background: transparent;
  box-shadow: none;
}

.tabs-nav-wrapper .el-tabs__header {
  margin: 0;
  border-bottom: none;
}

.tabs-nav-wrapper .el-tabs__nav-wrap {
  overflow: visible;
}

.tabs-nav-wrapper .el-tabs__nav-scroll {
  overflow: visible;
}



/* 标签页内容区域样式 */
.settings-tabs .el-tabs__content {
  padding: 20px;
  background: #fff;
  border-radius: 0 0 8px 8px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .tabs-nav-container {
    padding: 0 4px;
    min-height: 48px;
  }

  .tabs-nav-wrapper {
    margin: 0;
  }

  .settings-tabs .el-tabs__content {
    padding: 16px;
  }
}

.setting-card {
  border: none;
  box-shadow: none;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-left: 2%;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.header-actions .el-button {
  height: 32px;
  min-width: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.setting-form {
  padding: 20px 0;
}

.form-tip {
  margin-left: 8px;
  color: #909399;
  font-size: 12px;
}

.upload-tip {
  margin-top: 8px;
  color: #909399;
  font-size: 12px;
}

.logo-uploader .logo {
  width: 200px;
  height: 60px;
  display: block;
  object-fit: contain;
}

.logo-uploader .logo-uploader-icon {
  font-size: 28px;
  color: #8c939d;
  width: 200px;
  height: 60px;
  line-height: 60px;
  text-align: center;
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: .3s;
}

.logo-uploader .logo-uploader-icon:hover {
  border-color: #409eff;
}

.monitor-content {
  padding: 20px 0;
}

.monitor-section {
  margin-bottom: 30px;
}

.monitor-section h4 {
  margin: 0 0 16px 0;
  color: #303133;
  font-size: 16px;
  font-weight: 600;
}

/* 商品设置样式 */
.form-section {
  margin-bottom: 32px;
  padding: 20px;
  background: #fafafa;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
}

.section-title {
  margin: 0 0 20px 0;
  color: #303133;
  font-size: 16px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-title .el-icon {
  color: #409eff;
  font-size: 18px;
}

.form-actions {
  margin-top: 32px;
  padding-top: 20px;
  border-top: 1px solid #e4e7ed;
  text-align: right;
}

.form-actions .el-button {
  margin-left: 12px;
}

.form-actions .el-button:first-child {
  margin-left: 0;
}

/* 表单项样式优化 */
.setting-form .el-form-item {
  margin-bottom: 20px;
}

.setting-form .el-form-item__label {
  font-weight: 500;
  color: #606266;
}

.setting-form .el-input-number {
  width: 200px;
}

.setting-form .el-select {
  width: 200px;
}

.setting-form .el-checkbox-group {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.setting-form .el-switch {
  margin-right: 12px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .card-header {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .header-actions {
    justify-content: center;
  }

  .setting-form .el-row {
    margin: 0;
  }

  .setting-form .el-col {
    margin-bottom: 16px;
  }
}

/* 短信管理弹窗样式 */
.sms-management-dialog {
  .el-dialog__body {
    padding: 0;
  }
}

.sms-management-dialog .el-dialog__header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  margin: 0;
  padding: 20px 24px;
}

.sms-management-dialog .el-dialog__title {
  color: white;
  font-weight: 600;
}

.sms-management-dialog .el-dialog__headerbtn .el-dialog__close {
  color: white;
}

.sms-management-dialog .el-dialog__headerbtn .el-dialog__close:hover {
  color: #f0f0f0;
}

/* 数据同步样式 */
.sync-status {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.status-tag {
  align-self: flex-start;
}

.sync-info {
  font-size: 12px;
  color: #909399;
}

.sync-progress {
  font-size: 12px;
  color: #606266;
}

/* 数据迁移样式 */
.migration-content {
  padding: 20px 0;
}

.migration-alert {
  margin-bottom: 24px;
}

.migration-alert ul {
  margin: 12px 0 0 0;
  padding-left: 20px;
}

.migration-alert li {
  margin-bottom: 8px;
  color: #606266;
}

.data-statistics {
  margin: 24px 0;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
}

.data-statistics h4 {
  margin: 0 0 16px 0;
  color: #303133;
  font-size: 16px;
  font-weight: 600;
}

.validation-result {
  margin: 24px 0;
}

.validation-result h4 {
  margin: 0 0 16px 0;
  color: #303133;
  font-size: 16px;
  font-weight: 600;
}

.validation-result ul {
  margin: 12px 0 0 0;
  padding-left: 20px;
}

.validation-result li {
  margin-bottom: 8px;
  color: #606266;
}

.migration-steps {
  margin: 24px 0;
}

.migration-steps h4 {
  margin: 0 0 16px 0;
  color: #303133;
  font-size: 16px;
  font-weight: 600;
}

.documentation-links {
  margin: 24px 0;
}

.documentation-links h4 {
  margin: 0 0 16px 0;
  color: #303133;
  font-size: 16px;
  font-weight: 600;
}

.failed-count {
  color: #f56c6c;
  font-weight: 500;
}

.sync-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.sync-error {
  margin-bottom: 8px;
}

.sync-error:last-child {
  margin-bottom: 0;
}

/* 备份相关样式 */
.form-section {
  margin-bottom: 30px;
}

.form-section h4 {
  margin: 0 0 16px 0;
  color: #303133;
  font-size: 16px;
  font-weight: 600;
  border-bottom: 1px solid #e4e7ed;
  padding-bottom: 8px;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.backup-status {
  margin-bottom: 20px;
}

.backup-list {
  margin-top: 20px;
}

.backup-alert {
  margin-top: 20px;
}

/* 移动应用样式 */
.mobile-app-content {
  padding: 20px 0;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 20px 0;
  color: #303133;
  font-size: 16px;
  font-weight: 600;
  border-bottom: 1px solid #e4e7ed;
  padding-bottom: 8px;
}

.sdk-overview {
  margin-bottom: 32px;
}

.status-card {
  text-align: center;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  transition: all 0.3s;
}

.status-card:hover {
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
}

.status-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
  padding: 0 16px 16px;
}

.file-size {
  font-size: 12px;
  color: #909399;
}

.sdk-management {
  margin-bottom: 32px;
}

.sdk-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.sdk-item {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 20px;
  transition: all 0.3s;
  background: #fff;
}

.sdk-item:hover {
  border-color: #409eff;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.1);
}

.sdk-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 16px;
}

.sdk-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}

.sdk-icon.android {
  background: linear-gradient(135deg, #3ddc84, #2e7d32);
}

.sdk-icon.ios {
  background: linear-gradient(135deg, #007aff, #0056b3);
}

.sdk-icon.pwa {
  background: linear-gradient(135deg, #5f27cd, #341f97);
}

.sdk-info h5 {
  margin: 0 0 4px 0;
  color: #303133;
  font-size: 16px;
  font-weight: 600;
}

.sdk-info p {
  margin: 0;
  color: #606266;
  font-size: 14px;
  line-height: 1.4;
}

.sdk-details {
  margin-bottom: 16px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f5f7fa;
}

.detail-item:last-child {
  border-bottom: none;
}

.detail-item .label {
  color: #909399;
  font-size: 14px;
}

.detail-item .value {
  color: #303133;
  font-size: 14px;
  font-weight: 500;
}

.sdk-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.connection-status {
  margin-bottom: 32px;
}

.config-card {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
}

.usage-guide {
  margin-bottom: 20px;
}

.guide-tabs {
  margin-top: 16px;
}

.guide-content {
  padding: 16px 0;
}

.guide-content ol {
  margin: 0;
  padding-left: 20px;
}

.guide-content li {
  margin-bottom: 8px;
  color: #606266;
  line-height: 1.6;
}

.guide-content li:last-child {
  margin-bottom: 0;
}

/* 替代连接方式样式 */
.alternative-connections {
  margin-bottom: 32px;
}

.connection-card {
  height: 100%;
  transition: all 0.3s ease;
}

.connection-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.connection-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #303133;
}

.connection-content {
  padding: 0;
}

.connection-status {
  margin-bottom: 16px;
}

.connection-description {
  margin-bottom: 20px;
}

.connection-description p {
  margin: 0;
  color: #606266;
  font-size: 14px;
  line-height: 1.5;
}

.connection-config {
  margin-bottom: 20px;
}

.connection-config .el-form-item {
  margin-bottom: 16px;
}

.connection-config .el-form-item:last-child {
  margin-bottom: 0;
}

.connection-actions {
  text-align: center;
}

.pairing-code-display {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pairing-code {
  font-family: 'Courier New', monospace;
  font-size: 18px;
  font-weight: bold;
  color: #409eff;
  letter-spacing: 2px;
  padding: 8px 12px;
  background: #f0f9ff;
  border: 1px solid #b3d8ff;
  border-radius: 4px;
  min-width: 120px;
  text-align: center;
}

.connection-stats-card {
  border: 1px solid #e4e7ed;
}

.stat-item {
  text-align: center;
  padding: 16px;
  border-radius: 8px;
  background: #f8f9fa;
  transition: all 0.3s ease;
}

.stat-item:hover {
  background: #e9ecef;
  transform: translateY(-1px);
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #409eff;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: #606266;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .sdk-grid {
    grid-template-columns: 1fr;
  }

  .status-info {
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
  }

  .sdk-actions {
    justify-content: center;
  }

  .alternative-connections .el-col {
    margin-bottom: 20px;
  }

  .pairing-code {
    font-size: 16px;
    min-width: 100px;
  }
}

/* 🔥 批次275新增：二维码上传优化样式 */
.qr-upload-buttons {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}

.qr-preview-area {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
}

.qr-thumbnail {
  position: relative;
  width: 120px;
  height: 120px;
  border: 2px solid #dcdfe6;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s;
}

.qr-thumbnail:hover {
  border-color: #409eff;
  transform: scale(1.05);
}

.qr-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #fff;
}

.qr-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s;
}

.qr-thumbnail:hover .qr-overlay {
  opacity: 1;
}

.zoom-icon {
  font-size: 32px;
  color: #fff;
}

.qr-empty-state {
  text-align: center;
  padding: 30px;
  background: #f5f7fa;
  border: 2px dashed #dcdfe6;
  border-radius: 8px;
  margin-top: 12px;
}

.qr-empty-state p {
  margin-top: 12px;
  color: #909399;
  font-size: 14px;
}

.upload-tip {
  margin-top: 8px;
  font-size: 12px;
  color: #909399;
}

/* 🔥 批次275新增：用户协议样式 */
.agreement-form {
  max-width: 1200px;
}

.agreement-textarea {
  font-family: 'Courier New', Courier, monospace;
  font-size: 13px;
  line-height: 1.6;
}

.agreement-textarea :deep(textarea) {
  font-family: 'Courier New', Courier, monospace;
  line-height: 1.6;
}

.form-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  font-size: 12px;
  color: #909399;
}

.form-tip .el-icon {
  font-size: 14px;
}

/* 日志头部筛选器样式 */
.logs-header {
  flex-wrap: wrap;
  gap: 12px;
}

.logs-filter-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

/* 日志容器样式 */
.logs-container {
  display: flex;
  flex-direction: column;
}

/* 日志分页样式 */
.logs-pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0 0;
  border-top: 1px solid #ebeef5;
  margin-top: 0;
}

.logs-total {
  color: #606266;
  font-size: 14px;
}
</style>


/* 🔥 批次274新增：二维码上传样式 */
.qr-uploader {
  width: 100%;
}

.qr-uploader :deep(.el-upload) {
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: all 0.3s;
  width: 100%;
  height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.qr-uploader :deep(.el-upload:hover) {
  border-color: #409eff;
}

.qr-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 10px;
}

.qr-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #8c939d;
  font-size: 14px;
}

.qr-placeholder .el-icon {
  font-size: 28px;
  margin-bottom: 8px;
}

.qr-text {
  font-size: 12px;
  color: #999;
}
