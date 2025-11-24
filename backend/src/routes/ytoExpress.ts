import express from 'express'
import { ytoExpressService } from '../services/ytoExpressService'

const router = express.Router()

/**
 * 测试连接
 */
router.post('/test-connection', async (req, res) => {
  try {
    const { userId, appKey, apiUrl } = req.body

    // 验证参数
    if (!userId || !appKey || !apiUrl) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数: userId, appKey, apiUrl'
      })
    }

    // 调用服务测试连接
    const result = await ytoExpressService.testConnection(userId, appKey, apiUrl)

    res.json(result)
  } catch (error: unknown) {
    console.error('圆通API测试连接错误:', error)
    const errorMessage = error instanceof Error ? error.message : '服务器内部错误'
    res.status(500).json({
      success: false,
      message: errorMessage
    })
  }
})

/**
 * 查询物流轨迹
 */
router.post('/query-tracking', async (req, res) => {
  try {
    const { userId, appKey, apiUrl, waybillNo } = req.body

    // 验证参数
    if (!userId || !appKey || !apiUrl || !waybillNo) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数: userId, appKey, apiUrl, waybillNo'
      })
    }

    // 调用服务查询物流
    const result = await ytoExpressService.queryTracking(userId, appKey, apiUrl, waybillNo)

    res.json(result)
  } catch (error: unknown) {
    console.error('圆通物流查询错误:', error)
    const errorMessage = error instanceof Error ? error.message : '服务器内部错误'
    res.status(500).json({
      success: false,
      message: errorMessage
    })
  }
})

export default router
