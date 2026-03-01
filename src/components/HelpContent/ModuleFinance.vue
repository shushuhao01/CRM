<template>
  <div class="help-content">
    <h1>财务管理</h1>
    <section>
      <h2>功能概述</h2>
      <p>财务管理模块提供绩效数据查看、绩效管理、代收管理、增值管理和结算报表功能，支持提成计算、外包订单管理、数据统计分析等。</p>
    </section>
    <section>
      <h2>二级菜单</h2>
      <div class="menu-list">
        <div class="menu-item">
          <div class="menu-icon">📊</div>
          <div class="menu-info">
            <h4>绩效数据</h4>
            <p>查看个人/团队绩效数据、提成明细</p>
            <span class="menu-path">路径：财务管理 → 绩效数据</span>
          </div>
        </div>
        <div class="menu-item">
          <div class="menu-icon">⚙️</div>
          <div class="menu-info">
            <h4>绩效管理</h4>
            <p>配置提成规则、阶梯提成、绩效系数</p>
            <span class="menu-path">路径：财务管理 → 绩效管理</span>
            <el-tag size="small" type="warning">仅管理员可见</el-tag>
          </div>
        </div>
        <div class="menu-item">
          <div class="menu-icon">💰</div>
          <div class="menu-info">
            <h4>代收管理</h4>
            <p>查看和管理订单代收金额，统计代收数据</p>
            <span class="menu-path">路径：财务管理 → 代收管理</span>
            <el-tag size="small" type="warning">仅管理员可见</el-tag>
          </div>
        </div>
        <div class="menu-item">
          <div class="menu-icon">🏢</div>
          <div class="menu-info">
            <h4>增值管理</h4>
            <p>管理外包公司增值订单，配置价格档位和状态</p>
            <span class="menu-path">路径：财务管理 → 增值管理</span>
            <el-tag size="small" type="warning">仅管理员可见</el-tag>
          </div>
        </div>
        <div class="menu-item">
          <div class="menu-icon">📈</div>
          <div class="menu-info">
            <h4>结算报表</h4>
            <p>查看增值订单结算统计、图表分析和公司排名</p>
            <span class="menu-path">路径：财务管理 → 结算报表</span>
            <el-tag size="small" type="warning">仅管理员可见</el-tag>
          </div>
        </div>
      </div>
    </section>
    <section>
      <h2>绩效数据</h2>
      <h3>数据范围</h3>
      <ul>
        <li><strong>销售员</strong>：查看个人绩效数据</li>
        <li><strong>部门经理</strong>：查看本部门绩效数据</li>
        <li><strong>管理员</strong>：查看全公司绩效数据</li>
      </ul>
      <h3>绩效指标</h3>
      <ul>
        <li>销售金额</li>
        <li>订单数量</li>
        <li>提成金额</li>
        <li>绩效系数</li>
        <li>实发提成</li>
      </ul>
      <h3>时间维度</h3>
      <ul>
        <li>日绩效</li>
        <li>周绩效</li>
        <li>月绩效</li>
        <li>年度绩效</li>
      </ul>
    </section>
    <section>
      <h2>绩效管理</h2>
      <h3>提成规则</h3>
      <ul>
        <li><strong>固定比例</strong>：按销售额的固定比例计算提成</li>
        <li><strong>阶梯提成</strong>：不同销售额区间使用不同提成比例</li>
        <li><strong>产品提成</strong>：不同产品设置不同提成比例</li>
      </ul>
      <h3>阶梯提成配置</h3>
      <p>示例：</p>
      <el-table :data="ladderData" stripe style="width: 100%">
        <el-table-column prop="range" label="销售额区间" />
        <el-table-column prop="rate" label="提成比例" />
      </el-table>
      <h3>绩效系数</h3>
      <p>可根据订单状态设置不同的绩效系数：</p>
      <ul>
        <li>已签收订单：系数 1.0</li>
        <li>拒收订单：系数 0</li>
        <li>退货订单：系数 -1.0（扣除提成）</li>
      </ul>
    </section>
    <section>
      <h2>提成计算</h2>
      <p>提成计算公式：</p>
      <div class="formula">
        实发提成 = 销售金额 × 提成比例 × 绩效系数
      </div>
    </section>

    <section>
      <h2>代收管理</h2>
      <el-tag type="warning">仅管理员可见</el-tag>
      <p>代收管理功能用于统计和管理订单的代收金额，帮助财务人员核对物流代收款项。</p>

      <h3>什么是代收？</h3>
      <p>代收是指订单发货时，由物流公司代为收取的货款金额。通常情况下：</p>
      <div class="formula">
        代收金额 = 订单总金额 - 已支付定金
      </div>

      <h3>代收数据统计</h3>
      <p>在"财务管理" → "代收管理"中可以查看：</p>
      <ul>
        <li><strong>代收订单列表</strong>：所有需要代收的订单</li>
        <li><strong>代收金额汇总</strong>：按时间、部门、销售员统计代收总额</li>
        <li><strong>代收状态</strong>：待发货、已发货、已签收、已拒收等</li>
        <li><strong>实收金额</strong>：物流公司实际代收的金额</li>
        <li><strong>差异分析</strong>：应收与实收的差异对比</li>
      </ul>

      <h3>筛选条件</h3>
      <ul>
        <li>时间范围：按发货时间或签收时间筛选</li>
        <li>订单状态：待发货、已发货、已签收等</li>
        <li>部门：按部门筛选</li>
        <li>销售员：按销售员筛选</li>
        <li>物流公司：按物流公司筛选</li>
        <li>代收金额范围：按金额区间筛选</li>
      </ul>

      <h3>代收核对</h3>
      <p>财务人员可以：</p>
      <ul>
        <li>导出代收订单明细表</li>
        <li>与物流公司对账单进行核对</li>
        <li>标记已核对的订单</li>
        <li>记录实收金额和差异原因</li>
      </ul>

      <h3>代收金额变更</h3>
      <p>当订单的代收金额需要调整时：</p>
      <ol>
        <li>销售员在订单详情页提交"取消代收申请"</li>
        <li>管理员在"订单管理" → "取消代收审核"中审核</li>
        <li>审核通过后，订单代收金额自动更新</li>
        <li>变更记录会在代收管理中显示</li>
      </ol>

      <h3>常见场景</h3>
      <ul>
        <li><strong>客户补齐尾款</strong>：客户在发货前补齐了剩余货款，代收金额改为0</li>
        <li><strong>拒收订单</strong>：客户拒收，物流公司未代收到款项</li>
        <li><strong>部分代收</strong>：客户只支付了部分货款</li>
        <li><strong>代收异常</strong>：物流公司代收金额与订单金额不符</li>
      </ul>

      <h3>报表功能</h3>
      <ul>
        <li>日代收汇总报表</li>
        <li>月代收汇总报表</li>
        <li>部门代收统计报表</li>
        <li>销售员代收统计报表</li>
        <li>物流公司代收统计报表</li>
      </ul>
    </section>

    <section>
      <h2>增值管理</h2>
      <el-tag type="warning">仅管理员可见</el-tag>
      <p>增值管理功能用于管理外包公司的增值订单，包括订单创建、状态管理、价格配置、公司管理等。</p>

      <h3>什么是增值订单？</h3>
      <p>增值订单是指将部分订单业务外包给第三方公司处理的订单。通过增值管理，可以：</p>
      <ul>
        <li>记录外包订单的处理进度</li>
        <li>管理外包公司的价格档位</li>
        <li>统计外包订单的结算数据</li>
        <li>分析外包公司的服务质量</li>
      </ul>

      <h3>核心功能</h3>
      <div class="feature-grid">
        <div class="feature-card">
          <h4>📝 订单管理</h4>
          <ul>
            <li>创建增值订单</li>
            <li>编辑订单信息</li>
            <li>批量操作订单</li>
            <li>删除无效订单</li>
          </ul>
        </div>
        <div class="feature-card">
          <h4>🏢 公司管理</h4>
          <ul>
            <li>添加外包公司</li>
            <li>设置默认公司</li>
            <li>配置价格档位</li>
            <li>查看公司统计</li>
          </ul>
        </div>
        <div class="feature-card">
          <h4>💵 价格配置</h4>
          <ul>
            <li>设置价格档位</li>
            <li>配置有效期</li>
            <li>支持按单/按比例</li>
            <li>自动匹配档位</li>
          </ul>
        </div>
        <div class="feature-card">
          <h4>📊 状态管理</h4>
          <ul>
            <li>自定义状态选项</li>
            <li>配置状态颜色</li>
            <li>设置状态排序</li>
            <li>批量更新状态</li>
          </ul>
        </div>
      </div>

      <h3>订单有效状态</h3>
      <p>有效状态用于标记订单的处理结果，系统预设三种状态：</p>
      <ul>
        <li><strong>待处理</strong>：订单刚创建，等待外包公司处理</li>
        <li><strong>有效</strong>：订单处理成功，可以正常结算</li>
        <li><strong>无效</strong>：订单处理失败或取消，不计入结算</li>
      </ul>
      <p>管理员可以在"状态配置"中自定义更多状态选项，如"处理中"、"已完成"、"已作废"等。</p>

      <h3>订单结算状态</h3>
      <p>结算状态用于标记订单的费用结算情况，系统预设两种状态：</p>
      <ul>
        <li><strong>未结算</strong>：订单费用尚未结算给外包公司</li>
        <li><strong>已结算</strong>：订单费用已结算，不可再修改</li>
      </ul>
      <p>只有"有效"状态的订单才会计入结算金额。</p>

      <h3>价格档位系统</h3>
      <p>价格档位允许为不同时期设置不同的价格，支持两种计价方式：</p>

      <h4>1. 按单计价</h4>
      <p>每个订单收取固定金额，例如：</p>
      <ul>
        <li>第一档：¥900/单（2024-01-01 至今）</li>
        <li>第二档：¥1200/单（2024-06-01 ~ 2024-12-31）</li>
      </ul>

      <h4>2. 按比例计价</h4>
      <p>按订单金额的百分比收费，例如：</p>
      <ul>
        <li>第一档：5.5%（订单金额1000元，收费55元）</li>
        <li>第二档：8%（订单金额1000元，收费80元）</li>
      </ul>

      <h4>档位匹配规则</h4>
      <p>系统会根据订单的下单日期自动匹配对应的价格档位：</p>
      <ol>
        <li>查找该外包公司所有启用的档位</li>
        <li>筛选出在订单日期生效的档位（开始日期 ≤ 订单日期 ≤ 结束日期）</li>
        <li>如果有多个档位符合，使用档位顺序最小的（优先级最高）</li>
        <li>如果没有匹配的档位，使用公司的默认单价</li>
      </ol>

      <h4>档位配置示例</h4>
      <el-table :data="priceTierExample" stripe style="width: 100%; margin-top: 10px;">
        <el-table-column prop="tier" label="档位" width="100" />
        <el-table-column prop="type" label="计价方式" width="120" />
        <el-table-column prop="price" label="单价/比例" width="120" />
        <el-table-column prop="period" label="生效时间" />
        <el-table-column prop="status" label="状态" width="80" />
      </el-table>

      <h3>筛选和搜索</h3>
      <ul>
        <li><strong>时间筛选</strong>：按下单时间筛选，支持快捷选择（今天、昨天、最近7天等）</li>
        <li><strong>公司筛选</strong>：按外包公司筛选</li>
        <li><strong>有效状态筛选</strong>：按待处理、有效、无效筛选</li>
        <li><strong>结算状态筛选</strong>：按未结算、已结算筛选</li>
        <li><strong>批量搜索</strong>：支持订单号、客户名称、客户电话、物流单号批量搜索</li>
      </ul>

      <h3>批量操作</h3>
      <p>支持批量处理订单：</p>
      <ul>
        <li>批量选择外包公司</li>
        <li>批量改有效状态</li>
        <li>批量改结算状态</li>
        <li>批量删除订单</li>
        <li>批量导出数据</li>
      </ul>

      <h3>数据导出</h3>
      <p>可以导出增值订单数据为Excel文件，包含：</p>
      <ul>
        <li>订单基本信息（订单号、客户信息、物流单号）</li>
        <li>外包公司信息</li>
        <li>价格和金额</li>
        <li>有效状态和结算状态</li>
        <li>结算日期和备注</li>
      </ul>
    </section>

    <section>
      <h2>结算报表</h2>
      <el-tag type="warning">仅管理员可见</el-tag>
      <p>结算报表提供增值订单的统计分析功能，帮助管理者了解外包业务的整体情况。</p>

      <h3>报表概览</h3>
      <p>结算报表页面包含以下内容：</p>
      <div class="report-layout">
        <div class="report-section">
          <h4>📊 统计卡片</h4>
          <p>显示关键指标的汇总数据：</p>
          <ul>
            <li>总订单数</li>
            <li>有效订单数</li>
            <li>无效订单数</li>
            <li>待处理订单数</li>
            <li>已结算订单数</li>
            <li>未结算订单数</li>
            <li>总金额统计</li>
          </ul>
        </div>
        <div class="report-section">
          <h4>📈 图表分析</h4>
          <p>可视化展示数据分布：</p>
          <ul>
            <li><strong>订单状态分布</strong>：饼状图显示各状态订单占比</li>
            <li><strong>结算状态分布</strong>：饼状图显示结算情况</li>
            <li><strong>趋势分析</strong>：折线图显示订单趋势</li>
          </ul>
        </div>
        <div class="report-section">
          <h4>🏆 公司排名</h4>
          <p>外包公司业绩排行榜：</p>
          <ul>
            <li>按订单数量排名</li>
            <li>按结算金额排名</li>
            <li>显示各状态订单数</li>
            <li>支持导出排名数据</li>
          </ul>
        </div>
      </div>

      <h3>筛选条件</h3>
      <p>支持多维度筛选数据：</p>
      <ul>
        <li><strong>时间范围</strong>：按下单时间筛选（支持快捷选择）</li>
        <li><strong>外包公司</strong>：选择特定公司查看数据</li>
        <li><strong>订单状态</strong>：筛选特定状态的订单</li>
        <li><strong>结算状态</strong>：已结算/未结算</li>
      </ul>

      <h3>快捷筛选</h3>
      <p>提供常用时间范围的快捷选择：</p>
      <ul>
        <li>今天</li>
        <li>昨天</li>
        <li>最近7天</li>
        <li>最近30天</li>
        <li>本月</li>
        <li>上月</li>
      </ul>

      <h3>图表说明</h3>
      <h4>订单状态分布图</h4>
      <p>饼状图展示不同状态订单的数量和占比，帮助了解订单处理进度。</p>
      <ul>
        <li>有效订单：正常处理的订单</li>
        <li>无效订单：已作废或取消的订单</li>
        <li>待处理：等待处理的订单</li>
      </ul>

      <h4>结算状态分布图</h4>
      <p>饼状图展示订单的结算情况，帮助财务人员掌握结算进度。</p>
      <ul>
        <li>已结算：已完成费用结算的订单</li>
        <li>未结算：尚未结算的订单</li>
      </ul>

      <h3>公司排名列表</h3>
      <p>显示各外包公司的业绩数据：</p>
      <el-table :data="rankingExample" stripe border style="width: 100%; margin-top: 10px;">
        <el-table-column prop="rank" label="排名" width="70" align="center" />
        <el-table-column prop="company" label="公司名称" min-width="140" />
        <el-table-column prop="total" label="总订单" width="90" align="center" />
        <el-table-column prop="totalAmount" label="总金额" width="120" align="right" />
        <el-table-column prop="valid" label="有效" width="80" align="center" />
        <el-table-column prop="invalid" label="无效" width="80" align="center" />
        <el-table-column prop="pending" label="待处理" width="80" align="center" />
        <el-table-column prop="settled" label="已结算" width="90" align="center" />
        <el-table-column prop="unsettled" label="未结算" width="90" align="center" />
        <el-table-column prop="settledAmount" label="已结算金额" width="120" align="right" />
        <el-table-column prop="unsettledAmount" label="未结算金额" width="120" align="right" />
        <el-table-column prop="avgPrice" label="平均单价" width="100" align="right" />
        <el-table-column prop="settlementRate" label="结算率" width="90" align="center" />
        <el-table-column prop="validRate" label="有效率" width="90" align="center" />
      </el-table>

      <h3>数据导出</h3>
      <p>支持导出公司排名数据为Excel文件，包含：</p>
      <ul>
        <li>公司排名</li>
        <li>各状态订单数量</li>
        <li>结算统计</li>
        <li>总订单数</li>
      </ul>
      <p>导出的Excel文件格式美观，列宽自动调整，便于打印和分享。</p>

      <h3>使用场景</h3>
      <ul>
        <li><strong>月度结算</strong>：查看本月各公司的订单数据，准备结算</li>
        <li><strong>业绩分析</strong>：对比不同公司的业绩表现</li>
        <li><strong>质量监控</strong>：关注无效订单占比，评估服务质量</li>
        <li><strong>趋势预测</strong>：通过历史数据预测未来业务量</li>
      </ul>
    </section>

    <section>
      <h2>常见问题</h2>
      <el-collapse>
        <el-collapse-item title="Q: 代收金额是如何计算的？" name="1">
          <p>A: 代收金额 = 订单总金额 - 已支付定金。例如订单总额1000元，客户已支付定金300元，则代收金额为700元。</p>
        </el-collapse-item>
        <el-collapse-item title="Q: 代收金额可以为0吗？" name="2">
          <p>A: 可以。当客户已全额支付订单金额时，代收金额为0，表示无需物流代收。</p>
        </el-collapse-item>
        <el-collapse-item title="Q: 如何修改订单的代收金额？" name="3">
          <p>A: 销售员需要在订单详情页提交"取消代收申请"，填写新的代收金额和申请原因，等待管理员审核通过后生效。</p>
        </el-collapse-item>
        <el-collapse-item title="Q: 物流公司代收的金额与订单不符怎么办？" name="4">
          <p>A: 在代收管理中记录实收金额和差异原因，联系物流公司核实情况，必要时联系客户补齐差额。</p>
        </el-collapse-item>
        <el-collapse-item title="Q: 拒收订单的代收金额如何处理？" name="5">
          <p>A: 拒收订单物流公司未代收到款项，系统会自动标记为未收款。如果客户已支付定金，需要按退款流程处理。</p>
        </el-collapse-item>
        <el-collapse-item title="Q: 什么是增值订单的有效状态？" name="6">
          <p>A: 有效状态用于标记订单的处理结果。系统预设三种状态：待处理（刚创建）、有效（处理成功）、无效（处理失败）。只有"有效"状态的订单才会计入结算金额。管理员可以在"状态配置"中自定义更多状态。</p>
        </el-collapse-item>
        <el-collapse-item title="Q: 什么是结算状态？" name="7">
          <p>A: 结算状态用于标记订单的费用结算情况。未结算表示费用尚未支付给外包公司，已结算表示费用已支付。只有"有效"状态的订单才会计入结算金额。</p>
        </el-collapse-item>
        <el-collapse-item title="Q: 如何为外包公司设置价格档位？" name="8">
          <p>A: 在增值管理页面，点击"外包公司管理"按钮，选择公司后点击"价格档位"，可以添加不同时期的价格档位。支持按单计价（固定金额）和按比例计价（订单金额的百分比）两种方式。</p>
        </el-collapse-item>
        <el-collapse-item title="Q: 价格档位如何自动匹配？" name="9">
          <p>A: 系统会根据订单的下单日期自动匹配价格档位。如果有多个档位在同一时间生效，使用档位顺序最小的（优先级最高）。如果没有匹配的档位，使用公司的默认单价。</p>
        </el-collapse-item>
        <el-collapse-item title="Q: 按比例计价是如何计算的？" name="10">
          <p>A: 按比例计价时，费用 = 订单金额 × 比例。例如订单金额1000元，比例5.5%，则费用为1000 × 5.5% = 55元。</p>
        </el-collapse-item>
        <el-collapse-item title="Q: 结算报表的数据是实时更新的吗？" name="11">
          <p>A: 是的。结算报表的数据会根据筛选条件实时统计，包括统计卡片、图表和公司排名都是实时计算的。</p>
        </el-collapse-item>
        <el-collapse-item title="Q: 如何导出结算报表数据？" name="12">
          <p>A: 在结算报表页面，公司排名列表右上角有"导出"按钮，点击即可导出当前筛选条件下的排名数据为Excel文件。</p>
        </el-collapse-item>
        <el-collapse-item title="Q: 增值订单的状态可以自定义吗？" name="13">
          <p>A: 可以。在增值管理页面点击"状态配置"按钮，可以添加、编辑、删除有效状态选项，还可以设置状态的颜色和排序。但结算状态（未结算/已结算）是固定的，不可自定义。</p>
        </el-collapse-item>
        <el-collapse-item title="Q: 如何批量更新增值订单的状态？" name="14">
          <p>A: 在增值管理页面，勾选需要更新的订单，点击"批量改有效状态"或"批量改结算状态"按钮，选择新状态后确认即可。</p>
        </el-collapse-item>
      </el-collapse>
    </section>
  </div>
</template>
<script setup>
const ladderData = [
  { range: '0 - 10,000', rate: '5%' },
  { range: '10,001 - 50,000', rate: '8%' },
  { range: '50,001 - 100,000', rate: '10%' },
  { range: '100,001 以上', rate: '12%' }
]

const rankingExample = [
  {
    rank: 1,
    company: '合速物流',
    total: '155单',
    totalAmount: '¥139,500.00',
    valid: '150单',
    invalid: '5单',
    pending: '20单',
    settled: '120单',
    unsettled: '35单',
    settledAmount: '¥108,000.00',
    unsettledAmount: '¥31,500.00',
    avgPrice: '¥900.00',
    settlementRate: '77.4%',
    validRate: '96.8%'
  },
  {
    rank: 2,
    company: '极兔速递',
    total: '123单',
    totalAmount: '¥110,700.00',
    valid: '120单',
    invalid: '3单',
    pending: '15单',
    settled: '100单',
    unsettled: '23单',
    settledAmount: '¥90,000.00',
    unsettledAmount: '¥20,700.00',
    avgPrice: '¥900.00',
    settlementRate: '81.3%',
    validRate: '97.6%'
  },
  {
    rank: 3,
    company: '顺丰速运',
    total: '97单',
    totalAmount: '¥116,400.00',
    valid: '95单',
    invalid: '2单',
    pending: '10单',
    settled: '80单',
    unsettled: '17单',
    settledAmount: '¥96,000.00',
    unsettledAmount: '¥20,400.00',
    avgPrice: '¥1,200.00',
    settlementRate: '82.5%',
    validRate: '97.9%'
  }
]

const priceTierExample = [
  { tier: '第一档', type: '按单计价', price: '¥900/单', period: '2024-01-01 至今', status: '启用' },
  { tier: '第二档', type: '按比例计价', price: '5.5%', period: '2024-06-01 ~ 2024-12-31', status: '启用' },
  { tier: '第三档', type: '按单计价', price: '¥1200/单', period: '2025-01-01 至今', status: '启用' }
]
</script>
<style scoped>
.help-content { line-height: 1.8; color: #333; }
.help-content h1 { font-size: 28px; color: #1a1a1a; margin-bottom: 30px; padding-bottom: 15px; border-bottom: 2px solid #409eff; }
.help-content h2 { font-size: 20px; color: #303133; margin: 30px 0 15px; }
.help-content h3 { font-size: 16px; color: #409eff; margin: 20px 0 10px; }
.help-content h4 { font-size: 14px; color: #606266; margin: 15px 0 8px; font-weight: 600; }
.help-content p { margin: 10px 0; color: #606266; }
.help-content ul { margin: 10px 0; padding-left: 20px; }
.help-content ol { margin: 10px 0; padding-left: 20px; }
.help-content li { margin: 8px 0; color: #606266; }
section { margin-bottom: 30px; }
.menu-list { display: grid; gap: 15px; margin-top: 15px; }
.menu-item { display: flex; align-items: flex-start; padding: 20px; background: #fafafa; border-radius: 8px; border: 1px solid #ebeef5; }
.menu-icon { font-size: 32px; margin-right: 15px; }
.menu-info h4 { margin: 0 0 8px; font-size: 16px; }
.menu-info p { margin: 0 0 8px; font-size: 14px; color: #909399; }
.menu-path { font-size: 12px; color: #c0c4cc; display: block; margin-bottom: 5px; }
.formula { background: #f5f7fa; padding: 15px 20px; border-radius: 8px; font-family: monospace; font-size: 16px; color: #409eff; margin: 15px 0; }
.feature-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; margin: 15px 0; }
.feature-card { background: #f5f7fa; padding: 15px; border-radius: 8px; border: 1px solid #e4e7ed; }
.feature-card h4 { margin: 0 0 10px; font-size: 14px; color: #303133; }
.feature-card ul { margin: 0; padding-left: 20px; }
.feature-card li { margin: 5px 0; font-size: 13px; }
.report-layout { display: grid; gap: 15px; margin: 15px 0; }
.report-section { background: #fafafa; padding: 15px; border-radius: 8px; border: 1px solid #ebeef5; }
.report-section h4 { margin: 0 0 10px; font-size: 14px; color: #303133; }
.report-section p { margin: 0 0 8px; font-size: 13px; }
.report-section ul { margin: 5px 0; padding-left: 20px; }
.report-section li { margin: 5px 0; font-size: 13px; }
:deep(.el-collapse-item__header) { font-weight: 500; color: #303133; }
:deep(.el-collapse-item__content) { color: #606266; line-height: 1.8; }
</style>
