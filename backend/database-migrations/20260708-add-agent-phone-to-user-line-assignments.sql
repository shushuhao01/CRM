-- 号码分配增加"员工工作号码"字段
-- 双呼模式下系统先呼叫此号码（员工的工作手机/座机），为空则回退使用用户资料中的手机号
ALTER TABLE `user_line_assignments`
  ADD COLUMN `agent_phone` VARCHAR(30) NULL COMMENT '员工工作号码(双呼先呼叫此号码,为空则使用用户资料手机号)' AFTER `caller_number`;
