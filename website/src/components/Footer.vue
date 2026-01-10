<template>
  <footer class="footer">
    <div class="container">
      <div class="footer-main">
        <!-- 品牌信息 -->
        <div class="footer-brand">
          <div class="logo">
            <div class="logo-icon">
              <svg width="36" height="36" viewBox="0 0 44 44" fill="none">
                <rect width="44" height="44" rx="10" fill="url(#footerLogoGrad)"/>
                <rect x="10" y="10" width="10" height="10" rx="2" fill="white"/>
                <circle cx="29" cy="15" r="5" fill="white" opacity="0.85"/>
                <rect x="10" y="24" width="10" height="10" rx="5" fill="white" opacity="0.7"/>
                <rect x="24" y="24" width="10" height="10" rx="2" fill="white"/>
                <defs>
                  <linearGradient id="footerLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#6366f1"/>
                    <stop offset="100%" stop-color="#8b5cf6"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <span>云客CRM</span>
          </div>
          <p class="brand-desc">智能销售管理系统，助力企业高效增长</p>
          <div class="social-links">
            <a href="javascript:;" title="微信公众号" @click="showWechatQR = true" class="wechat-link">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348z"/></svg>
            </a>
            <a :href="wechatServiceUrl" target="_blank" title="在线客服">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>
            </a>
            <a href="tel:13570727364" title="电话咨询">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
            </a>
          </div>
        </div>

    <!-- 微信二维码弹窗 -->
    <Teleport to="body">
      <div v-if="showWechatQR" class="qr-modal" @click="showWechatQR = false">
        <div class="qr-content" @click.stop>
          <button class="close-btn" @click="showWechatQR = false">✕</button>
          <h4>关注微信公众号</h4>
          <div class="qr-image">
            <img src="/images/kefuQR.png" alt="微信公众号二维码" />
          </div>
          <p>扫码关注，获取最新资讯</p>
        </div>
      </div>
    </Teleport>

        <!-- 链接组 -->
        <div class="footer-links">
          <div class="link-group">
            <h4>产品</h4>
            <router-link to="/features">功能特性</router-link>
            <router-link to="/pricing">价格方案</router-link>
            <router-link to="/solutions">解决方案</router-link>
            <router-link to="/docs/start/intro">更新日志</router-link>
          </div>
          <div class="link-group">
            <h4>支持</h4>
            <router-link to="/docs">帮助文档</router-link>
            <router-link to="/docs/deploy/install">部署指南</router-link>
            <router-link to="/docs/deploy/faq">常见问题</router-link>
            <a :href="wechatServiceUrl" target="_blank">在线客服</a>
          </div>
          <div class="link-group">
            <h4>公司</h4>
            <router-link to="/about">关于我们</router-link>
            <router-link to="/about">加入我们</router-link>
            <router-link to="/about">联系我们</router-link>
            <router-link to="/about">合作伙伴</router-link>
          </div>
          <div class="link-group">
            <h4>法律</h4>
            <router-link to="/agreement/service">服务协议</router-link>
            <router-link to="/agreement/privacy">隐私政策</router-link>
            <router-link to="/agreement/privacy">Cookie政策</router-link>
          </div>
        </div>
      </div>

      <!-- 底部版权 -->
      <div class="footer-bottom">
        <p>© 2025 云客CRM. All rights reserved.</p>
        <p>
          <a href="#">ICP备案号</a>
          <span>|</span>
          <a href="#">公安备案</a>
        </p>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const wechatServiceUrl = 'https://work.weixin.qq.com/kfid/kfc461ca9f5b45c8d25'
const showWechatQR = ref(false)
</script>

<style lang="scss" scoped>
.footer {
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
  padding: 80px 0 30px;
  margin-top: auto;
}

.footer-main {
  display: grid;
  grid-template-columns: 1.5fr 2fr;
  gap: 60px;
  padding-bottom: 40px;
  border-bottom: 1px solid var(--border);
}

.footer-brand {
  .logo {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 16px;

    span {
      font-size: 20px;
      font-weight: 700;
      color: var(--text-primary);
    }
  }

  .brand-desc {
    color: var(--text-secondary);
    margin-bottom: 24px;
    line-height: 1.7;
  }
}

.social-links {
  display: flex;
  gap: 12px;

  a {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: white;
    border-radius: 10px;
    color: var(--text-secondary);
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    transition: all 0.3s ease;

    svg { width: 20px; height: 20px; }

    &:hover {
      background: var(--primary);
      color: white;
      transform: translateY(-2px);
    }
  }
}

.footer-links {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 40px;
}

.link-group {
  h4 {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 20px;
  }

  a {
    display: block;
    font-size: 14px;
    color: var(--text-secondary);
    padding: 8px 0;
    transition: color 0.2s ease;

    &:hover { color: var(--primary); }
  }
}

.footer-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 30px;

  p {
    font-size: 14px;
    color: var(--text-muted);

    a {
      color: var(--text-muted);
      &:hover { color: var(--primary); }
    }

    span { margin: 0 12px; }
  }
}

@media (max-width: 1024px) {
  .footer-main { grid-template-columns: 1fr; gap: 40px; }
  .footer-links { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 640px) {
  .footer-links { grid-template-columns: 1fr; gap: 30px; }
  .footer-bottom { flex-direction: column; gap: 12px; text-align: center; }
}

// 微信二维码弹窗
.qr-modal {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.qr-content {
  position: relative;
  background: white;
  border-radius: 16px;
  padding: 32px;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);

  h4 {
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 20px;
    color: var(--text-primary);
  }

  p {
    font-size: 14px;
    color: var(--text-muted);
    margin-top: 16px;
  }
}

.qr-image {
  width: 200px;
  height: 200px;
  margin: 0 auto;
  padding: 12px;
  background: #f8fafc;
  border-radius: 12px;
  border: 2px dashed #e2e8f0;

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
}

.close-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #f1f5f9;
  color: #64748b;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: none;
  transition: all 0.2s;

  &:hover {
    background: #e2e8f0;
    color: #334155;
  }
}
</style>
