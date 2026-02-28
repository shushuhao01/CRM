<template>
  <div class="help-content">
    <h1>权限树</h1>

    <section>
      <h2>概述</h2>
      <p>系统权限采用树形结构组织，每个模块包含多个子权限。管理员可以在"系统管理 → 角色权限"中勾选权限树来配置角色权限。</p>
    </section>

    <section>
      <h2>数据看板</h2>
      <ul>
        <li><strong>路径</strong>：<code>/dashboard</code></li>
        <li><strong>权限</strong>：查看数据看板、统计图表</li>
        <li><strong>适用角色</strong>：超级管理员、管理员、部门经理、销售员</li>
      </ul>
    </section>

    <section>
      <h2>客户管理</h2>
      <div class="permission-tree">
        <div class="tree-item">
          <strong>客户列表</strong>
          <p>路径：<code>/customer/list</code></p>
          <p>功能：查看客户列表、搜索客户、筛选客户</p>
          <p>适用角色：超级管理员、管理员、部门经理、销售员、客服</p>
        </div>
        <div class="tree-item">
          <strong>新增客户</strong>
          <p>路径：<code>/customer/add</code></p>
          <p>功能：创建新客户、填写客户信息</p>
          <p>适用角色：超级管理员、管理员、部门经理、销售员</p>
        </div>
        <div class="tree-item">
          <strong>编辑客户</strong>
          <p>路径：<code>/customer/edit/:id</code></p>
          <p>功能：修改客户信息</p>
          <p>适用角色：超级管理员、管理员、部门经理、销售员</p>
        </div>
        <div class="tree-item">
          <strong>客户详情</strong>
          <p>路径：<code>/customer/detail/:id</code></p>
          <p>功能：查看客户详细信息、订单记录、跟进记录</p>
          <p>适用角色：超级管理员、管理员、部门经理、销售员、客服</p>
        </div>
        <div class="tree-item">
          <strong>客户标签</strong>
          <p>路径：<code>/customer/tags</code></p>
          <p>功能：管理客户标签、创建标签、编辑标签</p>
          <p>适用角色：超级管理员、管理员</p>
        </div>
        <div class="tree-item">
          <strong>客户分组</strong>
          <p>路径：<code>/customer/groups</code></p>
          <p>功能：管理客户分组、创建分组、编辑分组</p>
          <p>适用角色：超级管理员、管理员</p>
        </div>
      </div>
    </section>

    <section>
      <h2>订单管理</h2>
      <div class="permission-tree">
        <div class="tree-item">
          <strong>订单列表</strong>
          <p>路径：<code>/order/list</code></p>
          <p>功能：查看订单列表、搜索订单、筛选订单</p>
          <p>适用角色：超级管理员、管理员、部门经理、销售员、客服</p>
        </div>
        <div class="tree-item">
          <strong>新增订单</strong>
          <p>路径：<code>/order/add</code></p>
          <p>功能：创建新订单、选择商品、填写收货信息</p>
          <p>适用角色：超级管理员、管理员、部门经理、销售员</p>
        </div>
        <div class="tree-item">
          <strong>编辑订单</strong>
          <p>路径：<code>/order/edit/:id</code></p>
          <p>功能：修改订单信息</p>
          <p>适用角色：超级管理员、管理员、部门经理、销售员</p>
        </div>
        <div class="tree-item">
          <strong>订单详情</strong>
          <p>路径：<code>/order/detail/:id</code></p>
          <p>功能：查看订单详细信息、状态历史、操作记录</p>
          <p>适用角色：超级管理员、管理员、部门经理、销售员、客服</p>
        </div>
        <div class="tree-item">
          <strong>订单审核</strong>
          <p>路径：<code>/order/audit</code></p>
          <p>功能：审核待审核订单、通过或拒绝订单</p>
          <p>适用角色：超级管理员、管理员、客服</p>
        </div>
        <div class="tree-item">
          <strong>取消代收申请</strong>
          <p>路径：<code>/order/my-cod-application</code></p>
          <p>功能：查看和管理个人提交的取消代收申请记录</p>
          <p>适用角色：超级管理员、管理员、部门经理、销售员</p>
        </div>
        <div class="tree-item">
          <strong>取消代收审核</strong>
          <p>路径：<code>/order/cod-application-review</code></p>
          <p>功能：审核销售员提交的取消代收申请</p>
          <p>权限标识：<code>finance:cod</code></p>
          <p>适用角色：超级管理员、管理员、客服</p>
        </div>
      </div>
    </section>

    <section>
      <h2>业绩统计</h2>
      <div class="permission-tree">
        <div class="tree-item">
          <strong>个人业绩</strong>
          <p>路径：<code>/performance/personal</code></p>
          <p>功能：查看个人业绩数据、订单统计、业绩趋势</p>
          <p>适用角色：超级管理员、管理员、部门经理、销售员</p>
        </div>
        <div class="tree-item">
          <strong>团队业绩</strong>
          <p>路径：<code>/performance/team</code></p>
          <p>功能：查看团队业绩数据、成员排名</p>
          <p>适用角色：超级管理员、管理员、部门经理、销售员</p>
        </div>
        <div class="tree-item">
          <strong>业绩分析</strong>
          <p>路径：<code>/performance/analysis</code></p>
          <p>功能：业绩数据分析、趋势预测</p>
          <p>适用角色：超级管理员、管理员、部门经理</p>
        </div>
        <div class="tree-item">
          <strong>业绩分享</strong>
          <p>路径：<code>/performance/share</code></p>
          <p>功能：业绩分享管理、分享记录</p>
          <p>适用角色：超级管理员、管理员、部门经理、销售员</p>
        </div>
      </div>
    </section>

    <section>
      <h2>物流管理</h2>
      <div class="permission-tree">
        <div class="tree-item">
          <strong>物流列表</strong>
          <p>路径：<code>/logistics/list</code></p>
          <p>功能：查看物流列表、搜索物流单号</p>
          <p>适用角色：超级管理员、管理员、部门经理、销售员、客服</p>
        </div>
        <div class="tree-item">
          <strong>物流详情</strong>
          <p>路径：<code>/logistics/detail/:id</code></p>
          <p>功能：查看物流详细信息、轨迹记录</p>
          <p>适用角色：超级管理员、管理员、部门经理、销售员、客服</p>
        </div>
        <div class="tree-item">
          <strong>编辑物流</strong>
          <p>路径：<code>/logistics/edit/:id</code></p>
          <p>功能：修改物流信息</p>
          <p>适用角色：超级管理员、管理员、客服</p>
        </div>
        <div class="tree-item">
          <strong>物流跟踪</strong>
          <p>路径：<code>/logistics/track</code></p>
          <p>功能：物流跟踪查询、批量查询</p>
          <p>适用角色：超级管理员、管理员、部门经理、销售员、客服</p>
        </div>
        <div class="tree-item">
          <strong>物流公司</strong>
          <p>路径：<code>/logistics/companies</code></p>
          <p>功能：管理物流公司、添加物流公司</p>
          <p>适用角色：超级管理员、管理员</p>
        </div>
        <div class="tree-item">
          <strong>发货列表</strong>
          <p>路径：<code>/logistics/shipping</code></p>
          <p>功能：查看待发货订单、批量发货</p>
          <p>适用角色：超级管理员、管理员、客服</p>
        </div>
        <div class="tree-item">
          <strong>状态更新</strong>
          <p>路径：<code>/logistics/status-update</code></p>
          <p>功能：批量更新物流状态</p>
          <p>权限标识：需要特殊权限</p>
          <p>适用角色：超级管理员、管理员、客服</p>
        </div>
      </div>
    </section>

    <section>
      <h2>售后管理</h2>
      <div class="permission-tree">
        <div class="tree-item">
          <strong>售后订单</strong>
          <p>路径：<code>/service/list</code></p>
          <p>功能：查看售后订单列表</p>
          <p>权限标识：<code>service:list:view</code></p>
          <p>适用角色：超级管理员、管理员、部门经理、销售员、客服</p>
        </div>
        <div class="tree-item">
          <strong>新建售后</strong>
          <p>路径：<code>/service/add</code></p>
          <p>功能：创建售后工单</p>
          <p>权限标识：<code>service:add</code></p>
          <p>适用角色：超级管理员、管理员、部门经理、销售员、客服</p>
        </div>
        <div class="tree-item">
          <strong>售后详情</strong>
          <p>路径：<code>/service/detail/:id</code></p>
          <p>功能：查看售后详情</p>
          <p>权限标识：<code>service:detail:view</code></p>
          <p>适用角色：超级管理员、管理员、部门经理、销售员、客服</p>
        </div>
        <div class="tree-item">
          <strong>编辑售后</strong>
          <p>路径：<code>/service/edit/:id</code></p>
          <p>功能：修改售后信息</p>
          <p>权限标识：<code>service:edit</code></p>
          <p>适用角色：超级管理员、管理员、部门经理、客服</p>
        </div>
        <div class="tree-item">
          <strong>售后数据</strong>
          <p>路径：<code>/service/data</code></p>
          <p>功能：查看售后数据统计</p>
          <p>权限标识：<code>service:data:view</code></p>
          <p>适用角色：超级管理员、管理员、部门经理</p>
        </div>
      </div>
    </section>

    <section>
      <h2>资料管理</h2>
      <div class="permission-tree">
        <div class="tree-item">
          <strong>资料列表</strong>
          <p>路径：<code>/data/list</code></p>
          <p>功能：查看资料列表、分配资料</p>
          <p>适用角色：超级管理员、管理员、部门经理、客服</p>
        </div>
        <div class="tree-item">
          <strong>客户查询</strong>
          <p>路径：<code>/data/search</code></p>
          <p>功能：综合查询客户信息</p>
          <p>适用角色：超级管理员、管理员、部门经理、销售员、客服</p>
        </div>
        <div class="tree-item">
          <strong>回收站</strong>
          <p>路径：<code>/data/recycle</code></p>
          <p>功能：查看已删除数据、恢复数据</p>
          <p>适用角色：超级管理员、管理员</p>
        </div>
      </div>
    </section>

    <section>
      <h2>财务管理</h2>
      <div class="permission-tree">
        <div class="tree-item">
          <strong>绩效数据</strong>
          <p>路径：<code>/finance/performance-data</code></p>
          <p>功能：查看绩效数据、提成明细</p>
          <p>适用角色：超级管理员、管理员、部门经理、销售员</p>
        </div>
        <div class="tree-item">
          <strong>绩效管理</strong>
          <p>路径：<code>/finance/performance-manage</code></p>
          <p>功能：配置绩效规则、阶梯提成</p>
          <p>权限标识：需要管理员权限</p>
          <p>适用角色：超级管理员、管理员</p>
        </div>
        <div class="tree-item">
          <strong>代收管理</strong>
          <p>路径：<code>/finance/cod-collection</code></p>
          <p>功能：管理订单代收、统计代收数据</p>
          <p>权限标识：<code>finance:cod</code></p>
          <p>适用角色：超级管理员、管理员</p>
        </div>
      </div>
    </section>

    <section>
      <h2>商品管理</h2>
      <div class="permission-tree">
        <div class="tree-item">
          <strong>商品列表</strong>
          <p>路径：<code>/product/list</code></p>
          <p>功能：查看商品列表、搜索商品</p>
          <p>适用角色：超级管理员、管理员、部门经理、销售员、客服</p>
        </div>
        <div class="tree-item">
          <strong>新增商品</strong>
          <p>路径：<code>/product/add</code></p>
          <p>功能：创建新商品</p>
          <p>权限标识：需要经理权限</p>
          <p>适用角色：超级管理员、管理员</p>
        </div>
        <div class="tree-item">
          <strong>编辑商品</strong>
          <p>路径：<code>/product/edit/:id</code></p>
          <p>功能：修改商品信息</p>
          <p>权限标识：需要经理权限</p>
          <p>适用角色：超级管理员、管理员</p>
        </div>
        <div class="tree-item">
          <strong>商品详情</strong>
          <p>路径：<code>/product/detail/:id</code></p>
          <p>功能：查看商品详细信息</p>
          <p>适用角色：超级管理员、管理员、部门经理、销售员、客服</p>
        </div>
        <div class="tree-item">
          <strong>商品分类</strong>
          <p>路径：<code>/product/category</code></p>
          <p>功能：管理商品分类</p>
          <p>适用角色：超级管理员、管理员</p>
        </div>
        <div class="tree-item">
          <strong>库存管理</strong>
          <p>路径：<code>/product/inventory</code></p>
          <p>功能：管理商品库存</p>
          <p>权限标识：需要经理权限</p>
          <p>适用角色：超级管理员、管理员</p>
        </div>
        <div class="tree-item">
          <strong>商品分析</strong>
          <p>路径：<code>/product/analytics</code></p>
          <p>功能：商品数据分析</p>
          <p>适用角色：超级管理员、管理员、部门经理</p>
        </div>
      </div>
    </section>

    <section>
      <h2>服务管理</h2>
      <div class="permission-tree">
        <div class="tree-item">
          <strong>短信管理</strong>
          <p>路径：<code>/service-management/sms</code></p>
          <p>功能：管理短信发送、短信模板</p>
          <p>权限标识：需要管理员权限</p>
          <p>适用角色：超级管理员、管理员</p>
        </div>
        <div class="tree-item">
          <strong>通话管理</strong>
          <p>路径：<code>/service-management/call</code></p>
          <p>功能：管理通话记录</p>
          <p>适用角色：超级管理员、管理员、部门经理、销售员</p>
        </div>
        <div class="tree-item">
          <strong>通话数据汇总</strong>
          <p>路径：<code>/service-management/call/dashboard</code></p>
          <p>功能：查看通话统计数据</p>
          <p>适用角色：超级管理员、管理员、部门经理、销售员</p>
        </div>
        <div class="tree-item">
          <strong>呼出列表</strong>
          <p>路径：<code>/service-management/call/outbound</code></p>
          <p>功能：查看呼出记录</p>
          <p>适用角色：超级管理员、管理员、部门经理、销售员</p>
        </div>
        <div class="tree-item">
          <strong>通话记录</strong>
          <p>路径：<code>/service-management/call/records</code></p>
          <p>功能：查看通话记录</p>
          <p>适用角色：超级管理员、管理员、部门经理、销售员</p>
        </div>
        <div class="tree-item">
          <strong>跟进记录</strong>
          <p>路径：<code>/service-management/call/followup</code></p>
          <p>功能：查看跟进记录</p>
          <p>适用角色：超级管理员、管理员、部门经理、销售员</p>
        </div>
        <div class="tree-item">
          <strong>录音管理</strong>
          <p>路径：<code>/service-management/call/recordings</code></p>
          <p>功能：管理通话录音</p>
          <p>适用角色：超级管理员、管理员、部门经理、销售员</p>
        </div>
        <div class="tree-item">
          <strong>电话配置</strong>
          <p>路径：<code>/service-management/call/config</code></p>
          <p>功能：配置电话系统</p>
          <p>适用角色：超级管理员、管理员</p>
        </div>
      </div>
    </section>

    <section>
      <h2>系统管理</h2>
      <div class="permission-tree">
        <div class="tree-item">
          <strong>用户管理</strong>
          <p>路径：<code>/system/users</code></p>
          <p>功能：管理系统用户、添加用户、编辑用户</p>
          <p>权限标识：需要管理员权限</p>
          <p>适用角色：超级管理员、管理员</p>
        </div>
        <div class="tree-item">
          <strong>角色权限</strong>
          <p>路径：<code>/system/roles</code></p>
          <p>功能：配置角色权限、创建自定义角色</p>
          <p>权限标识：需要管理员权限</p>
          <p>适用角色：超级管理员、管理员</p>
        </div>
        <div class="tree-item">
          <strong>部门管理</strong>
          <p>路径：<code>/system/departments</code></p>
          <p>功能：管理部门结构、添加部门</p>
          <p>权限标识：需要管理员权限</p>
          <p>适用角色：超级管理员、管理员</p>
        </div>
        <div class="tree-item">
          <strong>部门详情</strong>
          <p>路径：<code>/system/department/detail/:id</code></p>
          <p>功能：查看部门详情</p>
          <p>权限标识：需要管理员权限</p>
          <p>适用角色：超级管理员、管理员</p>
        </div>
        <div class="tree-item">
          <strong>部门成员配置</strong>
          <p>路径：<code>/system/department/members/:id</code></p>
          <p>功能：配置部门成员</p>
          <p>权限标识：需要管理员权限</p>
          <p>适用角色：超级管理员、管理员</p>
        </div>
        <div class="tree-item">
          <strong>部门角色管理</strong>
          <p>路径：<code>/system/department-roles</code></p>
          <p>功能：管理部门角色</p>
          <p>权限标识：需要管理员权限</p>
          <p>适用角色：超级管理员、管理员</p>
        </div>
      </div>
    </section>

    <section>
      <h2>特殊权限标识</h2>
      <p>某些功能需要特定的权限标识才能访问：</p>
      <el-table :data="specialPermissions" stripe style="width: 100%; margin-top: 15px;">
        <el-table-column prop="permission" label="权限标识" width="200" />
        <el-table-column prop="description" label="说明" />
        <el-table-column prop="modules" label="适用模块" />
      </el-table>
    </section>

    <section>
      <h2>权限配置说明</h2>
      <el-alert type="info" :closable="false" show-icon>
        <template #title>
          如何配置权限
        </template>
        <template #default>
          <ol style="margin: 10px 0 0; padding-left: 20px;">
            <li>进入"系统管理" → "角色权限"</li>
            <li>选择要配置的角色</li>
            <li>在权限树中勾选需要的权限</li>
            <li>点击"保存"应用配置</li>
          </ol>
        </template>
      </el-alert>
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
  margin: 30px 0 15px;
}

.help-content h3 {
  font-size: 16px;
  color: #409eff;
  margin: 20px 0 10px;
}

.help-content p {
  margin: 10px 0;
  color: #606266;
}

.help-content ul,
.help-content ol {
  margin: 10px 0;
  padding-left: 20px;
}

.help-content li {
  margin: 8px 0;
  color: #606266;
}

.help-content code {
  background: #f5f7fa;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  color: #e6a23c;
}

section {
  margin-bottom: 40px;
}

.permission-tree {
  margin-top: 15px;
}

.tree-item {
  background: #fafafa;
  border-left: 3px solid #409eff;
  padding: 15px 20px;
  margin-bottom: 15px;
  border-radius: 4px;
}

.tree-item strong {
  display: block;
  font-size: 16px;
  color: #303133;
  margin-bottom: 8px;
}

.tree-item p {
  margin: 5px 0;
  font-size: 14px;
  color: #606266;
}

.tree-item p:first-of-type {
  margin-top: 8px;
}
</style>
