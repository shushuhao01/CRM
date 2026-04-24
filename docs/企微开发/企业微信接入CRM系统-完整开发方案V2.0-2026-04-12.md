# CRM系统接入企业微信 全端开发方案与需求文档 V2.0

> **文档版本**: V2.0（基于V1.0补充私有部署双模式支持）
> **创建日期**: 2026年4月12日
> **适用产品**: CRM SaaS系统 + 私有部署版本
> **对接平台**: 企业微信（第三方应用 + 自建应用双模式）
> **更新说明**: 在V1.0基础上补充私有部署版本支持、双模式授权架构、数据库最终设计

---

## 一、项目概述

### 1.1 项目目标

将CRM系统接入企业微信，支持两种部署模式：

- **SaaS模式**: 作为企业微信官方服务商，通过第三方应用模式为租户企业提供企微客户通讯与私域运营能力
- **私有部署模式**: 客户在自己的企业微信后台创建自建应用，手动配置接入CRM系统

本方案覆盖四个端口的完整开发设计：

| 端 | SaaS模式 | 私有部署模式 |
|---|---|---|
| **服务商端** | 企微服务商后台配置 | 不涉及 |
| **CRM租户端** | 第三方应用扫码授权 + 全功能 | 自建应用手动配置 + 全功能 |
| **运营管理后台** | 多租户管理、套餐、监控 | 简化版（无套餐/计费） |
| **会员中心** | 套餐购买、续费、用量 | 不涉及（无计费） |

### 1.2 授权模式对比

| 维度 | 第三方应用（SaaS） | 自建应用（私有部署） |
|---|---|---|
| **注册要求** | 需注册服务商账号 | 不需要 |
| **配置方式** | 租户扫码授权 | 手动填写CorpID/Secret/AgentID |
| **Token获取** | suite_access_token + permanent_code | corpId + secret 直接获取 |
| **权限范围** | 由服务商配置，租户授权 | 企业自行在后台配置 |
| **会话存档** | 需二次授权（90天有效） | 企业自行开通，直接可用 |
| **费用** | 接口许可费(1-50元/人/年) | 无接口许可费 |
| **适用场景** | SaaS多租户 | 私有部署单租户 |

### 1.3 技术架构概览

```
                        企业微信平台
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   第三方应用模式      自建应用模式        回调/JS-SDK
   (SaaS租户)         (私有部署)          (通用)
        │                  │                  │
        └──────────┬───────┘                  │
                   │                          │
            CRM SaaS后端                      │
     ┌─────────────┼──────────────┐           │
     │             │              │           │
  授权管理层    API网关层     配额管理层       │
  (双模式)    (租户隔离)    (SaaS专属)       │
     │             │              │           │
     ├─────────────┼──────────────┤           │
     │             │              │           │
  CRM租户端   运营管理后台    会员中心    侧边栏H5
```

### 1.4 部署模式判断逻辑

```typescript
// 后端统一判断
import { deployConfig } from './config/deploy';

// SaaS模式：第三方应用授权流程
if (deployConfig.isSaaS()) {
  // 使用 suite_access_token + permanent_code 换取 corp_access_token
  // 支持多租户、套餐、配额管理
}

// 私有部署模式：自建应用配置
if (deployConfig.isPrivate()) {
  // 使用 corpId + secret 直接获取 access_token
  // 单租户，无套餐/计费限制
}
```

---

## 二、服务商端：企业微信平台配置（仅SaaS模式）

### 2.1 服务商注册与认证

**步骤1：注册服务商账号**
1. 访问企业微信服务商官网，注册服务商账号
2. 完成企业认证（需提供营业执照等资质）
3. 认证费用：300元/年（小型企业）或3000元/年（大型企业）

**步骤2：创建代开发应用模板**
1. 登录服务商后台，点击左侧导航栏「应用代开发」菜单
2. 点击「创建代开发应用模板」按钮
3. 填写应用基本信息：
    - 应用名称：如"XX CRM企微助手"
    - 应用Logo：上传应用图标（建议750x750px）
    - 应用简介：描述应用功能（不超过120字）
    - 应用分类：选择「营销获客」

### 2.2 应用权限配置

| 权限类别 | 权限项 | 用途说明 | 是否必须 |
|---------|--------|---------|---------|
| **通讯录** | 通讯录只读 | 同步企业组织架构 | 必须 |
| **客户联系** | 客户管理、客户群管理、客户朋友圈 | 管理外部联系人、客户群 | 必须 |
| **客户联系** | 获客助手 | 创建和管理获客链接 | 必须 |
| **客户联系** | 建联客户信息 | 获取客户添加流水 | 必须 |
| **微信客服** | 管理账号、分配会话和收发消息 | 客服账号管理 | 必须 |
| **数据与智能专区** | 企业会话内容（会话存档） | 获取会话记录 | 按需 |
| **对外收款** | 对外收款记录查询 | 获取收款记录 | 按需 |
| **基础API** | 身份验证、消息推送 | 用户身份校验 | 必须 |
| **JS-SDK** | 网页授权、客户端API | 侧边栏H5页面 | 必须 |

### 2.3 回调URL配置

| 配置项 | 说明 | 示例 |
|--------|------|------|
| **指令回调URL** | 接收企微推送的事件通知 | `https://api.yourcrm.com/wecom/callback` |
| **数据回调URL** | 接收数据API相关回调 | `https://api.yourcrm.com/wecom/data-callback` |
| **Token** | 回调验证Token | 随机生成32位字符串 |
| **EncodingAESKey** | 消息加解密密钥 | 随机生成43位字符串 |

**需要监听的回调事件**：
- `create_auth`：企业授权应用（获取永久授权码）
- `cancel_auth`：企业取消授权
- `change_external_contact`：客户变更事件
- `change_external_chat`：客户群变更事件
- `kf_msg_or_event`：微信客服消息事件
- `customer_acquisition`：获客助手相关事件

### 2.4 可信域名配置

1. 设置可信域名：`yourcrm.com`
2. 下载验证文件并上传至域名根目录
3. 配置企业可信IP

### 2.5 应用上线

1. 提交审核（需提供测试企业ID）
2. 审核通过后应用状态变更为「已上线」
3. 获取应用二维码供租户扫码

---

## 三、CRM租户端：企微管理模块

### 3.1 菜单结构总览

```
CRM租户后台
├── ...（其他现有菜单）
└── 企微管理（一级菜单）
    ├── 1. 企业授权        (SaaS:扫码授权 / 私有:手动配置)
    ├── 2. 通讯录          (部门树+成员列表+同步)
    ├── 3. 客户管理        (外部联系人管理)
    ├── 4. 获客管理        (获客链接+渠道分析)
    ├── 5. 客户群管理      (客户群+群发+欢迎语)
    ├── 6. 微信客服        (客服账号+会话+统计)
    ├── 7. 侧边栏配置      (聊天工具栏H5页面)
    └── 8. 会话存档        (三级标签页)
        ├── 8.1 会话聊天
        ├── 8.2 敏感词
        ├── 8.3 质检规则
        └── 8.4 设置
```

### 3.2 二级菜单详细设计

#### 3.2.1 企业授权

**SaaS模式功能**：

| 功能模块 | 说明 |
|---------|------|
| 授权状态卡片 | 显示授权状态、企业名称、授权时间、到期时间 |
| 扫码授权区 | 展示授权二维码，管理员扫码确认授权 |
| 权限申请引导 | 数据API二次授权引导 |
| 可见范围设置 | 设置应用在企微内的可见范围 |
| 授权记录 | 历史授权操作记录 |

**私有部署模式功能**：

| 功能模块 | 说明 |
|---------|------|
| 应用配置表单 | 手动输入CorpID、各类Secret、AgentID |
| 回调配置 | Token、EncodingAESKey、回调URL |
| 连接测试 | 点击测试验证配置是否正确 |
| 启用/禁用 | 切换企微配置启用状态 |
| 多主体支持 | 支持配置多个企业微信主体 |

**技术要点**：
- SaaS模式：授权成功后企微推送`create_auth`事件，后端用AuthCode换取permanent_code并加密存储
- 私有部署：直接使用corpId+secret获取access_token
- 前端通过`deployConfig.isSaaS()`判断展示哪种授权UI

#### 3.2.2 通讯录

| 功能模块 | 说明 |
|---------|------|
| 部门结构树 | 树形展示企微部门架构 |
| 成员列表 | 表格展示选中部门下的成员 |
| 同步操作 | 手动同步 + 定时同步配置 |
| 成员详情 | 点击查看详细信息 |
| 搜索 | 按姓名、手机号、部门搜索 |

#### 3.2.3 客户管理

| 功能模块 | 说明 |
|---------|------|
| 客户列表 | 外部联系人表格展示 |
| 客户筛选 | 按时间、员工、标签、状态筛选 |
| 客户详情 | 基本信息、企业信息、互动轨迹 |
| 标签管理 | 创建/编辑标签和标签组 |
| 客户备注 | 编辑备注名、描述、手机号 |
| 客户画像 | 整合标签、备注、互动、订单数据 |
| 批量操作 | 批量打标签、分配员工、导出 |

#### 3.2.4 获客管理

| 功能模块 | 说明 |
|---------|------|
| 获客链接列表 | 所有链接+统计数据 |
| 创建链接 | 名称、成员、渠道参数、跳过验证 |
| 链接详情 | 配置信息、成员分配、URL+二维码 |
| 加粉权重配置 | 为成员/部门配置权重值(1-10) |
| 渠道分析 | 按链接统计添加数、流失数、转化率 |
| 使用量监控 | 获客助手使用量（已用/总配额） |

#### 3.2.5 客户群管理

| 功能模块 | 说明 |
|---------|------|
| 客户群列表 | 群名称、群主、人数、消息数 |
| 群详情 | 群信息、成员列表、公告历史 |
| 群发消息 | 选择目标群、设置内容、定时发送 |
| 入群欢迎语 | 新人入群自动发送欢迎语 |
| 群数据统计 | 群总数、总人数、活跃度统计 |

#### 3.2.6 微信客服

| 功能模块 | 说明 |
|---------|------|
| 客服账号列表 | 账号名称、接待人员、在线状态 |
| 创建/编辑账号 | 名称、头像、接待人员配置 |
| 会话记录 | 客服会话历史、消息数、满意度 |
| 数据统计 | 总会话数、响应时长、满意度分布 |
| 快捷回复库 | 企业话术/个人话术配置 |

#### 3.2.7 侧边栏配置

| 功能模块 | 说明 |
|---------|------|
| 工具栏列表 | 已配置的聊天工具栏页面 |
| 添加工具栏 | 页面名称、H5 URL、使用场景 |
| JS-SDK配置说明 | 可信域名状态、初始化代码 |

#### 3.2.8 会话存档（三级标签页）

详见第四节专项设计。

---

## 四、会话存档专项设计

### 4.1 标签页1：会话聊天

**页面布局**：左侧联系人列表 + 右侧会话记录（微信风格气泡）

左侧面板功能：搜索框、分类Tab（全部/员工维度/客户维度）、会话列表项

右侧面板功能：会话头部、消息气泡列表、日期分隔线、消息搜索、时间筛选、消息导出、分页加载

### 4.2 标签页2：敏感词

功能：敏感词库管理、添加/批量导入、分类管理、检测记录、告警通知、白名单

### 4.3 标签页3：质检规则

功能：质检规则列表、创建规则（响应时长/消息数/关键词/情绪）、质检评分、质检报告、人工复核

### 4.4 标签页4：设置

功能：开通引导、公钥配置、授权状态、续期操作、存储配置、拉取设置、成员授权范围

---

## 五、运营管理后台：企微管理模块

### 5.1 菜单结构

**SaaS模式（完整版）**：
```
企微管理
├── 1. 租户授权管理
├── 2. 套餐模板管理
├── 3. 租户套餐管理
├── 4. 资源配额监控
├── 5. 订单与财务
└── 6. 系统配置
```

**私有部署模式（简化版）**：
```
企微管理
├── 1. 企微总览        (企微配置列表+统计)
├── 2. 会话存档管理    (存档配置+数据统计)
└── 3. 系统配置        (全局配置，无计费)
```

### 5.2 SaaS模式各菜单设计

（与V1.0文档第五章一致，此处不再重复，参见原文档）

### 5.3 私有部署模式差异说明

| 功能 | SaaS模式 | 私有部署模式 |
|---|---|---|
| 租户授权管理 | 完整多租户列表 | 仅单个企业配置 |
| 套餐模板管理 | 完整套餐CRUD | **不需要**（无计费） |
| 租户套餐管理 | 分配/变更/续费 | **不需要** |
| 资源配额监控 | 多租户用量监控 | 简化版单租户统计 |
| 订单与财务 | 完整订单+营收 | **不需要** |
| 系统配置 | 全局+OSS+限流+通知 | 全局配置（无计费项） |

---

## 六、会员中心：企微服务模块（仅SaaS模式）

### 6.1 菜单结构

```
会员中心
└── 企微服务（标签页形式）
    ├── 标签页1：能力介绍
    ├── 标签页2：开通授权
    ├── 标签页3：套餐购买
    ├── 标签页4：续费/增购
    └── 标签页5：用量/订单
```

> **私有部署模式**: 会员中心不涉及企微服务模块，私有部署客户直接在CRM后台配置使用。

### 6.2 各标签页设计

（与V1.0文档第六章一致，此处不再重复）

---

## 七、数据库设计（最终版）

### 7.1 设计原则

1. **兼容双模式**：所有表包含tenant_id字段，SaaS模式自动注入，私有部署模式为NULL
2. **复用现有实体**：在现有7张wecom_*表基础上扩展，而非全部重建
3. **遵循项目规范**：表名snake_case，字段名snake_case，TypeORM实体camelCase
4. **JSON字段规范**：使用JSON.stringify存储，safeJsonParse读取

### 7.2 现有表保留与扩展

#### wecom_configs（扩展字段）

在现有19字段基础上新增以下字段：

| 新增字段 | 类型 | 说明 |
|---------|------|------|
| auth_type | varchar(20) | 授权类型: third_party/self_built，默认self_built |
| permanent_code | text | 第三方应用永久授权码（加密存储） |
| suite_id | varchar(50) | 第三方应用SuiteID |
| auth_corp_info | text | 授权方企业信息(JSON) |
| auth_user_info | text | 授权管理员信息(JSON) |
| auth_scope | text | 授权范围(JSON) |
| data_api_status | tinyint | 数据API授权状态：0未授权 1已授权 2已过期 |
| data_api_expire_time | datetime | 数据API授权到期时间 |
| vas_chat_archive | boolean | 是否开通会话存档增值服务 |
| vas_expire_date | date | 增值服务到期时间 |
| vas_user_count | int | 增值服务开通人数 |

#### wecom_customers（扩展字段）

| 新增字段 | 类型 | 说明 |
|---------|------|------|
| tag_names | text | 客户标签名称列表(JSON) |
| phone | varchar(20) | 手机号 |
| state | varchar(100) | 渠道来源标识 |

#### wecom_chat_records（扩展字段）

| 新增字段 | 类型 | 说明 |
|---------|------|------|
| sender_type | tinyint | 发送者类型：1员工 2客户 |
| receiver_type | tinyint | 接收者类型：1员工 2客户 3群聊 |
| oss_path | varchar(256) | OSS存储路径 |

### 7.3 新增表

#### wecom_customer_groups（客户群表）

```sql
CREATE TABLE wecom_customer_groups (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id VARCHAR(36) COMMENT '租户ID',
    wecom_config_id INT NOT NULL COMMENT '企微配置ID',
    chat_id VARCHAR(100) NOT NULL COMMENT '群聊ID',
    name VARCHAR(200) COMMENT '群名称',
    owner_user_id VARCHAR(100) COMMENT '群主UserID',
    owner_user_name VARCHAR(100) COMMENT '群主姓名',
    member_count INT DEFAULT 0 COMMENT '群成员数量',
    today_msg_count INT DEFAULT 0 COMMENT '今日消息数',
    notice TEXT COMMENT '群公告',
    create_time DATETIME COMMENT '群创建时间',
    status VARCHAR(20) DEFAULT 'normal' COMMENT '状态: normal/dismissed',
    member_list TEXT COMMENT '群成员列表(JSON)',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_config_chat (wecom_config_id, chat_id),
    INDEX idx_tenant (tenant_id),
    INDEX idx_owner (owner_user_id)
) COMMENT='企微客户群表';
```

#### wecom_sensitive_words（敏感词表）

```sql
CREATE TABLE wecom_sensitive_words (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id VARCHAR(36) COMMENT '租户ID',
    wecom_config_id INT COMMENT '企微配置ID（NULL表示全局）',
    word VARCHAR(200) NOT NULL COMMENT '敏感词',
    group_name VARCHAR(100) DEFAULT 'custom' COMMENT '分组: porn/politics/violence/competitor/custom',
    level VARCHAR(20) DEFAULT 'warning' COMMENT '级别: info/warning/danger/critical',
    is_enabled TINYINT(1) DEFAULT 1 COMMENT '是否启用',
    created_by VARCHAR(50) COMMENT '创建人',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_tenant_word (tenant_id, word),
    INDEX idx_tenant (tenant_id),
    INDEX idx_group (group_name)
) COMMENT='敏感词表';
```

#### wecom_sensitive_hits（敏感词命中记录表）

```sql
CREATE TABLE wecom_sensitive_hits (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id VARCHAR(36) COMMENT '租户ID',
    wecom_config_id INT NOT NULL COMMENT '企微配置ID',
    chat_record_id INT COMMENT '关联的聊天记录ID',
    word_id INT NOT NULL COMMENT '命中的敏感词ID',
    word VARCHAR(200) NOT NULL COMMENT '命中的敏感词内容',
    context TEXT COMMENT '消息上下文',
    from_user_id VARCHAR(100) COMMENT '发送者ID',
    from_user_name VARCHAR(100) COMMENT '发送者姓名',
    to_user_id VARCHAR(100) COMMENT '接收者ID',
    status VARCHAR(20) DEFAULT 'pending' COMMENT '状态: pending/processed/ignored',
    processed_by VARCHAR(50) COMMENT '处理人',
    processed_at DATETIME COMMENT '处理时间',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_tenant (tenant_id),
    INDEX idx_status (status),
    INDEX idx_created (created_at)
) COMMENT='敏感词命中记录表';
```

#### wecom_quality_inspections（质检记录表）

```sql
CREATE TABLE wecom_quality_inspections (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id VARCHAR(36) COMMENT '租户ID',
    wecom_config_id INT NOT NULL COMMENT '企微配置ID',
    session_key VARCHAR(200) COMMENT '会话标识',
    from_user_id VARCHAR(100) COMMENT '员工UserID',
    from_user_name VARCHAR(100) COMMENT '员工姓名',
    to_user_id VARCHAR(100) COMMENT '对方UserID',
    to_user_name VARCHAR(100) COMMENT '对方姓名',
    room_id VARCHAR(100) COMMENT '群聊ID（群聊场景）',
    message_count INT DEFAULT 0 COMMENT '消息数量',
    start_time DATETIME COMMENT '会话开始时间',
    end_time DATETIME COMMENT '会话结束时间',
    status VARCHAR(20) DEFAULT 'pending' COMMENT '状态: pending/normal/excellent/violation',
    violation_type TEXT COMMENT '违规类型(JSON数组)',
    score INT COMMENT '质检评分(0-100)',
    remark TEXT COMMENT '质检备注',
    inspector_id VARCHAR(50) COMMENT '质检员ID',
    inspector_name VARCHAR(100) COMMENT '质检员姓名',
    inspected_at DATETIME COMMENT '质检时间',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_tenant (tenant_id),
    INDEX idx_status (status),
    INDEX idx_from_user (from_user_id),
    INDEX idx_inspected (inspected_at)
) COMMENT='质检记录表';
```

#### wecom_quality_rules（质检规则表）

```sql
CREATE TABLE wecom_quality_rules (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id VARCHAR(36) COMMENT '租户ID',
    name VARCHAR(100) NOT NULL COMMENT '规则名称',
    rule_type VARCHAR(30) NOT NULL COMMENT '规则类型: response_time/msg_count/keyword/emotion',
    conditions TEXT NOT NULL COMMENT '条件参数(JSON)',
    score_value INT DEFAULT 0 COMMENT '分值(正加负减)',
    apply_scope TEXT COMMENT '适用范围(JSON: 部门/员工)',
    is_enabled TINYINT(1) DEFAULT 1 COMMENT '是否启用',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_tenant (tenant_id),
    INDEX idx_type (rule_type)
) COMMENT='质检规则表';
```

#### wecom_archive_settings（会话存档设置表）

```sql
CREATE TABLE wecom_archive_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id VARCHAR(36) COMMENT '租户ID',
    wecom_config_id INT NOT NULL COMMENT '企微配置ID',
    fetch_interval INT DEFAULT 5 COMMENT '拉取间隔(分钟)',
    fetch_mode VARCHAR(20) DEFAULT 'default' COMMENT '拉取模式: default/pre_page/adaptive',
    retention_days INT DEFAULT 180 COMMENT '保留天数',
    media_storage VARCHAR(20) DEFAULT 'local' COMMENT '媒体存储方式: local/oss',
    auto_inspect TINYINT(1) DEFAULT 0 COMMENT '是否自动质检',
    member_scope TEXT COMMENT '存档成员范围(JSON)',
    rsa_public_key TEXT COMMENT 'RSA公钥',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_tenant_config (tenant_id, wecom_config_id)
) COMMENT='会话存档设置表';
```

#### wecom_vas_orders（增值服务订单表，SaaS专属）

```sql
CREATE TABLE wecom_vas_orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id VARCHAR(36) NOT NULL COMMENT '租户ID',
    order_no VARCHAR(32) NOT NULL COMMENT '订单号',
    wecom_config_id INT COMMENT '企微配置ID',
    service_type VARCHAR(50) DEFAULT 'chat_archive' COMMENT '服务类型',
    order_type VARCHAR(20) DEFAULT 'new' COMMENT '订单类型: new/renew/upgrade/addon',
    user_count INT DEFAULT 0 COMMENT '开通/增购人数',
    unit_price DECIMAL(10,2) COMMENT '单价',
    total_amount DECIMAL(10,2) NOT NULL COMMENT '总金额',
    pay_type VARCHAR(20) COMMENT '支付方式: wechat/alipay/bank',
    pay_status TINYINT DEFAULT 0 COMMENT '0待支付 1已支付 2已取消 3已退款',
    pay_time DATETIME COMMENT '支付时间',
    transaction_id VARCHAR(64) COMMENT '第三方支付流水号',
    start_date DATE COMMENT '服务开始日期',
    end_date DATE COMMENT '服务到期日期',
    detail TEXT COMMENT '订单详情(JSON)',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_order_no (order_no),
    INDEX idx_tenant (tenant_id),
    INDEX idx_pay_status (pay_status)
) COMMENT='企微增值服务订单表';
```

#### wecom_vas_configs（增值服务配置表，Admin专属）

```sql
CREATE TABLE wecom_vas_configs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    service_type VARCHAR(50) NOT NULL COMMENT '服务类型',
    service_name VARCHAR(100) COMMENT '服务名称',
    default_price DECIMAL(10,2) COMMENT '默认价格',
    min_price DECIMAL(10,2) COMMENT '最低价格',
    billing_unit VARCHAR(20) DEFAULT 'per_user_year' COMMENT '计费单位',
    trial_days INT DEFAULT 7 COMMENT '试用天数',
    tier_pricing TEXT COMMENT '阶梯定价(JSON)',
    description TEXT COMMENT '服务说明',
    is_enabled TINYINT(1) DEFAULT 1 COMMENT '是否启用',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_service_type (service_type)
) COMMENT='企微增值服务配置表';
```

### 7.4 数据库表总览

| 表名 | 类型 | 说明 | SaaS | 私有 |
|------|------|------|------|------|
| wecom_configs | 扩展 | 企微配置（+11字段） | Y | Y |
| wecom_user_bindings | 保留 | 成员绑定关系 | Y | Y |
| wecom_customers | 扩展 | 企微客户（+3字段） | Y | Y |
| wecom_acquisition_links | 保留 | 获客链接 | Y | Y |
| wecom_service_accounts | 保留 | 微信客服账号 | Y | Y |
| wecom_chat_records | 扩展 | 会话存档记录（+3字段） | Y | Y |
| wecom_payment_records | 保留 | 对外收款记录 | Y | Y |
| wecom_customer_groups | **新增** | 客户群 | Y | Y |
| wecom_sensitive_words | **新增** | 敏感词库 | Y | Y |
| wecom_sensitive_hits | **新增** | 敏感词命中记录 | Y | Y |
| wecom_quality_inspections | **新增** | 质检记录 | Y | Y |
| wecom_quality_rules | **新增** | 质检规则 | Y | Y |
| wecom_archive_settings | **新增** | 会话存档设置 | Y | Y |
| wecom_vas_orders | **新增** | 增值服务订单 | Y | - |
| wecom_vas_configs | **新增** | 增值服务配置 | Y | - |

**共计15张表**：7张保留/扩展 + 8张新增

---

## 八、API调用汇总

### 8.1 企微API清单

| 模块 | API名称 | 方式 | 说明 |
|------|---------|------|------|
| 授权 | 获取永久授权码 | 回调 | 企业授权后回调获取 |
| 授权 | 获取企业凭证 | POST | permanent_code换access_token |
| 通讯录 | 获取部门列表 | GET | 获取部门架构 |
| 通讯录 | 获取部门成员 | GET | 获取成员列表 |
| 客户联系 | 获取客户列表 | GET | 外部联系人列表 |
| 客户联系 | 获取客户详情 | GET | 单个客户详细信息 |
| 客户联系 | 编辑客户备注 | POST | 修改客户备注 |
| 客户联系 | 管理企业标签 | POST | 创建/编辑/删除标签 |
| 客户联系 | 为客户打标签 | POST | 添加或移除标签 |
| 获客助手 | 创建获客链接 | POST | 创建新链接 |
| 获客助手 | 获取链接列表 | POST | 获取链接列表 |
| 获客助手 | 编辑获客链接 | POST | 修改链接配置 |
| 获客助手 | 删除获客链接 | POST | 删除指定链接 |
| 获客助手 | 获取添加流水 | POST | 获取客户添加记录 |
| 客户群 | 获取群列表 | POST | 外部群列表 |
| 客户群 | 获取群详情 | POST | 单个群信息 |
| 客户群 | 创建群发 | POST | 企业群发任务 |
| 微信客服 | 管理客服账号 | POST | 创建/编辑/删除/列表 |
| 微信客服 | 同步消息 | POST | 拉取客服会话消息 |
| 微信客服 | 发送消息 | POST | 发送客服消息 |
| 会话存档 | 设置公钥 | POST | 配置RSA公钥 |
| 会话存档 | 获取会话记录 | SDK | 拉取存档消息 |
| 侧边栏 | 配置聊天工具栏 | POST | 设置侧边栏页面 |
| JS-SDK | 注册身份/获取客户ID | 客户端 | H5页面企微身份 |

### 8.2 回调事件清单

| 事件类型 | ChangeType | 说明 |
|---------|-----------|------|
| 授权成功 | create_auth | 获取永久授权码 |
| 取消授权 | cancel_auth | 企业取消授权 |
| 客户添加 | add_external_contact | 员工添加外部联系人 |
| 客户删除 | del_external_contact | 员工删除外部联系人 |
| 客户群变更 | change_external_chat | 群创建/解散/成员变更 |
| 获客事件 | customer_acquisition | 通过获客链接添加好友 |
| 客服消息 | kf_msg_or_event | 收到新消息 |

---

## 九、开发顺序建议（6阶段）

### 阶段一：基础授权（预计4周）
- 服务商注册与认证（SaaS）
- 回调URL配置与验证
- CRM租户端「企业授权」开发（双模式）
- 完成OAuth授权闭环

### 阶段二：核心CRM能力（预计6周）
- CRM租户端「通讯录」开发
- CRM租户端「客户管理」增强
- CRM租户端「侧边栏配置」开发
- Admin后台「租户授权管理」开发

### 阶段三：获客与运营（预计6周）
- CRM租户端「获客管理」增强
- CRM租户端「客户群管理」全新开发
- CRM租户端「微信客服」增强
- Admin后台套餐管理（SaaS专属）

### 阶段四：数据智能（预计5周）
- CRM租户端「会话存档」重做（4个Tab）
- 会话消息拉取+RSA解密+存储
- 敏感词+质检系统
- Admin「资源配额监控」

### 阶段五：商业化闭环（预计4周，SaaS专属）
- 会员中心「企微服务」5个标签页
- 支付集成
- 接口许可账号管理
- Admin「订单与财务」

### 阶段六：完善与上线（预计2周）
- 全链路测试
- 压力测试
- 文档编写
- 应用提交审核

**总计约27周（SaaS完整版） / 约17周（私有部署版）**

---

## 九（补充）、阶段7功能增强需求（2026-04-12 新增）

> 详细规格文档：`docs/企微开发/企微管理V2.0-阶段7-功能增强需求文档-2026-04-12.md`

在前6个阶段的开发基础上，新增以下6项功能增强需求：

### 需求1：会话存档席位管控

CRM端独立控制存档人数，不依赖企微官方购买人数。租户在CRM购买N个席位后，仅N人的会话被存档。管理员在"存档设置"中选择具体生效成员，超出购买人数的无法启用。同步会话记录时仅拉取生效成员的聊天。前端显示席位用量条（已用/已购），超额时引导增购。

> ⚠️ **关键澄清（2026-04-12 补充）**：收费以**绑定的企微账号数量**为准，而非CRM租户成员人数。一个CRM成员可绑定多个企微号，每个企微号独立占一个席位。选择生效范围时展开企微部门树，已绑定CRM的可选，未绑定的暂不可选。

- **新增表**：`wecom_archive_members`（存档生效成员列表）
- **修改**：购买流程写入 `max_users`，同步逻辑按成员过滤

### 需求2：存档设置-成员可见性与查看权限

新增"存档设置"Tab（管理员可见），支持配置会话存档查看范围：
- **仅查看自己**：成员只能查看自己参与的会话
- **查看本部门**：成员可查看本部门所有成员的会话
- **查看全部**：所有有权限成员可查看全部（默认）
- 管理员始终可查看全部，此设置仅影响普通成员

后端查询接口根据当前用户角色+可见性设置动态过滤。

### 需求3：增值服务-套餐与定价配置增强

- 预设套餐包从前端硬编码改为后端 `system_config` 配置化
- VAS定价API增返回当前套餐信息（`currentPlan`）和预设套餐包（`presetPackages`）
- 支持续费（到期前30天，享受续费折扣）和增购（按剩余天数折算）
- Admin后台VAS配置页增加套餐包编辑能力

### 需求4：企微管理独立窗口与全屏模式

- 所有企微管理页面右上角增加全屏/独立窗口按钮
- **全屏模式**：隐藏CRM侧栏和顶栏，仅保留企微管理内容
- **独立窗口**：新增 `/wecom-standalone` 路由+极简Layout，通过 `window.open()` 打开独立浏览器窗口，自带Tab导航切换全部企微子模块
- 共享登录态（同源Token）

### 需求5：CRM端企微客户深度集成

- **CRM客户详情**新增"企微信息"卡片：绑定的企微账号、关联微信数、标签、最近聊天摘要
- **企微客户管理**增强：新增活跃度（近7天消息数）、留存状态、收发消息统计列；新增客户详情抽屉
- **侧边栏绑定管理**：展示侧边栏绑定状态，支持管理员解绑/换绑
- **新增字段**：`wecom_customers` 表新增 `msg_sent_count`、`msg_recv_count`、`last_msg_time`、`active_days_7d`
- **CRM客户USID（2026-04-12 补充）**：`customers` 表新增 `wecom_external_userid` 字段，作为客户唯一企微编码。支持自动同步（企微客户匹配时写入）和手动填入。租户隔离（唯一索引 `tenant_id + wecom_external_userid`）。CRM客户列表新增USID列，CRM客户详情支持编辑/复制USID，侧边栏客户详情页显示USID并支持一键复制。

### 需求6：侧边栏客户详情增强

在现有侧边栏（企微客户信息+CRM客户信息+购买统计+最近订单）基础上新增：
- **收货信息**：收货人、手机号（加密`138****5678`）、地址（省市+脱敏）
- **订单商品明细**：每笔订单展示具体商品名称×数量
- **物流信息**：物流单号、承运商、在途状态、预计到达时间
- **售后记录**：退换货/投诉列表（类型、状态、原因、金额）
- **绑定信息**：展示CRM用户名、租户编码、绑定时间
- **换绑功能**：支持解除当前绑定并重新绑定新CRM账号

### 实施计划

| 阶段 | 内容 | 预估工期 |
|------|------|---------|
| 7A | 席位管控 + 存档设置Tab + 可见性权限 | 4天 |
| 7B | 套餐配置化 + 续费增购 + 全屏/独立窗口 | 3.5天 |
| 7C | 企微客户深度集成 + CRM联动 | 4天 |
| 7D | 侧边栏物流/售后/商品增强 | 3天 |
| **合计** | | **14.5天** |

> ✅ **已确认**：全屏模式两者都支持（API+隐藏Layout+独立窗口）；CRM客户详情企微卡片作为独立子组件 `WecomInfoCard.vue`；售后表 `after_sales_services` 已存在可直接使用；7A与7B可并行；Admin VAS配置编辑纳入本期。
>
> ✅ **补充确认（2026-04-12 第二轮）**：区域B存档生效成员按企微账号数量计费（非CRM成员数），展开部门树选择，未绑定CRM的灰色不可选；CRM客户表新增 `wecom_external_userid`(USID) 字段，侧边栏一键复制，客户列表支持搜索筛选。

---

## 十、关键注意事项

### 10.1 双模式开发要点

- 后端Service层统一封装，通过`deployConfig.isSaaS()`分支处理Token获取逻辑
- 前端通过部署模式配置条件渲染不同的授权UI
- Admin后台通过部署模式隐藏/显示计费相关菜单
- 数据库表全部兼容双模式，SaaS专属表在私有部署时不创建

### 10.2 权限与授权

- 新安装应用90天免费试用期
- 数据API需二次授权，有效期90天
- 企业管理员可随时撤回权限，代码需容错

### 10.3 API调用限制

- 会话存档：单次1000条，600次/分钟
- 获客链接：每个链接最多500名成员
- 客户标签：每人最多3000个，企业最多10000个

### 10.4 数据安全

- 数据加密存储，禁止泄露
- 会话存档需RSA私钥解密
- 租户间数据绝对隔离

### 10.5 费用相关

- 接口许可费：1-50元/人/年（SaaS模式）
- 会话存档：约450-900元/账号/年
- 获客助手：1元/次，免费体验50次
- 认证费：300元/年

---

> 本文档路径: `docs/重要文件/企业微信接入CRM系统-完整开发方案V2.0-2026-04-12.md`

