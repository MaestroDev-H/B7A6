import { Router } from 'express';
import { UsersController } from './users.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/rbac.middleware';
import { validateRequest } from '../../middlewares/validate.middleware';
import { updateProfileSchema, updateUserRoleSchema } from './users.validation';

const router = Router();

router.get('/me', authenticate, UsersController.getMe);
router.patch('/me', authenticate, validateRequest(updateProfileSchema), UsersController.updateMe);

// Admin-only user management
router.get('/', authenticate, authorize('ADMIN'), UsersController.listUsers);
router.patch('/:id/role', authenticate, authorize('ADMIN'), validateRequest(updateUserRoleSchema), UsersController.updateUserRole);
router.delete('/:id', authenticate, authorize('ADMIN'), UsersController.deactivateUser);

export const UsersRoutes = router;
