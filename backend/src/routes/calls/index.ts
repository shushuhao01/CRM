import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { registerRecordsRoutes } from './records';
import { registerRecordingsRoutes } from './recordings';
import { registerFollowupsRoutes } from './followups';
import { registerConfigRoutes } from './config';
import { registerTasksRoutes } from './tasks';

const router = Router();

router.use(authenticateToken);

// Register route groups
registerRecordsRoutes(router);
registerRecordingsRoutes(router);
registerFollowupsRoutes(router);
registerConfigRoutes(router);
registerTasksRoutes(router);

export default router;
