<template>
  <div class="help-content">
    <h1>服务管理</h1>
    <section>
      <h2>功能概述</h2>
      <p>服务管理模块提供通话管理和短信管理功能，帮助销售团队高效进行客户沟通。</p>
    </section>
    <section>
      <h2>二级菜单</h2>
      <div class="menu-list">
        <div class="menu-item">
          <div class="menu-icon">📞</div>
          <div class="menu-info">
            <h4>通话管理</h4>
            <p>查看通话记录、录音回放、跟进记录管理</p>
            <span class="menu-path">路径：服务管理 → 通话管理</span>
          </div>
        </div>
        <div class="menu-item">
          <div class="menu-icon">💬</div>
          <div class="menu-info">
            <h4>短信管理</h4>
            <p>短信发送记录、短信模板、发送统计</p>
            <span class="menu-path">路径：服务管理 → 短信管理</span>
            <el-tag size="small" type="warning">管理员/客服可见</el-tag>
          </div>
        </div>
      </div>
    </section>
    <section>
      <h2>通话管理</h2>
      <h3>通话记录</h3>
      <ul>
        <li>查看所有通话记录列表</li>
        <li>按时间、销售员、客户筛选</li>
        <li>查看通话详情和时长</li>
        <li>播放通话录音</li>
      </ul>
      <h3>跟进记录</h3>
      <ul>
        <li>添加客户跟进记录</li>
        <li>设置下次跟进时间</li>
        <li>跟进提醒通知</li>
      </ul>
      <h3>外呼任务</h3>
      <ul>
        <li>创建外呼任务</li>
        <li>分配外呼名单</li>
        <li>查看外呼进度</li>
      </ul>
    </section>
    <section>
      <h2>短信管理</h2>
      <h3>发送记录</h3>
      <ul>
        <li>查看短信发送记录</li>
        <li>发送状态跟踪</li>
        <li>发送失败重试</li>
      </ul>
      <h3>短信模板</h3>
      <ul>
        <li>创建短信模板</li>
        <li>模板审核状态</li>
        <li>模板变量配置</li>
      </ul>
      <h3>发送统计</h3>
      <ul>
        <li>发送数量统计</li>
        <li>成功率分析</li>
        <li>费用统计</li>
      </ul>
    </section>
    <section>
      <h2>与APP的配合</h2>
      <p>通话管理功能需要配合移动APP使用：</p>
      <ul>
        <li>APP端拨打电话，通话记录自动同步</li>
        <li>通话录音自动上传（需开启录音权限）</li>
        <li>Web端查看和管理所有通话记录</li>
      </ul>
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
.menu-list { display: grid; gap: 15px; margin-top: 15px; }
.menu-item { display: flex; align-items: flex-start; padding: 20px; background: #fafafa; border-radius: 8px; border: 1px solid #ebeef5; }
.menu-icon { font-size: 32px; margin-right: 15px; }
.menu-info h4 { margin: 0 0 8px; font-size: 16px; }
.menu-info p { margin: 0 0 8px; font-size: 14px; color: #909399; }
.menu-path { font-size: 12px; color: #c0c4cc; display: block; margin-bottom: 5px; }
</style>
