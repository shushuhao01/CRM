import { Request, Response } from 'express';
export declare class LogisticsController {
    private expressAPIService;
    private get logisticsTrackingRepository();
    private get logisticsTraceRepository();
    private get orderRepository();
    getLogisticsList(req: Request, res: Response): Promise<void>;
    createLogisticsTracking(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getLogisticsTrace(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    batchSyncLogistics(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    updateLogisticsStatus(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    private queryLogisticsInfo;
    getSupportedCompanies(req: Request, res: Response): Promise<void>;
    private mapApiStatusToLogisticsStatus;
}
//# sourceMappingURL=LogisticsController.d.ts.map