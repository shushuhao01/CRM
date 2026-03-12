# 云客CRM外呼助手 APP

电销工作手机APP，配合云客CRM系统使用。

## 功能特性

- 📱 PC端远程控制手机拨号
- 📞 手机端主动外呼、接听来电
- 🎙️ 通话录音自动上传
- 📊 通话数据实时同步统计
- 🏢 支持多租户部署

## 技术栈

- uni-app 3.x
- Vue 3 + TypeScript
- Pinia 状态管理
- WebSocket 实时通信

## 开发环境

### 前置要求

- Node.js 18+
- HBuilderX 3.8+（推荐使用官方IDE）
- Android Studio（Android调试）

### 安装依赖

```bash
cd crmAPP
npm install
```

### 在 HBuilderX 中运行

1. 打开 HBuilderX
2. 文件 -> 导入 -> 从本地目录导入
3. 选择 `crmAPP` 目录
4. 运行 -> 运行到手机或模拟器 -> 选择设备

### 命令行运行（H5预览）

```bash
npm run dev:h5
```

## 项目结构

```
crmAPP/
├── src/
│   ├── api/                # API接口
│   │   ├── auth.ts        # 登录、绑定接口
│   │   └── call.ts        # 通话相关接口
│   ├── pages/             # 页面
│   │   ├── splash/        # 启动页
│   │   ├── server-config/ # 服务器配置
│   │   ├── login/         # 登录
│   │   ├── index/         # 首页
│   │   ├── calls/         # 通话记录
│   │   ├── stats/         # 统计
│   │   ├── settings/      # 设置
│   │   ├── scan/          # 扫码绑定
│   │   ├── calling/       # 通话中
│   │   ├── call-ended/    # 通话结束
│   │   └── call-detail/   # 通话详情
│   ├── services/          # 服务
│   │   └── websocket.ts   # WebSocket服务
│   ├── stores/            # 状态管理
│   │   ├── server.ts      # 服务器配置
│   │   ├── user.ts        # 用户状态
│   │   └── call.ts        # 通话状态
│   ├── utils/             # 工具函数
│   │   ├── request.ts     # 请求封装
│   │   ├── device.ts      # 设备工具
│   │   └── format.ts      # 格式化工具
│   ├── static/            # 静态资源
│   ├── App.vue            # 根组件
│   ├── main.ts            # 入口文件
│   ├── pages.json         # 页面配置
│   ├── manifest.json      # 应用配置
│   └── uni.scss           # 全局样式
├── package.json
└── vite.config.ts
```

## 使用流程

1. **配置服务器** - 首次使用需要配置服务器地址
2. **登录** - 使用CRM系统账号登录
3. **绑定设备** - 扫描PC端生成的二维码绑定设备
4. **等待指令** - 等待PC端发送拨号指令
5. **通话跟进** - 通话结束后记录跟进信息

## 后端接口

APP使用的后端接口位于 `backend/src/routes/mobile.ts`，主要包括：

- `GET /api/v1/mobile/ping` - 服务器连接测试
- `POST /api/v1/mobile/login` - APP登录
- `POST /api/v1/mobile/bind` - 设备绑定
- `DELETE /api/v1/mobile/unbind` - 设备解绑
- `POST /api/v1/mobile/call/status` - 通话状态上报
- `POST /api/v1/mobile/call/end` - 通话结束上报
- `POST /api/v1/mobile/call/followup` - 通话跟进
- `GET /api/v1/mobile/calls` - 通话记录列表
- `GET /api/v1/mobile/stats/today` - 今日统计

## 打包发布

### Android

1. HBuilderX -> 发行 -> 原生App-云打包
2. 选择 Android
3. 配置证书和包名
4. 提交打包

### iOS

1. HBuilderX -> 发行 -> 原生App-云打包
2. 选择 iOS
3. 配置证书和Bundle ID
4. 提交打包

## 注意事项

1. **权限申请** - APP需要拨号、录音、相机等权限
2. **后台保活** - Android需要配置前台服务保持WebSocket连接
3. **iOS录音** - iOS对通话录音有限制，需要特殊处理
