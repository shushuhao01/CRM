## 部署常见问题

### Q: 如何升级系统？

A: 升级步骤：
1. 备份数据库：`mysqldump -u root -p crm > backup.sql`
2. 备份当前代码目录
3. 下载最新版本安装包并解压覆盖
4. 执行数据库迁移脚本（如有）
5. 重新安装依赖：`npm install`
6. 重启服务：`pm2 restart all`

### Q: 忘记管理员密码怎么办？

A: 可以通过以下方式重置：
1. 使用项目提供的管理员重置脚本：`node create-admin-user.js`
2. 或直接联系技术支持协助重置

### Q: 如何备份数据？

A: 建议定期执行以下备份：
- **数据库备份**：`mysqldump -u root -p crm > backup_$(date +%Y%m%d).sql`
- **文件备份**：备份 `uploads/` 目录和 `recordings/` 目录
- 建议配置定时任务（crontab）每日自动备份

### Q: 系统运行缓慢怎么办？

A: 排查步骤：
1. 检查服务器CPU和内存使用：`top` 或 `htop`
2. 检查MySQL性能：查看慢查询日志
3. 检查Node.js进程状态：`pm2 monit`
4. 考虑升级服务器配置或优化数据库索引

### Q: 如何配置域名和HTTPS？

A: 步骤：
1. 将域名DNS解析到服务器IP
2. 在Nginx配置中设置 `server_name` 为您的域名
3. 使用 Let's Encrypt 申请免费SSL证书
4. 在Nginx中配置SSL证书路径
5. 重启Nginx：`nginx -s reload`

### Q: PM2 服务异常如何排查？

A: 常用排查命令：
- 查看状态：`pm2 status`
- 查看日志：`pm2 logs`
- 重启服务：`pm2 restart all`
- 查看监控：`pm2 monit`
