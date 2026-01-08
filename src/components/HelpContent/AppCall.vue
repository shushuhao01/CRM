<template>
  <div class="help-content">
    <h1>APP通话功能</h1>
    <section>
      <h2>功能概述</h2>
      <p>APP提供一键外呼功能，通话记录自动同步到CRM系统，支持通话录音。</p>
    </section>
    <section>
      <h2>拨打电话</h2>
      <h3>方式一：拨号盘</h3>
      <ol>
        <li>点击底部"拨号"图标</li>
        <li>输入电话号码</li>
        <li>点击拨打按钮</li>
      </ol>
      <h3>方式二：客户列表</h3>
      <ol>
        <li>在客户列表中找到客户</li>
        <li>点击电话图标</li>
        <li>确认拨打</li>
      </ol>
      <h3>方式三：通话记录</h3>
      <ol>
        <li>在通话记录中找到号码</li>
        <li>点击回拨</li>
      </ol>
    </section>
    <section>
      <h2>通话记录</h2>
      <p>通话结束后，记录会自动同步：</p>
      <ul>
        <li>通话时间</li>
        <li>通话时长</li>
        <li>通话类型（呼出/呼入）</li>
        <li>通话状态（接通/未接通）</li>
        <li>关联客户（如果号码匹配）</li>
      </ul>
    </section>
    <section>
      <h2>通话录音</h2>
      <h3>开启录音</h3>
      <ol>
        <li>进入APP设置</li>
        <li>开启"通话录音"开关</li>
        <li>授予录音权限</li>
      </ol>
      <h3>录音说明</h3>
      <ul>
        <li>录音会自动上传到服务器</li>
        <li>可在Web端播放录音</li>
        <li>录音文件会自动清理（保留30天）</li>
      </ul>
      <el-alert type="warning" :closable="false" show-icon>
        <template #title>部分手机可能不支持通话录音，请以实际情况为准</template>
      </el-alert>
    </section>
    <section>
      <h2>添加跟进</h2>
      <p>通话结束后可以添加跟进记录：</p>
      <ol>
        <li>通话结束后弹出跟进窗口</li>
        <li>选择跟进结果</li>
        <li>填写跟进内容</li>
        <li>设置下次跟进时间（可选）</li>
        <li>保存跟进记录</li>
      </ol>
    </section>
    <section>
      <h2>常见问题</h2>
      <el-collapse>
        <el-collapse-item title="Q: 通话记录没有同步怎么办？" name="1">
          <p>A: 请检查：</p>
          <ul>
            <li>网络是否正常</li>
            <li>是否已登录APP</li>
            <li>手动刷新通话记录</li>
          </ul>
        </el-collapse-item>
        <el-collapse-item title="Q: 录音没有上传怎么办？" name="2">
          <p>A: 请检查：</p>
          <ul>
            <li>是否开启了录音功能</li>
            <li>是否授予了录音权限</li>
            <li>网络是否正常</li>
          </ul>
        </el-collapse-item>
        <el-collapse-item title="Q: 通话没有关联到客户怎么办？" name="3">
          <p>A: 系统会根据电话号码自动匹配客户。如果没有匹配到，可能是：</p>
          <ul>
            <li>客户信息中没有该电话号码</li>
            <li>电话号码格式不一致</li>
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
