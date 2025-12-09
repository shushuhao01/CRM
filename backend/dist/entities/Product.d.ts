import { ProductCategory } from './ProductCategory';
export declare class Product {
    id: string;
    code: string;
    name: string;
    categoryId?: string;
    categoryName?: string;
    description?: string;
    price: number;
    costPrice?: number;
    stock: number;
    minStock: number;
    unit: string;
    specifications?: Record<string, any>;
    images?: string[];
    status: 'active' | 'inactive';
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    category?: ProductCategory;
}
//# sourceMappingURL=Product.d.ts.map