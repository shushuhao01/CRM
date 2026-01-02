import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('commission_setting')
export class CommissionSetting {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'setting_key', length: 50, unique: true, comment: '配置键' })
  settingKey: string;

  @Column({ name: 'setting_value', length: 200, comment: '配置值' })
  settingValue: string;

  @Column({ name: 'setting_desc', length: 200, nullable: true, comment: '配置说明' })
  settingDesc?: string;

  @UpdateDateColumn({ name: 'updated_at', comment: '更新时间' })
  updatedAt: Date;
}
