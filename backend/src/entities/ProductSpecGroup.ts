import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm'
import { Product } from './Product'

@Entity('product_spec_groups')
export class ProductSpecGroup {
  @PrimaryColumn({ type: 'varchar', length: 50, comment: '规格组ID' })
  id: string

  @Column('varchar', { name: 'tenant_id', length: 36, nullable: true })
  tenantId: string | null

  @Column({ name: 'product_id', type: 'varchar', length: 50, comment: '所属商品ID' })
  productId: string

  @Column({ name: 'spec_name', type: 'varchar', length: 50, comment: '规格名称' })
  specName: string

  @Column({ name: 'spec_values', type: 'json', comment: '规格值列表' })
  specValues: string[]

  @Column({ name: 'sort_order', type: 'int', default: 0, comment: '排序' })
  sortOrder: number

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product?: Product
}
