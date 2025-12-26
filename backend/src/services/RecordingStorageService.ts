/**
 * 录音存储服务
 * 支持本地存储和云存储（阿里云OSS、腾讯云COS）
 */

import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { AppDataSource } from '../config/database';

// 录音文件信息接口
export interface RecordingFileInfo {
  id: string;
  callId: string;
  fileName: string;
  filePath: string;
  fileUrl: string;
  fileSize: number;
  duration: number;
  format: string;
  storageType: 'local' | 'oss' | 'cos';
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  userId?: string;
  userName?: string;
}

// 存储配置接口
export interface StorageConfig {
  type: 'local' | 'oss' | 'cos';
  localPath?: string;
  localDomain?: string;
  // 阿里云OSS配置
  ossAccessKeyId?: string;
  ossAccessKeySecret?: string;
  ossBucket?: string;
  ossRegion?: string;
  ossEndpoint?: string;
  // 腾讯云COS配置
  cosSecretId?: string;
  cosSecretKey?: string;
  cosBucket?: string;
  cosRegion?: string;
}

class RecordingStorageService {
  private config: StorageConfig;
  private localBasePath: string;

  constructor() {
    // 默认配置
    this.config = {
      type: 'local',
      localPath: './recordings',
      localDomain: process.env.API_BASE_URL || 'http://localhost:3000'
    };

    // 设置本地存储基础路径
    this.localBasePath = path.join(process.cwd(), 'recordings');

    // 确保录音目录存在
    this.ensureDirectoryExists(this.localBasePath);
  }

  /**
   * 初始化服务，从数据库加载配置
   */
  async initialize(): Promise<void> {
    try {
      const configs = await AppDataSource.query(
        `SELECT configKey, configValue FROM system_configs WHERE configGroup = 'call_settings' OR configGroup = 'storage_settings'`
      );

      const configMap: Record<string, string> = {};
      configs.forEach((c: any) => {
        configMap[c.configKey] = c.configValue;
      });

      // 更新配置
      if (configMap.storageType) {
        this.config.type = configMap.storageType as 'local' | 'oss' | 'cos';
      }
      if (configMap.recordPath) {
        this.config.localPath = configMap.recordPath;
        this.localBasePath = path.isAbsolute(configMap.recordPath)
          ? configMap.recordPath
          : path.join(process.cwd(), configMap.recordPath);
      }
      if (configMap.localDomain) {
        this.config.localDomain = configMap.localDomain;
      }

      // 确保目录存在
      this.ensureDirectoryExists(this.localBasePath);

      console.log('[RecordingStorageService] 初始化完成，存储类型:', this.config.type);
    } catch (error) {
      console.error('[RecordingStorageService] 初始化失败:', error);
    }
  }

  /**
   * 确保目录存在
   */
  private ensureDirectoryExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log('[RecordingStorageService] 创建录音目录:', dirPath);
    }
  }

  /**
   * 生成录音文件名
   */
  private generateFileName(callId: string, format: string = 'mp3'): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `recording_${callId}_${timestamp}.${format}`;
  }

  /**
   * 获取按日期组织的子目录路径
   */
  private getDateSubPath(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  }

  /**
   * 保存录音文件（从Buffer）
   */
  async saveRecording(
    callId: string,
    audioBuffer: Buffer,
    options: {
      format?: string;
      duration?: number;
      customerId?: string;
      customerName?: string;
      customerPhone?: string;
      userId?: string;
      userName?: string;
    } = {}
  ): Promise<RecordingFileInfo> {
    const format = options.format || 'mp3';
    const fileName = this.generateFileName(callId, format);
    const dateSubPath = this.getDateSubPath();

    let filePath: string;
    let fileUrl: string;
    let storageType: 'local' | 'oss' | 'cos' = this.config.type;

    switch (this.config.type) {
      case 'oss':
        // 阿里云OSS存储
        const ossResult = await this.saveToOSS(audioBuffer, `recordings/${dateSubPath}/${fileName}`);
        filePath = ossResult.path;
        fileUrl = ossResult.url;
        break;

      case 'cos':
        // 腾讯云COS存储
        const cosResult = await this.saveToCOS(audioBuffer, `recordings/${dateSubPath}/${fileName}`);
        filePath = cosResult.path;
        fileUrl = cosResult.url;
        break;

      default:
        // 本地存储
        const localResult = await this.saveToLocal(audioBuffer, dateSubPath, fileName);
        filePath = localResult.path;
        fileUrl = localResult.url;
        storageType = 'local';
    }

    // 生成录音记录ID
    const recordingId = `rec_${Date.now()}_${uuidv4().substring(0, 8)}`;

    // 保存到数据库
    await this.saveRecordingToDatabase({
      id: recordingId,
      callId,
      fileName,
      filePath,
      fileUrl,
      fileSize: audioBuffer.length,
      duration: options.duration || 0,
      format,
      storageType,
      customerId: options.customerId,
      customerName: options.customerName,
      customerPhone: options.customerPhone,
      userId: options.userId,
      userName: options.userName
    });

    // 更新通话记录
    await this.updateCallRecordWithRecording(callId, fileUrl, audioBuffer.length);

    return {
      id: recordingId,
      callId,
      fileName,
      filePath,
      fileUrl,
      fileSize: audioBuffer.length,
      duration: options.duration || 0,
      format,
      storageType,
      customerId: options.customerId,
      customerName: options.customerName,
      customerPhone: options.customerPhone,
      userId: options.userId,
      userName: options.userName
    };
  }

  /**
   * 保存到本地存储
   */
  private async saveToLocal(
    buffer: Buffer,
    subPath: string,
    fileName: string
  ): Promise<{ path: string; url: string }> {
    const fullDirPath = path.join(this.localBasePath, subPath);
    this.ensureDirectoryExists(fullDirPath);

    const fullFilePath = path.join(fullDirPath, fileName);

    await fs.promises.writeFile(fullFilePath, buffer);

    // 生成访问URL
    const relativePath = `recordings/${subPath}/${fileName}`;
    const fileUrl = `${this.config.localDomain}/api/v1/calls/recordings/stream/${encodeURIComponent(relativePath)}`;

    return {
      path: fullFilePath,
      url: fileUrl
    };
  }

  /**
   * 保存到阿里云OSS
   */
  private async saveToOSS(
    buffer: Buffer,
    objectKey: string
  ): Promise<{ path: string; url: string }> {
    // 检查OSS配置
    if (!this.config.ossAccessKeyId || !this.config.ossAccessKeySecret || !this.config.ossBucket) {
      console.warn('[RecordingStorageService] OSS配置不完整，回退到本地存储');
      const parts = objectKey.split('/');
      const fileName = parts.pop() || '';
      const subPath = parts.slice(1).join('/');
      return this.saveToLocal(buffer, subPath, fileName);
    }

    try {
      // 动态导入阿里云OSS SDK
      let OSS: any;
      try {
        OSS = (await import('ali-oss')).default;
      } catch {
        console.warn('[RecordingStorageService] ali-oss未安装，回退到本地存储');
        const parts = objectKey.split('/');
        const fileName = parts.pop() || '';
        const subPath = parts.slice(1).join('/');
        return this.saveToLocal(buffer, subPath, fileName);
      }

      const client = new OSS({
        accessKeyId: this.config.ossAccessKeyId,
        accessKeySecret: this.config.ossAccessKeySecret,
        bucket: this.config.ossBucket,
        region: this.config.ossRegion || 'oss-cn-hangzhou',
        endpoint: this.config.ossEndpoint
      });

      const result = await client.put(objectKey, buffer);

      return {
        path: objectKey,
        url: result.url
      };
    } catch (error) {
      console.error('[RecordingStorageService] OSS上传失败:', error);
      // 回退到本地存储
      const parts = objectKey.split('/');
      const fileName = parts.pop() || '';
      const subPath = parts.slice(1).join('/');
      return this.saveToLocal(buffer, subPath, fileName);
    }
  }

  /**
   * 保存到腾讯云COS
   */
  private async saveToCOS(
    buffer: Buffer,
    objectKey: string
  ): Promise<{ path: string; url: string }> {
    // 检查COS配置
    if (!this.config.cosSecretId || !this.config.cosSecretKey || !this.config.cosBucket) {
      console.warn('[RecordingStorageService] COS配置不完整，回退到本地存储');
      const parts = objectKey.split('/');
      const fileName = parts.pop() || '';
      const subPath = parts.slice(1).join('/');
      return this.saveToLocal(buffer, subPath, fileName);
    }

    try {
      // 动态导入腾讯云COS SDK
      let COS: any;
      try {
        // @ts-expect-error - cos-nodejs-sdk-v5 may not be installed
        COS = (await import('cos-nodejs-sdk-v5')).default;
      } catch {
        console.warn('[RecordingStorageService] cos-nodejs-sdk-v5未安装，回退到本地存储');
        const parts = objectKey.split('/');
        const fileName = parts.pop() || '';
        const subPath = parts.slice(1).join('/');
        return this.saveToLocal(buffer, subPath, fileName);
      }

      const client = new COS({
        SecretId: this.config.cosSecretId,
        SecretKey: this.config.cosSecretKey
      });

      return new Promise((resolve, reject) => {
        client.putObject({
          Bucket: this.config.cosBucket,
          Region: this.config.cosRegion || 'ap-guangzhou',
          Key: objectKey,
          Body: buffer
        }, (err: any, _data: any) => {
          if (err) {
            reject(err);
          } else {
            resolve({
              path: objectKey,
              url: `https://${this.config.cosBucket}.cos.${this.config.cosRegion}.myqcloud.com/${objectKey}`
            });
          }
        });
      });
    } catch (error) {
      console.error('[RecordingStorageService] COS上传失败:', error);
      // 回退到本地存储
      const parts = objectKey.split('/');
      const fileName = parts.pop() || '';
      const subPath = parts.slice(1).join('/');
      return this.saveToLocal(buffer, subPath, fileName);
    }
  }

  /**
   * 保存录音记录到数据库
   */
  private async saveRecordingToDatabase(info: RecordingFileInfo): Promise<void> {
    try {
      await AppDataSource.query(
        `INSERT INTO call_recordings
         (id, call_id, customer_id, customer_name, customer_phone, file_name, file_path, file_url, file_size, duration, format, storage_type, user_id, user_name)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          info.id,
          info.callId,
          info.customerId || null,
          info.customerName || null,
          info.customerPhone || null,
          info.fileName,
          info.filePath,
          info.fileUrl,
          info.fileSize,
          info.duration,
          info.format,
          info.storageType,
          info.userId || null,
          info.userName || null
        ]
      );
    } catch (error) {
      console.error('[RecordingStorageService] 保存录音记录到数据库失败:', error);
      throw error;
    }
  }

  /**
   * 更新通话记录的录音信息
   */
  private async updateCallRecordWithRecording(
    callId: string,
    recordingUrl: string,
    recordingSize: number
  ): Promise<void> {
    try {
      await AppDataSource.query(
        `UPDATE call_records SET recording_url = ?, has_recording = 1, recording_size = ?, updated_at = NOW() WHERE id = ?`,
        [recordingUrl, recordingSize, callId]
      );
    } catch (error) {
      console.error('[RecordingStorageService] 更新通话记录失败:', error);
    }
  }

  /**
   * 获取录音文件流（用于播放/下载）
   */
  async getRecordingStream(recordingPath: string): Promise<{
    stream: fs.ReadStream | Buffer;
    contentType: string;
    fileName: string;
  } | null> {
    try {
      // 解码路径
      const decodedPath = decodeURIComponent(recordingPath);

      // 检查是否是本地文件
      if (decodedPath.startsWith('recordings/')) {
        const fullPath = path.join(this.localBasePath, decodedPath.replace('recordings/', ''));

        if (!fs.existsSync(fullPath)) {
          console.error('[RecordingStorageService] 录音文件不存在:', fullPath);
          return null;
        }

        const fileName = path.basename(fullPath);
        const ext = path.extname(fileName).toLowerCase();
        let contentType = 'audio/mpeg';

        if (ext === '.wav') contentType = 'audio/wav';
        else if (ext === '.ogg') contentType = 'audio/ogg';
        else if (ext === '.m4a') contentType = 'audio/mp4';

        return {
          stream: fs.createReadStream(fullPath),
          contentType,
          fileName
        };
      }

      // 云存储文件需要从数据库获取信息
      const records = await AppDataSource.query(
        `SELECT * FROM call_recordings WHERE file_path = ? OR file_url LIKE ?`,
        [decodedPath, `%${decodedPath}%`]
      );

      if (records.length === 0) {
        return null;
      }

      const record = records[0];

      if (record.storage_type === 'local') {
        if (!fs.existsSync(record.file_path)) {
          return null;
        }
        return {
          stream: fs.createReadStream(record.file_path),
          contentType: `audio/${record.format || 'mpeg'}`,
          fileName: record.file_name
        };
      }

      // 云存储需要下载
      // 这里简化处理，实际应该使用SDK获取
      return null;
    } catch (error) {
      console.error('[RecordingStorageService] 获取录音流失败:', error);
      return null;
    }
  }

  /**
   * 删除录音文件
   */
  async deleteRecording(recordingId: string): Promise<boolean> {
    try {
      // 获取录音信息
      const records = await AppDataSource.query(
        `SELECT * FROM call_recordings WHERE id = ?`,
        [recordingId]
      );

      if (records.length === 0) {
        return false;
      }

      const record = records[0];

      // 删除文件
      if (record.storage_type === 'local' && fs.existsSync(record.file_path)) {
        await fs.promises.unlink(record.file_path);
      }
      // TODO: 云存储删除

      // 更新数据库
      await AppDataSource.query(
        `UPDATE call_recordings SET is_deleted = 1, deleted_at = NOW() WHERE id = ?`,
        [recordingId]
      );

      // 更新通话记录
      await AppDataSource.query(
        `UPDATE call_records SET has_recording = 0, recording_url = NULL WHERE id = ?`,
        [record.call_id]
      );

      return true;
    } catch (error) {
      console.error('[RecordingStorageService] 删除录音失败:', error);
      return false;
    }
  }

  /**
   * 清理过期录音
   */
  async cleanupExpiredRecordings(): Promise<number> {
    try {
      // 获取过期录音
      const expiredRecords = await AppDataSource.query(
        `SELECT * FROM call_recordings WHERE expire_at IS NOT NULL AND expire_at < NOW() AND is_deleted = 0`
      );

      let deletedCount = 0;

      for (const record of expiredRecords) {
        const success = await this.deleteRecording(record.id);
        if (success) deletedCount++;
      }

      console.log(`[RecordingStorageService] 清理了 ${deletedCount} 个过期录音`);
      return deletedCount;
    } catch (error) {
      console.error('[RecordingStorageService] 清理过期录音失败:', error);
      return 0;
    }
  }

  /**
   * 获取存储统计信息
   */
  async getStorageStats(): Promise<{
    totalRecordings: number;
    totalSize: number;
    totalDuration: number;
    byStorageType: Record<string, { count: number; size: number }>;
  }> {
    try {
      const stats = await AppDataSource.query(
        `SELECT
           COUNT(*) as total_count,
           COALESCE(SUM(file_size), 0) as total_size,
           COALESCE(SUM(duration), 0) as total_duration
         FROM call_recordings WHERE is_deleted = 0`
      );

      const byType = await AppDataSource.query(
        `SELECT
           storage_type,
           COUNT(*) as count,
           COALESCE(SUM(file_size), 0) as size
         FROM call_recordings
         WHERE is_deleted = 0
         GROUP BY storage_type`
      );

      const byStorageType: Record<string, { count: number; size: number }> = {};
      byType.forEach((t: any) => {
        byStorageType[t.storage_type] = {
          count: Number(t.count),
          size: Number(t.size)
        };
      });

      return {
        totalRecordings: Number(stats[0]?.total_count || 0),
        totalSize: Number(stats[0]?.total_size || 0),
        totalDuration: Number(stats[0]?.total_duration || 0),
        byStorageType
      };
    } catch (error) {
      console.error('[RecordingStorageService] 获取存储统计失败:', error);
      return {
        totalRecordings: 0,
        totalSize: 0,
        totalDuration: 0,
        byStorageType: {}
      };
    }
  }
}

// 导出单例
export const recordingStorageService = new RecordingStorageService();
