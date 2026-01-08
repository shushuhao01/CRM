<template>
  <div class="help-content">
    <h1>故障排除</h1>
    <section>
      <h2>常见错误</h2>
      <el-collapse>
        <el-collapse-item title="页面显示502错误" name="1">
          <p><strong>原因：</strong>后端服务未启动或崩溃</p>
          <p><strong>解决：</strong></p>
          <ul>
            <li>检查PM2服务状态：<code>pm2 status</code></li>
            <li>查看错误日志：<code>pm2 logs crm-api</code></li>
            <li>重启服务：<code>pm2 restart crm-api</code></li>
          </ul>
        </el-collapse-item>
        <el-collapse-item title="数据库连接失败" name="2">
          <p><strong>原因：</strong>数据库配置错误或服务未启动</p>
          <p><strong>解决：</strong></p>
          <ul>
            <li>检查MySQL服务状态</li>
            <li>确认.env文件中的数据库配置</li>
            <li>测试数据库连接</li>
          </ul>
        </el-collapse-item>
        <el-collapse-item title="WebSocket连接失败" name="3">
          <p><strong>原因：</strong>Nginx配置问题</p>
          <p><strong>解决：</strong></p>
          <ul>
            <li>检查Nginx的WebSocket代理配置</li>
            <li>确认proxy_http_version为1.1</li>
            <li>确认Upgrade和Connection头配置正确</li>
          </ul>
        </el-collapse-item>
        <el-collapse-item title="登录后跳转到空白页" name="4">
          <p><strong>原因：</strong>前端路由配置问题</p>
          <p><strong>解决：</strong></p>
          <ul>
            <li>检查Nginx的try_files配置</li>
            <li>清除浏览器缓存</li>
            <li>检查控制台错误信息</li>
          </ul>
        </el-collapse-item>
      </el-collapse>
    </section>
    <section>
      <h2>日志查看</h2>
      <ul>
        <li><strong>后端日志</strong>：<code>pm2 logs crm-api</code></li>
        <li><strong>Nginx日志</strong>：<code>/var/log/nginx/error.log</code></li>
        <li><strong>MySQL日志</strong>：<code>/var/log/mysql/error.log</code></li>
      </ul>
    </section>
    <section>
      <h2>性能优化</h2>
      <ul>
        <li>启用Nginx Gzip压缩</li>
        <li>配置静态资源缓存</li>
        <li>优化数据库索引</li>
        <li>增加服务器内存</li>
      </ul>
    </section>
  </div>
</template>
<script setup>
</script>
<style scoped>
.help-content { line-height: 1.8; color: #333; }
.help-content h1 { font-size: 28px; color: #1a1a1a; margin-bottom: 30px; padding-bottom: 15px; border-bottom: 2px solid #409eff; }
.help-content h2 { font-size: 20px; color: #303133; margin: 30px 0 15px; }
.help-content p { margin: 10px 0; color: #606266; }
.help-content ul { margin: 10px 0; padding-left: 20px; }
.help-content li { margin: 8px 0; color: #606266; }
.help-content code { background: #f5f7fa; padding: 2px 6px; border-radius: 4px; font-family: monospace; color: #e6a23c; }
section { margin-bottom: 30px; }
</style>
