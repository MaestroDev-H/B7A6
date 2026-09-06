import multer from 'multer';

// Files are buffered in memory then streamed to Cloudinary - nothing is
// written to local disk, which keeps this safe on serverless deployments
// (Vercel) where the filesystem is read-only/ephemeral.
const storage = multer.memoryStorage();

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

export const uploadImages = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024, files: 6 }, // 5MB per file, max 6 files
    fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            return cb(new Error('Only JPEG, PNG, WEBP, or AVIF images are allowed.'));
        }
        cb(null, true);
    },
});
