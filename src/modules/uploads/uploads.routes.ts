import { Router } from 'express';
import { UploadsController } from './uploads.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/rbac.middleware';
import { uploadImages } from './uploads.middleware';

const router = Router();

// POST /uploads?folder=properties|rooms|maintenance|avatars
// multipart/form-data field name: "images" (up to 6 files, 5MB each)
router.post('/', authenticate, authorize('OWNER', 'TENANT', 'ADMIN'), uploadImages.array('images', 6), UploadsController.upload);

export const UploadsRoutes = router;
