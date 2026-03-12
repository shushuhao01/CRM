import { Entity, PrimaryColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('api_call_logs')
@Index(['apiConfigId'])
@Index(['apiKey'])
@Index(['createdAt'])
@Index(['endpoint'])
export class ApiCallLog {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id!: string;

  @Column({ type: 'varchar', length: 36, nullable: true, name: 'api_config_id', comment: 'API配置ID' })
  apiConfigId?: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'api_key', comment: 'API密钥' })
  apiKey?: string;

  @Column({ type: 'varchar', length: 255, comment: '调用端点' })
  endpoint!: string;

  @Column({ type: 'varchar', length: 10, comment: '请求方法' })
  method!: string;

  @Column({ type: 'text', nullable: true, name: 'request_params', comment: '请求参数' })
  requestParams?: string;

  @Column({ type: 'int', nullable: true, name: 'response_status', comment: '响应状态码' })
  responseStatus?: number;

  @Column({ type: 'int', nullable: true, name: 'response_time', comment: '响应时间（ms）' })
  responseTime?: number;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'ip_address', comment: 'IP地址' })
  ipAddress?: string;

  @Column({ type: 'text', nullable: true, name: 'user_agent', comment: 'User Agent' })
  userAgent?: string;

  @Column({ type: 'text', nullable: true, name: 'error_message', comment: '错误信息' })
  errorMessage?: string;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt!: Date;

  // 辅助方法：判断是否成功
  isSuccess(): boolean {
    return this.responseStatus !== null && this.responseStatus >= 200 && this.responseStatus < 300;
  }

  // 辅助方法：获取请求参数对象
  getRequestParamsObject(): any {
    if (!this.requestParams) return null;
    try {
      return JSON.parse(this.requestParams);
    } catch {
      return null;
    }
  }

  // 辅助方法：设置请求参数
  setRequestParamsObject(params: any): void {
    this.requestParams = JSON.stringify(params);
  }
}
