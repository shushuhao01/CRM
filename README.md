# CRM - 智能销售系统
智能销售系统CRM，私域销售管理的神器！界面简约大气，方便操作，功能全面！

## 🚀 项目简介

这是一个基于 Vue 3 + TypeScript + Node.js 开发的现代化CRM客户关系管理系统，专为中小企业私域销售管理设计。

## ✨ 主要功能

- 🏢 **客户管理** - 完整的客户信息管理、分组、标签系统
- 📋 **订单管理** - 订单创建、跟踪、状态管理
- 📊 **数据分析** - 销售数据统计、业绩分析、图表展示
- 👥 **权限管理** - 多角色权限控制、部门管理
- 📱 **移动端支持** - 响应式设计，支持移动设备
- 🔔 **消息通知** - 系统消息、短信通知功能
- 📞 **通话管理** - 通话记录、录音管理
- 🚚 **物流管理** - 订单物流跟踪

## 🛠️ 技术栈

### 前端
- **Vue 3** - 渐进式JavaScript框架
- **TypeScript** - 类型安全的JavaScript
- **Element Plus** - Vue 3 UI组件库
- **Vite** - 现代化构建工具
- **Pinia** - Vue 状态管理

### 后端
- **Node.js** - JavaScript运行时
- **TypeScript** - 类型安全开发
- **Express** - Web应用框架
- **TypeORM** - 对象关系映射
- **MySQL/MariaDB** - 关系型数据库

### 部署
- **CentOS 7** - 服务器操作系统
- **宝塔面板** - 服务器管理面板
- **Nginx** - Web服务器和反向代理
- **PM2** - Node.js进程管理

## 📦 快速开始

### 环境要求
- Node.js 18+
- MySQL 8.0+ 或 MariaDB 10.6+
- Git

### 本地开发

1. **克隆项目**
```bash
git clone https://github.com/shushuhao01/CRM.git
cd CRM
```

2. **安装前端依赖**
```bash
npm install
```

3. **安装后端依赖**
```bash
cd backend
npm install
```

4. **配置环境变量**
```bash
# 复制环境变量文件
cp backend/.env.example backend/.env
# 编辑数据库配置
```

5. **启动开发服务**
```bash
# 启动前端开发服务
npm run dev

# 启动后端服务
cd backend
npm run dev
```

### 生产部署

详细部署指南请参考：
- [部署指南](./DEPLOYMENT_GUIDE.md)
- [简化上传指南](./simple-upload-guide.md)
- [宝塔面板配置](./bt-panel-config.md)

## 📁 项目结构

```
CRM/
├── src/                    # 前端源码
│   ├── components/         # Vue组件
│   ├── views/             # 页面视图
│   ├── api/               # API接口
│   ├── stores/            # 状态管理
│   └── utils/             # 工具函数
├── backend/               # 后端源码
│   ├── src/               # TypeScript源码
│   ├── database/          # 数据库脚本
│   └── uploads/           # 文件上传目录
├── dist/                  # 前端构建产物
├── deploy.sh              # Linux部署脚本
├── centos7-setup.sh       # CentOS 7环境准备
└── docs/                  # 项目文档
```

## 🔧 开发命令

```bash
# 前端开发
npm run dev              # 启动开发服务器
npm run build            # 构建生产版本
npm run lint             # 代码检查

# 后端开发
cd backend
npm run dev              # 启动开发服务器
npm run build            # 编译TypeScript
npm start                # 启动生产服务
```

## 📖 文档

- [API文档](./API_INTEGRATION.md)
- [数据迁移计划](./DATA_MIGRATION_PLAN.md)
- [数据持久化](./DATA_PERSISTENCE.md)
- [部署指南](./DEPLOYMENT_GUIDE.md)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

## 📞 技术支持

如有问题，请提交 Issue 或联系开发团队。
