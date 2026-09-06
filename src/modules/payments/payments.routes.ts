import { Router } from 'express';
import { PaymentsController } from './payments.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { validateRequest } from '../../middlewares/validate.middleware';
import { initiatePaymentSchema } from './payments.validation';

const router = Router();

// NOTE: /webhook is NOT here - it's mounted separately in app.ts before the
// global JSON body parser, since Stripe requires the raw request body for
// signature verification.

router.post('/initiate', authenticate, validateRequest(initiatePaymentSchema), PaymentsController.initiate);
router.get('/success', PaymentsController.successRedirect);
router.get('/cancel', PaymentsController.cancelRedirect);
router.get('/my-payments', authenticate, PaymentsController.myPayments);
router.get('/:id', authenticate, PaymentsController.getStatus);

export const PaymentsRoutes = router;
