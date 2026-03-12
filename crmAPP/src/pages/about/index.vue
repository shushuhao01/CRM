<template>
  <view class="about-page">
    <!-- 应用信息 -->
    <view class="app-info">
      <image class="app-logo" src="/static/logo.png" mode="aspectFit" />
      <text class="app-name">CRM外呼助手</text>
      <text class="app-version">版本 v1.0.0</text>
      <text class="app-slogan">高效外呼 · 智能管理</text>
    </view>

    <!-- 功能入口 -->
    <view class="menu-section">
      <view class="menu-item" @tap="openUserAgreement">
        <text class="menu-icon">📄</text>
        <text class="menu-label">用户服务协议</text>
        <text class="menu-arrow">›</text>
      </view>
      <view class="menu-item" @tap="openPrivacyPolicy">
        <text class="menu-icon">🔒</text>
        <text class="menu-label">隐私政策</text>
        <text class="menu-arrow">›</text>
      </view>
      <view class="menu-item" @tap="showFeedback">
        <text class="menu-icon">💬</text>
        <text class="menu-label">意见反馈</text>
        <text class="menu-arrow">›</text>
      </view>
      <view class="menu-item" @tap="showContact">
        <text class="menu-icon">📞</text>
        <text class="menu-label">联系我们</text>
        <text class="menu-arrow">›</text>
      </view>
    </view>

    <!-- 公司信息 -->
    <view class="company-section">
      <text class="company-name">广州仙狐网络科技有限公司</text>
      <text class="copyright">Copyright © 2024-2026 All Rights Reserved</text>
    </view>
  </view>
</template>

<script setup lang="ts">
// 打开用户协议
const openUserAgreement = () => {
  uni.navigateTo({ url: '/pages/agreement/user-agreement' })
}

// 打开隐私政策
const openPrivacyPolicy = () => {
  uni.navigateTo({ url: '/pages/agreement/privacy-policy' })
}

// 意见反馈
const showFeedback = () => {
  uni.showModal({
    title: '意见反馈',
    content: '如有问题或建议，请通过以下方式联系我们：\n\n📞 客服电话：13570727234\n📧 邮箱：xianhuquwang@163.com\n💬 微信：nxys789\n\n我们会认真对待每一条反馈！',
    showCancel: false,
    confirmText: '我知道了'
  })
}

// 联系我们
const showContact = () => {
  uni.showActionSheet({
    itemList: ['拨打客服电话', '复制客服微信', '复制邮箱地址'],
    success: (res) => {
      if (res.tapIndex === 0) {
        uni.makePhoneCall({
          phoneNumber: '13570727234',
          fail: () => {
            uni.setClipboardData({
              data: '13570727234',
              success: () => {
                uni.showToast({ title: '电话已复制', icon: 'success' })
              }
            })
          }
        })
      } else if (res.tapIndex === 1) {
        uni.setClipboardData({
          data: 'nxys789',
          success: () => {
            uni.showToast({ title: '微信号已复制', icon: 'success' })
          }
        })
      } else if (res.tapIndex === 2) {
        uni.setClipboardData({
          data: 'xianhuquwang@163.com',
          success: () => {
            uni.showToast({ title: '邮箱已复制', icon: 'success' })
          }
        })
      }
    }
  })
}
</script>

<style lang="scss" scoped>
.about-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 60rpx;

  .app-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 80rpx 32rpx 60rpx;
    background: linear-gradient(135deg, #6EE7B7 0%, #34D399 100%);

    .app-logo {
      width: 160rpx;
      height: 160rpx;
      background: #fff;
      border-radius: 32rpx;
      padding: 20rpx;
      box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.15);
    }

    .app-name {
      font-size: 44rpx;
      font-weight: bold;
      color: #fff;
      margin-top: 32rpx;
    }

    .app-version {
      font-size: 28rpx;
      color: rgba(255, 255, 255, 0.9);
      margin-top: 12rpx;
    }

    .app-slogan {
      font-size: 26rpx;
      color: rgba(255, 255, 255, 0.8);
      margin-top: 16rpx;
    }
  }

  .menu-section {
    background: #fff;
    margin: 32rpx;
    border-radius: 16rpx;
    overflow: hidden;

    .menu-item {
      display: flex;
      align-items: center;
      padding: 32rpx;
      border-bottom: 1rpx solid #F3F4F6;

      &:last-child {
        border-bottom: none;
      }

      &:active {
        background: #F9FAFB;
      }

      .menu-icon {
        font-size: 36rpx;
        margin-right: 24rpx;
      }

      .menu-label {
        flex: 1;
        font-size: 30rpx;
        color: #1F2937;
      }

      .menu-arrow {
        font-size: 32rpx;
        color: #D1D5DB;
      }
    }
  }

  .company-section {
    text-align: center;
    padding: 40rpx 32rpx;

    .company-name {
      display: block;
      font-size: 26rpx;
      color: #6B7280;
      margin-bottom: 12rpx;
    }

    .copyright {
      display: block;
      font-size: 22rpx;
      color: #9CA3AF;
    }
  }
}
</style>
