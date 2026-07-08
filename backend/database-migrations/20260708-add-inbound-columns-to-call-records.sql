-- ============================================================
-- 补齐 call_records 表呼入相关列（schema.sql 已定义但旧库缺失）
-- 自动迁移器会忽略 Duplicate column 错误，幂等安全
-- ============================================================

ALTER TABLE `call_records` ADD COLUMN `call_direction` VARCHAR(10) DEFAULT NULL COMMENT '呼叫方向：in-呼入，out-呼出（冗余字段，与call_type配合）';

ALTER TABLE `call_records` ADD COLUMN `ring_duration` INT DEFAULT 0 COMMENT '振铃时长(秒)';

ALTER TABLE `call_records` ADD COLUMN `queue_time` INT DEFAULT 0 COMMENT '排队等待时长(秒)';

ALTER TABLE `call_records` ADD COLUMN `transfer_from` VARCHAR(100) DEFAULT NULL COMMENT '转接来源坐席ID';

ALTER TABLE `call_records` ADD COLUMN `transfer_to` VARCHAR(100) DEFAULT NULL COMMENT '转接目标坐席ID';

ALTER TABLE `call_records` ADD COLUMN `inbound_route_id` VARCHAR(50) DEFAULT NULL COMMENT '呼入路由ID';

ALTER TABLE `call_records` ADD COLUMN `inbound_source` VARCHAR(50) DEFAULT NULL COMMENT '呼入来源：sip-SIP分机，mobile-工作手机，voip-网络电话，pbx-PBX系统';
