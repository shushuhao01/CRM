import { LogisticsTracking } from './LogisticsTracking';
export declare class LogisticsTrace {
    id: number;
    logisticsTrackingId: number;
    traceTime: Date;
    location?: string;
    description: string;
    status?: string;
    operator?: string;
    phone?: string;
    rawData?: Record<string, any>;
    createdAt: Date;
    logisticsTracking: LogisticsTracking;
}
//# sourceMappingURL=LogisticsTrace.d.ts.map