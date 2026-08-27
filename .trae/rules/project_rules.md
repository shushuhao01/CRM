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

## 数据库迁移

项目 `synchronize: false`。新增功能表结构采用 **WecomConvertFanService.ensureTables() 模式**：服务内 CREATE TABLE IF NOT EXISTS + information_schema 对照实体逐列补齐，启动时（SchedulerService 注册处）及各入口懒触发，无需手动执行 SQL。参考 notification_channels 的既有同款范式。

## 构建验证约定

- backend：`npx tsc --noEmit` 必须通过
- admin / 主应用：`npm run build` 通过即可；全仓 vue-tsc 有大量历史遗留错误且 admin 的 vue-tsc 1.8 与 Node 24 不兼容，type-check 不是门禁，但**自己新增的文件必须零类型错误**
- backend 有 Jest 测试（44 套件），改 SchedulerService 任务数、PaymentService 分流等要同步跑 `npm test -- --no-coverage --forceExit`
