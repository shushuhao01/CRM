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
  </div>
</template>
<style scoped>
.help-content { line-height: 1.8; color: #333; }
.help-content h1 { font-size: 28px; color: #1a1a1a; margin-bottom: 30px; padding-bottom: 15px; border-bottom: 2px solid #409eff; }
.help-content h2 { font-size: 20px; color: #303133; margin: 30px 0 15px; }
.help-content h3 { font-size: 16px; color: #409eff; margin: 20px 0 10px; }
.help-content p { margin: 10px 0; color: #606266; }
.help-content ul, .help-content ol { margin: 10px 0; padding-left: 20px; }
.help-content li { margin: 8px 0; color: #606266; }
section { margin-bottom: 30px; }
</style>
