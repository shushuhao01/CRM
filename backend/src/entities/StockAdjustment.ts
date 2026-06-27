import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm'

@Entity('stock_adjustments')
export class StockAdjustment {
  @PrimaryColumn({ type: 'varchar', length: 50, comment: '调整记录ID' })
  id: string

  @Column('varchar', { name: 'tenant_id', length: 36, nullable: true })
  tenantId: string | null

  @Column({ name: 'product_id', type: 'varchar', length: 50, comment: '商品ID' })
  productId: string

  @Column({ name: 'sku_id', type: 'varchar', length: 50, nullable: true, comment: 'SKU ID' })
  skuId: string | null

  @Column({ name: 'sku_name', type: 'varchar', length: 200, nullable: true, comment: 'SKU名称' })
  skuName: string | null

  @Column({ name: 'adjust_type', type: 'varchar', length: 20, comment: 'increase/decrease/set' })
  adjustType: string

  @Column({ type: 'int', comment: '调整数量' })
  quantity: number

  @Column({ name: 'before_stock', type: 'int', comment: '调整前库存' })
  beforeStock: number

  @Column({ name: 'after_stock', type: 'int', comment: '调整后库存' })
  afterStock: number

  @Column({ type: 'varchar', length: 50, nullable: true, comment: '调整原因' })
  reason: string | null

  @Column({ type: 'varchar', length: 500, nullable: true, comment: '备注' })
  remark: string | null

  @Column({ name: 'operator_id', type: 'varchar', length: 50, nullable: true, comment: '操作人ID' })
  operatorId: string | null

  @Column({ name: 'operator_name', type: 'varchar', length: 50, nullable: true, comment: '操作人姓名' })
  operatorName: string | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
