import multer from 'multer'
import { isHeicImage } from '../services/imageConversionService.js'

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024 // 8MB

export const uploadCoverImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter (_req, file, callback) {
    // Some browsers send a generic mimetype (e.g. application/octet-stream)
    // for HEIC/HEIF photos, so fall back to the filename extension too.
    const isAcceptableImage = file.mimetype.startsWith('image/') || isHeicImage(file.mimetype, file.originalname)
    if (!isAcceptableImage) {
      callback(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname))
      return
    }
    callback(null, true)
  }
}).single('cover')
