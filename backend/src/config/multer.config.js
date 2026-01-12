/**
 * Multer Configuration
 *
 * Handles file upload configuration including:
 * - File storage location
 * - File naming convention
 * - File size limits
 * - File type validation
 *
 * @module config/multer
 */

import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

/**
 * Configure storage for uploaded files
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    const basename = path.basename(file.originalname, extension);
    const sanitizedBasename = basename.replace(/[^a-zA-Z0-9]/g, '_');

    cb(null, `${sanitizedBasename}-${uniqueSuffix}${extension}`);
  }
});

/**
 * File filter to allow PDF and Word documents (DOCX/DOC)
 */
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/msword' // .doc (legacy)
  ];

  if (!allowedMimes.includes(file.mimetype)) {
    return cb(new Error('Only PDF, DOC, and DOCX files are allowed'), false);
  }

  cb(null, true);
};

/**
 * Multer upload middleware configuration
 */
export const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
  },
  fileFilter: fileFilter
});

export default upload;
