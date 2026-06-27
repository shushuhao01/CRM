import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm'
import { Product } from './Product'

@Entity('product_skus')
export class ProductSku {
  @PrimaryColumn({ type: 'varchar', length: 50, comment: 'SKU ID' })
  id: string

  @Column('varchar', { name: 'tenant_id', length: 36, nullable: true })
  tenantId: string | null

  @Column({ name: 'product_id', type: 'varchar', length: 50, comment: '所属商品ID' })
  productId: string

  @Column({ name: 'sku_code', type: 'varchar', length: 50, comment: 'SKU编码' })
  skuCode: string

  @Column({ name: 'sku_name', type: 'varchar', length: 200, comment: 'SKU名称' })
  skuName: string

  @Column({ name: 'sku_image', type: 'varchar', length: 500, nullable: true, comment: 'SKU图片URL' })
  skuImage: string | null

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, comment: '销售价格' })
  price: number

  @Column({ name: 'cost_price', type: 'decimal', precision: 10, scale: 2, default: 0, comment: '成本价格' })
  costPrice: number

  @Column({ type: 'int', default: 0, comment: '库存数量' })
  stock: number

  @Column({ name: 'sales_count', type: 'int', default: 0, comment: '销量' })
  salesCount: number

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, comment: '重量(kg)' })
  weight: number

  @Column({ type: 'varchar', length: 50, nullable: true, comment: '条形码' })
  barcode: string | null

  @Column({ name: 'spec_values', type: 'json', comment: '规格值JSON' })
  specValues: Record<string, string>

  @Column({ name: 'sort_order', type: 'int', default: 0, comment: '排序' })
  sortOrder: number

  @Column({ type: 'varchar', length: 20, default: 'active', comment: '状态: active/inactive' })
  status: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product?: Product
}
