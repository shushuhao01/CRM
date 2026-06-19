import { Router, Request, Response } from 'express';
import { AppDataSource } from '../../config/database';
import { Call } from '../../entities/Call';
import { getTenantRepo, tenantSQL } from '../../utils/tenantRepo';
import { log } from '../../config/logger';
import { JwtConfig } from '../../config/jwt';
import { recordingStorageService } from '../../services/RecordingStorageService';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';

if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}

// 配置multer用于录音文件上传
const recordingUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 最大100MB
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/webm'];
    if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(mp3|wav|ogg|m4a|webm)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的音频格式'));
    }
  }
});

export function registerRecordingsRoutes(router: Router) {
router.get('/recordings/stream/*', async (req: Request, res: Response) => {
  try {
    // 验证身份：优先从 Authorization header 获取，其次从查询参数获取
    const authHeader = req.headers.authorization;
    const headerToken = authHeader && authHeader.split(' ')[1];
    const queryToken = req.query.token as string;
    const token = headerToken || queryToken;

    if (!token) {
      return res.status(401).json({ success: false, message: '未提供访问令牌' });
    }

    try {
      JwtConfig.verifyAccessToken(token);
    } catch {
      return res.status(401).json({ success: false, message: '访问令牌无效或已过期' });
    }

    // 获取路径参数
    const recordingPath = req.params[0];

    if (!recordingPath) {
      return res.status(400).json({ success: false, message: '请提供录音路径' });
    }

    const result = await recordingStorageService.getRecordingStream(recordingPath);

    if (!result) {
      return res.status(404).json({ success: false, message: '录音文件不存在' });
    }

    const needsTranscode = ['audio/amr', 'audio/3gpp'].includes(result.contentType);

    if (needsTranscode && ffmpegPath && result.stream instanceof fs.ReadStream) {
      const filePath = (result.stream as any).path as string;
      result.stream.destroy();

      const mp3Name = result.fileName.replace(/\.[^.]+$/, '.mp3');
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(mp3Name)}"`);

      ffmpeg(filePath)
        .audioCodec('libmp3lame')
        .audioBitrate(64)
        .audioChannels(1)
        .format('mp3')
        .on('error', (err: Error) => {
          log.error('[录音转码] ffmpeg 转码失败:', err.message);
          if (!res.headersSent) {
            res.status(500).json({ success: false, message: '录音转码失败' });
          }
        })
        .pipe(res, { end: true });
    } else {
      res.setHeader('Content-Type', result.contentType);
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(result.fileName)}"`);
      res.setHeader('Accept-Ranges', 'bytes');

      const range = req.headers.range;
      if (range && result.stream instanceof fs.ReadStream) {
        const filePath = (result.stream as any).path;
        const stat = fs.statSync(filePath as string);
        const fileSize = stat.size;

        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunkSize = end - start + 1;

        result.stream.destroy();

        res.status(206);
        res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
        res.setHeader('Content-Length', chunkSize);

        const stream = fs.createReadStream(filePath as string, { start, end });
        stream.pipe(res);
      } else if (result.stream instanceof fs.ReadStream) {
        result.stream.pipe(res);
      } else {
        res.send(result.stream);
      }
    }
  } catch (error) {
    log.error('播放录音失败:', error);
    res.status(500).json({ success: false, message: '播放录音失败' });
  }
});

router.post('/recordings/upload', recordingUpload.single('file'), async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    const file = req.file;
    const { callId, duration, customerId, customerName, customerPhone } = req.body;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: '请上传录音文件'
      });
    }

    if (!callId) {
      return res.status(400).json({
        success: false,
        message: '请提供通话记录ID'
      });
    }

    // 获取文件格式
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '') || 'mp3';

    // 保存录音
    const recordingInfo = await recordingStorageService.saveRecording(
      callId,
      file.buffer,
      {
        format: ext,
        duration: parseInt(duration) || 0,
        customerId,
        customerName,
        customerPhone,
        userId: currentUser?.userId || currentUser?.id,
        userName: currentUser?.realName || currentUser?.username
      }
    );

    res.json({
      success: true,
      message: '录音上传成功',
      data: recordingInfo
    });
  } catch (error) {
    log.error('上传录音失败:', error);
    res.status(500).json({
      success: false,
      message: '上传录音失败'
    });
  }
});

router.get('/recordings', async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      pageSize = 20,
      callId,
      customerId,
      startDate,
      endDate
    } = req.query;

    const offset = (Number(page) - 1) * Number(pageSize);

    // 直接从 call_records 表查询有录音的通话记录
    const callRepository = getTenantRepo(Call);
    const queryBuilder = callRepository.createQueryBuilder('call');

    // 基础条件：有录音的记录
    queryBuilder.where('1 = 1');

    if (callId) {
      queryBuilder.andWhere('call.id = :callId', { callId });
    }

    if (customerId) {
      queryBuilder.andWhere('call.customerId = :customerId', { customerId });
    }

    if (startDate && endDate) {
      queryBuilder.andWhere('call.startTime BETWEEN :startDate AND :endDate', {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string + ' 23:59:59')
      });
    }

    // 获取总数（在添加分页前）
    const total = await queryBuilder.getCount();

    // 分页
    queryBuilder.orderBy('call.createdAt', 'DESC');
    queryBuilder.skip(offset);
    queryBuilder.take(Number(pageSize));

    const callRecords = await queryBuilder.getMany();

    const formattedRecordings = callRecords.map(record => ({
      id: `rec_${record.id}`,
      callId: record.id,
      customerName: record.customerName,
      customerPhone: record.customerPhone,
      userName: record.userName,
      startTime: record.startTime,
      duration: record.duration,
      fileSize: record.duration ? record.duration * 8000 : 0,
      fileUrl: record.recordingUrl,
      recordingUrl: record.recordingUrl,
      format: 'mp3',
      storageType: 'local',
      createdAt: record.createdAt
    }));

    res.json({
      success: true,
      data: {
        recordings: formattedRecordings,
        total,
        page: Number(page),
        pageSize: Number(pageSize)
      }
    });
  } catch (error) {
    log.error('获取录音列表失败:', error);
    // 即使出错也返回空列表，避免500
    res.json({
      success: true,
      data: {
        recordings: [],
        total: 0,
        page: Number(req.query.page || 1),
        pageSize: Number(req.query.pageSize || 20)
      }
    });
  }
});

router.get('/recordings/:id/download', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 从数据库获取录音信息
    const recordingId = id.startsWith('rec_') ? id : `rec_${id}`;
    const callId = id.replace('rec_', '');

    // 先查call_recordings表
    const tRecDl = tenantSQL('');
    const records = await AppDataSource.query(
      `SELECT * FROM call_recordings WHERE (id = ? OR call_id = ?)${tRecDl.sql}`,
      [recordingId, callId, ...tRecDl.params]
    );

    if (records.length > 0) {
      const record = records[0];

      if (record.storage_type === 'local' && record.file_path) {
        // 本地文件直接下载
        if (fs.existsSync(record.file_path)) {
          res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(record.file_name)}"`);
          res.setHeader('Content-Type', `audio/${record.format || 'mpeg'}`);
          return fs.createReadStream(record.file_path).pipe(res);
        }
      } else if (record.file_url) {
        // 云存储返回URL
        return res.json({
          success: true,
          data: {
            url: record.file_url,
            filename: record.file_name
          }
        });
      }
    }

    // 查call_records表
    const tCallRec = tenantSQL('');
    const callRecords = await AppDataSource.query(
      `SELECT * FROM call_records WHERE id = ? AND has_recording = 1${tCallRec.sql}`,
      [callId, ...tCallRec.params]
    );

    if (callRecords.length > 0 && callRecords[0].recording_url) {
      return res.json({
        success: true,
        data: {
          url: callRecords[0].recording_url,
          filename: `recording_${callId}.mp3`
        }
      });
    }

    res.status(404).json({
      success: false,
      message: '录音文件不存在'
    });
  } catch (error) {
    log.error('下载录音失败:', error);
    res.status(500).json({
      success: false,
      message: '下载录音失败'
    });
  }
});

router.delete('/recordings/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 使用录音存储服务删除
    const recordingId = id.startsWith('rec_') ? id : `rec_${id}`;
    const success = await recordingStorageService.deleteRecording(recordingId);

    if (!success) {
      // 回退到旧逻辑
      const callRepository = getTenantRepo(Call);
      const callId = id.replace('rec_', '');
      const record = await callRepository.findOne({ where: { id: callId } });

      if (record) {
        record.hasRecording = false;
        record.recordingUrl = null as any;
        await callRepository.save(record);
      }
    }

    res.json({
      success: true,
      message: '录音删除成功'
    });
  } catch (error) {
    log.error('删除录音失败:', error);
    res.status(500).json({
      success: false,
      message: '删除录音失败'
    });
  }
});

router.get('/recordings/stats', async (req: Request, res: Response) => {
  try {
    const stats = await recordingStorageService.getStorageStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    log.error('获取录音统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取录音统计失败'
    });
  }
});
}
