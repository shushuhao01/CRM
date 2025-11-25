<template>
  <div class="login-container">
    <!-- 背景装饰 -->
    <div class="bg-decoration">
      <div class="circle circle-1"></div>
      <div class="circle circle-2"></div>
      <div class="circle circle-3"></div>
    </div>

    <!-- 登录卡片 -->
    <div class="login-card">
      <!-- 顶部Logo区域 -->
      <div class="logo-section">
        <div class="logo-icon">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <rect width="48" height="48" rx="10" fill="url(#logo-gradient)" />
            <path d="M14 24L20 30L34 16" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
            <defs>
              <linearGradient id="logo-gradient" x1="0" y1="0" x2="48" y2="48">
                <stop offset="0%" stop-color="#4F46E5" />
                <stop offset="100%" stop-color="#7C3AED" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <h1 class="system-title">智能销售管理系统</h1>
        <p class="system-subtitle">CRM Customer Relationship Management</p>
      </div>

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
              <a href="javascript:void(0)" @click="showAgreementDialog('user')">《用户协议》</a>
              和
              <a href="javascript:void(0)" @click="showAgreementDialog('privacy')">《隐私政策》</a>
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
            {{ loading ? '登录中...' : '登录' }}
          </el-button>
        </el-form-item>
      </el-form>

      <!-- 底部信息 -->
      <div class="card-footer">
        <p>© 2025 智能销售管理系统</p>
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
      <div class="agreement-content" v-html="agreementDialogContent"></div>
      <template #footer>
        <el-button @click="agreementDialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="agreeAndClose">
          我已阅读并同意
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { createSafeNavigator } from '@/utils/navigation'
import { useUserStore } from '@/stores/user'
import { useConfigStore } from '@/stores/config'
import { ElMessage } from 'element-plus'
import type { FormInstance } from 'element-plus'

const router = useRouter()
const safeNavigator = createSafeNavigator(router)
const userStore = useUserStore()
const configStore = useConfigStore()

const loading = ref(false)
const loginFormRef = ref<FormInstance>()

const loginForm = reactive({
  username: '',
  password: ''
})

// 🔥 批次275新增：用户协议相关
const agreeToTerms = ref(false)
const agreementDialogVisible = ref(false)
const agreementDialogTitle = ref('')
const agreementDialogContent = ref('')
const currentAgreementType = ref<'user' | 'privacy'>('user')

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6位', trigger: 'blur' }
  ]
}

// 🔥 批次275新增：获取默认协议内容
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
  <li><strong>客服电话：</strong>${configStore.systemConfig.contactPhone || '400-xxx-xxxx'}</li>
  <li><strong>客服邮箱：</strong>${configStore.systemConfig.contactEmail || 'service@example.com'}</li>
  <li><strong>公司地址：</strong>${configStore.systemConfig.companyAddress || '请在系统设置中配置'}</li>
</ul>
<p style="color: #606266;">我们将在收到您的反馈后15个工作日内予以回复。</p>

<p style="color: #909399; margin-top: 30px; font-size: 12px;">最后更新日期：${new Date().toLocaleDateString('zh-CN')}</p>
</div>`
}

// 显示协议弹窗
const showAgreementDialog = (type: 'user' | 'privacy') => {
  currentAgreementType.value = type

  // 🔥 批次289修复：从localStorage读取协议列表
  const agreementList = JSON.parse(localStorage.getItem('crm_agreement_list') || '[]')

  if (type === 'user') {
    agreementDialogTitle.value = '用户使用协议'
    // 查找用户协议
    const userAgreement = agreementList.find((item: any) => item.type === 'user')
    agreementDialogContent.value = userAgreement?.content || configStore.systemConfig.userAgreement || getDefaultUserAgreement()
  } else {
    agreementDialogTitle.value = '用户隐私协议'
    // 查找隐私协议
    const privacyAgreement = agreementList.find((item: unknown) => item.type === 'privacy')
    agreementDialogContent.value = privacyAgreement?.content || configStore.systemConfig.privacyPolicy || getDefaultPrivacyPolicy()
  }

  agreementDialogVisible.value = true
}

// 同意并关闭
const agreeAndClose = () => {
  agreeToTerms.value = true
  agreementDialogVisible.value = false
  ElMessage.success('感谢您同意我们的协议')
}

// 🔥 批次275新增：初始化配置和协议状态
configStore.initConfig()

// 检查是否已经同意过协议（记住用户选择）
const agreedBefore = localStorage.getItem('user_agreed_terms')
if (agreedBefore === 'true') {
  agreeToTerms.value = true
}

// 防抖计时器
let loginDebounceTimer: NodeJS.Timeout | null = null

const handleLogin = async () => {
  // 🔥 批次275新增：验证协议勾选
  if (!agreeToTerms.value) {
    ElMessage.warning('请先阅读并同意《用户使用协议》和《用户隐私协议》')
    return
  }

  if (!loginFormRef.value) return

  // 防抖处理：如果用户快速点击，清除之前的计时器
  if (loginDebounceTimer) {
    clearTimeout(loginDebounceTimer)
  }

  // 如果正在登录中，直接返回
  if (loading.value) {
    ElMessage.warning('正在登录中，请稍候...')
    return
  }

  await loginFormRef.value.validate(async (valid) => {
    if (valid) {
      loading.value = true
      try {
        const result = await userStore.loginWithRetry(
          loginForm.username,
          loginForm.password,
          false, // rememberMe
          3 // 最多重试3次
        )

        if (result) {
          // 🔥 批次275新增：记住用户同意协议
          localStorage.setItem('user_agreed_terms', 'true')

          ElMessage.success('登录成功')

          // 等待状态同步完成
          await nextTick()

          // 检查是否需要强制修改密码
          if (userStore.currentUser?.forcePasswordChange) {
            safeNavigator.push('/change-password')
          } else {
            // 登录成功后直接跳转，不刷新页面
            await safeNavigator.push('/')
          }
        } else {
          ElMessage.error('登录失败')
        }
      } catch (error: unknown) {
        console.error('登录错误:', error)
        const errorMessage = error instanceof Error ? error.message : '登录失败，请检查用户名和密码'
        ElMessage.error(errorMessage)

        // 如果是频率限制错误，禁用登录按钮
        if (error instanceof Error && (error.message.includes('频繁') || error.message.includes('429') || error.message === 'RATE_LIMITED')) {
          setTimeout(() => {
            loading.value = false
          }, 30000)
          ElMessage.warning('登录尝试过于频繁，按钮已禁用30秒')
          return
        }
      } finally {
        // 正常情况下，延迟1秒后恢复按钮状态，防止快速重复点击
        loginDebounceTimer = setTimeout(() => {
          loading.value = false
        }, 1000)
      }
    }
  })
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: relative;
  overflow: hidden;
}

/* 背景装饰 */
.bg-decoration {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  pointer-events: none;
}

.circle {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  animation: float 20s infinite ease-in-out;
}

.circle-1 {
  width: 300px;
  height: 300px;
  top: -100px;
  right: -100px;
  animation-delay: 0s;
}

.circle-2 {
  width: 200px;
  height: 200px;
  bottom: -50px;
  left: -50px;
  animation-delay: 5s;
}

.circle-3 {
  width: 150px;
  height: 150px;
  top: 50%;
  left: 10%;
  animation-delay: 10s;
}

@keyframes float {
  0%, 100% {
    transform: translate(0, 0) scale(1);
  }
  33% {
    transform: translate(30px, -30px) scale(1.1);
  }
  66% {
    transform: translate(-20px, 20px) scale(0.9);
  }
}

/* 登录卡片 */
.login-card {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 420px;
  background: white;
  border-radius: 16px;
  padding: 48px 40px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
}

/* Logo区域 */
.logo-section {
  text-align: center;
  margin-bottom: 40px;
}

.logo-icon {
  display: inline-block;
  margin-bottom: 20px;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

.system-title {
  font-size: 24px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 8px 0;
  letter-spacing: -0.5px;
}

.system-subtitle {
  font-size: 12px;
  color: #999;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-weight: 500;
}

/* 表单样式 */
.login-form {
  width: 100%;
}

.login-form :deep(.el-form-item) {
  margin-bottom: 20px;
}

.login-form :deep(.el-input__wrapper) {
  border-radius: 10px;
  padding: 12px 16px;
  box-shadow: 0 0 0 1px #e5e7eb;
  transition: all 0.3s;
  background: #f9fafb;
}

.login-form :deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #d1d5db;
  background: white;
}

.login-form :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 2px #4F46E5;
  background: white;
}

.login-form :deep(.el-input__inner) {
  font-size: 14px;
}

.login-form :deep(.el-input__prefix) {
  color: #9ca3af;
}

/* 协议勾选 */
.agreement-item {
  margin-bottom: 24px !important;
}

.agreement-item :deep(.el-checkbox) {
  height: auto;
  line-height: 1.6;
}

.agreement-item :deep(.el-checkbox__label) {
  white-space: normal;
  line-height: 1.6;
}

.agreement-text {
  font-size: 12px;
  color: #6b7280;
}

.agreement-text a {
  color: #4F46E5;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s;
}

.agreement-text a:hover {
  color: #7C3AED;
  text-decoration: underline;
}

/* 登录按钮 */
.login-button {
  width: 100%;
  height: 48px;
  font-size: 15px;
  font-weight: 600;
  border-radius: 10px;
  background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
  border: none;
  transition: all 0.3s;
  box-shadow: 0 4px 14px rgba(79, 70, 229, 0.4);
  letter-spacing: 0.5px;
}

.login-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(79, 70, 229, 0.5);
}

.login-button:active:not(:disabled) {
  transform: translateY(0);
}

.login-button:disabled {
  background: #e5e7eb;
  box-shadow: none;
  cursor: not-allowed;
  opacity: 0.6;
}

/* 底部信息 */
.card-footer {
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid #f3f4f6;
  text-align: center;
}

.card-footer p {
  font-size: 12px;
  color: #9ca3af;
  margin: 0;
}

/* 🔥 批次282优化：协议弹窗美化排版 */
.agreement-dialog :deep(.el-dialog) {
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.15);
}

.agreement-dialog :deep(.el-dialog__header) {
  padding: 24px 32px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-bottom: none;
}

.agreement-dialog :deep(.el-dialog__title) {
  font-size: 20px;
  font-weight: 600;
  color: #ffffff;
  letter-spacing: 0.5px;
}

.agreement-dialog :deep(.el-dialog__headerbtn .el-dialog__close) {
  color: #ffffff;
  font-size: 20px;
}

.agreement-dialog :deep(.el-dialog__headerbtn .el-dialog__close):hover {
  color: #f0f0f0;
}

.agreement-dialog :deep(.el-dialog__body) {
  padding: 32px;
  max-height: 65vh;
  overflow-y: auto;
  background: #fafbfc;
}

.agreement-dialog :deep(.el-dialog__footer) {
  padding: 20px 32px;
  border-top: 1px solid #e8eaed;
  background: #ffffff;
}

/* 协议内容样式 - 美化排版 */
.agreement-content {
  font-size: 14px;
  line-height: 2;
  color: #333;
  background: #ffffff;
  padding: 28px;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

/* 一级标题 */
.agreement-content :deep(h2) {
  margin: 0 0 24px 0;
  padding-bottom: 16px;
  font-size: 24px;
  font-weight: 700;
  color: #1a1a1a;
  border-bottom: 3px solid #667eea;
  letter-spacing: 1px;
  text-align: center;
}

/* 二级标题 */
.agreement-content :deep(h3) {
  margin: 32px 0 16px 0;
  padding-left: 16px;
  font-size: 18px;
  font-weight: 600;
  color: #667eea;
  border-left: 4px solid #667eea;
  background: linear-gradient(90deg, rgba(102, 126, 234, 0.08) 0%, transparent 100%);
  padding: 10px 16px;
  border-radius: 4px;
}

/* 段落 */
.agreement-content :deep(p) {
  margin: 16px 0;
  padding: 0 8px;
  color: #4a5568;
  text-align: justify;
  text-indent: 2em;
}

/* 无缩进段落（用于小标题后的说明） */
.agreement-content :deep(p strong) {
  color: #2d3748;
  font-weight: 600;
}

/* 列表 */
.agreement-content :deep(ul) {
  margin: 16px 0;
  padding-left: 40px;
  list-style: none;
}

.agreement-content :deep(ul li) {
  margin: 12px 0;
  padding-left: 24px;
  color: #4a5568;
  position: relative;
  line-height: 1.8;
}

.agreement-content :deep(ul li)::before {
  content: "▸";
  position: absolute;
  left: 0;
  color: #667eea;
  font-weight: bold;
  font-size: 16px;
}

/* 嵌套列表 */
.agreement-content :deep(ul ul) {
  margin: 8px 0;
  padding-left: 24px;
}

.agreement-content :deep(ul ul li)::before {
  content: "◦";
  font-size: 14px;
}

/* 重要提示 - 红色加粗 */
.agreement-content :deep(p[style*="color: #f56c6c"]),
.agreement-content :deep(p[style*="color:#f56c6c"]) {
  background: linear-gradient(90deg, rgba(245, 108, 108, 0.1) 0%, transparent 100%);
  padding: 12px 16px;
  border-left: 4px solid #f56c6c;
  border-radius: 4px;
  margin: 20px 0;
  text-indent: 0;
}

/* 底部信息 */
.agreement-content :deep(p[style*="color: #909399"]),
.agreement-content :deep(p[style*="color:#909399"]) {
  text-align: center;
  font-size: 12px;
  color: #909399;
  margin-top: 32px;
  padding-top: 20px;
  border-top: 1px dashed #e0e0e0;
  text-indent: 0;
}

/* 滚动条美化 */
.agreement-dialog :deep(.el-dialog__body)::-webkit-scrollbar {
  width: 8px;
}

.agreement-dialog :deep(.el-dialog__body)::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.agreement-dialog :deep(.el-dialog__body)::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.agreement-dialog :deep(.el-dialog__body)::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .login-card {
    padding: 40px 32px;
    max-width: 100%;
  }

  .system-title {
    font-size: 22px;
  }
}

@media (max-width: 480px) {
  .login-container {
    padding: 16px;
  }

  .login-card {
    padding: 32px 24px;
    border-radius: 12px;
  }

  .system-title {
    font-size: 20px;
  }

  .system-subtitle {
    font-size: 11px;
  }

  .login-button {
    height: 44px;
    font-size: 14px;
  }
}
</style>
