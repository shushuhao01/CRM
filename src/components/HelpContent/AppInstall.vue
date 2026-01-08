<template>
  <div class="help-content">
    <h1>APP安装配置</h1>
    <section>
      <h2>下载安装</h2>
      <h3>Android</h3>
      <ol>
        <li>扫描下载二维码或访问下载链接</li>
        <li>下载APK安装包</li>
        <li>允许安装未知来源应用</li>
        <li>安装完成后打开APP</li>
      </ol>
      <h3>iOS</h3>
      <ol>
        <li>在App Store搜索"云客CRM"</li>
        <li>点击下载安装</li>
        <li>安装完成后打开APP</li>
      </ol>
    </section>
    <section>
      <h2>服务器配置</h2>
      <h3>方式一：扫码配置</h3>
      <ol>
        <li>在Web端登录系统</li>
        <li>点击右上角用户头像</li>
        <li>选择"APP绑定"</li>
        <li>使用APP扫描二维码</li>
        <li>自动配置服务器地址</li>
      </ol>
      <h3>方式二：手动配置</h3>
      <ol>
        <li>打开APP</li>
        <li>点击"服务器配置"</li>
        <li>输入服务器地址（如：https://crm.example.com）</li>
        <li>点击"保存"</li>
        <li>点击"测试连接"确认配置正确</li>
      </ol>
    </section>
    <section>
      <h2>权限设置</h2>
      <h3>Android权限</h3>
      <ul>
        <li><strong>电话权限</strong>：用于拨打电话（必需）</li>
        <li><strong>录音权限</strong>：用于通话录音（可选）</li>
        <li><strong>存储权限</strong>：用于保存录音文件（可选）</li>
        <li><strong>网络权限</strong>：用于数据同步（必需）</li>
      </ul>
      <h3>iOS权限</h3>
      <ul>
        <li><strong>网络权限</strong>：用于数据同步（必需）</li>
        <li><strong>相机权限</strong>：用于扫码（可选）</li>
      </ul>
    </section>
    <section>
      <h2>常见问题</h2>
      <el-collapse>
        <el-collapse-item title="Q: 服务器连接失败怎么办？" name="1">
          <p>A: 请检查：</p>
          <ul>
            <li>服务器地址是否正确</li>
            <li>网络是否正常</li>
            <li>服务器是否正常运行</li>
            <li>是否使用了HTTPS</li>
          </ul>
        </el-collapse-item>
        <el-collapse-item title="Q: Android安装失败怎么办？" name="2">
          <p>A: 请检查：</p>
          <ul>
            <li>是否允许安装未知来源应用</li>
            <li>存储空间是否充足</li>
            <li>APK文件是否完整</li>
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
.help-content ul, .help-content ol { margin: 10px 0; padding-left: 20px; }
.help-content li { margin: 8px 0; color: #606266; }
section { margin-bottom: 30px; }
</style>
