-- 扩宽 call_records.hangup_cause：阿里云外呼失败原因经常超过100字符导致 Data too long
ALTER TABLE `call_records` MODIFY COLUMN `hangup_cause` VARCHAR(255) NULL COMMENT '挂断原因';
