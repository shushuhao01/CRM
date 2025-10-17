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

  @Column({ length: 200, nullable: true, comment: '地址' })
  address?: string;

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

  @Column({ type: 'datetime', nullable: true, comment: '最后联系时间' })
  lastContactAt?: Date;

  @Column({ type: 'datetime', nullable: true, comment: '下次跟进时间' })
  nextFollowUpAt?: Date;

  @CreateDateColumn({ comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ comment: '更新时间' })
  updatedAt: Date;

  // 关联关系
  @OneToMany(() => Order, order => order.customer)
  orders: Order[];
}