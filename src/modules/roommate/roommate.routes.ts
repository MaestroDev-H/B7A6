import { Router } from 'express';
import { RoommateController } from './roommate.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/rbac.middleware';
import { validateRequest } from '../../middlewares/validate.middleware';
import { upsertPreferenceSchema } from './roommate.validation';

const router = Router();

router.put('/preference', authenticate, authorize('TENANT'), validateRequest(upsertPreferenceSchema), RoommateController.upsertPreference);
router.get('/preference/me', authenticate, authorize('TENANT'), RoommateController.myPreference);
router.get('/matches', authenticate, authorize('TENANT'), RoommateController.findMatches);
router.get('/matching-rooms', authenticate, authorize('TENANT'), RoommateController.findMatchingRooms);

export const RoommateRoutes = router;
