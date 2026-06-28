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

---

## 十三、自动化数据库自检补全机制（已实现）

> 更新日期：2026-06-28
> 结论：**不需要手动编写差异DDL**，后端启动时已自带完善的自动迁移服务

### 13.1 已有机制分析

代码中已存在 `AutoMigrationService`（`backend/src/services/AutoMigrationService.ts`），在后端启动时通过 `initializeDatabase()` 自动执行，核心原则：

| 原则 | 说明 |
|------|------|
| 只增不删 | 永远不删除表、列、索引 |
| 只建不改 | 永远不修改已有列的类型、约束 |
| 幂等执行 | 多次执行结果一致，已有就跳过 |
| 完整记录 | 所有变更记录到 `migration_history` 表 |
| 可关闭 | 通过 `AUTO_MIGRATION=false` 关闭（默认开启） |

### 13.2 启动时自动执行流程

后端 `initializeDatabase()` 依次执行三层防护：

```
启动
 ├── 第1层：initOrderSettingsSchema()
 │     └── 确保 department_order_limits / payment_method_options / system_configs 表结构
 ├── 第2层：initSensitiveInfoPermissionsSchema()
 │     └── 确保 sensitive_info_permissions 表有 tenant_id 列和正确索引
 └── 第3层：autoMigrationService.run()
       ├── 3.1 确保 migration_history 表存在
       ├── 3.2 生产环境首次执行前自动备份当前表结构（存到 backups/schema-backups/）
       ├── 3.3 基于192个实体元数据自动创建缺失表（先建表，确保SQL迁移依赖的表存在）
       ├── 3.4 基于实体元数据自动补全缺失字段（含所有表的 tenant_id）
       ├── 3.5 执行 database-migrations/*.sql（11个迁移文件，表已就位不会报错）
       └── 3.6 基于实体元数据自动创建缺失索引
```

### 13.3 A 站点启动时预期行为

旧数据库缺少的所有新表和新字段都会被自动创建/补全：

| 类别 | 预计自动创建内容 | 数据影响 |
|------|-----------------|---------|
| 新表 (~50+张) | tenants、licenses、product_skus、product_spec_groups、stock_adjustments、wecom_*、sms_*、在线席位、额度套餐等 | 新建空表，不影响旧数据 |
| 旧表新字段 | 所有表的 `tenant_id`、products 的 `sku_type/min_price/max_price/total_stock`、order_items 的 `sku_id/sku_name/sku_image/spec_values` 等 | 新字段默认 NULL，旧行不受影响 |
| 索引 | 各表的 tenant_id 索引、SKU 关联索引等 | 建索引不影响数据 |

**旧数据的 `tenant_id` 全部为 NULL → 私有模式下查询 `tenant_id IS NULL` → 旧数据天然可见，无需任何数据迁移。**

---

## 十四、关于授权问题的明确回答

### 14.1 是否需要在 B 站点生成私有部署授权码？

**需要。** 流程如下：

1. 在 B 站点管理后台（`admin.yunkes.com`）→ 私有客户管理 → 新增私有客户（填写 A 站点企业信息）
2. 为该客户生成授权码（`PRIVATE-XXXX-XXXX-XXXX-XXXX` 格式）
3. A 站点部署新代码后，首次打开登录页会显示授权码输入框
4. 输入授权码 → 系统激活 → 自动创建私有租户记录 + 新管理员账号
5. **激活一次后永久生效**，后续登录不再需要输入授权码

### 14.2 激活后的关键账号处理

| 账号 | tenant_id | 能看到什么 |
|------|-----------|-----------|
| **A站点原有的所有老账号** | NULL | **全部旧生产数据** ✅ |
| 激活时自动创建的新管理员 | 新租户ID | 空数据系统 ❌ |

**操作建议**：
- 日常一律用**原有老账号**登录，旧数据全部可见
- 激活产生的新管理员直接停用或删除
- 如需统一，可执行：`UPDATE users SET tenant_id = NULL WHERE id = '<新管理员ID>';`

### 14.3 可否不配置授权（离线使用）？

可以。如果 A 站点完全内网、不连 B 站点：
- `.env` 中 `LICENSE_SERVER` 和 `CENTRAL_ADMIN_URL` 留空或删除
- 使用仓库内 `backend/scripts/generate-saas-license.js` 离线生成授权记录直接插入本地 `licenses` 表
- 授权同步调度器（每30分钟）检测不到中央服务器时会静默跳过，不影响使用

---

## 十五、关于删除官网/管理后台项目目录的回答

### 15.1 服务器上可以删除哪些目录？

**A 站点是私有部署自用的 CRM，只需要 CRM 前端 + 后端。** 以下目录可以安全删除或不部署：

| 目录 | 作用 | 是否需要部署到 A 站点 | 删除影响 |
|------|------|---------------------|---------|
| `dist/` (CRM前端) | CRM 主应用 | ✅ **必须** | 不能删 |
| `backend/` | 后端服务 | ✅ **必须** | 不能删 |
| `website/` | 官方网站 | ❌ **不需要** | 无影响 |
| `admin/` | 管理后台 | ❌ **不需要** | 无影响 |
| `h5/` | 企微H5移动端 | ❌ **不需要**（除非用企微） | 无影响 |
| `src/` | 前端源码 | ❌ **不需要** | 无影响 |
| `node_modules/` (根目录) | 前端依赖 | ❌ **不需要** | 无影响 |
| `.git/` | Git仓库 | ❌ **建议删除**（节省空间+安全） | 无影响 |

### 15.2 推荐的 A 站点目录结构

```
/www/wwwroot/CRM-A/
├── dist/                   # CRM前端构建产物（本地构建后上传）
│   ├── index.html
│   └── assets/
├── backend/
│   ├── dist/               # 后端编译产物（本地构建后上传）
│   ├── database-migrations/ # SQL迁移文件（必须上传！）
│   ├── node_modules/       # 服务器上 npm ci 安装
│   ├── package.json
│   ├── package-lock.json
│   ├── .env                # 生产环境配置
│   ├── uploads/            # 上传文件目录（保留原有）
│   ├── recordings/         # 录音文件目录（保留原有）
│   └── logs/               # 日志目录
└── (其他文件不需要)
```

### 15.3 删除多余目录不会影响后端运行吗？

**不会。** 后端代码中不依赖 `website/`、`admin/` 等目录。后端只需要：
- 自身的 `dist/`（编译后的 JS）
- `node_modules/`（运行时依赖）
- `database-migrations/`（SQL迁移文件）
- `uploads/` 和 `recordings/`（用户数据）
- `.env`（配置文件）

---

## 十六、完整的每一步操作指南

> 以下假设 A 站点域名为 `a-crm.example.com`，项目路径为 `/www/wwwroot/CRM-A`，后端端口 `3000`
> 请根据实际情况替换

### 第1步：本地构建（在 Windows 开发机上操作）

#### 1.1 构建 CRM 前端

```bash
# 进入项目根目录
cd "D:\kaifa\CRM - 1.8.0"

# 修改前端生产环境配置（重要！）
# 编辑 .env.production，确保以下内容：
```

`.env.production` 文件内容（A 站点专用）：
```ini
# 生产环境配置
VITE_API_BASE_URL=/api/v1
NODE_ENV=production

# ⚠️ A站点是私有部署，必须改为 private！
VITE_DEPLOY_MODE=private
```

```bash
# 安装依赖（如果没安装过）
npm install

# 构建前端
npm run build

# 构建完成后 dist/ 目录就是要上传的前端产物
```

#### 1.2 构建后端

```bash
cd backend

# 安装依赖（如果没安装过）
npm install

# 构建后端（TypeScript 编译为 JavaScript）
npm run build

# 构建完成后 backend/dist/ 就是编译产物
```

#### 1.3 打包待上传文件

需要上传到 A 站点的文件清单：

| 本地路径 | 上传到服务器路径 | 说明 |
|---------|----------------|------|
| `dist/` 整个目录 | `/www/wwwroot/CRM-A/dist/` | CRM 前端 |
| `backend/dist/` 整个目录 | `/www/wwwroot/CRM-A/backend/dist/` | 后端编译产物 |
| `backend/package.json` | `/www/wwwroot/CRM-A/backend/package.json` | 依赖清单 |
| `backend/package-lock.json` | `/www/wwwroot/CRM-A/backend/package-lock.json` | 锁定版本 |
| `backend/database-migrations/` 整个目录 | `/www/wwwroot/CRM-A/backend/database-migrations/` | SQL迁移文件 |

**不要上传**：`node_modules/`、`src/`、`.git/`、`website/`、`admin/`

---

### 第2步：备份 A 站点（在服务器上操作）

```bash
# SSH 登录 A 站点服务器

# 1. 备份数据库（最重要！）
mysqldump -u<用户名> -p --single-transaction --routines --triggers <A站点数据库名> | gzip > /root/backup_a_$(date +%F).sql.gz

# 2. 备份上传文件
tar czf /root/backup_uploads_$(date +%F).tar.gz /www/wwwroot/CRM-A/backend/uploads/

# 3. 备份旧前端（秒级回滚用）
mv /www/wwwroot/CRM-A/dist /www/wwwroot/CRM-A/dist_old_backup

# 4. 备份旧后端
cp -r /www/wwwroot/CRM-A/backend/dist /www/wwwroot/CRM-A/backend/dist_old_backup

# 5. 备份旧 .env
cp /www/wwwroot/CRM-A/backend/.env /www/wwwroot/CRM-A/backend/.env.backup

# 6. 将数据库备份下载到本地（防服务器故障）
# 在本地执行: scp root@A站点IP:/root/backup_a_*.sql.gz ./
```

---

### 第3步：停止旧服务

```bash
# 停止后端进程
pm2 stop crm-backend 2>/dev/null || true

# 确认已停
pm2 status
```

---

### 第4步：上传新代码

通过宝塔面板文件管理器、SFTP、或 scp 上传：

```bash
# 本地执行（或用宝塔面板上传）

# 上传前端产物
scp -r dist/* root@A站点IP:/www/wwwroot/CRM-A/dist/

# 上传后端编译产物
scp -r backend/dist/* root@A站点IP:/www/wwwroot/CRM-A/backend/dist/

# 上传 package.json 和 lock 文件
scp backend/package.json backend/package-lock.json root@A站点IP:/www/wwwroot/CRM-A/backend/

# 上传迁移文件（关键！自动建表依赖这些文件）
scp -r backend/database-migrations root@A站点IP:/www/wwwroot/CRM-A/backend/
```

---

### 第5步：服务器上安装后端依赖

```bash
# SSH 到 A 站点服务器
cd /www/wwwroot/CRM-A/backend

# 确认 Node 版本 >= 22
node --version
# 如果版本不够，在宝塔 → 软件商店 → Node.js版本管理器 → 安装 Node 22.x

# 安装生产依赖（不要从 Windows 上传 node_modules！）
npm ci --omit=dev

# 如果网速慢，使用国内镜像
npm ci --omit=dev --registry https://registry.npmmirror.com
```

---

### 第6步：配置后端 .env

编辑 `/www/wwwroot/CRM-A/backend/.env`：

```ini
# ==================== 核心配置 ====================
NODE_ENV=production
PORT=3000
API_PREFIX=/api/v1

# ⚠️ 部署模式：A站点私有部署，必须是 private
DEPLOY_MODE=private

# ==================== 数据库配置 ====================
# 沿用 A 站点原有的数据库连接（不要改！）
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=<A站点原数据库名>
DB_USERNAME=<A站点原数据库用户>
DB_PASSWORD=<A站点原数据库密码>
DB_CHARSET=utf8mb4
DB_TIMEZONE=+08:00

# ==================== JWT 配置 ====================
# ⚠️ 沿用 A 站点旧的 JWT_SECRET（避免全员掉线）
JWT_SECRET=<沿用A站点旧值>
JWT_REFRESH_SECRET=<沿用A站点旧值>
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d
BCRYPT_ROUNDS=12

# ==================== CORS 配置 ====================
# 只需要 A 站点自己的域名
CORS_ORIGIN=https://a-crm.example.com
CORS_CREDENTIALS=true

# ==================== 授权配置（二选一）====================
# 方案A：连接 B 站点在线授权（推荐）
LICENSE_KEY=PRIVATE-XXXX-XXXX-XXXX-XXXX
LICENSE_SERVER=https://api.yunkes.com
CENTRAL_ADMIN_URL=https://admin.yunkes.com

# 方案B：离线使用（不连 B 站点）
# LICENSE_KEY=（留空或删除）
# LICENSE_SERVER=（留空或删除）
# CENTRAL_ADMIN_URL=（留空或删除）

# ==================== 文件与日志 ====================
UPLOAD_MAX_SIZE=10485760
UPLOAD_ALLOWED_TYPES=image/jpeg,image/png,image/gif,application/pdf
LOG_LEVEL=info
LOG_FILE_PATH=./logs
LOG_MAX_SIZE=20m
LOG_MAX_FILES=14d

# ==================== 资源优化（2核2G必配）====================
# 数据库连接池（小服务器调小）
DB_CONNECTION_LIMIT=20

# ==================== 安全配置 ====================
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=3000

# ==================== 自动迁移（默认开启，不要关！）====================
# AUTO_MIGRATION=true  # 默认开启，无需显式设置
# 设为 false 可关闭：AUTO_MIGRATION=false

# ==================== 以下按需配置（不用的留空）====================
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=

EXPRESS_API_CUSTOMER=
EXPRESS_API_KEY=
```

**重要区别对比：**

| 配置项 | A 站点（私有部署） | B 站点（SaaS） |
|--------|-------------------|---------------|
| `DEPLOY_MODE` | `private` | `saas` |
| `CORS_ORIGIN` | 只有 A 站点域名 | 多个域名 |
| `LICENSE_KEY` | B站点生成的授权码 | 不需要 |
| `LICENSE_SERVER` | 指向 B 站点 API | 不需要 |
| `DB_DATABASE` | A 站点自己的库 | B 站点自己的库 |

---

### 第7步：资源优化（2核2G 必做）

```bash
# 1. 添加 swap（2G内存必须加）
fallocate -l 4G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile

# 写入 fstab 使重启后生效
echo '/swapfile swap swap defaults 0 0' >> /etc/fstab

# 验证
free -h

# 2. MySQL 调参（宝塔 → MySQL → 配置修改 → my.cnf）
# 找到 [mysqld] 段，添加/修改：
# innodb_buffer_pool_size=256M
# max_connections=100
# performance_schema=OFF
```

---

### 第8步：启动后端

```bash
cd /www/wwwroot/CRM-A/backend

# 启动后端（PM2 管理，限制内存防 OOM）
pm2 start dist/app.js --name crm-backend --max-memory-restart 700M

# 查看启动日志（重点关注自动迁移输出）
pm2 logs crm-backend --lines 100
```

**启动日志中应该看到类似输出（自动迁移正在工作）：**

```
╔══════════════════════════════════════════════════╗
║       数据库自动迁移服务启动                      ║
╚══════════════════════════════════════════════════╝
📦 [自动迁移] 首次执行，开始备份当前数据库结构...
✅ [自动迁移] 结构备份完成: backups/schema-backups/schema-2026-06-28T... (35 张表)
🔍 [自动迁移] 扫描 192 个实体，检查缺失表...
  📦 新建表: tenants
  📦 新建表: licenses
  📦 新建表: private_customers
  📦 新建表: wecom_configs
  📦 新建表: product_skus
  📦 新建表: product_spec_groups
  📦 新建表: stock_adjustments
  ...（自动创建所有缺失表）
✅ [自动迁移] 新建了 XX 张表
  ➕ 补字段: customers.tenant_id
  ➕ 补字段: orders.tenant_id
  ➕ 补字段: users.tenant_id
  ➕ 补字段: products.sku_type
  ➕ 补字段: products.min_price
  ...（自动补全所有缺失字段）
✅ [自动迁移] 补全了 XX 个字段
📋 [自动迁移] 发现 11 个待执行的SQL迁移文件
  📄 执行SQL迁移: 20260505-add-mp-callback-fields.sql
  ✅ 迁移完成: 20260505-add-mp-callback-fields.sql
  ...
  📄 执行SQL迁移: 20260627-add-product-sku-tables.sql
  ✅ 迁移完成: 20260627-add-product-sku-tables.sql
  🔑 建索引: ...
╔══════════════════════════════════════════════════╗
║  自动迁移完成 (XXXXms)                           ║
╚══════════════════════════════════════════════════╝
```

```bash
# 确认后端运行正常
pm2 status

# 设置开机自启
pm2 save
pm2 startup
```

---

### 第9步：配置 Nginx

A 站点只需要**一个站点配置**（CRM 主应用），不需要官网、管理后台、API 独立域名。

在宝塔面板 → 网站 → A 站点 → 配置文件，修改为：

```nginx
server {
    listen 80;
    # ⬇️ 替换为 A 站点实际域名
    server_name a-crm.example.com;

    # ⬇️ 替换为 A 站点实际前端目录
    root /www/wwwroot/CRM-A/dist;
    index index.html;

    # 文件上传大小限制
    client_max_body_size 50m;

    # Gzip 压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    gzip_min_length 1000;
    gzip_comp_level 6;

    # ==================== API 反向代理 ====================
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
        proxy_buffering off;
    }

    # ==================== WebSocket 代理 ====================
    location /socket.io/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 86400s;
    }

    location /ws/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400s;
    }

    # ==================== 上传文件访问 ====================
    # ^~ 确保优先于任何正则匹配
    location ^~ /uploads/ {
        # ⬇️ 替换为实际路径
        alias /www/wwwroot/CRM-A/backend/uploads/;
        expires 7d;
        add_header Cache-Control "public";
        add_header Access-Control-Allow-Origin *;
    }

    # 录音文件
    location ^~ /recordings/ {
        # ⬇️ 替换为实际路径
        alias /www/wwwroot/CRM-A/backend/recordings/;
        expires 7d;
        add_header Cache-Control "public";
    }

    # 前端构建产物缓存（带 hash 的 assets 文件长缓存）
    location ^~ /assets/ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # 健康检查
    location /health {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
    }

    # ==================== 前端路由 ====================
    # Vue Router history 模式支持（必须放在最后）
    location / {
        try_files $uri $uri/ /index.html;
    }

    # ==================== 安全配置 ====================
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }

    location ~* \.(env|env\..*|sql|md|sh|bat|ps1|conf)$ {
        deny all;
    }

    location ~ /node_modules/ {
        deny all;
    }
}
```

**宝塔面板特别注意事项（必做）：**

1. **修改 `root`** 为 `/www/wwwroot/CRM-A/dist`（宝塔默认是 `public`，必须改！）
2. **修改 `index`** 行，只保留 `index.html index.htm`，删掉 `index.php`、`default.php`
3. **删除** `#PHP-INFO-START` 到 `#PHP-INFO-END` 之间的全部内容（含 `include enable-php-XX.conf`）
4. **删除** `#ERROR-PAGE-START` 到 `#ERROR-PAGE-END` 之间的全部内容
5. **删除** 宝塔自动生成的静态资源缓存规则：
   ```nginx
   # 删除这两段！否则图片加载失败
   location ~ .*\.(gif|jpg|jpeg|png|bmp|swf)$ { ... }
   location ~ .*\.(js|css)?$ { ... }
   ```
6. **保留** 宝塔的 SSL 配置（`#SSL-START` 到 `#SSL-END`）

```bash
# 验证并重载配置
nginx -t && nginx -s reload
```

如果有 SSL 证书，宝塔面板 → 站点设置 → SSL → 申请 Let's Encrypt 免费证书后，80 端口会自动跳转 443。

---

### 第10步：首次激活与登录

1. 浏览器访问 `https://a-crm.example.com`（或你的 A 站点域名）
2. 看到登录页 → 显示**授权码输入框**（因为是首次激活）
3. 输入 B 站点管理后台生成的授权码 `PRIVATE-XXXX-XXXX-XXXX-XXXX`
4. 激活成功 → 页面显示企业信息
5. **用 A 站点原有的老账号登录**（不要用激活生成的新管理员！）
6. 登录后验证旧数据是否全部可见

### 第11步：升级后验证清单

- [ ] 登录页显示"已激活"，授权码只输入过一次
- [ ] **旧管理员账号**登录成功
- [ ] 客户列表数量与升级前一致
- [ ] 订单列表、订单详情正常
- [ ] 业绩统计数字正常
- [ ] 上传的文件/图片历史正常显示（uploads 目录路径没变）
- [ ] SKU 商品功能正常（新功能）
- [ ] WebSocket 正常（右上角消息铃铛）
- [ ] PM2 内存稳定（观察 30 分钟无重启）：`pm2 monit`
- [ ] 无错误日志：`tail -50 /www/wwwroot/CRM-A/backend/logs/error.log`

---

### 第12步：清理与收尾

```bash
# 1. 处理激活产生的新管理员（推荐停用）
# 在 MySQL 中查看：
# SELECT id, username, tenant_id FROM users WHERE tenant_id IS NOT NULL;
# 选择删除或归入 NULL 域：
# UPDATE users SET tenant_id = NULL WHERE id = '<新管理员ID>';

# 2. 删除服务器上不需要的目录（如果有的话）
rm -rf /www/wwwroot/CRM-A/website
rm -rf /www/wwwroot/CRM-A/admin
rm -rf /www/wwwroot/CRM-A/h5
rm -rf /www/wwwroot/CRM-A/src
rm -rf /www/wwwroot/CRM-A/.git
rm -rf /www/wwwroot/CRM-A/node_modules  # 根目录的前端依赖

# 3. 设置日志轮转（40G磁盘防爆）
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 50M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true

# 4. 删除旧备份（确认新版稳定运行48小时后）
# rm -rf /www/wwwroot/CRM-A/dist_old_backup
# rm -rf /www/wwwroot/CRM-A/backend/dist_old_backup
```

---

## 十七、回滚方案（出问题时用）

### 情况1：新代码启动后发现问题

```bash
# 停新服务
pm2 stop crm-backend

# 恢复旧后端
rm -rf /www/wwwroot/CRM-A/backend/dist
mv /www/wwwroot/CRM-A/backend/dist_old_backup /www/wwwroot/CRM-A/backend/dist

# 恢复旧前端
rm -rf /www/wwwroot/CRM-A/dist
mv /www/wwwroot/CRM-A/dist_old_backup /www/wwwroot/CRM-A/dist

# 恢复旧 .env
cp /www/wwwroot/CRM-A/backend/.env.backup /www/wwwroot/CRM-A/backend/.env

# 启动旧服务
pm2 start dist/app.js --name crm-backend
```

注意：自动迁移添加的新表和新字段不会影响旧代码运行（旧代码不识别新列/新表，但也不会报错）。

### 情况2：数据库异常需要完全恢复

```bash
# 停服务
pm2 stop crm-backend

# 恢复数据库
gunzip < /root/backup_a_YYYY-MM-DD.sql.gz | mysql -u<用户名> -p <A站点数据库名>

# 恢复旧代码+旧配置（同情况1）
# 启动旧服务
```

---

## 十八、常见问题 FAQ

### Q1：升级后原来的数据会丢失吗？
**不会。** 自动迁移只增不减，不删除任何表、列或数据。旧数据 `tenant_id` 为 NULL，私有模式下天然可见。

### Q2：升级后原来的账号还能登录吗？
**可以。** 旧账号的 `tenant_id` 为 NULL，私有模式下正常匹配。JWT_SECRET 沿用旧值则不会强制重新登录。

### Q3：授权码过期或 B 站点不可达会怎样？
首次激活成功后，系统会在本地 `licenses` 表记录激活状态。即使 B 站点不可达，A 站点也能正常使用。授权同步调度器（每30分钟）检测失败时只是日志报 warn，不影响业务。

### Q4：新版本比旧版本多很多功能模块（短信、企微等），不用的模块会有影响吗？
**不会影响。** 不使用的模块只是菜单存在但功能空置。后端对应的定时任务检测到无配置时会自动跳过。如果不想看到多余菜单，可在系统设置 → 权限管理中隐藏。

### Q5：2核2G 服务器真的能跑新版吗？
**偏紧但可用。** 必须做第7步的资源优化（加 swap、调 MySQL、PM2 限制内存）。建议后续升配到 2核4G。

### Q6：`index.html` 用户浏览器有缓存怎么办？
Nginx 配置中 `location /` 的 `try_files` 不带缓存头，`index.html` 默认不缓存。但带 hash 的 `assets/` 文件有长缓存。升级后通知用户 **Ctrl+F5 强刷** 一次即可。如仍异常，清浏览器 localStorage。

### Q7：要不要把旧数据的 tenant_id 都改成新租户 ID？
**绝对不要！** 这是红线。一百多张表逐一更新极易遗漏，出错就是"数据消失"。保持 NULL 是最安全的方案，私有部署模式下完美工作。
