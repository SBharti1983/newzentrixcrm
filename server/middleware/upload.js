/**
 * File upload middleware using Multer
 * Stores files on local disk under /uploads/<tenantId>/
 * In production, swap this for S3/CloudStorage by changing the storage config.
 */
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Ensure base upload dir exists
const UPLOAD_ROOT = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_ROOT)) fs.mkdirSync(UPLOAD_ROOT, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const tenantDir = path.join(UPLOAD_ROOT, req.tenantId || 'default');
        if (!fs.existsSync(tenantDir)) fs.mkdirSync(tenantDir, { recursive: true });
        cb(null, tenantDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const unique = crypto.randomBytes(8).toString('hex');
        cb(null, `${Date.now()}-${unique}${ext}`);
    },
});

const fileFilter = (req, file, cb) => {
    const allowed = [
        'application/pdf',
        'image/jpeg', 'image/png', 'image/webp',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv',
        'audio/wav', 'audio/mpeg', 'audio/x-wav', 'audio/mp3', 'audio/ogg', 'audio/m4a'
    ];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`File type not allowed: ${file.mimetype}`), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB max
    },
});

module.exports = upload;
