export declare class Call {
    id: string;
    customerId: string;
    customerName: string;
    customerPhone: string;
    callType: 'outbound' | 'inbound';
    callStatus: 'connected' | 'missed' | 'busy' | 'failed' | 'rejected';
    startTime: Date;
    endTime: Date;
    duration: number;
    recordingUrl: string;
    hasRecording: boolean;
    notes: string;
    followUpRequired: boolean;
    callTags: string[];
    userId: string;
    userName: string;
    department: string;
    createdAt: Date;
    updatedAt: Date;
    static generateId(): string;
}
//# sourceMappingURL=Call.d.ts.map