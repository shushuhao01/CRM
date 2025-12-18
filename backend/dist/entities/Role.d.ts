export declare class Role {
    id: string;
    name: string;
    code: string;
    description: string;
    status: 'active' | 'inactive';
    level: number;
    color: string;
    roleType: 'system' | 'business' | 'custom';
    isTemplate: boolean;
    createdAt: Date;
    updatedAt: Date;
    permissions: string[] | null;
}
//# sourceMappingURL=Role.d.ts.map