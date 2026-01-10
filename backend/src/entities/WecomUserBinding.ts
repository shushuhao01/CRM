/**
 * 企微成员与CRM用户绑定关系实体
 */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('wecom_user_bindings')
export class WecomUserBinding {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'wecom_config_id', type: 'int', comment: '企微配置ID' })
  wecomConfigId: number;

  @Column({ name: 'corp_id', type: 'varchar', length: 50, comment: '企业ID' })
  corpId: string;

  @Column({ name: 'wecom_user_id', type: 'varchar', length: 100, comment: '企微成员UserID' })
  wecomUserId: string;

  @Column({ name: 'wecom_user_name', type: 'varchar', length: 100, nullable: true, comment: '企微成员姓名' })
  wecomUserName: string;

  @Column({ name: 'wecom_avatar', type: 'varchar', length: 255, nullable: true, comment: '企微成员头像' })
  wecomAvatar: string;

  @Column({ name: 'wecom_department_ids', type: 'varchar', length: 50, nullable: true, comment: '企微部门ID列表(逗号分隔)' })
  wecomDepartmentIds: string;

  @Column({ name: 'crm_user_id', type: 'varchar', length: 50, comment: 'CRM系统用户ID' })
  crmUserId: string;

  @Column({ name: 'crm_user_name', type: 'varchar', length: 100, nullable: true, comment: 'CRM系统用户名' })
  crmUserName: string;

  @Column({ name: 'bind_operator', type: 'varchar', length: 50, nullable: true, comment: '绑定操作人' })
  bindOperator: string;

  @Column({ name: 'is_enabled', type: 'boolean', default: true, comment: '是否启用' })
  isEnabled: boolean;

  @CreateDateColumn({ name: 'created_at', comment: '绑定时间' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '更新时间' })
  updatedAt: Date;
}
