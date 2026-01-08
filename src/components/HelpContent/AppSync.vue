<template>
  <div class="help-content">
    <h1>APP数据同步</h1>
    <section>
      <h2>同步机制</h2>
      <p>APP与Web端通过WebSocket保持实时连接，数据变更会自动同步。</p>
    </section>
    <section>
      <h2>同步内容</h2>
      <h3>APP → Web</h3>
      <ul>
        <li>通话记录</li>
        <li>通话录音</li>
        <li>跟进记录</li>
        <li>设备状态</li>
      </ul>
      <h3>Web → APP</h3>
      <ul>
        <li>客户信息</li>
        <li>系统配置</li>
        <li>用户信息</li>
      </ul>
    </section>
    <section>
      <h2>同步时机</h2>
      <ul>
        <li><strong>实时同步</strong>：通话结束后立即同步</li>
        <li><strong>定时同步</strong>：每5分钟自动同步一次</li>
        <li><strong>手动同步</strong>：下拉刷新触发同步</li>
        <li><strong>启动同步</strong>：APP启动时自动同步</li>
      </ul>
    </section>
    <section>
      <h2>离线处理</h2>
      <p>当网络不可用时：</p>
      <ul>
        <li>通话记录会保存在本地</li>
        <li>录音文件会保存在本地</li>
        <li>网络恢复后自动上传</li>
      </ul>
    </section>
    <section>
      <h2>同步状态</h2>
      <p>在APP设置中可以查看同步状态：</p>
      <ul>
        <li>最后同步时间</li>
        <li>待上传数据数量</li>
        <li>同步错误信息</li>
      </ul>
    </section>
    <section>
      <h2>常见问题</h2>
      <el-collapse>
        <el-collapse-item title="Q: 数据同步延迟怎么办？" name="1">
          <p>A: 可以尝试：</p>
          <ul>
            <li>检查网络连接</li>
            <li>手动下拉刷新</li>
            <li>重启APP</li>
          </ul>
        </el-collapse-item>
        <el-collapse-item title="Q: 同步失败怎么办？" name="2">
          <p>A: 请检查：</p>
          <ul>
            <li>网络是否正常</li>
            <li>服务器是否正常</li>
            <li>登录状态是否有效</li>
          </ul>
        </el-collapse-item>
      </el-collapse>
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
