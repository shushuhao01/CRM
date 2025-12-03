-- ============================================
-- 更新 customers 表，添加缺失的字段
-- 适用于 TypeORM 自动生成的表结构（驼峰命名转下划线）
-- 执行前请备份数据库！
-- ============================================

-- 首先检查表是否存在
-- SHOW TABLES LIKE 'customers';
-- DESCRIBE customers;

-- ============================================
-- 方案A：如果表是 TypeORM 自动创建的（字段名是驼峰转下划线）
-- ============================================

-- 添加详细地址字段
ALTER TABLE customers ADD COLUMN IF NOT EXISTS province VARCHAR(50) NULL COMMENT '省份';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS city VARCHAR(50) NULL COMMENT '城市';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS district VARCHAR(50) NULL COMMENT '区县';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS street VARCHAR(100) NULL COMMENT '街道';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS detailAddress VARCHAR(200) NULL COMMENT '详细地址';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS overseasAddress VARCHAR(500) NULL COMMENT '境外地址';

-- 添加个人信息字段
ALTER TABLE customers ADD COLUMN IF NOT EXISTS age INT NULL COMMENT '年龄';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS gender VARCHAR(20) DEFAULT 'unknown' COMMENT '性别';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS height DECIMAL(5,1) NULL COMMENT '身高(cm)';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS weight DECIMAL(5,1) NULL COMMENT '体重(kg)';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS wechat VARCHAR(50) NULL COMMENT '微信号';

-- 添加健康信息字段
ALTER TABLE customers ADD COLUMN IF NOT EXISTS medicalHistory TEXT NULL COMMENT '疾病史';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS improvementGoals JSON NULL COMMENT '改善目标';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS otherGoals VARCHAR(200) NULL COMMENT '其他改善目标';

-- 添加时间字段
ALTER TABLE customers ADD COLUMN IF NOT EXISTS fanAcquisitionTime DATETIME NULL COMMENT '进粉时间';

-- 添加统计字段（如果不存在）
ALTER TABLE customers ADD COLUMN IF NOT EXISTS orderCount INT DEFAULT 0 COMMENT '订单数量';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS returnCount INT DEFAULT 0 COMMENT '退货次数';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS totalAmount DECIMAL(10,2) DEFAULT 0 COMMENT '总消费金额';

-- ============================================
-- 方案B：如果 MySQL 不支持 IF NOT EXISTS，使用以下语句
-- 先检查字段是否存在，不存在则添加
-- ============================================

-- 可以在 phpMyAdmin 中直接执行以下语句（忽略已存在的字段错误）：

/*
ALTER TABLE customers ADD COLUMN province VARCHAR(50) NULL COMMENT '省份';
ALTER TABLE customers ADD COLUMN city VARCHAR(50) NULL COMMENT '城市';
ALTER TABLE customers ADD COLUMN district VARCHAR(50) NULL COMMENT '区县';
ALTER TABLE customers ADD COLUMN street VARCHAR(100) NULL COMMENT '街道';
ALTER TABLE customers ADD COLUMN detailAddress VARCHAR(200) NULL COMMENT '详细地址';
ALTER TABLE customers ADD COLUMN overseasAddress VARCHAR(500) NULL COMMENT '境外地址';
ALTER TABLE customers ADD COLUMN age INT NULL COMMENT '年龄';
ALTER TABLE customers ADD COLUMN gender VARCHAR(20) DEFAULT 'unknown' COMMENT '性别';
ALTER TABLE customers ADD COLUMN height DECIMAL(5,1) NULL COMMENT '身高(cm)';
ALTER TABLE customers ADD COLUMN weight DECIMAL(5,1) NULL COMMENT '体重(kg)';
ALTER TABLE customers ADD COLUMN wechat VARCHAR(50) NULL COMMENT '微信号';
ALTER TABLE customers ADD COLUMN medicalHistory TEXT NULL COMMENT '疾病史';
ALTER TABLE customers ADD COLUMN improvementGoals JSON NULL COMMENT '改善目标';
ALTER TABLE customers ADD COLUMN otherGoals VARCHAR(200) NULL COMMENT '其他改善目标';
ALTER TABLE customers ADD COLUMN fanAcquisitionTime DATETIME NULL COMMENT '进粉时间';
ALTER TABLE customers ADD COLUMN orderCount INT DEFAULT 0 COMMENT '订单数量';
ALTER TABLE customers ADD COLUMN returnCount INT DEFAULT 0 COMMENT '退货次数';
ALTER TABLE customers ADD COLUMN totalAmount DECIMAL(10,2) DEFAULT 0 COMMENT '总消费金额';
*/

-- 显示更新后的表结构
DESCRIBE customers;
