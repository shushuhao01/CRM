<template>
  <div class="help-content">
    <h1>资料管理</h1>
    <section>
      <h2>功能概述</h2>
      <p>资料管理模块提供客户资料的导入、分配、查询和回收等功能，帮助企业高效管理客户资源。</p>
    </section>
    <section>
      <h2>二级菜单</h2>
      <div class="menu-list">
        <div class="menu-item">
          <div class="menu-icon">📋</div>
          <div class="menu-info">
            <h4>资料列表</h4>
            <p>查看和管理所有客户资料，支持导入分配</p>
            <span class="menu-path">路径：资料管理 → 资料列表</span>
            <el-tag size="small" type="warning">经理及以上可见</el-tag>
          </div>
        </div>
        <div class="menu-item">
          <div class="menu-icon">🔍</div>
          <div class="menu-info">
            <h4>客户查询</h4>
            <p>快速查询客户信息</p>
            <span class="menu-path">路径：资料管理 → 客户查询</span>
          </div>
        </div>
        <div class="menu-item">
          <div class="menu-icon">🗑️</div>
          <div class="menu-info">
            <h4>回收站</h4>
            <p>查看和恢复已删除的数据</p>
            <span class="menu-path">路径：资料管理 → 回收站</span>
            <el-tag size="small" type="warning">仅管理员可见</el-tag>
          </div>
        </div>
      </div>
    </section>
    <section>
      <h2>资料列表</h2>
      <h3>数据导入</h3>
      <ol>
        <li>点击"导入"按钮</li>
        <li>下载导入模板</li>
        <li>按模板格式填写数据</li>
        <li>上传Excel文件</li>
        <li>预览并确认导入</li>
      </ol>
      <h3>资料分配</h3>
      <ul>
        <li><strong>手动分配</strong>：选择资料，指定分配给某个销售员</li>
        <li><strong>批量分配</strong>：批量选择资料，分配给多个销售员</li>
        <li><strong>自动分配</strong>：按规则自动分配给销售员</li>
      </ul>
      <h3>资料状态</h3>
      <ul>
        <li><strong>未分配</strong>：新导入的资料，等待分配</li>
        <li><strong>已分配</strong>：已分配给销售员</li>
        <li><strong>已转化</strong>：已转化为正式客户</li>
      </ul>
    </section>
    <section>
      <h2>客户查询</h2>
      <p>快速查询客户信息，支持：</p>
      <ul>
        <li>按手机号查询</li>
        <li>按客户姓名查询</li>
        <li>按订单号查询</li>
        <li>查看客户详情和订单记录</li>
      </ul>
    </section>
    <section>
      <h2>回收站</h2>
      <p>已删除的数据会进入回收站，管理员可以：</p>
      <ul>
        <li>查看已删除的客户、订单等数据</li>
        <li>恢复误删的数据</li>
        <li>彻底删除数据（不可恢复）</li>
        <li>批量清空回收站</li>
      </ul>
      <el-alert type="warning" :closable="false" show-icon>
        <template #title>回收站数据默认保留30天，超过后自动清理</template>
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
.help-content ul, .help-content ol { margin: 10px 0; padding-left: 20px; }
.help-content li { margin: 8px 0; color: #606266; }
section { margin-bottom: 30px; }
.menu-list { display: grid; gap: 15px; margin-top: 15px; }
.menu-item { display: flex; align-items: flex-start; padding: 20px; background: #fafafa; border-radius: 8px; border: 1px solid #ebeef5; }
.menu-icon { font-size: 32px; margin-right: 15px; }
.menu-info h4 { margin: 0 0 8px; font-size: 16px; }
.menu-info p { margin: 0 0 8px; font-size: 14px; color: #909399; }
.menu-path { font-size: 12px; color: #c0c4cc; display: block; margin-bottom: 5px; }
</style>
