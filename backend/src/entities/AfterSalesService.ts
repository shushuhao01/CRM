import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('after_sales_services')
export class AfterSalesService {
  @PrimaryColumn({ length: 50 })
  id: string;

  @Column({ name: 'service_number', length: 50, unique: true })
  serviceNumber: string;

  @Column({ name: 'order_id', length: 50, nullable: true })
  orderId: string;

  @Column({ name: 'order_number', length: 50, nullable: true })
  orderNumber: string;

  @Column({ name: 'customer_id', length: 50, nullable: true })
  customerId: string;

  @Column({ name: 'customer_name', length: 100, nullable: true })
  customerName: string;

  @Column({ name: 'customer_phone', length: 20, nullable: true })
  customerPhone: string;

  @Column({ name: 'service_type', length: 20, default: 'return' })
  serviceType: string; // return, exchange, repair, refund, complaint, inquiry

  @Column({ length: 20, default: 'pending' })
  status: string; // pending, processing, resolved, closed

  @Column({ length: 20, default: 'normal' })
  priority: string; // low, normal, high, urgent

  @Column({ length: 100, nullable: true })
  reason: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'product_name', length: 200, nullable: true })
  productName: string;

  @Column({ name: 'product_spec', length: 100, nullable: true })
  productSpec: string;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price: number;

  @Column({ name: 'contact_name', length: 50, nullable: true })
  contactName: string;

  @Column({ name: 'contact_phone', length: 20, nullable: true })
  contactPhone: string;

  @Column({ name: 'contact_address', length: 500, nullable: true })
  contactAddress: string;

  @Column({ name: 'assigned_to', length: 50, nullable: true })
  assignedTo: string;

  @Column({ name: 'assigned_to_id', length: 50, nullable: true })
  assignedToId: string;

  @Column({ type: 'text', nullable: true })
  remark: string;

  @Column({ type: 'json', nullable: true })
  attachments: string[];

  @Column({ name: 'created_by', length: 50, nullable: true })
  createdBy: string;

  @Column({ name: 'created_by_id', length: 50, nullable: true })
  createdById: string;

  @Column({ name: 'department_id', length: 50, nullable: true })
  departmentId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'expected_time', type: 'datetime', nullable: true })
  expectedTime: Date;

  @Column({ name: 'resolved_time', type: 'datetime', nullable: true })
  resolvedTime: Date;
}
