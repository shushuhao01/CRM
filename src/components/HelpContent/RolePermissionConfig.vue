<template>
  <div class="help-content">
    <h1>权限配置</h1>
    <section>
      <h2>概述</h2>
      <p>权限配置允许管理员自定义各角色的功能权限，满足企业的个性化需求。</p>
    </section>
    <section>
      <h2>配置入口</h2>
      <p>路径：系统管理 → 角色权限</p>
    </section>
    <section>
      <h2>配置步骤</h2>
      <ol>
        <li>进入"系统管理" → "角色权限"</li>
        <li>选择要配置的角色</li>
        <li>在权限树中勾选需要的权限</li>
        <li>点击"保存"应用配置</li>
      </ol>
    </section>
    <section>
      <h2>权限类型</h2>
      <h3>菜单权限</h3>
      <p>控制用户可以看到的菜单项：</p>
      <ul>
        <li>一级菜单权限</li>
        <li>二级菜单权限</li>
      </ul>
      <h3>操作权限</h3>
      <p>控制用户可以执行的操作：</p>
      <ul>
        <li>查看（view）</li>
        <li>新增（add）</li>
        <li>编辑（edit）</li>
        <li>删除（delete）</li>
        <li>导入（import）</li>
        <li>导出（export）</li>
        <li>审核（audit）</li>
      </ul>
      <h3>数据权限</h3>
      <p>控制用户可以访问的数据范围：</p>
      <ul>
        <li>全部数据</li>
        <li>本部门数据</li>
        <li>个人数据</li>
      </ul>
    </section>
    <section>
      <h2>权限继承</h2>
      <p>权限配置遵循以下规则：</p>
      <ul>
        <li>勾选父级权限会自动勾选所有子级权限</li>
        <li>取消父级权限会自动取消所有子级权限</li>
        <li>可以单独配置子级权限</li>
      </ul>
    </section>
    <section>
      <h2>注意事项</h2>
      <el-alert type="warning" :closable="false" show-icon>
        <template #title>配置权限时请注意</template>
        <template #default>
          <ul style="margin: 10px 0 0; padding-left: 20px;">
            <li>超级管理员权限不可修改</li>
            <li>修改角色权限会立即影响该角色的所有用户</li>
            <li>建议先在测试账号上验证权限配置</li>
            <li>敏感权限（如删除、导出）需谨慎分配</li>
          </ul>
        </template>
      </el-alert>
    </section>
    <section>
      <h2>自定义角色</h2>
      <p>除系统预设角色外，可以创建自定义角色：</p>
      <ol>
        <li>点击"新增角色"按钮</li>
        <li>输入角色名称和描述</li>
        <li>配置角色权限</li>
        <li>保存角色</li>
      </ol>
    </section>

    <section>
      <h2>权限树</h2>
      <p>系统权限采用树形结构组织，包含以下模块和子权限：</p>

      <h3>数据看板</h3>
      <ul>
        <li>路径：<code>/dashboard</code></li>
        <li>权限：查看数据看板、统计图表</li>
      </ul>

      <h3>客户管理</h3>
      <ul>
        <li><strong>客户列表</strong>：<code>/customer/list</code> - 查看客户列表</li>
        <li><strong>新增客户</strong>：<code>/customer/add</code> - 创建新客户</li>
        <li><strong>编辑客户</strong>：<code>/customer/edit/:id</code> - 修改客户信息</li>
        <li><strong>客户详情</strong>：<code>/customer/detail/:id</code> - 查看客户详情</li>
        <li><strong>客户标签</strong>：<code>/customer/tags</code> - 管理客户标签</li>
        <li><strong>客户分组</strong>：<code>/customer/groups</code> - 管理客户分组</li>
      </ul>

      <h3>订单管理</h3>
      <ul>
        <li><strong>订单列表</strong>：<code>/order/list</code> - 查看订单列表</li>
        <li><strong>新增订单</strong>：<code>/order/add</code> - 创建新订单</li>
        <li><strong>编辑订单</strong>：<code>/order/edit/:id</code> - 修改订单信息</li>
        <li><strong>订单详情</strong>：<code>/order/detail/:id</code> - 查看订单详情</li>
        <li><strong>订单审核</strong>：<code>/order/audit</code> - 审核订单</li>
        <li><strong>取消代收申请</strong>：<code>/order/my-cod-application</code> - 查看和管理个人代收申请</li>
        <li><strong>取消代收审核</strong>：<code>/order/cod-application-review</code> - 审核代收申请（需要 <code>finance:cod</code> 权限）</li>
      </ul>

      <h3>业绩统计</h3>
      <ul>
        <li><strong>个人业绩</strong>：<code>/performance/personal</code> - 查看个人业绩</li>
        <li><strong>团队业绩</strong>：<code>/performance/team</code> - 查看团队业绩</li>
        <li><strong>业绩分析</strong>：<code>/performance/analysis</code> - 业绩数据分析</li>
        <li><strong>业绩分享</strong>：<code>/performance/share</code> - 业绩分享管理</li>
      </ul>

      <h3>物流管理</h3>
      <ul>
        <li><strong>物流列表</strong>：<code>/logistics/list</code> - 查看物流列表</li>
        <li><strong>物流详情</strong>：<code>/logistics/detail/:id</code> - 查看物流详情</li>
        <li><strong>编辑物流</strong>：<code>/logistics/edit/:id</code> - 修改物流信息</li>
        <li><strong>物流跟踪</strong>：<code>/logistics/track</code> - 物流跟踪查询</li>
        <li><strong>物流公司</strong>：<code>/logistics/companies</code> - 管理物流公司</li>
        <li><strong>发货列表</strong>：<code>/logistics/shipping</code> - 查看待发货订单</li>
        <li><strong>状态更新</strong>：<code>/logistics/status-update</code> - 批量更新物流状态（需要特殊权限）</li>
      </ul>

      <h3>售后管理</h3>
      <ul>
        <li><strong>售后订单</strong>：<code>/service/list</code> - 查看售后订单列表（需要 <code>service:list:view</code> 权限）</li>
        <li><strong>新建售后</strong>：<code>/service/add</code> - 创建售后工单（需要 <code>service:add</code> 权限）</li>
        <li><strong>售后详情</strong>：<code>/service/detail/:id</code> - 查看售后详情（需要 <code>service:detail:view</code> 权限）</li>
        <li><strong>编辑售后</strong>：<code>/service/edit/:id</code> - 修改售后信息（需要 <code>service:edit</code> 权限）</li>
        <li><strong>售后数据</strong>：<code>/service/data</code> - 查看售后数据统计（需要 <code>service:data:view</code> 权限）</li>
      </ul>

      <h3>资料管理</h3>
      <ul>
        <li><strong>资料列表</strong>：<code>/data/list</code> - 查看资料列表</li>
        <li><strong>客户查询</strong>：<code>/data/search</code> - 综合查询客户</li>
        <li><strong>回收站</strong>：<code>/data/recycle</code> - 查看已删除数据</li>
      </ul>

      <h3>财务管理</h3>
      <ul>
        <li><strong>绩效数据</strong>：<code>/finance/performance-data</code> - 查看绩效数据</li>
        <li><strong>绩效管理</strong>：<code>/finance/performance-manage</code> - 配置绩效规则（需要管理员权限）</li>
        <li><strong>代收管理</strong>：<code>/finance/cod-collection</code> - 管理订单代收（需要 <code>finance:cod</code> 权限）</li>
      </ul>

      <h3>商品管理</h3>
      <ul>
        <li><strong>商品列表</strong>：<code>/product/list</code> - 查看商品列表</li>
        <li><strong>新增商品</strong>：<code>/product/add</code> - 创建新商品（需要经理权限）</li>
        <li><strong>编辑商品</strong>：<code>/product/edit/:id</code> - 修改商品信息（需要经理权限）</li>
        <li><strong>商品详情</strong>：<code>/product/detail/:id</code> - 查看商品详情</li>
        <li><strong>商品分类</strong>：<code>/product/category</code> - 管理商品分类</li>
        <li><strong>库存管理</strong>：<code>/product/inventory</code> - 管理商品库存（需要经理权限）</li>
        <li><strong>商品分析</strong>：<code>/product/analytics</code> - 商品数据分析</li>
      </ul>

      <h3>服务管理</h3>
      <ul>
        <li><strong>短信管理</strong>：<code>/service-management/sms</code> - 管理短信发送（需要管理员权限）</li>
        <li><strong>通话管理</strong>：<code>/service-management/call</code> - 管理通话记录</li>
        <li><strong>通话数据汇总</strong>：<code>/service-management/call/dashboard</code> - 查看通话统计</li>
        <li><strong>呼出列表</strong>：<code>/service-management/call/outbound</code> - 查看呼出记录</li>
        <li><strong>通话记录</strong>：<code>/service-management/call/records</code> - 查看通话记录</li>
        <li><strong>跟进记录</strong>：<code>/service-management/call/followup</code> - 查看跟进记录</li>
        <li><strong>录音管理</strong>：<code>/service-management/call/recordings</code> - 管理通话录音</li>
        <li><strong>电话配置</strong>：<code>/service-management/call/config</code> - 配置电话系统</li>
      </ul>

      <h3>系统管理</h3>
      <ul>
        <li><strong>用户管理</strong>：<code>/system/users</code> - 管理系统用户（需要管理员权限）</li>
        <li><strong>角色权限</strong>：<code>/system/roles</code> - 配置角色权限（需要管理员权限）</li>
        <li><strong>部门管理</strong>：<code>/system/departments</code> - 管理部门结构（需要管理员权限）</li>
        <li><strong>部门详情</strong>：<code>/system/department/detail/:id</code> - 查看部门详情（需要管理员权限）</li>
        <li><strong>部门成员配置</strong>：<code>/system/department/members/:id</code> - 配置部门成员（需要管理员权限）</li>
        <li><strong>部门角色管理</strong>：<code>/system/department-roles</code> - 管理部门角色（需要管理员权限）</li>
      </ul>

      <h3>特殊权限标识</h3>
      <el-table :data="specialPermissions" stripe style="width: 100%; margin-top: 15px;">
        <el-table-column prop="permission" label="权限标识" width="200" />
        <el-table-column prop="description" label="说明" />
        <el-table-column prop="modules" label="适用模块" />
      </el-table>
    </section>
  </div>
</template>

<script setup lang="ts">
const specialPermissions = [
  { permission: 'finance:cod', description: '代收管理权限', modules: '取消代收审核、代收管理' },
  { permission: 'service:list:view', description: '售后列表查看权限', modules: '售后订单列表' },
  { permission: 'service:add', description: '新建售后权限', modules: '新建售后' },
  { permission: 'service:detail:view', description: '售后详情查看权限', modules: '售后详情' },
  { permission: 'service:edit', description: '编辑售后权限', modules: '编辑售后' },
  { permission: 'service:data:view', description: '售后数据查看权限', modules: '售后数据统计' }
]
</script>
<style scoped>
.help-content { line-height: 1.8; color: #333; }
.help-content h1 { font-size: 28px; color: #1a1a1a; margin-bottom: 30px; padding-bottom: 15px; border-bottom: 2px solid #409eff; }
.help-content h2 { font-size: 20px; color: #303133; margin: 30px 0 15px; }
.help-content h3 { font-size: 16px; color: #409eff; margin: 20px 0 10px; }
.help-content p { margin: 10px 0; color: #606266; }
.help-content ul, .help-content ol { margin: 10px 0; padding-left: 20px; }
.help-content li { margin: 8px 0; color: #606266; }
.help-content code { background: #f5f7fa; padding: 2px 6px; border-radius: 3px; font-family: 'Courier New', monospace; font-size: 13px; color: #e6a23c; }
section { margin-bottom: 30px; }
</style>
