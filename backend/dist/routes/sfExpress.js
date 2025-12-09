"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const sfExpressService_1 = __importDefault(require("../services/sfExpressService"));
const router = express_1.default.Router();
/**
 * 测试连接
 */
router.post('/test-connection', async (req, res) => {
    try {
        const { appId, checkWord, apiUrl } = req.body;
        if (!appId || !checkWord || !apiUrl) {
            return res.status(400).json({
                success: false,
                message: '缺少必要参数'
            });
        }
        const result = await sfExpressService_1.default.testConnection({
            appId,
            checkWord,
            apiUrl
        });
        return res.json(result);
    }
    catch (error) {
        console.error('测试连接失败:', error);
        return res.status(500).json({
            success: false,
            message: error.message || '测试连接失败'
        });
    }
});
/**
 * 设置配置
 */
router.post('/config', async (req, res) => {
    try {
        const { appId, checkWord, apiUrl, enabled } = req.body;
        if (!appId || !checkWord || !apiUrl) {
            return res.status(400).json({
                success: false,
                message: '缺少必要参数'
            });
        }
        sfExpressService_1.default.setConfig({
            appId,
            checkWord,
            apiUrl
        });
        return res.json({
            success: true,
            message: '配置保存成功'
        });
    }
    catch (error) {
        console.error('保存配置失败:', error);
        return res.status(500).json({
            success: false,
            message: error.message || '保存配置失败'
        });
    }
});
/**
 * 获取配置
 */
router.get('/config', async (req, res) => {
    try {
        const config = sfExpressService_1.default.getConfig();
        if (!config) {
            return res.json({
                success: false,
                message: '未配置'
            });
        }
        // 不返回敏感信息
        return res.json({
            success: true,
            data: {
                appId: config.appId,
                apiUrl: config.apiUrl,
                configured: true
            }
        });
    }
    catch (error) {
        console.error('获取配置失败:', error);
        return res.status(500).json({
            success: false,
            message: error.message || '获取配置失败'
        });
    }
});
/**
 * 查询物流轨迹
 */
router.post('/track', async (req, res) => {
    try {
        const { trackingNumber, orderNumber } = req.body;
        if (!trackingNumber) {
            return res.status(400).json({
                success: false,
                message: '物流单号不能为空'
            });
        }
        const result = await sfExpressService_1.default.queryRoute({
            trackingNumber,
            orderNumber
        });
        return res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
        console.error('查询物流轨迹失败:', error);
        return res.status(500).json({
            success: false,
            message: error.message || '查询失败'
        });
    }
});
/**
 * 订单筛选
 */
router.post('/filter-orders', async (req, res) => {
    try {
        const result = await sfExpressService_1.default.filterOrders(req.body);
        return res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
        console.error('订单筛选失败:', error);
        return res.status(500).json({
            success: false,
            message: error.message || '查询失败'
        });
    }
});
/**
 * 创建订单
 */
router.post('/create-order', async (req, res) => {
    try {
        const result = await sfExpressService_1.default.createOrder(req.body);
        return res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
        console.error('创建订单失败:', error);
        return res.status(500).json({
            success: false,
            message: error.message || '创建订单失败'
        });
    }
});
/**
 * 启用Mock模式
 */
router.post('/enable-mock', async (req, res) => {
    try {
        sfExpressService_1.default.enableMockMode();
        return res.json({
            success: true,
            message: 'Mock模式已启用'
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || '启用Mock模式失败'
        });
    }
});
/**
 * 禁用Mock模式
 */
router.post('/disable-mock', async (req, res) => {
    try {
        sfExpressService_1.default.disableMockMode();
        return res.json({
            success: true,
            message: 'Mock模式已禁用'
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : '禁用Mock模式失败';
        return res.status(500).json({
            success: false,
            message: errorMessage
        });
    }
});
/**
 * 获取Mock模式状态
 */
router.get('/mock-status', async (req, res) => {
    try {
        const isMock = sfExpressService_1.default.isMockMode();
        return res.json({
            success: true,
            data: { mockMode: isMock }
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : '获取Mock模式状态失败'
        });
    }
});
exports.default = router;
//# sourceMappingURL=sfExpress.js.map