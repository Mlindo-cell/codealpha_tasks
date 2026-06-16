const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || './backend/uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(path.join(UPLOAD_DIR, 'avatars'),  { recursive: true });
fs.mkdirSync(path.join(UPLOAD_DIR, 'covers'),   { recursive: true });
fs.mkdirSync(path.join(UPLOAD_DIR, 'posts'),    { recursive: true });

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const type = req.uploadType || 'posts';
    cb(null, path.join(UPLOAD_DIR, type));
  },
  filename(req, file, cb) {
    const ext  = path.extname(file.originalname).toLowerCase() || '.jpg';
    const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, name);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg','image/png','image/gif','image/webp'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Only image files are allowed'), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB) || 5) * 1024 * 1024 }
});

module.exports = { upload, UPLOAD_DIR };
