import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm'
import { ProductCategory } from './ProductCategory'

@Entity('products')
@Index('IDX_products_tenant_code', ['tenantId', 'code'], { unique: true })
export class Product {
  @PrimaryColumn({ type: 'varchar', length: 50, comment: '产品ID' })
  id: string

  @Column('varchar', { name: 'tenant_id', length: 36, nullable: true })
  tenantId: string | null

  @Column({ type: 'varchar', length: 50, comment: '产品编码' })
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

  @Column({ name: 'is_recommended', type: 'tinyint', default: 0, comment: '是否推荐' })
  isRecommended: boolean

  @Column({ name: 'is_new', type: 'tinyint', default: 0, comment: '是否新品' })
  isNew: boolean

  @Column({ name: 'is_hot', type: 'tinyint', default: 0, comment: '是否热销' })
  isHot: boolean

  @Column({ name: 'product_type', type: 'varchar', length: 20, default: 'physical', comment: '商品类型: physical-普通商品, virtual-虚拟商品' })
  productType: string

  @Column({ name: 'virtual_delivery_type', type: 'varchar', length: 20, nullable: true, comment: '虚拟发货方式: none-无需发货, card_key-卡密发货, resource_link-网盘资源' })
  virtualDeliveryType: string | null

  @Column({ name: 'card_key_template', type: 'text', nullable: true, comment: '卡密模板说明' })
  cardKeyTemplate: string | null

  @Column({ name: 'resource_link_template', type: 'text', nullable: true, comment: '资源链接模板' })
  resourceLinkTemplate: string | null

  @Column({ name: 'virtual_content_encrypt', type: 'tinyint', default: 0, comment: '虚拟内容是否加密显示' })
  virtualContentEncrypt: boolean

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
