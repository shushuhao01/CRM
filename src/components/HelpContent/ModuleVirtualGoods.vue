<template>
  <div class="help-module-virtual">
    <div class="page-header">
      <h1>虚拟商品功能模块</h1>
      <p class="page-desc">
        虚拟商品是云客CRM针对数字内容交付场景推出的全新功能，支持卡密类、资源链接类、无需发货类三种虚拟商品，提供从商品创建、订单流转、库存管理到客户自助领取的完整闭环解决方案。
      </p>
    </div>

    <!-- 功能概览 -->
    <el-card class="section-card">
      <template #header><h2>📦 功能概览</h2></template>
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

    <!-- 虚拟商品类型说明 -->
    <el-card class="section-card">
      <template #header><h2>🏷️ 一、虚拟商品类型</h2></template>
      <p>新增商品时，将商品类型设置为「虚拟商品」后，需选择发货方式，共三种类型：</p>

      <el-descriptions :column="1" border style="margin-top: 16px;">
        <el-descriptions-item label="卡密类（card_key）">
          <el-tag type="primary" style="margin-right:8px;">卡密</el-tag>
          适用于游戏充值码、软件激活码、会员兑换码等场景。
          商品关联卡密库存（CardKeyManage），下单时系统自动预占一条卡密；
          发货时匹配预占的卡密，并生成领取链接发给客户。
          若预占库存不足，系统给出库存不足提示，阻断下单。
        </el-descriptions-item>
        <el-descriptions-item label="资源链接类（resource_link）">
          <el-tag type="success" style="margin-right:8px;">资源链接</el-tag>
          适用于网盘资料、视频课程、电子书等数字内容场景。
          商品关联资源库存（ResourceManage），每条资源包含链接地址和提取密码；
          下单时预占资源，发货时将资源链接和密码通过领取页发给客户。
        </el-descriptions-item>
        <el-descriptions-item label="无需发货类（none）">
          <el-tag type="info" style="margin-right:8px;">无需发货</el-tag>
          适用于服务类商品、线上咨询、无实体内容交付的场景。
          无库存概念，审核通过后订单直接变为「已完成」状态，无需执行发货操作。
        </el-descriptions-item>
      </el-descriptions>

      <el-alert type="info" :closable="false" style="margin-top:16px;">
        <template #title>与普通商品的区别</template>
        <span>普通商品发货需填写快递公司和快递单号；虚拟商品发货只需匹配并发送卡密/资源链接，
        客户通过专属领取链接自助获取内容，无需人工客服介入。</span>
      </el-alert>
    </el-card>

    <!-- 商品创建与配置 -->
    <el-card class="section-card">
      <template #header><h2>🛒 二、虚拟商品创建与配置</h2></template>

      <h3>创建步骤</h3>
      <el-steps :active="4" finish-status="success" direction="vertical" style="margin: 16px 0;">
        <el-step
          title="进入商品管理"
          description="路径：商品管理 → 商品列表 → 点击「新增商品」"
        />
        <el-step
          title="选择商品类型"
          description="在商品类型字段选择「虚拟商品」，并选择发货方式（卡密 / 资源链接 / 无需发货）"
        />
        <el-step
          title="填写商品基础信息"
          description="填写商品名称、价格、商品图片、描述等基础信息"
        />
        <el-step
          title="保存并上架"
          description="保存商品后点击上架，商品状态变为 active，即可在新建订单时选择"
        />
      </el-steps>

      <h3>商品字段说明</h3>
      <el-table :data="productFields" border>
        <el-table-column prop="field" label="字段" width="160" />
        <el-table-column prop="required" label="是否必填" width="100" />
        <el-table-column prop="desc" label="说明" />
      </el-table>
    </el-card>

    <!-- 库存管理 -->
    <el-card class="section-card">
      <template #header><h2>📋 三、库存管理</h2></template>
      <p>卡密类和资源链接类虚拟商品需要提前在对应库存管理页面添加库存，否则下单时会提示库存不足。</p>

      <el-tabs type="border-card" style="margin-top: 16px;">
        <el-tab-pane label="卡密库存管理">
          <h3>页面路径</h3>
          <p>商品管理 → 卡密库存</p>

          <h3>统计指标</h3>
          <el-row :gutter="12" style="margin: 12px 0;">
            <el-col :span="6" v-for="s in cardKeyStats" :key="s.label">
              <el-card shadow="hover" style="text-align:center;padding:8px 0;">
                <div style="font-size:20px;font-weight:bold;color:#409eff;">{{ s.value }}</div>
                <div style="font-size:12px;color:#909399;margin-top:4px;">{{ s.label }}</div>
              </el-card>
            </el-col>
          </el-row>

          <h3>卡密状态说明</h3>
          <el-table :data="cardKeyStatusList" border>
            <el-table-column prop="status" label="状态" width="100" />
            <el-table-column prop="desc" label="说明" />
          </el-table>

          <h3 style="margin-top:16px;">添加卡密方式</h3>
          <ul class="feature-list">
            <li><strong>手动添加</strong>：在弹窗中逐条填写卡密内容，适合少量添加。</li>
            <li>
              <strong>批量导入</strong>：上传 Excel 或 CSV 文件批量导入卡密，
              支持下载模板，每行一条卡密，可关联指定商品。
            </li>
          </ul>

          <h3>筛选与搜索</h3>
          <p>支持按关联商品、卡密状态、卡密编码关键词筛选和搜索，方便查找特定卡密。</p>
        </el-tab-pane>

        <el-tab-pane label="资源库存管理">
          <h3>页面路径</h3>
          <p>商品管理 → 资源库存</p>

          <h3>资源字段说明</h3>
          <el-table :data="resourceFields" border>
            <el-table-column prop="field" label="字段" width="140" />
            <el-table-column prop="desc" label="说明" />
          </el-table>

          <h3 style="margin-top:16px;">添加资源方式</h3>
          <ul class="feature-list">
            <li><strong>手动添加</strong>：填写资源链接（网盘地址）、提取密码、资源描述、关联商品。</li>
            <li><strong>批量导入</strong>：通过 Excel 批量导入多条资源记录，下载模板按格式填写即可。</li>
          </ul>

          <el-alert type="warning" :closable="false" style="margin-top:12px;">
            <template #title>重要提示</template>
            <span>请确保填写的网盘链接长期有效，避免客户领取后无法访问。建议使用不过期的永久分享链接。</span>
          </el-alert>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 虚拟订单流转 -->
    <el-card class="section-card">
      <template #header><h2>🔄 四、虚拟订单状态流转</h2></template>
      <p>虚拟商品订单的状态流转与普通订单有所不同，主要区别在发货环节：</p>

      <h3>状态流转对比</h3>
      <el-table :data="orderStatusCompare" border style="margin-top: 12px;">
        <el-table-column prop="stage" label="阶段" width="140" />
        <el-table-column prop="normal" label="普通订单" />
        <el-table-column prop="virtual_none" label="虚拟订单（无需发货）" />
        <el-table-column prop="virtual_card" label="虚拟订单（卡密/资源）" />
      </el-table>

      <h3 style="margin-top:16px;">关键节点说明</h3>
      <el-timeline style="margin-top:12px;">
        <el-timeline-item color="#409eff" timestamp="下单">
          创建虚拟商品订单，订单标记类型（markType）自动设为 virtual。
          卡密/资源类商品在此时预占库存，库存不足则阻断下单。
        </el-timeline-item>
        <el-timeline-item color="#e6a23c" timestamp="提审">
          提交订单审核，状态变为 pending_audit（待审核）。
        </el-timeline-item>
        <el-timeline-item color="#67c23a" timestamp="审核通过">
          无需发货类：直接变为 completed（已完成）。
          卡密/资源类：变为 virtual_pending（虚拟待发货），进入发货操作队列。
        </el-timeline-item>
        <el-timeline-item color="#67c23a" timestamp="虚拟发货">
          卡密/资源类订单：客服在待发货列表执行「虚拟发货」，系统匹配预占的卡密/资源，
          生成客户专属领取链接，订单变为 completed（已完成）。
        </el-timeline-item>
      </el-timeline>

      <el-alert type="info" :closable="false" style="margin-top:12px;">
        <template #title>虚拟发货 vs 普通发货</template>
        <span>
          普通发货需要填写快递公司和快递单号；虚拟发货只需点击确认，
          系统自动完成库存匹配和领取链接生成，整个过程可在数秒内完成。
        </span>
      </el-alert>
    </el-card>

    <!-- 领取链接与领取页 -->
    <el-card class="section-card">
      <template #header><h2>🔗 五、领取链接与客户领取页</h2></template>
      <p>虚拟发货完成后，系统为每笔订单生成唯一的客户领取链接，客户打开链接即可自助获取商品内容。</p>

      <h3>领取链接格式</h3>
      <el-tag type="info" style="font-family:monospace;font-size:13px;">
        https://您的域名/virtual-claim/令牌字符串
      </el-tag>
      <p style="margin-top:8px;color:#909399;font-size:13px;">
        每个订单的令牌唯一，不可重复使用，且有有效期限制。
      </p>

      <h3>客户领取流程</h3>
      <el-steps :active="4" finish-status="success" style="margin: 16px 0;">
        <el-step title="打开链接" description="客户通过短信、邮件或客服发送的链接打开领取页" />
        <el-step title="身份验证" description="输入下单手机号和初始密码（或短信验证码）完成验证" />
        <el-step title="查看内容" description="验证成功后展示卡密或资源链接，点击「查看并复制」获取内容" />
        <el-step title="确认领取" description="点击「确认已领取」按钮，系统记录领取状态" />
      </el-steps>

      <h3>领取页功能详情</h3>
      <el-descriptions :column="1" border>
        <el-descriptions-item label="系统信息展示">
          页面顶部展示系统名称和 Logo（来自系统设置），增强品牌辨识度。
        </el-descriptions-item>
        <el-descriptions-item label="公告区域">
          若在「虚拟商品领取配置」中设置了领取页公告，页面顶部会显示公告信息（如使用说明、注意事项）。
        </el-descriptions-item>
        <el-descriptions-item label="卡密展示">
          卡密内容默认隐藏（显示为圆点），客户点击「点击查看并复制」后一键展示并复制到剪贴板。
          已复制的卡密会显示「复制卡密」按钮，支持再次复制。
        </el-descriptions-item>
        <el-descriptions-item label="资源链接展示">
          展示可点击的资源链接（网盘地址），若有提取密码，额外展示密码并支持一键复制。
          附带资源描述和使用说明。
        </el-descriptions-item>
        <el-descriptions-item label="确认领取">
          客户点击「确认已领取」后，系统更新订单和库存的领取状态，后台可追踪领取情况。
        </el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 虚拟商品领取配置 -->
    <el-card class="section-card">
      <template #header><h2>⚙️ 六、虚拟商品领取配置</h2></template>
      <p>管理员可在「商品管理 → 虚拟商品领取配置」中统一配置所有虚拟商品的领取参数。</p>

      <h3>配置项说明</h3>
      <el-descriptions :column="1" border>
        <el-descriptions-item label="领取链接有效期">
          设置领取链接从发货之日起的有效天数（1-365天），超过有效期后链接失效，
          客户无法再通过该链接领取内容。
        </el-descriptions-item>
        <el-descriptions-item label="客户登录方式">
          <el-tag type="primary" style="margin-right:6px;">密码登录</el-tag>
          客户使用下单手机号和初始密码登录，安全可靠，适合大多数场景。
          <br/>
          <el-tag type="success" style="margin-right:6px;margin-top:6px;">短信验证码</el-tag>
          客户使用下单手机号接收验证码登录，无需记忆密码，用户体验更好（需配置短信服务）。
        </el-descriptions-item>
        <el-descriptions-item label="默认初始密码">
          密码登录模式下，客户使用此密码配合手机号登录领取页，默认可设置为简单易记的数字（如 123456）。
        </el-descriptions-item>
        <el-descriptions-item label="领取页公告">
          可填写使用说明、注意事项等文字内容，留空则不在领取页显示公告。
        </el-descriptions-item>
        <el-descriptions-item label="发货后自动邮件">
          开启后，虚拟发货完成时系统自动向客户邮箱发送领取链接邮件。
          支持两种邮件内容模式：
          <br/>
          <strong>仅发领取链接</strong>：邮件中仅含领取链接，客户需在页面登录查看内容（更安全）。
          <br/>
          <strong>直接发卡密/资源</strong>：邮件中直接包含卡密或资源链接明文（无需登录，但安全性较低）。
        </el-descriptions-item>
      </el-descriptions>

      <h3 style="margin-top:16px;">领取链接说明</h3>
      <p>
        配置页还展示了领取链接的格式示例，以及根据当前配置生成的说明文字，
        方便管理员确认客户将看到的领取说明。
      </p>
    </el-card>

    <!-- 商品分析 -->
    <el-card class="section-card">
      <template #header><h2>📊 七、虚拟商品数据分析</h2></template>
      <p>
        在「商品管理 → 商品分析」页面，虚拟商品同样支持销售数据分析，帮助管理层了解各虚拟商品的销售情况。
      </p>
      <ul class="feature-list">
        <li>按商品维度查看订单数量、销售金额趋势。</li>
        <li>卡密/资源库存使用率统计：已使用/已领取/剩余数量。</li>
        <li>领取链接有效期到期预警（即将到期的未领取订单）。</li>
        <li>支持按日/周/月时间范围筛选数据。</li>
      </ul>
    </el-card>

    <!-- 与普通订单模块集成 -->
    <el-card class="section-card">
      <template #header><h2>🔗 八、与其他模块的集成关系</h2></template>

      <el-descriptions :column="1" border>
        <el-descriptions-item label="订单管理">
          虚拟商品订单显示在订单列表中，可通过订单类型（虚拟订单）筛选。
          虚拟订单详情页展示关联的卡密/资源信息和领取状态。
        </el-descriptions-item>
        <el-descriptions-item label="物流管理（发货列表）">
          虚拟待发货的订单进入发货列表的「虚拟发货」标签页，与实体商品的待发货分开展示。
          客服在此处执行虚拟发货操作，系统自动完成卡密/资源匹配。
        </el-descriptions-item>
        <el-descriptions-item label="业绩统计">
          虚拟商品订单完成后，同样计入业绩统计，销售员可在业绩报表中看到虚拟商品的贡献。
        </el-descriptions-item>
        <el-descriptions-item label="财务管理">
          虚拟订单参与绩效提成计算，与普通订单逻辑一致。
        </el-descriptions-item>
        <el-descriptions-item label="客户管理">
          购买虚拟商品的客户在客户详情页可查看其虚拟订单和领取记录。
        </el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 常见问题 -->
    <el-card class="section-card">
      <template #header><h2>❓ 常见问题</h2></template>
      <el-collapse>
        <el-collapse-item title="客户打开领取链接提示链接已过期怎么办？" name="1">
          <p>
            领取链接有效期由「虚拟商品领取配置」中的「领取链接有效期」决定。若链接已过期，
            管理员可在订单详情中重新生成领取链接发给客户。
            建议将有效期设置得宽松一些（如 30-90 天），避免客户未及时领取导致过期。
          </p>
        </el-collapse-item>
        <el-collapse-item title="下单时提示卡密库存不足怎么处理？" name="2">
          <p>
            1. 前往「商品管理 → 卡密库存」，点击「添加卡密」或「批量导入」补充库存。
          </p>
          <p>
            2. 补充库存后，刷新订单页面重新下单即可。
          </p>
          <p>
            3. 若业务紧急，可先创建「无需发货」类型的临时订单，待库存补充后再处理。
          </p>
        </el-collapse-item>
        <el-collapse-item title="客户反映收到的卡密已被使用怎么办？" name="3">
          <p>
            1. 在「卡密库存」页面查找该卡密，查看状态是否已被标记为「已使用」或「已作废」。
          </p>
          <p>
            2. 若确认卡密有问题，在订单详情中重新指定一条有效卡密，并重新���成领取链接发给客户。
          </p>
          <p>
            3. 建议在采购卡密时做好验证，只导入已确认有效的卡密。
          </p>
        </el-collapse-item>
        <el-collapse-item title="如何让客户通过短信验证码领取内容？" name="4">
          <p>
            1. 确保系统已配置短信服务（系统设置 → 短信配置）。
          </p>
          <p>
            2. 前往「商品管理 → 虚拟商品领取配置」，将「客户登录方式」切换为「短信验证码」。
          </p>
          <p>
            3. 保存配置后，客户打开领取链接时将看到短信验证码登录界面。
          </p>
        </el-collapse-item>
        <el-collapse-item title="虚拟商品能否与企微功能结合使用？" name="5">
          <p>
            可以。在企业微信侧边栏中，销售员可以直接为客户创建虚拟商品订单（快捷下单功能）。
            虚拟发货完成后，领取链接可通过企业微信聊天窗口发送给客户，
            结合企微的会话存档功能可完整记录沟通和交付过程。
          </p>
        </el-collapse-item>
        <el-collapse-item title="资源链接的网盘分享码过期了如何更新？" name="6">
          <p>
            1. 前往「商品管理 → 资源库存」，找到对应资源记录。
          </p>
          <p>
            2. 点击编辑，更新资源链接和提取密码为新的有效链接。
          </p>
          <p>
            3. 更新后，所有通过该资源领取的新订单将使用新链接；已领取的订单不受影响。
          </p>
          <p>
            注意：若客户已领取但链接已失效，需人工联系客户重新发送有效链接。
          </p>
        </el-collapse-item>
      </el-collapse>
    </el-card>
  </div>
</template>

<script setup lang="ts">
const overviewItems = [
  { icon: '🔑', title: '卡密类商品', desc: '激活码、充值码等一次性卡密内容，下单预占库存，发货匹配卡密' },
  { icon: '🔗', title: '资源链接类', desc: '网盘资料、视频课程等数字内容，客户自助通过链接和密码获取' },
  { icon: '✅', title: '无需发货类', desc: '服务类商品，审核通过后订单直接完成，无需发货操作' },
  { icon: '📦', title: '库存管理', desc: '卡密库存和资源库存独立管理，支持手动添加和批量导入' },
  { icon: '🔒', title: '安全领取', desc: '客户凭下单手机号+密码或短信验证码验证身份后方可领取内容' },
  { icon: '📧', title: '自动通知', desc: '发货后自动发邮件通知客户，支持直发内容或发领取链接两种模式' },
]

const productFields = [
  { field: '商品名称', required: '必填', desc: '虚拟商品的名称，将展示在客户领取页' },
  { field: '商品类型', required: '必填', desc: '选择「虚拟商品」' },
  { field: '发货方式', required: '必填', desc: '卡密（card_key）/ 资源链接（resource_link）/ 无需发货（none）' },
  { field: '销售价格', required: '必填', desc: '商品单价，用于订单金额计算和业绩统计' },
  { field: '商品图片', required: '可选', desc: '商品封面图，显示在商品列表中' },
  { field: '商品描述', required: '可选', desc: '商品详细描述，可包含使用说明' },
  { field: '使用说明', required: '可选', desc: '将展示在客户领取页的使用指引文字' },
]

const cardKeyStats = [
  { label: '总数量', value: 'total' },
  { label: '未使用', value: 'unused' },
  { label: '已使用', value: 'used' },
  { label: '已领取', value: 'claimed' },
]

const cardKeyStatusList = [
  { status: '未使用（unused）', desc: '卡密已入库，尚未被任何订单预占，可用于新订单分配' },
  { status: '已预占（reserved）', desc: '卡密已被某订单预占，等待发货操作完成匹配' },
  { status: '已使用（used）', desc: '卡密已完成发货匹配，对应订单已完成' },
  { status: '已领取（claimed）', desc: '客户已在领取页查看并确认领取该卡密' },
  { status: '已过期（expired）', desc: '卡密超过有效期，已自动失效' },
  { status: '已作废（voided）', desc: '管理员手动将卡密标记为无效，不可再用于分配' },
]

const resourceFields = [
  { field: '资源链接', desc: '网盘分享链接（如百度网盘、阿里云盘等），建议使用永久不过期的分享链接' },
  { field: '提取密码', desc: '网盘资源的提取密码，无密码则留空' },
  { field: '资源描述', desc: '对资源内容的说明文字，将展示在领取页' },
  { field: '关联商品', desc: '将该资源与指定虚拟商品关联，下单时系统从该商品的资源池中预占' },
  { field: '状态', desc: '未使用/已预占/已使用/已领取/已过期/已作废，含义与卡密状态相同' },
]

const orderStatusCompare = [
  {
    stage: '创建订单',
    normal: 'draft / pending_transfer',
    virtual_none: 'draft / pending_transfer（标记 virtual）',
    virtual_card: 'draft / pending_transfer（标记 virtual，预占库存）',
  },
  {
    stage: '提交审核',
    normal: 'pending_audit',
    virtual_none: 'pending_audit',
    virtual_card: 'pending_audit',
  },
  {
    stage: '审核通过',
    normal: 'pending_shipment（待发货）',
    virtual_none: '直接 completed（已完成）',
    virtual_card: 'virtual_pending（虚拟待发货）',
  },
  {
    stage: '发货',
    normal: 'shipped（填写快递单号）',
    virtual_none: '无此步骤',
    virtual_card: '执行虚拟发货，匹配卡密/资源，生成领取链接',
  },
  {
    stage: '最终状态',
    normal: 'delivered（已签收）',
    virtual_none: 'completed（已完成）',
    virtual_card: 'completed（已完成）',
  },
]
</script>

<style scoped>
.help-module-virtual {
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

