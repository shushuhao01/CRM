<template>
  <div class="help-content">
    <h1>打印机配置指南</h1>

    <el-alert type="info" :closable="false" show-icon style="margin-bottom: 20px">
      <template #title>本指南帮助您配置打印面单所需的打印机，系统支持浏览器打印、LODOP控件和USB直连三种方式。</template>
    </el-alert>

    <section>
      <h2>一、打印方式对比</h2>
      <el-table :data="printMethods" stripe style="width: 100%">
        <el-table-column prop="method" label="打印方式" width="140" />
        <el-table-column prop="description" label="说明" />
        <el-table-column prop="pros" label="优点" width="200" />
        <el-table-column prop="cons" label="缺点" width="200" />
        <el-table-column prop="recommend" label="推荐场景" width="150" />
      </el-table>
    </section>

    <section>
      <h2>二、浏览器打印（推荐）</h2>
      <el-tag type="success">推荐 · 兼容所有打印机</el-tag>

      <h3>配置步骤</h3>
      <ol>
        <li>进入 <strong>发货列表</strong> 页面</li>
        <li>点击右上角的 <strong>⚙️ 打印机设置</strong> 按钮</li>
        <li>选择 <strong>"浏览器打印"</strong> 模式</li>
        <li>在面单打印预览中，浏览器会弹出打印对话框</li>
        <li>在对话框中选择已连接的热敏打印机</li>
        <li>设置纸张大小（100×180mm 或 100×150mm）</li>
        <li>取消页眉页脚、设置无边距</li>
        <li>点击打印</li>
      </ol>

      <h3>浏览器打印设置建议</h3>
      <ul>
        <li><strong>纸张大小</strong>：选择与面单纸张匹配的尺寸（推荐100×180mm一联单）</li>
        <li><strong>缩放</strong>：100%（不缩放）</li>
        <li><strong>边距</strong>：无 / 最小</li>
        <li><strong>页眉页脚</strong>：关闭</li>
        <li><strong>背景图形</strong>：开启（确保条码清晰）</li>
      </ul>
    </section>

    <section>
      <h2>三、LODOP控件打印</h2>
      <el-tag type="warning">适合批量打印 · 需安装控件</el-tag>

      <h3>什么是LODOP/C-Lodop？</h3>
      <p>LODOP是一款专业的Web打印控件，C-Lodop是其云打印版本，支持精确控制打印格式、静默打印（无需弹窗确认），适合大批量面单打印。</p>

      <h3>安装步骤</h3>
      <ol>
        <li>访问 <el-link type="primary" href="http://www.lodop.net" target="_blank">LODOP官网 (www.lodop.net)</el-link> 下载C-Lodop</li>
        <li>运行安装程序，安装到本地电脑</li>
        <li>安装完成后启动C-Lodop服务（默认监听 localhost:8000）</li>
        <li>回到系统打印机配置 → 选择"LODOP控件"模式</li>
        <li>系统自动检测LODOP连接状态，显示"已连接"即可</li>
      </ol>

      <h3>LODOP配置要点</h3>
      <ul>
        <li>C-Lodop需要保持后台运行，建议设置为开机自启</li>
        <li>如果检测不到连接，检查防火墙是否阻止了8000端口</li>
        <li>LODOP支持直接选择打印机名称，无需弹窗确认</li>
        <li>支持批量静默打印，效率高</li>
      </ul>
    </section>

    <section>
      <h2>四、USB直连打印</h2>
      <el-tag>热敏打印机专用 · 需浏览器支持WebUSB</el-tag>

      <h3>前提条件</h3>
      <ul>
        <li>使用Chrome/Edge等支持WebUSB的浏览器</li>
        <li>热敏打印机通过USB直接连接到电脑</li>
        <li>打印机支持ESC/POS或TSPL指令集</li>
      </ul>

      <h3>配置步骤</h3>
      <ol>
        <li>通过USB线将热敏打印机连接到电脑</li>
        <li>在打印机配置中选择"USB直连"模式</li>
        <li>点击"连接打印机"，浏览器弹出USB设备选择框</li>
        <li>选择您的热敏打印机设备</li>
        <li>连接成功后即可直接打印</li>
      </ol>
    </section>

    <section>
      <h2>五、推荐打印机型号</h2>
      <el-table :data="printerModels" stripe style="width: 100%">
        <el-table-column prop="brand" label="品牌" width="100" />
        <el-table-column prop="model" label="型号" width="200" />
        <el-table-column prop="type" label="类型" width="120" />
        <el-table-column prop="paperSize" label="纸张宽度" width="120" />
        <el-table-column prop="feature" label="特点" />
      </el-table>
    </section>

    <section>
      <h2>六、面单纸张规格</h2>
      <el-table :data="paperSizes" stripe style="width: 100%">
        <el-table-column prop="size" label="规格" width="150" />
        <el-table-column prop="name" label="名称" width="200" />
        <el-table-column prop="usage" label="适用场景" />
      </el-table>
    </section>

    <section>
      <h2>七、常见问题</h2>
      <el-collapse>
        <el-collapse-item title="Q: 打印出来的面单偏移或缺失怎么办？" name="1">
          <p>A: 请检查纸张尺寸设置是否与实际面单纸匹配。浏览器打印时确保缩放为100%、边距为无。如使用LODOP，检查打印模板中的偏移量设置。</p>
        </el-collapse-item>
        <el-collapse-item title="Q: 条码扫不出来？" name="2">
          <p>A: 确保打印分辨率足够（建议203DPI以上）、打印浓度适当。浏览器打印时要开启"背景图形"选项。检查面单模板中条码类型设置是否正确。</p>
        </el-collapse-item>
        <el-collapse-item title="Q: LODOP显示未连接？" name="3">
          <p>A: 1) 确认C-Lodop服务已启动；2) 检查防火墙设置；3) 尝试在浏览器访问 http://localhost:8000 确认服务可达；4) 如使用HTTPS网站，C-Lodop需要配置SSL证书。</p>
        </el-collapse-item>
        <el-collapse-item title="Q: 可以使用普通A4打印机打印面单吗？" name="4">
          <p>A: 技术上可以，但不推荐。面单通常为100mm宽度的热敏纸，A4打印机需要裁纸且无法直接粘贴。建议购买热敏标签打印机以获得最佳效果。</p>
        </el-collapse-item>
      </el-collapse>
    </section>
  </div>
</template>

<script setup lang="ts">
const printMethods = [
  { method: '浏览器打印', description: '使用浏览器原生打印功能', pros: '零安装、兼容所有打印机', cons: '每次需手动确认', recommend: '日常少量打印' },
  { method: 'LODOP控件', description: '专业Web打印控件', pros: '静默打印、批量高效', cons: '需安装控件', recommend: '批量专业打印' },
  { method: 'USB直连', description: 'WebUSB直连热敏打印机', pros: '无需驱动、直接控制', cons: '浏览器兼容性限制', recommend: '热敏打印机' },
]

const printerModels = [
  { brand: '佳博', model: 'GP-9025T / GP-3120TU', type: '热敏标签机', paperSize: '20-80mm', feature: '高性价比，支持USB/蓝牙' },
  { brand: '得力', model: 'DL-888D / DL-888T', type: '热敏标签机', paperSize: '20-108mm', feature: '品质稳定，企业首选' },
  { brand: '斑马', model: 'GK888T / ZD421', type: '热敏/热转印', paperSize: '25-108mm', feature: '专业级，耐用性好' },
  { brand: '汉印', model: 'N41 / D45', type: '热敏面单机', paperSize: '40-110mm', feature: '电商专用，支持一联单' },
  { brand: '芯烨', model: 'XP-460B / XP-490B', type: '热敏面单机', paperSize: '25-108mm', feature: '面单专用，速度快' },
]

const paperSizes = [
  { size: '100 × 180mm', name: '一联单（标准面单）', usage: '最常用，适合所有快递公司标准面单' },
  { size: '100 × 150mm', name: '一联单（短版面单）', usage: '部分快递公司使用的短版面单' },
  { size: '100 × 200mm', name: '一联单（加长面单）', usage: '包含更多商品信息的加长面单' },
  { size: '76 × 130mm', name: '三联单', usage: '传统手写面单，逐渐淘汰' },
]
</script>

<style scoped>
.help-content { line-height: 1.8; color: #333; }
.help-content h1 { font-size: 28px; color: #1a1a1a; margin-bottom: 30px; padding-bottom: 15px; border-bottom: 2px solid #409eff; }
.help-content h2 { font-size: 20px; color: #303133; margin: 30px 0 15px; }
.help-content h3 { font-size: 16px; color: #409eff; margin: 20px 0 10px; }
.help-content p { margin: 10px 0; color: #606266; }
.help-content ul, .help-content ol { margin: 10px 0; padding-left: 20px; }
.help-content li { margin: 8px 0; color: #606266; }
section { margin-bottom: 40px; }

:deep(.el-collapse-item__header) { font-weight: 500; color: #303133; }
:deep(.el-collapse-item__content) { color: #606266; line-height: 1.8; }
</style>

