/**
 * Admin Upload Routes - 通用文件上传
 */
import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// 确保上传目录存在
const uploadBaseDir = path.join(process.cwd(), 'uploads', 'admin');
if (!fs.existsSync(uploadBaseDir)) {
  fs.mkdirSync(uploadBaseDir, { recursive: true });
}

// 配置 multer 存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // 根据类别创建子目�?
    const category = (req.query.category as string) || 'general';
    const dir = path.join(uploadBaseDir, category);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  }
});

// 文件类型过滤
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const category = (req.query.category as string) || 'general';

  if (category === 'image') {
    // 图片类型限制
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('仅支�?jpg、png、gif、webp、svg 格式图片'));
    }
  } else if (category === 'cert') {
    // 证书文件
    const allowedExts = ['.pem', '.crt', '.key', '.p12', '.pfx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('仅支�?pem、crt、key、p12、pfx 格式证书文件'));
    }
  } else {
    // 通用类型
    cb(null, true);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// 单文件上�?
router.post('/', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: '请选择要上传的文件' });
    }

    const category = (req.query.category as string) || 'general';
    const relativePath = `/uploads/admin/${category}/${req.file.filename}`;

    res.json({
      success: true,
      message: '上传成功',
      data: {
        url: relativePath,
        filename: req.file.filename,
        originalname: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    });
  } catch (error: any) {
    console.error('[Admin Upload] Upload failed:', error);
    res.status(500).json({ success: false, message: error.message || '上传失败' });
  }
});

// 多文件上�?
router.post('/multiple', upload.array('files', 10), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, message: '请选择要上传的文件' });
    }

    const category = (req.query.category as string) || 'general';
    const results = files.map(file => ({
      url: `/uploads/admin/${category}/${file.filename}`,
      filename: file.filename,
      originalname: file.originalname,
      size: file.size,
      mimetype: file.mimetype
    }));

    res.json({
      success: true,
      message: '上传成功',
      data: results
    });
  } catch (error: any) {
    console.error('[Admin Upload] Multiple upload failed:', error);
    res.status(500).json({ success: false, message: error.message || '上传失败' });
  }
});

export default router;
