import { Request, Response } from 'express';
export declare class RoleController {
    private get roleRepository();
    private get permissionRepository();
    private get userRepository();
    getRoles(req: Request, res: Response): Promise<void>;
    getRoleById(req: Request, res: Response): Promise<void>;
    createRole(req: Request, res: Response): Promise<void>;
    updateRole(req: Request, res: Response): Promise<void>;
    deleteRole(req: Request, res: Response): Promise<void>;
    getRoleStats(req: Request, res: Response): Promise<void>;
    getRolePermissions(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=RoleController.d.ts.map