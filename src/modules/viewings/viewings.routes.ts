import { Router } from 'express';
import { ViewingsController } from './viewings.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/rbac.middleware';
import { validateRequest } from '../../middlewares/validate.middleware';
import { createViewingSchema, updateViewingStatusSchema } from './viewings.validation';

const router = Router();

router.post('/', authenticate, authorize('TENANT'), validateRequest(createViewingSchema), ViewingsController.create);
router.get('/my-requests', authenticate, authorize('TENANT'), ViewingsController.myRequests);
router.get('/incoming', authenticate, authorize('OWNER', 'ADMIN'), ViewingsController.incoming);
router.patch('/:id/status', authenticate, authorize('OWNER', 'ADMIN'), validateRequest(updateViewingStatusSchema), ViewingsController.updateStatus);

export const ViewingsRoutes = router;
