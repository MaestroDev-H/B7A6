import { Router } from 'express';
import { TenanciesController } from './tenancies.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/rbac.middleware';
import { validateRequest } from '../../middlewares/validate.middleware';
import { endTenancySchema, generateInvoiceSchema } from './tenancies.validation';

const router = Router();

router.get('/my-tenancies', authenticate, authorize('TENANT'), TenanciesController.myTenancies);
router.get('/my-invoices', authenticate, authorize('TENANT'), TenanciesController.myInvoices);
router.get('/', authenticate, authorize('OWNER', 'ADMIN'), TenanciesController.ownerTenancies);
router.get('/:id', authenticate, TenanciesController.getById);
router.patch('/:id/end', authenticate, authorize('OWNER', 'TENANT', 'ADMIN'), validateRequest(endTenancySchema), TenanciesController.end);
router.post('/:id/invoices', authenticate, authorize('OWNER', 'ADMIN'), validateRequest(generateInvoiceSchema), TenanciesController.generateInvoice);

export const TenanciesRoutes = router;
