/**
 * 企微获客链接实体
 */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('wecom_acquisition_links')
export class WecomAcquisitionLink {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'wecom_config_id', type: 'int', comment: '企微配置ID' })
  wecomConfigId: number;

  @Column({ name: 'corp_id', type: 'varchar', length: 50, comment: '企业ID' })
  corpId: string;

  @Column({ name: 'link_id', type: 'varchar', length: 100, nullable: true, comment: '链接ID' })
  linkId: string;

  @Column({ name: 'link_name', type: 'varchar', length: 200, comment: '链接名称' })
  linkName: string;

  @Column({ name: 'link_url', type: 'varchar', length: 500, nullable: true, comment: '链接URL' })
  linkUrl: string;

  @Column({ name: 'welcome_msg', type: 'text', nullable: true, comment: '欢迎语' })
  welcomeMsg: string;

  @Column({ name: 'user_ids', type: 'text', nullable: true, comment: '接待成员UserID列表(JSON)' })
  userIds: string;

  @Column({ name: 'department_ids', type: 'text', nullable: true, comment: '接待部门ID列表(JSON)' })
  departmentIds: string;

  @Column({ name: 'tag_ids', type: 'text', nullable: true, comment: '自动打标签ID列表(JSON)' })
  tagIds: string;

  @Column({ name: 'is_enabled', type: 'boolean', default: true, comment: '是否启用' })
  isEnabled: boolean;

  @Column({ name: 'click_count', type: 'int', default: 0, comment: '点击次数' })
  clickCount: number;

  @Column({ name: 'add_count', type: 'int', default: 0, comment: '添加次数' })
  addCount: number;

  @Column({ name: 'created_by', type: 'varchar', length: 50, nullable: true, comment: '创建人' })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '更新时间' })
  updatedAt: Date;
}
