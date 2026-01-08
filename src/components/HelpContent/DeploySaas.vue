<template>
  <div class="help-content">
    <h1>SaaS版本使用指南</h1>

    <section class="intro-section">
      <div class="intro-card">
        <el-icon class="intro-icon"><Cloudy /></el-icon>
        <div class="intro-text">
          <p>SaaS版本无需部署，注册即用，按需付费。适合快速上手的企业，我们提供专业的运维保障和技术支持。</p>
        </div>
      </div>
    </section>

    <section>
      <h2><el-icon><UserFilled /></el-icon> 注册开通</h2>
      <ol>
        <li>访问官网 www.yunkecrm.com</li>
        <li>点击「免费试用」或「立即注册」</li>
        <li>填写企业信息和联系方式</li>
        <li>验证手机号</li>
        <li>设置管理员账号密码</li>
        <li>完成注册，获取授权码</li>
      </ol>
    </section>

    <section>
      <h2><el-icon><Key /></el-icon> 授权码激活</h2>
      <p>注册成功后，您将获得一个授权码，首次登录需要输入授权码激活系统：</p>

      <div class="step-cards">
        <div class="step-card">
          <div class="step-num">1</div>
          <div class="step-content">
            <h4>获取授权码</h4>
            <p>注册成功后，授权码会发送到您的手机和邮箱</p>
          </div>
        </div>
        <div class="step-card">
          <div class="step-num">2</div>
          <div class="step-content">
            <h4>访问系统</h4>
            <p>使用分配的系统地址访问登录页面</p>
          </div>
        </div>
        <div class="step-card">
          <div class="step-num">3</div>
          <div class="step-content">
            <h4>输入授权码</h4>
            <p>首次访问时，系统会提示输入授权码</p>
          </div>
        </div>
        <div class="step-card">
          <div class="step-num">4</div>
          <div class="step-content">
            <h4>开始使用</h4>
            <p>激活成功后，使用管理员账号登录系统</p>
          </div>
        </div>
      </div>

      <div class="tip-box info">
        <el-icon><InfoFilled /></el-icon>
        <span>授权码激活后与您的企业绑定，请妥善保管</span>
      </div>
    </section>

    <section>
      <h2><el-icon><Goods /></el-icon> 套餐选择</h2>
      <el-table :data="packages" stripe border>
        <el-table-column prop="name" label="套餐" width="120" />
        <el-table-column prop="users" label="用户数" width="100" />
        <el-table-column prop="storage" label="存储空间" width="100" />
        <el-table-column prop="features" label="功能" />
        <el-table-column prop="price" label="价格" width="120" />
      </el-table>
    </section>

    <section>
      <h2><el-icon><Top /></el-icon> 升级套餐</h2>
      <p>如需升级套餐，请联系客服进行升级：</p>

      <div class="upgrade-notice">
        <el-icon><WarningFilled /></el-icon>
        <div>
          <strong>套餐升级说明</strong>
          <p>目前套餐升级需要联系客服处理，我们会为您提供专业的升级方案和优惠政策。</p>
        </div>
      </div>

      <div class="contact-card">
        <h4>联系客服升级</h4>
        <div class="contact-methods">
          <div class="contact-item">
            <el-icon><Message /></el-icon>
            <div>
              <span class="label">邮箱</span>
              <a href="mailto:xianhuquwang@163.com">xianhuquwang@163.com</a>
            </div>
          </div>
          <div class="contact-item">
            <el-icon><Phone /></el-icon>
            <div>
              <span class="label">电话</span>
              <a href="tel:13570727364">135-7072-7364</a>
            </div>
          </div>
          <div class="contact-item clickable" @click="showServiceDialog = true">
            <el-icon><ChatDotRound /></el-icon>
            <div>
              <span class="label">在线客服</span>
              <span class="link">点击咨询 →</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section>
      <h2><el-icon><Lock /></el-icon> 数据安全</h2>
      <div class="security-grid">
        <div class="security-item">
          <div class="security-icon">🔐</div>
          <h4>数据加密存储</h4>
          <p>所有数据采用AES-256加密存储</p>
        </div>
        <div class="security-item">
          <div class="security-icon">💾</div>
          <h4>定期数据备份</h4>
          <p>每日自动备份，保留30天历史</p>
        </div>
        <div class="security-item">
          <div class="security-icon">🌐</div>
          <h4>多地容灾部署</h4>
          <p>多机房部署，保障服务稳定</p>
        </div>
        <div class="security-item">
          <div class="security-icon">🔒</div>
          <h4>SSL加密传输</h4>
          <p>全站HTTPS，数据传输安全</p>
        </div>
      </div>
    </section>

    <section>
      <h2><el-icon><QuestionFilled /></el-icon> 常见问题</h2>
      <el-collapse accordion>
        <el-collapse-item title="试用期多长？" name="1">
          <div class="faq-answer">
            <p>免费试用期为7天，试用期内可使用全部功能。试用期结束后需要购买套餐继续使用。</p>
          </div>
        </el-collapse-item>
        <el-collapse-item title="数据可以导出吗？" name="2">
          <div class="faq-answer">
            <p>可以。系统支持客户数据、订单数据等导出功能，您可以随时导出您的数据。</p>
          </div>
        </el-collapse-item>
        <el-collapse-item title="可以转为私有部署吗？" name="3">
          <div class="faq-answer">
            <p>可以。联系客服了解私有部署方案，我们会协助您完成数据迁移。</p>
            <div class="contact-inline">
              <span>联系方式：</span>
              <a href="mailto:xianhuquwang@163.com">xianhuquwang@163.com</a>
              <span> | </span>
              <a href="tel:13570727364">135-7072-7364</a>
            </div>
          </div>
        </el-collapse-item>
        <el-collapse-item title="授权码丢失怎么办？" name="4">
          <div class="faq-answer">
            <p>请联系客服，提供注册时的企业信息和手机号，我们会帮您找回授权码。</p>
          </div>
        </el-collapse-item>
        <el-collapse-item title="如何续费？" name="5">
          <div class="faq-answer">
            <p>套餐到期前会收到续费提醒，请联系客服进行续费操作。</p>
          </div>
        </el-collapse-item>
      </el-collapse>
    </section>

    <section>
      <h2><el-icon><Service /></el-icon> 技术支持</h2>
      <div class="support-card">
        <div class="qr-section">
          <img src="/images/kefuQR.png" alt="微信客服二维码" class="qr-image" />
          <p>微信扫码添加客服</p>
        </div>
        <div class="support-info">
          <h4>联系我们</h4>
          <div class="support-item">
            <el-icon><Message /></el-icon>
            <span>邮箱：xianhuquwang@163.com</span>
          </div>
          <div class="support-item">
            <el-icon><Phone /></el-icon>
            <span>电话：135-7072-7364</span>
          </div>
          <div class="support-item">
            <el-icon><Clock /></el-icon>
            <span>工作时间：周一至周五 9:00-18:00</span>
          </div>
          <a
            href="https://work.weixin.qq.com/kfid/kfc461ca9f5b45c8d25"
            target="_blank"
            class="chat-btn"
          >
            <el-icon><ChatLineRound /></el-icon>
            <span>在线咨询</span>
          </a>
        </div>
      </div>
    </section>

    <!-- 客服弹窗 -->
    <el-dialog
      v-model="showServiceDialog"
      title="联系客服"
      width="360px"
      :append-to-body="true"
    >
      <div class="dialog-content">
        <div class="qr-wrapper">
          <img src="/images/kefuQR.png" alt="微信客服二维码" />
        </div>
        <p class="qr-tip">微信扫一扫，添加专属客服</p>
        <div class="divider"><span>或</span></div>
        <a
          href="https://work.weixin.qq.com/kfid/kfc461ca9f5b45c8d25"
          target="_blank"
          class="online-btn"
        >
          <el-icon><ChatLineRound /></el-icon>
          <span>点击在线咨询</span>
        </a>
        <p class="work-time">工作时间：周一至周五 9:00-18:00</p>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
  Cloudy, UserFilled, Key, Goods, Top, Lock, QuestionFilled, Service,
  Message, Phone, ChatDotRound, ChatLineRound, Clock, InfoFilled, WarningFilled
} from '@element-plus/icons-vue'

const showServiceDialog = ref(false)

const packages = [
  { name: '免费版', users: '3人', storage: '1GB', features: '基础功能', price: '免费' },
  { name: '标准版', users: '10人', storage: '10GB', features: '全部功能', price: '¥299/月' },
  { name: '专业版', users: '50人', storage: '50GB', features: '全部功能+优先支持', price: '¥999/月' },
  { name: '企业版', users: '不限', storage: '200GB', features: '全部功能+专属服务', price: '¥2999/月' }
]
</script>

<style scoped>
.help-content {
  line-height: 1.8;
  color: #333;
}

.help-content h1 {
  font-size: 28px;
  color: #1a1a1a;
  margin-bottom: 30px;
  padding-bottom: 15px;
  border-bottom: 2px solid #409eff;
}

.help-content h2 {
  font-size: 20px;
  color: #303133;
  margin: 35px 0 20px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.help-content h4 {
  font-size: 15px;
  color: #303133;
  margin: 10px 0;
}

.help-content p {
  margin: 10px 0;
  color: #606266;
}

.help-content ol, .help-content ul {
  margin: 10px 0;
  padding-left: 20px;
}

.help-content li {
  margin: 8px 0;
  color: #606266;
}

section {
  margin-bottom: 40px;
}

.intro-section {
  margin-bottom: 30px;
}

.intro-card {
  display: flex;
  align-items: flex-start;
  gap: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 25px;
  border-radius: 12px;
  color: white;
}

.intro-icon {
  font-size: 48px;
  opacity: 0.9;
}

.intro-text p {
  margin: 0;
  color: white;
  font-size: 15px;
  line-height: 1.8;
}

.step-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 15px;
  margin: 20px 0;
}

.step-card {
  display: flex;
  gap: 12px;
  padding: 15px;
  background: #f5f7fa;
  border-radius: 8px;
}

.step-num {
  width: 28px;
  height: 28px;
  background: #409eff;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 14px;
  flex-shrink: 0;
}

.step-content h4 {
  margin: 0 0 5px;
  font-size: 14px;
}

.step-content p {
  margin: 0;
  font-size: 12px;
  color: #909399;
}

.tip-box {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 15px;
  border-radius: 8px;
  margin: 15px 0;
  font-size: 14px;
}

.tip-box.info {
  background: #ecf5ff;
  border: 1px solid #d9ecff;
  color: #409eff;
}

.upgrade-notice {
  display: flex;
  gap: 15px;
  padding: 15px 20px;
  background: #fdf6ec;
  border: 1px solid #faecd8;
  border-radius: 8px;
  margin: 15px 0;
}

.upgrade-notice .el-icon {
  font-size: 24px;
  color: #e6a23c;
}

.upgrade-notice strong {
  color: #e6a23c;
  display: block;
  margin-bottom: 5px;
}

.upgrade-notice p {
  margin: 0;
  font-size: 14px;
}

.contact-card {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 12px;
  margin: 20px 0;
}

.contact-card h4 {
  margin: 0 0 15px;
  color: #303133;
}

.contact-methods {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.contact-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 15px;
  background: white;
  border-radius: 8px;
  min-width: 200px;
}

.contact-item.clickable {
  cursor: pointer;
  transition: all 0.3s;
}

.contact-item.clickable:hover {
  background: #ecf5ff;
  transform: translateY(-2px);
}

.contact-item .el-icon {
  font-size: 20px;
  color: #409eff;
}

.contact-item .label {
  display: block;
  font-size: 12px;
  color: #909399;
}

.contact-item a {
  color: #303133;
  text-decoration: none;
}

.contact-item a:hover {
  color: #409eff;
}

.contact-item .link {
  color: #409eff;
  font-weight: 500;
}

.security-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 15px;
  margin: 20px 0;
}

.security-item {
  text-align: center;
  padding: 20px;
  background: #f5f7fa;
  border-radius: 12px;
}

.security-icon {
  font-size: 32px;
  margin-bottom: 10px;
}

.security-item h4 {
  margin: 10px 0 5px;
  font-size: 14px;
}

.security-item p {
  margin: 0;
  font-size: 12px;
  color: #909399;
}

.faq-answer {
  padding: 10px 0;
}

.contact-inline {
  margin-top: 10px;
  padding: 10px;
  background: #f5f7fa;
  border-radius: 6px;
  font-size: 13px;
}

.contact-inline a {
  color: #409eff;
  text-decoration: none;
}

.support-card {
  display: flex;
  gap: 30px;
  padding: 25px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e7ed 100%);
  border-radius: 12px;
  margin: 20px 0;
}

.qr-section {
  text-align: center;
}

.qr-image {
  width: 150px;
  height: 150px;
  padding: 10px;
  background: white;
  border-radius: 8px;
}

.qr-section p {
  margin: 10px 0 0;
  font-size: 13px;
  color: #909399;
}

.support-info {
  flex: 1;
}

.support-info h4 {
  margin: 0 0 15px;
  color: #303133;
}

.support-item {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 10px 0;
  color: #606266;
}

.support-item .el-icon {
  color: #409eff;
}

.chat-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 15px;
  padding: 12px 24px;
  background: #07c160;
  color: white;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 500;
  transition: all 0.3s;
}

.chat-btn:hover {
  background: #06ae56;
  transform: translateY(-2px);
}

/* 弹窗样式 */
.dialog-content {
  text-align: center;
  padding: 10px 0;
}

.qr-wrapper {
  width: 180px;
  height: 180px;
  margin: 0 auto 15px;
  padding: 10px;
  background: #f8fafc;
  border-radius: 12px;
  border: 2px dashed #e2e8f0;
}

.qr-wrapper img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.qr-tip {
  font-size: 14px;
  color: #606266;
  margin: 0 0 15px;
}

.divider {
  display: flex;
  align-items: center;
  margin: 15px 0;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #e2e8f0;
}

.divider span {
  padding: 0 12px;
  font-size: 12px;
  color: #909399;
}

.online-btn {
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
  text-decoration: none;
  transition: all 0.3s ease;
}

.online-btn:hover {
  background: #06ae56;
}

.work-time {
  margin: 15px 0 0;
  font-size: 12px;
  color: #909399;
}

@media (max-width: 1200px) {
  .step-cards {
    grid-template-columns: repeat(2, 1fr);
  }

  .security-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .step-cards,
  .security-grid {
    grid-template-columns: 1fr;
  }

  .support-card {
    flex-direction: column;
    align-items: center;
  }

  .contact-methods {
    flex-direction: column;
  }
}
</style>
