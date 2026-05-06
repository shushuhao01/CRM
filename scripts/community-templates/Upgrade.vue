<template>
  <div class="upgrade-page">
    <div class="upgrade-container">
      <div class="upgrade-icon">
        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#409eff" stroke-width="1.5">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      </div>

      <h1 class="upgrade-title">此功能为专业版功能</h1>
      <p class="upgrade-subtitle">
        您当前使用的是 <strong>云客 CRM 社区版</strong>，该模块需要升级到专业版或企业版才能使用。
      </p>

      <div class="feature-preview">
        <h3>升级后可解锁</h3>
        <ul>
          <li>✅ 企业微信深度集成（客户同步、会话存档、获客助手等）</li>
          <li>✅ 通话管理（外呼、录音、坐席管理）</li>
          <li>✅ 短信管理（模板、自动发送、审批）</li>
          <li>✅ 财务管理（代收、结算、佣金计算）</li>
          <li>✅ 高级分析报表（多维趋势、自定义看板）</li>
          <li>✅ 批量操作（批量发货、批量审核、批量导入）</li>
          <li>✅ 更多用户席位（30-不限）</li>
          <li>✅ API 开放接口 + WebSocket 实时推送</li>
          <li>✅ 移动 APP（Android + iOS）</li>
          <li>✅ 专属技术支持</li>
        </ul>
      </div>

      <div class="upgrade-tip">
        <strong>📦 升级方式：</strong>
        购买私有部署授权后，下载完整版代码替换部署即可。您现有的数据库数据完全兼容，无需迁移。
      </div>

      <!-- 操作按钮 -->
      <div class="upgrade-actions">
        <a href="https://www.yunkes.com/member/login" target="_blank" class="btn-member">
          🔑 去会员中心升级
        </a>
        <button class="btn-contact" @click="showContactDialog = true">
          💬 联系客服升级
        </button>
        <a href="https://www.yunkes.com/pricing" target="_blank" class="btn-pricing">
          查看升级方案与价格
        </a>
        <button class="btn-back" @click="goBack">← 返回上一页</button>
      </div>

      <div class="upgrade-footer">
        <p>💡 社区版已包含完整的客户→订单→物流→售后核心流程，适合 1-3 人微型团队使用</p>
      </div>
    </div>

    <!-- 联系客服弹窗 -->
    <div v-if="showContactDialog" class="contact-overlay" @click.self="showContactDialog = false">
      <div class="contact-dialog">
        <div class="contact-dialog-header">
          <h3>💬 联系客服升级</h3>
          <button class="contact-close" @click="showContactDialog = false">&times;</button>
        </div>

        <div class="contact-dialog-body">
          <!-- 头部说明 -->
          <div class="cs-header">
            <div class="cs-header-icon">💬</div>
            <div class="cs-header-text">
              <h4>联系专属客服</h4>
              <p>扫码或通过以下方式，快速完成升级</p>
            </div>
          </div>

          <!-- 二维码 -->
          <div class="cs-qrcode-section">
            <div class="cs-qrcode-wrapper">
              <img src="/uploads/contact-service-qr.png" alt="微信客服二维码" />
            </div>
            <p class="cs-qrcode-label">微信扫一扫，添加专属客服</p>
          </div>

          <div class="cs-divider"><span>其他联系方式</span></div>

          <!-- 联系方式 -->
          <div class="cs-contact-list">
            <a href="https://work.weixin.qq.com/kfid/kfc461ca9f5b45c8d25" target="_blank" class="cs-contact-item cs-wechat">
              <div class="cs-contact-icon">
                <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
                  <path d="M8.5 11.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm7 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/>
                  <path d="M12 2C6.477 2 2 6.145 2 11.243c0 2.936 1.444 5.544 3.678 7.227V22l3.27-1.795c.87.24 1.79.37 2.752.37h.3c5.523 0 10-4.145 10-9.243S17.523 2 12 2zm0 16.486h-.25c-.82 0-1.62-.11-2.38-.32l-.48-.13-2.14 1.18.05-1.95-.4-.32C4.88 15.67 4 13.56 4 11.243 4 7.25 7.582 4 12 4s8 3.25 8 7.243-3.582 7.243-8 7.243z"/>
                </svg>
              </div>
              <div class="cs-contact-info">
                <span class="cs-contact-title">微信在线客服</span>
                <span class="cs-contact-desc">点击直达微信客服对话</span>
              </div>
              <div class="cs-contact-arrow">→</div>
            </a>

            <a href="tel:13570727364" class="cs-contact-item cs-phone">
              <div class="cs-contact-icon">📞</div>
              <div class="cs-contact-info">
                <span class="cs-contact-title">客服热线</span>
                <span class="cs-contact-desc">13570727364</span>
              </div>
              <div class="cs-contact-arrow">→</div>
            </a>

            <a href="mailto:xianhuquwang@163.com?subject=云客CRM社区版升级咨询" class="cs-contact-item cs-email">
              <div class="cs-contact-icon">📧</div>
              <div class="cs-contact-info">
                <span class="cs-contact-title">客服邮箱</span>
                <span class="cs-contact-desc">xianhuquwang@163.com</span>
              </div>
              <div class="cs-contact-arrow">→</div>
            </a>
          </div>

          <div class="cs-company">
            <p>广州仙狐网络科技有限公司</p>
            <p class="cs-work-time">工作时间：周一至周六 9:00-18:00</p>
          </div>
        </div>

        <div class="contact-dialog-footer">
          <button class="btn-dialog-close" @click="showContactDialog = false">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const showContactDialog = ref(false)

const goBack = () => {
  if (window.history.length > 1) {
    router.go(-1)
  } else {
    router.push('/dashboard')
  }
}
</script>

<style scoped>
.upgrade-page {
  min-height: calc(100vh - 120px);
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4ecf7 100%);
  padding: 40px 20px;
}

.upgrade-container {
  max-width: 640px;
  width: 100%;
  background: #fff;
  border-radius: 16px;
  padding: 48px 40px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  text-align: center;
}

.upgrade-icon {
  margin-bottom: 24px;
}

.upgrade-title {
  font-size: 28px;
  font-weight: 700;
  color: #303133;
  margin: 0 0 12px;
}

.upgrade-subtitle {
  font-size: 15px;
  color: #606266;
  line-height: 1.6;
  margin: 0 0 32px;
}

.feature-preview {
  text-align: left;
  background: #f5f7fa;
  border-radius: 12px;
  padding: 20px 24px;
  margin-bottom: 20px;
}

.feature-preview h3 {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 12px;
}

.feature-preview ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.feature-preview li {
  padding: 6px 0;
  font-size: 14px;
  color: #606266;
  line-height: 1.5;
}

.upgrade-tip {
  text-align: left;
  background: #ecf5ff;
  border: 1px solid #d9ecff;
  border-radius: 10px;
  padding: 14px 18px;
  margin-bottom: 28px;
  font-size: 14px;
  color: #409eff;
  line-height: 1.6;
}

.upgrade-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
  margin-bottom: 32px;
}

.btn-member {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 300px;
  padding: 14px 0;
  background: #ecf5ff;
  color: #409eff;
  border: 1.5px solid #b3d8ff;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.3s;
}
.btn-member:hover {
  color: #fff;
  background: #409eff;
  border-color: #409eff;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
  transform: translateY(-1px);
}

.btn-contact {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 300px;
  padding: 12px 0;
  background: #f0f9eb;
  color: #67c23a;
  border: 1.5px solid #c2e7b0;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}
.btn-contact:hover {
  color: #fff;
  background: #67c23a;
  border-color: #67c23a;
  box-shadow: 0 4px 12px rgba(103, 194, 58, 0.3);
  transform: translateY(-1px);
}

.btn-pricing {
  display: inline-block;
  width: 300px;
  padding: 11px 0;
  border: 1.5px solid #dcdfe6;
  color: #606266;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.3s;
}
.btn-pricing:hover {
  border-color: #409eff;
  color: #409eff;
  background: rgba(64, 158, 255, 0.03);
}

.btn-back {
  background: none;
  border: none;
  color: #909399;
  font-size: 14px;
  cursor: pointer;
  padding: 8px 16px;
}
.btn-back:hover {
  color: #606266;
}

.upgrade-footer {
  border-top: 1px solid #ebeef5;
  padding-top: 20px;
}
.upgrade-footer p {
  font-size: 13px;
  color: #909399;
  line-height: 1.6;
  margin: 4px 0;
}

/* ====== 联系客服弹窗 ====== */
.contact-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}
.contact-dialog {
  background: #fff;
  border-radius: 12px;
  width: 420px;
  max-width: 90vw;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.15);
}
.contact-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 12px;
  border-bottom: 1px solid #f0f0f0;
}
.contact-dialog-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}
.contact-close {
  background: none;
  border: none;
  font-size: 22px;
  color: #909399;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
}
.contact-close:hover { color: #303133; }

.contact-dialog-body {
  padding: 16px 20px;
}
.contact-dialog-footer {
  padding: 10px 20px 16px;
  text-align: right;
}
.btn-dialog-close {
  padding: 8px 24px;
  background: #f5f7fa;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  font-size: 14px;
  color: #606266;
  cursor: pointer;
}
.btn-dialog-close:hover { background: #e4e7ed; }

/* 客服弹窗内部样式 */
.cs-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #ecf5ff, #f0f9eb);
  border-radius: 10px;
  margin-bottom: 14px;
}
.cs-header-icon { font-size: 30px; line-height: 1; }
.cs-header-text h4 { margin: 0 0 2px; font-size: 15px; font-weight: 600; color: #303133; }
.cs-header-text p { margin: 0; font-size: 12px; color: #909399; }

.cs-qrcode-section { text-align: center; margin-bottom: 12px; }
.cs-qrcode-wrapper {
  width: 150px; height: 150px;
  margin: 0 auto 8px;
  padding: 6px;
  background: #f8fafc;
  border-radius: 10px;
  border: 2px dashed #e4e7ed;
  display: flex; align-items: center; justify-content: center;
}
.cs-qrcode-wrapper img { width: 100%; height: 100%; object-fit: contain; border-radius: 6px; }
.cs-qrcode-label { font-size: 12px; color: #909399; margin: 0; }

.cs-divider { display: flex; align-items: center; margin: 12px 0; }
.cs-divider::before, .cs-divider::after { content: ''; flex: 1; height: 1px; background: #e4e7ed; }
.cs-divider span { padding: 0 12px; font-size: 12px; color: #c0c4cc; }

.cs-contact-list { display: flex; flex-direction: column; gap: 8px; }
.cs-contact-item {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px; border-radius: 8px;
  text-decoration: none; transition: all 0.25s ease;
  cursor: pointer; border: 1px solid #e4e7ed; background: #fff;
}
.cs-contact-item:hover { transform: translateX(3px); box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.cs-contact-item.cs-wechat { border-color: #d1f0d1; background: #f6ffed; }
.cs-contact-item.cs-wechat:hover { border-color: #07c160; background: #efffed; }
.cs-contact-item.cs-phone { border-color: #d9ecff; background: #f4f9ff; }
.cs-contact-item.cs-phone:hover { border-color: #409eff; background: #ecf5ff; }
.cs-contact-item.cs-email { border-color: #fde2e2; background: #fef8f8; }
.cs-contact-item.cs-email:hover { border-color: #f56c6c; background: #fef0f0; }

.cs-contact-icon { font-size: 20px; line-height: 1; width: 24px; text-align: center; flex-shrink: 0; color: #07c160; }
.cs-contact-item.cs-phone .cs-contact-icon { color: #409eff; }
.cs-contact-item.cs-email .cs-contact-icon { color: #f56c6c; }

.cs-contact-info { flex: 1; min-width: 0; }
.cs-contact-title { display: block; font-size: 13px; font-weight: 600; color: #303133; margin-bottom: 1px; }
.cs-contact-desc { display: block; font-size: 12px; color: #909399; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cs-contact-arrow { font-size: 14px; color: #c0c4cc; flex-shrink: 0; transition: transform 0.2s; }
.cs-contact-item:hover .cs-contact-arrow { transform: translateX(3px); color: #909399; }

.cs-company {
  margin-top: 14px;
  padding: 10px 14px;
  background: #f5f7fa;
  border-radius: 8px;
  text-align: center;
}
.cs-company p { margin: 0; font-size: 13px; color: #606266; }
.cs-work-time { font-size: 12px; color: #909399; margin-top: 4px !important; }
</style>
