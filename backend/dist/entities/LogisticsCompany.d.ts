export declare class LogisticsCompany {
    id: string;
    code: string;
    name: string;
    shortName?: string;
    logo?: string;
    website?: string;
    trackingUrl?: string;
    apiUrl?: string;
    apiKey?: string;
    apiSecret?: string;
    contactPhone?: string;
    contactEmail?: string;
    serviceArea?: string;
    priceInfo?: Record<string, unknown>;
    status: 'active' | 'inactive';
    sortOrder: number;
    remark?: string;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=LogisticsCompany.d.ts.map