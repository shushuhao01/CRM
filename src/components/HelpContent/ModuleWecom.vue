<template>
  <div class="help-module-wecom">
    <div class="page-header">
      <h1>企业微信（企微）管理模块</h1>
      <p class="page-desc">云客CRM 企微管理模块深度集成企业微信能力，提供企微授权配置、客户管理、活码管理、获客助手、客户群运营、会话存档、AI助手、对外收款等全套功能，帮助企业在企业微信生态内高效运营和管理客户。</p>
    </div>

    <!-- 模块概述 -->
    <el-card id="wecom-overview" class="section-card">
      <template #header><h2>📱 模块概述</h2></template>
      <el-row :gutter="16">
        <el-col :span="8" v-for="item in overviewItems" :key="item.title">
          <div class="overview-item">
            <span class="overview-icon">{{ item.icon }}</span>
            <div>
              <strong>{{ item.title }}</strong>
              <p>{{ item.desc }}</p>
            </div>
          </div>
        </el-col>
      </el-row>
    </el-card>

    <!-- 企微授权配置 -->
    <el-card id="wecom-config" class="section-card">
      <template #header><h2>🔐 一、企微授权配置</h2></template>
      <p>企微授权是使用所有企微功能的第一步。系统支持两种接入方式：</p>

      <el-descriptions title="接入方式对比" :column="1" border style="margin: 16px 0;">
        <el-descriptions-item label="第三方应用授权（推荐）">
          扫码即可完成授权，无需手动填写 CorpID / Secret，适合快速接入。操作路径：企微管理 → 企微授权 → 扫码授权。
        </el-descriptions-item>
        <el-descriptions-item label="自建应用配置">
          手动填写企业 CorpID、AgentID 和 Secret，适合自有企业微信应用。操作路径：企微管理 → 企微授权 → 自建应用。
        </el-descriptions-item>
      </el-descriptions>

      <el-alert type="info" :closable="false" style="margin-bottom: 12px;">
        <template #title>企微配额说明</template>
        <span>每个账号按套餐有对应的企微配额（最大接入企业数量）。页面顶部展示配额进度条，配额不足时可在套餐中心增购。</span>
      </el-alert>

      <h3>配置管理功能</h3>
      <el-table :data="configFeatures" border>
        <el-table-column prop="feature" label="功能" width="180" />
        <el-table-column prop="desc" label="说明" />
      </el-table>

      <h3 style="margin-top:16px">回调配置（Callback）</h3>
      <p>企微推送事件（如好友申请、消息等）需在企微后台配置回调 URL。系统提供回调 URL 生成和验证功能，路径：企微授权 → 回调管理。</p>

      <h3 style="margin-top:16px">密钥管理（Secret）</h3>
      <p>系统安全存储各类 Secret（通讯录 Secret、客服 Secret、消息 Secret 等），支持独立配置不同应用密钥。</p>

      <h3 style="margin-top:16px">功能权限（FeatureAuth）</h3>
      <p>可针对每个企微配置独立开关功能权限，如：开启/关闭会话存档、获客助手、AI助手等。</p>
    </el-card>

    <!-- 企业客户管理 -->
    <el-card id="wecom-customer" class="section-card">
      <template #header><h2>👤 二、企业客户管理</h2></template>
      <p>企微客户管理模块同步企业微信中的外部联系人（即企业的微信客户），并与 CRM 客户数据深度关联。</p>

      <h3>主要功能</h3>
      <ul class="feature-list">
        <li><strong>客户列表</strong>：展示全部企微外部联系人，支持按配置、员工、标签等多维度筛选。</li>
        <li><strong>客户详情</strong>：查看客户微信头像、昵称、添加时间、关联员工、客户标签、跟进记录、关联 CRM 订单等完整信息。</li>
        <li><strong>客户标签</strong>：系统内可创建标签组和标签，并为客户打标签，支持批量打标签操作。</li>
        <li><strong>自动匹配绑定</strong>：根据手机号自动将企微客户与 CRM 客户数据库中的记录匹配绑定，实现数据打通。</li>
        <li><strong>数据同步</strong>：支持手动同步最新客户数据，确保与企业微信保持一致。</li>
        <li><strong>通讯录同步</strong>：同步企业内部员工通讯录，查看成员架构和联系方式。</li>
      </ul>

      <el-alert type="warning" :closable="false">
        <template #title>注意事项</template>
        <span>客户数据同步依赖企微接口，请确保已完成企微授权且回调配置正确，否则新增好友可能无法实时同步。</span>
      </el-alert>
    </el-card>

    <!-- 活码管理 -->
    <el-card id="wecom-contact-way" class="section-card">
      <template #header><h2>🔗 三、活码管理</h2></template>
      <p>活码（ContactWay）是企业微信提供的渠道活码功能，同一个活码可以分配给多个员工轮流接待，超出员工好友上限时自动切换。</p>

      <h3>活码列表</h3>
      <ul class="feature-list">
        <li>查看所有已创建的活码，展示活码名称、类型、接待成员、今日添加数等数据。</li>
        <li>支持批量启用/禁用/删除活码。</li>
        <li>按活码名称搜索。</li>
      </ul>

      <h3>创建活码（向导式）</h3>
      <el-steps :active="3" finish-status="success" style="margin: 16px 0;">
        <el-step title="基础设置" description="填写活码名称、选择渠道" />
        <el-step title="接待配置" description="分配接待员工/员工组" />
        <el-step title="欢迎语" description="设置自动欢迎语" />
      </el-steps>

      <h3>活码详情与数据统计</h3>
      <ul class="feature-list">
        <li>查看活码二维码图片，支持下载。</li>
        <li>查看添加人数趋势图（折线图）。</li>
        <li>查看客户漏斗（点击 → 添加 → 转化）。</li>
        <li>查看关联客户肖像标签分布。</li>
        <li>查看各员工接待统计（话术使用情况）。</li>
        <li>查看操作日志。</li>
      </ul>

      <h3>渠道管理</h3>
      <p>活码支持配置渠道来源标签，如"抖音投流"、"官网注册"等，方便统计不同渠道的引流效果。</p>
    </el-card>

    <!-- 获客助手 -->
    <el-card id="wecom-acquisition" class="section-card">
      <template #header><h2>🚀 四、获客助手</h2></template>
      <p>获客助手是企业微信的高级获客功能，通过专属链接实现客户精准引流，支持数据分析和标签自动化。</p>

      <el-alert type="info" :closable="false" style="margin-bottom: 12px;">
        <template #title>增值服务说明</template>
        <span>获客助手为增值服务，需购买获客配额套餐后方可使用。页面顶部展示"已添加/总配额"使用进度条，临近上限时会显示警告。</span>
      </el-alert>

      <h3>获客链接管理（5 Tab 结构）</h3>
      <el-descriptions :column="1" border>
        <el-descriptions-item label="链接管理">创建/管理获客链接，支持批量启用/禁用，按标签分类筛选。</el-descriptions-item>
        <el-descriptions-item label="数据总览">展示整体引流数据：总添加人数、活跃链接数、总点击量等核心指标，配合趋势图展示。</el-descriptions-item>
        <el-descriptions-item label="员工排名">按员工维度展示获客数量排名，识别高效获客员工。</el-descriptions-item>
        <el-descriptions-item label="留存率">分析客户留存情况，展示不同时间维度的留存率曲线。</el-descriptions-item>
        <el-descriptions-item label="标签管理">管理获客助手的标签组和标签，支持对链接打标签分类。</el-descriptions-item>
      </el-descriptions>

      <h3 style="margin-top:16px">创建获客链接（向导式）</h3>
      <ul class="feature-list">
        <li>填写链接名称和渠道标签。</li>
        <li>分配接待员工或员工组。</li>
        <li>配置欢迎语（支持文字、图片等）。</li>
        <li>生成获客链接，可复制分发到各渠道。</li>
      </ul>

      <h3>链接详情面板</h3>
      <ul class="feature-list">
        <li>查看客户人员列表（来自该链接添加的客户）。</li>
        <li>数据漏斗（点击 → 添加）。</li>
        <li>客户肖像画像分析。</li>
        <li>话术使用统计。</li>
        <li>操作日志。</li>
      </ul>
    </el-card>

    <!-- 客户群管理 -->
    <el-card id="wecom-group" class="section-card">
      <template #header><h2>👥 五、客户群管理</h2></template>
      <p>客户群管理同步企业微信中的群聊，支持群运营和群发消息功能。</p>

      <h3>统计概览（4 项指标）</h3>
      <el-row :gutter="16">
        <el-col :span="6" v-for="item in groupStats" :key="item.label">
          <el-card shadow="hover" style="text-align:center;padding:12px 0;">
            <div style="font-size:24px">{{ item.icon }}</div>
            <div style="font-size:18px;font-weight:bold;margin:4px 0;">{{ item.value }}</div>
            <div style="color:#909399;font-size:12px;">{{ item.label }}</div>
          </el-card>
        </el-col>
      </el-row>

      <h3 style="margin-top:16px">客户群 6 Tab 结构</h3>
      <el-descriptions :column="1" border style="margin-top:8px">
        <el-descriptions-item label="群管理">查看/搜索企业微信中的所有客户群，展示群名称、群主、成员数、今日消息数、活跃状态等。支持卡片/列表双视图切换，同步最新群数据。</el-descriptions-item>
        <el-descriptions-item label="群详情">点击群卡片展开侧边栏，查看群成员列表、群公告、关联标签等详细信息。</el-descriptions-item>
        <el-descriptions-item label="群数据统计">可视化统计各群的消息数、成员增减趋势，使用图表直观呈现。</el-descriptions-item>
        <el-descriptions-item label="群欢迎语">为各群设置自动欢迎语，新成员入群时自动发送，支持文字、图片等多种格式。</el-descriptions-item>
        <el-descriptions-item label="群模板">管理消息模板，在群发时快速选用标准化消息内容。</el-descriptions-item>
        <el-descriptions-item label="群广播">向多个群发送统一广播消息（需企业微信接口支持），支持选择群、预览消息内容。</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 会话存档 -->
    <el-card id="wecom-chat-archive" class="section-card">
      <template #header><h2>💬 六、会话存档</h2></template>
      <p>会话存档功能记录员工与客户的所有企业微信聊天记录，支持全文搜索、敏感词检测和合规质检。</p>

      <el-alert type="warning" :closable="false" style="margin-bottom: 12px;">
        <template #title>增值服务说明</template>
        <span>会话存档为增值服务，需购买会话存档席位套餐后方可使用。页面展示已用/总席位数和到期时间，接近上限时会提示续费。未开通时展示功能预览和开通引导。</span>
      </el-alert>

      <h3>席位配额管理</h3>
      <ul class="feature-list">
        <li>页面顶部展示存档席位进度条：已用X / 总Y 个。</li>
        <li>支持增购/续费席位。</li>
        <li>双轨制购买模式：支持在系统内直接购买，也支持通过服务商代购。</li>
      </ul>

      <h3>会话记录查看</h3>
      <ul class="feature-list">
        <li>左侧员工列表 + 右侧对话时间线展示聊天记录。</li>
        <li>支持多种消息类型：文字、图片、语音、视频、文件、链接等。</li>
        <li>全文搜索：可按关键词搜索全部聊天记录（抽屉弹出式搜索面板）。</li>
        <li>时间范围筛选，快速定位特定时间段的聊天记录。</li>
      </ul>

      <h3>存档设置</h3>
      <ul class="feature-list">
        <li>配置哪些员工启用存档。</li>
        <li>配置存档 API 密钥（RSA 公钥等）。</li>
        <li>反骚扰规则：设置被屏蔽客户的规则。</li>
        <li>智能在线规则：设置员工在线/离线时的自动回复规则。</li>
      </ul>

      <h3>敏感词检测</h3>
      <ul class="feature-list">
        <li>维护敏感词库，对会话内容实时检测。</li>
        <li>发现敏感词时自动标记告警。</li>
        <li>支持按员工、时间范围查看敏感词触发记录。</li>
      </ul>

      <h3>合规质检</h3>
      <ul class="feature-list">
        <li>质检规则配置：自定义质检项和评分规则。</li>
        <li>AI 辅助质检：利用 AI 对话术合规性进行评分分析。</li>
        <li>质检报告：按时间段/员工生成质检报告，支持在抽屉中预览。</li>
      </ul>

      <h3>存档统计</h3>
      <p>展示存档消息总数、各员工消息量等统计数据，辅助管理层了解沟通概况。</p>
    </el-card>

    <!-- AI助手 -->
    <el-card id="wecom-ai-assistant" class="section-card">
      <template #header><h2>🤖 七、AI 助手</h2></template>
      <p>AI 助手深度融合大语言模型能力，为销售员工提供智能话术建议、知识库问答、标签智能打标等 AI 辅助功能。</p>

      <h3>AI 使用量监控</h3>
      <p>页面顶部展示 AI Token/调用量使用进度：已用 / 配额总量，临近上限时高亮警告，可一键跳转购买套餐。</p>

      <h3>AI 配置中心（7 Tab 结构）</h3>
      <el-descriptions :column="1" border>
        <el-descriptions-item label="AI 配置">
          <strong>AI 模型管理（AiModelManager）</strong>：配置接入的大语言模型，支持 OpenAI、通义千问、文心一言等多种模型 API，填写 API Key、模型名称、接口地址等参数。<br/>
          <strong>AI Agent 管理（AiAgentManager）</strong>：创建和管理 AI Agent（智能体），每个 Agent 可绑定不同模型和知识库，用于不同业务场景。
        </el-descriptions-item>
        <el-descriptions-item label="知识库">
          创建企业专属知识库，上传产品资料、FAQ 文档、话术手册等文件，AI 回答时会优先检索知识库内容，确保回答准确性。支持文件上传（PDF、Word、TXT 等格式）。
        </el-descriptions-item>
        <el-descriptions-item label="话术库">
          管理销售话术模板，员工在企微侧边栏可快速检索和使用话术，支持话术分类管理、一键发送。
        </el-descriptions-item>
        <el-descriptions-item label="敏感词库">
          配置需要屏蔽/监控的敏感词，与会话存档的敏感词检测联动，统一管理合规词库。
        </el-descriptions-item>
        <el-descriptions-item label="标签 AI">
          配置 AI 自动打标签规则（AiTagRuleManager）：基于客户聊天内容、行为数据，AI 自动识别客户意向并打标签，实现智能客户分类。
        </el-descriptions-item>
        <el-descriptions-item label="调用日志">
          查看所有 AI 调用的详细日志，包括调用时间、调用员工、消耗 Token 数、响应内容等，便于审计和排查问题。
        </el-descriptions-item>
        <el-descriptions-item label="订单与使用量">
          购买 AI 额度套餐（支持多种规格），查看历史购买记录和当前使用量明细。支持免费套餐领取（每账号限一次）。
        </el-descriptions-item>
      </el-descriptions>

      <el-alert type="info" :closable="false" style="margin-top:12px;">
        <template #title>企微侧边栏 AI 助手</template>
        <span>在企业微信侧边栏（WecomSidebar）中，员工可以实时使用 AI 助手功能：AI 智能回复建议、话术快捷发送、客户信息查看等，提升沟通效率。</span>
      </el-alert>
    </el-card>

    <!-- 对外收款 -->
    <el-card id="wecom-payment" class="section-card">
      <template #header><h2>💰 八、对外收款</h2></template>
      <p>企微对外收款模块打通企业微信收款功能，支持创建收款码、管理收款记录和退款处理。</p>

      <h3>收款记录（5 Tab 结构）</h3>
      <el-descriptions :column="1" border>
        <el-descriptions-item label="收款记录">
          查看所有收款订单，支持按关键词（单号/客户昵称/备注）、收款状态（待支付/已支付/已退款/已取消）、收款人/部门、日期范围多维度筛选。
          <br/>顶部展示统计卡片：收款总额、已支付笔数、待支付笔数、已退款笔数。
        </el-descriptions-item>
        <el-descriptions-item label="收款码管理">
          创建和管理企业微信收款码，配置收款金额、备注、有效期等参数。
        </el-descriptions-item>
        <el-descriptions-item label="退款管理">
          处理已支付订单的退款申请，填写退款原因，支持全额/部分退款。查看退款历史记录。
        </el-descriptions-item>
        <el-descriptions-item label="收款设置">
          配置企微收款相关参数：绑定微信商户号、配置 API 证书、设置默认收款备注模板等。
        </el-descriptions-item>
        <el-descriptions-item label="收款统计">
          按时间维度（日/周/月）展示收款金额趋势图，分员工/部门统计收款数据，支持导出报表。
        </el-descriptions-item>
      </el-descriptions>

      <h3 style="margin-top:16px">同步功能</h3>
      <p>点击"同步收款"按钮，从企业微信拉取最新收款记录并更新系统数据。</p>
    </el-card>

    <!-- 企微侧边栏 -->
    <el-card id="wecom-sidebar" class="section-card">
      <template #header><h2>📌 九、企微侧边栏（WecomSidebar）</h2></template>
      <p>企微侧边栏是嵌入企业微信客户端的小程序，员工在与客户聊天时，侧边栏实时展示客户 CRM 信息，提供快捷操作。</p>

      <h3>侧边栏核心功能</h3>
      <ul class="feature-list">
        <li><strong>客户信息展示</strong>：实时显示当前聊天客户在 CRM 中的资料（手机号、订单数、标签、跟进记录等）。</li>
        <li><strong>快捷下单</strong>：在侧边栏直接为客户创建订单，无需切换系统。</li>
        <li><strong>AI 助手</strong>：根据当前对话内容，AI 实时推荐话术或生成回复建议。</li>
        <li><strong>话术快捷发送</strong>：浏览话术库，一键将话术内容发送到聊天窗口。</li>
        <li><strong>客户跟进记录</strong>：直接在侧边栏记录跟进备注，自动关联到 CRM 客户档案。</li>
        <li><strong>授权码管理</strong>：侧边栏应用的授权码管理，用于验证员工绑定。</li>
      </ul>

      <el-alert type="info" :closable="false">
        <template #title>侧边栏预览</template>
        <span>管理员可在系统中预览侧边栏效果（SidebarPreview 功能），无需在企业微信端验证即可查看布局和功能。</span>
      </el-alert>
    </el-card>

    <!-- 微信客服 -->
    <el-card class="section-card">
      <template #header><h2>🎧 十、微信客服</h2></template>
      <p>微信客服（Wecom Service）模块集成企业微信客服功能，支持统一管理多个客服账号和接待队列。</p>

      <h3>主要功能</h3>
      <ul class="feature-list">
        <li>客服账号管理：创建和管理企业微信客服账号，配置接待员工。</li>
        <li>接待队列配置：设置客服排队规则和自动分配策略。</li>
        <li>客服数据统计：查看接待量、响应时长、满意度等核心客服指标。</li>
        <li>与 CRM 打通：客服接待的客户自动同步至 CRM 客户库。</li>
      </ul>
    </el-card>

    <!-- 通讯录 -->
    <el-card class="section-card">
      <template #header><h2>📒 十一、通讯录</h2></template>
      <p>同步企业微信内部员工通讯录，在 CRM 中查看企业组织架构和员工联系信息。</p>

      <h3>主要功能</h3>
      <ul class="feature-list">
        <li>按部门树展示员工列表。</li>
        <li>展示员工企业微信 UserID、姓名、手机、邮箱、职位等信息。</li>
        <li>支持手动同步最新通讯录。</li>
        <li>员工与 CRM 用户账号关联绑定。</li>
      </ul>
    </el-card>

    <!-- 常见问题 -->
    <el-card class="section-card">
      <template #header><h2>❓ 常见问题</h2></template>
      <el-collapse>
        <el-collapse-item title="企微授权后数据不同步怎么办？" name="1">
          <p>1. 检查企业微信后台是否正确配置了回调 URL 和 IP 白名单。</p>
          <p>2. 在「企微授权」→「回调管理」中点击「验证回调」确认回调可用。</p>
          <p>3. 手动点击各模块中的「同步」按钮触发数据拉取。</p>
          <p>4. 检查 API 诊断工具（ConfigApiDiagnostic）查看接口调用是否正常。</p>
        </el-collapse-item>
        <el-collapse-item title="获客助手配额用完了怎么办？" name="2">
          <p>在「企微管理」→「获客助手」页面顶部点击使用量条旁的增购按钮，或前往「套餐中心」购买获客配额包。</p>
        </el-collapse-item>
        <el-collapse-item title="会话存档开通后看不到历史记录？" name="3">
          <p>会话存档功能从开通之日起开始记录，无法回溯开通前的聊天记录。这是企业微信平台的限制。</p>
        </el-collapse-item>
        <el-collapse-item title="AI 助手回复不准确怎么优化？" name="4">
          <p>1. 完善知识库：上传更多产品资料和 FAQ 文档，提高 AI 检索准确性。</p>
          <p>2. 优化 Agent 配置：调整 AI Agent 的系统提示词（System Prompt）。</p>
          <p>3. 完善话术库：添加标准话术，减少 AI 自由发挥的空间。</p>
        </el-collapse-item>
        <el-collapse-item title="如何让侧边栏在企微中正常显示？" name="5">
          <p>1. 确保企微自建应用已在企业微信后台配置「网页授权及JS-SDK」域名。</p>
          <p>2. 侧边栏 URL 需配置在企业微信应用的「可信域名」中。</p>
          <p>3. 确保员工已完成 CRM 账号绑定（通过扫码或账号密码登录侧边栏）。</p>
        </el-collapse-item>
      </el-collapse>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { watch, nextTick, onMounted } from 'vue'

const props = defineProps<{ section?: string }>()

const scrollToSection = (section: string) => {
  nextTick(() => {
    const el = document.getElementById(section)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  })
}

onMounted(() => {
  if (props.section && props.section.startsWith('wecom-')) {
    scrollToSection(props.section)
  }
})

watch(() => props.section, (val) => {
  if (val && val.startsWith('wecom-')) {
    scrollToSection(val)
  }
})

const overviewItems = [
  { icon: '🔐', title: '企微授权', desc: '支持第三方授权和自建应用两种接入方式，快速连接企业微信生态' },
  { icon: '👤', title: '客户管理', desc: '同步企微外部联系人，与CRM客户数据深度绑定，打通客户数据' },
  { icon: '🔗', title: '活码管理', desc: '创建渠道活码，多员工轮流接待，统计各渠道引流效果' },
  { icon: '🚀', title: '获客助手', desc: '通过获客链接精准引流，配额使用量监控，多维数据分析' },
  { icon: '👥', title: '客户群', desc: '同步企微客户群，群数据统计、群欢迎语、群广播运营' },
  { icon: '💬', title: '会话存档', desc: '存档员工与客户聊天记录，全文搜索、敏感词检测、合规质检' },
  { icon: '🤖', title: 'AI助手', desc: '接入大语言模型，智能话术推荐、知识库问答、自动打标签' },
  { icon: '💰', title: '对外收款', desc: '企微收款码管理，收款记录查询，退款处理，收款统计分析' },
  { icon: '📌', title: '企微侧边栏', desc: '嵌入企微客户端的CRM插件，实时显示客户信息和快捷操作' },
]

const configFeatures = [
  { feature: '卡片/列表视图', desc: '企微配置支持卡片视图和列表视图两种展示方式切换' },
  { feature: '启用/禁用开关', desc: '每个企微配置可独立开启或关闭，关闭后相关功能暂停使用' },
  { feature: 'API 诊断', desc: '内置 API 连通性诊断工具，快速排查接口配置问题' },
  { feature: '多企业支持', desc: '按套餐配额可同时接入多个企业微信，统一在系统中管理' },
]

const groupStats = [
  { icon: '👥', label: '群总数', value: '实时同步' },
  { icon: '🔥', label: '活跃群', value: '智能统计' },
  { icon: '📊', label: '总成员数', value: '汇总展示' },
  { icon: '💬', label: '今日消息', value: '实时统计' },
]
</script>

<style scoped>
.help-module-wecom {
  max-width: 960px;
  margin: 0 auto;
}
.page-header {
  margin-bottom: 24px;
}
.page-header h1 {
  font-size: 28px;
  font-weight: 700;
  color: #1a1a2e;
  margin-bottom: 8px;
}
.page-desc {
  color: #606266;
  font-size: 15px;
  line-height: 1.8;
}
.section-card {
  margin-bottom: 24px;
}
.section-card h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
}
.section-card h3 {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  margin: 16px 0 8px;
}
.overview-item {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 12px;
  border-radius: 8px;
  background: #f9fafb;
  margin-bottom: 12px;
}
.overview-icon {
  font-size: 24px;
  flex-shrink: 0;
}
.overview-item p {
  margin: 4px 0 0;
  color: #606266;
  font-size: 13px;
}
.feature-list {
  padding-left: 20px;
  line-height: 2;
  color: #303133;
}
.feature-list li {
  margin-bottom: 4px;
}
</style>

