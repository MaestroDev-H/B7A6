import { Router } from 'express';
import { ApplicationsController } from './applications.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/rbac.middleware';
import { validateRequest } from '../../middlewares/validate.middleware';
import { createApplicationSchema, reviewApplicationSchema } from './applications.validation';

const router = Router();

router.post('/', authenticate, authorize('TENANT'), validateRequest(createApplicationSchema), ApplicationsController.create);
router.get('/my-applications', authenticate, authorize('TENANT'), ApplicationsController.myApplications);
router.get('/incoming', authenticate, authorize('OWNER', 'ADMIN'), ApplicationsController.incoming);
router.patch('/:id/review', authenticate, authorize('OWNER', 'ADMIN'), validateRequest(reviewApplicationSchema), ApplicationsController.review);
router.patch('/:id/withdraw', authenticate, authorize('TENANT'), ApplicationsController.withdraw);

export const ApplicationsRoutes = router;
