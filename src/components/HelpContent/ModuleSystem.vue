<template>
  <div class="help-content">
    <h1>系统管理</h1>

    <section>
      <h2>功能概述</h2>
      <p>
        系统管理模块提供企业组织架构、用户账号、角色权限、系统配置等管理功能，是系统的核心管理模块。
      </p>
      <el-alert type="warning" :closable="false" show-icon>
        <template #title>
          系统管理模块仅管理员可访问
        </template>
      </el-alert>
    </section>

    <section>
      <h2>二级菜单</h2>
      <div class="menu-list">
        <div class="menu-item">
          <div class="menu-icon">🏢</div>
          <div class="menu-info">
            <h4>部门管理</h4>
            <p>管理企业组织架构，创建和编辑部门</p>
            <span class="menu-path">路径：系统管理 → 部门管理</span>
          </div>
        </div>
        <div class="menu-item">
          <div class="menu-icon">👥</div>
          <div class="menu-info">
            <h4>用户管理</h4>
            <p>管理系统用户账号，分配角色和部门</p>
            <span class="menu-path">路径：系统管理 → 用户管理</span>
          </div>
        </div>
        <div class="menu-item">
          <div class="menu-icon">🔐</div>
          <div class="menu-info">
            <h4>角色权限</h4>
            <p>管理角色和权限配置</p>
            <span class="menu-path">路径：系统管理 → 角色权限</span>
          </div>
        </div>
        <div class="menu-item">
          <div class="menu-icon">🛡️</div>
          <div class="menu-info">
            <h4>权限管理</h4>
            <p>查看和管理系统权限列表</p>
            <span class="menu-path">路径：系统管理 → 权限管理</span>
          </div>
        </div>
        <div class="menu-item">
          <div class="menu-icon">👑</div>
          <div class="menu-info">
            <h4>超管面板</h4>
            <p>超级管理员专属功能面板</p>
            <span class="menu-path">路径：系统管理 → 超管面板</span>
            <el-tag size="small" type="danger">仅超管可见</el-tag>
          </div>
        </div>
        <div class="menu-item">
          <div class="menu-icon">🎧</div>
          <div class="menu-info">
            <h4>客服管理</h4>
            <p>管理客服账号和权限配置</p>
            <span class="menu-path">路径：系统管理 → 客服管理</span>
          </div>
        </div>
        <div class="menu-item">
          <div class="menu-icon">📨</div>
          <div class="menu-info">
            <h4>消息管理</h4>
            <p>管理系统消息、公告、通知渠道</p>
            <span class="menu-path">路径：系统管理 → 消息管理</span>
          </div>
        </div>
        <div class="menu-item">
          <div class="menu-icon">⚙️</div>
          <div class="menu-info">
            <h4>系统设置</h4>
            <p>配置系统基础设置、订单设置、物流设置等</p>
            <span class="menu-path">路径：系统管理 → 系统设置</span>
          </div>
        </div>
        <div class="menu-item">
          <div class="menu-icon">🔌</div>
          <div class="menu-info">
            <h4>接口管理</h4>
            <p>管理API接口配置</p>
            <span class="menu-path">路径：系统管理 → 接口管理</span>
          </div>
        </div>
      </div>
    </section>

    <section>
      <h2>部门管理</h2>
      <h3>创建部门</h3>
      <ol>
        <li>进入"系统管理" → "部门管理"</li>
        <li>点击"新增部门"按钮</li>
        <li>填写部门信息：
          <ul>
            <li>部门名称（必填）</li>
            <li>上级部门（可选，不选则为顶级部门）</li>
            <li>部门负责人（可选）</li>
            <li>部门描述（可选）</li>
          </ul>
        </li>
        <li>点击"确定"保存</li>
      </ol>

      <h3>部门操作</h3>
      <ul>
        <li><strong>编辑</strong>：修改部门信息</li>
        <li><strong>删除</strong>：删除部门（部门下有成员时不可删除）</li>
        <li><strong>查看成员</strong>：查看部门下的所有成员</li>
        <li><strong>添加子部门</strong>：在当前部门下创建子部门</li>
      </ul>
    </section>

    <section>
      <h2>用户管理</h2>
      <h3>创建用户</h3>
      <ol>
        <li>进入"系统管理" → "用户管理"</li>
        <li>点击"新增用户"按钮</li>
        <li>填写用户信息：
          <ul>
            <li>用户名（必填，用于登录）</li>
            <li>真实姓名（必填）</li>
            <li>手机号（必填）</li>
            <li>邮箱（可选）</li>
            <li>所属部门（必填）</li>
            <li>角色（必填）</li>
            <li>初始密码（必填）</li>
          </ul>
        </li>
        <li>点击"确定"保存</li>
      </ol>

      <h3>用户操作</h3>
      <ul>
        <li><strong>编辑</strong>：修改用户信息</li>
        <li><strong>重置密码</strong>：重置用户登录密码</li>
        <li><strong>禁用/启用</strong>：禁用或启用用户账号</li>
        <li><strong>删除</strong>：删除用户账号</li>
        <li><strong>分配角色</strong>：修改用户角色</li>
        <li><strong>调整部门</strong>：调整用户所属部门</li>
      </ul>

      <h3>批量操作</h3>
      <ul>
        <li>批量导入用户</li>
        <li>批量调整部门</li>
        <li>批量禁用/启用</li>
      </ul>
    </section>

    <section>
      <h2>角色权限</h2>
      <h3>系统角色</h3>
      <el-table :data="roleData" stripe style="width: 100%">
        <el-table-column prop="role" label="角色" width="150" />
        <el-table-column prop="description" label="说明" />
        <el-table-column prop="editable" label="可编辑" width="100">
          <template #default="{ row }">
            <el-tag :type="row.editable ? 'success' : 'info'" size="small">
              {{ row.editable ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>

      <h3>权限配置</h3>
      <ol>
        <li>选择要配置的角色</li>
        <li>在权限树中勾选需要的权限</li>
        <li>点击"保存"应用配置</li>
      </ol>

      <h3>自定义角色</h3>
      <p>除系统预设角色外，可以创建自定义角色：</p>
      <ol>
        <li>点击"新增角色"</li>
        <li>输入角色名称和描述</li>
        <li>配置角色权限</li>
        <li>保存角色</li>
      </ol>
    </section>

    <section>
      <h2>客服管理</h2>
      <h3>客服类型</h3>
      <ul>
        <li><strong>审核客服</strong>：负责订单审核</li>
        <li><strong>物流客服</strong>：负责发货和物流跟踪</li>
        <li><strong>售后客服</strong>：负责售后处理</li>
        <li><strong>综合客服</strong>：拥有以上所有权限</li>
      </ul>

      <h3>配置客服权限</h3>
      <ol>
        <li>进入"系统管理" → "客服管理"</li>
        <li>选择客服用户</li>
        <li>选择客服类型</li>
        <li>配置具体权限</li>
        <li>保存配置</li>
      </ol>
    </section>

    <section>
      <h2>消息管理</h2>
      <h3>消息订阅</h3>
      <p>配置不同类型消息的订阅规则：</p>
      <ul>
        <li>订单消息：订单创建、审核、发货等通知</li>
        <li>物流消息：物流状态更新通知</li>
        <li>售后消息：售后工单通知</li>
        <li>系统消息：系统公告、维护通知等</li>
      </ul>

      <h3>通知渠道</h3>
      <p>支持多种通知渠道：</p>
      <ul>
        <li>系统内消息（消息中心）</li>
        <li>企业微信机器人</li>
        <li>钉钉机器人</li>
        <li>邮件通知</li>
        <li>短信通知</li>
      </ul>

      <h3>公告管理</h3>
      <p>发布系统公告，支持：</p>
      <ul>
        <li>创建公告</li>
        <li>设置公告类型（通知、警告、重要）</li>
        <li>设置展示时间</li>
        <li>发布/撤回公告</li>
      </ul>
    </section>

    <section>
      <h2>系统设置</h2>
      <h3>基础设置</h3>
      <ul>
        <li>系统名称</li>
        <li>系统Logo</li>
        <li>登录页背景</li>
        <li>版权信息</li>
      </ul>

      <h3>订单设置</h3>
      <ul>
        <li>订单流转模式（自动/手动）</li>
        <li>流转延迟时间</li>
        <li>订单号前缀</li>
        <li>自定义字段配置</li>
      </ul>

      <h3>物流设置</h3>
      <ul>
        <li>默认物流公司</li>
        <li>发件人信息</li>
        <li>物流API配置</li>
      </ul>

      <h3>通知设置</h3>
      <ul>
        <li>超时提醒配置</li>
        <li>通知渠道配置</li>
        <li>消息清理配置</li>
      </ul>

      <h3>短信设置</h3>
      <ul>
        <li>短信服务商配置</li>
        <li>短信模板管理</li>
        <li>短信签名配置</li>
      </ul>
    </section>

    <section>
      <h2>常见问题</h2>
      <el-collapse>
        <el-collapse-item title="Q: 如何重置用户密码？" name="1">
          <p>A: 在用户管理中找到该用户，点击"重置密码"按钮，系统会生成新密码或发送重置链接。</p>
        </el-collapse-item>
        <el-collapse-item title="Q: 删除部门时提示有成员怎么办？" name="2">
          <p>A: 需要先将部门下的成员调整到其他部门，然后才能删除该部门。</p>
        </el-collapse-item>
        <el-collapse-item title="Q: 如何给用户分配多个角色？" name="3">
          <p>A: 目前系统支持一个用户一个角色。如需复合权限，可以创建自定义角色并配置所需权限。</p>
        </el-collapse-item>
        <el-collapse-item title="Q: 系统设置修改后需要重启吗？" name="4">
          <p>A: 大部分设置修改后立即生效，无需重启。部分配置（如短信API）可能需要刷新页面。</p>
        </el-collapse-item>
      </el-collapse>
    </section>
  </div>
</template>

<script setup lang="ts">
const roleData = [
  { role: '超级管理员', description: '拥有系统全部权限，不可修改', editable: false },
  { role: '管理员', description: '拥有大部分管理权限', editable: true },
  { role: '部门经理', description: '管理本部门业务', editable: true },
  { role: '销售员', description: '管理个人客户和订单', editable: true },
  { role: '客服', description: '处理审核、发货、售后', editable: true }
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

.menu-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
  margin-top: 15px;
}

.menu-item {
  display: flex;
  align-items: flex-start;
  padding: 20px;
  background: #fafafa;
  border-radius: 8px;
  border: 1px solid #ebeef5;
}

.menu-icon {
  font-size: 32px;
  margin-right: 15px;
}

.menu-info h4 {
  margin: 0 0 8px;
  font-size: 16px;
}

.menu-info p {
  margin: 0 0 8px;
  font-size: 14px;
  color: #909399;
}

.menu-path {
  font-size: 12px;
  color: #c0c4cc;
  display: block;
  margin-bottom: 5px;
}

:deep(.el-collapse-item__header) {
  font-weight: 500;
  color: #303133;
}

:deep(.el-collapse-item__content) {
  color: #606266;
  line-height: 1.8;
}

@media (max-width: 768px) {
  .menu-list {
    grid-template-columns: 1fr;
  }
}
</style>
