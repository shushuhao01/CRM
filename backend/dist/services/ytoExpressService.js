"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ytoExpressService = exports.YTOExpressService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const axios_1 = __importDefault(require("axios"));
/**
 * 圆通快递服务
 */
class YTOExpressService {
    /**
     * 生成MD5签名
     */
    generateSign(params, appKey) {
        // 1. 排序参数
        const sortedKeys = Object.keys(params).sort();
        // 2. 拼接字符串: appKey + key1value1key2value2... + appKey
        let signStr = appKey;
        sortedKeys.forEach(key => {
            if (key !== 'sign') { // 排除sign字段
                signStr += key + params[key];
            }
        });
        signStr += appKey;
        // 3. MD5加密并转大写
        return crypto_1.default.createHash('md5').update(signStr).digest('hex').toUpperCase();
    }
    /**
     * 测试连接
     */
    async testConnection(userId, appKey, apiUrl) {
        try {
            // 构建测试请求参数
            const params = {
                user_id: userId,
                format: 'JSON',
                method: 'yto.marketing.trace.query',
                timestamp: Date.now().toString(),
                v: '1.0',
                waybill_no: 'YT1234567890' // 测试单号
            };
            // 生成签名
            const sign = this.generateSign(params, appKey);
            const requestParams = {
                ...params,
                sign
            };
            console.log('圆通API测试请求参数:', requestParams);
            // 发送请求
            const response = await axios_1.default.post(apiUrl, null, {
                params: requestParams,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                timeout: 10000
            });
            console.log('圆通API测试响应:', response.data);
            // 检查响应
            if (response.data) {
                // 圆通API成功响应
                if (response.data.success === true || response.data.success === 'true') {
                    return {
                        success: true,
                        message: '连接成功',
                        data: response.data
                    };
                }
                // 圆通API返回错误
                return {
                    success: false,
                    message: response.data.reason || response.data.message || '连接失败',
                    data: response.data
                };
            }
            return {
                success: false,
                message: '响应数据为空'
            };
        }
        catch (error) {
            console.error('圆通API测试连接失败:', error);
            // 解析错误信息
            let errorMessage = '连接失败';
            if (error.response) {
                // 服务器返回错误响应
                errorMessage = `服务器错误: ${error.response.status}`;
                if (error.response.data) {
                    errorMessage += ` - ${error.response.data.reason || error.response.data.message || ''}`;
                }
            }
            else if (error.request) {
                // 请求已发送但没有收到响应
                errorMessage = '网络错误: 无法连接到圆通服务器';
            }
            else {
                // 请求配置错误
                errorMessage = error.message || '未知错误';
            }
            return {
                success: false,
                message: errorMessage
            };
        }
    }
    /**
     * 查询物流轨迹
     */
    async queryTracking(userId, appKey, apiUrl, waybillNo) {
        try {
            // 构建查询请求参数
            const params = {
                user_id: userId,
                format: 'JSON',
                method: 'yto.marketing.trace.query',
                timestamp: Date.now().toString(),
                v: '1.0',
                waybill_no: waybillNo
            };
            // 生成签名
            const sign = this.generateSign(params, appKey);
            const requestParams = {
                ...params,
                sign
            };
            console.log('圆通物流查询请求参数:', requestParams);
            // 发送请求
            const response = await axios_1.default.post(apiUrl, null, {
                params: requestParams,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                timeout: 10000
            });
            console.log('圆通物流查询响应:', response.data);
            // 检查响应
            if (response.data) {
                if (response.data.success === true || response.data.success === 'true') {
                    // 转换为统一格式
                    const traces = response.data.traces || [];
                    const formattedTraces = traces.map((trace) => ({
                        time: trace.scan_date || trace.time,
                        location: trace.scan_city || trace.location,
                        station: trace.scan_site || trace.station,
                        status: trace.remark || trace.status,
                        description: trace.remark || trace.description
                    }));
                    return {
                        success: true,
                        message: '查询成功',
                        data: {
                            waybillNo: waybillNo,
                            traces: formattedTraces,
                            raw: response.data
                        }
                    };
                }
                return {
                    success: false,
                    message: response.data.reason || response.data.message || '查询失败',
                    data: response.data
                };
            }
            return {
                success: false,
                message: '响应数据为空'
            };
        }
        catch (error) {
            console.error('圆通物流查询失败:', error);
            let errorMessage = '查询失败';
            if (error.response) {
                errorMessage = `服务器错误: ${error.response.status}`;
                if (error.response.data) {
                    errorMessage += ` - ${error.response.data.reason || error.response.data.message || ''}`;
                }
            }
            else if (error.request) {
                errorMessage = '网络错误: 无法连接到圆通服务器';
            }
            else {
                errorMessage = error.message || '未知错误';
            }
            return {
                success: false,
                message: errorMessage
            };
        }
    }
}
exports.YTOExpressService = YTOExpressService;
// 导出单例
exports.ytoExpressService = new YTOExpressService();
//# sourceMappingURL=ytoExpressService.js.map