<template>
  <div class="login-page">
    <!-- 背景装饰元素 -->
    <div class="bg-decorations">
      <div class="decoration-circle circle-1"></div>
      <div class="decoration-circle circle-2"></div>
      <div class="decoration-circle circle-3"></div>
      <div class="decoration-circle circle-4"></div>
    </div>

    <!-- 主容器 -->
    <div class="login-wrapper">
      <!-- 左侧展示区 -->
      <div class="showcase-section">
        <div class="showcase-content">
          <!-- 品牌Logo -->
          <div class="brand-logo">
            <span class="logo-text">Smart</span>
            <span class="logo-highlight">CRM</span>
          </div>

          <!-- 3D插画区域 -->
          <div class="illustration-container">
            <div class="illustration-wrapper">
              <!-- 主要插画 - 数据分析场景 -->
              <svg class="main-illustration" viewBox="0 0 500 400" fill="none">
                <!-- 背景圆弧 -->
                <ellipse cx="250" cy="350" rx="180" ry="30" fill="rgba(255,255,255,0.1)"/>

                <!-- 曲面屏幕 -->
                <path d="M80 100 Q250 60 420 100 L400 280 Q250 320 100 280 Z"
                      fill="url(#screenGradient)" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>

                <!-- 屏幕内容 - 数据图表 -->
                <rect x="120" y="130" width="80" height="60" rx="4" fill="rgba(255,255,255,0.15)"/>
                <rect x="130" y="145" width="60" height="8" rx="2" fill="#4ade80"/>
                <rect x="130" y="158" width="45" height="8" rx="2" fill="#60a5fa"/>
                <rect x="130" y="171" width="55" height="8" rx="2" fill="#f472b6"/>

                <!-- 饼图 -->
                <circle cx="280" cy="160" r="35" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.2)"/>
                <path d="M280 125 A35 35 0 0 1 315 160 L280 160 Z" fill="#4ade80"/>
                <path d="M315 160 A35 35 0 0 1 280 195 L280 160 Z" fill="#60a5fa"/>
                <path d="M280 195 A35 35 0 0 1 245 160 L280 160 Z" fill="#f472b6"/>

                <!-- 折线图 -->
                <rect x="330" y="130" width="60" height="60" rx="4" fill="rgba(255,255,255,0.15)"/>
                <polyline points="340,175 355,160 365,168 380,145" stroke="#4ade80" stroke-width="2" fill="none"/>

                <!-- 人物 - 坐在椅子上 -->
                <ellipse cx="250" cy="340" rx="60" ry="15" fill="rgba(0,0,0,0.1)"/>

                <!-- 椅子 -->
                <rect x="200" y="280" width="100" height="50" rx="10" fill="#6366f1"/>
                <rect x="190" y="260" width="120" height="30" rx="8" fill="#818cf8"/>

                <!-- 人物身体 -->
                <ellipse cx="250" cy="240" rx="25" ry="30" fill="#fbbf24"/>
                <circle cx="250" cy="200" r="20" fill="#fcd34d"/>
                <ellipse cx="250" cy="205" rx="15" ry="12" fill="#fef3c7"/>

                <!-- 头发 -->
                <path d="M230 195 Q250 175 270 195" stroke="#1e293b" stroke-width="8" fill="none" stroke-linecap="round"/>

                <!-- 手臂 -->
                <path d="M225 240 L180 260 L170 250" stroke="#fcd34d" stroke-width="12" fill="none" stroke-linecap="round"/>
                <path d="M275 240 L320 260 L340 250" stroke="#fcd34d" stroke-width="12" fill="none" stroke-linecap="round"/>

                <!-- 键盘 -->
                <rect x="160" y="245" width="40" height="20" rx="4" fill="#e2e8f0"/>
                <rect x="300" y="245" width="50" height="15" rx="3" fill="#e2e8f0"/>

                <!-- 装饰小元素 -->
                <rect x="60" y="150" width="15" height="15" rx="2" fill="#f472b6" opacity="0.8"/>
                <circle cx="430" cy="120" r="8" fill="#4ade80" opacity="0.8"/>
                <rect x="100" y="80" width="10" height="10" fill="#60a5fa" opacity="0.6" transform="rotate(45 105 85)"/>
                <circle cx="400" cy="200" r="5" fill="#fbbf24" opacity="0.8"/>

                <!-- 渐变定义 -->
                <defs>
                  <linearGradient id="screenGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="rgba(56, 189, 248, 0.3)"/>
                    <stop offset="50%" stop-color="rgba(99, 102, 241, 0.3)"/>
                    <stop offset="100%" stop-color="rgba(168, 85, 247, 0.3)"/>
                  </linearGradient>
                </defs>
              </svg>

              <!-- 浮动装饰元素 -->
              <div class="floating-element el-1">
                <svg width="40" height="40" viewBox="0 0 40 40">
                  <rect width="40" height="40" rx="8" fill="rgba(255,255,255,0.2)"/>
                  <path d="M12 20 L18 26 L28 14" stroke="#4ade80" stroke-width="3" fill="none" stroke-linecap="round"/>
                </svg>
              </div>
              <div class="floating-element el-2">
                <svg width="35" height="35" viewBox="0 0 35 35">
                  <circle cx="17.5" cy="17.5" r="17.5" fill="rgba(255,255,255,0.15)"/>
                  <path d="M10 17.5 H25 M17.5 10 V25" stroke="#60a5fa" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </div>
              <div class="floating-element el-3">
                <svg width="30" height="30" viewBox="0 0 30 30">
                  <rect width="30" height="30" rx="6" fill="rgba(244, 114, 182, 0.3)"/>
                  <circle cx="15" cy="15" r="6" fill="#f472b6"/>
                </svg>
              </div>
            </div>
          </div>

          <!-- 特性展示 -->
          <div class="features-list">
            <div class="feature-item">
              <div class="feature-icon">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 2L12.5 7.5L18 8.5L14 12.5L15 18L10 15L5 18L6 12.5L2 8.5L7.5 7.5L10 2Z" fill="#fbbf24"/>
                </svg>
              </div>
              <span>智能客户管理</span>
            </div>
            <div class="feature-item">
              <div class="feature-icon">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <rect x="2" y="4" width="16" height="12" rx="2" stroke="#4ade80" stroke-width="2"/>
                  <path d="M6 9L9 12L14 7" stroke="#4ade80" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </div>
              <span>订单全流程追踪</span>
            </div>
            <div class="feature-item">
              <div class="feature-icon">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M3 15L7 11L11 14L17 5" stroke="#60a5fa" stroke-width="2" stroke-linecap="round"/>
                  <circle cx="17" cy="5" r="2" fill="#60a5fa"/>
                </svg>
              </div>
              <span>数据分析洞察</span>
            </div>
          </div>
        </div>
      </div>


      <!-- 右侧登录区 -->
      <div class="login-section">
        <div class="login-card">
          <!-- Logo图标 -->
          <div class="card-logo">
            <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
              <rect width="52" height="52" rx="12" fill="url(#cardLogoGradient)"/>
              <path d="M15 26L22 33L37 17" stroke="white" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
              <defs>
                <linearGradient id="cardLogoGradient" x1="0" y1="0" x2="52" y2="52">
                  <stop offset="0%" stop-color="#6366f1"/>
                  <stop offset="100%" stop-color="#8b5cf6"/>
                </linearGradient>
              </defs>
            </svg>
          </div>

          <!-- 标题 -->
          <h1 class="card-title">智能销售管理系统</h1>
          <p class="card-subtitle">CRM CUSTOMER RELATIONSHIP MANAGEMENT</p>

          <!-- 登录表单 -->
          <el-form :model="loginForm" :rules="rules" ref="loginFormRef" class="login-form">
            <el-form-item prop="username">
              <el-input
                v-model="loginForm.username"
                placeholder="用户名"
                size="large"
                prefix-icon="User"
                clearable
              />
            </el-form-item>

            <el-form-item prop="password">
              <el-input
                v-model="loginForm.password"
                type="password"
                placeholder="密码"
                size="large"
                prefix-icon="Lock"
                show-password
                clearable
              />
            </el-form-item>

            <!-- 协议勾选 -->
            <el-form-item class="agreement-item">
              <el-checkbox v-model="agreeToTerms">
                <span class="agreement-text">
                  我已阅读并同意
                  <a href="javascript:void(0)" @click.stop="showAgreementDialog('user')">《用户协议》</a>
                  和
                  <a href="javascript:void(0)" @click.stop="showAgreementDialog('privacy')">《隐私政策》</a>
                </span>
              </el-checkbox>
            </el-form-item>

            <el-form-item>
              <el-button
                type="primary"
                size="large"
                class="login-button"
                :loading="loading"
                :disabled="!agreeToTerms"
                @click="handleLogin"
              >
                {{ loading ? '登录中...' : '登 录' }}
              </el-button>
            </el-form-item>
          </el-form>

          <!-- 底部版权 -->
          <div class="card-footer">
            <p>© 2025 智能销售管理系统</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 协议弹窗 -->
    <el-dialog
      v-model="agreementDialogVisible"
      :title="agreementDialogTitle"
      width="800px"
      :close-on-click-modal="false"
      class="agreement-dialog"
    >
      <div class="agreement-content" v-html="sanitizeHtml(agreementDialogContent)"></div>
      <template #footer>
        <el-button @click="agreementDialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="agreeAndClose">我已阅读并同意</el-button>
      </template>
    </el-dialog>
  </div>
</template>


<script setup lang="ts">
import { ref, reactive, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useConfigStore } from '@/stores/config'
import { ElMessage } from 'element-plus'
import type { FormInstance } from 'element-plus'
import { preloadAppData } from '@/services/appInitService'
import { sanitizeHtml } from '@/utils/sanitize'

const _router = useRouter()
const userStore = useUserStore()
const configStore = useConfigStore()

const loading = ref(false)
const loginFormRef = ref<FormInstance>()

const loginForm = reactive({
  username: '',
  password: ''
})

const agreeToTerms = ref(false)
const agreementDialogVisible = ref(false)
const agreementDialogTitle = ref('')
const agreementDialogContent = ref('')
const currentAgreementType = ref<'user' | 'privacy'>('user')

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6位', trigger: 'blur' }
  ]
}

const getDefaultUserAgreement = () => {
  return `<div style="line-height: 2.2; padding: 30px; font-size: 15px;">
<h2 style="color: #303133; border-bottom: 3px solid #6366f1; padding-bottom: 15px; margin-bottom: 30px; text-align: center; font-size: 26px; font-weight: 700;">用户使用协议</h2>
<p style="color: #606266; margin: 25px 0; font-size: 16px; line-height: 2.5; background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #6366f1;">
  <strong>欢迎使用本CRM客户管理系统</strong>（以下简称"本系统"）。在使用本系统之前，<strong style="color: #6366f1;">请您仔细阅读并充分理解本协议的全部内容</strong>。
</p>
<h3 style="color: #6366f1; margin-top: 45px; margin-bottom: 20px; font-size: 20px; font-weight: 600; padding-left: 15px; border-left: 5px solid #6366f1;">一、协议的接受</h3>
<p style="color: #606266; margin: 18px 0; padding-left: 15px;"><strong>1.1</strong> 本协议是您与本系统运营方之间关于使用本系统服务所订立的协议。</p>
<p style="color: #606266; margin: 18px 0; padding-left: 15px;"><strong>1.2</strong> 您点击<strong style="color: #6366f1;">"同意"</strong>按钮即表示您完全接受本协议的全部条款。</p>
<h3 style="color: #6366f1; margin-top: 45px; margin-bottom: 20px; font-size: 20px; font-weight: 600; padding-left: 15px; border-left: 5px solid #6366f1;">二、服务内容</h3>
<p style="color: #606266; margin: 18px 0; padding-left: 15px;"><strong>2.1</strong> 本系统为企业提供客户关系管理服务，包括但不限于：</p>
<ul style="color: #606266; padding-left: 50px; margin: 20px 0; line-height: 2.5;">
  <li style="margin: 12px 0;">✓ 客户信息管理</li>
  <li style="margin: 12px 0;">✓ 订单管理</li>
  <li style="margin: 12px 0;">✓ 业绩统计</li>
  <li style="margin: 12px 0;">✓ 数据分析</li>
  <li style="margin: 12px 0;">✓ 团队协作</li>
</ul>
<h3 style="color: #6366f1; margin-top: 45px; margin-bottom: 20px; font-size: 20px; font-weight: 600; padding-left: 15px; border-left: 5px solid #6366f1;">三、用户权利和义务</h3>
<p style="color: #606266; margin: 25px 0; padding-left: 15px;"><strong style="font-size: 17px; color: #333;">3.1 用户权利：</strong></p>
<ul style="color: #606266; padding-left: 50px; margin: 20px 0; line-height: 2.5;">
  <li style="margin: 12px 0;">✓ 使用本系统提供的各项功能</li>
  <li style="margin: 12px 0;">✓ 管理自己的客户数据</li>
  <li style="margin: 12px 0;">✓ 查看业绩统计报表</li>
  <li style="margin: 12px 0;">✓ 获得技术支持服务</li>
</ul>
<p style="color: #606266; margin: 25px 0; padding-left: 15px;"><strong style="font-size: 17px; color: #333;">3.2 用户义务：</strong></p>
<ul style="color: #606266; padding-left: 50px; margin: 20px 0; line-height: 2.5;">
  <li style="margin: 15px 0; padding: 15px; background: #fff3f3; border-left: 4px solid #f56c6c; border-radius: 4px;">
    <strong style="color: #f56c6c; font-size: 16px;">⚠️ 严禁将本系统用于任何违法犯罪活动</strong>
  </li>
  <li style="margin: 12px 0;">• 遵守国家法律法规和社会公德</li>
  <li style="margin: 12px 0;">• 妥善保管账号密码，对账号下的所有行为负责</li>
  <li style="margin: 12px 0;">• 不得恶意攻击、破坏系统</li>
</ul>
<h3 style="color: #6366f1; margin-top: 45px; margin-bottom: 20px; font-size: 20px; font-weight: 600; padding-left: 15px; border-left: 5px solid #6366f1;">四、免责声明</h3>
<p style="color: #f56c6c; font-weight: bold; margin: 25px 0; padding: 20px; background: #fff3f3; border-left: 5px solid #f56c6c; border-radius: 8px; font-size: 16px;">
  <strong>⚠️ 重要提示：</strong>本系统仅作为工具提供服务，<strong>不对用户使用本系统产生的内容、行为及后果承担任何责任</strong>。
</p>
<div style="margin-top: 50px; padding-top: 25px; border-top: 2px dashed #e0e0e0; text-align: center;">
  <p style="color: #909399; font-size: 13px; margin: 0;">最后更新日期：${new Date().toLocaleDateString('zh-CN')}</p>
</div>
</div>`
}


const getDefaultPrivacyPolicy = () => {
  return `<div style="line-height: 2; padding: 20px;">
<h2 style="color: #303133; border-bottom: 2px solid #6366f1; padding-bottom: 10px;">用户隐私协议</h2>
<p style="color: #606266; margin: 20px 0;">本隐私协议适用于本CRM客户管理系统。我们非常重视用户的隐私保护，特制定本协议。</p>
<h3 style="color: #6366f1; margin-top: 30px;">一、信息收集</h3>
<p style="color: #606266;"><strong>1.1 我们收集的信息类型：</strong></p>
<ul style="color: #606266; padding-left: 30px;">
  <li><strong>账号信息：</strong>用户名、密码、邮箱、手机号</li>
  <li><strong>个人信息：</strong>姓名、部门、职位、头像</li>
  <li><strong>业务信息：</strong>客户数据、订单信息、业绩数据</li>
  <li><strong>使用信息：</strong>登录日志、操作记录、访问时间</li>
</ul>
<h3 style="color: #6366f1; margin-top: 30px;">二、信息使用</h3>
<p style="color: #606266;"><strong>2.1 我们使用收集的信息用于：</strong></p>
<ul style="color: #606266; padding-left: 30px;">
  <li>提供系统服务和功能</li>
  <li>改进用户体验</li>
  <li>数据统计和分析</li>
  <li>安全监控和风险防范</li>
</ul>
<h3 style="color: #6366f1; margin-top: 30px;">三、信息保护</h3>
<p style="color: #606266;"><strong>3.1 安全措施：</strong></p>
<ul style="color: #606266; padding-left: 30px;">
  <li>数据加密传输（HTTPS）</li>
  <li>密码加密存储</li>
  <li>访问权限控制</li>
  <li>定期安全审计</li>
</ul>
<h3 style="color: #6366f1; margin-top: 30px;">四、用户权利</h3>
<p style="color: #606266;"><strong>4.1 您享有以下权利：</strong></p>
<ul style="color: #606266; padding-left: 30px;">
  <li>访问您的个人信息</li>
  <li>更正不准确的信息</li>
  <li>删除您的个人信息</li>
  <li>注销您的账号</li>
</ul>
<h3 style="color: #6366f1; margin-top: 30px;">五、联系我们</h3>
<p style="color: #606266;">如您对本隐私协议有任何疑问，请通过系统客服联系我们。</p>
<p style="color: #909399; margin-top: 30px; font-size: 12px;">最后更新日期：${new Date().toLocaleDateString('zh-CN')}</p>
</div>`
}

const showAgreementDialog = (type: 'user' | 'privacy') => {
  currentAgreementType.value = type
  const agreementList = JSON.parse(localStorage.getItem('crm_agreement_list') || '[]')

  if (type === 'user') {
    agreementDialogTitle.value = '用户使用协议'
    const userAgreement = agreementList.find((item: any) => item.type === 'user')
    agreementDialogContent.value = userAgreement?.content || configStore.systemConfig.userAgreement || getDefaultUserAgreement()
  } else {
    agreementDialogTitle.value = '用户隐私协议'
    const privacyAgreement = agreementList.find((item: any) => item.type === 'privacy')
    agreementDialogContent.value = privacyAgreement?.content || configStore.systemConfig.privacyPolicy || getDefaultPrivacyPolicy()
  }
  agreementDialogVisible.value = true
}

const agreeAndClose = () => {
  agreeToTerms.value = true
  agreementDialogVisible.value = false
  ElMessage.success('感谢您同意我们的协议')
}

configStore.initConfig()
const agreedBefore = localStorage.getItem('user_agreed_terms')
if (agreedBefore === 'true') {
  agreeToTerms.value = true
}

let loginDebounceTimer: NodeJS.Timeout | null = null

const handleLogin = async () => {
  if (!agreeToTerms.value) {
    ElMessage.warning('请先阅读并同意《用户使用协议》和《用户隐私协议》')
    return
  }
  if (!loginFormRef.value) return
  if (loginDebounceTimer) clearTimeout(loginDebounceTimer)
  if (loading.value) {
    ElMessage.warning('正在登录中，请稍候...')
    return
  }

  await loginFormRef.value.validate(async (valid) => {
    if (valid) {
      loading.value = true
      try {
        const result = await userStore.loginWithRetry(loginForm.username, loginForm.password, false, 3)
        if (result) {
          localStorage.setItem('user_agreed_terms', 'true')
          ElMessage.success('登录成功')
          await nextTick()
          preloadAppData().catch(err => console.warn('[Login] 预加载数据失败:', err))

          if (userStore.currentUser?.forcePasswordChange) {
            window.location.href = '/change-password'
          } else {
            window.location.href = '/'
          }
        } else {
          ElMessage.error('登录失败')
        }
      } catch (error: unknown) {
        console.error('登录错误:', error)
        if (userStore.token && userStore.isLoggedIn) {
          ElMessage.success('登录成功')
          window.location.href = '/'
          return
        }
        const errorMessage = error instanceof Error ? error.message : '登录失败，请检查用户名和密码'
        ElMessage.error(errorMessage)

        if (error instanceof Error && (error.message.includes('频繁') || error.message.includes('429'))) {
          setTimeout(() => { loading.value = false }, 30000)
          ElMessage.warning('登录尝试过于频繁，按钮已禁用30秒')
          return
        }
      } finally {
        loginDebounceTimer = setTimeout(() => { loading.value = false }, 1000)
      }
    }
  })
}
</script>


<style scoped>
/* 页面基础样式 */
.login-page {
  min-height: 100vh;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
  position: relative;
  overflow: hidden;
}

/* 背景装饰圆 */
.bg-decorations {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  pointer-events: none;
  overflow: hidden;
}

.decoration-circle {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
}

.circle-1 {
  width: 400px;
  height: 400px;
  top: -150px;
  left: -100px;
  animation: float1 25s ease-in-out infinite;
}

.circle-2 {
  width: 300px;
  height: 300px;
  bottom: -100px;
  right: -80px;
  animation: float2 20s ease-in-out infinite;
}

.circle-3 {
  width: 200px;
  height: 200px;
  top: 40%;
  left: 5%;
  background: rgba(255, 255, 255, 0.05);
  animation: float3 18s ease-in-out infinite;
}

.circle-4 {
  width: 150px;
  height: 150px;
  top: 20%;
  right: 10%;
  background: rgba(255, 255, 255, 0.06);
  animation: float1 22s ease-in-out infinite reverse;
}

@keyframes float1 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(30px, 30px) scale(1.05); }
}

@keyframes float2 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(-25px, -25px) scale(1.08); }
}

@keyframes float3 {
  0%, 100% { transform: translate(0, 0); }
  33% { transform: translate(20px, -15px); }
  66% { transform: translate(-15px, 20px); }
}

/* 主容器 */
.login-wrapper {
  display: flex;
  width: 100%;
  max-width: 1200px;
  min-height: 600px;
  margin: 20px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 24px;
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.25);
  overflow: hidden;
  position: relative;
  z-index: 1;
}

/* 左侧展示区 */
.showcase-section {
  flex: 1.2;
  background: linear-gradient(160deg, rgba(99, 102, 241, 0.08) 0%, rgba(139, 92, 246, 0.12) 100%);
  padding: 50px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.showcase-content {
  position: relative;
  z-index: 2;
}

/* 品牌Logo */
.brand-logo {
  font-size: 28px;
  font-weight: 800;
  margin-bottom: 40px;
}

.logo-text {
  color: #1e293b;
}

.logo-highlight {
  color: #6366f1;
  margin-left: 4px;
}

/* 插画容器 */
.illustration-container {
  position: relative;
  width: 100%;
  max-width: 450px;
  margin: 0 auto 40px;
}

.illustration-wrapper {
  position: relative;
}

.main-illustration {
  width: 100%;
  height: auto;
  filter: drop-shadow(0 10px 30px rgba(99, 102, 241, 0.2));
}

/* 浮动元素 */
.floating-element {
  position: absolute;
  animation: floatElement 4s ease-in-out infinite;
}

.el-1 {
  top: 10%;
  right: 5%;
  animation-delay: 0s;
}

.el-2 {
  bottom: 25%;
  left: 0;
  animation-delay: 1s;
}

.el-3 {
  top: 40%;
  right: -5%;
  animation-delay: 2s;
}

@keyframes floatElement {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-15px); }
}

/* 特性列表 */
.features-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 12px;
  transition: all 0.3s ease;
}

.feature-item:hover {
  background: rgba(255, 255, 255, 0.9);
  transform: translateX(8px);
  box-shadow: 0 4px 15px rgba(99, 102, 241, 0.15);
}

.feature-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  border-radius: 10px;
}

.feature-item span {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}


/* 右侧登录区 */
.login-section {
  flex: 0.8;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 50px;
  background: #fff;
}

.login-card {
  width: 100%;
  max-width: 380px;
  text-align: center;
}

/* Logo图标 */
.card-logo {
  margin-bottom: 28px;
  display: inline-block;
  animation: pulse 2.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

/* 标题 */
.card-title {
  font-size: 26px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 10px 0;
  letter-spacing: -0.5px;
}

.card-subtitle {
  font-size: 11px;
  color: #94a3b8;
  margin: 0 0 36px 0;
  text-transform: uppercase;
  letter-spacing: 2px;
  font-weight: 500;
}

/* 表单样式 */
.login-form {
  text-align: left;
}

.login-form :deep(.el-form-item) {
  margin-bottom: 22px;
}

.login-form :deep(.el-input__wrapper) {
  border-radius: 12px;
  padding: 14px 18px;
  box-shadow: none;
  border: 1.5px solid #e5e7eb;
  background: #f9fafb;
  transition: all 0.3s ease;
}

.login-form :deep(.el-input__wrapper:hover) {
  border-color: #c7d2fe;
  background: #fff;
}

.login-form :deep(.el-input__wrapper.is-focus) {
  border-color: #6366f1;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.login-form :deep(.el-input__inner) {
  font-size: 15px;
  color: #1e293b;
}

.login-form :deep(.el-input__inner::placeholder) {
  color: #94a3b8;
}

.login-form :deep(.el-input__prefix) {
  color: #94a3b8;
}

/* 协议勾选 */
.agreement-item {
  margin-bottom: 26px !important;
}

.agreement-item :deep(.el-checkbox) {
  height: auto;
  align-items: flex-start;
}

.agreement-item :deep(.el-checkbox__label) {
  white-space: normal;
  line-height: 1.6;
}

.agreement-text {
  font-size: 12px;
  color: #64748b;
}

.agreement-text a {
  color: #6366f1;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s;
}

.agreement-text a:hover {
  color: #4f46e5;
  text-decoration: underline;
}

/* 登录按钮 */
.login-button {
  width: 100%;
  height: 50px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 12px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  border: none;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(99, 102, 241, 0.35);
  letter-spacing: 2px;
}

.login-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(99, 102, 241, 0.45);
}

.login-button:active:not(:disabled) {
  transform: translateY(0);
}

.login-button:disabled {
  background: #e2e8f0;
  box-shadow: none;
  cursor: not-allowed;
}

/* 底部版权 */
.card-footer {
  margin-top: 36px;
  padding-top: 24px;
  border-top: 1px solid #f1f5f9;
}

.card-footer p {
  font-size: 12px;
  color: #94a3b8;
  margin: 0;
}

/* 协议弹窗 */
.agreement-dialog :deep(.el-dialog) {
  border-radius: 16px;
  overflow: hidden;
}

.agreement-dialog :deep(.el-dialog__header) {
  padding: 24px 28px 20px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
}

.agreement-dialog :deep(.el-dialog__title) {
  font-size: 18px;
  font-weight: 600;
  color: #fff;
}

.agreement-dialog :deep(.el-dialog__headerbtn .el-dialog__close) {
  color: #fff;
}

.agreement-dialog :deep(.el-dialog__body) {
  padding: 28px;
  max-height: 60vh;
  overflow-y: auto;
  background: #fafbfc;
}

.agreement-dialog :deep(.el-dialog__footer) {
  padding: 16px 28px;
  border-top: 1px solid #e5e7eb;
}

.agreement-content {
  background: #fff;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}


/* 响应式设计 */
@media (max-width: 1024px) {
  .login-wrapper {
    max-width: 900px;
  }

  .showcase-section {
    padding: 40px;
  }

  .login-section {
    padding: 40px;
  }
}

@media (max-width: 768px) {
  .login-wrapper {
    flex-direction: column;
    max-width: 450px;
    margin: 16px;
  }

  .showcase-section {
    display: none;
  }

  .login-section {
    padding: 48px 32px;
  }

  .login-card {
    max-width: 100%;
  }
}

@media (max-width: 480px) {
  .login-page {
    padding: 0;
  }

  .login-wrapper {
    margin: 0;
    border-radius: 0;
    min-height: 100vh;
  }

  .login-section {
    padding: 40px 24px;
  }

  .card-title {
    font-size: 22px;
  }

  .card-subtitle {
    font-size: 10px;
    letter-spacing: 1.5px;
  }

  .login-button {
    height: 46px;
    font-size: 15px;
  }
}
</style>
