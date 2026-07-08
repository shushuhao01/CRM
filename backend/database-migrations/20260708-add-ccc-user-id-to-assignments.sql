-- 号码分配增加"云联络中心坐席账号"字段
-- 坐席工作台模式（软电话/硬话机）下，外呼通过 MakeCall API 指定该坐席，坐席需已登录阿里云CCC工作台
ALTER TABLE `user_line_assignments`
  ADD COLUMN `ccc_user_id` VARCHAR(64) NULL COMMENT '云联络中心坐席账号ID(软电话/硬话机模式使用)' AFTER `agent_phone`;
