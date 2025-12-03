import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Order } from './Order';

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100, comment: '客户姓名' })
  name: string;

  @Column({ length: 20, nullable: true, comment: '客户编号' })
  customerNo?: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: 'individual',
    comment: '客户类型：individual-个人，enterprise-企业'
  })
  type: 'individual' | 'enterprise';

  @Column({ length: 20, nullable: true, comment: '手机号' })
  phone?: string;

  @Column({ length: 100, nullable: true, comment: '邮箱' })
  email?: string;

  @Column({ length: 100, nullable: true, comment: '公司名称' })
  company?: string;

  @Column({ length: 50, nullable: true, comment: '职位' })
  position?: string;

  @Column({ length: 500, nullable: true, comment: '完整地址' })
  address?: string;

  // 详细地址字段
  @Column({ length: 50, nullable: true, comment: '省份' })
  province?: string;

  @Column({ length: 50, nullable: true, comment: '城市' })
  city?: string;

  @Column({ length: 50, nullable: true, comment: '区县' })
  district?: string;

  @Column({ length: 100, nullable: true, comment: '街道' })
  street?: string;

  @Column({ length: 200, nullable: true, comment: '详细地址' })
  detailAddress?: string;

  @Column({ length: 500, nullable: true, comment: '境外地址' })
  overseasAddress?: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: 'potential',
    comment: '客户状态：potential-潜在客户，contacted-已联系，negotiating-洽谈中，deal-成交，lost-流失'
  })
  status: 'potential' | 'contacted' | 'negotiating' | 'deal' | 'lost';

  @Column({
    type: 'varchar',
    length: 50,
    default: 'C',
    comment: '客户等级：A-重要客户，B-一般客户，C-普通客户，D-低价值客户'
  })
  level: 'A' | 'B' | 'C' | 'D';

  @Column({
    type: 'varchar',
    length: 50,
    default: 'other',
    comment: '客户来源'
  })
  source: 'phone' | 'email' | 'wechat' | 'qq' | 'visit' | 'exhibition' | 'referral' | 'website' | 'other';

  @Column({ type: 'int', nullable: true, comment: '负责销售员ID' })
  salesUserId?: number;

  @Column({ type: 'text', nullable: true, comment: '备注信息' })
  notes?: string;

  @Column({ type: 'json', nullable: true, comment: '标签（JSON数组）' })
  tags?: string[];

  // 新增字段 - 个人信息
  @Column({ type: 'int', nullable: true, comment: '年龄' })
  age?: number;

  @Column({ type: 'varchar', length: 20, nullable: true, comment: '性别：male-男，female-女，unknown-未知' })
  gender?: string;

  @Column({ type: 'decimal', precision: 5, scale: 1, nullable: true, comment: '身高(cm)' })
  height?: number;

  @Column({ type: 'decimal', precision: 5, scale: 1, nullable: true, comment: '体重(kg)' })
  weight?: number;

  @Column({ length: 50, nullable: true, comment: '微信号' })
  wechat?: string;

  // 新增字段 - 健康信息
  @Column({ type: 'text', nullable: true, comment: '疾病史' })
  medicalHistory?: string;

  @Column({ type: 'json', nullable: true, comment: '改善目标（JSON数组）' })
  improvementGoals?: string[];

  @Column({ length: 200, nullable: true, comment: '其他改善目标' })
  otherGoals?: string;

  // 新增字段 - 时间相关
  @Column({ type: 'datetime', nullable: true, comment: '进粉时间' })
  fanAcquisitionTime?: Date;

  @Column({ type: 'datetime', nullable: true, comment: '最后联系时间' })
  lastContactAt?: Date;

  @Column({ type: 'datetime', nullable: true, comment: '下次跟进时间' })
  nextFollowUpAt?: Date;

  // 统计字段
  @Column({ type: 'int', default: 0, comment: '订单数量' })
  orderCount: number;

  @Column({ type: 'int', default: 0, comment: '退货次数' })
  returnCount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, comment: '总消费金额' })
  totalAmount: number;

  @CreateDateColumn({ comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ comment: '更新时间' })
  updatedAt: Date;

  // 关联关系
  @OneToMany(() => Order, order => order.customer)
  orders: Order[];
}
