import { Router } from 'express';
import { AdminController } from './admin.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/rbac.middleware';

const router = Router();

router.use(authenticate, authorize('ADMIN'));
router.get('/dashboard-stats', AdminController.dashboardStats);
router.get('/audit-logs', AdminController.auditLogs);

export const AdminRoutes = router;
