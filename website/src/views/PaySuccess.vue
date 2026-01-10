<template>
  <div class="pay-success-page">
    <div class="success-container">
      <div class="success-icon">🎉</div>
      <h1>{{ isTrial ? '注册成功！' : '购买成功！' }}</h1>
      <p class="success-desc">{{ isTrial ? '您的7天免费试用已开通' : '感谢您选择云客CRM，您的账号已开通' }}</p>

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
          <div class="info-item">
            <span class="info-label">管理员账号</span>
            <span class="info-value">admin</span>
          </div>
          <div class="info-item">
            <span class="info-label">初始密码</span>
            <span class="info-value">admin123 <em class="warning">（请登录后立即修改）</em></span>
          </div>
        </div>

        <div class="steps-guide">
          <h4>首次登录步骤：</h4>
          <ol>
            <li>点击下方"立即登录系统"按钮</li>
            <li>在登录页点击 🔑 图标，选择"SaaS租户"</li>
            <li>输入您的租户授权码</li>
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
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const type = computed(() => route.query.type as string || 'saas')
const plan = computed(() => route.query.plan as string || 'pro')
const tenantCode = computed(() => route.query.tenantCode as string || '')

// 从URL参数获取真实授权码，如果没有则显示占位符
const licenseKey = computed(() => {
  const key = route.query.licenseKey as string
  if (key) return key
  // 如果没有传递授权码，显示提示
  return type.value === 'saas' ? '请查看邮件或短信获取授权码' : '请查看邮件或短信获取授权码'
})

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
