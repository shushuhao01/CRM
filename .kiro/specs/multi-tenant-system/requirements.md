# 多租户系统需求文档

## 介绍

本文档定义了CRM系统的多租户功能需求。系统已完成数据库改造（18个核心业务表已添加tenant_id字段和索引），现需要实现完整的多租户功能，支持私有部署和SaaS两种部署模式。

## 术语表

- **Tenant（租户）**: 使用系统的独立组织或企业，拥有独立的数据空间和配置
- **Tenant_ID（租户标识）**: 唯一标识租户的UUID字符串
- **Private_Mode（私有部署模式）**: 单租户部署模式，tenant_id为NULL，所有数据共享
- **SaaS_Mode（SaaS模式）**: 多租户部署模式，每个租户有独立的tenant_id，数据完全隔离
- **Tenant_Auth_Middleware（租户认证中间件）**: 识别和验证租户身份的中间件组件
- **Base_Repository（基础仓储）**: 自动处理租户数据隔离的数据访问层基类
- **Admin_System（Admin后台）**: 管理所有租户的超级管理系统
- **CRM_System（CRM系统）**: 租户使用的业务系统
- **Tenant_Identifier（租户识别器）**: 从请求中提取租户标识的组件
- **Data_Isolation（数据隔离）**: 确保租户之间数据不可见的机制
- **License_Key（授权码）**: 租户访问系统的授权凭证

## 需求

### 需求 1: 租户实体管理

**用户故事**: 作为系统管理员，我需要管理租户的基本信息和状态，以便控制租户的访问权限和资源配置。

#### 验收标准

1. THE Tenant_Entity SHALL包含以下字段：id（UUID主键）、name（租户名称）、code（租户代码）、status（状态：active/inactive/expired）、license_key（授权码）、expire_date（过期时间）、max_users（最大用户数）、max_storage_gb（最大存储空间GB）、contact_name（联系人）、contact_phone（联系电话）、contact_email（联系邮箱）、created_at（创建时间）、updated_at（更新时间）
2. THE Tenant_Entity SHALL使用UUID作为主键
3. THE Tenant_Entity SHALL对tenant_code字段创建唯一索引
4. THE Tenant_Entity SHALL对license_key字段创建唯一索引
5. WHEN创建租户时，THE System SHALL自动生成UUID和license_key
6. THE System SHALL将Tenant实体注册到TypeORM配置中

### 需求 2: 租户配置管理

**用户故事**: 作为系统管理员，我需要为每个租户配置独立的系统参数，以便满足不同租户的个性化需求。

#### 验收标准

1. THE Tenant_Settings_Entity SHALL包含以下字段：id（主键）、tenant_id（租户ID外键）、config_key（配置键）、config_value（配置值JSON）、description（描述）、created_at、updated_at
2. THE Tenant_Settings_Entity SHALL对(tenant_id, config_key)创建唯一复合索引
3. THE System SHALL支持以下配置项：theme（主题配置）、logo（Logo URL）、features（功能开关JSON）、integrations（第三方集成配置）
4. WHEN查询租户配置时，THE System SHALL返回该租户的所有配置项
5. WHEN租户配置不存在时，THE System SHALL返回系统默认配置

### 需求 3: 租户识别策略

**用户故事**: 作为开发者，我需要系统能够从请求中识别租户身份，以便实现数据隔离。

#### 验收标准

1. WHEN在SaaS_Mode下，THE Tenant_Identifier SHALL从JWT Token的tenantId字段提取租户标识
2. WHEN在Private_Mode下，THE Tenant_Identifier SHALL返回undefined作为租户标识
3. THE Tenant_Identifier SHALL支持从HTTP Header的X-Tenant-ID字段提取租户标识（备用方案）
4. WHEN无法识别租户且在SaaS_Mode下，THE System SHALL返回403错误和"租户信息缺失"消息
5. THE Tenant_Identifier SHALL将识别的tenant_id注入到Request对象的tenantId属性

### 需求 4: 租户认证中间件增强

**用户故事**: 作为开发者，我需要增强现有的租户认证中间件，以便验证租户状态和权限。

#### 验收标准

1. WHEN在SaaS_Mode下，THE Tenant_Auth_Middleware SHALL查询Tenant实体验证租户存在性
2. WHEN租户不存在时，THE Tenant_Auth_Middleware SHALL返回403错误和"租户不存在"消息
3. WHEN租户状态为inactive时，THE Tenant_Auth_Middleware SHALL返回403错误和"租户已被禁用"消息
4. WHEN租户已过期（expire_date < 当前时间）时，THE Tenant_Auth_Middleware SHALL返回403错误和"租户已过期，请联系管理员续费"消息
5. WHEN租户验证通过时，THE Tenant_Auth_Middleware SHALL将租户信息注入到Request对象的tenantInfo属性
6. WHEN在Private_Mode下，THE Tenant_Auth_Middleware SHALL跳过租户验证逻辑

### 需求 5: 基础仓储数据隔离

**用户故事**: 作为开发者，我需要一个基础仓储类自动处理租户数据隔离，以便避免在每个查询中手动添加tenant_id过滤。

#### 验收标准

1. THE Base_Repository SHALL提供find方法，自动添加tenant_id过滤条件
2. THE Base_Repository SHALL提供findOne方法，自动添加tenant_id过滤条件
3. THE Base_Repository SHALL提供save方法，自动设置tenant_id字段
4. THE Base_Repository SHALL提供update方法，自动添加tenant_id过滤条件
5. THE Base_Repository SHALL提供delete方法，自动添加tenant_id过滤条件
6. WHEN在Private_Mode下，THE Base_Repository SHALL不添加tenant_id过滤条件（查询tenant_id IS NULL的数据）
7. WHEN在SaaS_Mode下，THE Base_Repository SHALL添加tenant_id = 当前租户ID的过滤条件
8. THE Base_Repository SHALL从Request上下文获取当前租户ID
9. THE Base_Repository SHALL支持原生SQL查询的租户隔离

### 需求 6: 租户登录接口

**用户故事**: 作为租户用户，我需要使用租户授权码登录系统，以便访问我的租户数据。

#### 验收标准

1. THE Login_API SHALL接受以下参数：username（用户名）、password（密码）、license_key（租户授权码，SaaS模式必填）
2. WHEN在SaaS_Mode下且未提供license_key时，THE Login_API SHALL返回400错误和"请提供租户授权码"消息
3. WHEN license_key无效时，THE Login_API SHALL返回401错误和"租户授权码无效"消息
4. WHEN租户状态不是active时，THE Login_API SHALL返回403错误和相应的状态消息
5. WHEN用户名或密码错误时，THE Login_API SHALL返回401错误和"用户名或密码错误"消息
6. WHEN登录成功时，THE Login_API SHALL返回包含tenantId和userId的JWT Token
7. WHEN在Private_Mode下，THE Login_API SHALL不验证license_key，Token中不包含tenantId
8. THE Login_API SHALL记录用户的last_login_at和last_login_ip

### 需求 7: 用户与租户关联

**用户故事**: 作为系统管理员，我需要将用户关联到租户，以便实现用户级别的数据隔离。

#### 验收标准

1. THE User_Entity SHALL添加tenant_id字段（VARCHAR(36), NULL）
2. THE User_Entity SHALL对tenant_id字段创建索引idx_tenant_id
3. WHEN创建用户时，THE System SHALL自动设置用户的tenant_id为当前租户ID
4. WHEN在Private_Mode下创建用户时，THE System SHALL设置tenant_id为NULL
5. WHEN查询用户时，THE System SHALL自动过滤tenant_id匹配的用户
6. THE System SHALL禁止跨租户的用户查询和操作

### 需求 8: Admin后台租户管理界面

**用户故事**: 作为超级管理员，我需要一个Admin后台管理所有租户，以便创建、编辑、禁用租户。

#### 验收标准

1. THE Admin_System SHALL提供租户列表页面，显示所有租户的基本信息
2. THE Admin_System SHALL提供租户创建表单，包含所有必填字段
3. THE Admin_System SHALL提供租户编辑表单，允许修改租户信息
4. THE Admin_System SHALL提供租户状态切换功能（启用/禁用）
5. THE Admin_System SHALL提供租户删除功能（软删除，保留数据）
6. THE Admin_System SHALL显示租户的资源使用情况（用户数、存储空间）
7. THE Admin_System SHALL提供租户授权码重新生成功能
8. THE Admin_System SHALL提供租户过期时间延期功能
9. WHEN删除租户时，THE Admin_System SHALL提示确认并说明影响范围

### 需求 9: 租户资源限制检查

**用户故事**: 作为系统管理员，我需要限制租户的资源使用，以便控制系统负载和成本。

#### 验收标准

1. WHEN创建用户时，THE System SHALL检查租户的当前用户数是否小于max_users
2. WHEN用户数达到上限时，THE System SHALL返回403错误和"用户数已达上限(N)"消息
3. WHEN上传文件时，THE System SHALL检查租户的存储空间使用量是否小于max_storage_gb
4. WHEN存储空间已满时，THE System SHALL返回403错误和"存储空间已满(N GB)"消息
5. THE System SHALL提供API查询租户的资源使用统计
6. WHEN在Private_Mode下，THE System SHALL不执行资源限制检查

### 需求 10: 租户数据隔离验证

**用户故事**: 作为安全工程师，我需要验证租户之间的数据完全隔离，以便确保数据安全。

#### 验收标准

1. WHEN租户A的用户查询客户列表时，THE System SHALL只返回tenant_id = A的客户
2. WHEN租户A的用户尝试访问租户B的订单时，THE System SHALL返回404错误
3. WHEN租户A的用户尝试修改租户B的数据时，THE System SHALL返回403错误
4. THE System SHALL在所有查询中自动添加tenant_id过滤条件
5. THE System SHALL在所有写入操作中自动设置tenant_id字段
6. THE System SHALL提供数据隔离测试工具，验证跨租户访问被阻止

### 需求 11: 部署模式配置

**用户故事**: 作为运维工程师，我需要通过环境变量配置部署模式，以便在不同环境使用不同模式。

#### 验收标准

1. THE System SHALL从环境变量DEPLOY_MODE读取部署模式（private或saas）
2. WHEN DEPLOY_MODE未设置时，THE System SHALL默认使用private模式
3. THE System SHALL在启动时打印当前部署模式和配置信息
4. THE System SHALL提供isPrivateMode()和isSaaSMode()辅助函数
5. THE System SHALL在日志中记录部署模式相关的关键操作

### 需求 12: 现有功能兼容性

**用户故事**: 作为产品经理，我需要确保多租户改造不影响现有功能，以便平滑升级。

#### 验收标准

1. WHEN在Private_Mode下，THE System SHALL保持所有现有功能不变
2. THE System SHALL支持现有数据（tenant_id为NULL）的正常访问
3. THE System SHALL在Private_Mode下查询tenant_id IS NULL的数据
4. THE System SHALL提供数据迁移脚本，将现有数据关联到默认租户
5. THE System SHALL提供回滚方案，支持从多租户模式回退到单租户模式

### 需求 13: 租户数据导出

**用户故事**: 作为租户管理员，我需要导出我的租户数据，以便备份或迁移。

#### 验收标准

1. THE System SHALL提供租户数据导出API
2. THE System SHALL导出该租户的所有业务数据（客户、订单、产品等）
3. THE System SHALL以JSON格式导出数据
4. THE System SHALL在导出文件中包含数据结构版本信息
5. WHEN导出数据时，THE System SHALL只导出当前租户的数据
6. THE System SHALL提供导出进度查询接口

### 需求 14: 租户数据导入

**用户故事**: 作为租户管理员，我需要导入数据到我的租户，以便从其他系统迁移数据。

#### 验收标准

1. THE System SHALL提供租户数据导入API
2. THE System SHALL验证导入文件的格式和数据结构版本
3. THE System SHALL自动设置导入数据的tenant_id为当前租户ID
4. WHEN导入数据与现有数据冲突时，THE System SHALL提供冲突解决策略（跳过/覆盖/报错）
5. THE System SHALL提供导入进度查询接口
6. THE System SHALL在导入完成后返回导入统计（成功数、失败数、跳过数）

### 需求 15: 租户操作日志

**用户故事**: 作为审计人员，我需要记录租户级别的关键操作，以便追踪和审计。

#### 验收标准

1. THE System SHALL记录以下租户操作：创建租户、修改租户信息、启用/禁用租户、删除租户、重置授权码、延期过期时间
2. THE System SHALL在操作日志中记录：操作时间、操作人、操作类型、租户ID、操作前数据、操作后数据
3. THE System SHALL提供租户操作日志查询API
4. THE System SHALL支持按时间范围、操作类型、操作人筛选日志
5. THE System SHALL保留租户操作日志至少90天

### 需求 16: 性能优化

**用户故事**: 作为开发者，我需要优化多租户查询性能，以便系统能够支持大量租户。

#### 验收标准

1. THE System SHALL在所有包含tenant_id的表上创建索引
2. THE System SHALL使用复合索引(tenant_id, 其他常用查询字段)优化查询
3. WHEN查询数据时，THE System SHALL优先使用tenant_id索引
4. THE System SHALL提供租户级别的查询缓存
5. THE System SHALL监控慢查询并记录到日志
6. THE System SHALL提供租户数据统计缓存，避免实时计算

### 需求 17: 租户间数据迁移

**用户故事**: 作为系统管理员，我需要将数据从一个租户迁移到另一个租户，以便处理租户合并或拆分场景。

#### 验收标准

1. THE System SHALL提供租户数据迁移API
2. THE System SHALL接受源租户ID、目标租户ID和数据范围参数
3. THE System SHALL验证操作权限（只有超级管理员可执行）
4. THE System SHALL更新迁移数据的tenant_id为目标租户ID
5. THE System SHALL提供迁移预览功能，显示将要迁移的数据统计
6. THE System SHALL在迁移完成后返回迁移报告

### 需求 18: 租户隔离测试

**用户故事**: 作为测试工程师，我需要自动化测试租户数据隔离，以便确保安全性。

#### 验收标准

1. THE System SHALL提供租户隔离测试套件
2. THE System SHALL测试跨租户查询被阻止
3. THE System SHALL测试跨租户修改被阻止
4. THE System SHALL测试跨租户删除被阻止
5. THE System SHALL测试租户A无法看到租户B的数据
6. THE System SHALL生成测试报告，包含所有测试用例的结果

## 实施优先级

### P0 - 核心功能（第1周）
- 需求1: 租户实体管理
- 需求2: 租户配置管理
- 需求3: 租户识别策略
- 需求4: 租户认证中间件增强
- 需求5: 基础仓储数据隔离

### P1 - 基础功能（第2周）
- 需求6: 租户登录接口
- 需求7: 用户与租户关联
- 需求10: 租户数据隔离验证
- 需求11: 部署模式配置
- 需求12: 现有功能兼容性

### P2 - 管理功能（第3周）
- 需求8: Admin后台租户管理界面
- 需求9: 租户资源限制检查
- 需求15: 租户操作日志

### P3 - 高级功能（第4周）
- 需求13: 租户数据导出
- 需求14: 租户数据导入
- 需求16: 性能优化
- 需求17: 租户间数据迁移
- 需求18: 租户隔离测试

## 技术约束

1. 后端技术栈：Node.js + Express + TypeORM + MySQL
2. 前端技术栈：Vue 3 + Element Plus
3. 数据库：MySQL 5.7+
4. 已完成18个核心业务表的tenant_id字段添加
5. 已有基础的tenantAuth中间件
6. 已有部署模式配置（deploy.ts）

## 非功能需求

1. 性能：租户隔离查询不应增加超过10%的查询时间
2. 安全：租户之间数据必须100%隔离，不允许任何跨租户访问
3. 可用性：系统应支持至少1000个活跃租户
4. 可维护性：所有租户相关代码应集中管理，便于维护
5. 兼容性：必须向后兼容现有的私有部署模式

## 验收测试

1. 创建2个测试租户，分别创建测试数据
2. 验证租户A无法访问租户B的数据
3. 验证私有部署模式下所有功能正常
4. 验证SaaS模式下租户登录和数据隔离
5. 验证资源限制功能正常工作
6. 验证Admin后台可以管理所有租户
7. 性能测试：100个租户并发访问，响应时间<500ms
8. 安全测试：尝试各种跨租户访问，全部被阻止
