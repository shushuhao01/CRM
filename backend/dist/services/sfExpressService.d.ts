interface SFExpressConfig {
    appId: string;
    checkWord: string;
    apiUrl: string;
}
interface QueryRouteParams {
    trackingNumber: string;
    orderNumber?: string;
}
declare class SFExpressService {
    private config;
    private mockMode;
    private sequenceCounter;
    private readonly ERROR_CODE_MAP;
    /**
     * 设置配置
     */
    setConfig(config: SFExpressConfig): void;
    /**
     * 获取配置
     */
    getConfig(): SFExpressConfig | null;
    /**
     * 启用Mock模式
     */
    enableMockMode(): void;
    /**
     * 禁用Mock模式
     */
    disableMockMode(): void;
    /**
     * 检查是否为Mock模式
     */
    isMockMode(): boolean;
    /**
     * 生成MD5签名
     */
    private generateSign;
    /**
     * 生成请求ID
     * 格式: 客户编码 + 时间戳(13位) + 4位序列号
     * 例如: TEST123456789012340001
     */
    private generateRequestID;
    /**
     * 获取错误信息
     */
    private getErrorMessage;
    /**
     * 通用请求方法
     * 根据顺丰丰桥API文档实现
     */
    private request;
    /**
     * 测试连接
     * 使用路由查询接口测试连接和签名是否正确
     */
    testConnection(config: SFExpressConfig): Promise<{
        success: boolean;
        message: string;
        data?: any;
    }>;
    /**
     * 查询物流轨迹
     * 服务代码: EXP_RECE_SEARCH_ROUTES
     */
    queryRoute(params: QueryRouteParams): Promise<{
        success: boolean;
        data: any;
        message: string;
        code?: undefined;
    } | {
        success: boolean;
        message: string;
        code: any;
        data?: undefined;
    }>;
    /**
     * 订单筛选
     */
    filterOrders(params: unknown): Promise<any>;
    /**
     * 创建订单
     */
    createOrder(orderData: unknown): Promise<any>;
}
declare const _default: SFExpressService;
export default _default;
//# sourceMappingURL=sfExpressService.d.ts.map