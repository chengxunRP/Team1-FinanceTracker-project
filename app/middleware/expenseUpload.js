const path = require('path');
const fs = require('fs');
const multer = require('multer');

const uploadDir = path.join(__dirname, '..', 'public', 'uploads', 'expenses');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ALLOWED_EXT.includes(ext) ? ext : '.jpg';
    cb(null, `expense-${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
  },
});

function imageFileFilter(_req, file, cb) {
  if (file.mimetype && file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed.'), false);
  }
}

const upload = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

function uploadExpenseImage(req, res, next) {
  upload.single('expenseImage')(req, res, (err) => {
    if (err) {
      req.uploadError = err.message || 'Image upload failed.';
    }
    next();
  });
}

module.exports = uploadExpenseImage;
