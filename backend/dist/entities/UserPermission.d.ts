import { User } from './User';
import { Permission } from './Permission';
export declare class UserPermission {
    id: number;
    userId: number;
    permissionId: number;
    grantedBy: number;
    reason: string;
    grantedAt: Date;
    user: User;
    permission: Permission;
    grantor: User;
}
//# sourceMappingURL=UserPermission.d.ts.map