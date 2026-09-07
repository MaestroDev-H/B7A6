import { cloudinary } from '../../config/cloudinary';
import { UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import { AppError } from '../../utils/AppError';

// Uploads a single in-memory buffer to Cloudinary via its upload_stream API
// (no temp files). Resolves with the secure HTTPS URL to store on the
// Property/Room/MaintenanceRequest `images` array.
function uploadBuffer(buffer: Buffer, folder: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder: `housing-platform/${folder}`, resource_type: 'image' },
            (error?: UploadApiErrorResponse, result?: UploadApiResponse) => {
                if (error || !result) return reject(error);
                resolve(result.secure_url);
            }
        );
        stream.end(buffer);
    });
}

export const UploadsService = {
    async uploadMany(files: Express.Multer.File[], folder: string): Promise<string[]> {
        if (!files || files.length === 0) throw new AppError(400, 'No files were provided.');
        try {
            return await Promise.all(files.map((f) => uploadBuffer(f.buffer, folder)));
        } catch (err) {
            throw new AppError(502, 'Image upload to Cloudinary failed. Check CLOUDINARY_* credentials.');
        }
    },
};
