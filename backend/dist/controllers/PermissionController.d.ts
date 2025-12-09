import { Request, Response } from 'express';
export declare class PermissionController {
    private get permissionRepository();
    getPermissionTree(req: Request, res: Response): Promise<void>;
    getPermissions(req: Request, res: Response): Promise<void>;
    createPermission(req: Request, res: Response): Promise<any>;
    updatePermission(req: Request, res: Response): Promise<any>;
    deletePermission(req: Request, res: Response): Promise<any>;
}
//# sourceMappingURL=PermissionController.d.ts.map