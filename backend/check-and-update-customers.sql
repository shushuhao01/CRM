-- ============================================
-- 检查并更新 customers 表
-- 在 phpMyAdmin 中执行
-- ============================================

-- 第1步：查看当前表结构
DESCRIBE customers;

-- 第2步：查看当前有多少条数据
SELECT COUNT(*) as total FROM customers;

-- 第3步：添加缺失的字段（MySQL 8.0+ 支持 IF NOT EXISTS）
-- 如果你的 MySQL 版本较低，可能需要逐条执行并忽略"字段已存在"的错误

-- 详细地址字段
ALTER TABLE customers ADD COLUMN province VARCHAR(50) NULL COMMENT '省份';
ALTER TABLE customers ADD COLUMN city VARCHAR(50) NULL COMMENT '城市';
ALTER TABLE customers ADD COLUMN district VARCHAR(50) NULL COMMENT '区县';
ALTER TABLE customers ADD COLUMN street VARCHAR(100) NULL COMMENT '街道';
ALTER TABLE customers ADD COLUMN detailAddress VARCHAR(200) NULL COMMENT '详细地址';
ALTER TABLE customers ADD COLUMN overseasAddress VARCHAR(500) NULL COMMENT '境外地址';

-- 个人信息字段
ALTER TABLE customers ADD COLUMN age INT NULL COMMENT '年龄';
ALTER TABLE customers ADD COLUMN height DECIMAL(5,1) NULL COMMENT '身高(cm)';
ALTER TABLE customers ADD COLUMN weight DECIMAL(5,1) NULL COMMENT '体重(kg)';

-- 如果 gender 字段不存在则添加（可能已存在）
-- ALTER TABLE customers ADD COLUMN gender VARCHAR(20) DEFAULT 'unknown' COMMENT '性别';

-- 如果 wechat 字段不存在则添加（可能已存在）
-- ALTER TABLE customers ADD COLUMN wechat VARCHAR(50) NULL COMMENT '微信号';

-- 健康信息字段
ALTER TABLE customers ADD COLUMN medicalHistory TEXT NULL COMMENT '疾病史';
ALTER TABLE customers ADD COLUMN improvementGoals JSON NULL COMMENT '改善目标';
ALTER TABLE customers ADD COLUMN otherGoals VARCHAR(200) NULL COMMENT '其他改善目标';

-- 时间字段
ALTER TABLE customers ADD COLUMN fanAcquisitionTime DATETIME NULL COMMENT '进粉时间';

-- 统计字段（可能已存在）
-- ALTER TABLE customers ADD COLUMN orderCount INT DEFAULT 0 COMMENT '订单数量';
-- ALTER TABLE customers ADD COLUMN returnCount INT DEFAULT 0 COMMENT '退货次数';
-- ALTER TABLE customers ADD COLUMN totalAmount DECIMAL(10,2) DEFAULT 0 COMMENT '总消费金额';

-- 第4步：验证更新后的表结构
DESCRIBE customers;
