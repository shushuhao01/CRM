<template>
  <div class="help-content">
    <h1>角色权限概述</h1>

    <section>
      <h2>角色体系</h2>
      <p>
        云客CRM系统采用基于角色的访问控制（RBAC）模型，通过角色来管理用户权限。每个用户分配一个角色，角色决定了用户可以访问的功能和数据范围。
      </p>
    </section>

    <section>
      <h2>系统角色</h2>
      <div class="role-cards">
        <div class="role-card super-admin">
          <div class="role-header">
            <span class="role-icon">👑</span>
            <h3>超级管理员</h3>
          </div>
          <div class="role-body">
            <p class="role-desc">系统最高权限角色，拥有全部功能和数据访问权限</p>
            <div class="role-features">
              <h4>权限范围</h4>
              <ul>
                <li>✅ 所有功能模块</li>
                <li>✅ 所有数据访问</li>
                <li>✅ 系统配置管理</li>
                <li>✅ 用户权限管理</li>
              </ul>
            </div>
            <div class="role-data">
              <span class="data-scope">数据范围：全部数据</span>
            </div>
          </div>
        </div>

        <div class="role-card admin">
          <div class="role-header">
            <span class="role-icon">🔧</span>
            <h3>管理员</h3>
          </div>
          <div class="role-body">
            <p class="role-desc">企业管理角色，负责日常业务管理和用户管理</p>
            <div class="role-features">
              <h4>权限范围</h4>
              <ul>
                <li>✅ 业务功能模块</li>
                <li>✅ 用户管理</li>
                <li>✅ 部门管理</li>
                <li>✅ 系统设置</li>
                <li>❌ 超管专属功能</li>
              </ul>
            </div>
            <div class="role-data">
              <span class="data-scope">数据范围：全部数据</span>
            </div>
          </div>
        </div>

        <div class="role-card dept-manager">
          <div class="role-header">
            <span class="role-icon">👔</span>
            <h3>部门经理</h3>
          </div>
          <div class="role-body">
            <p class="role-desc">部门管理角色，负责本部门的业务和团队管理</p>
            <div class="role-features">
              <h4>权限范围</h4>
              <ul>
                <li>✅ 客户管理</li>
                <li>✅ 订单管理</li>
                <li>✅ 业绩统计</li>
                <li>✅ 团队数据查看</li>
                <li>❌ 系统管理</li>
              </ul>
            </div>
            <div class="role-data">
              <span class="data-scope">数据范围：本部门数据</span>
            </div>
          </div>
        </div>

        <div class="role-card sales">
          <div class="role-header">
            <span class="role-icon">💼</span>
            <h3>销售员</h3>
          </div>
          <div class="role-body">
            <p class="role-desc">一线销售角色，负责客户开发和订单处理</p>
            <div class="role-features">
              <h4>权限范围</h4>
              <ul>
                <li>✅ 个人客户管理</li>
                <li>✅ 个人订单管理</li>
                <li>✅ 个人业绩查看</li>
                <li>✅ 通话记录</li>
                <li>❌ 客户分组/标签</li>
              </ul>
            </div>
            <div class="role-data">
              <span class="data-scope">数据范围：个人数据</span>
            </div>
          </div>
        </div>

        <div class="role-card customer-service">
          <div class="role-header">
            <span class="role-icon">🎧</span>
            <h3>客服</h3>
          </div>
          <div class="role-body">
            <p class="role-desc">客户服务角色，负责订单审核、发货、售后等工作</p>
            <div class="role-features">
              <h4>权限范围</h4>
              <ul>
                <li>✅ 订单审核</li>
                <li>✅ 物流发货</li>
                <li>✅ 售后处理</li>
                <li>✅ 客户查询</li>
                <li>❌ 客户编辑</li>
              </ul>
            </div>
            <div class="role-data">
              <span class="data-scope">数据范围：全部数据（只读为主）</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section>
      <h2>权限类型</h2>
      <h3>菜单权限</h3>
      <p>控制用户可以看到和访问的菜单项：</p>
      <ul>
        <li>一级菜单：如客户管理、订单管理、系统管理等</li>
        <li>二级菜单：如客户列表、新增客户、客户分组等</li>
      </ul>

      <h3>操作权限</h3>
      <p>控制用户可以执行的操作：</p>
      <ul>
        <li>查看：查看数据详情</li>
        <li>新增：创建新数据</li>
        <li>编辑：修改现有数据</li>
        <li>删除：删除数据</li>
        <li>导入：批量导入数据</li>
        <li>导出：导出数据</li>
        <li>审核：审核订单等</li>
      </ul>

      <h3>数据权限</h3>
      <p>控制用户可以访问的数据范围：</p>
      <el-table :data="dataScopeData" stripe style="width: 100%">
        <el-table-column prop="scope" label="数据范围" width="150" />
        <el-table-column prop="description" label="说明" />
        <el-table-column prop="roles" label="适用角色" />
      </el-table>
    </section>

    <section>
      <h2>权限矩阵</h2>
      <p>各角色的功能权限对照表：</p>
      <el-table :data="permissionMatrix" stripe style="width: 100%" :row-class-name="tableRowClassName">
        <el-table-column prop="module" label="功能模块" width="150" fixed />
        <el-table-column prop="superAdmin" label="超级管理员" width="120" align="center">
          <template #default="{ row }">
            <el-icon v-if="row.superAdmin" color="#67c23a"><Check /></el-icon>
            <el-icon v-else color="#f56c6c"><Close /></el-icon>
          </template>
        </el-table-column>
        <el-table-column prop="admin" label="管理员" width="100" align="center">
          <template #default="{ row }">
            <el-icon v-if="row.admin" color="#67c23a"><Check /></el-icon>
            <el-icon v-else color="#f56c6c"><Close /></el-icon>
          </template>
        </el-table-column>
        <el-table-column prop="deptManager" label="部门经理" width="100" align="center">
          <template #default="{ row }">
            <el-icon v-if="row.deptManager" color="#67c23a"><Check /></el-icon>
            <el-icon v-else color="#f56c6c"><Close /></el-icon>
          </template>
        </el-table-column>
        <el-table-column prop="sales" label="销售员" width="100" align="center">
          <template #default="{ row }">
            <el-icon v-if="row.sales" color="#67c23a"><Check /></el-icon>
            <el-icon v-else color="#f56c6c"><Close /></el-icon>
          </template>
        </el-table-column>
        <el-table-column prop="customerService" label="客服" width="100" align="center">
          <template #default="{ row }">
            <el-icon v-if="row.customerService" color="#67c23a"><Check /></el-icon>
            <el-icon v-else color="#f56c6c"><Close /></el-icon>
          </template>
        </el-table-column>
      </el-table>
    </section>

    <section>
      <h2>客服类型</h2>
      <p>客服角色可以细分为不同类型，拥有不同的权限：</p>
      <el-table :data="customerServiceTypes" stripe style="width: 100%">
        <el-table-column prop="type" label="客服类型" width="120" />
        <el-table-column prop="permissions" label="主要权限" />
        <el-table-column prop="description" label="说明" />
      </el-table>
    </section>

    <section>
      <h2>权限配置说明</h2>
      <el-alert type="info" :closable="false" show-icon>
        <template #title>
          权限配置由管理员在"系统管理 → 角色权限"中进行
        </template>
      </el-alert>

      <h3>配置步骤</h3>
      <ol>
        <li>进入"系统管理" → "角色权限"</li>
        <li>选择要配置的角色</li>
        <li>在权限树中勾选需要的权限</li>
        <li>点击"保存"应用配置</li>
      </ol>

      <h3>注意事项</h3>
      <ul>
        <li>超级管理员权限不可修改</li>
        <li>修改角色权限会立即影响该角色的所有用户</li>
        <li>建议先在测试账号上验证权限配置</li>
        <li>敏感权限（如删除、导出）需谨慎分配</li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import { Check, Close } from '@element-plus/icons-vue'

const dataScopeData = [
  { scope: '全部数据', description: '可访问系统中所有数据', roles: '超级管理员、管理员' },
  { scope: '本部门数据', description: '只能访问本部门及下级部门的数据', roles: '部门经理' },
  { scope: '个人数据', description: '只能访问自己创建或负责的数据', roles: '销售员' },
  { scope: '全部数据（只读）', description: '可查看全部数据但操作受限', roles: '客服' }
]

const permissionMatrix = [
  { module: '数据看板', superAdmin: true, admin: true, deptManager: true, sales: true, customerService: false },
  { module: '客户列表', superAdmin: true, admin: true, deptManager: true, sales: true, customerService: true },
  { module: '新增客户', superAdmin: true, admin: true, deptManager: true, sales: true, customerService: false },
  { module: '客户分组', superAdmin: true, admin: true, deptManager: false, sales: false, customerService: false },
  { module: '客户标签', superAdmin: true, admin: true, deptManager: false, sales: false, customerService: false },
  { module: '订单列表', superAdmin: true, admin: true, deptManager: true, sales: true, customerService: true },
  { module: '新增订单', superAdmin: true, admin: true, deptManager: true, sales: true, customerService: false },
  { module: '订单审核', superAdmin: true, admin: true, deptManager: false, sales: false, customerService: true },
  { module: '通话管理', superAdmin: true, admin: true, deptManager: true, sales: true, customerService: false },
  { module: '短信管理', superAdmin: true, admin: true, deptManager: false, sales: false, customerService: false },
  { module: '个人业绩', superAdmin: true, admin: true, deptManager: true, sales: true, customerService: false },
  { module: '团队业绩', superAdmin: true, admin: true, deptManager: true, sales: true, customerService: false },
  { module: '业绩分析', superAdmin: true, admin: true, deptManager: true, sales: false, customerService: false },
  { module: '发货列表', superAdmin: true, admin: true, deptManager: false, sales: false, customerService: true },
  { module: '物流列表', superAdmin: true, admin: true, deptManager: true, sales: true, customerService: true },
  { module: '物流跟踪', superAdmin: true, admin: true, deptManager: true, sales: true, customerService: true },
  { module: '状态更新', superAdmin: true, admin: true, deptManager: false, sales: false, customerService: true },
  { module: '物流公司', superAdmin: true, admin: true, deptManager: false, sales: false, customerService: false },
  { module: '售后订单', superAdmin: true, admin: true, deptManager: true, sales: true, customerService: true },
  { module: '资料列表', superAdmin: true, admin: true, deptManager: true, sales: false, customerService: true },
  { module: '客户查询', superAdmin: true, admin: true, deptManager: true, sales: true, customerService: true },
  { module: '回收站', superAdmin: true, admin: true, deptManager: false, sales: false, customerService: false },
  { module: '绩效数据', superAdmin: true, admin: true, deptManager: true, sales: true, customerService: false },
  { module: '绩效管理', superAdmin: true, admin: true, deptManager: false, sales: false, customerService: false },
  { module: '商品管理', superAdmin: true, admin: true, deptManager: false, sales: false, customerService: false },
  { module: '系统管理', superAdmin: true, admin: true, deptManager: false, sales: false, customerService: false }
]

const customerServiceTypes = [
  { type: '审核客服', permissions: '订单审核、订单查看', description: '专门负责订单审核工作' },
  { type: '物流客服', permissions: '发货管理、物流跟踪、状态更新', description: '专门负责物流发货工作' },
  { type: '售后客服', permissions: '售后工单、退换货处理', description: '专门负责售后服务工作' },
  { type: '综合客服', permissions: '以上所有权限', description: '拥有全部客服权限' }
]

const tableRowClassName = ({ rowIndex }: { rowIndex: number }) => {
  if (rowIndex % 2 === 0) {
    return 'even-row'
  }
  return 'odd-row'
}
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

.help-content h4 {
  font-size: 14px;
  color: #303133;
  margin: 10px 0;
}

.help-content p {
  margin: 10px 0;
  color: #606266;
}

.help-content ul, .help-content ol {
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

.role-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.role-card {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.role-header {
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.role-icon {
  font-size: 32px;
}

.role-header h3 {
  margin: 0;
  color: white;
  font-size: 18px;
}

.role-body {
  padding: 20px;
  background: white;
}

.role-desc {
  color: #606266;
  font-size: 14px;
  margin-bottom: 15px;
}

.role-features h4 {
  color: #303133;
  margin-bottom: 10px;
}

.role-features ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.role-features li {
  padding: 5px 0;
  font-size: 13px;
}

.role-data {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #ebeef5;
}

.data-scope {
  font-size: 12px;
  color: #909399;
  background: #f5f7fa;
  padding: 4px 10px;
  border-radius: 4px;
}

/* 角色卡片颜色 */
.role-card.super-admin .role-header {
  background: linear-gradient(135deg, #f56c6c 0%, #e6a23c 100%);
}

.role-card.admin .role-header {
  background: linear-gradient(135deg, #409eff 0%, #67c23a 100%);
}

.role-card.dept-manager .role-header {
  background: linear-gradient(135deg, #67c23a 0%, #e6a23c 100%);
}

.role-card.sales .role-header {
  background: linear-gradient(135deg, #409eff 0%, #909399 100%);
}

.role-card.customer-service .role-header {
  background: linear-gradient(135deg, #909399 0%, #606266 100%);
}
</style>
