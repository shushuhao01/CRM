import { Request, Response } from 'express';
export declare class ProductController {
    /**
     * 获取产品分类列表（扁平结构）
     */
    static getCategories(req: Request, res: Response): Promise<void>;
    /**
     * 获取产品分类树形结构
     */
    static getCategoryTree(req: Request, res: Response): Promise<void>;
    /**
     * 获取分类详情
     */
    static getCategoryDetail(req: Request, res: Response): Promise<void>;
    /**
     * 创建产品分类
     */
    static createCategory(req: Request, res: Response): Promise<void>;
    /**
     * 更新产品分类
     */
    static updateCategory(req: Request, res: Response): Promise<void>;
    /**
     * 删除产品分类
     */
    static deleteCategory(req: Request, res: Response): Promise<void>;
    /**
     * 获取产品列表
     */
    static getProducts(req: Request, res: Response): Promise<void>;
    /**
     * 获取产品详情
     */
    static getProductDetail(req: Request, res: Response): Promise<void>;
    /**
     * 创建产品
     */
    static createProduct(req: Request, res: Response): Promise<void>;
    /**
     * 更新产品
     */
    static updateProduct(req: Request, res: Response): Promise<void>;
    /**
     * 删除产品
     */
    static deleteProduct(req: Request, res: Response): Promise<void>;
    /**
     * 库存调整
     */
    static adjustStock(req: Request, res: Response): Promise<void>;
    /**
     * 获取库存调整记录
     */
    static getStockAdjustments(req: Request, res: Response): Promise<void>;
    /**
     * 批量导入产品
     */
    static batchImportProducts(req: Request, res: Response): Promise<void>;
    /**
     * 导出产品数据
     */
    static exportProducts(req: Request, res: Response): Promise<void>;
    /**
     * 获取商品相关统计数据（根据用户角色权限过滤）
     */
    static getProductStats(req: Request, res: Response): Promise<void>;
    /**
     * 获取库存统计信息
     */
    static getStockStatistics(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=ProductController.d.ts.map