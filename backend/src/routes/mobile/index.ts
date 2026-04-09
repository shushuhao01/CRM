import { Router } from 'express';
import { registerAuthRoutes } from './auth';
import { registerCallsRoutes } from './calls';
import { registerStatsRoutes } from './stats';
import { registerInterfacesRoutes } from './interfaces';

const router = Router();

// Register route groups (auth routes handle their own middleware)
registerAuthRoutes(router);
registerCallsRoutes(router);
registerStatsRoutes(router);
registerInterfacesRoutes(router);

export default router;
