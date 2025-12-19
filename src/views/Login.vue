<template>
  <div class="login-page">
    <!-- 3D透视网格背景 -->
    <div class="perspective-bg">
      <div class="grid-floor"></div>
    </div>

    <!-- 背景点缀 -->
    <div class="bg-decorations">
      <div class="deco-circle deco-1"></div>
      <div class="deco-circle deco-2"></div>
      <div class="deco-circle deco-3"></div>
      <div class="deco-dot dot-1"></div>
      <div class="deco-dot dot-2"></div>
      <div class="deco-dot dot-3"></div>
      <div class="deco-dot dot-4"></div>
      <div class="deco-square sq-1"></div>
      <div class="deco-square sq-2"></div>
    </div>

    <!-- 左侧内容区 -->
    <div class="left-section">
      <!-- Logo - Apple风格扁平化设计 -->
      <div class="logo">
        <div class="logo-icon">
          <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
            <defs>
              <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#6ee7b7"/>
                <stop offset="100%" stop-color="#34d399"/>
              </linearGradient>
            </defs>
            <!-- 圆角矩形背景 - 更鲜明的薄荷绿 -->
            <rect width="44" height="44" rx="10" fill="url(#logoGrad)"/>
            <!-- 多样化图形组合 -->
            <rect x="10" y="10" width="10" height="10" rx="2" fill="white"/>
            <circle cx="29" cy="15" r="5" fill="white" opacity="0.85"/>
            <rect x="10" y="24" width="10" height="10" rx="5" fill="white" opacity="0.7"/>
            <rect x="24" y="24" width="10" height="10" rx="2" fill="white"/>
          </svg>
        </div>
        <span class="logo-text">云客</span>
        <span class="logo-badge">CRM</span>
      </div>

      <!-- 3D插画区域 - 商务科技风格 -->
      <div class="illustration-area">
        <div class="illustration-wrapper">
          <svg class="main-illustration" viewBox="0 0 520 400" fill="none">
            <!-- 背景柔和光晕 -->
            <circle cx="260" cy="200" r="150" fill="url(#softGrad1)" opacity="0.15"/>
            <circle cx="380" cy="280" r="100" fill="url(#softGrad2)" opacity="0.1"/>
            <circle cx="140" cy="120" r="70" fill="url(#softGrad3)" opacity="0.08"/>

            <!-- 中心3D立体方块组 - 浅色简约风 -->
            <g transform="translate(180, 100)">
              <animateTransform attributeName="transform" type="translate" values="180,100;180,92;180,100" dur="6s" repeatCount="indefinite" additive="replace"/>
              <!-- 大方块 - 主体 -->
              <g>
                <path d="M0 50 L80 0 L160 50 L80 100 Z" fill="#eef2ff"/>
                <path d="M0 50 L0 130 L80 180 L80 100 Z" fill="#e0e7ff"/>
                <path d="M80 100 L80 180 L160 130 L160 50 Z" fill="#c7d2fe"/>
                <!-- 方块顶部图标 -->
                <g transform="translate(55, 25)">
                  <circle cx="25" cy="25" r="22" fill="white" filter="url(#iconShadow)"/>
                  <circle cx="25" cy="25" r="16" fill="url(#iconGrad)"/>
                  <path d="M18 25 L23 30 L33 20" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                </g>
              </g>

              <!-- 中方块 - 右上浮动 -->
              <g transform="translate(140, -30)">
                <animateTransform attributeName="transform" type="translate" values="140,-30;140,-40;140,-30" dur="4s" repeatCount="indefinite" additive="replace"/>
                <path d="M0 30 L45 0 L90 30 L45 60 Z" fill="#fce7f3"/>
                <path d="M0 30 L0 75 L45 105 L45 60 Z" fill="#fbcfe8"/>
                <path d="M45 60 L45 105 L90 75 L90 30 Z" fill="#f9a8d4"/>
                <circle cx="45" cy="22" r="12" fill="white"/>
                <rect x="40" y="17" width="10" height="10" rx="2" fill="#ec4899"/>
              </g>

              <!-- 小方块 - 左下浮动 -->
              <g transform="translate(-60, 120)">
                <animateTransform attributeName="transform" type="translate" values="-60,120;-60,112;-60,120" dur="4.5s" repeatCount="indefinite" additive="replace"/>
                <path d="M0 20 L35 0 L70 20 L35 40 Z" fill="#d1fae5"/>
                <path d="M0 20 L0 55 L35 75 L35 40 Z" fill="#a7f3d0"/>
                <path d="M35 40 L35 75 L70 55 L70 20 Z" fill="#6ee7b7"/>
                <circle cx="35" cy="14" r="10" fill="white"/>
                <circle cx="35" cy="14" r="6" fill="#10b981"/>
              </g>
            </g>

            <!-- 浮动数据卡片1 - 业绩统计 -->
            <g transform="translate(340, 40)">
              <animateTransform attributeName="transform" type="translate" values="340,40;340,32;340,40" dur="5s" repeatCount="indefinite" additive="replace"/>
              <rect width="130" height="100" rx="16" fill="white" filter="url(#cardShadow)"/>
              <rect x="15" y="15" width="50" height="8" rx="4" fill="#f3f4f6"/>
              <text x="15" y="45" fill="#1f2937" font-size="22" font-weight="700">2,847</text>
              <text x="15" y="60" fill="#6b7280" font-size="10">总客户数</text>
              <!-- 迷你折线图 -->
              <polyline points="15,85 35,78 55,82 75,70 95,75 115,65"
                        stroke="#6366f1" stroke-width="2" fill="none" stroke-linecap="round"/>
              <circle cx="115" cy="65" r="4" fill="#6366f1"/>
              <!-- 增长标签 -->
              <g transform="translate(85, 12)">
                <rect width="35" height="18" rx="9" fill="#dcfce7"/>
                <text x="17" y="13" text-anchor="middle" fill="#10b981" font-size="9" font-weight="600">+12%</text>
              </g>
            </g>

            <!-- 浮动数据卡片2 - 图表卡片 -->
            <g transform="translate(30, 250)">
              <animateTransform attributeName="transform" type="translate" values="30,250;30,242;30,250" dur="5.5s" repeatCount="indefinite" additive="replace"/>
              <rect width="150" height="110" rx="16" fill="white" filter="url(#cardShadow)"/>
              <text x="15" y="28" fill="#1f2937" font-size="11" font-weight="600">销售趋势</text>
              <!-- 柱状图 -->
              <g transform="translate(15, 40)">
                <rect x="0" y="45" width="16" height="20" rx="3" fill="#e0e7ff"/>
                <rect x="22" y="35" width="16" height="30" rx="3" fill="#c7d2fe"/>
                <rect x="44" y="20" width="16" height="45" rx="3" fill="#a5b4fc"/>
                <rect x="66" y="28" width="16" height="37" rx="3" fill="#818cf8"/>
                <rect x="88" y="10" width="16" height="55" rx="3" fill="#6366f1"/>
                <rect x="110" y="18" width="16" height="47" rx="3" fill="#818cf8"/>
              </g>
              <!-- 图例 -->
              <circle cx="20" cy="100" r="4" fill="#6366f1"/>
              <text x="30" y="103" fill="#6b7280" font-size="8">本月业绩</text>
            </g>

            <!-- 浮动数据卡片3 - 环形进度 -->
            <g transform="translate(350, 220)">
              <animateTransform attributeName="transform" type="translate" values="350,220;350,212;350,220" dur="4.5s" repeatCount="indefinite" additive="replace"/>
              <rect width="110" height="110" rx="16" fill="white" filter="url(#cardShadow)"/>
              <text x="55" y="25" text-anchor="middle" fill="#1f2937" font-size="10" font-weight="600">完成率</text>
              <!-- 环形图 -->
              <g transform="translate(55, 65)">
                <circle cx="0" cy="0" r="30" fill="none" stroke="#f3f4f6" stroke-width="6"/>
                <circle cx="0" cy="0" r="30" fill="none" stroke="url(#ringGrad)" stroke-width="6"
                        stroke-dasharray="142 188" stroke-linecap="round" transform="rotate(-90)"/>
                <text x="0" y="5" text-anchor="middle" fill="#1f2937" font-size="16" font-weight="700">76%</text>
              </g>
            </g>

            <!-- 连接虚线 - 数据流动 -->
            <g class="connection-lines">
              <path d="M320 180 Q340 120 360 80" stroke="#6366f1" stroke-width="1.5" stroke-dasharray="6,4" opacity="0.4">
                <animate attributeName="stroke-dashoffset" from="0" to="10" dur="1.5s" repeatCount="indefinite"/>
              </path>
              <path d="M180 270 Q130 280 100 290" stroke="#10b981" stroke-width="1.5" stroke-dasharray="6,4" opacity="0.4">
                <animate attributeName="stroke-dashoffset" from="0" to="10" dur="1.8s" repeatCount="indefinite"/>
              </path>
              <path d="M320 220 Q340 240 360 250" stroke="#8b5cf6" stroke-width="1.5" stroke-dasharray="6,4" opacity="0.35">
                <animate attributeName="stroke-dashoffset" from="0" to="10" dur="1.2s" repeatCount="indefinite"/>
              </path>
            </g>

            <!-- 装饰小元素 -->
            <circle cx="480" cy="160" r="6" fill="#6366f1" opacity="0.5" class="pulse-dot"/>
            <circle cx="80" cy="160" r="5" fill="#ec4899" opacity="0.5" class="pulse-dot"/>
            <circle cx="490" cy="340" r="4" fill="#10b981" opacity="0.5" class="pulse-dot"/>
            <rect x="50" y="340" width="10" height="10" rx="2" fill="#f59e0b" opacity="0.5" transform="rotate(45 55 345)"/>
            <rect x="480" y="90" width="8" height="8" rx="2" fill="#8b5cf6" opacity="0.4" transform="rotate(45 484 94)"/>
            <circle cx="150" cy="360" r="3" fill="#6366f1" opacity="0.5"/>

            <!-- 渐变和滤镜定义 -->
            <defs>
              <linearGradient id="softGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#6366f1"/>
                <stop offset="100%" stop-color="#a5b4fc"/>
              </linearGradient>
              <linearGradient id="softGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#10b981"/>
                <stop offset="100%" stop-color="#6ee7b7"/>
              </linearGradient>
              <linearGradient id="softGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#ec4899"/>
                <stop offset="100%" stop-color="#f9a8d4"/>
              </linearGradient>
              <linearGradient id="iconGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#6366f1"/>
                <stop offset="100%" stop-color="#8b5cf6"/>
              </linearGradient>
              <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#6366f1"/>
                <stop offset="100%" stop-color="#10b981"/>
              </linearGradient>
              <filter id="cardShadow" x="-30%" y="-30%" width="160%" height="160%">
                <feDropShadow dx="0" dy="10" stdDeviation="15" flood-color="#6366f1" flood-opacity="0.06"/>
              </filter>
              <filter id="iconShadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#6366f1" flood-opacity="0.15"/>
              </filter>
            </defs>
          </svg>
        </div>
      </div>

      <!-- 底部特性 - Apple风格扁平化图标 -->
      <div class="features">
        <div class="feature">
          <div class="feature-icon-apple blue">
            <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
              <defs>
                <linearGradient id="blueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#818cf8"/>
                  <stop offset="100%" stop-color="#4f46e5"/>
                </linearGradient>
              </defs>
              <rect width="44" height="44" rx="10" fill="url(#blueGrad)"/>
              <!-- 可爱机器人图标 -->
              <!-- 天线 -->
              <line x1="22" y1="8" x2="22" y2="12" stroke="white" stroke-width="2" stroke-linecap="round"/>
              <circle cx="22" cy="7" r="2" fill="white"/>
              <!-- 头部 -->
              <rect x="12" y="12" width="20" height="16" rx="4" fill="white"/>
              <!-- 眼睛 -->
              <circle cx="17" cy="20" r="2.5" fill="#4f46e5"/>
              <circle cx="27" cy="20" r="2.5" fill="#4f46e5"/>
              <!-- 眼睛高光 -->
              <circle cx="16" cy="19" r="1" fill="white"/>
              <circle cx="26" cy="19" r="1" fill="white"/>
              <!-- 嘴巴 -->
              <rect x="18" y="24" width="8" height="2" rx="1" fill="#4f46e5" opacity="0.6"/>
              <!-- 耳朵/侧边装饰 -->
              <rect x="8" y="17" width="3" height="6" rx="1.5" fill="white" opacity="0.8"/>
              <rect x="33" y="17" width="3" height="6" rx="1.5" fill="white" opacity="0.8"/>
              <!-- 身体 -->
              <rect x="15" y="29" width="14" height="8" rx="2" fill="white" opacity="0.9"/>
              <!-- 身体装饰线 -->
              <line x1="19" y1="31" x2="19" y2="35" stroke="#4f46e5" stroke-width="1.5" opacity="0.4"/>
              <line x1="22" y1="31" x2="22" y2="35" stroke="#4f46e5" stroke-width="1.5" opacity="0.4"/>
              <line x1="25" y1="31" x2="25" y2="35" stroke="#4f46e5" stroke-width="1.5" opacity="0.4"/>
            </svg>
          </div>
          <div class="feature-text">
            <span class="feature-title">智能管理</span>
            <span class="feature-desc">AI驱动的客户洞察</span>
          </div>
        </div>
        <div class="feature">
          <div class="feature-icon-apple orange">
            <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
              <rect width="44" height="44" rx="10" fill="url(#orangeGrad)"/>
              <!-- 柱状图图标 - 数据分析 -->
              <rect x="10" y="24" width="5" height="10" rx="1.5" fill="white" opacity="0.95"/>
              <rect x="17" y="18" width="5" height="16" rx="1.5" fill="white" opacity="0.95"/>
              <rect x="24" y="14" width="5" height="20" rx="1.5" fill="white" opacity="0.95"/>
              <rect x="31" y="20" width="5" height="14" rx="1.5" fill="white" opacity="0.95"/>
              <!-- 上升箭头 -->
              <path d="M12 12l6-2 6 4 6-4" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
              <circle cx="30" cy="10" r="2" fill="white"/>
              <defs>
                <linearGradient id="orangeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#fb923c"/>
                  <stop offset="100%" stop-color="#f97316"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div class="feature-text">
            <span class="feature-title">数据分析</span>
            <span class="feature-desc">实时业绩追踪</span>
          </div>
        </div>
        <div class="feature">
          <div class="feature-icon-apple teal">
            <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
              <rect width="44" height="44" rx="10" fill="url(#tealGrad)"/>
              <!-- 三人团队图标 - 团队协作 -->
              <circle cx="22" cy="14" r="4" fill="white" opacity="0.95"/>
              <path d="M15 28c0-3.9 3.1-7 7-7s7 3.1 7 7" stroke="white" stroke-width="3" stroke-linecap="round" fill="none"/>
              <circle cx="12" cy="18" r="3" fill="white" opacity="0.7"/>
              <path d="M7 28c0-2.8 2.2-5 5-5" stroke="white" stroke-width="2.5" stroke-linecap="round" fill="none" opacity="0.7"/>
              <circle cx="32" cy="18" r="3" fill="white" opacity="0.7"/>
              <path d="M37 28c0-2.8-2.2-5-5-5" stroke="white" stroke-width="2.5" stroke-linecap="round" fill="none" opacity="0.7"/>
              <defs>
                <linearGradient id="tealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#2dd4bf"/>
                  <stop offset="100%" stop-color="#14b8a6"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div class="feature-text">
            <span class="feature-title">团队协作</span>
            <span class="feature-desc">高效协同办公</span>
          </div>
        </div>
      </div>
    </div>


    <!-- 右侧登录区 -->
    <div class="right-section">
      <div class="login-card">
        <div class="card-header">
          <h1>欢迎回来</h1>
          <p>登录云客系统，开启智能销售之旅</p>
        </div>

        <el-form :model="loginForm" :rules="rules" ref="loginFormRef" class="login-form" @keyup.enter="handleLogin">
          <el-form-item prop="username">
            <div class="input-wrapper">
              <label>用户名</label>
              <el-input v-model="loginForm.username" placeholder="请输入用户名" size="large" clearable @keyup.enter="handleLogin">
                <template #prefix>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                </template>
              </el-input>
            </div>
          </el-form-item>

          <el-form-item prop="password">
            <div class="input-wrapper">
              <label>密码</label>
              <el-input v-model="loginForm.password" type="password" placeholder="请输入密码" size="large" show-password clearable @keyup.enter="handleLogin">
                <template #prefix>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2">
                    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </template>
              </el-input>
            </div>
          </el-form-item>

          <el-form-item class="agreement-item">
            <el-checkbox v-model="agreeToTerms">
              <span class="agreement-text">
                我已阅读并同意 <a @click.stop="showAgreementDialog('user')">《用户协议》</a> 和 <a @click.stop="showAgreementDialog('privacy')">《隐私政策》</a>
              </span>
            </el-checkbox>
          </el-form-item>

          <el-form-item>
            <el-button type="primary" size="large" class="login-btn" :loading="loading" :disabled="!agreeToTerms" @click="handleLogin">
              {{ loading ? '登录中...' : '登 录' }}
            </el-button>
          </el-form-item>
        </el-form>

        <div class="card-footer">
          <p>© 2025 云客 · 智能销售管理系统</p>
        </div>
      </div>
    </div>

    <!-- 协议弹窗 -->
    <el-dialog v-model="agreementDialogVisible" :title="agreementDialogTitle" width="650px" class="agreement-dialog">
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
const loginForm = reactive({ username: '', password: '' })
const agreeToTerms = ref(false)
const agreementDialogVisible = ref(false)
const agreementDialogTitle = ref('')
const agreementDialogContent = ref('')

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }, { min: 6, message: '密码至少6位', trigger: 'blur' }]
}

const getDefaultUserAgreement = () => `<div style="padding:24px;line-height:1.9;color:#374151;">
<h2 style="text-align:center;color:#111827;margin-bottom:24px;font-size:20px;">用户使用协议</h2>
<p>欢迎使用云客CRM系统。使用前请仔细阅读本协议。</p>
<h3 style="color:#6366f1;margin:20px 0 12px;font-size:16px;">一、服务内容</h3>
<p>本系统提供客户关系管理服务，包括客户管理、订单管理、业绩统计、数据分析等功能。</p>
<h3 style="color:#6366f1;margin:20px 0 12px;font-size:16px;">二、用户义务</h3>
<ul style="padding-left:20px;"><li>遵守法律法规</li><li>妥善保管账号密码</li><li>不得恶意攻击系统</li></ul>
<h3 style="color:#6366f1;margin:20px 0 12px;font-size:16px;">三、免责声明</h3>
<p style="color:#dc2626;">本系统仅作为工具提供服务，不对用户行为及后果承担责任。</p>
</div>`

const getDefaultPrivacyPolicy = () => `<div style="padding:24px;line-height:1.9;color:#374151;">
<h2 style="text-align:center;color:#111827;margin-bottom:24px;font-size:20px;">隐私政策</h2>
<p>我们重视您的隐私保护。</p>
<h3 style="color:#6366f1;margin:20px 0 12px;font-size:16px;">一、信息收集</h3>
<p>我们收集账号信息、业务数据、使用日志等。</p>
<h3 style="color:#6366f1;margin:20px 0 12px;font-size:16px;">二、信息保护</h3>
<p>采用加密传输、权限控制等安全措施保护您的数据。</p>
<h3 style="color:#6366f1;margin:20px 0 12px;font-size:16px;">三、用户权利</h3>
<p>您有权访问、更正、删除您的个人信息。</p>
</div>`

const showAgreementDialog = (type: 'user' | 'privacy') => {
  const list = JSON.parse(localStorage.getItem('crm_agreement_list') || '[]')
  agreementDialogTitle.value = type === 'user' ? '用户协议' : '隐私政策'
  const item = list.find((i: any) => i.type === type)
  agreementDialogContent.value = item?.content || (type === 'user' ? getDefaultUserAgreement() : getDefaultPrivacyPolicy())
  agreementDialogVisible.value = true
}

const agreeAndClose = () => { agreeToTerms.value = true; agreementDialogVisible.value = false; ElMessage.success('感谢您同意协议') }

configStore.initConfig()
if (localStorage.getItem('user_agreed_terms') === 'true') agreeToTerms.value = true

let debounce: NodeJS.Timeout | null = null
const handleLogin = async () => {
  if (!agreeToTerms.value) { ElMessage.warning('请先同意用户协议和隐私政策'); return }
  if (!loginFormRef.value || loading.value) return
  if (debounce) clearTimeout(debounce)

  await loginFormRef.value.validate(async (valid) => {
    if (valid) {
      loading.value = true
      try {
        const result = await userStore.loginWithRetry(loginForm.username, loginForm.password, false, 3)
        if (result) {
          localStorage.setItem('user_agreed_terms', 'true')
          ElMessage.success('登录成功')
          await nextTick()
          preloadAppData().catch(() => {})
          window.location.href = userStore.currentUser?.forcePasswordChange ? '/change-password' : '/'
        } else { ElMessage.error('登录失败') }
      } catch (e: any) {
        if (userStore.token && userStore.isLoggedIn) { window.location.href = '/'; return }
        ElMessage.error(e?.message || '登录失败')
      } finally { debounce = setTimeout(() => { loading.value = false }, 1000) }
    }
  })
}
</script>


<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  background: linear-gradient(180deg, #f8fafc 0%, #eef2ff 50%, #f0f9ff 100%);
  position: relative;
  overflow: hidden;
}

/* 3D透视网格背景 */
.perspective-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  perspective: 1000px;
  overflow: hidden;
}

.grid-floor {
  position: absolute;
  bottom: -20%;
  left: -10%;
  right: -10%;
  height: 60%;
  background:
    linear-gradient(90deg, rgba(99, 102, 241, 0.03) 1px, transparent 1px),
    linear-gradient(rgba(99, 102, 241, 0.03) 1px, transparent 1px);
  background-size: 60px 60px;
  transform: rotateX(60deg);
  transform-origin: center top;
  mask-image: linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 80%);
  -webkit-mask-image: linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 80%);
}

/* 背景点缀装饰 */
.bg-decorations {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.deco-circle {
  position: absolute;
  border-radius: 50%;
  opacity: 0.4;
}

.deco-1 {
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%);
  top: -80px;
  right: 10%;
  animation: pulse-slow 8s ease-in-out infinite;
}

.deco-2 {
  width: 200px;
  height: 200px;
  background: radial-gradient(circle, rgba(236, 72, 153, 0.12) 0%, transparent 70%);
  bottom: 10%;
  left: 5%;
  animation: pulse-slow 10s ease-in-out infinite 2s;
}

.deco-3 {
  width: 150px;
  height: 150px;
  background: radial-gradient(circle, rgba(16, 185, 129, 0.1) 0%, transparent 70%);
  top: 40%;
  right: 25%;
  animation: pulse-slow 12s ease-in-out infinite 4s;
}

.deco-dot {
  position: absolute;
  border-radius: 50%;
  animation: float-dot 6s ease-in-out infinite;
}

.dot-1 {
  width: 8px;
  height: 8px;
  background: #6366f1;
  top: 15%;
  left: 20%;
  animation-delay: 0s;
}

.dot-2 {
  width: 6px;
  height: 6px;
  background: #ec4899;
  top: 25%;
  right: 35%;
  animation-delay: 1s;
}

.dot-3 {
  width: 10px;
  height: 10px;
  background: #10b981;
  bottom: 20%;
  left: 35%;
  animation-delay: 2s;
}

.dot-4 {
  width: 5px;
  height: 5px;
  background: #f59e0b;
  bottom: 35%;
  right: 15%;
  animation-delay: 3s;
}

.deco-square {
  position: absolute;
  border-radius: 4px;
  animation: float-rotate 8s ease-in-out infinite;
}

.sq-1 {
  width: 12px;
  height: 12px;
  background: rgba(99, 102, 241, 0.3);
  top: 30%;
  left: 8%;
  animation-delay: 0s;
}

.sq-2 {
  width: 8px;
  height: 8px;
  background: rgba(236, 72, 153, 0.25);
  bottom: 25%;
  right: 30%;
  animation-delay: 2s;
}

@keyframes pulse-slow {
  0%, 100% { transform: scale(1); opacity: 0.4; }
  50% { transform: scale(1.1); opacity: 0.6; }
}

@keyframes float-dot {
  0%, 100% { transform: translateY(0) scale(1); opacity: 0.8; }
  50% { transform: translateY(-15px) scale(1.2); opacity: 1; }
}

@keyframes float-rotate {
  0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.7; }
  50% { transform: translateY(-10px) rotate(45deg); opacity: 1; }
}

/* 左侧区域 - 占60% */
.left-section {
  width: 60%;
  padding: 40px 60px;
  display: flex;
  flex-direction: column;
  position: relative;
}

/* Logo */
.logo {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.logo-text {
  font-size: 26px;
  font-weight: 700;
  color: #1f2937;
  letter-spacing: -0.5px;
}

.logo-badge {
  font-size: 11px;
  font-weight: 600;
  color: #6366f1;
  background: #eef2ff;
  padding: 4px 10px;
  border-radius: 20px;
  letter-spacing: 1px;
}

/* 插画区域 */
.illustration-area {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px 0;
}

.illustration-wrapper {
  width: 100%;
  max-width: 520px;
}

.main-illustration {
  width: 100%;
  height: auto;
  overflow: visible;
}

/* 动画 */
.main-cube {
  animation: float-main 5s ease-in-out infinite;
}

.float-animation {
  animation: float 4s ease-in-out infinite;
}

.float-animation-delay {
  animation: float 4s ease-in-out infinite 1.2s;
}

.float-card {
  animation: floatCard 5s ease-in-out infinite;
}

.float-card-delay {
  animation: floatCard 5s ease-in-out infinite 1.8s;
}

@keyframes float-main {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  25% { transform: translateY(-6px) rotate(0.5deg); }
  50% { transform: translateY(-12px) rotate(0deg); }
  75% { transform: translateY(-6px) rotate(-0.5deg); }
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-12px); }
}

@keyframes floatCard {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-10px) rotate(2deg); }
}

/* SVG动画已改用内联animateTransform，移除CSS动画避免冲突 */

.pulse-dot {
  animation: pulse-dot 2.5s ease-in-out infinite;
}

@keyframes float-cube {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-12px); }
}

@keyframes float-card-anim {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-8px) rotate(1deg); }
}

@keyframes pulse-dot {
  0%, 100% { opacity: 0.6; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.3); }
}

/* 底部特性 */
.features {
  display: flex;
  gap: 32px;
  padding-top: 20px;
  border-top: 1px solid rgba(99, 102, 241, 0.1);
}

.feature {
  display: flex;
  align-items: center;
  gap: 12px;
}

.feature-icon-apple {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.feature-icon-apple:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
}

.feature-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.feature-title {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.feature-desc {
  font-size: 12px;
  color: #6b7280;
}


/* 右侧登录区 - 屏幕五分之二位置（居中偏右） */
.right-section {
  width: 40%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 60px;
}

.login-card {
  width: 100%;
  max-width: 380px;
  background: white;
  border-radius: 24px;
  padding: 40px;
  box-shadow: 0 20px 60px rgba(99, 102, 241, 0.08), 0 8px 24px rgba(0, 0, 0, 0.04);
}

.card-header {
  text-align: center;
  margin-bottom: 32px;
}

.card-header h1 {
  font-size: 26px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 8px 0;
}

.card-header p {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

/* 表单 */
.input-wrapper {
  width: 100%;
}

.input-wrapper label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 8px;
}

.login-form :deep(.el-form-item) {
  margin-bottom: 20px;
}

.login-form :deep(.el-input__wrapper) {
  border-radius: 12px;
  padding: 12px 16px;
  box-shadow: none;
  border: 1.5px solid #e5e7eb;
  background: #f9fafb;
  transition: all 0.2s ease;
}

.login-form :deep(.el-input__wrapper:hover) {
  border-color: #d1d5db;
  background: white;
}

.login-form :deep(.el-input__wrapper.is-focus) {
  border-color: #6366f1;
  background: white;
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
}

.login-form :deep(.el-input__inner) {
  font-size: 14px;
}

.login-form :deep(.el-input__prefix) {
  margin-right: 8px;
}

/* 协议 */
.agreement-item { margin-bottom: 24px !important; }
.agreement-item :deep(.el-checkbox__label) { white-space: normal; line-height: 1.5; }
.agreement-text { font-size: 12px; color: #6b7280; }
.agreement-text a { color: #6366f1; cursor: pointer; }
.agreement-text a:hover { text-decoration: underline; }

/* 登录按钮 */
.login-btn {
  width: 100%;
  height: 48px;
  font-size: 15px;
  font-weight: 600;
  border-radius: 12px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  border: none;
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.3);
  transition: all 0.25s ease;
  letter-spacing: 3px;
}

.login-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(99, 102, 241, 0.4);
}

.login-btn:disabled {
  background: #e5e7eb;
  box-shadow: none;
}

/* 底部 */
.card-footer {
  margin-top: 28px;
  text-align: center;
  padding-top: 20px;
  border-top: 1px solid #f3f4f6;
}

.card-footer p {
  font-size: 12px;
  color: #9ca3af;
  margin: 0;
}

/* 弹窗 */
.agreement-dialog :deep(.el-dialog) { border-radius: 16px; }
.agreement-dialog :deep(.el-dialog__header) { padding: 20px 24px; border-bottom: 1px solid #f3f4f6; }
.agreement-dialog :deep(.el-dialog__body) { padding: 0; max-height: 55vh; overflow-y: auto; }
.agreement-content { padding: 0; }

/* 登录卡片悬浮效果 */
.login-card {
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.login-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 25px 70px rgba(99, 102, 241, 0.12), 0 10px 30px rgba(0, 0, 0, 0.06);
}

/* 响应式 */
@media (max-width: 1200px) {
  .left-section { width: 55%; padding: 30px 40px; }
  .right-section { width: 45%; padding: 30px 40px; }
  .features { gap: 20px; flex-wrap: wrap; }
}

@media (max-width: 1000px) {
  .left-section { width: 50%; }
  .right-section { width: 50%; }
  .bg-decorations { display: none; }
}

@media (max-width: 800px) {
  .login-page { flex-direction: column; }
  .left-section { display: none; }
  .right-section { width: 100%; min-height: 100vh; justify-content: center; padding: 40px; }
}
</style>
