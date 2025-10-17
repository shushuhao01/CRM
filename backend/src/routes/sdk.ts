import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { logger } from '../config/logger';
import { catchAsync } from '../middleware/errorHandler';

const router = Router();

/**
 * SDK下载接口
 * GET /api/v1/sdk/download/:platform
 */
router.get('/download/:platform', catchAsync(async (req: Request, res: Response): Promise<Response | void> => {
  const { platform } = req.params;
  
  // 验证平台参数
  if (!platform || !['android', 'ios'].includes(platform.toLowerCase())) {
    return res.status(400).json({
      success: false,
      message: '无效的平台参数，支持的平台: android, ios',
      code: 'INVALID_PLATFORM'
    });
  }

  // 确定文件路径和名称
  const fileName = platform.toLowerCase() === 'android' 
    ? 'CRM-Mobile-SDK-1.0.0-release.apk'
    : 'crm-mobile-sdk-ios.ipa';
  
  // 从前端项目的public/downloads目录获取文件
  const filePath = path.join(process.cwd(), '..', 'public', 'downloads', fileName);
  
  logger.info(`SDK下载请求: ${platform}, 文件路径: ${filePath}`);

  // 检查文件是否存在
  if (!fs.existsSync(filePath)) {
    logger.error(`SDK文件不存在: ${filePath}`);
    return res.status(404).json({
      success: false,
      message: `${platform.toUpperCase()} SDK文件不存在`,
      code: 'SDK_FILE_NOT_FOUND'
    });
  }

  try {
    // 获取文件信息
    const stats = fs.statSync(filePath);
    const fileSize = stats.size;
    
    // 设置响应头
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', fileSize.toString());
    res.setHeader('Cache-Control', 'no-cache');
    
    // 记录下载日志
    logger.info(`开始下载SDK: ${platform}, 文件大小: ${fileSize} bytes, IP: ${req.ip}`);
    
    // 创建文件流并发送
    const fileStream = fs.createReadStream(filePath);
    
    fileStream.on('error', (error) => {
      logger.error(`SDK文件流读取错误: ${error.message}`);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: '文件读取失败',
          code: 'FILE_READ_ERROR'
        });
      }
    });

    fileStream.on('end', () => {
      logger.info(`SDK下载完成: ${platform}, IP: ${req.ip}`);
    });

    // 管道传输文件
    return fileStream.pipe(res);

  } catch (error: any) {
    logger.error(`SDK下载处理错误: ${error.message}`);
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
}));

/**
 * 获取SDK信息接口
 * GET /api/v1/sdk/info/:platform
 */
router.get('/info/:platform', catchAsync(async (req: Request, res: Response): Promise<Response | void> => {
  const { platform } = req.params;
  
  // 验证平台参数
  if (!platform || !['android', 'ios'].includes(platform.toLowerCase())) {
    return res.status(400).json({
      success: false,
      message: '无效的平台参数，支持的平台: android, ios',
      code: 'INVALID_PLATFORM'
    });
  }

  const fileName = platform.toLowerCase() === 'android' 
    ? 'CRM-Mobile-SDK-1.0.0-release.apk'
    : 'crm-mobile-sdk-ios.ipa';
  
  const filePath = path.join(process.cwd(), '..', 'public', 'downloads', fileName);
  
  try {
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      
      // 格式化文件大小
      const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
      };
      
      res.json({
        success: true,
        data: {
          platform: platform.toLowerCase(),
          fileName,
          fileSize: stats.size,
          fileSizeFormatted: formatFileSize(stats.size),
          lastModified: stats.mtime,
          version: '1.0.0',
          buildType: platform.toLowerCase() === 'android' ? 'release' : 'production',
          packageType: platform.toLowerCase() === 'android' ? 'APK' : 'IPA',
          supportedSystems: platform.toLowerCase() === 'android' ? 'Android 5.0+' : 'iOS 12.0+',
          available: true,
          downloadUrl: `/api/v1/sdk/download/${platform.toLowerCase()}`
        }
      });
    } else {
      res.json({
        success: true,
        data: {
          platform: platform.toLowerCase(),
          fileName,
          available: false,
          message: 'SDK文件暂不可用'
        }
      });
    }
  } catch (error: any) {
    logger.error(`获取SDK信息错误: ${error.message}`);
    res.status(500).json({
      success: false,
      message: '获取SDK信息失败',
      code: 'GET_SDK_INFO_ERROR'
    });
  }
}));

/**
 * 获取所有可用SDK列表
 * GET /api/v1/sdk/list
 */
router.get('/list', catchAsync(async (req: Request, res: Response): Promise<Response | void> => {
  const platforms = ['android', 'ios'];
  const sdkList = [];

  // 格式化文件大小的辅助函数
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  for (const platform of platforms) {
    const fileName = platform === 'android' 
      ? 'CRM-Mobile-SDK-1.0.0-release.apk'
      : 'crm-mobile-sdk-ios.ipa';
    
    const filePath = path.join(process.cwd(), '..', 'public', 'downloads', fileName);
    
    try {
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        sdkList.push({
          platform,
          fileName,
          fileSize: stats.size,
          fileSizeFormatted: formatFileSize(stats.size),
          lastModified: stats.mtime,
          version: '1.0.0',
          buildType: platform === 'android' ? 'release' : 'production',
          packageType: platform === 'android' ? 'APK' : 'IPA',
          supportedSystems: platform === 'android' ? 'Android 5.0+' : 'iOS 12.0+',
          available: true,
          downloadUrl: `/api/v1/sdk/download/${platform}`
        });
      } else {
        sdkList.push({
          platform,
          fileName,
          available: false,
          message: 'SDK文件暂不可用'
        });
      }
    } catch (error) {
      sdkList.push({
        platform,
        fileName,
        available: false,
        error: 'SDK信息获取失败'
      });
    }
  }

  res.json({
    success: true,
    data: sdkList
  });
}));

export default router;