import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { sendSuccess } from '../../utils/response';
import { UploadsService } from './uploads.service';
import { AppError } from '../../utils/AppError';

const ALLOWED_FOLDERS = ['properties', 'rooms', 'maintenance', 'avatars'];

export const UploadsController = {
    upload: catchAsync(async (req: Request, res: Response) => {
        const folder = (req.query.folder as string) || 'properties';
        if (!ALLOWED_FOLDERS.includes(folder)) {
            throw new AppError(400, `folder must be one of: ${ALLOWED_FOLDERS.join(', ')}`);
        }
        const urls = await UploadsService.uploadMany(req.files as Express.Multer.File[], folder);
        sendSuccess(res, { statusCode: 201, message: 'Images uploaded successfully', data: { urls } });
    }),
};
