export declare class SystemConfig {
    id: number;
    configKey: string;
    configValue: string;
    valueType: 'string' | 'number' | 'boolean' | 'json' | 'text';
    configGroup: string;
    description?: string;
    isEnabled: boolean;
    isSystem: boolean;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
    getParsedValue(): any;
    setParsedValue(value: any): void;
}
//# sourceMappingURL=SystemConfig.d.ts.map