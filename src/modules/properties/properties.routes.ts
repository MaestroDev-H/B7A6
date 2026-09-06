import { Router } from 'express';
import { PropertiesController } from './properties.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/rbac.middleware';
import { validateRequest } from '../../middlewares/validate.middleware';
import { createPropertySchema, updatePropertySchema, listPropertiesQuerySchema } from './properties.validation';

const router = Router();

// Public discovery - supports pagination, filtering, sorting, search
router.get('/', validateRequest(listPropertiesQuerySchema), PropertiesController.list);
router.get('/my-properties', authenticate, authorize('OWNER'), PropertiesController.myProperties);
router.get('/:id', PropertiesController.getById);

router.post('/', authenticate, authorize('OWNER'), validateRequest(createPropertySchema), PropertiesController.create);
router.patch('/:id', authenticate, authorize('OWNER', 'ADMIN'), validateRequest(updatePropertySchema), PropertiesController.update);
router.delete('/:id', authenticate, authorize('OWNER', 'ADMIN'), PropertiesController.remove);

export const PropertiesRoutes = router;
