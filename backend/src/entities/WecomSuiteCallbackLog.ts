/**
 * 企微服务商回调日志实体
 * 记录企微服务器推送到我们回调URL的所有事件
 */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('wecom_suite_callback_logs')
@Index('IDX_suite_cb_info_type', ['infoType'])
@Index('IDX_suite_cb_created_at', ['createdAt'])
export class WecomSuiteCallbackLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'info_type', type: 'varchar', length: 50, comment: '事件类型: suite_ticket/create_auth/cancel_auth/change_auth等' })
  infoType: string;

  @Column({ name: 'suite_id', type: 'varchar', length: 100, nullable: true })
  suiteId: string;

  @Column({ name: 'auth_corp_id', type: 'varchar', length: 100, nullable: true, comment: '授权企业CorpID' })
  authCorpId: string;

  @Column({ name: 'detail', type: 'text', nullable: true, comment: '事件详情/解密后的XML摘要' })
  detail: string;

  @Column({ name: 'status', type: 'varchar', length: 20, default: 'success', comment: '处理状态: success/failed' })
  status: string;

  @Column({ name: 'error_message', type: 'text', nullable: true, comment: '错误信息' })
  errorMessage: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

