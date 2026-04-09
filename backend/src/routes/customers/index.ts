import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { registerCoreRoutes } from './core';
import { registerGroupRoutes } from './groups';
import { registerTagRoutes } from './tags';
import { registerRelatedRoutes } from './related';

const router = Router();

// All customer routes require authentication
router.use(authenticateToken);

// Register route groups (order matters: named routes before /:id)
// ⚠️ tags and groups MUST be registered BEFORE core routes,
// because core contains /:id which would match /tags and /groups
registerGroupRoutes(router);     // /groups/*
registerTagRoutes(router);       // /tags/*
registerCoreRoutes(router);      // GET /, POST /, check-exists, stats, search, /:id CRUD
registerRelatedRoutes(router);   // /:id/orders, /:id/services, etc.

export default router;
