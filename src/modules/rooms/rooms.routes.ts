import { Router } from 'express';
import { RoomsController } from './rooms.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/rbac.middleware';
import { validateRequest } from '../../middlewares/validate.middleware';
import { createRoomSchema, updateRoomSchema } from './rooms.validation';

const router = Router();

router.get('/', RoomsController.listAvailable);
router.get('/:id', RoomsController.getById);
router.post('/property/:propertyId', authenticate, authorize('OWNER'), validateRequest(createRoomSchema), RoomsController.create);
router.patch('/:id', authenticate, authorize('OWNER', 'ADMIN'), validateRequest(updateRoomSchema), RoomsController.update);
router.delete('/:id', authenticate, authorize('OWNER', 'ADMIN'), RoomsController.remove);

export const RoomsRoutes = router;
