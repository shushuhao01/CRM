# A站点升级改造方案 — 旧版生产环境升级到 v1.8 私有部署完整指南

> 文档性质：**方案规划文档（未改任何代码）**
> 编写日期：2026-06-11
> 适用对象：A站点（多租户改造前的旧版生产环境）升级到当前最新版本（与B站点同源代码），并以**私有部署模式（DEPLOY_MODE=private）**运行

---

## 一、背景与现状

| 项目 | A站点（待升级） | B站点（参照系统） |
|------|----------------|------------------|
| 代码版本 | `78d5e63b`（"多租户改造前的完整备份 - 2026-03-02"） | 最新版（v1.8.x，多租户SaaS完整版） |
| 部署形态 | 单租户旧版，已投产，**有重要生产数据** | 多租户SaaS，开放租户入驻 |
| 服务器配置 | 2核 vCPU / 2GB 内存 / 40GB 硬盘 | 4核 vCPU / 8GB 内存 / 100GB 硬盘 |
| 升级目标 | 升级到最新代码，以**私有部署模式**运行 | 不动 |

**代码差异规模（git 实测）**：`78d5e63b..HEAD` 仅实体层（backend/src/entities）就有 **118 个文件变更、新增 4300+ 行**——包含大量新表（tenants、licenses、private_customers、sms_*、wecom_*、在线席位、额度套餐等）和几乎所有旧表新增的 `tenant_id` 列。

**两个最重要的技术事实**（决定整个方案）：

1. **TypeORM `synchronize: false`**（新旧版本都是）——升级后程序**不会自动建表/加字段**，启动时只有极少量自动修复脚本（订单设置、敏感信息权限表）。**所有表结构差异必须手动执行 SQL 补齐**，否则新代码一跑就大面积报错 `Unknown column` / `Table doesn't exist`。
2. **私有部署的数据归属机制**：新版所有查询经过租户上下文过滤——
   - 用户记录的 `tenant_id` 为 NULL → JWT 不含 tenantId → 私有模式下查询 `tenant_id IS NULL` 的数据；
   - 用户记录的 `tenant_id` 有值 → 按具体租户ID过滤。
   - **A站点旧数据加上 `tenant_id` 列后全部是 NULL，旧账号登录后天然可见全部旧数据**——这是我们的"零数据迁移"通道，必须守住（详见第五节）。

---

## 二、核心结论（先看这里）

1. **绝不直接把代码推到A站点重启**。先补表结构、后换代码，且必须先在演练环境完整跑通一遍。
2. **查字段差异不需要任何第三方猜测**：B站点的库就是"标准答案"。用 `mysqldump --no-data` 导出两边结构，做结构对比即可（三种方法见第四节）。
3. **数据策略选"零迁移"方案**：所有旧数据 `tenant_id` 保持 NULL，旧账号继续登录使用。**不要**把存量数据批量 UPDATE 到某个租户ID下（表多、量大、容易漏，且没有收益）。
4. **登录页授权**：A站点配置 `DEPLOY_MODE=private` 后，登录页首次会要求输入**授权码**（`PRIVATE-XXXX-XXXX-XXXX-XXXX` 格式）。授权码在 **B站点管理后台**为私有客户生成，对应记录需进入A站点本地 `licenses` 表。激活一次后服务端记住状态，员工日常登录**不再需要输入任何编码**。
5. **构建全部在本地完成**，服务器只接收产物。注意：**后端 node_modules 不能从 Windows 本地直接上传**（bcrypt 等原生模块跨平台不兼容），要在服务器上 `npm ci --omit=dev`（2核2G装依赖没问题，只是不能在服务器上跑 vite/tsc 构建）。
6. **2核2G 跑新版偏紧**，必须做：加 2~4G swap、调小 MySQL buffer pool、PM2 内存上限、只部署 CRM前端+后端（admin/website/小程序都不部署在A站点）。

---

## 三、风险清单（按严重程度）

| # | 风险 | 后果 | 对策 |
|---|------|------|------|
| 1 | 表结构没补齐就启动新代码 | 大面积 500 错误，业务中断 | 第四节差异核对 + 第六节DDL先行 |
| 2 | 误把旧数据迁移到具体租户ID / 用错账号录数据 | 数据"看不见"（实际还在，被租户过滤隔离） | 第五节数据归属策略，激活后账号处理 |
| 3 | 升级中途失败且无备份 | **不可接受的数据损失** | 第七节备份与回滚，备份未验证不动手 |
| 4 | Windows 本地 node_modules 上传 Linux | 后端起不来（原生模块崩溃） | 服务器端 `npm ci --omit=dev` |
| 5 | 2G内存 OOM（新版服务多：WebSocket、多个定时调度器） | 进程反复重启 | swap + PM2 `max_memory_restart` + MySQL调参 |
| 6 | JWT_SECRET 变更 | 所有用户登录态失效（可接受）；若代码按旧secret签发过长期token则混乱 | .env 沿用A站点旧 JWT_SECRET |
| 7 | 40G磁盘被日志/备份占满 | MySQL 写入失败 | 部署前清理，日志轮转，备份传出站外 |
| 8 | 升级窗口选错 | 业务高峰中断 | 选业务低谷（如周末凌晨），提前通知 |

---

## 四、如何查清两个站点的表/字段差异（三种方法，推荐组合使用）

> 原理：B站点数据库 = 新代码需要的完整结构（已在生产验证）；A站点数据库 = 旧结构。两者差集就是要补的 DDL。

### 方法一（推荐主用）：mysqldump 导出纯结构 + 图形工具结构同步

```bash
# 在 B 站点导出"标准结构"（不含数据，安全）
mysqldump -u<用户> -p --no-data --skip-comments --routines=false <B库名> > b_schema.sql

# 在 A 站点导出现有结构
mysqldump -u<用户> -p --no-data --skip-comments <A库名> > a_schema.sql
```

把两份 SQL 导入**本地 MySQL 的两个空库**（如 `ref_b` / `ref_a`），然后用任一图形工具做"结构同步/比较"：
- **Navicat**：工具 → 结构同步（源=ref_b，目标=ref_a），自动生成补差 DDL 脚本；
- **DataGrip / DBeaver**：数据库对比功能，同样可导出差异 DDL。

工具生成的 DDL **必须人工审查**（见第六节红线），确认只有 `CREATE TABLE` 和 `ADD COLUMN`/`ADD INDEX`，**手工删掉所有 DROP/MODIFY 语句**后才能用。

### 方法二（命令行核对）：information_schema 差异 SQL

两份结构导入本地同一实例（`ref_a`、`ref_b`）后执行：

```sql
-- 1) B有A无的"缺失表"清单
SELECT table_name AS missing_table
FROM information_schema.tables
WHERE table_schema = 'ref_b'
  AND table_name NOT IN (
    SELECT table_name FROM information_schema.tables WHERE table_schema = 'ref_a'
  )
ORDER BY table_name;

-- 2) 两边都有的表中，B有A无的"缺失字段"清单
SELECT b.table_name, b.column_name, b.column_type, b.is_nullable, b.column_default
FROM information_schema.columns b
JOIN information_schema.tables t
  ON t.table_schema = 'ref_a' AND t.table_name = b.table_name
LEFT JOIN information_schema.columns a
  ON a.table_schema = 'ref_a' AND a.table_name = b.table_name AND a.column_name = b.column_name
WHERE b.table_schema = 'ref_b' AND a.column_name IS NULL
ORDER BY b.table_name, b.ordinal_position;

-- 3) 同名字段但类型不一致的清单（重点人工评审，不要盲改）
SELECT b.table_name, b.column_name,
       a.column_type AS a_type, b.column_type AS b_type
FROM information_schema.columns b
JOIN information_schema.columns a
  ON a.table_schema = 'ref_a' AND a.table_name = b.table_name AND a.column_name = b.column_name
WHERE b.table_schema = 'ref_b' AND a.column_type <> b.column_type
ORDER BY b.table_name;

-- 4) 缺失索引清单（可选）
SELECT b.table_name, b.index_name, GROUP_CONCAT(b.column_name ORDER BY b.seq_in_index) AS cols
FROM information_schema.statistics b
LEFT JOIN information_schema.statistics a
  ON a.table_schema = 'ref_a' AND a.table_name = b.table_name AND a.index_name = b.index_name
WHERE b.table_schema = 'ref_b' AND a.index_name IS NULL
GROUP BY b.table_name, b.index_name;
```

### 方法三（代码侧交叉验证）：git 对比实体定义

```bash
git diff 78d5e63beb78be9accdeae79ed8da7fe15d76e04..HEAD --name-status -- backend/src/entities
```

新增的实体文件 = 新表；修改的实体文件 = 大概率有新列。此方法用来**复核**方法一/二的结果是否遗漏（例如某些表不是实体管理而是原生SQL创建的，如 `system_config`、`notifications`、`license_logs` 等，要特别留意）。

> 另外注意仓库内现成的迁移资产，升级时可能要按需执行：
> - `backend/src/scripts/add-tenant-id-columns.sql`（多租户改造的 tenant_id 批量加列脚本）
> - `backend/database-migrations/*.sql`（增量迁移）
> - `backend/migrations/*.sql`（预设模板等）
> - `private-deploy/合集/生产环境-权限完整迁移.sql`、`权限数据迁移.sql`（权限菜单数据）

---

## 五、私有部署的登录授权机制（租户编码 / 授权码怎么来）

### 5.1 机制说明（基于当前代码实测）

1. A站点后端 `.env` 配置 `DEPLOY_MODE=private`。
2. 用户打开登录页 → 前端调用"私有激活状态检查"接口：
   - **已激活**：自动带出企业信息，员工直接输入工号密码登录，**无需输入任何编码**；
   - **未激活**（首次部署后）：登录页展开**授权码输入框**（私有模式默认授权码模式，不是租户编码模式）。
3. 输入 `PRIVATE-XXXX-XXXX-XXXX-XXXX` 格式授权码 → 后端查**A站点本地 `licenses` 表**（JOIN `private_customers`）验证 → 首次激活时自动在本地 `tenants` 表创建一条私有租户记录（编码 `P` 开头，如 `P2606XXXX`），并自动创建一个新管理员账号（用授权码登记的手机号，初始密码 Aa123456）。
4. 之后登录页永远显示"已激活"状态。租户编码（T开头）是 SaaS 模式给B站点租户用的，**A站点私有部署用不到**。

### 5.2 授权码从哪里来（两条路径，选其一）

- **路径A（标准）**：在 **B站点管理后台** → 私有客户管理/授权管理中，为"A站点这家企业"创建私有客户并生成授权码。然后把对应的 `licenses`（及 `private_customers`）记录**导出并导入A站点本地库**。如果A站点配置了 `LICENSE_SERVER` / `CENTRAL_ADMIN_URL` 指向B站点，授权同步调度器（每30分钟）还能在线核验授权状态。
- **路径B（离线）**：用仓库内 `backend/scripts/generate-saas-license.js` 之类的工具离线生成授权记录直接插入A站点 `licenses` 表（适合完全内网、不连B站点的场景）。

### 5.3 ⚠️ 激活后的关键账号处理（防止"数据看不见"）

激活动作会创建一个**挂在新租户ID下**的管理员账号。注意区分：

| 账号 | tenant_id | 登录后能看到什么 |
|------|-----------|-----------------|
| A站点**原有的所有账号** | NULL | **全部旧生产数据**（私有模式查 tenant_id IS NULL）✅ |
| 激活时自动创建的新管理员 | 新租户ID | 一个空系统（什么数据都没有）❌ |

**决策（推荐）**：日常一律用**原有账号**。激活生成的新管理员二选一处理：
- 直接停用/删除它；或
- 执行一条 SQL 把它归入 NULL 域，与旧数据同域：
  `UPDATE users SET tenant_id = NULL WHERE id = '<激活生成的管理员ID>';`

**红线**：不要尝试把全库存量数据 `UPDATE tenant_id = <新租户ID>`。一百多张表逐一更新极易遗漏，出错就是"数据消失"事故，而且对私有部署没有任何收益。

---

## 六、数据库升级 DDL 执行规范（红线）

1. **只增不减**：差异脚本中只允许出现 `CREATE TABLE IF NOT EXISTS ...`、`ALTER TABLE ... ADD COLUMN ...`、`ADD INDEX/UNIQUE`。任何 `DROP TABLE`、`DROP COLUMN`、`MODIFY/CHANGE COLUMN`（类型变更）一律剔除、单独人工评审。
2. 新增列必须**允许 NULL 或带 DEFAULT**（绝大多数新版列本来就是 nullable，包括所有 `tenant_id`），保证旧数据行不受影响。
3. 同名字段类型不一致（方法二第3查询的结果）逐条评审：旧类型能兼容就**不改**；确需修改的，先在演练库验证数据无损。
4. 字符集统一 `utf8mb4`；新表照搬B站点导出的 DDL 即可。
5. 执行顺序：先 `CREATE TABLE`（无依赖风险）→ 再 `ADD COLUMN` → 最后 `ADD INDEX`（大表加索引耗时，放低谷执行）。
6. 每条 DDL 可重复执行或有存在性判断（宝塔 phpMyAdmin/命令行中断后可续跑）。
7. DDL 全部执行完后，复跑一遍方法二的差异 SQL，**确认差集为空**才算完成。

---

## 七、完整实施流程（按此顺序执行）

### 阶段0：演练（强烈建议，不可跳过）

1. A站点 `mysqldump` 全量备份（结构+数据）下载到本地；
2. 在本地（或B站点临时库/Docker）恢复成演练库；
3. 在演练库执行第六节的全部 DDL；
4. 本地用新代码连接演练库启动后端（`DEPLOY_MODE=private`），完整走一遍：授权激活 → 旧账号登录 → 客户/订单/业绩/短信等核心模块抽查 → 确认旧数据全部可见、可编辑；
5. 记录演练中发现的所有问题（缺表、缺数据字典、权限菜单异常等），补进DDL/初始化脚本。
6. **演练通过才允许进入阶段1。**

### 阶段1：生产升级前准备

1. **备份三件套**（升级当天再做一次最新的）：
   - 数据库全量：`mysqldump -u<u> -p --single-transaction --routines --triggers <A库> | gzip > A_full_$(date +%F).sql.gz`
   - 文件目录：`backend/uploads/`、`backend/recordings/`、旧前端目录、旧 `.env`
   - **备份文件传出A站点**（下载到本地+传到B站点各一份），40G小盘上别只留本机副本
   - **做一次恢复验证**（在本地把备份还原一遍，能起来才算备份有效）
2. 本地构建产物（见第八节），打包待传；
3. 整理好：差异DDL脚本（演练验证过的版本）、权限迁移SQL、授权码（B站点已生成）、新 `.env` 文件；
4. 通知用户停机窗口（预估1~2小时，含回滚余量）。

### 阶段2：停机升级（建议低谷期）

1. 停旧后端服务（PM2/宝塔），Nginx 挂维护页（可选）；
2. **再做一次增量/全量备份**（停机后数据静止，这份是回滚基准）；
3. 执行差异 DDL → 复跑差异SQL确认差集为空；
4. 执行数据初始化SQL（权限菜单迁移、预设短信模板、必要的 system_config 键等，以演练清单为准）；
5. 上传部署新后端产物 + 服务器上 `npm ci --omit=dev` + 配置新 `.env` → PM2 启动；
6. 上传新CRM前端 dist 到 Nginx 站点目录，更新 Nginx 配置（注意新增 WebSocket 反代，见第九节）；
7. 浏览器访问 → 登录页输入授权码激活 → **改用旧管理员账号登录** → 按验证清单（第十节）逐项检查。

### 阶段3：观察与收尾

1. 观察24~48小时：PM2 日志、内存占用、MySQL 慢查询；
2. 处理激活生成的新管理员账号（停用或归入NULL域）；
3. 确认稳定后，把本次实际执行的 DDL/步骤回写到本文档形成"升级实录"。

### 回滚方案（任一环节失败时）

- DDL 阶段失败：本方案 DDL 只增不减，旧代码不识别新列/新表也不受影响 → **直接重启旧版后端即可恢复服务**，无需还原数据库；
- 新代码上线后发现数据异常：停新服务 → 用"阶段2-第2步"的备份还原数据库 → 启旧版后端 → 恢复旧前端目录。

---

## 八、本地构建与上传规范（不在宝塔构建）

| 产物 | 本地构建命令 | 上传内容 | 服务器动作 |
|------|-------------|---------|-----------|
| CRM前端 | 项目根目录 `npm run build`（注意配置生产 `.env.production` 的 API 地址） | `dist/` 整个目录 | 替换 Nginx 站点目录 |
| 后端 | `backend/` 下 `npm run build`（即 `tsc`） | `dist/` + `package.json` + `package-lock.json` + 必要的非TS资源 | `npm ci --omit=dev` 后 `pm2 start dist/app.js` |
| admin管理后台 | **不部署**（平台方功能，留在B站点） | — | — |
| website官网 | **不部署** | — | — |
| crmAPP/小程序 | **不部署在A站点**（独立发布渠道） | — | — |

**关键注意**：
1. **Node 版本**：后端 `engines` 要求 **Node >= 22**。A站点先确认/升级 Node 版本（宝塔 Node 版本管理器），旧版可能跑在老 Node 上。
2. **node_modules 不要从 Windows 上传**：bcrypt、sharp 等原生模块平台相关。在服务器 `npm ci --omit=dev`（只装生产依赖，2核2G没问题；如服务器外网慢，配 npm 国内镜像）。
3. 前端构建产物里写死的 API 地址：本地构建前检查 `.env.production`（`VITE_API_BASE_URL` 等指向A站点自己的域名/端口）。
4. 保留旧前端目录改名备份（如 `dist_old_20260611`），便于秒级回滚。

---

## 九、服务器与环境配置清单（2核2G专项）

### 9.1 `.env`（后端）要点

```ini
# 部署模式（核心）
DEPLOY_MODE=private

# 数据库：沿用A站点现有库
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=<A站点库名>
DB_USERNAME=...
DB_PASSWORD=...
DB_CHARSET=utf8mb4
DB_TIMEZONE=+08:00

# 沿用旧站点的JWT密钥（避免不必要的全员掉线；换掉也可以，影响仅为全员重新登录）
JWT_SECRET=<沿用A站点旧值>

# 授权与中央服务器（指向B站点/管理后台域名）
LICENSE_KEY=PRIVATE-XXXX-XXXX-XXXX-XXXX     # B站点管理后台生成
LICENSE_SERVER=https://<B站点管理后台域名>
CENTRAL_ADMIN_URL=https://<B站点管理后台域名>

# 其他按需：短信(sms_config走库内配置)、支付、企微等，A站点用不到的留空即可
NODE_ENV=production
PORT=<后端端口>
```

### 9.2 资源优化（必做）

1. **swap**：2G内存必加 2~4G swap（`fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile`，写入 fstab）。新版后端常驻多个定时调度器+WebSocket，冷启动和高峰需要余量。
2. **MySQL 调参**（宝塔 my.cnf）：`innodb_buffer_pool_size=256M`（默认可能过大或过小）、`max_connections=100`、关闭 `performance_schema`（=OFF，省~200MB）。
3. **PM2**：`pm2 start dist/app.js --name crm-backend --max-memory-restart 700M`；日志轮转 `pm2 install pm2-logrotate`（40G磁盘防爆）。
4. **磁盘**：升级前清理旧日志/旧备份；数据库备份定时任务生成的文件要自动传出+本地仅留最近2份。

### 9.3 Nginx 要点（对比旧版需新增）

1. **WebSocket 反代**（新版消息推送/在线席位依赖）：`location /ws` 或对应路径加 `proxy_http_version 1.1; proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "upgrade";`
2. 前端 history 路由回退 `try_files $uri $uri/ /index.html;`（旧版应已有）；
3. 上传文件大小 `client_max_body_size`（与旧版对齐或加大）；
4. 静态资源缓存策略：`index.html` 不缓存（`no-cache`），带hash的 js/css 长缓存——避免升级后用户拿到旧页面（升级后通知用户强刷一次）。

---

## 十、升级后验证清单

- [ ] 登录页显示"已激活/企业信息"，授权码只在首次输入过一次
- [ ] **旧管理员账号**登录成功
- [ ] 客户列表：数量与升级前一致（升级前记录各核心表 `SELECT COUNT(*)` 基线：customers/orders/users/follow_up_records 等，升级后比对）
- [ ] 订单列表、订单详情、编辑保存正常
- [ ] 业绩统计（个人/团队）数字正常
- [ ] 上传文件/头像/图片历史可访问（uploads 目录路径没变）
- [ ] 新模块开箱可用：短信管理（额度/模板/自动发送）、物流面单打印、服务管理等
- [ ] 角色权限菜单正常（不正常则执行 `private-deploy/合集` 内权限迁移SQL）
- [ ] WebSocket 正常（右上角消息铃铛/实时通知）
- [ ] PM2 内存稳定（观察 30 分钟无重启）
- [ ] 数据库无报错日志（`backend/logs/error.log`）

---

## 十一、你可能没想到的事项（补充提醒）

1. **旧表主键/字段类型差异**：旧版部分表结构可能与新实体定义有类型出入（如长度、enum取值）。方法二第3条查询的结果必须逐条人工过，**宁可不改也不要盲改类型**——新代码对旧类型通常兼容。
2. **非实体表**：`system_config`、`notifications`、`license_logs`、`payment_orders` 等部分表由原生SQL维护，结构对比时不要只看 entities 目录，以B站点库导出为准（方法一天然覆盖）。
3. **种子/字典数据**：新功能依赖的初始数据不在DDL里——权限菜单、角色模板、预设短信模板、额度套餐(若需)、订单状态配置等。演练阶段把"哪些页面空白/报错"记下来，逐个补种子SQL（仓库 `backend/migrations`、`private-deploy/合集` 里已有部分现成脚本）。
4. **定时任务的资源消耗**：新版启动即运行多个调度器（授权同步30分钟/次、短信自动发送每小时、业绩报表、消息清理、物流同步等）。2核2G下首日重点观察 CPU/内存曲线。
5. **A站点与B站点的"管理后台管控"关系**：A站点配置指向B站点后，B站点管理后台可对A站点做授权管理/配置下发；如果你不希望A站点被统一管控，`LICENSE_SERVER` 之外的管控相关配置不要开启。
6. **HTTPS 与混合内容**：新前端如有调用 WebSocket（wss）/第三方资源，证书域名要覆盖。
7. **时区**：确认服务器系统时区、MySQL `time_zone`、`.env DB_TIMEZONE=+08:00` 三者一致，否则统计报表日期会错位。
8. **浏览器本地缓存**：新前端的 localStorage 键与旧版不同（如列设置、租户编码缓存）。升级后个别用户如界面异常，先指导"清缓存/强刷"。
9. **磁盘水位线**：40G盘，升级当天会同时存在【旧代码+新代码+两份数据库备份+node_modules】，动手前先确认剩余空间 ≥ 10G。
10. **不要在A站点保留 git 仓库整库**（节省空间+安全），只传构建产物。
11. **升级不可贪多**：本次只做"代码升级+私有激活"，不要同时改域名、改端口、迁移服务器——一次只变一件事，出问题才好定位。
12. **长期建议**：A站点配置过低，后续若业务增长建议升配到 2核4G 起步；或者评估把A站点客户整体迁入B站点作为一个SaaS租户（那是另一个专门的数据迁移方案，需要把 NULL 数据归属到具体租户ID，与本次升级方向相反，勿混淆）。

---

## 十二、信息备忘

- 旧版本基线提交：`78d5e63beb78be9accdeae79ed8da7fe15d76e04`（多租户改造前的完整备份 - 2026-03-02）
- 关键代码位置（供执行时查阅）：
  - 部署模式：`backend/src/config/deploy.ts`（`DEPLOY_MODE` / `LICENSE_KEY` / `LICENSE_SERVER`）
  - 私有激活与授权验证：`backend/src/routes/tenantLicense.ts`（`PRIVATE-` 前缀查本地 licenses 表，首次激活建 tenants 记录+默认管理员）
  - 登录页授权交互：`src/views/Login.vue`（私有模式默认授权码输入，激活后自动免输）
  - 租户过滤核心：`backend/src/utils/tenantContext.ts`（`getTenantFilter`：无租户上下文且私有模式 → 查 `tenant_id IS NULL`）
  - 授权同步调度：`backend/src/services/LicenseSyncScheduler.ts`（每30分钟在线核验）
  - tenant_id 批量加列参考：`backend/src/scripts/add-tenant-id-columns.sql`
- 既有部署文档（可配合使用）：`private-deploy/核心文档/multi-site-deploy-guide.md`、`install.sh`、`nginx.conf.template`、`delivery-guide.md`

> 下一步行动建议：先做第四节的结构差异导出与对比（只读操作，零风险），把差异DDL整理出来后，再按阶段0开始演练。需要我协助生成差异DDL审查清单或演练环境搭建脚本时再继续。
