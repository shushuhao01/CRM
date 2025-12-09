/**
 * 圆通快递服务
 */
export declare class YTOExpressService {
    /**
     * 生成MD5签名
     */
    private generateSign;
    /**
     * 测试连接
     */
    testConnection(userId: string, appKey: string, apiUrl: string): Promise<{
        success: boolean;
        message: string;
        data?: any;
    }>;
    /**
     * 查询物流轨迹
     */
    queryTracking(userId: string, appKey: string, apiUrl: string, waybillNo: string): Promise<{
        success: boolean;
        message: string;
        data?: any;
    }>;
}
export declare const ytoExpressService: YTOExpressService;
//# sourceMappingURL=ytoExpressService.d.ts.map