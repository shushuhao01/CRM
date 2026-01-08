<template>
  <div class="help-content">
    <h1>APP问题FAQ</h1>

    <section class="intro-section">
      <div class="intro-card">
        <el-icon class="intro-icon"><Iphone /></el-icon>
        <div class="intro-text">
          <p>本页面汇总了云客CRM移动APP使用过程中的常见问题和解决方案，包括安装、登录、通话、数据同步等方面的问题。</p>
        </div>
      </div>
    </section>

    <section>
      <h2><el-icon><Download /></el-icon> 安装问题</h2>

      <el-collapse accordion>
        <el-collapse-item name="1">
          <template #title>
            <div class="faq-title">
              <el-tag type="primary" size="small">Q</el-tag>
              <span>Android安装失败怎么办？</span>
            </div>
          </template>
          <div class="faq-answer">
            <p><strong>常见原因和解决方法：</strong></p>
            <div class="solution-list">
              <div class="solution-item">
                <div class="solution-problem">未允许安装未知来源应用</div>
                <div class="solution-fix">
                  <p>解决：设置 → 安全 → 允许安装未知来源应用</p>
                </div>
              </div>
              <div class="solution-item">
                <div class="solution-problem">存储空间不足</div>
                <div class="solution-fix">
                  <p>解决：清理手机存储，确保至少有100MB可用空间</p>
                </div>
              </div>
              <div class="solution-item">
                <div class="solution-problem">APK文件不完整</div>
                <div class="solution-fix">
                  <p>解决：重新下载安装包，确保下载完整</p>
                </div>
              </div>
              <div class="solution-item">
                <div class="solution-problem">系统版本过低</div>
                <div class="solution-fix">
                  <p>解决：需要Android 6.0及以上版本</p>
                </div>
              </div>
            </div>
          </div>
        </el-collapse-item>

        <el-collapse-item name="2">
          <template #title>
            <div class="faq-title">
              <el-tag type="primary" size="small">Q</el-tag>
              <span>iOS无法安装或安装后打不开？</span>
            </div>
          </template>
          <div class="faq-answer">
            <p><strong>解决方法：</strong></p>
            <ol>
              <li>检查iOS版本是否支持（需iOS 12.0及以上）</li>
              <li>确保App Store账号正常登录</li>
              <li>检查网络连接是否正常</li>
              <li>尝试重启设备后重新安装</li>
              <li>如果是企业版，需要信任企业证书：
                <ul>
                  <li>设置 → 通用 → 设备管理</li>
                  <li>找到企业证书，点击"信任"</li>
                </ul>
              </li>
            </ol>
          </div>
        </el-collapse-item>

        <el-collapse-item name="3">
          <template #title>
            <div class="faq-title">
              <el-tag type="primary" size="small">Q</el-tag>
              <span>如何更新APP到最新版本？</span>
            </div>
          </template>
          <div class="faq-answer">
            <p><strong>更新方式：</strong></p>
            <ul>
              <li><strong>自动更新</strong>：APP启动时会自动检测新版本并提示更新</li>
              <li><strong>手动检查</strong>：APP设置 → 关于 → 检查更新</li>
              <li><strong>重新下载</strong>：从官网或管理员提供的链接下载最新版本</li>
            </ul>
            <div class="tip-box">
              <el-icon><InfoFilled /></el-icon>
              <span>建议保持APP为最新版本，以获得最佳体验和安全性</span>
            </div>
          </div>
        </el-collapse-item>
      </el-collapse>
    </section>

    <section>
      <h2><el-icon><Connection /></el-icon> 连接问题</h2>

      <el-collapse accordion>
        <el-collapse-item name="4">
          <template #title>
            <div class="faq-title">
              <el-tag type="primary" size="small">Q</el-tag>
              <span>服务器连接失败怎么办？</span>
            </div>
          </template>
          <div class="faq-answer">
            <p><strong>排查步骤：</strong></p>
            <ol>
              <li><strong>检查服务器地址</strong>
                <ul>
                  <li>确认服务器地址输入正确</li>
                  <li>地址格式：https://your-domain.com</li>
                  <li>注意区分http和https</li>
                </ul>
              </li>
              <li><strong>检查网络连接</strong>
                <ul>
                  <li>确认手机能正常上网</li>
                  <li>尝试切换WiFi和4G/5G</li>
                </ul>
              </li>
              <li><strong>检查服务器状态</strong>
                <ul>
                  <li>联系管理员确认服务器正常运行</li>
                  <li>尝试在浏览器中访问服务器地址</li>
                </ul>
              </li>
            </ol>
            <div class="warning-box">
              <el-icon><WarningFilled /></el-icon>
              <span>如果使用HTTPS，请确保服务器SSL证书有效</span>
            </div>
          </div>
        </el-collapse-item>

        <el-collapse-item name="5">
          <template #title>
            <div class="faq-title">
              <el-tag type="primary" size="small">Q</el-tag>
              <span>登录失败，提示用户名或密码错误？</span>
            </div>
          </template>
          <div class="faq-answer">
            <p><strong>解决方法：</strong></p>
            <ol>
              <li>确认用户名和密码输入正确（注意大小写）</li>
              <li>检查账号是否被禁用</li>
              <li>确认服务器连接正常</li>
              <li>尝试使用扫码登录</li>
              <li>联系管理员重置密码</li>
            </ol>
            <p><strong>扫码登录步骤：</strong></p>
            <ol>
              <li>在Web端登录系统</li>
              <li>点击右上角头像 → "APP绑定"</li>
              <li>使用APP扫描二维码</li>
              <li>确认绑定即可登录</li>
            </ol>
          </div>
        </el-collapse-item>

        <el-collapse-item name="6">
          <template #title>
            <div class="faq-title">
              <el-tag type="primary" size="small">Q</el-tag>
              <span>APP经常自动退出登录？</span>
            </div>
          </template>
          <div class="faq-answer">
            <p><strong>可能的原因：</strong></p>
            <ul>
              <li>登录凭证过期</li>
              <li>账号在其他设备登录</li>
              <li>服务器会话超时</li>
              <li>网络连接不稳定</li>
            </ul>
            <p><strong>解决方法：</strong></p>
            <ul>
              <li>重新登录APP</li>
              <li>检查是否有其他设备使用同一账号</li>
              <li>联系管理员检查会话设置</li>
            </ul>
          </div>
        </el-collapse-item>
      </el-collapse>
    </section>

    <section>
      <h2><el-icon><Phone /></el-icon> 通话问题</h2>

      <el-collapse accordion>
        <el-collapse-item name="7">
          <template #title>
            <div class="faq-title">
              <el-tag type="primary" size="small">Q</el-tag>
              <span>无法拨打电话？</span>
            </div>
          </template>
          <div class="faq-answer">
            <p><strong>检查以下设置：</strong></p>
            <ol>
              <li><strong>电话权限</strong>
                <ul>
                  <li>设置 → 应用 → 云客CRM → 权限</li>
                  <li>确保"电话"权限已开启</li>
                </ul>
              </li>
              <li><strong>SIM卡状态</strong>
                <ul>
                  <li>确认SIM卡正常插入</li>
                  <li>检查是否欠费停机</li>
                </ul>
              </li>
              <li><strong>手机信号</strong>
                <ul>
                  <li>确认手机信号良好</li>
                  <li>尝试移动到信号更好的位置</li>
                </ul>
              </li>
              <li><strong>工作手机绑定</strong>
                <ul>
                  <li>确认已绑定工作手机号</li>
                  <li>在APP设置中检查绑定状态</li>
                </ul>
              </li>
            </ol>
          </div>
        </el-collapse-item>

        <el-collapse-item name="8">
          <template #title>
            <div class="faq-title">
              <el-tag type="primary" size="small">Q</el-tag>
              <span>通话记录不同步到系统？</span>
            </div>
          </template>
          <div class="faq-answer">
            <p><strong>排查步骤：</strong></p>
            <ol>
              <li>检查网络连接是否正常</li>
              <li>确认已登录APP</li>
              <li>手动刷新通话记录列表</li>
              <li>检查通话记录权限是否开启</li>
              <li>重启APP后重试</li>
            </ol>
            <p><strong>同步机制说明：</strong></p>
            <ul>
              <li>通话结束后自动上传通话记录</li>
              <li>网络不佳时会缓存，恢复后自动同步</li>
              <li>可在通话记录页面手动刷新</li>
            </ul>
          </div>
        </el-collapse-item>

        <el-collapse-item name="9">
          <template #title>
            <div class="faq-title">
              <el-tag type="primary" size="small">Q</el-tag>
              <span>通话录音功能不工作？</span>
            </div>
          </template>
          <div class="faq-answer">
            <p><strong>注意事项：</strong></p>
            <div class="warning-box">
              <el-icon><WarningFilled /></el-icon>
              <span>部分手机品牌（如华为、小米）系统限制，可能不支持通话录音</span>
            </div>
            <p><strong>检查步骤：</strong></p>
            <ol>
              <li>确认录音权限已开启</li>
              <li>确认存储权限已开启</li>
              <li>检查手机存储空间是否充足</li>
              <li>在APP设置中确认录音功能已开启</li>
            </ol>
            <p><strong>支持录音的手机：</strong></p>
            <ul>
              <li>大部分Android手机（需要root或特殊权限）</li>
              <li>部分品牌手机可能需要额外设置</li>
              <li>iOS不支持通话录音（系统限制）</li>
            </ul>
          </div>
        </el-collapse-item>

        <el-collapse-item name="10">
          <template #title>
            <div class="faq-title">
              <el-tag type="primary" size="small">Q</el-tag>
              <span>拨号时显示"号码无效"？</span>
            </div>
          </template>
          <div class="faq-answer">
            <p><strong>可能的原因：</strong></p>
            <ul>
              <li>客户手机号格式不正确</li>
              <li>手机号已被标记为无效</li>
              <li>号码包含特殊字符</li>
            </ul>
            <p><strong>解决方法：</strong></p>
            <ol>
              <li>检查手机号是否为11位数字</li>
              <li>确认手机号没有空格或特殊字符</li>
              <li>在客户详情中修正手机号</li>
            </ol>
          </div>
        </el-collapse-item>
      </el-collapse>
    </section>

    <section>
      <h2><el-icon><Refresh /></el-icon> 数据同步问题</h2>

      <el-collapse accordion>
        <el-collapse-item name="11">
          <template #title>
            <div class="faq-title">
              <el-tag type="primary" size="small">Q</el-tag>
              <span>数据同步延迟很大？</span>
            </div>
          </template>
          <div class="faq-answer">
            <p><strong>优化建议：</strong></p>
            <ul>
              <li>检查网络连接质量</li>
              <li>手动下拉刷新页面</li>
              <li>切换网络后重试（WiFi ↔ 4G/5G）</li>
              <li>重启APP</li>
              <li>检查后台运行权限是否开启</li>
            </ul>
            <p><strong>同步时间参考：</strong></p>
            <div class="sync-table">
              <div class="sync-row">
                <span>通话记录</span>
                <span>实时同步</span>
              </div>
              <div class="sync-row">
                <span>客户数据</span>
                <span>5分钟内</span>
              </div>
              <div class="sync-row">
                <span>订单数据</span>
                <span>实时推送</span>
              </div>
            </div>
          </div>
        </el-collapse-item>

        <el-collapse-item name="12">
          <template #title>
            <div class="faq-title">
              <el-tag type="primary" size="small">Q</el-tag>
              <span>APP显示的数据和Web端不一致？</span>
            </div>
          </template>
          <div class="faq-answer">
            <p><strong>解决方法：</strong></p>
            <ol>
              <li>在APP中下拉刷新，获取最新数据</li>
              <li>检查APP和Web端的筛选条件是否相同</li>
              <li>确认网络连接正常</li>
              <li>退出APP重新登录</li>
              <li>清除APP缓存后重试</li>
            </ol>
          </div>
        </el-collapse-item>
      </el-collapse>
    </section>

    <section>
      <h2><el-icon><Warning /></el-icon> 性能问题</h2>

      <el-collapse accordion>
        <el-collapse-item name="13">
          <template #title>
            <div class="faq-title">
              <el-tag type="primary" size="small">Q</el-tag>
              <span>APP运行卡顿怎么办？</span>
            </div>
          </template>
          <div class="faq-answer">
            <p><strong>优化建议：</strong></p>
            <ul>
              <li>关闭其他不必要的应用</li>
              <li>清理手机内存</li>
              <li>重启APP</li>
              <li>重启手机</li>
              <li>检查手机存储空间（建议保留1GB以上）</li>
              <li>更新APP到最新版本</li>
            </ul>
          </div>
        </el-collapse-item>

        <el-collapse-item name="14">
          <template #title>
            <div class="faq-title">
              <el-tag type="primary" size="small">Q</el-tag>
              <span>APP闪退怎么办？</span>
            </div>
          </template>
          <div class="faq-answer">
            <p><strong>解决步骤：</strong></p>
            <ol>
              <li>重启APP</li>
              <li>清理APP缓存：设置 → 应用 → 云客CRM → 清除缓存</li>
              <li>重启手机</li>
              <li>检查是否有新版本，更新APP</li>
              <li>如果仍然闪退，卸载后重新安装</li>
              <li>联系技术支持，提供闪退日志</li>
            </ol>
          </div>
        </el-collapse-item>

        <el-collapse-item name="15">
          <template #title>
            <div class="faq-title">
              <el-tag type="primary" size="small">Q</el-tag>
              <span>APP耗电很快？</span>
            </div>
          </template>
          <div class="faq-answer">
            <p><strong>省电建议：</strong></p>
            <ul>
              <li>在APP设置中开启省电模式</li>
              <li>减少后台刷新频率</li>
              <li>不使用时退出APP</li>
              <li>关闭不必要的通知</li>
              <li>使用WiFi代替移动数据</li>
            </ul>
          </div>
        </el-collapse-item>
      </el-collapse>
    </section>

    <section>
      <h2><el-icon><Setting /></el-icon> 权限设置</h2>

      <div class="permission-cards">
        <div class="permission-card">
          <div class="permission-icon">📞</div>
          <h4>电话权限</h4>
          <p>用于拨打电话和获取通话记录</p>
          <el-tag type="danger" size="small">必需</el-tag>
        </div>
        <div class="permission-card">
          <div class="permission-icon">🎤</div>
          <h4>录音权限</h4>
          <p>用于通话录音功能</p>
          <el-tag type="warning" size="small">推荐</el-tag>
        </div>
        <div class="permission-card">
          <div class="permission-icon">📁</div>
          <h4>存储权限</h4>
          <p>用于保存录音和缓存数据</p>
          <el-tag type="danger" size="small">必需</el-tag>
        </div>
        <div class="permission-card">
          <div class="permission-icon">📷</div>
          <h4>相机权限</h4>
          <p>用于扫码登录功能</p>
          <el-tag type="warning" size="small">推荐</el-tag>
        </div>
        <div class="permission-card">
          <div class="permission-icon">📍</div>
          <h4>位置权限</h4>
          <p>用于外勤打卡功能</p>
          <el-tag size="small">可选</el-tag>
        </div>
        <div class="permission-card">
          <div class="permission-icon">🔔</div>
          <h4>通知权限</h4>
          <p>用于接收消息推送</p>
          <el-tag type="warning" size="small">推荐</el-tag>
        </div>
      </div>
    </section>

    <section>
      <h2><el-icon><QuestionFilled /></el-icon> 其他问题</h2>

      <el-collapse accordion>
        <el-collapse-item name="16">
          <template #title>
            <div class="faq-title">
              <el-tag type="primary" size="small">Q</el-tag>
              <span>如何联系技术支持？</span>
            </div>
          </template>
          <div class="faq-answer">
            <p><strong>联系方式：</strong></p>
            <ul>
              <li>在APP中：设置 → 帮助与反馈 → 联系客服</li>
              <li>在Web端：帮助中心 → 联系我们</li>
              <li>联系您的系统管理员</li>
            </ul>
            <p><strong>反馈问题时请提供：</strong></p>
            <ul>
              <li>手机型号和系统版本</li>
              <li>APP版本号</li>
              <li>问题描述和截图</li>
              <li>问题发生的时间</li>
            </ul>
          </div>
        </el-collapse-item>
      </el-collapse>
    </section>
  </div>
</template>

<script setup lang="ts">
import {
  Iphone, Download, Connection, Phone, Refresh, Warning,
  Setting, QuestionFilled, InfoFilled, WarningFilled
} from '@element-plus/icons-vue'
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
  margin: 35px 0 20px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.help-content h4 {
  font-size: 15px;
  color: #303133;
  margin: 15px 0 10px;
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

.intro-section {
  margin-bottom: 30px;
}

.intro-card {
  display: flex;
  align-items: flex-start;
  gap: 20px;
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  padding: 25px;
  border-radius: 12px;
  color: white;
}

.intro-icon {
  font-size: 48px;
  opacity: 0.9;
}

.intro-text p {
  margin: 0;
  color: white;
  font-size: 15px;
  line-height: 1.8;
}

.faq-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 15px;
}

.faq-answer {
  padding: 15px 0;
  border-top: 1px solid #ebeef5;
}

.faq-answer ol, .faq-answer ul {
  margin: 15px 0;
}

.faq-answer li {
  margin: 8px 0;
  line-height: 1.8;
}

.tip-box {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 15px;
  background: #ecf5ff;
  border-radius: 6px;
  margin: 15px 0;
  color: #409eff;
  font-size: 14px;
}

.warning-box {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 15px;
  background: #fef0f0;
  border-radius: 6px;
  margin: 15px 0;
  color: #f56c6c;
  font-size: 14px;
}

.solution-list {
  margin: 15px 0;
}

.solution-item {
  margin-bottom: 15px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #409eff;
}

.solution-problem {
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
}

.solution-fix {
  color: #606266;
  font-size: 14px;
}

.solution-fix p {
  margin: 0;
}

.sync-table {
  margin: 15px 0;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  overflow: hidden;
}

.sync-row {
  display: flex;
  justify-content: space-between;
  padding: 12px 15px;
  border-bottom: 1px solid #ebeef5;
}

.sync-row:last-child {
  border-bottom: none;
}

.sync-row span:first-child {
  color: #303133;
  font-weight: 500;
}

.sync-row span:last-child {
  color: #67c23a;
}

.permission-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 15px;
  margin: 20px 0;
}

.permission-card {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 12px;
  text-align: center;
  transition: transform 0.3s;
}

.permission-card:hover {
  transform: translateY(-5px);
}

.permission-icon {
  font-size: 36px;
  margin-bottom: 10px;
}

.permission-card h4 {
  margin: 10px 0 5px;
  color: #303133;
  font-size: 14px;
}

.permission-card p {
  margin: 5px 0 10px;
  font-size: 12px;
  color: #909399;
}

:deep(.el-collapse-item__header) {
  height: auto;
  padding: 15px 0;
  line-height: 1.5;
}

:deep(.el-collapse-item__content) {
  padding-bottom: 20px;
}
</style>
