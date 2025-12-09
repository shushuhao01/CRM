import { Request, Response } from 'express';
export declare class QRConnectionController {
    private connectionSessions;
    private connectedDevices;
    generateQRCode(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    connectDevice(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getConnectionStatus(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    disconnectDevice(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getConnectedDevices(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    reconnectDevice(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    private cleanExpiredSessions;
}
//# sourceMappingURL=QRConnectionController.d.ts.map