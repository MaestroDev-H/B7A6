import { Router } from 'express';
import { MaintenanceController } from './maintenance.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/rbac.middleware';
import { validateRequest } from '../../middlewares/validate.middleware';
import { createMaintenanceSchema, updateMaintenanceStatusSchema } from './maintenance.validation';

const router = Router();

router.post('/', authenticate, authorize('TENANT'), validateRequest(createMaintenanceSchema), MaintenanceController.create);
router.get('/my-requests', authenticate, authorize('TENANT'), MaintenanceController.myRequests);
router.get('/', authenticate, authorize('OWNER', 'ADMIN'), MaintenanceController.ownerRequests);
router.patch('/:id/status', authenticate, authorize('OWNER', 'ADMIN'), validateRequest(updateMaintenanceStatusSchema), MaintenanceController.updateStatus);

export const MaintenanceRoutes = router;
