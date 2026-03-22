<template>
  <div class="pay-success-page">
    <div class="success-container">
      <div class="success-icon">🎉</div>
      <h1>{{ isTrial ? '注册成功！' : (isBankTransfer ? '转账订单已提交！' : '购买成功！') }}</h1>
      <p class="success-desc">{{ isTrial ? '您的7天免费试用已开通' : (isBankTransfer ? '请完成对公转账，我们将在确认到账后为您开通账号' : '感谢您选择云客CRM，您的账号已开通') }}</p>

      <!-- 对公转账等待确认 -->
      <div v-if="isBankTransfer" class="info-card bank-pending">
        <h3>📋 转账信息确认</h3>
        <div class="info-list">
          <div class="info-item" v-if="orderNo">
            <span class="info-label">订单号</span>
            <span class="info-value code">
              {{ orderNo }}
              <button class="copy-btn" @click="copyText(orderNo)">复制</button>
            </span>
          </div>
        </div>

        <div class="bank-pending-notice">
          <div class="notice-item">
            <span class="notice-icon">✅</span>
            <span>您的订单已创建成功</span>
          </div>
          <div class="notice-item">
            <span class="notice-icon">🏦</span>
            <span>请按照页面提示的银行信息完成对公转账</span>
          </div>
          <div class="notice-item">
            <span class="notice-icon">⏰</span>
            <span>转账后，工作人员将在 <strong>1-2个工作日内</strong> 确认到账并激活您的账号</span>
          </div>
          <div class="notice-item">
            <span class="notice-icon">📱</span>
            <span>账号激活后，授权信息将通过短信和邮件发送给您</span>
          </div>
          <div class="notice-item">
            <span class="notice-icon">📞</span>
            <span>如有疑问，请联系客服：400-xxx-xxxx</span>
          </div>
        </div>

        <div class="action-buttons">
          <router-link to="/" class="btn btn-primary btn-lg">
            返回首页
          </router-link>
          <router-link to="/pricing" class="btn btn-outline btn-lg">
            查看套餐详情
          </router-link>
        </div>
      </div>

      <!-- SaaS版本 -->
      <div v-if="type === 'saas'" class="info-card">
        <h3>您的CRM系统已开通</h3>
        <div class="info-list">
          <div class="info-item">
            <span class="info-label">系统地址</span>
            <span class="info-value">
              <a href="https://app.yunke-crm.com" target="_blank">https://app.yunke-crm.com</a>
            </span>
          </div>
          <div class="info-item" v-if="tenantCode">
            <span class="info-label">租户编码</span>
            <span class="info-value code">
              {{ tenantCode }}
              <button class="copy-btn" @click="copyText(tenantCode)">复制</button>
            </span>
          </div>
          <div class="info-item">
            <span class="info-label">租户授权码</span>
            <span class="info-value code">
              {{ licenseKey }}
              <button class="copy-btn" @click="copyText(licenseKey)">复制</button>
            </span>
          </div>
          <div class="info-item">
            <span class="info-label">最大用户数</span>
            <span class="info-value">{{ maxUsers }}人</span>
          </div>
          <div class="info-item" v-if="isTrial">
            <span class="info-label">试用期限</span>
            <span class="info-value">7天</span>
          </div>
          <div class="info-item" v-if="adminUsername">
            <span class="info-label">管理员账号</span>
            <span class="info-value code">
              {{ adminUsername }}
              <button class="copy-btn" @click="copyText(adminUsername)">复制</button>
            </span>
          </div>
          <div class="info-item" v-if="adminPassword">
            <span class="info-label">初始密码</span>
            <span class="info-value code">
              {{ adminPassword }}
              <button class="copy-btn" @click="copyText(adminPassword)">复制</button>
              <em class="warning">（请登录后立即修改）</em>
            </span>
          </div>
        </div>

        <div class="copy-all-section" v-if="adminUsername && adminPassword">
          <button class="copy-all-btn" @click="copyAllInfo">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            一键复制全部登录信息
          </button>
        </div>

        <div class="steps-guide">
          <h4>首次登录步骤：</h4>
          <ol>
            <li>点击下方"立即登录系统"按钮</li>
            <li v-if="!adminUsername">在登录页点击 🔑 图标，选择"SaaS租户"</li>
            <li v-if="!adminUsername">输入您的租户授权码</li>
            <li v-if="adminUsername">系统已自动识别您的租户信息</li>
            <li>使用管理员账号密码登录</li>
            <li>登录后请立即修改密码</li>
          </ol>
        </div>

        <div class="action-buttons">
          <a href="https://app.yunke-crm.com" target="_blank" class="btn btn-primary btn-lg">
            立即登录系统
          </a>
          <router-link to="/docs" class="btn btn-outline btn-lg">
            查看使用文档
          </router-link>
        </div>
      </div>

      <!-- 私有部署版本 -->
      <div v-else class="info-card">
        <h3>您的授权已生成</h3>
        <div class="info-list">
          <div class="info-item">
            <span class="info-label">系统授权码</span>
            <span class="info-value code">
              {{ licenseKey }}
              <button class="copy-btn" @click="copyText(licenseKey)">复制</button>
            </span>
          </div>
          <div class="info-item">
            <span class="info-label">授权类型</span>
            <span class="info-value">永久授权</span>
          </div>
          <div class="info-item">
            <span class="info-label">授权用户数</span>
            <span class="info-value">{{ maxUsers }}人</span>
          </div>
        </div>

        <div class="steps-guide">
          <h4>部署步骤：</h4>
          <ol>
            <li>下载安装包并部署到您的服务器</li>
            <li>访问您的系统地址</li>
            <li>在登录页点击 🔑 图标，选择"私有部署"</li>
            <li>输入授权码激活系统</li>
            <li>系统会自动创建管理员账号</li>
          </ol>
        </div>

        <div class="download-section">
          <h4>下载安装包</h4>
          <div class="download-buttons">
            <a href="#" class="download-btn">
              <span class="download-icon">🐧</span>
              <span class="download-text">
                <strong>Linux版</strong>
                <small>推荐 CentOS 7+</small>
              </span>
            </a>
            <a href="#" class="download-btn">
              <span class="download-icon">🪟</span>
              <span class="download-text">
                <strong>Windows版</strong>
                <small>Windows Server 2016+</small>
              </span>
            </a>
            <a href="#" class="download-btn">
              <span class="download-icon">🐳</span>
              <span class="download-text">
                <strong>Docker版</strong>
                <small>一键部署</small>
              </span>
            </a>
          </div>
        </div>

        <div class="action-buttons">
          <router-link to="/docs" class="btn btn-primary btn-lg">
            查看部署文档
          </router-link>
          <a href="#" class="btn btn-outline btn-lg">
            预约远程协助
          </a>
        </div>
      </div>

      <div class="help-tip">
        <p>授权信息已发送至您的手机和邮箱，请注意查收</p>
        <p>如有问题，请联系客服：400-xxx-xxxx</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const type = computed(() => route.query.type as string || 'saas')
const plan = computed(() => route.query.plan as string || 'pro')
const tenantCode = computed(() => route.query.tenantCode as string || '')
const isBankTransfer = computed(() => route.query.payType === 'bank')
const orderNo = computed(() => route.query.orderNo as string || '')

// 从URL参数获取真实授权码和账号信息
const licenseKey = computed(() => {
  const key = route.query.licenseKey as string
  if (key) return key
  return type.value === 'saas' ? '请查看邮件或短信获取授权码' : '请查看邮件或短信获取授权码'
})

const adminUsername = computed(() => route.query.adminUsername as string || '')
const adminPassword = computed(() => route.query.adminPassword as string || '')

const maxUsers = computed(() => {
  const users: Record<string, string> = {
    'FREE_TRIAL': '3',
    'basic': '10',
    'pro': '50',
    'enterprise': '200',
    'private-standard': '50',
    'private-pro': '200',
    'private-enterprise': '不限'
  }
  return users[plan.value] || '10'
})

// 判断是否为免费试用
const isTrial = computed(() => plan.value === 'FREE_TRIAL' || plan.value === 'free')

const copyText = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    alert('已复制到剪贴板')
  } catch {
    alert('复制失败，请手动复制')
  }
}

const copyAllInfo = async () => {
  const text = `【云客CRM - 租户登录信息】

🌐 登录地址：https://app.yunke-crm.com
🏢 租户编码：${tenantCode.value}
🔑 授权码：${licenseKey.value}
👤 管理员账号：${adminUsername.value}
🔐 初始密码：${adminPassword.value}

💡 温馨提示：
1. 请使用授权码登录系统
2. 首次登录后请立即修改密码
3. 如有问题请联系技术支持`

  try {
    await navigator.clipboard.writeText(text)
    alert('已复制全部信息到剪贴板')
  } catch {
    alert('复制失败，请手动复制')
  }
}
</script>

<style lang="scss" scoped>
.pay-success-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #f0fdf4 0%, #ecfdf5 50%, #f8fafc 100%);
  padding: 120px 24px 60px;
}

.success-container {
  max-width: 700px;
  margin: 0 auto;
  text-align: center;
}

.success-icon {
  font-size: 80px;
  margin-bottom: 24px;
}

h1 {
  font-size: 42px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.success-desc {
  font-size: 18px;
  color: var(--text-secondary);
  margin-bottom: 40px;
}

.info-card {
  background: white;
  border-radius: var(--radius-xl);
  padding: 40px;
  box-shadow: var(--shadow-lg);
  text-align: left;
  margin-bottom: 32px;

  h3 {
    font-size: 20px;
    font-weight: 600;
    margin-bottom: 24px;
    text-align: center;
  }
}

.info-list {
  background: var(--bg-light);
  border-radius: var(--radius);
  padding: 20px;
  margin-bottom: 24px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--border);

  &:last-child {
    border-bottom: none;
  }

  .info-label {
    font-size: 14px;
    color: var(--text-muted);
  }

  .info-value {
    font-size: 15px;
    color: var(--text-primary);
    font-weight: 500;

    &.code {
      font-family: monospace;
      background: white;
      padding: 8px 12px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    a {
      color: var(--primary);
    }

    .warning {
      color: var(--warning);
      font-size: 12px;
      font-style: normal;
    }
  }
}

.copy-btn {
  padding: 4px 12px;
  background: var(--primary);
  color: white;
  border-radius: 4px;
  font-size: 12px;
}

.copy-all-section {
  margin: 20px 0;
  text-align: center;
}

.copy-all-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}

.copy-all-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(99, 102, 241, 0.4);
}

.steps-guide {
  margin-bottom: 24px;

  h4 {
    font-size: 15px;
    font-weight: 600;
    margin-bottom: 12px;
  }

  ol {
    padding-left: 20px;

    li {
      font-size: 14px;
      color: var(--text-secondary);
      padding: 6px 0;
      line-height: 1.6;
    }
  }
}

.download-section {
  margin-bottom: 24px;

  h4 {
    font-size: 15px;
    font-weight: 600;
    margin-bottom: 16px;
  }
}

.download-buttons {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.download-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: var(--bg-light);
  border-radius: var(--radius);
  transition: all 0.3s ease;

  &:hover {
    background: var(--primary);
    color: white;

    small {
      color: rgba(255, 255, 255, 0.8);
    }
  }

  .download-icon {
    font-size: 28px;
  }

  .download-text {
    text-align: left;

    strong {
      display: block;
      font-size: 14px;
    }

    small {
      font-size: 12px;
      color: var(--text-muted);
    }
  }
}

.action-buttons {
  display: flex;
  gap: 16px;
  justify-content: center;
}

.help-tip {
  margin-top: 32px;

  p {
    font-size: 14px;
    color: var(--text-muted);
    margin: 8px 0;
  }
}

.bank-pending-notice {
  margin-top: 20px;
  padding: 20px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 12px;

  .notice-item {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 8px 0;
    font-size: 14px;
    color: #374151;
    line-height: 1.5;

    .notice-icon {
      font-size: 18px;
      flex-shrink: 0;
    }

    strong {
      color: #d97706;
    }
  }
}

.bank-pending {
  border-color: #fde68a;
  background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
}

@media (max-width: 640px) {
  .download-buttons {
    grid-template-columns: 1fr;
  }

  .action-buttons {
    flex-direction: column;
  }

  .info-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}
</style>
