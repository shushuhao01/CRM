# CRM 项目记忆

## Git 推送（重要！曾两次踩坑）

本项目本地配置了 6 个 remote，**部署源与备份仓不同**：

| remote | 仓库 | 用途 |
|---|---|---|
| `origin` | https://github.com/shushuhao01/CRM.git | **部署源** —— 服务器 `update.sh` 执行 `git pull origin main` 从这里拉取 |
| `backup` | https://github.com/shushuhao01/backups.git | 备份仓库，推了也没用 |

### 规则
- **每次提交后必须执行 `git push origin main`**（2026-08-27 已将本地 main 上游从 backup/main 改为 origin/main，裸 `git push` 现在也会推对仓库）
- 裸 `git push` 历史上曾把代码推到 backups.git 导致服务器 `bash update.sh` 拉不到新代码
- 提交远程前检查：`git log --oneline -3 origin/main` 确认提交确实到了 CRM.git

## 部署流程

服务器 `/www/wwwroot/CRM` 用 `bash update.sh` 更新：拉取 origin/main → 装依赖 → 构建 4 端 → PM2 重启。`.env` 配置文件会被脚本自动备份/恢复，不要把配置改动提交到 git。

**注意：`update.sh` 第 22 行写死 `PROJECT_DIR="/www/wwwroot/CRM"`，对其它目录部署的站点（如 abc789.cn）无效**——在别的目录跑它只会打印 `[X] 错误：项目目录不存在` 并 exit 1，不要指望它更新 abc789.cn。

### 两套线上部署（不要混淆）

| 站点 | 后端目录 | PM2 进程名 | 端口 | 说明 |
|---|---|---|---|---|
| `CRM` 系 | `/www/wwwroot/CRM` | `crm-backend` | 3000 | 用根目录 `update.sh` 更新 |
| `abc789.cn` 系 | `/www/wwwroot/abc789.cn/backend` | `abc789.cn-backend` | 3000 | 手动部署，PM2 配置见 `backend/ecosystem.config.js` |

abc789.cn 的 PM2 配置要点（[ecosystem.config.js](file:///d:/kaifa/CRM%20-%201.8.0/backend/ecosystem.config.js)）：`script: ./dist/app.js`、`env_file: '.env.local'`、`NODE_ENV=production`、`PORT=3000`、`max_memory_restart: 512M`、`autorestart: true`。**依赖从 `.env.local` 读取，不是 `.env`。**

三/四域名架构（见 `docs/重要文件/Nginx四域名部署配置指南.md`、`docs/重要文件/三域名部署指南.md`）：官网 / CRM 主应用 / admin 后台 / API 四个域名（或三域名）**共用同一个 3000 端口的后端**，Nginx 按 `/api/v1/*`、`/api/v1/public/*`、`/api/v1/admin/*` 路由区分；admin 站点只放行 `/api/v1/admin/` + `/api/v1/public/`。

## 部署踩坑与预防（2026-10-14 502 复盘）

**现象**：服务器 `abc789.cn` 前后端产物更新、重启后持续「网关错误 502」，`pm2 logs` 首行 `Error: Cannot find module 'ip2region-ts'`（MODULE_NOT_FOUND），进程不停重启 → Nginx 502。

**根因（两条叠加）**：
1. **只传了 `dist`、没同步 `package.json`、没在服务器 `npm install`**——服务器上 `package.json` 还是旧的，未声明新增依赖 `ip2region-ts`，故 `npm install` 输出 `up to date in 2s`，模块始终缺失。该依赖是本项目 `SiteAnalyticsService`（官网 SEO 统计）引入的，`docs/` 里**没有任何文档记录**。
2. **服务器 npm registry 被配错**成 `https://cdn.npmmirror.com/binaries/npm`（这是 npm 二进制镜像，不是包仓库）；配合 `replace-registry-host` 会把 lock 里 `registry.npmjs.org` 的 URL 重写成坏地址，导致仅个别包（如 `yocto-queue`）报 `E404`。

**假象干扰**：日志里 `TypeORMError: Connection is not established with mysql database` 是模块加载失败连带的假报错，**不是数据库问题**，别被带偏。

**修复动作**：
- 显式安装缺的依赖：`cd /www/wwwroot/abc789.cn/backend && npm install ip2region-ts@2.0.1 --no-audit --no-fund`
- 正确 registry 应为 `https://registry.npmmirror.com`（不是 `.../binaries/npm`）
- 校验：`node -e "require('ip2region-ts')"` 不报错后再 `pm2 restart`

**排查 502 的正确顺序**：
1. 先看 `pm2 logs <name> --lines 100` / `logs/error.log` 的**第一行 `Cannot find module 'xxx'`**——这是最直接的根因；
2. `node -e "require('xxx')"` 确认模块在不在；
3. 模块缺失 → 查 `package.json` 是否声明 + `npm install`；装不上 → 查 `npm config get registry`；
4. 忽略连带的 MySQL/DB 报错。

**预防清单（每次部署固定动作）**：
- 后端变更加了依赖时，**同步 `package.json` + `package-lock.json` 到服务器**，并在服务器执行 `npm install`
- 保持服务器 registry 为 `https://registry.npmmirror.com`
- **改 `~/.npmrc` 时不要带反引号**：用户曾把带 `` ` `` 的整段命令粘进终端，把 `~/.npmrc` 写成 `` registry=`https://registry.npmmirror.com/` ``，导致后续命令全乱；清理用 `sed -i 's/`//g' ~/.npmrc`
- 一条命令一条命令地执行，别把多行命令整段粘贴（会被合并成一行产生假报错）

## PM2 进程管理（曾踩坑）

- 守护进程重启后若未 `pm2 save`，进程列表会丢失，`pm2 restart <name>` 报 `Process or Namespace ... not found`。
- 此时用 `pm2 start ecosystem.config.js`（重建进程）+ `pm2 save`（写入 `~/.pm2/dump.pm2` 持久化）。
- `pm2 restart` 成功但代码仍旧 → 确认重启的是对的那个进程名（`crm-backend` vs `abc789.cn-backend`）。

## 文档索引与注意事项

`docs/` 下有大量历史文档，**部分内容已过时，以本记忆为准**：

- **进程名冲突**：`docs/重要文件/三域名部署指南.md`、`服务器快速更新指令.md`、`update-guide.md`、`生产环境部署检查清单.md` 里的部署命令都写 `pm2 restart crm-backend`——只适用于 `/www/wwwroot/CRM`；abc789.cn 是 `abc789.cn-backend`。
- **数据库名**：旧文档写 `abc789_cn`，以服务器 `.env.local` / `.env` 实际配置为准。
- **依赖文档缺失**：`ip2region-ts` 等新增依赖在 docs 中无记录，新增依赖请顺手在 `backend/package.json` 确认声明。
- **最相关的参考**：`docs/重要文件/Nginx四域名部署配置指南.md`（域名/目录/Nginx/环境变量最全）、`docs/重要文件/三域名部署指南.md`（三域名+单后端 3000 端口）、`docs/重要文件/生产环境部署检查清单.md`（JWT_SECRET 须与本地一致、前端 dist 文件名校验 `CallManagement-*.js`）。
- **部署三件套**：前端 dist 文件名与本地构建一致（防止传了旧产物）；`JWT_SECRET` 多端一致（否则 WebSocket/APP 绑定失效）；改完前端让用户清缓存/无痕验证。

## 数据库迁移

项目 `synchronize: false`。新增功能表结构采用 **WecomConvertFanService.ensureTables() 模式**：服务内 CREATE TABLE IF NOT EXISTS + information_schema 对照实体逐列补齐，启动时（SchedulerService 注册处）及各入口懒触发，无需手动执行 SQL。参考 notification_channels 的既有同款范式。

## 构建验证约定

- backend：`npx tsc --noEmit` 必须通过
- admin / 主应用：`npm run build` 通过即可；全仓 vue-tsc 有大量历史遗留错误且 admin 的 vue-tsc 1.8 与 Node 24 不兼容，type-check 不是门禁，但**自己新增的文件必须零类型错误**
- backend 有 Jest 测试（44 套件），改 SchedulerService 任务数、PaymentService 分流等要同步跑 `npm test -- --no-coverage --forceExit`
