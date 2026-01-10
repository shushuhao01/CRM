<template>
  <div class="customer-service">
    <!-- 悬浮按钮 -->
    <div class="cs-float-btn" @click="togglePanel" :class="{ active: showPanel }">
      <div class="btn-icon">
        <svg v-if="!showPanel" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </div>
      <span class="btn-text">在线咨询</span>
    </div>

    <!-- 客服面板 -->
    <Transition name="slide-up">
      <div v-if="showPanel" class="cs-panel">
        <div class="panel-header">
          <h4>联系客服</h4>
          <p>扫码添加微信客服，获取专业咨询</p>
        </div>

        <div class="panel-body">
          <div class="qr-wrapper">
            <img src="/images/kefuQR.png" alt="微信客服二维码" />
          </div>
          <p class="qr-tip">微信扫一扫，添加专属客服</p>

          <div class="divider">
            <span>或</span>
          </div>

          <a :href="wechatServiceUrl" target="_blank" class="chat-btn">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M8.5 11.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm7 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/>
              <path d="M12 2C6.477 2 2 6.145 2 11.243c0 2.936 1.444 5.544 3.678 7.227V22l3.27-1.795c.87.24 1.79.37 2.752.37h.3c5.523 0 10-4.145 10-9.243S17.523 2 12 2zm0 16.486h-.25c-.82 0-1.62-.11-2.38-.32l-.48-.13-2.14 1.18.05-1.95-.4-.32C4.88 15.67 4 13.56 4 11.243 4 7.25 7.582 4 12 4s8 3.25 8 7.243-3.582 7.243-8 7.243z"/>
            </svg>
            <span>点击在线咨询</span>
          </a>
        </div>

        <div class="panel-footer">
          <p>工作时间：周一至周五 9:00-18:00</p>
        </div>
      </div>
    </Transition>

    <!-- 遮罩层 -->
    <div v-if="showPanel" class="cs-overlay" @click="showPanel = false"></div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const showPanel = ref(false)
const wechatServiceUrl = 'https://work.weixin.qq.com/kfid/kfc461ca9f5b45c8d25'

const togglePanel = () => {
  showPanel.value = !showPanel.value
}
</script>

<style lang="scss" scoped>
.customer-service {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 1000;
}

.cs-float-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: var(--gradient-primary);
  color: white;
  border-radius: 50px;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4);
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 25px rgba(99, 102, 241, 0.5);
  }

  &.active {
    background: #64748b;
    box-shadow: 0 4px 15px rgba(100, 116, 139, 0.3);
  }

  .btn-icon {
    width: 24px;
    height: 24px;

    svg {
      width: 100%;
      height: 100%;
    }
  }

  .btn-text {
    font-size: 14px;
    font-weight: 500;
  }
}

.cs-panel {
  position: absolute;
  right: 0;
  bottom: 70px;
  width: 320px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.panel-header {
  padding: 20px;
  background: var(--gradient-primary);
  color: white;
  text-align: center;

  h4 {
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 4px;
  }

  p {
    font-size: 13px;
    opacity: 0.9;
  }
}

.panel-body {
  padding: 24px;
  text-align: center;
}

.qr-wrapper {
  width: 180px;
  height: 180px;
  margin: 0 auto 12px;
  padding: 8px;
  background: #f8fafc;
  border-radius: 12px;
  border: 2px dashed #e2e8f0;

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
}

.qr-tip {
  font-size: 13px;
  color: var(--text-muted);
}

.divider {
  display: flex;
  align-items: center;
  margin: 20px 0;

  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: #e2e8f0;
  }

  span {
    padding: 0 12px;
    font-size: 12px;
    color: var(--text-muted);
  }
}

.chat-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 14px;
  background: #07c160;
  color: white;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 500;
  transition: all 0.3s ease;

  &:hover {
    background: #06ae56;
    transform: translateY(-1px);
  }

  svg {
    width: 22px;
    height: 22px;
  }
}

.panel-footer {
  padding: 12px 20px;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  text-align: center;

  p {
    font-size: 12px;
    color: var(--text-muted);
  }
}

.cs-overlay {
  position: fixed;
  inset: 0;
  z-index: -1;
}

// 动画
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

// 响应式
@media (max-width: 640px) {
  .customer-service {
    right: 16px;
    bottom: 16px;
  }

  .cs-float-btn {
    padding: 12px;

    .btn-text {
      display: none;
    }
  }

  .cs-panel {
    width: calc(100vw - 32px);
    right: -8px;
  }
}
</style>
