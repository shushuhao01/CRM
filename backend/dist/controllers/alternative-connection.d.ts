import { Request, Response } from 'express';
export declare class AlternativeConnectionController {
    private connectedDevices;
    private bluetoothService;
    private networkService;
    private digitalPairingService;
    startBluetoothService(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    stopBluetoothService(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getBluetoothStatus(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    pairBluetoothDevice(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    startNetworkDiscovery(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    stopNetworkDiscovery(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getNetworkStatus(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    connectNetworkDevice(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    startDigitalPairing(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    stopDigitalPairing(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getDigitalPairingStatus(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    pairWithCode(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    generatePairingCode(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getAllConnectedDevices(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    disconnectDevice(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getConnectionStatistics(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    private generateRandomCode;
}
//# sourceMappingURL=alternative-connection.d.ts.map