import { DataSource } from 'typeorm';
declare const AppDataSource: DataSource;
export { AppDataSource };
export declare const getDataSource: () => DataSource | null;
export declare const initializeDatabase: () => Promise<void>;
export declare const closeDatabase: () => Promise<void>;
//# sourceMappingURL=database.d.ts.map