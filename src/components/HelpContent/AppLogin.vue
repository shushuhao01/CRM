<template>
  <div class="help-content">
    <h1>APP登录绑定</h1>
    <section>
      <h2>登录方式</h2>
      <h3>方式一：扫码登录（推荐）</h3>
      <ol>
        <li>在Web端登录系统</li>
        <li>点击右上角用户头像</li>
        <li>选择"APP绑定"</li>
        <li>使用APP扫描二维码</li>
        <li>确认登录</li>
      </ol>
      <h3>方式二：账号密码登录</h3>
      <ol>
        <li>打开APP</li>
        <li>输入用户名和密码</li>
        <li>点击"登录"</li>
      </ol>
    </section>
    <section>
      <h2>设备绑定</h2>
      <p>为了安全，每个账号只能绑定一台设备：</p>
      <ul>
        <li>首次登录会自动绑定当前设备</li>
        <li>更换设备需要先解绑旧设备</li>
        <li>管理员可以在后台解绑用户设备</li>
      </ul>
      <h3>解绑设备</h3>
      <ol>
        <li>在Web端登录系统</li>
        <li>进入"个人设置"</li>
        <li>找到"APP绑定"</li>
        <li>点击"解绑设备"</li>
      </ol>
    </section>
    <section>
      <h2>登录状态</h2>
      <ul>
        <li>登录后会保持登录状态</li>
        <li>Token有效期为7天</li>
        <li>超过7天需要重新登录</li>
        <li>修改密码后需要重新登录</li>
      </ul>
    </section>
    <section>
      <h2>常见问题</h2>
      <el-collapse>
        <el-collapse-item title="Q: 扫码登录失败怎么办？" name="1">
          <p>A: 请检查：</p>
          <ul>
            <li>二维码是否过期（有效期5分钟）</li>
            <li>APP服务器配置是否正确</li>
            <li>网络是否正常</li>
          </ul>
        </el-collapse-item>
        <el-collapse-item title="Q: 提示设备已绑定其他账号怎么办？" name="2">
          <p>A: 需要先解绑原账号，或联系管理员处理。</p>
        </el-collapse-item>
        <el-collapse-item title="Q: 忘记密码怎么办？" name="3">
          <p>A: 联系管理员重置密码。</p>
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
.help-content ul, .help-content ol { margin: 10px 0; padding-left: 20px; }
.help-content li { margin: 8px 0; color: #606266; }
section { margin-bottom: 30px; }
</style>
