<template>
  <div class="help-content-section">
    <h1>系统功能模块</h1>
    
    <div class="content-block">
      <h2>功能模块概述</h2>
      <p>智能销售CRM系统包含10个主要功能模块，每个模块都有相应的子功能，支持不同角色的用户根据权限访问相应功能。系统采用模块化设计，各模块既相互独立又紧密协作，形成完整的业务闭环。</p>
    </div>

    <!-- 数据看板 -->
    <div class="module-section">
      <div class="module-header">
        <div class="module-icon">📊</div>
        <h2>数据看板</h2>
        <span class="module-path">/dashboard</span>
      </div>
      <div class="module-content">
        <p><strong>功能描述：</strong>系统首页，提供核心业务数据的可视化展示和快速操作入口</p>
        <div class="feature-grid">
          <div class="feature-item">
            <h4>📈 核心指标</h4>
            <p>显示销售额、客户数量、订单数量等关键业务指标</p>
          </div>
          <div class="feature-item">
            <h4>📊 图表分析</h4>
            <p>销售趋势图、客户分布图、业绩排行榜等数据可视化</p>
          </div>
          <div class="feature-item">
            <h4>⚡ 快捷操作</h4>
            <p>新增客户、创建订单、查看待办事项等快速入口</p>
          </div>
          <div class="feature-item">
            <h4>📋 待办提醒</h4>
            <p>显示需要处理的任务、到期订单、客户跟进提醒等</p>
          </div>
        </div>
        <div class="permission-info">
          <strong>权限说明：</strong>所有角色均可访问，数据范围根据角色权限显示（个人/部门/全部）
        </div>
      </div>
    </div>

    <!-- 客户管理 -->
    <div class="module-section">
      <div class="module-header">
        <div class="module-icon">👥</div>
        <h2>客户管理</h2>
        <span class="module-path">/customer</span>
      </div>
      <div class="module-content">
        <p><strong>功能描述：</strong>完整的客户信息管理系统，支持客户全生命周期管理</p>
        
        <div class="submenu-list">
          <div class="submenu-item">
            <h4>📋 客户列表 <span class="path">/customer/list</span></h4>
            <p>展示所有客户信息，支持搜索、筛选、排序和批量操作</p>
            <ul>
              <li>多条件搜索：姓名、电话、邮箱、公司等</li>
              <li>高级筛选：按标签、分组、状态、创建时间等筛选</li>
              <li>批量操作：批量导入、导出、标签管理</li>
              <li>权限控制：销售员只能查看自己的客户，管理员可查看部门或全部</li>
            </ul>
          </div>
          
          <div class="submenu-item">
            <h4>➕ 新增客户 <span class="path">/customer/add</span></h4>
            <p>添加新客户信息到系统中</p>
            <ul>
              <li>基本信息：姓名、性别、电话、邮箱、地址等</li>
              <li>公司信息：公司名称、职位、行业、规模等</li>
              <li>标签分组：设置客户标签和分组</li>
              <li>备注信息：添加客户备注和跟进记录</li>
            </ul>
          </div>
          
          <div class="submenu-item">
            <h4>🏷️ 客户分组 <span class="path">/customer/groups</span></h4>
            <p>管理客户分组，便于客户分类管理</p>
            <ul>
              <li>创建分组：按地区、行业、价值等维度创建分组</li>
              <li>分组管理：编辑、删除、合并分组</li>
              <li>客户分配：将客户分配到相应分组</li>
              <li>统计分析：查看各分组的客户数量和转化率</li>
            </ul>
          </div>
          
          <div class="submenu-item">
            <h4>🔖 客户标签 <span class="path">/customer/tags</span></h4>
            <p>管理客户标签，支持多维度客户标记</p>
            <ul>
              <li>标签创建：创建各种类型的客户标签</li>
              <li>标签分类：VIP客户、潜在客户、重点客户等</li>
              <li>批量标记：批量为客户添加或移除标签</li>
              <li>标签统计：查看各标签下的客户数量</li>
            </ul>
          </div>
        </div>
        
        <div class="permission-info">
          <strong>权限说明：</strong>超级管理员和管理员可管理所有客户，部门管理员可管理本部门客户，销售员只能管理自己的客户
        </div>
      </div>
    </div>

    <!-- 订单管理 -->
    <div class="module-section">
      <div class="module-header">
        <div class="module-icon">🛒</div>
        <h2>订单管理</h2>
        <span class="module-path">/order</span>
      </div>
      <div class="module-content">
        <p><strong>功能描述：</strong>完整的订单处理流程，从订单创建到完成的全生命周期管理</p>
        
        <div class="submenu-list">
          <div class="submenu-item">
            <h4>📋 订单列表 <span class="path">/order/list</span></h4>
            <p>展示所有订单信息，支持多维度查询和管理</p>
            <ul>
              <li>订单查询：按订单号、客户、状态、时间等查询</li>
              <li>状态管理：待确认、已确认、生产中、已发货、已完成等</li>
              <li>批量操作：批量导出、状态更新、发货处理</li>
              <li>订单详情：查看订单详细信息、商品清单、物流信息</li>
            </ul>
          </div>
          
          <div class="submenu-item">
            <h4>➕ 新增订单 <span class="path">/order/add</span></h4>
            <p>创建新订单</p>
            <ul>
              <li>客户选择：选择现有客户或创建新客户</li>
              <li>商品选择：从商品库中选择商品，设置数量和价格</li>
              <li>订单信息：设置交货日期、收货地址、支付方式等</li>
              <li>优惠设置：应用折扣、优惠券等优惠政策</li>
            </ul>
          </div>
          
          <div class="submenu-item">
            <h4>✅ 订单审核 <span class="path">/order/audit</span></h4>
            <p>订单审核流程管理</p>
            <ul>
              <li>待审核订单：查看需要审核的订单列表</li>
              <li>审核操作：通过、拒绝、要求修改</li>
              <li>审核记录：查看订单的审核历史</li>
              <li>批量审核：批量处理多个订单的审核</li>
            </ul>
          </div>
        </div>
        
        <div class="permission-info">
          <strong>权限说明：</strong>销售员可创建和查看自己的订单，部门管理员可管理本部门订单，管理员可审核订单
        </div>
      </div>
    </div>

    <!-- 服务管理 -->
    <div class="module-section">
      <div class="module-header">
        <div class="module-icon">🎧</div>
        <h2>服务管理</h2>
        <span class="module-path">/service-management</span>
      </div>
      <div class="module-content">
        <p><strong>功能描述：</strong>客户服务管理，包括通话记录和短信管理</p>
        
        <div class="submenu-list">
          <div class="submenu-item">
            <h4>📞 通话管理 <span class="path">/service-management/call</span></h4>
            <p>管理客户通话记录和通话质量</p>
            <ul>
              <li>通话记录：记录通话时间、时长、内容摘要</li>
              <li>通话分析：统计通话频次、时长分布、满意度</li>
              <li>录音管理：上传、播放、下载通话录音</li>
              <li>跟进提醒：设置客户回访提醒</li>
            </ul>
          </div>
          
          <div class="submenu-item">
            <h4>💬 短信管理 <span class="path">/service-management/sms</span></h4>
            <p>短信发送和管理功能</p>
            <ul>
              <li>短信发送：单发、群发短信</li>
              <li>模板管理：创建和管理短信模板</li>
              <li>发送记录：查看短信发送历史和状态</li>
              <li>统计分析：短信发送量、到达率、回复率统计</li>
            </ul>
          </div>
        </div>
        
        <div class="permission-info">
          <strong>权限说明：</strong>所有角色均可使用，客服人员主要负责此模块
        </div>
      </div>
    </div>

    <!-- 业绩统计 -->
    <div class="module-section">
      <div class="module-header">
        <div class="module-icon">📈</div>
        <h2>业绩统计</h2>
        <span class="module-path">/performance</span>
      </div>
      <div class="module-content">
        <p><strong>功能描述：</strong>销售业绩统计和分析，支持多维度业绩查看</p>
        
        <div class="submenu-list">
          <div class="submenu-item">
            <h4>👤 个人业绩 <span class="path">/performance/personal</span></h4>
            <p>查看个人销售业绩</p>
            <ul>
              <li>业绩概览：月度、季度、年度销售额统计</li>
              <li>目标达成：业绩目标设置和完成情况</li>
              <li>客户分析：新增客户、成交客户、客户转化率</li>
              <li>趋势分析：业绩变化趋势图表</li>
            </ul>
          </div>
          
          <div class="submenu-item">
            <h4>👥 团队业绩 <span class="path">/performance/team</span></h4>
            <p>查看团队整体业绩</p>
            <ul>
              <li>团队排行：销售员业绩排行榜</li>
              <li>部门对比：不同部门业绩对比</li>
              <li>团队目标：团队业绩目标和达成情况</li>
              <li>协作分析：团队协作效果分析</li>
            </ul>
          </div>
          
          <div class="submenu-item">
            <h4>📊 业绩分析 <span class="path">/performance/analysis</span></h4>
            <p>深度业绩数据分析</p>
            <ul>
              <li>多维分析：按产品、地区、客户类型等维度分析</li>
              <li>同比环比：业绩同比、环比增长分析</li>
              <li>预测分析：基于历史数据的业绩预测</li>
              <li>异常分析：识别业绩异常波动原因</li>
            </ul>
          </div>
          
          <div class="submenu-item">
            <h4>📤 业绩分享 <span class="path">/performance/share</span></h4>
            <p>业绩报告分享功能</p>
            <ul>
              <li>报告生成：自动生成业绩报告</li>
              <li>分享设置：设置分享权限和范围</li>
              <li>导出功能：导出Excel、PDF格式报告</li>
              <li>定时发送：定时发送业绩报告邮件</li>
            </ul>
          </div>
        </div>
        
        <div class="permission-info">
          <strong>权限说明：</strong>个人业绩所有人可查看，团队业绩需要管理员权限
        </div>
      </div>
    </div>

    <!-- 物流管理 -->
    <div class="module-section">
      <div class="module-header">
        <div class="module-icon">🚚</div>
        <h2>物流管理</h2>
        <span class="module-path">/logistics</span>
      </div>
      <div class="module-content">
        <p><strong>功能描述：</strong>订单物流信息管理和跟踪</p>
        
        <div class="submenu-list">
          <div class="submenu-item">
            <h4>📋 物流列表 <span class="path">/logistics/list</span></h4>
            <p>查看所有物流信息</p>
            <ul>
              <li>物流查询：按订单号、快递单号、状态查询</li>
              <li>状态跟踪：实时更新物流状态</li>
              <li>批量操作：批量发货、状态更新</li>
              <li>异常处理：处理物流异常情况</li>
            </ul>
          </div>
          
          <div class="submenu-item">
            <h4>📦 物流跟踪 <span class="path">/logistics/tracking</span></h4>
            <p>详细的物流跟踪信息</p>
            <ul>
              <li>实时跟踪：查看包裹实时位置</li>
              <li>轨迹查询：查看完整的物流轨迹</li>
              <li>预计到达：预估包裹到达时间</li>
              <li>异常提醒：物流异常自动提醒</li>
            </ul>
          </div>
          
          <div class="submenu-item">
            <h4>🚛 发货管理 <span class="path">/logistics/shipping</span></h4>
            <p>订单发货处理</p>
            <ul>
              <li>发货处理：处理待发货订单</li>
              <li>快递选择：选择合适的快递公司</li>
              <li>单号录入：录入快递单号</li>
              <li>发货通知：自动发送发货通知</li>
            </ul>
          </div>
          
          <div class="submenu-item">
            <h4>📊 物流统计 <span class="path">/logistics/statistics</span></h4>
            <p>物流数据统计分析</p>
            <ul>
              <li>配送统计：配送时效、成功率统计</li>
              <li>成本分析：物流成本分析</li>
              <li>快递对比：不同快递公司服务对比</li>
              <li>区域分析：不同地区配送情况分析</li>
            </ul>
          </div>
        </div>
        
        <div class="permission-info">
          <strong>权限说明：</strong>销售员可查看自己订单的物流信息，管理员可管理所有物流信息
        </div>
      </div>
    </div>

    <!-- 售后管理 -->
    <div class="module-section">
      <div class="module-header">
        <div class="module-icon">🔧</div>
        <h2>售后管理</h2>
        <span class="module-path">/service</span>
      </div>
      <div class="module-content">
        <p><strong>功能描述：</strong>售后服务工单管理和客户服务</p>
        
        <div class="submenu-list">
          <div class="submenu-item">
            <h4>📋 售后订单 <span class="path">/service/orders</span></h4>
            <p>售后工单管理</p>
            <ul>
              <li>工单列表：查看所有售后工单</li>
              <li>工单处理：分配、处理、关闭工单</li>
              <li>优先级管理：设置工单优先级</li>
              <li>处理记录：记录工单处理过程</li>
            </ul>
          </div>
          
          <div class="submenu-item">
            <h4>➕ 新建售后 <span class="path">/service/create</span></h4>
            <p>创建新的售后工单</p>
            <ul>
              <li>工单创建：填写售后问题详情</li>
              <li>客户信息：关联相关客户和订单</li>
              <li>问题分类：按问题类型分类</li>
              <li>紧急程度：设置工单紧急程度</li>
            </ul>
          </div>
          
          <div class="submenu-item">
            <h4>📊 售后数据 <span class="path">/service/data</span></h4>
            <p>售后服务数据统计</p>
            <ul>
              <li>工单统计：工单数量、处理时效统计</li>
              <li>满意度调查：客户满意度统计</li>
              <li>问题分析：常见问题分析</li>
              <li>服务质量：服务质量评估</li>
            </ul>
          </div>
        </div>
        
        <div class="permission-info">
          <strong>权限说明：</strong>客服人员主要负责售后处理，销售员可查看自己客户的售后情况
        </div>
      </div>
    </div>

    <!-- 资料管理 -->
    <div class="module-section">
      <div class="module-header">
        <div class="module-icon">📁</div>
        <h2>资料管理</h2>
        <span class="module-path">/data</span>
      </div>
      <div class="module-content">
        <p><strong>功能描述：</strong>企业资料和文档管理</p>
        
        <div class="submenu-list">
          <div class="submenu-item">
            <h4>📋 资料列表 <span class="path">/data/list</span></h4>
            <p>查看所有资料文档</p>
            <ul>
              <li>文档管理：上传、下载、删除文档</li>
              <li>分类管理：按类型、部门分类管理</li>
              <li>权限控制：设置文档访问权限</li>
              <li>版本管理：文档版本控制</li>
            </ul>
          </div>
          
          <div class="submenu-item">
            <h4>🔍 客户查询 <span class="path">/data/search</span></h4>
            <p>高级客户信息查询</p>
            <ul>
              <li>多条件查询：组合多个条件查询客户</li>
              <li>模糊搜索：支持模糊匹配搜索</li>
              <li>查询历史：保存常用查询条件</li>
              <li>结果导出：导出查询结果</li>
            </ul>
          </div>
          
          <div class="submenu-item">
            <h4>🗑️ 回收站 <span class="path">/data/recycle</span></h4>
            <p>已删除数据管理</p>
            <ul>
              <li>数据恢复：恢复误删的数据</li>
              <li>永久删除：彻底删除不需要的数据</li>
              <li>批量操作：批量恢复或删除</li>
              <li>清理策略：设置自动清理策略</li>
            </ul>
          </div>
        </div>
        
        <div class="permission-info">
          <strong>权限说明：</strong>所有用户均可访问，具体权限根据角色和数据范围控制
        </div>
      </div>
    </div>

    <!-- 商品管理 -->
    <div class="module-section">
      <div class="module-header">
        <div class="module-icon">📦</div>
        <h2>商品管理</h2>
        <span class="module-path">/product</span>
      </div>
      <div class="module-content">
        <p><strong>功能描述：</strong>商品信息管理和库存管理</p>
        
        <div class="submenu-list">
          <div class="submenu-item">
            <h4>📋 商品列表 <span class="path">/product/list</span></h4>
            <p>查看所有商品信息</p>
            <ul>
              <li>商品查询：按名称、分类、状态查询</li>
              <li>商品编辑：修改商品信息</li>
              <li>状态管理：上架、下架商品</li>
              <li>批量操作：批量导入、导出商品</li>
            </ul>
          </div>
          
          <div class="submenu-item">
            <h4>➕ 新增商品 <span class="path">/product/add</span></h4>
            <p>添加新商品</p>
            <ul>
              <li>基本信息：商品名称、描述、价格等</li>
              <li>分类设置：设置商品分类</li>
              <li>库存管理：设置库存数量和预警</li>
              <li>图片上传：上传商品图片</li>
            </ul>
          </div>
          
          <div class="submenu-item">
            <h4>📂 商品分类 <span class="path">/product/categories</span></h4>
            <p>管理商品分类</p>
            <ul>
              <li>分类创建：创建商品分类</li>
              <li>层级管理：支持多级分类</li>
              <li>分类排序：调整分类显示顺序</li>
              <li>分类统计：查看各分类商品数量</li>
            </ul>
          </div>
          
          <div class="submenu-item">
            <h4>📊 库存管理 <span class="path">/product/inventory</span></h4>
            <p>商品库存管理</p>
            <ul>
              <li>库存查询：查看商品库存情况</li>
              <li>入库出库：记录商品进出库</li>
              <li>库存预警：低库存自动提醒</li>
              <li>盘点管理：定期库存盘点</li>
            </ul>
          </div>
          
          <div class="submenu-item">
            <h4>📈 商品分析 <span class="path">/product/analytics</span></h4>
            <p>商品销售分析</p>
            <ul>
              <li>销量统计：商品销量排行</li>
              <li>利润分析：商品利润率分析</li>
              <li>趋势分析：销售趋势分析</li>
              <li>库存周转：库存周转率分析</li>
            </ul>
          </div>
        </div>
        
        <div class="permission-info">
          <strong>权限说明：</strong>仅超级管理员和管理员可访问
        </div>
      </div>
    </div>

    <!-- 系统管理 -->
    <div class="module-section">
      <div class="module-header">
        <div class="module-icon">⚙️</div>
        <h2>系统管理</h2>
        <span class="module-path">/system</span>
      </div>
      <div class="module-content">
        <p><strong>功能描述：</strong>系统配置和用户权限管理</p>
        
        <div class="submenu-list">
          <div class="submenu-item">
            <h4>👤 用户管理 <span class="path">/system/users</span></h4>
            <p>系统用户管理</p>
            <ul>
              <li>用户列表：查看所有系统用户</li>
              <li>用户创建：添加新用户</li>
              <li>权限分配：为用户分配角色和权限</li>
              <li>状态管理：启用、禁用用户账号</li>
            </ul>
          </div>
          
          <div class="submenu-item">
            <h4>🎭 角色管理 <span class="path">/system/roles</span></h4>
            <p>系统角色管理</p>
            <ul>
              <li>角色创建：创建新的用户角色</li>
              <li>权限配置：为角色配置权限</li>
              <li>角色分配：为用户分配角色</li>
              <li>角色层级：管理角色层级关系</li>
            </ul>
          </div>
          
          <div class="submenu-item">
            <h4>🏢 部门管理 <span class="path">/system/departments</span></h4>
            <p>组织架构管理</p>
            <ul>
              <li>部门创建：创建部门和子部门</li>
              <li>人员分配：为部门分配人员</li>
              <li>层级管理：管理部门层级结构</li>
              <li>权限继承：部门权限继承设置</li>
            </ul>
          </div>
          
          <div class="submenu-item">
            <h4>🔐 权限管理 <span class="path">/system/permissions</span></h4>
            <p>系统权限配置</p>
            <ul>
              <li>权限列表：查看所有系统权限</li>
              <li>权限分组：按模块分组管理权限</li>
              <li>权限分配：为角色分配权限</li>
              <li>权限审计：查看权限使用情况</li>
            </ul>
          </div>
          
          <div class="submenu-item">
            <h4>⚙️ 系统设置 <span class="path">/system/settings</span></h4>
            <p>系统参数配置</p>
            <ul>
              <li>基础设置：系统名称、Logo等基础配置</li>
              <li>邮件配置：邮件服务器配置</li>
              <li>短信配置：短信服务配置</li>
              <li>安全设置：密码策略、登录限制等</li>
            </ul>
          </div>
        </div>
        
        <div class="permission-info">
          <strong>权限说明：</strong>仅超级管理员可访问所有功能，管理员可访问部分功能
        </div>
      </div>
    </div>

    <div class="content-block">
      <h2>权限体系说明</h2>
      <div class="role-grid">
        <div class="role-item">
          <h4>🔴 超级管理员</h4>
          <p>拥有系统所有权限，可以访问所有模块和功能</p>
        </div>
        <div class="role-item">
          <h4>🟠 管理员</h4>
          <p>拥有大部分业务权限，可以管理用户和业务数据</p>
        </div>
        <div class="role-item">
          <h4>🟡 部门管理员</h4>
          <p>可以管理本部门的业务数据和人员</p>
        </div>
        <div class="role-item">
          <h4>🟢 销售员</h4>
          <p>主要负责客户和订单管理，只能访问自己的数据</p>
        </div>
        <div class="role-item">
          <h4>🔵 客服</h4>
          <p>主要负责售后服务和客户支持</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// 系统功能模块介绍组件
</script>

<style scoped>
.help-content-section {
  line-height: 1.6;
  color: #303133;
}

.help-content-section h1 {
  font-size: 32px;
  font-weight: 700;
  color: #409eff;
  margin-bottom: 30px;
  border-bottom: 3px solid #409eff;
  padding-bottom: 10px;
}

.help-content-section h2 {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin: 30px 0 15px 0;
}

.help-content-section h4 {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 10px 0 5px 0;
}

.help-content-section p {
  font-size: 14px;
  color: #303133;
  margin-bottom: 15px;
}

.content-block {
  margin-bottom: 40px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #409eff;
}

.module-section {
  margin-bottom: 40px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.module-header {
  background: linear-gradient(135deg, #409eff, #67c23a);
  color: white;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 15px;
}

.module-icon {
  font-size: 32px;
}

.module-header h2 {
  margin: 0;
  font-size: 24px;
  flex: 1;
}

.module-path {
  background: rgba(255, 255, 255, 0.2);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-family: monospace;
}

.module-content {
  padding: 20px;
  background: white;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 15px;
  margin: 20px 0;
}

.feature-item {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 6px;
  border-left: 3px solid #409eff;
}

.feature-item h4 {
  color: #409eff;
  margin-bottom: 8px;
  font-size: 14px;
}

.feature-item p {
  margin: 0;
  font-size: 13px;
  color: #606266;
}

.submenu-list {
  margin: 20px 0;
}

.submenu-item {
  background: #f8f9fa;
  margin: 15px 0;
  padding: 20px;
  border-radius: 8px;
  border-left: 4px solid #67c23a;
}

.submenu-item h4 {
  color: #67c23a;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.path {
  background: rgba(103, 194, 58, 0.1);
  color: #67c23a;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 11px;
  font-family: monospace;
}

.submenu-item p {
  margin-bottom: 10px;
  color: #303133;
}

.submenu-item ul {
  margin: 0;
  padding-left: 20px;
}

.submenu-item li {
  margin: 5px 0;
  font-size: 13px;
  color: #606266;
}

.permission-info {
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 6px;
  padding: 15px;
  margin-top: 20px;
  color: #856404;
  font-size: 14px;
}

.role-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-top: 20px;
}

.role-item {
  background: white;
  padding: 15px;
  border-radius: 6px;
  border: 1px solid #e4e7ed;
  text-align: center;
}

.role-item h4 {
  color: #409eff;
  margin-bottom: 8px;
}

.role-item p {
  margin: 0;
  font-size: 13px;
  color: #606266;
}
</style>