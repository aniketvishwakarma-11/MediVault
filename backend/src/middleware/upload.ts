import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import path from 'path';
import { ALLOWED_MIME_TYPES, ALLOWED_EXTENSIONS } from '../types/document';
import { sendError } from '../utils/response';

const maxFileSizeMB = parseInt(process.env.MAX_FILE_SIZE_MB || '15', 10);
const maxSizeBytes = maxFileSizeMB * 1024 * 1024;

// Use MemoryStorage so buffer is available for SHA256 checksum and MinIO upload
const storage = multer.memoryStorage();

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // 1. Check MIME type whitelist
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype as any)) {
    return cb(new Error(`Unsupported file MIME type: ${file.mimetype}. Allowed: PDF, PNG, JPEG, WEBP.`));
  }

  // 2. Check File Extension whitelist
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  if (!ALLOWED_EXTENSIONS.includes(ext as any)) {
    return cb(new Error(`Unsupported file extension: .${ext}. Allowed: pdf, png, jpeg, jpg, webp.`));
  }

  cb(null, true);
};

export const multerUpload = multer({
  storage,
  limits: {
    fileSize: maxSizeBytes,
    files: 1, // Only 1 file per upload request
  },
  fileFilter,
});

/**
 * Validates magic bytes of file buffer to ensure content matches claimed MIME type.
 * Prevents file extension spoofing attacks.
 */
export const validateMagicBytes = (buffer: Buffer, claimMime: string): boolean => {
  if (!buffer || buffer.length < 4) return false;

  // PDF: %PDF (0x25 0x50 0x44 0x46)
  if (claimMime === 'application/pdf') {
    return buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46;
  }

  // PNG: 0x89 0x50 0x4E 0x47
  if (claimMime === 'image/png') {
    return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  }

  // JPEG: 0xFF 0xD8 0xFF
  if (claimMime === 'image/jpeg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  // WEBP: RIFF (0x52 0x49 0x46 0x46) at start & WEBP (0x57 0x45 0x42 0x50) at offset 8
  if (claimMime === 'image/webp') {
    return (
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer.length >= 12 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50
    );
  }

  // DOCX: ZIP magic bytes (0x50 0x4B 0x03 0x04)
  if (claimMime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04;
  }

  // DOC: OLE magic bytes (0xD0 0xCF 0x11 0xE0)
  if (claimMime === 'application/msword') {
    return buffer[0] === 0xd0 && buffer[1] === 0xcf && buffer[2] === 0x11 && buffer[3] === 0xe0;
  }

  // TXT: Plain text (all readable bytes)
  if (claimMime === 'text/plain') {
    return true;
  }

  return false;
};

/**
 * Middleware wrapper around Multer upload handling error cases cleanly.
 */
export const handleSingleFileUpload = (fieldName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const uploadSingle = multerUpload.single(fieldName);

    uploadSingle(req, res, (err: any) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return sendError(
            res,
            400,
            `File size exceeds maximum limit of ${maxFileSizeMB} MB.`
          );
        }
        return sendError(res, 400, `File upload error: ${err.message}`);
      } else if (err) {
        return sendError(res, 400, err.message || 'File validation failed');
      }

      if (!req.file) {
        return sendError(res, 400, `Missing file payload in form-data field '${fieldName}'.`);
      }

      // Verify Magic Bytes
      const isValidMagic = validateMagicBytes(req.file.buffer, req.file.mimetype);
      if (!isValidMagic) {
        return sendError(
          res,
          400,
          `File content signature does not match declared MIME type (${req.file.mimetype}). Potential file extension spoofing detected.`
        );
      }

      // Phase 10: Optimize Image Buffer if image payload
      if (['image/jpeg', 'image/png', 'image/webp'].includes(req.file.mimetype)) {
        import('sharp').then((sharpModule) => {
          const sharp = sharpModule.default;
          sharp(req.file!.buffer)
            .resize(2048, 2048, { fit: 'inside', withoutEnlargement: true })
            .toBuffer()
            .then((optBuffer) => {
              req.file!.buffer = optBuffer;
              req.file!.size = optBuffer.length;
              next();
            })
            .catch(() => next());
        }).catch(() => next());
      } else {
        next();
      }
    });
  };
};
