import { Request, Response } from 'express';
export declare class QRConnectionController {
    /**
     * 生成连接二维码
     */
    generateQRCode(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * 获取连接状态
     */
    getConnectionStatus(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * 断开设备连接
     */
    disconnectDevice(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * 获取已连接设备列表
     */
    getConnectedDevices(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * 模拟设备连接（用于测试）
     */
    connectDevice(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
export declare const qrConnectionController: QRConnectionController;
//# sourceMappingURL=qr-connection.d.ts.map