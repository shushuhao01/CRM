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

        <!-- 授权验证区域 -->
        <div class="license-section" v-if="needsLicense">
          <!-- 已验证状态 -->
          <div v-if="licenseVerified && tenantInfo">
            <div :class="['license-verified', { 'license-expired': tenantExpired }]">
              <div :class="['license-verified-icon', { 'expired-icon': tenantExpired }]">
                <svg v-if="!tenantExpired" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>
                </svg>
                <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
              <div class="license-verified-info">
                <span :class="['tenant-name', { 'expired-name': tenantExpired }]">{{ tenantInfo.tenantName }}</span>
                <span v-if="!tenantExpired" class="tenant-meta">{{ tenantInfo.packageName || '标准版' }}
                  <template v-if="formatExpireDate(tenantInfo.expireDate)"> · {{ formatExpireDate(tenantInfo.expireDate) }}</template>
                </span>
                <span v-else class="tenant-meta expired-meta">授权已过期，请联系管理员续费恢复</span>
              </div>
              <el-tooltip content="切换企业" placement="top">
                <button class="license-switch-btn" @click="handleSwitchTenant">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/>
                    <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
                  </svg>
                </button>
              </el-tooltip>
            </div>
            <!-- 过期提醒横幅 -->
            <div v-if="tenantExpired" class="license-expired-banner">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              <span>授权已过期，可登录但不能写入数据，请联系管理员续费恢复</span>
            </div>
          </div>

          <!-- 未验证状态 -->
          <div v-else>
            <!-- 引导入口（未展开时） -->
            <div v-if="!showLicenseInput" class="license-guide" @click="showLicenseInput = true">
              <div class="license-guide-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <span class="license-guide-text">请先验证企业身份</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2" stroke-linecap="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>

            <!-- 展开的输入区域 -->
            <transition name="license-expand">
              <div v-if="showLicenseInput" class="license-input-area">
                <!-- 模式切换 -->
                <div class="license-mode-tabs">
                  <button :class="['mode-tab', { active: verifyMode === 'code' }]" @click="verifyMode = 'code'; licenseError = ''">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3h-8l-2 4h12z"/></svg>
                    租户编码
                  </button>
                  <button :class="['mode-tab', { active: verifyMode === 'license' }]" @click="verifyMode = 'license'; licenseError = ''">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
                    授权码激活
                  </button>
                </div>

                <!-- 租户编码模式 -->
                <div v-if="verifyMode === 'code'">
                  <div class="license-input-row">
                    <el-input
                      v-model="tenantCode"
                      placeholder="请输入租户编码"
                      size="large"
                      clearable
                      :disabled="licenseLoading"
                      @keyup.enter="handleVerify"
                    >
                      <template #prefix>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2">
                          <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3h-8l-2 4h12z"/>
                        </svg>
                      </template>
                    </el-input>
                    <el-button type="primary" :loading="licenseLoading" @click="handleVerify" class="license-verify-btn">
                      {{ licenseLoading ? '' : '确认' }}
                    </el-button>
                  </div>
                  <div class="license-help">
                    <span>租户编码由企业管理员提供，如 T20260XXXXX</span>
                  </div>
                </div>

                <!-- 授权码模式 -->
                <div v-if="verifyMode === 'license'">
                  <div class="license-input-row">
                    <el-input
                      v-model="licenseKey"
                      placeholder="TENANT-XXXX-XXXX-XXXX-XXXX"
                      size="large"
                      clearable
                      :disabled="licenseLoading"
                      @keyup.enter="handleVerify"
                    >
                      <template #prefix>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2">
                          <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
                        </svg>
                      </template>
                    </el-input>
                    <el-button type="primary" :loading="licenseLoading" @click="handleVerify" class="license-verify-btn">
                      {{ licenseLoading ? '' : '激活' }}
                    </el-button>
                  </div>
                  <div class="license-help">
                    <span>授权码在购买后通过短信/邮件发送，首次使用需激活</span>
                  </div>
                </div>

                <!-- 错误提示 -->
                <div v-if="licenseError" class="license-error">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                  <span>{{ licenseError }}</span>
                </div>
              </div>
            </transition>
          </div>
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
          <p>{{ configStore.systemConfig.copyrightText || `© ${new Date().getFullYear()} ${configStore.systemConfig.companyName || '云客 · 智能销售管理系统'}` }}</p>
          <p class="card-footer-beian" v-if="configStore.systemConfig.icpNumber || configStore.systemConfig.policeNumber">
            <a v-if="configStore.systemConfig.icpNumber" href="https://beian.miit.gov.cn/" target="_blank" class="beian-link">{{ configStore.systemConfig.icpNumber }}</a>
            <span v-if="configStore.systemConfig.icpNumber && configStore.systemConfig.policeNumber" class="beian-sep">|</span>
            <a v-if="configStore.systemConfig.policeNumber" href="http://www.beian.gov.cn/" target="_blank" class="beian-link">🛡️ {{ configStore.systemConfig.policeNumber }}</a>
          </p>
        </div>
      </div>
    </div>

    <!-- 🔥 首次私有部署激活成功 - 管理员凭据弹窗 -->
    <el-dialog v-model="showAdminCredentialsDialog" title="🎉 系统激活成功" width="480px" :close-on-click-modal="false" :close-on-press-escape="false">
      <div style="text-align: center; padding: 10px 0;">
        <div style="font-size: 48px; margin-bottom: 12px;">✅</div>
        <p style="font-size: 16px; color: #333; margin-bottom: 20px;">私有部署系统首次激活成功，以下是您的管理员账号信息</p>
        <div style="background: #f5f7fa; border-radius: 8px; padding: 16px; text-align: left; margin-bottom: 16px;">
          <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e4e7ed;">
            <span style="color: #909399;">👤 管理员账号</span>
            <span style="font-weight: 600; font-family: monospace; font-size: 15px;">{{ activationAdminInfo.username }}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 10px 0;">
            <span style="color: #909399;">🔐 初始密码</span>
            <span style="font-weight: 600; font-family: monospace; font-size: 15px; color: #e6a23c;">{{ activationAdminInfo.password }}</span>
          </div>
        </div>
        <el-button type="primary" size="large" @click="copyAdminCredentials" style="width: 100%; margin-bottom: 12px;">
          📋 一键复制账号密码
        </el-button>
        <div style="background: #fdf6ec; border: 1px solid #faecd8; border-radius: 6px; padding: 12px; text-align: left; font-size: 13px; color: #e6a23c;">
          <p style="margin: 0 0 4px;">⚠️ 重要提示：</p>
          <ul style="margin: 0; padding-left: 18px; line-height: 1.8;">
            <li>此信息仅在首次激活时展示一次，请立即复制保存</li>
            <li>首次登录后请立即修改密码</li>
          </ul>
        </div>
      </div>
      <template #footer>
        <el-button type="primary" @click="showAdminCredentialsDialog = false" round>我知道了，去登录</el-button>
      </template>
    </el-dialog>

    <!-- 协议弹窗 -->
    <el-dialog v-model="agreementDialogVisible" :title="agreementDialogTitle" width="680px" class="agreement-dialog" top="6vh">
      <div class="agreement-content" v-html="sanitizeHtml(agreementDialogContent)"></div>
      <template #footer>
        <el-button @click="agreementDialogVisible = false" round>关闭</el-button>
        <el-button type="primary" @click="agreeAndClose" round>我已阅读并同意</el-button>
      </template>
    </el-dialog>
  </div>
</template>


<script setup lang="ts">
import { ref, reactive, nextTick, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useConfigStore } from '@/stores/config'
import { ElMessage } from 'element-plus'
import type { FormInstance } from 'element-plus'
import { preloadAppData } from '@/services/appInitService'
import { sanitizeHtml } from '@/utils/sanitize'
import {
  verifyTenantLicense,
  verifyTenantCode,
  getLocalTenantInfo,
  saveLocalTenantInfo,
  clearLocalTenantInfo,
  needLicenseVerification,
  checkPrivateActivation,
  getDeployMode,
  saveDeployMode,
  type TenantInfo
} from '@/api/tenantLicense'

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

// ===== 授权验证相关 =====
const needsLicense = ref(false)
const licenseVerified = ref(false)
const tenantInfo = ref<TenantInfo | null>(null)
const licenseKey = ref('')
const tenantCode = ref('')
const showLicenseInput = ref(false)
const licenseLoading = ref(false)
const licenseError = ref('')
const verifyMode = ref<'code' | 'license'>('code')
const tenantExpired = ref(false)

// 🔥 首次私有激活 - 管理员凭据弹窗
const showAdminCredentialsDialog = ref(false)
const activationAdminInfo = reactive({ username: '', password: '' })

// 格式化到期日期
const formatExpireDate = (date: string | null) => {
  if (!date) return ''
  try {
    return new Date(date).toLocaleDateString('zh-CN')
  } catch {
    return date
  }
}

// 初始化授权状态
onMounted(async () => {
  needsLicense.value = needLicenseVerification()
  const deployMode = getDeployMode() // 'private' | 'saas'

  // ---- 第一步：优先从本地缓存恢复（同一浏览器快速登录）----
  const cached = getLocalTenantInfo()
  const savedCode = localStorage.getItem('crm_tenant_code')
  const savedKey  = localStorage.getItem('crm_license_key')

  if (cached && (savedCode || savedKey)) {
    try {
      let res
      if (savedCode) {
        res = await verifyTenantCode(savedCode)
      } else if (savedKey) {
        res = await verifyTenantLicense(savedKey)
      }
      if (res?.success && res.data) {
        tenantInfo.value = res.data
        saveLocalTenantInfo(res.data)
        if (res.data.deployType) saveDeployMode(res.data.deployType)
        tenantExpired.value = !!res.data.expired
        licenseVerified.value = true
        return
      } else {
        clearLocalCache() // 缓存已失效，清除
      }
    } catch {
      // 网络错误时信任缓存（离线容错）
      tenantInfo.value = cached
      licenseVerified.value = true
      return
    }
  }

  // ---- 第二步：无有效缓存时，根据部署模式处理 ----
  if (deployMode === 'private') {
    // 私有部署：服务端检查是否已有激活的租户
    // 已激活 → 自动填充，员工无需手动输入任何编码
    // 未激活 → 直接展开授权码输入框
    try {
      const privateStatus = await checkPrivateActivation()
      if (privateStatus.activated && privateStatus.tenantId) {
        const info: TenantInfo = {
          tenantId: privateStatus.tenantId!,
          tenantCode: privateStatus.tenantCode!,
          tenantName: privateStatus.tenantName!,
          packageName: privateStatus.packageName || '',
          maxUsers: privateStatus.maxUsers || 50,
          expireDate: privateStatus.expireDate || null,
          features: privateStatus.features || null,
          packageFeatures: privateStatus.packageFeatures || null,
          deployType: 'private'
        }
        tenantInfo.value = info
        saveLocalTenantInfo(info)
        saveDeployMode('private')
        localStorage.setItem('crm_tenant_code', info.tenantCode)
        tenantExpired.value = !!privateStatus.expired
        licenseVerified.value = true
      } else {
        // 私有系统尚未激活，直接展开授权码输入
        showLicenseInput.value = true
        verifyMode.value = 'license' // 私有模式默认用授权码激活
      }
    } catch {
      // 检查失败，展开授权码输入（首次激活场景）
      showLicenseInput.value = true
      verifyMode.value = 'license'
    }
  }
  // SaaS模式：无缓存时，显示"请先验证企业身份"引导入口（保持默认的 showLicenseInput = false）
})

// 统一验证（根据当前模式调用不同API）
const handleVerify = async () => {
  licenseError.value = ''
  licenseLoading.value = true

  try {
    let res
    if (verifyMode.value === 'code') {
      const code = tenantCode.value.trim()
      if (!code) { licenseError.value = '请输入租户编码'; return }

      // 智能识别：检查是否误填了授权码
      if (code.includes('-') && (code.startsWith('PRIVATE-') || code.startsWith('TENANT-'))) {
        licenseError.value = '您输入的是授权码，请切换到"授权码激活"模式'
        verifyMode.value = 'license'
        licenseKey.value = code
        tenantCode.value = ''
        return
      }

      // 格式验证：租户编码应该是 T/P 开头 + 数字/字母组合
      if (!code.match(/^[TP]\d{6,}/)) {
        licenseError.value = '租户编码格式不正确，应为 T 或 P 开头的编码（如：T20260XXXXX）'
        return
      }

      res = await verifyTenantCode(code)
      if (res.success && res.data) {
        // 保存租户编码到本地
        localStorage.setItem('crm_tenant_code', res.data.tenantCode)
      }
    } else {
      const key = licenseKey.value.trim()
      if (!key) { licenseError.value = '请输入授权码'; return }

      // 智能识别：检查是否误填了租户编码
      if (!key.includes('-') && (key.startsWith('T') || key.startsWith('P'))) {
        licenseError.value = '您输入的是租户编码，请切换到"租户编码"模式'
        verifyMode.value = 'code'
        tenantCode.value = key
        licenseKey.value = ''
        return
      }

      // 格式验证：授权码应该是 PRIVATE-/TENANT- 开头，包含多个 - 分隔的部分
      if (!key.match(/^(PRIVATE|TENANT)-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/)) {
        licenseError.value = '授权码格式不正确，应为 PRIVATE-XXXX-XXXX-XXXX-XXXX 或 TENANT-XXXX-XXXX-XXXX-XXXX 格式'
        return
      }

      res = await verifyTenantLicense(key)
      if (res.success && res.data) {
        // 保存授权码和租户编码到本地
        localStorage.setItem('crm_license_key', key)
        localStorage.setItem('crm_tenant_code', res.data.tenantCode)
      }
    }

    if (res.success && res.data) {
      tenantInfo.value = res.data
      saveLocalTenantInfo(res.data)
      tenantExpired.value = !!res.data.expired
      licenseVerified.value = true
      if (res.data.deployType) {
        saveDeployMode(res.data.deployType)
      }

      const resAny = res as any
      if (resAny.data?.isFirstActivation && resAny.data?.adminAccount) {
        activationAdminInfo.username = resAny.data.adminAccount.username || ''
        activationAdminInfo.password = resAny.data.adminAccount.password || 'Aa123456'
        showAdminCredentialsDialog.value = true
      } else if (res.data.expired) {
        ElMessage.warning(`${res.data.tenantName}：授权已过期，可登录但不能写入数据`)
      } else {
        ElMessage.success(`验证成功：${res.data.tenantName}`)
      }
    } else {
      const errData = res as any
      // 🔥 特殊错误类型处理（授权码类型不匹配）
      if (errData.errorType === 'WRONG_LICENSE_TYPE') {
        licenseError.value = errData.message || '授权码类型不匹配，请检查使用的授权码是否正确'
      } else {
        licenseError.value = errData.message || '验证失败'
      }
      // 如果需要激活，自动切换到授权码模式
      if (errData.needActivation) {
        verifyMode.value = 'license'
      }
    }
  } catch (e: any) {
    const errMsg = e?.response?.data?.message || e?.message || '验证失败，请检查网络'
    const errorType = e?.response?.data?.errorType

    // 特殊错误类型处理
    if (errorType === 'WRONG_LICENSE_TYPE') {
      licenseError.value = '该授权码为私有部署专用，不能在租户系统中使用。如需使用私有部署，请联系管理员获取私有部署安装包'
    } else {
      licenseError.value = errMsg
    }

    // 如果后端说需要激活，自动切换到授权码模式
    if (e?.response?.data?.needActivation) {
      verifyMode.value = 'license'
    }
  } finally {
    licenseLoading.value = false
  }
}

// 🔥 一键复制管理员凭据
const copyAdminCredentials = async () => {
  const text = `管理员账号：${activationAdminInfo.username}\n初始密码：${activationAdminInfo.password}\n\n⚠️ 首次登录后请立即修改密码`
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('已复制到剪贴板')
  } catch {
    ElMessage.warning('复制失败，请手动记录')
  }
}

// 切换租户
const handleSwitchTenant = () => {
  licenseVerified.value = false
  tenantInfo.value = null
  tenantExpired.value = false
  licenseKey.value = ''
  tenantCode.value = ''
  clearLocalCache()
  showLicenseInput.value = true
}

// 清除本地缓存
const clearLocalCache = () => {
  clearLocalTenantInfo()
  localStorage.removeItem('crm_license_key')
  localStorage.removeItem('crm_tenant_code')
}

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }, { min: 6, message: '密码至少6位', trigger: 'blur' }]
}

const getDefaultUserAgreement = () => `<div style="padding:28px 32px;line-height:2;color:#374151;font-size:14px;">
<h2 style="text-align:center;color:#1f2937;margin-bottom:24px;font-size:22px;font-weight:700;padding-bottom:16px;border-bottom:3px solid #6366f1;letter-spacing:1px;">用户使用协议</h2>
<p style="background:#f0f1fe;padding:16px 18px;border-radius:8px;border-left:4px solid #6366f1;margin:20px 0;color:#4b5563;">
  <strong>欢迎使用本CRM客户管理系统</strong>（以下简称"本系统"）。在使用本系统之前，<strong style="color:#6366f1;">请您仔细阅读并充分理解本协议的全部内容</strong>。
</p>
<h3 style="color:#6366f1;margin:28px 0 14px;font-size:16px;font-weight:600;padding-left:12px;border-left:4px solid #6366f1;">一、协议的接受</h3>
<p style="margin:10px 0;padding-left:12px;"><strong>1.1</strong> 本协议是您与本系统运营方之间关于使用本系统服务所订立的协议。</p>
<p style="margin:10px 0;padding-left:12px;"><strong>1.2</strong> 您点击<strong style="color:#6366f1;">"同意"</strong>按钮即表示您完全接受本协议的全部条款。</p>
<h3 style="color:#6366f1;margin:28px 0 14px;font-size:16px;font-weight:600;padding-left:12px;border-left:4px solid #6366f1;">二、服务内容</h3>
<p style="margin:10px 0;padding-left:12px;"><strong>2.1</strong> 本系统为企业提供客户关系管理服务，包括但不限于：</p>
<ul style="padding-left:36px;margin:12px 0;line-height:2.2;color:#4b5563;">
  <li>✓ 客户信息管理</li><li>✓ 订单管理</li><li>✓ 业绩统计</li><li>✓ 数据分析</li><li>✓ 团队协作</li>
</ul>
<h3 style="color:#6366f1;margin:28px 0 14px;font-size:16px;font-weight:600;padding-left:12px;border-left:4px solid #6366f1;">三、用户权利和义务</h3>
<p style="margin:14px 0;padding-left:12px;"><strong>3.1 用户权利：</strong></p>
<ul style="padding-left:36px;margin:12px 0;line-height:2.2;color:#4b5563;">
  <li>✓ 使用本系统提供的各项功能</li><li>✓ 管理自己的客户数据</li><li>✓ 查看业绩统计报表</li><li>✓ 获得技术支持服务</li>
</ul>
<p style="margin:14px 0;padding-left:12px;"><strong>3.2 用户义务：</strong></p>
<ul style="padding-left:36px;margin:12px 0;line-height:2;color:#4b5563;">
  <li style="padding:10px 14px;background:#fef2f2;border-left:4px solid #ef4444;border-radius:4px;margin:10px 0;list-style:none;"><strong style="color:#ef4444;">⚠️ 严禁将本系统用于任何违法犯罪活动，包括但不限于诈骗、洗钱、传销等</strong></li>
  <li>• 遵守国家法律法规和社会公德</li><li>• 不得利用本系统侵害他人合法权益</li><li>• 妥善保管账号密码，对账号下的所有行为负责</li><li>• 不得恶意攻击、破坏系统</li><li>• 不得泄露客户隐私信息</li>
</ul>
<h3 style="color:#6366f1;margin:28px 0 14px;font-size:16px;font-weight:600;padding-left:12px;border-left:4px solid #6366f1;">四、免责声明</h3>
<p style="color:#ef4444;font-weight:600;margin:16px 0;padding:14px 16px;background:#fef2f2;border-left:4px solid #ef4444;border-radius:6px;font-size:14px;">
  ⚠️ 重要提示：本系统仅作为工具提供服务，<strong>不对用户使用本系统产生的内容、行为及后果承担任何责任</strong>。
</p>
<p style="margin:10px 0;padding-left:12px;"><strong>4.2</strong> 本系统不对因以下原因导致的损失承担责任：</p>
<ul style="padding-left:36px;margin:12px 0;line-height:2.2;color:#4b5563;">
  <li>• 用户违法违规使用本系统</li><li>• 不可抗力因素</li><li>• 网络故障、设备故障</li><li>• 用户操作不当</li><li>• 第三方侵权行为</li>
</ul>
<h3 style="color:#6366f1;margin:28px 0 14px;font-size:16px;font-weight:600;padding-left:12px;border-left:4px solid #6366f1;">五、数据安全</h3>
<p style="margin:10px 0;padding-left:12px;"><strong>5.1</strong> 本系统采用<strong style="color:#6366f1;">行业标准的安全措施</strong>保护用户数据。</p>
<p style="margin:10px 0;padding-left:12px;"><strong>5.2</strong> 用户应定期备份重要数据，本系统不对数据丢失承担责任。</p>
<h3 style="color:#6366f1;margin:28px 0 14px;font-size:16px;font-weight:600;padding-left:12px;border-left:4px solid #6366f1;">六、知识产权</h3>
<p style="margin:10px 0;padding-left:12px;"><strong>6.1</strong> 本系统的所有内容均受<strong style="color:#6366f1;">知识产权法保护</strong>。</p>
<p style="margin:10px 0;padding-left:12px;"><strong>6.2</strong> 未经许可，用户不得复制、传播、修改本系统的任何内容。</p>
<h3 style="color:#6366f1;margin:28px 0 14px;font-size:16px;font-weight:600;padding-left:12px;border-left:4px solid #6366f1;">七、违规处理</h3>
<p style="margin:10px 0;padding-left:12px;"><strong>7.1</strong> 如发现用户违反本协议或从事违法活动，本系统有权立即终止服务、冻结或注销账号、向有关部门报告并追究法律责任。</p>
<h3 style="color:#6366f1;margin:28px 0 14px;font-size:16px;font-weight:600;padding-left:12px;border-left:4px solid #6366f1;">八、协议的变更</h3>
<p style="margin:10px 0;padding-left:12px;"><strong>8.1</strong> 本系统有权随时修改本协议条款，协议变更后继续使用本系统即视为接受新协议。</p>
<h3 style="color:#6366f1;margin:28px 0 14px;font-size:16px;font-weight:600;padding-left:12px;border-left:4px solid #6366f1;">九、争议解决</h3>
<p style="margin:10px 0;padding-left:12px;"><strong>9.1</strong> 本协议适用<strong style="color:#6366f1;">中华人民共和国法律</strong>。若发生争议，双方应友好协商解决。</p>
<div style="margin-top:32px;padding-top:16px;border-top:2px dashed #e5e7eb;text-align:center;">
  <p style="color:#9ca3af;font-size:12px;margin:0;">最后更新日期：${new Date().toLocaleDateString('zh-CN')}</p>
</div>
</div>`

const getDefaultPrivacyPolicy = () => `<div style="padding:28px 32px;line-height:2;color:#374151;font-size:14px;">
<h2 style="text-align:center;color:#1f2937;margin-bottom:24px;font-size:22px;font-weight:700;padding-bottom:16px;border-bottom:3px solid #10b981;letter-spacing:1px;">隐私政策</h2>
<p style="background:#ecfdf5;padding:16px 18px;border-radius:8px;border-left:4px solid #10b981;margin:20px 0;color:#4b5563;">
  本隐私协议适用于本CRM客户管理系统。我们非常重视用户的隐私保护，特制定本协议。
</p>
<h3 style="color:#10b981;margin:28px 0 14px;font-size:16px;font-weight:600;padding-left:12px;border-left:4px solid #10b981;">一、信息收集</h3>
<p style="margin:10px 0;padding-left:12px;"><strong>1.1 我们收集的信息类型：</strong></p>
<ul style="padding-left:36px;margin:12px 0;line-height:2.2;color:#4b5563;">
  <li><strong>账号信息：</strong>用户名、密码、邮箱、手机号</li>
  <li><strong>个人信息：</strong>姓名、部门、职位、头像</li>
  <li><strong>业务信息：</strong>客户数据、订单信息、业绩数据</li>
  <li><strong>使用信息：</strong>登录日志、操作记录、IP地址</li>
  <li><strong>设备信息：</strong>浏览器类型、操作系统</li>
</ul>
<h3 style="color:#10b981;margin:28px 0 14px;font-size:16px;font-weight:600;padding-left:12px;border-left:4px solid #10b981;">二、信息使用</h3>
<p style="margin:10px 0;padding-left:12px;"><strong>2.1</strong> 我们使用收集的信息用于提供服务、改进体验、安全监控和技术支持。</p>
<p style="margin:10px 0;padding-left:12px;"><strong>2.2 我们承诺：</strong></p>
<ul style="padding-left:36px;margin:12px 0;line-height:2.2;color:#4b5563;">
  <li>不会将用户信息用于本协议未载明的其他用途</li>
  <li>不会向第三方出售、出租或共享用户信息</li>
  <li>严格限制信息访问权限</li>
</ul>
<h3 style="color:#10b981;margin:28px 0 14px;font-size:16px;font-weight:600;padding-left:12px;border-left:4px solid #10b981;">三、信息存储与保护</h3>
<p style="margin:10px 0;padding-left:12px;"><strong>3.1</strong> 用户数据存储在安全的服务器上，采用加密技术保护敏感信息。</p>
<p style="margin:10px 0;padding-left:12px;"><strong>3.2 安全措施：</strong></p>
<ul style="padding-left:36px;margin:12px 0;line-height:2.2;color:#4b5563;">
  <li>数据加密传输（HTTPS）</li><li>密码加密存储（不可逆加密）</li><li>访问权限控制（角色权限管理）</li><li>定期安全审计</li>
</ul>
<h3 style="color:#10b981;margin:28px 0 14px;font-size:16px;font-weight:600;padding-left:12px;border-left:4px solid #10b981;">四、信息共享</h3>
<p style="color:#ef4444;font-weight:600;margin:10px 0;padding-left:12px;">我们不会与第三方共享用户信息，除非获得用户明确同意或法律法规要求。</p>
<h3 style="color:#10b981;margin:28px 0 14px;font-size:16px;font-weight:600;padding-left:12px;border-left:4px solid #10b981;">五、用户权利</h3>
<p style="margin:10px 0;padding-left:12px;">您享有以下权利：访问、更正、删除您的个人信息，撤回授权，注销账号。</p>
<h3 style="color:#10b981;margin:28px 0 14px;font-size:16px;font-weight:600;padding-left:12px;border-left:4px solid #10b981;">六、未成年人保护</h3>
<p style="margin:10px 0;padding-left:12px;">本系统不向未满18周岁的未成年人提供服务。</p>
<h3 style="color:#10b981;margin:28px 0 14px;font-size:16px;font-weight:600;padding-left:12px;border-left:4px solid #10b981;">七、隐私协议的变更</h3>
<p style="margin:10px 0;padding-left:12px;">我们可能适时修订本协议。变更后的协议将在系统内公布，继续使用即视为接受。</p>
<h3 style="color:#10b981;margin:28px 0 14px;font-size:16px;font-weight:600;padding-left:12px;border-left:4px solid #10b981;">八、联系我们</h3>
<p style="margin:10px 0;padding-left:12px;">如对本隐私协议有任何疑问，请通过系统内的联系方式与我们取得联系，我们将在15个工作日内予以回复。</p>
<div style="margin-top:32px;padding-top:16px;border-top:2px dashed #e5e7eb;text-align:center;">
  <p style="color:#9ca3af;font-size:12px;margin:0;">最后更新日期：${new Date().toLocaleDateString('zh-CN')}</p>
</div>
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
  // SaaS模式下检查授权验证
  if (needsLicense.value && !licenseVerified.value) {
    ElMessage.warning('请先验证企业身份（输入租户编码或授权码）')
    showLicenseInput.value = true
    return
  }
  if (!loginFormRef.value || loading.value) return
  if (debounce) clearTimeout(debounce)

  await loginFormRef.value.validate(async (valid) => {
    if (valid) {
      loading.value = true
      try {
        const result = await userStore.loginWithRetry(loginForm.username, loginForm.password, false, 3, tenantInfo.value?.tenantId)
        if (result) {
          localStorage.setItem('user_agreed_terms', 'true')
          ElMessage.success('登录成功')
          await nextTick()
          preloadAppData().catch(() => {})
          // 统一跳转首页，首次登录/强制修改密码由 App.vue 弹窗处理
          window.location.href = '/'
        } else { ElMessage.error('登录失败') }
      } catch (e: any) {
        if (userStore.token && userStore.isLoggedIn) { window.location.href = '/'; return }
        const errCode = e?.response?.data?.code || e?.code || ''
        const errMsg = e?.response?.data?.message || e?.message || '登录失败'
        if (errCode === 'ONLINE_SEAT_FULL') {
          ElMessage.warning({ message: errMsg, duration: 5000 })
        } else {
          ElMessage.error(errMsg)
        }
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

/* ===== 授权验证区域 ===== */
.license-section {
  margin-bottom: 20px;
}

/* 已验证状态 */
.license-verified {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%);
  border: 1px solid #bbf7d0;
  border-radius: 10px;
  animation: licenseIn 0.4s ease;
}

.license-verified-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(16, 185, 129, 0.15);
}

.license-verified-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.tenant-name {
  font-size: 13px;
  font-weight: 600;
  color: #065f46;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tenant-meta {
  font-size: 11px;
  color: #6b7280;
  line-height: 1.3;
}

.license-switch-btn {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: rgba(16, 185, 129, 0.1);
  border-radius: 6px;
  color: #10b981;
  cursor: pointer;
  transition: all 0.2s;
}

.license-switch-btn:hover {
  background: rgba(16, 185, 129, 0.2);
  transform: rotate(180deg);
}

/* 过期状态样式 */
.license-verified.license-expired {
  background: linear-gradient(135deg, #fef2f2 0%, #fff1f2 100%);
  border-color: #fecaca;
}

.license-verified.license-expired .license-switch-btn {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.license-verified.license-expired .license-switch-btn:hover {
  background: rgba(239, 68, 68, 0.2);
}

.expired-icon {
  box-shadow: 0 1px 3px rgba(239, 68, 68, 0.15) !important;
}

.expired-name {
  color: #991b1b !important;
}

.expired-meta {
  color: #ef4444 !important;
  font-weight: 500;
}

.license-expired-banner {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding: 8px 12px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  font-size: 12px;
  color: #ef4444;
  line-height: 1.4;
}

/* 引导入口 */
.license-guide {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: linear-gradient(135deg, #eef2ff 0%, #f0f1fe 100%);
  border: 1px dashed #c7d2fe;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.25s;
}

.license-guide:hover {
  background: linear-gradient(135deg, #e0e7ff 0%, #eef2ff 100%);
  border-color: #818cf8;
}

.license-guide-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(99, 102, 241, 0.12);
}

.license-guide-text {
  flex: 1;
  font-size: 13px;
  font-weight: 500;
  color: #4338ca;
}

/* 授权码输入区域 */
.license-input-area {
  padding: 14px;
  background: linear-gradient(135deg, #eef2ff 0%, #f8f9fe 100%);
  border: 1px solid #e0e7ff;
  border-radius: 10px;
}

/* 模式切换 */
.license-mode-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 12px;
  padding: 3px;
  background: #e0e7ff;
  border-radius: 8px;
}


.mode-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 6px 0;
  border: none;
  background: transparent;
  border-radius: 6px;
  font-size: 12.5px;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.25s;
}

.mode-tab.active {
  background: white;
  color: #4338ca;
  box-shadow: 0 1px 3px rgba(99, 102, 241, 0.15);
}

.mode-tab:not(.active):hover {
  color: #4338ca;
}

.license-input-row {
  display: flex;
  gap: 8px;
}

.license-input-row :deep(.el-input__wrapper) {
  border-radius: 8px;
  box-shadow: 0 0 0 1px #d1d5db inset;
  background: #fff;
}

.license-input-row :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 2px #6366f1 inset;
}

.license-verify-btn {
  flex-shrink: 0;
  border-radius: 8px !important;
  min-width: 64px;
}

.license-error {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  font-size: 12px;
  color: #ef4444;
}

.license-help {
  margin-top: 8px;
  font-size: 11px;
  color: #9ca3af;
}

/* 展开动画 */
.license-expand-enter-active {
  animation: licenseIn 0.35s ease;
}

.license-expand-leave-active {
  animation: licenseIn 0.25s ease reverse;
}

@keyframes licenseIn {
  from {
    opacity: 0;
    transform: translateY(-8px);
    max-height: 0;
  }
  to {
    opacity: 1;
    transform: translateY(0);
    max-height: 200px;
  }
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

.card-footer-beian {
  margin-top: 6px !important;
  font-size: 11px !important;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  flex-wrap: wrap;
}

.card-footer-beian .beian-link {
  color: #9ca3af;
  text-decoration: none;
  transition: color 0.3s;
}

.card-footer-beian .beian-link:hover {
  color: #7c3aed;
}

.card-footer-beian .beian-sep {
  color: #d1d5db;
  margin: 0 2px;
}

/* 弹窗 */
.agreement-dialog :deep(.el-dialog) {
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.15), 0 10px 30px rgba(99, 102, 241, 0.08);
}
.agreement-dialog :deep(.el-dialog__header) {
  padding: 20px 28px;
  border-bottom: 1px solid #f3f4f6;
  background: linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%);
}
.agreement-dialog :deep(.el-dialog__title) {
  font-weight: 600;
  font-size: 17px;
  color: #1f2937;
}
.agreement-dialog :deep(.el-dialog__body) {
  padding: 0;
  max-height: 60vh;
  overflow-y: auto;
}
.agreement-dialog :deep(.el-dialog__body::-webkit-scrollbar) {
  width: 6px;
}
.agreement-dialog :deep(.el-dialog__body::-webkit-scrollbar-thumb) {
  background: #d1d5db;
  border-radius: 3px;
}
.agreement-dialog :deep(.el-dialog__body::-webkit-scrollbar-track) {
  background: #f9fafb;
}
.agreement-dialog :deep(.el-dialog__footer) {
  padding: 16px 28px;
  border-top: 1px solid #f3f4f6;
  background: #fafbfc;
}
.agreement-content {
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

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
