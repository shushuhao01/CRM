import { Request, Response } from 'express';
export declare class RoleController {
    private get roleRepository();
    private get permissionRepository();
    getRoles(req: Request, res: Response): Promise<void>;
    getRoleById(req: Request, res: Response): Promise<void>;
    createRole(req: Request, res: Response): Promise<void>;
    getRoleTemplates(_req: Request, res: Response): Promise<void>;
    createRoleFromTemplate(_req: Request, res: Response): Promise<void>;
    updateRole(req: Request, res: Response): Promise<void>;
    deleteRole(req: Request, res: Response): Promise<void>;
    getRoleStats(_req: Request, res: Response): Promise<void>;
    updateRoleStatus(req: Request, res: Response): Promise<void>;
    getRolePermissions(req: Request, res: Response): Promise<void>;
    updateRolePermissions(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=RoleController.d.ts.map