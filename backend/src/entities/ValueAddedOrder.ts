import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('value_added_orders')
export class ValueAddedOrder {
  @PrimaryColumn('varchar', { length: 50 })
  id: string;

  @Column('varchar', { length: 50, nullable: true, name: 'order_id' })
  orderId: string | null;

  @Column('varchar', { length: 50, nullable: true, name: 'order_number' })
  orderNumber: string | null;

  @Column('varchar', { length: 50, nullable: true, name: 'customer_id' })
  customerId: string | null;

  @Column('varchar', { length: 100, nullable: true, name: 'customer_name' })
  customerName: string | null;

  @Column('varchar', { length: 20, nullable: true, name: 'customer_phone' })
  customerPhone: string | null;

  @Column('varchar', { length: 100, nullable: true, name: 'tracking_number' })
  trackingNumber: string | null;

  @Column('varchar', { length: 50, nullable: true, name: 'express_company' })
  expressCompany: string | null;

  @Column('varchar', { length: 20, nullable: true, name: 'order_status' })
  orderStatus: string | null;

  @Column('datetime', { nullable: true, name: 'order_date' })
  orderDate: Date | null;

  @Column('varchar', { length: 50, name: 'company_id' })
  companyId: string;

  @Column('varchar', { length: 200, name: 'company_name' })
  companyName: string;

  @Column('decimal', { precision: 10, scale: 2, name: 'unit_price' })
  unitPrice: number;

  @Column('varchar', { length: 20, default: 'pending' })
  status: string;

  @Column('varchar', { length: 20, default: 'unsettled', name: 'settlement_status' })
  settlementStatus: string;

  @Column('decimal', { precision: 10, scale: 2, default: 0, name: 'settlement_amount' })
  settlementAmount: number;

  @Column('date', { nullable: true, name: 'settlement_date' })
  settlementDate: Date | null;

  @Column('varchar', { length: 50, nullable: true, name: 'settlement_batch' })
  settlementBatch: string | null;

  @Column('varchar', { length: 500, nullable: true, name: 'invalid_reason' })
  invalidReason: string | null;

  @Column('varchar', { length: 50, nullable: true, name: 'supplement_order_id' })
  supplementOrderId: string | null;

  @Column('date', { nullable: true, name: 'export_date' })
  exportDate: Date | null;

  @Column('varchar', { length: 50, nullable: true, name: 'export_batch' })
  exportBatch: string | null;

  @Column('text', { nullable: true })
  remark: string | null;

  @Column('varchar', { length: 50, nullable: true, name: 'operator_id' })
  operatorId: string | null;

  @Column('varchar', { length: 50, nullable: true, name: 'operator_name' })
  operatorName: string | null;

  @Column('varchar', { length: 50, nullable: true, name: 'created_by' })
  createdBy: string | null;

  @Column('varchar', { length: 50, nullable: true, name: 'created_by_name' })
  createdByName: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
