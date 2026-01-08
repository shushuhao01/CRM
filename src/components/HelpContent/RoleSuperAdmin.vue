<template>
  <div class="help-content">
    <h1>超级管理员</h1>
    <section>
      <h2>角色说明</h2>
      <p>超级管理员是系统最高权限角色，拥有系统全部功能和数据的访问权限。通常由企业IT管理员或系统负责人担任。</p>
    </section>
    <section>
      <h2>权限范围</h2>
      <ul>
        <li>✅ 所有功能模块的完整访问权限</li>
        <li>✅ 所有数据的查看、编辑、删除权限</li>
        <li>✅ 系统配置和设置权限</li>
        <li>✅ 用户管理和权限分配</li>
        <li>✅ 超管专属面板</li>
      </ul>
    </section>
    <section>
      <h2>专属功能</h2>
      <h3>超管面板</h3>
      <p>超级管理员专属的管理面板，包含：</p>
      <ul>
        <li>系统运行状态监控</li>
        <li>数据库管理</li>
        <li>系统日志查看</li>
        <li>高级配置选项</li>
      </ul>
      <h3>权限管理</h3>
      <ul>
        <li>创建和编辑角色</li>
        <li>配置角色权限</li>
        <li>管理用户角色分配</li>
      </ul>
    </section>
    <section>
      <h2>注意事项</h2>
      <el-alert type="warning" :closable="false" show-icon>
        <template #title>安全提醒</template>
        <template #default>
          <ul style="margin: 10px 0 0; padding-left: 20px;">
            <li>超级管理员账号应妥善保管，避免泄露</li>
            <li>建议定期修改密码</li>
            <li>重要操作前请确认操作内容</li>
            <li>建议开启操作日志记录</li>
          </ul>
        </template>
      </el-alert>
    </section>
  </div>
</template>
<style scoped>
.help-content { line-height: 1.8; color: #333; }
.help-content h1 { font-size: 28px; color: #1a1a1a; margin-bottom: 30px; padding-bottom: 15px; border-bottom: 2px solid #409eff; }
.help-content h2 { font-size: 20px; color: #303133; margin: 30px 0 15px; }
.help-content h3 { font-size: 16px; color: #409eff; margin: 20px 0 10px; }
.help-content p { margin: 10px 0; color: #606266; }
.help-content ul { margin: 10px 0; padding-left: 20px; }
.help-content li { margin: 8px 0; color: #606266; }
section { margin-bottom: 30px; }
</style>
