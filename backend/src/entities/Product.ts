import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm'
import { ProductCategory } from './ProductCategory'

@Entity('products')
export class Product {
  @PrimaryColumn({ type: 'varchar', length: 50, comment: '产品ID' })
  id: string

  @Column({ type: 'varchar', length: 50, unique: true, comment: '产品编码' })
  code: string

  @Column({ type: 'varchar', length: 200, comment: '产品名称' })
  name: string

  @Column({ name: 'category_id', type: 'varchar', length: 50, nullable: true, comment: '分类ID' })
  categoryId?: string

  @Column({ name: 'category_name', type: 'varchar', length: 100, nullable: true, comment: '分类名称' })
  categoryName?: string

  @Column({ type: 'text', nullable: true, comment: '产品描述' })
  description?: string

  @Column({ type: 'decimal', precision: 10, scale: 2, comment: '销售价格' })
  price: number

  @Column({ name: 'cost_price', type: 'decimal', precision: 10, scale: 2, nullable: true, comment: '成本价格' })
  costPrice?: number

  @Column({ type: 'int', default: 0, comment: '库存数量' })
  stock: number

  @Column({ name: 'min_stock', type: 'int', default: 0, comment: '最小库存' })
  minStock: number

  @Column({ type: 'varchar', length: 20, default: '件', comment: '单位' })
  unit: string

  @Column({ type: 'json', nullable: true, comment: '规格参数' })
  specifications?: Record<string, any>

  @Column({ type: 'json', nullable: true, comment: '产品图片' })
  images?: string[]

  @Column({
    type: 'enum',
    enum: ['active', 'inactive'],
    default: 'active',
    comment: '状态'
  })
  status: 'active' | 'inactive'

  @Column({ name: 'created_by', type: 'varchar', length: 50, comment: '创建人' })
  createdBy: string

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', comment: '更新时间' })
  updatedAt: Date

  // 关联关系
  @ManyToOne(() => ProductCategory, category => category.products)
  @JoinColumn({ name: 'category_id' })
  category?: ProductCategory
}
