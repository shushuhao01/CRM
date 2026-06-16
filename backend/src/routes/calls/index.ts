import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { registerRecordsRoutes } from './records';
import { registerRecordingsRoutes } from './recordings';
import { registerFollowupsRoutes } from './followups';
import { registerConfigRoutes } from './config';
import { registerTasksRoutes } from './tasks';
import { registerProspectsRoutes } from './prospects';

const router = Router();

// 录音流播放路由自带 token 验证（支持 URL ?token= 参数），
// 必须放在全局 authenticateToken 之前，否则 <audio> 标签无法携带 header 会被 401 拒绝
registerRecordingsRoutes(router);

router.use(authenticateToken);

// Register route groups
registerRecordsRoutes(router);
registerFollowupsRoutes(router);
registerConfigRoutes(router);
registerTasksRoutes(router);
registerProspectsRoutes(router);

export default router;
