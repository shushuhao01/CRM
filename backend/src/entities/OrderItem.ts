import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Order } from './Order';
import { Product } from './Product';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('varchar', { name: 'tenant_id', length: 36, nullable: true })
  tenantId: string | null;

  // 🔥 性能关键索引：商品列表销量聚合按 product_id 过滤（缺失时 order_items 全表扫描，
  // 低配服务器上单次查询可达数秒并拖垮整个站点，见 AutoMigrationService 启动自动补建）
  @Index('idx_order_items_productId')
  @Column({ type: 'varchar', length: 50, comment: '产品ID' })
  productId: string;

  // 订单编辑重写明细（DELETE WHERE orderId）与按订单查明细均走此索引
  @Index('idx_order_items_orderId')
  @Column({ type: 'varchar', length: 50, comment: '订单ID' })
  orderId: string;

  @Column({ length: 100, comment: '产品名称（快照）' })
  productName: string;

  @Column({ length: 50, nullable: true, comment: '产品SKU（快照）' })
  productSku: string;

  @Column({ name: 'sku_id', type: 'varchar', length: 50, nullable: true, comment: 'SKU ID' })
  skuId: string | null;

  @Column({ name: 'sku_name', type: 'varchar', length: 200, nullable: true, comment: 'SKU规格名称快照' })
  skuName: string | null;

  @Column({ name: 'sku_image', type: 'varchar', length: 500, nullable: true, comment: 'SKU图片快照' })
  skuImage: string | null;

  @Column({ name: 'spec_values', type: 'json', nullable: true, comment: 'SKU规格值快照' })
  specValues: Record<string, string> | null;

  @Column({ type: 'varchar', length: 500, nullable: true, comment: '产品图片URL（快照）' })
  productImage: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, comment: '单价（快照）' })
  unitPrice: number;

  @Column({ type: 'int', comment: '数量' })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, comment: '小计金额' })
  subtotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, comment: '优惠金额' })
  discountAmount: number;

  @Column({ type: 'text', nullable: true, comment: '备注' })
  notes?: string;

  // 关联关系
  @ManyToOne(() => Order, order => order.orderItems)
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'productId' })
  product: Product;
}
