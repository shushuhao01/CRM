import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Department } from './Department';

// 消息类型枚举
export enum MessageType {
  ORDER_CREATED = 'order_created',
  ORDER_SIGNED = 'order_signed',
  ORDER_AUDIT_REJECTED = 'order_audit_rejected',
  ORDER_AUDIT_APPROVED = 'order_audit_approved',
  CUSTOMER_CREATED = 'customer_created',
  CUSTOMER_UPDATED = 'customer_updated',
  PAYMENT_RECEIVED = 'payment_received',
  PAYMENT_OVERDUE = 'payment_overdue',
  TASK_ASSIGNED = 'task_assigned',
  TASK_COMPLETED = 'task_completed',
  SYSTEM_MAINTENANCE = 'system_maintenance'
}

// 通知方式枚举
export enum NotificationMethod {
  DINGTALK = 'dingtalk',
  WECHAT_WORK = 'wechat_work',
  WECHAT_OFFICIAL = 'wechat_official',
  EMAIL = 'email',
  SYSTEM_MESSAGE = 'system_message',
  ANNOUNCEMENT = 'announcement'
}

@Entity('message_subscriptions')
export class MessageSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    length: 50,
    comment: '消息类型'
  })
  messageType: MessageType;

  @Column({
    type: 'varchar',
    length: 100,
    comment: '消息名称'
  })
  name: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: '消息描述'
  })
  description: string;

  @Column({
    type: 'varchar',
    length: 50,
    comment: '消息分类'
  })
  category: string;

  @Column({
    type: 'boolean',
    default: false,
    comment: '是否全局启用'
  })
  isGlobalEnabled: boolean;

  @Column({
    type: 'json',
    nullable: true,
    comment: '全局通知方式'
  })
  globalNotificationMethods: NotificationMethod[];

  @CreateDateColumn({
    comment: '创建时间'
  })
  createdAt: Date;

  @UpdateDateColumn({
    comment: '更新时间'
  })
  updatedAt: Date;
}

@Entity('department_subscription_configs')
export class DepartmentSubscriptionConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    length: 50,
    comment: '消息类型'
  })
  messageType: MessageType;

  @Column({
    type: 'boolean',
    default: false,
    comment: '是否启用'
  })
  isEnabled: boolean;

  @Column({
    type: 'json',
    nullable: true,
    comment: '通知方式'
  })
  notificationMethods: NotificationMethod[];

  @ManyToOne(() => Department)
  @JoinColumn({ name: 'departmentId' })
  department: Department;

  @CreateDateColumn({
    comment: '创建时间'
  })
  createdAt: Date;

  @UpdateDateColumn({
    comment: '更新时间'
  })
  updatedAt: Date;
}