# 定时任务依赖安装说明

## 需要安装的依赖

```bash
cd backend
npm install node-cron
npm install --save-dev @types/node-cron
```

## 依赖说明

- `node-cron`: Node.js的cron任务调度库
- `@types/node-cron`: TypeScript类型定义

## 安装后

重新构建并重启服务:

```bash
npm run build
pm2 restart backend
```

## 验证

查看日志确认定时任务已启动:

```bash
pm2 logs backend
```

应该看到:
```
✅ 定时任务调度器已启动
[Scheduler] 已调度任务: license-expiration-check (授权到期检查)
```
