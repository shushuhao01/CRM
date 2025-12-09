export interface ExpressTraceItem {
    time: string;
    location?: string;
    description: string;
    status?: string;
    operator?: string;
    phone?: string;
}
export interface ExpressQueryResult {
    success: boolean;
    trackingNo: string;
    companyCode: string;
    companyName: string;
    status: string;
    statusDescription: string;
    currentLocation?: string;
    traces: ExpressTraceItem[];
    rawData?: any;
    error?: string;
}
export interface ExpressCompany {
    code: string;
    name: string;
    phone?: string;
    website?: string;
}
export declare class ExpressAPIService {
    private static instance;
    private readonly timeout;
    private readonly kuaidi100Config;
    private readonly kdniaoConfig;
    private readonly supportedCompanies;
    private constructor();
    static getInstance(): ExpressAPIService;
    /**
     * 查询物流信息
     */
    queryExpress(trackingNo: string, companyCode: string): Promise<ExpressQueryResult>;
    /**
     * 使用快递100 API查询
     */
    private queryByKuaidi100;
    /**
     * 使用快递鸟API查询
     */
    private queryByKdniao;
    /**
     * 生成模拟数据
     */
    private generateMockData;
    /**
     * 映射快递100状态
     */
    private mapKuaidi100Status;
    /**
     * 映射快递鸟状态
     */
    private mapKdniaoStatus;
    /**
     * 获取状态描述
     */
    private getStatusDescription;
    /**
     * 获取快递鸟状态描述
     */
    private getKdniaoStatusDescription;
    /**
     * 获取快递公司名称
     */
    getCompanyName(companyCode: string): string;
    /**
     * 获取支持的快递公司列表
     */
    getSupportedCompanies(): ExpressCompany[];
    /**
     * 检查API配置是否有效
     */
    isConfigured(): boolean;
    /**
     * 获取配置状态
     */
    getConfigStatus(): {
        kuaidi100: boolean;
        kdniao: boolean;
        configured: boolean;
    };
}
//# sourceMappingURL=ExpressAPIService.d.ts.map