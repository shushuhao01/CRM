import { Product } from './Product';
export declare class ProductCategory {
    id: string;
    name: string;
    parentId?: string;
    description?: string;
    sortOrder: number;
    status: 'active' | 'inactive';
    createdAt: Date;
    updatedAt: Date;
    products: Product[];
}
//# sourceMappingURL=ProductCategory.d.ts.map