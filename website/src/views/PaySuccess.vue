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
              <a v-if="crmUrl" :href="crmUrl" target="_blank">{{ crmUrl }}</a>
              <span v-else>请联系管理员获取系统地址</span>
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
            <span class="info-value code" :class="{ 'no-key': !hasRealLicenseKey }">
              {{ licenseKey }}
              <button v-if="hasRealLicenseKey" class="copy-btn" @click="copyText(licenseKey)">复制</button>
            </span>
          </div>
          <div class="info-item">
            <span class="info-label">管理员账号</span>
            <span class="info-value code" v-if="adminUsername">
              {{ adminUsername }}
              <button class="copy-btn" @click="copyText(adminUsername)">复制</button>
            </span>
            <span class="info-value placeholder" v-else>与注册手机号相同</span>
          </div>
          <div class="info-item">
            <span class="info-label">初始密码</span>
            <span class="info-value code" v-if="adminPassword">
              {{ adminPassword }}
              <button class="copy-btn" @click="copyText(adminPassword)">复制</button>
              <em class="warning">（请登录后立即修改）</em>
            </span>
            <span class="info-value placeholder" v-else>Aa123456 <em class="warning">（请登录后立即修改）</em></span>
          </div>
          <div class="info-item" v-if="memberPwdDefault">
            <span class="info-label">会员中心密码</span>
            <span class="info-value code">
              Aa123456
              <button class="copy-btn" @click="copyText('Aa123456')">复制</button>
              <em class="warning">（初始密码，请登录会员中心后修改）</em>
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
        </div>

        <div class="copy-all-section">
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
            <li>在登录页点击 🔑 图标，选择"SaaS租户"</li>
            <li>输入您的租户授权码进行激活</li>
            <li>使用管理员账号和初始密码登录</li>
            <li>登录后请立即修改密码</li>
          </ol>
        </div>

        <div class="action-buttons">
          <a v-if="crmUrl" :href="crmUrl" target="_blank" class="btn btn-primary btn-lg">
            立即登录系统
          </a>
          <router-link to="/member/dashboard" class="btn btn-outline btn-lg">
            👤 进入会员中心
          </router-link>
          <router-link to="/docs" class="btn btn-outline btn-lg">
            查看使用文档
          </router-link>
        </div>
      </div>

      <!-- 私有部署版本 -->
      <div v-else class="info-card private-deploy-card">
        <h3>🎉 您的授权已生成</h3>
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
          <div class="info-item">
            <span class="info-label">默认管理员账号</span>
            <span class="info-value placeholder">与您注册官网时的手机号相同</span>
          </div>
          <div class="info-item">
            <span class="info-label">默认初始密码</span>
            <span class="info-value code">
              Aa123456
              <button class="copy-btn" @click="copyText('Aa123456')">复制</button>
              <em class="warning">（部署激活后请立即修改）</em>
            </span>
          </div>
          <div class="info-item" v-if="memberPwdDefault">
            <span class="info-label">会员中心密码</span>
            <span class="info-value code">
              Aa123456
              <button class="copy-btn" @click="copyText('Aa123456')">复制</button>
              <em class="warning">（初始密码，请登录会员中心后修改）</em>
            </span>
          </div>
        </div>

        <div class="private-admin-notice">
          <div class="notice-icon">💡</div>
          <div class="notice-text">
            <strong>关于管理员账号</strong>
            <p>系统部署完成并输入授权码激活后，将自动使用您在官网注册时的手机号创建管理员账号，初始密码为 <code>Aa123456</code>。请首次登录后 <strong>立即修改密码</strong>。</p>
          </div>
        </div>

        <div class="copy-all-section">
          <button class="copy-all-btn" @click="copyPrivateInfo">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            一键复制授权信息
          </button>
        </div>

        <!-- 📦 获取部署代码 -->
        <div class="code-download-section">
          <h4>📦 获取部署代码</h4>
          <p class="section-desc">购买私有部署后，您可以通过以下方式获取系统源码，部署到您自己的服务器上。</p>

          <div v-if="versionLoading" class="download-loading">
            <span class="loading-spinner">⏳</span>
            <span>正在获取最新版本信息...</span>
          </div>

          <div v-else-if="hasVersionDownload" class="download-options">
            <div class="version-badge">
              <span class="version-tag">最新版本</span>
              <span class="version-num">v{{ versionNumber }}</span>
              <span v-if="versionPublishedAt" class="version-date">发布于 {{ versionPublishedAt }}</span>
            </div>

            <!-- 方式一：文件下载 -->
            <div v-if="versionDownloadUrl && versionSourceType !== 'git'" class="download-option-card">
              <div class="option-header">
                <span class="option-icon">📁</span>
                <div class="option-title-area">
                  <strong>方式一：直接下载压缩包</strong>
                  <span class="option-tag recommended">推荐新手</span>
                </div>
              </div>
              <p class="option-desc">下载完整项目压缩包到本地，解压后即可部署。适合不熟悉 Git 的用户。</p>
              <div class="option-meta" v-if="versionFileSize">
                <span>📊 文件大小：{{ versionFileSize }}</span>
              </div>
              <div class="option-actions">
                <a :href="versionDownloadUrl" target="_blank" class="download-action-btn primary">
                  ⬇️ 下载压缩包 (v{{ versionNumber }})
                </a>
                <button class="download-action-btn outline" @click="copyText(versionDownloadUrl)">
                  📋 复制下载链接
                </button>
              </div>
              <div class="option-steps">
                <p><strong>下载后操作：</strong></p>
                <ol>
                  <li>将压缩包上传到服务器（或解压到本地电脑）</li>
                  <li>解压到目标目录，如 <code>/www/wwwroot/CRM</code> 或 <code>D:\CRM</code></li>
                  <li>按照下方「部署教程」配置数据库和环境变量</li>
                  <li>执行部署脚本完成安装</li>
                </ol>
              </div>
            </div>

            <!-- 方式二：Git 克隆 -->
            <div v-if="versionGitUrl" class="download-option-card">
              <div class="option-header">
                <span class="option-icon">🔗</span>
                <div class="option-title-area">
                  <strong>{{ versionDownloadUrl && versionSourceType !== 'git' ? '方式二' : '方式一' }}：Git 克隆仓库</strong>
                  <span class="option-tag" :class="{ recommended: versionSourceType === 'git' }">{{ versionSourceType === 'git' ? '推荐' : '适合开发者' }}</span>
                </div>
              </div>
              <p class="option-desc">通过 Git 克隆项目仓库，方便后续拉取更新。需要服务器已安装 Git。</p>
              <div class="option-meta">
                <span>🌿 分支：{{ versionGitBranch }}</span>
                <span v-if="versionGitTag">🏷️ 标签：{{ versionGitTag }}</span>
              </div>
              <div class="code-block">
                <code>{{ versionGitCloneCmd }}</code>
                <button class="code-copy-btn" @click="copyText(versionGitCloneCmd)">复制</button>
              </div>
              <div class="option-actions">
                <a :href="versionGitUrl.replace(/\.git$/, '')" target="_blank" class="download-action-btn outline">
                  🌐 在浏览器中查看仓库
                </a>
                <button class="download-action-btn outline" @click="copyText(versionGitUrl)">
                  📋 复制仓库地址
                </button>
              </div>
              <div class="option-steps">
                <p><strong>Git 克隆操作步骤：</strong></p>
                <ol>
                  <li>确保服务器或本地已安装 Git（<code>git --version</code> 检查）</li>
                  <li>进入目标目录：<code>cd /www/wwwroot</code>（服务器）或 <code>cd D:\</code>（本地）</li>
                  <li>执行上方的 git clone 命令</li>
                  <li>进入项目目录后按照下方「部署教程」继续操作</li>
                  <li>后续更新只需 <code>cd CRM && git pull</code> 即可获取新版本</li>
                </ol>
              </div>
            </div>

            <!-- 两种方式都有时的对比说明 -->
            <div v-if="versionDownloadUrl && versionSourceType !== 'git' && versionGitUrl" class="download-compare-tip">
              <span class="compare-icon">💡</span>
              <div>
                <strong>如何选择？</strong>
                <p>• <strong>压缩包下载</strong>：操作简单，适合新手，但每次更新需要重新下载</p>
                <p>• <strong>Git 克隆</strong>：初次操作稍复杂，但后续更新只需一条命令 <code>git pull</code></p>
              </div>
            </div>
          </div>

          <!-- 暂无发布版本——但仍可通过默认公开仓库获取代码 -->
          <div v-else class="download-empty">
            <div class="empty-icon">📦</div>
            <p><strong>通过公开仓库获取部署代码</strong></p>
            <p class="empty-hint">您可以直接从 GitHub 公开仓库克隆系统代码进行部署：</p>
            <div class="code-block" style="margin: 14px 0 10px;">
              <code>git clone {{ DEFAULT_GIT_REPO }} CRM</code>
              <button class="code-copy-btn" @click="copyText(`git clone ${DEFAULT_GIT_REPO} CRM`)">复制</button>
            </div>
            <div style="display: flex; gap: 10px; margin-top: 14px; flex-wrap: wrap; justify-content: center;">
              <a href="https://github.com/shushuhao01/crm-system" target="_blank" class="download-action-btn outline">
                🌐 在浏览器查看仓库
              </a>
              <a href="https://github.com/shushuhao01/crm-system/releases" target="_blank" class="download-action-btn outline">
                📥 下载压缩包
              </a>
              <a :href="customerServiceUrl" target="_blank" class="download-action-btn outline">
                💬 联系客服
              </a>
            </div>
          </div>
        </div>

        <!-- 🔍 引导问题：帮助选择部署方式 -->
        <div class="deploy-guide-section">
          <h4>📋 几个问题帮您找到最佳部署方案</h4>
          <p class="guide-desc">请根据实际情况选择，我们为您推荐最适合的部署方式：</p>

          <div class="guide-questions">
            <!-- Q1: 有没有云服务器 -->
            <div class="guide-question">
              <span class="guide-q-label">Q1: 您是否有阿里云、腾讯云等云服务器？</span>
              <div class="guide-options">
                <button :class="{ active: guideHasServer === 'yes' }" @click="onGuideServer('yes')">✅ 有云服务器</button>
                <button :class="{ active: guideHasServer === 'no' }" @click="onGuideServer('no')">❌ 没有云服务器</button>
              </div>
            </div>

            <!-- Q2: 有云服务器 → 有没有已备案域名 -->
            <div class="guide-question" v-if="guideHasServer === 'yes'">
              <span class="guide-q-label">Q2: 您是否有已备案的域名可使用？</span>
              <p class="guide-q-hint">（宝塔面板部署建议有备案域名，纯IP也可访问但不支持SSL证书）</p>
              <div class="guide-options">
                <button :class="{ active: guideHasDomain === 'yes' }" @click="guideHasDomain = 'yes'">✅ 有备案域名</button>
                <button :class="{ active: guideHasDomain === 'ip' }" @click="guideHasDomain = 'ip'">🌐 只有服务器IP</button>
              </div>
            </div>

            <!-- Q3: 有云服务器 → 宝塔面板还是纯命令行 -->
            <div class="guide-question" v-if="guideHasServer === 'yes'">
              <span class="guide-q-label">Q3: 您是否已安装或打算安装宝塔面板？</span>
              <p class="guide-q-hint">（宝塔面板提供可视化界面管理服务器，免费且安装简单，强烈推荐新手使用）</p>
              <div class="guide-options">
                <button :class="{ active: guidePanel === 'bt' }" @click="guidePanel = 'bt'">🚀 用宝塔面板（推荐）</button>
                <button :class="{ active: guidePanel === 'none' }" @click="guidePanel = 'none'">🐧 纯命令行操作</button>
              </div>
            </div>

            <!-- Q2b: 没有云服务器 → 本地电脑情况 -->
            <div class="guide-question" v-if="guideHasServer === 'no'">
              <span class="guide-q-label">Q2: 您有独立电脑可以做本地部署吗？</span>
              <div class="guide-options">
                <button :class="{ active: guideHasPC === 'yes' }" @click="guideHasPC = 'yes'">🖥️ 有，用自己电脑部署</button>
                <button :class="{ active: guideHasPC === 'no' }" @click="guideHasPC = 'no'">❓ 没有合适设备</button>
              </div>
            </div>

            <!-- Q3b: 有本地电脑 → 会不会装环境 -->
            <div class="guide-question" v-if="guideHasServer === 'no' && guideHasPC === 'yes'">
              <span class="guide-q-label">Q3: 您是否会下载安装 Node.js 和 MySQL？</span>
              <p class="guide-q-hint">（不会也没关系，部署教程中有详细安装步骤）</p>
              <div class="guide-options">
                <button :class="{ active: guideCanInstall === 'yes' }" @click="guideCanInstall = 'yes'">👍 会 / 能照教程操作</button>
                <button :class="{ active: guideCanInstall === 'no' }" @click="guideCanInstall = 'no'">🤔 不太确定，需要协助</button>
              </div>
            </div>
          </div>

          <!-- 推荐结果 -->
          <div class="guide-result" v-if="guideRecommendation">
            <span class="guide-result-icon">💡</span>
            <span class="guide-result-text" v-html="guideRecommendation"></span>
            <button v-if="guideRecommendTab" class="guide-go-btn" @click="deployTab = guideRecommendTab">
              查看部署教程 →
            </button>
          </div>

          <!-- 需要协助时的客服入口 -->
          <div class="guide-help-box" v-if="guideNeedHelp">
            <div class="help-box-content">
              <span class="help-box-icon">🛠️</span>
              <div class="help-box-text">
                <strong>不会部署？不用担心！</strong>
                <p>联系我们的技术客服，可免费提供远程部署协助服务</p>
              </div>
            </div>
            <a :href="customerServiceUrl" target="_blank" class="help-contact-btn">
              💬 联系客服协助部署
            </a>
          </div>
        </div>

        <!-- 🏷️ 部署方式标签页 -->
        <div class="deploy-tabs-section">
          <div class="deploy-tabs">
            <button class="deploy-tab" :class="{ active: deployTab === 'local' }" @click="deployTab = 'local'">
              🖥️ 本地电脑
            </button>
            <button class="deploy-tab" :class="{ active: deployTab === 'bt' }" @click="deployTab = 'bt'">
              🚀 宝塔面板
              <span class="tab-badge">推荐</span>
            </button>
            <button class="deploy-tab" :class="{ active: deployTab === 'linux' }" @click="deployTab = 'linux'">
              🐧 纯Linux
            </button>
          </div>

          <!-- ====== 本地电脑部署 ====== -->
          <div v-if="deployTab === 'local'" class="deploy-content">
            <div class="deploy-intro">
              <p>适合在 Windows / macOS 本地电脑上快速体验和测试CRM系统，<strong>不建议用于生产环境</strong>。</p>
            </div>

            <div class="deploy-method-toggle">
              <button :class="{ active: localMethod === 'quick' }" @click="localMethod = 'quick'">⚡ 一键部署（推荐）</button>
              <button :class="{ active: localMethod === 'manual' }" @click="localMethod = 'manual'">📝 手动部署</button>
            </div>

            <!-- 系统要求 -->
            <div class="requirements-box">
              <h5>📋 系统最低要求</h5>
              <div class="req-grid">
                <div class="req-item"><span class="req-label">操作系统</span><span class="req-value">Windows 10/11 或 macOS 12+</span></div>
                <div class="req-item"><span class="req-label">内存</span><span class="req-value">4GB 及以上（推荐 8GB）</span></div>
                <div class="req-item"><span class="req-label">磁盘空间</span><span class="req-value">至少 2GB 可用空间</span></div>
                <div class="req-item"><span class="req-label">浏览器</span><span class="req-value">Chrome / Edge / Firefox 最新版</span></div>
              </div>
            </div>

            <!-- 一键部署 -->
            <div v-if="localMethod === 'quick'" class="method-content">
              <div class="step-card">
                <div class="step-num">1</div>
                <div class="step-body">
                  <h5>安装 Node.js（JavaScript 运行环境）</h5>
                  <p>Node.js 是运行CRM后端服务的必要环境。请按以下步骤安装：</p>
                  <ol>
                    <li>打开浏览器，访问 <a href="https://nodejs.org/zh-cn" target="_blank">nodejs.org</a></li>
                    <li>点击下载 <strong>LTS（长期支持版）</strong>，推荐 20.x 版本</li>
                    <li>双击下载的安装包，一路点击「Next / 下一步」直到安装完成</li>
                    <li>验证安装：打开命令行（Windows: Win+R 输入 <code>cmd</code> 回车；macOS: 打开「终端」），输入：</li>
                  </ol>
                  <div class="code-block">
                    <code>node -v
npm -v</code>
                    <button class="code-copy-btn" @click="copyText('node -v\nnpm -v')">复制</button>
                  </div>
                  <p class="tip-text">✅ 如果分别显示版本号（如 v20.x.x 和 10.x.x），说明安装成功</p>
                </div>
              </div>
              <div class="step-card">
                <div class="step-num">2</div>
                <div class="step-body">
                  <h5>安装 MySQL 8.0（数据库）</h5>
                  <p>MySQL 用于存储CRM系统的所有数据。请按以下步骤安装：</p>
                  <ol>
                    <li>打开 <a href="https://dev.mysql.com/downloads/installer/" target="_blank">MySQL下载页</a></li>
                    <li><strong>Windows用户：</strong>下载 "MySQL Installer for Windows"（较大的那个），双击安装，选择 "Developer Default" 或 "Server only"</li>
                    <li><strong>macOS用户：</strong>下载 "MySQL Community Server" DMG 安装包，双击安装</li>
                    <li>安装过程中会要求设置 <strong>root 密码</strong>，<em class="warning">请务必记住此密码！</em>后续配置需要使用</li>
                    <li>安装完成后 MySQL 服务会自动启动</li>
                  </ol>
                  <p class="tip-text">💡 <strong>简便替代：</strong>也可以安装 <a href="https://www.xp.cn/" target="_blank">phpStudy（小皮面板）</a>，它自带 MySQL 和可视化管理界面，更适合新手</p>
                </div>
              </div>
              <div class="step-card">
                <div class="step-num">3</div>
                <div class="step-body">
                  <h5>下载项目代码</h5>
                  <p v-if="hasVersionDownload">使用上方「📦 获取部署代码」区域提供的方式下载项目代码，解压到本地目录。</p>
                  <p v-else>将收到的项目压缩包解压到本地目录。</p>
                  <ul>
                    <li><strong>Windows 推荐路径：</strong><code>D:\CRM</code> 或 <code>C:\CRM</code>（路径不要有中文和空格）</li>
                    <li><strong>macOS 推荐路径：</strong><code>~/CRM</code>（即用户主目录下）</li>
                  </ul>
                  <p class="tip-text">⚠️ 路径中不要包含中文、空格、特殊字符，否则可能导致构建失败</p>
                </div>
              </div>
              <div class="step-card">
                <div class="step-num">4</div>
                <div class="step-body">
                  <h5>创建数据库</h5>
                  <p>打开 MySQL 命令行或可视化工具（推荐 <a href="https://www.navicat.com.cn/download/navicat-premium" target="_blank">Navicat</a> 或免费的 <a href="https://dbeaver.io/download/" target="_blank">DBeaver</a>），执行以下 SQL：</p>
                  <div class="code-block">
                    <code>CREATE DATABASE crm_db DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;</code>
                    <button class="code-copy-btn" @click="copyText('CREATE DATABASE crm_db DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;')">复制</button>
                  </div>
                  <p>如果使用命令行操作：</p>
                  <div class="code-block">
                    <code>## Windows: 打开 cmd，输入
mysql -u root -p
## 输入你安装时设置的密码，然后执行：
CREATE DATABASE crm_db DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE crm_db;
SOURCE D:/CRM/database/schema.sql;
EXIT;</code>
                    <button class="code-copy-btn" @click="copyText('mysql -u root -p\nCREATE DATABASE crm_db DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\nUSE crm_db;\nSOURCE D:/CRM/database/schema.sql;\nEXIT;')">复制</button>
                  </div>
                  <p class="tip-text">💡 SOURCE 后面的路径请替换为你实际解压的项目路径</p>
                </div>
              </div>
              <div class="step-card">
                <div class="step-num">5</div>
                <div class="step-body">
                  <h5>配置环境变量</h5>
                  <p>进入项目的 <code>backend</code> 目录，找到 <code>.env.example</code> 文件：</p>
                  <ol>
                    <li>复制一份 <code>.env.example</code>，重命名为 <code>.env</code></li>
                    <li>用记事本或 VS Code 打开 <code>.env</code> 文件</li>
                    <li>修改以下关键配置（其他保持默认即可）：</li>
                  </ol>
                  <div class="code-block">
                    <code>DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=你安装MySQL时设置的密码
DB_DATABASE=crm_db
JWT_SECRET=请替换为一串随机字符（至少32位，如：abc123def456ghi789jkl012mno345pq）
PORT=3000</code>
                    <button class="code-copy-btn" @click="copyText('DB_HOST=localhost\nDB_PORT=3306\nDB_USERNAME=root\nDB_PASSWORD=你安装MySQL时设置的密码\nDB_DATABASE=crm_db\nJWT_SECRET=请替换为一串随机字符（至少32位）\nPORT=3000')">复制</button>
                  </div>
                  <p class="tip-text">⚠️ <code>DB_PASSWORD</code> 必须填写正确的 MySQL 密码，否则无法连接数据库</p>
                </div>
              </div>
              <div class="step-card highlight">
                <div class="step-num">6</div>
                <div class="step-body">
                  <h5>⚡ 执行一键部署脚本</h5>
                  <p>在项目根目录打开终端/命令行，执行对应系统的脚本：</p>
                  <div class="code-block">
                    <code>## Windows 用户：
## 方法1: 直接双击项目根目录的 build-local.bat
## 方法2: 打开 cmd，进入项目目录执行
cd D:\CRM
build-local.bat</code>
                    <button class="code-copy-btn" @click="copyText('cd D:\\CRM\nbuild-local.bat')">复制</button>
                  </div>
                  <div class="code-block">
                    <code>## macOS / Linux 用户：
cd ~/CRM
chmod +x build-local.sh
./build-local.sh</code>
                    <button class="code-copy-btn" @click="copyText('cd ~/CRM\nchmod +x build-local.sh\n./build-local.sh')">复制</button>
                  </div>
                  <div class="auto-steps-list">
                    <p>脚本将自动完成以下操作：</p>
                    <div class="auto-step-item">✅ 检查 Node.js 和 npm 版本</div>
                    <div class="auto-step-item">✅ 配置国内 npm 镜像加速</div>
                    <div class="auto-step-item">✅ 安装前端依赖（约5-8分钟）</div>
                    <div class="auto-step-item">✅ 安装后端依赖（约3-5分钟）</div>
                    <div class="auto-step-item">✅ 构建前端项目（约5-10分钟）</div>
                    <div class="auto-step-item">✅ 启动后端服务</div>
                  </div>
                  <p class="tip-text">⏱ 首次部署预计 15-25 分钟（取决于网速），请耐心等待，不要关闭终端窗口</p>
                </div>
              </div>
              <div class="step-card">
                <div class="step-num">7</div>
                <div class="step-body">
                  <h5>🎉 访问系统并激活授权</h5>
                  <p>部署完成后（终端提示 "Server started" 或类似成功信息），打开浏览器：</p>
                  <ol>
                    <li>访问 <a href="http://localhost:3000" target="_blank"><code>http://localhost:3000</code></a></li>
                    <li>在登录页面，点击左下角的 🔑 图标</li>
                    <li>在弹出的对话框中选择「私有部署」</li>
                    <li>粘贴上方的 <strong>系统授权码</strong>，点击「激活」</li>
                    <li>系统自动创建管理员账号（用户名：您注册时的手机号，密码：<code>Aa123456</code>）</li>
                    <li>使用管理员账号登录，<strong>登录后请立即修改密码！</strong></li>
                  </ol>
                </div>
              </div>

              <!-- 常见问题 -->
              <div class="faq-section">
                <h5>❓ 常见问题排查</h5>
                <div class="faq-item">
                  <strong>Q: 提示 "node 不是内部或外部命令"</strong>
                  <p>A: Node.js 没有安装成功或没有添加到环境变量。请重新安装 Node.js，安装时勾选 "Add to PATH"。</p>
                </div>
                <div class="faq-item">
                  <strong>Q: 提示 "Access denied for user 'root'" 数据库连接失败</strong>
                  <p>A: 请检查 <code>backend/.env</code> 文件中的 <code>DB_PASSWORD</code> 是否与您安装 MySQL 时设置的密码一致。</p>
                </div>
                <div class="faq-item">
                  <strong>Q: npm install 速度很慢或报错</strong>
                  <p>A: 请先设置国内镜像：<code>npm config set registry https://registry.npmmirror.com</code></p>
                </div>
                <div class="faq-item">
                  <strong>Q: 端口 3000 被占用</strong>
                  <p>A: 修改 <code>backend/.env</code> 中的 <code>PORT=3001</code>（或其他空闲端口），然后重新启动。</p>
                </div>
              </div>
            </div>

            <!-- 手动部署 -->
            <div v-if="localMethod === 'manual'" class="method-content">
              <div class="step-card">
                <div class="step-num">1</div>
                <div class="step-body">
                  <h5>安装环境依赖</h5>
                  <p>同一键部署的第1-2步，安装 <a href="https://nodejs.org/zh-cn" target="_blank">Node.js 20.x LTS</a> 和 <a href="https://dev.mysql.com/downloads/installer/" target="_blank">MySQL 8.0</a></p>
                </div>
              </div>
              <div class="step-card">
                <div class="step-num">2</div>
                <div class="step-body">
                  <h5>下载并解压项目代码</h5>
                  <p v-if="hasVersionDownload">使用上方「📦 获取部署代码」区域下载项目代码并解压到目标目录</p>
                  <p v-else>将收到的项目压缩包解压到本地目录（路径不含中文和空格）</p>
                </div>
              </div>
              <div class="step-card">
                <div class="step-num">3</div>
                <div class="step-body">
                  <h5>创建数据库并导入结构</h5>
                  <div class="code-block">
                    <code>mysql -u root -p
CREATE DATABASE crm_db DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE crm_db;
SOURCE database/schema.sql;</code>
                    <button class="code-copy-btn" @click="copyText('mysql -u root -p\nCREATE DATABASE crm_db DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\nUSE crm_db;\nSOURCE database/schema.sql;')">复制</button>
                  </div>
                </div>
              </div>
              <div class="step-card">
                <div class="step-num">4</div>
                <div class="step-body">
                  <h5>配置后端环境变量</h5>
                  <p>进入 <code>backend</code> 目录，复制 <code>.env.example</code> 为 <code>.env</code>，修改数据库密码和 JWT_SECRET（详见一键部署的第5步）</p>
                </div>
              </div>
              <div class="step-card">
                <div class="step-num">5</div>
                <div class="step-body">
                  <h5>安装依赖并构建</h5>
                  <div class="code-block">
                    <code>## 先设置国内镜像加速
npm config set registry https://registry.npmmirror.com

## 安装前端依赖并构建
npm install
npm run build

## 安装后端依赖并构建
cd backend
npm install
npm run build</code>
                    <button class="code-copy-btn" @click="copyText('npm config set registry https://registry.npmmirror.com\nnpm install\nnpm run build\ncd backend\nnpm install\nnpm run build')">复制</button>
                  </div>
                </div>
              </div>
              <div class="step-card">
                <div class="step-num">6</div>
                <div class="step-body">
                  <h5>启动后端服务</h5>
                  <div class="code-block">
                    <code>cd backend
node dist/server.js</code>
                    <button class="code-copy-btn" @click="copyText('cd backend\nnode dist/server.js')">复制</button>
                  </div>
                  <p class="tip-text">💡 也可使用 PM2 管理进程（推荐）：先安装 <code>npm install -g pm2</code>，然后 <code>pm2 start dist/server.js --name crm-backend</code></p>
                </div>
              </div>
              <div class="step-card">
                <div class="step-num">7</div>
                <div class="step-body">
                  <h5>访问系统并激活授权</h5>
                  <p>浏览器访问 <code>http://localhost:3000</code>，点击 🔑 图标选择「私有部署」，输入授权码激活系统</p>
                </div>
              </div>
            </div>
          </div>

          <!-- ====== 宝塔面板部署 ====== -->
          <div v-if="deployTab === 'bt'" class="deploy-content">
            <div class="deploy-intro">
              <p>使用宝塔面板部署是 <strong>最简单的方式</strong>，适合绝大多数用户。宝塔面板提供可视化界面管理服务器，无需手动敲命令。</p>
            </div>

            <div class="deploy-method-toggle">
              <button :class="{ active: btMethod === 'quick' }" @click="btMethod = 'quick'">⚡ 一键部署（推荐）</button>
              <button :class="{ active: btMethod === 'manual' }" @click="btMethod = 'manual'">📝 常规部署</button>
            </div>

            <!-- 系统要求 -->
            <div class="requirements-box">
              <h5>📋 服务器最低配置</h5>
              <div class="req-grid">
                <div class="req-item"><span class="req-label">CPU</span><span class="req-value">2核及以上</span></div>
                <div class="req-item"><span class="req-label">内存</span><span class="req-value">2GB 及以上（推荐 4GB）</span></div>
                <div class="req-item"><span class="req-label">硬盘</span><span class="req-value">40GB 及以上 SSD</span></div>
                <div class="req-item"><span class="req-label">系统</span><span class="req-value">Ubuntu 22.04 / CentOS 7.9+</span></div>
                <div class="req-item"><span class="req-label">带宽</span><span class="req-value">3Mbps 及以上</span></div>
                <div class="req-item"><span class="req-label">推荐厂商</span><span class="req-value">阿里云 / 腾讯云 / 华为云</span></div>
              </div>
              <p class="tip-text" style="margin-top: 8px;">💡 如果还没有服务器，推荐购买 <a href="https://www.aliyun.com/minisite/goods" target="_blank">阿里云ECS</a> 或 <a href="https://cloud.tencent.com/act/pro/lighthouse" target="_blank">腾讯云轻量</a>，新用户通常有优惠。</p>
            </div>

            <!-- 一键部署 -->
            <div v-if="btMethod === 'quick'" class="method-content">
              <div class="step-card">
                <div class="step-num">1</div>
                <div class="step-body">
                  <h5>购买云服务器（已有可跳过）</h5>
                  <p>如果还没有云服务器，请先购买一台：</p>
                  <ol>
                    <li>前往 <a href="https://www.aliyun.com" target="_blank">阿里云</a> 或 <a href="https://cloud.tencent.com" target="_blank">腾讯云</a> 注册账号</li>
                    <li>选择 <strong>云服务器 ECS</strong> 或 <strong>轻量应用服务器</strong>，配置选择 2核2G 起步</li>
                    <li>操作系统选择 <strong>Ubuntu 22.04</strong> 或 <strong>CentOS 7.9</strong>（推荐 Ubuntu）</li>
                    <li>购买后，在控制台找到服务器的 <strong>公网 IP 地址</strong>，并设置 <strong>root 密码</strong></li>
                    <li>在安全组/防火墙中开放以下端口：<code>22</code>（SSH）、<code>80</code>（HTTP）、<code>443</code>（HTTPS）、<code>8888</code>（宝塔面板）</li>
                  </ol>
                </div>
              </div>
              <div class="step-card">
                <div class="step-num">2</div>
                <div class="step-body">
                  <h5>通过 SSH 连接服务器</h5>
                  <p>使用 SSH 工具连接到您的云服务器：</p>
                  <ul>
                    <li><strong>Windows 用户：</strong>下载 <a href="https://www.xshell.com/zh/free-for-home-school/" target="_blank">Xshell（家庭版免费）</a> 或 <a href="https://www.netsarang.com/en/xshell/" target="_blank">FinalShell</a>，输入服务器IP、端口22、用户名root和密码连接</li>
                    <li><strong>macOS 用户：</strong>打开「终端」，输入 <code>ssh root@你的服务器IP</code></li>
                  </ul>
                  <div class="code-block">
                    <code>ssh root@你的服务器IP
## 输入服务器密码（输入时不会显示字符，属于正常现象）</code>
                    <button class="code-copy-btn" @click="copyText('ssh root@你的服务器IP')">复制</button>
                  </div>
                </div>
              </div>
              <div class="step-card">
                <div class="step-num">3</div>
                <div class="step-body">
                  <h5>安装宝塔面板</h5>
                  <p>SSH 连接成功后，在终端执行以下命令安装宝塔面板：</p>
                  <div class="os-switch">
                    <button :class="{ active: osType === 'ubuntu' }" @click="osType = 'ubuntu'">Ubuntu/Debian</button>
                    <button :class="{ active: osType === 'centos' }" @click="osType = 'centos'">CentOS</button>
                  </div>
                  <div class="code-block" v-if="osType === 'ubuntu'">
                    <code>wget -O install.sh https://download.bt.cn/install/install-ubuntu_6.0.sh && sudo bash install.sh ed8484bec</code>
                    <button class="code-copy-btn" @click="copyText('wget -O install.sh https://download.bt.cn/install/install-ubuntu_6.0.sh && sudo bash install.sh ed8484bec')">复制</button>
                  </div>
                  <div class="code-block" v-else>
                    <code>yum install -y wget && wget -O install.sh https://download.bt.cn/install/install_6.0.sh && sh install.sh ed8484bec</code>
                    <button class="code-copy-btn" @click="copyText('yum install -y wget && wget -O install.sh https://download.bt.cn/install/install_6.0.sh && sh install.sh ed8484bec')">复制</button>
                  </div>
                  <div class="important-notice">
                    <span>⚠️ <strong>重要：</strong>安装完成后终端会显示面板地址、用户名和密码，请<strong>立即截图或复制保存！</strong>格式类似：</span>
                    <div class="code-block" style="margin-top: 8px;">
                      <code>面板地址: http://你的IP:8888/xxxxxx
用户名: xxxxxxxx
密码: xxxxxxxx</code>
                    </div>
                  </div>
                </div>
              </div>
              <div class="step-card">
                <div class="step-num">4</div>
                <div class="step-body">
                  <h5>登录宝塔面板并安装软件</h5>
                  <p>在浏览器中打开上一步显示的面板地址，使用用户名和密码登录。首次登录需要绑定宝塔账号（免费注册）。</p>
                  <p>登录后，进入左侧菜单「<strong>软件商店</strong>」，搜索并安装以下软件：</p>
                  <div class="software-grid">
                    <div class="software-item"><strong>Nginx</strong> <span>1.22+</span></div>
                    <div class="software-item"><strong>MySQL</strong> <span>8.0</span></div>
                    <div class="software-item"><strong>PM2管理器</strong> <span>最新版</span></div>
                    <div class="software-item"><strong>Node.js版本管理器</strong> <span>选择 v20.x</span></div>
                  </div>
                  <p class="tip-text">💡 安装时选择「极速安装」即可，Nginx + MySQL 安装大约需要 5-15 分钟</p>
                </div>
              </div>
              <div class="step-card">
                <div class="step-num">5</div>
                <div class="step-body">
                  <h5>创建数据库</h5>
                  <p>在宝塔面板左侧菜单点击「<strong>数据库</strong>」→ 右上角点击「<strong>添加数据库</strong>」：</p>
                  <ul>
                    <li>数据库名：<code>crm_db</code></li>
                    <li>用户名：<code>crm_user</code></li>
                    <li>密码：点击「随机」自动生成（<strong>⚠️ 请立即复制保存此密码！</strong>）</li>
                    <li>访问权限：选择「<strong>本地服务器</strong>」</li>
                  </ul>
                  <p>点击「提交」创建数据库。然后：</p>
                  <ol>
                    <li>在数据库列表中找到 <code>crm_db</code>，点击右侧「<strong>导入</strong>」按钮</li>
                    <li>选择「从文件导入」，上传项目中的 <code>database/schema.sql</code> 文件</li>
                    <li>点击「导入」完成数据库初始化</li>
                  </ol>
                </div>
              </div>
              <div class="step-card">
                <div class="step-num">6</div>
                <div class="step-body">
                  <h5>上传项目代码</h5>
                  <p v-if="versionGitUrl"><strong>方式一（推荐）：Git 克隆</strong></p>
                  <p v-else><strong>方式一（推荐）：</strong>在宝塔终端执行 Git 克隆</p>
                  <p>在宝塔面板左侧菜单点击「<strong>终端</strong>」（或使用 SSH 工具），执行：</p>
                  <div v-if="versionGitUrl" class="code-block">
                    <code>cd /www/wwwroot
{{ versionGitCloneCmd }}
cd CRM</code>
                    <button class="code-copy-btn" @click="copyText(`cd /www/wwwroot\n${versionGitCloneCmd}\ncd CRM`)">复制</button>
                  </div>
                  <div v-else class="code-block">
                    <code>cd /www/wwwroot
git clone 您收到的仓库地址 CRM
cd CRM</code>
                    <button class="code-copy-btn" @click="copyText('cd /www/wwwroot\ngit clone 您收到的仓库地址 CRM\ncd CRM')">复制</button>
                  </div>
                  <p><strong>方式二：</strong>在宝塔面板左侧菜单点击「<strong>文件</strong>」→ 导航到 <code>/www/wwwroot</code> → 点击「<strong>上传</strong>」按钮 → 上传项目压缩包 → 右键点击压缩包选择「<strong>解压</strong>」</p>
                </div>
              </div>
              <div class="step-card">
                <div class="step-num">7</div>
                <div class="step-body">
                  <h5>配置后端环境变量</h5>
                  <p>在宝塔面板的「文件」中导航到 <code>/www/wwwroot/CRM/backend</code> 目录：</p>
                  <ol>
                    <li>找到 <code>.env.example</code> 文件，右键「复制」然后「粘贴」，重命名为 <code>.env</code></li>
                    <li>双击打开 <code>.env</code> 文件进行编辑</li>
                    <li>修改以下关键配置（其他保持默认）：</li>
                  </ol>
                  <div class="code-block">
                    <code>DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=crm_user
DB_PASSWORD=第5步生成的数据库密码
DB_DATABASE=crm_db
DB_CHARSET=utf8mb4
JWT_SECRET=使用命令生成：openssl rand -hex 32
JWT_EXPIRES_IN=7d
PORT=3000</code>
                    <button class="code-copy-btn" @click="copyText('DB_HOST=localhost\nDB_PORT=3306\nDB_USERNAME=crm_user\nDB_PASSWORD=第5步生成的数据库密码\nDB_DATABASE=crm_db\nDB_CHARSET=utf8mb4\nJWT_SECRET=使用命令生成：openssl rand -hex 32\nJWT_EXPIRES_IN=7d\nPORT=3000')">复制</button>
                  </div>
                  <p class="tip-text">💡 生成 JWT_SECRET：在终端执行 <code>openssl rand -hex 32</code>，将输出的随机字符串粘贴到 JWT_SECRET= 后面</p>
                </div>
              </div>
              <div class="step-card highlight">
                <div class="step-num">8</div>
                <div class="step-body">
                  <h5>⚡ 执行一键部署脚本</h5>
                  <p>在宝塔面板的「终端」或 SSH 中执行以下命令，脚本将自动完成所有配置：</p>
                  <div class="code-block">
                    <code>cd /www/wwwroot/CRM
chmod +x deploy.sh
./deploy.sh</code>
                    <button class="code-copy-btn" @click="copyText('cd /www/wwwroot/CRM\nchmod +x deploy.sh\n./deploy.sh')">复制</button>
                  </div>
                  <div class="auto-steps-list">
                    <p>脚本将自动完成以下操作：</p>
                    <div class="auto-step-item">✅ 环境检查（Node.js版本、内存、磁盘空间）</div>
                    <div class="auto-step-item">✅ 配置 npm 镜像加速</div>
                    <div class="auto-step-item">✅ 安装前端依赖（约5-8分钟）</div>
                    <div class="auto-step-item">✅ 安装后端依赖（约3-5分钟）</div>
                    <div class="auto-step-item">✅ 构建前端项目（约5-10分钟）</div>
                    <div class="auto-step-item">✅ 使用 PM2 启动后端服务</div>
                    <div class="auto-step-item">✅ 配置开机自启动</div>
                  </div>
                  <p class="tip-text">⏱ 预计总耗时 20-30 分钟，请耐心等待，不要关闭终端窗口</p>
                </div>
              </div>
              <div class="step-card">
                <div class="step-num">9</div>
                <div class="step-body">
                  <h5>配置 Nginx 反向代理</h5>
                  <p>在宝塔面板配置网站和反向代理，使系统可以通过域名或 IP 访问：</p>
                  <ol>
                    <li>点击左侧菜单「<strong>网站</strong>」→ 点击「<strong>添加站点</strong>」</li>
                    <li>域名：填写您的域名（如 <code>crm.yourdomain.com</code>）；如果没有域名，填写服务器公网 IP</li>
                    <li>根目录：选择 <code>/www/wwwroot/CRM/dist</code></li>
                    <li>PHP版本：选「<strong>纯静态</strong>」</li>
                    <li>点击「提交」创建网站</li>
                  </ol>
                  <p>然后配置反向代理：</p>
                  <ol>
                    <li>在网站列表中找到刚创建的站点，点击右侧「<strong>设置</strong>」</li>
                    <li>点击左侧「<strong>配置文件</strong>」</li>
                    <li>在 <code>location / { }</code> 这一段的<strong>上方</strong>，添加以下内容：</li>
                  </ol>
                  <div class="code-block">
                    <code>location /api/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    client_max_body_size 50m;
}
location /socket.io/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
}
location /uploads/ {
    proxy_pass http://127.0.0.1:3000;
}</code>
                    <button class="code-copy-btn" @click="copyText('location /api/ {\n    proxy_pass http://127.0.0.1:3000;\n    proxy_set_header Host $host;\n    proxy_set_header X-Real-IP $remote_addr;\n    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n    proxy_set_header X-Forwarded-Proto $scheme;\n    client_max_body_size 50m;\n}\nlocation /socket.io/ {\n    proxy_pass http://127.0.0.1:3000;\n    proxy_http_version 1.1;\n    proxy_set_header Upgrade $http_upgrade;\n    proxy_set_header Connection \"upgrade\";\n    proxy_set_header Host $host;\n}\nlocation /uploads/ {\n    proxy_pass http://127.0.0.1:3000;\n}')">复制</button>
                  </div>
                  <p>同时确保 <code>location / { }</code> 中有 Vue 的历史模式路由支持：</p>
                  <div class="code-block">
                    <code>location / {
    try_files $uri $uri/ /index.html;
}</code>
                    <button class="code-copy-btn" @click="copyText('location / {\n    try_files $uri $uri/ /index.html;\n}')">复制</button>
                  </div>
                  <p class="tip-text">💡 修改配置后点击「保存」，Nginx 会自动重载生效</p>
                </div>
              </div>
              <div class="step-card">
                <div class="step-num">10</div>
                <div class="step-body">
                  <h5>🎉 访问系统并激活授权</h5>
                  <p>部署完成后，在浏览器中打开您的域名或 <code>http://服务器IP</code>：</p>
                  <ol>
                    <li>在登录页面点击左下角的 🔑 图标</li>
                    <li>在弹出的对话框中选择「私有部署」</li>
                    <li>粘贴上方的 <strong>系统授权码</strong>，点击「激活」</li>
                    <li>系统自动创建管理员账号（用户名：您注册时的手机号，密码：<code>Aa123456</code>）</li>
                    <li>登录后请 <strong>立即修改密码</strong></li>
                  </ol>
                </div>
              </div>
              <div class="step-card">
                <div class="step-num">11</div>
                <div class="step-body">
                  <h5>🔒 申请 SSL 证书（推荐）</h5>
                  <p>如果您有已备案的域名，强烈建议开启 HTTPS 加密访问：</p>
                  <ol>
                    <li>在宝塔面板网站列表中，点击站点的「<strong>设置</strong>」</li>
                    <li>点击左侧「<strong>SSL</strong>」</li>
                    <li>选择「<strong>Let's Encrypt</strong>」（免费）</li>
                    <li>勾选您的域名，点击「申请」</li>
                    <li>申请成功后，开启右上角的「<strong>强制 HTTPS</strong>」开关</li>
                  </ol>
                  <p class="tip-text">⚠️ SSL 证书需要域名已完成 ICP 备案且 DNS 解析到服务器 IP，仅用 IP 访问不支持 SSL</p>
                </div>
              </div>

              <!-- 常见问题 -->
              <div class="faq-section">
                <h5>❓ 常见问题排查</h5>
                <div class="faq-item">
                  <strong>Q: 宝塔面板安装后无法打开</strong>
                  <p>A: 请确认云服务器安全组已放行 8888 端口。在阿里云/腾讯云控制台 → 安全组 → 添加入站规则 → 端口 8888。</p>
                </div>
                <div class="faq-item">
                  <strong>Q: 访问网站显示 502 Bad Gateway</strong>
                  <p>A: 后端服务可能未正常启动。在终端执行 <code>pm2 list</code> 查看是否有 crm-backend 进程。如果没有，执行 <code>cd /www/wwwroot/CRM/backend && pm2 start dist/server.js --name crm-backend</code></p>
                </div>
                <div class="faq-item">
                  <strong>Q: 访问显示空白页</strong>
                  <p>A: 检查网站根目录是否指向 <code>/www/wwwroot/CRM/dist</code>，以及 Nginx 配置中是否有 <code>try_files $uri $uri/ /index.html;</code></p>
                </div>
              </div>
            </div>

            <!-- 常规手动部署 -->
            <div v-if="btMethod === 'manual'" class="method-content">
              <div class="step-card">
                <div class="step-num">1</div>
                <div class="step-body">
                  <h5>安装宝塔面板 & 基础软件</h5>
                  <p>同一键部署的第1-4步：购买服务器 → SSH 连接 → 安装宝塔面板 → 安装 Nginx、MySQL、PM2管理器、Node.js 版本管理器</p>
                </div>
              </div>
              <div class="step-card">
                <div class="step-num">2</div>
                <div class="step-body">
                  <h5>创建数据库并导入结构</h5>
                  <p>同一键部署的第5步，在宝塔面板创建数据库 <code>crm_db</code> 并导入 <code>schema.sql</code></p>
                </div>
              </div>
              <div class="step-card">
                <div class="step-num">3</div>
                <div class="step-body">
                  <h5>上传项目代码并配置环境变量</h5>
                  <p>同一键部署的第6-7步，上传代码到 <code>/www/wwwroot/CRM</code> 并配置 <code>backend/.env</code></p>
                </div>
              </div>
              <div class="step-card">
                <div class="step-num">4</div>
                <div class="step-body">
                  <h5>手动安装依赖并构建</h5>
                  <div class="code-block">
                    <code>cd /www/wwwroot/CRM

# 设置国内镜像加速
npm config set registry https://registry.npmmirror.com

# 安装前端依赖并构建
npm install
npm run build

# 安装后端依赖并构建
cd backend
npm install
npm run build</code>
                    <button class="code-copy-btn" @click="copyText('cd /www/wwwroot/CRM\nnpm config set registry https://registry.npmmirror.com\nnpm install\nnpm run build\ncd backend\nnpm install\nnpm run build')">复制</button>
                  </div>
                </div>
              </div>
              <div class="step-card">
                <div class="step-num">5</div>
                <div class="step-body">
                  <h5>使用 PM2 启动后端服务</h5>
                  <div class="code-block">
                    <code>cd /www/wwwroot/CRM/backend
pm2 start dist/server.js --name crm-backend
pm2 save
pm2 startup</code>
                    <button class="code-copy-btn" @click="copyText('cd /www/wwwroot/CRM/backend\npm2 start dist/server.js --name crm-backend\npm2 save\npm2 startup')">复制</button>
                  </div>
                </div>
              </div>
              <div class="step-card">
                <div class="step-num">6</div>
                <div class="step-body">
                  <h5>配置 Nginx 并访问系统</h5>
                  <p>同一键部署的第9-10步，配置 Nginx 反向代理后访问系统激活授权码</p>
                </div>
              </div>
            </div>
          </div>

          <!-- ====== 纯Linux部署 ====== -->
          <div v-if="deployTab === 'linux'" class="deploy-content">
            <div class="deploy-intro">
              <p>适合有 Linux 服务器运维经验的用户，在 Ubuntu / CentOS / Debian 等系统上使用纯命令行部署。无需安装宝塔面板，直接通过命令完成所有配置。</p>
            </div>

            <div class="deploy-method-toggle">
              <button :class="{ active: linuxMethod === 'quick' }" @click="linuxMethod = 'quick'">⚡ 一键部署（推荐）</button>
              <button :class="{ active: linuxMethod === 'manual' }" @click="linuxMethod = 'manual'">📝 手动部署</button>
            </div>

            <!-- 系统要求 -->
            <div class="requirements-box">
              <h5>📋 服务器要求</h5>
              <div class="req-grid">
                <div class="req-item"><span class="req-label">系统</span><span class="req-value">Ubuntu 20.04+ / CentOS 7.9+ / Debian 11+</span></div>
                <div class="req-item"><span class="req-label">配置</span><span class="req-value">2核2G 起步（推荐 2核4G）</span></div>
                <div class="req-item"><span class="req-label">权限</span><span class="req-value">root 或 sudo 权限</span></div>
                <div class="req-item"><span class="req-label">端口</span><span class="req-value">80、443、22 需放行</span></div>
              </div>
            </div>

            <!-- 一键部署 -->
            <div v-if="linuxMethod === 'quick'" class="method-content">
              <div class="step-card">
                <div class="step-num">1</div>
                <div class="step-body">
                  <h5>SSH 连接到服务器并更新系统</h5>
                  <p>使用 SSH 工具（macOS 终端 / Windows Xshell / PuTTY）连接到服务器后，先更新系统：</p>
                  <div class="os-switch">
                    <button :class="{ active: linuxOS === 'ubuntu' }" @click="linuxOS = 'ubuntu'">Ubuntu/Debian</button>
                    <button :class="{ active: linuxOS === 'centos' }" @click="linuxOS = 'centos'">CentOS</button>
                  </div>
                  <div class="code-block" v-if="linuxOS === 'ubuntu'">
                    <code>sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git wget build-essential</code>
                    <button class="code-copy-btn" @click="copyText('sudo apt update && sudo apt upgrade -y\nsudo apt install -y curl git wget build-essential')">复制</button>
                  </div>
                  <div class="code-block" v-else>
                    <code>sudo yum update -y
sudo yum install -y curl git wget gcc-c++ make</code>
                    <button class="code-copy-btn" @click="copyText('sudo yum update -y\nsudo yum install -y curl git wget gcc-c++ make')">复制</button>
                  </div>
                </div>
              </div>
              <div class="step-card">
                <div class="step-num">2</div>
                <div class="step-body">
                  <h5>安装 Node.js 20.x</h5>
                  <p>推荐使用 nvm（Node Version Manager）安装和管理 Node.js：</p>
                  <div class="code-block">
                    <code>## 方法一（推荐）：使用 nvm 安装
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
nvm alias default 20

## 验证安装
node -v   # 应显示 v20.x.x
npm -v    # 应显示 10.x.x</code>
                    <button class="code-copy-btn" @click="copyText('curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash\nsource ~/.bashrc\nnvm install 20\nnvm use 20\nnvm alias default 20\nnode -v\nnpm -v')">复制</button>
                  </div>
                  <p class="tip-text">💡 如果 nvm 安装脚本下载慢，可使用国内镜像：<code>curl -o- https://gitee.com/mirrors/nvm/raw/master/install.sh | bash</code></p>
                  <details class="alt-method">
                    <summary>📌 备用方法：使用 NodeSource 安装</summary>
                    <div class="code-block" v-if="linuxOS === 'ubuntu'">
                      <code>curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs</code>
                      <button class="code-copy-btn" @click="copyText('curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -\nsudo apt install -y nodejs')">复制</button>
                    </div>
                    <div class="code-block" v-else>
                      <code>curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs</code>
                      <button class="code-copy-btn" @click="copyText('curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -\nsudo yum install -y nodejs')">复制</button>
                    </div>
                  </details>
                </div>
              </div>
              <div class="step-card">
                <div class="step-num">3</div>
                <div class="step-body">
                  <h5>安装 MySQL 8.0</h5>
                  <div class="code-block" v-if="linuxOS === 'ubuntu'">
                    <code>## 安装 MySQL 服务端
sudo apt install -y mysql-server

## 启动并设置开机自启
sudo systemctl enable mysql && sudo systemctl start mysql

## 运行安全配置向导（设置 root 密码等）
sudo mysql_secure_installation
## 按提示操作：设置 root 密码、删除匿名用户、禁止远程 root 登录等（全选 Y）</code>
                    <button class="code-copy-btn" @click="copyText('sudo apt install -y mysql-server\nsudo systemctl enable mysql && sudo systemctl start mysql\nsudo mysql_secure_installation')">复制</button>
                  </div>
                  <div class="code-block" v-else>
                    <code>## 安装 MySQL 服务端
sudo yum install -y mysql-server

## 启动并设置开机自启
sudo systemctl enable mysqld && sudo systemctl start mysqld

## 运行安全配置向导
sudo mysql_secure_installation</code>
                    <button class="code-copy-btn" @click="copyText('sudo yum install -y mysql-server\nsudo systemctl enable mysqld && sudo systemctl start mysqld\nsudo mysql_secure_installation')">复制</button>
                  </div>
                  <p class="tip-text">⚠️ 请务必记住设置的 root 密码，后续配置需要使用</p>
                </div>
              </div>
              <div class="step-card">
                <div class="step-num">4</div>
                <div class="step-body">
                  <h5>创建数据库和用户</h5>
                  <div class="code-block">
                    <code>## 登录 MySQL
sudo mysql -u root -p

## 在 MySQL 命令行中执行以下 SQL：
CREATE DATABASE crm_db DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'crm_user'@'localhost' IDENTIFIED BY '你的安全密码';
GRANT ALL PRIVILEGES ON crm_db.* TO 'crm_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;</code>
                    <button class="code-copy-btn" @click="copyText('sudo mysql -u root -p\nCREATE DATABASE crm_db DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\nCREATE USER \'crm_user\'@\'localhost\' IDENTIFIED BY \'你的安全密码\';\nGRANT ALL PRIVILEGES ON crm_db.* TO \'crm_user\'@\'localhost\';\nFLUSH PRIVILEGES;\nEXIT;')">复制</button>
                  </div>
                  <p class="tip-text">⚠️ 将 <code>'你的安全密码'</code> 替换为一个强密码（包含大小写字母、数字，至少12位），请记住此密码</p>
                </div>
              </div>
              <div class="step-card">
                <div class="step-num">5</div>
                <div class="step-body">
                  <h5>下载项目代码并导入数据库</h5>
                  <p v-if="versionGitUrl">使用 Git 克隆项目代码：</p>
                  <p v-else>下载项目代码到服务器：</p>
                  <div v-if="versionGitUrl" class="code-block">
                    <code>cd /www/wwwroot
{{ versionGitCloneCmd }}
cd CRM</code>
                    <button class="code-copy-btn" @click="copyText(`cd /www/wwwroot\n${versionGitCloneCmd}\ncd CRM`)">复制</button>
                  </div>
                  <div v-else class="code-block">
                    <code>## 创建项目目录
sudo mkdir -p /www/wwwroot
cd /www/wwwroot

## 方式一：Git 克隆（推荐，方便后续更新）
git clone 您收到的仓库地址 CRM

## 方式二：上传压缩包后解压
## 先用 scp 上传: scp CRM.zip root@服务器IP:/www/wwwroot/
## 然后解压: unzip CRM.zip -d CRM

cd CRM</code>
                    <button class="code-copy-btn" @click="copyText('sudo mkdir -p /www/wwwroot\ncd /www/wwwroot\ngit clone 您收到的仓库地址 CRM\ncd CRM')">复制</button>
                  </div>
                  <p>导入数据库结构：</p>
                  <div class="code-block">
                    <code>mysql -u crm_user -p crm_db &lt; /www/wwwroot/CRM/database/schema.sql</code>
                    <button class="code-copy-btn" @click="copyText('mysql -u crm_user -p crm_db < /www/wwwroot/CRM/database/schema.sql')">复制</button>
                  </div>
                </div>
              </div>
              <div class="step-card">
                <div class="step-num">6</div>
                <div class="step-body">
                  <h5>配置后端环境变量</h5>
                  <div class="code-block">
                    <code>cd /www/wwwroot/CRM/backend
cp .env.example .env
nano .env   # 或使用 vim .env</code>
                    <button class="code-copy-btn" @click="copyText('cd /www/wwwroot/CRM/backend\ncp .env.example .env\nnano .env')">复制</button>
                  </div>
                  <p>修改以下关键配置：</p>
                  <div class="code-block">
                    <code>DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=crm_user
DB_PASSWORD=第4步设置的数据库密码
DB_DATABASE=crm_db
DB_CHARSET=utf8mb4
JWT_SECRET=执行 openssl rand -hex 32 生成随机字符串
JWT_EXPIRES_IN=7d
PORT=3000</code>
                    <button class="code-copy-btn" @click="copyText('DB_HOST=localhost\nDB_PORT=3306\nDB_USERNAME=crm_user\nDB_PASSWORD=第4步设置的数据库密码\nDB_DATABASE=crm_db\nDB_CHARSET=utf8mb4\nJWT_SECRET=执行 openssl rand -hex 32 生成随机字符串\nJWT_EXPIRES_IN=7d\nPORT=3000')">复制</button>
                  </div>
                  <p class="tip-text">💡 nano 编辑器操作：修改内容后按 <code>Ctrl+O</code> 保存，<code>Ctrl+X</code> 退出</p>
                </div>
              </div>
              <div class="step-card highlight">
                <div class="step-num">7</div>
                <div class="step-body">
                  <h5>⚡ 执行一键部署脚本</h5>
                  <div class="code-block">
                    <code>cd /www/wwwroot/CRM
chmod +x deploy.sh
./deploy.sh</code>
                    <button class="code-copy-btn" @click="copyText('cd /www/wwwroot/CRM\nchmod +x deploy.sh\n./deploy.sh')">复制</button>
                  </div>
                  <div class="auto-steps-list">
                    <p>脚本将自动完成以下操作：</p>
                    <div class="auto-step-item">✅ 环境检查（Node.js版本、内存、磁盘空间）</div>
                    <div class="auto-step-item">✅ 配置 npm 镜像加速</div>
                    <div class="auto-step-item">✅ 安装前端和后端依赖</div>
                    <div class="auto-step-item">✅ 构建前端项目</div>
                    <div class="auto-step-item">✅ 使用 PM2 启动后端服务</div>
                    <div class="auto-step-item">✅ 配置开机自启动</div>
                  </div>
                  <p class="tip-text">⏱ 预计 20-30 分钟，请耐心等待，不要关闭终端</p>
                </div>
              </div>
              <div class="step-card">
                <div class="step-num">8</div>
                <div class="step-body">
                  <h5>安装 Nginx 并配置反向代理</h5>
                  <div class="code-block" v-if="linuxOS === 'ubuntu'">
                    <code>## 安装 Nginx
sudo apt install -y nginx
sudo systemctl enable nginx && sudo systemctl start nginx</code>
                    <button class="code-copy-btn" @click="copyText('sudo apt install -y nginx\nsudo systemctl enable nginx && sudo systemctl start nginx')">复制</button>
                  </div>
                  <div class="code-block" v-else>
                    <code>## 安装 Nginx
sudo yum install -y nginx
sudo systemctl enable nginx && sudo systemctl start nginx</code>
                    <button class="code-copy-btn" @click="copyText('sudo yum install -y nginx\nsudo systemctl enable nginx && sudo systemctl start nginx')">复制</button>
                  </div>
                  <p>创建站点配置文件：</p>
                  <div class="code-block">
                    <code>sudo nano /etc/nginx/sites-available/crm</code>
                    <button class="code-copy-btn" @click="copyText('sudo nano /etc/nginx/sites-available/crm')">复制</button>
                  </div>
                  <p>粘贴以下完整配置内容（将 <code>你的域名或IP</code> 替换为实际值）：</p>
                  <div class="code-block">
                    <code>server {
    listen 80;
    server_name 你的域名或IP;
    root /www/wwwroot/CRM/dist;
    index index.html;

    # 前端路由支持
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 后端 API 反向代理
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 50m;
    }

    # WebSocket 支持
    location /socket.io/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    # 文件上传代理
    location /uploads/ {
        proxy_pass http://127.0.0.1:3000;
    }
}</code>
                    <button class="code-copy-btn" @click="copyText('server {\n    listen 80;\n    server_name 你的域名或IP;\n    root /www/wwwroot/CRM/dist;\n    index index.html;\n\n    location / {\n        try_files $uri $uri/ /index.html;\n    }\n\n    location /api/ {\n        proxy_pass http://127.0.0.1:3000;\n        proxy_set_header Host $host;\n        proxy_set_header X-Real-IP $remote_addr;\n        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n        proxy_set_header X-Forwarded-Proto $scheme;\n        client_max_body_size 50m;\n    }\n\n    location /socket.io/ {\n        proxy_pass http://127.0.0.1:3000;\n        proxy_http_version 1.1;\n        proxy_set_header Upgrade $http_upgrade;\n        proxy_set_header Connection \"upgrade\";\n        proxy_set_header Host $host;\n    }\n\n    location /uploads/ {\n        proxy_pass http://127.0.0.1:3000;\n    }\n}')">复制</button>
                  </div>
                  <p>启用站点并验证配置：</p>
                  <div class="code-block">
                    <code>## 创建软链接启用站点
sudo ln -s /etc/nginx/sites-available/crm /etc/nginx/sites-enabled/

## 删除默认站点（避免冲突）
sudo rm -f /etc/nginx/sites-enabled/default

## 测试配置是否正确
sudo nginx -t

## 重载 Nginx 使配置生效
sudo systemctl reload nginx</code>
                    <button class="code-copy-btn" @click="copyText('sudo ln -s /etc/nginx/sites-available/crm /etc/nginx/sites-enabled/\nsudo rm -f /etc/nginx/sites-enabled/default\nsudo nginx -t\nsudo systemctl reload nginx')">复制</button>
                  </div>
                  <p class="tip-text">⚠️ CentOS 的 Nginx 配置目录可能是 <code>/etc/nginx/conf.d/crm.conf</code>，不需要创建软链接</p>
                </div>
              </div>
              <div class="step-card">
                <div class="step-num">9</div>
                <div class="step-body">
                  <h5>配置防火墙</h5>
                  <p>确保防火墙允许 HTTP/HTTPS 流量：</p>
                  <div class="code-block" v-if="linuxOS === 'ubuntu'">
                    <code>## Ubuntu 使用 ufw
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
sudo ufw status</code>
                    <button class="code-copy-btn" @click="copyText('sudo ufw allow 22/tcp\nsudo ufw allow 80/tcp\nsudo ufw allow 443/tcp\nsudo ufw enable\nsudo ufw status')">复制</button>
                  </div>
                  <div class="code-block" v-else>
                    <code>## CentOS 使用 firewalld
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-port=22/tcp
sudo firewall-cmd --reload
sudo firewall-cmd --list-all</code>
                    <button class="code-copy-btn" @click="copyText('sudo firewall-cmd --permanent --add-service=http\nsudo firewall-cmd --permanent --add-service=https\nsudo firewall-cmd --permanent --add-port=22/tcp\nsudo firewall-cmd --reload\nsudo firewall-cmd --list-all')">复制</button>
                  </div>
                  <p class="tip-text">💡 云服务器还需在云控制台的「安全组」中放行 80 和 443 端口</p>
                </div>
              </div>
              <div class="step-card">
                <div class="step-num">10</div>
                <div class="step-body">
                  <h5>🎉 访问系统并激活授权</h5>
                  <ol>
                    <li>浏览器访问 <code>http://你的域名或IP</code></li>
                    <li>在登录页面点击左下角的 🔑 图标</li>
                    <li>选择「私有部署」，粘贴上方的 <strong>系统授权码</strong>，点击「激活」</li>
                    <li>系统自动创建管理员账号（用户名：您注册时的手机号，密码：<code>Aa123456</code>）</li>
                    <li>登录后请 <strong>立即修改密码</strong></li>
                  </ol>
                </div>
              </div>
              <div class="step-card">
                <div class="step-num">11</div>
                <div class="step-body">
                  <h5>🔒 申请 SSL 证书（推荐）</h5>
                  <p>如果有已备案域名，使用 Let's Encrypt 免费获取 SSL 证书：</p>
                  <div class="code-block" v-if="linuxOS === 'ubuntu'">
                    <code>sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d 你的域名
## 按提示操作，选择自动重定向到 HTTPS</code>
                    <button class="code-copy-btn" @click="copyText('sudo apt install -y certbot python3-certbot-nginx\nsudo certbot --nginx -d 你的域名')">复制</button>
                  </div>
                  <div class="code-block" v-else>
                    <code>sudo yum install -y certbot python3-certbot-nginx
sudo certbot --nginx -d 你的域名</code>
                    <button class="code-copy-btn" @click="copyText('sudo yum install -y certbot python3-certbot-nginx\nsudo certbot --nginx -d 你的域名')">复制</button>
                  </div>
                  <p class="tip-text">💡 证书有效期90天，certbot 会自动配置定时续期</p>
                </div>
              </div>

              <!-- 常见问题 -->
              <div class="faq-section">
                <h5>❓ 常见问题排查</h5>
                <div class="faq-item">
                  <strong>Q: nginx -t 提示 sites-enabled 目录不存在</strong>
                  <p>A: CentOS 系统请将配置文件放在 <code>/etc/nginx/conf.d/crm.conf</code>，无需创建软链接。</p>
                </div>
                <div class="faq-item">
                  <strong>Q: 浏览器访问服务器 IP 无响应</strong>
                  <p>A: ① 检查 Nginx 是否启动：<code>sudo systemctl status nginx</code>；② 检查防火墙是否放行 80 端口；③ 检查云服务器安全组规则。</p>
                </div>
                <div class="faq-item">
                  <strong>Q: pm2 命令找不到</strong>
                  <p>A: 执行 <code>sudo npm install -g pm2</code> 安装。如果使用 nvm，需确保在 root 下也可访问 node，或使用 <code>sudo env "PATH=$PATH" pm2 ...</code></p>
                </div>
              </div>
            </div>

            <!-- 手动部署 -->
            <div v-if="linuxMethod === 'manual'" class="method-content">
              <div class="step-card">
                <div class="step-num">1-6</div>
                <div class="step-body">
                  <h5>环境准备</h5>
                  <p>同一键部署的第1-6步，完成系统依赖安装、Node.js、MySQL、数据库创建、项目下载和环境配置</p>
                </div>
              </div>
              <div class="step-card">
                <div class="step-num">7</div>
                <div class="step-body">
                  <h5>手动安装依赖并构建</h5>
                  <div class="code-block">
                    <code>cd /www/wwwroot/CRM

# 配置 npm 镜像加速（国内服务器推荐）
npm config set registry https://registry.npmmirror.com

# 安装前端依赖并构建
npm install
npm run build

# 安装后端依赖并构建
cd backend
npm install --production
npm run build</code>
                    <button class="code-copy-btn" @click="copyText('cd /www/wwwroot/CRM\nnpm config set registry https://registry.npmmirror.com\nnpm install\nnpm run build\ncd backend\nnpm install --production\nnpm run build')">复制</button>
                  </div>
                </div>
              </div>
              <div class="step-card">
                <div class="step-num">8</div>
                <div class="step-body">
                  <h5>安装 PM2 并启动服务</h5>
                  <div class="code-block">
                    <code>sudo npm install -g pm2
cd /www/wwwroot/CRM/backend
pm2 start dist/server.js --name crm-backend
pm2 save
pm2 startup  # 按照输出的提示执行命令，配置开机自启</code>
                    <button class="code-copy-btn" @click="copyText('sudo npm install -g pm2\ncd /www/wwwroot/CRM/backend\npm2 start dist/server.js --name crm-backend\npm2 save\npm2 startup')">复制</button>
                  </div>
                </div>
              </div>
              <div class="step-card">
                <div class="step-num">9-11</div>
                <div class="step-body">
                  <h5>配置 Nginx、防火墙并激活系统</h5>
                  <p>同一键部署的第8-10步，配置 Nginx 反向代理、放行防火墙端口，然后访问系统使用授权码激活</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 常用运维命令 -->
        <div class="maintenance-section">
          <h4>🔧 常用运维命令</h4>
          <div class="command-grid">
            <div class="command-item">
              <span class="cmd-label">查看服务状态</span>
              <code>pm2 list</code>
            </div>
            <div class="command-item">
              <span class="cmd-label">查看后端日志</span>
              <code>pm2 logs crm-backend</code>
            </div>
            <div class="command-item">
              <span class="cmd-label">重启后端服务</span>
              <code>pm2 restart crm-backend</code>
            </div>
            <div class="command-item">
              <span class="cmd-label">更新并重新部署</span>
              <code>cd /www/wwwroot/CRM && git pull && ./deploy.sh</code>
            </div>
          </div>
        </div>

        <div class="action-buttons">
          <router-link to="/member/dashboard" class="btn btn-primary btn-lg">
            👤 进入会员中心
          </router-link>
          <router-link to="/docs" class="btn btn-outline btn-lg">
            📖 查看完整文档
          </router-link>
          <a :href="customerServiceUrl" target="_blank" class="btn btn-outline btn-lg btn-service">
            💬 联系客服协助
          </a>
        </div>
      </div>

      <div class="help-tip">
        <p>授权信息已发送至您的手机和邮箱，请注意查收</p>
        <p>如有问题，请 <a :href="customerServiceUrl" target="_blank" class="help-link">联系在线客服</a></p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getWebsiteConfig } from '@/api/website-config'
import { getLatestVersion, formatFileSize as formatSize, type VersionInfo } from '@/api/version'

const route = useRoute()

// 官网配置（客服链接等）
const customerServiceUrl = ref('https://work.weixin.qq.com/kfid/kfc461ca9f5b45c8d25')
const crmUrl = ref('') // 动态CRM系统地址

// 最新版本信息（用于代码下载）
const latestVersion = ref<VersionInfo | null>(null)
const versionLoading = ref(false)

// 私有部署引导问卷状态
const guideHasServer = ref<'yes' | 'no' | ''>('')
const guideHasDomain = ref<'yes' | 'ip' | ''>('')
const guidePanel = ref<'bt' | 'none' | ''>('')
const guideHasPC = ref<'yes' | 'no' | ''>('')
const guideCanInstall = ref<'yes' | 'no' | ''>('')

// 部署标签页和方法切换
const deployTab = ref<'local' | 'bt' | 'linux'>('bt')
const localMethod = ref<'quick' | 'manual'>('quick')
const btMethod = ref<'quick' | 'manual'>('quick')
const linuxMethod = ref<'quick' | 'manual'>('quick')
const osType = ref<'ubuntu' | 'centos'>('ubuntu')
const linuxOS = ref<'ubuntu' | 'centos'>('ubuntu')

// 选择"有服务器"时重置本地电脑分支，反之亦然
const onGuideServer = (val: 'yes' | 'no') => {
  guideHasServer.value = val
  if (val === 'yes') {
    guideHasPC.value = ''
    guideCanInstall.value = ''
  } else {
    guideHasDomain.value = ''
    guidePanel.value = ''
  }
}

// 推荐结果计算
const guideRecommendation = computed(() => {
  if (guideHasServer.value === 'yes' && guidePanel.value === 'bt') {
    return '推荐使用 <strong>「🚀 宝塔面板」</strong> 部署（最简单），可视化管理服务器，适合大多数用户'
  }
  if (guideHasServer.value === 'yes' && guidePanel.value === 'none') {
    return '推荐使用 <strong>「🐧 纯Linux」</strong> 部署方式，适合有服务器运维经验的用户'
  }
  if (guideHasServer.value === 'no' && guideHasPC.value === 'yes' && guideCanInstall.value === 'yes') {
    return '推荐使用 <strong>「🖥️ 本地电脑」</strong> 部署，按照教程步骤即可快速体验系统功能'
  }
  if (guideHasServer.value === 'no' && guideHasPC.value === 'yes' && guideCanInstall.value === 'no') {
    return '推荐使用 <strong>「🖥️ 本地电脑」</strong> 部署，教程中有详细的安装步骤。如仍有困难，可联系客服获取远程协助'
  }
  if (guideHasServer.value === 'no' && guideHasPC.value === 'no') {
    return '建议先购买一台云服务器（推荐阿里云/腾讯云 2核2G 起步），或联系我们的客服获取部署协助'
  }
  return ''
})

// 推荐的标签页
const guideRecommendTab = computed((): 'local' | 'bt' | 'linux' | '' => {
  if (guideHasServer.value === 'yes' && guidePanel.value === 'bt') return 'bt'
  if (guideHasServer.value === 'yes' && guidePanel.value === 'none') return 'linux'
  if (guideHasServer.value === 'no' && guideHasPC.value === 'yes') return 'local'
  return ''
})

// 是否需要显示客服协助入口
const guideNeedHelp = computed(() => {
  return (guideHasServer.value === 'no' && guideHasPC.value === 'no') ||
         (guideHasServer.value === 'no' && guideHasPC.value === 'yes' && guideCanInstall.value === 'no')
})

// 加载官网配置（获取客服链接）和最新版本信息
onMounted(async () => {
  try {
    const config = await getWebsiteConfig()
    if (config.customerServiceUrl) {
      customerServiceUrl.value = config.customerServiceUrl
    }
    if (config.crmUrl) {
      crmUrl.value = config.crmUrl
    }
  } catch (_e) {
    // 使用默认值
  }

  // 仅私有部署用户需要获取最新版本
  if (type.value !== 'saas') {
    versionLoading.value = true
    try {
      const result = await getLatestVersion()
      if (result.latestVersion) {
        latestVersion.value = result.latestVersion
      }
    } catch (_e) {
      // 无法获取版本信息，不影响页面显示
    } finally {
      versionLoading.value = false
    }
  }
})

const type = computed(() => route.query.type as string || 'saas')
const plan = computed(() => route.query.plan as string || 'pro')
const tenantCode = computed(() => route.query.tenantCode as string || '')
const isBankTransfer = computed(() => route.query.payType === 'bank')
const orderNo = computed(() => route.query.orderNo as string || '')

// 从URL参数获取真实授权码和账号信息
const hasRealLicenseKey = computed(() => {
  const key = route.query.licenseKey as string
  return !!key && key.length > 0
})

const licenseKey = computed(() => {
  const key = route.query.licenseKey as string
  if (key) return key
  return '请查看邮件或短信获取授权码'
})

const adminUsername = computed(() => route.query.adminUsername as string || '')
const adminPassword = computed(() => route.query.adminPassword as string || '')
const memberPwdDefault = computed(() => route.query.memberPwdDefault === '1')

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

// 版本下载相关计算
const hasVersionDownload = computed(() => {
  if (!latestVersion.value) return false
  const v = latestVersion.value
  return !!(v.downloadUrl || v.gitRepoUrl)
})

// 默认公开仓库地址（即使管理后台未发布版本，也可以让客户获取代码）
const DEFAULT_GIT_REPO = 'https://github.com/shushuhao01/crm-system.git'

const versionDownloadUrl = computed(() => latestVersion.value?.downloadUrl || '')
const versionGitUrl = computed(() => latestVersion.value?.gitRepoUrl || DEFAULT_GIT_REPO)
const versionGitBranch = computed(() => latestVersion.value?.gitBranch || 'main')
const versionGitTag = computed(() => latestVersion.value?.gitTag || '')
const versionSourceType = computed(() => latestVersion.value?.sourceType || 'git')
const versionNumber = computed(() => latestVersion.value?.version || '')
const versionFileSize = computed(() => formatSize(latestVersion.value?.fileSize))
const versionPublishedAt = computed(() => {
  if (!latestVersion.value?.publishedAt) return ''
  return new Date(latestVersion.value.publishedAt).toLocaleDateString('zh-CN')
})

const versionGitCloneCmd = computed(() => {
  if (!versionGitUrl.value) return ''
  const tag = versionGitTag.value
  const branch = versionGitBranch.value
  if (tag) {
    return `git clone --branch ${tag} ${versionGitUrl.value} CRM`
  }
  return `git clone --branch ${branch} ${versionGitUrl.value} CRM`
})

const copyText = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    alert('已复制到剪贴板')
  } catch {
    alert('复制失败，请手动复制')
  }
}

const copyAllInfo = async () => {
  const displayUsername = adminUsername.value || '注册手机号'
  const displayPassword = adminPassword.value || 'Aa123456'
  const displayLicense = hasRealLicenseKey.value ? licenseKey.value : '（请查看邮件或短信）'

  const text = `【云客CRM - 租户登录信息】

🌐 登录地址：${crmUrl.value || '（请联系管理员获取）'}
🏢 租户编码：${tenantCode.value}
🔑 授权码：${displayLicense}
👤 管理员账号：${displayUsername}
🔐 初始密码：${displayPassword}

💡 温馨提示：
1. 在登录页点击 🔑 图标，选择"SaaS租户"
2. 输入租户授权码进行激活
3. 使用管理员账号和初始密码登录
4. 首次登录后请立即修改密码
5. 如有问题请联系技术支持`

  try {
    await navigator.clipboard.writeText(text)
    alert('已复制全部信息到剪贴板')
  } catch {
    alert('复制失败，请手动复制')
  }
}

const copyPrivateInfo = async () => {
  const displayLicense = hasRealLicenseKey.value ? licenseKey.value : '（请查看邮件或短信）'

  const text = `【云客CRM - 私有部署授权信息】

🔑 系统授权码：${displayLicense}
📦 授权类型：永久授权
👥 授权用户数：${maxUsers.value}人
👤 默认管理员账号：您注册官网时的手机号
🔐 默认初始密码：Aa123456

⚠️ 重要提醒：首次登录后请立即修改密码！

💡 部署激活步骤：
1. 将系统部署到您的服务器
2. 浏览器访问系统地址
3. 在登录页点击 🔑 图标，选择"私有部署"
4. 输入授权码激活系统
5. 系统自动创建管理员账号（用户名为注册手机号，密码 Aa123456）
6. 登录后请立即修改密码

📞 如有问题请联系技术支持`

  try {
    await navigator.clipboard.writeText(text)
    alert('已复制授权信息到剪贴板')
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
  max-width: 860px;
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

    &.placeholder {
      color: var(--text-muted);
      font-weight: 400;
      font-size: 14px;
    }

    &.no-key {
      color: var(--text-muted);
      font-weight: 400;
      font-style: italic;
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

// ============ 私有部署增强样式 ============

// 📦 代码下载区域
.code-download-section {
  margin: 28px 0;
  padding: 24px;
  background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
  border-radius: 12px;
  border: 1px solid #86efac;

  h4 {
    font-size: 17px;
    font-weight: 600;
    margin-bottom: 6px;
    color: #166534;
  }

  .section-desc {
    font-size: 13px;
    color: #15803d;
    margin-bottom: 16px;
  }
}

.download-loading {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px;
  color: var(--text-muted);
  font-size: 14px;

  .loading-spinner {
    animation: spin 1s linear infinite;
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.version-badge {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  flex-wrap: wrap;

  .version-tag {
    padding: 3px 10px;
    background: #16a34a;
    color: white;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
  }

  .version-num {
    font-size: 18px;
    font-weight: 700;
    color: #166534;
  }

  .version-date {
    font-size: 12px;
    color: #15803d;
  }
}

.download-option-card {
  background: white;
  border-radius: 10px;
  padding: 20px;
  margin-bottom: 12px;
  border: 1px solid #d1fae5;
  transition: all 0.2s ease;

  &:hover {
    border-color: #86efac;
    box-shadow: 0 2px 8px rgba(22, 101, 52, 0.08);
  }

  .option-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;

    .option-icon {
      font-size: 22px;
    }

    .option-title-area {
      display: flex;
      align-items: center;
      gap: 8px;

      strong {
        font-size: 15px;
        color: var(--text-primary);
      }
    }
  }

  .option-desc {
    font-size: 13px;
    color: var(--text-secondary);
    margin-bottom: 10px;
    line-height: 1.5;
  }

  .option-meta {
    display: flex;
    gap: 16px;
    margin-bottom: 10px;
    font-size: 12px;
    color: var(--text-muted);
  }

  .option-actions {
    display: flex;
    gap: 10px;
    margin: 12px 0;
    flex-wrap: wrap;
  }

  .option-steps {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px dashed #d1fae5;

    p {
      font-size: 13px;
      color: var(--text-secondary);
      margin: 0 0 6px;
    }

    ol {
      padding-left: 18px;
      margin: 0;

      li {
        font-size: 13px;
        color: var(--text-secondary);
        line-height: 1.7;
        padding: 1px 0;
      }
    }
  }
}

.option-tag {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  background: #f1f5f9;
  color: var(--text-muted);

  &.recommended {
    background: #dcfce7;
    color: #166534;
  }
}

.download-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
  border: none;

  &.primary {
    background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
    color: white;
    box-shadow: 0 2px 8px rgba(22, 163, 74, 0.3);

    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(22, 163, 74, 0.4);
    }
  }

  &.outline {
    background: white;
    color: #166534;
    border: 1px solid #86efac;

    &:hover {
      background: #f0fdf4;
    }
  }
}

.download-compare-tip {
  display: flex;
  gap: 10px;
  padding: 14px 16px;
  background: #fffbeb;
  border-radius: 8px;
  border: 1px solid #fde68a;
  margin-top: 12px;

  .compare-icon {
    font-size: 20px;
    flex-shrink: 0;
  }

  strong {
    display: block;
    font-size: 13px;
    color: #92400e;
    margin-bottom: 4px;
  }

  p {
    font-size: 12px;
    color: #78350f;
    margin: 2px 0;
    line-height: 1.5;
  }
}

.download-empty {
  text-align: center;
  padding: 24px;
  background: white;
  border-radius: 10px;
  border: 1px dashed #d1d5db;

  .empty-icon {
    font-size: 36px;
    margin-bottom: 8px;
  }

  p {
    font-size: 14px;
    color: var(--text-primary);
    margin: 4px 0;
  }

  .empty-hint {
    font-size: 13px !important;
    color: var(--text-muted) !important;
  }
}

// 系统要求
.requirements-box {
  margin-bottom: 16px;
  padding: 16px 20px;
  background: #fefce8;
  border: 1px solid #fde047;
  border-radius: 10px;

  h5 {
    font-size: 14px;
    font-weight: 600;
    color: #854d0e;
    margin-bottom: 10px;
  }
}

.req-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;

  .req-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 10px;
    background: rgba(255, 255, 255, 0.7);
    border-radius: 6px;
    font-size: 13px;

    .req-label {
      color: #92400e;
      font-weight: 500;
      min-width: 50px;
    }

    .req-value {
      color: #78350f;
    }
  }
}

// FAQ 常见问题
.faq-section {
  margin-top: 16px;
  padding: 16px 20px;
  background: #f8fafc;
  border-radius: 10px;
  border: 1px solid #e2e8f0;

  h5 {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 12px;
  }
}

.faq-item {
  padding: 10px 0;
  border-bottom: 1px solid #e2e8f0;

  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }

  strong {
    display: block;
    font-size: 13px;
    color: var(--text-primary);
    margin-bottom: 4px;
  }

  p {
    font-size: 13px;
    color: var(--text-secondary);
    margin: 0;
    line-height: 1.6;
  }
}

// 重要提示框
.important-notice {
  padding: 12px 16px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  margin: 8px 0;
  font-size: 13px;
  color: #991b1b;
  line-height: 1.6;
}

// 备用方法折叠
.alt-method {
  margin-top: 10px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;

  summary {
    padding: 8px 14px;
    background: #f8fafc;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary);

    &:hover {
      color: var(--primary);
    }
  }

  .code-block {
    margin: 8px 14px 14px;
  }
}

.private-admin-notice {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  background: linear-gradient(135deg, #fef3c7 0%, #fef9c3 100%);
  border: 1px solid #fbbf24;
  border-radius: 10px;
  margin-bottom: 24px;

  .notice-icon {
    font-size: 24px;
    flex-shrink: 0;
    line-height: 1;
  }

  .notice-text {
    flex: 1;

    strong {
      display: block;
      font-size: 14px;
      color: #92400e;
      margin-bottom: 6px;
    }

    p {
      font-size: 13px;
      color: #78350f;
      line-height: 1.6;
      margin: 0;
    }

    code {
      background: rgba(146, 64, 14, 0.12);
      color: #92400e;
      padding: 1px 6px;
      border-radius: 3px;
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 12px;
      font-weight: 600;
    }
  }
}

.private-deploy-card {
  max-width: 100%;
}

.deploy-guide-section {
  margin: 28px 0;
  padding: 24px;
  background: linear-gradient(135deg, #eff6ff 0%, #eef2ff 100%);
  border-radius: 12px;
  border: 1px solid #c7d2fe;

  h4 {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 6px;
  }

  .guide-desc {
    font-size: 13px;
    color: var(--text-muted);
    margin-bottom: 16px;
  }
}

.guide-questions {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.guide-question {
  .guide-q-label {
    display: block;
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary);
    margin-bottom: 8px;
  }
}

.guide-options {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;

  button {
    padding: 8px 16px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: white;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      border-color: var(--primary);
      color: var(--primary);
    }

    &.active {
      background: var(--primary);
      color: white;
      border-color: var(--primary);
    }
  }
}

.guide-result {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  padding: 12px 16px;
  background: white;
  border-radius: 8px;
  border: 1px solid #a5b4fc;
  flex-wrap: wrap;

  .guide-result-icon {
    font-size: 20px;
    flex-shrink: 0;
  }

  .guide-result-text {
    font-size: 14px;
    color: var(--text-primary);
    flex: 1;

    strong {
      color: var(--primary);
    }
  }

  .guide-go-btn {
    padding: 6px 14px;
    background: var(--primary);
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;

    &:hover {
      opacity: 0.9;
      transform: translateY(-1px);
    }
  }
}

.guide-q-hint {
  font-size: 12px;
  color: var(--text-muted);
  margin: 2px 0 6px;
}

.guide-help-box {
  margin-top: 16px;
  padding: 16px 20px;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-radius: 10px;
  border: 1px solid #f59e0b;

  .help-box-content {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    margin-bottom: 12px;

    .help-box-icon {
      font-size: 24px;
      flex-shrink: 0;
    }

    .help-box-text {
      strong {
        display: block;
        font-size: 14px;
        color: #92400e;
        margin-bottom: 4px;
      }

      p {
        font-size: 13px;
        color: #78350f;
        margin: 0;
      }
    }
  }

  .help-contact-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 10px 24px;
    background: #07c160;
    color: white;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    text-decoration: none;
    transition: all 0.2s;

    &:hover {
      background: #06ae56;
      transform: translateY(-1px);
    }
  }
}

.help-link {
  color: var(--primary);
  text-decoration: underline;
  font-weight: 500;
}

.btn-service {
  border-color: #07c160;
  color: #07c160;

  &:hover {
    background: #07c160;
    color: white;
  }
}

.deploy-tabs-section {
  margin: 28px 0;
}

.deploy-tabs {
  display: flex;
  border-bottom: 2px solid var(--border);
  margin-bottom: 0;
}

.deploy-tab {
  position: relative;
  padding: 12px 20px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-muted);
  background: none;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;

  &:hover {
    color: var(--primary);
  }

  &.active {
    color: var(--primary);
    border-bottom-color: var(--primary);
  }

  .tab-badge {
    display: inline-block;
    padding: 1px 6px;
    background: #ef4444;
    color: white;
    font-size: 10px;
    font-weight: 600;
    border-radius: 4px;
    margin-left: 4px;
    vertical-align: super;
  }
}

.deploy-content {
  padding: 20px 0 0;
}

.deploy-intro {
  margin-bottom: 16px;
  padding: 12px 16px;
  background: var(--bg-light);
  border-radius: 8px;
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;

  p {
    margin: 0;
  }
}

.deploy-method-toggle {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;

  button {
    padding: 8px 18px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: white;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      border-color: var(--primary);
    }

    &.active {
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      color: white;
      border-color: transparent;
    }
  }
}

.method-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.step-card {
  display: flex;
  gap: 16px;
  padding: 16px;
  border-radius: 10px;
  background: var(--bg-light);
  transition: all 0.2s ease;

  &:hover {
    background: #f1f5f9;
  }

  &.highlight {
    background: linear-gradient(135deg, #eff6ff 0%, #eef2ff 100%);
    border: 1px solid #c7d2fe;
  }

  .step-num {
    width: 32px;
    height: 32px;
    min-width: 32px;
    background: var(--primary);
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 700;
    margin-top: 2px;
  }

  .step-body {
    flex: 1;
    text-align: left;

    h5 {
      font-size: 15px;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 6px;
    }

    p {
      font-size: 13px;
      color: var(--text-secondary);
      line-height: 1.6;
      margin: 4px 0;
    }

    ul, ol {
      padding-left: 18px;
      margin: 6px 0;

      li {
        font-size: 13px;
        color: var(--text-secondary);
        line-height: 1.6;
        padding: 2px 0;
      }
    }

    a {
      color: var(--primary);
      text-decoration: underline;
    }

    code {
      background: rgba(99, 102, 241, 0.1);
      color: #4f46e5;
      padding: 1px 5px;
      border-radius: 3px;
      font-size: 12px;
      font-family: 'Consolas', 'Monaco', monospace;
    }
  }
}

.code-block {
  position: relative;
  background: #1e293b;
  border-radius: 8px;
  padding: 14px 16px;
  margin: 8px 0;
  overflow-x: auto;

  code {
    display: block;
    color: #e2e8f0;
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    font-size: 12px;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-all;
    background: none;
    padding: 0;
    border-radius: 0;
  }

  .code-copy-btn {
    position: absolute;
    top: 8px;
    right: 8px;
    padding: 3px 10px;
    background: rgba(255, 255, 255, 0.15);
    color: #94a3b8;
    border: none;
    border-radius: 4px;
    font-size: 11px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      background: rgba(255, 255, 255, 0.25);
      color: white;
    }
  }
}

.os-switch {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;

  button {
    padding: 4px 12px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: white;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s;

    &.active {
      background: var(--primary);
      color: white;
      border-color: var(--primary);
    }
  }
}

.software-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin: 8px 0;

  .software-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background: white;
    border-radius: 6px;
    font-size: 13px;

    strong {
      color: var(--text-primary);
    }

    span {
      color: var(--primary);
      font-size: 12px;
    }
  }
}

.auto-steps-list {
  margin: 10px 0;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 8px;

  p {
    font-weight: 500;
    margin-bottom: 8px;
  }

  .auto-step-item {
    font-size: 13px;
    color: var(--text-secondary);
    padding: 3px 0;
    line-height: 1.5;
  }
}

.tip-text {
  color: #d97706 !important;
  font-weight: 500;
}

.maintenance-section {
  margin: 28px 0;

  h4 {
    font-size: 15px;
    font-weight: 600;
    margin-bottom: 12px;
  }
}

.command-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;

  .command-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    background: var(--bg-light);
    border-radius: 8px;

    .cmd-label {
      font-size: 12px;
      color: var(--text-muted);
      min-width: 80px;
    }

    code {
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 12px;
      color: #4f46e5;
      background: rgba(99, 102, 241, 0.1);
      padding: 3px 8px;
      border-radius: 4px;
    }
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

  .deploy-tabs {
    flex-wrap: wrap;
    gap: 4px;
  }

  .deploy-tab {
    padding: 8px 12px;
    font-size: 13px;
  }

  .guide-options {
    flex-direction: column;
  }

  .deploy-method-toggle {
    flex-direction: column;
  }

  .software-grid {
    grid-template-columns: 1fr;
  }

  .command-grid {
    grid-template-columns: 1fr;
  }

  .step-card {
    flex-direction: column;
    gap: 10px;
  }

  .req-grid {
    grid-template-columns: 1fr;
  }

  .option-actions {
    flex-direction: column;
  }

  .download-action-btn {
    justify-content: center;
    width: 100%;
  }
}
</style>
