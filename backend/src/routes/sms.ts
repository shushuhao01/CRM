import { Router, Request, Response } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/templates', async (_req: Request, res: Response) => {
  try {
    const templates = [
      {
        id: 'preset-1',
        name: '订单确认通知',
        category: 'order',
        content: '尊敬的{customerName}，您的订单{orderNo}已确认。',
        variables: ['{customerName}', '{orderNo}'],
        status: 'approved',
        isSystem: true,
        createTime: '2024-01-01 00:00:00'
      }
    ];
    res.json({ success: true, code: 200, data: { templates } });
  } catch (_error) {
    res.status(500).json({ success: false, code: 500, message: '获取模板失败' });
  }
});

router.post('/templates', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, category, content, variables, description } = req.body;
    const newTemplate = {
      id: 'template-' + Date.now(),
      name, category, content,
      variables: variables || [],
      description,
      status: 'pending',
      createTime: new Date().toISOString()
    };
    res.status(201).json({ success: true, code: 200, data: newTemplate });
  } catch (_error) {
    res.status(500).json({ success: false, code: 500, message: '创建模板失败' });
  }
});

router.post('/templates/:id/approve', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { approved } = req.body;
    res.json({
      success: true, code: 200,
      message: approved ? '审核通过' : '审核拒绝',
      data: { id, status: approved ? 'approved' : 'rejected' }
    });
  } catch (_error) {
    res.status(500).json({ success: false, code: 500, message: '审核失败' });
  }
});

router.get('/requests', async (_req: Request, res: Response) => {
  try {
    res.json({ success: true, code: 200, data: { requests: [], total: 0 } });
  } catch (_error) {
    res.status(500).json({ success: false, code: 500, message: '获取申请列表失败' });
  }
});

router.post('/requests', async (req: Request, res: Response) => {
  try {
    const { templateId, templateName, content, recipients, remark } = req.body;
    const newRequest = {
      id: 'sms-' + Date.now(),
      templateId, templateName, content,
      recipients: recipients || [],
      recipientCount: recipients?.length || 0,
      status: 'pending',
      remark,
      createTime: new Date().toISOString()
    };
    res.status(201).json({ success: true, code: 200, data: newRequest });
  } catch (_error) {
    res.status(500).json({ success: false, code: 500, message: '创建申请失败' });
  }
});

router.post('/requests/:id/approve', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { approved } = req.body;
    res.json({ success: true, code: 200, data: { id, status: approved ? 'approved' : 'rejected' } });
  } catch (_error) {
    res.status(500).json({ success: false, code: 500, message: '审核失败' });
  }
});

router.get('/records', async (_req: Request, res: Response) => {
  try {
    res.json({ success: true, code: 200, data: { records: [], total: 0 } });
  } catch (_error) {
    res.status(500).json({ success: false, code: 500, message: '获取记录失败' });
  }
});

router.post('/send', async (req: Request, res: Response) => {
  try {
    const { templateId, recipients, content } = req.body;
    if (!recipients || recipients.length === 0) {
      return res.status(400).json({ success: false, code: 400, message: '接收人不能为空' });
    }
    const sendRecord = {
      id: 'record-' + Date.now(),
      templateId, content,
      recipientCount: recipients.length,
      successCount: recipients.length,
      failCount: 0,
      status: 'completed',
      sentAt: new Date().toISOString()
    };
    res.json({ success: true, code: 200, data: sendRecord });
  } catch (_error) {
    res.status(500).json({ success: false, code: 500, message: '发送失败' });
  }
});

router.get('/statistics', async (_req: Request, res: Response) => {
  try {
    res.json({
      success: true, code: 200,
      data: { pendingTemplates: 0, pendingSms: 0, todaySent: 0, totalSent: 0 }
    });
  } catch (_error) {
    res.status(500).json({ success: false, code: 500, message: '获取统计失败' });
  }
});

export default router;
