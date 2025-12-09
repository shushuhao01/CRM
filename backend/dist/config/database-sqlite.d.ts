import sqlite3 from 'sqlite3';
import { Database } from 'sqlite';
export interface DatabaseConfig {
    filename: string;
    driver: typeof sqlite3.Database;
}
export declare const dbConfig: DatabaseConfig;
export declare function getDatabase(): Promise<Database>;
export declare function closeDatabase(): Promise<void>;
export declare function initializeDatabase(): Promise<void>;
export declare function backupDatabase(backupPath: string): Promise<void>;
export declare function restoreDatabase(backupPath: string): Promise<void>;
//# sourceMappingURL=database-sqlite.d.ts.map