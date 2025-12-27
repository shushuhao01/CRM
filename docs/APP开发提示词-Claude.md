# 云客APP外呼助手 - 开发引导提示词

> 本文档用于引导 AI 助手（Claude Opus 4.5）了解项目背景、技术框架、功能需求和开发规范，以便高效完成 APP 开发任务。

---

## 🎯 项目背景

你将作为一名资深移动端开发工程师，负责开发「云客APP外呼助手」—— 这是一款配合 PC 端 CRM 系统使用的电销工作手机 APP。

**核心定位**：
- PC 端 CRM 系统可以远程控制手机拨号
- 手机端可以主动外呼、接听来电
- 通话录音自动上传服务器
- 通话数据实时同步统计
- 支持多租户部署（不同公司使用不同服务器）

---

## 📚 必读文档

在开始开发前，请仔细阅读以下三个核心文档：

### 1. APP产品设计文档.md
**路径**: `docs/APP产品设计文档.md`

**重点关注**：
- 产品定位和核心价值
- 底部导航结构（4个Tab：首页、通话、统计、设置）
- 功能模块清单和优先级
- 页面原型设计（ASCII 图形）
- UI 设计规范（配色、字体、圆角、间距）
- 交互设计（手势、动画、反馈）
- 核心业务流程图

### 2. APP接口文档.md
**路径**: `docs/APP接口文档.md`

**重点关注**：
- 通用请求/响应格式
- 认证接口（登录、Token）
- 设备绑定接口（二维码生成、扫码绑定）
- 通话状态上报接口
- 通话跟进接口
- WebSocket 通信协议
- 错误码定义

### 3. APP开发技术文档.md
**路径**: `docs/APP开发技术文档.md`

**重点关注**：
- 技术栈选型（uni-app + Vue3 + TypeScript + Pinia）
- 项目目录结构
- API 接口对接代码示例
- WebSocket 服务封装
- 原生功能集成（拨号、录音）
- 状态管理设计
- 页面配置（pages.json、manifest.json）
- 权限处理
- **服务器配置功能**（第十六章）- 多租户支持
- **通话跟进功能**（第十七章）- 数据同步

---

## 🛠️ 技术栈要求

| 技术 | 版本 | 用途 |
|------|------|------|
| uni-app | 3.x | 跨平台开发框架 |
| Vue | 3.x | 前端框架（Composition API） |
| TypeScript | 5.x | 类型安全 |
| Pinia | 2.x | 状态管理 |
| uni-ui | 最新 | UI 组件库 |
| socket.io-client | 4.x | WebSocket 通信 |

**目标平台**：
- Android 7.0+ (API 24+)
- iOS 12.0+

---

## 🎨 UI/UX 设计规范

### 配色方案
```
主色（翠绿色）: #34D399
主色浅（薄荷绿）: #6EE7B7
成功（绿色）: #10B981
警告（橙色）: #F59E0B
危险（红色）: #EF4444
信息（蓝色）: #3B82F6
背景（浅灰）: #F9FAFB
主文字（深灰）: #1F2937
次文字（灰色）: #6B7280
```

### 渐变色
```css
/* 主按钮渐变 */
background: linear-gradient(135deg, #6EE7B7 0%, #34D399 100%);

/* 拨号按钮渐变 */
background: linear-gradient(135deg, #34D399 0%, #10B981 100%);

/* 挂断按钮渐变 */
background: linear-gradient(135deg, #F87171 0%, #EF4444 100%);
```

### 设计原则
- 简约美观、操作便捷
- 圆角统一（按钮8px、卡片12px）
- 页面边距16px
- 使用渐变色增强视觉效果

---

## 📋 开发任务优先级

### P0 - 核心功能（必须完成）
1. **服务器配置页** - 首次使用配置服务器地址
2. **登录页** - 用户名密码登录
3. **扫码绑定页** - 扫描 PC 端二维码绑定设备
4. **首页** - 连接状态、今日概览、快捷操作
5. **WebSocket 连接** - 保持与服务器的实时通信
6. **接收拨号指令** - 处理 PC 端发来的拨号请求
7. **发起拨号** - 调用系统拨号功能
8. **通话状态上报** - 实时上报通话状态变化
9. **通话结束处理** - 上报结果、上传录音

### P1 - 重要功能
1. **通话记录列表** - 查看历史通话
2. **拨号盘** - 手动输入号码拨打
3. **通话跟进** - 通话结束后添加备注和标签
4. **通话统计** - 今日/本周/本月数据
5. **设置页** - 账号信息、录音设置、解绑

### P2 - 增强功能
1. 录音播放
2. 趋势图表
3. 来电显示客户信息
4. 后台保活优化

---

## 🔧 开发规范

### 代码风格
```typescript
// 1. 使用 Composition API + setup 语法糖
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

// 2. 类型定义清晰
interface CallRecord {
  id: string
  customerName: string
  customerPhone: string
  callType: 'inbound' | 'outbound'
  callStatus: 'connected' | 'missed' | 'busy'
  duration: number
  startTime: string
}

// 3. 响应式数据
const loading = ref(false)
const callList = ref<CallRecord[]>([])

// 4. 计算属性
const totalDuration = computed(() => 
  callList.value.reduce((sum, c) => sum + c.duration, 0)
)

// 5. 方法命名清晰
const handleRefresh = async () => {
  loading.value = true
  try {
    // ...
  } finally {
    loading.value = false
  }
}
</script>
```

### 文件命名
- 页面文件：`pages/xxx/index.vue`
- 组件文件：`components/XxxComponent.vue`（大驼峰）
- API 文件：`api/xxx.ts`（小写）
- Store 文件：`stores/xxx.ts`（小写）
- 工具函数：`utils/xxx.ts`（小写）

### 样式规范
```scss
// 使用 SCSS
// 组件样式使用 scoped
<style lang="scss" scoped>
.page-container {
  padding: 32rpx;
  
  .card {
    background: #fff;
    border-radius: 24rpx;
    padding: 24rpx;
    margin-bottom: 24rpx;
  }
  
  .btn-primary {
    background: linear-gradient(135deg, #6EE7B7 0%, #34D399 100%);
    color: #fff;
    border-radius: 16rpx;
    height: 88rpx;
  }
}
</style>
```

---

## 🚀 开发流程建议

### 第一阶段：基础框架（1-2天）
1. 初始化 uni-app 项目（Vue3 + TypeScript）
2. 配置 pages.json、manifest.json
3. 创建目录结构
4. 封装 request 工具（支持动态服务器地址）
5. 创建 Pinia stores（server、user、call）

### 第二阶段：核心页面（3-4天）
1. 服务器配置页
2. 登录页
3. 首页（含连接状态）
4. 扫码绑定页
5. 设置页

### 第三阶段：通话功能（3-4天）
1. WebSocket 服务封装
2. 拨号指令处理
3. 通话中页面
4. 通话结束页面（跟进记录）
5. 通话状态上报

### 第四阶段：完善功能（2-3天）
1. 通话记录列表
2. 拨号盘组件
3. 统计页面
4. 录音上传

---

## ⚠️ 注意事项

### 1. 多租户服务器配置
- APP 首次启动必须配置服务器地址
- 支持手动输入域名和扫码配置
- 保存历史服务器列表（最多5条）
- API 基础地址需要动态获取

### 2. WebSocket 连接
- 使用 socket.io-client
- 实现自动重连机制（指数退避）
- 心跳保活（每30秒）
- 处理断线重连后的状态恢复

### 3. 原生功能
- 拨号需要 CALL_PHONE 权限
- 录音需要 RECORD_AUDIO 权限
- 需要开发原生插件或使用现有插件
- iOS 录音限制较多，需要特殊处理

### 4. 后台保活
- Android 需要前台服务
- iOS 需要配置 Background Modes
- 保持 WebSocket 连接不断开

### 5. 数据同步
- 通话跟进数据需要同步到 PC 端
- 使用 WebSocket 推送实时更新
- 离线时缓存数据，联网后同步

---

## 📝 开发输出要求

每完成一个功能模块，请提供：

1. **代码文件**：完整的 Vue 组件/页面代码
2. **说明文档**：简要说明实现思路和关键点
3. **测试建议**：如何测试该功能

---

## 🎯 开始开发

请先阅读以下文档，然后告诉我你的理解和开发计划：

1. `docs/APP产品设计文档.md`
2. `docs/APP接口文档.md`
3. `docs/APP开发技术文档.md`

阅读完成后，请回答：
1. 你对这个项目的整体理解
2. 你计划的开发顺序
3. 你认为可能遇到的技术难点
4. 需要我提供的额外信息

让我们开始吧！🚀
