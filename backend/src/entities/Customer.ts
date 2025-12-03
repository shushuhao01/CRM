import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Order } from './Order';

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'customer_code', length: 50, nullable: true, comment: '客户编号' })
  customerNo?: string;

  @Column({ length: 100, comment: '客户姓名' })
  name: string;

  @Column({ length: 20, nullable: true, comment: '手机号' })
  phone?: string;

  @Column({ length: 100, nullable: true, comment: '微信号' })
  wechat?: string;

  @Column({ length: 50, nullable: true, comment: 'QQ号' })
  qq?: string;

  @Column({ length: 100, nullable: true, comment: '邮箱' })
  email?: string;

  @Column({
    type: 'enum',
    enum: ['male', 'female', 'unknown'],
    default: 'unknown',
    comment: '性别'
  })
  gender: 'male' | 'female' | 'unknown';

  @Column({ type: 'int', nullable: true, comment: '年龄' })
  age?: number;

  @Column({ type: 'date', nullable: true, comment: '生日' })
  birthday?: Date;

  @Column({ name: 'id_card', length: 255, nullable: true, comment: '身份证号' })
  idCard?: string;

  @Column({ type: 'decimal', precision: 5, scale: 1, nullable: true, comment: '身高(cm)' })
  height?: number;

  @Column({ type: 'decimal', precision: 5, scale: 1, nullable: true, comment: '体重(kg)' })
  weight?: number;

  @Column({ type: 'text', nullable: true, comment: '完整地址' })
  address?: string;

  @Column({ length: 50, nullable: true, comment: '省份' })
  province?: string;

  @Column({ length: 50, nullable: true, comment: '城市' })
  city?: string;

  @Column({ length: 50, nullable: true, comment: '区县' })
  district?: string;

  @Column({ length: 100, nullable: true, comment: '街道' })
  street?: string;

  @Column({ name: 'detail_address', length: 200, nullable: true, comment: '详细地址' })
  detailAddress?: string;

  @Column({ name: 'overseas_address', length: 500, nullable: true, comment: '境外地址' })
  overseasAddress?: string;

  @Column({ length: 200, nullable: true, comment: '公司名称' })
  company?: string;

  @Column({ length: 100, nullable: true, comment: '行业' })
  industry?: string;

  @Column({ length: 50, nullable: true, comment: '客户来源' })
  source?: string;

  @Column({ length: 20, default: 'normal', comment: '客户等级' })
  level: string;

  @Column({ length: 20, default: 'active', comment: '状态' })
  status: string;

  @Column({ name: 'follow_status', length: 20, nullable: true, comment: '跟进状态' })
  followStatus?: string;

  @Column({ type: 'json', nullable: true, comment: '标签' })
  tags?: string[];

  @Column({ type: 'text', nullable: true, comment: '备注' })
  remark?: string;

  @Column({ name: 'medical_history', type: 'text', nullable: true, comment: '疾病史' })
  medicalHistory?: string;

  @Column({ name: 'improvement_goals', type: 'json', nullable: true, comment: '改善目标' })
  improvementGoals?: string[];

  @Column({ name: 'other_goals', length: 200, nullable: true, comment: '其他改善目标' })
  otherGoals?: string;

  @Column({ name: 'order_count', type: 'int', default: 0, comment: '订单数量' })
  orderCount: number;

  @Column({ name: 'return_count', type: 'int', default: 0, comment: '退货次数' })
  returnCount: number;

  @Column({ name: 'total_amount', type: 'decimal', precision: 10, scale: 2, default: 0, comment: '总消费金额' })
  totalAmount: number;

  @Column({ name: 'fan_acquisition_time', type: 'datetime', nullable: true, comment: '进粉时间' })
  fanAcquisitionTime?: Date;

  @Column({ name: 'last_order_time', type: 'timestamp', nullable: true, comment: '最后下单时间' })
  lastOrderTime?: Date;

  @Column({ name: 'last_contact_time', type: 'timestamp', nullable: true, comment: '最后联系时间' })
  lastContactTime?: Date;

  @Column({ name: 'next_follow_time', type: 'timestamp', nullable: true, comment: '下次跟进时间' })
  nextFollowTime?: Date;

  @Column({ name: 'sales_person_id', length: 50, nullable: true, comment: '销售员ID' })
  salesPersonId?: string;

  @Column({ name: 'sales_person_name', length: 50, nullable: true, comment: '销售员姓名' })
  salesPersonName?: string;

  @Column({ name: 'created_by', length: 50, comment: '创建人ID' })
  createdBy: string;

  @Column({ name: 'created_by_name', length: 50, nullable: true, comment: '创建人姓名' })
  createdByName?: string;

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '更新时间' })
  updatedAt: Date;

  // 关联关系
  @OneToMany(() => Order, order => order.customer)
  orders: Order[];
}
