import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm'
import { Product } from './Product'

@Entity('product_categories')
export class ProductCategory {
  @PrimaryColumn({ type: 'varchar', length: 50, comment: '分类ID' })
  id: string

  @Column({ length: 100, comment: '分类名称' })
  name: string

  @Column({ name: 'parent_id', type: 'varchar', length: 50, nullable: true, comment: '上级分类ID' })
  parentId?: string

  @Column({ type: 'text', nullable: true, comment: '分类描述' })
  description?: string

  @Column({ name: 'sort_order', type: 'int', default: 0, comment: '排序' })
  sortOrder: number

  @Column({
    type: 'enum',
    enum: ['active', 'inactive'],
    default: 'active',
    comment: '状态'
  })
  status: 'active' | 'inactive'

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', comment: '更新时间' })
  updatedAt: Date

  // 关联关系
  @OneToMany(() => Product, product => product.category)
  products: Product[]
}
